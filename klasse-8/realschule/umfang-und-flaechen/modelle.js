/*
  Interaktive Modelle für die Einheit „Umfang und Flächen“ (Klasse 8 RS).
  Einbinden nach praesentation.js:  <script src="../modelle.js"></script>
  Leitmodell der Einheit: der Rechteck-Trick – jede Figur wird durch Zerlegen, Ergänzen
  oder Verdoppeln zu einem Rechteck (bzw. Parallelogramm) auf dem Karoraster (1 Kästchen = 1 cm).

  1) FIGUR – eine Figur auf dem Karoraster mit Schiebereglern („Was passiert, wenn …?“)
     <div data-figur='{"typ":"trapez","a":8,"c":4,"h":3,"v":1,
                       "regler":["a","c","h","v"],"zeige":["hoehe","trick","flaeche","umfang"],
                       "an":["hoehe"],"typen":["parallelogramm","dreieck"],"bereich":{"v":[0,4]}}'></div>
        typ:    rechteck (a,b) · parallelogramm (g,h,v) · dreieck (g,h,v) · trapez (a,c,h,v) · raute (e,f) · drachen (e,f,t)
                v = Verschiebung der oberen Ecke/Seite nach rechts, t = Abstand des Diagonalen-Schnittpunkts von der Spitze
        zeige:  Knöpfe, die angeboten werden: hoehe · trick · flaeche · umfang · diagonalen
        an:     Knöpfe, die schon beim Start eingeschaltet sind (sonst verdeckt: erst vermuten, dann zeigen)
        typen:  Knöpfe zum Umschalten zwischen Figuren (optional)

  2) HAUS DER VIERECKE – Verwandtschaften der Vierecke, Eigenschaften filtern
     <div data-haus='{"verdeckt":false}'></div>
        Klick auf eine Eigenschaft hebt alle Vierecke hervor, die sie haben.
        Klick auf ein Viereck zeigt seinen Steckbrief. verdeckt: true → Namen erst per Klick.
*/
(function () {
  const z = (x, s = 2) => Number(x).toLocaleString("de-DE", { maximumFractionDigits: s });
  const json = (el, a) => { try { return JSON.parse(el.getAttribute(a)); } catch (e) { console.warn("modelle.js: JSON-Fehler in", a, e); return null; } };

  const css = document.createElement("style");
  css.textContent = `
  .modell { background: var(--card); border: 2px solid var(--border); border-radius: 16px; padding: .7rem 1rem; margin: .6rem 0; }
  .modell .leiste-m { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin-bottom: .4rem; }
  .modell .leiste-m:empty { display: none; }
  .modell .knopf.an { background: var(--accent); color: #fff; border-color: var(--accent); }
  .modell svg { width: 100%; height: auto; max-height: 44vh; display: block; }
  .modell svg text { font-family: system-ui, sans-serif; }
  .modell .regler { display: flex; flex-wrap: wrap; gap: .3rem 1.2rem; font-size: 1.2rem; margin: .3rem 0; }
  .modell .regler label { display: flex; align-items: center; gap: .4rem; }
  .modell .regler input[type=range] { width: 10rem; }
  .modell .regler b { min-width: 3.6rem; display: inline-block; }
  .modell .ergebnis { display: flex; flex-wrap: wrap; gap: .5rem; font-size: 1.3rem; margin-top: .3rem; }
  .modell .ergebnis span { background: var(--accent-hell); border-radius: 8px; padding: .15rem .6rem; }
  .modell .ergebnis span.flaeche { background: var(--gelb-hell); }
  .modell .ergebnis span.umfang { background: var(--blau-hell); }
  .modell .info { font-size: 1.1rem; color: var(--muted); margin-top: .3rem; }
  .haus { position: relative; }
  .haus .knoten { cursor: pointer; transition: opacity .2s; }
  .haus .knoten.aus { opacity: .22; }
  .haus .knoten.treffer rect { stroke: var(--gruen); stroke-width: 4; fill: var(--gruen-hell); }
  .haus .knoten.gewaehlt rect { stroke: var(--accent); stroke-width: 4; }
  .haus .steckbrief { font-size: 1.15rem; background: var(--accent-hell); border-radius: 10px; padding: .4rem .8rem; margin-top: .4rem; min-height: 2.2rem; }
  `;
  document.head.appendChild(css);

  function beiAktiv(el, fn) {
    const f = el.closest(".folie");
    if (f) f.addEventListener("folie-aktiv", () => requestAnimationFrame(fn));
    fn();
  }

  // ---------- 1) FIGUR ----------
  const STANDARD = { a: 8, b: 4, c: 4, g: 7, h: 4, v: 2, e: 6, f: 8, t: 3 };
  const BEREICH = { a: [1, 14], b: [1, 9], c: [0, 14], g: [1, 14], h: [1, 9], v: [-4, 8], e: [2, 12], f: [2, 10], t: [1, 9] };
  const PARAMS = {
    rechteck: ["a", "b"], parallelogramm: ["g", "h", "v"], dreieck: ["g", "h", "v"],
    trapez: ["a", "c", "h", "v"], raute: ["e", "f"], drachen: ["e", "f", "t"]
  };
  const NAMEN = { rechteck: "▭ Rechteck", parallelogramm: "▱ Parallelogramm", dreieck: "△ Dreieck", trapez: "⏢ Trapez", raute: "◇ Raute", drachen: "🪁 Drachen" };
  const KNOEPFE = { hoehe: "📏 Höhe", trick: "✂️ Rechteck-Trick", flaeche: "🟨 Flächeninhalt", umfang: "🟦 Umfang", diagonalen: "✚ Diagonalen" };
  const laenge = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);

  // Berechnet Ecken, Hilfslinien und Formeln einer Figur
  function geometrie(typ, w) {
    const r = { ecken: [], namen: [], seiten: [], hoehe: null, trick: null, diag: null };
    if (typ === "rechteck") {
      const { a, b } = w;
      r.ecken = [[0, 0], [a, 0], [a, b], [0, b]];
      r.seiten = [["a", a], ["b", b], null, null];
      r.A = a * b; r.formelA = `A = a · b = ${z(a)} · ${z(b)}`;
      r.u = 2 * a + 2 * b; r.formelU = `u = 2 · a + 2 · b = 2 · ${z(a)} + 2 · ${z(b)}`;
      r.trick = { typ: "kaestchen", a, b };
    }
    if (typ === "parallelogramm") {
      const { g, h } = w; const v = Math.max(0, Math.min(w.v, g));
      r.ecken = [[0, 0], [g, 0], [g + v, h], [v, h]];
      const b = Math.hypot(v, h);
      r.seiten = [["g", g], ["b", b], null, null];
      r.hoehe = { von: [v, h], fuss: [v, 0] };
      r.A = g * h; r.formelA = `A = g · h = ${z(g)} · ${z(h)}`;
      r.u = 2 * g + 2 * b; r.formelU = `u = 2 · g + 2 · b = 2 · ${z(g)} + 2 · ${z(b, 1)}`;
      r.trick = { typ: "schieben", stueck: [[0, 0], [v, 0], [v, h]], ziel: [[g, 0], [g + v, 0], [g + v, h]], rechteck: [[v, 0], [g + v, 0], [g + v, h], [v, h]],
        text: "Dreieck abschneiden und rechts ansetzen → Rechteck g × h" };
    }
    if (typ === "dreieck") {
      const { g, h, v } = w;
      const A = [0, 0], B = [g, 0], C = [v, h];
      r.ecken = [A, B, C];
      r.seiten = [["g", g], ["a", laenge(B, C)], ["b", laenge(C, A)]];
      r.hoehe = { von: C, fuss: [v, 0], verlaengern: v < 0 || v > g };
      r.A = g * h / 2; r.formelA = `A = g · h : 2 = ${z(g)} · ${z(h)} : 2`;
      r.u = g + laenge(B, C) + laenge(C, A); r.formelU = `u = g + a + b = ${z(g)} + ${z(laenge(B, C), 1)} + ${z(laenge(C, A), 1)}`;
      r.trick = { typ: "drehen", kopie: [B, [g + v, h], C], ganz: [A, B, [g + v, h], C],
        text: "Zweites gleiches Dreieck drehen und anlegen → Parallelogramm g × h. Das Dreieck ist die Hälfte." };
    }
    if (typ === "trapez") {
      const { a, c, h, v } = w;
      const A = [0, 0], B = [a, 0], C = [v + c, h], D = [v, h];
      r.ecken = c > 0 ? [A, B, C, D] : [A, B, D];
      r.seiten = c > 0 ? [["a", a], ["b", laenge(B, C)], ["c", c], ["d", laenge(D, A)]] : [["a", a], ["b", laenge(B, D)], ["d", laenge(D, A)]];
      r.hoehe = { von: D, fuss: [v, 0], verlaengern: v < 0 || v > a };
      r.A = (a + c) / 2 * h; r.formelA = `A = (a + c) : 2 · h = (${z(a)} + ${z(c)}) : 2 · ${z(h)}`;
      r.u = a + c + laenge(B, C) + laenge(D, A);
      r.formelU = `u = a + b + c + d = ${z(a)} + ${z(laenge(B, C), 1)} + ${z(c)} + ${z(laenge(D, A), 1)}`;
      r.trick = { typ: "drehen", kopie: [C, B, [a + c, 0], [a + v + c, h]], ganz: [A, [a + c, 0], [a + c + v, h], D],
        text: "Zweites gleiches Trapez drehen und anlegen → Parallelogramm mit Grundseite a + c. Das Trapez ist die Hälfte." };
    }
    if (typ === "raute" || typ === "drachen") {
      const { e, f } = w;
      const t = typ === "raute" ? f / 2 : Math.max(0.5, Math.min(w.t, f - 0.5));
      const A = [0, f - t], B = [e / 2, 0], C = [e, f - t], D = [e / 2, f];
      r.ecken = [A, B, C, D];
      const s1 = laenge(D, A), s2 = laenge(A, B);
      r.seiten = typ === "raute" ? [["a", s2], null, null, null] : [["b", s2], null, null, ["a", s1]];
      r.diag = { e: [A, C], f: [D, B], s: [e / 2, f - t] };
      r.A = e * f / 2; r.formelA = `A = e · f : 2 = ${z(e)} · ${z(f)} : 2`;
      r.u = typ === "raute" ? 4 * s2 : 2 * s1 + 2 * s2;
      r.formelU = typ === "raute" ? `u = 4 · a = 4 · ${z(s2, 1)}` : `u = 2 · a + 2 · b = 2 · ${z(s1, 1)} + 2 · ${z(s2, 1)}`;
      r.trick = { typ: "ergaenzen", rechteck: [[0, 0], [e, 0], [e, f], [0, f]],
        text: "Zum Rechteck e × f ergänzen: Die 4 Dreiecke außen sind genauso groß wie die 4 innen → Figur = Hälfte." };
    }
    return r;
  }

  document.querySelectorAll("[data-figur]").forEach(el => {
    const c = json(el, "data-figur"); if (!c) return;
    let typ = c.typ || "parallelogramm";
    const w = Object.assign({}, STANDARD);
    Object.keys(STANDARD).forEach(k => { if (c[k] !== undefined) w[k] = c[k]; });
    const bereich = Object.assign({}, BEREICH, c.bereich || {});
    const zeige = c.zeige || ["hoehe", "trick", "flaeche", "umfang"];
    const an = new Set(c.an || []);
    const typen = c.typen ? [typ, ...c.typen.filter(t => t !== typ)] : null;
    const E = 34; // Pixel pro Kästchen (1 cm)

    el.classList.add("modell");
    el.innerHTML =
      (typen ? `<div class="leiste-m typen">${typen.map(t => `<button class="knopf mittel" type="button" data-typ="${t}">${NAMEN[t]}</button>`).join("")}</div>` : "") +
      `<div class="regler"></div><svg></svg>` +
      `<div class="leiste-m">${zeige.map(k => `<button class="knopf mittel" type="button" data-k="${k}">${KNOEPFE[k]}</button>`).join("")}</div>` +
      `<div class="ergebnis"></div><div class="info"></div>`;
    const svg = el.querySelector("svg"), regler = el.querySelector(".regler");

    function baueRegler() {
      const liste = (c.regler || PARAMS[typ]).filter(k => PARAMS[typ].includes(k));
      regler.innerHTML = liste.map(k => {
        const [lo, hi] = bereich[k];
        const name = k === "v" ? "Verschiebung" : k === "t" ? "Kreuzung" : k;
        return `<label><b>${name} = <span data-w="${k}">${z(w[k])}</span>${k === "v" || k === "t" ? "" : " cm"}</b><input type="range" min="${lo}" max="${hi}" step="${c.schritt || 1}" value="${w[k]}" data-r="${k}"></label>`;
      }).join("");
      regler.querySelectorAll("input").forEach(i => i.addEventListener("input", () => { w[i.dataset.r] = Number(i.value); zeichne(); }));
    }

    // Feste Feldgröße: aus den größten Reglerwerten berechnen, damit die Kästchen beim Schieben gleich groß bleiben
    function feld() {
      let minX = 0, maxX = 1, maxY = 1;
      const proben = [];
      const ks = PARAMS[typ];
      const kombis = 1 << ks.length;
      for (let m = 0; m < kombis; m++) {
        const p = Object.assign({}, w);
        ks.forEach((k, i) => { if (c.regler && c.regler.includes(k)) p[k] = bereich[k][(m >> i) & 1]; });
        proben.push(geometrie(typ, p));
      }
      proben.forEach(g => {
        const pts = g.ecken.concat(g.trick && g.trick.ganz ? g.trick.ganz : [], g.trick && g.trick.ziel ? g.trick.ziel : [], g.trick && g.trick.rechteck ? g.trick.rechteck : []);
        pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
      });
      return { x0: Math.ceil(-minX) + 1, breite: Math.ceil(maxX - minX) + 2, hoehe: Math.ceil(maxY) + 3 };
    }

    function zeichne() {
      regler.querySelectorAll("[data-w]").forEach(s => s.textContent = z(w[s.dataset.w]));
      const g = geometrie(typ, w);
      const F = feld();
      const X = x => (x + F.x0) * E, Y = y => (F.hoehe - 1.5 - y) * E;
      const P = pts => pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
      let s = "";
      for (let i = 0; i <= F.breite; i++) s += `<line x1="${i * E}" y1="0" x2="${i * E}" y2="${F.hoehe * E}" stroke="#dde3ec" stroke-width="1"/>`;
      for (let j = 0; j <= F.hoehe; j++) s += `<line x1="0" y1="${j * E}" x2="${F.breite * E}" y2="${j * E}" stroke="#dde3ec" stroke-width="1"/>`;

      const trick = an.has("trick") && g.trick;
      if (trick && g.trick.typ === "ergaenzen") {
        s += `<polygon points="${P(g.trick.rechteck)}" fill="#fff6dd" stroke="#e8a400" stroke-width="3" stroke-dasharray="8 5"/>`;
      }
      if (trick && g.trick.typ === "drehen") {
        s += `<polygon points="${P(g.trick.ganz)}" fill="none" stroke="#e8a400" stroke-width="3" stroke-dasharray="8 5"/>`;
        s += `<polygon points="${P(g.trick.kopie)}" fill="#ffe8a3" fill-opacity=".75" stroke="#e8a400" stroke-width="2"/>`;
      }
      s += `<polygon points="${P(g.ecken)}" fill="#c5eef3" fill-opacity="${trick && g.trick.typ === "schieben" ? .45 : .9}" stroke="#1098ad" stroke-width="4" stroke-linejoin="round"/>`;
      if (trick && g.trick.typ === "schieben") {
        s += `<polygon points="${P(g.trick.stueck)}" fill="#fff" stroke="#e03131" stroke-width="2" stroke-dasharray="6 4"/>`;
        s += `<polygon points="${P(g.trick.ziel)}" fill="#ffc9c9" stroke="#e03131" stroke-width="2"/>`;
        s += `<polygon points="${P(g.trick.rechteck)}" fill="none" stroke="#e8a400" stroke-width="3" stroke-dasharray="8 5"/>`;
      }
      if (trick && g.trick.typ === "kaestchen") {
        for (let i = 0; i < g.trick.a; i++) for (let j = 0; j < g.trick.b; j++)
          s += `<rect x="${X(i) + 3}" y="${Y(j + 1) + 3}" width="${E - 6}" height="${E - 6}" rx="4" fill="#fff6dd" stroke="#e8a400"/>`;
      }
      // Diagonalen
      if (g.diag && (an.has("diagonalen") || an.has("trick"))) {
        [["e", g.diag.e], ["f", g.diag.f]].forEach(([n, [p, q]]) => {
          s += `<line x1="${X(p[0])}" y1="${Y(p[1])}" x2="${X(q[0])}" y2="${Y(q[1])}" stroke="#ae3ec9" stroke-width="3" stroke-dasharray="7 4"/>`;
          const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
          const lx = n === "e" ? X(mx - (q[0] - p[0]) / 4) : X(mx) + 10, ly = n === "e" ? Y(my) - 10 : Y(my - (p[1] - q[1]) / 4);
          s += `<text x="${lx}" y="${ly}" font-size="20" font-weight="700" fill="#ae3ec9" stroke="#fff" stroke-width="5" paint-order="stroke">${n} = ${z(n === "e" ? w.e : w.f)} cm</text>`;
        });
        const [sx, sy] = g.diag.s;
        s += `<path d="M${X(sx) + 12},${Y(sy)} v-12 h-12" fill="none" stroke="#ae3ec9" stroke-width="2"/>`;
      }
      // Höhe
      if (g.hoehe && an.has("hoehe")) {
        const { von, fuss, verlaengern } = g.hoehe;
        if (verlaengern) {
          const x1 = Math.min(0, fuss[0]), x2 = Math.max(g.ecken[1][0], fuss[0]);
          s += `<line x1="${X(x1)}" y1="${Y(0)}" x2="${X(x2)}" y2="${Y(0)}" stroke="#5b6475" stroke-width="2" stroke-dasharray="4 4"/>`;
        }
        s += `<line x1="${X(von[0])}" y1="${Y(von[1])}" x2="${X(fuss[0])}" y2="${Y(fuss[1])}" stroke="#e03131" stroke-width="3" stroke-dasharray="7 4"/>`;
        const d = fuss[0] + 0.4 <= Math.max(...g.ecken.map(p => p[0])) ? 1 : -1;
        s += `<path d="M${X(fuss[0]) + d * 12},${Y(0)} v-12 h${-d * 12}" fill="none" stroke="#e03131" stroke-width="2"/>`;
        s += `<text x="${X(von[0]) + 8}" y="${(Y(von[1]) + Y(0)) / 2}" font-size="20" font-weight="700" fill="#e03131" stroke="#fff" stroke-width="5" paint-order="stroke">h = ${z(w.h)} cm</text>`;
      }
      // Seitenbeschriftung
      const n = g.ecken.length;
      const cx = g.ecken.reduce((a, p) => a + p[0], 0) / n, cy = g.ecken.reduce((a, p) => a + p[1], 0) / n;
      g.seiten.forEach((sei, i) => {
        if (!sei) return;
        const p = g.ecken[i], q = g.ecken[(i + 1) % n];
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        let dx = mx - cx, dy = my - cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const tx = X(mx) + dx * 30, ty = Y(my) - dy * 30 + 7;
        s += `<text x="${tx}" y="${ty}" font-size="19" font-weight="700" fill="#1f2430" text-anchor="middle" stroke="#fff" stroke-width="5" paint-order="stroke">${sei[0]} = ${z(sei[1], 1)} cm</text>`;
      });
      svg.setAttribute("viewBox", `0 0 ${F.breite * E} ${F.hoehe * E}`);
      svg.innerHTML = s;

      const erg = [];
      if (an.has("flaeche")) erg.push(`<span class="flaeche">${g.formelA} = <strong>${z(g.A)} cm²</strong></span>`);
      if (an.has("umfang")) erg.push(`<span class="umfang">${g.formelU} ${Number.isInteger(Math.round(g.u * 1000) / 1000) ? "=" : "≈"} <strong>${z(g.u, 1)} cm</strong></span>`);
      el.querySelector(".ergebnis").innerHTML = erg.join("");
      el.querySelector(".info").textContent = trick ? g.trick.text : (typ === "trapez" && w.c === 0 ? "c = 0: Aus dem Trapez wird ein Dreieck!" : typ === "trapez" && w.c === w.a ? "c = a: Aus dem Trapez wird ein Parallelogramm!" : typ === "drachen" && w.t * 2 === w.f ? "Kreuzung genau in der Mitte: Aus dem Drachen wird eine Raute!" : "");
      el.querySelectorAll("[data-k]").forEach(b => b.classList.toggle("an", an.has(b.dataset.k)));
      el.querySelectorAll("[data-typ]").forEach(b => b.classList.toggle("an", b.dataset.typ === typ));
    }
    el.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k; an.has(k) ? an.delete(k) : an.add(k); zeichne();
    }));
    el.querySelectorAll("[data-typ]").forEach(b => b.addEventListener("click", () => { typ = b.dataset.typ; baueRegler(); zeichne(); }));
    baueRegler();
    beiAktiv(el, zeichne);
  });

  // ---------- 2) HAUS DER VIERECKE ----------
  const VIERECKE = {
    viereck: { name: "Viereck", x: 50, y: 0, form: [[0, 0], [10, 1], [8, 7], [2, 5]] },
    trapez: { name: "Trapez", x: 28, y: 1, form: [[0, 0], [10, 0], [7, 6], [2, 6]] },
    drachen: { name: "Drachen", x: 78, y: 1, form: [[0, 5], [5, 0], [10, 5], [5, 7]] },
    gltrapez: { name: "gleichschenkliges Trapez", x: 12, y: 2, form: [[0, 0], [10, 0], [7.5, 6], [2.5, 6]] },
    parallelogramm: { name: "Parallelogramm", x: 44, y: 2, form: [[0, 0], [7, 0], [10, 6], [3, 6]] },
    rechteck: { name: "Rechteck", x: 28, y: 3, form: [[0, 0], [10, 0], [10, 6], [0, 6]] },
    raute: { name: "Raute", x: 64, y: 3, form: [[0, 3.5], [5, 0], [10, 3.5], [5, 7]] },
    quadrat: { name: "Quadrat", x: 46, y: 4, form: [[1.5, 0], [8.5, 0], [8.5, 7], [1.5, 7]] }
  };
  const KANTEN = [["viereck", "trapez"], ["viereck", "drachen"], ["trapez", "gltrapez"], ["trapez", "parallelogramm"], ["gltrapez", "rechteck"],
    ["parallelogramm", "rechteck"], ["parallelogramm", "raute"], ["drachen", "raute"], ["rechteck", "quadrat"], ["raute", "quadrat"]];
  const EIGENSCHAFTEN = [
    ["mind. 1 Paar parallele Seiten", ["trapez", "gltrapez", "parallelogramm", "rechteck", "raute", "quadrat"]],
    ["2 Paare parallele Seiten", ["parallelogramm", "rechteck", "raute", "quadrat"]],
    ["4 gleich lange Seiten", ["raute", "quadrat"]],
    ["4 rechte Winkel", ["rechteck", "quadrat"]],
    ["Diagonalen senkrecht", ["drachen", "raute", "quadrat"]],
    ["Diagonalen halbieren sich", ["parallelogramm", "rechteck", "raute", "quadrat"]],
    ["Diagonalen gleich lang", ["gltrapez", "rechteck", "quadrat"]],
    ["mind. 1 Symmetrieachse", ["gltrapez", "drachen", "rechteck", "raute", "quadrat"]],
    ["punktsymmetrisch", ["parallelogramm", "rechteck", "raute", "quadrat"]]
  ];

  document.querySelectorAll("[data-haus]").forEach(el => {
    const c = json(el, "data-haus") || {};
    const offen = new Set(c.verdeckt ? [] : Object.keys(VIERECKE));
    let filter = null, gewaehlt = null;
    el.classList.add("modell", "haus");
    el.innerHTML = `<div class="leiste-m">${EIGENSCHAFTEN.map((e, i) => `<button class="knopf mittel" type="button" data-e="${i}">${e[0]}</button>`).join("")}</div><svg viewBox="0 0 1000 520"></svg><div class="steckbrief"></div>`;
    const svg = el.querySelector("svg");
    const BX = 190, BH = 92;
    const pos = k => [VIERECKE[k].x * 10, 10 + VIERECKE[k].y * 104];
    function zeichne() {
      let s = "";
      KANTEN.forEach(([a, b]) => {
        const [x1, y1] = pos(a), [x2, y2] = pos(b);
        s += `<line x1="${x1}" y1="${y1 + BH}" x2="${x2}" y2="${y2}" stroke="#adb5bd" stroke-width="3" marker-end="url(#pfeil)"/>`;
      });
      Object.entries(VIERECKE).forEach(([k, v]) => {
        const [x, y] = pos(k);
        const klasse = ["knoten", filter && !filter.includes(k) ? "aus" : "", filter && filter.includes(k) ? "treffer" : "", gewaehlt === k ? "gewaehlt" : ""].join(" ");
        const pts = v.form.map(([a, b]) => `${x - 88 + a * 5},${y + 64 - b * 5}`).join(" ");
        s += `<g class="${klasse}" data-v="${k}"><rect x="${x - BX / 2}" y="${y}" width="${BX}" height="${BH}" rx="14" fill="#fff" stroke="#1098ad" stroke-width="2"/>` +
          `<polygon points="${pts}" fill="#c5eef3" stroke="#1098ad" stroke-width="2.5"/>` +
          `<text x="${x + 30}" y="${y + (v.name.length > 14 ? 42 : 54)}" font-size="${v.name.length > 10 ? 16 : 19}" font-weight="700" text-anchor="middle">${offen.has(k) ? (v.name.length > 14 ? "gleichschenkl." : v.name) : "?"}</text>` +
          (offen.has(k) && v.name.length > 14 ? `<text x="${x + 30}" y="${y + 64}" font-size="16" font-weight="700" text-anchor="middle">Trapez</text>` : "") + `</g>`;
      });
      svg.innerHTML = `<defs><marker id="pfeil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#adb5bd"/></marker></defs>` + s;
      svg.querySelectorAll("[data-v]").forEach(g => g.addEventListener("click", () => {
        const k = g.dataset.v; offen.add(k); gewaehlt = k; zeichne();
        const hat = EIGENSCHAFTEN.filter(e => e[1].includes(k)).map(e => e[0]);
        el.querySelector(".steckbrief").innerHTML = `<strong>${VIERECKE[k].name}:</strong> ${hat.length ? hat.join(" · ") : "nur: 4 Ecken, 4 Seiten, Winkelsumme 360°"}`;
      }));
      el.querySelectorAll("[data-e]").forEach(b => b.classList.toggle("an", filter === EIGENSCHAFTEN[b.dataset.e][1]));
    }
    el.querySelectorAll("[data-e]").forEach(b => b.addEventListener("click", () => {
      const f = EIGENSCHAFTEN[b.dataset.e][1];
      filter = filter === f ? null : f;
      el.querySelector(".steckbrief").innerHTML = filter ? `<strong>${EIGENSCHAFTEN[b.dataset.e][0]}:</strong> ${f.map(k => VIERECKE[k].name).join(", ")}. Was fällt dir an den Pfeilen auf?` : "";
      zeichne();
    }));
    zeichne();
  });
})();
