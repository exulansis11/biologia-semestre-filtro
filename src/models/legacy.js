// Portado do app original: motores e dados científicos preservados.
export function createModels(root, { esc, shuffle, bi, inl }) {
  const $ = (s) => root.querySelector(s);
  const L5 = "ABCDE";
  const frames = new Set();
  const frame = (fn) => {
    const id = requestAnimationFrame((t) => {
      frames.delete(id);
      fn(t);
    });
    frames.add(id);
    return id;
  };
  const REDUCED = (() => {
    try {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  })();
  const LAB = { timers: [], raf: null };
  function labStop() {
    frames.forEach(cancelAnimationFrame);
    frames.clear();
    LAB.timers.forEach((t) => {
      clearInterval(t);
      clearTimeout(t);
    });
    LAB.timers = [];
    if (LAB.raf) cancelAnimationFrame(LAB.raf);
    LAB.raf = null;
  }
  const every = (fn, ms) => {
    const t = setInterval(fn, ms);
    LAB.timers.push(t);
    return t;
  };
  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    LAB.timers.push(t);
    return t;
  };
  const tog = (id, label, on) =>
    `<label class="mini tg"><input type="checkbox" id="${id}" ${on ? "checked" : ""}> ${label}</label>`;
  const meter = (label, v, max = 1) =>
    `<div><div class="row" style="justify-content:space-between;gap:8px"><span>${label}</span><span class="muted" style="font-variant-numeric:tabular-nums">${Math.round((v / max) * 100)}%</span></div><div class="bar" style="margin-top:4px"><b class="anim-w" style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></b></div></div>`;

  /* ---------- 1. Potencial de ação (Hodgkin-Huxley) ---------- */
  function hhRun(o) {
    const Ki = 4 * Math.exp(77 / 25.8),
      EK = 25.8 * Math.log(o.ko / Ki),
      ENa = 50,
      EL = -54.387,
      gNa = o.ttx ? 0 : 120,
      gK = o.tea ? 12 : 36,
      gL = 0.3;
    const rates = (V) => [
      Math.abs(V + 55) < 1e-6
        ? 0.1
        : (0.01 * (V + 55)) / (1 - Math.exp(-(V + 55) / 10)),
      0.125 * Math.exp(-(V + 65) / 80),
      Math.abs(V + 40) < 1e-6
        ? 1
        : (0.1 * (V + 40)) / (1 - Math.exp(-(V + 40) / 10)),
      4 * Math.exp(-(V + 65) / 18),
      0.07 * Math.exp(-(V + 65) / 20),
      1 / (1 + Math.exp(-(V + 35) / 10)),
    ];
    let V = -65,
      [an, bn, am, bm, ah, bh] = rates(V),
      n = an / (an + bn),
      m = am / (am + bm),
      h = ah / (ah + bh);
    const dt = 0.01,
      T = 30,
      out = [];
    let prev = V,
      sp = 0;
    for (let s = 0; s < (50 + T) / dt; s++) {
      const t = s * dt - 50;
      let I = 0;
      if (t >= 2 && t < 3) I = o.i1;
      if (o.i2 && t >= 2 + o.d && t < 3 + o.d) I = o.i2;
      [an, bn, am, bm, ah, bh] = rates(V);
      n += dt * (an * (1 - n) - bn * n);
      m += dt * (am * (1 - m) - bm * m);
      h += dt * (ah * (1 - h) - bh * h);
      V +=
        dt *
        (I -
          gNa * m ** 3 * h * (V - ENa) -
          gK * n ** 4 * (V - EK) -
          gL * (V - EL));
      if (t >= 0) {
        if (prev < 0 && V >= 0) sp++;
        if (s % 10 === 0) out.push([t, V, gNa * m ** 3 * h, gK * n ** 4, I]);
      }
      prev = V;
    }
    return { pts: out, sp, EK, rest: out[0][1] };
  }
  function mPot(el) {
    const st = { i1: 10, i2: 0, d: 12, ko: 4, ttx: false, tea: false };
    el.innerHTML = `<div class="lab-grid"><div class="card stack" style="gap:12px">
   <label class="sl">Estímulo 1 <b id="v-i1"></b><input type="range" id="p-i1" min="0" max="30" step="0.5" value="${st.i1}"></label>
   <label class="sl">2º estímulo <b id="v-i2"></b><input type="range" id="p-i2" min="0" max="30" step="0.5" value="${st.i2}"></label>
   <label class="sl">Intervalo entre os estímulos <b id="v-d"></b><input type="range" id="p-d" min="3" max="22" step="0.5" value="${st.d}"></label>
   <label class="sl">K⁺ extracelular <b id="v-ko"></b><input type="range" id="p-ko" min="2" max="12" step="0.5" value="${st.ko}"></label>
   ${tog("p-ttx", "Bloquear canais de Na⁺ (tetrodotoxina)")}${tog("p-tea", "Bloquear parte dos canais de K⁺ (TEA)")}
   <button class="btn primary" id="p-go">Estimular de novo</button></div>
   <div class="card stack" style="gap:8px"><svg id="p-svg" viewBox="0 0 620 330" width="100%" role="img" aria-label="Gráfico do potencial de membrana e das condutâncias"></svg>
   <div class="row" style="gap:14px;font-size:.85rem"><span><i class="key" style="background:var(--eosin)"></i>Potencial (mV)</span><span><i class="key" style="background:var(--hema)"></i>Condutância Na⁺</span><span><i class="key" style="background:var(--ok)"></i>Condutância K⁺</span></div></div></div>
   <div class="card stack" style="gap:8px"><p class="eyebrow">O que o modelo mostra</p><div id="p-exp" class="prose"></div></div>`;
    const svg = $("#p-svg"),
      X = (t) => 40 + (t / 30) * 570,
      Y = (v) => 12 + ((60 - v) / 170) * 190,
      G = (g) => 318 - (g / 40) * 90;
    function draw() {
      labStop();
      ["i1", "i2", "d", "ko"].forEach(
        (k) =>
          ($("#v-" + k).textContent =
            k === "d"
              ? st.d + " ms"
              : k === "ko"
                ? st.ko + " mM"
                : st[k] + " µA/cm²"),
      );
      const r = hhRun(st),
        P = r.pts;
      let bg = `<rect x="40" y="12" width="570" height="190" fill="var(--sunk)" rx="4"/>`;
      [40, 0, -40, -80].forEach(
        (v) =>
          (bg += `<line class="gl" x1="40" x2="610" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="34" y="${Y(v) + 3}" text-anchor="end">${v}</text>`),
      );
      bg += `<line class="th" x1="40" x2="610" y1="${Y(-55)}" y2="${Y(-55)}"/><text class="ax" x="606" y="${Y(-55) - 4}" text-anchor="end">limiar ≈ −55</text>`;
      [0, 5, 10, 15, 20, 25, 30].forEach(
        (t) =>
          (bg += `<text class="ax" x="${X(t)}" y="214" text-anchor="middle">${t} ms</text>`),
      );
      bg += `<text class="ax" x="40" y="248">condutâncias (mS/cm²)</text><line class="gl" x1="40" x2="610" y1="318" y2="318"/>`;
      const stim = P.filter((p) => p[4] > 0)
        .map(
          (p) =>
            `<rect x="${X(p[0])}" y="226" width="${570 / 300 + 0.5}" height="6" fill="var(--warn)"/>`,
        )
        .join("");
      svg.innerHTML =
        bg +
        stim +
        `<polyline id="l-gna" fill="none" stroke="var(--hema)" stroke-width="2"/><polyline id="l-gk" fill="none" stroke="var(--ok)" stroke-width="2"/><polyline id="l-v" fill="none" stroke="var(--eosin)" stroke-width="2.6" stroke-linejoin="round"/><circle id="l-dot" r="5" fill="var(--eosin)"/>`;
      const lv = $("#l-v"),
        ln = $("#l-gna"),
        lk = $("#l-gk"),
        dot = $("#l-dot");
      const paint = (k) => {
        const s = P.slice(0, k);
        lv.setAttribute(
          "points",
          s
            .map((p) => X(p[0]) + "," + Y(Math.max(-100, Math.min(60, p[1]))))
            .join(" "),
        );
        ln.setAttribute(
          "points",
          s.map((p) => X(p[0]) + "," + G(Math.min(40, p[2]))).join(" "),
        );
        lk.setAttribute(
          "points",
          s.map((p) => X(p[0]) + "," + G(Math.min(40, p[3]))).join(" "),
        );
        const q = s[s.length - 1];
        if (q) {
          dot.setAttribute("cx", X(q[0]));
          dot.setAttribute("cy", Y(Math.max(-100, Math.min(60, q[1]))));
        }
      };
      if (REDUCED) paint(P.length);
      else {
        const t0 = performance.now(),
          D = 1800;
        const f = (now) => {
          const k = Math.ceil(Math.min(1, (now - t0) / D) * P.length);
          paint(k);
          if (k < P.length) LAB.raf = frame(f);
        };
        LAB.raf = frame(f);
      }
      const ex = [
        `Repouso: <b>${r.rest.toFixed(0)} mV</b> · E<sub>K</sub> = ${r.EK.toFixed(0)} mV · E<sub>Na</sub> = +50 mV. Potenciais de ação disparados: <b>${r.sp}</b>.`,
      ];
      if (st.ttx)
        ex.push(
          "Sem canais de Na⁺ não existe fase de subida: o estímulo só provoca uma resposta passiva que some. É o efeito da tetrodotoxina do baiacu.",
        );
      else if (r.sp === 0 && st.ko >= 9.5)
        ex.push(
          "Com muito K⁺ fora, o E<sub>K</sub> fica menos negativo e a membrana despolariza em repouso. Os canais de Na⁺ ficam inativados e a célula não consegue disparar: é o bloqueio por despolarização, o perigo da hipercalemia no coração.",
        );
      else if (r.sp === 0)
        ex.push(
          "O estímulo não levou a membrana ao limiar: os poucos canais de Na⁺ que abriram não venceram a saída de K⁺. Aumente o estímulo e veja a resposta tudo ou nada.",
        );
      else
        ex.push(
          "Na subida, a condutância ao Na⁺ (violeta) dispara e o Na⁺ entra. Logo depois os canais de Na⁺ se inativam e a condutância ao K⁺ (verde), mais lenta, sobe: o K⁺ sai e repolariza, passando do repouso (hiperpolarização).",
        );
      if (st.tea && !st.ttx)
        ex.push(
          "Com menos canais de K⁺, a repolarização fica mais lenta e a membrana pode disparar de novo sozinha.",
        );
      if (st.ko >= 6.5 && st.ko < 9.5 && !st.ttx)
        ex.push(
          "K⁺ externo moderadamente alto deixa o repouso mais perto do limiar: a célula fica hiperexcitável.",
        );
      if (st.ko < 3.5 && !st.ttx)
        ex.push(
          "Com pouco K⁺ fora, a membrana fica mais negativa (hiperpolarizada) e precisa de um estímulo maior para disparar.",
        );
      if (st.i2 > 0 && !st.ttx) {
        const two = r.sp >= 2;
        ex.push(
          two
            ? "O 2º estímulo gerou outro potencial de ação: chegou depois do período refratário (ou foi forte o bastante para o refratário relativo)."
            : st.d < 10
              ? "O 2º estímulo caiu no <b>período refratário absoluto</b>: os canais de Na⁺ ainda estão inativados e nenhum estímulo, por maior que seja, dispara outro potencial."
              : "O 2º estímulo caiu no <b>período refratário relativo</b>: só um estímulo mais forte que o normal dispararia. Aumente-o e veja.",
        );
      }
      $("#p-exp").innerHTML = ex.map((s) => `<p>${s}</p>`).join("");
    }
    ["i1", "i2", "d", "ko"].forEach((k) =>
      $("#p-" + k).addEventListener("input", (e) => {
        st[k] = +e.target.value;
        clearTimeout(st.h);
        st.h = later(draw, 120);
      }),
    );
    $("#p-ttx").onchange = (e) => {
      st.ttx = e.target.checked;
      draw();
    };
    $("#p-tea").onchange = (e) => {
      st.tea = e.target.checked;
      draw();
    };
    $("#p-go").onclick = draw;
    draw();
  }

  /* ---------- 2. Bomba Na⁺/K⁺ e SGLT ---------- */
  function mBomba(el) {
    const S2 = {
      step: 0,
      G: 0.9,
      atp: 0,
      glu: 0,
      acc: 0,
      ouab: false,
      run: true,
    };
    const STEPS = [
      "3 Na⁺ do citosol se ligam à bomba, aberta para dentro.",
      "O ATP fosforila a bomba (por isso é do tipo P).",
      "A fosforilação muda a forma: a bomba abre para fora e solta os 3 Na⁺.",
      "2 K⁺ de fora se ligam.",
      "O fosfato sai e a bomba volta a abrir para dentro.",
      "Os 2 K⁺ são soltos no citosol. Recomeça o ciclo.",
    ];
    const naPos = [
      [
        [92, 236],
        [112, 236],
        [132, 236],
      ],
      [
        [100, 190],
        [112, 178],
        [124, 190],
      ],
      [
        [96, 60],
        [116, 48],
        [136, 60],
      ],
      [
        [96, 60],
        [116, 48],
        [136, 60],
      ],
      [
        [96, 60],
        [116, 48],
        [136, 60],
      ],
      [
        [96, 60],
        [116, 48],
        [136, 60],
      ],
    ];
    const kPos = [
      [
        [90, 40],
        [134, 40],
      ],
      [
        [90, 40],
        [134, 40],
      ],
      [
        [90, 40],
        [134, 40],
      ],
      [
        [104, 120],
        [124, 140],
      ],
      [
        [104, 190],
        [124, 190],
      ],
      [
        [96, 262],
        [132, 262],
      ],
    ];
    el.innerHTML = `<div class="lab-grid lab-rev"><div class="card stack" style="gap:8px">
   <svg viewBox="0 0 420 300" width="100%" role="img" aria-label="Animação da bomba de sódio e potássio e do transportador SGLT">
    <text class="ax" x="8" y="18">EXTRACELULAR · muito Na⁺</text><text class="ax" x="8" y="292">CITOSOL · pouco Na⁺, muito K⁺</text>
    <rect x="0" y="110" width="420" height="60" fill="var(--hema-soft)"/><line x1="0" x2="420" y1="110" y2="110" stroke="var(--line)"/><line x1="0" x2="420" y1="170" y2="170" stroke="var(--line)"/>
    <rect id="b-pump" x="80" y="96" width="64" height="88" rx="18" fill="var(--surface)" stroke="var(--hema)" stroke-width="2.5" class="morph"/>
    <text class="ax" x="112" y="206" text-anchor="middle" font-weight="600">Na⁺/K⁺-ATPase</text>
    <text id="b-p" x="148" y="150" font-weight="700" fill="var(--warn)" opacity="0" class="morph">P</text>
    <rect x="300" y="100" width="54" height="80" rx="14" fill="var(--surface)" stroke="var(--eosin)" stroke-width="2.5"/><text class="ax" x="327" y="206" text-anchor="middle" font-weight="600">SGLT1</text>
    <g id="b-ions">${[0, 1, 2].map((i) => `<g class="ion" id="na${i}"><circle r="8" fill="var(--eosin)"/><text y="3" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">Na</text></g>`).join("")}${[0, 1].map((i) => `<g class="ion" id="k${i}"><circle r="8" fill="var(--hema)"/><text y="3" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">K</text></g>`).join("")}</g>
    <g id="b-glu"></g></svg></div>
   <div class="card stack" style="gap:12px"><p class="eyebrow">Passo do ciclo</p><p id="b-step" style="font-weight:600;min-height:3em"></p>
    <div id="b-met" class="stack" style="gap:10px"></div>
    ${tog("b-ou", "Adicionar ouabaína (inibe a bomba)")}
    <div class="row"><button class="btn" id="b-pause">Pausar</button><button class="btn" id="b-next">Passo a passo →</button><button class="btn" id="b-reset">Recomeçar</button></div></div></div>
   <div class="card prose"><p>A bomba gasta 1 ATP para tirar 3 Na⁺ e pôr 2 K⁺: sai uma carga positiva a mais por ciclo (é <b>eletrogênica</b>). O gradiente de Na⁺ que ela cria é a energia do <b>SGLT1</b>, que traz glicose junto com Na⁺ (ativo secundário). Ligue a ouabaína e observe: a bomba para, o gradiente se desfaz devagar e a glicose para de entrar, embora o SGLT1 nunca use ATP.</p></div>`;
    const place = (g, [x, y]) => {
      g.style.transform = `translate(${x}px,${y}px)`;
    };
    function show() {
      const s = S2.step;
      [0, 1, 2].forEach((i) => place($("#na" + i), naPos[s][i]));
      [0, 1].forEach((i) => place($("#k" + i), kPos[s][i]));
      $("#b-p").setAttribute("opacity", s >= 1 && s <= 3 ? 1 : 0);
      const out = s >= 2 && s <= 3;
      $("#b-pump").setAttribute("y", out ? 84 : 96);
      $("#b-pump").setAttribute("rx", out ? 6 : 18);
      $("#b-step").textContent = S2.ouab
        ? "Ouabaína ligada: a bomba está travada."
        : STEPS[s];
      $("#b-met").innerHTML =
        meter("Gradiente de Na⁺", S2.G) +
        meter("Entrada de glicose pelo SGLT1", S2.G) +
        `<p class="muted" style="font-variant-numeric:tabular-nums">ATP gastos: ${S2.atp} · glicoses absorvidas: ${S2.glu}</p>`;
    }
    function glucose() {
      if (REDUCED) return;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = `<polygon points="0,-8 7,-4 7,4 0,8 -7,4 -7,-4" fill="var(--warn)"/><circle cx="14" r="5" fill="var(--eosin)"/>`;
      g.setAttribute("class", "ion");
      g.style.transform = "translate(320px,40px)";
      $("#b-glu").appendChild(g);
      frame(() =>
        frame(() => {
          g.style.transform = "translate(320px,262px)";
        }),
      );
      later(() => g.remove(), 1300);
    }
    function tick(manual) {
      if (!S2.ouab) {
        S2.step = (S2.step + 1) % 6;
        if (S2.step === 1) S2.atp++;
        if (S2.step === 2) S2.G = Math.min(1, S2.G + 0.06);
      }
      S2.G = Math.max(0, S2.G * (S2.ouab ? 0.93 : 0.985));
      S2.acc += S2.G * 0.7;
      while (S2.acc >= 1) {
        S2.acc--;
        S2.glu++;
        glucose();
      }
      show();
    }
    every(
      () => {
        if (S2.run) tick();
      },
      REDUCED ? 1400 : 900,
    );
    $("#b-ou").onchange = (e) => {
      S2.ouab = e.target.checked;
      show();
    };
    $("#b-pause").onclick = (e) => {
      S2.run = !S2.run;
      e.target.textContent = S2.run ? "Pausar" : "Continuar";
    };
    $("#b-next").onclick = () => {
      S2.run = false;
      $("#b-pause").textContent = "Continuar";
      tick(true);
    };
    $("#b-reset").onclick = () => {
      Object.assign(S2, { step: 0, G: 0.9, atp: 0, glu: 0, acc: 0 });
      show();
    };
    show();
  }

  /* ---------- 3. Operon lac ---------- */
  function mLac(el) {
    const st = { lac: false, glc: true, gen: "wt", hide: false, rev: false };
    const GEN = {
      wt: "Selvagem",
      Im: "lacI⁻ (sem repressor funcional)",
      Oc: "lacOᶜ (operador que não liga o repressor)",
      Is: "lacIˢ (repressor não reconhece a alolactose)",
      cm: "crp⁻ (sem CAP)",
    };
    el.innerHTML = `<div class="card stack" style="gap:12px"><div class="row" style="gap:16px">${tog("l-lac", "Lactose no meio", st.lac)}${tog("l-glc", "Glicose no meio", st.glc)}
   <label class="mini">Genótipo <select id="l-gen">${Object.entries(GEN)
     .map(([k, v]) => `<option value="${k}">${v}</option>`)
     .join(
       "",
     )}</select></label>${tog("l-hide", "Modo previsão (esconder o resultado)")}</div>
   <svg viewBox="0 0 640 210" width="100%" role="img" aria-label="Operon lac">
    <line x1="10" x2="630" y1="130" y2="130" stroke="var(--muted)" stroke-width="3"/>
    <rect x="20" y="118" width="70" height="24" rx="4" fill="var(--sunk)" stroke="var(--line)"/><text class="ax" x="55" y="134" text-anchor="middle">lacI</text>
    <rect x="120" y="118" width="40" height="24" rx="4" fill="var(--ok-soft)" stroke="var(--ok)"/><text class="ax" x="140" y="134" text-anchor="middle">CAP</text>
    <rect x="160" y="118" width="50" height="24" rx="4" fill="var(--hema-soft)" stroke="var(--hema)"/><text class="ax" x="185" y="134" text-anchor="middle">P</text>
    <rect x="210" y="118" width="40" height="24" rx="4" fill="var(--eosin-soft)" stroke="var(--eosin)"/><text class="ax" x="230" y="134" text-anchor="middle">O</text>
    ${[
      ["lacZ", 250, 380],
      ["lacY", 380, 500],
      ["lacA", 500, 620],
    ]
      .map(
        ([n, a, b]) =>
          `<rect x="${a}" y="118" width="${b - a}" height="24" rx="4" fill="var(--surface)" stroke="var(--line)"/><text class="ax" x="${(a + b) / 2}" y="134" text-anchor="middle">${n}</text>`,
      )
      .join("")}
    <g id="l-rep" class="ion"><rect x="-24" y="-18" width="48" height="30" rx="8" fill="var(--eosin)"/><text y="2" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">repressor</text><g id="l-allo"><circle cx="20" cy="-18" r="7" fill="var(--warn)"/></g></g>
    <g id="l-cap" class="ion"><ellipse rx="22" ry="14" fill="var(--ok)"/><text y="4" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">CAP·cAMP</text></g>
    <g id="l-pol"><ellipse cx="0" cy="0" rx="26" ry="18" fill="var(--hema)" opacity=".9"/><text y="4" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">RNA pol</text></g>
    <path id="l-mrna" d="M250 170 Q 300 160 350 175 T 450 170 T 560 175" fill="none" stroke="var(--eosin)" stroke-width="3" stroke-dasharray="6 5" opacity="0"/>
    <text class="ax" x="252" y="196" id="l-mlab" opacity="0">mRNA policistrônico (Z, Y, A)</text>
   </svg>
   <div id="l-out"></div></div>
   <div class="card prose" id="l-exp"></div>`;
    function upd() {
      const g = st.gen,
        repBound =
          g === "Im" || g === "Oc" ? false : g === "Is" ? true : !st.lac,
        cap = g === "cm" ? false : !st.glc;
      const lvl = repBound ? 0 : cap ? 1 : 0.12,
        hid = st.hide && !st.rev;
      const rep = $("#l-rep");
      rep.style.transform =
        g === "Im"
          ? "translate(55px,40px)"
          : repBound
            ? "translate(230px,104px)"
            : "translate(300px,40px)";
      rep.style.opacity = g === "Im" ? 0.25 : 1;
      $("#l-allo").style.opacity = st.lac && g !== "Is" && g !== "Im" ? 1 : 0;
      const c = $("#l-cap");
      c.style.transform = cap
        ? "translate(140px,104px)"
        : "translate(110px,40px)";
      c.style.opacity = g === "cm" ? 0.15 : cap ? 1 : 0.35;
      const pol = $("#l-pol");
      pol.classList.remove("polrun");
      pol.style.transform = "translate(185px,104px)";
      if (!hid && lvl > 0 && !REDUCED) {
        pol.style.setProperty("--dur", (lvl > 0.5 ? 2.2 : 6) + "s");
        void pol.getBBox();
        pol.classList.add("polrun");
      }
      $("#l-mrna").setAttribute("opacity", hid ? 0 : lvl);
      $("#l-mlab").setAttribute("opacity", hid || !lvl ? 0 : 1);
      const word = lvl === 1 ? "ALTA" : lvl > 0 ? "BAIXA (basal)" : "DESLIGADA";
      $("#l-out").innerHTML = hid
        ? `<div class="row"><p><b>Preveja:</b> o repressor está no operador? O CAP está ligado? A transcrição fica alta, baixa ou desligada?</p><button class="btn primary" id="l-rev">Mostrar resultado</button></div>`
        : `<div class="stack" style="gap:8px">${meter("Transcrição de lacZ, lacY, lacA", lvl)}<p><b>Transcrição ${word}.</b> Repressor ${repBound ? "ligado ao operador" : "fora do operador"}; CAP ${cap ? "ligado (glicose baixa → cAMP alto)" : "não ligado"}.</p></div>`;
      const r = $("#l-rev");
      if (r)
        r.onclick = () => {
          st.rev = true;
          upd();
        };
      const why = {
        wt: "Selvagem: a lactose (como alolactose) solta o repressor; a falta de glicose sobe o cAMP e liga o CAP. Máximo só com lactose e sem glicose.",
        Im: "lacI⁻: sem repressor funcional, o operon é <b>constitutivo</b> — transcreve com ou sem lactose. O CAP continua dependendo da glicose. Num merodiploide com um lacI⁺, o repressor normal age em trans e corrige.",
        Oc: "lacOᶜ: o repressor não reconhece o operador, então o operon é <b>constitutivo</b>. Age só em cis: num merodiploide, só os genes ligados a esse operador ficam sempre ligados.",
        Is: "lacIˢ: o super-repressor não liga a alolactose e fica sempre no operador: o operon nunca é induzido. É dominante em trans sobre o lacI⁺.",
        cm: "crp⁻: sem CAP não há ativação forte; mesmo com lactose e sem glicose a transcrição fica baixa.",
      }[g];
      $("#l-exp").innerHTML = hid
        ? "<p>Monte o cenário, faça a previsão e só então revele.</p>"
        : `<p>${why}</p>`;
    }
    $("#l-lac").onchange = (e) => {
      st.lac = e.target.checked;
      st.rev = false;
      upd();
    };
    $("#l-glc").onchange = (e) => {
      st.glc = e.target.checked;
      st.rev = false;
      upd();
    };
    $("#l-gen").onchange = (e) => {
      st.gen = e.target.value;
      st.rev = false;
      upd();
    };
    $("#l-hide").onchange = (e) => {
      st.hide = e.target.checked;
      st.rev = false;
      upd();
    };
    upd();
  }

  /* ---------- 4. Do gene à proteína: mutações ---------- */
  const CODE =
    "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
  const AA3 = {
    F: "Phe",
    L: "Leu",
    S: "Ser",
    Y: "Tyr",
    "*": "Stop",
    C: "Cys",
    W: "Trp",
    P: "Pro",
    H: "His",
    Q: "Gln",
    R: "Arg",
    I: "Ile",
    M: "Met",
    T: "Thr",
    N: "Asn",
    K: "Lys",
    V: "Val",
    A: "Ala",
    D: "Asp",
    E: "Glu",
    G: "Gly",
  };
  const cod = (c) => {
    const b = "TCAG";
    return CODE[16 * b.indexOf(c[0]) + 4 * b.indexOf(c[1]) + b.indexOf(c[2])];
  };
  function translate(seq) {
    const p = [];
    for (let i = 0; i + 3 <= seq.length; i += 3) {
      const a = cod(seq.slice(i, i + 3));
      p.push(a);
      if (a === "*") break;
    }
    return p;
  }
  function mGene(el) {
    const WT = "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTT";
    const st = { s: WT.split(""), mode: "troca", pos: -1 };
    const PRE = {
      hbs: [
        "Anemia falciforme",
        (s) => {
          s[19] = "T";
        },
      ],
      sil: [
        "Silenciosa",
        (s) => {
          s[8] = "C";
        },
      ],
      non: [
        "Nonsense",
        (s) => {
          s[24] = "T";
        },
      ],
      fs: [
        "Frameshift",
        (s) => {
          s.splice(10, 1);
        },
      ],
    };
    const comp = { A: "T", T: "A", C: "G", G: "C" };
    el.innerHTML = `<div class="card stack" style="gap:12px">
   <p class="muted">Início do gene da β-globina (HBB). Clique numa base da fita codificante para mudá-la, inserir ou apagar, e veja o efeito no mRNA e na proteína.</p>
   <div class="row" style="gap:6px"><span class="eyebrow">Ação ao clicar:</span>${[
     ["troca", "Trocar base"],
     ["ins", "Inserir base antes"],
     ["del", "Apagar base"],
   ]
     .map(
       ([k, l]) =>
         `<button class="chip" data-gm="${k}" aria-pressed="${k === st.mode}">${l}</button>`,
     )
     .join("")}</div>
   <div class="row" style="gap:6px"><span class="eyebrow">Exemplos:</span>${Object.entries(
     PRE,
   )
     .map(([k, [l]]) => `<button class="chip" data-gp="${k}">${l}</button>`)
     .join("")}<button class="chip" data-gp="wt">Normal</button></div>
   <div class="scroll"><div id="g-seq" class="seqbox"></div></div>
   <div class="row"><button class="btn primary" id="g-tr">Traduzir com animação</button></div>
   <div id="g-res"></div></div>
   <div class="card prose"><p>Leia de cima para baixo: a <b>fita molde</b> (3'→5') é lida pela RNA polimerase; o <b>mRNA</b> sai igual à fita codificante, com U no lugar de T; o ribossomo lê de 3 em 3 bases a partir do AUG. Por convenção, a numeração da hemoglobina não conta a Met inicial: o códon 7 (GAG) corresponde ao Glu6, e GAG→GTG dá a HbS (Glu6Val).</p></div>`;
    function cells(prot, hi) {
      const s = st.s,
        n = Math.ceil(s.length / 3);
      let h = "";
      const row = (lab, f) =>
        `<div class="seqrow"><span class="eyebrow seqlab">${lab}</span>${Array.from({ length: n }, (_, c) => `<span class="codon${c === hi ? " cur" : ""}">${f(c)}</span>`).join("")}</div>`;
      h += row("Codificante 5'→3'", (c) =>
        s
          .slice(c * 3, c * 3 + 3)
          .map(
            (b, j) =>
              `<button class="base" data-bi="${c * 3 + j}">${b}</button>`,
          )
          .join(""),
      );
      h += row("Molde 3'→5'", (c) =>
        s
          .slice(c * 3, c * 3 + 3)
          .map((b) => `<span class="base mute">${comp[b]}</span>`)
          .join(""),
      );
      h += row("mRNA 5'→3'", (c) =>
        s
          .slice(c * 3, c * 3 + 3)
          .map((b) => `<span class="base rna">${b === "T" ? "U" : b}</span>`)
          .join(""),
      );
      h += row("Proteína", (c) =>
        prot[c] !== undefined
          ? `<span class="aa${prot[c] === "*" ? " stop" : ""}">${AA3[prot[c]]}</span>`
          : `<span class="aa mute">${prot.includes("*") ? "—" : ""}</span>`,
      );
      return h;
    }
    function classify() {
      const a = translate(WT),
        b = translate(st.s.join("")),
        d = st.s.length - WT.length;
      if (d % 3 !== 0)
        return [
          "Frameshift",
          `A ${d > 0 ? "inserção" : "deleção"} de ${Math.abs(d)} base(s) muda o quadro de leitura: todos os códons depois dela mudam${b.includes("*") ? ", e logo aparece um stop prematuro" : ""}.`,
        ];
      if (d !== 0)
        return [
          "Inserção ou deleção em fase",
          `${Math.abs(d) / 3} códon(s) a ${d > 0 ? "mais" : "menos"}, sem mudar o quadro de leitura.`,
        ];
      const i = b.findIndex((x, k) => x !== a[k]);
      if (i === 0)
        return [
          "Perda do códon de início",
          "O AUG virou outro códon. O ribossomo não começa aqui: a tradução não acontece ou começa num AUG mais adiante, em geral fora de fase.",
        ];
      if (i < 0)
        return st.s.join("") === WT
          ? [
              "Sequência normal",
              "Sem mutação: Met-Val-His-Leu-Thr-Pro-Glu-Glu-Lys-Ser-Ala-Val…",
            ]
          : [
              "Silenciosa",
              "A base mudou, mas o códon novo codifica o mesmo aminoácido: o código é degenerado (em geral a 3ª base).",
            ];
      if (b[i] === "*")
        return [
          "Nonsense",
          `O códon ${i + 1} virou stop (${AA3[a[i]]}→Stop): a proteína termina antes. Um stop tão precoce costuma levar o mRNA à degradação por NMD.`,
        ];
      return [
        "Missense",
        `Códon ${i + 1}: ${AA3[a[i]]}→${AA3[b[i]]}.${i === 6 && b[i] === "V" ? " É a mutação da anemia falciforme: a valina hidrofóbica faz a HbS polimerizar sem oxigênio." : ""}`,
      ];
    }
    function show(hi = -1, partial = null) {
      const prot = partial || translate(st.s.join(""));
      $("#g-seq").innerHTML = cells(prot, hi);
      if (!partial) {
        const [t, x] = classify();
        $("#g-res").innerHTML =
          `<div class="fb ${t === "Sequência normal" || t === "Silenciosa" ? "ok" : "no"}"><p><b>${t}.</b></p><p>${x}</p></div>`;
      }
    }
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-bi]");
      if (b) {
        const i = +b.dataset.bi,
          N = "ACGT";
        if (st.mode === "troca") st.s[i] = N[(N.indexOf(st.s[i]) + 1) % 4];
        else if (st.mode === "ins") st.s.splice(i, 0, "A");
        else if (st.s.length > 4) st.s.splice(i, 1);
        show();
        return;
      }
      const m = e.target.closest("[data-gm]");
      if (m) {
        st.mode = m.dataset.gm;
        el.querySelectorAll("[data-gm]").forEach((x) =>
          x.setAttribute("aria-pressed", x === m),
        );
        return;
      }
      const p = e.target.closest("[data-gp]");
      if (p) {
        st.s = WT.split("");
        if (PRE[p.dataset.gp]) PRE[p.dataset.gp][1](st.s);
        show();
        return;
      }
    });
    $("#g-tr").onclick = () => {
      labStop();
      const prot = translate(st.s.join(""));
      if (REDUCED) {
        show();
        return;
      }
      let k = 0;
      const step = () => {
        show(k, prot.slice(0, k + 1));
        k++;
        if (k < prot.length) later(step, 320);
        else later(() => show(), 500);
      };
      step();
    };
    show();
  }

  /* ---------- 5. Punnett e probabilidades ---------- */
  function mPunnett(el) {
    const PAT = {
      AR: "Autossômica recessiva",
      AD: "Autossômica dominante",
      XR: "Ligada ao X recessiva",
      XD: "Ligada ao X dominante",
      MT: "Mitocondrial",
    };
    const OPT = {
      AR: { m: ["AA", "Aa", "aa"], p: ["AA", "Aa", "aa"] },
      AD: { m: ["AA", "Aa", "aa"], p: ["AA", "Aa", "aa"] },
      XR: { m: ["XX", "XX*", "X*X*"], p: ["XY", "X*Y"] },
      XD: { m: ["XX", "XX*", "X*X*"], p: ["XY", "X*Y"] },
      MT: { m: ["sadia", "afetada"], p: ["sadio", "afetado"] },
    };
    const st = { pat: "AR", m: "Aa", p: "Aa" };
    el.innerHTML = `<div class="lab-grid"><div class="card stack" style="gap:12px">
   <label class="mini">Padrão <select id="u-pat">${Object.entries(PAT)
     .map(([k, v]) => `<option value="${k}">${v}</option>`)
     .join("")}</select></label>
   <label class="mini">Mãe <select id="u-m"></select></label><label class="mini">Pai <select id="u-p"></select></label>
   <p class="muted" id="u-leg" style="font-size:.9rem"></p></div>
   <div class="card stack" style="gap:10px"><div id="u-grid"></div><div id="u-sum"></div></div></div>
   <div class="card prose" id="u-exp"></div>`;
    const al = (g) => g.match(/X\*|X|Y|A|a/g);
    function status(gt) {
      const P = st.pat;
      if (P === "AR")
        return gt === "aa" ? "af" : gt.includes("a") ? "po" : "no";
      if (P === "AD") return gt.includes("A") ? "af" : "no";
      const male = gt.includes("Y"),
        mut = (gt.match(/X\*/g) || []).length;
      if (P === "XR")
        return male
          ? mut
            ? "af"
            : "no"
          : mut === 2
            ? "af"
            : mut
              ? "po"
              : "no";
      return mut ? "af" : "no";
    }
    function opts() {
      const o = OPT[st.pat];
      if (!o.m.includes(st.m)) st.m = o.m[1] || o.m[0];
      if (!o.p.includes(st.p)) st.p = o.p[0];
      $("#u-m").innerHTML = o.m
        .map((x) => `<option${x === st.m ? " selected" : ""}>${x}</option>`)
        .join("");
      $("#u-p").innerHTML = o.p
        .map((x) => `<option${x === st.p ? " selected" : ""}>${x}</option>`)
        .join("");
    }
    function upd() {
      $("#u-leg").textContent = {
        AR: "a = alelo mutado (recessivo).",
        AD: "A = alelo mutado (dominante).",
        XR: "X* = X com o alelo mutado.",
        XD: "X* = X com o alelo mutado (dominante).",
        MT: "As mitocôndrias vêm só do óvulo.",
      }[st.pat];
      if (st.pat === "MT") {
        const af = st.m === "afetada";
        $("#u-grid").innerHTML =
          `<p style="font-size:1.1rem"><b>${af ? "Todos os filhos, de ambos os sexos, herdam as mitocôndrias mutadas" : "Nenhum filho herda a doença"}</b>${st.p === "afetado" && !af ? ", mesmo com o pai afetado: o espermatozoide não passa mitocôndrias ao zigoto." : "."}</p>`;
        $("#u-sum").innerHTML = meter("Risco por filho", af ? 1 : 0);
        $("#u-exp").innerHTML =
          `<p>Na prática, a gravidade varia por causa da <b>heteroplasmia</b>: cada filho recebe uma proporção diferente de mitocôndrias mutadas.</p>`;
        return;
      }
      const gm = al(st.m),
        gp = al(st.p);
      const cells = [];
      $("#u-grid").innerHTML =
        `<table class="punnett"><tr><th></th>${gp.map((g) => `<th>${g} <small>pai</small></th>`).join("")}</tr>${gm
          .map(
            (a, i) =>
              `<tr><th>${a} <small>mãe</small></th>${gp
                .map((b, j) => {
                  let gt = [a, b];
                  if (st.pat[0] !== "X")
                    gt.sort((x, y) => (x === "A" ? -1 : y === "A" ? 1 : 0));
                  const s = gt.join("");
                  const k = status(s);
                  cells.push({ s, k, male: s.includes("Y") });
                  return `<td class="pc ${k}" style="animation-delay:${(i * 2 + j) * 120}ms">${s}<small>${{ af: "afetado", po: "portador", no: "sadio" }[k]}</small></td>`;
                })
                .join("")}</tr>`,
          )
          .join("")}</table>`;
      const fr = (f) => {
          const n = cells.filter(f).length;
          return n;
        },
        tot = cells.length;
      const pct = (n, d) =>
        d ? `${n}/${d} = ${Math.round((n / d) * 100)}%` : "—";
      let sum = `<p>Risco de filho afetado: <b>${pct(
        fr((c) => c.k === "af"),
        tot,
      )}</b></p>`;
      if (st.pat[0] === "X") {
        const M = cells.filter((c) => c.male),
          F = cells.filter((c) => !c.male);
        sum += `<p>Entre os meninos: <b>${pct(M.filter((c) => c.k === "af").length, M.length)}</b> afetados · entre as meninas: <b>${pct(F.filter((c) => c.k === "af").length, F.length)}</b> afetadas${st.pat === "XR" ? `, ${pct(F.filter((c) => c.k === "po").length, F.length)} portadoras` : ""}</p>`;
      }
      if (st.pat === "AR") {
        const sad = cells.filter((c) => c.k !== "af");
        sum += `<p>Portadores: ${pct(
          fr((c) => c.k === "po"),
          tot,
        )}. <b>Se o filho é sadio</b>, a chance de ser portador é ${pct(sad.filter((c) => c.k === "po").length, sad.length)}.</p>`;
      }
      $("#u-sum").innerHTML = sum;
      $("#u-exp").innerHTML =
        `<p>Cada quadrado vale 1/4. Para duas condições ao mesmo tempo (por exemplo, «menino <i>e</i> afetado» numa doença autossômica), multiplique: risco × 1/2. Para dois filhos afetados, multiplique o risco por ele mesmo.</p>`;
    }
    $("#u-pat").onchange = (e) => {
      st.pat = e.target.value;
      opts();
      upd();
    };
    $("#u-m").onchange = (e) => {
      st.m = e.target.value;
      upd();
    };
    $("#u-p").onchange = (e) => {
      st.p = e.target.value;
      upd();
    };
    opts();
    upd();
  }

  /* ---------- 6. Heredogramas: desafio ---------- */
  const PEDS = [
    {
      ans: "AR",
      ppl: [
        ["a", 0, 1.5, "m", 0],
        ["b", 0, 2.5, "f", 0],
        ["c", 1, 0, "m", 0],
        ["d", 1, 1.33, "f", 1],
        ["e", 1, 2.66, "m", 0],
        ["f", 1, 4, "f", 0],
      ],
      cp: [["a", "b", ["c", "d", "e", "f"]]],
      ex: "Pais sadios com uma filha afetada: a doença é recessiva. E, como o pai é sadio, não pode ser ligada ao X recessiva (a filha afetada precisaria de um X* do pai). Logo, autossômica recessiva.",
    },
    {
      ans: "AD",
      ppl: [
        ["a", 0, 2, "m", 1],
        ["b", 0, 3, "f", 0],
        ["c", 1, 1, "m", 1],
        ["d", 1, 3, "f", 0],
        ["e", 1, 4, "m", 1],
        ["s", 1, 0, "f", 0],
        ["g", 2, 0, "m", 1],
        ["h", 2, 1, "f", 1],
      ],
      cp: [
        ["a", "b", ["c", "d", "e"]],
        ["s", "c", ["g", "h"]],
      ],
      ex: "Aparece em todas as gerações, em homens e mulheres, e passa de pai para filho homem (II-1 → III-1). A transmissão pai → filho exclui herança ligada ao X. Autossômica dominante.",
    },
    {
      ans: "XR",
      ppl: [
        ["a", 0, 1, "m", 0],
        ["b", 0, 2, "f", 0, 1],
        ["c", 1, 0, "m", 1],
        ["d", 1, 1, "f", 0],
        ["e", 1, 2, "m", 0],
        ["f", 1, 3, "f", 0, 1],
        ["g", 1, 4, "m", 0],
        ["h", 2, 3, "m", 1],
        ["i", 2, 4, "f", 0],
      ],
      cp: [
        ["a", "b", ["c", "d", "e", "f"]],
        ["f", "g", ["h", "i"]],
      ],
      ex: "Só homens afetados, e a doença passa por mulheres sadias (portadoras, com ponto). Nunca de pai para filho. Ligada ao X recessiva.",
    },
    {
      ans: "MT",
      ppl: [
        ["a", 0, 1.5, "m", 0],
        ["b", 0, 2.5, "f", 1],
        ["c", 1, 0, "m", 1],
        ["s", 1, 1, "f", 0],
        ["d", 1, 2.5, "f", 1],
        ["t", 1, 3.5, "m", 0],
        ["e", 1, 4.5, "m", 1],
        ["g", 2, 0, "f", 0],
        ["h", 2, 1, "m", 0],
        ["i", 2, 2.5, "m", 1],
        ["j", 2, 3.5, "f", 1],
      ],
      cp: [
        ["a", "b", ["c", "d", "e"]],
        ["c", "s", ["g", "h"]],
        ["t", "d", ["i", "j"]],
      ],
      ex: "A mãe afetada transmite a todos os filhos, de ambos os sexos; o homem afetado (II-1) não transmite a nenhum. Herança mitocondrial.",
    },
    {
      ans: "XD",
      ppl: [
        ["a", 0, 1.5, "m", 1],
        ["b", 0, 2.5, "f", 0],
        ["c", 1, 0, "f", 1],
        ["d", 1, 1.33, "m", 0],
        ["e", 1, 2.66, "f", 1],
        ["f", 1, 4, "m", 0],
      ],
      cp: [["a", "b", ["c", "d", "e", "f"]]],
      ex: "Pai afetado: todas as filhas afetadas e nenhum filho. Ele passa o X a todas as filhas e o Y a todos os filhos. Ligada ao X dominante.",
    },
    {
      ans: "AR",
      ppl: [
        ["a", 0, 1, "m", 0],
        ["b", 0, 2, "f", 0],
        ["x", 0, 3, "m", 0],
        ["y", 0, 4, "f", 0],
        ["c", 1, 1.5, "m", 0],
        ["d", 1, 3.5, "f", 0],
        ["e", 2, 2, "f", 1],
        ["f", 2, 3, "m", 0],
      ],
      cp: [
        ["a", "b", ["c"]],
        ["x", "y", ["d"]],
        ["c", "d", ["e", "f"]],
      ],
      cons: ["c", "d"],
      ex: "Pais sadios e consanguíneos (linha dupla: primos) com uma filha afetada. A consanguinidade aumenta a chance de os dois carregarem o mesmo alelo raro. Autossômica recessiva.",
    },
  ];
  function pedSVG(P) {
    const pos = {};
    P.ppl.forEach(
      ([id, g, x, s, a, c]) =>
        (pos[id] = { x: 40 + x * 80, y: 34 + g * 92, s, a, c }),
    );
    let h = "";
    const W = 40 + 5 * 80;
    P.cp.forEach(([m, f, kids]) => {
      const A = pos[m],
        B = pos[f],
        my = A.y,
        mx = (A.x + B.x) / 2;
      const dbl = P.cons && P.cons.includes(m) && P.cons.includes(f);
      h +=
        `<line x1="${A.x}" x2="${B.x}" y1="${my}" y2="${my}" stroke="var(--ink)" stroke-width="1.6"/>` +
        (dbl
          ? `<line x1="${A.x}" x2="${B.x}" y1="${my + 5}" y2="${my + 5}" stroke="var(--ink)" stroke-width="1.6"/>`
          : "");
      const ky = my + 46,
        xs = kids.map((k) => pos[k].x);
      h += `<line x1="${mx}" x2="${mx}" y1="${my}" y2="${ky}" stroke="var(--ink)" stroke-width="1.6"/><line x1="${Math.min(mx, ...xs)}" x2="${Math.max(mx, ...xs)}" y1="${ky}" y2="${ky}" stroke="var(--ink)" stroke-width="1.6"/>`;
      kids.forEach(
        (k) =>
          (h += `<line x1="${pos[k].x}" x2="${pos[k].x}" y1="${ky}" y2="${pos[k].y - 13}" stroke="var(--ink)" stroke-width="1.6"/>`),
      );
    });
    const roman = ["I", "II", "III"];
    [0, 1, 2].forEach((g) => {
      if (P.ppl.some((p) => p[1] === g))
        h += `<text class="ax" x="6" y="${38 + g * 92}" font-weight="600">${roman[g]}</text>`;
    });
    Object.values(pos).forEach((p) => {
      const f = p.a ? "var(--eosin)" : "var(--surface)";
      h +=
        p.s === "m"
          ? `<rect x="${p.x - 13}" y="${p.y - 13}" width="26" height="26" fill="${f}" stroke="var(--ink)" stroke-width="1.8"/>`
          : `<circle cx="${p.x}" cy="${p.y}" r="13.5" fill="${f}" stroke="var(--ink)" stroke-width="1.8"/>`;
      if (p.c)
        h += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--ink)"/>`;
    });
    return `<svg viewBox="0 0 ${W + 20} 230" width="100%" style="max-width:520px" role="img" aria-label="Heredograma">${h}</svg>`;
  }
  function mHeredo(el) {
    const st = { i: 0, pick: null, ok: 0, n: 0 };
    const NAMES = {
      AD: "Autossômica dominante",
      AR: "Autossômica recessiva",
      XR: "Ligada ao X recessiva",
      XD: "Ligada ao X dominante",
      MT: "Mitocondrial",
      Y: "Ligada ao Y",
    };
    function show() {
      const P = PEDS[st.i];
      el.innerHTML = `<div class="card stack" style="gap:12px"><div class="row" style="justify-content:space-between"><span class="u-tag">Heredograma ${st.i + 1} de ${PEDS.length}</span><span class="muted" style="font-variant-numeric:tabular-nums">Acertos: ${st.ok}/${st.n}</span></div>
   <div class="ped">${pedSVG(P)}</div><p class="muted" style="font-size:.88rem">Rosa = afetado · ponto = portadora · linha dupla = consanguinidade</p>
   <p style="font-weight:600">Qual é o padrão de herança mais provável?</p>
   <div class="opts">${Object.entries(NAMES)
     .map(
       ([k, v]) =>
         `<button class="opt${st.pick === null ? "" : k === P.ans ? " right" : k === st.pick ? " wrong" : ""}" data-hp="${k}" ${st.pick !== null ? "disabled" : ""}><span>${v}</span></button>`,
     )
     .join("")}</div>
   ${st.pick !== null ? `<div class="fb ${st.pick === P.ans ? "ok" : "no"}"><p><b>${st.pick === P.ans ? "Correto." : "Não: é " + NAMES[P.ans] + "."}</b></p><p>${P.ex}</p></div><div class="row"><button class="btn primary" id="h-next">Próximo heredograma →</button></div>` : ""}</div>
   <div class="card prose"><p><b>Roteiro:</b> 1) pais sadios com filho afetado → recessiva; 2) pai → filho homem afetado → exclui X; 3) só homens, via mães sadias → X recessiva; 4) pai afetado → todas as filhas → X dominante; 5) só a mãe transmite, a todos → mitocondrial.</p></div>`;
      el.querySelectorAll("[data-hp]").forEach(
        (b) =>
          (b.onclick = () => {
            st.pick = b.dataset.hp;
            st.n++;
            if (st.pick === P.ans) st.ok++;
            show();
          }),
      );
      const nx = $("#h-next");
      if (nx)
        nx.onclick = () => {
          st.i = (st.i + 1) % PEDS.length;
          st.pick = null;
          show();
        };
    }
    show();
  }

  /* ---------- 7. Ponto de restrição e câncer ---------- */
  function mCiclo(el) {
    const st = {
      gf: true,
      dano: false,
      ras: false,
      rb: false,
      p53: false,
      hpv: false,
    };
    const N = {
      gf: [80, 40, "Fator de crescimento"],
      ras: [80, 110, "RTK → Ras → MAPK"],
      cd: [80, 180, "Ciclina D-CDK4/6"],
      rb: [270, 180, "Rb fosforilado"],
      e2f: [460, 180, "E2F livre"],
      ce: [620, 260, "Ciclina E-CDK2"],
      s: [620, 330, "FASE S"],
      dano: [270, 40, "Dano ao DNA"],
      p53: [270, 110, "p53"],
      p21: [620, 110, "p21"],
      ap: [460, 40, "Reparo / apoptose"],
    };
    const E = [
      ["gf", "ras", 1],
      ["ras", "cd", 1],
      ["cd", "rb", 1],
      ["rb", "e2f", 1],
      ["e2f", "ce", 1],
      ["ce", "s", 1],
      ["dano", "p53", 1],
      ["p53", "p21", 1],
      ["p21", "ce", 0],
      ["p53", "ap", 1],
    ];
    el.innerHTML = `<div class="lab-grid"><div class="card stack" style="gap:8px">
   ${tog("c-gf", "Fator de crescimento presente", st.gf)}${tog("c-dano", "Dano ao DNA (radiação)")}<p class="eyebrow" style="margin-top:6px">Mutações</p>
   ${tog("c-ras", "Ras mutada (G12, sempre ativa)")}${tog("c-rb", "Perda dos dois alelos de RB1")}${tog("c-p53", "p53 mutado")}${tog("c-hpv", "Infecção por HPV (E6 + E7)")}
   <button class="btn" id="c-quiz">Desafio: preveja um cenário</button></div>
   <div class="card"><svg id="c-svg" viewBox="0 0 700 360" width="100%" role="img" aria-label="Rede de controle do ponto de restrição"></svg></div></div>
   <div id="c-out"></div>`;
    function calc(s) {
      const ras = s.gf || s.ras,
        p53 = s.dano && !s.p53 && !s.hpv,
        p21 = p53,
        rbi = s.rb || s.hpv || ras,
        e2f = rbi,
        ce = e2f && !p21;
      return {
        gf: s.gf,
        ras,
        cd: ras,
        rb: rbi,
        e2f,
        ce,
        s: ce,
        dano: s.dano,
        p53,
        p21,
        ap: p53,
      };
    }
    function verdict(s, a) {
      if (a.s && s.dano)
        return [
          "no",
          "Entra em S com o DNA danificado: as mutações passam às células-filhas. É a instabilidade genômica do câncer." +
            (s.hpv
              ? " A E6 destruiu o p53, então ninguém freou o ciclo."
              : s.p53
                ? " O p53 mutado não induz p21."
                : ""),
        ];
      if (a.s && !s.gf)
        return [
          "no",
          "Prolifera sem fator de crescimento: comportamento tumoral. " +
            (s.ras
              ? "A Ras travada em GTP manda o sinal sozinha."
              : s.rb
                ? "Sem Rb, o E2F fica livre o tempo todo."
                : "A E7 sequestra o Rb e libera o E2F."),
        ];
      if (a.s)
        return [
          "ok",
          "Ciclo normal: o fator de crescimento induz a ciclina D, a CDK4/6 fosforila o Rb, o E2F fica livre e a célula passa o ponto R.",
        ];
      if (a.p21)
        return [
          "ok",
          "Parada em G1: p53 → p21 bloqueia a ciclina E-CDK2 e dá tempo ao reparo. Se o dano não for consertado, o p53 leva à apoptose.",
        ];
      return [
        "ok",
        "Sem sinal mitogênico: o Rb hipofosforilado segura o E2F e a célula fica em G0/G1.",
      ];
    }
    function draw() {
      const a = calc(st);
      let h = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--eosin)"/></marker><marker id="bl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M5 0V10" stroke="var(--bad)" stroke-width="3"/></marker></defs>`;
      E.forEach(([f, t, act]) => {
        const A = N[f],
          B = N[t],
          on = a[f];
        const dx = B[0] - A[0],
          dy = B[1] - A[1],
          L = Math.hypot(dx, dy),
          ox = dx / L,
          oy = dy / L,
          pad = Math.abs(ox) > 0.5 ? 78 : 20;
        h += `<line x1="${A[0] + ox * pad}" y1="${A[1] + oy * 20}" x2="${B[0] - ox * pad}" y2="${B[1] - oy * 22}" stroke="${!act ? "var(--bad)" : on ? "var(--eosin)" : "var(--line)"}" stroke-width="${on ? 3 : 2}" class="${on && act ? "flow" : ""}" marker-end="url(#${act ? (on ? "ar2" : "ar") : "bl"})" ${!act && !on ? 'opacity=".3"' : ""}/>`;
      });
      Object.entries(N).forEach(([k, [x, y, l]]) => {
        const on = a[k];
        h += `<g class="node${on ? " on" : ""}"><rect x="${x - 78}" y="${y - 18}" width="156" height="36" rx="8"/><text x="${x}" y="${y + 5}" text-anchor="middle">${l}</text></g>`;
      });
      $("#c-svg").innerHTML = h;
      const [k, t] = verdict(st, a);
      $("#c-out").innerHTML =
        `<div class="card"><div class="fb ${k}"><p><b>${a.s ? "A célula entra em S." : "A célula não entra em S."}</b></p><p>${t}</p></div></div>`;
    }
    Object.keys(st).forEach((k) => {
      $("#c-" + k).onchange = (e) => {
        st[k] = e.target.checked;
        draw();
      };
    });
    $("#c-quiz").onclick = () => {
      const keys = ["dano", "ras", "rb", "p53", "hpv"];
      Object.keys(st).forEach((k) => (st[k] = false));
      st.gf = Math.random() < 0.5;
      keys.forEach((k) => {
        if (Math.random() < 0.3) st[k] = true;
      });
      Object.keys(st).forEach((k) => ($("#c-" + k).checked = st[k]));
      const a = calc(st);
      $("#c-svg").innerHTML =
        `<text x="350" y="180" text-anchor="middle" class="ax" font-size="14">Cenário sorteado nas caixas ao lado. A célula entra em S?</text>`;
      $("#c-out").innerHTML =
        `<div class="card row"><button class="btn primary" id="cq-s">Entra em S</button><button class="btn" id="cq-n">Não entra</button></div>`;
      const ans = (g) => {
        draw();
        $("#c-out").insertAdjacentHTML(
          "afterbegin",
          `<div class="card"><div class="fb ${g === a.s ? "ok" : "no"}"><p><b>${g === a.s ? "Previsão correta." : "Previsão errada."}</b></p></div></div>`,
        );
      };
      $("#cq-s").onclick = () => ans(true);
      $("#cq-n").onclick = () => ans(false);
    };
    draw();
  }

  /* ---------- 8. Cascatas de sinalização ---------- */
  function mSinal(el) {
    const PW = {
      gs: {
        n: "GPCR · Gs → cAMP",
        nodes: [
          "Ligante (adrenalina)",
          "Receptor acoplado à proteína G (7 TM)",
          "Gαs troca GDP por GTP",
          "Adenilil ciclase",
          "cAMP",
          "PKA (solta as subunidades catalíticas)",
          "Resposta: glicogenólise, CREB",
        ],
        pert: {
          col: [
            2,
            "Toxina colérica: a Gαs não hidrolisa o GTP e fica sempre ativa.",
          ],
          pde: [
            4,
            "Inibidor de fosfodiesterase (cafeína): o cAMP não é degradado e o sinal se prolonga.",
          ],
        },
      },
      gq: {
        n: "GPCR · Gq → IP₃ + DAG",
        nodes: [
          "Ligante (acetilcolina muscarínica M1/M3)",
          "Receptor acoplado à proteína G",
          "Gαq troca GDP por GTP",
          "Fosfolipase C-β corta o PIP₂",
          "IP₃ + DAG",
          "IP₃ libera Ca²⁺ do RE; DAG + Ca²⁺ ativam PKC",
          "Resposta: contração, secreção",
        ],
        pert: {
          plc: [
            -3,
            "Inibidor da fosfolipase C: daqui em diante nada acontece, mesmo com ligante.",
          ],
        },
      },
      rtk: {
        n: "RTK → Ras → MAPK",
        nodes: [
          "Fator de crescimento (EGF)",
          "RTK dimeriza e se autofosforila em tirosinas",
          "Grb2 (SH2) traz SOS (GEF)",
          "Ras-GTP",
          "Raf → MEK → ERK",
          "ERK no núcleo: Myc, Fos",
          "Ciclina D → proliferação",
        ],
        pert: {
          ras: [
            3,
            "Ras G12: perdeu a atividade GTPase e fica sempre ligada ao GTP (oncogene).",
          ],
          tki: [
            -1,
            "Inibidor de tirosina-quinase: o receptor não se autofosforila.",
          ],
        },
      },
    };
    const st = { pw: "gs", lig: false, pert: null, on: [] };
    function frame() {
      const P = PW[st.pw];
      el.innerHTML = `<div class="card stack" style="gap:12px"><div class="row" style="gap:6px">${Object.entries(
        PW,
      )
        .map(
          ([k, v]) =>
            `<button class="chip" data-pw="${k}" aria-pressed="${k === st.pw}">${v.n}</button>`,
        )
        .join("")}</div>
   <div class="row" style="gap:6px"><span class="eyebrow">Perturbação:</span><button class="chip" data-pt="" aria-pressed="${!st.pert}">Nenhuma</button>${Object.entries(
     P.pert,
   )
     .map(
       ([k, [, l]]) =>
         `<button class="chip" data-pt="${k}" aria-pressed="${st.pert === k}">${l.split(":")[0]}</button>`,
     )
     .join("")}</div>
   <div class="row"><button class="btn primary" id="s-add">Adicionar ligante</button><button class="btn" id="s-rem">Remover ligante</button></div>
   <ol class="casc" id="s-casc">${P.nodes.map((n, i) => `<li class="cn" id="cn${i}"><span class="tnum">${i + 1}</span><span>${n}</span></li>`).join("")}</ol>
   <div id="s-exp" class="fb ok" style="background:var(--sunk);color:var(--ink)"></div></div>`;
      el.querySelectorAll("[data-pw]").forEach(
        (b) =>
          (b.onclick = () => {
            labStop();
            Object.assign(st, {
              pw: b.dataset.pw,
              lig: false,
              pert: null,
              on: [],
            });
            frame();
          }),
      );
      el.querySelectorAll("[data-pt]").forEach(
        (b) =>
          (b.onclick = () => {
            labStop();
            st.pert = b.dataset.pt || null;
            st.lig = false;
            st.on = [];
            frame();
            settle();
          }),
      );
      $("#s-add").onclick = () => {
        st.lig = true;
        settle();
      };
      $("#s-rem").onclick = () => {
        st.lig = false;
        settle();
      };
      paint();
      exp();
    }
    function target() {
      const P = PW[st.pw],
        n = P.nodes.length,
        pt = st.pert ? P.pert[st.pert][0] : null;
      return Array.from({ length: n }, (_, i) => {
        if (pt !== null && pt < 0 && i >= -pt) return false;
        if (st.lig) return true;
        if (pt !== null && pt >= 0 && i >= pt) return true;
        return false;
      });
    }
    function paint() {
      st.on.forEach((v, i) => {
        const e = $("#cn" + i);
        if (e) e.classList.toggle("on", !!v);
      });
    }
    function settle() {
      labStop();
      const T = target();
      const n = T.length;
      st.on = st.on.length ? st.on : Array(n).fill(false);
      const order = st.lig ? [...Array(n).keys()] : [...Array(n).keys()];
      let k = 0;
      const go1 = () => {
        if (k >= n) {
          exp();
          return;
        }
        st.on[k] = T[k];
        paint();
        k++;
        later(go1, REDUCED ? 0 : 280);
      };
      go1();
    }
    function exp() {
      const P = PW[st.pw],
        T = target(),
        pt = st.pert ? P.pert[st.pert] : null;
      let t;
      if (!pt)
        t = st.lig
          ? "Com ligante, cada etapa ativa a seguinte e o sinal é amplificado. Remova o ligante: a Gα hidrolisa o GTP (ou uma GAP desliga a Ras) e tudo apaga."
          : "Sem ligante, a via está em repouso.";
      else
        t =
          pt[1] +
          (pt[0] >= 0
            ? st.lig
              ? " Agora remova o ligante e veja o que continua aceso."
              : " Mesmo sem ligante, a via continua ativa a partir dessa etapa."
            : "");
      $("#s-exp").innerHTML = `<p>${t}</p>`;
    }
    frame();
  }

  /* ---------- 9. Cadeia respiratória ---------- */
  function mCadeia(el) {
    const st = { cn: false, oli: false, unc: false, rot: false };
    el.innerHTML = `<div class="lab-grid"><div class="card stack" style="gap:8px"><p class="eyebrow">Adicione um inibidor</p>
   ${tog("r-rot", "Rotenona (bloqueia o complexo I)")}${tog("r-cn", "Cianeto (bloqueia o complexo IV)")}${tog("r-oli", "Oligomicina (bloqueia a ATP sintase)")}${tog("r-unc", "Desacoplador (DNP, termogenina)")}
   <div id="r-met" class="stack" style="gap:10px;margin-top:8px"></div></div>
   <div class="card"><svg id="r-svg" viewBox="0 0 600 300" width="100%" role="img" aria-label="Cadeia transportadora de elétrons"></svg></div></div>
   <div class="card prose" id="r-exp"></div>`;
    function draw() {
      const s = st;
      const fN = !s.cn && !s.rot ? 1 : 0,
        fF = !s.cn ? 1 : 0,
        back = s.oli && !s.unc ? 0.1 : 1;
      const flowN = fN * back,
        flowF = fF * back;
      const o2 = s.cn ? 0 : (s.unc ? 1.5 : 1) * (s.rot ? 0.4 : 1) * back;
      const grad = s.cn ? 0.05 : s.unc ? 0.15 : s.oli ? 1 : s.rot ? 0.45 : 0.7;
      const atp = s.cn || s.oli ? 0 : s.unc ? 0.05 : s.rot ? 0.4 : 1;
      const heat = s.unc ? 1 : 0.15;
      const pumps = [
        [90, s.cn ? 0 : flowN],
        [300, s.cn ? 0 : (flowN + flowF) / 2],
        [420, s.cn ? 0 : (flowN + flowF) / 2],
      ];
      let h = `<text class="ax" x="8" y="18">ESPAÇO INTERMEMBRANAS · H⁺ acumulado</text><text class="ax" x="8" y="292">MATRIZ</text>
     <rect x="0" y="120" width="600" height="60" fill="var(--hema-soft)"/>
     ${[
       ["I", 90],
       ["II", 190],
       ["III", 300],
       ["IV", 420],
     ]
       .map(
         ([l, x]) =>
           `<rect x="${x - 32}" y="104" width="64" height="92" rx="10" fill="var(--surface)" stroke="var(--hema)" stroke-width="2.2"/><text x="${x}" y="156" text-anchor="middle" font-weight="700" fill="var(--hema)">${l}</text>`,
       )
       .join("")}
     <rect x="510" y="96" width="64" height="108" rx="10" fill="var(--surface)" stroke="var(--eosin)" stroke-width="2.2"/><text x="542" y="150" text-anchor="middle" font-weight="700" font-size="11" fill="var(--eosin)">ATP</text><text x="542" y="164" text-anchor="middle" font-weight="700" font-size="11" fill="var(--eosin)">sintase</text>
     <circle cx="245" cy="160" r="12" fill="var(--warn)"/><text x="245" y="164" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">Q</text>
     <circle cx="360" cy="96" r="12" fill="var(--warn)"/><text x="360" y="100" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">c</text>
     <text class="ax" x="90" y="232" text-anchor="middle">NADH → NAD⁺</text><text class="ax" x="190" y="232" text-anchor="middle">FADH₂</text><text class="ax" x="420" y="232" text-anchor="middle">½O₂ → H₂O</text><text class="ax" x="542" y="236" text-anchor="middle">ADP + Pi → ATP</text>
     <path id="pN" d="M90 215 L90 160 L245 160 L300 160 L300 110 L360 96 L420 110 L420 215" fill="none" stroke="var(--line)" stroke-dasharray="3 4"/>
     <path id="pF" d="M190 215 L190 160 L245 160 L300 160 L300 110 L360 96 L420 110 L420 215" fill="none"/>`;
      if (s.rot)
        h += `<text x="90" y="92" text-anchor="middle" font-size="22" fill="var(--bad)" font-weight="700">✕</text>`;
      if (s.cn)
        h += `<text x="420" y="92" text-anchor="middle" font-size="22" fill="var(--bad)" font-weight="700">✕</text>`;
      if (s.oli)
        h += `<text x="542" y="88" text-anchor="middle" font-size="22" fill="var(--bad)" font-weight="700">✕</text>`;
      if (s.unc)
        h += `<path d="M470 40 L470 260" stroke="var(--warn)" stroke-width="3" stroke-dasharray="4 4"/><text class="ax" x="470" y="276" text-anchor="middle" fill="var(--warn)">H⁺ vaza (calor)</text>`;
      if (!REDUCED) {
        [
          ["pN", flowN],
          ["pF", flowF],
        ].forEach(([p, f]) => {
          if (f > 0)
            for (let i = 0; i < 3; i++)
              h += `<circle r="5" fill="var(--eosin)"><animateMotion dur="${(2.4 / f).toFixed(1)}s" begin="${(i * 0.8) / f}s" repeatCount="indefinite"><mpath href="#${p}"/></animateMotion></circle>`;
        });
        pumps.forEach(([x, f]) => {
          if (f > 0.05)
            h += `<text x="${x}" font-size="13" font-weight="700" fill="var(--hema)" text-anchor="middle">H⁺<animate attributeName="y" values="110;40" dur="${(1.6 / f).toFixed(1)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${(1.6 / f).toFixed(1)}s" repeatCount="indefinite"/></text>`;
        });
        if (atp > 0.02)
          h += `<text x="542" font-size="13" font-weight="700" fill="var(--eosin)" text-anchor="middle">H⁺<animate attributeName="y" values="40;110" dur="${(1.4 / atp).toFixed(1)}s" repeatCount="indefinite"/></text>`;
      }
      $("#r-svg").innerHTML = h;
      $("#r-met").innerHTML =
        meter("Consumo de O₂", o2, 1.5) +
        meter("Gradiente de H⁺", grad) +
        meter("Síntese de ATP", atp) +
        meter("Produção de calor", heat);
      const ex = [];
      if (!s.cn && !s.oli && !s.unc && !s.rot)
        ex.push(
          "Normal: os elétrons do NADH (complexo I) e do FADH₂ (complexo II) passam pela ubiquinona, complexo III, citocromo c e complexo IV, que os entrega ao O₂. I, III e IV bombeiam H⁺; o H⁺ volta pela ATP sintase e gera ATP.",
        );
      if (s.rot)
        ex.push(
          "Rotenona: o NADH não entrega elétrons. Só o FADH₂, pelo complexo II, mantém um fluxo menor — e o complexo II não bombeia H⁺.",
        );
      if (s.cn)
        ex.push(
          "Cianeto: o complexo IV não passa elétrons ao O₂. A cadeia inteira para, o consumo de O₂ cai a zero e o ATP mitocondrial também. A célula depende da glicólise e produz lactato.",
        );
      if (s.oli && !s.unc)
        ex.push(
          "Oligomicina: o H⁺ não volta pela ATP sintase, o gradiente fica no máximo e freia as bombas. Por isso o consumo de O₂ também cai: transporte de elétrons e síntese de ATP estão <b>acoplados</b>.",
        );
      if (s.unc)
        ex.push(
          "Desacoplador: o H⁺ volta pela membrana sem passar pela ATP sintase. O gradiente cai, a cadeia acelera (mais O₂ consumido) mas quase não se faz ATP: a energia vira calor. É o papel da termogenina (UCP1) na gordura marrom." +
            (s.oli
              ? " Com o desacoplador, a oligomicina já não freia a cadeia."
              : ""),
        );
      $("#r-exp").innerHTML = ex.map((x) => `<p>${x}</p>`).join("");
    }
    ["cn", "oli", "unc", "rot"].forEach(
      (k) =>
        ($("#r-" + k).onchange = (e) => {
          st[k] = e.target.checked;
          draw();
        }),
    );
    draw();
  }

  /* ---------- 10. Meiose e não-disjunção ---------- */
  function mMeiose(el) {
    const st = { nd: "no", s: 0 };
    const ST = [
      "Célula 2n em G1: um par de homólogos (materno e paterno) do cromossomo 21.",
      "Fase S: cada homólogo vira duas cromátides irmãs.",
      "Prófase I: os homólogos pareiam e fazem crossing-over (trocas entre cromátides não irmãs).",
      "Anáfase I: separam-se os HOMÓLOGOS.",
      "Anáfase II: separam-se as CROMÁTIDES IRMÃS.",
      "Gametas e fecundação com um gameta normal.",
    ];
    const M = "var(--eosin)",
      P = "var(--hema)";
    const chrom = (x, y, cols, dup) =>
      dup
        ? `<g><rect x="${x - 9}" y="${y - 30}" width="8" height="60" rx="4" fill="${cols[0][0]}"/><rect x="${x - 9}" y="${y + 6}" width="8" height="24" rx="4" fill="${cols[0][1]}"/><rect x="${x + 1}" y="${y - 30}" width="8" height="60" rx="4" fill="${cols[1][0]}"/><rect x="${x + 1}" y="${y + 6}" width="8" height="24" rx="4" fill="${cols[1][1]}"/><circle cx="${x}" cy="${y - 6}" r="4" fill="var(--ink)"/></g>`
        : `<g><rect x="${x - 4}" y="${y - 30}" width="8" height="60" rx="4" fill="${cols[0]}"/><rect x="${x - 4}" y="${y + 6}" width="8" height="24" rx="4" fill="${cols[1]}"/><circle cx="${x}" cy="${y - 6}" r="4" fill="var(--ink)"/></g>`;
    const cell = (cx, cy, r, inner, lab) =>
      `<g class="fadein"><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>${inner}${lab ? `<text class="ax" x="${cx}" y="${cy + r + 16}" text-anchor="middle" font-weight="600">${lab}</text>` : ""}</g>`;
    const mat = [
        [M, M],
        [M, P],
      ],
      pat = [
        [P, P],
        [P, M],
      ];
    function scene() {
      const s = st.s,
        nd = st.nd;
      let h = "";
      if (s === 0)
        h = cell(
          300,
          130,
          80,
          chrom(275, 130, [M, M]) + chrom(325, 130, [P, P]),
          "2n",
        );
      if (s === 1)
        h = cell(
          300,
          130,
          80,
          chrom(
            270,
            130,
            [
              [M, M],
              [M, M],
            ],
            1,
          ) +
            chrom(
              330,
              130,
              [
                [P, P],
                [P, P],
              ],
              1,
            ),
          "2n, cromátides duplicadas",
        );
      if (s === 2)
        h = cell(
          300,
          130,
          80,
          chrom(285, 130, mat, 1) +
            chrom(315, 130, pat, 1) +
            `<text class="ax" x="300" y="70" text-anchor="middle" fill="var(--warn)">quiasma</text>`,
          "bivalente",
        );
      if (s === 3) {
        const L =
            nd === "mi"
              ? chrom(140, 130, mat, 1) + chrom(170, 130, pat, 1)
              : chrom(155, 130, mat, 1),
          R = nd === "mi" ? "" : chrom(445, 130, pat, 1);
        h =
          cell(
            155,
            130,
            70,
            L,
            nd === "mi" ? "não-disjunção: os dois homólogos" : "n",
          ) + cell(445, 130, 70, R, nd === "mi" ? "nenhum cromossomo 21" : "n");
      }
      if (s >= 4) {
        const G =
          nd === "mi"
            ? [
                [
                  [M, M],
                  [P, P],
                ],
                [
                  [M, P],
                  [P, M],
                ],
                [],
                [],
              ]
            : nd === "mii"
              ? [
                  [
                    [M, M],
                    [M, P],
                  ],
                  [],
                  [[P, P]],
                  [[P, M]],
                ]
              : [[[M, M]], [[M, P]], [[P, P]], [[P, M]]];
        G.forEach((cs, i) => {
          const cx = 80 + i * 147;
          const n = cs.length;
          const lab =
            s === 5
              ? n === 2
                ? "trissomia 21"
                : n === 0
                  ? "monossomia 21"
                  : "normal"
              : n === 2
                ? "n+1"
                : n === 0
                  ? "n−1"
                  : "n";
          h += cell(
            cx,
            130,
            56,
            cs
              .map((c, j) => chrom(cx + (j - (n - 1) / 2) * 20, 130, c))
              .join("") +
              (s === 5
                ? `<text class="ax" x="${cx}" y="200" text-anchor="middle">+ gameta normal</text>`
                : ""),
            lab,
          );
        });
      }
      return h;
    }
    function show() {
      el.innerHTML = `<div class="card stack" style="gap:12px"><div class="row" style="gap:6px"><span class="eyebrow">Não-disjunção:</span>${[
        ["no", "Nenhuma"],
        ["mi", "Na meiose I"],
        ["mii", "Na meiose II"],
      ]
        .map(
          ([k, l]) =>
            `<button class="chip" data-nd="${k}" aria-pressed="${st.nd === k}">${l}</button>`,
        )
        .join("")}</div>
   <svg viewBox="0 0 600 240" width="100%" role="img" aria-label="Meiose">${scene()}</svg>
   <p style="font-weight:600">${st.s + 1}/6 · ${ST[st.s]}</p>
   <div class="row" style="justify-content:space-between"><button class="btn" id="mz-p" ${st.s ? "" : "disabled"}>← Anterior</button><button class="btn primary" id="mz-n" ${st.s < 5 ? "" : "disabled"}>Próxima etapa →</button></div></div>
   <div class="card prose"><p>${st.nd === "mi" ? "Na meiose I os homólogos não se separam: <b>os quatro gametas são anormais</b> (2 com n+1, 2 com n−1), e os n+1 levam um 21 materno e um paterno." : st.nd === "mii" ? "Na meiose II as cromátides de uma das células não se separam: <b>2 gametas normais</b>, 1 n+1 (com duas cópias quase iguais) e 1 n−1." : "Sem erro, cada gameta recebe uma cópia do 21; o crossing-over faz cada cópia ser uma mistura do materno com o paterno."} A maioria das trissomias 21 vem de não-disjunção na meiose I materna, e o risco cresce com a idade da mãe.</p></div>`;
      el.querySelectorAll("[data-nd]").forEach(
        (b) =>
          (b.onclick = () => {
            st.nd = b.dataset.nd;
            show();
          }),
      );
      $("#mz-p").onclick = () => {
        st.s--;
        show();
      };
      $("#mz-n").onclick = () => {
        st.s++;
        show();
      };
    }
    show();
  }

  /* ---------- 11. Para onde vai a proteína? ---------- */
  function mEnder(el) {
    const CASES = [
      [
        ["Sequência-sinal N-terminal hidrofóbica"],
        "ext",
        "Entra no RE pela SRP e, sem outro sinal, segue a via padrão: Golgi → vesícula → secreção.",
      ],
      [
        ["Sequência-sinal N-terminal", "KDEL no C-terminal"],
        "re",
        "Entra no RE; se escapar para o Golgi, o receptor de KDEL a traz de volta em vesículas COPI.",
      ],
      [
        ["Sequência-sinal N-terminal", "Recebe manose-6-fosfato no cis-Golgi"],
        "lis",
        "A M6P é reconhecida pelo receptor no TGN, que a leva aos endossomos e ao lisossomo.",
      ],
      [
        ["NLS (rica em Lys e Arg)"],
        "nuc",
        "Feita no citosol, entra dobrada pelo poro nuclear com a importina.",
      ],
      [
        ["Pré-sequência N-terminal anfipática"],
        "mit",
        "Entra desdobrada pelos complexos TOM e TIM; a pré-sequência é cortada na matriz.",
      ],
      [
        ["PTS1 (Ser-Lys-Leu no C-terminal)"],
        "per",
        "Reconhecida pelas peroxinas, entra dobrada no peroxissomo.",
      ],
      [
        ["Nenhum sinal"],
        "cit",
        "Sem sinal, a proteína fica no citosol, onde foi feita.",
      ],
      [
        [
          "Sequência-sinal N-terminal",
          "Segmento hidrofóbico interno de parada",
        ],
        "mem",
        "O segmento de parada fica preso na membrana do RE e a proteína viaja nas vesículas até a membrana plasmática.",
      ],
    ];
    const D = {
      nuc: [180, 170, "Núcleo"],
      re: [270, 95, "RE"],
      gol: [370, 110, "Golgi"],
      lis: [440, 230, "Lisossomo"],
      mit: [300, 270, "Mitocôndria"],
      per: [180, 290, "Peroxissomo"],
      cit: [400, 300, "Citosol"],
      mem: [560, 180, "Membrana plasmática"],
      ext: [660, 90, "Exterior (secreção)"],
    };
    const PATH = {
      ext: ["re", "gol", "ext"],
      re: ["re", "gol", "re"],
      lis: ["re", "gol", "lis"],
      mem: ["re", "gol", "mem"],
      nuc: ["nuc"],
      mit: ["mit"],
      per: ["per"],
      cit: ["cit"],
    };
    const st = {
      i: Math.floor(Math.random() * CASES.length),
      pick: null,
      ok: 0,
      n: 0,
    };
    function show() {
      const [sig, ans, ex] = CASES[st.i];
      el.innerHTML = `<div class="card stack" style="gap:12px"><div class="row" style="justify-content:space-between"><span class="u-tag">Acertos: ${st.ok}/${st.n}</span></div>
    <div class="ask"><p class="eyebrow" style="color:var(--eosin)">A proteína tem</p><p style="font-weight:600;margin-top:4px">${sig.join(" + ")}</p></div><p>Clique no destino final na célula.</p>
    <svg viewBox="0 0 720 360" width="100%" role="img" aria-label="Célula com organelas clicáveis">
     <rect x="0" y="0" width="720" height="360" fill="transparent"/><text class="ax" x="640" y="40" text-anchor="middle">EXTERIOR</text>
     <ellipse cx="360" cy="190" rx="300" ry="160" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/>
     <g class="dest" data-d="ext"><rect x="610" y="60" width="100" height="56" rx="8" fill="var(--sunk)"/><text x="660" y="94" text-anchor="middle">Secreção</text></g>
     <g class="dest" data-d="mem"><path d="M612 120 Q 668 190 612 260" fill="none" stroke="var(--ink)" stroke-width="10" opacity=".25"/><text x="575" y="196" text-anchor="middle" font-size="12">Membrana</text></g>
     <g class="dest" data-d="nuc"><circle cx="180" cy="170" r="62" fill="var(--hema-soft)" stroke="var(--hema)" stroke-width="2"/><text x="180" y="175" text-anchor="middle">Núcleo</text></g>
     <g class="dest" data-d="re"><path d="M230 80 Q 300 60 320 110 Q 280 130 250 120" fill="var(--eosin-soft)" stroke="var(--eosin)" stroke-width="2"/><text x="285" y="100" text-anchor="middle" font-size="12">RE</text></g>
     <g class="dest" data-d="gol"><rect x="345" y="92" width="60" height="8" rx="4" fill="var(--warn)"/><rect x="340" y="106" width="70" height="8" rx="4" fill="var(--warn)"/><rect x="345" y="120" width="60" height="8" rx="4" fill="var(--warn)"/><text x="375" y="148" text-anchor="middle" font-size="12">Golgi</text></g>
     <g class="dest" data-d="lis"><circle cx="440" cy="230" r="26" fill="var(--bad-soft)" stroke="var(--bad)" stroke-width="2"/><text x="440" y="234" text-anchor="middle" font-size="11">Lisossomo</text></g>
     <g class="dest" data-d="mit"><ellipse cx="300" cy="270" rx="50" ry="24" fill="var(--ok-soft)" stroke="var(--ok)" stroke-width="2"/><text x="300" y="274" text-anchor="middle" font-size="11">Mitocôndria</text></g>
     <g class="dest" data-d="per"><circle cx="180" cy="290" r="20" fill="var(--sunk)" stroke="var(--muted)" stroke-width="2"/><text x="180" y="324" text-anchor="middle" font-size="11">Peroxissomo</text></g>
     <g class="dest" data-d="cit"><rect x="470" y="290" width="80" height="28" rx="6" fill="transparent" stroke="var(--line)" stroke-dasharray="4 3"/><text x="510" y="309" text-anchor="middle" font-size="12">Citosol</text></g>
     <g><circle cx="420" cy="170" r="9" fill="var(--hema)"/><circle cx="432" cy="170" r="6" fill="var(--hema)"/><text class="ax" x="426" y="156" text-anchor="middle">ribossomo</text></g>
     <circle id="e-prot" r="8" fill="var(--eosin)" stroke="#fff" stroke-width="2" class="ion" style="transform:translate(426px,180px)"/></svg>
    ${st.pick ? `<div class="fb ${st.pick === ans ? "ok" : "no"}"><p><b>${st.pick === ans ? "Correto" : "Não: o destino é " + D[ans][2]}.</b></p><p>${ex}</p></div><div class="row"><button class="btn primary" id="e-next">Outra proteína →</button></div>` : ""}</div>`;
      if (!st.pick)
        el.querySelectorAll(".dest").forEach(
          (g) =>
            (g.onclick = () => {
              st.pick = g.dataset.d;
              st.n++;
              if (st.pick === ans) st.ok++;
              show();
              travel(ans);
            }),
        );
      const nx = $("#e-next");
      if (nx)
        nx.onclick = () => {
          let j;
          do {
            j = Math.floor(Math.random() * CASES.length);
          } while (j === st.i);
          st.i = j;
          st.pick = null;
          show();
        };
    }
    function travel(ans) {
      const p = $("#e-prot");
      if (!p) return;
      let k = 0;
      const pts = PATH[ans];
      const step = () => {
        if (k >= pts.length) return;
        const [x, y] = D[pts[k]];
        p.style.transform = `translate(${x}px,${y}px)`;
        k++;
        later(step, REDUCED ? 0 : 750);
      };
      later(step, 60);
    }
    show();
  }

  const MODELS = [
    {
      id: "pot",
      u: 5,
      nome: "Potencial de ação",
      d: "Simulador de Hodgkin-Huxley: limiar, período refratário, tetrodotoxina e efeito do K⁺ externo.",
      ct: ["c5_2"],
      f: mPot,
    },
    {
      id: "bomba",
      u: 5,
      nome: "Bomba Na⁺/K⁺ e SGLT",
      d: "Animação do ciclo da bomba e do transporte ativo secundário; teste a ouabaína.",
      ct: ["c5_1"],
      f: mBomba,
    },
    {
      id: "cadeia",
      u: 5,
      nome: "Cadeia respiratória e inibidores",
      d: "Cianeto, rotenona, oligomicina e desacopladores: o que acontece com O₂, gradiente e ATP.",
      ct: ["c5_5", "c5_4"],
      f: mCadeia,
    },
    {
      id: "ender",
      u: 5,
      nome: "Para onde vai a proteína?",
      d: "Jogo de endereçamento: leia os sinais e clique no destino; a proteína faz o caminho.",
      ct: ["c5_8", "c5_9", "c5_10", "c5_3"],
      f: mEnder,
    },
    {
      id: "lac",
      u: 3,
      nome: "Operon lac",
      d: "Lactose, glicose e mutantes (lacI⁻, lacOᶜ, lacIˢ, crp⁻), com modo de previsão.",
      ct: ["c3_3", "c3_2"],
      f: mLac,
    },
    {
      id: "gene",
      u: 3,
      nome: "Do gene à proteína: mutações",
      d: "Edite o gene da β-globina e veja mutação silenciosa, missense (HbS), nonsense e frameshift.",
      ct: ["c3_6", "c4_1", "c3_5"],
      f: mGene,
    },
    {
      id: "punnett",
      u: 4,
      nome: "Quadro de Punnett",
      d: "Escolha o padrão de herança e os genótipos; o risco aparece por sexo, com o 2/3 dos sadios.",
      ct: ["c4_4", "c4_5"],
      f: mPunnett,
    },
    {
      id: "heredo",
      u: 4,
      nome: "Desafio de heredogramas",
      d: "Reconheça o padrão de herança em heredogramas desenhados, com a justificativa.",
      ct: ["c4_5"],
      f: mHeredo,
    },
    {
      id: "meiose",
      u: 7,
      nome: "Meiose e não-disjunção",
      d: "Acompanhe um par de homólogos pela meiose, com não-disjunção na meiose I ou II.",
      ct: ["c7_4", "c4_3"],
      f: mMeiose,
    },
    {
      id: "ciclo",
      u: 7,
      nome: "Ponto de restrição e câncer",
      d: "Rede Ras → ciclina D → Rb → E2F com p53 e p21; ligue mutações e HPV e preveja a fase S.",
      ct: ["c7_1", "c7_2"],
      f: mCiclo,
    },
    {
      id: "sinal",
      u: 6,
      nome: "Cascatas de sinalização",
      d: "Gs, Gq e RTK passo a passo, com toxina colérica, inibidores e Ras oncogênica.",
      ct: ["c6_3", "c6_4", "c6_2"],
      f: mSinal,
    },
  ];
  const MBY = Object.fromEntries(MODELS.map((m) => [m.id, m]));
  /* ---------- mini-quiz autocorrigido: [pergunta, alternativas (a 1ª é a correta), comentário] ---------- */
  function mq(el, items, title) {
    if (!items || !items.length) return;
    const box = document.createElement("div");
    box.className = "card stack";
    box.style.gap = "14px";
    box.innerHTML = `<div class="row" style="justify-content:space-between"><h3>${esc(title || "Teste o que viu")}</h3><span class="muted mq-score"></span></div>`;
    let ok = 0,
      done = 0;
    items.forEach(([q, opts, ex], n) => {
      const ord = shuffle(opts.map((_, i) => i)),
        d = document.createElement("div");
      d.className = "stack";
      d.style.gap = "8px";
      d.innerHTML = `<p style="font-weight:600">${n + 1}. ${esc(q)}</p><div class="opts">${ord.map((oi, k) => `<button class="opt" data-oi="${oi}"><b>${L5[k]}</b><span>${esc(opts[oi])}</span></button>`).join("")}</div><div class="mq-fb"></div>`;
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
            done++;
            if (oi === 0) ok++;
            d.querySelector(".mq-fb").innerHTML =
              `<div class="fb ${oi === 0 ? "ok" : "no"}"><p><b>${oi === 0 ? "Certo." : "Errado: a resposta é «" + esc(opts[0]) + "»."}</b></p><p>${esc(ex)}</p></div>`;
            box.querySelector(".mq-score").textContent = `${ok}/${done} certas`;
          }),
      );
      box.appendChild(d);
    });
    el.appendChild(box);
  }

  /* ---------- animação passo a passo ----------
   cfg.a = atores {id:{s:[forma], f, st, l, lc, fs, x, y, o, sc}}; formas: ["r",w,h,rx] ["c",r] ["e",rx,ry] ["p",d,largura]
   cfg.steps = [{cap, set:{id:{x,y,o,sc,f,l,lc}}}] — cada passo acumula sobre os anteriores; cfg.bg = SVG fixo; cfg.quiz = mini-quiz */
  function mkStepper(el, cfg) {
    const W = cfg.w || 640,
      H = cfg.h || 300,
      P = "sp" + (mkStepper.n = (mkStepper.n || 0) + 1) + "_",
      st = { k: 0, play: false };
    const shape = (a) => {
      const s = a.s,
        f = a.f || "var(--hema)",
        stk = a.st ? `stroke:${a.st};stroke-width:${a.sw || 2}` : "";
      if (s[0] === "r")
        return `<rect class="sh" x="${-s[1] / 2}" y="${-s[2] / 2}" width="${s[1]}" height="${s[2]}" rx="${s[3] ?? 6}" style="fill:${f};${stk}"/>`;
      if (s[0] === "c")
        return `<circle class="sh" r="${s[1]}" style="fill:${f};${stk}"/>`;
      if (s[0] === "e")
        return `<ellipse class="sh" rx="${s[1]}" ry="${s[2]}" style="fill:${f};${stk}"/>`;
      if (s[0] === "p")
        return `<path class="sh" d="${s[1]}" style="fill:${a.f || "none"};stroke:${a.st || "var(--hema)"};stroke-width:${s[2] || 3};stroke-linecap:round;stroke-linejoin:round"/>`;
      return "";
    };
    const state = (k) => {
      const S = {};
      Object.entries(cfg.a).forEach(
        ([id, a]) =>
          (S[id] = {
            x: a.x || 0,
            y: a.y || 0,
            o: a.o ?? 1,
            sc: a.sc ?? 1,
            f: a.f || "var(--hema)",
            l: a.l || "",
            lc: a.lc || "#fff",
          }),
      );
      for (let i = 0; i <= k; i++)
        Object.entries(cfg.steps[i].set || {}).forEach(([id, v]) =>
          Object.assign(S[id], v),
        );
      return S;
    };
    el.innerHTML = `<div class="card stack" style="gap:12px"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Animação passo a passo">${cfg.bg || ""}
    ${Object.entries(cfg.a)
      .map(
        ([id, a]) =>
          `<g id="${P + id}" class="act">${shape(a)}<text class="al" y="${a.ly ?? 4}" text-anchor="middle" style="font-size:${a.fs || 11}px"></text></g>`,
      )
      .join("")}</svg>
    <div class="cap" aria-live="polite"><span class="u-tag cap-n"></span><p class="cap-t"></p></div>
    <div class="row" style="justify-content:space-between"><button class="btn sp-prev">← Anterior</button><div class="dots">${cfg.steps.map((_, i) => `<button data-k="${i}" aria-label="Passo ${i + 1}"></button>`).join("")}</div><div class="row" style="gap:8px"><button class="btn sp-play">▶ Reproduzir</button><button class="btn primary sp-next">Próximo →</button></div></div></div>`;
    const show = () => {
      const S = state(st.k);
      Object.entries(S).forEach(([id, v]) => {
        const g = el.querySelector("#" + P + id);
        g.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.sc})`;
        g.style.opacity = v.o;
        const sh = g.querySelector(".sh");
        if (sh && cfg.a[id].s[0] !== "p") sh.style.fill = v.f;
        const t = g.querySelector(".al");
        t.textContent = v.l;
        t.style.fill = v.lc;
      });
      el.querySelector(".cap-n").textContent =
        `Passo ${st.k + 1} de ${cfg.steps.length}`;
      el.querySelector(".cap-t").textContent = cfg.steps[st.k].cap;
      el.querySelectorAll(".dots button").forEach((b, i) =>
        b.classList.toggle("on", i <= st.k),
      );
      el.querySelector(".sp-prev").disabled = st.k === 0;
      el.querySelector(".sp-next").disabled = st.k === cfg.steps.length - 1;
    };
    const stopPlay = () => {
      st.play = false;
      clearInterval(st.t);
      el.querySelector(".sp-play").textContent = "▶ Reproduzir";
    };
    el.querySelector(".sp-prev").onclick = () => {
      stopPlay();
      st.k--;
      show();
    };
    el.querySelector(".sp-next").onclick = () => {
      stopPlay();
      st.k++;
      show();
    };
    el.querySelectorAll(".dots button").forEach(
      (b) =>
        (b.onclick = () => {
          stopPlay();
          st.k = +b.dataset.k;
          show();
        }),
    );
    el.querySelector(".sp-play").onclick = () => {
      if (st.play) {
        stopPlay();
        return;
      }
      st.play = true;
      el.querySelector(".sp-play").textContent = "❚❚ Pausar";
      if (st.k === cfg.steps.length - 1) (st.k = 0), show();
      st.t = every(
        () => {
          if (st.k < cfg.steps.length - 1) {
            st.k++;
            show();
          } else stopPlay();
        },
        REDUCED ? 3000 : 2600,
      );
    };
    show();
    mq(el, cfg.quiz);
  }

  /* ---------- classificar: cada item vai para a categoria certa, com comentário ---------- */
  function mkSorter(el, cfg) {
    const st = {
      ord: shuffle(cfg.items.map((_, i) => i)),
      k: 0,
      ok: 0,
      res: [],
      ans: null,
    };
    function draw() {
      const n = st.ord.length,
        done = st.k >= n,
        it = done ? null : cfg.items[st.ord[st.k]];
      el.innerHTML = `<div class="card stack" style="gap:14px"><div class="row" style="justify-content:space-between"><p class="muted" style="max-width:60ch">${esc(cfg.intro)}</p><span class="u-tag">${st.ok}/${st.res.length} certas · ${Math.min(st.k + 1, n)} de ${n}</span></div>
    ${
      done
        ? `<div class="fb ${st.ok / n >= 0.7 ? "ok" : "no"}"><p><b>Fim: ${st.ok} de ${n} certas.</b></p><p>${st.ok === n ? "Perfeito." : "Veja no quadro abaixo os itens em vermelho e jogue de novo."}</p></div><div class="row"><button class="btn primary so-again">Jogar de novo</button></div>`
        : `<div class="so-item pop" aria-live="polite">${esc(it[0])}</div><div class="so-cats">${cfg.cats.map((c, i) => `<button class="btn so-cat${st.ans === null ? "" : i === it[1] ? " right" : i === st.ans ? " wrong" : ""}" data-ci="${i}" ${st.ans !== null ? "disabled" : ""}>${esc(c)}</button>`).join("")}</div>
      ${st.ans !== null ? `<div class="fb ${st.ans === it[1] ? "ok" : "no"}"><p><b>${st.ans === it[1] ? "Certo." : "É «" + esc(cfg.cats[it[1]]) + "»."}</b></p><p>${esc(it[2])}</p></div><div class="row"><button class="btn primary so-next">Próximo →</button></div>` : ""}`
    }</div>
    <div class="so-board">${cfg.cats
      .map(
        (c, i) =>
          `<div class="card so-col"><p class="eyebrow">${esc(c)}</p>${st.res
            .filter((r) => r.ci === i)
            .map(
              (r) => `<p class="so-chip ${r.ok ? "ok" : "no"}">${esc(r.t)}</p>`,
            )
            .join("")}</div>`,
      )
      .join("")}</div>`;
      el.querySelectorAll(".so-cat").forEach(
        (b) =>
          (b.onclick = () => {
            st.ans = +b.dataset.ci;
            const ok = st.ans === it[1];
            if (ok) st.ok++;
            st.res.push({ t: it[0], ci: it[1], ok });
            draw();
          }),
      );
      const nx = el.querySelector(".so-next");
      if (nx)
        nx.onclick = () => {
          st.k++;
          st.ans = null;
          draw();
        };
      const ag = el.querySelector(".so-again");
      if (ag)
        ag.onclick = () => {
          Object.assign(st, {
            ord: shuffle(cfg.items.map((_, i) => i)),
            k: 0,
            ok: 0,
            res: [],
            ans: null,
          });
          draw();
        };
    }
    draw();
  }

  /* ---------- animações (dados) ---------- */
  const lit = { f: "var(--eosin)", lc: "#fff" };
  const ANIMS = {
    rep: {
      h: 290,
      bg: `<path d="M20 135H300L340 70H620M20 165H300L340 230H620" fill="none" stroke="var(--ink)" stroke-width="3"/><text class="ax" x="20" y="120">DNA parental</text><text class="ax" x="470" y="58">fita contínua</text><text class="ax" x="470" y="262">fita descontínua</text>`,
      a: {
        topo: {
          s: ["r", 64, 24],
          l: "topo",
          x: 170,
          y: 150,
          o: 0,
          f: "var(--muted)",
        },
        hel: { s: ["e", 30, 20], l: "helicase", fs: 10, x: 305, y: 150, o: 0 },
        s1: { s: ["c", 5], f: "var(--warn)", x: 420, y: 62, o: 0 },
        s2: { s: ["c", 5], f: "var(--warn)", x: 520, y: 62, o: 0 },
        s3: { s: ["c", 5], f: "var(--warn)", x: 420, y: 238, o: 0 },
        s4: { s: ["c", 5], f: "var(--warn)", x: 520, y: 238, o: 0 },
        prA: { s: ["r", 16, 8, 2], f: "var(--eosin)", x: 604, y: 84, o: 0 },
        l1: { s: ["r", 78, 8, 2], x: 556, y: 84, o: 0 },
        l2: { s: ["r", 78, 8, 2], x: 478, y: 84, o: 0 },
        l3: { s: ["r", 78, 8, 2], x: 400, y: 84, o: 0 },
        polA: {
          s: ["e", 30, 16],
          l: "DNA pol",
          fs: 10,
          f: "var(--ok)",
          x: 590,
          y: 104,
          o: 0,
        },
        k3: { s: ["r", 64, 8, 2], x: 592, y: 216, o: 0 },
        k2: { s: ["r", 64, 8, 2], x: 510, y: 216, o: 0 },
        k1: { s: ["r", 64, 8, 2], x: 428, y: 216, o: 0 },
        p3: { s: ["r", 14, 8, 2], f: "var(--eosin)", x: 567, y: 216, o: 0 },
        p2: { s: ["r", 14, 8, 2], f: "var(--eosin)", x: 485, y: 216, o: 0 },
        p1: { s: ["r", 14, 8, 2], f: "var(--eosin)", x: 403, y: 216, o: 0 },
        polB: {
          s: ["e", 30, 16],
          l: "DNA pol",
          fs: 10,
          f: "var(--ok)",
          x: 470,
          y: 196,
          o: 0,
        },
        lig: {
          s: ["c", 16],
          l: "ligase",
          fs: 9,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 469,
          y: 196,
          o: 0,
        },
      },
      steps: [
        {
          cap: "O molde são as duas fitas parentais, antiparalelas. A replicação começa numa origem e abre uma forquilha.",
        },
        {
          cap: "A helicase separa as fitas rompendo as pontes de hidrogênio. À frente, a topoisomerase alivia o superenrolamento.",
          set: { hel: { o: 1 }, topo: { o: 1 } },
        },
        {
          cap: "Proteínas SSB (RPA nos eucariotos) seguram as fitas simples abertas.",
          set: { s1: { o: 1 }, s2: { o: 1 }, s3: { o: 1 }, s4: { o: 1 } },
        },
        {
          cap: "A primase faz um primer curto de RNA (rosa): a DNA polimerase não começa do zero.",
          set: { prA: { o: 1 }, p3: { o: 1 } },
        },
        {
          cap: "A DNA polimerase só alonga 5'→3'. Na fita contínua, ela acompanha a forquilha sem parar.",
          set: {
            polA: { o: 1, x: 380 },
            l1: { o: 1 },
            l2: { o: 1 },
            l3: { o: 1 },
          },
        },
        {
          cap: "Na fita descontínua, ela trabalha de trás para frente, em pedaços com primer próprio: os fragmentos de Okazaki.",
          set: {
            polB: { o: 1, x: 600 },
            k3: { o: 1 },
            p2: { o: 1 },
            k2: { o: 1 },
            p1: { o: 1 },
            k1: { o: 1 },
          },
        },
        {
          cap: "Os primers de RNA são trocados por DNA e a DNA ligase sela os cortes entre os fragmentos.",
          set: {
            prA: { o: 0 },
            p1: { o: 0 },
            p2: { o: 0 },
            p3: { o: 0 },
            polB: { o: 0 },
            lig: { o: 1 },
          },
        },
        {
          cap: "Resultado: duas duplas-hélices, cada uma com uma fita antiga e uma nova (replicação semiconservativa).",
          set: {
            lig: { o: 0 },
            hel: { x: 330 },
            s1: { o: 0 },
            s2: { o: 0 },
            s3: { o: 0 },
            s4: { o: 0 },
          },
        },
      ],
      quiz: [
        [
          "Por que existe uma fita descontínua?",
          [
            "Porque a polimerase só sintetiza 5'→3' e as fitas são antiparalelas",
            "Porque a helicase abre só uma fita",
            "Porque falta primase numa das fitas",
            "Porque a ligase só age numa fita",
          ],
          "A polimerase só anda num sentido. Na fita que corre ao contrário da forquilha, ela precisa recomeçar várias vezes.",
        ],
        [
          "Qual enzima sela os fragmentos de Okazaki?",
          ["DNA ligase", "Primase", "Helicase", "Topoisomerase"],
          "A ligase forma a última ligação fosfodiéster entre fragmentos vizinhos.",
        ],
      ],
    },
    imp: {
      h: 300,
      bg: `<circle cx="470" cy="150" r="125" fill="var(--hema-soft)" stroke="var(--hema)" stroke-width="6"/><rect x="335" y="128" width="22" height="44" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"/><text class="ax" x="30" y="30">CITOSOL · RanGAP</text><text class="ax" x="430" y="60">NÚCLEO · RanGEF</text><text class="ax" x="300" y="195">poro</text>`,
      a: {
        cargo: {
          s: ["r", 64, 26],
          l: "proteína+NLS",
          fs: 9,
          f: "var(--eosin)",
          x: 100,
          y: 210,
        },
        imp: { s: ["e", 34, 18], l: "importina", fs: 10, x: 100, y: 80 },
        ran: {
          s: ["c", 20],
          l: "Ran-GTP",
          fs: 9,
          f: "var(--ok)",
          x: 540,
          y: 230,
        },
      },
      steps: [
        {
          cap: "Uma proteína com NLS (sinal rico em Lys e Arg) acabou de ser feita no citosol.",
        },
        {
          cap: "A importina reconhece a NLS e se liga à proteína.",
          set: { imp: { x: 110, y: 180 } },
        },
        {
          cap: "O complexo atravessa o poro nuclear. A proteína passa já dobrada.",
          set: { imp: { x: 346, y: 136 }, cargo: { x: 346, y: 166 } },
        },
        {
          cap: "No núcleo, a Ran-GTP se liga à importina e a proteína é solta.",
          set: {
            imp: { x: 480, y: 140 },
            cargo: { x: 440, y: 215 },
            ran: { x: 520, y: 145 },
          },
        },
        {
          cap: "Importina e Ran-GTP voltam juntas ao citosol pelo poro.",
          set: { imp: { x: 250, y: 110 }, ran: { x: 285, y: 110 } },
        },
        {
          cap: "No citosol, a RanGAP faz a Ran hidrolisar o GTP. A Ran-GDP solta a importina, livre para outro ciclo.",
          set: {
            ran: { l: "Ran-GDP", f: "var(--muted)", x: 200, y: 250 },
            imp: { x: 100, y: 80 },
          },
        },
      ],
      quiz: [
        [
          "O que dá direção à importação nuclear?",
          [
            "O gradiente de Ran-GTP, alta no núcleo e baixa no citosol",
            "O ATP da bomba Na⁺/K⁺",
            "A SRP",
            "A clatrina",
          ],
          "A RanGEF fica presa à cromatina e a RanGAP no citosol: por isso há muita Ran-GTP dentro do núcleo.",
        ],
        [
          "Como a proteína passa pelo poro nuclear?",
          [
            "Dobrada",
            "Desdobrada, como na mitocôndria",
            "Dentro de uma vesícula",
            "Ainda sendo traduzida",
          ],
          "Diferente da mitocôndria e do RE, o núcleo importa proteínas já dobradas.",
        ],
      ],
    },
    mat: {
      h: 280,
      bg: `<text class="ax" x="20" y="30">5'</text><text class="ax" x="600" y="30">3'</text>`,
      a: {
        cap: {
          s: ["c", 13],
          l: "cap",
          fs: 9,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 52,
          y: 120,
          o: 0,
        },
        e1: { s: ["r", 90, 30], l: "éxon 1", x: 110, y: 120 },
        i1: {
          s: ["r", 80, 30],
          l: "íntron",
          lc: "#1a1a1a",
          f: "var(--line)",
          x: 195,
          y: 120,
        },
        e2: { s: ["r", 90, 30], l: "éxon 2", x: 280, y: 120 },
        i2: {
          s: ["r", 80, 30],
          l: "íntron",
          lc: "#1a1a1a",
          f: "var(--line)",
          x: 365,
          y: 120,
        },
        e3: { s: ["r", 90, 30], l: "éxon 3", x: 450, y: 120 },
        pa: {
          s: ["r", 70, 18],
          l: "AAAA…",
          fs: 10,
          f: "var(--eosin)",
          x: 370,
          y: 120,
          o: 0,
        },
        spl: {
          s: ["e", 54, 20],
          l: "spliceossomo",
          fs: 10,
          f: "var(--eosin)",
          x: 195,
          y: 62,
          o: 0,
        },
      },
      steps: [
        {
          cap: "O pré-mRNA recém-transcrito tem éxons (ficam) e íntrons (saem).",
        },
        {
          cap: "Na ponta 5' entra o cap, uma 7-metilguanosina: protege o RNA e ajuda a tradução a começar.",
          set: { cap: { o: 1 } },
        },
        {
          cap: "O spliceossomo reconhece GU no início do íntron, o A de ramificação e AG no fim.",
          set: {
            spl: { o: 1 },
            i1: { f: "var(--warn)" },
            i2: { f: "var(--warn)" },
          },
        },
        {
          cap: "Os íntrons saem em forma de laço e os éxons se unem.",
          set: {
            i1: { y: 230, o: 0.35, sc: 0.7 },
            i2: { y: 230, o: 0.35, sc: 0.7 },
            spl: { x: 280 },
            e2: { x: 200 },
            e3: { x: 290 },
          },
        },
        {
          cap: "Depois do sinal AAUAAA, o RNA é cortado e recebe a cauda poli-A (~200 A).",
          set: { pa: { o: 1 }, spl: { o: 0 }, i1: { o: 0 }, i2: { o: 0 } },
        },
        {
          cap: "O mRNA maduro (cap + éxons + poli-A) sai do núcleo e vai ao ribossomo. As UTR ficam nele, só não são traduzidas.",
          set: {
            cap: { x: 172 },
            e1: { x: 230 },
            e2: { x: 320 },
            e3: { x: 410 },
            pa: { x: 490 },
          },
        },
      ],
      quiz: [
        [
          "Uma mutação no GU do início de um íntron causa mais provavelmente:",
          [
            "Retenção do íntron ou salto de éxon",
            "Perda da cauda poli-A",
            "Perda do cap",
            "Nenhum efeito",
          ],
          "Sem o sinal de corte, o spliceossomo erra o ponto: muitas talassemias β são assim.",
        ],
        [
          "O que fica no mRNA maduro?",
          [
            "Cap, éxons (com as UTR) e cauda poli-A",
            "Só os íntrons",
            "Éxons e íntrons",
            "Só a região codificante",
          ],
          "As UTR fazem parte dos éxons das pontas: ficam no mRNA, mas não são traduzidas.",
        ],
      ],
    },
    ubq: {
      h: 300,
      bg: `<text class="ax" x="20" y="290">Ubiquitina (Ub) · E1 ativa · E2 conjuga · E3 escolhe o alvo</text>`,
      a: {
        e1: { s: ["c", 24], l: "E1", x: 80, y: 90 },
        e2: { s: ["c", 24], l: "E2", x: 200, y: 90 },
        e3: { s: ["r", 60, 40], l: "E3", x: 350, y: 160 },
        sub: {
          s: ["r", 74, 40],
          l: "proteína",
          fs: 10,
          f: "var(--eosin)",
          x: 440,
          y: 160,
        },
        u1: {
          s: ["c", 10],
          l: "Ub",
          fs: 8,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 80,
          y: 50,
          o: 0,
        },
        u2: {
          s: ["c", 10],
          l: "Ub",
          fs: 8,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 80,
          y: 50,
          o: 0,
        },
        u3: {
          s: ["c", 10],
          l: "Ub",
          fs: 8,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 80,
          y: 50,
          o: 0,
        },
        u4: {
          s: ["c", 10],
          l: "Ub",
          fs: 8,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 80,
          y: 50,
          o: 0,
        },
        px: {
          s: ["r", 90, 130, 24],
          l: "26S",
          lc: "var(--ink)",
          f: "var(--sunk)",
          st: "var(--ink)",
          x: 575,
          y: 160,
          o: 0,
        },
        q1: { s: ["r", 20, 8, 3], f: "var(--eosin)", x: 575, y: 160, o: 0 },
        q2: { s: ["r", 20, 8, 3], f: "var(--eosin)", x: 575, y: 160, o: 0 },
        q3: { s: ["r", 20, 8, 3], f: "var(--eosin)", x: 575, y: 160, o: 0 },
      },
      steps: [
        {
          cap: "Uma proteína precisa ser destruída. Ela será marcada com ubiquitina.",
        },
        {
          cap: "A E1 ativa a ubiquitina gastando ATP.",
          set: { u1: { o: 1, y: 56 } },
        },
        {
          cap: "A ubiquitina passa para a E2.",
          set: { u1: { x: 200, y: 56 } },
        },
        {
          cap: "A E3 reconhece a proteína-alvo e transfere a ubiquitina. É a E3 que dá a especificidade.",
          set: { e2: { x: 300, y: 110 }, u1: { x: 455, y: 128 } },
        },
        {
          cap: "O ciclo se repete: forma-se uma cadeia de ubiquitinas ligadas pela Lys48, o sinal de degradação.",
          set: {
            u2: { o: 1, x: 468, y: 110 },
            u3: { o: 1, x: 481, y: 92 },
            u4: { o: 1, x: 494, y: 74 },
            e2: { x: 200, y: 90 },
          },
        },
        {
          cap: "O proteassomo 26S reconhece a cadeia. A parte 19S tira a ubiquitina e desdobra a proteína com ATP.",
          set: {
            px: { o: 1 },
            sub: { x: 575, sc: 0.55 },
            u1: { x: 500, y: 40 },
            u2: { x: 520, y: 40 },
            u3: { x: 540, y: 40 },
            u4: { x: 560, y: 40 },
          },
        },
        {
          cap: "O núcleo 20S corta a proteína em peptídeos. A ubiquitina é reciclada.",
          set: {
            sub: { o: 0 },
            q1: { o: 1, x: 470, y: 250 },
            q2: { o: 1, x: 510, y: 270 },
            q3: { o: 1, x: 550, y: 250 },
            u1: { x: 80, y: 50, o: 0.4 },
            u2: { x: 80, y: 50, o: 0.4 },
            u3: { x: 80, y: 50, o: 0.4 },
            u4: { x: 80, y: 50, o: 0.4 },
          },
        },
      ],
      quiz: [
        [
          "Qual enzima dá a especificidade da ubiquitinação?",
          ["E3 (ubiquitina ligase)", "E1", "E2", "Proteassomo 20S"],
          "Há poucas E1, dezenas de E2 e centenas de E3: cada E3 reconhece alvos diferentes.",
        ],
        [
          "Que tipo de cadeia leva ao proteassomo?",
          [
            "Poliubiquitina ligada pela Lys48",
            "Uma ubiquitina só",
            "Cadeia pela Lys63",
            "Manose-6-fosfato",
          ],
          "K48 = degradação; monoubiquitina e K63 = sinalização e endocitose.",
        ],
      ],
    },
    mit: {
      h: 300,
      a: {
        cA: {
          s: ["c", 115],
          f: "var(--surface)",
          st: "var(--ink)",
          x: 320,
          y: 150,
        },
        cB: {
          s: ["c", 115],
          f: "var(--surface)",
          st: "var(--ink)",
          x: 320,
          y: 150,
        },
        nuc: {
          s: ["c", 62],
          f: "var(--hema-soft)",
          st: "var(--hema)",
          x: 320,
          y: 150,
        },
        nA: {
          s: ["c", 38],
          f: "var(--hema-soft)",
          st: "var(--hema)",
          x: 220,
          y: 150,
          o: 0,
        },
        nB: {
          s: ["c", 38],
          f: "var(--hema-soft)",
          st: "var(--hema)",
          x: 420,
          y: 150,
          o: 0,
        },
        pl: { s: ["r", 3, 210, 1], f: "var(--muted)", x: 320, y: 150, o: 0 },
        z1: { s: ["c", 7], f: "var(--warn)", x: 316, y: 30 },
        z2: { s: ["c", 7], f: "var(--warn)", x: 326, y: 30 },
        a1: { s: ["r", 10, 48, 5], f: "var(--eosin)", x: 298, y: 128, o: 0.3 },
        a2: { s: ["r", 10, 48, 5], f: "var(--eosin)", x: 310, y: 128, o: 0.3 },
        b1: { s: ["r", 10, 40, 5], f: "var(--hema)", x: 330, y: 172, o: 0.3 },
        b2: { s: ["r", 10, 40, 5], f: "var(--hema)", x: 342, y: 172, o: 0.3 },
      },
      steps: [
        {
          cap: "Interfase: o DNA já foi duplicado, mas a cromatina está descondensada.",
        },
        {
          cap: "Prófase: os cromossomos condensam (condensinas) e os centrossomos vão para os polos formando o fuso.",
          set: {
            a1: { o: 1 },
            a2: { o: 1 },
            b1: { o: 1 },
            b2: { o: 1 },
            z1: { x: 212, y: 150 },
            z2: { x: 428, y: 150 },
          },
        },
        {
          cap: "Prometáfase: a CDK1 fosforila as laminas, o envelope nuclear se desfaz e os microtúbulos capturam os cinetócoros.",
          set: { nuc: { o: 0 } },
        },
        {
          cap: "Metáfase: os cromossomos se alinham na placa equatorial. O checkpoint do fuso só libera quando todos estão ligados.",
          set: {
            pl: { o: 0.6 },
            a1: { x: 314, y: 105 },
            a2: { x: 326, y: 105 },
            b1: { x: 314, y: 195 },
            b2: { x: 326, y: 195 },
          },
        },
        {
          cap: "Anáfase: o APC/C degrada a securina, a separase corta a coesina e as cromátides irmãs vão para os polos.",
          set: {
            pl: { o: 0 },
            a1: { x: 245 },
            a2: { x: 395 },
            b1: { x: 245 },
            b2: { x: 395 },
          },
        },
        {
          cap: "Telófase: o envelope nuclear se refaz em volta de cada conjunto de cromossomos.",
          set: {
            nA: { o: 1 },
            nB: { o: 1 },
            a1: { x: 210, y: 140, o: 0.5 },
            b1: { x: 232, y: 160, o: 0.5 },
            a2: { x: 410, y: 140, o: 0.5 },
            b2: { x: 432, y: 160, o: 0.5 },
          },
        },
        {
          cap: "Citocinese: o anel de actina e miosina II estrangula a célula. Duas células iguais à original.",
          set: {
            cA: { x: 215, sc: 0.72 },
            cB: { x: 425, sc: 0.72 },
            nA: { x: 215 },
            nB: { x: 425 },
            a1: { x: 205 },
            b1: { x: 227 },
            a2: { x: 415 },
            b2: { x: 437 },
            z1: { x: 215, y: 85 },
            z2: { x: 425, y: 85 },
          },
        },
      ],
      quiz: [
        [
          "O que separa as cromátides irmãs na anáfase?",
          [
            "A separase cortando a coesina, depois que o APC/C degrada a securina",
            "A condensina",
            "A CDK1 fosforilando as laminas",
            "A miosina II",
          ],
          "Securina segura a separase; o APC/C a destrói; a separase corta a coesina.",
        ],
        [
          "Em que fase atua o checkpoint do fuso?",
          [
            "Na passagem da metáfase para a anáfase",
            "Na prófase",
            "Na telófase",
            "Na citocinese",
          ],
          "Cinetócoros soltos ativam MAD2, que inibe o APC/C-Cdc20 e segura a anáfase.",
        ],
      ],
    },
    apo: {
      h: 330,
      bg: `<path d="M80 55V85M80 115V145M330 55V85M330 115V145M395 160H440M500 135V115M330 175V205M80 175 L190 265M330 235 L230 265" fill="none" stroke="var(--line)" stroke-width="2"/><text class="ax" x="20" y="16">VIA EXTRÍNSECA</text><text class="ax" x="275" y="16">VIA INTRÍNSECA</text>`,
      a: {
        fas: {
          s: ["r", 140, 30],
          l: "FasL + Fas",
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 80,
          y: 40,
        },
        disc: {
          s: ["r", 140, 30],
          l: "FADD · DISC",
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 80,
          y: 100,
        },
        c8: {
          s: ["r", 140, 30],
          l: "caspase-8",
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 80,
          y: 160,
        },
        dano: {
          s: ["r", 140, 30],
          l: "dano ao DNA",
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 330,
          y: 40,
        },
        p53: {
          s: ["r", 140, 30],
          l: "p53 → BH3-only",
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 330,
          y: 100,
        },
        bax: {
          s: ["r", 140, 30],
          l: "BAX / BAK",
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 330,
          y: 160,
        },
        mito: {
          s: ["e", 60, 26],
          l: "mitocôndria",
          fs: 10,
          lc: "var(--ink)",
          f: "var(--ok-soft)",
          x: 500,
          y: 160,
        },
        cyt: {
          s: ["c", 12],
          l: "cit c",
          fs: 8,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 500,
          y: 160,
          o: 0,
        },
        aps: {
          s: ["r", 170, 30],
          l: "apoptossomo · caspase-9",
          fs: 10,
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 330,
          y: 220,
        },
        c3: {
          s: ["r", 150, 30],
          l: "caspases 3, 6, 7",
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 210,
          y: 280,
        },
        cell: {
          s: ["c", 42],
          l: "célula",
          lc: "var(--ink)",
          f: "var(--hema-soft)",
          x: 520,
          y: 275,
        },
        bl1: { s: ["c", 9], f: "var(--hema-soft)", x: 520, y: 275, o: 0 },
        bl2: { s: ["c", 9], f: "var(--hema-soft)", x: 520, y: 275, o: 0 },
        bl3: { s: ["c", 9], f: "var(--hema-soft)", x: 520, y: 275, o: 0 },
      },
      steps: [
        {
          cap: "Duas portas para a apoptose: a extrínseca, por receptores de morte, e a intrínseca, pela mitocôndria.",
        },
        {
          cap: "Via extrínseca: FasL ou TNF ligam o receptor de morte; o adaptador FADD monta o DISC.",
          set: { fas: lit, disc: lit },
        },
        {
          cap: "O DISC ativa a caspase-8, iniciadora da via extrínseca.",
          set: { c8: lit },
        },
        {
          cap: "Via intrínseca: dano ao DNA ativa o p53 e proteínas BH3-only, que neutralizam o BCL-2.",
          set: { dano: lit, p53: lit },
        },
        {
          cap: "Sem o freio do BCL-2, BAX e BAK furam a membrana externa da mitocôndria (MOMP).",
          set: { bax: lit, mito: { f: "var(--warn)" } },
        },
        {
          cap: "Sai o citocromo c, que com a Apaf-1 forma o apoptossomo e ativa a caspase-9.",
          set: { cyt: { o: 1, x: 430, y: 215 }, aps: lit },
        },
        {
          cap: "As duas vias convergem nas caspases executoras 3, 6 e 7.",
          set: { c3: lit, cyt: { o: 0 } },
        },
        {
          cap: "A célula encolhe, a cromatina condensa e ela se parte em corpos apoptóticos, fagocitados sem inflamação.",
          set: {
            cell: { sc: 0.55, l: "" },
            bl1: { o: 1, x: 478, y: 250 },
            bl2: { o: 1, x: 565, y: 258 },
            bl3: { o: 1, x: 540, y: 305 },
          },
        },
      ],
      quiz: [
        [
          "Qual caspase inicia a via intrínseca?",
          ["Caspase-9", "Caspase-8", "Caspase-3", "Caspase-7"],
          "Intrínseca → apoptossomo → caspase-9. Extrínseca → DISC → caspase-8.",
        ],
        [
          "Superexpressão de BCL-2, como no linfoma folicular, causa:",
          [
            "Menos apoptose",
            "Mais apoptose",
            "Necrose",
            "Liberação de citocromo c",
          ],
          "BCL-2 impede BAX/BAK de furar a mitocôndria: a célula danificada sobrevive.",
        ],
      ],
    },
    hgt: {
      h: 280,
      bg: `<text class="ax" x="20" y="22">DOADORA</text><text class="ax" x="560" y="22">RECEPTORA</text>`,
      a: {
        A: {
          s: ["e", 115, 58],
          l: "",
          lc: "var(--ink)",
          f: "var(--hema-soft)",
          st: "var(--hema)",
          x: 150,
          y: 150,
        },
        B: {
          s: ["e", 115, 58],
          l: "receptora",
          lc: "var(--ink)",
          f: "var(--ok-soft)",
          st: "var(--ok)",
          x: 490,
          y: 150,
        },
        pil: { s: ["r", 120, 6, 3], f: "var(--muted)", x: 320, y: 150, o: 0 },
        pl: {
          s: ["c", 16],
          l: "F",
          fs: 10,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 180,
          y: 170,
          o: 0,
        },
        pl2: {
          s: ["c", 16],
          l: "F",
          fs: 10,
          f: "var(--warn)",
          lc: "#1a1a1a",
          x: 180,
          y: 170,
          o: 0,
        },
        fr: { s: ["r", 50, 9, 4], f: "var(--eosin)", x: 320, y: 60, o: 0 },
        ph: {
          s: ["r", 24, 36, 6],
          l: "fago",
          fs: 8,
          f: "var(--ink)",
          lc: "var(--surface)",
          x: 150,
          y: 60,
          o: 0,
        },
      },
      steps: [
        {
          cap: "Transformação: uma bactéria morreu e deixou pedaços de DNA livres no meio.",
          set: { A: { o: 0.25 }, fr: { o: 1 } },
        },
        {
          cap: "Uma bactéria competente capta esse DNA e pode incorporá-lo ao cromossomo (experimento de Griffith).",
          set: { fr: { x: 490, y: 150 } },
        },
        {
          cap: "Conjugação: a doadora F⁺ forma um pilus sexual até a receptora. É preciso contato.",
          set: {
            A: { o: 1, l: "F⁺" },
            fr: { o: 0 },
            pl: { o: 1 },
            pil: { o: 1 },
          },
        },
        {
          cap: "Uma fita do plasmídeo F passa pelo pilus e as duas células completam a fita que falta.",
          set: { pl2: { o: 1, x: 465, y: 170 } },
        },
        {
          cap: "A receptora agora também é F⁺ e pode conjugar com outras. Assim se espalha resistência a antibióticos.",
          set: { pil: { o: 0 }, B: { l: "F⁺" } },
        },
        {
          cap: "Transdução: um bacteriófago infecta a doadora.",
          set: {
            pl: { o: 0 },
            pl2: { o: 0 },
            B: { l: "receptora" },
            A: { l: "" },
            ph: { o: 1, y: 85 },
          },
        },
        {
          cap: "Por engano, um pedaço do DNA bacteriano é empacotado num fago novo.",
          set: { fr: { o: 1, x: 320, y: 70, sc: 0.6 }, ph: { x: 320, y: 60 } },
        },
        {
          cap: "O fago injeta esse DNA em outra bactéria: os genes passam sem contato entre as células.",
          set: { ph: { x: 490, y: 85 }, fr: { x: 490, y: 150, sc: 1 } },
        },
      ],
      quiz: [
        [
          "Transferência de DNA por um bacteriófago chama-se:",
          ["Transdução", "Transformação", "Conjugação", "Transposição"],
          "Fago = transdução; DNA livre = transformação; pilus e contato = conjugação.",
        ],
        [
          "Qual mecanismo exige contato direto entre as bactérias?",
          ["Conjugação", "Transformação", "Transdução", "Nenhum"],
          "Na conjugação o DNA passa pelo pilus sexual entre células encostadas.",
        ],
      ],
    },
    pro: {
      h: 260,
      a: {
        l1: {
          s: ["r", 440, 36],
          l: "Met–Val–His–Leu–Thr–Pro–Glu–Glu–Lys…",
          fs: 13,
          lc: "var(--ink)",
          f: "var(--sunk)",
          x: 320,
          y: 130,
        },
        l2: {
          s: [
            "p",
            "M-160 0q10-34 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0",
            6,
          ],
          st: "var(--hema)",
          x: 320,
          y: 130,
          o: 0,
        },
        l3: {
          s: [
            "p",
            "M-80-40C-20-95 95-65 85 0C75 62-10 82-62 52C-112 22-120-12-80-40Z",
            4,
          ],
          f: "var(--hema-soft)",
          st: "var(--hema)",
          x: 320,
          y: 135,
          o: 0,
        },
        q1: {
          s: ["c", 44],
          l: "α",
          fs: 16,
          f: "var(--eosin)",
          x: 272,
          y: 88,
          o: 0,
        },
        q2: { s: ["c", 44], l: "β", fs: 16, x: 368, y: 88, o: 0 },
        q3: { s: ["c", 44], l: "β", fs: 16, x: 272, y: 180, o: 0 },
        q4: {
          s: ["c", 44],
          l: "α",
          fs: 16,
          f: "var(--eosin)",
          x: 368,
          y: 180,
          o: 0,
        },
      },
      steps: [
        {
          cap: "Primária: a sequência de aminoácidos, unidos por ligações peptídicas.",
        },
        {
          cap: "Secundária: α-hélices e folhas β, mantidas por pontes de H entre átomos do esqueleto.",
          set: { l1: { o: 0 }, l2: { o: 1 } },
        },
        {
          cap: "Terciária: o dobramento 3D, pelas cadeias laterais (hidrofóbicas, iônicas, pontes dissulfeto).",
          set: { l2: { o: 0 }, l3: { o: 1 } },
        },
        {
          cap: "Quaternária: várias cadeias juntas, como a hemoglobina α₂β₂.",
          set: {
            l3: { o: 0 },
            q1: { o: 1 },
            q2: { o: 1 },
            q3: { o: 1 },
            q4: { o: 1 },
          },
        },
        {
          cap: "Desnaturação: calor ou pH desfazem as estruturas 2ª, 3ª e 4ª. A primária fica.",
          set: {
            q1: { o: 0 },
            q2: { o: 0 },
            q3: { o: 0 },
            q4: { o: 0 },
            l1: { o: 1 },
          },
        },
      ],
      quiz: [
        [
          "Pontes de H do esqueleto peptídico mantêm qual estrutura?",
          ["Secundária", "Primária", "Terciária", "Quaternária"],
          "As cadeias laterais definem a terciária; o esqueleto, a secundária.",
        ],
        [
          "A desnaturação rompe:",
          [
            "As estruturas secundária, terciária e quaternária",
            "As ligações peptídicas",
            "A sequência de aminoácidos",
            "Nada",
          ],
          "A sequência (primária) permanece; por isso algumas proteínas voltam a dobrar (Anfinsen).",
        ],
      ],
    },
  };

  /* ---------- jogos de classificar (dados) ---------- */
  const SORTS = {
    so_org: {
      intro: "Onde acontece cada processo? Clique na organela certa.",
      cats: [
        "Citosol",
        "Matriz mitocondrial",
        "Membrana mitocondrial interna",
        "Peroxissomo",
        "RE liso",
        "RE rugoso",
        "Golgi",
        "Lisossomo",
      ],
      items: [
        ["Glicólise", 0, "As 10 reações da glicólise são citosólicas."],
        ["Ciclo de Krebs", 1, "O Krebs roda na matriz mitocondrial."],
        [
          "Piruvato → acetil-CoA",
          1,
          "A piruvato desidrogenase está na matriz.",
        ],
        [
          "Cadeia transportadora de elétrons",
          2,
          "Os complexos I–IV ficam na membrana interna (cristas).",
        ],
        [
          "ATP sintase",
          2,
          "Também na membrana interna, usando o gradiente de H⁺.",
        ],
        ["Fermentação lática", 0, "A lactato desidrogenase é citosólica."],
        [
          "β-oxidação de ácidos graxos de cadeia muito longa",
          3,
          "Começa no peroxissomo; os comuns vão à mitocôndria.",
        ],
        ["Catalase degrada H₂O₂", 3, "Enzima típica do peroxissomo."],
        [
          "Síntese de plasmalogênios",
          3,
          "Lipídios da mielina feitos no peroxissomo.",
        ],
        ["Síntese de esteroides", 4, "Lipídios são feitos no RE liso."],
        ["Citocromo P450 (detoxificação)", 4, "No RE liso do hepatócito."],
        [
          "Reserva de Ca²⁺ do músculo",
          4,
          "O retículo sarcoplasmático é RE liso.",
        ],
        [
          "Início da N-glicosilação (Asn)",
          5,
          "O oligossacarídeo sai do dolicol para a Asn no RE rugoso.",
        ],
        [
          "Tradução de proteínas de secreção",
          5,
          "Ribossomos ligados ao RE rugoso.",
        ],
        ["O-glicosilação (Ser/Thr)", 6, "Feita no Golgi."],
        [
          "Adição de manose-6-fosfato",
          6,
          "No cis-Golgi, pela fosfotransferase.",
        ],
        [
          "Hidrolases ácidas em pH ≈ 5",
          7,
          "O lisossomo é ácido graças à V-ATPase.",
        ],
      ],
    },
    so_gen: {
      intro: "Característica de procarioto, de eucarioto ou dos dois?",
      cats: ["Procarioto", "Eucarioto", "Ambos"],
      items: [
        [
          "Operons com mRNA policistrônico",
          0,
          "Vários genes num só mRNA: típico de bactérias.",
        ],
        [
          "Íntrons e splicing",
          1,
          "Genes eucarióticos são interrompidos por íntrons.",
        ],
        [
          "Transcrição e tradução acopladas",
          0,
          "Sem núcleo, o ribossomo já traduz o mRNA nascente.",
        ],
        [
          "Fator σ reconhece o promotor",
          0,
          "A RNA polimerase bacteriana usa o fator sigma.",
        ],
        [
          "Três RNA polimerases nucleares",
          1,
          "Pol I (rRNA), II (mRNA), III (tRNA, 5S).",
        ],
        [
          "Cap 5' e cauda poli-A no mRNA",
          1,
          "Processamento nuclear eucariótico.",
        ],
        [
          "Sequência de Shine-Dalgarno",
          0,
          "Posiciona o ribossomo bacteriano no AUG.",
        ],
        [
          "Código genético quase universal",
          2,
          "O mesmo código em quase todos os seres vivos.",
        ],
        [
          "Ribossomos 70S",
          0,
          "Os eucariotos têm 80S (e 70S só em mitocôndrias e cloroplastos).",
        ],
        [
          "Enhancers que agem à distância",
          1,
          "Típicos da regulação eucariótica.",
        ],
        ["Replicação semiconservativa", 2, "Vale para todos."],
        [
          "Telomerase nas pontas dos cromossomos",
          1,
          "Só cromossomos lineares precisam dela.",
        ],
      ],
    },
    so_reg: {
      intro: "Em que nível cada mecanismo controla a expressão gênica?",
      cats: [
        "Cromatina",
        "Transcrição",
        "Processamento do RNA",
        "Tradução e estabilidade do mRNA",
        "Pós-tradução",
      ],
      items: [
        [
          "Acetilação de histonas",
          0,
          "Abre a cromatina e facilita a transcrição.",
        ],
        [
          "Metilação de ilha CpG",
          0,
          "Fecha a cromatina e silencia o promotor.",
        ],
        ["Repressor lac no operador", 1, "Bloqueia a RNA polimerase."],
        ["Ativador ligado a enhancer", 1, "Recruta o mediador e a polimerase."],
        ["Splicing alternativo", 2, "Um gene, várias proteínas."],
        [
          "microRNA na 3' UTR",
          3,
          "Reprime a tradução ou desestabiliza o mRNA.",
        ],
        [
          "IRP na 5' UTR da ferritina",
          3,
          "Com pouco ferro, bloqueia a tradução.",
        ],
        [
          "NMD degrada mRNA com stop precoce",
          3,
          "Controle de qualidade do mRNA.",
        ],
        ["Fosforilação pela PKA", 4, "Liga ou desliga a proteína já pronta."],
        [
          "Ubiquitinação para o proteassomo",
          4,
          "Controla quanto tempo a proteína dura.",
        ],
      ],
    },
    so_rep: {
      intro: "Qual sistema repara cada dano ou está ligado a cada doença?",
      cats: ["BER", "NER", "Mismatch (MMR)", "Recombinação homóloga", "NHEJ"],
      items: [
        [
          "Uracila no DNA por desaminação da citosina",
          0,
          "Uma glicosilase retira a base: excisão de bases.",
        ],
        ["8-oxoguanina (dano oxidativo)", 0, "Base isolada danificada → BER."],
        [
          "Dímero de timina por UV",
          1,
          "Lesão volumosa que deforma a hélice → NER.",
        ],
        ["Xeroderma pigmentoso", 1, "Defeito no NER: câncer de pele com sol."],
        [
          "Base errada que escapou da polimerase",
          2,
          "Erro de replicação → MMR.",
        ],
        [
          "Síndrome de Lynch",
          2,
          "MSH2/MLH1: instabilidade de microssatélites.",
        ],
        [
          "Quebra de dupla fita em G2, com a irmã como molde",
          3,
          "HR é exata e precisa da cromátide irmã.",
        ],
        ["BRCA1 e BRCA2", 3, "Proteínas da recombinação homóloga."],
        [
          "Quebra de dupla fita em G1, propensa a erro",
          4,
          "NHEJ liga as pontas sem molde.",
        ],
        ["Ku70/Ku80", 4, "Reconhecem as pontas no NHEJ."],
      ],
    },
    so_car: {
      intro: "Qual condição corresponde a cada cariótipo?",
      cats: [
        "Síndrome de Down",
        "Síndrome de Turner",
        "Síndrome de Klinefelter",
        "Síndrome de Edwards",
        "Síndrome de Patau",
        "Triplo X",
        "Portador balanceado",
      ],
      items: [
        ["47,XX,+21", 0, "Trissomia livre do 21."],
        ["47,XY,+21", 0, "Trissomia livre do 21."],
        [
          "46,XY,der(14;21),+21",
          0,
          "Down por translocação: 46 cromossomos, mas três cópias do 21q.",
        ],
        ["45,X", 1, "Monossomia do X."],
        ["47,XXY", 2, "Homem com um X a mais."],
        ["47,XY,+18", 3, "Trissomia do 18."],
        ["47,XX,+13", 4, "Trissomia do 13."],
        ["47,XXX", 5, "Em geral com poucos sinais."],
        [
          "45,XX,der(14;21)",
          6,
          "Translocação robertsoniana balanceada: fenótipo normal, risco para os filhos.",
        ],
      ],
    },
    so_jun: {
      intro: "Qual junção ou adesão corresponde a cada descrição?",
      cats: [
        "Oclusiva (tight)",
        "Aderente",
        "Desmossomo",
        "Hemidesmossomo",
        "Comunicante (gap)",
      ],
      items: [
        ["Claudinas e ocludina", 0, "Vedam o espaço entre células epiteliais."],
        [
          "Barreira entre o lúmen e o tecido",
          0,
          "Também mantém a polaridade do epitélio.",
        ],
        ["Caderinas ligadas à actina, em cinturão", 1, "Junção aderente."],
        [
          "Desmogleína ligada à queratina",
          2,
          "Desmossomo: resistência mecânica.",
        ],
        [
          "Alvo dos anticorpos no pênfigo vulgar",
          2,
          "Anticorpos contra desmogleínas.",
        ],
        [
          "Integrinas prendem a célula à lâmina basal",
          3,
          "Hemidesmossomo, ligado a filamentos intermediários.",
        ],
        [
          "Alvo no penfigoide bolhoso",
          3,
          "Anticorpos contra componentes do hemidesmossomo.",
        ],
        ["Conexinas formando conexons", 4, "Canal entre citoplasmas vizinhos."],
        [
          "Acoplamento elétrico do coração",
          4,
          "Íons passam de célula a célula.",
        ],
        [
          "Passagem de moléculas menores que ~1 kDa",
          4,
          "Íons, AMPc, pequenos metabólitos.",
        ],
      ],
    },
    so_vir: {
      intro: "Em qual classe de Baltimore está cada vírus?",
      cats: [
        "I · DNA dupla fita",
        "II · DNA fita simples",
        "III · RNA dupla fita",
        "IV · RNA (+)",
        "V · RNA (−)",
        "VI · RNA com RT",
        "VII · DNA com RT",
      ],
      items: [
        ["Herpes", 0, "DNA dupla fita."],
        ["HPV", 0, "DNA dupla fita circular."],
        ["Adenovírus", 0, "DNA dupla fita."],
        ["Parvovírus B19", 1, "DNA fita simples."],
        ["Rotavírus", 2, "RNA dupla fita segmentado."],
        ["Poliovírus", 3, "O genoma já funciona como mRNA."],
        ["SARS-CoV-2", 3, "RNA (+)."],
        ["Influenza", 4, "RNA (−): traz a própria RNA polimerase."],
        ["Vírus da raiva", 4, "RNA (−)."],
        ["HIV", 5, "Retrovírus: transcriptase reversa e integrase."],
        ["Hepatite B", 6, "DNA que se replica por um intermediário de RNA."],
      ],
    },
    so_enz: {
      intro: "Em qual classe EC está cada enzima?",
      cats: [
        "Oxidorredutase",
        "Transferase",
        "Hidrolase",
        "Liase",
        "Isomerase",
        "Ligase",
      ],
      items: [
        ["Lactato desidrogenase", 0, "Desidrogenases fazem oxirredução."],
        ["Catalase", 0, "Decompõe H₂O₂: oxirredução."],
        ["Hexoquinase", 1, "Quinases transferem fosfato do ATP."],
        ["Histona acetiltransferase (HAT)", 1, "Transfere acetil."],
        ["Fosfatase", 2, "Tira o fosfato usando água."],
        ["Tripsina", 2, "Proteases são hidrolases."],
        ["Histona desacetilase (HDAC)", 2, "Remove acetil por hidrólise."],
        ["Aldolase", 3, "Quebra uma ligação C–C sem água nem oxidação."],
        ["Piruvato descarboxilase", 3, "Descarboxilases são liases."],
        ["Triose-fosfato isomerase", 4, "Converte um isômero no outro."],
        ["DNA ligase", 5, "Une moléculas gastando ATP (ou NAD⁺)."],
        [
          "Aminoacil-tRNA sintetase",
          5,
          "Sintetases que gastam ATP são ligases.",
        ],
      ],
    },
    so_epi: {
      intro: "Cada marca ou proteína ativa ou reprime a expressão do gene?",
      cats: ["Ativa", "Reprime"],
      items: [
        [
          "Acetilação de histonas (HAT)",
          0,
          "Neutraliza a carga positiva e abre a cromatina.",
        ],
        ["Desacetilação (HDAC)", 1, "Compacta a cromatina."],
        ["H3K4me3", 0, "Marca de promotor ativo."],
        ["H3K9me3 + HP1", 1, "Heterocromatina."],
        ["H3K27me3", 1, "Repressão por Polycomb."],
        ["Metilação da ilha CpG do promotor", 1, "MeCP2 liga e traz HDAC."],
        ["Remodelador SWI/SNF", 0, "Desliza nucleossomos e expõe o promotor."],
        ["XIST cobrindo o X", 1, "Silencia o X inativo."],
        [
          "Bromodomínio lendo acetil-lisina",
          0,
          "Ativadores reconhecem a cromatina aberta.",
        ],
        [
          "Hipometilação de um proto-oncogene no tumor",
          0,
          "Perder metilação pode ligar genes.",
        ],
      ],
    },
    so_rpt: {
      intro: "Que tipo de sequência repetida é cada item?",
      cats: [
        "LINE",
        "SINE (Alu)",
        "Retrovírus endógeno (LTR)",
        "Transposon de DNA",
        "Repetição em tandem",
      ],
      items: [
        [
          "~6 kb, codifica transcriptase reversa e endonuclease",
          0,
          "LINE-1 é autônomo.",
        ],
        ["~17–21% do genoma", 0, "LINE é a maior fração."],
        ["~300 pb, não autônomo", 1, "Alu usa a maquinaria do LINE."],
        ["~10% do genoma", 1, "Mais de um milhão de cópias de Alu."],
        ["Tem LTR e veio de infecções antigas", 2, "HERV, cerca de 8%."],
        ["Origem da sincitina da placenta", 2, "Gene env de um HERV."],
        ["Corta-e-cola com transposase", 3, "Classe II."],
        ["~3%, inativo em humanos", 3, "Restos de transposons de DNA."],
        ["α-satélite do centrômero", 4, "Repetições lado a lado."],
        [
          "Microssatélites (STR) da perícia forense",
          4,
          "Repetições curtas em tandem.",
        ],
      ],
    },
    so_gnm: {
      intro: "Verdadeiro ou falso sobre o genoma humano?",
      cats: ["Verdadeiro", "Falso"],
      items: [
        [
          "Tem cerca de 20.000 genes que codificam proteínas",
          0,
          "Bem menos do que se imaginava.",
        ],
        [
          "Mais da metade do DNA codifica proteínas",
          1,
          "Menos de 2% é codificante.",
        ],
        [
          "Cerca de metade do genoma é repetitiva",
          0,
          "LINE, SINE, HERV, satélites…",
        ],
        [
          "Um cromossomo linear precisa de origens, centrômero e telômeros",
          0,
          "Para replicar e segregar direito.",
        ],
        [
          "Cada cromossomo tem uma só origem de replicação",
          1,
          "Eucariotos têm muitas origens.",
        ],
        [
          "O DNA mitocondrial tem 37 genes",
          0,
          "13 proteínas, 22 tRNA, 2 rRNA.",
        ],
        [
          "O DNA mitocondrial codifica todas as proteínas da mitocôndria",
          1,
          "A maioria vem do núcleo e é importada.",
        ],
        [
          "Genoma maior significa organismo mais complexo",
          1,
          "Paradoxo do valor C.",
        ],
        [
          "Um SNP é a variação de uma só base",
          0,
          "A variação mais comum entre pessoas.",
        ],
      ],
    },
    so_cit: {
      intro: "A qual filamento do citoesqueleto cada item pertence?",
      cats: [
        "Microtúbulo",
        "Microfilamento (actina)",
        "Filamento intermediário",
      ],
      items: [
        ["Tubulina + GTP", 0, "Dímeros α/β ligam GTP."],
        ["Actina + ATP", 1, "Actina G vira actina F."],
        [
          "Queratina, vimentina, laminas",
          2,
          "Proteínas de filamento intermediário.",
        ],
        ["Cinesina e dineína", 0, "Motores dos microtúbulos."],
        ["Miosina", 1, "Motor da actina."],
        ["Sem polaridade e sem motor", 2, "Só resistência mecânica."],
        ["Fuso mitótico", 0, "Feito de microtúbulos."],
        ["Anel contrátil da citocinese", 1, "Actina e miosina II."],
        ["Cílios e flagelos 9+2", 0, "Axonema de microtúbulos."],
        ["Microvilosidades", 1, "Feixes de actina."],
        ["Ligado a desmossomos", 2, "Queratinas no epitélio."],
        ["Alvo do taxol", 0, "Estabiliza os microtúbulos."],
      ],
    },
    so_mit: {
      intro: "Em qual fase da mitose acontece cada evento?",
      cats: [
        "Prófase",
        "Prometáfase",
        "Metáfase",
        "Anáfase",
        "Telófase",
        "Citocinese",
      ],
      items: [
        ["Os cromossomos condensam", 0, "Condensinas entram em ação."],
        ["Os centrossomos vão aos polos", 0, "O fuso começa a se formar."],
        ["O envelope nuclear se desfaz", 1, "A CDK1 fosforila as laminas."],
        ["Os microtúbulos capturam os cinetócoros", 1, "Ainda na prometáfase."],
        ["Cromossomos na placa equatorial", 2, "Alinhados no meio da célula."],
        [
          "Checkpoint do fuso segura a célula",
          2,
          "Até todos os cinetócoros estarem ligados.",
        ],
        ["A separase corta a coesina", 3, "As irmãs se separam."],
        ["Cromátides vão aos polos", 3, "Puxadas pelo fuso."],
        ["O envelope nuclear se refaz", 4, "Dois núcleos."],
        ["Anel de actina e miosina II estrangula", 5, "Separa o citoplasma."],
      ],
    },
  };

  /* ---------- simulador: cinética enzimática ---------- */
  function mEnz(el) {
    const st = { km: 5, v: 100, tipo: "comp", i: 2 };
    el.innerHTML = `<div class="lab-grid"><div class="card stack" style="gap:12px">
   <label class="sl">K<sub>m</sub> da enzima <b id="z-vkm"></b><input type="range" id="z-km" min="1" max="15" step="0.5" value="${st.km}"></label>
   <label class="sl">Inibidor: [I]/K<sub>i</sub> <b id="z-vi"></b><input type="range" id="z-i" min="0" max="5" step="0.5" value="${st.i}"></label>
   <div class="row" style="gap:6px">${[
     ["comp", "Competitivo"],
     ["nc", "Não competitivo"],
   ]
     .map(
       ([k, l]) =>
         `<button class="chip" data-zt="${k}" aria-pressed="${st.tipo === k}">${l}</button>`,
     )
     .join("")}</div>
   <div id="z-out" class="stack" style="gap:6px"></div></div>
   <div class="card"><svg id="z-svg" viewBox="0 0 600 330" width="100%" role="img" aria-label="Velocidade da reação em função do substrato"></svg>
   <div class="row" style="gap:14px;font-size:.85rem"><span><i class="key" style="background:var(--muted)"></i>Sem inibidor</span><span><i class="key" style="background:var(--eosin)"></i>Com inibidor</span></div></div></div>
   <div id="z-q"></div>`;
    const X = (s) => 50 + (s / 60) * 530,
      Y = (v) => 290 - (v / 110) * 270;
    function curve(km, v) {
      let d = "";
      for (let s = 0; s <= 60; s += 1) {
        d +=
          (s ? "L" : "M") +
          X(s).toFixed(1) +
          " " +
          Y((v * s) / (km + s)).toFixed(1);
      }
      return d;
    }
    function draw() {
      const f = 1 + st.i,
        km2 = st.tipo === "comp" ? st.km * f : st.km,
        v2 = st.tipo === "nc" ? st.v / f : st.v;
      $("#z-vkm").textContent = st.km + " mM";
      $("#z-vi").textContent = st.i;
      let s = `<line class="gl" x1="50" x2="580" y1="290" y2="290"/><line class="gl" x1="50" x2="50" y1="20" y2="290"/><text class="ax" x="300" y="318" text-anchor="middle">[S] substrato (mM)</text><text class="ax" x="14" y="150" transform="rotate(-90 14 150)" text-anchor="middle">velocidade</text>`;
      [0, 20, 40, 60].forEach(
        (x) =>
          (s += `<text class="ax" x="${X(x)}" y="304" text-anchor="middle">${x}</text>`),
      );
      s += `<line x1="50" x2="580" y1="${Y(st.v)}" y2="${Y(st.v)}" stroke="var(--muted)" stroke-dasharray="4 4"/><text class="ax" x="576" y="${Y(st.v) - 5}" text-anchor="end">Vmax</text>`;
      s += `<path d="${curve(st.km, st.v)}" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="6 4"/>`;
      s += `<path class="zc" d="${curve(km2, v2)}" fill="none" stroke="var(--eosin)" stroke-width="3"/>`;
      s += `<line x1="${X(km2)}" x2="${X(km2)}" y1="290" y2="${Y(v2 / 2)}" stroke="var(--eosin)" stroke-dasharray="3 3"/><line x1="50" x2="${X(km2)}" y1="${Y(v2 / 2)}" y2="${Y(v2 / 2)}" stroke="var(--eosin)" stroke-dasharray="3 3"/><circle cx="${X(km2)}" cy="${Y(v2 / 2)}" r="5" fill="var(--eosin)"/><text class="ax" x="${X(km2) + 6}" y="${Y(v2 / 2) - 8}">Km aparente = ${km2.toFixed(1)}</text>`;
      $("#z-svg").innerHTML = s;
      $("#z-out").innerHTML =
        `<p>K<sub>m</sub> aparente: <b>${km2.toFixed(1)} mM</b> · V<sub>max</sub> aparente: <b>${v2.toFixed(0)}</b></p><p class="muted">${st.i === 0 ? "Sem inibidor, as duas curvas coincidem." : st.tipo === "comp" ? "Competitivo: o inibidor disputa o sítio ativo. É preciso mais substrato para chegar à metade da Vmax (Km sobe), mas com substrato de sobra a Vmax é alcançada." : "Não competitivo: o inibidor liga em outro ponto e tira enzimas de circulação. A Vmax cai e o Km não muda."}</p>`;
    }
    $("#z-km").oninput = (e) => {
      st.km = +e.target.value;
      draw();
    };
    $("#z-i").oninput = (e) => {
      st.i = +e.target.value;
      draw();
    };
    el.querySelectorAll("[data-zt]").forEach(
      (b) =>
        (b.onclick = () => {
          st.tipo = b.dataset.zt;
          el.querySelectorAll("[data-zt]").forEach((x) =>
            x.setAttribute("aria-pressed", x === b),
          );
          draw();
        }),
    );
    draw();
    mq($("#z-q"), [
      [
        "Um inibidor competitivo:",
        [
          "Aumenta o Km aparente e mantém a Vmax",
          "Diminui a Vmax e mantém o Km",
          "Muda o ΔG da reação",
          "Não pode ser vencido com mais substrato",
        ],
        "Mais substrato vence a competição: a Vmax volta; só é preciso mais [S] para chegar à metade dela.",
      ],
      [
        "O que uma enzima NÃO muda?",
        [
          "O equilíbrio e o ΔG da reação",
          "A energia de ativação",
          "A velocidade",
          "O tempo para chegar ao equilíbrio",
        ],
        "Ela só acelera: chega-se mais rápido ao mesmo equilíbrio.",
      ],
    ]);
  }

  /* ---------- simulador: cromatina ---------- */
  function mCro(el) {
    const st = { hat: false, swi: false, k9: false, cpg: false };
    el.innerHTML = `<div class="lab-grid"><div class="card stack" style="gap:8px"><p class="eyebrow">Marcas e enzimas</p>
   ${tog("r-hat", "Acetilação de histonas (HAT)")}${tog("r-swi", "Remodelador SWI/SNF")}${tog("r-k9", "H3K9me3 + HP1")}${tog("r-cpg", "Metilação da ilha CpG do promotor")}
   <div id="r-met" class="stack" style="gap:8px;margin-top:6px"></div></div>
   <div class="card"><svg viewBox="0 0 640 260" width="100%" role="img" aria-label="Cromatina e promotor">
    <line x1="10" x2="630" y1="140" y2="140" stroke="var(--ink)" stroke-width="3"/>
    <rect x="520" y="128" width="90" height="24" rx="4" fill="var(--ok-soft)" stroke="var(--ok)"/><text class="ax" x="565" y="144" text-anchor="middle">promotor</text>
    <g id="r-cpgm" class="ion" style="opacity:0">${[530, 548, 566, 584].map((x) => `<circle cx="${x}" cy="120" r="5" fill="var(--bad)"/>`).join("")}<text class="ax" x="565" y="105" text-anchor="middle" fill="var(--bad)">CH₃ (CpG)</text></g>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<g id="r-n${i}" class="ion"><circle r="24" fill="var(--hema-soft)" stroke="var(--hema)" stroke-width="2.5"/><text y="4" text-anchor="middle" class="ax">H</text><g class="r-ac" style="opacity:0"><circle cx="-14" cy="-28" r="7" fill="var(--ok)"/><text x="-14" y="-25" text-anchor="middle" style="font-size:7px;fill:#fff">Ac</text></g><g class="r-me" style="opacity:0"><circle cx="14" cy="-28" r="7" fill="var(--bad)"/><text x="14" y="-25" text-anchor="middle" style="font-size:7px;fill:#fff">Me</text></g><g class="r-hp" style="opacity:0"><ellipse cx="0" cy="34" rx="16" ry="7" fill="var(--hema)"/></g></g>`).join("")}
    <g id="r-pol" class="ion" style="opacity:0"><ellipse cx="0" cy="0" rx="30" ry="18" fill="var(--hema)"/><text y="4" text-anchor="middle" style="font-size:9px;fill:#fff">RNA pol</text></g>
    <path id="r-rna" d="M565 190 q15 12 30 0 t30 0" fill="none" stroke="var(--eosin)" stroke-width="3" opacity="0"/>
   </svg></div></div><div id="r-q"></div>`;
    function draw() {
      const open = (st.hat || st.swi) && !st.k9 && !st.cpg,
        lvl = open ? (st.hat && st.swi ? 1 : 0.6) : 0;
      [0, 1, 2, 3, 4, 5].forEach((i) => {
        const g = $("#r-n" + i);
        const x = open ? 40 + i * 84 : 150 + i * 44,
          y = open ? 140 : 140 + (i % 2 ? -14 : 14);
        g.style.transform = `translate(${x}px,${y}px)`;
        g.querySelector(".r-ac").style.opacity = st.hat ? 1 : 0;
        g.querySelector(".r-me").style.opacity = st.k9 ? 1 : 0;
        g.querySelector(".r-hp").style.opacity = st.k9 ? 1 : 0;
      });
      $("#r-cpgm").style.opacity = st.cpg ? 1 : 0;
      const p = $("#r-pol");
      p.style.opacity = lvl ? 1 : 0;
      p.style.transform = `translate(565px,${lvl ? 175 : 230}px)`;
      $("#r-rna").setAttribute("opacity", lvl);
      $("#r-met").innerHTML =
        meter(
          "Acessibilidade da cromatina",
          open ? 1 : st.hat || st.swi ? 0.25 : 0.1,
        ) +
        meter("Transcrição do gene", lvl) +
        `<p class="muted" style="font-size:.95rem">${
          st.cpg
            ? "CpG metilada no promotor: a MeCP2 se liga e traz HDAC. O gene fica silenciado mesmo com outras marcas de ativação."
            : st.k9
              ? "H3K9me3 é lida pela HP1, que compacta a região em heterocromatina: os nucleossomos se juntam e o promotor some."
              : open
                ? "Acetilação e remodelação afastam os nucleossomos: o promotor fica exposto e a RNA polimerase se liga."
                : "Sem marcas de ativação, os nucleossomos ficam compactos e o promotor pouco acessível."
        }</p>`;
    }
    ["hat", "swi", "k9", "cpg"].forEach(
      (k) =>
        ($("#r-" + k).onchange = (e) => {
          st[k] = e.target.checked;
          draw();
        }),
    );
    draw();
    mq($("#r-q"), [
      [
        "Metilar a ilha CpG do promotor de um supressor de tumor:",
        [
          "Silencia o gene sem mudar a sequência",
          "Ativa o gene",
          "Causa uma mutação pontual",
          "Acetila as histonas",
        ],
        "É epigenético: a sequência é a mesma, mas o gene fica desligado. Conta como um dos dois eventos de Knudson.",
      ],
      [
        "Por que a acetilação de histonas abre a cromatina?",
        [
          "Neutraliza a carga positiva das lisinas, que soltam o DNA",
          "Corta o DNA",
          "Remove as histonas do núcleo",
          "Metila o DNA",
        ],
        "Histonas são positivas e prendem o DNA negativo; o acetil tira essa carga.",
      ],
    ]);
  }

  /* ---------- simulador: motores e fármacos do citoesqueleto ---------- */
  function mMot(el) {
    const st = { tax: false, col: false };
    el.innerHTML = `<div class="lab-grid"><div class="card stack" style="gap:8px"><p class="eyebrow">Fármacos</p>${tog("t-tax", "Taxol (paclitaxel)")}${tog("t-col", "Colchicina / vincristina")}<div id="t-exp" class="muted" style="font-size:.95rem"></div></div>
   <div class="card"><svg viewBox="0 0 640 240" width="100%" role="img" aria-label="Microtúbulo com cinesina e dineína">
    <text class="ax" x="20" y="24">CENTROSSOMO (ponta −)</text><text class="ax" x="620" y="24" text-anchor="end">periferia / terminal do axônio (ponta +)</text>
    <g id="t-mt"><rect x="40" y="112" width="440" height="18" rx="9" fill="var(--hema-soft)" stroke="var(--hema)"/><rect id="t-dyn" class="mt-grow" x="480" y="112" width="120" height="18" rx="9" fill="var(--hema-soft)" stroke="var(--hema)"/></g>
    <text x="28" y="126" style="font:700 16px var(--f-mono);fill:var(--hema)">−</text><text x="610" y="126" style="font:700 16px var(--f-mono);fill:var(--hema)">+</text>
    <g id="t-kin" class="mot kin"><circle cx="0" cy="-26" r="14" fill="var(--eosin)"/><text y="-22" text-anchor="middle" style="font-size:8px;fill:#fff">carga</text><path d="M-6 -12 L-4 0 M6 -12 L4 0" stroke="var(--eosin)" stroke-width="3"/><text y="-46" text-anchor="middle" class="ax">cinesina →</text></g>
    <g id="t-dyn2" class="mot dyn"><circle cx="0" cy="26" r="14" fill="var(--ok)"/><text y="30" text-anchor="middle" style="font-size:8px;fill:#fff">carga</text><path d="M-6 12 L-4 0 M6 12 L4 0" stroke="var(--ok)" stroke-width="3"/><text y="56" text-anchor="middle" class="ax">← dineína</text></g>
   </svg></div></div><div id="t-q"></div>`;
    function draw() {
      const mt = $("#t-mt"),
        g = $("#t-dyn");
      mt.style.opacity = st.col && !st.tax ? 0.15 : 1;
      mt.style.transition = "opacity 1.2s";
      g.classList.toggle("frozen", st.tax);
      g.classList.toggle("mt-grow", !st.tax && !st.col);
      el.querySelectorAll(".mot").forEach((m) =>
        m.classList.toggle("fall", st.col && !st.tax),
      );
      $("#t-exp").innerHTML = `<p>${
        st.tax && st.col
          ? "Com taxol, a colchicina não consegue desmontar os microtúbulos: o taxol vence. Mesmo assim, sem dinâmica, o fuso não funciona."
          : st.tax
            ? "Taxol: a ponta + para de crescer e encolher (sem instabilidade dinâmica). O transporte continua, mas o fuso mitótico não consegue mover os cromossomos: a célula para em metáfase."
            : st.col
              ? "Colchicina/vincristina: os microtúbulos despolimerizam, os motores perdem o trilho e a carga cai. Na mitose, não há fuso."
              : "Normal: a ponta + cresce e encolhe (instabilidade dinâmica, GTP). A cinesina leva carga para a ponta +; a dineína, para a ponta −."
      }</p>`;
    }
    $("#t-tax").onchange = (e) => {
      st.tax = e.target.checked;
      draw();
    };
    $("#t-col").onchange = (e) => {
      st.col = e.target.checked;
      draw();
    };
    draw();
    mq($("#t-q"), [
      [
        "No axônio, qual motor leva vesículas do corpo celular para o terminal?",
        ["Cinesina", "Dineína", "Miosina II", "Actina"],
        "A ponta + dos microtúbulos fica no terminal: a cinesina anda para a ponta +.",
      ],
      [
        "Taxol e vincristina bloqueiam a mitose porque:",
        [
          "Ambos acabam com a dinâmica dos microtúbulos do fuso",
          "Ambos destroem a actina",
          "Ambos estabilizam os filamentos intermediários",
          "Ambos inibem a cinesina",
        ],
        "Um estabiliza e o outro despolimeriza, mas o fuso precisa crescer e encolher.",
      ],
    ]);
  }

  /* ---------- registro dos novos modelos ---------- */
  const NEWM = [
    [
      "rep",
      3,
      "Replicação na forquilha",
      "Helicase, primase, polimerases, fragmentos de Okazaki e ligase em movimento.",
      ["c3_1"],
      "anim",
    ],
    [
      "imp",
      5,
      "Importação nuclear e Ran",
      "Como uma proteína com NLS entra no núcleo e por que o caminho tem um só sentido.",
      ["c5_3"],
      "anim",
    ],
    [
      "mat",
      3,
      "Maturação do mRNA",
      "Cap, splicing e cauda poli-A acontecendo no pré-mRNA.",
      ["c3_5"],
      "anim",
    ],
    [
      "ubq",
      3,
      "Ubiquitina e proteassomo",
      "E1, E2, E3, cadeia K48 e a destruição no proteassomo 26S.",
      ["c3_7"],
      "anim",
    ],
    [
      "mit",
      7,
      "Mitose passo a passo",
      "Da interfase à citocinese, com o que acontece em cada fase.",
      ["c7_3"],
      "anim",
    ],
    [
      "apo",
      7,
      "Apoptose: as duas vias",
      "Via extrínseca e intrínseca acendendo até as caspases executoras.",
      ["c7_5"],
      "anim",
    ],
    [
      "hgt",
      1,
      "Transformação, conjugação e transdução",
      "As três formas de uma bactéria ganhar genes de outra.",
      ["c1_1"],
      "anim",
    ],
    [
      "pro",
      1,
      "Níveis de estrutura das proteínas",
      "Da sequência à hemoglobina, e o que a desnaturação desfaz.",
      ["c1_3"],
      "anim",
    ],
    [
      "enz",
      1,
      "Cinética enzimática e inibidores",
      "Mexa no Km e no inibidor e veja a curva de Michaelis-Menten mudar.",
      ["c1_4"],
      mEnz,
    ],
    [
      "cro",
      2,
      "Cromatina: abrir e fechar genes",
      "Acetilação, remodelação, H3K9me3 e metilação de CpG no promotor.",
      ["c2_2", "c2_3", "c1_5"],
      mCro,
    ],
    [
      "mot",
      5,
      "Motores e fármacos do citoesqueleto",
      "Cinesina, dineína, instabilidade dinâmica, taxol e colchicina.",
      ["c5_11"],
      mMot,
    ],
    [
      "so_org",
      5,
      "Onde acontece?",
      "Classifique processos por organela: glicólise, Krebs, peroxissomo, RE, Golgi.",
      ["c5_4", "c5_6", "c5_7"],
      "sort",
    ],
    [
      "so_cit",
      5,
      "Os três filamentos",
      "Microtúbulo, actina ou filamento intermediário?",
      ["c5_11"],
      "sort",
    ],
    [
      "so_gen",
      3,
      "Procarioto ou eucarioto?",
      "Classifique características dos genes e da expressão.",
      ["c3_2"],
      "sort",
    ],
    [
      "so_reg",
      3,
      "Em que nível se regula?",
      "Cromatina, transcrição, processamento, tradução ou pós-tradução.",
      ["c3_4"],
      "sort",
    ],
    [
      "so_rep",
      4,
      "Qual sistema de reparo?",
      "BER, NER, MMR, recombinação homóloga ou NHEJ.",
      ["c4_2"],
      "sort",
    ],
    [
      "so_car",
      4,
      "Cariótipo e síndrome",
      "Leia o cariótipo e reconheça a condição.",
      ["c4_3"],
      "sort",
    ],
    [
      "so_mit",
      7,
      "Qual fase da mitose?",
      "Coloque cada evento na fase certa.",
      ["c7_3"],
      "sort",
    ],
    [
      "so_jun",
      6,
      "Qual junção?",
      "Oclusiva, aderente, desmossomo, hemidesmossomo ou comunicante.",
      ["c6_1"],
      "sort",
    ],
    [
      "so_vir",
      1,
      "Classes de Baltimore",
      "Classifique vírus pelo tipo de genoma.",
      ["c1_2"],
      "sort",
    ],
    [
      "so_enz",
      1,
      "Classe da enzima",
      "Oxidorredutase, transferase, hidrolase, liase, isomerase ou ligase.",
      ["c1_4", "c1_5"],
      "sort",
    ],
    [
      "so_epi",
      2,
      "Liga ou desliga o gene?",
      "Marcas epigenéticas que ativam ou reprimem.",
      ["c2_3", "c2_2", "c1_5"],
      "sort",
    ],
    [
      "so_rpt",
      2,
      "Elementos repetidos",
      "LINE, SINE, retrovírus endógeno, transposon de DNA ou tandem.",
      ["c2_4"],
      "sort",
    ],
    [
      "so_gnm",
      2,
      "Genoma humano: verdadeiro ou falso",
      "Números e fatos do genoma humano e mitocondrial.",
      ["c2_1"],
      "sort",
    ],
  ];
  NEWM.forEach(([id, u, nome, d, ct, k]) => {
    const f =
      k === "anim"
        ? (el) => mkStepper(el, ANIMS[id])
        : k === "sort"
          ? (el) => mkSorter(el, SORTS[id])
          : k;
    const m = { id, u, nome, d, ct, f };
    MODELS.push(m);
    MBY[id] = m;
  });
  return { MODELS, MBY, ANIMS, SORTS, labStop };
}
