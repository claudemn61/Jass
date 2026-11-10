// Härtetest «Böcke auflegen»: in Tausenden Zufallsrunden prüft er bei jedem Auflegen, dass das
// Einzelspiel der Restrunde genau dasselbe Ergebnis liefert (Aufruf: node tests/claim.js)
const fs = require('fs'), vm = require('vm');
const E = require(require('path').resolve(__dirname, '../engine.js'));
const src = fs.readFileSync(require('path').resolve(__dirname, '../jass.jsx'), 'utf8');
const grab = (name, kind) => { const re = new RegExp('(?:^|\\n)((?:async )?function ' + name + '\\b[\\s\\S]*?\\n}\\n)'); return src.match(re)[1]; };
const code = ['canClaim','simulateRest','buildClaimReport'].map(n => grab(n)).join('\n');
const ctx = { E, console }; vm.createContext(ctx); vm.runInContext(code + '\nthis.canClaim=canClaim;this.simulateRest=simulateRest;this.buildClaimReport=buildClaimReport;', ctx);
let seed = 12345; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let claims = 0, bad = 0, rounds = 0, sample = null;
for (let n = 0; n < 6000; n++) {
  const hands = E.deal(rnd), start = hands.map(h => h.slice());
  const chooser = n % 4; let t = E.botChooseTrump(hands[chooser], true); if (t === 'push') t = E.botChooseTrump(hands[(chooser + 2) % 4], false);
  const r = { trump: t, hands, trick: [], turn: chooser, played: [], trickNo: 0, tricks: [0, 0], trickPts: [0, 0], tricksLog: [], chooser };
  rounds++;
  let done = false;
  for (let k = 0; k < 9 && !done; k++) {
    for (let j = 0; j < 4 && !done; j++) {
      const p = r.turn;
      if (ctx.canClaim(r, p)) {
        claims++;
        const rest = ctx.simulateRest(r, p);
        const rep = ctx.buildClaimReport(JSON.parse(JSON.stringify(r)), p, rest);
        const team = E.team(p);
        const sameTricks = rep.simTeam[team] === rep.remaining, samePts = rep.simPts[team] === rep.claimPts;
        if (!rep.allOk || !sameTricks || !samePts) { bad++; if (!sample) sample = { t, p, trickNo: r.trickNo, trick: r.trick, hands: r.hands, rep: { allOk: rep.allOk, simTeam: rep.simTeam, simPts: rep.simPts, claimPts: rep.claimPts, remaining: rep.remaining } }; }
        done = true; break;
      }
      const c = E.botPlay({ hand: r.hands[p], trick: r.trick, t, played: r.played, p, declarer: chooser, tricks: r.tricksLog });
      r.hands[p] = r.hands[p].filter(x => x !== c); r.trick.push({ p, c });
      if (r.trick.length === 4) {
        const w = r.trick[E.trickWinnerIdx(r.trick, t)].p;
        const pts = r.trick.reduce((s, e) => s + E.points(e.c, t), 0) + (r.trickNo === 8 ? 5 : 0);
        r.trickPts[E.team(w)] += pts; r.tricks[E.team(w)]++;
        r.tricksLog.push(r.trick); r.trick.forEach(e => r.played.push(e.c)); r.trick = []; r.turn = w; r.trickNo++;
      } else r.turn = (p + 1) % 4;
    }
  }
}
console.log('Runden', rounds, '· Auflegen ausgelöst', claims, '· Unstimmigkeiten', bad);
if (sample) console.log(JSON.stringify(sample));
