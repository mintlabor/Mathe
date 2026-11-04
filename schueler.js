/*
  Schülerseiten: Übungen mit Selbstkontrolle, gestuften Tipps und Ampel-Selbsteinschätzung.

  Übungsseite:  window.SEITE = { speicher, stunde, lernziele: [...], ichKann: [...], aufgaben: [...] }
  Lernlandkarte: window.KARTE = { speicher, stunden: [{ nr, titel, problem, ichKann: [...], link }] }

  Aufgabe: { niveau: 1|2|3, frage, typ: "zahl"|"menge"|"auswahl", loesung, optionen?, einheit?, toleranz?, tipps: [...], erklaerung }
    zahl:    loesung = Zahl oder Liste erlaubter Zahlen (Komma oder Punkt, %, € werden ignoriert)
    menge:   loesung = Liste der Elemente, Reihenfolge egal, z. B. ["2","4","6"]; [] = leere Menge { }
    auswahl: loesung = Index der richtigen Option
  Die Ampel-Einschätzungen werden im Browser gespeichert (localStorage) und auf der Lernlandkarte angezeigt.
*/
(function () {
  const NIVEAU = { 1: "● Basis", 2: "●● Standard", 3: "●●● Profi" };

  // ---------- Speicher für die Ampel ----------
  function lade(schl) { try { return JSON.parse(localStorage.getItem(schl) || "{}"); } catch (e) { return {}; } }
  function speichere(schl, wert) { try { localStorage.setItem(schl, JSON.stringify(wert)); } catch (e) {} }

  function ampelZeile(text, id, schl) {
    const z = document.createElement("div");
    z.className = "ampel-zeile";
    z.innerHTML = `<span>${text}</span><div class="ampel-knoepfe">` +
      `<button data-w="gruen" title="sicher"></button><button data-w="gelb" title="fast"></button><button data-w="rot" title="noch nicht"></button></div>`;
    const stand = lade(schl);
    const knoepfe = z.querySelectorAll("button");
    const zeigen = w => knoepfe.forEach(b => b.classList.toggle("an", b.dataset.w === w));
    zeigen(stand[id]);
    knoepfe.forEach(b => b.onclick = () => {
      const s = lade(schl);
      s[id] = s[id] === b.dataset.w ? undefined : b.dataset.w;
      speichere(schl, s);
      zeigen(s[id]);
    });
    return z;
  }

  // ---------- Prüfen ----------
  const norm = t => String(t).toLowerCase().replace(/€|euro|%|prozent/g, "").replace(/\s+/g, "").replace(",", ".");
  function pruefe(a, eingabe) {
    if (a.typ === "zahl") {
      const x = parseFloat(norm(eingabe));
      if (!Number.isFinite(x)) return null;
      const erlaubt = [].concat(a.loesung);
      const tol = a.toleranz ?? 0.001;
      return erlaubt.some(l => Math.abs(l - x) <= tol);
    }
    if (a.typ === "menge") {
      if (!eingabe.trim()) return null;
      const teile = eingabe.toLowerCase().split(/[{}\s,;]+/).filter(Boolean);
      const soll = a.loesung.map(x => String(x).toLowerCase());
      const ist = [...new Set(teile)];
      return ist.length === soll.length && soll.every(x => ist.includes(x));
    }
    if (a.typ === "auswahl") {
      if (eingabe === null) return null;
      return Number(eingabe) === a.loesung;
    }
    return null;
  }

  // ---------- Übungsseite ----------
  function uebungsseite(S) {
    const schl = S.speicher + "-ampel";

    // Lernziele
    const ziele = document.getElementById("ziele");
    ziele.innerHTML = `<div class="box ziele"><h3>🎯 Das lernst du hier</h3><ul>${S.lernziele.map(z => `<li>${z}</li>`).join("")}</ul></div>` +
      `<div class="weg"><div><b>1 · Planen</b>Lies die Ziele. Wähle dein Niveau. Unsicher? Starte mit ● Basis.</div>` +
      `<div><b>2 · Üben</b>Probiere zuerst allein. Nutze die Tipps erst, wenn du nicht weiterkommst.</div>` +
      `<div><b>3 · Prüfen</b>Schätze dich am Ende mit der Ampel ein. Rot? Dann übe noch einmal ● Basis.</div></div>`;

    // Niveau-Auswahl
    const wahl = document.getElementById("niveaus");
    const stufen = ["alle", 1, 2, 3];
    wahl.className = "niveau-wahl";
    stufen.forEach(n => {
      const b = document.createElement("button");
      b.textContent = n === "alle" ? "Alle Aufgaben" : NIVEAU[n];
      b.dataset.n = n;
      b.onclick = () => {
        wahl.querySelectorAll("button").forEach(x => x.classList.toggle("an", x === b));
        document.querySelectorAll(".aufgabe").forEach(a => a.classList.toggle("versteckt", n !== "alle" && a.dataset.niveau !== String(n)));
        fortschritt();
      };
      if (n === "alle") b.classList.add("an");
      wahl.appendChild(b);
    });

    // Aufgaben
    const liste = document.getElementById("aufgaben");
    S.aufgaben.forEach((a, i) => {
      const el = document.createElement("div");
      el.className = "aufgabe";
      el.dataset.niveau = a.niveau;
      let eingabe;
      if (a.typ === "auswahl") {
        eingabe = `<div class="optionen">${a.optionen.map((o, k) => `<label><input type="radio" name="a${i}" value="${k}"> <span>${o}</span></label>`).join("")}</div>`;
      } else {
        const ph = a.typ === "menge" ? "z. B. { 1, 2, 3 }" : "Zahl eingeben";
        eingabe = `<div class="eingabe"><input type="text" inputmode="${a.typ === "zahl" ? "decimal" : "text"}" placeholder="${ph}" aria-label="Antwort">${a.einheit ? `<span>${a.einheit}</span>` : ""}</div>`;
      }
      el.innerHTML = `<div class="kopf"><span>Aufgabe ${i + 1}</span><span class="punkte-niveau">${NIVEAU[a.niveau]}</span></div>` +
        `<div class="frage">${a.frage}</div>${eingabe}` +
        `<div class="knoepfe"><button class="btn haupt" data-a="pruefen">Prüfen</button>` +
        (a.tipps || []).map((t, k) => `<button class="btn" data-a="tipp" data-k="${k}">💡 Tipp ${k + 1}</button>`).join("") +
        `<button class="btn versteckt" data-a="loesung">Lösung zeigen</button></div>` +
        `<div class="rueckmeldung"></div>` +
        (a.tipps || []).map((t, k) => `<div class="tipp" data-k="${k}">💡 <strong>Tipp ${k + 1}:</strong> ${t}</div>`).join("") +
        `<div class="erklaerung">📘 ${a.erklaerung}</div>`;

      let fehler = 0;
      const rm = el.querySelector(".rueckmeldung");
      const lsg = el.querySelector('[data-a="loesung"]');
      el.querySelector('[data-a="pruefen"]').onclick = () => {
        let wert;
        if (a.typ === "auswahl") { const r = el.querySelector("input:checked"); wert = r ? r.value : null; }
        else wert = el.querySelector("input").value;
        const ok = pruefe(a, wert);
        if (ok === null) { rm.className = "rueckmeldung falsch"; rm.textContent = "Bitte gib zuerst eine Antwort ein."; return; }
        if (ok) {
          rm.className = "rueckmeldung ok"; rm.textContent = "✅ Richtig! Gut gemacht.";
          el.classList.add("richtig");
          el.querySelector(".erklaerung").classList.add("offen");
        } else {
          fehler++;
          rm.className = "rueckmeldung falsch";
          rm.textContent = fehler < 2 ? "❌ Noch nicht. Schau dir deine Antwort noch einmal an oder nutze einen Tipp." : "❌ Noch nicht. Du kannst dir jetzt die Lösung anzeigen lassen.";
          if (fehler >= 2) lsg.classList.remove("versteckt");
        }
        fortschritt();
      };
      el.querySelectorAll('[data-a="tipp"]').forEach(b => b.onclick = () => el.querySelector(`.tipp[data-k="${b.dataset.k}"]`).classList.toggle("offen"));
      lsg.onclick = () => el.querySelector(".erklaerung").classList.add("offen");
      el.querySelectorAll("input[type=text]").forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter") el.querySelector('[data-a="pruefen"]').click(); }));
      liste.appendChild(el);
    });

    // Fortschritt
    const fs = document.getElementById("fortschritt");
    fs.className = "fortschritt";
    fs.innerHTML = '<div class="balken"><div></div></div><span></span>';
    function fortschritt() {
      const sichtbar = [...document.querySelectorAll(".aufgabe:not(.versteckt)")];
      const ok = sichtbar.filter(a => a.classList.contains("richtig")).length;
      fs.querySelector(".balken div").style.width = (sichtbar.length ? ok / sichtbar.length * 100 : 0) + "%";
      fs.querySelector("span").textContent = `${ok} von ${sichtbar.length} richtig`;
    }
    fortschritt();

    // Ampel
    const amp = document.getElementById("ampel");
    amp.className = "box";
    amp.innerHTML = '<p style="margin:0 0 .3rem; color: var(--muted)">Tippe an: 🟢 sicher · 🟡 fast · 🔴 noch nicht. Deine Auswahl wird auf diesem Gerät gespeichert.</p>';
    S.ichKann.forEach((t, k) => amp.appendChild(ampelZeile(t, `s${S.stunde}-${k}`, schl)));
  }

  // ---------- Lernlandkarte ----------
  function lernlandkarte(K) {
    const schl = K.speicher + "-ampel";
    const ziel = document.getElementById("karte");
    K.stunden.forEach(st => {
      const c = document.createElement("div");
      c.className = "stundenkarte";
      c.innerHTML = `<h3>Stunde ${st.nr}: ${st.titel}</h3><div class="problem">${st.problem}</div>`;
      st.ichKann.forEach((t, k) => c.appendChild(ampelZeile(t, `s${st.nr}-${k}`, schl)));
      if (st.link) {
        const a = document.createElement("a");
        a.className = "link"; a.href = st.link; a.textContent = "Zu den Übungen →";
        c.appendChild(a);
      }
      ziel.appendChild(c);
    });
  }

  if (window.SEITE) uebungsseite(window.SEITE);
  if (window.KARTE) lernlandkarte(window.KARTE);
})();
