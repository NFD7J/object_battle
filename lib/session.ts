import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/* ===========================================================================
   Sessions sans état (§16)

   L'identifiant du joueur est stocké dans un jeton JWT signé, déposé dans un
   cookie httpOnly. Signé veut dire : le navigateur peut lire le cookie mais
   pas le fabriquer. Modifier le numéro de joueur invalide la signature, et le
   serveur rejette le jeton.

   httpOnly veut dire : le JavaScript de la page ne peut pas y accéder, ce qui
   limite la casse en cas de faille XSS.
   =========================================================================== */

const NOM_COOKIE = "ob_session";
const DUREE_JOURS = 7;

export type SessionPayload = {
  /** Identifiant du joueur. Rien d'autre : pas de pseudo, jamais de mot de passe. */
  playerId: number;
};

function cleDeSignature(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET est absent. Générez-en un avec :\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"\n',
    );
  }

  return new TextEncoder().encode(secret);
}

/** Fabrique un jeton signé valable 7 jours. */
async function signer(payload: SessionPayload): Promise<string> {
  return new SignJWT({ playerId: payload.playerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_JOURS}d`)
    .sign(cleDeSignature());
}

/**
 * Vérifie un jeton et en extrait le contenu.
 * Renvoie null si le jeton est absent, expiré, ou si sa signature ne colle pas.
 */
async function verifier(jeton: string | undefined): Promise<SessionPayload | null> {
  if (!jeton) return null;

  try {
    const { payload } = await jwtVerify(jeton, cleDeSignature(), {
      algorithms: ["HS256"],
    });

    const playerId = payload.playerId;

    if (typeof playerId !== "number" || !Number.isInteger(playerId)) return null;

    return { playerId };
  } catch {
    // Signature invalide, jeton expiré ou malformé : pas de session, sans bruit.
    return null;
  }
}

/** Ouvre une session : appelé après une inscription ou une connexion réussie. */
export async function createSession(playerId: number): Promise<void> {
  const expiration = new Date(Date.now() + DUREE_JOURS * 24 * 60 * 60 * 1000);
  const jeton = await signer({ playerId });
  const magasin = await cookies();

  magasin.set(NOM_COOKIE, jeton, {
    httpOnly: true,
    // En développement le site tourne en http, le cookie ne partirait pas
    // si on exigeait https.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiration,
    path: "/",
  });
}

/** Ferme la session en supprimant le cookie. */
export async function deleteSession(): Promise<void> {
  const magasin = await cookies();
  magasin.delete(NOM_COOKIE);
}

/** Lit la session du cookie de la requête en cours. */
export async function readSession(): Promise<SessionPayload | null> {
  const magasin = await cookies();
  return verifier(magasin.get(NOM_COOKIE)?.value);
}
