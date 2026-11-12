/*
  Aktivierende Bausteine für die Präsentationen (wird von praesentation.js automatisch geladen).

  ALLE ANTWORTEN
    <div data-abstimmung='["Antwort A","Antwort B","Antwort C","Antwort D"]' data-loesung="1"></div>
        ABCD-Abstimmung: 3-2-1-Countdown, alle halten Karte/Whiteboard hoch, Stimmen per Klick zählen, auflösen.
        data-loesung weglassen bei Meinungsfragen (z. B. Wette am Stundenanfang).
    <div data-denkzeit="60" data-text="Schreibe zuerst allein auf: …"></div>
        Erst schreiben, dann sprechen: Countdown, danach „Jetzt austauschen“.
    🎲 Zufallsauswahl: Knopf „Wer?“ unten oder Taste Z (Klassenlisten nur auf diesem Gerät).

  DENKAUFGABEN
    <div data-schaetzen='{"min":0,"max":10000,"einheit":"Liter","loesung":8500}'></div>
        Schätzleiste: Schätzungen eintragen, dann Lösung aufdecken.
    <div class="fehlerkarte" data-wer="Tim">
      <div class="rechnung">20 % von 80 = 80 : 20 = <span class="fehler">4</span></div>
      <div class="erklaerung">Tim teilt durch 20 statt durch 100 …</div>
    </div>
        Fehler finden: „Fehler zeigen“ markiert den Fehler und zeigt die Erklärung.

  KOOPERATION
    <div data-methode="placemat"></div>     (auch: tps, lerntempoduett, gruppenpuzzle, galeriegang, rollen)
        Standard-Ablauf mit Minuten; Klick auf einen Schritt startet den Timer.
        Anpassen: data-minuten="2,3,4"  oder  data-schritte='[["Text",3],["Text",2]]'
        data-frage="…" schreibt bei der Placemat die Frage in die Mitte.

  SPRACHE
    <aside class="wortspeicher" data-woerter='["Grundwert","Prozentwert"]'
           data-saetze='["Ich vermute, dass …","Das sieht man daran, dass …"]'></aside>
        Einmal pro Stunde im <body>. Knopf „Wörter“ unten oder Taste W blendet ihn ein.

  NUR GESTALTUNG (CSS): .spannung · .wahlkarten > .wahlkarte · .produkt · .projekt · .leitmodell · .satzhilfe
*/
(function () {
  window.BausteineGeladen = true;
  const fuss = window.Praes && Praes.fuss ? Praes.fuss.querySelector(".nav") : null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lies = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const json = (el, attr, d) => { try { return JSON.parse(el.getAttribute(attr)); } catch (e) { return d; } };
  const zahl = x => Number(x).toLocaleString("de-DE", { maximumFractionDigits: 2 });

  function fussKnopf(text, titel, fn) {
    if (!fuss) return;
    const b = document.createElement("button");
    b.className = "knopf"; b.textContent = text; b.title = titel; b.onclick = fn;
    fuss.prepend(b);
  }
  function overlay(html) {
    let o = document.querySelector(".overlay");
    if (!o) {
      o = document.createElement("div");
      o.className = "overlay";
      o.addEventListener("click", e => { if (e.target === o) o.remove(); });
      document.body.appendChild(o);
    }
    o.innerHTML = `<div class="overlay-box"><button class="knopf zu" title="Schließen (Esc)">✕</button>${html}</div>`;
    o.querySelector(".zu").onclick = () => o.remove();
    return o;
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelector(".overlay")?.remove();
  });

  // ---------- ABCD-Abstimmung ----------
  const FARBEN = ["#e03131", "#1c7ed6", "#2f9e44", "#e8a400", "#9c36b5", "#495057"];
  document.querySelectorAll("[data-abstimmung]").forEach(el => {
    const opt = json(el, "data-abstimmung", []);
    const loesung = el.dataset.loesung !== undefined ? Number(el.dataset.loesung) : null;
    const stimmen = opt.map(() => 0);
    el.classList.add("abstimmung");
    el.innerHTML = opt.map((o, i) => `<div class="opt" data-i="${i}" title="Klick = eine Stimme mehr">
        <span class="buchstabe" style="background:${FARBEN[i]}">${String.fromCharCode(65 + i)}</span>
        <span class="text">${o}</span><span class="balken"><i></i></span><span class="anzahl"></span></div>`).join("") +
      `<div class="knoepfe"><button class="knopf mittel" data-a="los">⏱ 3 · 2 · 1 – Karten hoch!</button>
        ${loesung !== null ? '<button class="knopf mittel" data-a="aufloesen">Auflösen</button>' : ""}
        <button class="knopf" data-a="reset">↺</button><span class="countdown"></span></div>`;
    const zeichne = () => {
      const max = Math.max(1, ...stimmen);
      el.querySelectorAll(".opt").forEach((r, i) => {
        r.querySelector(".balken i").style.width = (stimmen[i] / max * 100) + "%";
        r.querySelector(".balken i").style.background = FARBEN[i];
        r.querySelector(".anzahl").textContent = stimmen[i] || "";
      });
    };
    el.querySelectorAll(".opt").forEach(r => r.onclick = () => { stimmen[r.dataset.i]++; zeichne(); });
    const cd = el.querySelector(".countdown");
    el.querySelector('[data-a="los"]').onclick = () => {
      let n = 3; cd.textContent = n;
      const iv = setInterval(() => { n--; cd.textContent = n > 0 ? n : "🖐️ Hoch!"; if (n <= 0) clearInterval(iv); }, 800);
    };
    el.querySelector('[data-a="aufloesen"]')?.addEventListener("click", () =>
      el.querySelectorAll(".opt").forEach((r, i) => r.classList.add(i === loesung ? "richtig" : "falsch")));
    el.querySelector('[data-a="reset"]').onclick = () => {
      stimmen.fill(0); cd.textContent = ""; zeichne();
      el.querySelectorAll(".opt").forEach(r => r.classList.remove("richtig", "falsch"));
    };
    zeichne();
  });

  // ---------- Denkzeit: erst schreiben, dann sprechen ----------
  document.querySelectorAll("[data-denkzeit]").forEach(el => {
    const sek = Number(el.dataset.denkzeit) || 60;
    el.classList.add("denkzeit");
    el.innerHTML = `<div class="symbol">✍️</div><div class="inhalt"><div class="auftrag">${el.dataset.text || "Schreibe zuerst allein auf, was du denkst."}</div>
      <div class="rest"></div></div><button class="knopf mittel">Denkzeit starten (${sek} s)</button>`;
    const rest = el.querySelector(".rest"), b = el.querySelector("button");
    let iv;
    b.onclick = () => {
      clearInterval(iv);
      let s = sek; el.classList.remove("fertig");
      rest.textContent = `Noch ${s} s · Nur schreiben, nicht sprechen 🤫`;
      iv = setInterval(() => {
        s--;
        if (s > 0) rest.textContent = `Noch ${s} s · Nur schreiben, nicht sprechen 🤫`;
        else { clearInterval(iv); rest.textContent = "🗣️ Jetzt austauschen!"; el.classList.add("fertig"); }
      }, 1000);
    };
  });

  // ---------- Zufallsauswahl ----------
  const SCHL = "praes-klassenlisten";
  let gezogen = [];
  function zufall() {
    const d = lies(SCHL, { aktiv: "", listen: {} });
    const liste = d.listen[d.aktiv] || [];
    if (!liste.length) { einstellungen(); return; }
    if (gezogen.length >= liste.length) gezogen = [];
    const frei = liste.filter(n => !gezogen.includes(n));
    const o = overlay(`<div class="klein">${esc(d.aktiv)} · noch ${frei.length - 1} von ${liste.length}</div>
      <div class="zufall-name">…</div>
      <div class="knoepfe"><button class="knopf gross" data-a="neu">🎲 Nächster</button><button class="knopf" data-a="einst">⚙️ Klassenliste</button></div>`);
    const feld = o.querySelector(".zufall-name");
    let n = 0;
    const iv = setInterval(() => {
      feld.textContent = liste[Math.floor(Math.random() * liste.length)];
      if (++n > 12) {
        clearInterval(iv);
        const wahl = frei[Math.floor(Math.random() * frei.length)];
        gezogen.push(wahl); feld.textContent = wahl; feld.classList.add("fest");
      }
    }, 70);
    o.querySelector('[data-a="neu"]').onclick = zufall;
    o.querySelector('[data-a="einst"]').onclick = einstellungen;
  }
  function einstellungen() {
    const d = lies(SCHL, { aktiv: "", listen: {} });
    const namen = Object.keys(d.listen);
    const o = overlay(`<h3 style="margin-top:0">Klassenliste für die Zufallsauswahl</h3>
      <p class="klein">Wird nur auf diesem Gerät gespeichert. Kürzel oder Vornamen, einer pro Zeile.</p>
      <p>${namen.length ? `<select data-a="wahl">${namen.map(n => `<option ${n === d.aktiv ? "selected" : ""}>${esc(n)}</option>`).join("")}</select> ` : ""}
        <input data-a="name" placeholder="Klasse, z. B. 8a" value="${esc(d.aktiv)}"></p>
      <textarea data-a="liste" rows="10">${esc((d.listen[d.aktiv] || []).join("\n"))}</textarea>
      <p class="klein">Tipp: Für S01 bis S26 einfach <code>26</code> eintragen.</p>
      <div class="knoepfe"><button class="knopf gross" data-a="ok">Speichern</button>${namen.length ? '<button class="knopf" data-a="weg">Liste löschen</button>' : ""}</div>`);
    const q = a => o.querySelector(`[data-a="${a}"]`);
    q("wahl")?.addEventListener("change", e => { d.aktiv = e.target.value; schreib(SCHL, d); einstellungen(); });
    q("ok").onclick = () => {
      const name = q("name").value.trim() || "Klasse";
      let liste = q("liste").value.split("\n").map(x => x.trim()).filter(Boolean);
      if (liste.length === 1 && /^\d+$/.test(liste[0])) liste = Array.from({ length: Number(liste[0]) }, (_, i) => "S" + String(i + 1).padStart(2, "0"));
      d.listen[name] = liste; d.aktiv = name; schreib(SCHL, d); gezogen = [];
      zufall();
    };
    q("weg")?.addEventListener("click", () => {
      delete d.listen[d.aktiv]; d.aktiv = Object.keys(d.listen)[0] || ""; schreib(SCHL, d); einstellungen();
    });
  }
  fussKnopf("🎲 Wer?", "Zufallsauswahl (Taste Z)", zufall);

  // ---------- Schätzleiste ----------
  document.querySelectorAll("[data-schaetzen]").forEach(el => {
    const c = json(el, "data-schaetzen", {});
    const min = c.min ?? 0, max = c.max ?? 100, e = c.einheit ? " " + c.einheit : "";
    const werte = [];
    el.classList.add("schaetzen");
    el.innerHTML = `<div class="leiste-s"><div class="punkte"></div><div class="loesung-marke"></div></div>
      <div class="skala-s"><span>${zahl(min)}${e}</span><span>${zahl((min + max) / 2)}${e}</span><span>${zahl(max)}${e}</span></div>
      <div class="knoepfe"><input type="text" inputmode="decimal" placeholder="Schätzung"><button class="knopf mittel" data-a="dazu">Eintragen</button>
      <button class="knopf mittel" data-a="auf">Auflösen</button><button class="knopf" data-a="reset">↺</button><span class="info"></span></div>`;
    const pos = v => Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
    const punkte = el.querySelector(".punkte"), marke = el.querySelector(".loesung-marke"), info = el.querySelector(".info"), inp = el.querySelector("input");
    const dazu = () => {
      const v = parseFloat(inp.value.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(v)) return;
      werte.push(v); inp.value = ""; inp.focus();
      const p = document.createElement("i"); p.style.left = pos(v) + "%"; p.title = zahl(v) + e; p.dataset.v = v;
      punkte.appendChild(p);
      info.textContent = `${werte.length} Schätzungen`;
    };
    el.querySelector('[data-a="dazu"]').onclick = dazu;
    inp.addEventListener("keydown", ev => { if (ev.key === "Enter") dazu(); });
    el.querySelector('[data-a="auf"]').onclick = () => {
      if (c.loesung === undefined) return;
      marke.style.left = pos(c.loesung) + "%"; marke.textContent = zahl(c.loesung) + e; marke.classList.add("an");
      if (werte.length) {
        const best = werte.reduce((a, b) => Math.abs(b - c.loesung) < Math.abs(a - c.loesung) ? b : a);
        punkte.querySelectorAll("i").forEach(p => p.classList.toggle("best", Number(p.dataset.v) === best));
        info.textContent = `Am nächsten dran: ${zahl(best)}${e}`;
      }
    };
    el.querySelector('[data-a="reset"]').onclick = () => { werte.length = 0; punkte.innerHTML = ""; marke.classList.remove("an"); info.textContent = ""; };
  });

  // ---------- Fehler finden ----------
  document.querySelectorAll(".fehlerkarte").forEach(el => {
    const kopf = document.createElement("div");
    kopf.className = "wer";
    kopf.textContent = `🔍 ${el.dataset.wer || "Jemand"} hat so gerechnet. Findest du den Fehler?`;
    el.prepend(kopf);
    const b = document.createElement("button");
    b.className = "knopf mittel"; b.textContent = "Fehler zeigen";
    b.onclick = () => { el.classList.toggle("offen"); b.textContent = el.classList.contains("offen") ? "Verbergen" : "Fehler zeigen"; };
    el.appendChild(b);
  });

  // ---------- Kooperative Methoden ----------
  const METHODEN = {
    tps: { titel: "Think – Pair – Share", schritte: [["👤 Allein nachdenken und aufschreiben", 1], ["👥 Zu zweit vergleichen und einigen", 2], ["🏫 In der Klasse vorstellen", 3]] },
    placemat: { titel: "Placemat", schritte: [["✍️ Jeder schreibt still in sein Feld", 3], ["🔄 Blatt drehen: Lest die Ideen der anderen", 2], ["🤝 Einigt euch: Das Beste kommt in die Mitte", 4]] },
    lerntempoduett: { titel: "Lerntempoduett", schritte: [["👤 Bearbeite die Aufgabe allein", 6], ["🚏 Fertig? Stell dich an die Haltestelle", 0], ["👥 Vergleicht mit dem Nächsten, der kommt", 3], ["➡️ Weiter mit der nächsten Aufgabe", 0]] },
    gruppenpuzzle: { titel: "Gruppenpuzzle", schritte: [["🧩 Stammgruppe: Jeder bekommt ein Thema", 1], ["🎓 Expertengruppe: Thema verstehen, Erklärung vorbereiten", 8], ["🗣️ Zurück in die Stammgruppe: Jeder erklärt seins", 8], ["✅ Gemeinsam die Abschlussaufgabe lösen", 5]] },
    galeriegang: { titel: "Galeriegang", schritte: [["🖍️ Plakat oder Lösung gestalten", 10], ["🚶 Rundgang: Lest die anderen Ergebnisse", 5], ["💬 Klebezettel: eine Frage, ein Lob", 3], ["🔁 Zurück zum eigenen Plakat: Rückmeldungen lesen", 2]] },
    rollen: { titel: "Rollen in der Gruppe", schritte: [["⏱️ Zeitwächter: achtet auf die Zeit", 0], ["✍️ Schreiber: hält die Ergebnisse fest", 0], ["🗣️ Sprecher: stellt das Ergebnis vor", 0], ["🧰 Materialchef: holt und bringt das Material", 0]] }
  };
  document.querySelectorAll("[data-methode]").forEach(el => {
    const m = METHODEN[el.dataset.methode] || { titel: el.dataset.methode, schritte: [] };
    let schritte = json(el, "data-schritte", null) || m.schritte.map(s => s.slice());
    if (el.dataset.minuten) el.dataset.minuten.split(",").forEach((x, i) => { if (schritte[i]) schritte[i][1] = Number(x); });
    el.classList.add("methode");
    const placemat = el.dataset.methode === "placemat"
      ? `<div class="placemat"><div class="f f1">1</div><div class="f f2">2</div><div class="f f3">3</div><div class="f f4">4</div><div class="mitte">${el.dataset.frage || "Gemeinsame Lösung"}</div></div>` : "";
    el.innerHTML = `<div class="titel">🤝 ${esc(m.titel)}</div><div class="schritte-m">${schritte.map(([t, min], i) =>
      `<button class="schritt-m" data-i="${i}" ${min ? `title="Klick startet ${min} Minuten"` : ""}><span class="nr">${i + 1}</span><span>${t}</span>${min ? `<span class="min">${min}′</span>` : ""}</button>`).join("")}</div>${placemat}`;
    el.querySelectorAll(".schritt-m").forEach(b => b.onclick = () => {
      el.querySelectorAll(".schritt-m").forEach(x => x.classList.toggle("an", x === b));
      const min = schritte[b.dataset.i][1];
      if (min && window.Praes?.timer) Praes.timer(min);
    });
  });

  // ---------- Wortspeicher ----------
  const ws = document.querySelector("aside.wortspeicher");
  if (ws) {
    const w = json(ws, "data-woerter", []), s = json(ws, "data-saetze", []);
    ws.innerHTML = `<button class="knopf zu" title="Schließen (W)">✕</button>` +
      (w.length ? `<h3>📚 Wortspeicher</h3><ul class="woerter">${w.map(x => `<li>${x}</li>`).join("")}</ul>` : "") +
      (s.length ? `<h3>💬 So kannst du es sagen</h3><ul class="saetze">${s.map(x => `<li>${x}</li>`).join("")}</ul>` : "");
    const umschalten = () => document.body.classList.toggle("ws-offen");
    ws.querySelector(".zu").onclick = umschalten;
    fussKnopf("📚 Wörter", "Wortspeicher (Taste W)", umschalten);
    document.addEventListener("keydown", e => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "w" || e.key === "W") umschalten();
    });
  }
  document.addEventListener("keydown", e => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (e.key === "z" || e.key === "Z") zufall();
  });
})();
