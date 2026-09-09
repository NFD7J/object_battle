import Link from "next/link";

import { HeroStats, TopPlayersPanel } from "@/components/game-live";
import { HistoryList } from "@/components/history-list";
import { Panel, SectionTitle, Tag, btn, btnLabel } from "@/components/ui";

const ETAPES = [
  {
    numero: "01",
    titre: "Choisissez vos objets",
    texte:
      "Deux objets du quotidien entrent dans l'arène : un marteau, une poêle, une chaise… À vous de composer l'affiche.",
  },
  {
    numero: "02",
    titre: "Misez vos points",
    texte:
      "Pariez sur le combattant de votre choix, ou sur le match nul si vous aimez le risque.",
  },
  {
    numero: "03",
    titre: "Lancez le combat",
    texte:
      "Puissance, résistance, rapidité, intelligence et une bonne dose de hasard désignent le vainqueur.",
  },
];

export default function AccueilPage() {
  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Bannière principale                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-edge bg-abyss">
        <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-40" />
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-arcade-violet/25 blur-[120px]"
        />
        <div aria-hidden="true" className="scanlines absolute inset-0" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <Tag className="bg-arcade-orange text-void">Saison 1 &middot; en ligne</Tag>

            <h1 className="skew-title mt-5 font-display text-6xl leading-[0.85] sm:text-7xl md:text-8xl">
              <span className="block text-white">Object</span>
              <span className="block bg-linear-to-r from-arcade-violet via-arcade-blue to-arcade-cyan bg-clip-text text-transparent">
                Battle
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Le comparateur de puissance des objets. Faites s&apos;affronter deux
              objets du quotidien dans des combats fictifs, pariez sur le
              vainqueur et grimpez dans le classement.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/combattre" className={`${btn.base} ${btn.primary}`}>
                <span className={btnLabel}>
                  <span aria-hidden="true">&#9876;</span> Commencer un combat
                </span>
              </Link>
              <Link href="/objets" className={`${btn.base} ${btn.ghost}`}>
                <span className={btnLabel}>Voir les objets</span>
              </Link>
            </div>

            <HeroStats />
          </div>

          {/* Aperçu du classement */}
          <div className="relative">
            <TopPlayersPanel />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Comment ça marche                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionTitle>Comment ça marche</SectionTitle>
        <ol className="grid gap-4 md:grid-cols-3">
          {ETAPES.map((etape) => (
            <li key={etape.numero}>
              <Panel innerClassName="h-full p-6">
                <p
                  aria-hidden="true"
                  className="font-display text-5xl leading-none text-arcade-violet/40"
                >
                  {etape.numero}
                </p>
                <h3 className="mt-3 text-xl text-white">{etape.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{etape.texte}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Derniers combats                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-edge bg-abyss">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <SectionTitle href="/historique" linkLabel="Tout l'historique">
            Derniers combats
          </SectionTitle>
          <HistoryList compact limit={3} filtres={false} />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Appel à l'action final                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-t border-edge bg-linear-to-r from-arcade-violet/20 via-abyss to-arcade-blue/20">
        <div aria-hidden="true" className="scanlines absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="skew-title text-4xl sm:text-5xl">Prêt pour le premier round ?</h2>
          <p className="mt-4 text-white/70">
            Choisissez deux objets, misez vos points et découvrez lequel domine
            vraiment votre cuisine.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/combattre" className={`${btn.base} ${btn.secondary}`}>
              <span className={btnLabel}>Commencer un combat</span>
            </Link>
            <Link href="/objets/nouveau" className={`${btn.base} ${btn.ghost}`}>
              <span className={btnLabel}>Ajouter un objet</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
