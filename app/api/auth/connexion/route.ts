import { apiError, handleApiError, readJsonBody } from "@/lib/api";
import { connecter } from "@/lib/auth";

/**
 * POST /api/auth/connexion
 * Vérifie les identifiants et ouvre une session.
 *
 * Corps attendu : { "username": "Noe", "password": "…" }
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const joueur = await connecter(body.username, body.password);

    if (!joueur) {
      // Message volontairement vague : préciser « pseudo inconnu » ou
      // « mauvais mot de passe » indiquerait quels comptes existent.
      return apiError(401, "IDENTIFIANTS", "Pseudo ou mot de passe incorrect.");
    }

    return Response.json({ joueur });
  } catch (error) {
    return handleApiError(error);
  }
}
