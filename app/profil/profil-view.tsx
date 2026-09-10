"use client";

import Link from "next/link";

import { CombatantPortrait } from "@/components/object-card";
import { HistoryList } from "@/components/history-list";
import { PlayerAvatar } from "@/components/ranking-table";
import { Panel, PageHeader, SectionTitle, Tag, btn, btnLabel } from "@/components/ui";
import { useJoueur, useJoueurs } from "@/lib/game-store";
import type { Object } from "@/lib/types";

export function ProfilView({ objets }: { objets: Object[] }) {
  const joueur = useJoueur();
  const joueurs = useJoueurs();

  // La page serveur redirige déjà les visiteurs non connectés ; ce garde-fou
  // couvre le court instant avant que le store ait reçu le joueur.
  if (!joueur) return null;

  // Meme critere que la page Classement : le meilleur solde jamais atteint.
  // Trier ici sur les points courants afficherait un rang different de celui
  // du tableau, pour le meme joueur.
  const rang =
    [...joueurs].sort((a, b) => b.maxPoints - a.maxPoints).findIndex(
      (player) => player.id === joueur.id,
    ) + 1;

  const tauxVictoire =
    joueur.nbCombats === 0
      ? 0
      : Math.round((joueur.nbVictoires / joueur.nbCombats) * 100);

  const objetsFavoris = objets.slice(0, 3);

  const chiffres = [
    { label: "Points", valeur: joueur.points.toLocaleString("fr-FR"), couleur: "text-arcade-gold" },
    { label: "Record", valeur: joueur.maxPoints.toLocaleString("fr-FR"), couleur: "text-arcade-cyan" },
    { label: "Victoires", valeur: joueur.nbVictoires, couleur: "text-victory" },
    { label: "Combats", valeur: joueur.nbCombats, couleur: "text-white" },
  ];

  const progression =
    joueur.maxPoints === 0 ? 0 : Math.round((joueur.points / joueur.maxPoints) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Joueur"
        title="Mon profil"
        subtitle="Vos points, vos victoires et vos derniers combats."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Panel tone="violet" innerClassName="relative overflow-hidden">
          <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-40" />

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <PlayerAvatar player={joueur} size={88} />

            <div className="min-w-0 flex-1">
              <Tag className="bg-arcade-violet/25 text-arcade-cyan">
                Membre depuis {joueur.createdAt}
              </Tag>
              <h2 className="skew-title mt-3 text-4xl leading-none sm:text-5xl">
                {joueur.username}
              </h2>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
                <span>
                  <span aria-hidden="true">🏆</span> {rang}
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

          <Panel className="mt-3" innerClassName="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Progression vers le record
              </h3>
              <p className="font-mono text-sm text-white/70 tabular-nums">
                {joueur.points.toLocaleString("fr-FR")} /{" "}
                {joueur.maxPoints.toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="relative mt-3 h-3 border border-edge bg-void">
              <div
                className="h-full bg-linear-to-r from-arcade-violet to-arcade-cyan"
                style={{ width: `${Math.min(100, progression)}%` }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent_0_11px,rgba(6,4,13,0.85)_11px_13px)]"
              />
            </div>
          </Panel>
        </section>

        <section className="mt-12">
          <SectionTitle href="/objets" linkLabel="Tout les objets">
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

        <section className="mt-12">
          <SectionTitle href="/historique" linkLabel="">
            Mes derniers combats
          </SectionTitle>
          <HistoryList compact limitOptions={[5, 10, 20, "tout"]} filtres={false} />
        </section>
      </div>
    </>
  );
}
