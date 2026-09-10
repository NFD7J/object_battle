import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentPlayer } from "@/lib/auth";
import { getRanking, getRecentFights } from "@/lib/queries";
import { GameProvider } from "@/lib/game-store";
import { chargerClassement, chargerDonneesCompte } from "@/lib/vue-data";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Police d'affichage condensée, pour les titres façon affiche de jeu de combat.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Object Battle — Le comparateur de puissance des objets",
    template: "%s | Object Battle",
  },
  description:
    "Faites s'affronter deux objets du quotidien, misez vos points et découvrez qui remporte le combat. Classement, historique et fiches détaillées.",
  keywords: [
    "object battle",
    "combat d'objets",
    "comparateur",
    "jeu",
    "classement",
  ],
  openGraph: {
    title: "Object Battle — Le comparateur de puissance des objets",
    description:
      "Marteau contre bouteille, poêle contre chaise : lancez le combat et pariez sur le vainqueur.",
    type: "website",
    locale: "fr_FR",
    siteName: "Object Battle",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Lire la session ici rend toutes les pages dynamiques : c'est le prix à
  // payer pour que l'en-tête affiche le bon joueur dès le premier rendu.
  //
  // Le classement et les derniers combats amorcent le store de jeu, dont
  // dépendent l'en-tête, l'accueil, l'historique et le profil.
  const [joueur, joueurs, combats] = await Promise.all([
    getCurrentPlayer(),
    getRanking(),
    getRecentFights(),
  ]);

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-void">
        <GameProvider joueur={joueur} joueurs={joueurs} fightsInitiaux={combats}>
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:bg-arcade-gold focus:px-4 focus:py-2 focus:font-bold focus:text-void"
          >
            Aller au contenu principal
          </a>
          <SiteHeader player={joueur} />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <SiteFooter connecte={Boolean(joueur)} />
        </GameProvider>
      </body>
    </html>
  );
}
