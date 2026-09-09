import { handleApiError, readJsonBody } from "@/lib/api";
import { inscrire } from "@/lib/auth";

/**
 * POST /api/auth/inscription
 * Crée un compte et connecte le joueur dans la foulée.
 *
 * Corps attendu : { "username": "Noe", "password": "…" }
 *
 * Réponse : le joueur créé, plus un cookie de session httpOnly.
 * Le mot de passe n'est jamais renvoyé, ni son hash.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const joueur = await inscrire(body.username, body.password);

    return Response.json({ joueur }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
