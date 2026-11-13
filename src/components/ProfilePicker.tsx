import { useState } from "react";
import { forgetPin, readPin, unlockProfessor, type Profile } from "../profile";
export function ProfilePicker({ onChoose, initialProfessor = false }: { onChoose: (p: Profile) => void; initialProfessor?: boolean }) {
  const [professor, setProfessor] = useState(initialProfessor);
  const [creating, setCreating] = useState(!readPin());
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <section className="profile-screen wrap stack" aria-labelledby="profile-title">
    <h1 id="profile-title">Quem vai usar este aparelho?</h1>
    {!professor ? <div className="grid profile-choices">
      <button autoFocus className="card linkcard" onClick={() => onChoose("aluno")}><h2>Sou aluno</h2><span>Estudar e acompanhar meu progresso</span></button>
      <button className="card linkcard" onClick={() => setProfessor(true)}><h2>Sou professor</h2><span>Preparar aulas e acompanhar o aluno</span></button>
    </div> : <form className="card stack" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      try { await unlockProfessor(pin); onChoose("professor"); }
      catch (e) { setError((e as Error).message); }
      finally { setBusy(false); }
    }}>
      <h2>{creating ? "Criar PIN do professor" : "Entrar como professor"}</h2>
      <p>O PIN evita entrar por engano; não é proteção forte</p>
      <label className="stack">PIN de 4–6 dígitos<input autoFocus type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required autoComplete={creating ? "new-password" : "current-password"} value={pin} onChange={e => setPin(e.target.value)} /></label>
      <p role="alert">{error}</p>
      <button className="btn primary" disabled={busy}>{busy ? "Verificando…" : creating ? "Criar PIN e entrar" : "Entrar"}</button>
      {!creating && <button type="button" className="btn" onClick={() => {
        if (!confirm("Apagar somente o PIN e criar outro? Os progressos serão preservados.")) return;
        try { forgetPin(); setCreating(true); setPin(""); setError(""); }
        catch (e) { setError((e as Error).message); }
      }}>Esqueci o PIN</button>}
      <button type="button" className="btn" onClick={() => onChoose("aluno")}>Usar como aluno</button>
    </form>}
  </section>;
}
