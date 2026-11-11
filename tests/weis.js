// Prüft die Weisregeln gegen die verbindlichen Regeln des Schweizer Jassverzeichnisses
// (https://jassverzeichnis.ch/ueberblick-weisregeln-beim-jassen). Aufruf: node tests/weis.js
const E = require('../engine.js');
const id = (s, r) => s * 9 + r;
const four = (r) => [0, 1, 2, 3].map((s) => id(s, r));
let fails = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log((ok ? 'ok   ' : 'FEHLER ') + name, ok ? '' : JSON.stringify(got) + ' ≠ ' + JSON.stringify(want)); };
// Punktwerte
for (let r = 0; r < 9; r++) eq('vier Gleiche, Rang ' + r, E.findWeis(four(r)).map((w) => w.pts), [r === 5 ? 200 : r === 3 ? 150 : 100]);
const run = (n) => Array.from({ length: n }, (_, i) => id(0, i));
[[3, 20], [4, 50], [5, 100], [6, 150], [7, 200], [8, 250], [9, 300]].forEach(([n, p]) => eq(n + 'er-Reihenfolge', E.findWeis(run(n)).map((w) => w.pts), [p]));
// Kreuzweis: Dreiblatt Ass-König-Ober und vier Könige zählen beide
eq('Kreuzweis', E.findWeis([id(1, 8), id(1, 7), id(1, 6)].concat(four(7).filter((c) => c !== id(1, 7)))).map((w) => w.pts).sort((a, b) => a - b), [20, 100]);
// Rangfolge
const win = (hs, t) => E.resolveWeis(hs, t, 0).winnerTeam;
eq('Fünfblatt geht vor vier Königen', win([four(7), [id(1, 0), id(1, 1), id(1, 2), id(1, 3), id(1, 4)], [], []], 0), 1);
eq('höhere Karte: vier Asse vor vier Königen', win([four(7), four(8), [], []], 0), 1);
eq('Undenufe: vier Sechser vor vier Assen', win([four(8), four(0), [], []], 5), 1);
eq('Dreiblatt: Trumpffarbe vor Vorhand', win([[id(0, 8), id(0, 7), id(0, 6)], [id(3, 8), id(3, 7), id(3, 6)], [], []], 3), 1);
eq('Dreiblatt: sonst Vorhand', win([[id(0, 8), id(0, 7), id(0, 6)], [id(3, 8), id(3, 7), id(3, 6)], [], []], 2), 0);
eq('Siegerteam schreibt alle Weise', E.resolveWeis([run(3), [], four(7), []], 0, 0).pts, [120, 0]);
console.log(fails ? fails + ' FEHLER' : 'alles ok');
process.exit(fails ? 1 : 0);
