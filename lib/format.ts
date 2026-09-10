/** Helpers d'affichage partagés par les composants serveur et client. */

/** Format d'affichage des dates : 08/09/2026 · 20:14 */
export function formatFightDate(iso: string): string {
  const date = new Date(iso);
  const pad = (valeur: number) => String(valeur).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
