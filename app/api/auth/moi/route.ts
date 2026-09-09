import { handleApiError } from "@/lib/api";
import { getCurrentPlayer } from "@/lib/auth";

/**
 * GET /api/auth/moi
 * Le joueur connecte, ou null. Sert au client a savoir s'il y a une session.
 */
export async function GET(): Promise<Response> {
  try {
    return Response.json({ joueur: await getCurrentPlayer() });
  } catch (error) {
    return handleApiError(error);
  }
}
