# Jass — Projektkontext für Claude Code

Schieber-Jass als PWA von claudemn61, gleiches Architekturmuster wie Tauchbuch/Flugbuch.

## Sprache & Stil
- Code-Kommentare, Commit-Messages und Antworten: Deutsch, Schweizer Rechtschreibung ("ss" statt "ß").
- Kurze, direkte Antworten. "V-" heisst: Version so belassen, kein Bump.

## Tech-Stack
- Kein Build-Schritt: React/JSX wird im Browser per Babel Standalone kompiliert.
- `engine.js`: reine Spiellogik (Karten, Regeln, Weis, Stöck, Abrechnung, Computer-Spieler),
  im Browser als `window.JassEngine`, in Node per `require()` testbar (`node tests/sim.js`).
- `jass.jsx`: UI und Spielablauf. `index.html`: Lader + Fehleranzeige. `sw.js`: Offline-Cache.
- Persistenz: `localStorage` mit Präfix `jass:` (`settings`, `game`, `stats`).
- Eigene Kartenbilder (z.B. Scans von AGMüller-Karten): **nur lokal im Gerät** in IndexedDB
  `jass-bilder`, niemals ins Repo (urheberrechtlich geschützt, Repo ist öffentlich).
- Deployment: GitHub Pages direkt vom `main`-Branch.

## Versionierung
- **Zurzeit keine Versionen:** bis eine gute Grundfunktionalität steht, kein Bump und keine
  Nachfrage zur Stufe (Wunsch von claudemn61). Danach gilt wieder:
- Patch = Bugfix, Minor = Feature, Major = Architektur. Vor jeder Code-Änderung nach der Stufe fragen
  (ausser "V-"/"keine Version").
- Jede Stufe erhöht `APP_VERSION` und bekommt einen `CHANGELOG`-Eintrag in `jass.jsx`.
- Bei Minor: Regeltext (`RulesModal` in `jass.jsx`) nachführen, falls betroffen.

## Git-Workflow
- Nach Abschluss ungefragt: committen, auf Feature-Branch pushen, nach `main` mergen und pushen.

## Vorgehen
- Syntax mit echtem JSX-Transformer (z.B. `sucrase`) prüfen; Engine-Änderungen mit `node tests/sim.js`.
- Keine neuen Abhängigkeiten/Build-Tools.
