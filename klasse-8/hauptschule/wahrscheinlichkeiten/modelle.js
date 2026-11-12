/*
  Interaktive Modelle für die Einheit „Zufall, Wahrscheinlichkeit und Daten“ (Klasse 8 HS).
  Einbinden nach praesentation.js:  <script src="../modelle.js"></script>
  Leitmodell der Einheit: der 0-bis-1-Streifen (Anteil von 0 % bis 100 %).

  1) DIAGRAMM – eine Datenreihe in verschiedenen Darstellungen („Was passiert, wenn …?“ mit + / −)
     <div data-diagramm='{"daten":[["Fußball",12],["Kino",6]],"ansichten":["strichliste","tabelle","streifen","kreis","saeulen"],
                          "start":"tabelle","bearbeiten":true,"winkel":true,"achse":false,"verdeckt":false}'></div>
        achse: true  → Schieberegler „Achse beginnt bei …“ (Säulen), zeigt Diagramm-Tricks
        verdeckt: true → relative Häufigkeiten/Winkel erst per Knopf zeigen

  2) STREUDIAGRAMM – eindimensional, Punkte auf der Zahlengeraden
     <div data-streu='{"werte":[3,5,5,7],"min":0,"max":20,"schritt":1,"einheit":"m","bearbeiten":true,
                       "zeige":["rangliste","modus","median","mittel","spannweite"]}'></div>
        Klick auf die Achse fügt einen Wert hinzu, Klick auf einen Punkt entfernt ihn.

  3) KLASSEN – Werte in Klassen einteilen, Klassenbreite wählbar
     <div data-klassen='{"werte":[4,7,12],"start":0,"breiten":[2,5,10,20],"breite":5,"einheit":"min"}'></div>

  4) AUSGLEICH – Mittelwert als „gerecht verteilen“ (Steckwürfel-Türme)
     <div data-ausgleich='{"werte":[5,8,3,6,4,10,6],"namen":["Mo","Di","Mi","Do","Fr","Sa","So"],"einheit":"Eier"}'></div>
*/
(function () {
  const FARBEN = ["#e03131", "#1c7ed6", "#2f9e44", "#e8a400", "#ae3ec9", "#1098ad", "#f76707", "#5c7cfa"];
  const z = (x, s = 2) => Number(x).toLocaleString("de-DE", { maximumFractionDigits: s });
  const p = (x, s = 1) => z(x * 100, s) + " %";
  const json = (el, a) => { try { return JSON.parse(el.getAttribute(a)); } catch (e) { console.warn("modelle.js: JSON-Fehler in", a, e); return null; } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const knopf = (text, cls = "") => `<button class="knopf mittel ${cls}" type="button">${text}</button>`;

  const css = document.createElement("style");
  css.textContent = `
  .modell { background: var(--card); border: 2px solid var(--border); border-radius: 16px; padding: .8rem 1rem; margin: .6rem 0; }
  .modell .leiste-m { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin-bottom: .5rem; }
  .modell .knopf.an { background: var(--accent); color: #fff; border-color: var(--accent); }
  .modell svg { width: 100%; height: auto; max-height: 46vh; display: block; }
  .modell .leiste-m:empty { display: none; }
  .modell .tab { max-height: 50vh; overflow: auto; }
  .modell svg text { font-family: system-ui, sans-serif; }
  .modell table { border-collapse: collapse; font-size: 1.25rem; width: 100%; }
  .modell th, .modell td { border: 2px solid var(--border); padding: .3rem .6rem; text-align: center; }
  .modell th { background: var(--accent-hell); }
  .modell td:first-child { text-align: left; font-weight: 700; }
  .modell .pm { display: inline-flex; gap: .2rem; margin-left: .4rem; }
  .modell .pm button { width: 2rem; height: 2rem; border-radius: 8px; border: 2px solid var(--border); background: #fff; font-weight: 800; cursor: pointer; font-size: 1.1rem; }
  .modell .striche { font-family: ui-monospace, monospace; font-size: 1.5rem; letter-spacing: .05rem; text-align: left; }
  .modell .striche s { text-decoration-thickness: 3px; }
  .modell .info { font-size: 1.15rem; color: var(--muted); margin-top: .4rem; }
  .modell .kennzahlen { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .4rem; font-size: 1.25rem; }
  .modell .kennzahlen span { background: var(--accent-hell); border-radius: 8px; padding: .15rem .6rem; }
  .modell .rang { font-size: 1.3rem; margin-top: .4rem; line-height: 1.8; }
  .modell .rang b { display: inline-block; min-width: 2.2rem; text-align: center; border: 2px solid var(--border); border-radius: 6px; margin: 0 .1rem; background: #fff; }
  .modell .rang b.mitte { background: var(--gelb-hell); border-color: var(--gelb); }
  .modell input[type=range] { width: 14rem; vertical-align: middle; }
  `;
  document.head.appendChild(css);

  function beiAktiv(el, fn) {
    const f = el.closest(".folie");
    if (f) f.addEventListener("folie-aktiv", () => requestAnimationFrame(fn));
  }

  // Strichliste: |||| mit Querstrich bei 5
  function strichliste(n) {
    let s = "";
    for (let i = 0; i < Math.floor(n / 5); i++) s += "<s>||||</s> ";
    return s + "|".repeat(n % 5);
  }

  // ---------- 1) DIAGRAMM ----------
  document.querySelectorAll("[data-diagramm]").forEach(el => {
    const c = json(el, "data-diagramm"); if (!c) return;
    const daten = c.daten.map((d, i) => ({ name: d[0], n: d[1], farbe: d[2] || FARBEN[i % FARBEN.length] }));
    const ansichten = c.ansichten || ["tabelle", "streifen", "kreis", "saeulen"];
    const NAMEN = { strichliste: "✏️ Strichliste", tabelle: "🔢 Tabelle", streifen: "▭ Streifen", kreis: "◔ Kreis", saeulen: "📊 Säulen" };
    let ansicht = c.start || ansichten[0];
    let offen = !c.verdeckt;
    let achseStart = c.achseStart || 0;
    el.classList.add("modell");
    el.innerHTML = `<div class="leiste-m">${ansichten.map(a => `<button class="knopf mittel" data-a="${a}" type="button">${NAMEN[a]}</button>`).join("")}
      ${c.verdeckt ? knopf("👁 Anteile zeigen", "zeigen") : ""}</div><div class="flaeche"></div><div class="info"></div>`;
    const flaeche = el.querySelector(".flaeche"), info = el.querySelector(".info");
    el.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { ansicht = b.dataset.a; zeichne(); });
    const zb = el.querySelector(".zeigen");
    if (zb) zb.onclick = () => { offen = !offen; zb.classList.toggle("an", offen); zeichne(); };

    const summe = () => daten.reduce((s, d) => s + d.n, 0);
    function pm(i) { return c.bearbeiten ? `<span class="pm"><button data-m="${i}" type="button">−</button><button data-p="${i}" type="button">+</button></span>` : ""; }

    function tabelle(mitStrichen) {
      const N = summe();
      let h = `<table><tr><th>Antwort</th>${mitStrichen ? "<th>Strichliste</th>" : ""}<th>absolute Häufigkeit</th>`;
      if (!mitStrichen) h += `<th>relative Häufigkeit</th><th>in %</th>${c.winkel ? "<th>Winkel</th>" : ""}`;
      h += "</tr>";
      daten.forEach((d, i) => {
        h += `<tr><td><span style="color:${d.farbe}">■</span> ${esc(d.name)}${pm(i)}</td>`;
        if (mitStrichen) h += `<td class="striche">${strichliste(d.n)}</td>`;
        h += `<td>${d.n}</td>`;
        if (!mitStrichen) {
          const r = N ? d.n / N : 0;
          h += offen ? `<td><span class="bruch"><span>${d.n}</span><span>${N}</span></span> ≈ ${z(r, 2)}</td><td>${p(r)}</td>${c.winkel ? `<td>${z(r * 360, 1)}°</td>` : ""}`
                     : `<td>?</td><td>?</td>${c.winkel ? "<td>?</td>" : ""}`;
        }
        h += "</tr>";
      });
      h += `<tr><th>Summe</th>${mitStrichen ? "<th></th>" : ""}<th>${N}</th>`;
      if (!mitStrichen) h += `<th>${offen ? "1" : "?"}</th><th>${offen ? "100 %" : "?"}</th>${c.winkel ? `<th>${offen ? "360°" : "?"}</th>` : ""}`;
      return h + "</tr></table>";
    }

    function streifen() {
      const N = summe() || 1, B = 1000, H = 190, l = 20, r = 20, y = 40, h = 70;
      let x = l, s = `<svg viewBox="0 0 ${B} ${H}">`;
      daten.forEach(d => {
        const w = d.n / N * (B - l - r);
        if (w > 0) {
          s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${d.farbe}" stroke="#fff" stroke-width="3"/>`;
          if (w > 60) s += `<text x="${x + w / 2}" y="${y + h / 2 + 2}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="20" font-weight="800">${offen ? p(d.n / N, 0) : ""}</text>`;
          s += `<text x="${x + w / 2}" y="${y - 10}" text-anchor="middle" font-size="17" font-weight="700" fill="#1f2430">${esc(d.name)}</text>`;
        }
        x += w;
      });
      for (let i = 0; i <= 10; i++) {
        const xi = l + i / 10 * (B - l - r);
        s += `<line x1="${xi}" x2="${xi}" y1="${y + h}" y2="${y + h + (i % 5 ? 8 : 16)}" stroke="#1f2430" stroke-width="2"/>`;
        if (i % 5 === 0) s += `<text x="${xi}" y="${y + h + 38}" text-anchor="middle" font-size="18" font-weight="700">${["0", "0,5", "1"][i / 5]} · ${i * 10} %</text>`;
      }
      return s + `<rect x="${l}" y="${y}" width="${B - l - r}" height="${h}" fill="none" stroke="#1f2430" stroke-width="3"/></svg>`;
    }

    function kreis() {
      const N = summe() || 1, B = 1000, H = 360, cx = 300, cy = 180, R = 165;
      let a = -Math.PI / 2, s = `<svg viewBox="0 0 ${B} ${H}">`;
      if (daten.filter(d => d.n > 0).length === 1) s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${daten.find(d => d.n > 0).farbe}"/>`;
      daten.forEach(d => {
        const w = d.n / N * 2 * Math.PI; if (w <= 0) return;
        const a2 = a + w, gr = w > Math.PI ? 1 : 0;
        const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
        if (w < 2 * Math.PI - 1e-6) s += `<path d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${gr} 1 ${x2},${y2} Z" fill="${d.farbe}" stroke="#fff" stroke-width="3"/>`;
        const am = a + w / 2;
        if (offen && w > 0.25) s += `<text x="${cx + R * .62 * Math.cos(am)}" y="${cy + R * .62 * Math.sin(am)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="19" font-weight="800">${c.winkel ? z(d.n / N * 360, 0) + "°" : p(d.n / N, 0)}</text>`;
        a = a2;
      });
      let ly = 60;
      daten.forEach(d => {
        s += `<rect x="560" y="${ly - 16}" width="22" height="22" rx="4" fill="${d.farbe}"/><text x="595" y="${ly}" font-size="21" font-weight="700">${esc(d.name)}${offen ? ` · ${p(d.n / N, 0)}` : ""}</text>`;
        ly += 38;
      });
      return s + "</svg>";
    }

    function saeulen() {
      const B = 1000, H = 400, l = 70, r = 20, o = 30, u = 60;
      const max = Math.max(1, ...daten.map(d => d.n));
      const oben = Math.ceil(max * 1.1);
      const yv = v => H - u - (v - achseStart) / (oben - achseStart) * (H - u - o);
      const bw = (B - l - r) / daten.length;
      let s = `<svg viewBox="0 0 ${B} ${H}">`;
      const schritt = Math.max(1, Math.ceil((oben - achseStart) / 8));
      for (let v = achseStart; v <= oben; v += schritt) {
        s += `<line x1="${l}" x2="${B - r}" y1="${yv(v)}" y2="${yv(v)}" stroke="#e2e6ef" stroke-width="2"/><text x="${l - 10}" y="${yv(v) + 6}" text-anchor="end" font-size="17">${v}</text>`;
      }
      daten.forEach((d, i) => {
        const x = l + i * bw + bw * .18, w = bw * .64, y = yv(Math.max(d.n, achseStart));
        s += `<rect x="${x}" y="${y}" width="${w}" height="${H - u - y}" fill="${d.farbe}" rx="4"/>`;
        s += `<text x="${x + w / 2}" y="${y - 8}" text-anchor="middle" font-size="19" font-weight="800">${d.n}</text>`;
        s += `<text x="${x + w / 2}" y="${H - u + 28}" text-anchor="middle" font-size="18" font-weight="700">${esc(d.name)}</text>`;
      });
      s += `<line x1="${l}" x2="${l}" y1="${o}" y2="${H - u}" stroke="#1f2430" stroke-width="3"/><line x1="${l}" x2="${B - r}" y1="${H - u}" y2="${H - u}" stroke="#1f2430" stroke-width="3"/>`;
      if (achseStart > 0) s += `<path d="M${l - 12},${H - u - 18} l24,-8 M${l - 12},${H - u - 8} l24,-8" stroke="#e03131" stroke-width="3"/>`;
      s += "</svg>";
      if (c.achse) s += `<div class="info">Achse beginnt bei <input type="range" class="achse" min="0" max="${Math.max(0, Math.min(...daten.map(d => d.n)) - 1)}" value="${achseStart}"> <b>${achseStart}</b></div>`;
      return s;
    }

    function zeichne() {
      el.querySelectorAll("[data-a]").forEach(b => b.classList.toggle("an", b.dataset.a === ansicht));
      const N = summe();
      flaeche.innerHTML = { strichliste: () => tabelle(true), tabelle: () => tabelle(false), streifen, kreis, saeulen }[ansicht]();
      info.innerHTML = ansicht === "saeulen" ? "" : `Insgesamt: <b>${N}</b> Antworten${c.bearbeiten ? " · Mit + / − ändern: Was passiert, wenn …?" : ""}`;
      if (c.bearbeiten && (ansicht === "streifen" || ansicht === "kreis" || ansicht === "saeulen")) {
        info.innerHTML += "<br>" + daten.map((d, i) => `<span style="white-space:nowrap;margin-right:1rem"><span style="color:${d.farbe}">■</span> ${esc(d.name)} ${d.n}${pm(i)}</span>`).join("");
      }
      el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { daten[b.dataset.p].n++; zeichne(); });
      el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { const d = daten[b.dataset.m]; if (d.n > 0) d.n--; zeichne(); });
      const ac = el.querySelector(".achse");
      if (ac) ac.oninput = () => { achseStart = Number(ac.value); zeichne(); };
    }
    zeichne();
  });

  // ---------- Kennzahlen ----------
  const sortiert = w => w.slice().sort((a, b) => a - b);
  function median(w) { const s = sortiert(w), n = s.length; if (!n) return null; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  function mittel(w) { return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null; }
  function modus(w) {
    const h = {}; w.forEach(x => h[x] = (h[x] || 0) + 1);
    const m = Math.max(0, ...Object.values(h));
    return m < 2 ? [] : Object.keys(h).filter(k => h[k] === m).map(Number);
  }
  window.Kennzahlen = { median, mittel, modus };

  // ---------- 2) STREUDIAGRAMM ----------
  document.querySelectorAll("[data-streu]").forEach(el => {
    const c = json(el, "data-streu"); if (!c) return;
    const werte = c.werte.slice();
    const zeige = c.zeige || ["rangliste", "modus", "median", "mittel", "spannweite"];
    const an = new Set();
    const NAMEN = { rangliste: "↕ Rangliste", modus: "Modus", median: "Median", mittel: "Mittelwert", spannweite: "Spannweite" };
    const FARBE = { modus: "#ae3ec9", median: "#e8a400", mittel: "#1c7ed6", spannweite: "#e03131" };
    const e = c.einheit ? " " + c.einheit : "";
    el.classList.add("modell");
    el.innerHTML = `<div class="leiste-m">${zeige.map(k => `<button class="knopf mittel" data-k="${k}" type="button">${NAMEN[k]}</button>`).join("")}</div>
      <svg viewBox="0 0 1000 ${c.hoehe || 300}"></svg><div class="rang"></div><div class="kennzahlen"></div><div class="info"></div>`;
    const svg = el.querySelector("svg");
    el.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { an.has(b.dataset.k) ? an.delete(b.dataset.k) : an.add(b.dataset.k); b.classList.toggle("an"); zeichne(); });
    const B = 1000, l = 40, r = 40, y0 = (c.hoehe || 300) - 70, schritt = c.schritt || 1;
    const x = v => l + (v - c.min) / (c.max - c.min) * (B - l - r);
    const v = px => Math.round((c.min + (px - l) / (B - l - r) * (c.max - c.min)) / schritt) * schritt;

    function zeichne() {
      let s = `<line x1="${l}" x2="${B - r}" y1="${y0}" y2="${y0}" stroke="#1f2430" stroke-width="3"/>`;
      const teile = c.teilung || Math.max(schritt, Math.ceil((c.max - c.min) / 20 / schritt) * schritt);
      for (let t = c.min; t <= c.max + 1e-9; t += teile) {
        s += `<line x1="${x(t)}" x2="${x(t)}" y1="${y0 - 8}" y2="${y0 + 8}" stroke="#1f2430" stroke-width="2"/>`;
        s += `<text x="${x(t)}" y="${y0 + 32}" text-anchor="middle" font-size="17">${z(t)}</text>`;
      }
      s += `<text x="${B - r}" y="${y0 + 58}" text-anchor="end" font-size="17" fill="#5b6475">${esc(c.einheit || "")}</text>`;
      const stapel = {};
      sortiert(werte).forEach(w => {
        const k = stapel[w] = (stapel[w] || 0) + 1;
        s += `<circle class="pkt" data-w="${w}" cx="${x(w)}" cy="${y0 - 14 - (k - 1) * 22}" r="10" fill="#1098ad" stroke="#fff" stroke-width="2" style="cursor:pointer"/>`;
      });
      const kz = [];
      const linie = (wert, farbe, text, hoehe) => {
        s += `<line x1="${x(wert)}" x2="${x(wert)}" y1="${y0 + 4}" y2="${hoehe}" stroke="${farbe}" stroke-width="4" stroke-dasharray="8 5"/>`;
        s += `<text x="${x(wert)}" y="${hoehe - 6}" text-anchor="middle" font-size="18" font-weight="800" fill="${farbe}">${text}</text>`;
      };
      if (werte.length) {
        if (an.has("spannweite")) {
          const mi = Math.min(...werte), ma = Math.max(...werte);
          s += `<line x1="${x(mi)}" x2="${x(ma)}" y1="${y0 + 46}" y2="${y0 + 46}" stroke="${FARBE.spannweite}" stroke-width="4"/>`;
          kz.push(`<span style="color:${FARBE.spannweite}">Spannweite: ${z(ma)} − ${z(mi)} = <b>${z(ma - mi)}${e}</b></span>`);
        }
        if (an.has("modus")) { const m = modus(werte); m.forEach(w => linie(w, FARBE.modus, "Modus", Math.max(24, y0 - 190))); kz.push(`<span style="color:${FARBE.modus}">Modus: <b>${m.length ? m.map(w => z(w)).join(" und ") + e : "keiner (jeder Wert nur einmal)"}</b></span>`); }
        if (an.has("median")) { const m = median(werte); linie(m, FARBE.median, "Median", Math.max(48, y0 - 160)); kz.push(`<span style="color:#b07d00">Median: <b>${z(m)}${e}</b></span>`); }
        if (an.has("mittel")) { const m = mittel(werte); linie(m, FARBE.mittel, "Mittelwert", Math.max(72, y0 - 130)); kz.push(`<span style="color:${FARBE.mittel}">Mittelwert: ${z(werte.reduce((a, b) => a + b, 0))} : ${werte.length} ≈ <b>${z(m, 1)}${e}</b></span>`); }
      }
      svg.innerHTML = s;
      el.querySelector(".kennzahlen").innerHTML = kz.join("");
      const rang = el.querySelector(".rang");
      if (an.has("rangliste") || an.has("median")) {
        const so = sortiert(werte), n = so.length;
        const mitte = n % 2 ? [(n - 1) / 2] : [n / 2 - 1, n / 2];
        rang.innerHTML = "Rangliste: " + so.map((w, i) => `<b class="${an.has("median") && mitte.includes(i) ? "mitte" : ""}">${z(w)}</b>`).join(" ");
      } else rang.innerHTML = "";
      el.querySelector(".info").textContent = `${werte.length} Werte${c.bearbeiten ? " · Klick auf die Achse: Wert dazu · Klick auf einen Punkt: Wert weg" : ""}`;
      if (c.bearbeiten) svg.querySelectorAll(".pkt").forEach(k => k.onclick = ev => {
        ev.stopPropagation(); const i = werte.indexOf(Number(k.dataset.w)); if (i >= 0) werte.splice(i, 1); zeichne();
      });
    }
    if (c.bearbeiten) svg.addEventListener("click", ev => {
      const r0 = svg.getBoundingClientRect();
      const px = (ev.clientX - r0.left) / r0.width * B;
      const w = v(px);
      if (w >= c.min && w <= c.max) { werte.push(w); zeichne(); }
    });
    zeichne();
  });

  // ---------- 3) KLASSEN ----------
  document.querySelectorAll("[data-klassen]").forEach(el => {
    const c = json(el, "data-klassen"); if (!c) return;
    let breite = c.breite || c.breiten[0];
    const e = c.einheit ? " " + c.einheit : "";
    el.classList.add("modell");
    el.innerHTML = `<div class="leiste-m">Klassenbreite: ${c.breiten.map(b => `<button class="knopf mittel" data-b="${b}" type="button">${b}${e}</button>`).join("")}</div>
      <div class="zweispaltig" style="gap:1rem;align-items:start"><div class="tab"></div><svg viewBox="0 0 600 360"></svg></div><div class="info"></div>`;
    el.querySelectorAll("[data-b]").forEach(b => b.onclick = () => { breite = Number(b.dataset.b); zeichne(); });
    function zeichne() {
      el.querySelectorAll("[data-b]").forEach(b => b.classList.toggle("an", Number(b.dataset.b) === breite));
      const start = c.start ?? 0, max = Math.max(...c.werte);
      const klassen = [];
      for (let a = start; a <= max; a += breite) klassen.push({ von: a, bis: a + breite, n: c.werte.filter(w => w >= a && w < a + breite).length });
      let t = `<table><tr><th>Klasse</th><th>Strichliste</th><th>Anzahl</th></tr>`;
      klassen.forEach(k => t += `<tr><td>${k.von} bis unter ${k.bis}${e}</td><td class="striche">${strichliste(k.n)}</td><td>${k.n}</td></tr>`);
      el.querySelector(".tab").innerHTML = t + `<tr><th>Summe</th><th></th><th>${c.werte.length}</th></tr></table>`;
      const svg = el.querySelector("svg"), W = 600, H = 360, l = 40, u = 50, o = 20;
      const mx = Math.max(1, ...klassen.map(k => k.n)), bw = (W - l - 10) / klassen.length;
      let s = `<line x1="${l}" x2="${l}" y1="${o}" y2="${H - u}" stroke="#1f2430" stroke-width="3"/><line x1="${l}" x2="${W - 10}" y1="${H - u}" y2="${H - u}" stroke="#1f2430" stroke-width="3"/>`;
      klassen.forEach((k, i) => {
        const h = k.n / mx * (H - u - o - 20), xk = l + i * bw;
        s += `<rect x="${xk + 3}" y="${H - u - h}" width="${bw - 6}" height="${h}" fill="#1098ad" rx="3"/>`;
        if (k.n) s += `<text x="${xk + bw / 2}" y="${H - u - h - 6}" text-anchor="middle" font-size="16" font-weight="800">${k.n}</text>`;
        if (klassen.length <= 12 || i % 2 === 0) s += `<text x="${xk + bw / 2}" y="${H - u + 22}" text-anchor="middle" font-size="${klassen.length > 8 ? 12 : 15}">${k.von}–${k.bis}</text>`;
      });
      svg.innerHTML = s;
      el.querySelector(".info").textContent = `${c.werte.length} Werte · ${klassen.length} Klassen. Was passiert, wenn die Klassen breiter oder schmaler werden?`;
    }
    zeichne();
  });

  // ---------- 4) AUSGLEICH ----------
  document.querySelectorAll("[data-ausgleich]").forEach(el => {
    const c = json(el, "data-ausgleich"); if (!c) return;
    const start = c.werte.slice();
    let werte = start.slice(), ausgeglichen = false;
    const e = c.einheit ? " " + c.einheit : "";
    el.classList.add("modell");
    el.innerHTML = `<div class="leiste-m">${knopf("⚖️ Gerecht verteilen", "aus")}${knopf("↺ Zurück", "zur")}${knopf("➕ Turm dazu", "dazu")}</div>
      <svg viewBox="0 0 1000 380"></svg><div class="kennzahlen"></div>`;
    const svg = el.querySelector("svg");
    function zeichne() {
      const n = werte.length, gesamt = werte.reduce((a, b) => a + b, 0), m = gesamt / n;
      const B = 1000, u = 50, o = 20, max = Math.max(...start, ...werte, 1), hz = Math.min(30, (380 - u - o) / max), bw = Math.min(110, (B - 40) / n);
      let s = "";
      werte.forEach((w, i) => {
        const x0 = 20 + i * bw + bw * .2, bb = bw * .6;
        const ganz = Math.floor(w + 1e-9), rest = w - ganz;
        for (let k = 0; k < ganz; k++) s += `<rect x="${x0}" y="${380 - u - (k + 1) * hz}" width="${bb}" height="${hz - 3}" rx="4" fill="${FARBEN[i % FARBEN.length]}"/>`;
        if (rest > 1e-6) s += `<rect x="${x0}" y="${380 - u - ganz * hz - rest * hz}" width="${bb}" height="${rest * hz - 3}" rx="4" fill="${FARBEN[i % FARBEN.length]}" opacity=".55"/>`;
        s += `<text x="${x0 + bb / 2}" y="${380 - u + 22}" text-anchor="middle" font-size="17" font-weight="700">${esc((c.namen || [])[i] || i + 1)}</text>`;
        s += `<text x="${x0 + bb / 2}" y="${380 - u - w * hz - 8}" text-anchor="middle" font-size="17" font-weight="800">${z(w, 1)}</text>`;
      });
      if (ausgeglichen) s += `<line x1="10" x2="${B - 10}" y1="${380 - u - m * hz}" y2="${380 - u - m * hz}" stroke="#1c7ed6" stroke-width="4" stroke-dasharray="10 6"/>`;
      svg.innerHTML = s;
      el.querySelector(".kennzahlen").innerHTML = `<span>Zusammen: <b>${z(gesamt)}${e}</b></span><span>Anzahl: <b>${n}</b></span>` +
        (ausgeglichen ? `<span style="color:#1c7ed6">Jeder bekommt gleich viel: ${z(gesamt)} : ${n} ≈ <b>${z(m, 1)}${e}</b> = Mittelwert</span>` : "");
    }
    el.querySelector(".aus").onclick = () => { const m = werte.reduce((a, b) => a + b, 0) / werte.length; werte = werte.map(() => m); ausgeglichen = true; zeichne(); };
    el.querySelector(".zur").onclick = () => { werte = start.slice(); ausgeglichen = false; zeichne(); };
    el.querySelector(".dazu").onclick = () => {
      const w = Number(prompt("Wie hoch ist der neue Turm?", "12")); if (!(w >= 0)) return;
      start.push(w); if (c.namen) c.namen.push("neu"); werte = start.slice(); ausgeglichen = false; zeichne();
    };
    zeichne();
  });
})();
