import Link from "next/link";
import type { ReactNode } from "react";

/* --------------------------------------------------------------------------
   Briques d'interface réutilisées sur toutes les pages.
   -------------------------------------------------------------------------- */

/** Classes des boutons « borne d'arcade ». Le libellé est redressé par `btnLabel`. */
export const btn = {
  base:
    "group inline-flex -skew-x-6 items-center justify-center gap-2 border px-7 py-3 font-display text-lg tracking-wider uppercase transition-transform transition-colors duration-150 hover:-translate-y-0.5 active:translate-y-0.5",
  primary:
    "border-transparent bg-linear-to-r from-arcade-violet to-arcade-blue text-white shadow-[0_10px_30px_-10px_var(--color-arcade-violet)] hover:from-arcade-blue hover:to-arcade-violet",
  secondary:
    "border-transparent bg-linear-to-r from-arcade-orange to-arcade-gold text-void shadow-[0_10px_30px_-10px_var(--color-arcade-orange)] hover:brightness-110",
  ghost:
    "border-edge bg-panel/70 text-white hover:border-arcade-violet hover:bg-panel-soft",
} as const;

/** Redresse le texte à l'intérieur d'un bouton penché. */
export const btnLabel = "flex skew-x-6 items-center gap-2";

/** Cadre biseauté avec liseré dégradé, utilisé pour tous les panneaux. */
export function Panel({
  children,
  className = "",
  innerClassName = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  tone?: "default" | "violet" | "victory" | "defeat";
}) {
  const frames = {
    default: "from-edge via-edge to-arcade-violet/40",
    violet: "from-arcade-violet via-arcade-blue to-arcade-cyan",
    victory: "from-victory via-victory/40 to-victory",
    defeat: "from-defeat via-defeat/40 to-defeat",
  } as const;

  return (
    <div className={`cut-corner bg-linear-to-br p-[2px] ${frames[tone]} ${className}`}>
      <div className={`cut-corner h-full bg-panel ${innerClassName}`}>{children}</div>
    </div>
  );
}

/** Petite étiquette penchée (rôle, tri, statut…). */
export function Tag({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`tag-slant inline-block px-3 py-1 font-mono text-[11px] tracking-[0.18em] uppercase ${className}`}
    >
      {children}
    </span>
  );
}

/** En-tête de page : fil d'Ariane visuel + H1 + accroche. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-b border-edge/70 bg-abyss">
      <div className="scanlines">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between md:py-14">
          <div>
            <Tag className="bg-arcade-violet/20 text-arcade-cyan">{eyebrow}</Tag>
            <h1 className="mt-4 skew-title text-4xl leading-none sm:text-5xl md:text-6xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </header>
  );
}

/** Titre de section avec barre lumineuse à gauche. */
export function SectionTitle({
  children,
  href,
  linkLabel,
}: {
  children: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 text-2xl sm:text-3xl">
        <span
          aria-hidden="true"
          className="block h-7 w-1.5 -skew-x-12 bg-linear-to-b from-arcade-violet to-arcade-blue"
        />
        {children}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="font-mono text-xs tracking-[0.16em] text-arcade-cyan uppercase underline-offset-4 hover:underline"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}
