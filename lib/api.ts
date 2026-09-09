import "server-only";

import { ConflictError, ValidationError } from "@/lib/db";

/* ===========================================================================
   Utilitaires communs aux routes de l'API REST.

   Toutes les réponses ont la même forme, pour que le client n'ait qu'un seul
   cas à traiter :
     succès  -> les données demandées, en JSON
     échec   -> { error: { code, message } }
   =========================================================================== */

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

/** Réponse d'erreur normalisée. */
export function apiError(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}

/**
 * Traduit une exception en réponse HTTP.
 *
 * Les erreurs attendues (validation, conflit) portent un message destiné à
 * l'utilisateur. Toute autre erreur est journalisée côté serveur et renvoyée
 * en 500 générique : un message d'erreur PostgreSQL ne doit jamais arriver
 * dans le navigateur, il renseignerait un attaquant sur le schéma (§16).
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof ValidationError) {
    return apiError(400, "VALIDATION", error.message);
  }

  if (error instanceof ConflictError) {
    return apiError(409, "CONFLIT", error.message);
  }

  console.error("[api] erreur inattendue :", error);

  return apiError(500, "ERREUR_SERVEUR", "Une erreur est survenue, réessayez.");
}

/**
 * Lit le corps JSON d'une requête.
 *
 * @throws {ValidationError} si le corps n'est pas un objet JSON valide
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    throw new ValidationError("Le corps de la requête doit être du JSON valide.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError("Le corps de la requête doit être un objet JSON.");
  }

  return parsed as Record<string, unknown>;
}

/** Lit un entier dans la query string, avec une valeur par défaut. */
export function readIntParam(
  request: Request,
  nom: string,
  defaut: number,
): number {
  const brut = new URL(request.url).searchParams.get(nom);

  if (brut === null) return defaut;

  const valeur = Number(brut);

  if (!Number.isInteger(valeur) || valeur <= 0) {
    throw new ValidationError(`Le paramètre « ${nom} » doit être un entier positif.`);
  }

  return valeur;
}
