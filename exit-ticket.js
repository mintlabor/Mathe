/*
  Exit-Ticket: diagnostische Sicherung am Ende einer Stunde.

  Die Seite enthält die Daten als JSON (keine Programmierung nötig):
    <script type="application/json" id="exit-daten">{ … }</script>
    <div id="exit"></div>
    <script src="…/qr.js"></script>
    <script src="…/exit-ticket.js"></script>

  Datenformat:
  {
    "titel": "Wie wahrscheinlich ist das?",
    "stunde": 5,
    "lernziele": [
      { "text": "Ich kann …", "foerdern": "Buch S. 85 Nr. 1–2", "fordern": "Buch S. 87 Nr. 9" }
    ],
    "fehlertypen": { "f1": "Zähler und Nenner vertauscht" },
    "fragen": [
      { "lz": 0, "typ": "auswahl", "frage": "…", "optionen": ["…","…","…"], "loesung": 1,
        "fehler": { "0": "f1" }, "erklaerung": "…" },
      { "lz": 1, "typ": "zahl", "frage": "…", "einheit": "%", "loesung": 60, "toleranz": 0.01,
        "fehler": [ { "wert": 0.6, "id": "f2" } ], "erklaerung": "…" }
    ]
  }

  Ablauf für Schüler: Kürzel → Fragen → Selbsteinschätzung → Ergebnis mit Ampel,
  Empfehlung und QR-Code. Die Lehrkraft scannt den QR-Code mit ihrem Gerät;
  er öffnet die Auswertungsseite und trägt das Ergebnis dort ein.
  Es werden keine Daten an einen Server geschickt.

  Ergebniscode: M1.KÜRZEL.JJMMTT.TICKET.IST.FEHLER.SELBST.RICHTIG-GESAMT.PRÜFZEICHEN
    IST / SELBST: je Lernziel ein Buchstabe g (grün), y (gelb), r (rot), x (keine Angabe)
*/
(function () {
  const skript = document.currentScript;
  const WURZEL = new URL("./", skript.src);
  const AMPEL = { g: "🟢", y: "🟡", r: "🔴", x: "⚪" };
  const AMPEL_TEXT = { g: "sicher", y: "fast", r: "noch nicht", x: "–" };

  const datenEl = document.getElementById("exit-daten");
  const ziel = document.getElementById("exit");
  if (!datenEl || !ziel) return;
  let D;
  try { D = JSON.parse(datenEl.textContent); }
  catch (e) { ziel.innerHTML = `<div class="box">⚠️ Fehler in den Exit-Ticket-Daten: ${e.message}</div>`; return; }

  // ---------- Ticket-Kennung aus dem Pfad ----------
  function ticketId() {
    const p = decodeURIComponent(location.pathname);
    let t = p.match(/klasse-(\d+)\/(hauptschule|realschule)\/([a-z0-9-]+)\/schueler\/exit-([a-z0-9-]+)\.html$/);
    if (t) return `k${t[1]}/${t[2] === "hauptschule" ? "hs" : "rs"}/${t[3]}/${t[4]}`;
    if (/vorlage\/schueler\/exit-[a-z0-9-]+\.html$/.test(p)) return "vorlage";
    return D.id || "unbekannt";
  }
  const TICKET = ticketId();
  const SPEICHER = "exit-" + TICKET;

  function pruefzeichen(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h + (i + 1) * s.charCodeAt(i)) % 1296;
    return h.toString(36).toUpperCase().padStart(2, "0");
  }
  function datum() {
    const d = new Date(), z = n => String(n).padStart(2, "0");
    return String(d.getFullYear()).slice(2) + z(d.getMonth() + 1) + z(d.getDate());
  }

  // Einheiten, Leerzeichen und Tausenderpunkte ignorieren; Komma oder Punkt als Dezimalzeichen
  const norm = t => {
    let s = String(t).replace(/[^0-9,.\-]/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    return s;
  };
  const zahlGleich = (a, b, tol) => Math.abs(a - b) <= (tol ?? 0.001);

  // Bewertet eine Antwort: { ok, fehler }
  function bewerte(f, antwort) {
    if (antwort === null || antwort === "") return { ok: false, fehler: null, leer: true };
    if (f.typ === "auswahl") {
      const k = Number(antwort);
      return { ok: k === f.loesung, fehler: k === f.loesung ? null : (f.fehler || {})[k] || null };
    }
    const x = parseFloat(norm(antwort));
    if (!Number.isFinite(x)) return { ok: false, fehler: null };
    if ([].concat(f.loesung).some(l => zahlGleich(l, x, f.toleranz))) return { ok: true, fehler: null };
    const treffer = (f.fehler || []).find(e => zahlGleich(e.wert, x, f.toleranz));
    return { ok: false, fehler: treffer ? treffer.id : null };
  }

  function ampelAusAnteil(r, n) {
    if (!n) return "x";
    if (r === n) return "g";
    return r / n >= 0.5 ? "y" : "r";
  }

  // ---------- Schritt 1: Kürzel ----------
  function start() {
    ziel.innerHTML = `
      <div class="box exit-start">
        <h3>🎫 Exit-Ticket · ${D.titel || ""}</h3>
        <p>Zeig, was du heute gelernt hast. Du bekommst sofort eine Rückmeldung, was du schon kannst und was du noch üben solltest.</p>
        <p class="klein">${D.fragen.length} kurze Fragen · etwa 5 Minuten · Jede Frage hat nur <strong>einen</strong> Versuch.</p>
        <label class="kuerzel">Dein Kürzel <input id="exitKuerzel" maxlength="6" autocomplete="off" placeholder="z. B. S07"></label>
        <p class="klein">Nur das Kürzel, das deine Lehrkraft dir gegeben hat. <strong>Nicht deinen Namen.</strong></p>
        <button class="btn haupt" id="exitStart">Los geht's</button>
        <div class="rueckmeldung" id="exitHinweis"></div>
      </div>`;
    const inp = document.getElementById("exitKuerzel");
    const los = () => {
      const k = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!k) {
        const h = document.getElementById("exitHinweis");
        h.className = "rueckmeldung falsch"; h.textContent = "Bitte gib dein Kürzel ein (nur Buchstaben und Ziffern).";
        return;
      }
      fragen(k);
    };
    document.getElementById("exitStart").onclick = los;
    inp.addEventListener("keydown", e => { if (e.key === "Enter") los(); });
    inp.focus();
  }

  // ---------- Schritt 2: Fragen + Selbsteinschätzung ----------
  function fragen(kuerzel) {
    const html = D.fragen.map((f, i) => {
      let eingabe;
      if (f.typ === "auswahl") {
        eingabe = `<div class="optionen">${f.optionen.map((o, k) =>
          `<label><input type="radio" name="e${i}" value="${k}"> <span>${o}</span></label>`).join("")}</div>`;
      } else {
        eingabe = `<div class="eingabe"><input type="text" inputmode="decimal" placeholder="Zahl eingeben" aria-label="Antwort">${f.einheit ? `<span>${f.einheit}</span>` : ""}</div>`;
      }
      return `<div class="aufgabe" data-i="${i}"><div class="kopf"><span>Frage ${i + 1} von ${D.fragen.length}</span></div>` +
        `<div class="frage">${f.frage}</div>${eingabe}</div>`;
    }).join("");
    const selbst = D.lernziele.map((lz, k) =>
      `<div class="ampel-zeile"><span>${lz.text}</span><div class="ampel-knoepfe" data-k="${k}">` +
      `<button data-w="g" title="sicher"></button><button data-w="y" title="fast"></button><button data-w="r" title="noch nicht"></button></div></div>`).join("");

    ziel.innerHTML = `<p class="klein">Kürzel: <strong>${kuerzel}</strong></p>${html}
      <h2>Wie sicher fühlst du dich?</h2>
      <div class="box"><p class="klein" style="margin-top:0">Tippe an: 🟢 sicher · 🟡 fast · 🔴 noch nicht</p>${selbst}</div>
      <div class="rueckmeldung" id="exitFehlt"></div>
      <p><button class="btn haupt gross" id="exitAbgeben">✅ Abgeben</button></p>`;

    const selbstWerte = D.lernziele.map(() => "x");
    ziel.querySelectorAll(".ampel-knoepfe").forEach(g => {
      const k = Number(g.dataset.k);
      g.querySelectorAll("button").forEach(b => b.onclick = () => {
        selbstWerte[k] = b.dataset.w;
        g.querySelectorAll("button").forEach(x => x.classList.toggle("an", x === b));
      });
    });

    document.getElementById("exitAbgeben").onclick = () => {
      const antworten = D.fragen.map((f, i) => {
        const el = ziel.querySelector(`.aufgabe[data-i="${i}"]`);
        if (f.typ === "auswahl") { const r = el.querySelector("input:checked"); return r ? r.value : null; }
        return el.querySelector("input").value.trim();
      });
      const offen = antworten.map((a, i) => (a === null || a === "") ? i + 1 : 0).filter(Boolean);
      const hinweis = document.getElementById("exitFehlt");
      if (offen.length && !hinweis.dataset.gewarnt) {
        hinweis.dataset.gewarnt = "1";
        hinweis.className = "rueckmeldung falsch";
        hinweis.textContent = `Frage ${offen.join(", ")} ist noch leer. Trotzdem abgeben? Dann tippe noch einmal auf „Abgeben“.`;
        return;
      }
      if (selbstWerte.includes("x") && !hinweis.dataset.selbst) {
        hinweis.dataset.selbst = "1";
        hinweis.className = "rueckmeldung falsch";
        hinweis.textContent = "Schätze dich bitte noch mit der Ampel ein. Oder tippe noch einmal auf „Abgeben“.";
        return;
      }
      const erg = auswerten(kuerzel, antworten, selbstWerte);
      try { localStorage.setItem(SPEICHER, JSON.stringify(erg)); } catch (e) {}
      ergebnis(erg);
    };
  }

  function auswerten(kuerzel, antworten, selbstWerte) {
    const bew = D.fragen.map((f, i) => ({ ...bewerte(f, antworten[i]), antwort: antworten[i] }));
    const ist = D.lernziele.map((_, k) => {
      const idx = D.fragen.map((f, i) => f.lz === k ? i : -1).filter(i => i >= 0);
      return ampelAusAnteil(idx.filter(i => bew[i].ok).length, idx.length);
    });
    const fehler = [...new Set(bew.map(b => b.fehler).filter(Boolean))];
    const richtig = bew.filter(b => b.ok).length;
    const roh = ["M1", kuerzel, datum(), TICKET, ist.join(""), fehler.join(",") || "-", selbstWerte.join(""), `${richtig}-${D.fragen.length}`].join(".");
    return { kuerzel, bew, ist, selbst: selbstWerte, fehler, richtig, code: roh + "." + pruefzeichen(roh) };
  }

  // ---------- Schritt 3: Ergebnis ----------
  function ergebnis(E) {
    const url = new URL("auswertung/", WURZEL).href + "#c=" + E.code;
    const zeilen = D.lernziele.map((lz, k) => {
      const w = E.ist[k];
      const tipp = w === "g" ? (lz.fordern ? `🚀 Für Profis: ${lz.fordern}` : "Super, das sitzt!")
        : (lz.foerdern ? `📖 Übe noch: ${lz.foerdern}` : "Übe das noch einmal auf der Schülerseite.");
      const vergleich = E.selbst[k] !== "x" && E.selbst[k] !== w
        ? `<div class="klein">Du hast dich ${AMPEL[E.selbst[k]]} eingeschätzt. ${E.selbst[k] === "g" ? "Schau dir die Fehler unten genau an." : "Du kannst mehr, als du denkst!"}</div>` : "";
      return `<div class="ergebnis-zeile ${w}"><div class="symbol">${AMPEL[w]}</div><div><strong>${lz.text}</strong>` +
        `<div>${AMPEL_TEXT[w]} · ${tipp}</div>${vergleich}</div></div>`;
    }).join("");

    const falsch = D.fragen.map((f, i) => {
      const b = E.bew[i];
      if (b.ok) return "";
      const deine = b.leer ? "keine Antwort" : f.typ === "auswahl" ? f.optionen[Number(b.antwort)] : b.antwort + (f.einheit ? " " + f.einheit : "");
      const fehlerText = b.fehler && D.fehlertypen && D.fehlertypen[b.fehler]
        ? `<div class="tipp offen">⚠️ <strong>Typischer Fehler:</strong> ${D.fehlertypen[b.fehler]}</div>` : "";
      return `<div class="aufgabe"><div class="kopf"><span>Frage ${i + 1}</span></div><div class="frage">${f.frage}</div>` +
        `<div>Deine Antwort: <strong>${deine}</strong></div>${fehlerText}` +
        (f.erklaerung ? `<div class="erklaerung offen">📘 ${f.erklaerung}</div>` : "") + `</div>`;
    }).join("");

    ziel.innerHTML = `
      <div class="box ergebnis-kopf">
        <div class="gross-zahl">${E.richtig} von ${D.fragen.length}</div>
        <div>Fragen richtig · Kürzel <strong>${E.kuerzel}</strong></div>
      </div>
      <h2>Das kannst du schon</h2>
      <div class="box">${zeilen}</div>
      ${falsch ? `<h2>Hier lohnt sich ein zweiter Blick</h2>${falsch}` : ""}
      <h2>📲 Zeig das deiner Lehrkraft</h2>
      <div class="box qr-box">
        <div class="qr">${window.QR ? QR.svg(url) : ""}</div>
        <div>
          <p style="margin-top:0">Deine Lehrkraft scannt diesen Code. Oder du schickst ihr diesen Text:</p>
          <code class="ergebniscode">${E.code}</code>
          <p><button class="btn" id="exitKopieren">📋 Code kopieren</button></p>
        </div>
      </div>
      <p class="klein"><a href="#" id="exitNeu">Neu beginnen</a> (nur wenn deine Lehrkraft es sagt)</p>`;

    document.getElementById("exitKopieren").onclick = e => {
      const b = e.target;
      (navigator.clipboard ? navigator.clipboard.writeText(E.code) : Promise.reject())
        .then(() => (b.textContent = "✅ Kopiert"), () => (b.textContent = "Bitte Text markieren und kopieren"));
    };
    document.getElementById("exitNeu").onclick = e => {
      e.preventDefault();
      if (!confirm("Wirklich neu beginnen? Dein Ergebnis wird hier gelöscht.")) return;
      try { localStorage.removeItem(SPEICHER); } catch (err) {}
      start();
    };
    window.scrollTo(0, 0);
  }

  // Gespeichertes Ergebnis wieder anzeigen (z. B. nach Neuladen)
  let alt = null;
  try { alt = JSON.parse(localStorage.getItem(SPEICHER) || "null"); } catch (e) {}
  if (alt && alt.code && alt.code.split(".")[2] === datum()) ergebnis(alt);
  else start();
})();
