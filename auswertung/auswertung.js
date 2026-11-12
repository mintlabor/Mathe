/*
  Auswertung der Exit-Tickets – nur für die Lehrkraft.

  - Ergebnisse kommen per QR-Code (öffnet diese Seite mit #c=CODE), per eingebautem Scanner
    oder per eingefügtem Textcode.
  - Alles wird nur im Browser dieses Geräts gespeichert (localStorage). Nichts geht an einen Server.
  - Die Texte der Lernziele und Fehlertypen werden aus der Exit-Ticket-Seite der Stunde gelesen.
*/
(function () {
  const SCHL = "mathe-auswertung-v1";
  const SCHL_PIN = "mathe-auswertung-pin";
  const SCHL_OFFEN = "mathe-auswertung-offen";
  const SCHL_BIS = "mathe-auswertung-entsperrt-bis";
  const ENTSPERRT_MIN = 45;
  const AMPEL = { g: "🟢", y: "🟡", r: "🔴", x: "⚪" };
  const AMPEL_WORT = { g: "grün", y: "gelb", r: "rot", x: "" };
  const app = document.getElementById("app");

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lies = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  let DB = lies(SCHL, null) || { eintraege: [], namen: {}, katalog: {}, letzteSicherung: null };
  DB.eintraege ||= []; DB.namen ||= {}; DB.katalog ||= {};
  const speichern = () => schreib(SCHL, DB);

  // ---------- Codes aus der Adresse merken (auch vor dem Entsperren) ----------
  function codeAusAdresse() {
    const m = location.hash.match(/[#&]c=([^&]+)/);
    if (!m) return;
    const offen = lies(SCHL_OFFEN, []);
    offen.push(decodeURIComponent(m[1]));
    schreib(SCHL_OFFEN, offen);
    history.replaceState(null, "", location.pathname + location.search);
  }
  codeAusAdresse();
  window.addEventListener("hashchange", () => { codeAusAdresse(); if (entsperrt()) offeneVerarbeiten(); else sperrBildschirm(); });

  // ---------- Code lesen ----------
  function pruefzeichen(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h + (i + 1) * s.charCodeAt(i)) % 1296;
    return h.toString(36).toUpperCase().padStart(2, "0");
  }
  function parse(text) {
    let t = String(text).trim();
    const m = t.match(/[#&]c=([^&\s]+)/);
    if (m) t = decodeURIComponent(m[1]);
    const teile = t.split(".");
    if (teile.length !== 9 || teile[0] !== "M1") return { problem: "kein gültiger Ergebniscode" };
    const roh = teile.slice(0, 8).join(".");
    if (pruefzeichen(roh) !== teile[8]) return { problem: "Prüfzeichen falsch (Tippfehler?)" };
    const [, kuerzel, d, ticket, ist, fehler, selbst, rn] = teile;
    const [richtig, gesamt] = rn.split("-").map(Number);
    return {
      code: t, kuerzel, ticket,
      datum: `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`,
      ist: ist.split(""), selbst: selbst.split(""),
      fehler: fehler === "-" ? [] : fehler.split(","),
      richtig, gesamt, erfasst: new Date().toISOString()
    };
  }
  function hinzufuegen(texte) {
    const neu = [], fehl = [];
    texte.forEach(t => {
      if (!t.trim()) return;
      const e = parse(t);
      if (e.problem) { fehl.push(`${t.slice(0, 40)}… → ${e.problem}`); return; }
      if (DB.eintraege.some(x => x.code === e.code)) return;
      DB.eintraege.push(e);
      neu.push(e);
    });
    speichern();
    neu.forEach(e => katalogLaden(e.ticket));
    return { neu, fehl };
  }

  // ---------- Katalog (Lernziele und Fehlertypen aus der Exit-Ticket-Seite) ----------
  function ticketPfad(t) {
    if (t === "vorlage") return "../vorlage/schueler/exit-vorlage.html";
    const m = t.match(/^k(\d+)\/(hs|rs)\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
    if (!m) return null;
    return `../klasse-${m[1]}/${m[2] === "hs" ? "hauptschule" : "realschule"}/${m[3]}/schueler/exit-${m[4]}.html`;
  }
  const laedt = new Set();
  function katalogLaden(t, erzwingen) {
    if ((DB.katalog[t] && !erzwingen) || laedt.has(t)) return;
    const pfad = ticketPfad(t);
    if (!pfad) return;
    laedt.add(t);
    fetch(pfad, { cache: "no-cache" }).then(r => r.ok ? r.text() : Promise.reject())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const d = JSON.parse(doc.getElementById("exit-daten").textContent);
        DB.katalog[t] = {
          titel: d.titel, stunde: d.stunde,
          lernziele: d.lernziele.map(l => l.text),
          fehlertypen: d.fehlertypen || {}
        };
        speichern();
        zeichnen();
      }).catch(() => {}).finally(() => laedt.delete(t));
  }
  function ticketName(t) {
    const k = DB.katalog[t];
    const m = t.match(/^k(\d+)\/(hs|rs)\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
    const ort = m ? `Kl. ${m[1]} ${m[2].toUpperCase()} · ${m[3].replace(/-/g, " ")}` : t;
    return k ? `${ort} · Stunde ${k.stunde ?? m?.[4] ?? ""}: ${k.titel}` : `${ort}${m ? " · " + m[4] : ""}`;
  }
  const lzText = (t, i) => DB.katalog[t]?.lernziele?.[i] || `Lernziel ${i + 1}`;
  const fehlerText = (t, id) => DB.katalog[t]?.fehlertypen?.[id] || id;
  const name = k => DB.namen[k] ? `${esc(DB.namen[k])} <span class="klein">(${esc(k)})</span>` : esc(k);
  const datumDE = d => d.split("-").reverse().join(".");

  // ---------- PIN ----------
  async function hash(text) {
    if (window.crypto?.subtle) {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
    }
    let h = 5381; for (const c of text) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
    return "s" + h.toString(16);
  }
  const entsperrt = () => Date.now() < Number(localStorage.getItem(SCHL_BIS) || 0);
  function entsperren() { localStorage.setItem(SCHL_BIS, String(Date.now() + ENTSPERRT_MIN * 60000)); }
  function sperren() { localStorage.removeItem(SCHL_BIS); scannerAus(); sperrBildschirm(); }

  function sperrBildschirm() {
    const pin = lies(SCHL_PIN, null);
    const offen = lies(SCHL_OFFEN, []).length;
    app.innerHTML = `<div class="box sperre">
      <h2 style="margin-top:0">${pin ? "🔒 PIN eingeben" : "🔑 PIN festlegen"}</h2>
      <p class="klein">${pin ? "Die Auswertung ist gesperrt." : "Lege einmalig eine PIN (4–8 Ziffern) für dieses Gerät fest. Sie schützt die Liste vor neugierigen Blicken am Gerät."}</p>
      ${offen ? `<p><strong>📥 ${offen} neues Ergebnis wartet.</strong> Nach dem Entsperren wird es eingetragen.</p>` : ""}
      <p><input id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></p>
      ${pin ? "" : `<p><input id="pin2" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="wiederholen"></p>`}
      <p><button class="btn haupt gross" id="pinOk">${pin ? "Entsperren" : "PIN speichern"}</button></p>
      <div class="rueckmeldung" id="pinMeld"></div>
      ${pin ? `<p class="klein"><a href="#" id="pinVergessen">PIN vergessen?</a></p>` : ""}
    </div>`;
    const inp = document.getElementById("pin"), meld = document.getElementById("pinMeld");
    inp.focus();
    const ok = async () => {
      const p = inp.value.trim();
      if (!/^\d{4,8}$/.test(p)) { meld.className = "rueckmeldung falsch"; meld.textContent = "Bitte 4 bis 8 Ziffern."; return; }
      if (!pin) {
        if (p !== document.getElementById("pin2").value.trim()) { meld.className = "rueckmeldung falsch"; meld.textContent = "Die beiden Eingaben stimmen nicht überein."; return; }
        const salt = Math.random().toString(36).slice(2);
        schreib(SCHL_PIN, { salt, hash: await hash(salt + p) });
      } else if ((await hash(pin.salt + p)) !== pin.hash) {
        meld.className = "rueckmeldung falsch"; meld.textContent = "Falsche PIN."; inp.value = ""; return;
      }
      entsperren();
      start();
    };
    document.getElementById("pinOk").onclick = ok;
    app.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") ok(); }));
    const v = document.getElementById("pinVergessen");
    if (v) v.onclick = e => {
      e.preventDefault();
      if (confirm("PIN zurücksetzen? Dabei werden ALLE gespeicherten Ergebnisse auf diesem Gerät gelöscht. (Vorher gesicherte Dateien kannst du danach wieder einlesen.)")) {
        localStorage.removeItem(SCHL); localStorage.removeItem(SCHL_PIN);
        DB = { eintraege: [], namen: {}, katalog: {}, letzteSicherung: null };
        sperrBildschirm();
      }
    };
  }

  // ---------- Oberfläche ----------
  let reiter = "stunde", zuletzt = [], wahl = { ticket: null, datum: "alle", schueler: null, suche: "" };

  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function offeneVerarbeiten() {
    const offen = lies(SCHL_OFFEN, []);
    if (!offen.length) return;
    localStorage.removeItem(SCHL_OFFEN);
    const { neu, fehl } = hinzufuegen(offen);
    if (neu.length) { zuletzt = neu; wahl.ticket = neu[neu.length - 1].ticket; reiter = "stunde"; }
    if (fehl.length) toast("⚠️ " + fehl.join(" | "));
    else if (!neu.length) toast("Dieses Ergebnis war schon eingetragen.");
    zeichnen();
  }

  function start() {
    if (!entsperrt()) { sperrBildschirm(); return; }
    entsperren();
    offeneVerarbeiten();
    [...new Set(DB.eintraege.map(e => e.ticket))].forEach(t => katalogLaden(t));
    zeichnen();
  }

  function zeichnen() {
    if (!entsperrt()) { sperrBildschirm(); return; }
    const tage = DB.letzteSicherung ? Math.floor((Date.now() - new Date(DB.letzteSicherung)) / 864e5) : null;
    const sicherungWarnung = DB.eintraege.length && (tage === null || tage >= 14)
      ? `<div class="box warnung">💾 ${tage === null ? "Du hast noch keine Sicherung gemacht." : `Letzte Sicherung vor ${tage} Tagen.`} Browserdaten können verloren gehen. <a href="#" data-r="sichern">Jetzt sichern →</a></div>` : "";
    const zul = zuletzt.length ? `<div class="box zuletzt"><strong>✅ Eingetragen:</strong> ${zuletzt.map(e =>
      `${name(e.kuerzel)} · ${esc(ticketName(e.ticket))} · ${e.ist.map(a => AMPEL[a]).join("")} (${e.richtig}/${e.gesamt})`).join("<br>")}</div>` : "";

    app.innerHTML = `
      <div class="leiste-oben">
        <button class="btn haupt" id="scanStart">📷 Scannen</button>
        <button class="btn" data-r="eingeben">⌨️ Code eingeben</button>
        <span class="klein">${DB.eintraege.length} Ergebnisse gespeichert</span>
        <button class="btn rechts" id="sperrKnopf">🔒 Sperren</button>
      </div>
      ${zul}${sicherungWarnung}
      <div class="reiter">
        ${[["stunde", "📊 Stunde auswerten"], ["schueler", "👤 Schüler"], ["alle", "📋 Alle Einträge"], ["eingeben", "⌨️ Code eingeben"], ["namen", "🏷️ Namen"], ["sichern", "💾 Sichern"]]
          .map(([k, t]) => `<button data-r="${k}" class="${reiter === k ? "an" : ""}">${t}</button>`).join("")}
      </div>
      <div id="inhalt"></div>`;
    app.querySelectorAll("[data-r]").forEach(b => b.onclick = e => { e.preventDefault(); reiter = b.dataset.r; zuletzt = []; zeichnen(); });
    document.getElementById("sperrKnopf").onclick = sperren;
    document.getElementById("scanStart").onclick = scanner;
    ({ stunde: ansichtStunde, schueler: ansichtSchueler, alle: ansichtAlle, eingeben: ansichtEingeben, namen: ansichtNamen, sichern: ansichtSichern })[reiter]();
  }

  // ---------- Ansicht: Stunde auswerten ----------
  function ansichtStunde() {
    const el = document.getElementById("inhalt");
    const tickets = [...new Set(DB.eintraege.map(e => e.ticket))].sort();
    if (!tickets.length) { el.innerHTML = `<div class="box">Noch keine Ergebnisse. Scanne den QR-Code eines Schülers oder gib einen Code ein.</div>`; return; }
    if (!tickets.includes(wahl.ticket)) wahl.ticket = tickets[tickets.length - 1];
    const daten = [...new Set(DB.eintraege.filter(e => e.ticket === wahl.ticket).map(e => e.datum))].sort().reverse();
    if (wahl.datum !== "alle" && !daten.includes(wahl.datum)) wahl.datum = "alle";
    // pro Schüler nur der letzte Versuch
    const proS = {};
    DB.eintraege.filter(e => e.ticket === wahl.ticket && (wahl.datum === "alle" || e.datum === wahl.datum))
      .sort((a, b) => a.erfasst.localeCompare(b.erfasst)).forEach(e => (proS[e.kuerzel] = e));
    const liste = Object.values(proS).sort((a, b) => a.kuerzel.localeCompare(b.kuerzel, "de", { numeric: true }));
    const nLZ = Math.max(...liste.map(e => e.ist.length), 0);
    const schnitt = liste.length ? liste.reduce((s, e) => s + e.richtig / e.gesamt, 0) / liste.length : 0;

    const lzBloecke = Array.from({ length: nLZ }, (_, i) => {
      const z = { g: [], y: [], r: [] };
      liste.forEach(e => z[e.ist[i]]?.push(e));
      const n = liste.length || 1;
      const ueber = liste.filter(e => e.selbst[i] === "g" && e.ist[i] !== "g");
      const balken = ["g", "y", "r"].map(k => z[k].length ? `<div class="${k}" style="flex:${z[k].length / n}">${z[k].length}</div>` : "").join("");
      return `<div class="lz-block"><strong>LZ ${i + 1}: ${esc(lzText(wahl.ticket, i))}</strong>
        <div class="stapel">${balken}</div>
        ${z.r.length ? `<div>🔴 Fördergruppe: ${z.r.map(e => `<span class="gruppe">${name(e.kuerzel)}</span>`).join("")}</div>` : ""}
        ${z.y.length ? `<div>🟡 Noch unsicher: ${z.y.map(e => `<span class="gruppe y">${name(e.kuerzel)}</span>`).join("")}</div>` : ""}
        ${ueber.length ? `<div class="klein">⚠️ Schätzen sich besser ein, als sie abschneiden: ${ueber.map(e => name(e.kuerzel)).join(", ")}</div>` : ""}
      </div>`;
    }).join("");

    const fz = {};
    liste.forEach(e => e.fehler.forEach(f => (fz[f] ||= []).push(e.kuerzel)));
    const fehlerListe = Object.entries(fz).sort((a, b) => b[1].length - a[1].length)
      .map(([f, ks]) => `<li><strong>${esc(fehlerText(wahl.ticket, f))}</strong> – ${ks.length}× (${ks.map(name).join(", ")})</li>`).join("");

    el.innerHTML = `
      <div class="leiste-oben" style="margin-bottom:1rem">
        <select id="wTicket">${tickets.map(t => `<option value="${esc(t)}" ${t === wahl.ticket ? "selected" : ""}>${esc(ticketName(t))}</option>`).join("")}</select>
        <select id="wDatum"><option value="alle">alle Tage</option>${daten.map(d => `<option value="${d}" ${d === wahl.datum ? "selected" : ""}>${datumDE(d)}</option>`).join("")}</select>
      </div>
      <div class="kacheln-mini">
        <div class="box"><div class="zahl">${liste.length}</div>Schüler</div>
        <div class="box"><div class="zahl">${Math.round(schnitt * 100)} %</div>richtig im Schnitt</div>
        <div class="box"><div class="zahl">${liste.filter(e => e.ist.every(a => a === "g")).length}</div>alles grün</div>
        <div class="box"><div class="zahl">${liste.filter(e => e.ist.includes("r")).length}</div>mind. einmal rot</div>
      </div>
      <h2>Lernziele</h2><div class="box">${lzBloecke}</div>
      ${fehlerListe ? `<h2>Häufige Fehler</h2><div class="box"><ul>${fehlerListe}</ul></div>` : ""}
      <h2>Einzelergebnisse</h2>
      <div class="tabelle"><table><thead><tr><th>Schüler</th>${Array.from({ length: nLZ }, (_, i) => `<th title="${esc(lzText(wahl.ticket, i))}">LZ ${i + 1}</th>`).join("")}<th>Selbst</th><th>Richtig</th><th>Fehler</th><th>Datum</th></tr></thead>
      <tbody>${liste.map(e => `<tr><td><a href="#" data-s="${esc(e.kuerzel)}">${name(e.kuerzel)}</a></td>${e.ist.map(a => `<td class="a">${AMPEL[a]}</td>`).join("")}
        <td class="a">${e.selbst.map(a => AMPEL[a]).join("")}</td><td>${e.richtig}/${e.gesamt}</td>
        <td>${e.fehler.map(f => esc(fehlerText(e.ticket, f))).join("<br>")}</td><td>${datumDE(e.datum)}</td></tr>`).join("")}</tbody></table></div>
      <p class="klein">Bei mehreren Versuchen eines Schülers zählt hier der letzte. Alle Versuche siehst du unter „Alle Einträge“.</p>`;
    document.getElementById("wTicket").onchange = e => { wahl.ticket = e.target.value; wahl.datum = "alle"; zeichnen(); };
    document.getElementById("wDatum").onchange = e => { wahl.datum = e.target.value; zeichnen(); };
    el.querySelectorAll("[data-s]").forEach(a => a.onclick = e => { e.preventDefault(); wahl.schueler = a.dataset.s; reiter = "schueler"; zeichnen(); });
  }

  // ---------- Ansicht: Schüler ----------
  function ansichtSchueler() {
    const el = document.getElementById("inhalt");
    const ks = [...new Set(DB.eintraege.map(e => e.kuerzel))].sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
    if (!ks.length) { el.innerHTML = `<div class="box">Noch keine Ergebnisse.</div>`; return; }
    if (!ks.includes(wahl.schueler)) wahl.schueler = ks[0];
    const liste = DB.eintraege.filter(e => e.kuerzel === wahl.schueler).sort((a, b) => (a.datum + a.erfasst).localeCompare(b.datum + b.erfasst));
    const alle = liste.flatMap(e => e.ist);
    const zaehl = k => alle.filter(a => a === k).length;
    el.innerHTML = `
      <div class="leiste-oben" style="margin-bottom:1rem">
        <select id="wS">${ks.map(k => `<option value="${esc(k)}" ${k === wahl.schueler ? "selected" : ""}>${esc(DB.namen[k] ? `${DB.namen[k]} (${k})` : k)}</option>`).join("")}</select>
      </div>
      <div class="kacheln-mini">
        <div class="box"><div class="zahl">${liste.length}</div>Exit-Tickets</div>
        <div class="box"><div class="zahl">${zaehl("g")}</div>🟢 Lernziele</div>
        <div class="box"><div class="zahl">${zaehl("y")}</div>🟡 Lernziele</div>
        <div class="box"><div class="zahl">${zaehl("r")}</div>🔴 Lernziele</div>
      </div>
      <h2>Verlauf</h2>
      <div class="tabelle"><table><thead><tr><th>Datum</th><th>Stunde</th><th>Lernziele (Ergebnis · Selbsteinschätzung)</th><th>Richtig</th><th>Fehler</th></tr></thead>
      <tbody>${liste.map(e => `<tr><td>${datumDE(e.datum)}</td><td>${esc(ticketName(e.ticket))}</td>
        <td>${e.ist.map((a, i) => `${AMPEL[a]} <span class="klein">selbst ${AMPEL[e.selbst[i]] || "⚪"}</span> ${esc(lzText(e.ticket, i))}`).join("<br>")}</td>
        <td>${e.richtig}/${e.gesamt}</td><td>${e.fehler.map(f => esc(fehlerText(e.ticket, f))).join("<br>")}</td></tr>`).join("")}</tbody></table></div>`;
    document.getElementById("wS").onchange = e => { wahl.schueler = e.target.value; zeichnen(); };
  }

  // ---------- Ansicht: Alle Einträge ----------
  function ansichtAlle() {
    const el = document.getElementById("inhalt");
    const s = wahl.suche.toLowerCase();
    const liste = DB.eintraege.map((e, i) => ({ e, i }))
      .filter(({ e }) => !s || [e.kuerzel, DB.namen[e.kuerzel], ticketName(e.ticket), datumDE(e.datum)].join(" ").toLowerCase().includes(s))
      .sort((a, b) => (b.e.datum + b.e.erfasst).localeCompare(a.e.datum + a.e.erfasst));
    el.innerHTML = `
      <p><input class="suche" id="suche" placeholder="🔍 Suchen: Kürzel, Name, Stunde, Datum" value="${esc(wahl.suche)}" style="width:100%;max-width:420px"></p>
      <div class="tabelle"><table><thead><tr><th>Datum</th><th>Schüler</th><th>Stunde</th><th>Ergebnis</th><th>Richtig</th><th></th></tr></thead>
      <tbody>${liste.map(({ e, i }) => `<tr><td>${datumDE(e.datum)}</td><td>${name(e.kuerzel)}</td><td>${esc(ticketName(e.ticket))}</td>
        <td class="a">${e.ist.map(a => AMPEL[a]).join("")}</td><td>${e.richtig}/${e.gesamt}</td>
        <td><button class="btn klein-btn gefahr" data-del="${i}" title="Eintrag löschen">✕</button></td></tr>`).join("")}</tbody></table></div>`;
    const inp = document.getElementById("suche");
    inp.oninput = () => { wahl.suche = inp.value; const p = inp.selectionStart; zeichnen(); const n = document.getElementById("suche"); n.focus(); n.setSelectionRange(p, p); };
    el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      const e = DB.eintraege[Number(b.dataset.del)];
      if (!confirm(`Eintrag von ${e.kuerzel} (${datumDE(e.datum)}) löschen?`)) return;
      DB.eintraege.splice(Number(b.dataset.del), 1); speichern(); zeichnen();
    });
  }

  // ---------- Ansicht: Code eingeben ----------
  function ansichtEingeben() {
    const el = document.getElementById("inhalt");
    el.innerHTML = `<div class="box">
      <p style="margin-top:0">Füge hier einen oder mehrere Ergebniscodes ein (einer pro Zeile), z. B. aus IServ-Nachrichten. Ganze Links gehen auch.</p>
      <textarea id="codes" placeholder="M1.S07.261112.k8/hs/…"></textarea>
      <p><button class="btn haupt" id="codesOk">Eintragen</button></p>
      <div id="codesMeld"></div></div>`;
    document.getElementById("codesOk").onclick = () => {
      const { neu, fehl } = hinzufuegen(document.getElementById("codes").value.split(/\s+/));
      document.getElementById("codesMeld").innerHTML =
        `<div class="rueckmeldung ok" style="display:block">✅ ${neu.length} neu eingetragen.</div>` +
        (fehl.length ? `<div class="rueckmeldung falsch" style="display:block">${fehl.map(esc).join("<br>")}</div>` : "");
      if (neu.length) { zuletzt = neu; wahl.ticket = neu[neu.length - 1].ticket; }
      document.getElementById("codes").value = "";
    };
  }

  // ---------- Ansicht: Namen ----------
  function ansichtNamen() {
    const el = document.getElementById("inhalt");
    const ks = [...new Set([...DB.eintraege.map(e => e.kuerzel), ...Object.keys(DB.namen)])].sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
    el.innerHTML = `<div class="box">
      <p style="margin-top:0">Hier ordnest du den Kürzeln Namen zu. Die Namen stehen <strong>nur auf diesem Gerät</strong> und erscheinen nie auf den Schülerseiten.</p>
      <p class="klein">Eine Zeile pro Schüler: <code>S07 = Max M.</code></p>
      <textarea id="namen" style="min-height:14rem">${ks.map(k => `${k} = ${DB.namen[k] || ""}`).join("\n")}</textarea>
      <p><button class="btn haupt" id="namenOk">Speichern</button></p></div>`;
    document.getElementById("namenOk").onclick = () => {
      const n = {};
      document.getElementById("namen").value.split("\n").forEach(z => {
        const [k, ...rest] = z.split("=");
        const kk = (k || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""), v = rest.join("=").trim();
        if (kk && v) n[kk] = v;
      });
      DB.namen = n; speichern(); toast("✅ Namen gespeichert"); zeichnen();
    };
  }

  // ---------- Ansicht: Sichern ----------
  function laden(dateiname, inhalt, typ) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([inhalt], { type: typ }));
    a.download = dateiname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function csv() {
    const nLZ = Math.max(1, ...DB.eintraege.map(e => e.ist.length));
    const zelle = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const kopf = ["Datum", "Kürzel", "Name", "Stunde", "Richtig", "Gesamt",
      ...Array.from({ length: nLZ }, (_, i) => `LZ ${i + 1}`), ...Array.from({ length: nLZ }, (_, i) => `Selbst LZ ${i + 1}`), "Fehlertypen", "Lernziele"];
    const zeilen = DB.eintraege.slice().sort((a, b) => (a.datum + a.kuerzel).localeCompare(b.datum + b.kuerzel)).map(e => [
      datumDE(e.datum), e.kuerzel, DB.namen[e.kuerzel] || "", ticketName(e.ticket), e.richtig, e.gesamt,
      ...Array.from({ length: nLZ }, (_, i) => AMPEL_WORT[e.ist[i]] || ""), ...Array.from({ length: nLZ }, (_, i) => AMPEL_WORT[e.selbst[i]] || ""),
      e.fehler.map(f => fehlerText(e.ticket, f)).join(" | "), e.ist.map((_, i) => `LZ ${i + 1}: ${lzText(e.ticket, i)}`).join(" | ")
    ]);
    return "﻿" + [kopf, ...zeilen].map(z => z.map(zelle).join(";")).join("\r\n");
  }
  function ansichtSichern() {
    const el = document.getElementById("inhalt");
    const heute = new Date().toISOString().slice(0, 10);
    el.innerHTML = `
      <div class="box"><h3 style="margin-top:0">📊 Für Excel</h3>
        <p>Alle Ergebnisse als Tabelle (CSV, öffnet direkt in Excel). Gut für Notenfindung und Elterngespräche.</p>
        <button class="btn haupt" id="csv">Excel-Liste herunterladen</button></div>
      <div class="box"><h3 style="margin-top:0">💾 Sicherung</h3>
        <p>Speichert alles (Ergebnisse und Namen) in einer Datei. Damit kannst du die Daten wiederherstellen oder auf ein anderes Gerät übertragen.
        ${DB.letzteSicherung ? `<br><span class="klein">Letzte Sicherung: ${new Date(DB.letzteSicherung).toLocaleString("de-DE")}</span>` : ""}</p>
        <button class="btn haupt" id="json">Sicherung herunterladen</button>
        <label class="btn" style="display:inline-block">📂 Sicherung einlesen <input type="file" id="import" accept=".json,application/json" hidden></label>
        <p class="klein">Beim Einlesen werden die Daten <strong>ergänzt</strong>, nichts wird überschrieben. So kannst du auch Ergebnisse von zwei Geräten zusammenführen.</p></div>
      <div class="box"><h3 style="margin-top:0">⚙️ Sonstiges</h3>
        <button class="btn" id="katalog">🔄 Lernziel-Texte neu laden</button>
        <button class="btn" id="pinNeu">🔑 PIN ändern</button>
        <button class="btn gefahr" id="allesWeg">🗑️ Alle Daten löschen</button></div>`;
    document.getElementById("csv").onclick = () => laden(`exit-tickets-${heute}.csv`, csv(), "text/csv;charset=utf-8");
    document.getElementById("json").onclick = () => {
      DB.letzteSicherung = new Date().toISOString(); speichern();
      laden(`exit-tickets-sicherung-${heute}.json`, JSON.stringify({ format: "mathe-auswertung-v1", ...DB }, null, 1), "application/json");
      zeichnen();
    };
    document.getElementById("import").onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => {
        const d = JSON.parse(t);
        let n = 0;
        (d.eintraege || []).forEach(x => { if (x.code && !DB.eintraege.some(y => y.code === x.code)) { DB.eintraege.push(x); n++; } });
        DB.namen = { ...(d.namen || {}), ...DB.namen };
        DB.katalog = { ...(d.katalog || {}), ...DB.katalog };
        speichern(); toast(`✅ ${n} Ergebnisse ergänzt`); zeichnen();
      }).catch(() => toast("⚠️ Datei konnte nicht gelesen werden."));
    };
    document.getElementById("katalog").onclick = () => { [...new Set(DB.eintraege.map(e => e.ticket))].forEach(t => katalogLaden(t, true)); toast("Wird geladen …"); };
    document.getElementById("pinNeu").onclick = () => { localStorage.removeItem(SCHL_PIN); localStorage.removeItem(SCHL_BIS); sperrBildschirm(); };
    document.getElementById("allesWeg").onclick = () => {
      if (!confirm("Wirklich ALLE Ergebnisse und Namen auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.")) return;
      DB = { eintraege: [], namen: {}, katalog: {}, letzteSicherung: null }; speichern(); zeichnen();
    };
  }

  // ---------- Scanner (Kamera, wenn der Browser es unterstützt) ----------
  let strom = null;
  async function scanner() {
    const box = document.getElementById("scanner");
    if (strom) { stopp(); return; }
    if (!("BarcodeDetector" in window)) {
      box.innerHTML = `<div class="box warnung">Dieser Browser kann nicht selbst scannen. So geht's trotzdem:
        <strong>Öffne die normale Kamera-App</strong> deines Handys oder Tablets und halte sie auf den QR-Code des Schülers.
        Tippe auf den Link, der erscheint: Diese Seite öffnet sich und trägt das Ergebnis ein.</div>`;
      return;
    }
    try {
      const det = new BarcodeDetector({ formats: ["qr_code"] });
      strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      box.innerHTML = `<div class="box scanner"><video autoplay playsinline muted></video>
        <p class="klein">Halte die Kamera nacheinander auf die QR-Codes. Jeder erkannte Code wird sofort eingetragen.</p>
        <button class="btn" id="scanStopp">Scannen beenden</button></div>`;
      const v = box.querySelector("video");
      v.srcObject = strom;
      document.getElementById("scanStopp").onclick = stopp;
      const gesehen = new Set();
      const schleife = async () => {
        if (!strom) return;
        try {
          const codes = await det.detect(v);
          codes.forEach(c => {
            if (gesehen.has(c.rawValue)) return;
            gesehen.add(c.rawValue);
            const { neu, fehl } = hinzufuegen([c.rawValue]);
            if (neu.length) { zuletzt = zuletzt.concat(neu); zeichnen(); toast(`✅ ${neu[0].kuerzel} eingetragen (${neu[0].ist.map(a => AMPEL[a]).join("")})`); navigator.vibrate?.(80); }
            else if (fehl.length) toast("⚠️ " + fehl[0]);
            else toast("War schon eingetragen.");
          });
        } catch (e) {}
        setTimeout(schleife, 300);
      };
      schleife();
    } catch (e) {
      box.innerHTML = `<div class="box warnung">Kamera nicht verfügbar (${esc(e.message)}). Nutze die Kamera-App oder „Code eingeben“.</div>`;
      strom = null;
    }
  }
  function scannerAus() {
    if (strom) strom.getTracks().forEach(t => t.stop());
    strom = null;
    document.getElementById("scanner").innerHTML = "";
  }
  function stopp() { scannerAus(); zeichnen(); }

  start();
})();
