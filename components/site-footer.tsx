import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/combattre", label: "Combattre" },
  { href: "/objets", label: "Objets" },
  { href: "/objets/nouveau", label: "Ajouter un objet" },
  { href: "/classement", label: "Classement" },
  { href: "/historique", label: "Historique" },
  { href: "/profil", label: "Profil" },
  { href: "/a-propos", label: "À propos" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-edge bg-abyss">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="skew-title font-display text-2xl">
            <span className="text-white">Object</span>{" "}
            <span className="text-arcade-orange">Battle</span>
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
            Le comparateur de puissance des objets du quotidien. Choisissez deux
            objets, misez vos points, lancez le combat.
          </p>
        </div>

        <nav aria-label="Liens de bas de page">
          <h2 className="font-mono text-xs tracking-[0.18em] text-arcade-cyan uppercase">
            Navigation
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-edge/60">
        <p className="mx-auto max-w-6xl px-4 py-4 font-mono text-[11px] tracking-wider text-white/40 sm:px-6">
          &copy; {new Date().getFullYear()} Object Battle &mdash; projet étudiant
          MyDigitalSchool.
        </p>
      </div>
    </footer>
  );
}
