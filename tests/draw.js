// Prüft die Auswertung von «Wer spielt zusammen»: Teams (inkl. Gleichstand in der Mitte) und «Wer gibt?»
// (tiefere Karte gibt, das Ass gilt als tiefste Karte). Aufruf: node tests/draw.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const E = require('../engine.js');
const src = fs.readFileSync(path.resolve(__dirname, '../jass.jsx'), 'utf8');
const grab = (name) => src.match(new RegExp('(?:^|\\n)(function ' + name + '\\b[\\s\\S]*?\\n}\\n)'))[1];
const ctx = { E }; vm.createContext(ctx);
vm.runInContext(grab('drawTeamStep') + grab('drawDealerWinner') + '\nthis.step=drawTeamStep;this.dealer=drawDealerWinner;', ctx);
let fails = 0;
const eq = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log((ok ? 'ok   ' : 'FEHLER ') + n, ok ? '' : JSON.stringify(got) + ' ≠ ' + JSON.stringify(want)); };
const c = (s, r) => s * 9 + r; // r: 0=6 … 8=Ass
// Teams: höchste zwei
eq('Teams: zwei höchste', ctx.step({ 0: c(0, 7), 1: c(1, 2), 2: c(2, 3), 3: c(3, 8) }, [0, 1, 2, 3], 2).top.sort(), [0, 3]);
// Gleichstand in der Mitte → die beiden ziehen nochmals
let r = ctx.step({ 0: c(0, 8), 1: c(1, 4), 2: c(2, 4), 3: c(3, 0) }, [0, 1, 2, 3], 2);
eq('Gleichstand mitte: sicher oben', r.top, [0]); eq('Gleichstand mitte: ziehen nochmals', r.tie.sort(), [1, 2]); eq('Gleichstand mitte: ein Platz offen', r.k, 1);
// Gleiche Werte oben sind kein Problem (beide gehören zu den obersten zwei)
eq('Gleiche Werte oben', ctx.step({ 0: c(0, 6), 1: c(1, 6), 2: c(2, 1), 3: c(3, 0) }, [0, 1, 2, 3], 2).top.sort(), [0, 1]);
// dreifacher Gleichstand an der Grenze
r = ctx.step({ 0: c(0, 5), 1: c(1, 5), 2: c(2, 5), 3: c(3, 0) }, [0, 1, 2, 3], 2);
eq('Dreifach gleich: alle drei ziehen', r.tie.sort(), [0, 1, 2]); eq('Dreifach gleich: zwei Plätze offen', r.k, 2);
// Wer gibt?
eq('tiefere Karte gibt (du)', ctx.dealer(0, c(0, 2), 3, c(1, 6)), 0);
eq('tiefere Karte gibt (links)', ctx.dealer(0, c(0, 7), 3, c(1, 1)), 3);
eq('Ass muss geben (du)', ctx.dealer(0, c(0, 8), 3, c(1, 0)), 0);
eq('Ass muss geben (links)', ctx.dealer(0, c(0, 0), 3, c(1, 8)), 3);
eq('gleicher Wert → nochmals', ctx.dealer(0, c(0, 4), 3, c(2, 4)), null);
eq('zwei Asse → nochmals', ctx.dealer(0, c(0, 8), 3, c(3, 8)), null);
// Zufallstest: Auswertung terminiert immer mit genau zwei Gewinnern
let bad = 0, redraws = 0, pile;
for (let i = 0; i < 20000; i++) {
  const deck = E.shuffle(E.ALL, Math.random); let pos = 0, cand = [0, 1, 2, 3], k = 2, sure = [], cards = {};
  cand.forEach((p) => (cards[p] = deck[pos++]));
  for (let g = 0; g < 50; g++) {
    const res = ctx.step(cards, cand, k);
    if (!res.tie) { const top = sure.concat(res.top); if (top.length !== 2 || new Set(top).size !== 2) bad++; break; }
    redraws++; sure = sure.concat(res.top); cand = res.tie; k = res.k; cand.forEach((p) => (cards[p] = deck[pos++]));
  }
}
eq('20000 Auslosungen: immer genau zwei Gewinner', bad, 0); console.log('(davon mit Gleichstand-Wiederholung:', redraws, ')');
console.log(fails ? fails + ' FEHLER' : 'alles ok'); process.exit(fails ? 1 : 0);
