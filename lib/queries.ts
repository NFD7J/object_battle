import "server-only";

import { cache } from "react";

import { COTE_NUL, COTE_OBJET } from "@/lib/combat";
import { ConflictError, ValidationError, getSql } from "@/lib/db";
import type { Object, Fight, Player, RankingSort, Stats } from "@/lib/types";

/* ===========================================================================
   COUCHE D'ACCÈS AUX DONNÉES (Data Access Layer)

   Toutes les lectures et écritures de la base passent par ce fichier. Les
   pages et les routes d'API n'écrivent jamais de SQL elles-mêmes.

   Trois règles tenues ici :
   1. Requêtes en template balisé : les valeurs partent en paramètres, jamais
      concaténées dans le SQL. C'est ce qui rend l'injection impossible (§16).
   2. Validation avant écriture : rien venant du navigateur n'est écrit sans
      être contrôlé (longueurs, bornes 0-100, identifiants entiers).
   3. Objets de transfert : on ne renvoie que les colonnes utiles à l'écran.
      Le hash du mot de passe ne sort que par getPlayerCredentials().

   Les lectures sont enveloppées dans cache() de React : deux composants de la
   même page qui demandent la même chose ne déclenchent qu'une seule requête.
   =========================================================================== */

/* ---------------------------------------------------------------------------
   Formes des lignes renvoyées par PostgreSQL (colonnes en snake_case)
   --------------------------------------------------------------------------- */

type ObjectRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  power: number;
  resistance: number;
  speed: number;
  intelligence: number;
  nb_wins: number;
  nb_losses: number;
  created_at: string | Date;
};

type UserRow = {
  id: number;
  username: string;
  avatar_color: string;
  points: number;
  max_points: number;
  nb_victoires: number;
  nb_combats: number;
  created_at: string | Date;
};

type FightRow = {
  id: number;
  winner_id: number | null;
  score_1: number;
  score_2: number;
  bet_on_id: number | null;
  bet_amount: number;
  bet_delta: number;
  created_at: string | Date;
  fighter_a: ObjectRow;
  fighter_b: ObjectRow;
};

/** Colonnes des joueurs exposables à l'écran — password_hash est exclu. */
const COLONNES_JOUEUR =
  "id, username, avatar_color, points, max_points, nb_victoires, nb_combats, created_at";

/* ---------------------------------------------------------------------------
   Conversion des lignes SQL vers les types de l'application
   --------------------------------------------------------------------------- */

function toIsoDate(value: string | Date): string {
  return new Date(value).toISOString();
}

/** Date au format court AAAA-MM-JJ, pour « membre depuis ». */
function toIsoDay(value: string | Date): string {
  return toIsoDate(value).slice(0, 10);
}

function toCombatant(row: ObjectRow): Combatant {
  const stats: Stats = {
    puissance: row.power,
    resistance: row.resistance,
    rapidite: row.speed,
    intelligence: row.intelligence,
  };

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    image: row.image,
    stats,
    // Score global affiché sur les cartes : moyenne des 4 caractéristiques.
    // À ne pas confondre avec le score d'un combat, qui ajoute de l'aléatoire.
    overall: Math.round(
      (stats.puissance + stats.resistance + stats.rapidite + stats.intelligence) / 4,
    ),
    nbWins: row.nb_wins,
    nbLosses: row.nb_losses,
  };
}

function toPlayer(row: UserRow): Player {
  return {
    id: row.id,
    username: row.username,
    avatarColor: row.avatar_color,
    points: row.points,
    maxPoints: row.max_points,
    nbVictoires: row.nb_victoires,
    nbCombats: row.nb_combats,
    createdAt: toIsoDay(row.created_at),
  };
}

function toFight(row: FightRow): Fight {
  const mise = row.bet_amount;
  const delta = row.bet_delta;
  // La cote n'est pas stockée : on la reconstitue à partir du gain, sinon
  // on retombe sur les multiplicateurs du moteur de combat.
  const cote =
    delta > 0 && mise > 0
      ? Math.round((delta / mise) * 100) / 100
      : row.bet_on_id == null
        ? COTE_NUL
        : COTE_OBJET;

  return {
    id: row.id,
    fighterA: toCombatant(row.fighter_a),
    fighterB: toCombatant(row.fighter_b),
    winnerId: row.winner_id,
    pvA: row.score_1,
    pvB: row.score_2,
    bet: {
      on: row.bet_on_id ?? "nul",
      amount: row.bet_amount,
      cote: row.bet_amount === 0 ? 0 : Math.abs(row.bet_delta / row.bet_amount),
      outcome: row.bet_delta > 0 ? "gain" : row.bet_delta < 0 ? "perte" : "nul",
      delta: row.bet_delta,
    },
    createdAt: toIsoDate(row.created_at),
  };
}

/* ---------------------------------------------------------------------------
   Validation des données entrantes (§16)
   --------------------------------------------------------------------------- */

function texteObligatoire(valeur: unknown, champ: string, max: number): string {
  if (typeof valeur !== "string") {
    throw new ValidationError(`Le champ « ${champ} » doit être du texte.`);
  }

  const propre = valeur.trim();

  if (propre.length === 0) {
    throw new ValidationError(`Le champ « ${champ} » est obligatoire.`);
  }

  if (propre.length > max) {
    throw new ValidationError(
      `Le champ « ${champ} » ne doit pas dépasser ${max} caractères.`,
    );
  }

  return propre;
}

function texteFacultatif(valeur: unknown, champ: string, max: number): string {
  if (valeur === undefined || valeur === null || valeur === "") return "";
  return texteObligatoire(valeur, champ, max);
}

/** Une caractéristique doit être un entier compris entre 0 et 100 (§8). */
function statValide(valeur: unknown, champ: string): number {
  if (typeof valeur !== "number" || !Number.isInteger(valeur)) {
    throw new ValidationError(`La stat « ${champ} » doit être un entier.`);
  }

  if (valeur < 0 || valeur > 100) {
    throw new ValidationError(`La stat « ${champ} » doit être comprise entre 0 et 100.`);
  }

  return valeur;
}

function identifiantValide(valeur: unknown, champ: string): number {
  if (typeof valeur !== "number" || !Number.isInteger(valeur) || valeur <= 0) {
    throw new ValidationError(`L'identifiant « ${champ} » est invalide.`);
  }

  return valeur;
}

/**
 * L'image doit être un chemin local (/objets/...) ou une URL https, typiquement
 * celle renvoyée par Cloudinary (§7). On refuse tout le reste, notamment les
 * URL « javascript: » ou « data: ».
 */
function imageValide(valeur: unknown): string {
  const image = texteObligatoire(valeur, "image", 500);

  if (image.startsWith("/")) return image;
  if (image.startsWith("https://")) return image;

  throw new ValidationError(
    "L'image doit être un chemin commençant par / ou une URL https.",
  );
}

/** « Grille-pain » devient « grille-pain », « Poêle » devient « poele ». */
export function slugify(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents laissés par NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Borne le nombre de lignes demandées, pour éviter une requête démesurée. */
function limiteValide(valeur: number, defaut: number, max = 100): number {
  if (!Number.isInteger(valeur) || valeur <= 0) return defaut;
  return Math.min(valeur, max);
}

/* ===========================================================================
   OBJETS
   =========================================================================== */

/** Tous les objets, du meilleur score global au moins bon. Page « Objets ». */
export const getAllObjects = cache(async (): Promise<Combatant[]> => {
  const sql = getSql();

  const rows = (await sql`
    SELECT *
    FROM objects
    ORDER BY (power + resistance + speed + intelligence) DESC, name ASC
  `) as ObjectRow[];

  return rows.map(toCombatant);
});

/** Un objet par son slug d'URL : /objets/marteau. Renvoie null si absent. */
export const getObjectBySlug = cache(
  async (slug: string): Promise<Combatant | null> => {
    const sql = getSql();

    const rows = (await sql`
      SELECT * FROM objects WHERE slug = ${slug} LIMIT 1
    `) as ObjectRow[];

    return rows[0] ? toCombatant(rows[0]) : null;
  },
);

/** Un objet par son identifiant. */
export const getObjectById = cache(async (id: number): Promise<Combatant | null> => {
  const sql = getSql();

  const rows = (await sql`
    SELECT * FROM objects WHERE id = ${identifiantValide(id, "id")} LIMIT 1
  `) as ObjectRow[];

  return rows[0] ? toCombatant(rows[0]) : null;
});

/** Deux objets distincts tirés au hasard, pour le bouton « Tirage au sort ». */
export async function getRandomObjectPair(): Promise<[Combatant, Combatant] | null> {
  const sql = getSql();

  const rows = (await sql`
    SELECT * FROM objects ORDER BY random() LIMIT 2
  `) as ObjectRow[];

  if (rows.length < 2) return null;

  return [toCombatant(rows[0]), toCombatant(rows[1])];
}

/** Uniquement les slugs, pour generateStaticParams() des fiches objet. */
export const getObjectSlugs = cache(async (): Promise<string[]> => {
  const sql = getSql();

  const rows = (await sql`SELECT slug FROM objects`) as { slug: string }[];

  return rows.map((row) => row.slug);
});

export type NewObjectInput = {
  name: unknown;
  description?: unknown;
  image: unknown;
  /** Objet contenant puissance, resistance, rapidite et intelligence. */
  stats: unknown;
};

/**
 * Crée un objet à partir du formulaire « Créer un objet » (§4.3).
 *
 * Les champs arrivent en `unknown` volontairement : ils viennent du navigateur
 * et ne sont considérés comme sûrs qu'après validation.
 *
 * @throws {ValidationError} si un champ est absent ou hors bornes
 * @throws {ConflictError}   si un objet porte déjà ce nom
 */
export async function createObject(input: NewObjectInput): Promise<Combatant> {
  const sql = getSql();

  const name = texteObligatoire(input.name, "nom", 40);
  const description = texteFacultatif(input.description, "description", 160);
  const image = imageValide(input.image);
  const slug = slugify(name);

  if (slug.length === 0) {
    throw new ValidationError("Le nom doit contenir au moins une lettre ou un chiffre.");
  }

  const stats =
    typeof input.stats === "object" && input.stats !== null
      ? (input.stats as Record<string, unknown>)
      : {};

  const power = statValide(stats.puissance, "puissance");
  const resistance = statValide(stats.resistance, "résistance");
  const speed = statValide(stats.rapidite, "rapidité");
  const intelligence = statValide(stats.intelligence, "intelligence");

  const rows = (await sql`
    INSERT INTO objects (slug, name, description, image, power, resistance, speed, intelligence)
    VALUES (${slug}, ${name}, ${description}, ${image}, ${power}, ${resistance}, ${speed}, ${intelligence})
    ON CONFLICT (slug) DO NOTHING
    RETURNING *
  `) as ObjectRow[];

  if (!rows[0]) {
    throw new ConflictError(`Un objet nommé « ${name} » existe déjà.`);
  }

  return toCombatant(rows[0]);
}

/* ===========================================================================
   COMBATS
   =========================================================================== */

/** Fragment commun : un combat avec ses deux objets déjà joints. */
const SELECT_COMBATS = `
  SELECT
    f.id, f.winner_id, f.score_1, f.score_2,
    f.bet_on_id, f.bet_amount, f.bet_delta, f.created_at,
    to_jsonb(a) AS fighter_a,
    to_jsonb(b) AS fighter_b
  FROM fights f
  JOIN objects a ON a.id = f.object_1_id
  JOIN objects b ON b.id = f.object_2_id
`;

/** Les derniers combats, tous joueurs confondus. Accueil et Historique. */
export const getRecentFights = cache(async (limit = 20): Promise<Fight[]> => {
  const sql = getSql();

  const rows = (await sql`
    ${sql.unsafe(SELECT_COMBATS)}
    ORDER BY f.created_at DESC
    LIMIT ${limiteValide(limit, 20)}
  `) as FightRow[];

  return rows.map(toFight);
});

/** Les combats d'un joueur donné. Page « Profil ». */
export const getFightsByPlayer = cache(
  async (playerId: number, limit = 20): Promise<Fight[]> => {
    const sql = getSql();

    const rows = (await sql`
      ${sql.unsafe(SELECT_COMBATS)}
      WHERE f.user_id = ${identifiantValide(playerId, "playerId")}
      ORDER BY f.created_at DESC
      LIMIT ${limiteValide(limit, 20)}
    `) as FightRow[];

    return rows.map(toFight);
  },
);

/** Les combats auxquels un objet a participé. Fiche objet. */
export const getFightsByObject = cache(
  async (objectId: number, limit = 10): Promise<Fight[]> => {
    const sql = getSql();
    const id = identifiantValide(objectId, "objectId");

    const rows = (await sql`
      ${sql.unsafe(SELECT_COMBATS)}
      WHERE f.object_1_id = ${id} OR f.object_2_id = ${id}
      ORDER BY f.created_at DESC
      LIMIT ${limiteValide(limit, 10)}
    `) as FightRow[];

    return rows.map(toFight);
  },
);

/** Un combat précis. */
export const getFightById = cache(async (id: number): Promise<Fight | null> => {
  const sql = getSql();

  const rows = (await sql`
    ${sql.unsafe(SELECT_COMBATS)}
    WHERE f.id = ${identifiantValide(id, "id")}
    LIMIT 1
  `) as FightRow[];

  return rows[0] ? toFight(rows[0]) : null;
});

export type NewFightInput = {
  userId: number;
  object1Id: number;
  object2Id: number;
  /** null pour un match nul. */
  winnerId: number | null;
  score1: number;
  score2: number;
  /** Objet sur lequel le joueur a parié ; null s'il a parié sur le match nul. */
  betOnId: number | null;
  betAmount: number;
  /** Points gagnés (positif) ou perdus (négatif) par le joueur. */
  betDelta: number;
};

/**
 * Enregistre un combat terminé et met à jour tout ce qui en découle :
 * le bilan des deux objets, puis les points et le compteur du joueur.
 *
 * Les quatre écritures partent dans une seule transaction : soit tout est
 * enregistré, soit rien ne l'est. Sans cela, un incident réseau au milieu
 * laisserait par exemple des points crédités pour un combat inexistant.
 *
 * Les scores et le gain sont calculés par le moteur de combat, en amont : cette
 * fonction enregistre un résultat, elle ne le décide pas.
 */
export async function createFight(input: NewFightInput): Promise<Fight> {
  const sql = getSql();

  const userId = identifiantValide(input.userId, "userId");
  const object1Id = identifiantValide(input.object1Id, "object1Id");
  const object2Id = identifiantValide(input.object2Id, "object2Id");

  if (object1Id === object2Id) {
    throw new ValidationError("Un objet ne peut pas s'affronter lui-même.");
  }

  if (input.winnerId !== null && ![object1Id, object2Id].includes(input.winnerId)) {
    throw new ValidationError("Le vainqueur doit être l'un des deux combattants.");
  }

  if (input.betOnId !== null && ![object1Id, object2Id].includes(input.betOnId)) {
    throw new ValidationError("Le pari doit porter sur l'un des deux combattants.");
  }

  if (!Number.isInteger(input.betAmount) || input.betAmount < 0) {
    throw new ValidationError("La mise doit être un entier positif.");
  }

  if (!Number.isInteger(input.betDelta)) {
    throw new ValidationError("Le gain doit être un entier.");
  }

  const winnerId = input.winnerId;
  const loserId =
    winnerId === null ? null : winnerId === object1Id ? object2Id : object1Id;
  const victoire = winnerId !== null && winnerId === input.betOnId;

  const requetes = [
    sql`
      INSERT INTO fights (
        user_id, object_1_id, object_2_id, winner_id, score_1, score_2,
        bet_on_id, bet_amount, bet_delta
      )
      VALUES (
        ${userId}, ${object1Id}, ${object2Id}, ${winnerId},
        ${input.score1}, ${input.score2},
        ${input.betOnId}, ${input.betAmount}, ${input.betDelta}
      )
      RETURNING id
    `,
    sql`
      UPDATE users
      SET points       = GREATEST(0, points + ${input.betDelta}),
          max_points   = GREATEST(max_points, points + ${input.betDelta}),
          nb_combats   = nb_combats + 1,
          nb_victoires = nb_victoires + ${victoire ? 1 : 0}
      WHERE id = ${userId}
    `,
  ];

  // Match nul : aucun des deux objets ne voit son bilan bouger.
  if (winnerId !== null && loserId !== null) {
    requetes.push(
      sql`UPDATE objects SET nb_wins   = nb_wins   + 1 WHERE id = ${winnerId}`,
      sql`UPDATE objects SET nb_losses = nb_losses + 1 WHERE id = ${loserId}`,
    );
  }

  const resultats = await sql.transaction(requetes);
  const insere = (resultats[0] as { id: number }[])[0];

  const combat = await getFightById(insere.id);

  if (!combat) {
    throw new Error("Le combat vient d'être inséré mais reste introuvable.");
  }

  return combat;
}

/* ===========================================================================
   JOUEURS
   =========================================================================== */

/**
 * Tris autorisés pour le classement (§4.4).
 *
 * Ces fragments arrivent dans le SQL via sql.unsafe(), qui n'échappe rien : ils
 * sont donc écrits en dur ici, et la clé demandée est cherchée dans cette table.
 * Une valeur inconnue retombe sur « points ». Aucune chaîne venant du
 * navigateur n'atteint la requête.
 */
const ORDRES_CLASSEMENT: Record<RankingSort, string> = {
  points: "points DESC, nb_victoires DESC",
  victoires: "nb_victoires DESC, points DESC",
  ratio:
    "(CASE WHEN nb_combats = 0 THEN 0 ELSE nb_victoires::numeric / nb_combats END) DESC, points DESC",
};

/** Le classement des joueurs, trié selon le critère demandé. */
export const getRanking = cache(
  async (sort: RankingSort = "points", limit = 50): Promise<Player[]> => {
    const sql = getSql();
    const ordre = ORDRES_CLASSEMENT[sort] ?? ORDRES_CLASSEMENT.points;

    const rows = (await sql`
      SELECT ${sql.unsafe(COLONNES_JOUEUR)}
      FROM users
      ORDER BY ${sql.unsafe(ordre)}
      LIMIT ${limiteValide(limit, 50)}
    `) as UserRow[];

    return rows.map(toPlayer);
  },
);

async function lirePlayerById(id: number): Promise<Player | null> {
  const sql = getSql();

  const rows = (await sql`
    SELECT ${sql.unsafe(COLONNES_JOUEUR)}
    FROM users
    WHERE id = ${identifiantValide(id, "id")}
    LIMIT 1
  `) as UserRow[];

  return rows[0] ? toPlayer(rows[0]) : null;
}

/** Un joueur par son identifiant. */
export const getPlayerById = cache(lirePlayerById);

/**
 * Même lecture, sans mémoïsation.
 *
 * À utiliser après une écriture dans la même requête : getPlayerById() renvoie
 * la valeur mise en cache au premier appel, donc les points d'avant le combat.
 */
export const getPlayerByIdFresh = lirePlayerById;

/** La place d'un joueur au classement par points, 1 étant le premier. */
export const getPlayerRank = cache(async (id: number): Promise<number | null> => {
  const sql = getSql();

  const rows = (await sql`
    SELECT COUNT(*) + 1 AS rang
    FROM users
    WHERE points > (SELECT points FROM users WHERE id = ${identifiantValide(id, "id")})
  `) as { rang: number | string }[];

  return rows[0] ? Number(rows[0].rang) : null;
});

/**
 * Récupère le hash du mot de passe pour vérifier une connexion.
 *
 * Seule fonction du fichier à toucher password_hash. À n'appeler que depuis le
 * flux d'authentification, et à ne jamais renvoyer à un composant client.
 */
export async function getPlayerCredentials(
  username: string,
): Promise<{ id: number; passwordHash: string } | null> {
  const sql = getSql();

  const rows = (await sql`
    SELECT id, password_hash FROM users WHERE username = ${username} LIMIT 1
  `) as { id: number; password_hash: string }[];

  return rows[0] ? { id: rows[0].id, passwordHash: rows[0].password_hash } : null;
}

/**
 * Crée un joueur.
 *
 * Le mot de passe doit déjà être haché par l'appelant (bcrypt ou argon2) :
 * cette couche ne voit jamais de mot de passe en clair, et la base non plus.
 *
 * @throws {ConflictError} si le pseudo est déjà pris
 */
export async function createPlayer(
  username: unknown,
  passwordHash: string,
  avatarColor = "#a855f7",
): Promise<Player> {
  const sql = getSql();

  const pseudo = texteObligatoire(username, "pseudo", 24);

  if (!/^[\w-]+$/.test(pseudo)) {
    throw new ValidationError(
      "Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores.",
    );
  }

  if (typeof passwordHash !== "string" || passwordHash.length === 0) {
    throw new ValidationError("Le mot de passe haché est obligatoire.");
  }

  const rows = (await sql`
    INSERT INTO users (username, password_hash, avatar_color)
    VALUES (${pseudo}, ${passwordHash}, ${avatarColor})
    ON CONFLICT (username) DO NOTHING
    RETURNING ${sql.unsafe(COLONNES_JOUEUR)}
  `) as UserRow[];

  if (!rows[0]) {
    throw new ConflictError(`Le pseudo « ${pseudo} » est déjà pris.`);
  }

  return toPlayer(rows[0]);
}
