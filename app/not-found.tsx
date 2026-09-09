import Link from "next/link";

import { btn, btnLabel } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-40" />
      <div aria-hidden="true" className="scanlines absolute inset-0" />

      <div className="relative mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <p className="font-mono text-xs tracking-[0.3em] text-arcade-cyan uppercase">
          Erreur 404
        </p>
        <h1 className="skew-title mt-4 font-display text-6xl leading-none text-arcade-orange sm:text-7xl">
          K.O.
        </h1>
        <p className="mt-6 text-white/70">
          Cette page a quitté le ring. Elle a peut-être changé d&apos;adresse, ou
          n&apos;a jamais existé.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/" className={`${btn.base} ${btn.primary}`}>
            <span className={btnLabel}>Retour à l&apos;accueil</span>
          </Link>
          <Link href="/objets" className={`${btn.base} ${btn.ghost}`}>
            <span className={btnLabel}>Voir les objets</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
