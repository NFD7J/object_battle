import type { Metadata } from "next";

import { FightArena } from "@/app/combattre/fight-arena";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Combattre",
  description:
    "Sélectionnez deux objets, misez vos points sur un vainqueur ou sur le match nul, puis lancez le combat dans l'arène Object Battle.",
};

export default function CombattrePage() {
  return (
    <>
      <PageHeader
        eyebrow="Arène"
        title="Combattre"
        subtitle="Deux objets entrent, un seul ressort. Choisissez vos combattants, placez votre pari, puis lancez le round."
      />
      <FightArena />
    </>
  );
}
