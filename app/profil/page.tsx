import type { Metadata } from "next";

import { ProfilView } from "@/app/profil/profil-view";

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Votre profil Object Battle : points, victoires, taux de réussite, position au classement et derniers combats.",
};

export default function ProfilPage() {
  return <ProfilView />;
}
