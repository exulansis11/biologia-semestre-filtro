export type Profile = "aluno" | "professor";
export function readProfile(): Profile | null {
  try {
    const value = localStorage.getItem("bio_sf_perfil");
    return value === "aluno" || value === "professor" ? value : null;
  } catch { return null; }
}
export function saveProfile(profile: Profile) {
  try { localStorage.setItem("bio_sf_perfil", profile); } catch {}
}
export function readPin() {
  try { return localStorage.getItem("bio_sf_pin"); } catch { return null; }
}
export async function hashPin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error("Use de 4 a 6 dígitos.");
  if (!globalThis.crypto?.subtle) throw new Error("O PIN precisa de HTTPS ou localhost neste navegador.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}
export async function unlockProfessor(pin: string) {
  const hash = await hashPin(pin), saved = readPin();
  if (saved && saved !== hash) throw new Error("PIN incorreto.");
  if (!saved) {
    try { localStorage.setItem("bio_sf_pin", hash); }
    catch { throw new Error("Não foi possível guardar o PIN. Libere o armazenamento do navegador."); }
  }
  saveProfile("professor");
}
export function forgetPin() {
  try { localStorage.removeItem("bio_sf_pin"); }
  catch { throw new Error("Não foi possível apagar o PIN."); }
}
