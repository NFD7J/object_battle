"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Object, Fight, Player } from "@/lib/types";

/* ===========================================================================
   STORE DE JEU

   Un seul provider, quel que soit le visiteur. Tout le monde voit les mêmes
   objets, le même classement et le même historique : la base est l'unique
   source de vérité, et chaque combat y est enregistré, connecté ou non.

   La seule différence tient au pari :
     * visiteur      → `connecte` vaut false, `points` vaut 0, il ne mise pas ;
     * joueur inscrit → `connecte` vaut true, `points` est son solde en base.

   L'état local ne sert qu'à afficher immédiatement le résultat d'un combat
   sans attendre le rechargement des composants serveur. Les props qui
   arrivent du serveur reprennent toujours la main (voir l'effet de resynchro).
   =========================================================================== */

type GameContextValue = {
  /** Joueur connecté tel que la base le connaît, ou `null` pour un visiteur. */
  joueur: Player | null;
  /** Raccourci de `joueur !== null`, seul aiguillage de l'interface. */
  connecte: boolean;
  /** Solde misable. Toujours 0 pour un visiteur : il ne parie pas. */
  points: number;
  maxPoints: number;
  nbVictoires: number;
  nbCombats: number;
  /** Derniers combats, tous joueurs et visiteurs confondus. */
  fights: Fight[];
  /** Catalogue des combattants. */
  combatants: Object[];
  /** Classement complet venant de la base. */
  joueurs: Player[];
  /**
   * À appeler après un POST /api/combats réussi : affiche le combat sans
   * attendre le prochain rendu serveur. `joueurMaj` est `null` quand le
   * combat vient d'un visiteur, puisqu'aucun solde n'a bougé.
   */
  appliquerCombatServeur: (combat: Fight, joueurMaj: Player | null) => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  children,
  joueur: joueurInitial,
  joueurs: joueursInitiaux,
  combatants: combatantsInitiaux,
  fightsInitiaux,
}: {
  children: ReactNode;
  joueur: Player | null;
  joueurs: Player[];
  combatants: Object[];
  fightsInitiaux: Fight[];
}) {
  const [joueur, setJoueur] = useState(joueurInitial);
  const [joueurs, setJoueurs] = useState(joueursInitiaux);
  const [combatants, setCombatants] = useState(combatantsInitiaux);
  const [fights, setFights] = useState(fightsInitiaux);

  // Le serveur reste la source de vérité : dès qu'il renvoie des données
  // fraîches (navigation, router.refresh() après un combat), elles écrasent
  // la mise à jour optimiste faite juste avant.
  useEffect(() => {
    setJoueur(joueurInitial);
    setJoueurs(joueursInitiaux);
    setCombatants(combatantsInitiaux);
    setFights(fightsInitiaux);
  }, [joueurInitial, joueursInitiaux, combatantsInitiaux, fightsInitiaux]);

  const appliquerCombatServeur = useCallback(
    (combat: Fight, joueurMaj: Player | null) => {
      setFights((precedent) => [
        combat,
        ...precedent.filter((fight) => fight.id !== combat.id),
      ]);

      if (!joueurMaj) return;

      setJoueur(joueurMaj);
      setJoueurs((precedent) =>
        precedent.map((player) => (player.id === joueurMaj.id ? joueurMaj : player)),
      );
    },
    [],
  );

  const valeur = useMemo<GameContextValue>(
    () => ({
      joueur,
      connecte: joueur !== null,
      // Un visiteur n'a pas de solde : rien à miser, rien à perdre.
      points: joueur?.points ?? 0,
      maxPoints: joueur?.maxPoints ?? 0,
      nbVictoires: joueur?.nbVictoires ?? 0,
      nbCombats: joueur?.nbCombats ?? 0,
      fights,
      combatants,
      joueurs,
      appliquerCombatServeur,
    }),
    [joueur, fights, combatants, joueurs, appliquerCombatServeur],
  );

  return <GameContext.Provider value={valeur}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const contexte = useContext(GameContext);
  if (!contexte) {
    throw new Error("useGame doit être utilisé dans un GameProvider");
  }
  return contexte;
}

/**
 * Joueur connecté, avec le solde et le palmarès à jour.
 * Renvoie null quand personne n'est connecté.
 */
export function useJoueur(): Player | null {
  const { joueur, points, maxPoints, nbVictoires, nbCombats } = useGame();
  return useMemo(
    () => (joueur ? { ...joueur, points, maxPoints, nbVictoires, nbCombats } : null),
    [joueur, points, maxPoints, nbVictoires, nbCombats],
  );
}

/** Classement réel, que le joueur soit connecté ou non. */
export function useJoueurs(): Player[] {
  const { joueurs } = useGame();
  const joueur = useJoueur();
  return useMemo(
    () => joueurs.map((player) => (joueur && player.id === joueur.id ? joueur : player)),
    [joueurs, joueur],
  );
}
