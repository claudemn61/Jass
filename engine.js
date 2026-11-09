// ── Jass-Engine (Schieber) ──────────────────────────────────────────────
// Reine Spiellogik ohne UI: Karten, Punkte, Stichregeln, Weis, Stöck,
// Rundenabrechnung und die Computer-Spieler. Wird im Browser als
// window.JassEngine bereitgestellt und kann in Node per require() getestet
// werden.
//
// Kartenkodierung: id = farbe * 9 + rang
//   Farbe: 0 Schellen/Ecken, 1 Rosen/Herz, 2 Schilten/Schaufel, 3 Eicheln/Kreuz
//   Rang:  0=6 1=7 2=8 3=9 4=10(Banner) 5=Under/Bube 6=Ober/Dame 7=König 8=Ass
// Trumpfmodus t: 0..3 = Farbe, 4 = Obenabe, 5 = Undenufe
// Sitze: 0 = Du (unten), 1 = rechts, 2 = Partner (oben), 3 = links.
// Gespielt wird im Gegenuhrzeigersinn: 0 → 1 → 2 → 3.
// Teams: Sitz % 2 → Team 0 = Du + Partner, Team 1 = Gegner.
(function (root) {
  const OBE = 4, UNDE = 5;
  const ALL = Array.from({ length: 36 }, (_, i) => i);

  const suitOf = (id) => Math.floor(id / 9);
  const rankOf = (id) => id % 9;
  const team = (p) => p % 2;

  const TRUMP_PTS = [0, 0, 0, 14, 10, 20, 3, 4, 11];
  const PLAIN_PTS = [0, 0, 0, 0, 10, 2, 3, 4, 11];
  const OBE_PTS   = [0, 0, 8, 0, 10, 2, 3, 4, 11];
  const UNDE_PTS  = [11, 0, 8, 0, 10, 2, 3, 4, 0];
  // Stärke im Trumpf: Under > 9 (Nell) > Ass > König > Ober > 10 > 8 > 7 > 6
  const TRUMP_STR = [1, 2, 3, 8, 4, 9, 5, 6, 7];

  function points(id, t) {
    const s = suitOf(id), r = rankOf(id);
    if (t < 4) return s === t ? TRUMP_PTS[r] : PLAIN_PTS[r];
    return t === OBE ? OBE_PTS[r] : UNDE_PTS[r];
  }
  const isTrump = (id, t) => t < 4 && suitOf(id) === t;
  const plainStr = (r, t) => (t === UNDE ? 8 - r : r);

  // Stichkraft einer Karte bezogen auf die ausgespielte Farbe
  function power(id, led, t) {
    if (isTrump(id, t)) return 100 + TRUMP_STR[rankOf(id)];
    if (suitOf(id) === led) return 10 + plainStr(rankOf(id), t);
    return 0;
  }

  function trickWinnerIdx(trick, t) {
    const led = suitOf(trick[0].c);
    let best = 0, bp = -1;
    trick.forEach((e, i) => { const p = power(e.c, led, t); if (p > bp) { bp = p; best = i; } });
    return best;
  }

  // Erlaubte Karten nach Schieber-Regeln:
  // - Farbe angeben, stechen ist immer erlaubt
  // - Trumpf-Under (Puur) muss nie angegeben werden
  // - Untertrumpfen verboten, ausser man hat nur noch Trumpf
  function legalCards(hand, trick, t) {
    if (!trick.length) return hand.slice();
    const led = suitOf(trick[0].c);
    const follow = hand.filter((c) => suitOf(c) === led);
    if (t >= 4) return follow.length ? follow : hand.slice();
    const buur = t * 9 + 5;
    if (led === t) {
      const ohneBuur = follow.filter((c) => c !== buur);
      return ohneBuur.length ? follow : hand.slice();
    }
    let hi = -1;
    trick.forEach((e) => { if (isTrump(e.c, t)) hi = Math.max(hi, TRUMP_STR[rankOf(e.c)]); });
    const onlyTrumps = hand.every((c) => isTrump(c, t));
    const base = follow.length ? follow.concat(hand.filter((c) => isTrump(c, t))) : hand.slice();
    const res = base.filter((c) => !isTrump(c, t) || hi < 0 || onlyTrumps || TRUMP_STR[rankOf(c)] > hi);
    return res.length ? res : base;
  }

  // ── Weis ──
  const SEQ_PTS = { 3: 20, 4: 50, 5: 100, 6: 150, 7: 200, 8: 250, 9: 300 };
  const SEQ_NAME = { 3: "Dreiblatt", 4: "Vierblatt", 5: "Fünfblatt", 6: "Sechsblatt", 7: "Siebenblatt", 8: "Achtblatt", 9: "Neunblatt" };

  function findWeis(hand) {
    const res = [];
    for (let s = 0; s < 4; s++) {
      const rs = hand.filter((c) => suitOf(c) === s).map(rankOf).sort((a, b) => a - b);
      let i = 0;
      while (i < rs.length) {
        let j = i;
        while (j + 1 < rs.length && rs[j + 1] === rs[j] + 1) j++;
        const len = j - i + 1;
        if (len >= 3) res.push({ type: "seq", s, lo: rs[i], hi: rs[j], len, pts: SEQ_PTS[len] });
        i = j + 1;
      }
    }
    for (let r = 3; r < 9; r++) {
      if (hand.filter((c) => rankOf(c) === r).length === 4) {
        res.push({ type: "four", r, pts: r === 5 ? 200 : r === 3 ? 150 : 100 });
      }
    }
    return res;
  }

  function weisKey(w, t) {
    const height = w.type === "four" ? 10 + w.r : (t === UNDE ? 8 - w.lo : w.hi);
    return [w.pts, w.type === "four" ? 1 : 0, w.type === "seq" ? w.len : 0, height, w.type === "seq" && w.s === t ? 1 : 0];
  }
  function cmpKey(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  }

  // Nur das Team mit dem höchsten Einzelweis schreibt (alle seine Weise).
  // Gleichstand: wer in der Spielreihenfolge früher dran ist, gewinnt.
  function resolveWeis(hands, t, leader) {
    const byPlayer = hands.map((h) => findWeis(h));
    let bestP = -1, bestKey = null;
    for (let k = 0; k < 4; k++) {
      const p = (leader + k) % 4;
      byPlayer[p].forEach((w) => {
        const key = weisKey(w, t);
        if (!bestKey || cmpKey(key, bestKey) > 0) { bestKey = key; bestP = p; }
      });
    }
    const pts = [0, 0];
    let winnerTeam = null;
    if (bestP >= 0) {
      winnerTeam = team(bestP);
      for (let p = 0; p < 4; p++) if (team(p) === winnerTeam) byPlayer[p].forEach((w) => (pts[winnerTeam] += w.pts));
    }
    return { byPlayer, winnerTeam, pts };
  }

  function findStoeck(hands, t) {
    if (t >= 4) return null;
    for (let p = 0; p < 4; p++) if (hands[p].includes(t * 9 + 6) && hands[p].includes(t * 9 + 7)) return p;
    return null;
  }

  function multiplier(t, mode) {
    if (mode === "einfach") return 1;
    if (t >= 4) return 3;
    return t === 0 || t === 2 ? 2 : 1; // Schellen/Schilten doppelt, Rosen/Eicheln einfach
  }

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function deal(rnd) {
    const d = shuffle(ALL, rnd || Math.random);
    return [0, 1, 2, 3].map((p) => d.slice(p * 9, p * 9 + 9));
  }

  // Sortierung der Hand für die Anzeige: nach Farbe, innerhalb absteigend.
  // Trumpf wird nach vorne genommen, sobald er bestimmt ist.
  function sortHand(hand, t) {
    const suitOrder = [3, 1, 2, 0];
    const so = (s) => (t != null && t < 4 && s === t ? -1 : suitOrder.indexOf(s));
    const str = (c) => (t != null && isTrump(c, t) ? 20 + TRUMP_STR[rankOf(c)] : (t === UNDE ? 8 - rankOf(c) : rankOf(c)));
    return hand.slice().sort((a, b) => so(suitOf(a)) - so(suitOf(b)) || str(b) - str(a));
  }

  // ── Computer-Spieler ──
  function evalTrump(hand, m) {
    let sc = 0;
    if (m < 4) {
      const tr = hand.filter((c) => suitOf(c) === m).map(rankOf);
      const val = { 5: 25, 3: 18, 8: 12, 7: 8, 6: 7, 4: 6, 2: 4, 1: 4, 0: 4 };
      tr.forEach((r) => (sc += val[r]));
      if (tr.length >= 4) sc += (tr.length - 3) * 8;
      if (tr.length <= 2) sc -= 15;
      if (tr.includes(5) && tr.includes(3)) sc += 6;
      hand.forEach((c) => {
        if (suitOf(c) === m) return;
        const r = rankOf(c);
        if (r === 8) sc += 10;
        else if (r === 7 && hand.includes(suitOf(c) * 9 + 8)) sc += 5;
      });
    } else {
      for (let s = 0; s < 4; s++) {
        const ord = hand.filter((c) => suitOf(c) === s).map((c) => plainStr(rankOf(c), m)).sort((a, b) => b - a);
        let k = 8, sure = 0;
        for (const x of ord) { if (x === k) { sure++; k--; } else break; }
        sc += sure * 14;
        if (sure > 0 && ord.length > sure) sc += (ord.length - sure) * (sure >= 2 ? 6 : 2);
        if (sure === 0 && ord[0] === 7 && ord.length >= 2) sc += 5;
        if (ord.length && ord[ord.length - 1] <= 2 && sure === 0) sc -= 3;
      }
    }
    return sc;
  }

  function botChooseTrump(hand, canPush) {
    let best = 0, bestSc = -Infinity;
    for (let m = 0; m < 6; m++) { const sc = evalTrump(hand, m); if (sc > bestSc) { bestSc = sc; best = m; } }
    if (canPush && bestSc < 52) return "push";
    return best;
  }

  // ctx: { hand, trick, t, played, p, declarer }
  function botPlay(ctx) {
    const { hand, trick, t, played, p, declarer } = ctx;
    const legal = legalCards(hand, trick, t);
    if (legal.length === 1) return legal[0];
    const inTrick = trick.map((e) => e.c);
    const unknown = ALL.filter((c) => !played.includes(c) && !hand.includes(c) && !inTrick.includes(c));
    const trumpsOut = t < 4 && unknown.some((u) => isTrump(u, t));
    const beatsAll = (c) => {
      if (isTrump(c, t)) return !unknown.some((u) => isTrump(u, t) && TRUMP_STR[rankOf(u)] > TRUMP_STR[rankOf(c)]);
      return !unknown.some((u) => suitOf(u) === suitOf(c) && plainStr(rankOf(u), t) > plainStr(rankOf(c), t));
    };
    const cheap = (c) => points(c, t) * 3 + (isTrump(c, t) ? 30 + TRUMP_STR[rankOf(c)] * 5 : plainStr(rankOf(c), t));
    const byCheap = (arr) => arr.slice().sort((a, b) => cheap(a) - cheap(b));

    if (!trick.length) {
      if (t < 4 && trumpsOut && team(p) === team(declarer)) {
        const top = hand.filter((c) => isTrump(c, t) && beatsAll(c));
        if (top.length) return top[0];
      }
      const bocks = legal.filter((c) => !isTrump(c, t) && beatsAll(c));
      if (bocks.length) return bocks.sort((a, b) => points(b, t) - points(a, t))[0];
      const nonTr = legal.filter((c) => !isTrump(c, t));
      return byCheap(nonTr.length ? nonTr : legal)[0];
    }

    const wi = trickWinnerIdx(trick, t);
    const wCard = trick[wi].c;
    const led = suitOf(trick[0].c);
    const partnerWins = team(trick[wi].p) === team(p);
    const last = trick.length === 3;
    const trickPts = trick.reduce((s, e) => s + points(e.c, t), 0);
    const winning = legal.filter((c) => power(c, led, t) > power(wCard, led, t));
    const lowDiscard = () => byCheap(legal)[0];

    if (partnerWins) {
      const sure = last || (beatsAll(wCard) && (isTrump(wCard, t) || !trumpsOut));
      if (sure) {
        // schmieren: punktereiche Karte, aber keine Trumpf-Asse und keine Böcke opfern
        const cand = legal.filter((c) => !isTrump(c, t) && points(c, t) >= 8 && !beatsAll(c));
        if (cand.length) return cand.sort((a, b) => points(b, t) - points(a, t))[0];
      }
      return lowDiscard();
    }

    if (winning.length) {
      const sureWins = winning.filter((c) => last || beatsAll(c) && (isTrump(c, t) || !trumpsOut || suitOf(c) === led));
      const nonTrWin = byCheap(sureWins.filter((c) => !isTrump(c, t)));
      if (nonTrWin.length) return last ? nonTrWin[0] : nonTrWin[nonTrWin.length - 1];
      const trWin = byCheap(winning.filter((c) => isTrump(c, t)));
      if (trWin.length) {
        const c = trWin[0];
        const r = rankOf(c);
        const precious = r === 5 || r === 3; // Puur/Nell nicht für wenig verschwenden
        if (trickPts >= (precious ? 15 : 8) || (last && trickPts >= 5)) return c;
      }
      if (last) {
        const anyWin = byCheap(winning.filter((c) => !isTrump(c, t)));
        if (anyWin.length) return anyWin[0];
      }
    }
    return lowDiscard();
  }

  // ── Rundenabrechnung ──
  // round: { trump, trickPts:[a,b], tricks:[a,b], weis:{pts}, stoeck: Sitz|null }
  // Reihenfolge für das Erreichen der Zielpunkte: Stöck – Weis – Stich.
  function scoreRound(round, multMode) {
    const m = multiplier(round.trump, multMode);
    const trick = round.trickPts.slice();
    let match = null;
    if (round.tricks[0] === 9) { trick[0] = 257; trick[1] = 0; match = 0; }
    if (round.tricks[1] === 9) { trick[1] = 257; trick[0] = 0; match = 1; }
    const weis = round.weis ? round.weis.pts.slice() : [0, 0];
    const stoeck = [0, 0];
    if (round.stoeck != null) stoeck[team(round.stoeck)] = 20;
    const total = [0, 1].map((i) => (trick[i] + weis[i] + stoeck[i]) * m);
    return { mult: m, trick, weis, stoeck, match, total };
  }

  function applyScore(scores, res, target) {
    const s = scores.slice();
    let winner = null;
    const step = (arr) => {
      [0, 1].forEach((i) => (s[i] += arr[i] * res.mult));
      if (winner == null) {
        const hit = [0, 1].filter((i) => s[i] >= target);
        if (hit.length === 1) winner = hit[0];
        else if (hit.length === 2) winner = arr[0] >= arr[1] ? 0 : 1;
      }
    };
    step(res.stoeck); step(res.weis); step(res.trick);
    return { scores: s, winner };
  }

  const api = {
    OBE, UNDE, ALL, suitOf, rankOf, team, points, isTrump, power, trickWinnerIdx, legalCards,
    findWeis, resolveWeis, findStoeck, multiplier, deal, shuffle, sortHand, evalTrump,
    botChooseTrump, botPlay, scoreRound, applyScore, SEQ_NAME, TRUMP_STR,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JassEngine = api;
})(typeof window !== "undefined" ? window : this);
