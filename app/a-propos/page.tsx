import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Panel, SectionTitle, btn, btnLabel } from "@/components/ui";
import { STAT_HINTS, STAT_KEYS, STAT_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Object Battle : le principe du jeu, le rôle de chaque caractéristique et la façon dont le score d'un combat est calculé.",
};

const TECHNOS = [
  { titre: "Interface", detail: "Next.js (App Router), React et Tailwind CSS" },
  { titre: "Serveur", detail: "Routes API Next.js, Node.js" },
  { titre: "Base de données", detail: "PostgreSQL hébergé sur Neon" },
  { titre: "Images", detail: "CDN Vercel Blob" },
  { titre: "Hébergement", detail: "Vercel" },
  { titre: "Versionnement", detail: "Git et GitHub" },
];

export default function AProposPage() {
  return (
    <>
      <PageHeader
        eyebrow="Coulisses"
        title="À propos"
        subtitle="Object Battle est un site ludique qui fait s'affronter des objets du quotidien en fonction de leurs caractéristiques."
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* ---------------------------------------------------------------- */}
        {/* Le principe                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <SectionTitle>Le principe</SectionTitle>
          <Panel innerClassName="p-6">
            <p className="leading-relaxed text-white/75">
              Vous choisissez deux objets, vous misez des points sur celui que
              vous croyez le plus fort — ou sur le match nul — puis vous lancez
              le combat. Le site compare les caractéristiques des deux objets,
              ajoute une part de hasard, et désigne un vainqueur.
            </p>
            <p className="mt-4 leading-relaxed text-white/75">
              Chaque combat est enregistré dans l&apos;historique, et vos points
              vous font monter ou descendre dans le classement des joueurs.
            </p>
          </Panel>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Les caractéristiques                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12">
          <SectionTitle>Les caractéristiques</SectionTitle>
          <Panel innerClassName="p-6">
            <p className="text-sm text-white/60">
              Chaque objet possède quatre caractéristiques, notées de 0 à 100.
            </p>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {STAT_KEYS.map((cle) => (
                <div key={cle} className="border-l-2 border-arcade-violet/60 pl-4">
                  <dt className="font-display text-xl tracking-wide text-arcade-cyan">
                    {STAT_LABELS[cle]}
                  </dt>
                  <dd className="mt-1 text-sm text-white/65">{STAT_HINTS[cle]}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Le calcul du score                                                */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12">
          <SectionTitle>Le calcul du score</SectionTitle>
          <Panel innerClassName="p-6">
            <p className="leading-relaxed text-white/75">
              Le score d&apos;un objet dans un combat est une somme pondérée de
              ses caractéristiques, à laquelle s&apos;ajoute une part
              d&apos;aléatoire. C&apos;est cette part de hasard qui rend les
              affiches imprévisibles : un objet plus faible sur le papier peut
              parfaitement l&apos;emporter.
            </p>

            <pre className="mt-5 overflow-x-auto border border-edge bg-void p-4 font-mono text-sm text-arcade-cyan">
              <code>{`score = (puissance    x poids₁)
      + (résistance   x poids₂)
      + (rapidité     x poids₃)
      + (intelligence x poids₄)
      + (aléatoire    x poids₅)`}</code>
            </pre>

            <p className="mt-4 text-sm text-white/55">
              Les pondérations exactes seront fixées lors de la mise en place du
              moteur de combat.
            </p>
          </Panel>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Technologies                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12">
          <SectionTitle>Technologies</SectionTitle>
          <dl className="grid gap-3 sm:grid-cols-2">
            {TECHNOS.map((techno) => (
              <div key={techno.titre}>
                <Panel innerClassName="p-5">
                  <dt className="font-mono text-[11px] tracking-[0.14em] text-arcade-cyan uppercase">
                    {techno.titre}
                  </dt>
                  <dd className="mt-1.5 text-sm text-white/70">{techno.detail}</dd>
                </Panel>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 text-center">
          <Link href="/combattre" className={`${btn.base} ${btn.primary}`}>
            <span className={btnLabel}>Lancer un combat</span>
          </Link>
        </div>
      </div>
    </>
  );
}
