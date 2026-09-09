import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CombatantPortrait, OverallBadge } from "@/components/combatant-card";
import { HistoryList } from "@/components/history-list";
import { StatList } from "@/components/stat-bar";
import { Panel, SectionTitle, Tag, btn, btnLabel } from "@/components/ui";
import { combatants, getCombatantBySlug } from "@/lib/mock-data";
import { STAT_HINTS, STAT_KEYS, STAT_LABELS } from "@/lib/types";

/** Une page statique par objet : URL propre du type /objets/marteau (§15). */
export function generateStaticParams() {
  return combatants.map((combatant) => ({ slug: combatant.slug }));
}

export async function generateMetadata(
  props: PageProps<"/objets/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const combatant = getCombatantBySlug(slug);

  if (!combatant) {
    return { title: "Objet introuvable" };
  }

  return {
    title: combatant.name,
    description: `${combatant.name} : ${combatant.description} Score global ${combatant.overall}, ${combatant.nbWins} victoires et ${combatant.nbLosses} défaites.`,
  };
}

export default async function FicheObjetPage(props: PageProps<"/objets/[slug]">) {
  const { slug } = await props.params;
  const combatant = getCombatantBySlug(slug);

  if (!combatant) {
    notFound();
  }

  const autresObjets = combatants
    .filter((autre) => autre.id !== combatant.id)
    .slice(0, 3);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Fiche du combattant                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-edge bg-abyss">
        <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-40" />
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-arcade-blue/20 blur-[110px]"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
          <nav aria-label="Fil d'Ariane" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase">
              <li>
                <Link href="/" className="text-white/50 hover:text-arcade-cyan">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true" className="text-white/25">
                /
              </li>
              <li>
                <Link href="/objets" className="text-white/50 hover:text-arcade-cyan">
                  Objets
                </Link>
              </li>
              <li aria-hidden="true" className="text-white/25">
                /
              </li>
              <li className="text-arcade-cyan" aria-current="page">
                {combatant.name}
              </li>
            </ol>
          </nav>

          <div className="grid gap-8 md:grid-cols-[300px_1fr] md:items-start">
            <Panel tone="violet" innerClassName="p-4">
              <CombatantPortrait
                combatant={combatant}
                className="cut-corner-sm aspect-square w-full"
                sizes="(min-width: 768px) 300px, 90vw"
                priority
              />
            </Panel>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Tag className="bg-arcade-violet/20 text-arcade-cyan">Fiche objet</Tag>
                <OverallBadge value={combatant.overall} />
              </div>

              <h1 className="skew-title mt-4 text-5xl leading-none sm:text-6xl">
                {combatant.name}
              </h1>

              <p className="mt-4 max-w-2xl leading-relaxed text-white/70">
                {combatant.description}
              </p>

              <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
                <div className="cut-corner-sm border border-edge bg-panel px-4 py-3">
                  <dt className="font-mono text-[10px] tracking-[0.14em] text-white/50 uppercase">
                    Victoires
                  </dt>
                  <dd className="font-display text-2xl text-victory tabular-nums">
                    {combatant.nbWins}
                  </dd>
                </div>
                <div className="cut-corner-sm border border-edge bg-panel px-4 py-3">
                  <dt className="font-mono text-[10px] tracking-[0.14em] text-white/50 uppercase">
                    Défaites
                  </dt>
                  <dd className="font-display text-2xl text-defeat tabular-nums">
                    {combatant.nbLosses}
                  </dd>
                </div>
                <div className="cut-corner-sm border border-edge bg-panel px-4 py-3">
                  <dt className="font-mono text-[10px] tracking-[0.14em] text-white/50 uppercase">
                    Combats
                  </dt>
                  <dd className="font-display text-2xl text-white tabular-nums">
                    {combatant.nbWins + combatant.nbLosses}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/combattre" className={`${btn.base} ${btn.primary}`}>
                  <span className={btnLabel}>
                    <span aria-hidden="true">&#9876;</span> Envoyer au combat
                  </span>
                </Link>
                <Link href="/objets" className={`${btn.base} ${btn.ghost}`}>
                  <span className={btnLabel}>Retour au roster</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Caractéristiques détaillées                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionTitle>Caractéristiques</SectionTitle>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel innerClassName="p-6">
            <StatList stats={combatant.stats} />
            <p className="mt-6 border-t border-edge pt-4 font-mono text-xs text-white/45">
              Chaque caractéristique est notée de 0 à 100.
            </p>
          </Panel>

          <Panel innerClassName="p-6">
            <h3 className="text-xl text-white">À quoi servent ces stats ?</h3>
            <dl className="mt-4 grid gap-4">
              {STAT_KEYS.map((key) => (
                <div key={key} className="border-l-2 border-arcade-violet/60 pl-4">
                  <dt className="font-display text-lg tracking-wide text-arcade-cyan">
                    {STAT_LABELS[key]}
                  </dt>
                  <dd className="text-sm text-white/60">{STAT_HINTS[key]}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Historique de l'objet                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-edge bg-abyss">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <SectionTitle href="/historique" linkLabel="Tout l'historique">
            Derniers combats de {combatant.name}
          </SectionTitle>

          <HistoryList
            compact
            combatantId={combatant.id}
            filtres={false}
            emptyTitle="Aucun combat ici"
            emptyText="Cet objet n'est encore jamais monté sur le ring."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Adversaires suggérés                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionTitle href="/objets" linkLabel="Tout le roster">
          Adversaires possibles
        </SectionTitle>

        <ul className="grid gap-3 sm:grid-cols-3">
          {autresObjets.map((autre) => (
            <li key={autre.id}>
              <Link href={`/objets/${autre.slug}`} className="block">
                <Panel innerClassName="flex items-center gap-4 p-4 transition-colors hover:bg-panel-soft">
                  <CombatantPortrait
                    combatant={autre}
                    className="cut-corner-sm h-16 w-16 shrink-0"
                    sizes="64px"
                  />
                  <span>
                    <span className="block font-display text-xl text-white">
                      {autre.name}
                    </span>
                    <span className="block font-mono text-xs text-arcade-gold">
                      Score {autre.overall}
                    </span>
                  </span>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
