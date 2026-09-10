import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Panel, SectionTitle, btn, btnLabel } from "@/components/ui";
import { ECART_MATCH_NUL, PONDERATIONS } from "@/lib/combat";
import { STAT_HINTS, STAT_KEYS, STAT_LABELS } from "@/lib/types";

/**
 * La formule affichée est construite à partir des pondérations du moteur, et
 * non recopiée : régler le moteur met la page à jour du même geste.
 */
const LIGNES_SCORE = [
  ...STAT_KEYS.map((cle) => ({ label: STAT_LABELS[cle], poids: PONDERATIONS[cle] })),
  { label: "Aléatoire", poids: PONDERATIONS.aleatoire },
];

/** Écriture française d'un poids : 1.2 devient « 1,20 ». */
function formatPoids(poids: number): string {
  return poids.toFixed(2).replace(".", ",");
}

const FORMULE = LIGNES_SCORE.map(
  ({ label, poids }, index) =>
    `${index === 0 ? "score =" : "      +"} ${label.padEnd(13)}× ${formatPoids(poids)}`,
).join("\n");

/** Score maximal : toutes les caractéristiques à 100 et l'aléatoire au plafond. */
const SCORE_MAX = Math.round(
  LIGNES_SCORE.reduce((total, ligne) => total + ligne.poids, 0) * 100,
);

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Object Battle : le principe du jeu, le rôle de chaque caractéristique et la façon dont le score d'un combat est calculé.",
};

const TECHNOS = [
  { titre: "Interface", detail: "Next.js (App Router), React et Tailwind CSS" },
  { titre: "Serveur", detail: "Routes API Next.js, Node.js" },
  { titre: "Base de données", detail: "PostgreSQL hébergé sur Neon" },
  { titre: "Images", detail: "CDN Cloudinary" },
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
              Chaque objet reçoit un score, calculé isolément : il ne sait pas
              qui se tient en face de lui. Le plus haut score l&apos;emporte.
            </p>

            <pre className="mt-5 overflow-x-auto border border-edge bg-void p-4 font-mono text-sm text-arcade-cyan">
              <code>{FORMULE}</code>
            </pre>

            <p className="mt-4 leading-relaxed text-white/75">
              L&apos;aléatoire est un tirage entre 0 et 100, refait à chaque
              combat. Il pèse plus lourd que n&apos;importe quelle
              caractéristique, et c&apos;est voulu : sans lui, l&apos;affiche
              serait jouée d&apos;avance et le pari n&apos;aurait aucun
              intérêt. Un objet plus faible sur le papier garde donc toujours
              sa chance. Le score plafonne à {SCORE_MAX}.
            </p>

            <p className="mt-4 leading-relaxed text-white/75">
              Si les deux scores se tiennent à moins de {ECART_MATCH_NUL}{" "}
              points, personne ne l&apos;emporte : c&apos;est un double K.O., et
              les deux jauges tombent à zéro.
            </p>

            <p className="mt-4 text-sm text-white/55">
              Le calcul tourne uniquement sur le serveur. Le navigateur reçoit
              le résultat, jamais de quoi le fabriquer.
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
