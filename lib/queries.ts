import "server-only";

import { cache } from "react";

import { pvDepuisScores, simulerCotes } from "@/lib/combat";
import { ConflictError, ValidationError, getSql } from "@/lib/db";
import type { Cotes } from "@/lib/fight-engine";
import type { Object, Fight, FightBet, Player, RankingSort, Stats } from "@/lib/types";

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
  /** NUMERIC : PostgreSQL le renvoie en chaîne, jamais en nombre. */
  bet_cote: string | number;
  created_at: string | Date;
  /** Auteur du combat. NULL pour un visiteur, ou un compte supprimé depuis. */
  user_id: number | null;
  /** Colonnes de users, nulles quand le LEFT JOIN ne trouve personne. */
  host_username: string | null;
  host_avatar_color: string | null;
  fighter_a: ObjectRow;
  fighter_b: ObjectRow;
};

/** Une ligne de pair_odds : les cotes simulées d'une paire d'objets. */
type PairOddsRow = {
  object_a_id: number;
  object_b_id: number;
  cote_a: string | number;
  cote_b: string | number;
  cote_nul: string | number;
  nb_simulations: number;
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

function toObject(row: ObjectRow): Object {
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
    overall: (row.power*1.20) + (row.resistance*1.10) + (row.speed*1.05) + (row.intelligence*1.15),
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

  // Une mise à 0 signifie « combat lancé sans pari » : c'est le cas de tous
  // les combats de visiteurs, qui figurent malgré tout dans l'historique.
  const bet: FightBet | null =
    mise > 0
      ? {
          on: row.bet_on_id ?? "nul",
          // La cote appliquée est enregistrée sur le combat (bet_cote).
          //
          // Le repli sur delta/mise ne sert qu'aux combats enregistrés avant
          // l'ajout de la colonne, qui valent 0 par défaut. Il reste faux pour
          // un pari perdu d'avant la migration — le gain n'y contient plus
          // aucune trace de la cote — mais ces lignes finiront par sortir de
          // l'historique.
          cote:
            Number(row.bet_cote) > 0
              ? Number(row.bet_cote)
              : delta > 0
                ? Math.round((delta / mise) * 100) / 100
                : 0,
          amount: mise,
          outcome: delta > 0 ? "gain" : delta < 0 ? "perte" : "nul",
          delta,
        }
      : null;

  // Les scores bruts du moteur (jusqu'à 600) ne sont pas des PV : les jauges
  // sont déduites de l'écart entre les deux, sur une base de PV_MAX.
  const { pvA, pvB } = pvDepuisScores(row.score_1, row.score_2, row.winner_id === null);

  // Pas de ligne users en face : le combat vient d'un visiteur, ou d'un compte
  // supprimé depuis. Dans les deux cas l'écran n'a personne à nommer.
  const organisateur =
    row.user_id !== null && row.host_username !== null
      ? {
          id: row.user_id,
          username: row.host_username,
          // NOT NULL en base ; le repli ne sert qu'à satisfaire le LEFT JOIN.
          avatarColor: row.host_avatar_color ?? "#a855f7",
        }
      : null;

  return {
    id: row.id,
    fighterA: toObject(row.fighter_a),
    fighterB: toObject(row.fighter_b),
    winnerId: row.winner_id,
    pvA,
    pvB,
    bet,
    organisateur,
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
export const getAllObjects = cache(async (): Promise<Object[]> => {
  const sql = getSql();

  const rows = (await sql`
    SELECT *
    FROM objects
    ORDER BY (power + resistance + speed + intelligence) DESC, name ASC
  `) as ObjectRow[];

  return rows.map(toObject);
});

/** Un objet par son slug d'URL : /objets/marteau. Renvoie null si absent. */
export const getObjectBySlug = cache(
  async (slug: string): Promise<Object | null> => {
    const sql = getSql();

    const rows = (await sql`
      SELECT * FROM objects WHERE slug = ${slug} LIMIT 1
    `) as ObjectRow[];

    return rows[0] ? toObject(rows[0]) : null;
  },
);

/** Un objet par son identifiant. */
export const getObjectById = cache(async (id: number): Promise<Object | null> => {
  const sql = getSql();

  const rows = (await sql`
    SELECT * FROM objects WHERE id = ${identifiantValide(id, "id")} LIMIT 1
  `) as ObjectRow[];

  return rows[0] ? toObject(rows[0]) : null;
});

/** Deux objets distincts tirés au hasard, pour le bouton « Tirage au sort ». */
export async function getRandomObjectPair(): Promise<[Object, Object] | null> {
  const sql = getSql();

  const rows = (await sql`
    SELECT * FROM objects ORDER BY random() LIMIT 2
  `) as ObjectRow[];

  if (rows.length < 2) return null;

  return [toObject(rows[0]), toObject(rows[1])];
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
export async function createObject(input: NewObjectInput): Promise<Object> {
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

  return toObject(rows[0]);
}

/* ===========================================================================
   COTES DES PAIRES

   Les cotes viennent de 500 combats simulés (simulerCotes, lib/combat.ts).
   Trop cher pour être refait à chaque affichage : on l'exécute une fois par
   paire et on garde le résultat en base.
   =========================================================================== */

/**
 * Remet une paire dans l'ordre de stockage (le plus petit identifiant d'abord).
 *
 * @returns les deux identifiants ordonnés, et `inverse` à true si l'appelant
 *          les avait donnés dans l'autre sens — auquel cas les cotes A et B
 *          devront être échangées avant de lui répondre.
 */
function ordonnerPaire(idA: number, idB: number) {
  const premier = identifiantValide(idA, "idA");
  const second = identifiantValide(idB, "idB");

  if (premier === second) {
    throw new ValidationError("Un objet ne peut pas s'affronter lui-même.");
  }

  const inverse = premier > second;

  return {
    petit: inverse ? second : premier,
    grand: inverse ? premier : second,
    inverse,
  };
}

/** Traduit une ligne de pair_odds en cotes, dans le sens demandé. */
function toCotes(row: PairOddsRow, inverse: boolean): Cotes {
  const coteA = Number(row.cote_a);
  const coteB = Number(row.cote_b);

  return {
    A: inverse ? coteB : coteA,
    B: inverse ? coteA : coteB,
    nul: Number(row.cote_nul),
  };
}

async function lirePairOdds(petit: number, grand: number): Promise<PairOddsRow | null> {
  const sql = getSql();

  const rows = (await sql`
    SELECT * FROM pair_odds
    WHERE object_a_id = ${petit} AND object_b_id = ${grand}
    LIMIT 1
  `) as PairOddsRow[];

  return rows[0] ?? null;
}

/**
 * Cotes d'une paire d'objets, simulées à la première demande.
 *
 * Si la paire n'a jamais été rencontrée, on fait combattre les deux objets
 * 500 fois et on enregistre les cotes obtenues : les appels suivants — et le
 * paiement du pari dans POST /api/combats — liront la même ligne. Sans cela,
 * la cote affichée au joueur et celle utilisée pour le payer seraient deux
 * tirages différents.
 *
 * Volontairement non enveloppé dans cache() : la fonction écrit, et la
 * mémoïsation de React masquerait le fait qu'un appel peut créer une ligne.
 *
 * @throws {ValidationError} si l'un des deux objets n'existe pas
 */
export async function getPairOdds(idA: number, idB: number): Promise<Cotes> {
  const { petit, grand, inverse } = ordonnerPaire(idA, idB);

  const existante = await lirePairOdds(petit, grand);

  if (existante) return toCotes(existante, inverse);

  const [objetPetit, objetGrand] = await Promise.all([
    getObjectById(petit),
    getObjectById(grand),
  ]);

  if (!objetPetit || !objetGrand) {
    throw new ValidationError("L'un des deux objets n'existe pas.");
  }

  const simulation = simulerCotes(objetPetit, objetGrand);
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO pair_odds (
      object_a_id, object_b_id,
      cote_a, cote_b, cote_nul,
      nb_simulations, nb_victoires_a, nb_victoires_b, nb_nuls
    )
    VALUES (
      ${petit}, ${grand},
      ${simulation.cotes.A}, ${simulation.cotes.B}, ${simulation.cotes.nul},
      ${simulation.nbSimulations},
      ${simulation.victoiresA}, ${simulation.victoiresB}, ${simulation.nuls}
    )
    ON CONFLICT (object_a_id, object_b_id) DO NOTHING
    RETURNING *
  `) as PairOddsRow[];

  // Rien inséré : deux requêtes ont simulé la même paire neuve en même temps
  // et l'autre a gagné la course. C'est sa ligne qui fait foi — la relire
  // évite d'annoncer des cotes que la base ne contient pas.
  if (!rows[0]) {
    const gagnante = await lirePairOdds(petit, grand);

    if (!gagnante) {
      throw new Error("Les cotes de la paire n'ont pu être ni insérées ni relues.");
    }

    return toCotes(gagnante, inverse);
  }

  return toCotes(rows[0], inverse);
}

/* ===========================================================================
   COMBATS
   =========================================================================== */

/** Fragment commun : un combat avec ses deux objets déjà joints. */
const SELECT_COMBATS = `
  SELECT
    f.id, f.winner_id, f.score_1, f.score_2,
    f.bet_on_id, f.bet_amount, f.bet_delta, f.bet_cote, f.created_at,
    f.user_id,
    u.username     AS host_username,
    u.avatar_color AS host_avatar_color,
    to_jsonb(a) AS fighter_a,
    to_jsonb(b) AS fighter_b
  FROM fights f
  JOIN objects a ON a.id = f.object_1_id
  JOIN objects b ON b.id = f.object_2_id
  -- LEFT, impérativement : une jointure fermée ferait disparaître de
  -- l'historique tous les combats lancés par des visiteurs.
  LEFT JOIN users u ON u.id = f.user_id
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
  /** Auteur du combat, ou `null` pour un combat lancé par un visiteur. */
  userId: number | null;
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
  /** Cote appliquée au pari, figée au moment où il est placé. 0 si sans pari. */
  betCote: number;
};

/**
 * Enregistre un combat terminé et met à jour tout ce qui en découle :
 * le bilan des deux objets, puis les points et le compteur du joueur.
 *
 * Les écritures partent dans une seule transaction : soit tout est
 * enregistré, soit rien ne l'est. Sans cela, un incident réseau au milieu
 * laisserait par exemple des points crédités pour un combat inexistant.
 *
 * Les scores et le gain sont calculés par le moteur de combat, en amont : cette
 * fonction enregistre un résultat, elle ne le décide pas.
 */
export async function createFight(input: NewFightInput): Promise<Fight> {
  const sql = getSql();

  const userId = input.userId === null ? null : identifiantValide(input.userId, "userId");
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

  if (!Number.isFinite(input.betCote) || input.betCote < 0) {
    throw new ValidationError("La cote doit être un nombre positif.");
  }

  // Un visiteur ne mise pas : accepter une mise sans auteur reviendrait à
  // créditer ou débiter un compte qui n'existe pas.
  if (userId === null && (input.betAmount > 0 || input.betOnId !== null)) {
    throw new ValidationError("Un combat sans joueur ne peut pas porter de pari.");
  }

  const winnerId = input.winnerId;
  const loserId =
    winnerId === null ? null : winnerId === object1Id ? object2Id : object1Id;
  const victoire = winnerId !== null && winnerId === input.betOnId;

  const requetes = [
    sql`
      INSERT INTO fights (
        user_id, object_1_id, object_2_id, winner_id, score_1, score_2,
        bet_on_id, bet_amount, bet_delta, bet_cote
      )
      VALUES (
        ${userId}, ${object1Id}, ${object2Id}, ${winnerId},
        ${input.score1}, ${input.score2},
        ${input.betOnId}, ${input.betAmount}, ${input.betDelta}, ${input.betCote}
      )
      RETURNING id
    `,
  ];

  // Combat d'un visiteur : rien à créditer, aucun compteur de joueur à bouger.
  if (userId !== null) {
    requetes.push(
      sql`
        UPDATE users
        SET points       = GREATEST(0, points + ${input.betDelta}),
            max_points   = GREATEST(max_points, points + ${input.betDelta}),
            nb_combats   = nb_combats + 1,
            nb_victoires = nb_victoires + ${victoire ? 1 : 0}
        WHERE id = ${userId}
      `,
    );
  }

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
  max_points: "max_points DESC, nb_victoires DESC",
  victoires: "nb_victoires DESC, max_points DESC",
  ratio:
    "(CASE WHEN nb_combats = 0 THEN 0 ELSE nb_victoires::numeric / nb_combats END) DESC, max_points DESC",
};

/** Le classement des joueurs, trié selon le critère demandé. */
export const getRanking = cache(
  async (sort: RankingSort = "max_points", limit = 50): Promise<Player[]> => {
    const sql = getSql();
    const ordre = ORDRES_CLASSEMENT[sort] ?? ORDRES_CLASSEMENT.max_points;

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

/**
 * La place d'un joueur au classement, 1 étant le premier.
 *
 * Le critère est max_points, comme ORDRES_CLASSEMENT.max_points : c'est le
 * meilleur solde jamais atteint, pas le solde courant. Une place acquise ne se
 * reperd donc pas en misant — et les deux calculs doivent rester d'accord,
 * sinon un joueur verrait un rang différent de sa ligne dans le tableau.
 */
export const getPlayerRank = cache(async (id: number): Promise<number | null> => {
  const sql = getSql();

  const rows = (await sql`
    SELECT COUNT(*) + 1 AS rang
    FROM users
    WHERE max_points > (SELECT max_points FROM users WHERE id = ${identifiantValide(id, "id")})
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
