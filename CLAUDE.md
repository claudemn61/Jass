# Jass — Projektkontext für Claude Code

Bea’s Jass (Schieber-Jass als PWA) von claudemn61, gleiches Architekturmuster wie Tauchbuch/Flugbuch.

## Sprache & Stil
- Code-Kommentare, Commit-Messages und Antworten: Deutsch, Schweizer Rechtschreibung ("ss" statt "ß").
- Kurze, direkte Antworten. "V-" heisst: Version so belassen, kein Bump.

## Tech-Stack
- Kein Build-Schritt: React/JSX wird im Browser per Babel Standalone kompiliert.
- `engine.js`: reine Spiellogik (Karten, Regeln, Weis, Stöck, Abrechnung, Computer-Spieler),
  im Browser als `window.JassEngine`, in Node per `require()` testbar (`node tests/sim.js`).
- Computer-Spieler: Stufe «Stark» = Monte-Carlo-Suche (`botPlaySmart`, `botChooseTrumpSmart`) mit
  der Heuristik `botPlay` als Rollout; Stufe «Normal» = nur Heuristik. Spielstärke messen mit
  `node tests/strength.js [runden] [mcTrumpf 0/1] [seed]` (MC-Team gegen Heuristik-Team) und ganze
  Partien zweier Engine-Versionen: `node tests/duel.js <engineA.js> <engineB.js> [partien] [seed] [ziel]`
  (alte Version z.B. per `git show <commit>:engine.js > /tmp/alt.js`).
- Partnerregeln (in `botPlay`): erster Abwurf = Verwerfen (schwache Farbe), danach Schmieren
  oder Verwerfen; Bock des Partners → Karte direkt darunter zugeben; vom Partner verworfene Farbe
  nicht anspielen. Bedanken: Gegner automatisch bei Erreichen der Zielpunkte, für «Wir» per Knopf (falsch bedankt =
  verloren); am Rundenende normale Abrechnung (Stöck – Weis – Stich).
- Alle Böcke auflegen (`canClaim`, `doClaim` in `jass.jsx`): wer an der Reihe ist und nur noch
  Karten hat, die kein anderer Spieler (auch der Partner nicht) schlagen kann (Nicht-Trumpf nur,
  wenn sonst niemand Trumpf hat; einen laufenden Stich gewinnt er selbst sicher), wirft alles hin –
  der ganze Haufen geht an sein Team, +5 letzter Stich. Replay zeigt die Restrunde einzeln
  (`simulateRest`). Rundenabrechnung → «Bock-Protokoll» (`buildClaimReport`, `ClaimReportModal`)
  erklärt jede Karte und macht die Gegenprobe. Härtetest: `node tests/claim.js` (muss 0
  Unstimmigkeiten melden – bei jeder Änderung an canClaim/simulateRest laufen lassen).
- Jasstafel (`TafelModal`): Schiefer-Optik als SVG. Vorderseite Z, pro Runde ergänzt (nie ausradiert): 100er in Fünferbündeln (V nur bei 500
  in einer Runde), 50er je zwei über Kreuz, 20er in Fünferbündeln; nur Einer (als Zahl) werden angepasst
  (ab 11 → 20er-Strich + Minus-Einer, z.B. 9 + 8 = 20er und −3). Rückseite Striche über alle Spiele; bei Spielabbruch werden die Striche dieses Spiels
  (`game.pend`) abgezogen, einzelne Striche manuell löschbar (Match 1, Sieg 2, Berg 1; Berg = 60 % des Ziels, bei Ziel 1000 kein Berg).
- `jass.jsx`: UI und Spielablauf. `index.html`: Lader + Fehleranzeige. `sw.js`: Offline-Cache.
- Mitspieler am Tisch: iPad gefächerte Karten (`CardFan`) mit Name darunter, iPhone nur der Name; keine Spielerbilder.
- Einstellung `dealMode` (Austeilen): `geber` (Karten fliegen vom Geber = Spieler vor dem ersten Ansager,
  ausgeteilt ab dem ersten Ansager), `mitte`, `aus`; Animation 5 s, 12 Päckchen à 3 (`DealAnim`).
- Einstellungen `weisAsk` (Rückfrage vor deiner ersten Karte; Computer entscheiden per `botWeisDecision`;
  `WEISASK`, `applyHumanWeis`, `E.resolveWeis(..., skip)`) und `sortDir` (`lr`|`rl`, Handsortierung).
- Einstellung `thank` (Bedanken): `knopf` | `auto` | `aus`, Modulvariable `THANK` in `jass.jsx`.
- Offene Karten (Einstellung `openCards`): Lernmodus, nur Anzeige für den Menschen; die
  Computer erhalten diese Information nicht.
- Persistenz: `localStorage` mit Präfix `jass:` (`settings`, `game`, `stats`, `striche`).
- Eigene Kartenbilder (z.B. Scans von AGMüller-Karten): **nur lokal im Gerät** in IndexedDB
  `jass-bilder`, niemals ins Repo (urheberrechtlich geschützt, Repo ist öffentlich).
- Eigene Farbsymbole: IndexedDB-Keys `icon:<deck>:<farbe>`, `icon:obe`, `icon:unde`; `SuitIcon`/`ModeIcon`
  verwenden sie (wenn «Eigene Bilder verwenden» an) überall statt der gezeichneten Symbole.
- Backup (Einstellungen → Backup): JSON-Datei mit allen `jass:`-Keys und den Kartenbildern aus
  IndexedDB; Teilen über `navigator.share` (Fallback Download). Neue dauerhafte Daten immer mit
  Präfix `jass:` speichern, sonst fehlen sie im Backup.
- Deployment: GitHub Pages direkt vom `main`-Branch.

## Versionierung
- Patch = Bugfix, Minor = Feature, Major = Architektur. Vor jeder Code-Änderung nach der Stufe fragen
  (ausser "V-"/"keine Version").
- Jede Stufe erhöht `APP_VERSION` und bekommt einen `CHANGELOG`-Eintrag in `jass.jsx`.
- Bei Minor: Regeltext (`RulesModal` in `jass.jsx`) nachführen, falls betroffen.

## Git-Workflow
- Nach Abschluss ungefragt: committen, auf Feature-Branch pushen, nach `main` mergen und pushen.

## Vorgehen
- Syntax mit echtem JSX-Transformer (z.B. `sucrase`) prüfen; Engine-Änderungen mit `node tests/sim.js`.
- Keine neuen Abhängigkeiten/Build-Tools.
