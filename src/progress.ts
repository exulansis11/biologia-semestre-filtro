export interface Progress {
  flags: Record<string, boolean>;
  sims: {
    id: string;
    quando: string;
    nota: number;
    certas: number;
    erradas: number;
    branco: number;
    porU: Record<string, number>;
  }[];
  erros: Record<string, { n: number; ultima: string }>;
  answers: Record<string, { correct: number; total: number }>;
  currentTrail?: string;
}
export const emptyProgress = (): Progress => ({
  flags: {},
  sims: [],
  erros: {},
  answers: {},
});
export function validateProgress(value: unknown): Progress {
  if (!value || typeof value !== "object")
    throw new Error("Progresso inválido.");
  const v = value as Progress;
  if (
    !v.flags ||
    Array.isArray(v.flags) ||
    typeof v.flags !== "object" ||
    !Object.values(v.flags).every((x) => typeof x === "boolean") ||
    !Array.isArray(v.sims) ||
    !v.erros ||
    typeof v.erros !== "object" ||
    Array.isArray(v.erros)
  )
    throw new Error("Formato de progresso inválido.");
  if (
    !v.sims.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.quando === "string" &&
        Number.isFinite(s.nota) &&
        s.nota >= -7.75 &&
        s.nota <= 31 &&
        [s.certas, s.erradas, s.branco].every(
          (n) => Number.isInteger(n) && n >= 0,
        ) &&
        s.porU &&
        typeof s.porU === "object",
    )
  )
    throw new Error("Histórico inválido.");
  if (
    !Object.entries(v.erros).every(
      ([id, e]) =>
        /^(?:[mc]\d+|xt[1-8]_\d+)$/.test(id) &&
        e &&
        Number.isInteger(e.n) &&
        e.n > 0 &&
        typeof e.ultima === "string",
    )
  )
    throw new Error("Caderno de erros inválido.");
  const answers = v.answers || {};
  if (
    typeof answers !== "object" ||
    Array.isArray(answers) ||
    !Object.entries(answers).every(
      ([u, a]) =>
        /^[1-7]$/.test(u) &&
        a &&
        Number.isInteger(a.total) &&
        Number.isInteger(a.correct) &&
        a.total >= 0 &&
        a.correct >= 0 &&
        a.correct <= a.total,
    )
  )
    throw new Error("Desempenho inválido.");
  return {
    flags: { ...v.flags },
    sims: v.sims,
    erros: v.erros,
    answers,
    currentTrail:
      typeof v.currentTrail === "string" ? v.currentTrail : undefined,
  };
}
export function readProgress(): Progress {
  try {
    return validateProgress(
      JSON.parse(localStorage.getItem("bio_sf_local") || "null"),
    );
  } catch {
    return emptyProgress();
  }
}
export function recordAnswer(s: Progress, unit: number, correct: boolean) {
  const a = s.answers[unit] || { correct: 0, total: 0 };
  s.answers[unit] = {
    correct: a.correct + Number(correct),
    total: a.total + 1,
  };
}
export function concept(ratio: number) {
  return ratio >= 0.85 ? "A" : ratio >= 0.7 ? "B" : ratio >= 0.5 ? "C" : "D";
}
export function unitStats(s: Progress, unit: number) {
  const a = s.answers[unit] || { correct: 0, total: 0 };
  const ratio = a.total ? a.correct / a.total : 0;
  return { ...a, ratio, concept: a.total ? concept(ratio) : "—" };
}
export const normalizeAnswer = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
export const checkCompletion = (answer: string, accepted: string[]) =>
  !!normalizeAnswer(answer) &&
  accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(answer));
// Regra preservada do original: completar incorreto não recebe a penalização da múltipla escolha.
export function scoreAnswer(type: string, correct: boolean, blank = false) {
  return blank ? 0 : correct ? 1 : type === "mc" ? -0.25 : 0;
}
