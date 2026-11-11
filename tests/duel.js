// Ganze Partien (mit Bedanken) zwischen zwei Engine-Versionen:
// Team 0 = Engine A, Team 1 = Engine B. Seiten werden pro Partie getauscht.
// Aufruf: node tests/duel.js <engineA.js> <engineB.js> [partien] [seed] [ziel]
const path = require('path');
const A = require(path.resolve(process.argv[2])), B = require(path.resolve(process.argv[3]));
const G = +process.argv[4] || 20, target = +process.argv[6] || 1500;
let seed = +process.argv[5] || 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const E = A;
let winsA = 0, diffA = 0, rounds = 0, t0 = Date.now();
for (let g = 0; g < G; g++) {
  const engOf = (p) => ((E.team(p) + g) % 2 === 0 ? A : B); // Seitenwechsel
  const teamA = g % 2 === 0 ? 0 : 1;
  const scores = [0, 0]; let winner = null; let chooser = g % 4;
  while (winner == null) {
    rounds++;
    const hands = E.deal(rnd), start = hands.map((h) => h.slice());
    const ch = (p, canPush) => engOf(p).botChooseTrumpSmart(hands[p], canPush, p, 'stufe', { scores, target, seed: Math.floor(rnd() * 1e9) });
    let t = ch(chooser, true); if (t === 'push') t = ch((chooser + 2) % 4, false);
    const weis = E.resolveWeis(start, t, chooser), st = E.findStoeck(start, t), m = E.multiplier(t, 'stufe');
    const tricks = [], won = [0, 0], tp = [0, 0]; let turn = chooser, stDone = false;
    const run = () => { const r = scores.slice(); const add = (a) => [0, 1].forEach((i) => (r[i] += a[i] * m));
      const stA = [0, 0]; if (stDone && st != null) stA[E.team(st)] = 20; add(stA); add(tricks.length >= 1 ? weis.pts : [0, 0]); return r; };
    for (let k = 0; k < 9 && winner == null; k++) {
      const trick = [];
      for (let j = 0; j < 4; j++) {
        const p = (turn + j) % 4;
        const played = []; tricks.forEach((tr) => tr.forEach((e) => played.push(e.c)));
        const r0 = run(); [0, 1].forEach((i) => (r0[i] += tp[i] * m));
        const c = engOf(p).botPlaySmart({ hand: hands[p], trick, t, p, declarer: chooser, played, tricks, tricksWon: won, weis, endgame: { run: r0, mult: m, target }, seed: Math.floor(rnd() * 1e9) });
        if (!E.legalCards(hands[p], trick, t).includes(c)) throw new Error('illegal');
        hands[p] = hands[p].filter((x) => x !== c); trick.push({ p, c });
        if (st === p && !hands[p].includes(t * 9 + 6) && !hands[p].includes(t * 9 + 7)) stDone = true;
      }
      const w = trick[E.trickWinnerIdx(trick, t)].p;
      tp[E.team(w)] += trick.reduce((s, e) => s + E.points(e.c, t), 0) + (k === 8 ? 5 : 0); won[E.team(w)]++;
      tricks.push(trick); turn = w;
      // Bedanken: Reihenfolge Stöck – Weis – Stich
      const r = scores.slice(); const stA = [0, 0]; if (stDone && st != null) stA[E.team(st)] = 20;
      for (const part of [stA, weis.pts, k === 8 && won[0] === 9 ? [257, 0] : k === 8 && won[1] === 9 ? [0, 257] : tp]) {
        [0, 1].forEach((i) => (r[i] += part[i] * m));
        if (winner == null) { const hit = [0, 1].filter((i) => r[i] >= target); if (hit.length === 1) winner = hit[0]; else if (hit.length === 2) winner = part[0] >= part[1] ? 0 : 1; }
      }
      if (winner != null || k === 8) { diffA += (r[teamA] - scores[teamA]) - (r[1 - teamA] - scores[1 - teamA]); scores[0] = r[0]; scores[1] = r[1]; }
    }
    chooser = (chooser + 1) % 4;
  }
  if (winner === teamA) winsA++;
}
if (A.__stat) console.log('Variante: Entscheidungen aus der Vorhand', A.__stat.calls, '· davon «sehr schwach für ×2/×3 → selber einfach»', A.__stat.weak);
console.log(`Partien ${G}: A gewinnt ${winsA} (${Math.round(100 * winsA / G)}%), Ø Rundenvorsprung A ${(diffA / rounds).toFixed(1)} | ${((Date.now() - t0) / 1000).toFixed(0)}s`);
