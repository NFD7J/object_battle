import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CombatantPortrait } from "@/components/combatant-card";
import { FightRow } from "@/components/fight-row";
import { PlayerAvatar } from "@/components/ranking-table";
import { Panel, PageHeader, SectionTitle, Tag, btn, btnLabel } from "@/components/ui";
import { getCurrentPlayer } from "@/lib/auth";
import { getAllObjects, getFightsByPlayer, getPlayerRank } from "@/lib/queries";

import { ProfilView } from "@/app/profil/profil-view";

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Votre profil Object Battle : points, victoires, taux de réussite, position au classement et derniers combats.",
};

export default async function ProfilPage() {
  const currentPlayer = await getCurrentPlayer();

  // Page réservée aux joueurs connectés.
  if (!currentPlayer) {
    redirect("/connexion");
  }

  const [rang, derniersCombats, objets] = await Promise.all([
    getPlayerRank(currentPlayer.id),
    getFightsByPlayer(currentPlayer.id, 3),
    getAllObjects(),
  ]);

  const tauxVictoire =
    currentPlayer.nbCombats === 0
      ? 0
      : Math.round((currentPlayer.nbVictoires / currentPlayer.nbCombats) * 100);

  const objetsFavoris = objets.slice(0, 3);

  const chiffres = [
    { label: "Points", valeur: currentPlayer.points.toLocaleString("fr-FR"), couleur: "text-arcade-gold" },
    { label: "Record", valeur: currentPlayer.maxPoints.toLocaleString("fr-FR"), couleur: "text-arcade-cyan" },
    { label: "Victoires", valeur: currentPlayer.nbVictoires, couleur: "text-victory" },
    { label: "Combats", valeur: currentPlayer.nbCombats, couleur: "text-white" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Joueur"
        title="Mon profil"
        subtitle="Vos points, vos victoires et vos derniers combats."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* ---------------------------------------------------------------- */}
        {/* Carte de joueur                                                   */}
        {/* ---------------------------------------------------------------- */}
        <Panel tone="violet" innerClassName="relative overflow-hidden">
          <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-40" />

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <PlayerAvatar player={currentPlayer} size={88} />

            <div className="min-w-0 flex-1">
              <Tag className="bg-arcade-violet/25 text-arcade-cyan">
                Membre depuis {currentPlayer.createdAt}
              </Tag>
              <h2 className="skew-title mt-3 text-4xl leading-none sm:text-5xl">
                {currentPlayer.username}
              </h2>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
                <span>
                  <span aria-hidden="true">🏆</span> {rang ?? "—"}
                  <sup>e</sup> au classement
                </span>
                <span>
                  <span aria-hidden="true">⚡</span> {tauxVictoire} % de réussite
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3 sm:flex-col">
              <Link href="/combattre" className={`${btn.base} ${btn.secondary}`}>
                <span className={btnLabel}>Combattre</span>
              </Link>
              <Link href="/classement" className={`${btn.base} ${btn.ghost}`}>
                <span className={btnLabel}>Classement</span>
              </Link>
            </div>
          </div>
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Chiffres clés                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="titre-chiffres" className="mt-10">
          <h2 id="titre-chiffres" className="sr-only">
            Statistiques du joueur
          </h2>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {chiffres.map((chiffre) => (
              <div key={chiffre.label}>
                <Panel innerClassName="p-5">
                  <dt className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                    {chiffre.label}
                  </dt>
                  <dd className={`mt-1 font-display text-3xl leading-none tabular-nums ${chiffre.couleur}`}>
                    {chiffre.valeur}
                  </dd>
                </Panel>
              </div>
            ))}
          </dl>

          {/* Barre de progression vers le record personnel */}
          <Panel className="mt-3" innerClassName="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Progression vers le record
              </h3>
              <p className="font-mono text-sm text-white/70 tabular-nums">
                {currentPlayer.points.toLocaleString("fr-FR")} /{" "}
                {currentPlayer.maxPoints.toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="relative mt-3 h-3 border border-edge bg-void">
              <div
                className="h-full bg-linear-to-r from-arcade-violet to-arcade-cyan"
                style={{
                  width: `${
                    currentPlayer.maxPoints > 0
                      ? Math.round((currentPlayer.points / currentPlayer.maxPoints) * 100)
                      : 0
                  }%`,
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent_0_11px,rgba(6,4,13,0.85)_11px_13px)]"
              />
            </div>
          </Panel>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Objets favoris                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12">
          <SectionTitle href="/objets" linkLabel="Tout le roster">
            Objets les plus joués
          </SectionTitle>
          <ul className="grid gap-3 sm:grid-cols-3">
            {objetsFavoris.map((combatant) => (
              <li key={combatant.id}>
                <Link href={`/objets/${combatant.slug}`} className="block">
                  <Panel innerClassName="flex items-center gap-4 p-4 transition-colors hover:bg-panel-soft">
                    <CombatantPortrait
                      combatant={combatant}
                      className="cut-corner-sm h-16 w-16 shrink-0"
                      sizes="64px"
                    />
                    <span>
                      <span className="block font-display text-xl text-white">
                        {combatant.name}
                      </span>
                      <span className="block font-mono text-xs text-white/50">
                        {combatant.nbWins} victoires
                      </span>
                    </span>
                  </Panel>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Derniers combats                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12">
          <SectionTitle href="/historique" linkLabel="Tout l'historique">
            Mes derniers combats
          </SectionTitle>
          {derniersCombats.length > 0 ? (
            <ul className="grid gap-3">
              {derniersCombats.map((fight) => (
                <li key={fight.id}>
                  <FightRow fight={fight} compact />
                </li>
              ))}
            </ul>
          ) : (
            <Panel innerClassName="p-8 text-center">
              <p className="font-display text-2xl text-white/60">
                Aucun combat pour le moment
              </p>
              <p className="mt-2 text-sm text-white/50">
                Choisissez deux objets et lancez votre premier round.
              </p>
              <Link href="/combattre" className={`${btn.base} ${btn.primary} mt-6`}>
                <span className={btnLabel}>Combattre</span>
              </Link>
            </Panel>
          )}
        </section>
      </div>
    </>
  );
  return <ProfilView />;
}
