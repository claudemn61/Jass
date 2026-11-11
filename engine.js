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
    // Vier Gleiche (Schweizer Jassverzeichnis, «Überblick: Weisregeln»): alle Kartenwerte 6 bis Ass
    // zählen 100, vier Nell (9) 150, vier Under 200 – auch bei Obenabe und Undenufe
    for (let r = 0; r < 9; r++) {
      if (hand.filter((c) => rankOf(c) === r).length === 4) {
        res.push({ type: "four", r, pts: r === 5 ? 200 : r === 3 ? 150 : 100 });
      }
    }
    return res;
  }

  // Rangfolge bei gleichhohen Weisen (verbindlich nach Schweizer Jassverzeichnis), in dieser Reihenfolge:
  // 1. mehr Punkte; 2. eine Reihenfolge hat Vorrang vor vier Gleichen; 3. die höhere Karte des Weis
  // (bei Undenufe die tiefste); 4. gleiche höchste Karte: die in der Trumpffarbe gilt;
  // 5. sonst gilt, wer in der Spielreihenfolge zuerst dran ist (Vorhand) – siehe resolveWeis
  function weisKey(w, t) {
    const height = w.type === "four" ? (t === UNDE ? 8 - w.r : w.r) : (t === UNDE ? 8 - w.lo : w.hi);
    return [w.pts, w.type === "seq" ? 1 : 0, height, w.type === "seq" && w.s === t ? 1 : 0];
  }
  function cmpKey(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  }

  // Nur das Team mit dem höchsten Einzelweis schreibt (alle seine Weise).
  // Gleichstand: wer in der Spielreihenfolge früher dran ist, gewinnt.
  // skip (optional): Spieler, die ihren Weis nicht ansagen, sind nicht beteiligt
  function resolveWeis(hands, t, leader, skip) {
    const byPlayer = hands.map((h, p) => (skip && skip[p] ? [] : findWeis(h)));
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
    // Innerhalb der Farbe immer Ass → 6, auch bei Undenufe nicht umgekehrt; Trumpf nach Trumpfstärke
    const str = (c) => (t != null && isTrump(c, t) ? 20 + TRUMP_STR[rankOf(c)] : rankOf(c));
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

  // Nur einfach zählende Trümpfe (bei gestaffelter Zählung): Rosen (1) und Eicheln (3)
  const CHEAP = [1, 3];
  const CHEAP_HIT = 0.65;    // Simulation: Anteil der Verteilungen mit ≥ 100 Punkten
  const CHEAP_MIN_SC = 56;   // Heuristik: Mindestwertung für Rosen/Eicheln aus der Vorhand
  function botChooseTrump(hand, canPush, multMode) {
    let best = 0, bestSc = -Infinity;
    for (let m = 0; m < 6; m++) { const sc = evalTrump(hand, m); if (sc > bestSc) { bestSc = sc; best = m; } }
    if (canPush && bestSc < 52) return "push";
    if (canPush && multMode === "stufe" && CHEAP.includes(best) && bestSc < CHEAP_MIN_SC) return "push";
    return best;
  }

  // Partnersignale aus dem Spielverlauf: erste verworfene Farbe je Spieler
  // (Farbe nicht angegeben und nicht gestochen) und Anzahl Abwürfe.
  function signals(tricks, t) {
    const first = [null, null, null, null], discards = [0, 0, 0, 0];
    tricks.forEach((tr) => {
      if (!tr.length) return;
      const led = suitOf(tr[0].c);
      for (let i = 1; i < tr.length; i++) {
        const e = tr[i];
        if (suitOf(e.c) !== led && !isTrump(e.c, t)) {
          if (first[e.p] == null) first[e.p] = suitOf(e.c);
          discards[e.p]++;
        }
      }
    });
    return { first, discards };
  }

  // ctx: { hand, trick, t, played, p, declarer, tricks? }
  // tricks = bisherige Stiche ([{p,c}]); ohne sie entfallen die Partnerregeln.
  function botPlay(ctx) {
    const { hand, trick, t, played, p, declarer } = ctx;
    const legal = legalCards(hand, trick, t);
    if (legal.length === 1) return legal[0];
    const partner = (p + 2) % 4;
    const sig = ctx.tricks ? signals(ctx.tricks.concat([trick]), t) : null;
    const inTrick = trick.map((e) => e.c);
    const unknown = ALL.filter((c) => !played.includes(c) && !hand.includes(c) && !inTrick.includes(c));
    const trumpsOut = t < 4 && unknown.some((u) => isTrump(u, t));
    const beatsAll = (c) => {
      if (isTrump(c, t)) return !unknown.some((u) => isTrump(u, t) && TRUMP_STR[rankOf(u)] > TRUMP_STR[rankOf(c)]);
      return !unknown.some((u) => suitOf(u) === suitOf(c) && plainStr(rankOf(u), t) > plainStr(rankOf(c), t));
    };
    const str = (c) => (isTrump(c, t) ? 20 + TRUMP_STR[rankOf(c)] : plainStr(rankOf(c), t));
    const cheap = (c) => points(c, t) * 3 + (isTrump(c, t) ? 30 + TRUMP_STR[rankOf(c)] * 5 : plainStr(rankOf(c), t));
    const byCheap = (arr) => arr.slice().sort((a, b) => cheap(a) - cheap(b));

    // Verwerfen: tiefste Karte der schwächsten Farbe (keine Trümpfe, keine Böcke)
    const verwerfen = (cands) => {
      const pool = cands.filter((c) => !isTrump(c, t));
      if (!pool.length) return null;
      const suitStrength = (s) => hand.filter((c) => suitOf(c) === s)
        .reduce((sum, c) => sum + (beatsAll(c) ? 15 : 0) + points(c, t) + plainStr(rankOf(c), t), 0);
      const suits = [...new Set(pool.map(suitOf))].sort((a, b) => suitStrength(a) - suitStrength(b));
      return byCheap(pool.filter((c) => suitOf(c) === suits[0]))[0];
    };

    if (!trick.length) {
      if (t < 4 && trumpsOut && team(p) === team(declarer)) {
        const top = hand.filter((c) => isTrump(c, t) && beatsAll(c));
        if (top.length) return top[0];
      }
      const bocks = legal.filter((c) => !isTrump(c, t) && beatsAll(c));
      if (bocks.length) return bocks.sort((a, b) => points(b, t) - points(a, t))[0];
      let nonTr = legal.filter((c) => !isTrump(c, t));
      // Farbe, die der Partner verworfen hat (dort ist er schwach), nicht anspielen
      if (sig && sig.first[partner] != null) {
        const ok = nonTr.filter((c) => suitOf(c) !== sig.first[partner]);
        if (ok.length) nonTr = ok;
      }
      return byCheap(nonTr.length ? nonTr : legal)[0];
    }

    const wi = trickWinnerIdx(trick, t);
    const wCard = trick[wi].c;
    const led = suitOf(trick[0].c);
    const partnerWins = team(trick[wi].p) === team(p);
    const last = trick.length === 3;
    const trickPts = trick.reduce((s, e) => s + points(e.c, t), 0);
    const winning = legal.filter((c) => power(c, led, t) > power(wCard, led, t));
    const canFollow = hand.some((c) => suitOf(c) === led);
    const firstDiscard = sig && sig.discards[p] === 0;
    const lowDiscard = () => (!canFollow && verwerfen(legal)) || byCheap(legal)[0];

    // Partner spielt einen Bock an: die Karte direkt darunter zugeben,
    // damit der Partner die Farbe weiterspielen kann.
    if (trick[0].p === partner && wi === 0 && canFollow && beatsAll(wCard)) {
      const under = bockUnter(hand, wCard, unknown, t);
      if (under != null && legal.includes(under)) return under;
    }

    // Erster Abwurf: verwerfen (zeigt dem Partner die schwache Farbe)
    if (!canFollow && firstDiscard) {
      const sticht = partnerWins ? [] : winning.filter((c) => isTrump(c, t));
      if (!(sticht.length && trickPts >= 10)) {
        const v = verwerfen(legal);
        if (v != null) return v;
      }
    }

    if (partnerWins) {
      const sure = last || (beatsAll(wCard) && (isTrump(wCard, t) || !trumpsOut));
      if (sure) {
        // schmieren: punktereiche Karte, aber keine Trümpfe und keine Böcke opfern
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

  // Höchste eigene Karte derselben Farbe direkt unter `top`, d.h. keine
  // unbekannte Karte liegt dazwischen. null, wenn es keine solche gibt.
  function bockUnter(hand, top, unknown, t) {
    const s = suitOf(top);
    const val = (c) => (isTrump(c, t) ? TRUMP_STR[rankOf(c)] : plainStr(rankOf(c), t));
    const mine = hand.filter((c) => suitOf(c) === s && val(c) < val(top)).sort((a, b) => val(b) - val(a));
    if (!mine.length) return null;
    const cand = mine[0];
    const between = unknown.some((u) => suitOf(u) === s && val(u) < val(top) && val(u) > val(cand));
    return between ? null : cand;
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


  // ── Stärkere Computer-Spieler: Monte-Carlo-Suche ──
  // Die unbekannten Karten werden mehrfach zufällig auf die anderen Spieler
  // verteilt (unter Beachtung bekannter Fehlfarben und gezeigter Weis-Karten),
  // die Runde wird für jede erlaubte Karte mit der Heuristik (botPlay inkl.
  // Partnerregeln) zu Ende gespielt und die Karte mit dem besten
  // durchschnittlichen Punkteunterschied gewählt. Gegen Spielende zählt
  // zusätzlich, welches Team zuerst die Zielpunkte erreicht (Bedanken).

  const WIN_BONUS = 400; // Gewicht "Spiel gewonnen" in rohen Punkten
  const CONV_TOL = 6;    // Partnerregel gilt, solange sie im Schnitt max. so viel kostet

  // Fehlfarben aus dem bisherigen Spielverlauf ableiten.
  // void[p][s] = true: Spieler p hat sicher keine Karte der Farbe s
  // (bei Trumpf: ausser evtl. dem Puur, der nie angegeben werden muss).
  function inferVoids(tricks, t) {
    const v = [0, 1, 2, 3].map(() => [false, false, false, false]);
    tricks.forEach((tr) => {
      if (!tr.length) return;
      const led = suitOf(tr[0].c);
      for (let i = 1; i < tr.length; i++) if (suitOf(tr[i].c) !== led) v[tr[i].p][led] = true;
    });
    return v;
  }

  // Karten, aus denen ein Weis besteht
  function weisCards(w) {
    if (w.type === "four") return [0, 1, 2, 3].map((s) => s * 9 + w.r);
    const out = [];
    for (let r = w.lo; r <= w.hi; r++) out.push(w.s * 9 + r);
    return out;
  }
  // Nach dem ersten Stich zeigt das Team mit dem höchsten Weis seine Karten:
  // known[p] = noch nicht gespielte, bekannte Karten von Spieler p
  function knownFromWeis(weis, played) {
    const known = [[], [], [], []];
    if (!weis || weis.winnerTeam == null) return known;
    for (let p = 0; p < 4; p++) {
      if (team(p) !== weis.winnerTeam) continue;
      const set = new Set();
      weis.byPlayer[p].forEach((w) => weisCards(w).forEach((c) => set.add(c)));
      known[p] = [...set].filter((c) => !played.includes(c));
    }
    return known;
  }

  function makeRng(seed) {
    let x = seed >>> 0 || 1;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  }

  // Unbekannte Karten auf die Spieler `others` mit Kartenzahl `need` verteilen
  function sampleHands(unknown, others, need, voids, t, rnd) {
    const buur = t < 4 ? t * 9 + 5 : -1;
    const allowed = (p, c) => !voids[p][suitOf(c)] || c === buur; // Puur trotz Fehlfarbe möglich
    for (let attempt = 0; attempt < 30; attempt++) {
      const cards = shuffle(unknown, rnd);
      // eingeschränkte Karten zuerst verteilen
      cards.sort((a, b) => others.filter((p) => allowed(p, a)).length - others.filter((p) => allowed(p, b)).length);
      const hands = {}, left = {};
      others.forEach((p) => { hands[p] = []; left[p] = need[p]; });
      let ok = true;
      for (const c of cards) {
        const cand = others.filter((p) => left[p] > 0 && allowed(p, c));
        if (!cand.length) { ok = false; break; }
        let tot = 0; cand.forEach((p) => (tot += left[p]));
        let x = rnd() * tot, pick = cand[cand.length - 1];
        for (const p of cand) { x -= left[p]; if (x < 0) { pick = p; break; } }
        hands[pick].push(c); left[pick]--;
      }
      if (ok) return hands;
    }
    // Rückfall: ohne Fehlfarben-Einschränkung
    const cards = shuffle(unknown, rnd), hands = {};
    let i = 0;
    others.forEach((p) => { hands[p] = cards.slice(i, i + need[p]); i += need[p]; });
    return hands;
  }

  // Runde ab gegebenem Zustand mit der Heuristik zu Ende spielen.
  // hist: bisherige volle Stiche; trick: laufender Stich (darf voll sein).
  // eg (optional): { run:[a,b], mult, target } für Bedanken.
  // Liefert Punkte/Stiche ab jetzt und ggf. das Team, das zuerst das Ziel erreicht.
  function rollout(hands, hist, trick, turn, t, declarer, eg) {
    hands = hands.map((h) => h.slice());
    hist = hist.slice();
    trick = trick.slice();
    const played = [];
    hist.forEach((tr) => tr.forEach((e) => played.push(e.c)));
    const pts = [0, 0], tricks = [0, 0];
    const run = eg ? eg.run.slice() : null;
    let winner = null;
    let p = turn;
    while (hist.length < 9) {
      while (trick.length < 4) {
        const c = botPlay({ hand: hands[p], trick, t, played, p, declarer, tricks: hist });
        hands[p] = hands[p].filter((x) => x !== c);
        trick.push({ p, c });
        p = (p + 1) % 4;
      }
      const w = trick[trickWinnerIdx(trick, t)].p;
      let sum = 0;
      for (const e of trick) { sum += points(e.c, t); played.push(e.c); }
      if (hist.length === 8) sum += 5;
      pts[team(w)] += sum; tricks[team(w)]++;
      if (run && winner == null) {
        run[team(w)] += sum * eg.mult;
        if (run[team(w)] >= eg.target) winner = team(w);
      }
      hist.push(trick);
      trick = []; p = w;
    }
    return { pts, tricks, winner };
  }

  // Wert eines Rollouts aus Sicht von myTeam
  function rolloutValue(r, myTeam, won) {
    let mine = r.pts[myTeam], theirs = r.pts[1 - myTeam];
    if (won[myTeam] + r.tricks[myTeam] === 9) mine += 100;
    if (won[1 - myTeam] + r.tricks[1 - myTeam] === 9) theirs += 100;
    let v = mine - theirs;
    if (r.winner === myTeam) v += WIN_BONUS;
    else if (r.winner === 1 - myTeam) v -= WIN_BONUS;
    return v;
  }

  // Partnerregeln (Verwerfen beim ersten Abwurf, Bock-Untergabe), die der
  // Simulation vorgehen, sofern sie nicht deutlich Punkte kosten.
  function conventionCard(ctx, played) {
    const { hand, trick, t, p } = ctx;
    if (!trick.length) return null;
    const legal = legalCards(hand, trick, t);
    const led = suitOf(trick[0].c);
    const canFollow = hand.some((c) => suitOf(c) === led);
    const partner = (p + 2) % 4;
    const inTrick = trick.map((e) => e.c);
    const unknown = ALL.filter((c) => !played.includes(c) && !hand.includes(c) && !inTrick.includes(c));
    const wi = trickWinnerIdx(trick, t);
    if (trick[0].p === partner && wi === 0 && canFollow) {
      const top = trick[0].c;
      const bock = isTrump(top, t)
        ? !unknown.some((u) => isTrump(u, t) && TRUMP_STR[rankOf(u)] > TRUMP_STR[rankOf(top)])
        : !unknown.some((u) => suitOf(u) === led && plainStr(rankOf(u), t) > plainStr(rankOf(top), t));
      if (bock) {
        const u = bockUnter(hand, top, unknown, t);
        if (u != null && legal.includes(u)) return u;
      }
    }
    if (!canFollow) {
      const sig = signals((ctx.tricks || []).concat([trick]), t);
      if (sig.discards[p] === 0) {
        const c = botPlay(ctx); // enthält die Verwerfen-Regel
        if (!isTrump(c, t) && suitOf(c) !== led) return c;
      }
    }
    return null;
  }

  // ctx wie botPlay, zusätzlich:
  //   tricks (bisherige volle Stiche, Pflicht), tricksWon ([a,b]),
  //   weis (resolveWeis-Ergebnis, sichtbar ab dem 2. Stich),
  //   endgame ({ run:[a,b] bisher gutgeschrieben inkl. Multiplikator, mult, target }),
  //   samples, seed (optional)
  function botPlaySmart(ctx) {
    const { hand, trick, t, p, declarer } = ctx;
    const legal = legalCards(hand, trick, t);
    if (legal.length === 1) return legal[0];
    const history = ctx.tricks || [];
    const played = [];
    history.forEach((tr) => tr.forEach((e) => played.push(e.c)));
    const trickNo = history.length;
    const inTrick = trick.map((e) => e.c);
    const known = trickNo >= 1 ? knownFromWeis(ctx.weis, played.concat(inTrick)) : [[], [], [], []];
    const others = [1, 2, 3].map((k) => (p + k) % 4);
    const knownSet = new Set();
    others.forEach((q) => known[q].forEach((c) => knownSet.add(c)));
    const unknown = ALL.filter((c) => !played.includes(c) && !hand.includes(c) && !inTrick.includes(c) && !knownSet.has(c));
    const voids = inferVoids(history.concat([trick]), t);
    const need = {};
    others.forEach((q) => {
      let n = 9 - trickNo;
      if (trick.some((e) => e.p === q)) n--;
      need[q] = n - known[q].length;
    });
    const rnd = makeRng(ctx.seed != null ? ctx.seed : Math.floor(Math.random() * 1e9));
    const budget = ctx.samples || Math.max(16, Math.min(60, Math.floor(320 / legal.length)));
    const myTeam = team(p);
    const won = ctx.tricksWon || [0, 0];
    const score = legal.map(() => 0);
    for (let k = 0; k < budget; k++) {
      const sh = sampleHands(unknown, others, need, voids, t, rnd);
      const hands = [];
      hands[p] = hand; others.forEach((q) => (hands[q] = sh[q].concat(known[q])));
      legal.forEach((c, i) => {
        const h2 = hands.slice(); h2[p] = hand.filter((x) => x !== c);
        const r = rollout(h2, history, trick.concat([{ p, c }]), (p + 1) % 4, t, declarer, ctx.endgame);
        score[i] += rolloutValue(r, myTeam, won);
      });
    }
    let best = 0;
    for (let i = 1; i < legal.length; i++) if (score[i] > score[best]) best = i;
    const conv = conventionCard(ctx, played);
    if (conv != null) {
      const ci = legal.indexOf(conv);
      if (ci >= 0 && score[ci] >= score[best] - CONV_TOL * budget) return conv;
    }
    return legal[best];
  }

  // Trumpfwahl per Simulation: für jeden Modus zufällige Verteilungen der
  // übrigen 27 Karten durchspielen; Wert = (Punkteunterschied inkl. Weis und
  // Stöck) × Multiplikator, plus Bonus/Malus fürs Erreichen der Zielpunkte.
  // Schieben wird gleich bewertet: der Partner wählt dann mit der Heuristik.
  // opts: { samples, seed, scores:[a,b], target }
  function botChooseTrumpSmart(hand, canPush, p, multMode, opts) {
    opts = opts || {};
    const rnd = makeRng(opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e9));
    const n = opts.samples || 24;
    const others = [1, 2, 3].map((k) => (p + k) % 4);
    const unknown = ALL.filter((c) => !hand.includes(c));
    const myTeam = team(p);
    const val = [0, 0, 0, 0, 0, 0];
    const hit100 = [0, 0, 0, 0, 0, 0]; // in wie vielen Verteilungen das eigene Team (Stiche + Weis + Stöck) ≥ 100 Punkte erreicht
    let pushVal = 0;
    const noVoids = [0, 1, 2, 3].map(() => [false, false, false, false]);
    const need = {}; others.forEach((q) => (need[q] = 9));
    const evalMode = (hands, m, count) => {
      const mult = multiplier(m, multMode);
      const weis = resolveWeis(hands, m, p).pts;
      const st = findStoeck(hands, m);
      const stoeck = [0, 0]; if (st != null) stoeck[team(st)] = 20;
      let eg = null, pre = null;
      if (opts.scores && opts.target) {
        // Stöck und Weis zählen vor den Stichen
        const run = opts.scores.slice();
        for (const part of [stoeck, weis]) {
          [0, 1].forEach((i) => (run[i] += part[i] * mult));
          if (pre == null) { const hit = [0, 1].filter((i) => run[i] >= opts.target); if (hit.length) pre = hit[0]; }
        }
        eg = { run, mult, target: opts.target };
      }
      const r = rollout(hands, [], [], p, m, p, pre == null ? eg : null);
      if (count && r.pts[myTeam] + weis[myTeam] + stoeck[myTeam] + (r.tricks[myTeam] === 9 ? 100 : 0) >= 100) hit100[m]++;
      if (pre != null) r.winner = pre;
      let v = rolloutValue(r, myTeam, [0, 0]) + (weis[myTeam] - weis[1 - myTeam]) + (stoeck[myTeam] - stoeck[1 - myTeam]);
      const bonus = r.winner === myTeam ? WIN_BONUS : r.winner === 1 - myTeam ? -WIN_BONUS : 0;
      return (v - bonus) * mult + bonus;
    };
    for (let k = 0; k < n; k++) {
      const sh = sampleHands(unknown, others, need, noVoids, 0, rnd);
      const hands = []; hands[p] = hand; others.forEach((q) => (hands[q] = sh[q]));
      for (let m = 0; m < 6; m++) val[m] += evalMode(hands, m, true);
      if (canPush) pushVal += evalMode(hands, botChooseTrump(hands[(p + 2) % 4], false), false);
    }
    let best = 0;
    for (let m = 1; m < 6; m++) if (val[m] > val[best]) best = m;
    if (canPush && pushVal > val[best]) return "push";
    // Strategie für alle: Vorhand wählt Rosen oder Eicheln (nur einfach zählend) nur, wenn 100 Punkte
    // realistisch sind (≥ CHEAP_HIT der Verteilungen), sonst schieben
    if (canPush && multMode === "stufe" && CHEAP.includes(best) && hit100[best] / n < CHEAP_HIT) return "push";
    return best;
  }

  const api = {
    OBE, UNDE, ALL, suitOf, rankOf, team, points, isTrump, power, trickWinnerIdx, legalCards,
    findWeis, resolveWeis, findStoeck, multiplier, deal, shuffle, sortHand, evalTrump,
    botChooseTrump, rollout, sampleHands, makeRng, botPlay, botPlaySmart, botChooseTrumpSmart, inferVoids, signals, knownFromWeis, weisCards, scoreRound, applyScore, SEQ_NAME, TRUMP_STR,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JassEngine = api;
})(typeof window !== "undefined" ? window : this);
