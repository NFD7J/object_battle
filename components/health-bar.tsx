"use client";

import { useEffect, useState } from "react";

import { PV_MAX } from "@/lib/fight-engine";

/**
 * Barre de vie d'un combattant. Tous les objets démarrent à `PV_MAX` PV : la
 * jauge ne dépend d'aucune caractéristique, seulement de l'issue du combat.
 */

/**
 * Durée de la descente de la jauge, en millisecondes.
 *
 * Volontairement longue : le combat n'est pas une transition, c'est le moment
 * qu'on regarde. Douze secondes laissent aussi la place à ce qui viendra s'y
 * greffer plus tard — commentaires en direct, échanges de coups annoncés.
 *
 * Exportée pour que l'arène attende exactement la fin du vidage avant
 * d'annoncer le résultat : une seule valeur à changer pour rallonger ou
 * raccourcir le combat.
 */
export const DUREE_PV = 12_000;

/** Vrai si le système demande de limiter les animations (accessibilité). */
export function mouvementReduit(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Couleur de la jauge selon les PV restants (vert → or → rouge). */
function couleur(pv: number): { barre: string; texte: string } {
  if (pv > 50) return { barre: "from-victory to-arcade-cyan", texte: "text-victory" };
  if (pv > 20) return { barre: "from-arcade-gold to-arcade-orange", texte: "text-arcade-gold" };
  return { barre: "from-defeat to-arcade-orange", texte: "text-defeat" };
}

export function HealthBar({
  pv,
  mirrored = false,
  anime = false,
  size = "md",
  nom,
}: {
  pv: number;
  mirrored?: boolean;
  /** Fait descendre la jauge depuis `PV_MAX` à l'affichage du résultat. */
  anime?: boolean;
  size?: "sm" | "md";
  /** Libellé à gauche (nom du combattant en historique). */
  nom?: string;
}) {
  const affiche = usePvAnimes(pv, anime);
  const pourcentage = Math.max(0, Math.min(100, (affiche / PV_MAX) * 100));
  const { barre, texte } = couleur(affiche);
  const horsCombat = affiche === 0;
  const compact = size === "sm";
  const libelle = nom ?? (horsCombat ? "K.O." : "Points de vie");

  return (
    <div>
      <div
        className={`flex items-baseline gap-2 font-mono tracking-[0.12em] uppercase ${
          compact ? "text-[10px]" : "text-[11px]"
        } ${mirrored ? "flex-row-reverse" : ""}`}
      >
        <span className={`truncate ${horsCombat && nom ? "text-defeat" : "text-white/60"}`}>
          {libelle}
        </span>
        <span className={`ml-auto shrink-0 font-bold tabular-nums ${texte}`}>
          {horsCombat && nom ? "K.O." : `${affiche} / ${PV_MAX}`}
        </span>
      </div>

      <div
        className={`relative mt-1 border-2 border-edge bg-void ${
          compact ? "h-2.5" : "h-4"
        } ${mirrored ? "flex justify-end" : ""}`}
        role="meter"
        aria-valuenow={affiche}
        aria-valuemin={0}
        aria-valuemax={PV_MAX}
        aria-label={
          nom
            ? `${nom} : ${affiche} points de vie sur ${PV_MAX}`
            : `Points de vie : ${affiche} sur ${PV_MAX}`
        }
      >
        <div
          className={`h-full bg-linear-to-r transition-[width] duration-200 ease-linear ${barre}`}
          style={{ width: `${pourcentage}%` }}
        />
        {/* Encoches décoratives, façon jauge de borne d'arcade */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${
            compact
              ? "bg-[repeating-linear-gradient(to_right,transparent_0_7px,rgba(6,4,13,0.85)_7px_9px)]"
              : "bg-[repeating-linear-gradient(to_right,transparent_0_13px,rgba(6,4,13,0.85)_13px_15px)]"
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Fait défiler les PV de `PV_MAX` jusqu'à la valeur finale.
 *
 * Cette descente ne s'efface PAS devant « prefers-reduced-motion ». Elle n'est
 * pas un ornement : c'est le déroulé du combat, la seule chose qui se passe à
 * l'écran pendant ces douze secondes. La couper reviendrait à supprimer la
 * fonctionnalité, pas à l'adoucir.
 *
 * Le réglage garde tout son effet sur ce qui est réellement décoratif — le
 * tremblement des portraits, le halo du « VS » — que la règle
 * @media (prefers-reduced-motion: reduce) de globals.css neutralise déjà.
 */
function usePvAnimes(pv: number, anime: boolean): number {
  const [affiche, setAffiche] = useState(anime ? PV_MAX : pv);

  useEffect(() => {
    if (!anime || pv === PV_MAX) {
      setAffiche(pv);
      return;
    }

    let debut: number | null = null;
    let frame = requestAnimationFrame(function etape(horodatage) {
      debut ??= horodatage;
      const avancement = Math.min(1, (horodatage - debut) / DUREE_PV);
      setAffiche(Math.round(PV_MAX + (pv - PV_MAX) * avancement));
      if (avancement < 1) frame = requestAnimationFrame(etape);
    });

    return () => cancelAnimationFrame(frame);
  }, [pv, anime]);

  return affiche;
}
