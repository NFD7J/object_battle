import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Connexion à PostgreSQL (Neon).
 *
 * `import "server-only"` fait échouer la compilation si ce module est importé
 * depuis un composant client : la chaîne de connexion ne peut donc jamais
 * partir dans le bundle du navigateur (§16).
 */

let client: NeonQueryFunction<false, false> | undefined;

/**
 * Renvoie le client SQL, créé à la première utilisation.
 *
 * La création est paresseuse volontairement : sans cela, un `next build` sur
 * une machine dépourvue de DATABASE_URL échouerait au simple chargement du
 * module, même pour des pages qui ne touchent pas à la base.
 *
 * Usage : les requêtes s'écrivent en template balisé, ce qui envoie les
 * valeurs en paramètres séparés du SQL. C'est ce qui protège des injections —
 * ne jamais construire une requête par concaténation de chaînes.
 *
 *   const sql = getSql();
 *   const rows = await sql`SELECT * FROM objects WHERE slug = ${slug}`;
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL est absent. Copiez .env.example vers .env.local et " +
          "renseignez la chaîne de connexion fournie par Neon.",
      );
    }

    client = neon(connectionString);
  }

  return client;
}

/** Erreur de validation : donnée refusée avant d'atteindre la base. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Erreur de conflit : la donnée existe déjà (contrainte d'unicité). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
