import PROVAS from "./data/provas.json";
import UNITS from "./data/units.json";
import AULAS from "./data/aulas.json";
import QS from "./data/questoes.json";
import GLOSS from "./data/glossario.json";
import CRONO from "./data/cronograma.json";
import PTMAP from "./data/traducao-pt.json";
import CONT from "./data/conteudo.json";
import REFS from "./data/referencias.json";
import RES from "./data/resolvidas.json";
import rawTrilhas from "./data/trilhas.json";
import QSEC from "./data/questoes-por-assunto.json";
import { createModels } from "./models/legacy.js";
import {
  recordAnswer,
  unitStats,
  readProgress,
  validateProgress,
  checkCompletion,
  scoreAnswer,
} from "./progress";
export function createStudy(root, navigate) {
  let profile = "aluno";
  let showKey = true;
  const answerKey = () => profile === "professor" && showKey;
  const abort = new AbortController();
  const listen = (type, fn) =>
    root.addEventListener(type, fn, { signal: abort.signal });
  const TRILHAS = JSON.parse(JSON.stringify(rawTrilhas));
  const UNIT = Object.fromEntries(UNITS.map((u) => [u.id, u]));
  const QBY = Object.fromEntries(QS.map((q) => [q.id, q]));
  const $ = (s) => root.querySelector(s);
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const today = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const parseD = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const daysTo = (s) => Math.round((parseD(s) - today()) / 864e5);
  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
    } catch (e) {
      return iso;
    }
  };
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.h);
    toast.h = setTimeout(() => (t.hidden = true), 2600);
  }
  const ls = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    },
  };

  /* ===================== TRADUÇÃO ===================== */
  // Cada texto em italiano (perguntas, alternativas, tópicos, termos) tem a tradução em português; o botão do cabeçalho esconde ou mostra.
  const SHOWPT = { on: ls.get("show_pt", true) };
  function bi(it) {
    const s = String(it),
      t = PTMAP[s];
    return esc(s) + (SHOWPT.on && t ? `<span class="pt">${esc(t)}</span>` : "");
  }
  function updPt() {
    const b = $("#pt-tg");
    if (b) {
      b.setAttribute("aria-pressed", SHOWPT.on);
      b.textContent = SHOWPT.on
        ? "Tradução PT: ligada"
        : "Tradução PT: desligada";
    }
  }
  listen("click", (e) => {
    if (e.target.closest("#pt-tg")) {
      SHOWPT.on = !SHOWPT.on;
      ls.set("show_pt", SHOWPT.on);
      updPt();
      render(true);
    }
  });
  updPt();

  const { MODELS, MBY, labStop } = createModels(root, {
    esc,
    shuffle,
    bi,
    inl,
  });
  const LAB = { id: null, from: null, step: null, u: 0 };
  /* ===================== ARMAZENAMENTO ===================== */
  // Persistência local; o estado continua utilizável se o navegador bloquear o armazenamento.
  const S = readProgress();
  const Store = {
    init() {
      setSync(false);
    },
    saveLocal() {
      ls.set("bio_sf_local", S);
    },
    setFlag(k, v) {
      S.flags = { ...S.flags, [k]: v };
      this.saveLocal();
      render();
    },
    addSim(sim) {
      S.sims.push({ id: "l" + Date.now(), ...sim });
      this.saveLocal();
    },
    delSim(id) {
      S.sims = S.sims.filter((s) => s.id !== id);
      this.saveLocal();
      render();
    },
    addErro(id) {
      S.erros[id] = {
        n: (S.erros[id]?.n || 0) + 1,
        ultima: new Date().toISOString(),
      };
      this.saveLocal();
    },
    delErro(id) {
      delete S.erros[id];
      this.saveLocal();
      render();
    },
  };
  function track(q, ok) {
    recordAnswer(S, q.u, ok);
    Store.saveLocal();
  }
  function setSync(on) {
    const el = $("#sync");
    el.classList.toggle("on", on);
    el.querySelector("span").textContent = on
      ? "Progresso compartilhado"
      : "Salvo só neste navegador";
  }

  /* ===================== NAVEGAÇÃO ===================== */
  const VIEWS = [
    ["inicio", "Início"],
    ["trilhas", "Trilhas"],
    ["conteudo", "Conteúdo"],
    ["laboratorio", "Laboratório"],
    ["resolvidas", "Resolvidas"],
    ["aula", "Aula"],
    ["quiz", "Quiz"],
    ["simulado", "Simulado"],
    ["flashcards", "Flashcards"],
    ["erros", "Caderno de erros"],
    ["cronograma", "Cronograma"],
    ["unidades", "Unidades"],
    ["referencias", "Referências"],
  ];
  const cur = { view: "inicio" };
  function go(v) {
    cur.view = v;
    SIM.showing = false;
    const id =
      v === "conteudo"
        ? CT.id
        : v === "laboratorio"
          ? LAB.id
          : v === "resolvidas"
            ? RS.id
            : v === "trilhas"
              ? TR.id
              : null;
    navigate("/" + v + (id ? "/" + id : ""));
    render(true);
    window.scrollTo(0, 0);
  }
  function renderNav() {}
  listen("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) {
      if (b.hasAttribute("data-top")) {
        CT.id = null;
        CT.from = null;
        RS.id = null;
        RS.from = null;
        TR.id = null;
        LAB.id = null;
        LAB.from = null;
      }
      go(b.dataset.go);
    }
  });

  function unitProgress(u) {
    const n = u.topicos.length;
    let d = 0;
    u.topicos.forEach((_, i) => {
      if (S.flags["t_" + u.id + "_" + i]) d++;
    });
    return { d, n, p: n ? d / n : 0 };
  }
  function render(nav) {
    renderNav();
    const v = cur.view,
      app = $("#app");
    // durante a prova, o quiz ou a correção, só redesenha quando a pessoa navega até a aba
    if (v === "simulado" && SIM.run) {
      if (nav) simQ();
      return;
    }
    if (v === "simulado" && SIM.showing && !nav) return;
    if (v === "quiz" && QZ.list) {
      if (nav) quizQ();
      return;
    }
    if (v === "laboratorio" && LAB.id && !nav) return;
    if (v !== "laboratorio") labStop();
    (
      ({
        professor: profile === "professor" ? vProfessor : vInicio,
        progresso: vProgresso,
        inicio: vInicio,
        cronograma: vCrono,
        unidades: vUnidades,
        aula: vAula,
        quiz: vQuizSetup,
        simulado: vSimSetup,
        flashcards: vFlash,
        erros: vErros,
        trilhas: vTrilhas,
        conteudo: vConteudo,
        resolvidas: vResolvidas,
        referencias: vRefs,
        laboratorio: vLab,
      })[v] || vInicio
    )(app);
  }

  /* ===================== INÍCIO ===================== */
  function vInicio(app) {
    const t = today();
    const wk =
      CRONO.find((w) => t >= parseD(w.ini) && t <= parseD(w.fim)) ||
      CRONO.find((w) => parseD(w.ini) > t) ||
      CRONO[CRONO.length - 1];
    const sims = S.sims.slice(-10);
    const media = sims.length
      ? sims.reduce((a, s) => a + s.nota, 0) / sims.length
      : null;
    const totT = UNITS.reduce((a, u) => a + u.topicos.length, 0),
      doneT = UNITS.reduce((a, u) => a + unitProgress(u).d, 0);
    app.innerHTML = `<div class="stack">
   ${resumeCard()}${performanceCards()}
   <div><p class="eyebrow">Medicina · Itália · 2026/27</p><h1>Prepare o seu <span class="accent">próximo passo.</span></h1>
   <p class="muted" style="margin-top:6px;max-width:62ch">31 questões em 50 minutos: 21 de múltipla escolha e 10 de completar. Vale a melhor nota entre os dois appelli.</p></div>
   <div class="grid">
     ${PROVAS.map((p) => {
       const d = daysTo(p.data);
       return `<div class="card"><p class="eyebrow">${p.nome} · ${parseD(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}, 11h</p><div class="big" style="margin-top:8px">${d > 0 ? d : d === 0 ? "Hoje" : "—"}</div><p class="muted">${d > 0 ? "dias" : d === 0 ? "boa prova" : "já realizada"}</p></div>`;
     }).join("")}
     <div class="card"><p class="eyebrow">Média dos últimos simulados</p><div class="big" style="margin-top:8px">${media === null ? "—" : media.toFixed(1)}</div><p class="muted">${media === null ? "nenhum simulado ainda" : "de 31 · aprovação a partir de 18"}</p></div>
   </div>
   <div class="grid">
     <div class="card stack"><div class="row" style="justify-content:space-between"><h3>Esta semana · ${esc(wk.per)}</h3><span class="u-tag">Fase ${wk.fase}</span></div>
       <div>${wk.t.map((x, i) => chk("c_" + wk.id + "_" + i, x)).join("")}</div>
       <button class="btn" data-go="cronograma">Ver cronograma completo</button></div>
     <div class="card stack"><div class="row" style="justify-content:space-between"><h3>Tópicos dominados</h3><span class="muted" style="font-variant-numeric:tabular-nums">${doneT}/${totT}</span></div>
       ${UNITS.map((u) => {
         const p = unitProgress(u);
         return `<div><div class="row" style="justify-content:space-between;gap:8px"><span><span class="u-tag">U${u.id}</span> ${esc(u.pt)}</span><span class="muted" style="font-size:.85rem">${p.d}/${p.n}</span></div><div class="bar" style="margin-top:4px"><b style="width:${Math.round(p.p * 100)}%"></b></div></div>`;
       }).join("")}
     </div>
   </div>
   <div class="card stack"><div class="row" style="justify-content:space-between"><h3>Guia de estudo · 1 → 8</h3><div class="row" style="gap:8px"><button class="btn" data-go="laboratorio">Laboratório</button><button class="btn" data-go="trilhas">Ver todas</button></div></div>
     <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))">${[
       "t1",
       "t3",
       "t4",
       "t8",
       "t2",
       "t6",
       "t5",
       "t7",
     ]
       .map((id) => TBY[id])
       .map((t, index) => {
         const p = trProg(t);
         return `<button class="card linkcard" style="padding:12px" data-tr="${t.id}"><b>${index + 1}. ${esc(t.nome)}</b><span class="bar"><b style="width:${Math.round((p.d / p.n) * 100)}%"></b></span><span class="muted" style="font-size:.82rem;font-variant-numeric:tabular-nums">${p.d}/${p.n} passos</span></button>`;
       })
       .join("")}</div></div>
   <div class="card stack"><div class="row" style="justify-content:space-between"><h3>Notas dos simulados</h3><button class="btn primary" data-go="simulado">Fazer simulado</button></div>${simChart(sims)}</div>
  </div>`;
  }
  function simChart(sims) {
    if (!sims.length)
      return `<p class="muted">As notas aparecem aqui depois do primeiro simulado completo. A linha tracejada marca 18, a nota mínima.</p>`;
    const W = 600,
      H = 170,
      L = 28,
      B = 22,
      T = 10,
      bw = (W - L - 8) / 10;
    const y = (v) => T + (H - T - B) * (1 - v / 31);
    let s = `<div class="scroll"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Notas dos últimos simulados">`;
    [0, 10, 18, 31].forEach((v) => {
      s += `<line class="${v === 18 ? "th" : "gl"}" x1="${L}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    });
    sims.forEach((m, i) => {
      const x = L + 6 + i * bw,
        h = y(0) - y(Math.max(0, m.nota));
      s += `<rect class="${m.nota >= 18 ? "b-ok" : "b-no"}" x="${x}" y="${y(Math.max(0, m.nota))}" width="${bw - 10}" height="${h}" rx="3"/><text class="ax" x="${x + (bw - 10) / 2}" y="${y(Math.max(0, m.nota)) - 4}" text-anchor="middle">${m.nota}</text><text class="ax" x="${x + (bw - 10) / 2}" y="${H - 6}" text-anchor="middle">${fmtDate(m.quando)}</text>`;
    });
    return s + `</svg></div>`;
  }
  function chk(key, label) {
    const on = !!S.flags[key];
    return `<label class="check${on ? " done" : ""}"><input type="checkbox" data-flag="${key}" ${on ? "checked" : ""}><span>${bi(label)}</span></label>`;
  }
  listen("change", (e) => {
    const c = e.target.closest("[data-flag]");
    if (c) Store.setFlag(c.dataset.flag, c.checked);
  });

  /* ===================== CRONOGRAMA ===================== */
  function vCrono(app) {
    const t = today();
    const fase = (f) =>
      CRONO.filter((w) => w.fase === f)
        .map((w) => {
          const now = t >= parseD(w.ini) && t <= parseD(w.fim);
          return `<div class="card stack" style="${now ? "border-color:var(--eosin)" : ""}"><div class="row" style="justify-content:space-between"><h3>${esc(w.per)}</h3>${now ? `<span class="u-tag" style="color:var(--eosin);background:var(--eosin-soft)">semana atual</span>` : ""}</div><div>${w.t.map((x, i) => chk("c_" + w.id + "_" + i, x)).join("")}</div></div>`;
        })
        .join("");
    app.innerHTML = `<div class="stack"><div><h1>Cronograma</h1><p class="muted" style="margin-top:6px;max-width:62ch">Cerca de 2 horas de Biologia por dia, 6 dias por semana. Marque cada tarefa ao concluir.</p></div>
  <h2>Fase 1 · até o 1º appello (10/dez)</h2><div class="grid">${fase(1)}</div>
  <h2>Fase 2 · até o 2º appello (11/jan)</h2><div class="grid">${fase(2)}</div>
  <div class="card"><h3>Rotina diária (2h)</h3><div class="scroll" style="margin-top:8px"><table><thead><tr><th>Bloco</th><th>Tempo</th><th>O que fazer</th></tr></thead><tbody>
  <tr><td>Revisão</td><td class="num">15 min</td><td>Flashcards dos dias anteriores, em italiano</td></tr>
  <tr><td>Conteúdo novo</td><td class="num">60 min</td><td>Aula do cursinho; no fim, esquema de 1 página de memória</td></tr>
  <tr><td>Questões</td><td class="num">35 min</td><td>15–20 questões do tema, cronometradas</td></tr>
  <tr><td>Correção</td><td class="num">10 min</td><td>Cada erro vai para o caderno de erros</td></tr></tbody></table></div></div></div>`;
  }

  /* ===================== UNIDADES ===================== */
  function vUnidades(app) {
    app.innerHTML = `<div class="stack"><div><h1>Unidades do syllabus</h1><p class="muted" style="margin-top:6px;max-width:62ch">Ordenadas pelo peso na prova. Questões estimadas = 31 × CFU ÷ 6. Marque um tópico quando o aluno conseguir explicá-lo sem consultar.</p></div>
  ${UNITS.map((u) => {
    const p = unitProgress(u);
    const nq = QS.filter((q) => q.u === u.id).length;
    return `<details class="card unit"${(OPEN_U[u.id] ?? ls.get("open_u" + u.id, false)) ? " open" : ""} data-u="${u.id}"><summary><div class="stack" style="gap:4px;min-width:0"><div class="row" style="gap:8px"><span class="u-tag">U${u.id} · ${String(u.cfu).replace(".", ",")} CFU · ~${Math.round((31 * u.cfu) / 6)} questões</span></div><h3>${esc(u.pt)} <span class="muted" style="font-weight:500">· ${esc(u.nome)}</span></h3></div><span class="muted" style="font-variant-numeric:tabular-nums">${p.d}/${p.n}</span></summary>
   <div class="stack" style="margin-top:12px"><div class="bar"><b style="width:${Math.round(p.p * 100)}%"></b></div><div>${u.topicos.map((t, i) => chk("t_" + u.id + "_" + i, t)).join("")}</div>
   <div class="row"><button class="btn" data-cu-open="${u.id}">Ler conteúdo</button><button class="btn" data-aula="${u.id}">Dar aula desta unidade</button><button class="btn primary" data-pratica="${u.id}">Praticar (${nq} questões)</button></div></div></details>`;
  }).join("")}</div>`;
    app.querySelectorAll("details.unit").forEach((d) =>
      d.addEventListener("toggle", () => {
        OPEN_U[d.dataset.u] = d.open;
        ls.set("open_u" + d.dataset.u, d.open);
      }),
    );
  }
  const OPEN_U = {};
  listen("click", (e) => {
    const a = e.target.closest("[data-aula]");
    if (a) {
      AU.u = +a.dataset.aula;
      AU.i = 0;
      AU.show = false;
      go("aula");
      return;
    }
    const p = e.target.closest("[data-pratica]");
    if (p) {
      QZ.list = null;
      QZ.cfg.u = [+p.dataset.pratica];
      QZ.cfg.src = "todas";
      go("quiz");
      return;
    }
  });

  /* ===================== AULA ===================== */
  const AU = { u: 5, i: 0, show: false };
  function vAula(app) {
    const list = AULAS[AU.u],
      c = list[AU.i];
    app.innerHTML = `<div class="stack"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">Modo aula · use ← → no teclado</p><h1>Aula</h1></div></div>
  <div class="row" style="gap:6px">${UNITS.map((u) => `<button class="chip" aria-pressed="${u.id === AU.u}" data-au="${u.id}">U${u.id} ${esc(u.pt)}</button>`).join("")}</div>
  <div class="card slide"><div class="row" style="justify-content:space-between"><span class="u-tag">U${AU.u} · ${AU.i + 1} de ${list.length}</span></div><h2>${esc(c.t)}</h2><ul class="pts">${c.pts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
   <div class="ask"><p class="eyebrow" style="color:var(--eosin)">Pergunte ao aluno</p><p style="font-weight:600;margin-top:4px">${esc(c.q)}</p>${AU.show ? `<p style="margin-top:8px">${esc(c.a)}</p>` : `<button class="btn" style="margin-top:10px" id="au-rev">Mostrar resposta</button>`}</div></div>
  <div class="row" style="justify-content:space-between"><button class="btn" id="au-prev" ${AU.i === 0 ? "disabled" : ""}>← Anterior</button><button class="btn" data-pratica="${AU.u}">Praticar esta unidade</button><button class="btn primary" id="au-next" ${AU.i === list.length - 1 ? "disabled" : ""}>Próximo →</button></div></div>`;
    $("#au-prev").onclick = () => {
      AU.i--;
      AU.show = false;
      render();
    };
    $("#au-next").onclick = () => {
      AU.i++;
      AU.show = false;
      render();
    };
    const r = $("#au-rev");
    if (r)
      r.onclick = () => {
        AU.show = true;
        render();
      };
    app.querySelectorAll("[data-au]").forEach(
      (b) =>
        (b.onclick = () => {
          AU.u = +b.dataset.au;
          AU.i = 0;
          AU.show = false;
          render();
        }),
    );
  }
  listen("keydown", (e) => {
    if (
      cur.view === "aula" &&
      !/INPUT|TEXTAREA/.test(document.activeElement.tagName)
    ) {
      const n = AULAS[AU.u].length;
      if (e.key === "ArrowRight" && AU.i < n - 1) {
        AU.i++;
        AU.show = false;
        render();
      }
      if (e.key === "ArrowLeft" && AU.i > 0) {
        AU.i--;
        AU.show = false;
        render();
      }
      if (e.key === " ") {
        e.preventDefault();
        AU.show = !AU.show;
        render();
      }
    }
    if (
      cur.view === "flashcards" &&
      e.key === " " &&
      !/INPUT/.test(document.activeElement.tagName)
    ) {
      e.preventDefault();
      FL.flip = !FL.flip;
      render();
    }
  });

  function detailedExplanation(q) {
    return q.exp?.length
      ? `<div class="stack" style="gap:8px"><h4>Explicação detalhada</h4><ol class="pts">${q.exp.map((step) => `<li>${inl(step)}</li>`).join("")}</ol></div>`
      : "";
  }
  function expansionTable(title, headers, rows) {
    return rows?.length
      ? `<section class="card stack expansion-card"><h3>${esc(title)}</h3><div class="expansion-scroll" tabindex="0" role="region" aria-label="${esc(title)}"><table><thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inl(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`
      : "";
  }
  /* ===================== QUESTÕES (render comum) ===================== */
  function prepQ(q) {
    return q.tipo === "mc"
      ? { ...q, order: shuffle(q.opts.map((_, i) => i)) }
      : { ...q };
  }
  const L5 = "ABCDE";
  function checkCP(q, val) {
    return checkCompletion(val, q.acc);
  }

  /* ===================== QUIZ ===================== */
  const QZ = { cfg: { u: [], tipo: "misto", n: 10, src: "todas" }, list: null };
  function vQuizSetup(app) {
    const c = QZ.cfg,
      nErr = Object.keys(S.erros).length;
    app.innerHTML = `<div class="stack"><div><h1>Quiz</h1><p class="muted" style="margin-top:6px;max-width:62ch">Questões no formato da prova, em italiano, com correção e explicação na hora. Erros vão para o caderno de erros.</p></div>
  <div class="card stack"><div><p class="eyebrow">Unidades (nenhuma marcada = todas)</p><div class="row" style="gap:6px;margin-top:8px">${UNITS.map((u) => `<button class="chip" data-qu="${u.id}" aria-pressed="${c.u.includes(u.id)}">U${u.id} ${esc(u.pt)}</button>`).join("")}</div></div>
  <div><p class="eyebrow">Tipo</p><div class="row" style="gap:6px;margin-top:8px">${[
    ["misto", "Misto"],
    ["mc", "Múltipla escolha"],
    ["cp", "Completar"],
  ]
    .map(
      ([k, l]) =>
        `<button class="chip" data-qt="${k}" aria-pressed="${c.tipo === k}">${l}</button>`,
    )
    .join("")}</div></div>
  <div><p class="eyebrow">Fonte</p><div class="row" style="gap:6px;margin-top:8px"><button class="chip" data-qs="todas" aria-pressed="${c.src === "todas"}">Banco completo (${QS.length})</button><button class="chip" data-qs="erros" aria-pressed="${c.src === "erros"}" ${nErr ? "" : "disabled"}>Só meus erros (${nErr})</button></div></div>
  <div><p class="eyebrow">Quantidade</p><div class="row" style="gap:6px;margin-top:8px">${[5, 10, 20].map((n) => `<button class="chip" data-qn="${n}" aria-pressed="${c.n === n}">${n}</button>`).join("")}</div></div>
  <div><button class="btn primary" id="qz-go">Começar</button></div></div></div>`;
    app.querySelectorAll("[data-qu]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = +b.dataset.qu;
          c.u = c.u.includes(id) ? c.u.filter((x) => x !== id) : [...c.u, id];
          render();
        }),
    );
    app.querySelectorAll("[data-qt]").forEach(
      (b) =>
        (b.onclick = () => {
          c.tipo = b.dataset.qt;
          render();
        }),
    );
    app.querySelectorAll("[data-qs]").forEach(
      (b) =>
        (b.onclick = () => {
          c.src = b.dataset.qs;
          render();
        }),
    );
    app.querySelectorAll("[data-qn]").forEach(
      (b) =>
        (b.onclick = () => {
          c.n = +b.dataset.qn;
          render();
        }),
    );
    $("#qz-go").onclick = () => {
      let pool =
        c.src === "erros"
          ? Object.keys(S.erros)
              .map((id) => QBY[id])
              .filter(Boolean)
          : QS;
      pool = pool.filter(
        (q) =>
          (!c.u.length || c.u.includes(q.u)) &&
          (c.tipo === "misto" || q.tipo === c.tipo),
      );
      if (!pool.length) {
        toast("Nenhuma questão com esses filtros.");
        return;
      }
      QZ.list = shuffle(pool).slice(0, c.n).map(prepQ);
      QZ.i = 0;
      QZ.ok = 0;
      QZ.done = false;
      quizQ();
    };
  }
  function quizQ() {
    const app = $("#app");
    if (QZ.i >= QZ.list.length) {
      if (QZ.from) {
        Store.setFlag("tr_" + QZ.from + "_" + QZ.step, true);
        QZ.completedTrail = QZ.from;
        QZ.from = null;
      }
      const n = QZ.list.length;
      app.innerHTML = `<div class="card stack"><p class="eyebrow">Resultado</p><div class="big">${QZ.ok}/${n}</div><p class="muted">${QZ.ok === n ? "Tudo certo." : "Os erros foram para o caderno de erros."}</p><div class="row">${QZ.completedTrail ? `<button class="btn primary" data-backtrail="${QZ.completedTrail}">Concluir passo e voltar</button>` : ""}<button class="btn primary" id="qz-again">Novo quiz</button><button class="btn" data-go="erros">Ver caderno de erros</button></div></div>`;
      $("#qz-again").onclick = () => {
        QZ.list = null;
        render();
      };
      return;
    }
    const q = QZ.list[QZ.i];
    app.innerHTML = `<div class="stack"><div class="row" style="justify-content:space-between"><span class="u-tag">U${q.u} · ${q.tipo === "mc" ? "risposta multipla · múltipla escolha" : "completamento · completar"}</span><span class="muted" style="font-variant-numeric:tabular-nums">${QZ.i + 1}/${QZ.list.length} · ${QZ.ok} certas</span></div>
  <div class="card stack"><p class="q-text">${bi(q.q)}</p>
  ${
    q.tipo === "mc"
      ? `<div class="opts">${q.order.map((oi, k) => `<button class="opt${answerKey() && oi === 0 ? " right" : ""}" data-oi="${oi}"><b>${L5[k]}</b><span>${bi(q.opts[oi])}</span></button>`).join("")}</div>`
      : `<form id="cp-f" class="row"><input type="text" aria-label="Resposta em italiano" id="cp-in" autocomplete="off" placeholder="Escreva a resposta em italiano"><button class="btn primary">Responder</button></form>`
  }
  <div id="fb">${answerKey() ? teacherAnswer(q) : ""}</div></div>
  <div class="row" style="justify-content:space-between"><button class="btn" id="qz-quit">Sair</button><button class="btn primary" id="qz-next" ${answerKey() ? "" : "hidden"}>Próxima →</button></div></div>`;
    const answer = (ok, shown) => {
      track(q, ok);
      if (ok) QZ.ok++;
      else Store.addErro(q.id);
      $("#fb").innerHTML =
        `<div class="fb ${ok ? "ok" : "no"}"><p><strong>${ok ? "Certo." : "Errado."}</strong>${ok ? "" : ` Resposta: ${bi(shown)}`}</p><p>${esc(q.ex)}</p>${detailedExplanation(q)}</div>`;
      $("#qz-next").hidden = false;
      $("#qz-next").focus();
    };
    if (q.tipo === "mc")
      root.querySelectorAll(".opt").forEach(
        (b) =>
          (b.onclick = () => {
            const oi = +b.dataset.oi;
            root.querySelectorAll(".opt").forEach((x) => {
              x.disabled = true;
              if (+x.dataset.oi === 0) x.classList.add("right");
            });
            if (oi !== 0) b.classList.add("wrong");
            answer(oi === 0, q.opts[0]);
          }),
      );
    else {
      const f = $("#cp-f");
      $("#cp-in").focus();
      f.onsubmit = (e) => {
        e.preventDefault();
        const v = $("#cp-in").value;
        if (!v.trim()) return;
        f.querySelectorAll("input,button").forEach((x) => (x.disabled = true));
        answer(checkCP(q, v), q.acc[0]);
      };
    }
    $("#qz-next").onclick = () => {
      QZ.i++;
      quizQ();
    };
    $("#qz-quit").onclick = () => {
      QZ.list = null;
      render();
    };
  }

  /* ===================== SIMULADO ===================== */
  const SIM = { run: false };
  function pickWeighted(pool, total) {
    const by = {};
    UNITS.forEach(
      (u) => (by[u.id] = shuffle(pool.filter((q) => q.u === u.id))),
    );
    const raw = UNITS.map((u) => ({ id: u.id, x: (total * u.cfu) / 6 }));
    raw.forEach((r) => (r.n = Math.floor(r.x)));
    let left = total - raw.reduce((a, r) => a + r.n, 0);
    raw
      .sort((a, b) => b.x - b.n - (a.x - a.n))
      .forEach((r) => {
        if (left > 0) {
          r.n++;
          left--;
        }
      });
    let out = [];
    raw.forEach((r) => {
      out = out.concat(by[r.id].splice(0, r.n));
    });
    const rest = shuffle(Object.values(by).flat());
    while (out.length < total && rest.length) out.push(rest.pop());
    return out;
  }
  function vSimSetup(app) {
    const last = S.sims.slice().reverse();
    app.innerHTML = `<div class="stack"><div><h1>Simulado</h1><p class="muted" style="margin-top:6px;max-width:62ch">31 questões (21 de múltipla escolha e 10 de completar) sorteadas pelo peso de cada unidade, em 50 minutos. Pontuação da regra de 2025: +1 certa, −0,25 errada na múltipla escolha, 0 em branco.</p></div>
  <div class="card row" style="justify-content:space-between"><div><h3>Pronto para começar?</h3><p class="muted">Sem consulta. O cronômetro começa ao clicar.</p></div><button class="btn primary" id="sim-go">Iniciar simulado</button></div>
  <div class="card stack"><h3>Histórico</h3>${
    last.length
      ? `<div class="scroll"><table><thead><tr><th>Data</th><th>Nota</th><th>Certas</th><th>Erradas</th><th>Branco</th><th>Erros por unidade</th><th></th></tr></thead><tbody>${last
          .map(
            (s) =>
              `<tr><td>${fmtDate(s.quando)}</td><td class="num"><strong style="color:${s.nota >= 18 ? "var(--ok)" : "var(--bad)"}">${s.nota}</strong></td><td class="num">${s.certas}</td><td class="num">${s.erradas}</td><td class="num">${s.branco}</td><td>${
                Object.entries(s.porU || {})
                  .filter(([, n]) => n > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([u, n]) => `<span class="u-tag">U${u}: ${n}</span>`)
                  .join(" ") || "—"
              }</td><td><button class="btn" style="padding:3px 8px;font-size:.8rem" data-delsim="${esc(s.id)}">Apagar</button></td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : `<p class="muted">Nenhum simulado registrado. Os resultados aparecem aqui e no gráfico do Início.</p>`
  }</div></div>`;
    $("#sim-go").onclick = startSim;
    app.querySelectorAll("[data-delsim]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.confirm) {
            Store.delSim(b.dataset.delsim);
          } else {
            b.dataset.confirm = "1";
            b.textContent = "Confirmar";
          }
        }),
    );
  }
  function startSim() {
    const mc = pickWeighted(
        QS.filter((q) => q.tipo === "mc"),
        21,
      ),
      cp = pickWeighted(
        QS.filter((q) => q.tipo === "cp"),
        10,
      );
    Object.assign(SIM, {
      run: true,
      list: [...shuffle(mc), ...shuffle(cp)].map(prepQ),
      ans: {},
      i: 0,
      end: Date.now() + 50 * 60 * 1000,
    });
    clearInterval(SIM.t);
    SIM.t = setInterval(tick, 1000);
    simQ();
  }
  function tick() {
    const el = $("#sim-timer");
    const ms = SIM.end - Date.now();
    if (ms <= 0) {
      finishSim();
      return;
    }
    if (el) {
      const m = Math.floor(ms / 60000),
        s = Math.floor(ms / 1000) % 60;
      el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      el.classList.toggle("low", ms < 5 * 60000);
    }
  }
  function simQ() {
    const q = SIM.list[SIM.i],
      a = SIM.ans[q.id];
    $("#app").innerHTML =
      `<div class="stack"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">Simulado em andamento</p><span class="u-tag">${SIM.i + 1}/31 · ${q.tipo === "mc" ? "risposta multipla · múltipla escolha" : "completamento · completar"}</span></div><div class="timer" id="sim-timer">50:00</div></div>
  <div class="card stack"><p class="q-text">${bi(q.q)}</p>
  ${
    q.tipo === "mc"
      ? `<div class="opts">${q.order.map((oi, k) => `<button class="opt${a === oi ? " sel" : ""}" data-oi="${oi}"><b>${L5[k]}</b><span>${bi(q.opts[oi])}</span></button>`).join("")}</div><button class="btn" id="sim-clear" style="align-self:flex-start" ${a === undefined ? "disabled" : ""}>Deixar em branco</button>`
      : `<input type="text" aria-label="Resposta do simulado em italiano" id="sim-in" autocomplete="off" placeholder="Resposta em italiano (vazio = em branco)" value="${esc(a || "")}">`
  }</div>
  <div class="row" style="justify-content:space-between"><button class="btn" id="sim-prev" ${SIM.i === 0 ? "disabled" : ""}>← Anterior</button><button class="btn primary" id="sim-next">${SIM.i === 30 ? "Revisar e entregar" : "Próxima →"}</button></div>
  <div class="card stack"><div class="qgrid">${SIM.list.map((x, k) => `<button data-sj="${k}" class="${SIM.ans[x.id] !== undefined && SIM.ans[x.id] !== "" ? "ans" : ""} ${k === SIM.i ? "cur" : ""}">${k + 1}</button>`).join("")}</div>
  <div class="row" style="justify-content:space-between"><span class="muted" id="sim-count"></span><button class="btn" id="sim-end">Entregar agora</button></div></div></div>`;
    tick();
    const cnt = () => {
      $("#sim-count").textContent =
        `${SIM.list.filter((x) => SIM.ans[x.id] !== undefined && SIM.ans[x.id] !== "").length} de 31 respondidas`;
    };
    cnt();
    root.querySelectorAll(".opt").forEach(
      (b) =>
        (b.onclick = () => {
          SIM.ans[q.id] = +b.dataset.oi;
          simQ();
        }),
    );
    const cl = $("#sim-clear");
    if (cl)
      cl.onclick = () => {
        delete SIM.ans[q.id];
        simQ();
      };
    const inp = $("#sim-in");
    if (inp) {
      inp.focus();
      inp.oninput = () => {
        SIM.ans[q.id] = inp.value;
        const g = root.querySelector(`[data-sj="${SIM.i}"]`);
        g.classList.toggle("ans", inp.value.trim() !== "");
        cnt();
      };
      inp.onkeydown = (e) => {
        if (e.key === "Enter" && SIM.i < 30) {
          SIM.i++;
          simQ();
        }
      };
    }
    $("#sim-prev").onclick = () => {
      SIM.i--;
      simQ();
    };
    $("#sim-next").onclick = () => {
      if (SIM.i < 30) {
        SIM.i++;
        simQ();
      } else confirmEnd();
    };
    $("#sim-end").onclick = confirmEnd;
    root.querySelectorAll("[data-sj]").forEach(
      (b) =>
        (b.onclick = () => {
          SIM.i = +b.dataset.sj;
          simQ();
        }),
    );
  }
  function confirmEnd() {
    const b = $("#sim-end");
    if (b.dataset.c) {
      finishSim();
      return;
    }
    b.dataset.c = "1";
    b.textContent = "Confirmar entrega";
    b.classList.add("primary");
  }
  function finishSim() {
    clearInterval(SIM.t);
    SIM.run = false;
    SIM.showing = true;
    let certas = 0,
      erradas = 0,
      branco = 0,
      nota = 0;
    const porU = {};
    UNITS.forEach((u) => (porU[u.id] = 0));
    const res = SIM.list.map((q) => {
      const a = SIM.ans[q.id];
      let st;
      if (q.tipo === "mc") {
        if (a === undefined) st = "b";
        else st = a === 0 ? "c" : "e";
      } else {
        if (a === undefined || String(a).trim() === "") st = "b";
        else st = checkCP(q, a) ? "c" : "e";
      }
      if (st !== "b") track(q, st === "c");
      nota += scoreAnswer(q.tipo, st === "c", st === "b");
      if (st === "c") {
        certas++;
      } else if (st === "e") {
        erradas++;

        porU[q.u]++;
        Store.addErro(q.id);
      } else {
        branco++;
        porU[q.u]++;
      }
      return { q, a, st };
    });
    nota = Math.round(nota * 100) / 100;
    Store.addSim({
      quando: new Date().toISOString(),
      nota,
      certas,
      erradas,
      branco,
      porU,
    });
    if (cur.view !== "simulado") {
      toast("Simulado encerrado. Resultado salvo no histórico.");
      return;
    }
    $("#app").innerHTML =
      `<div class="stack"><div class="card stack"><p class="eyebrow">Resultado do simulado</p><div class="row" style="align-items:baseline"><div class="big" style="color:${nota >= 18 ? "var(--ok)" : "var(--bad)"}">${String(nota).replace(".", ",")}</div><span class="muted">de 31 · ${nota >= 18 ? "aprovado" : "abaixo de 18"}</span></div>
   <p>${certas} certas · ${erradas} erradas · ${branco} em branco</p>
   <div class="row" style="gap:6px">${Object.entries(porU)
     .filter(([, n]) => n > 0)
     .sort((a, b) => b[1] - a[1])
     .map(
       ([u, n]) =>
         `<span class="u-tag">U${u}: ${n} erro${n > 1 ? "s" : ""}/branco</span>`,
     )
     .join("")}</div>
   <div class="row"><button class="btn primary" data-go="simulado">Voltar</button><button class="btn" data-go="erros">Caderno de erros</button></div></div>
  <h2>Correção</h2>${res
    .map((r, k) => {
      const q = r.q;
      const resp = q.tipo === "mc" ? q.opts[0] : q.acc[0];
      const dada =
        r.st === "b" ? "em branco" : q.tipo === "mc" ? q.opts[r.a] : r.a;
      return `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="u-tag">${k + 1} · U${q.u}</span><strong style="color:${r.st === "c" ? "var(--ok)" : r.st === "e" ? "var(--bad)" : "var(--warn)"}">${r.st === "c" ? "Certa" : r.st === "e" ? "Errada" : "Em branco"}</strong></div><p style="font-weight:600">${bi(q.q)}</p>${r.st !== "c" ? `<p class="muted">Sua resposta: ${bi(dada)}</p>` : ""}<p><strong>Resposta:</strong> ${bi(resp)}</p><p class="muted">${esc(q.ex)}</p>${detailedExplanation(q)}</div>`;
    })
    .join("")}</div>`;
    window.scrollTo(0, 0);
  }

  /* ===================== FLASHCARDS ===================== */
  const FL = { i: 0, flip: false, dir: "it", u: 0, deck: null };
  function vFlash(app) {
    const known = ls.get("fl_known", {});
    if (!FL.deck) {
      FL.deck = shuffle(
        GLOSS.map((g, i) => i).filter((i) => !FL.u || GLOSS[i][2] === FL.u),
      );
      FL.i = 0;
    }
    const deck = FL.deck,
      g = deck.length ? GLOSS[deck[FL.i]] : null,
      nk = deck.filter((i) => known[i]).length;
    const front = g ? (FL.dir === "it" ? g[0] : g[1]) : "",
      back = g ? (FL.dir === "it" ? g[1] : g[0]) : "";
    app.innerHTML = `<div class="stack"><div><h1>Flashcards</h1><p class="muted" style="margin-top:6px;max-width:62ch">Termos do syllabus com grafia diferente do português. Clique no cartão ou aperte espaço para virar.</p></div>
  <div class="row" style="gap:6px"><button class="chip" data-fu="0" aria-pressed="${FL.u === 0}">Todas</button>${UNITS.map((u) => `<button class="chip" data-fu="${u.id}" aria-pressed="${FL.u === u.id}">U${u.id}</button>`).join("")}<span style="flex:1"></span><button class="chip" id="fl-dir">${FL.dir === "it" ? "Italiano → Português" : "Português → Italiano"}</button></div>
  ${
    g
      ? `<div class="card flash" id="fl-card" tabindex="0" role="button" aria-label="Virar cartão"><div><small>${FL.flip ? (FL.dir === "it" ? "Português" : "Italiano") : FL.dir === "it" ? "Italiano" : "Português"} · U${g[2]}</small>${esc(FL.flip ? back : front)}</div></div>
  <div class="row" style="justify-content:space-between"><span class="muted" style="font-variant-numeric:tabular-nums">${FL.i + 1}/${deck.length} · ${nk} já sabidos</span><div class="row"><button class="btn" id="fl-no">Revisar de novo</button><button class="btn primary" id="fl-yes">Já sei</button></div></div>`
      : `<p class="muted">Nenhum termo nesta unidade.</p>`
  }</div>`;
    app.querySelectorAll("[data-fu]").forEach(
      (b) =>
        (b.onclick = () => {
          FL.u = +b.dataset.fu;
          FL.deck = null;
          FL.flip = false;
          render();
        }),
    );
    $("#fl-dir").onclick = () => {
      FL.dir = FL.dir === "it" ? "pt" : "it";
      FL.flip = false;
      render();
    };
    if (!g) return;
    $("#fl-card").onclick = () => {
      FL.flip = !FL.flip;
      render();
    };
    const next = (k) => {
      const kn = ls.get("fl_known", {});
      if (k) kn[deck[FL.i]] = 1;
      else delete kn[deck[FL.i]];
      ls.set("fl_known", kn);
      FL.flip = false;
      FL.i = (FL.i + 1) % deck.length;
      render();
    };
    $("#fl-yes").onclick = () => next(true);
    $("#fl-no").onclick = () => next(false);
  }

  /* ===================== ERROS ===================== */
  function vErros(app) {
    const items = Object.entries(S.erros)
      .map(([id, v]) => ({ q: QBY[id], v }))
      .filter((x) => x.q)
      .sort((a, b) => (b.v.n || 0) - (a.v.n || 0));
    const byU = {};
    items.forEach((x) => (byU[x.q.u] = (byU[x.q.u] || 0) + 1));
    app.innerHTML = `<div class="stack"><div><h1>Caderno de erros</h1><p class="muted" style="margin-top:6px;max-width:62ch">Toda questão errada no quiz ou no simulado entra aqui. Retire quando o aluno acertar com segurança.</p></div>
  ${
    items.length
      ? `<div class="card row" style="justify-content:space-between"><div class="row" style="gap:6px">${Object.entries(
          byU,
        )
          .sort((a, b) => b[1] - a[1])
          .map(([u, n]) => `<span class="u-tag">U${u}: ${n}</span>`)
          .join(
            "",
          )}</div><button class="btn primary" id="er-pr">Praticar só os erros</button></div>
  ${items.map(({ q, v }) => `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="u-tag">U${q.u} · errou ${v.n || 1}×${v.ultima ? " · última " + fmtDate(v.ultima) : ""}</span><button class="btn" style="padding:3px 10px;font-size:.85rem" data-ok="${q.id}">Já aprendi</button></div><p style="font-weight:600">${bi(q.q)}</p>${profile === "professor" ? (showKey ? teacherAnswer(q, true) : "") : `<p><strong>Resposta:</strong> ${bi(q.tipo === "mc" ? q.opts[0] : q.acc[0])}</p><p class="muted">${esc(q.ex)}</p>${detailedExplanation(q)}`}</div>`).join("")}`
      : `<div class="card"><p>Nenhum erro registrado ainda.</p><p class="muted" style="margin-top:6px">Faça um quiz ou um simulado: as questões erradas aparecem aqui com a resposta e a explicação.</p><div class="row" style="margin-top:12px"><button class="btn primary" data-go="quiz">Abrir quiz</button></div></div>`
  }</div>`;
    const pr = $("#er-pr");
    if (pr)
      pr.onclick = () => {
        QZ.list = null;
        QZ.cfg = { ...QZ.cfg, src: "erros", u: [], tipo: "misto" };
        go("quiz");
      };
    app
      .querySelectorAll("[data-ok]")
      .forEach((b) => (b.onclick = () => Store.delErro(b.dataset.ok)));
  }

  /* ===================== CONTEÚDO TEÓRICO ===================== */
  // Cada seção: u = unidade, t = título, it = termos em italiano, txt = texto (linhas com "- " viram lista; **negrito**, *itálico*),
  // chave = o que memorizar, pega = armadilha comum de prova, le = onde ler (capítulo do Alberts, Fundamentos / L'essenziale).

  const CBY = Object.fromEntries(CONT.map((c) => [c.id, c]));

  /* ===================== REFERENCIAL ===================== */

  /* ===================== QUESTÕES RESOLVIDAS E DISCUTIDAS ===================== */
  // o = alternativas, c = índice da correta, passos = raciocínio, por = por que cada alternativa está certa ou errada, ct = seção de conteúdo ligada

  const RBY = Object.fromEntries(RES.map((r) => [r.id, r]));

  /* ===================== TRILHAS LÓGICAS ===================== */
  // passos: [tipo, id, ponte] — tipo "c" = conteúdo, "r" = resolvida, "q" = prática da unidade (id = número da unidade)

  const TBY = Object.fromEntries(TRILHAS.map((t) => [t.id, t]));

  /* ===================== TEXTO (mini-formatação) ===================== */
  function inl(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<i>$1</i>");
  }
  function md(lines) {
    let h = "",
      ul = false;
    lines.forEach((l) => {
      if (l.startsWith("- ")) {
        if (!ul) {
          h += `<ul class="pts">`;
          ul = true;
        }
        h += `<li>${inl(l.slice(2))}</li>`;
      } else {
        if (ul) {
          h += "</ul>";
          ul = false;
        }
        h += `<p>${inl(l)}</p>`;
      }
    });
    return h + (ul ? "</ul>" : "");
  }
  function unitChips(sel, attr) {
    return `<div class="row" style="gap:6px"><button class="chip" ${attr}="0" aria-pressed="${!sel}">Todas</button>${UNITS.map((u) => `<button class="chip" ${attr}="${u.id}" aria-pressed="${sel === u.id}">U${u.id} ${esc(u.pt)}</button>`).join("")}</div>`;
  }
  const leTxt = (s) =>
    s.replace(/ECB/g, "Alberts, Fundamentos / L'essenziale, cap.");

  /* ===================== CONTEÚDO ===================== */
  const CT = { u: 0, id: null, from: null, step: null };
  function vConteudo(app) {
    if (CT.id && CBY[CT.id]) return vLeitura(app);
    app.innerHTML = `<div class="stack"><div><h1>Conteúdo</h1><p class="muted" style="margin-top:6px;max-width:62ch">Texto-base de cada tópico do syllabus, em português, com os termos da prova em italiano. Cada seção termina com o que memorizar e a pegadinha mais comum.</p></div>
  ${unitChips(CT.u, "data-cu")}
  ${UNITS.filter((u) => !CT.u || u.id === CT.u)
    .map((u) => {
      const cs = CONT.filter((c) => c.u === u.id);
      const d = cs.filter((c) => S.flags["ct_" + c.id]).length;
      return `<section class="stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h2>U${u.id} · ${esc(u.pt)}</h2><span class="muted" style="font-variant-numeric:tabular-nums">${d}/${cs.length} estudadas</span></div>
    <div class="grid">${cs.map((c) => `<button class="card linkcard" data-ct="${c.id}"><span class="row" style="justify-content:space-between;gap:8px"><span class="u-tag">U${c.u}</span>${S.flags["ct_" + c.id] ? `<span class="ok-tag">✓ estudada</span>` : ""}</span><h3>${esc(c.t)}</h3><span class="muted" style="font-size:.88rem">${bi(c.it)}</span></button>`).join("")}</div></section>`;
    })
    .join("")}</div>`;
    app.querySelectorAll("[data-cu]").forEach(
      (b) =>
        (b.onclick = () => {
          CT.u = +b.dataset.cu;
          render();
        }),
    );
  }
  function imageCredit(image) {
    return `<span class="image-credit">${esc(image.autor)} · <a href="${esc(image.licenca_url)}" target="_blank" rel="noopener noreferrer">${esc(image.licenca)}</a> · <a href="${esc(image.pagina)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></span>`;
  }
  function contentFigures(images) {
    return (images || [])
      .map(
        (image) =>
          `<figure class="card content-figure"><img src="${esc(image.arquivo)}" loading="lazy" alt="${esc(image.alt)}"><figcaption><p>${esc(image.legenda)}</p>${SHOWPT.on && image.legenda_it ? `<p class="image-caption-it" lang="it"><i>${esc(image.legenda_it)}</i></p>` : ""}${imageCredit(image)}</figcaption></figure>`,
      )
      .join("");
  }
  function vLeitura(app) {
    const c = CBY[CT.id],
      i = CONT.indexOf(c),
      prev = CONT[i - 1],
      next = CONT[i + 1],
      done = !!S.flags["ct_" + c.id];
    const res = RES.filter((r) => r.ct === c.id);
    app.innerHTML = `<article class="stack">
  <div class="row" style="justify-content:space-between"><button class="btn" id="ct-back">← ${CT.from ? "Voltar à trilha" : "Todas as seções"}</button><span class="u-tag">U${c.u} · ${esc(UNIT[c.u].pt)}</span></div>
  <div><h1>${esc(c.t)}</h1><p class="muted" style="margin-top:6px"><span class="eyebrow">Na prova</span> <i>${bi(c.it)}</i></p></div>
  ${professorCard(c)}
  <div class="card prose">${md(c.txt)}</div>
  ${contentFigures(c.img)}
  ${expansionTable("Números e medidas que caem", ["Grandeza", "Valor", "Para lembrar"], c.num)}
  ${expansionTable("Vocabulário da prova (IT → PT)", ["Italiano", "Português"], c.voc)}
  <div class="grid"><div class="card box-key stack" style="gap:8px"><p class="eyebrow">Para memorizar</p><ul class="pts">${c.chave.map((k) => `<li>${inl(k)}</li>`).join("")}</ul></div>
   <div class="card box-pega stack" style="gap:8px"><p class="eyebrow">Pegadinha de prova</p><p>${inl(c.pega)}</p></div></div>
  ${c.detalhes?.length ? `<section class="card stack"><h3>Detalhes que a prova cobra</h3><ul class="pts">${c.detalhes.map((item) => `<li>${inl(item)}</li>`).join("")}</ul></section>` : ""}
  ${MODELS.filter((m) => m.ct.includes(c.id))
    .map(
      (m) =>
        `<button class="card linkcard" style="border-color:var(--hema)" data-lab="${m.id}"><span class="eyebrow" style="color:var(--hema)">Modelo interativo</span><h3>${esc(m.nome)}</h3><span class="muted" style="font-size:.92rem">${esc(m.d)}</span></button>`,
    )
    .join("")}
  ${sceneLinks(c.id)}
  ${res.length ? `<div class="card stack" style="gap:8px"><h3>Questões resolvidas sobre este tema</h3>${res.map((r) => `<button class="btn" style="text-align:left" data-rs="${r.id}">${bi(r.q)}</button>`).join("")}</div>` : ""}
  <div id="ct-check"></div>
  <p class="muted">Onde ler: ${esc(leTxt(c.le))} · <a href="#/referencias" data-go="referencias">todas as referências</a></p>
  <div class="row" style="justify-content:space-between">
   <button class="btn" id="ct-prev" ${prev ? "" : "disabled"}>← Anterior</button>
   <div class="row" style="gap:8px">${CT.from ? `<button class="btn primary" id="ct-step">Concluir passo e voltar</button>` : `<button class="btn ${done ? "" : "primary"}" id="ct-done">${done ? "✓ Estudada" : "Marcar como estudada"}</button>`}<button class="btn" data-pratica="${c.u}">Praticar U${c.u}</button></div>
   <button class="btn" id="ct-next" ${next ? "" : "disabled"}>Próxima →</button></div></article>`;
    $("#ct-back").onclick = () => {
      if (CT.from) {
        TR.id = CT.from;
        CT.from = null;
        CT.id = null;
        go("trilhas");
      } else {
        CT.id = null;
        go("conteudo");
        window.scrollTo(0, 0);
      }
    };
    $("#ct-prev").onclick = () => {
      CT.id = prev.id;
      CT.from = null;
      go("conteudo");
      window.scrollTo(0, 0);
    };
    $("#ct-next").onclick = () => {
      CT.id = next.id;
      CT.from = null;
      go("conteudo");
      window.scrollTo(0, 0);
    };
    if (profile === "professor" && c.prof) $("#prof-card").addEventListener("toggle", e => ls.set("bio_sf_prof_card_open", e.target.open));
    renderCheck($("#ct-check"), c.id);
    const d = $("#ct-done");
    if (d) d.onclick = () => Store.setFlag("ct_" + c.id, !done);
    const st = $("#ct-step");
    if (st)
      st.onclick = () => {
        const t = CT.from,
          k = CT.step;
        if (!S.flags["ct_" + c.id]) Store.setFlag("ct_" + c.id, true);
        Store.setFlag("tr_" + t + "_" + k, true);
        TR.id = t;
        CT.from = null;
        CT.id = null;
        go("trilhas");
      };
  }

  /* ===================== QUESTÕES RESOLVIDAS ===================== */
  const RS = {
    u: 0,
    id: null,
    pick: null,
    show: false,
    from: null,
    step: null,
  };
  function vResolvidas(app) {
    if (RS.id && RBY[RS.id]) return vResolvida(app);
    const list = RES.filter((r) => !RS.u || r.u === RS.u);
    app.innerHTML = `<div class="stack"><div><h1>Questões resolvidas e discutidas</h1><p class="muted" style="margin-top:6px;max-width:62ch">No formato da prova: múltipla escolha e de completar, em italiano. Deixe o aluno responder antes de abrir a discussão: ela mostra o raciocínio passo a passo e por que cada alternativa errada está errada.</p></div>
  ${unitChips(RS.u, "data-ru")}
  <div class="grid">${list.map((r) => `<button class="card linkcard" data-rs="${r.id}"><span class="row" style="justify-content:space-between;gap:8px"><span class="row" style="gap:6px"><span class="u-tag">U${r.u}</span><span class="u-tag" style="color:var(--muted);background:var(--sunk)">${r.tipo === "cp" ? "completar" : "múltipla escolha"}</span></span>${S.flags["rs_" + r.id] ? `<span class="ok-tag">✓ discutida</span>` : ""}</span><span style="font-weight:600">${bi(r.q)}</span></button>`).join("")}</div></div>`;
    app.querySelectorAll("[data-ru]").forEach(
      (b) =>
        (b.onclick = () => {
          RS.u = +b.dataset.ru;
          render();
        }),
    );
  }
  function vResolvida(app) {
    const r = RBY[RS.id];
    if (r.tipo === "cp") return vResolvidaCP(app, r);
    const i = RES.indexOf(r),
      prev = RES[i - 1],
      next = RES[i + 1],
      c = CBY[r.ct];
    const cls = (k) =>
      (RS.show || answerKey())
        ? k === r.c
          ? " right"
          : k === RS.pick
            ? " wrong"
            : ""
        : k === RS.pick
          ? " sel"
          : "";
    const res =
      RS.pick === null
        ? ""
        : RS.pick === r.c
          ? `<div class="fb ok"><p><b>Acertou.</b> Confira se o raciocínio também bate.</p></div>`
          : `<div class="fb no"><p><b>Errou:</b> marcou ${L5[RS.pick]}, a correta é ${L5[r.c]}.</p></div>`;
    app.innerHTML = `<div class="stack">
  <div class="row" style="justify-content:space-between"><button class="btn" id="rs-back">← ${RS.from ? "Voltar à trilha" : "Todas as questões"}</button><span class="u-tag">U${r.u} · ${i + 1} de ${RES.length}</span></div>
  <div class="card stack"><p class="q-text">${bi(r.q)}</p>
   <div class="opts">${r.o.map((o, k) => `<button class="opt${cls(k)}" data-pk="${k}" ${(RS.show || answerKey()) ? "disabled" : ""}><b>${L5[k]}</b><span>${bi(o)}</span></button>`).join("")}</div>
   ${(RS.show || answerKey()) ? "" : `<div class="row"><button class="btn primary" id="rs-show">Ver discussão</button><span class="muted">${RS.pick === null ? "Escolha uma alternativa primeiro, se quiser testar." : "Resposta marcada: " + L5[RS.pick]}</span></div>`}</div>
  ${
    (RS.show || answerKey())
      ? `<div class="card stack">${res}
   <div><p class="eyebrow">Resposta</p><p style="font-weight:600;margin-top:4px">${L5[r.c]}) ${bi(r.o[r.c])}</p></div>
   <div><p class="eyebrow">Raciocínio</p><ol class="steps">${r.passos.map((p) => `<li>${inl(p)}</li>`).join("")}</ol></div>
   <div><p class="eyebrow">Por que as outras estão erradas</p><ul class="pts" style="margin-top:6px">${r.o.map((o, k) => (k === r.c ? "" : `<li><b>${L5[k]})</b> ${esc(r.por[k])}</li>`)).join("")}</ul></div>
   <div class="box-pega card" style="padding:12px 14px"><p class="eyebrow">Pegadinha</p><p style="margin-top:4px">${inl(r.pega)}</p></div>
   ${c ? `<p class="muted">Conceito por trás: <button class="btn" style="padding:3px 10px;font-size:.9rem" data-ct="${c.id}">${esc(c.t)}</button></p>` : ""}</div>`
      : ""
  }
  <div class="row" style="justify-content:space-between"><button class="btn" id="rs-prev" ${prev ? "" : "disabled"}>← Anterior</button>${RS.from && (RS.show || answerKey()) ? `<button class="btn primary" id="rs-step">Concluir passo e voltar</button>` : ""}<button class="btn" id="rs-next" ${next ? "" : "disabled"}>Próxima →</button></div></div>`;
    const reset = (id) => {
      RS.id = id;
      RS.pick = null;
      RS.show = false;
      RS.from = null;
      go("resolvidas");
      window.scrollTo(0, 0);
    };
    $("#rs-back").onclick = () => {
      if (RS.from) {
        TR.id = RS.from;
        RS.from = null;
        RS.id = null;
        go("trilhas");
      } else {
        RS.id = null;
        go("resolvidas");
        window.scrollTo(0, 0);
      }
    };
    $("#rs-prev").onclick = () => reset(prev.id);
    $("#rs-next").onclick = () => reset(next.id);
    app.querySelectorAll("[data-pk]").forEach(
      (b) =>
        (b.onclick = () => {
          RS.pick = +b.dataset.pk;
          render();
        }),
    );
    const sh = $("#rs-show");
    if (sh)
      sh.onclick = () => {
        RS.show = true;
        if (!S.flags["rs_" + r.id]) Store.setFlag("rs_" + r.id, true);
        else render();
      };
    const st = $("#rs-step");
    if (st)
      st.onclick = () => {
        const t = RS.from;
        Store.setFlag("tr_" + t + "_" + RS.step, true);
        TR.id = t;
        RS.from = null;
        RS.id = null;
        go("trilhas");
      };
  }

  /* ===================== TRILHAS ===================== */
  const TR = { id: null };
  function trProg(t) {
    const d = t.p.filter((_, i) => S.flags["tr_" + t.id + "_" + i]).length;
    return { d, n: t.p.length };
  }
  function stepInfo(s) {
    const [k, id] = s;
    if (k === "c") return { tipo: "Conteúdo", t: CBY[id].t };
    if (k === "r") return { tipo: "Questão resolvida", t: RBY[id].q };
    if (k === "m") return { tipo: "Modelo interativo", t: MBY[id].nome };
    return { tipo: "Prática", t: `Quiz da U${id} · ${UNIT[id].pt}` };
  }
  function vTrilhas(app) {
    if (TR.id && TBY[TR.id]) return vTrilha(app);
    app.innerHTML = `<div class="stack"><div><h1>Trilhas de conhecimento</h1><p class="muted" style="margin-top:6px;max-width:64ch">Cada trilha segue a ordem em que um assunto depende do anterior: primeiro o conceito, depois uma questão resolvida que o aplica, até fechar com prática. Serve para montar a aula ou para o aluno estudar sozinho.</p></div>
  <div class="grid">${["t1", "t3", "t4", "t8", "t2", "t6", "t5", "t7"]
    .map((id) => TBY[id])
    .map((t, index) => {
      const p = trProg(t);
      return `<button class="card linkcard" data-tr="${t.id}"><span class="row" style="gap:6px">${t.us.map((u) => `<span class="u-tag">U${u}</span>`).join("")}</span><h3>${esc(t.nome)}</h3><span class="muted" style="font-size:.92rem">${esc(t.meta)}</span><span class="bar" style="margin-top:4px"><b style="width:${Math.round((p.d / p.n) * 100)}%"></b></span><span class="muted" style="font-size:.85rem;font-variant-numeric:tabular-nums">${p.d}/${p.n} passos</span></button>`;
    })
    .join("")}</div></div>`;
  }
  function vTrilha(app) {
    const t = TBY[TR.id],
      p = trProg(t);
    app.innerHTML = `<div class="stack">
  <div class="row" style="justify-content:space-between"><button class="btn" id="tr-back">← Todas as trilhas</button><span class="muted" style="font-variant-numeric:tabular-nums">${p.d}/${p.n} passos</span></div>
  <div><p class="eyebrow">Trilha · ${t.us.map((u) => "U" + u).join(" + ")}</p><h1>${esc(t.nome)}</h1></div>
  <div class="ask"><p class="eyebrow" style="color:var(--eosin)">Ao final, o aluno deve conseguir</p><p style="font-weight:600;margin-top:4px">${esc(t.meta)}</p></div>
  <div class="bar"><b style="width:${Math.round((p.d / p.n) * 100)}%"></b></div>
  <ol class="trail card">${t.p
    .map((s, i) => {
      const inf = stepInfo(s),
        done = !!S.flags["tr_" + t.id + "_" + i];
      return `<li class="tstep${done ? " done" : ""}"><span class="tnum">${done ? "✓" : i + 1}</span><div class="stack" style="gap:4px;min-width:0;flex:1"><span class="eyebrow">${inf.tipo}</span><b>${bi(inf.t)}</b><span class="muted">${esc(s[2])}</span>
    <div class="row" style="gap:12px;margin-top:4px"><button class="btn${!done && t.p.findIndex((_, j) => !S.flags["tr_" + t.id + "_" + j]) === i ? " primary" : ""}" data-step="${i}">Abrir</button><label class="mini"><input type="checkbox" data-flag="tr_${t.id}_${i}" ${done ? "checked" : ""}> feito</label></div></div></li>`;
    })
    .join("")}</ol></div>`;
    $("#tr-back").onclick = () => {
      TR.id = null;
      go("trilhas");
      window.scrollTo(0, 0);
    };
    app
      .querySelectorAll("[data-step]")
      .forEach((b) => (b.onclick = () => openStep(t, +b.dataset.step)));
  }

  /* ===================== REFERÊNCIAS ===================== */
  function vRefs(app) {
    const link = (r) =>
      `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.t)}</a>`;
    app.innerHTML = `<div class="stack"><div><h1>Referências</h1><p class="muted" style="margin-top:6px;max-width:62ch">O conteúdo do app segue o syllabus oficial e os livros abaixo. Quando o aluno errar um tema várias vezes, volte ao capítulo indicado.</p></div>
  <div class="card stack" style="gap:8px"><p class="eyebrow">Documento oficial</p>${REFS.oficial.map((r) => `<div>${link(r)}<p class="muted">${esc(r.d)}</p></div>`).join("")}</div>
  <div class="card stack" style="gap:12px"><p class="eyebrow">Livros-texto</p>${REFS.livros.map((r) => `<div><b>${esc(r.t)}</b>${r.pt ? `<p class="muted">${esc(r.pt)}</p>` : ""}<p>${esc(r.d)}</p></div>`).join("")}</div>
  <div class="card stack" style="gap:8px"><h3>Onde ler cada unidade (Alberts, Fundamentos / L'essenziale)</h3><div class="scroll"><table><thead><tr><th>Unidade</th><th>Capítulos</th></tr></thead><tbody>${REFS.mapa.map(([u, c]) => `<tr><td><span class="u-tag">U${u}</span> ${esc(UNIT[u].pt)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table></div><p class="muted" style="font-size:.88rem">Numeração da 5ª edição. Em outra edição, procure o mesmo título no índice.</p></div>
  <div class="card stack" style="gap:8px"><p class="eyebrow">Gratuitos on-line</p>${REFS.gratis.map((r) => `<div>${link(r)}</div>`).join("")}</div>
  <section class="card stack"><h2>Créditos das imagens</h2>${CONT.flatMap((c) => (c.img || []).map((image) => `<div><p><b>${esc(c.t)}</b> · ${esc(image.titulo_commons)}</p>${imageCredit(image)}</div>`)).join("") || '<p class="muted">Nenhuma imagem baixada. Os créditos aparecerão após a importação das imagens.</p>'}</section>
  <div class="card stack" style="gap:8px"><h3>Cada seção do app e sua leitura</h3><div class="scroll"><table><thead><tr><th>Seção</th><th>Onde ler</th></tr></thead><tbody>${CONT.map((c) => `<tr><td><button class="btn" style="padding:3px 10px;font-size:.88rem;text-align:left" data-ct="${c.id}">U${c.u} · ${esc(c.t)}</button></td><td>${esc(leTxt(c.le))}</td></tr>`).join("")}</tbody></table></div></div></div>`;
  }

  listen("click", (e) => {
    const a = e.target.closest("[data-ct]");
    if (a) {
      CT.id = a.dataset.ct;
      CT.from = null;
      go("conteudo");
      return;
    }
    const r = e.target.closest("[data-rs]");
    if (r) {
      RS.id = r.dataset.rs;
      RS.pick = null;
      RS.show = false;
      RS.from = null;
      go("resolvidas");
      return;
    }
    const t = e.target.closest("[data-tr]");
    if (t) {
      TR.id = t.dataset.tr;
      S.currentTrail = TR.id;
      Store.saveLocal();
      go("trilhas");
      return;
    }
    const u = e.target.closest("[data-cu-open]");
    if (u) {
      CT.u = +u.dataset.cuOpen;
      CT.id = null;
      CT.from = null;
      go("conteudo");
      return;
    }
  });

  // Questão resolvida de completar: o aluno escreve a resposta em italiano antes de abrir a discussão
  function vResolvidaCP(app, r) {
    const i = RES.indexOf(r),
      prev = RES[i - 1],
      next = RES[i + 1],
      c = CBY[r.ct],
      ok = RS.pick !== null && checkCP(r, RS.pick);
    app.innerHTML = `<div class="stack">
  <div class="row" style="justify-content:space-between"><button class="btn" id="rs-back">← ${RS.from ? "Voltar à trilha" : "Todas as questões"}</button><span class="u-tag">U${r.u} · completar · ${i + 1} de ${RES.length}</span></div>
  <div class="card stack"><p class="q-text">${bi(r.q)}</p>
   ${(RS.show || answerKey()) ? "" : `<form id="rc-f" class="row"><input type="text" id="rc-in" autocomplete="off" placeholder="Escreva a resposta em italiano" value="${esc(RS.pick || "")}"><button class="btn primary">Responder e ver discussão</button></form><button class="btn" id="rs-show" style="align-self:flex-start">Ver discussão sem responder</button>`}</div>
  ${
    (RS.show || answerKey())
      ? `<div class="card stack">${RS.pick === null || RS.pick === "" ? "" : ok ? `<div class="fb ok"><p><b>Acertou:</b> «${esc(RS.pick)}».</p></div>` : `<div class="fb no"><p><b>Escreveu «${esc(RS.pick)}».</b> A resposta esperada é outra.</p></div>`}
   <div><p class="eyebrow">Resposta</p><p style="font-weight:600;margin-top:4px">${bi(r.resp)}</p></div>
   <div><p class="eyebrow">Raciocínio</p><ol class="steps">${r.passos.map((p) => `<li>${inl(p)}</li>`).join("")}</ol></div>
   <div class="box-pega card" style="padding:12px 14px"><p class="eyebrow">Pegadinha</p><p style="margin-top:4px">${inl(r.pega)}</p></div>
   ${c ? `<p class="muted">Conceito por trás: <button class="btn" style="padding:3px 10px;font-size:.9rem" data-ct="${c.id}">${esc(c.t)}</button></p>` : ""}</div>`
      : ""
  }
  <div class="row" style="justify-content:space-between"><button class="btn" id="rs-prev" ${prev ? "" : "disabled"}>← Anterior</button>${RS.from && (RS.show || answerKey()) ? `<button class="btn primary" id="rs-step">Concluir passo e voltar</button>` : ""}<button class="btn" id="rs-next" ${next ? "" : "disabled"}>Próxima →</button></div></div>`;
    const reset = (id) => {
      RS.id = id;
      RS.pick = null;
      RS.show = false;
      RS.from = null;
      go("resolvidas");
      window.scrollTo(0, 0);
    };
    $("#rs-back").onclick = () => {
      if (RS.from) {
        TR.id = RS.from;
        RS.from = null;
        RS.id = null;
        go("trilhas");
      } else {
        RS.id = null;
        go("resolvidas");
        window.scrollTo(0, 0);
      }
    };
    $("#rs-prev").onclick = () => reset(prev.id);
    $("#rs-next").onclick = () => reset(next.id);
    const reveal = () => {
      RS.show = true;
      if (!S.flags["rs_" + r.id]) Store.setFlag("rs_" + r.id, true);
      else render();
    };
    const f = $("#rc-f");
    if (f)
      f.onsubmit = (e) => {
        e.preventDefault();
        RS.pick = $("#rc-in").value.trim();
        reveal();
      };
    const sh = $("#rs-show");
    if (sh)
      sh.onclick = () => {
        RS.pick = null;
        reveal();
      };
    const st = $("#rs-step");
    if (st)
      st.onclick = () => {
        const t = RS.from;
        Store.setFlag("tr_" + t + "_" + RS.step, true);
        TR.id = t;
        RS.from = null;
        RS.id = null;
        go("trilhas");
      };
  }

  /* ===================== LABORATÓRIO: MODELOS INTERATIVOS ===================== */
  // Cada modelo desenha a si mesmo em um elemento e registra seus timers em LAB para serem parados ao sair.

  function vLab(app) {
    labStop();
    if (LAB.id && MBY[LAB.id]) {
      const m = MBY[LAB.id];
      app.innerHTML = `<div class="stack"><div class="row" style="justify-content:space-between"><button class="btn" id="lb-back">← ${LAB.from ? "Voltar à trilha" : "Todos os modelos"}</button><span class="u-tag">U${m.u} · ${esc(UNIT[m.u].pt)}</span></div>
    <div><p class="eyebrow">Modelo interativo</p><h1>${esc(m.nome)}</h1><p class="muted" style="margin-top:6px;max-width:66ch">${esc(m.d)}</p></div>
    <div id="lb-model" class="stack"></div>
    <div class="row" style="justify-content:space-between">${m.ct.map((c) => `<button class="btn" data-ct="${c}">Ler: ${esc(CBY[c].t)}</button>`).join("")}${LAB.from ? `<button class="btn primary" id="lb-step">Concluir passo e voltar</button>` : ""}</div></div>`;
      $("#lb-back").onclick = () => {
        labStop();
        if (LAB.from) {
          TR.id = LAB.from;
          LAB.from = null;
          LAB.id = null;
          go("trilhas");
        } else {
          LAB.id = null;
          go("laboratorio");
          window.scrollTo(0, 0);
        }
      };
      const st = $("#lb-step");
      if (st)
        st.onclick = () => {
          const t = LAB.from;
          Store.setFlag("tr_" + t + "_" + LAB.step, true);
          labStop();
          TR.id = t;
          LAB.from = null;
          LAB.id = null;
          go("trilhas");
        };
      m.f($("#lb-model"));
      return;
    }
    app.innerHTML = `<div class="stack"><div><h1>Laboratório</h1><p class="muted" style="margin-top:6px;max-width:64ch">Modelos para mexer: mude uma variável e veja a consequência. Antes de cada mudança, peça ao aluno que preveja o resultado; depois, que explique por que aconteceu.</p></div>
  ${unitChips(LAB.u || 0, "data-lu")}
  <div class="grid">${MODELS.filter((m) => !LAB.u || m.u === LAB.u)
    .map(
      (m) =>
        `<button class="card linkcard" data-lab="${m.id}"><span class="u-tag" style="align-self:flex-start">U${m.u}</span><h3>${esc(m.nome)}</h3><span class="muted" style="font-size:.92rem">${esc(m.d)}</span></button>`,
    )
    .join("")}</div></div>`;
    app.querySelectorAll("[data-lu]").forEach(
      (b) =>
        (b.onclick = () => {
          LAB.u = +b.dataset.lu;
          render();
        }),
    );
  }

  /* ---------- questões de cada assunto e traduções das novas ---------- */

  /* ===================== INTERATIVOS DE TODOS OS ASSUNTOS ===================== */
  // Três motores reaproveitáveis (animação passo a passo, classificar, mini-quiz) e simuladores próprios.

  listen("click", (e) => {
    const b = e.target.closest("[data-lab]");
    if (b) {
      LAB.id = b.dataset.lab;
      LAB.from = null;
      go("laboratorio");
    }
  });
  /* ---------- trilhas: cada assunto ganha os seus interativos logo depois do texto ---------- */
  TRILHAS.forEach((t) => {
    const has = new Set(t.p.filter((s) => s[0] === "m").map((s) => s[1]));
    const out = [];
    t.p.forEach((s) => {
      out.push(s);
      if (s[0] === "c")
        MODELS.filter((m) => m.ct.includes(s[1]) && !has.has(m.id)).forEach(
          (m) => {
            has.add(m.id);
            out.push(["m", m.id, "Interativo: " + m.d]);
          },
        );
    });
    t.p = out;
  });

  /* ---------- questões comentadas e autocorrigidas de cada assunto ---------- */
  const CKO = {};
  function renderCheck(el, cid) {
    const qs = (QSEC[cid] || []).map((id) => QBY[id]).filter(Boolean);
    if (!qs.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `<div class="card stack" style="gap:16px"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">Verifique</p><h3>Questões comentadas deste assunto</h3></div><span class="u-tag ck-score">${qs.length} questões</span></div><div class="stack ck-list" style="gap:20px"></div></div>`;
    const list = el.querySelector(".ck-list");
    let ok = 0,
      done = 0;
    qs.forEach((q, n) => {
      const d = document.createElement("div");
      d.className = "stack";
      d.style.gap = "8px";
      const ord =
        CKO[q.id] ||
        (CKO[q.id] = q.tipo === "mc" ? shuffle(q.opts.map((_, i) => i)) : []);
      d.innerHTML =
        `<p style="font-weight:600">${n + 1}. ${bi(q.q)}</p>` +
        (q.tipo === "mc"
          ? `<div class="opts">${ord.map((oi, k) => `<button class="opt${answerKey() && oi === 0 ? " right" : ""}" data-oi="${oi}"><b>${L5[k]}</b><span>${bi(q.opts[oi])}</span></button>`).join("")}</div>`
          : `<form class="row"><input type="text" aria-label="Resposta em italiano" autocomplete="off" placeholder="Resposta em italiano"><button class="btn primary">Corrigir</button></form>`) +
        `<div class="ck-fb">${answerKey() ? teacherAnswer(q) : ""}</div>`;
      list.appendChild(d);
      const fin = (right, shown) => {
        track(q, right);
        done++;
        if (right) ok++;
        else Store.addErro(q.id);
        d.querySelector(".ck-fb").innerHTML =
          `<div class="fb ${right ? "ok" : "no"}"><p><b>${right ? "Certo." : "Errado."}</b>${right ? "" : " Resposta: " + bi(shown)}</p><p>${esc(q.ex)}</p>${detailedExplanation(q)}</div>`;
        el.querySelector(".ck-score").textContent =
          `${ok}/${done} certas · ${qs.length} questões`;
      };
      if (q.tipo === "mc")
        d.querySelectorAll(".opt").forEach(
          (b) =>
            (b.onclick = () => {
              const oi = +b.dataset.oi;
              d.querySelectorAll(".opt").forEach((x) => {
                x.disabled = true;
                const v = +x.dataset.oi;
                if (v === 0) x.classList.add("right");
                else if (v === oi) x.classList.add("wrong");
              });
              fin(oi === 0, q.opts[0]);
            }),
        );
      else
        d.querySelector("form").onsubmit = (e) => {
          e.preventDefault();
          const inp = d.querySelector("input");
          if (!inp.value.trim()) return;
          inp.disabled = true;
          e.target.querySelector("button").disabled = true;
          fin(checkCP(q, inp.value), q.acc[0]);
        };
    });
  }

  function openStep(t, i) {
    const [k, id] = t.p[i];
    S.currentTrail = t.id;
    Store.saveLocal();
    if (k === "c") {
      CT.id = id;
      CT.from = t.id;
      CT.step = i;
      go("conteudo");
    } else if (k === "m") {
      LAB.id = id;
      LAB.from = t.id;
      LAB.step = i;
      go("laboratorio");
    } else if (k === "r") {
      RS.id = id;
      RS.pick = null;
      RS.show = false;
      RS.from = t.id;
      RS.step = i;
      go("resolvidas");
    } else {
      QZ.from = t.id;
      QZ.step = i;
      QZ.list = null;
      QZ.cfg.u = [id];
      QZ.cfg.src = "todas";
      go("quiz");
    }
  }
  listen("click", (e) => {
    const b = e.target.closest("[data-resume]");
    if (b) {
      const t = TBY[b.dataset.resume];
      const i = t.p.findIndex((_, j) => !S.flags["tr_" + t.id + "_" + j]);
      if (i < 0) {
        TR.id = t.id;
        go("trilhas");
      } else openStep(t, i);
    }
  });
  listen("click", (e) => {
    const b = e.target.closest("[data-backtrail]");
    if (b) {
      TR.id = b.dataset.backtrail;
      go("trilhas");
    }
  });
  function resumeCard() {
    const t = TBY[S.currentTrail] || TBY.t1;
    const i = t.p.findIndex((_, i) => !S.flags["tr_" + t.id + "_" + i]);
    return `<section class="card stack"><p class="eyebrow">Continuar de onde parei</p><h2>${esc(t.nome)}</h2><p>${i < 0 ? "Trilha concluída. Escolha a próxima no guia." : esc(stepInfo(t.p[i]).t)}</p><button class="btn primary" data-resume="${t.id}">Continuar · ${i < 0 ? "revisar" : "passo " + (i + 1)}</button></section>`;
  }
  function performanceCards(state = S) {
    return `<section class="card stack"><h2>Desempenho por unidade</h2><div class="grid">${UNITS.map(
      (u) => {
        const a = unitStats(state, u.id);
        const all = CONT.filter((c) => c.u === u.id).every(
          (c) => state.flags["ct_" + c.id],
        );
        return `<div><span class="u-tag">U${u.id} · conceito ${a.concept}</span><h3>${esc(u.pt)}</h3><p class="muted">${a.correct}/${a.total} certas${a.total ? " · " + Math.round(a.ratio * 100) + "%" : ""}</p>${all && a.ratio >= 0.7 ? '<strong class="ok-tag">Unidade certificada ✓</strong>' : ""}</div>`;
      },
    ).join("")}</div></section>`;
  }
  function sceneLinks(id) {
    const ids = {
      celula: [
        "c5_3",
        "c5_4",
        "c5_5",
        "c5_6",
        "c5_7",
        "c5_8",
        "c5_9",
        "c5_10",
        "c5_11",
      ],
      dna: ["c2_1", "c2_2", "c3_1"],
      membrana: ["c5_1", "c5_2", "c6_3"],
    };
    return Object.entries(ids)
      .filter(([, cts]) => cts.includes(id))
      .map(
        ([scene]) =>
          `<a class="card" href="#/3d/${scene}">Explorar em 3D: ${scene === "celula" ? "Célula eucariótica" : scene === "dna" ? "Do DNA ao cromossomo" : "Membrana plasmática"}</a>`,
      )
      .join("");
  }
  function teacherAnswer(q, options = false) {
    return `<div class="teacher-answer stack">${options && q.tipo === "mc" ? `<div class="opts">${q.opts.map((o, i) => `<div class="opt${i === 0 ? " right" : ""}">${bi(o)}${i === 0 ? " ✓ Correta" : ""}</div>`).join("")}</div>` : ""}<p><strong>Gabarito:</strong> ${bi(q.tipo === "mc" ? q.opts[0] : q.acc[0])}</p><p>${inl(q.ex)}</p>${detailedExplanation(q)}</div>`;
  }
  function professorCard(c) {
    if (profile !== "professor" || !c.prof) return "";
    const p = c.prof;
    return `<details id="prof-card" class="card stack professor-card" ${ls.get("bio_sf_prof_card_open", true) ? "open" : ""}><summary>Para o professor · ${inl(p.tempo)}</summary><div class="stack"><h2>Ideia central</h2><p>${inl(p.ideia)}</p><h3>Como explicar</h3><ol class="pts">${p.explicar.map(x => `<li>${inl(x)}</li>`).join("")}</ol><h3>Perguntas para o aluno</h3>${p.perguntas.map(([q, a]) => `<div><p>${inl(q)}</p><details><summary>Revelar resposta</summary><p>${inl(a)}</p></details></div>`).join("")}<h3>Erros comuns</h3><ul class="pts">${p.erros.map(x => `<li>${inl(x)}</li>`).join("")}</ul><h3>Ponte para a próxima seção</h3><p>${inl(p.ponte)}</p></div></details>`;
  }
  function studentPanel(imported) {
    const state = imported.progress;
    const errors = Object.entries(state.erros).map(([id, e]) => ({ q: QBY[id], ...e })).filter(x => x.q).sort((a, b) => b.n - a.n || a.q.id.localeCompare(b.q.id));
    const counts = {};
    const sectionFor = q => q.ct || Object.keys(QSEC).find(id => QSEC[id].includes(q.id));
    errors.forEach(({q, n}) => { const id = sectionFor(q); if (id) counts[id] = (counts[id] || 0) + n; });
    const next = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,3);
    return `<p>Arquivo: <b>${esc(imported.name)}</b> · Importado em ${esc(new Date(imported.when).toLocaleString("pt-BR"))}</p>${performanceCards(state)}<section class="card stack"><h3>Seções estudadas por unidade</h3>${UNITS.map(u => {
      const sections = CONT.filter(c => c.u === u.id), studied = sections.filter(c => state.flags["ct_" + c.id]);
      return `<div><h4>U${u.id}: ${studied.length}/${sections.length}</h4>${studied.map(c => `<a href="#/conteudo/${c.id}">${esc(c.t)}</a>`).join(" · ") || "Nenhuma seção estudada."}</div>`;
    }).join("")}</section><section class="card stack"><h3>Progresso de cada trilha</h3>${TRILHAS.map(t => {
      const done = t.p.filter((_,i) => state.flags["tr_" + t.id + "_" + i]).length;
      return `<div><a href="#/trilhas/${t.id}">${esc(t.nome)}</a><p>${done}/${t.p.length} passos · ${Math.round(done/t.p.length*100)}%</p><progress max="${t.p.length}" value="${done}">${done}/${t.p.length}</progress></div>`;
    }).join("")}</section><section class="card stack"><h3>Histórico de notas de simulado</h3>${simChart(state.sims.slice(-10))}<ul>${state.sims.map(m => `<li>${esc(new Date(m.quando).toLocaleString("pt-BR"))}: ${m.nota} · ${m.certas} certas, ${m.erradas} erradas, ${m.branco} em branco</li>`).join("")}</ul></section><section class="card stack"><h3>Começar a próxima aula por:</h3>${next.length ? `<ol>${next.map(([id,n]) => `<li><a href="#/conteudo/${id}">${esc(CBY[id].t)}</a> · ${n} erros</li>`).join("")}</ol>` : "<p>Sem erros registrados para sugerir seções.</p>"}<h3>Erros mais frequentes · top 15</h3>${errors.slice(0,15).map(({q,n}) => `<div><p>${n} erros · ${bi(q.q)}</p><a href="#/quiz/${q.id}">Abrir questão</a>${sectionFor(q) ? ` · <a href="#/conteudo/${sectionFor(q)}">Rever seção</a>` : ""}</div>`).join("") || "<p>Nenhum erro registrado.</p>"}</section>`;
  }
  function lessonSections(index) {
    const ids = [
      ["c5_1", "c5_2", "c5_9"], ["c5_8", "c5_7", "c5_4"],
      ["c5_5", "c5_6", "c5_10", ...CONT.filter(c => c.u === 1).map(c => c.id)],
      CONT.filter(c => [2,3,4,7].includes(c.u)).map(c => c.id),
      CONT.filter(c => c.u === 6).map(c => c.id),
      [], CONT.filter(c => [6,2].includes(c.u)).map(c => c.id),
      CONT.filter(c => [5,3].includes(c.u)).map(c => c.id),
      CONT.filter(c => [4,7,1].includes(c.u)).map(c => c.id), [], []
    ];
    if ([5,9,10].includes(index)) {
      const saved = ls.get("bio_sf_aluno", null);
      if (saved?.progress) {
        try { const state = validateProgress(saved.progress); return [...new Set(Object.keys(state.erros).map(id => QBY[id]?.ct || Object.keys(QSEC).find(ct => QSEC[ct].includes(id))).filter(Boolean))]; } catch {}
      }
      return CONT.map(c => c.id);
    }
    return ids[index] || [];
  }
  function vProfessor(app) {
    let imported = ls.get("bio_sf_aluno", null);
    try { if (imported) imported = { ...imported, progress: validateProgress(imported.progress) }; }
    catch { imported = null; }
    app.innerHTML = `<div class="stack"><h1>Professor</h1><section class="card stack"><h2>Gabarito</h2><label><input id="show-answer-key" type="checkbox" ${showKey ? "checked" : ""}> Mostrar gabarito</label><p>No simulado, o gabarito aparece somente depois da entrega.</p></section><section class="stack"><h2>Painel do aluno</h2><label class="card stack">Importar progresso do aluno<input id="import-student" type="file" accept="application/json,.json"></label><p id="student-message" role="status"></p>${imported ? studentPanel(imported) + '<button class="btn" id="remove-student">Remover dados importados</button>' : '<p>Nenhum progresso do aluno importado.</p>'}</section><section class="stack"><h2>Aulas</h2>${CRONO.map((w,i) => {
      const sections = lessonSections(i), trails = TRILHAS.filter(t => t.p.some(([kind,id]) => kind === "c" && sections.includes(id)));
      return `<section class="card stack"><h3>Aula ${i+1} · ${esc(w.per)}</h3><ul>${w.t.map(x => `<li>${esc(x)}</li>`).join("")}</ul>${i === 0 ? '<a class="btn primary" href="aulas/aula-01.html" target="_blank" rel="noopener">Abrir slide</a>' : ""}<div class="stack">${sections.map(id => `<a href="#/conteudo/${id}">${esc(CBY[id].t)}</a>`).join("")}</div><div class="row">${trails.map(t => `<a href="#/trilhas/${t.id}">${esc(t.nome)}</a>`).join(" · ")}</div></section>`;
    }).join("")}</section></div>`;
    $("#show-answer-key").onchange = e => { showKey = e.target.checked; };
    $("#import-student").onchange = async e => {
      try {
        const file = e.target.files[0]; if (!file) return;
        const progress = validateProgress(JSON.parse(await file.text()));
        const imported = { name: file.name, when: new Date().toISOString(), progress };
        localStorage.setItem("bio_sf_aluno", JSON.stringify(imported));
        render(); $("#student-message").textContent = "Progresso do aluno importado.";
      } catch (error) { $("#student-message").textContent = "Não foi possível importar: " + error.message; }
    };
    if (imported) $("#remove-student").onclick = () => {
      if (!confirm("Remover os dados importados do aluno?")) return;
      try { localStorage.removeItem("bio_sf_aluno"); render(); }
      catch { $("#student-message").textContent = "Não foi possível remover os dados."; }
    };
  }
  function vProgresso(app) {
    app.innerHTML = `<section class="stack"><h1>Meu <span class="accent">progresso.</span></h1>${performanceCards()}<div class="card stack"><p>O progresso fica neste navegador. Exporte uma cópia para guardar ou transferir para outro dispositivo.</p>${profile === "aluno" ? `<button class="btn primary" id="share-progress">Enviar progresso ao professor</button>` : ""}<button class="btn primary" id="export-progress">Exportar progresso em JSON</button><label class="stack">Importar progresso (substitui os dados atuais)<input id="import-progress" type="file" accept="application/json,.json"></label><button class="btn" id="reset-progress">Zerar progresso</button><p id="progress-message" role="status"></p></div></section>`;
    const share = $("#share-progress");
    if (share) share.onclick = async () => {
      try {
        const file = new File([JSON.stringify(S, null, 2)], "biologia-progresso.json", { type: "application/json" });
        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
          await navigator.share({ files: [file], title: "Meu progresso em Biologia" });
          $("#progress-message").textContent = "Progresso compartilhado.";
        } else {
          $("#export-progress").onclick();
          $("#progress-message").textContent = "Mande este arquivo ao professor (WhatsApp, e-mail).";
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          $("#export-progress").onclick();
          $("#progress-message").textContent = "Mande este arquivo ao professor (WhatsApp, e-mail).";
        }
      }
    };
    $("#export-progress").onclick = () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "biologia-progresso.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    $("#import-progress").onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        const next = validateProgress(JSON.parse(await file.text()));
        if (!confirm("Substituir o progresso atual pelo arquivo selecionado?"))
          return;
        Object.assign(S, next);
        Store.saveLocal();
        render();
        $("#progress-message").textContent = "Progresso importado.";
      } catch (e) {
        $("#progress-message").textContent =
          "Não foi possível importar: " + e.message;
      }
    };
    $("#reset-progress").onclick = () => {
      if (confirm("Apagar todo o progresso deste navegador?")) {
        Object.assign(S, {
          flags: {},
          sims: [],
          erros: {},
          answers: {},
          currentTrail: undefined,
        });
        Store.saveLocal();
        render();
        $("#progress-message").textContent = "Progresso zerado.";
      }
    };
  }
  Store.init();
  return {
    setProfile(next) {
      if (profile !== next) { showKey = true; RS.show = false; RS.pick = null; }
      profile = next === "professor" ? "professor" : "aluno";
    },
    show(view, id) {
      if (cur.view !== view) labStop();
      cur.view = view;
      if (view === "conteudo") CT.id = id && CBY[id] ? id : null;
      if (view === "laboratorio") LAB.id = id && MBY[id] ? id : null;
      if (view === "resolvidas") RS.id = id && RBY[id] ? id : null;
      if (view === "trilhas") TR.id = id && TBY[id] ? id : null;
      if (view === "quiz" && id && QBY[id]) {
        QZ.from = null;
        QZ.completedTrail = null;
        QZ.list = [prepQ(QBY[id])];
        QZ.i = 0;
        QZ.ok = 0;
      }

      if (view === "3d") {
        labStop();
        return;
      }
      render(true);
    },
    dispose() {
      abort.abort();
      labStop();
      clearInterval(SIM.t);
      clearTimeout(toast.h);
    },
    logic: { checkCP, pickWeighted },
    models: MODELS,
    state: S,
    trails: TRILHAS,
  };
}
