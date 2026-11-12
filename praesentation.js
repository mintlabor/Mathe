/*
  Gemeinsame Steuerung für alle Unterrichtsstunden.

  Aufbau einer Stunde:
    <body data-phasen='[["Einstieg",5],["Erarbeitung",15],...]'>
      <div class="leiste"> ... Pfad ... </div>   (Phasen + Timer werden automatisch ergänzt)
      <div class="buehne">
        <section class="folie" data-phase="Einstieg"> ... </section>
        <section class="folie" data-phase="Erarbeitung" data-minuten="8"> ... </section>
      </div>
    </body>                                       (Fußleiste wird automatisch ergänzt)

  Bausteine:
    .schritt                      wird mit → / Leertaste nacheinander aufgedeckt
    .hinweis                      Lehrerhinweis, mit Taste N ein-/ausblenden
    <div data-wuerfel>            Würfel mit Knopf (Ereignis "gewuerfelt", detail = Augenzahl)
    <div data-muenze>             Münze mit Knopf  (Ereignis "geworfen", detail = "Kopf"/"Zahl")
    <div data-gluecksrad='[["1","#e03131"],["2","#1c7ed6"],...]'>
                                  Glücksrad          (Ereignis "gedreht", detail = Feld-Index)
    .karten .karte                Klick deckt Lösung auf; [data-alle-auf] / [data-alle-zu]
    <span class="eis" data-eis="EI"></span>   EIS-Kennzeichnung (Enaktiv · Ikonisch · Symbolisch)
    <div data-tipps><div class="tipp">…</div></div>   gestufte Hilfen, einzeln aufklappbar
    .lernziele / .tps / .vernetzen / .ampel  Lernziele, Think-Pair-Share, Vernetzungsimpuls, Selbsteinschätzung

  Stundenmodell: Abrufen → Problem + Lernziel → eigene Lösung (allein – zu zweit – Klasse, mit Tipps)
                 → Lösungsideen vergleichen → Sichern (E → I → S, Darstellungen verbinden)
                 → Üben (Schülerseite) → Reflexion (Exit-Ticket, Ampel)

  Tasten: → Leertaste weiter · ← zurück · T Timer · N Hinweise · F Vollbild
*/
(function () {
  const body = document.body;
  const PHASEN = JSON.parse(body.dataset.phasen || "[]");
  const folien = Array.from(document.querySelectorAll(".folie"));
  let aktuell = 0;

  // ---------- Kopfleiste ergänzen ----------
  const leiste = document.querySelector(".leiste");
  const phasenEl = document.createElement("div");
  phasenEl.className = "phasen";
  PHASEN.forEach(([name, min]) => {
    const p = document.createElement("span");
    p.className = "phase";
    p.textContent = name + " · " + min + "′";
    phasenEl.appendChild(p);
  });
  leiste.appendChild(phasenEl);

  const timerEl = document.createElement("div");
  timerEl.className = "timer";
  timerEl.title = "Timer der aktuellen Phase (Taste T)";
  timerEl.innerHTML = '<span class="zeit">0:00</span>' +
    '<button class="knopf" data-t="start">▶</button>' +
    '<button class="knopf" data-t="reset" title="Zurücksetzen">↺</button>';
  leiste.appendChild(timerEl);

  // Fortschritt der Stunde (geplante Minuten bis zum Ende der aktuellen Phase)
  const fortschrittEl = document.createElement("div");
  fortschrittEl.className = "stundenfortschritt";
  fortschrittEl.innerHTML = "<i></i>";
  leiste.appendChild(fortschrittEl);
  const GESAMT = PHASEN.reduce((a, p) => a + p[1], 0) || 1;

  // ---------- Folien zweispaltig: links Arbeitsauftrag, rechts Material ----------
  // Opt-out: <section class="folie" data-layout="einspaltig">
  const LINKS = ".problem, .spannung, .lernziele, [data-denkzeit], [data-methode], [data-tipps], .satzhilfe, .produkt, .vernetzen, .fehlerkarte, .ampel, .auftrag, p, ol, ul";
  folien.forEach(f => {
    if (f.classList.contains("mitte") || f.dataset.layout === "einspaltig") return;
    const links = [], rechts = [], unten = [];
    Array.from(f.children).forEach(k => {
      if (k.matches(".kennung, h1, h2")) return;
      if (k.matches(".hinweis")) unten.push(k);
      else if (k.matches(LINKS)) links.push(k);
      else rechts.push(k);
    });
    if (!links.length || !rechts.length) return;
    const spalten = document.createElement("div");
    spalten.className = "spalten";
    const l = document.createElement("div"); l.className = "spalte-auftrag";
    const r = document.createElement("div"); r.className = "spalte-material";
    links.forEach(k => l.appendChild(k));
    rechts.forEach(k => r.appendChild(k));
    spalten.append(l, r);
    f.insertBefore(spalten, unten[0] || null);
  });

  // ---------- Fußleiste ergänzen ----------
  const fuss = document.createElement("div");
  fuss.className = "fuss";
  fuss.innerHTML = '<div class="foliennr"></div><div class="nav">' +
    '<button class="knopf" data-n="zurueck">← Zurück</button>' +
    '<button class="knopf" data-n="weiter">Weiter →</button>' +
    '<button class="knopf" data-n="notizen" title="Taste N">Hinweise</button>' +
    '<button class="knopf" data-n="vollbild" title="Taste F">Vollbild</button></div>';
  body.appendChild(fuss);

  // ---------- Timer ----------
  const zeitEl = timerEl.querySelector(".zeit");
  const startBtn = timerEl.querySelector('[data-t="start"]');
  let rest = 0, laeuft = false, intervall = null, timerSchluessel = null;

  function zeigeZeit() {
    const neg = rest < 0, s = Math.abs(rest);
    zeitEl.textContent = (neg ? "−" : "") + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    timerEl.classList.toggle("ablauf", rest <= 0);
  }
  function stopp() { laeuft = false; startBtn.textContent = "▶"; clearInterval(intervall); }
  function start() {
    if (laeuft) return;
    laeuft = true; startBtn.textContent = "❚❚";
    intervall = setInterval(() => { rest--; zeigeZeit(); }, 1000);
  }
  function minutenFuer(f) {
    if (f.dataset.minuten) return Number(f.dataset.minuten);
    const p = PHASEN.find(p => p[0] === f.dataset.phase);
    return p ? p[1] : 0;
  }
  function timerSetzen(min) { stopp(); rest = Math.round(min * 60); zeigeZeit(); }
  startBtn.onclick = () => laeuft ? stopp() : start();
  timerEl.querySelector('[data-t="reset"]').onclick = () => timerSetzen(minutenFuer(folien[aktuell]));

  // ---------- Folien ----------
  function zeige(i) {
    aktuell = Math.max(0, Math.min(folien.length - 1, i));
    folien.forEach((f, n) => f.classList.toggle("aktiv", n === aktuell));
    const f = folien[aktuell];
    const pi = PHASEN.findIndex(p => p[0] === f.dataset.phase);
    phasenEl.querySelectorAll(".phase").forEach((p, n) => {
      p.classList.toggle("aktiv", n === pi);
      p.classList.toggle("fertig", n < pi);
    });
    const schluessel = f.dataset.minuten ? "folie" + aktuell : f.dataset.phase;
    if (schluessel !== timerSchluessel) { timerSchluessel = schluessel; timerSetzen(minutenFuer(f)); }
    fuss.querySelector(".foliennr").textContent = "Folie " + (aktuell + 1) + " / " + folien.length;
    const bis = PHASEN.slice(0, pi + 1).reduce((a, p) => a + p[1], 0);
    fortschrittEl.querySelector("i").style.width = (pi < 0 ? 0 : Math.min(100, bis / GESAMT * 100)) + "%";
    fortschrittEl.title = pi < 0 ? "" : "Geplant bis Minute " + bis + " von " + GESAMT;
    f.dispatchEvent(new CustomEvent("folie-aktiv"));
  }
  function weiter() {
    const verdeckt = folien[aktuell].querySelector(".schritt:not(.sichtbar)");
    if (verdeckt) { verdeckt.classList.add("sichtbar"); return; }
    if (aktuell < folien.length - 1) zeige(aktuell + 1);
  }
  function zurueck() {
    const offen = folien[aktuell].querySelectorAll(".schritt.sichtbar");
    if (offen.length) { offen[offen.length - 1].classList.remove("sichtbar"); return; }
    if (aktuell > 0) zeige(aktuell - 1);
  }
  function vollbild() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  const aktionen = {
    weiter, zurueck, vollbild,
    notizen: () => body.classList.toggle("notizen")
  };
  fuss.querySelectorAll("[data-n]").forEach(b => b.onclick = () => aktionen[b.dataset.n]());

  document.addEventListener("keydown", e => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); weiter(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); zurueck(); }
    else if (e.key === "n" || e.key === "N") aktionen.notizen();
    else if (e.key === "f" || e.key === "F") vollbild();
    else if (e.key === "t" || e.key === "T") laeuft ? stopp() : start();
  });

  // ---------- EIS-Kennzeichnung: <span class="eis" data-eis="EI"></span> ----------
  document.querySelectorAll(".eis[data-eis]").forEach(el => {
    const an = el.dataset.eis.toUpperCase();
    const namen = { E: "enaktiv – handeln", I: "ikonisch – Bild", S: "symbolisch – Zeichen/Formel" };
    el.title = "EIS-Prinzip: " + [...an].map(b => namen[b]).filter(Boolean).join(", ");
    el.innerHTML = ["E", "I", "S"].map(b => `<span class="${an.includes(b) ? "an" : ""}">${b}</span>`).join("");
  });

  // ---------- Gestufte Hilfen: <div data-tipps><div class="tipp">…</div>…</div> ----------
  document.querySelectorAll("[data-tipps]").forEach(box => {
    box.classList.add("tipps");
    const tipps = Array.from(box.querySelectorAll(".tipp"));
    const leiste = document.createElement("div");
    leiste.className = "knoepfe";
    tipps.forEach((t, i) => {
      t.dataset.nr = "Tipp " + (i + 1);
      const b = document.createElement("button");
      b.className = "knopf mittel";
      b.textContent = "💡 Tipp " + (i + 1);
      b.onclick = () => { t.classList.toggle("offen"); b.classList.toggle("gewaehlt"); };
      leiste.appendChild(b);
    });
    box.prepend(leiste);
  });

  // ---------- Ampel: <div class="ampel"><div class="zeile"><span>Ich kann …</span></div></div> ----------
  document.querySelectorAll(".ampel .zeile").forEach(z => {
    const p = document.createElement("span");
    p.className = "punkte";
    p.innerHTML = '<i style="background:#2f9e44"></i><i style="background:#e8a400"></i><i style="background:#e03131"></i>';
    z.appendChild(p);
  });

  // ---------- Würfel ----------
  const MUSTER = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  document.querySelectorAll("[data-wuerfel]").forEach(feld => {
    feld.classList.add("feld");
    const w = document.createElement("div");
    w.className = "wuerfel";
    w.innerHTML = "<span></span>".repeat(9);
    const knopf = document.createElement("button");
    knopf.className = "knopf gross";
    knopf.textContent = feld.dataset.text || "Würfeln";
    const verlauf = document.createElement("div");
    verlauf.className = "verlauf";
    feld.append(w, knopf, verlauf);
    const punkte = w.querySelectorAll("span");
    const zeigeAugen = z => punkte.forEach((p, i) => p.classList.toggle("an", MUSTER[z].includes(i)));
    zeigeAugen(5);
    const liste = [];
    knopf.onclick = () => {
      knopf.disabled = true; w.classList.add("wackeln");
      let n = 0;
      const iv = setInterval(() => {
        zeigeAugen(1 + Math.floor(Math.random() * 6));
        if (++n >= 12) {
          clearInterval(iv);
          const z = 1 + Math.floor(Math.random() * 6);
          zeigeAugen(z); w.classList.remove("wackeln"); knopf.disabled = false;
          liste.push(z);
          verlauf.textContent = "Bisher: " + liste.slice(-10).join(", ");
          feld.dispatchEvent(new CustomEvent("gewuerfelt", { detail: z }));
        }
      }, 70);
    };
  });

  // ---------- Münze ----------
  document.querySelectorAll("[data-muenze]").forEach(feld => {
    feld.classList.add("feld");
    const m = document.createElement("div");
    m.className = "muenze"; m.textContent = "?";
    const knopf = document.createElement("button");
    knopf.className = "knopf gross"; knopf.textContent = "Münze werfen";
    const verlauf = document.createElement("div");
    verlauf.className = "verlauf";
    feld.append(m, knopf, verlauf);
    const liste = [];
    knopf.onclick = () => {
      knopf.disabled = true; m.textContent = ""; m.classList.add("dreh");
      setTimeout(() => {
        const e = Math.random() < 0.5 ? "Kopf" : "Zahl";
        m.classList.remove("dreh"); m.textContent = e; knopf.disabled = false;
        liste.push(e);
        verlauf.textContent = "Bisher: " + liste.slice(-8).join(", ");
        feld.dispatchEvent(new CustomEvent("geworfen", { detail: e }));
      }, 900);
    };
  });

  // ---------- Glücksrad ----------
  document.querySelectorAll("[data-gluecksrad]").forEach(feld => {
    const felder = JSON.parse(feld.dataset.gluecksrad);
    feld.classList.add("feld");
    const n = felder.length, r = 140, c = 150;
    let svg = '<svg class="rad" viewBox="0 0 300 300">';
    felder.forEach(([text, farbe], i) => {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0);
      const x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
      const gross = a1 - a0 > Math.PI ? 1 : 0;
      svg += `<path d="M${c},${c} L${x0},${y0} A${r},${r} 0 ${gross} 1 ${x1},${y1} Z" fill="${farbe}" stroke="#fff" stroke-width="3"/>`;
      const am = (a0 + a1) / 2;
      svg += `<text x="${c + r * 0.68 * Math.cos(am)}" y="${c + r * 0.68 * Math.sin(am)}" text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="800" fill="#fff">${text}</text>`;
    });
    svg += `<circle cx="${c}" cy="${c}" r="14" fill="#1f2430"/></svg>`;
    const huelle = document.createElement("div");
    huelle.className = "rad-huelle";
    huelle.innerHTML = svg + '<div class="zeiger"></div>';
    const knopf = document.createElement("button");
    knopf.className = "knopf gross"; knopf.textContent = "Drehen";
    const verlauf = document.createElement("div");
    verlauf.className = "verlauf";
    feld.append(huelle, knopf, verlauf);
    const rad = huelle.querySelector("svg");
    let winkel = 0;
    const liste = [];
    knopf.onclick = () => {
      knopf.disabled = true;
      const ziel = Math.floor(Math.random() * n);
      const feldMitte = (ziel + 0.5) * 360 / n;
      const zufall = (Math.random() - 0.5) * (360 / n) * 0.7;
      const basis = winkel - (winkel % 360);
      winkel = basis + 360 * 5 + (360 - feldMitte) + zufall;
      rad.style.transform = `rotate(${winkel}deg)`;
      setTimeout(() => {
        knopf.disabled = false;
        liste.push(felder[ziel][0]);
        verlauf.textContent = "Bisher: " + liste.slice(-10).join(", ");
        feld.dispatchEvent(new CustomEvent("gedreht", { detail: ziel }));
      }, 3100);
    };
  });

  // ---------- Sortierkarten ----------
  document.querySelectorAll(".karten").forEach(gruppe => {
    const karten = gruppe.querySelectorAll(".karte");
    karten.forEach(k => k.addEventListener("click", () => k.classList.toggle("offen")));
    const folie = gruppe.closest(".folie");
    folie.querySelectorAll("[data-alle-auf]").forEach(b => b.onclick = () => karten.forEach(k => k.classList.add("offen")));
    folie.querySelectorAll("[data-alle-zu]").forEach(b => b.onclick = () => karten.forEach(k => k.classList.remove("offen")));
  });

  // Hilfsfunktionen für einzelne Stunden und für bausteine.js
  window.Praes = {
    // Haupt-Timer auf Minuten setzen und starten (z. B. aus einem Methoden-Schritt)
    timer: min => { timerSetzen(min); start(); },
    fuss,
    // Zahl deutsch formatieren: 0.625 -> "0,625"
    zahl: (x, stellen = 2) => x.toLocaleString("de-DE", { maximumFractionDigits: stellen }),
    prozent: (x, stellen = 1) => (x * 100).toLocaleString("de-DE", { maximumFractionDigits: stellen }) + " %"
  };

  zeige(0);

  // Aktivierende Bausteine nachladen (Abstimmung, Zufall, Schätzen, Methoden, Wortspeicher …)
  const eigen = document.currentScript || document.querySelector('script[src$="praesentation.js"]');
  if (eigen && !window.BausteineGeladen) {
    const b = document.createElement("script");
    b.src = new URL("bausteine.js", eigen.src).href;
    document.body.appendChild(b);
  }
})();
