import "server-only";

import { cache } from "react";
import bcrypt from "bcryptjs";

import { ValidationError } from "@/lib/db";
import { createPlayer, getPlayerById, getPlayerCredentials } from "@/lib/queries";
import { createSession, deleteSession, readSession } from "@/lib/session";
import type { Player } from "@/lib/types";

/* ===========================================================================
   Inscription, connexion, identité du joueur courant.

   Règle qui ne bouge pas : l'identifiant du joueur vient TOUJOURS de la
   session signée, jamais du corps d'une requête. Sinon n'importe qui
   créditerait des points au compte de son choix en modifiant le JSON (§16).
   =========================================================================== */

/**
 * Coût du hachage bcrypt. Plus il est élevé, plus une attaque par force brute
 * est lente — et plus la connexion coûte cher au serveur. 12 est le compromis
 * courant aujourd'hui.
 */
const COUT_BCRYPT = 12;

const LONGUEUR_MIN_MOT_DE_PASSE = 8;

/**
 * Faux hash utilisé quand le pseudo n'existe pas.
 *
 * Sans lui, une connexion sur un compte inexistant répondrait bien plus vite
 * qu'une connexion avec un mauvais mot de passe : le temps de réponse
 * suffirait à deviner quels comptes existent.
 */
const HASH_LEURRE = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7EqZQ0Gm/9nMs1oCMFXwFZ5oCq/xX8y";

/** Identifiant du joueur connecté, ou null. Mémoïsé sur la durée de la requête. */
export const getCurrentPlayerId = cache(async (): Promise<number | null> => {
  const session = await readSession();
  return session?.playerId ?? null;
});

/** Le joueur connecté au complet, ou null s'il n'y a pas de session valide. */
export const getCurrentPlayer = cache(async (): Promise<Player | null> => {
  const playerId = await getCurrentPlayerId();

  if (playerId === null) return null;

  // Le compte a pu être supprimé depuis l'émission du jeton.
  return getPlayerById(playerId);
});

/** Contrôle du mot de passe avant hachage. */
function motDePasseValide(valeur: unknown): string {
  if (typeof valeur !== "string") {
    throw new ValidationError("Le mot de passe est obligatoire.");
  }

  if (valeur.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    throw new ValidationError(
      `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
    );
  }

  // bcrypt ignore silencieusement ce qui dépasse 72 octets : mieux vaut le dire.
  if (new TextEncoder().encode(valeur).length > 72) {
    throw new ValidationError("Le mot de passe ne doit pas dépasser 72 caractères.");
  }

  return valeur;
}

/**
 * Crée un compte et ouvre la session dans la foulée.
 *
 * Le mot de passe en clair ne quitte jamais cette fonction : seul son hash
 * bcrypt est transmis à la couche base de données.
 *
 * @throws {ValidationError} pseudo ou mot de passe invalide
 * @throws {ConflictError}   pseudo déjà pris
 */
export async function inscrire(
  username: unknown,
  password: unknown,
): Promise<Player> {
  const motDePasse = motDePasseValide(password);
  const hash = await bcrypt.hash(motDePasse, COUT_BCRYPT);

  // createPlayer valide le pseudo et refuse les doublons.
  const joueur = await createPlayer(username, hash, couleurDepuisPseudo(String(username)));

  await createSession(joueur.id);

  return joueur;
}

/**
 * Vérifie les identifiants et ouvre la session.
 *
 * @returns le joueur, ou null si le couple pseudo / mot de passe est faux
 */
export async function connecter(
  username: unknown,
  password: unknown,
): Promise<Player | null> {
  if (typeof username !== "string" || typeof password !== "string") {
    throw new ValidationError("Pseudo et mot de passe sont obligatoires.");
  }

  const compte = await getPlayerCredentials(username.trim());

  // Comparaison menée dans tous les cas, même sans compte : le temps de
  // réponse ne doit pas révéler si le pseudo existe.
  const correspond = await bcrypt.compare(password, compte?.passwordHash ?? HASH_LEURRE);

  if (!compte || !correspond) return null;

  await createSession(compte.id);

  return getPlayerById(compte.id);
}

/** Ferme la session du joueur courant. */
export async function deconnecter(): Promise<void> {
  await deleteSession();
}

/** Couleur d'avatar déduite du pseudo, pour que chacun ait la sienne. */
function couleurDepuisPseudo(pseudo: string): string {
  const palette = [
    "#a855f7",
    "#5b83ff",
    "#ff8a1f",
    "#22d3ee",
    "#34d399",
    "#ffc53d",
    "#ff5069",
    "#c084fc",
  ];

  let somme = 0;
  for (const caractere of pseudo) somme += caractere.codePointAt(0) ?? 0;

  return palette[somme % palette.length];
}
