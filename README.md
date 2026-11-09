# Jass – Schieber

Schieber-Jass als PWA: du und dein Partner (Computer) gegen zwei Computer-Gegner.

- Trumpf wählen oder schieben, Obenabe/Undenufe
- Farbe angeben, Puur-Regel, Untertrumpfverbot
- Weis, Stöck, Match, letzter Stich, Multiplikatoren
- Deutschschweizer oder französische Karten
- Offline-fähig, Spielstand bleibt gespeichert

Kein Build-Schritt: `index.html` lädt React/Babel vom CDN und kompiliert `jass.jsx`
zur Laufzeit. Die Spiellogik liegt in `engine.js` und lässt sich mit
`node tests/sim.js` testen (simuliert Tausende Runden, prüft Regeln und Punktesumme).
