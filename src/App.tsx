import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createStudy } from "./study.js";
import content from "./data/conteudo.json";
import questions from "./data/questoes.json";
import { SceneContent } from "./three/ScenePage";
import { InstallButton } from "./components/PWA";
import { readProfile, saveProfile, type Profile } from "./profile";
import { ProfilePicker } from "./components/ProfilePicker";
export const routes = [
  ["professor", "Professor"],
  ["inicio", "Início"],
  ["trilhas", "Trilhas"],
  ["conteudo", "Conteúdo"],
  ["laboratorio", "Laboratório"],
  ["3d", "3D"],
  ["resolvidas", "Resolvidas"],
  ["quiz", "Quiz"],
  ["simulado", "Simulado"],
  ["flashcards", "Flashcards"],
  ["erros", "Caderno de erros"],
  ["cronograma", "Cronograma"],
  ["aula", "Aula"],
  ["unidades", "Unidades"],
  ["referencias", "Referências"],
  ["progresso", "Meu progresso"],
];
export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => readProfile() === "aluno" ? "aluno" : null);
  const [pickingProfile, setPickingProfile] = useState(false);
  const chooseProfile = (p: Profile) => { saveProfile(p); setProfile(p); setPickingProfile(false); };
  const root = useRef<HTMLDivElement>(null);
  const study = useRef<ReturnType<typeof createStudy>>();
  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [search, setSearch] = useState(false),
    [query, setQuery] = useState("");
  const [modelIndex, setModelIndex] = useState<
    { id: string; nome: string; d: string }[]
  >([]);
  const input = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("bio-theme") || "dark";
    } catch {
      return "dark";
    }
  });
  const [view, id] = location.pathname.slice(1).split("/");
  const current = routes.some((r) => r[0] === view) ? view : "inicio";
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("bio-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (!root.current) return;
    study.current = createStudy(root.current, (url: string) =>
      navigateRef.current(url),
    );
    setModelIndex(study.current.models);
    return () => study.current?.dispose();
  }, [!!profile, pickingProfile]);
  useEffect(() => {
    study.current?.setProfile(profile || "aluno");
    study.current?.show(current, id);
  }, [current, id, profile, pickingProfile]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") setSearch(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (search) input.current?.focus();
  }, [search]);
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const needle = norm(query.trim());
  const results = needle
    ? [
        ...content.map((c) => ({
          title: c.t,
          text: c.txt.join(" "),
          url: "/conteudo/" + c.id,
          type: "Conteúdo",
        })),
        ...questions.map((q) => ({
          title: q.q,
          text: q.ex,
          url: "/quiz/" + q.id,
          type: "Questão",
        })),
        ...modelIndex.map((m) => ({
          title: m.nome,
          text: m.d,
          url: "/laboratorio/" + m.id,
          type: "Modelo",
        })),
      ]
        .filter((x) => norm(x.title + " " + x.text).includes(needle))
        .slice(0, 40)
    : [];
  if (!profile || pickingProfile) return <ProfilePicker initialProfessor={!pickingProfile && readProfile() === "professor"} onChoose={chooseProfile} />;
  return (
    <>
      <a className="skip" href="#study-main">
        Ir para o conteúdo
      </a>
      <div ref={root} className="study-root">
        <header>
          <div className="wrap">
            <div className="top">
              <Link to="/inicio" className="brand">
                Biologia <span>Semestre Filtro</span>
              </Link>
              <div className="row tools">
                <button className="chip" onClick={() => { if (profile === "professor") chooseProfile("aluno"); else setPickingProfile(true); }}>{profile === "professor" ? "Professor · sair para Aluno" : "Aluno · trocar perfil"}</button>
                <button
                  className="chip"
                  aria-label="Abrir busca global"
                  onClick={() => setSearch(true)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="m15 15 6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>{" "}
                  Buscar <kbd>/</kbd>
                </button>
                <button
                  className="chip"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? "Tema claro" : "Tema escuro"}
                </button>
                <button id="pt-tg" className="chip" aria-pressed="true">
                  Tradução PT: ligada
                </button>
              </div>
            </div>
            <nav aria-label="Seções">
              {routes.filter(([key]) => key !== "professor" || profile === "professor").map(([key, title]) => (
                <Link
                  key={key}
                  to={"/" + key}
                  aria-current={current === key ? "page" : undefined}
                >
                  {title}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="wrap" id="study-main" tabIndex={-1}>
          <div id="app" hidden={current === "3d"} />
          {current === "3d" && <SceneContent id={id} />}
        </main>
        <footer className="wrap row">
          <div id="sync" className="sync">
            <i />
            <span>Salvo só neste navegador</span>
          </div>
          <InstallButton />
          <p className="muted">
            Material de estudo · confira os documentos oficiais nas referências.
          </p>
        </footer>
        <div className="toast" id="toast" hidden />
      </div>
      {search && (
        <div className="search-backdrop" onClick={() => setSearch(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Busca global"
            className="search-dialog card stack"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const buttons =
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button,input,a",
                  );
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="row">
              <h2>Busca global</h2>
              <button className="btn" onClick={() => setSearch(false)}>
                Fechar
              </button>
            </div>
            <label>
              Buscar em textos, questões e modelos
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Ex.: membrana, DNA, mitose"
              />
            </label>
            <p role="status" className="muted">
              {needle
                ? results.length + " resultados (até 40)"
                : "Digite um termo para buscar."}
            </p>
            <div className="stack search-results">
              {results.map((x) => (
                <Link
                  key={x.url}
                  className="card"
                  to={x.url}
                  onClick={() => setSearch(false)}
                >
                  <small className="eyebrow">{x.type}</small>
                  <p>{x.title}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
