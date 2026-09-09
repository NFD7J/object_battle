"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { currentPlayer } from "@/lib/mock-data";
import { useGame } from "@/lib/game-store";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/combattre", label: "Combattre" },
  { href: "/objets", label: "Objets" },
  { href: "/classement", label: "Classement" },
  { href: "/historique", label: "Historique" },
  { href: "/profil", label: "Profil" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { points } = useGame();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-edge/80 bg-abyss/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Object Battle — retour à l'accueil">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 -skew-x-6 place-items-center bg-linear-to-br from-arcade-violet to-arcade-blue font-display text-xl text-white"
          >
            OB
          </span>
          <span className="skew-title font-display text-xl leading-none sm:text-2xl">
            <span className="text-white">Object</span>{" "}
            <span className="bg-linear-to-r from-arcade-orange to-arcade-gold bg-clip-text text-transparent">
              Battle
            </span>
          </span>
        </Link>

        {/* Navigation bureau */}
        <nav aria-label="Navigation principale" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`tag-slant block px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase transition-colors ${
                      active
                        ? "bg-linear-to-r from-arcade-violet to-arcade-blue font-bold text-white"
                        : "text-white/65 hover:bg-panel-soft hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Compteur de points du joueur, façon jetons d'arcade */}
        <p
          className="ml-auto hidden items-center gap-2 border border-edge bg-panel px-3 py-1.5 sm:flex lg:ml-4"
          aria-live="polite"
        >
          <span aria-hidden="true" className="text-arcade-gold">
            &#9670;
          </span>
          <span className="font-mono text-sm font-bold text-arcade-gold" suppressHydrationWarning>
            {points.toLocaleString("fr-FR")}
          </span>
          <span className="sr-only">points disponibles</span>
          <span aria-hidden="true" className="font-mono text-[10px] tracking-widest text-white/50">
            PTS
          </span>
        </p>

        {/* Bouton burger mobile */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="menu-mobile"
          className="ml-auto flex h-11 w-11 flex-col items-center justify-center gap-1.5 border border-edge bg-panel text-white sm:ml-0 lg:hidden"
        >
          <span className="sr-only">{menuOpen ? "Fermer le menu" : "Ouvrir le menu"}</span>
          <span
            aria-hidden="true"
            className={`h-0.5 w-6 bg-current transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            aria-hidden="true"
            className={`h-0.5 w-6 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            aria-hidden="true"
            className={`h-0.5 w-6 bg-current transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Navigation mobile */}
      <nav
        id="menu-mobile"
        aria-label="Navigation mobile"
        hidden={!menuOpen}
        className="border-t border-edge bg-panel lg:hidden"
      >
        <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  // Le menu mobile se referme dès qu'on choisit une destination.
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between border-b border-edge/60 px-2 py-4 font-display text-xl tracking-wide ${
                    active ? "text-arcade-cyan" : "text-white/80"
                  }`}
                >
                  {link.label}
                  <span aria-hidden="true" className="text-arcade-violet">
                    &#9656;
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p
          className="mx-auto flex max-w-6xl items-center gap-2 px-6 pb-4 font-mono text-sm text-arcade-gold"
          aria-live="polite"
        >
          &#9670;{" "}
          <span suppressHydrationWarning>{points.toLocaleString("fr-FR")}</span> points
        </p>
      </nav>

      {/* Liseré lumineux sous la barre */}
      <div
        aria-hidden="true"
        className="h-px bg-linear-to-r from-transparent via-arcade-violet to-transparent"
      />
    </header>
  );
}
