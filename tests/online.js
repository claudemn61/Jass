// Prüft die Sitz-Drehung des Online-Spiels: Hin- und Rückdrehung ergibt den Ausgangszustand,
// und die Sicht eines Gasts enthält keine fremden Hände.  Aufruf: node tests/online.js
const O = require("../online.js");
const assert = require("assert");

const rec = (n) => ({ no: n, start: [[1, 2], [3, 4], [5, 6], [7, 8]], chooser: 1, decider: 3, pushed: true, trump: 2,
  tricks: [[{ p: 1, c: 1 }, { p: 2, c: 5 }, { p: 3, c: 7 }, { p: 0, c: 2 }]], pile: { p: 2, cards: [{ p: 2, c: 6 }, { p: 3, c: 8 }], nTrick: 1 } });
const g = {
  id: 1, scores: [120, 340], target: 2500, mult: "stufe", nextChooser: 2, over: { winner: 1 }, berg: 0, seatPerm: [0, 1, 2, 3],
  pend: { match: [1, 0], berg: [0, 1] },
  history: [{ no: 1, trump: 2, decider: 3, pushed: true, total: [57, 100], match: 1, parts: [[0, 20], [57, 80]], rec: rec(1) }],
  lastRound: rec(1),
  round: {
    no: 2, hands: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]], start: [[1, 2, 3, 20], [4, 5, 6, 21], [7, 8, 9, 22], [10, 11, 12, 23]],
    chooser: 1, decider: 3, pushed: true, trump: 2, phase: "roundEnd", trick: [{ p: 1, c: 4 }, { p: 2, c: 7 }], turn: 3, played: [4], trickPts: [10, 20], tricks: [3, 6],
    trickNo: 2, lastTrick: { cards: [{ p: 3, c: 10 }, { p: 0, c: 1 }], winner: 3, pts: 14 }, tricksLog: [[{ p: 1, c: 4 }, { p: 2, c: 5 }, { p: 3, c: 6 }, { p: 0, c: 7 }]],
    weis: { byPlayer: [[{ pts: 20 }], [], [{ pts: 50 }], []], winnerTeam: 0, pts: [70, 0] }, weisSkip: [false, true, false, false], stoeck: 2, stoeckDone: true,
    result: { mult: 2, trick: [100, 57], weis: [70, 0], stoeck: [20, 0], total: [380, 114], match: 0 }, bedanktVon: 1,
    pile: { p: 1, cards: [{ p: 1, c: 3 }], nTrick: 0 },
  },
};
// ohne Maske: k dann (4-k)%4 ergibt das Original
for (let k = 0; k < 4; k++) {
  const v = O.viewFor(g, k, { mask: false });
  const back = O.viewFor(v, (4 - k) % 4, { mask: false });
  const strip = (x) => JSON.parse(JSON.stringify({ ...x, onlineNames: undefined }));
  assert.deepStrictEqual(strip(back), strip(g), "Rückdrehung k=" + k);
  // Gast sitzt immer unten (Sitz 0): seine eigene Hand liegt an Sitz 0
  assert.deepStrictEqual(v.round.hands[0], g.round.hands[k]);
  assert.strictEqual(v.round.decider, (3 - k + 4) % 4);
}
// Maske: laufende Runde → fremde Hände verdeckt (-1), eigene sichtbar
const g2 = { ...g, round: { ...g.round, phase: "play" } };
for (let k = 0; k < 4; k++) {
  const v = O.viewFor(g2, k);
  assert.deepStrictEqual(v.round.hands[0], g2.round.hands[k]);
  for (let i = 1; i < 4; i++) { assert(v.round.hands[i].every((c) => c === -1), "Hand " + i); assert(v.round.start[i].every((c) => c === -1)); assert.strictEqual(v.round.hands[i].length, g2.round.hands[(i + k) % 4].length); }
  assert.deepStrictEqual(v.round.start[0], g2.round.start[k]);
}
// Teams: ungerade Sitze tauschen Wir/Gegner
assert.deepStrictEqual(O.viewFor(g, 1).scores, [340, 120]);
assert.deepStrictEqual(O.viewFor(g, 2).scores, [120, 340]);
assert.strictEqual(O.viewFor(g, 1).over.winner, 0);
// Aktionsprüfung
const E = require("../engine.js");
const gp = { round: { phase: "play", turn: 2, trump: 0, trick: [], hands: [[], [], [0, 1, 9], []] } };
assert.strictEqual(O.checkAction(gp, 2, { t: "play", c: 0 }, E.legalCards), null);
assert.notStrictEqual(O.checkAction(gp, 1, { t: "play", c: 0 }, E.legalCards), null);
assert.notStrictEqual(O.checkAction(gp, 2, { t: "play", c: 5 }, E.legalCards), null);
console.log("online: alles ok");
