import type { Metadata } from "next";

import { ClassementView } from "@/app/classement/classement-view";

export const metadata: Metadata = {
  title: "Classement",
  description:
    "Le classement des joueurs d'Object Battle, triable par score, nombre de victoires ou taux de victoire.",
};

export default function ClassementPage() {
  return <ClassementView />;
}
