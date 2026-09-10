"use client";

import { useEffect, useRef, useState } from "react";

import { PV_MAX } from "@/lib/fight-engine";

/**
 * Barre de vie d'un combattant. Tous les objets démarrent à `PV_MAX` PV : la
 * jauge ne dépend d'aucune caractéristique, seulement de l'issue du combat.
 *
 * La jauge ne connaît pas le déroulé du combat : elle rejoint la valeur qu'on
 * lui donne, dans le temps qu'on lui donne. C'est l'arène qui décide quand un
 * coup porte et de combien il entame la barre (lib/choreographie.ts).
 */

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
  duree = 0,
  size = "md",
  nom,
}: {
  pv: number;
  mirrored?: boolean;
  /**
   * Temps mis pour rejoindre `pv`, en millisecondes. À 0 — le cas d'une jauge
   * de l'historique — la valeur s'affiche telle quelle, sans descente.
   */
  duree?: number;
  size?: "sm" | "md";
  /** Libellé à gauche (nom du combattant en historique). */
  nom?: string;
}) {
  const affiche = usePvProgressif(pv, duree);
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
        {/* Pas de transition CSS : la largeur suit `affiche`, que la descente
            anime déjà image par image. Les deux se combattraient. */}
        <div
          className={`h-full bg-linear-to-r ${barre}`}
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
 * Fait descendre la jauge depuis là où elle en est jusqu'à `cible`.
 *
 * Chaque coup encaissé change la cible, et la barre repart de sa valeur
 * courante : c'est ce qui donne l'à-coup, là où une descente unique et
 * régulière ne racontait rien du combat.
 *
 * Cette descente ne s'efface PAS devant « prefers-reduced-motion ». Elle n'est
 * pas un ornement : c'est le déroulé du combat. La couper reviendrait à
 * supprimer la fonctionnalité, pas à l'adoucir. Le réglage garde tout son
 * effet sur ce qui est réellement décoratif — le bond des cartes, le halo du
 * « VS » — que la règle @media de globals.css neutralise déjà.
 */
function usePvProgressif(cible: number, duree: number): number {
  const [affiche, setAffiche] = useState(cible);

  // Point de départ de la prochaine descente. En ref et non en dépendance :
  // sinon chaque image relancerait l'effet, qui repartirait de zéro.
  const courant = useRef(cible);
  useEffect(() => {
    courant.current = affiche;
  }, [affiche]);

  useEffect(() => {
    if (duree <= 0) {
      setAffiche(cible);
      return;
    }

    const depart = courant.current;
    if (depart === cible) return;

    let debut: number | null = null;
    let frame = requestAnimationFrame(function etape(horodatage) {
      debut ??= horodatage;
      const avancement = Math.min(1, (horodatage - debut) / duree);
      // Décélération : le coup entame la jauge d'un coup sec, puis s'amortit.
      const amorti = 1 - (1 - avancement) ** 3;
      setAffiche(Math.round(depart + (cible - depart) * amorti));
      if (avancement < 1) frame = requestAnimationFrame(etape);
    });

    return () => cancelAnimationFrame(frame);
  }, [cible, duree]);

  return affiche;
}
