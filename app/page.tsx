import Link from "next/link";

import { CombatantPortrait } from "@/components/combatant-card";
import { FightRow } from "@/components/fight-row";
import { PlayerAvatar } from "@/components/ranking-table";
import { Panel, SectionTitle, Tag, btn, btnLabel } from "@/components/ui";
import { combatants, fights, players } from "@/lib/mock-data";

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
  const vedetteA = combatants[0];
  const vedetteB = combatants[3];
  const derniersCombats = fights.slice(0, 3);
  const topJoueurs = [...players].sort((a, b) => b.points - a.points).slice(0, 4);

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

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { valeur: combatants.length, label: "Objets" },
                { valeur: fights.length, label: "Combats" },
                { valeur: players.length, label: "Joueurs" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="cut-corner-sm border border-edge bg-panel/80 px-4 py-3"
                >
                  <dt className="font-mono text-[10px] tracking-[0.16em] text-white/50 uppercase">
                    {item.label}
                  </dt>
                  <dd className="font-display text-3xl leading-none text-arcade-gold tabular-nums">
                    {item.valeur}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Aperçu d'arène : deux objets qui se percutent */}
          <div className="relative">
            <Panel tone="violet" innerClassName="relative overflow-hidden p-6 sm:p-8">
              <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-60" />
              <p className="relative text-center font-mono text-[11px] tracking-[0.3em] text-arcade-cyan uppercase">
                Combat de démonstration
              </p>

              <div className="relative mt-6 flex items-center justify-between gap-2">
                <div className="flex-1 animate-clash-left">
                  <CombatantPortrait
                    combatant={vedetteA}
                    className="cut-corner-sm mx-auto h-32 w-32 sm:h-40 sm:w-40"
                    sizes="160px"
                    priority
                  />
                  <p className="mt-3 text-center font-display text-xl">{vedetteA.name}</p>
                </div>

                <p
                  aria-hidden="true"
                  className="skew-title animate-glow font-display text-4xl text-arcade-orange sm:text-5xl"
                >
                  VS
                </p>

                <div className="flex-1 animate-clash-right">
                  <CombatantPortrait
                    combatant={vedetteB}
                    className="cut-corner-sm mx-auto h-32 w-32 sm:h-40 sm:w-40"
                    sizes="160px"
                    priority
                  />
                  <p className="mt-3 text-center font-display text-xl">{vedetteB.name}</p>
                </div>
              </div>

              <p className="relative mt-6 border-t border-edge pt-4 text-center text-sm text-white/60">
                Score global{" "}
                <strong className="font-mono text-arcade-gold">{vedetteA.overall}</strong>{" "}
                contre{" "}
                <strong className="font-mono text-arcade-gold">{vedetteB.overall}</strong>
              </p>
            </Panel>
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
          <ul className="grid gap-3">
            {derniersCombats.map((fight) => (
              <li key={fight.id}>
                <FightRow fight={fight} compact />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Aperçu du classement                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionTitle href="/classement" linkLabel="Classement complet">
          Meilleurs joueurs
        </SectionTitle>

        <ol className="grid gap-3 sm:grid-cols-2">
          {topJoueurs.map((player, index) => (
            <li key={player.id}>
              <Panel innerClassName="flex items-center gap-4 p-4">
                <span className="font-display text-3xl leading-none text-arcade-violet tabular-nums">
                  {index + 1}
                </span>
                <PlayerAvatar player={player} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl text-white">
                    {player.username}
                  </span>
                  <span className="block font-mono text-xs text-white/50">
                    {player.nbVictoires} victoires
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-lg font-bold text-arcade-gold tabular-nums">
                    {player.points.toLocaleString("fr-FR")}
                  </span>
                  <span className="block font-mono text-[10px] tracking-widest text-white/40 uppercase">
                    points
                  </span>
                </span>
              </Panel>
            </li>
          ))}
        </ol>
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
