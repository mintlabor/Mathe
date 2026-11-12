# Mathematik – Unterrichtseinheiten Klasse 5–10

Digitale Unterrichtseinheiten zum Durchspielen im Unterricht (Beamer / Browser).

## 👉 [Zur fertigen Seite: mintlabor.github.io/Mathe](https://mintlabor.github.io/Mathe/)

Direkt zu: [Klasse 8 Hauptschule – Wahrscheinlichkeiten](https://mintlabor.github.io/Mathe/klasse-8/hauptschule/wahrscheinlichkeiten/) · [Klasse 8 Realschule – Umfang und Flächen](https://mintlabor.github.io/Mathe/klasse-8/realschule/umfang-und-flaechen/)

> Hier auf github.com sieht man nur den Quellcode. Die fertige Seite mit Kacheln öffnet sich über den Link oben.

## Aufbau (wird nach unten immer kleiner)

```
Mathe/
├── index.html                  ← Startseite: Auswahl Klasse 5–10
├── style.css                   ← gemeinsames Design für alle Seiten
├── klasse-5/
│   ├── index.html              ← Auswahl der Schulform
│   ├── realschule/
│   │   ├── index.html          ← Übersicht aller Einheiten (Klasse 5, RS)
│   │   └── natuerliche-zahlen/ ← eine Unterrichtseinheit
│   │       ├── index.html      ← Übersicht der Stunden dieser Einheit
│   │       ├── stunde-1/       ← eine einzelne Stunde (Präsentation)
│   │       └── stunde-2/
│   └── hauptschule/
│       └── index.html          ← Übersicht aller Einheiten (Klasse 5, HS)
├── klasse-6/   (realschule/, hauptschule/)
├── klasse-7/   (realschule/, hauptschule/)
├── klasse-8/   (realschule/, hauptschule/)
├── klasse-9/   (realschule/, hauptschule/)
└── klasse-10/  (realschule/, hauptschule/)
```

**Ebene 1:** Startseite → Klasse wählen
**Ebene 2:** Klasse → Schulform wählen (Realschule / Hauptschule)
**Ebene 3:** Schulform → Unterrichtseinheit wählen
**Ebene 4:** Unterrichtseinheit → Stunde wählen
**Ebene 5:** Stunde → im Unterricht durchspielen

Jede Seite hat oben eine Pfad-Navigation (z. B. *Start › Klasse 7 › Realschule › Prozentrechnung › Stunde 2*),
damit man jederzeit eine Ebene zurückspringen kann.

## Neue Stunden bauen: Vorlage

Im Ordner [`vorlage/`](vorlage/) liegt das Grundgerüst mit gelb markierten Platzhaltern:

| Datei | Zweck | Ziel beim Kopieren |
|---|---|---|
| `vorlage/stunde-xx/index.html` | Präsentation (Beamer) mit allen Phasen | `klasse-N/schulform/einheit/stunde-NN/index.html` |
| `vorlage/schueler/stunde-xx.html` | Schülerseite: Buchaufgaben nach Niveau, Tipps, Selbstkontrolle | `…/einheit/schueler/stunde-NN.html` |
| `vorlage/schueler/exit-vorlage.html` | Exit-Ticket mit QR-Code | `…/einheit/schueler/exit-NN.html` |

Beim Kopieren die Pfade `../../` zu `../../../../` ändern. Buchaufgaben werden nur mit Seite und Nummer genannt, nie abgeschrieben.

## Aktivierende Bausteine (`bausteine.js`, lädt automatisch in jeder Präsentation)

| Ziel | Baustein |
|---|---|
| Alle antworten | `data-abstimmung` (ABCD mit 3-2-1-Countdown) · `data-denkzeit` (erst schreiben, dann sprechen) · 🎲 Zufallsauswahl (Taste Z) |
| Denkaufgaben | `data-schaetzen` (Schätzleiste) · `.fehlerkarte` (Fehler finden) · „Was passiert, wenn …?“ (eigenes Modell je Stunde) |
| Interesse | `.spannung` (Wette/„Stimmt das?“) · `.wahlkarten` (Wahl von Niveau, Kontext, Darstellung) |
| Kreativ | `.produkt` (eigene Aufgabe erfinden, erklären) · `.projekt` (Baustein fürs Einheitenprojekt) |
| Kooperation | `data-methode="tps | placemat | lerntempoduett | gruppenpuzzle | galeriegang | rollen"` (Klick auf Schritt startet Timer) |
| Sprache | `aside.wortspeicher` (Taste W) · `.satzhilfe` · `.leitmodell` |

Genaue Schreibweise steht oben in `bausteine.js`, Beispiele für alle Bausteine in `vorlage/stunde-xx/`.

## Exit-Ticket und Auswertung

- **Exit-Ticket** (`exit-ticket.js`): Schüler geben nur ein Kürzel ein (z. B. S07), beantworten 3–5 Fragen und schätzen sich selbst ein.
  Sie sehen sofort eine Ampel je Lernziel, ihre typischen Fehler und passende Buchaufgaben. Am Ende erscheint ein QR-Code.
- **Auswertung** ([`auswertung/`](auswertung/)): Die Lehrkraft scannt die QR-Codes (Kamera-App oder eingebauter Scanner) oder fügt Textcodes ein.
  Übersicht je Stunde (Fördergruppen, häufige Fehler), Verlauf je Schüler, Export als Excel-Liste, Sicherungsdatei.
- **Datenschutz:** Ergebnisse und Namen werden **nur im Browser der Lehrkraft** gespeichert und sind per PIN geschützt.
  Es gibt keinen Server und keine Daten im Repository. Regelmäßig unter „Sichern“ eine Sicherungsdatei herunterladen.
- Die Kennung eines Exit-Tickets ergibt sich aus dem Dateipfad (`klasse-8/hauptschule/einheit/schueler/exit-05.html` → `k8/hs/einheit/05`).
  Daraus liest die Auswertung die Texte der Lernziele und Fehlertypen. Exit-Tickets deshalb nicht umbenennen, wenn schon Ergebnisse vorliegen.
- `qr.js` erzeugt QR-Codes ohne externe Dienste. In Präsentationen: `<div data-qr="../schueler/exit-05.html"></div>`.

## Hinweis

Dieses Repository ist **öffentlich**. Alles hier ist über den Link für jeden abrufbar.
Lösungen, Notizen zu Schülern oder Noten gehören nicht hierher.
