"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { deltaParis } from "@/lib/fight-engine";
import type { Issue, ResultatCombat } from "@/lib/fight-engine";
import { currentPlayer, fights as fightsInitiaux, players } from "@/lib/mock-data";
import type { Combatant, Fight, Player } from "@/lib/types";

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
  enregistrerCombat: (entree: CombatAEnregistrer) => void;
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

function setEtat(updater: (precedent: EtatPartie) => EtatPartie) {
  etatCourant = updater(etatCourant);
  ecrireStockage(etatCourant);
  emit();
}

export function GameProvider({ children }: { children: ReactNode }) {
  const etat = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const enregistrerCombat = useCallback((entree: CombatAEnregistrer) => {
    setEtat((precedent) => {
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
    () => ({ ...etat, enregistrerCombat }),
    [etat, enregistrerCombat],
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

/** Joueur connecté, avec le solde et le palmarès à jour. */
export function useJoueur(): Player {
  const { points, maxPoints, nbVictoires, nbCombats } = useGame();
  return useMemo(
    () => ({
      ...currentPlayer,
      points,
      maxPoints,
      nbVictoires,
      nbCombats,
    }),
    [points, maxPoints, nbVictoires, nbCombats],
  );
}

/** Tous les joueurs, le joueur courant ayant son score live. */
export function useJoueurs(): Player[] {
  const joueur = useJoueur();
  return useMemo(
    () => players.map((player) => (player.id === joueur.id ? joueur : player)),
    [joueur],
  );
}
