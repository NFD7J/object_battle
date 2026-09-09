"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Panel, btn, btnLabel } from "@/components/ui";

type Mode = "inscription" | "connexion";

type Reponse = { joueur?: { username: string }; error?: { message?: string } };

const TEXTES = {
  inscription: {
    endpoint: "/api/auth/inscription",
    bouton: "Créer mon compte",
    boutonEnCours: "Création…",
    lienTexte: "Déjà un compte ?",
    lienLibelle: "Se connecter",
    lienHref: "/connexion",
    autoComplete: "new-password",
  },
  connexion: {
    endpoint: "/api/auth/connexion",
    bouton: "Entrer dans l'arène",
    boutonEnCours: "Connexion…",
    lienTexte: "Pas encore de compte ?",
    lienLibelle: "S'inscrire",
    lienHref: "/inscription",
    autoComplete: "current-password",
  },
} as const;

/**
 * Formulaire partagé par l'inscription et la connexion.
 *
 * Les contrôles faits ici sont un confort d'affichage. La validation qui fait
 * foi est celle du serveur : c'est la seule qu'on ne peut pas contourner (§16).
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const textes = TEXTES[mode];

  const [pseudo, setPseudo] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    try {
      const reponse = await fetch(textes.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: pseudo, password: motDePasse }),
      });

      const donnees: Reponse = await reponse.json();

      if (!reponse.ok || !donnees.joueur) {
        throw new Error(donnees.error?.message ?? "La demande a échoué.");
      }

      // Le cookie de session est posé : on recharge les composants serveur
      // pour que l'en-tête et le profil voient le joueur connecté.
      router.push("/profil");
      router.refresh();
    } catch (probleme) {
      setErreur(
        probleme instanceof Error ? probleme.message : "Une erreur est survenue.",
      );
      setEnCours(false);
    }
  }

  return (
    <Panel tone="violet" innerClassName="p-6 sm:p-8">
      <form onSubmit={envoyer} aria-busy={enCours} className="grid gap-5">
        <div>
          <label
            htmlFor="pseudo"
            className="mb-2 block font-mono text-xs tracking-[0.14em] text-arcade-cyan uppercase"
          >
            Pseudo
          </label>
          <input
            id="pseudo"
            name="username"
            type="text"
            required
            maxLength={24}
            autoComplete="username"
            value={pseudo}
            onChange={(event) => setPseudo(event.target.value)}
            placeholder="Votre nom de combattant"
            className="w-full border border-edge bg-panel-soft px-4 py-3 text-white placeholder:text-white/30 focus:border-arcade-violet focus:outline-none"
          />
          {mode === "inscription" ? (
            <p className="mt-1.5 font-mono text-[11px] text-white/40">
              Lettres, chiffres, tirets et underscores. 24 caractères maximum.
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="motdepasse"
            className="mb-2 block font-mono text-xs tracking-[0.14em] text-arcade-cyan uppercase"
          >
            Mot de passe
          </label>
          <input
            id="motdepasse"
            name="password"
            type="password"
            required
            minLength={mode === "inscription" ? 8 : undefined}
            autoComplete={textes.autoComplete}
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            className="w-full border border-edge bg-panel-soft px-4 py-3 text-white focus:border-arcade-violet focus:outline-none"
          />
          {mode === "inscription" ? (
            <p className="mt-1.5 font-mono text-[11px] text-white/40">
              8 caractères minimum.
            </p>
          ) : null}
        </div>

        {erreur ? (
          <p
            role="alert"
            className="cut-corner-sm border-2 border-defeat bg-defeat/10 px-4 py-3 text-sm text-defeat"
          >
            <span aria-hidden="true">✕</span> {erreur}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enCours}
          className={`${btn.base} ${btn.primary} w-full disabled:cursor-not-allowed disabled:from-edge disabled:to-edge disabled:text-white/40 disabled:shadow-none`}
        >
          <span className={btnLabel}>
            {enCours ? textes.boutonEnCours : textes.bouton}
          </span>
        </button>

        <p className="border-t border-edge pt-5 text-center text-sm text-white/60">
          {textes.lienTexte}{" "}
          <Link
            href={textes.lienHref}
            className="font-bold text-arcade-cyan underline-offset-4 hover:underline"
          >
            {textes.lienLibelle}
          </Link>
        </p>
      </form>
    </Panel>
  );
}
