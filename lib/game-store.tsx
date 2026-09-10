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
import { currentPlayer, fights as fightsInitiaux, combatants as objetsDemo } from "@/lib/mock-data";
import type { Combatant, DonneesCompte, Fight, Player } from "@/lib/types";

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
  fighterA: Combatant;
  fighterB: Combatant;
  resultat: ResultatCombat;
  bet: Issue;
  mise: number;
  cote: number;
};

type GameContextValue = EtatPartie & {
  connecte: boolean;
  combatants: Combatant[];
  joueurs: Player[];
  joueur: Player;
  enregistrerCombat: (entree: CombatAEnregistrer) => void;
  appliquerCombatServeur: (combat: Fight, joueur: Player, objets?: Combatant[], classement?: Player[]) => void;
};

const ETAT_INITIAL: EtatPartie = {
  points: currentPlayer.points,
  maxPoints: currentPlayer.maxPoints,
  nbVictoires: currentPlayer.nbVictoires,
  nbCombats: currentPlayer.nbCombats,
  fights: fightsInitiaux,
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
let etatCourant: EtatPartie = ETAT_INITIAL;

if (typeof window !== "undefined") {
  const sauvegarde = lireStockage();
  if (sauvegarde) etatCourant = sauvegarde;
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
  return ETAT_INITIAL;
}

function setEtatDemo(updater: (precedent: EtatPartie) => EtatPartie) {
  etatCourant = updater(etatCourant);
  ecrireStockage(etatCourant);
  emit();
}

function DemoProvider({
  children,
  classement,
}: {
  children: ReactNode;
  classement: Player[];
}) {
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

  const joueur = useMemo<Player>(
    () => ({
      ...currentPlayer,
      points: etat.points,
      maxPoints: etat.maxPoints,
      nbVictoires: etat.nbVictoires,
      nbCombats: etat.nbCombats,
    }),
    [etat.points, etat.maxPoints, etat.nbVictoires, etat.nbCombats],
  );

  const valeur = useMemo<GameContextValue>(
    () => ({
      ...etat,
      connecte: false,
      combatants: objetsDemo,
      joueurs: classement,
      joueur,
      enregistrerCombat,
      appliquerCombatServeur: () => {},
    }),
    [etat, joueur, classement, enregistrerCombat],
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

/** Joueur affiché : compte réel si connecté, joueur de démo sinon. */
export function useJoueur(): Player {
  return useGame().joueur;
}

/** Classement réel, que le joueur soit connecté ou non. */
export function useJoueurs(): Player[] {
  return useGame().joueurs;
}

/** Roster : objets de la base si connecté, objets d'exemple sinon. */
export function useCombatants(): Combatant[] {
  return useGame().combatants;
}
