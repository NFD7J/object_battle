import type { Stats } from "@/lib/types";
import { STAT_KEYS, STAT_LABELS } from "@/lib/types";

const TONES = {
  violet: "from-arcade-violet to-arcade-blue",
  orange: "from-arcade-orange to-arcade-gold",
  cyan: "from-arcade-cyan to-arcade-blue",
} as const;

export type StatTone = keyof typeof TONES;

/**
 * Jauge façon barre de vie : segmentée, avec la valeur chiffrée à côté du
 * libellé pour ne pas dépendre uniquement de la couleur (accessibilité, §14).
 */
export function StatBar({
  label,
  value,
  tone = "violet",
  mirrored = false,
}: {
  label: string;
  value: number;
  tone?: StatTone;
  mirrored?: boolean;
}) {
  return (
    <div>
      <div
        className={`flex items-baseline gap-2 font-mono text-[11px] tracking-[0.12em] uppercase ${
          mirrored ? "flex-row-reverse" : ""
        }`}
      >
        <span className="text-white/60">{label}</span>
        <span className="ml-auto font-bold text-white tabular-nums">{value}</span>
      </div>

      <div
        className={`relative mt-1 h-2.5 border border-edge bg-void ${
          mirrored ? "flex justify-end" : ""
        }`}
      >
        <div
          className={`h-full bg-linear-to-r ${TONES[tone]}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
        {/* Encoches décoratives, comme les segments d'une barre de vie */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent_0_11px,rgba(6,4,13,0.85)_11px_13px)]"
        />
      </div>
    </div>
  );
}

/** Les 4 jauges d'un objet, dans l'ordre défini par STAT_KEYS. */
export function StatList({
  stats,
  tone = "violet",
  mirrored = false,
}: {
  stats: Stats;
  tone?: StatTone;
  mirrored?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {STAT_KEYS.map((key) => (
        <StatBar
          key={key}
          label={STAT_LABELS[key]}
          value={stats[key]}
          tone={tone}
          mirrored={mirrored}
        />
      ))}
    </div>
  );
}
