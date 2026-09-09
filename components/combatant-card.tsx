import Image from "next/image";
import Link from "next/link";

import { StatList } from "@/components/stat-bar";
import { Panel, Tag, btn, btnLabel } from "@/components/ui";
import type { Combatant } from "@/lib/types";

/**
 * Portrait encadré d'un objet. L'image vient de /public pour l'instant ;
 * elle pointera vers le CDN Vercel Blob une fois l'upload en place (§7).
 */
export function CombatantPortrait({
  combatant,
  className = "",
  sizes = "160px",
  priority = false,
}: {
  combatant: Combatant;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`arena-grid relative overflow-hidden bg-linear-to-b from-panel-soft to-void ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-arcade-violet/25 to-transparent"
      />
      <Image
        src={combatant.image}
        alt={`Illustration de l'objet ${combatant.name}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain p-4 drop-shadow-[0_6px_18px_rgba(168,85,247,0.45)]"
      />
    </div>
  );
}

/** Pastille du score global, affichée en haut à droite des cartes. */
export function OverallBadge({ value }: { value: number }) {
  return (
    <span className="flex -skew-x-6 items-center gap-1.5 bg-linear-to-r from-arcade-orange to-arcade-gold px-3 py-1 text-void">
      <span className="skew-x-6 font-mono text-[10px] tracking-widest uppercase">
        Score
      </span>
      <span className="skew-x-6 font-display text-lg leading-none tabular-nums">
        {value}
      </span>
    </span>
  );
}

/**
 * Carte d'objet utilisée sur la page Objets et sur l'accueil.
 * Les stats sont repliées derrière un bouton (§4.3) via <details>, ce qui
 * fonctionne sans JavaScript et reste accessible au clavier.
 */
export function CombatantCard({
  combatant,
  priority = false,
}: {
  combatant: Combatant;
  priority?: boolean;
}) {
  return (
    <Panel innerClassName="flex h-full flex-col">
      <div className="relative">
        <CombatantPortrait
          combatant={combatant}
          className="h-44 w-full"
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
          priority={priority}
        />
        <div className="absolute top-3 right-3">
          <OverallBadge value={combatant.overall} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 border-t border-edge p-4">
        <div>
          <h3 className="text-2xl leading-none">
            <Link
              href={`/objets/${combatant.slug}`}
              className="text-white transition-colors hover:text-arcade-cyan"
            >
              {combatant.name}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">
            {combatant.description}
          </p>
        </div>

        <p className="flex flex-wrap gap-2">
          <Tag className="bg-victory/15 text-victory">
            {combatant.nbWins} V
          </Tag>
          <Tag className="bg-defeat/15 text-defeat">
            {combatant.nbLosses} D
          </Tag>
        </p>

        <details className="group mt-auto border-t border-edge/70 pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-xs tracking-[0.14em] text-arcade-cyan uppercase">
            Afficher les stats
            <span
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
            >
              &#9662;
            </span>
          </summary>
          <div className="pt-4">
            <StatList stats={combatant.stats} />
          </div>
        </details>

        <Link href={`/objets/${combatant.slug}`} className={`${btn.base} ${btn.ghost} w-full !py-2.5 text-base`}>
          <span className={btnLabel}>Voir la fiche</span>
        </Link>
      </div>
    </Panel>
  );
}
