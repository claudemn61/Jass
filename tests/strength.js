// Vergleicht Monte-Carlo-Spieler (Team 0) mit der Heuristik (Team 1).
// Aufruf: node tests/strength.js [runden] [smartTrumpf 0/1]
const E = require('../engine.js');
const N = +process.argv[2] || 200, smartTrump = process.argv[3] !== '0';
let seed = +process.argv[4] || 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let tot = [0, 0], raw = [0, 0], t0 = Date.now(), maxMs = 0;
for (let i = 0; i < N; i++) {
  const chooser = i % 4;
  const hands = E.deal(rnd);
  const smart = (p) => E.team(p) === 0;
  const choose = (p, canPush) => smart(p) && smartTrump ? E.botChooseTrumpSmart(hands[p], canPush, p, 'stufe', { seed: i * 7 + p }) : E.botChooseTrump(hands[p], canPush);
  let t = choose(chooser, true);
  if (t === 'push') t = choose((chooser + 2) % 4, false);
  const tricks = []; let turn = chooser; const pts = [0, 0], won = [0, 0];
  for (let k = 0; k < 9; k++) {
    const trick = [];
    for (let j = 0; j < 4; j++) {
      const p = (turn + j) % 4;
      const played = []; tricks.forEach((tr) => tr.forEach((e) => played.push(e.c)));
      const st = Date.now();
      const c = smart(p) ? E.botPlaySmart({ hand: hands[p], trick, t, p, declarer: chooser, tricks, tricksWon: won, seed: i * 1000 + k * 10 + j })
                         : E.botPlay({ hand: hands[p], trick, t, played, p, declarer: chooser });
      maxMs = Math.max(maxMs, Date.now() - st);
      if (!E.legalCards(hands[p], trick, t).includes(c)) throw new Error('illegal');
      hands[p] = hands[p].filter((x) => x !== c); trick.push({ p, c });
    }
    const w = trick[E.trickWinnerIdx(trick, t)].p;
    pts[E.team(w)] += trick.reduce((s, e) => s + E.points(e.c, t), 0) + (k === 8 ? 5 : 0); won[E.team(w)]++;
    tricks.push(trick); turn = w;
  }
  const m = E.multiplier(t, 'stufe');
  const fin = [0, 1].map((x) => (won[x] === 9 ? 257 : won[1 - x] === 9 ? 0 : pts[x]));
  raw[0] += fin[0]; raw[1] += fin[1]; tot[0] += fin[0] * m; tot[1] += fin[1] * m;
}
console.log(`Runden ${N}: Stichpunkte Ø MC ${(raw[0] / N).toFixed(1)} vs Heuristik ${(raw[1] / N).toFixed(1)} | mit Multiplikator Ø ${(tot[0] / N).toFixed(1)} vs ${(tot[1] / N).toFixed(1)} | ${((Date.now() - t0) / 1000).toFixed(0)}s, max Zug ${maxMs}ms`);
