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
- Pflichtwahl nach dem Schieben (Partner, Stufe «Stark», `botChooseTrumpSmart` mit `canPush=false`): simuliert mit dem
  Schieber als Ausspieler (`lead = (p+2)%4`) und zieht jeden simulierten Konter-Match (Gegner alle 9 Stiche) zusätzlich ab
  (`SAFE_MATCH`). Messung: Konter-Match 0.9 % → 0.5 %, Ø Differenz +14, Duell 58 % für die neue Version (60 Partien).
  Bei schwacher Hand (Erwartungswert < `SAFE_WEAK` = 0) nur Rosen/Eicheln (×1), damit eine Niederlage einfach zählt; Messung: neutral (Ø −1 Punkt).
- Trumpfwahl-Strategie (alle Computer): aus der Vorhand Rosen/Eicheln (bei gestaffelter Zählung nur ×1)
  nur, wenn ≥ 100 Punkte realistisch sind (Simulation: ≥ `CHEAP_HIT` der Verteilungen; Heuristik: Wertung
  ≥ `CHEAP_MIN_SC`), sonst schieben. Gilt nicht für den Partner nach dem Schieben (muss wählen).
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
- Weisregeln sind **verbindlich nach https://jassverzeichnis.ch/ueberblick-weisregeln-beim-jassen**
  (vier Gleiche 6–Ass = 100, Nell 150, Under 200; Folgen 20/50/100/150/200/250/300; Rangfolge bei
  Gleichstand: Folge vor Vierling, höhere Karte (Undenufe: tiefste), Trumpffarbe, Vorhand).
  Prüfung: `node tests/weis.js` (muss «alles ok» melden).
- Einstellung `teamDraw` (Wer spielt zusammen): bei «Neues Spiel» zieht jeder eine Karte (`DrawScreen`, du tippst
  auf den Stapel); die zwei höchsten spielen zusammen (Gleichstand in der Mitte → nochmals ziehen,
  `drawTeamStep`), dann du gegen den Spieler links: tiefere Karte gibt, das Ass gilt als tiefste und gibt
  (`drawDealerWinner`). Ergebnis → `game.seatPerm` + `nextChooser` (Vorhand = rechts vom Geber).
  Prüfung: `node tests/draw.js`.
- Einstellung `dealMode` (Austeilen): `geber` (Karten fliegen vom Geber = Spieler vor dem ersten Ansager,
  ausgeteilt ab dem ersten Ansager), `mitte`, `aus`; Animation 5 s, 12 Päckchen à 3 (`DealAnim`).
- Einstellungen `weisAsk` (Rückfrage vor deiner ersten Karte; Computer entscheiden per `botWeisDecision`;
  `WEISASK`, `applyHumanWeis`, `E.resolveWeis(..., skip)`) und `sortDir` (`lr`|`rl`, Handsortierung).
- Einstellung `shuffleSeats` (Mitspieler): bei jedem neuen Spiel Zuordnung der drei anderen Spieler
  gemischt; `game.seatPerm[sitz]` = Index in `settings.names` (NAMES kommt daraus).
- Einstellung `thank` (Bedanken): `knopf` | `auto` | `aus`, Modulvariable `THANK` in `jass.jsx`.
- Offene Karten (Einstellung `openCards`): Lernmodus, nur Anzeige für den Menschen; die
  Computer erhalten diese Information nicht.
- Online-Spiel (`online.js`, `window.JassOnline`; Test: `node tests/online.js`): Host-autoritativ. Der Host führt das Spiel wie bisher
  (Computer füllen freie Sitze, `humanSeat()` in `jass.jsx`) und sendet jedem Gast bei jeder Änderung `viewFor(game, seat)`:
  alle Sitz-Felder auf den Gast gedreht (Gast = Sitz 0), Teams bei ungeradem Sitz vertauscht, fremde Hände mit -1 maskiert.
  Gäste senden nur Aktionen (`play`/`choose`/`push`), der Host prüft sie mit `checkAction`. Transport: PeerJS (WebRTC,
  `bea-jass-<CODE>`, Skript lazy von jsdelivr) – austauschbar, `window.JASS_NET = "mock"` = BroadcastChannel für lokale Tests
  (zwei Tabs im selben Browser). Online abgeschaltet: Bedanken (`THANK = "aus"`), Weis-Rückfrage, `claimOn`, Austeil-Animation,
  Tempo «Manuell». Gäste speichern den fremden Spielstand nicht (`save("game")` übersprungen).
- Persistenz: `localStorage` mit Präfix `jass:` (`settings`, `game`, `stats`, `striche`, `serie`).
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

## Arbeitsstand (Session-Zusammenfassung, Stand v3.1.0)

Dateien: `jass.jsx` (UI/Ablauf, ~3200 Zeilen), `engine.js` (Logik, Bots, `explainPlay`), `online.js` (Online-Spiel), `sw.js`
(Offline-Cache, `CACHE_VERSION` bei neuen Dateien erhöhen), `cards-fr/` (36 französische Karten als WebP, gemeinfrei, `LIZENZ.txt`),
`tests/` (`sim`, `strength`, `duel`, `claim`, `weis`, `draw`, `online`).

### Wie der Nutzer arbeitet
- Kurze Korrekturen und Screenshots vom iPhone (Bildbreite ≈ 2,4× pt). «V-» = kein Versions-Bump, sonst Stufe wählen; trotzdem immer
  committen, pushen und nach `main` mergen. Einzelne Rückfragen nur bei echter Mehrdeutigkeit.
- Wünsche sind wörtlich gemeint («identisch», «Titel ganz links», «oben 4, unten 5»); bei Korrektur den letzten Schritt anpassen, nicht neu diskutieren.
- Prüfen wie bisher: `sucrase` (JSX-Syntax), `node tests/*.js`, Browser-Test mit Playwright: CDN-Skripte (`react`, `react-dom`, `@babel/standalone`)
  per `page.route` auf lokale `node_modules` umleiten, `python3 -m http.server`, Spielzustände per `localStorage` («jass:game», «jass:settings»)
  einspielen, Screenshot im 390×844-Viewport ansehen. Playwright-Selektor `text=…` trifft Teilstrings (bei «Beitreten» den Button genau wählen).
- Urheberrecht: Eigene Kartenbilder (AGMüller-Scans) und Backup-Dateien (`*.jass`) enthalten Scans → **nie ins Repo**, nie veröffentlichen.
  Mitgelieferte Bilder nur gemeinfrei/eigen (Filz/Schiefer-Fotos des Nutzers, Vector Playing Cards von Byron Knoll).

### Entscheidungen und Gründe (nicht erneut diskutieren)
- **Settings**: eine Einstellung pro Zeile (Titel links, Knöpfe dahinter), Gruppen Spiel / Mitspieler / Ablauf / Karten & Anzeige / Daten;
  Knopf «Standard» in der Titelzeile (`STANDARD_SETTINGS`, lässt Namen, Bilder, Serie unberührt). Mitspieler: Fest/Zufällig/Ziehen (eine Auswahl).
  Karte spielen: nur Tippen/Wischen. Bedanken: Manuell/Auto/Aus.
- **Serie** statt «Jassabend»: Haken bei «Neues Spiel» (bleibt gesetzt); mit Haken zählen Striche weiter, ohne Haken Reset. Nach Spielende
  «Serie fortsetzen/beenden» mit Gesamtresultat (`SerieModal`); Jasstafel-Reiter «Serie» (alle Runden aller Spiele).
- **Weis**: gültiger Weis wird nach dem ersten Stich sofort geschrieben (Kopfzeile + Jasstafel, `weisLive`), `game.scores` erst am Rundenende;
  in Abrechnung/Runden steht der Weis-Anteil in Klammern; Tippen auf eine Runde in Jasstafel → Replay (`entry.rec`).
- **Hand (iPhone)**: Kartenreihen 1 / 2 (Teilung möglichst an der Farbgrenze, je Reihe ≤ 6, nie 2/7) / Fächer (gebeugt). Überlappung wie echte
  Karten: «Li→Re» linke Karte vorne, «Re→Li» rechte Karte vorne (nicht nach Kartenwert). Hand nahe am unteren Rand.
- **Titelzeile**: iOS legt am oberen Rand einen Unschärfe-Effekt über Inhalt in der Nähe der Statusleiste → Inhalt nicht höher setzen
  (`safe-area-inset-top + 10px`). «Wir» ganz links, «Gegner» ganz rechts; Trumpf nur in der Mitte bei «Trumpf oben/Beides»
  (dann Zeile so hoch wie nötig, sonst schmal).
- **Trumpf-Anzeige** (`trumpAt`: oben/spieler/beides): beim Spieler ausserhalb der Namenskachel – Links/Rechts darüber, Partner links daneben
  (Weis rechts daneben), eigener Trumpf links, eigener Weis rechts der gesammelten Stiche; «Letzter Stich» unter der Jasstafel; gelber Stern.
- **Lernmodus «Offene Karten»**: offene Hände (Partner 1 Reihe, Links/Rechts 3×3, ohne Überlappung) und pro Computer-Zug eine Begründung
  (`E.explainPlay`, nachträgliche Beurteilung) plus bei «Stark» das Simulationsergebnis (`ctx.info` aus `botPlaySmart`: Ø Punktunterschied je
  Karte, ▶ = gespielt, «Partnerregel geht vor»), Feld in ganzer Breite zwischen Tisch und Hand.
- **Französische Karten**: mitgelieferte Bilder (`FR_RANK`/`FR_SUIT`, Dateiname `<Rang><D|H|S|C>.webp`), eigene Bilder gehen vor; Dame/Bube mit
  «D»/«B» statt Q/J (Text in der SVG-Quelle geändert, dann gerastert); Karten werden vorgeladen (`preloadFr`), sonst erscheinen sie verzögert;
  Farbsymbole auf weissem Feld. Quelle/Lizenz: siehe `cards-fr/LIZENZ.txt` und Info-Dialog.
- **Strategie**: Pflichtwahl nach dem Schieben vorsichtig (Konter-Match-Strafe), Rosen/Eicheln-Regel (`CHEAP_*`); «Weiterspielen» ist grau,
  wenn kein Spiel läuft.
- **Online** (v3.0.0, Major): siehe Abschnitt «Online-Spiel» oben. Bisher nur mit dem Test-Transport (`window.JASS_NET = "mock"`) geprüft, **nicht**
  über echtes Internet/PeerJS; kein Bedanken, keine Weis-Rückfrage, kein Auflegen aller Böcke, keine Austeil-Animation online.

### Offen / Ideen
- Echten Online-Test mit zwei Geräten (PeerJS, ohne TURN evtl. Verbindungsprobleme) und Fehlerfälle (Tisch voll, Host schliesst).
- Angebot nicht umgesetzt: Bedanken im ersten Stich an die Ausmachregel (Stöck–Weis–Stich) angleichen, optional früher Stöck-Anspruch.
- Begründung im Lernmodus erklärt nur Kartenspiel, nicht Trumpfwahl/Weisen.
- Normal-Stufe: Pflichtwahl-Vorsicht nur bei «Stark» (keine Faustregel gefunden).
