"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { deltaParis } from "@/lib/fight-engine";
import type { Issue, ResultatCombat } from "@/lib/fight-engine";
import type { Object, Fight, Player } from "@/lib/types";

const CLE_STOCKAGE = "object-battle-partie";
const VERSION = 1;

type EtatPartie = {
  points: number;
  maxPoints: number;
  nbVictoires: number;
  nbCombats: number;
  fights: Fight[];
};

export type CombatAEnregistrer = {
  fighterA: Object;
  fighterB: Object;
  resultat: ResultatCombat;
  bet: Issue;
  mise: number;
  cote: number;
};

type GameContextValue = EtatPartie & {
  connecte: boolean;
  combatants: Object[];
  enregistrerCombat: (entree: CombatAEnregistrer) => void;
  /** Joueur connecté tel que la base le connaît, ou null si personne ne l'est. */
  joueur: Player | null;
  /** Classement complet venant de la base. */
  joueurs: Player[];
};

/**
 * État de repli, utilisé pour le rendu serveur et tant que le provider n'a pas
 * transmis les données. Les vraies valeurs arrivent en props de GameProvider.
 */
const ETAT_VIDE: EtatPartie = {
  points: 0,
  maxPoints: 0,
  nbVictoires: 0,
  nbCombats: 0,
  fights: [],
};

const GameContext = createContext<GameContextValue | null>(null);

function estEtatValide(valeur: unknown): valeur is EtatPartie {
  if (!valeur || typeof valeur !== "object") return false;
  const etat = valeur as EtatPartie;
  return (
    typeof etat.points === "number" &&
    typeof etat.maxPoints === "number" &&
    typeof etat.nbVictoires === "number" &&
    typeof etat.nbCombats === "number" &&
    Array.isArray(etat.fights)
  );
}

function lireStockage(): EtatPartie | null {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return null;
    const lu = JSON.parse(brut) as { version?: number; etat?: unknown };
    if (lu.version !== VERSION || !estEtatValide(lu.etat)) return null;
    return lu.etat;
  } catch {
    return null;
  }
}

function ecrireStockage(etat: EtatPartie) {
  window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ version: VERSION, etat }));
}

function composerCombat(entree: CombatAEnregistrer, id: number): Fight {
  const { fighterA, fighterB, resultat, bet, mise, cote } = entree;
  const pariGagnant = bet === resultat.vainqueur;
  const winnerId =
    resultat.vainqueur === "nul"
      ? null
      : resultat.vainqueur === "A"
        ? fighterA.id
        : fighterB.id;

  return {
    id,
    fighterA,
    fighterB,
    winnerId,
    pvA: resultat.pvA,
    pvB: resultat.pvB,
    bet: {
      on: bet === "nul" ? "nul" : bet === "A" ? fighterA.id : fighterB.id,
      amount: mise,
      cote,
      outcome: pariGagnant ? "gain" : "perte",
      delta: deltaParis(mise, cote, pariGagnant),
    },
    createdAt: new Date().toISOString(),
  };
}

const listeners = new Set<() => void>();
let etatCourant: EtatPartie = ETAT_VIDE;
let dejaInitialise = false;

/**
 * Amorce le store avec les données du serveur, une seule fois.
 * Une partie déjà sauvegardée dans le navigateur reprend la main si elle existe.
 */
function initialiser(joueur: Player | null, fightsInitiaux: Fight[]) {
  if (dejaInitialise) return;
  dejaInitialise = true;

  const depuisServeur: EtatPartie = {
    points: joueur?.points ?? 0,
    maxPoints: joueur?.maxPoints ?? 0,
    nbVictoires: joueur?.nbVictoires ?? 0,
    nbCombats: joueur?.nbCombats ?? 0,
    fights: fightsInitiaux,
  };

  const sauvegarde = typeof window !== "undefined" ? lireStockage() : null;
  etatCourant = sauvegarde ?? depuisServeur;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return etatCourant;
}

function getServerSnapshot() {
  return etatCourant;
}

function setEtatDemo(updater: (precedent: EtatPartie) => EtatPartie) {
  etatCourant = updater(etatCourant);
  ecrireStockage(etatCourant);
  emit();
}

export function GameProvider({
  joueur,
  joueurs,
  fightsInitiaux,
  children,
}: {
  joueur: Player | null;
  joueurs: Player[];
  fightsInitiaux: Fight[];
  children: ReactNode;
}) {
  // Amorçage avant le premier rendu, pour que useSyncExternalStore lise déjà
  // les bonnes valeurs. initialiser() ne fait rien aux appels suivants.
  initialiser(joueur, fightsInitiaux);

  const etat = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const enregistrerCombat = useCallback((entree: CombatAEnregistrer) => {
    setEtatDemo((precedent) => {
      const pariGagnant = entree.bet === entree.resultat.vainqueur;
      const delta = deltaParis(entree.mise, entree.cote, pariGagnant);
      const points = Math.max(0, precedent.points + delta);
      const id = precedent.fights.reduce((max, fight) => Math.max(max, fight.id), 0) + 1;

      return {
        points,
        maxPoints: Math.max(precedent.maxPoints, points),
        nbCombats: precedent.nbCombats + 1,
        nbVictoires: precedent.nbVictoires + (pariGagnant ? 1 : 0),
        fights: [composerCombat(entree, id), ...precedent.fights],
      };
    });
  }, []);

  const valeur = useMemo(
    () => ({ ...etat, enregistrerCombat, joueur, joueurs }),
    [etat, enregistrerCombat, joueur, joueurs],
  );

  return <GameContext.Provider value={valeur}>{children}</GameContext.Provider>;
}

function CompteProvider({
  children,
  joueurInitial,
  initiales,
}: {
  children: ReactNode;
  joueurInitial: Player;
  initiales: DonneesCompte;
}) {
  const [joueur, setJoueur] = useState(joueurInitial);
  const [fights, setFights] = useState(initiales.combats);
  const [combatants, setCombatants] = useState(initiales.objets);
  const [joueurs, setJoueurs] = useState(initiales.joueurs);

  useEffect(() => {
    setJoueur(joueurInitial);
    setFights(initiales.combats);
    setCombatants(initiales.objets);
    setJoueurs(initiales.joueurs);
  }, [joueurInitial, initiales]);

  const enregistrerCombat = useCallback((_entree: CombatAEnregistrer) => {
    // Les comptes passent par POST /api/combats, pas par le moteur local.
  }, []);

  const appliquerCombatServeur = useCallback(
    (combat: Fight, joueurMaj: Player, objets?: Combatant[], classement?: Player[]) => {
      setJoueur(joueurMaj);
      setFights((precedent) => [combat, ...precedent.filter((fight) => fight.id !== combat.id)]);
      if (objets) setCombatants(objets);
      if (classement) {
        setJoueurs(classement.map((player) => (player.id === joueurMaj.id ? joueurMaj : player)));
      } else {
        setJoueurs((precedent) =>
          precedent.map((player) => (player.id === joueurMaj.id ? joueurMaj : player)),
        );
      }
    },
    [],
  );

  const valeur = useMemo<GameContextValue>(
    () => ({
      points: joueur.points,
      maxPoints: joueur.maxPoints,
      nbVictoires: joueur.nbVictoires,
      nbCombats: joueur.nbCombats,
      fights,
      connecte: true,
      combatants,
      joueurs,
      joueur,
      enregistrerCombat,
      appliquerCombatServeur,
    }),
    [joueur, fights, combatants, joueurs, enregistrerCombat, appliquerCombatServeur],
  );

  return <GameContext.Provider value={valeur}>{children}</GameContext.Provider>;
}

export function GameProvider({
  children,
  joueur,
  initiales,
  classement,
}: {
  children: ReactNode;
  joueur: Player | null;
  initiales: DonneesCompte | null;
  classement: Player[];
}) {
  if (joueur && initiales) {
    return (
      <CompteProvider joueurInitial={joueur} initiales={initiales}>
        {children}
      </CompteProvider>
    );
  }

  return <DemoProvider classement={classement}>{children}</DemoProvider>;
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
