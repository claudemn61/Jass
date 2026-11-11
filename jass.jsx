// ── Jass (Schieber) — Hauptseite ────────────────────────────────────────
// Du + Partner (Computer) gegen zwei Computer-Gegner. Die Spiellogik liegt
// in engine.js (window.JassEngine), hier nur Zustand, Ablauf und Darstellung.
const { useState, useEffect, useRef, useContext } = React;
const E = window.JassEngine;

const APP_VERSION = "2.1.4";

const CHANGELOG = [
  {
    version: "2.1.4",
    changes: [
      "Neue Einstellung «Wer spielt zusammen»: Zu Beginn jedes neuen Spiels ziehen alle eine Karte aus dem Stapel (du tippst selbst), die zwei höchsten spielen zusammen; danach ziehst du gegen den Spieler links, die tiefere Karte gibt im ersten Spiel (das Ass muss geben)",
    ],
  },
  {
    version: "2.1.3",
    changes: [
      "Weis am Tisch: gültige Weise (Team mit dem höchsten Weis) wie bisher mit Farbe und Karte, die unterlegenen Ansagen der anderen nur als ausgegraute Zahl (z.B. 100, 20)",
    ],
  },
  {
    version: "2.1.2",
    changes: [
      "Weisregeln nach dem Schweizer Jassverzeichnis: vier Sechser, Siebner und Achter zählen neu ebenfalls 100 (vier Nell 150, vier Under 200); bei gleichhohen Weisen geht eine Reihenfolge vor vier Gleichen, dann die höhere Karte (bei Undenufe die tiefste), dann die Trumpffarbe, dann die Vorhand",
    ],
  },
  {
    version: "2.1.1",
    changes: [
      "Anleitung: Bedanken ist eine Möglichkeit («kann sich bedanken»), Eigene Bilder nur aus Copyright-Gründen lokal, «Alle Böcke auflegen» als optionale Möglichkeit, «Computer-Spieler» heisst «Spiel-Strategie»",
    ],
  },
  {
    version: "2.1.0",
    changes: [
      "Neue Einstellung «Mitspieler»: bei jedem neuen Spiel werden die drei anderen Spieler (Partner, links, rechts) zufällig neu zugeordnet",
    ],
  },
  {
    version: "2.0.1",
    changes: [
      "Kartensortierung konstant: innerhalb der Farbe immer Ass → 6 (auch bei Undenufe nicht umgekehrt); der Trumpf steht bei «Links → rechts» immer links, bei «Rechts → links» immer rechts",
    ],
  },
  {
    version: "2.0.0",
    changes: [
      "Neuer Name: Bea’s Jass",
      "Neues App-Symbol: vier Karten mit den vier Farben auf Filz und goldenem «B»",
    ],
  },
  {
    version: "1.3.0",
    changes: [
      "Einstellung «Weis»: Hast du einen Weis, fragt die App vor deiner ersten Karte nach, ob du wirklich weisen willst; Partner und Gegner entscheiden im Hintergrund nach der Spielsituation",
      "Einstellung «Kartensortierung»: deine Hand von links nach rechts (Standard) oder von rechts nach links",
    ],
  },
  {
    version: "1.2.7",
    changes: [
      "Karten austeilen als Animation: je 3 Karten auf einmal, reihum im Gegenuhrzeigersinn, 3 Umgänge in 5 Sekunden, vom Geber (dem Ansager der Runde davor) oder aus der Mitte (Einstellung «Austeilen»); die Karten erscheinen dabei nach und nach in den Händen",
    ],
  },
  {
    version: "1.2.6",
    changes: [
      "Keine Spielerbilder mehr: auf dem iPad nur die gefächerten Karten, auf dem iPhone nur der Name; in den Einstellungen werden nur noch die Namen vergeben",
      "Neue Einstellung «Bedanken»: per Knopf (Standard), automatisch oder gar nicht (nur Abrechnung am Rundenende)",
    ],
  },
  {
    version: "1.2.5",
    changes: [
      "Böcke auflegen: Szene gestrafft, Abrechnung nach höchstens 3 Sekunden",
      "Nach jedem Stich wird der Kartenstapel in einer halben Sekunde zum Gewinner gezogen",
    ],
  },
  {
    version: "1.2.4",
    changes: [
      "Böcke auflegen korrigiert: alle werfen ihre restlichen Karten auf einmal aufs Feld, der ganze Haufen geht ans Team des Spielers mit den Böcken – auch mitten im Stich, wenn er an der Reihe ist",
    ],
  },
  {
    version: "1.2.3",
    changes: [
      "Hat ein Spieler beim Ausspielen nur noch unschlagbare Böcke, legt er sie alle auf einmal ab und die restlichen Stiche laufen automatisch durch (bei dir beim Spielen einer Karte, bei den Computern automatisch)",
    ],
  },
  {
    version: "1.2.2",
    changes: [
      "Spielfeld mit echtem Filz-Foto, Jasstafel und Schiefer-Seiten mit echtem Schiefer-Foto",
      "Z-Linie auf der Jasstafel dünner und in Rot",
      "Eigene Farbsymbole mit leicht abgerundeten Ecken",
    ],
  },
  {
    version: "1.2.1",
    changes: [
      "Trumpfwahl: sieben quadratische Knöpfe über die ganze Breite (6 Trumpf-Symbole und «Schieben» als Symbol), Hinweis darüber",
    ],
  },
  {
    version: "1.2.0",
    changes: [
      "Eigene Farbsymbole: je ein Bild für die vier Farben sowie die Pfeile für Obenabe und Undenufe laden (Bild oder PDF) – sie ersetzen die gezeichneten Symbole überall; nur auf dem Gerät gespeichert",
      "Kopfzeile ohne «/ Zielpunkte», Trumpf nur noch als Symbol bzw. Pfeil",
    ],
  },
  {
    version: "1.1.5",
    changes: [
      "iPad: Kopfzeile mit Teamnamen («x & y») links und rechts, Trumpf in der Mitte",
      "iPad: runde, grössere Namens-Badges; eigenes Foto (JPEG) oder PDF per Antippen ladbar (nur auf dem Gerät gespeichert)",
    ],
  },
  {
    version: "1.1.4",
    changes: [
      "Bei einem Match oder Spielsieg deines Teams rieseln Sternchen über den Bildschirm, dazu «MATCH!» bzw. «GEWONNEN!» in grossen Buchstaben; bei den Gegnern eine leise, etwas frustrierte Variante",
    ],
  },
  {
    version: "1.1.3",
    changes: [
      "Kopfzeile höher, damit der obere Rand nicht unter der Statusleiste verschwimmt",
      "Ab 1500 Punkten zeigt die Kopfzeile, wie viele Punkte bis zum Ziel noch fehlen",
      "Spielteppich dunkler und gleichmässiger",
    ],
  },
  {
    version: "1.1.2",
    changes: [
      "Striche (Rückseite der Jasstafel): bei Spielabbruch werden die Striche dieses Spiels entfernt, frühere bleiben; einzelne Striche manuell löschbar",
    ],
  },
  {
    version: "1.1.1",
    changes: [
      "iPad: Spielfeld nutzt die ganze Bildschirmbreite, grössere Karten und Beschriftungen (hoch und quer)",
    ],
  },
  {
    version: "1.1.0",
    changes: [
      "Offene Karten (Lernmodus): die Karten der Mitspieler liegen aufgedeckt bei ihrem Platz – nur für dich sichtbar",
      "Stärkere Computer-Spieler (Stufe «Stark»): Simulation vieler Kartenverteilungen, Partnerregeln (Verwerfen, Schmieren, Bock-Untergabe), gezeigte Weis werden berücksichtigt",
      "Bedanken per Knopf; die Gegner bedanken sich automatisch",
      "Jasstafel als Schiefertafel mit Kreide: Z mit 100er-/20er-Fünferbündeln, 50er über Kreuz, V bei 500 in einer Runde, Einer als Zahl (mit Minus); Rückseite mit Strichen (Match, Sieg, Berg)",
      "Eigene Kartenbilder und Rückseite (Fotos, Gruppenfotos, PDF) – nur auf dem Gerät gespeichert, Tauschen zum Korrigieren der Reihenfolge",
      "Backup aller Daten als eine Datei zum Übertragen auf ein anderes Gerät",
      "Spielernamen editierbar; Weis, aktueller Stichhalter (grün) und Ansage (★ primär, ☆ geschoben) am Tisch sichtbar",
      "Karte spielen auch per Wischen; Ausgrauen nicht spielbarer Karten abwählbar; Rundenabrechnung schliessbar",
      "Neues Design: Schiefertafel-Startseite, abgegriffener Filzteppich, Stich-Stapel bei den Spielern",
    ],
  },
  {
    version: "1.0.0",
    changes: [
      "Erste Version: Schieber gegen drei Computer-Spieler (du + Partner gegen zwei Gegner)",
      "Trumpf wählen oder schieben, Obenabe und Undenufe",
      "Regeln: Farbe angeben, Puur muss nicht angegeben werden, Untertrumpfen verboten",
      "Weis (Blatt-Folgen und Vierlinge) und Stöck werden automatisch erkannt",
      "Match (257), letzter Stich (+5), Multiplikatoren wählbar",
      "Deutschschweizer oder französische Karten, Zielpunkte, Tempo einstellbar",
      "Jasstafel mit allen Runden, letzter Stich, Statistik, Spielstand bleibt gespeichert",
      "Offline-fähig als PWA (zum Home-Bildschirm hinzufügen)",
    ],
  },
];

// ── Speicher ──
function load(key, def) {
  try { const v = localStorage.getItem("jass:" + key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
}
function save(key, val) {
  try { if (val == null) localStorage.removeItem("jass:" + key); else localStorage.setItem("jass:" + key, JSON.stringify(val)); } catch (e) {}
}

const DEFAULT_NAMES = ["Du", "Rechts", "Partner", "Links"];
const DEFAULT_SETTINGS = { names: DEFAULT_NAMES.slice(), deck: "ch", target: 2500, mult: "stufe", speed: "normal", oneTap: false, customImgs: true, imgIndex: true, imgOrder: "farbe", level: "stark", dimIllegal: true, openCards: false };
const SPEEDS = { langsam: { bot: 1000, trick: 2000 }, normal: { bot: 650, trick: 1300 }, schnell: { bot: 300, trick: 700 }, manuell: { bot: 0, trick: 0 } };
const SUIT_NAMES = { ch: ["Schellen", "Rosen", "Schilten", "Eicheln"], fr: ["Ecken", "Herz", "Schaufel", "Kreuz"] };
const RANK_LABEL = { ch: ["6", "7", "8", "9", "10", "U", "O", "K", "A"], fr: ["6", "7", "8", "9", "10", "B", "D", "K", "A"] };
const RANK_NAME = { ch: ["Sechser", "Siebner", "Achter", "Nell", "Banner", "Under", "Ober", "König", "Ass"], fr: ["Sechser", "Siebner", "Achter", "Nell", "Zehner", "Bube", "Dame", "König", "Ass"] };
// Aktuelle Spielernamen (Sitz 0 unten = du, 1 rechts, 2 oben = Partner, 3 links);
// werden in JassApp aus den Einstellungen gesetzt.
let NAMES = DEFAULT_NAMES.slice();
// Einstellung «Bedanken»: "knopf" (du per Knopf, Gegner automatisch), "auto" (wer das Ziel erreicht,
// gewinnt sofort, ohne Knopf) oder "aus" (nur Abrechnung am Rundenende); wird in JassApp gesetzt.
let THANK = "knopf";
// Einstellung «Weis nachfragen»: der Mensch entscheidet selbst, Partner/Gegner die App im Hintergrund
let WEISASK = false;
// «an uns» / «an die Gegner» (Satzglied im Dativ/Akkusativ)
const teamAn = (t) => (t === 0 ? "uns" : "die Gegner");
const teamName = (t) => NAMES[t] + " & " + NAMES[t + 2];
// «Du wählst» vs. «Anna wählt»
const verb = (p, du, er) => (p === 0 && NAMES[0] === "Du" ? du : er);
const TEAM = ["Wir", "Gegner"];
const C = { felt: "#0f3d2e", felt2: "#0a2c21", gold: "#f4c430", text: "#f1f5f1", dim: "rgba(241,245,241,0.6)", panel: "#123f31", line: "rgba(255,255,255,0.12)", red: "#d23b3b" };

const modeName = (t, deck) => (t < 4 ? SUIT_NAMES[deck][t] : t === 4 ? "Obenabe" : "Undenufe");

// ── Spielablauf (reine Funktionen auf dem Spielobjekt) ──
function startRound(g) {
  const hands = E.deal().map((h) => E.sortHand(h, null));
  const ch = g.nextChooser;
  return {
    ...g,
    round: {
      no: g.history.length + 1, hands, start: hands.map((h) => h.slice()),
      chooser: ch, decider: ch, pushed: false, trump: null, phase: "choose",
      trick: [], turn: null, played: [], trickPts: [0, 0], tricks: [0, 0],
      trickNo: 0, lastTrick: null, tricksLog: [], weis: null, stoeck: null, stoeckDone: false, result: null,
    },
  };
}
function newGame(settings, pre) {
  // seatPerm[sitz] = Nummer in der Namensliste der Einstellungen (0 = du); mit «Mitspieler zufällig»
  // werden die drei anderen bei jedem neuen Spiel gemischt
  const others = [1, 2, 3];
  if (settings.shuffleSeats) for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  return startRound({ id: Date.now(), scores: [0, 0], history: [], nextChooser: pre ? pre.nextChooser : Math.floor(Math.random() * 4), target: settings.target, mult: settings.mult, over: null, round: null, seatPerm: pre ? pre.seatPerm : [0].concat(others) });
}
function doPush(g) {
  const r = g.round;
  return { ...g, round: { ...r, pushed: true, decider: (r.chooser + 2) % 4 } };
}
// Weisen die Computer-Spieler? Entscheidung im Hintergrund nach der Spielsituation:
// - ab 50 Punkten immer
// - sonst (Dreiblatt, 20): ja, ausser es verrät hohe Trümpfe (Under/Nell), und weder das eigene Team
//   noch die Gegner sind nahe am Ziel (dann zählt jeder Punkt)
function botWeisDecision(g, p, hand, t) {
  const ws = E.findWeis(hand);
  if (!ws.length) return true;
  const pts = ws.reduce((s, w) => s + w.pts, 0);
  if (pts >= 50) return true;
  const mult = E.multiplier(t, g.mult), tm = E.team(p);
  const near = (sc) => sc + 140 * mult >= g.target;
  if (near(g.scores[tm]) || near(g.scores[1 - tm])) return true;
  const verraetTrumpf = t < 4 && ws.some((w) => w.type === "seq" && w.s === t && w.lo <= 5 && w.hi >= 3);
  return !verraetTrumpf;
}
function doChoose(g, t) {
  const r = g.round;
  let weis, extra = {};
  if (WEISASK) {
    // Computer entscheiden jetzt; deine Entscheidung (falls du einen Weis hast) folgt vor deiner ersten Karte
    const skip = [false, 1, 2, 3].map((q) => (q === false ? false : !botWeisDecision(g, q, r.start[q], t)));
    weis = E.resolveWeis(r.start, t, r.chooser, skip);
    extra = { weisSkip: skip, weisPending: E.findWeis(r.start[0]).length > 0 };
  } else weis = E.resolveWeis(r.start, t, r.chooser);
  return {
    ...g,
    round: {
      ...r, trump: t, phase: "play", turn: r.chooser, hands: r.hands.map((h) => E.sortHand(h, t)),
      weis, stoeck: E.findStoeck(r.start, t), ...extra,
    },
  };
}
// Deine Weis-Entscheidung anwenden
function applyHumanWeis(g, ja) {
  const r = g.round;
  const skip = (r.weisSkip || [false, false, false, false]).slice(); skip[0] = !ja;
  return { ...g, round: { ...r, weisPending: false, weisSkip: skip, weis: E.resolveWeis(r.start, r.trump, r.chooser, skip) } };
}
function doPlay(g, p, c) {
  const r = g.round;
  const hands = r.hands.map((h, i) => (i === p ? h.filter((x) => x !== c) : h));
  const trick = r.trick.concat([{ p, c }]);
  let stoeckDone = r.stoeckDone;
  if (r.stoeck === p && !stoeckDone && !hands[p].includes(r.trump * 9 + 6) && !hands[p].includes(r.trump * 9 + 7)) stoeckDone = true;
  const full = trick.length === 4;
  return { ...g, round: { ...r, hands, trick, stoeckDone, phase: full ? "trickDone" : "play", turn: full ? null : (p + 1) % 4 } };
}
// Berg: Punktgrenze, deren erstes Erreichen einen Strich gibt (bei Ziel 2500 = 1500).
// Bei Ziel 1000 (oder weniger) wird ohne Berg gespielt → null.
const bergOf = (target) => (target <= 1000 ? null : Math.round((target * 0.6) / 10) * 10);

// Bisher gutgeschriebene Punkte der laufenden Runde (ohne Multiplikator in
// den Teilen, total mit): gesammelte Stiche, Weis ab dem 1. Stich, Stöck sobald gespielt
function partialResult(r, mult) {
  const m = E.multiplier(r.trump, mult);
  const stoeck = [0, 0];
  if (r.stoeck != null && r.stoeckDone) stoeck[E.team(r.stoeck)] = 20;
  const weis = r.trickNo >= 1 && r.weis ? r.weis.pts.slice() : [0, 0];
  const trick = r.trickPts.slice();
  return { mult: m, trick, weis, stoeck, match: null, total: [0, 1].map((i) => (trick[i] + weis[i] + stoeck[i]) * m) };
}

// Runde abschliessen (regulär oder durch Bedanken)
function finishRound(g, rUpd, res, winner, extra) {
  const r = { ...g.round, ...rUpd };
  const scores = [0, 1].map((i) => g.scores[i] + res.total[i]);
  let berg = g.berg != null ? g.berg : null;
  const lim = bergOf(g.target);
  if (berg == null && lim != null) {
    const hit = [0, 1].filter((i) => scores[i] >= lim);
    if (hit.length) berg = hit.length === 1 ? hit[0] : (scores[0] >= scores[1] ? 0 : 1);
  }
  // Teile für die Jasstafel: der Weis wird sofort nach dem ersten Stich geschrieben, der Rest am Rundenende
  const weisT = [0, 1].map((i) => res.weis[i] * res.mult), restT = [0, 1].map((i) => res.total[i] - weisT[i]);
  const entry = { no: r.no, trump: r.trump, decider: r.decider, pushed: r.pushed, total: res.total, match: res.match, parts: [weisT, restT] };
  // Striche dieses Spiels (für das Entfernen bei Spielabbruch)
  const pend = { match: ((g.pend && g.pend.match) || [0, 0]).slice(), berg: ((g.pend && g.pend.berg) || [0, 0]).slice() };
  if (res.match != null) pend.match[res.match]++;
  if (berg != null && g.berg == null) pend.berg[berg]++;
  return {
    ...g, scores, berg, pend, history: g.history.concat([entry]),
    // für das Replay: Austeilung, Ansage und alle (eingezogenen) Stiche dieser Runde
    lastRound: { no: r.no, start: r.start, chooser: r.chooser, decider: r.decider, pushed: r.pushed, trump: r.trump, tricks: (r.tricksLog || []).filter((t) => t.length === 4).concat(r.replayTricks || []), pile: null }, // Replay: immer alle Stiche einzeln
    over: winner != null ? { winner } : null,
    round: { ...r, trick: [], turn: null, phase: "roundEnd", result: res, ...(extra || {}) },
  };
}

// Kann Spieler p (an der Reihe) alle Karten auflegen, weil ihm alle
// restlichen Stiche sicher sind? (mind. 2 Karten)
// - jede Karte ist ein Bock gegen ALLE anderen drei Spieler (auch den Partner):
//   niemand hat eine höhere Karte dieser Farbe; Nicht-Trumpf nur, wenn sonst
//   niemand mehr Trumpf hat. So gehören ihm alle restlichen Stiche selbst.
// - läuft schon ein Stich, muss er ihn SELBST sicher gewinnen (eine erlaubte
//   Karte von ihm übernimmt den Stich, und kein Gegner, der noch dran kommt,
//   kann das übertreffen). Nur dann spielt er danach aus und führt alle
//   weiteren Stiche an – gewinnt der Partner, würde dieser ausspielen und seine
//   Karten sind keine sicheren Böcke.
function canClaim(r, p) {
  const t = r.trump, hand = r.hands[p];
  if (t == null || r.turn !== p || hand.length < 2) return false;
  const oppSeats = [1, 2, 3].map((k) => (p + k) % 4);
  const opp = oppSeats.flatMap((q) => r.hands[q]);
  const oppTrump = t < 4 && opp.some((c) => E.isTrump(c, t));
  const st = (x) => (t === E.UNDE ? 8 - E.rankOf(x) : E.rankOf(x));
  const bocks = hand.every((c) => {
    if (E.isTrump(c, t)) return !opp.some((o) => E.isTrump(o, t) && E.TRUMP_STR[E.rankOf(o)] > E.TRUMP_STR[E.rankOf(c)]);
    if (oppTrump) return false;
    return !opp.some((o) => E.suitOf(o) === E.suitOf(c) && st(o) > st(c));
  });
  if (!bocks) return false;
  if (!r.trick.length) return true;
  const led = E.suitOf(r.trick[0].c);
  const legal = E.legalCards(hand, r.trick, t);
  // beste erlaubte Karte einsetzen, dann Stichhalter bestimmen
  const best = legal.slice().sort((x, y) => E.power(y, led, t) - E.power(x, led, t))[0];
  const tr = r.trick.concat([{ p, c: best }]);
  const w = tr[E.trickWinnerIdx(tr, t)];
  if (w.p !== p) return false;
  const wPow = E.power(w.c, led, t);
  // Gegner, die in diesem Stich noch spielen, dürfen nicht übertreffen können
  const still = [1, 2, 3].map((k) => (p + k) % 4).filter((q) => !r.trick.some((e) => e.p === q));
  return still.every((q) => !E.legalCards(r.hands[q], tr, t).some((c) => E.power(c, led, t) > wPow));
}

// Rest der Runde einzeln durchspielen (nur für das Replay): Spieler p legt seine
// Karten, stärkste erlaubte zuerst, die anderen geben mit der Heuristik zu.
// Liefert die Stiche ab dem laufenden Stich (mit den bereits gelegten Karten).
function simulateRest(r, p) {
  const hands = r.hands.map((h) => h.slice());
  const out = [];
  let trick = r.trick.slice(), turn = r.turn;
  const played = r.played.concat(r.trick.map((e) => e.c));
  const hist = (r.tricksLog || []).slice();
  for (let guard = 0; guard < 60; guard++) {
    if (trick.length === 4) {
      const w = trick[E.trickWinnerIdx(trick, r.trump)].p;
      out.push(trick); hist.push(trick);
      trick.forEach((e) => played.push(e.c));
      trick = []; turn = w;
    }
    if (!hands[turn].length) break;
    const legal = E.legalCards(hands[turn], trick, r.trump);
    let c;
    if (turn === p) {
      const led = trick.length ? E.suitOf(trick[0].c) : null;
      c = legal.slice().sort((a, b) => E.power(b, led == null ? E.suitOf(b) : led, r.trump) - E.power(a, led == null ? E.suitOf(a) : led, r.trump))[0];
    } else c = E.botPlay({ hand: hands[turn], trick, t: r.trump, played, p: turn, declarer: r.chooser, tricks: hist });
    hands[turn] = hands[turn].filter((x) => x !== c);
    trick.push({ p: turn, c });
    turn = (turn + 1) % 4;
  }
  if (trick.length === 4) out.push(trick);
  return out;
}

// Bock-Protokoll: erklärt Schritt für Schritt, warum aufgelegt werden durfte,
// wie der Haufen gewertet wurde, und prüft das Ergebnis gegen ein einzelnes
// Durchspielen der restlichen Stiche (Gegenprobe). `r` = Runde VOR dem Auflegen.
function buildClaimReport(r, p, replayTricks) {
  const t = r.trump, team = E.team(p), hand = r.hands[p];
  const oppSeats = [1, 2, 3].map((k) => (p + k) % 4);
  const opp = oppSeats.flatMap((q) => r.hands[q].map((c) => ({ q, c })));
  const oppTrump = t < 4 ? opp.filter((o) => E.isTrump(o.c, t)) : [];
  const st = (x) => (t === E.UNDE ? 8 - E.rankOf(x) : E.rankOf(x));
  const cardChecks = hand.map((c) => {
    if (E.isTrump(c, t)) {
      const higher = opp.filter((o) => E.isTrump(o.c, t) && E.TRUMP_STR[E.rankOf(o.c)] > E.TRUMP_STR[E.rankOf(c)]);
      return { c, ok: !higher.length, kind: "Trumpf", higher };
    }
    const higher = opp.filter((o) => E.suitOf(o.c) === E.suitOf(c) && st(o.c) > st(c));
    const stechen = oppTrump.length > 0;
    return { c, ok: !higher.length && !stechen, kind: "Farbe", higher, stechen };
  });
  // laufender Stich
  let trickInfo = null;
  if (r.trick.length) {
    const led = E.suitOf(r.trick[0].c);
    const legal = E.legalCards(hand, r.trick, t);
    const best = legal.slice().sort((x, y) => E.power(y, led, t) - E.power(x, led, t))[0];
    const tr = r.trick.concat([{ p, c: best }]);
    const w = tr[E.trickWinnerIdx(tr, t)];
    const wPow = E.power(w.c, led, t);
    const still = [1, 2, 3].map((k) => (p + k) % 4).filter((q) => !r.trick.some((e) => e.p === q));
    const beaters = still.flatMap((q) => E.legalCards(r.hands[q], tr, t).filter((c) => E.power(c, led, t) > wPow).map((c) => ({ q, c })));
    trickInfo = { cards: r.trick, best, winner: w.p, teamWins: w.p === p, beaters };
  }
  // Haufen und Punkte
  const pile = r.trick.slice();
  [0, 1, 2, 3].map((k) => (p + k) % 4).forEach((q) => r.hands[q].forEach((c) => pile.push({ p: q, c })));
  const pilePts = pile.reduce((s, e) => s + E.points(e.c, t), 0);
  const remaining = 9 - r.trickNo;
  // Gegenprobe: restliche Stiche einzeln gespielt
  const sim = replayTricks || [];
  const simTeam = [0, 0], simPts = [0, 0];
  sim.forEach((tr, k) => {
    const w = tr[E.trickWinnerIdx(tr, t)].p;
    simTeam[E.team(w)]++;
    simPts[E.team(w)] += tr.reduce((s, e) => s + E.points(e.c, t), 0) + (r.trickNo + k === 8 ? 5 : 0);
  });
  return {
    p, team, trump: t, trickNo: r.trickNo, remaining, cardChecks, oppTrumpN: oppTrump.length, trickInfo,
    pile, pilePts, lastBonus: 5, simTricks: sim, simTeam, simPts,
    allOk: cardChecks.every((x) => x.ok) && (!trickInfo || (trickInfo.teamWins && !trickInfo.beaters.length)),
    claimTeamTricks: remaining, claimPts: pilePts + 5,
    match: r.tricks[team] + remaining === 9,
    matchSim: r.tricks[team] + simTeam[team] === 9,
  };
}

// Alle Karten auflegen: alle Spieler werfen ihre restlichen Karten auf einmal
// aufs Feld, der ganze Haufen (inkl. laufendem Stich, + 5 für den letzten
// Stich) geht an das Team von p. Danach normale Abrechnung (inkl. Match).
function doClaim(g, p) {
  const r = g.round;
  const pile = r.trick.slice();
  [0, 1, 2, 3].map((k) => (p + k) % 4).forEach((q) => r.hands[q].forEach((c) => pile.push({ p: q, c })));
  const team = E.team(p);
  const pts = pile.reduce((s, e) => s + E.points(e.c, r.trump), 0) + 5;
  const trickPts = r.trickPts.slice(); trickPts[team] += pts;
  const tricks = r.tricks.slice(); tricks[team] += 9 - r.trickNo;
  const played = r.played.concat(pile.map((e) => e.c));
  const hands = r.hands.map(() => []);
  const stoeckDone = r.stoeck != null ? true : r.stoeckDone;
  const replayTricks = simulateRest(r, p);
  const upd = { hands, trick: [], trickPts, tricks, played, stoeckDone, trickNo: 9, lastTrick: { cards: pile, winner: p, pts }, pile: { p, cards: pile, nTrick: r.trick.length }, replayTricks, claimReport: buildClaimReport(r, p, replayTricks) };
  const res = E.scoreRound({ trump: r.trump, trickPts, tricks, weis: r.weis, stoeck: r.stoeck }, g.mult);
  const ap = E.applyScore(g.scores, res, g.target);
  return finishRound(g, upd, res, ap.winner, {});
}

function doCollect(g) {
  const r = g.round;
  const w = r.trick[E.trickWinnerIdx(r.trick, r.trump)].p;
  const last = r.trickNo === 8;
  const pts = r.trick.reduce((s, e) => s + E.points(e.c, r.trump), 0) + (last ? 5 : 0);
  const trickPts = r.trickPts.slice(); trickPts[E.team(w)] += pts;
  const tricks = r.tricks.slice(); tricks[E.team(w)] += 1;
  const played = r.played.concat(r.trick.map((e) => e.c));
  const lastTrick = { cards: r.trick, winner: w, pts };
  const tricksLog = (r.tricksLog || []).concat([r.trick]);
  const upd = { trickPts, tricks, played, lastTrick, tricksLog, trickNo: r.trickNo + 1 };
  if (last) {
    const res = E.scoreRound({ trump: r.trump, trickPts, tricks, weis: r.weis, stoeck: r.stoeck }, g.mult);
    const ap = E.applyScore(g.scores, res, g.target);
    return finishRound(g, upd, res, ap.winner, {});
  }
  // Die Gegner (Computer) bedanken sich, sobald sie die Zielpunkte erreicht haben.
  // Für "Wir" gilt der Knopf «Bedanken».
  const res = partialResult({ ...r, ...upd }, g.mult);
  if (THANK === "auto") {
    const ap = E.applyScore(g.scores, res, g.target);
    if (ap.winner != null) return finishRound(g, upd, res, ap.winner, { bedankt: upd.trickNo, bedanktVon: ap.winner });
  } else if (THANK === "knopf" && g.scores[1] + res.total[1] >= g.target) {
    return finishRound(g, upd, res, 1, { bedankt: upd.trickNo, bedanktVon: 1 });
  }
  return { ...g, round: { ...r, ...upd, trick: [], turn: w, phase: "play" } };
}

// «Bedanken» durch dich: stimmt es, gewinnt «Wir», sonst gewinnen die Gegner.
// Gezählt wird, was bisher gutgeschrieben ist (Stöck, Weis, eingesammelte Stiche).
function doBedanken(g) {
  if (g.round.phase === "trickDone") g = doCollect(g);
  if (g.round.phase !== "play") return g;
  const r = g.round;
  const res = partialResult(r, g.mult);
  const ok = g.scores[0] + res.total[0] >= g.target;
  return finishRound(g, {}, res, ok ? 0 : 1, { bedankt: r.trickNo, bedanktVon: 0, falsch: !ok });
}
function nextRound(g) {
  return startRound({ ...g, nextChooser: (g.round.chooser + 1) % 4 });
}

function describeWeis(w, deck) {
  if (w.type === "four") return w.r === 5 ? "Vier Under" : w.r === 3 ? "Vier Nell" : "Vier " + RANK_NAME[deck][w.r];
  return E.SEQ_NAME[w.len] + " " + SUIT_NAMES[deck][w.s] + " bis " + RANK_LABEL[deck][w.hi];
}

// ── Grafik ──
function SuitIcon({ s, deck, size }) {
  const ctx = useContext(CardImgCtx);
  const own = ctx.on && ctx.map["icon:" + deck + ":" + s];
  if (own) return <img src={own} alt="" draggable={false} style={{ width: size, height: size, objectFit: "cover", display: "block", borderRadius: size * 0.18 }} />;
  if (deck === "fr") {
    const sym = ["♦", "♥", "♠", "♣"][s];
    return <span style={{ fontSize: size, lineHeight: 1, color: s < 2 ? C.red : "#111", fontFamily: "Georgia, serif" }}>{sym}</span>;
  }
  const st = { width: size, height: size, display: "block" };
  if (s === 0) return (
    <svg viewBox="0 0 40 40" style={st}>
      <circle cx="20" cy="6" r="3" fill="none" stroke="#7a4e00" strokeWidth="2" />
      <circle cx="20" cy="22" r="14" fill="#f4c430" stroke="#7a4e00" strokeWidth="2" />
      <rect x="7" y="15" width="26" height="5" fill="#c0392b" />
      <circle cx="20" cy="28" r="3" fill="#4a2c00" />
      <rect x="19" y="28" width="2" height="7" fill="#4a2c00" />
    </svg>
  );
  if (s === 1) return (
    <svg viewBox="0 0 40 40" style={st}>
      <path d="M20 34 L20 40" stroke="#2e7d32" strokeWidth="2" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={20 + 9 * Math.sin((a * Math.PI) / 180)} cy={20 - 9 * Math.cos((a * Math.PI) / 180)} r="8" fill="#d23b3b" stroke="#8b1a1a" strokeWidth="1" />
      ))}
      <circle cx="20" cy="20" r="6" fill="#f4c430" stroke="#8b1a1a" strokeWidth="1" />
    </svg>
  );
  if (s === 2) return (
    <svg viewBox="0 0 40 40" style={st}>
      <path d="M7 5 H33 V19 Q33 31 20 37 Q7 31 7 19 Z" fill="#f4c430" stroke="#7a1f1f" strokeWidth="2.5" />
      <path d="M7 14 H33 V21 H7 Z" fill="#222" />
      <path d="M20 5 V37" stroke="#7a1f1f" strokeWidth="1.5" />
    </svg>
  );
  return (
    <svg viewBox="0 0 40 40" style={st}>
      <rect x="19" y="2" width="2.5" height="7" fill="#3e2410" />
      <ellipse cx="20" cy="26" rx="9" ry="11" fill="#d9a62e" stroke="#6b4a10" strokeWidth="1.5" />
      <path d="M8 21 Q20 4 32 21 Z" fill="#6b3e1a" stroke="#3e2410" strokeWidth="1.5" />
      <path d="M12 17 L28 17 M10 20 L30 20" stroke="#3e2410" strokeWidth="1" />
    </svg>
  );
}

function ModeIcon({ t, deck, size }) {
  const ctx = useContext(CardImgCtx);
  if (t < 4) return <SuitIcon s={t} deck={deck} size={size} />;
  const own = ctx.on && ctx.map[t === 4 ? "icon:obe" : "icon:unde"];
  if (own) return <img src={own} alt="" draggable={false} style={{ width: size, height: size, objectFit: "cover", display: "block", borderRadius: size * 0.18 }} />;
  return <span style={{ fontSize: size * 0.8, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{t === 4 ? "▲" : "▼"}</span>;
}

function Card({ id, deck, w, onClick, dim, raised, trump }) {
  const s = E.suitOf(id), r = E.rankOf(id);
  const h = Math.round(w * 1.5);
  const label = RANK_LABEL[deck][r];
  const col = deck === "fr" && s < 2 ? C.red : "#1a1a1a";
  const imgCtx = useContext(CardImgCtx);
  const img = imgCtx.on && imgCtx.map[deck + ":" + id];
  if (img) {
    return (
      <div onClick={onClick} style={{
        width: w, height: h, borderRadius: w * 0.1, background: "#fff", overflow: "hidden",
        boxShadow: raised ? "0 6px 14px rgba(0,0,0,0.5)" : "0 2px 5px rgba(0,0,0,0.45)",
        outline: trump ? "2px solid " + C.gold : "none", outlineOffset: -2, position: "relative",
        cursor: onClick ? "pointer" : "default", opacity: dim ? 0.5 : 1, filter: dim ? "grayscale(0.6)" : "none",
        userSelect: "none", WebkitUserSelect: "none",
        transform: raised ? "translateY(-14px)" : "none", transition: "transform 0.12s", textShadow: "none",
      }}>
        <img src={img} draggable={false} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
        {imgCtx.index && (
          <div style={{ position: "absolute", left: 2, top: 2, background: "rgba(255,255,255,0.88)", borderRadius: 4, padding: "1px 2px", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: w * 0.22, fontWeight: 800, color: col, lineHeight: 1, fontFamily: "Georgia, serif" }}>{label}</span>
            <SuitIcon s={s} deck={deck} size={w * 0.18} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div onClick={onClick} style={{
      width: w, height: h, borderRadius: w * 0.1, background: dim ? "#cfcfc7" : "#fbfaf4",
      boxShadow: raised ? "0 6px 14px rgba(0,0,0,0.5)" : "0 2px 5px rgba(0,0,0,0.45)",
      border: trump ? "2px solid " + C.gold : "1px solid #bbb", boxSizing: "border-box", position: "relative",
      cursor: onClick ? "pointer" : "default", opacity: dim ? 0.55 : 1, userSelect: "none", WebkitUserSelect: "none",
      transform: raised ? "translateY(-14px)" : "none", transition: "transform 0.12s", textShadow: "none",
    }}>
      <div style={{ position: "absolute", left: w * 0.07, top: w * 0.05, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: w * 0.3, fontWeight: 700, color: col, lineHeight: 1, fontFamily: "Georgia, serif" }}>{label}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.3, display: "flex", justifyContent: "center" }}>
        <SuitIcon s={s} deck={deck} size={w * 0.58} />
      </div>
      <div style={{ position: "absolute", right: w * 0.07, bottom: w * 0.05, transform: "rotate(180deg)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: w * 0.3, fontWeight: 700, color: col, lineHeight: 1, fontFamily: "Georgia, serif" }}>{label}</span>
      </div>
    </div>
  );
}

// ── Eigene Kartenbilder ──
// Werden NUR lokal im Gerät gespeichert (IndexedDB "jass-bilder"), nie
// hochgeladen und nicht Teil des Repos. Schlüssel: "<deck>:<kartenId>",
// Wert: verkleinertes JPEG als Data-URL.
const CardImgCtx = React.createContext({ on: false, index: true, map: {} });

function imgDb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("jass-bilder", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("karten");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function imgAll() {
  const db = await imgDb();
  return new Promise((res, rej) => {
    const out = {};
    const req = db.transaction("karten", "readonly").objectStore("karten").openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
    req.onerror = () => rej(req.error);
  });
}
async function imgWrite(fn) {
  const db = await imgDb();
  return new Promise((res, rej) => {
    const tx = db.transaction("karten", "readwrite");
    fn(tx.objectStore("karten"));
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
// PDF: Seiten werden mit pdf.js in Bilder umgewandelt. Die Bibliothek wird
// erst geladen, wenn tatsächlich ein PDF gewählt wird (vom CDN, kein Build).
const PDFJS_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/";
let pdfjsPromise = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = PDFJS_BASE + "pdf.min.js";
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.js"; res(window.pdfjsLib); };
      sc.onerror = () => { pdfjsPromise = null; rej(new Error("PDF-Unterstützung konnte nicht geladen werden (offline?)")); };
      document.head.appendChild(sc);
    });
  }
  return pdfjsPromise;
}
const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
// Jede PDF-Seite als eigenes Bild (Blob, längere Seite ca. 2000 px)
async function pdfToImages(file) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 2000 / Math.max(vp1.width, vp1.height) });
    const cv = document.createElement("canvas");
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.92));
    blob.name = file.name + " – Seite " + n;
    out.push(blob);
  }
  return out;
}
// Dateiliste nach Namen sortieren und PDFs in ihre Seiten auflösen (Seitenreihenfolge bleibt)
async function expandFiles(files) {
  const sorted = files.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const out = [];
  for (const f of sorted) { if (isPdf(f)) out.push(...(await pdfToImages(f))); else out.push(f); }
  return out;
}

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Bild nicht lesbar: " + file.name)); };
    im.src = url;
  });
}
// Ausschnitt (sx, sy, sw, sh) auf max. 300×450 verkleinern (spart Speicher, reicht für die Anzeige)
function cropToDataUrl(im, sx, sy, sw, sh) {
  const f = Math.min(1, 300 / sw, 450 / sh);
  const cv = document.createElement("canvas");
  cv.width = Math.round(sw * f); cv.height = Math.round(sh * f);
  cv.getContext("2d").drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.85);
}
async function shrinkImage(file) {
  const im = await loadImage(file);
  return cropToDataUrl(im, 0, 0, im.naturalWidth, im.naturalHeight);
}
// Gruppenfoto mit n Karten nebeneinander in n gleich breite Teile schneiden
async function splitImage(file, n) {
  const im = await loadImage(file);
  const w = im.naturalWidth / n, h = im.naturalHeight;
  return Array.from({ length: n }, (_, i) => cropToDataUrl(im, Math.round(i * w), 0, Math.round(w), h));
}

function CardImagesModal({ deck, imgs, reload, settings, setSettings, onClose }) {
  const [busy, setBusy] = useState(null);
  const multiRef = useRef(null);
  const singleRef = useRef(null);
  const groupRef = useRef(null);
  const groupsRef = useRef(null);
  const slotRef = useRef(null);
  const groupRankRef = useRef(null);
  const RANKS = [0, 1, 2, 3, 4, 5, 6, 7, 8], SUITS = [0, 1, 2, 3];
  const byRank = settings.imgOrder === "rang";
  const order = byRank ? RANKS.flatMap((r) => SUITS.map((s) => s * 9 + r)) : SUITS.flatMap((s) => RANKS.map((r) => s * 9 + r));
  const key = (id) => deck + ":" + id;
  const count = order.filter((id) => imgs[key(id)]).length;

  // pairs: [kartenId, File] oder [kartenId, fertige Data-URL]
  const store = async (pairs) => {
    setBusy("Speichere " + pairs.length + " Bild(er)…");
    try {
      const data = [];
      for (const [id, src] of pairs) data.push([key(id), typeof src === "string" ? src : await shrinkImage(src)]);
      await imgWrite((st) => data.forEach(([k, v]) => st.put(v, k)));
      await reload();
      setBusy(null);
    } catch (e) { setBusy("Fehler: " + (e.message || e)); }
  };
  // Gruppenfotos: je Foto ein Rang, 4 Karten nebeneinander (Farben in Standardreihenfolge)
  const storeGroups = async (rankFiles) => {
    setBusy("Schneide " + rankFiles.length + " Gruppenfoto(s)…");
    try {
      const pairs = [];
      for (const [r, file] of rankFiles) (await splitImage(file, 4)).forEach((url, s) => pairs.push([s * 9 + r, url]));
      await store(pairs);
    } catch (e) { setBusy("Fehler: " + (e.message || e)); }
  };
  // Ausgewählte Dateien lesen; PDFs werden in Seiten-Bilder aufgelöst
  const pick = async (ev) => {
    const raw = Array.from(ev.target.files || []);
    ev.target.value = "";
    if (!raw.length) return [];
    if (raw.some(isPdf)) setBusy("Lese PDF…");
    try { return await expandFiles(raw); } catch (e) { setBusy("Fehler: " + (e.message || e)); return []; }
  };
  const onGroups = async (ev) => {
    const files = await pick(ev);
    if (files.length) storeGroups(files.slice(0, 9).map((f, i) => [i, f]));
  };
  const onGroup = async (ev) => {
    const r = groupRankRef.current;
    const files = await pick(ev);
    if (files.length && r != null) storeGroups([[r, files[0]]]);
  };
  const onMulti = async (ev) => {
    const files = await pick(ev);
    if (!files.length) return;
    const start = Math.max(0, order.findIndex((id) => !imgs[key(id)]));
    const ids = order.slice(start).concat(order.slice(0, start));
    store(files.slice(0, 36).map((f, i) => [ids[i], f]));
  };
  // Rückseite: ein Bild (bei PDF die erste Seite), Schlüssel "back" für alle Kartensätze
  const backRef = useRef(null);
  const onBack = async (ev) => {
    const files = await pick(ev);
    if (!files.length) return;
    setBusy("Speichere Rückseite…");
    try {
      const url = await shrinkImage(files[0]);
      await imgWrite((st) => st.put(url, "back"));
      await reload();
      setBusy(null);
    } catch (e) { setBusy("Fehler: " + (e.message || e)); }
  };
  const removeBack = async () => { await imgWrite((st) => st.delete("back")); await reload(); };
  // Farbsymbole: 4 Farben (je Kartensatz) + Pfeile Obenabe/Undenufe
  const iconRef = useRef(null);
  const iconKey = useRef(null);
  const ICONS = [0, 1, 2, 3].map((s) => ["icon:" + deck + ":" + s, SUIT_NAMES[deck][s]]).concat([["icon:obe", "Obenabe"], ["icon:unde", "Undenufe"]]);
  const onIcon = async (ev) => {
    const files = await pick(ev);
    if (!files.length || !iconKey.current) return;
    try {
      const url = await shrinkImage(files[0]);
      await imgWrite((st) => st.put(url, iconKey.current));
      await reload();
      setBusy(null);
    } catch (e) { setBusy("Fehler: " + (e.message || e)); }
  };
  const removeIcon = async (k) => { await imgWrite((st) => st.delete(k)); await reload(); };
  const onSingle = async (ev) => {
    const id = slotRef.current;
    const files = await pick(ev);
    if (files.length && id != null) store([[id, files[0]]]);
  };
  const removeAll = async () => {
    if (!window.confirm("Alle eigenen Bilder für diese Karten löschen?")) return;
    await imgWrite((st) => order.forEach((id) => st.delete(key(id))));
    await reload();
  };
  const removeOne = async (id) => { await imgWrite((st) => st.delete(key(id))); await reload(); };

  // ── Tauschen: einzelne Karten, ganze Ränge (alle 4 Farben) oder ganze Farben ──
  const [mode, setMode] = useState("ersetzen");
  const [sel, setSel] = useState(null); // { type: "card"|"rank"|"suit", v }
  const swapIds = async (pairs) => {
    await imgWrite((st) => pairs.forEach(([a, b]) => {
      const ia = imgs[key(a)], ib = imgs[key(b)];
      if (ib) st.put(ib, key(a)); else st.delete(key(a));
      if (ia) st.put(ia, key(b)); else st.delete(key(b));
    }));
    await reload();
  };
  const tapSwap = (type, v) => {
    if (!sel || sel.type !== type) { setSel({ type, v }); return; }
    if (sel.v === v) { setSel(null); return; }
    const a = sel.v, b = v;
    setSel(null);
    if (type === "card") swapIds([[a, b]]);
    if (type === "rank") swapIds(SUITS.map((s) => [s * 9 + a, s * 9 + b]));
    if (type === "suit") swapIds(RANKS.map((r) => [a * 9 + r, b * 9 + r]));
  };
  const isSel = (type, v) => sel && sel.type === type && sel.v === v;
  const swapping = mode === "tauschen";

  const toggle = (k) => setSettings({ ...settings, [k]: !settings[k] });
  return (
    <Modal title="Eigene Kartenbilder" onClose={onClose} wide page>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5, marginBottom: 12 }}>
        Fotos oder Scans deiner eigenen Karten ({deck === "ch" ? "Deutschschweizer" : "französische"} Karten). Die Bilder bleiben <b style={{ color: C.text }}>aus Copyright-Gründen nur auf diesem Gerät</b> und werden nirgends hochgeladen.
        Bei mehreren Bildern gilt die Reihenfolge der Dateinamen (bei Fotos = Aufnahme-Reihenfolge). Auch PDF möglich: jede Seite zählt wie ein Bild. Einzelne Karte: Feld antippen.
      </div>

      <div style={{ fontWeight: 800, color: C.gold, fontSize: 14, marginBottom: 6 }}>Einzelfotos (eine Karte pro Bild)</div>
      <div style={{ marginBottom: 8 }}>
        <Choice value={settings.imgOrder || "farbe"} onChange={(v) => setSettings({ ...settings, imgOrder: v })} options={[["farbe", "Nach Farbe"], ["rang", "Nach Rang"]]} />
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>
        {byRank
          ? "Reihenfolge: alle 6er, alle 7er … alle Asse – jeweils " + SUIT_NAMES[deck].join(", ") + "."
          : "Reihenfolge: " + SUIT_NAMES[deck].join(", ") + " – jeweils von 6 bis Ass."}
        {" "}Beginnt bei der ersten Karte ohne Bild.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={() => multiRef.current.click()} style={btn(true)}>Bilder auswählen…</button>
        {count > 0 && <button onClick={removeAll} style={btn(false)}>Alle löschen</button>}
      </div>

      <div style={{ fontWeight: 800, color: C.gold, fontSize: 14, marginBottom: 6 }}>Gruppenfotos (4 Karten nebeneinander)</div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>
        Pro Foto alle vier Karten eines Rangs, dicht und gerade nebeneinander, von links: {SUIT_NAMES[deck].join(", ")}. Foto knapp auf die Karten zuschneiden – es wird in 4 gleich breite Teile geschnitten.
        Mehrere Fotos: Reihenfolge 6, 7, 8, 9, 10, U, O, K, A.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={() => groupsRef.current.click()} style={btn(true)}>Gruppenfotos auswählen…</button>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: C.dim, marginRight: 4 }}>Einzelner Rang:</span>
        {RANKS.map((r) => (
          <button key={r} onClick={() => { groupRankRef.current = r; groupRef.current.click(); }} style={{ ...btn(false), padding: "6px 9px", fontSize: 13 }}>{RANK_LABEL[deck][r]}</button>
        ))}
      </div>

      <input ref={multiRef} type="file" accept="image/*,application/pdf" multiple onChange={onMulti} style={{ display: "none" }} />
      <input ref={singleRef} type="file" accept="image/*,application/pdf" onChange={onSingle} style={{ display: "none" }} />
      <input ref={groupsRef} type="file" accept="image/*,application/pdf" multiple onChange={onGroups} style={{ display: "none" }} />
      <input ref={groupRef} type="file" accept="image/*,application/pdf" onChange={onGroup} style={{ display: "none" }} />
      <input ref={backRef} type="file" accept="image/*,application/pdf" onChange={onBack} style={{ display: "none" }} />

      <input ref={iconRef} type="file" accept="image/*,application/pdf" onChange={onIcon} style={{ display: "none" }} />
      <div style={{ fontWeight: 800, color: C.gold, fontSize: 14, marginBottom: 6 }}>Farbsymbole</div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>Je ein Bild pro Farbe und für die Pfeile Obenabe/Undenufe – ersetzt die gezeichneten Symbole überall. Feld antippen zum Laden, ✕ zum Entfernen.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 14 }}>
        {ICONS.map(([k, lab], i) => (
          <div key={k} style={{ textAlign: "center" }}>
            <div onClick={() => { iconKey.current = k; iconRef.current.click(); }} style={{ aspectRatio: "1 / 1", borderRadius: 8, cursor: "pointer", background: "rgba(255,255,255,0.9)", border: "1px solid " + C.line, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {imgs[k] ? <img src={imgs[k]} alt="" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
                : i < 4 ? <SuitIcon s={i} deck={deck} size={26} /> : <ModeIcon t={i} deck={deck} size={26} />}
            </div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{lab}{imgs[k] && <span onClick={() => removeIcon(k)} style={{ marginLeft: 3, cursor: "pointer", color: C.text }}>✕</span>}</div>
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 800, color: C.gold, fontSize: 14, marginBottom: 6 }}>Rückseite</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div onClick={() => backRef.current.click()} style={{ width: 44, aspectRatio: "2 / 3", borderRadius: 4, overflow: "hidden", cursor: "pointer", background: imgs["back"] ? "#fff" : "rgba(255,255,255,0.08)", border: "1px solid " + C.line, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.dim }}>
          {imgs["back"] ? <img src={imgs["back"]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "leer"}
        </div>
        <button onClick={() => backRef.current.click()} style={{ ...btn(false), padding: "8px 12px", fontSize: 14 }}>{imgs["back"] ? "Ersetzen…" : "Bild/PDF wählen…"}</button>
        {imgs["back"] && <button onClick={removeBack} style={{ ...btn(false), padding: "8px 12px", fontSize: 14 }}>Löschen</button>}
      </div>
      {busy && <div style={{ fontSize: 13, color: C.gold, marginBottom: 10 }}>{busy}</div>}
      <div style={{ fontSize: 13, marginBottom: 8 }}>{count} von 36 Karten mit eigenem Bild</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.dim }}>Antippen:</span>
        <Choice value={mode} onChange={(v) => { setMode(v); setSel(null); }} options={[["ersetzen", "Bild ersetzen"], ["tauschen", "Tauschen"]]} />
      </div>
      {swapping && (
        <div style={{ fontSize: 12, color: C.gold, marginBottom: 8, lineHeight: 1.5 }}>
          {sel ? "Jetzt das Ziel antippen (gleiche Art) – oder nochmals dasselbe zum Abbrechen."
            : "Zwei Karten nacheinander antippen = tauschen. Rang-Knöpfe (6 … A) tauschen den ganzen Rang in allen 4 Farben, Farb-Namen die ganze Farbe."}
        </div>
      )}
      {swapping && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 3, marginBottom: 8 }}>
          {RANKS.map((r) => (
            <button key={r} onClick={() => tapSwap("rank", r)} style={{ ...btn(isSel("rank", r)), padding: "6px 0", fontSize: 12 }}>{RANK_LABEL[deck][r]}</button>
          ))}
        </div>
      )}
      {[0, 1, 2, 3].map((s) => (
        <div key={s} style={{ marginBottom: 10 }}>
          <div onClick={() => swapping && tapSwap("suit", s)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 4, padding: swapping ? "3px 8px" : 0, borderRadius: 8, cursor: swapping ? "pointer" : "default", background: isSel("suit", s) ? C.gold : swapping ? "rgba(255,255,255,0.08)" : "none", color: isSel("suit", s) ? "#1a1200" : C.text }}><SuitIcon s={s} deck={deck} size={16} />{SUIT_NAMES[deck][s]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 3 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((r) => {
              const id = s * 9 + r, im = imgs[key(id)];
              const hl = isSel("card", id) || isSel("rank", r) || isSel("suit", s);
              return (
                <div key={r} onClick={() => { if (swapping) tapSwap("card", id); else { slotRef.current = id; singleRef.current.click(); } }}
                  onContextMenu={(e) => { e.preventDefault(); if (im && window.confirm("Bild dieser Karte löschen?")) removeOne(id); }}
                  style={{ aspectRatio: "2 / 3", borderRadius: 4, overflow: "hidden", cursor: "pointer", background: im ? "#fff" : "rgba(255,255,255,0.08)", border: hl ? "2px solid " + C.gold : "1px solid " + C.line, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.dim }}>
                  {im ? <img src={im} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : RANK_LABEL[deck][r]}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ borderTop: "1px solid " + C.line, paddingTop: 12, marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={settings.customImgs} onChange={() => toggle("customImgs")} /> Eigene Bilder im Spiel verwenden
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={settings.imgIndex} onChange={() => toggle("imgIndex")} /> Kleine Kartenbezeichnung oben links einblenden
        </label>
        <div style={{ fontSize: 12, color: C.dim }}>Karten ohne eigenes Bild werden weiterhin gezeichnet. Ein Bild ersetzen: Feld antippen. Löschen: Feld lange drücken.</div>
      </div>
    </Modal>
  );
}

// Kartenrücken (eigenes, schlichtes Muster)
function CardBack({ w, rot }) {
  const h = Math.round(w * 1.5);
  const imgCtx = useContext(CardImgCtx);
  const img = imgCtx.on && imgCtx.map["back"];
  if (img) {
    return (
      <div style={{ width: w, height: h, borderRadius: w * 0.12, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.6)", transform: rot ? "rotate(" + rot + "deg)" : "none" }}>
        <img src={img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.12, background: "#fbfaf4", padding: w * 0.07, boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.6)", transform: rot ? "rotate(" + rot + "deg)" : "none" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: w * 0.07, background: "repeating-linear-gradient(45deg, #8b1e2b 0 3px, #a8323f 3px 6px), #8b1e2b", backgroundBlendMode: "multiply" }} />
    </div>
  );
}

// Gewonnene Stiche eines Spielers: umgedrehte, versetzt gestapelte Kärtchen
function TrickPile({ n, w }) {
  if (!n) return null;
  return (
    <div style={{ position: "relative", width: w * 1.5 + (Math.min(n, 9) - 1) * 3, height: w + (Math.min(n, 9) - 1) * 2 }}>
      {Array.from({ length: Math.min(n, 9) }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: i * 3, top: i * 2, width: w * 1.5, height: w }}>
          <div style={{ position: "absolute", left: w * 0.25, top: -w * 0.25, transform: "rotate(" + (90 + ((i * 37) % 9) - 4) + "deg)" }}>
            <CardBack w={w} />
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", right: -16, bottom: -4, fontSize: 11, fontWeight: 800, color: C.text, background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "0 5px" }}>{n}</div>
    </div>
  );
}

// Kleine Schiefertafel als Knopf zur Jasstafel
function TafelBadge({ onClick, scores }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer", padding: 4, borderRadius: 5, background: "linear-gradient(135deg, #a8743f, #6b3f1b)", boxShadow: "0 3px 8px rgba(0,0,0,0.5)" }}>
      <div style={{ background: "radial-gradient(circle at 40% 35%, #3c4744, #232b29)", borderRadius: 2, padding: "4px 8px 3px", fontFamily: CHALK_FONT, color: CHALK, textAlign: "center", lineHeight: 1.15 }}>
        <svg viewBox="0 0 40 18" width="34" height="15" style={{ display: "block", margin: "0 auto" }}>
          <path d="M3 3 H37 L3 15 H37" stroke={CHALK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M8 1 V5 M11 1 V5 M14 1 V5 M8 13 V17 M11 13 V17" stroke={CHALK} strokeWidth="1.1" />
        </svg>
        <div style={{ fontSize: 11 }}>Jasstafel</div>
      </div>
    </div>
  );
}

// Hintergrund Startbildschirm: alte, verwitterte Schiefer-Jasstafel
function StartSlate() {
  const rnd = (i) => { const x = Math.sin(i * 91.17) * 43758.5453; return x - Math.floor(x); };
  // Holzschäden am Rahmen
  const macken = Array.from({ length: 14 }, (_, i) => {
    const side = i % 4, t = rnd(i + 800);
    const x = side === 0 ? 4 + rnd(i) * 14 : side === 1 ? 382 + rnd(i) * 14 : 20 + t * 360;
    const y = side < 2 ? 20 + t * 760 : side === 2 ? 4 + rnd(i) * 14 : 782 + rnd(i) * 14;
    return <ellipse key={i} cx={x} cy={y} rx={2 + rnd(i + 900) * 5} ry={1 + rnd(i + 950) * 3} fill="rgba(40,20,5,0.55)" />;
  });
  // Alte, weggewischte Z und Zahlen
  const geist = (oy, k) => (
    <g key={k} stroke="rgba(235,235,225,0.07)" strokeWidth="7" fill="none" strokeLinecap="round">
      <path d={"M60 " + (oy + 40) + " H330 L60 " + (oy + 230) + " H330"} />
      <path d={"M80 " + (oy + 28) + " v24 M92 " + (oy + 28) + " v24 M104 " + (oy + 28) + " v24 M116 " + (oy + 28) + " v24 M76 " + (oy + 50) + " L122 " + (oy + 30)} strokeWidth="3" />
    </g>
  );
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
      <defs>
        <linearGradient id="holz" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a5a2b" /><stop offset="30%" stopColor="#5e3a17" /><stop offset="55%" stopColor="#7d5025" /><stop offset="80%" stopColor="#4f3013" /><stop offset="100%" stopColor="#6e451f" />
        </linearGradient>
        <filter id="holzmaser">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 0.35 0" />
        </filter>
        <radialGradient id="schieferAlt" cx="45%" cy="38%" r="85%">
          <stop offset="0%" stopColor="#3e4845" /><stop offset="70%" stopColor="#262e2c" /><stop offset="100%" stopColor="#1b2120" />
        </radialGradient>
        <filter id="schieferKorn">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.06" numOctaves="4" seed="11" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0" />
        </filter>
        <filter id="verwittert">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="2" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0" />
        </filter>
      </defs>
      <rect width="400" height="800" fill="url(#holz)" />
      <rect width="400" height="800" filter="url(#holzmaser)" />
      {macken}
      <rect x="20" y="20" width="360" height="760" rx="4" fill="#2a2d33" />
      <image href="schiefer.jpg" x="20" y="20" width="360" height="760" preserveAspectRatio="xMidYMid slice" />
      {geist(70, 1)}
      {geist(480, 2)}
      <rect x="20" y="20" width="360" height="760" rx="4" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="6" />
      <rect x="17" y="17" width="366" height="766" rx="5" fill="none" stroke="rgba(255,220,170,0.12)" strokeWidth="1.5" />
    </svg>
  );
}

// Spielteppich: grüner Filz, abgegriffen (hellere, abgewetzte Stellen dort,
// wo Karten gespielt und Stiche eingezogen werden), Flecken, dunkle Ränder.
// Spielteppich: Foto eines echten Jassteppichs (filz.jpg, leicht nachgeschärft),
// nur mit einem leichten Schatten ganz am Rand.
function FeltBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none",
      background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 100%), linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url(filz.jpg) center / cover" }} />
  );
}

// Feier bei Match oder Sieg: Sternchen rieseln von oben, grosses Wort darüber.
// Liegt über allem, fängt aber keine Berührungen ab.
// Leise, etwas frustrierte Variante für Match/Sieg der Gegner: wenige graue
// Tropfen fallen langsam, das Wort ist kleiner, grau und sackt traurig ab.
function Frustration({ text }) {
  const drops = React.useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const r = (k) => { const x = Math.sin((i + 1) * 78.233 * k) * 43758.5453; return x - Math.floor(x); };
    return { left: 5 + r(1) * 90, delay: r(2) * 2.5, dur: 3 + r(3) * 2, h: 10 + r(4) * 10 };
  }), []);
  return (
    <div data-party="1" style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", overflow: "hidden", background: "rgba(0,0,0,0.12)" }}>
      <style>{`
        @keyframes jassTropfen { 0% { transform: translateY(-5vh); opacity: 0; } 15% { opacity: 0.6; } 85% { opacity: 0.6; } 100% { transform: translateY(105vh); opacity: 0; } }
        @keyframes jassSeufz { 0% { transform: translate(-50%, -60%) rotate(0deg); opacity: 0; } 20% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.85; } 70% { transform: translate(-50%, -38%) rotate(5deg); opacity: 0.8; } 100% { transform: translate(-50%, -25%) rotate(8deg); opacity: 0; } }
      `}</style>
      {drops.map((d, i) => (
        <div key={i} style={{ position: "absolute", top: 0, left: d.left + "%", width: 2, height: d.h, borderRadius: 2, background: "rgba(170,185,190,0.7)",
          animation: "jassTropfen " + d.dur + "s linear " + d.delay + "s both" }} />
      ))}
      <div style={{ position: "absolute", left: "50%", top: "45%", whiteSpace: "nowrap", fontWeight: 700, fontStyle: "italic",
        fontSize: "min(" + Math.floor(80 / text.length) + "vw, 14vh)", color: "#9aa7a4", textShadow: "0 3px 12px rgba(0,0,0,0.6)",
        animation: "jassSeufz 4.2s ease-in both", fontFamily: "Georgia, serif" }}>{text}</div>
    </div>
  );
}

function Celebration({ text }) {
  const stars = React.useMemo(() => Array.from({ length: 90 }, (_, i) => {
    const r = (k) => { const x = Math.sin((i + 1) * 12.9898 * k) * 43758.5453; return x - Math.floor(x); };
    return { left: r(1) * 100, delay: r(2) * 2.2, dur: 2.2 + r(3) * 2, size: 8 + r(4) * 16, rot: r(5) * 360, col: ["#f4c430", "#fff6c8", "#ffffff", "#ffd966"][Math.floor(r(6) * 4)] };
  }), []);
  return (
    <div data-party="1" style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes jassStern { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; } 8% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh) rotate(540deg); opacity: 0; } }
        @keyframes jassWort { 0% { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 0; } 15% { transform: translate(-50%, -50%) scale(1.08) rotate(-4deg); opacity: 1; } 25% { transform: translate(-50%, -50%) scale(1) rotate(-4deg); } 85% { opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1.05) rotate(-4deg); opacity: 0; } }
      `}</style>
      {stars.map((st, i) => (
        <div key={i} style={{ position: "absolute", top: 0, left: st.left + "%", fontSize: st.size, color: st.col, textShadow: "0 0 6px rgba(255,220,120,0.8)",
          animation: "jassStern " + st.dur + "s linear " + st.delay + "s both" }}>
          <span style={{ display: "inline-block", transform: "rotate(" + st.rot + "deg)" }}>★</span>
        </div>
      ))}
      <div style={{ position: "absolute", left: "50%", top: "45%", whiteSpace: "nowrap", fontWeight: 900, letterSpacing: "0.02em",
        fontSize: "min(" + Math.floor(128 / text.length) + "vw, 30vh)", color: C.gold, WebkitTextStroke: "2px #5a3d00",
        textShadow: "0 6px 0 #7a5200, 0 10px 30px rgba(0,0,0,0.7)", animation: "jassWort 4.2s ease-out both", fontFamily: "Georgia, serif" }}>{text}</div>
    </div>
  );
}

// ── Replay der letzten Runde ──
// Spielt die gespeicherte letzte Runde (Austeilung, Trumpf, alle Stiche)
// automatisch nochmals ab. Alle Hände liegen offen; Stich für Stich werden
// die Karten auf den Tisch gelegt und eingezogen.
function ReplayView({ rec, deck, speed, onClose }) {
  const sp = SPEEDS[speed] && speed !== "manuell" ? SPEEDS[speed] : SPEEDS.normal;
  // Ereignisse: je Stich 4× Karte legen, dann einziehen
  const events = React.useMemo(() => {
    const ev = [];
    rec.tricks.forEach((tr, k) => { tr.forEach((e, i) => ev.push({ k, i })); ev.push({ k, collect: true }); });
    // Böcke aufgelegt: zuerst ggf. die Karten des laufenden Stichs, dann der ganze Haufen
    if (rec.pile) { ev.push({ pile: true }); ev.push({ pileCollect: true }); }
    return ev;
  }, [rec]);
  const [step, setStep] = useState(0);
  const [pause, setPause] = useState(false);
  const vw = useWidth(), vh = useHeight();
  useEffect(() => {
    if (pause || step >= events.length) return;
    const t = setTimeout(() => setStep(step + 1), events[step].collect || events[step].pile ? sp.trick + 400 : sp.bot + 150);
    return () => clearTimeout(t);
  }, [step, pause]);
  // Zustand nach `step` Ereignissen
  const played = new Set(); let cur = [], won = [0, 0], pts = [0, 0];
  for (let j = 0; j < step; j++) {
    const e = events[j];
    if (e.pile) { rec.pile.cards.forEach((x) => played.add(x.c)); cur = rec.pile.cards.slice(); continue; }
    if (e.pileCollect) {
      won[E.team(rec.pile.p)] += 9 - rec.tricks.length;
      pts[E.team(rec.pile.p)] += rec.pile.cards.reduce((s, x) => s + E.points(x.c, rec.trump), 0) + 5;
      cur = []; continue;
    }
    if (e.collect) {
      const tr = rec.tricks[e.k];
      const w = tr[E.trickWinnerIdx(tr, rec.trump)].p;
      won[E.team(w)]++;
      pts[E.team(w)] += tr.reduce((s, x) => s + E.points(x.c, rec.trump), 0) + (e.k === 8 ? 5 : 0);
      cur = [];
    } else { const x = rec.tricks[e.k][e.i]; played.add(x.c); cur = cur.concat([x]); }
  }
  const done = step >= events.length;
  const hands = rec.start.map((h) => E.sortHand(h.filter((c) => !played.has(c)), rec.trump));
  const W = Math.min(vw, 1100), cw = Math.max(40, Math.min(110, Math.floor((W - 16) / 6), Math.floor(vh * 0.11)));
  const mw = Math.round(cw * 0.55), tw = Math.round(cw * 0.85), th = Math.round(tw * 1.5);
  const isPile = cur.length > 4;
  const curIdx = cur.length && !isPile ? E.trickWinnerIdx(cur, rec.trump) : -1;
  const pos = (p) => "translate(" + ({ 0: 0, 1: tw * 0.78, 2: 0, 3: -tw * 0.78 }[p]) + "px," + ({ 0: th * 0.42, 1: 0, 2: -th * 0.42, 3: 0 }[p]) + "px) rotate(" + ({ 0: 0, 1: -8, 2: 3, 3: 8 }[p]) + "deg)";
  const Row = ({ cards, w, st }) => (
    <div style={{ position: "relative", width: cards.length ? w + st * (cards.length - 1) : w, height: Math.round(w * 1.5) }}>
      {cards.map((c, i) => <div key={c} style={{ position: "absolute", left: i * st, top: 0, zIndex: i }}><Card id={c} deck={deck} w={w} trump={E.isTrump(c, rec.trump)} /></div>)}
    </div>
  );
  const label = (p) => <div style={{ fontSize: 13, fontWeight: 700, color: C.text, background: "rgba(0,0,0,0.45)", padding: "2px 10px", borderRadius: 12, marginBottom: 4, textAlign: "center" }}>{NAMES[p]}{rec.decider === p ? (rec.pushed ? " ☆" : " ★") : ""}</div>;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, background: C.felt2, color: C.text, overflow: "hidden" }}>
      <FeltBackground />
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 10px)", left: 10, right: 10, display: "flex", alignItems: "center", gap: 10, zIndex: 5 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>↺ Replay Runde {rec.no}</div>
        <ModeIcon t={rec.trump} deck={deck} size={20} />
        <div style={{ fontSize: 13, color: C.dim }}>Stiche {won[0]}:{won[1]} · Punkte {pts[0]}:{pts[1]}</div>
        <div style={{ flex: 1 }} />
        {!done && <button onClick={() => setPause(!pause)} style={{ ...btn(false), padding: "6px 10px", fontSize: 13 }}>{pause ? "▶" : "❚❚"}</button>}
        <button onClick={() => { setStep(0); setPause(false); }} style={{ ...btn(false), padding: "6px 10px", fontSize: 13 }}>⟲</button>
        <button onClick={onClose} style={{ ...btn(false), padding: "6px 10px", fontSize: 13 }}>✕</button>
      </div>
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 56px)", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>{label(2)}<Row cards={hands[2]} w={mw} st={Math.round(mw * 0.45)} /></div>
      <div style={{ position: "absolute", top: "40%", left: 8, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>{label(3)}<Row cards={hands[3]} w={mw} st={Math.round(mw * 0.32)} /></div>
      <div style={{ position: "absolute", top: "40%", right: 8, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>{label(1)}<Row cards={hands[1]} w={mw} st={Math.round(mw * 0.32)} /></div>
      <div style={{ position: "absolute", left: "50%", top: "52%", width: 0, height: 0 }}>
        {cur.map((e, i) => (
          <div key={e.c} style={{ position: "absolute", left: -tw / 2, top: -th / 2, transform: isPile ? "translate(" + ((i % 9) - 4) * tw * 0.18 + "px," + (Math.floor(i / 9) - 1.5) * th * 0.18 + "px) rotate(" + ((i * 47) % 40 - 20) + "deg)" : pos(e.p), zIndex: i, filter: i === curIdx ? "drop-shadow(0 0 4px #4ade80) drop-shadow(0 0 2px #4ade80)" : "none" }}>
            <Card id={e.c} deck={deck} w={tw} trump={E.isTrump(e.c, rec.trump)} />
          </div>
        ))}
      </div>
      {done && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.7)", padding: "12px 18px", borderRadius: 12, textAlign: "center", fontWeight: 700 }}>Ende der Runde · {pts[0]} : {pts[1]}</div>}
      <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {label(0)}<Row cards={hands[0]} w={cw} st={Math.round(cw * 0.6)} />
      </div>
    </div>
  );
}

// Böcke auflegen als kleine Filmszene (zusammen unter 3 s):
// 1. Die Bock-Karten des Spielers liegen nebeneinander in der Tischmitte,
//    Unterschrift «nur noch Böcke».
// 2. Dann fliegen alle restlichen Karten aller Spieler direkt auf den Haufen
//    des Gewinners. Web Animations API, keine Bibliothek.
function ClaimAnim({ pile, p, nTrick, deck, trump, w }) {
  const refs = useRef([]);
  const capRef = useRef(null);
  const vw = window.innerWidth, vh = window.innerHeight;
  const from = { 0: [0, vh * 0.42], 1: [vw * 0.46, 0], 2: [0, -vh * 0.36], 3: [-vw * 0.46, 0] };
  const tr = (x, y, rot, sc) => "translate(" + x + "px," + y + "px) rotate(" + (rot || 0) + "deg) scale(" + (sc == null ? 1 : sc) + ")";
  const mineIdx = pile.map((e, i) => (i >= nTrick && e.p === p ? i : -1)).filter((i) => i >= 0);
  const n = mineIdx.length, gap = 6;
  const w2 = Math.min(w * 0.95, (vw - 24 - (n - 1) * gap) / Math.max(n, 1));
  const rowY = vh * 0.08;
  const rowX = (k) => (k - (n - 1) / 2) * (w2 + gap);
  const trickT = (q) => {
    const h = w * 1.5;
    return tr({ 0: 0, 1: w * 0.78, 2: 0, 3: -w * 0.78 }[q], -vh * 0.06 + { 0: h * 0.42, 1: 0, 2: -h * 0.42, 3: 0 }[q], { 0: 0, 1: -8, 2: 3, 3: 8 }[q]);
  };
  const target = [from[p][0] * 0.9, from[p][1] * 0.9];
  const T2 = 1750; // Beginn von Phase 2
  useEffect(() => {
    const anims = [];
    let k = 0;
    pile.forEach((e, i) => {
      const el = refs.current[i];
      if (!el) return;
      let startB;
      if (i < nTrick) startB = trickT(e.p);               // Karten des laufenden Stichs bleiben liegen
      else if (e.p === p) {                               // Bock-Karten: in die Mitte, nebeneinander
        const [fx, fy] = from[p];
        anims.push(el.animate([
          { transform: tr(fx, fy, 0, 0.9), opacity: 0 },
          { transform: tr(rowX(k), rowY, 0, 1), opacity: 1 },
        ], { duration: 450, delay: k * 70, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" }));
        startB = tr(rowX(k), rowY, 0, 1); k++;
      } else startB = tr(from[e.p][0], from[e.p][1], 0, 1); // Karten der anderen: noch unsichtbar
      anims.push(el.animate([
        { transform: startB, opacity: 1 },
        { transform: tr(target[0] + i * 1.5, target[1] + i * 1.5, (i * 37) % 30 - 15, 0.5), opacity: 0 },
      ], { duration: 780, delay: T2 + i * 8, easing: "cubic-bezier(.55,0,.8,.45)", fill: "forwards" }));
    });
    const cap = capRef.current;
    if (cap) {
      anims.push(cap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 450, fill: "forwards" }));
      anims.push(cap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: T2 - 100, fill: "forwards" }));
    }
    return () => anims.forEach((a) => a.cancel());
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
        {pile.map((e, i) => {
          const sz = i >= nTrick && e.p === p ? w2 : w;
          return (
            <div key={e.c} ref={(el) => (refs.current[i] = el)}
              style={{ position: "absolute", left: -sz / 2, top: -sz * 0.75, zIndex: i, opacity: i < nTrick ? 1 : 0, transform: i < nTrick ? trickT(e.p) : "none" }}>
              <Card id={e.c} deck={deck} w={sz} trump={E.isTrump(e.c, trump)} />
            </div>
          );
        })}
        <div ref={capRef} style={{ position: "absolute", left: 0, top: rowY + w2 * 0.75 + 12, transform: "translateX(-50%)", opacity: 0, whiteSpace: "nowrap",
          background: "rgba(0,0,0,0.65)", color: "#fff", fontWeight: 700, fontSize: 15, padding: "4px 14px", borderRadius: 14, zIndex: 200 }}>nur noch Böcke</div>
      </div>
    </div>
  );
}

// Gefächert gehaltene Karten eines Mitspielers (iPad): Rückseiten, Anzahl =
// tatsächliche Handkarten; im Lernmodus «Offene Karten» mit Vorderseite.
function CardFan({ cards, faceUp, deck, trump, w }) {
  const n = cards.length;
  const span = Math.min(66, 8 * Math.max(n - 1, 0));
  return (
    <div style={{ position: "relative", width: Math.round(w * 3.2), height: Math.round(w * 1.55), marginBottom: Math.round(w * 0.3) }}>
      {cards.map((c, i) => {
        const a = n > 1 ? -span / 2 + (i * span) / (n - 1) : 0;
        return (
          <div key={faceUp ? c : i} style={{ position: "absolute", left: "50%", bottom: 0, marginLeft: -w / 2, transformOrigin: "50% 140%", transform: "rotate(" + a + "deg)", zIndex: i, transition: "transform 0.25s" }}>
            {faceUp ? <Card id={c} deck={deck} w={w} trump={trump != null && E.isTrump(c, trump)} /> : <CardBack w={w} />}
          </div>
        );
      })}
    </div>
  );
}

// Austeilen: 12 Päckchen à 3 Karten fliegen vom Stapel in der Tischmitte reihum
// (du, rechts, Partner, links = Gegenuhrzeigersinn), 3 Umgänge; insgesamt 5 s.
const DEAL_MS = 5000, DEAL_BATCHES = 12, DEAL_FLY = 380;
const DEAL_GAP = (DEAL_MS - DEAL_FLY) / (DEAL_BATCHES - 1); // Abstand zwischen den Päckchen
function DealAnim({ w, origin, start }) {
  const refs = useRef([]);
  const vw = window.innerWidth, vh = window.innerHeight;
  const to = { 0: [0, vh * 0.34], 1: [vw * 0.4, 0], 2: [0, -vh * 0.3], 3: [-vw * 0.4, 0] };
  // Ursprung: Sitz des Gebers (= der, der in der Runde davor mit Trumpf/Schieben dran war) oder Tischmitte
  const [ox, oy] = origin == null ? [0, 0] : [to[origin][0] * 0.8, to[origin][1] * 0.8];
  useEffect(() => {
    const anims = [];
    refs.current.forEach((el, b) => {
      if (!el) return;
      const [x, y] = to[(start + b) % 4];
      anims.push(el.animate([
        { transform: "translate(" + ox + "px," + oy + "px) rotate(0deg) scale(1)", opacity: 1 },
        { transform: "translate(" + x + "px," + y + "px) rotate(" + (x > 0 ? 14 : x < 0 ? -14 : 0) + "deg) scale(0.8)", opacity: 1, offset: 0.88 },
        { transform: "translate(" + x + "px," + y + "px) rotate(0deg) scale(0.8)", opacity: 0 },
      ], { duration: DEAL_FLY, delay: b * DEAL_GAP, easing: "cubic-bezier(.3,.7,.3,1)", fill: "both" }));
    });
    return () => anims.forEach((a) => a.cancel());
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: "50%", top: "48%", width: 0, height: 0 }}>
        {/* Kartenstapel beim Geber (oder in der Mitte), wird beim Austeilen kleiner */}
        <div style={{ position: "absolute", left: -w / 2 + ox, top: -w * 0.75 + oy, animation: "jassStapel " + DEAL_MS + "ms linear both" }}>
          <style>{`@keyframes jassStapel { 0% { opacity: 1; transform: scale(1);} 92% { opacity: 1; transform: scale(0.85);} 100% { opacity: 0; transform: scale(0.8);} }`}</style>
          {[3, 2, 1, 0].map((i) => <div key={i} style={{ position: "absolute", left: i * 1.5, top: i * 1.5 }}><CardBack w={w} /></div>)}
        </div>
        {Array.from({ length: DEAL_BATCHES }, (_, b) => (
          <div key={b} ref={(el) => (refs.current[b] = el)} style={{ position: "absolute", left: -w / 2, top: -w * 0.75, opacity: 0, zIndex: 10 + b }}>
            {[2, 1, 0].map((i) => <div key={i} style={{ position: "absolute", left: i * 5, top: i * -3 }}><CardBack w={w} /></div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Wer spielt zusammen? (Karten ziehen) ──────────────────────────────────
// Zu Beginn eines neuen Spiels zieht jeder eine Karte aus dem noch unverteilten Stapel; du tippst
// selbst auf den Stapel, die anderen ziehen automatisch. Die beiden höchsten Karten spielen zusammen.
// Danach zieht ihr beide (du und der Spieler links von dir) nochmals: die tiefere Karte gibt im ersten
// Spiel; das Ass gilt dabei als tiefste Karte und muss geben. Gleiche Werte: nochmals ziehen.
// Karten-«Rang»: 6 = 0 … Ass = 8 (E.rankOf).

// Eine Auswertung der Team-Auslosung. cards: {spieler: karte}; cand: Spieler, die um die Plätze
// ziehen; k: wie viele der obersten Plätze unter ihnen noch zu vergeben sind.
// Ergebnis: { top: [spieler…] } (entschieden) oder { top: [bereits sicher], tie: [spieler…], k: Rest }
function drawTeamStep(cards, cand, k) {
  const rank = (p) => E.rankOf(cards[p]);
  const sorted = cand.slice().sort((a, b) => rank(b) - rank(a));
  if (rank(sorted[k - 1]) > rank(sorted[k])) return { top: sorted.slice(0, k) };
  const edge = rank(sorted[k - 1]);
  const above = sorted.filter((p) => rank(p) > edge);
  const tie = sorted.filter((p) => rank(p) === edge);
  return { top: above, tie, k: k - above.length };
}
// Wer gibt? Zwei Spieler mit je einer Karte. Das Ass zählt als tiefste Karte. null = Gleichstand.
function drawDealerWinner(a, ca, b, cb) {
  const key = (c) => (E.rankOf(c) === 8 ? -1 : E.rankOf(c));
  if (key(ca) === key(cb)) return null;
  return key(ca) < key(cb) ? a : b; // wer die tiefere Karte hat, gibt
}

function DrawScreen({ settings, deck, onDone }) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const nm = (i) => (i === 0 ? ((settings.names && settings.names[0]) || "").trim() || "Du" : ((settings.names && settings.names[i]) || "").trim() || "Mitspieler " + i);
  const [pile] = useState(() => E.shuffle(E.ALL, Math.random));
  const pos = useRef(0);
  const [cards, setCards] = useState({});          // sichtbare Karten je Spieler
  const [pending, setPending] = useState([0, 1, 2, 3]); // wer noch ziehen muss (in dieser Reihenfolge)
  const [stage, setStage] = useState("team");      // team | dealer | fertig
  const [cand, setCand] = useState({ list: [0, 1, 2, 3], k: 2, sure: [] }); // Auslosung der Teams
  const [team, setTeam] = useState(null);          // [a, b] = zwei Spieler, die zusammen spielen
  const [seatPerm, setSeatPerm] = useState(null);  // Sitz → Spieler (0 = du), nach der Team-Auslosung
  const [giver, setGiver] = useState(null);
  const [msg, setMsg] = useState("");
  const take = () => pile[pos.current++];
  const seatOf = (p) => (seatPerm ? seatPerm.indexOf(p) : p); // Anzeige-Platz: 0 unten, 1 rechts, 2 oben, 3 links

  // Ziehen: du per Tipp, die anderen automatisch (kurze Pause)
  const drawFor = (p) => { setCards((c) => ({ ...c, [p]: take() })); setPending((q) => q.slice(1)); };
  useEffect(() => {
    if (!pending.length || pending[0] === 0) return;
    const t = setTimeout(() => drawFor(pending[0]), 650);
    return () => clearTimeout(t);
  }, [pending]);

  // Auswerten, sobald alle gezogen haben
  useEffect(() => {
    if (pending.length) return;
    const t = setTimeout(() => {
      if (stage === "team") {
        const res = drawTeamStep(cards, cand.list, cand.k);
        if (res.tie) {
          const sure = cand.sure.concat(res.top);
          setCand({ list: res.tie, k: res.k, sure });
          setMsg("Gleiche Karten bei " + res.tie.map(nm).join(" und ") + " – nochmals ziehen");
          setPending(res.tie.slice().sort((a, b) => a - b));
        } else {
          const top = cand.sure.concat(res.top);
          const rest = [0, 1, 2, 3].filter((p) => !top.includes(p));
          const mine = top.includes(0) ? top : rest;      // dein Team
          const partner = mine.find((p) => p !== 0);
          const opp = [1, 2, 3].filter((p) => p !== partner);
          if (Math.random() < 0.5) opp.reverse();
          setTeam(mine); setSeatPerm([0, opp[0], partner, opp[1]]);
          setMsg("Zusammen spielen: " + nm(0) + " & " + nm(partner) + " gegen " + nm(opp[0]) + " & " + nm(opp[1]));
          setStage("teamfertig");
        }
      } else if (stage === "dealer") {
        const L = seatPerm[3];
        const w = drawDealerWinner(0, cards[0], L, cards[L]);
        if (w == null) { setMsg("Gleiche Karten – nochmals ziehen"); setPending([0, L]); }
        else { setGiver(w); setMsg(nm(w) + " gibt im ersten Spiel"); setStage("fertig"); }
      }
    }, 900);
    return () => clearTimeout(t);
  }, [pending, stage]);

  const toDealer = () => { setCards({}); setPending([0, seatPerm[3]]); setMsg("Wer gibt? Du ziehst gegen " + nm(seatPerm[3]) + " (links von dir)"); setStage("dealer"); };
  const finish = () => onDone({ seatPerm, nextChooser: giver === 0 ? 1 : 0 }); // Vorhand = rechts vom Geber

  const w = Math.max(56, Math.min(96, Math.floor(vw * 0.2), Math.floor(vh * 0.13)));
  const myTurn = pending.length > 0 && pending[0] === 0;
  const Slot = ({ p }) => {
    const mate = team && team.includes(p);
    return (
      <div style={{ textAlign: "center", minWidth: w + 20 }}>
        <div style={{ height: Math.round(w * 1.5), display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 6 }}>
          {cards[p] != null
            ? <div key={cards[p]} style={{ animation: "jassZieh 0.45s ease-out both" }}><Card id={cards[p]} deck={deck} w={w} /></div>
            : <div style={{ width: w, height: Math.round(w * 1.5), borderRadius: w * 0.1, border: "2px dashed rgba(255,255,255,0.25)" }} />}
        </div>
        <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 14, background: mate ? C.gold : "rgba(0,0,0,0.5)", color: mate ? "#1a1200" : C.text, fontWeight: 700, fontSize: 14 }}>{nm(p)}</div>
        {giver === p && <div style={{ marginTop: 4, fontSize: 13, color: C.gold, fontWeight: 700 }}>gibt</div>}
      </div>
    );
  };
  const at = (seat) => [0, 1, 2, 3].find((p) => seatOf(p) === seat);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: C.felt2, color: C.text, overflow: "hidden", display: "flex", flexDirection: "column", textShadow: "0 1px 3px rgba(0,0,0,0.85)" }}>
      <style>{`@keyframes jassZieh { 0% { transform: translateY(-40px) scale(0.6) rotate(-8deg); opacity: 0; } 100% { transform: none; opacity: 1; } } @keyframes jassPuls { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }`}</style>
      <FeltBackground />
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 0", textAlign: "center", fontSize: 20, fontFamily: CHALK_FONT, color: CHALK }}>Wer spielt zusammen?</div>
      <div style={{ textAlign: "center", fontSize: 14, minHeight: 40, padding: "6px 20px", color: C.gold, fontWeight: 700 }}>
        {msg || (stage === "team" ? "Jeder zieht eine Karte – die zwei höchsten spielen zusammen" : "")}
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr auto 1fr", gridTemplateRows: "auto 1fr auto", alignItems: "center", justifyItems: "center", padding: "0 8px 8px", minHeight: 0 }}>
        <div style={{ gridColumn: "2", gridRow: "1" }}><Slot p={at(2)} /></div>
        <div style={{ gridColumn: "1", gridRow: "2" }}><Slot p={at(3)} /></div>
        <div style={{ gridColumn: "3", gridRow: "2" }}><Slot p={at(1)} /></div>
        {/* Stapel in der Mitte: zum Ziehen antippen */}
        <div onClick={() => myTurn && drawFor(0)} style={{ gridColumn: "2", gridRow: "2", textAlign: "center", cursor: myTurn ? "pointer" : "default" }}>
          <div style={{ position: "relative", width: w + 14, height: Math.round(w * 1.5) + 14, margin: "0 auto", animation: myTurn ? "jassPuls 1.1s ease-in-out infinite" : "none" }}>
            {[3, 2, 1, 0].map((i) => <div key={i} style={{ position: "absolute", left: i * 3, top: i * 3 }}><CardBack w={w} /></div>)}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: myTurn ? C.gold : C.dim, fontWeight: myTurn ? 700 : 400, minHeight: 18 }}>{myTurn ? "Tippe auf den Stapel und ziehe deine Karte" : (pending.length ? "…" : "")}</div>
        </div>
        <div style={{ gridColumn: "2", gridRow: "3" }}><Slot p={at(0)} /></div>
      </div>
      <div style={{ padding: "0 20px calc(env(safe-area-inset-bottom, 0px) + 16px)", display: "flex", justifyContent: "center", minHeight: 56 }}>
        {stage === "teamfertig" && <button onClick={toDealer} style={{ ...btn(true), minWidth: 240 }}>Weiter: Wer gibt?</button>}
        {stage === "fertig" && <button onClick={finish} style={{ ...btn(true), minWidth: 240 }}>Spiel starten</button>}
      </div>
    </div>
  );
}

function useHeight() {
  const [h, setH] = useState(window.innerHeight);
  useEffect(() => { const f = () => setH(window.innerHeight); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return h;
}

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => { const f = () => setW(window.innerWidth); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

// ── Bausteine ──
const btn = (primary) => ({
  background: primary ? C.gold : "rgba(255,255,255,0.08)", color: primary ? "#1a1200" : C.text,
  border: primary ? "none" : "1px solid " + C.line, borderRadius: 12, padding: "12px 16px",
  fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});

function Modal({ title, onClose, children, wide, page, maxW, tight, fill }) {
  if (page) {
    // Ganze Seite auf der alten Schiefertafel (wie der Startbildschirm)
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", background: "#1b2120", color: C.text }}>
        <StartSlate />
        <div style={{ position: "relative", zIndex: 1, maxWidth: maxW || (window.innerWidth >= 700 ? 760 : 560), margin: "0 auto", padding: tight ? "calc(env(safe-area-inset-top, 0px) + 22px) 24px calc(env(safe-area-inset-bottom, 0px) + 20px)" : "calc(env(safe-area-inset-top, 0px) + 34px) 30px calc(env(safe-area-inset-bottom, 0px) + 40px)", boxSizing: "border-box", minHeight: fill ? "100%" : undefined, display: fill ? "flex" : undefined, flexDirection: fill ? "column" : undefined }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: tight ? 8 : 16 }}>
            <div style={{ flex: 1, fontSize: tight ? 24 : 28, fontFamily: CHALK_FONT, color: CHALK, textShadow: "0 0 6px rgba(255,255,255,0.2)" }}>{title}</div>
            {onClose && <button onClick={onClose} style={{ background: "rgba(0,0,0,0.25)", border: "1px solid " + C.line, borderRadius: 20, color: C.text, fontSize: 18, width: 36, height: 36, cursor: "pointer" }}>✕</button>}
          </div>
          {fill ? <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</div> : children}
        </div>
      </div>
    );
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.panel, border: "1px solid " + C.line, borderRadius: 16, width: "100%", maxWidth: wide ? 520 : 420, maxHeight: "85vh", overflowY: "auto", padding: "16px 18px", boxSizing: "border-box", color: C.text }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <div style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>{title}</div>
          {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, fontSize: 22, cursor: "pointer" }}>✕</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

// Auswahl-Knöpfe: immer auf einer Zeile (gleich breit, Text wird nötigenfalls gekürzt)
const SetBigCtx = React.createContext(false); // Settings auf grossem Bildschirm: grössere Knöpfe
function Choice({ value, options, onChange }) {
  const L = useContext(SetBigCtx);
  return (
    <div style={{ display: "flex", gap: L ? (options.length >= 4 ? 5 : 8) : 4, flexWrap: "nowrap" }}>
      {options.map(([v, l]) => (
        <button key={String(v)} onClick={() => onChange(v)}
          style={{ ...btn(value === v), flex: "1 1 0", minWidth: 0, padding: L ? "12px 4px" : "5px 3px", fontSize: L ? (options.length >= 4 ? 14 : 16) : 13, lineHeight: 1.25, borderRadius: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</button>
      ))}
    </div>
  );
}

// ── Backup ──
// Eine JSON-Datei mit allen "jass:"-Einträgen (Einstellungen, Spiel, Statistik,
// Striche) und den eigenen Kartenbildern inkl. Rückseite aus IndexedDB.
// Zum Übertragen auf ein anderes eigenes Gerät (AirDrop, Dateien-App …).
async function exportBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("jass:")) data[k] = localStorage.getItem(k);
  }
  let images = {};
  try { images = await imgAll(); } catch (e) {}
  const backup = { app: "jass", format: 1, created: new Date().toISOString(), localStorage: data, images };
  // Dateiname «Backup Jass_Datum_Zeit» (lokale Zeit); eigene Endung und neutraler Typ, damit das
  // Betriebssystem es nicht als Text-/JSON-Datei öffnet (Inhalt bleibt intern JSON)
  const d = new Date(), z = (n) => String(n).padStart(2, "0");
  const name = "Backup Jass_" + d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "_" + z(d.getHours()) + "-" + z(d.getMinutes()) + ".jass";
  const blob = new Blob([JSON.stringify(backup)], { type: "application/octet-stream" });
  const file = new File([blob], name, { type: "application/octet-stream" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    // nur die Datei teilen (kein title/text): iOS legt sonst bei manchen Zielen zusätzlich eine Textdatei an
    try { await navigator.share({ files: [file] }); return "geteilt"; }
    catch (e) { if (e && e.name === "AbortError") return "abgebrochen"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "gespeichert";
}
async function importBackup(file) {
  const b = JSON.parse(await file.text());
  if (!b || b.app !== "jass" || !b.localStorage) throw new Error("Keine Jass-Backup-Datei.");
  const old = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("jass:")) old.push(k); }
  old.forEach((k) => localStorage.removeItem(k));
  Object.entries(b.localStorage).forEach(([k, v]) => { if (k.startsWith("jass:")) localStorage.setItem(k, v); });
  const imgs = b.images || {};
  await imgWrite((st) => { st.clear(); Object.entries(imgs).forEach(([k, v]) => st.put(v, k)); });
  return Object.keys(imgs).length;
}

function BackupRow() {
  const big0 = useContext(SetBigCtx);
  const [msg, setMsg] = useState(null);
  const inRef = useRef(null);
  const doExport = async () => {
    setMsg("Erstelle Backup…");
    try {
      const r = await exportBackup();
      setMsg(r === "abgebrochen" ? null : r === "geteilt" ? "Backup geteilt." : "Backup-Datei gespeichert (Downloads).");
    } catch (e) { setMsg("Fehler: " + (e.message || e)); }
  };
  const doImport = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    if (!window.confirm("Backup laden? Settings, Spielstand, Statistik, Striche und eigene Kartenbilder auf diesem Gerät werden ersetzt.")) return;
    try {
      const n = await importBackup(f);
      setMsg("Backup geladen (" + n + " Bilder). Die App startet neu…");
      setTimeout(() => location.reload(), 900);
    } catch (e) { setMsg("Fehler: " + (e.message || e)); }
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
        <button onClick={doExport} style={{ ...btn(false), flex: 1, minWidth: 0, padding: big0 ? "12px 6px" : "5px 3px", fontSize: big0 ? 16 : 13, lineHeight: 1.25, borderRadius: 10, whiteSpace: "nowrap" }}>Sichern…</button>
        <button onClick={() => inRef.current.click()} style={{ ...btn(false), flex: 1, minWidth: 0, padding: big0 ? "12px 6px" : "5px 3px", fontSize: big0 ? 16 : 13, lineHeight: 1.25, borderRadius: 10, whiteSpace: "nowrap" }}>Laden…</button>
      </div>
      <input ref={inRef} type="file" onChange={doImport} style={{ display: "none" }} />
      {msg && <div style={{ fontSize: 13, color: C.gold, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

function SettingsModal({ settings, setSettings, onClose, inGame, onImages }) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  const [hint, setHint] = useState({}); // aufgeklappte Hinweise (ⓘ)
  const vw = window.innerWidth;
  const big = vw >= 700;
  const cols = vw >= 1000 ? 3 : 2; // iPad: alles auf einem Bildschirm; iPhone: 2 Spalten, Zeilen mit ≥ 3 Optionen über die ganze Breite
  // eine Einstellung: kleine Beschriftung, Knöpfe auf einer Zeile, Hinweis hinter «ⓘ»
  const row = (key, label, el, hintText, span) => (
    <div key={key} style={{ gridColumn: span === true || (span === "phone" && !big) ? "1 / -1" : undefined, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: big ? 15 : 11, color: C.dim, marginBottom: big ? 8 : 3 }}>
        <span>{label}</span>
        {hintText && <span onClick={() => setHint({ ...hint, [key]: !hint[key] })} style={{ cursor: "pointer", color: hint[key] ? C.gold : C.dim, fontSize: 14, lineHeight: 1, padding: "0 4px" }}>ⓘ</span>}
      </div>
      {el}
      {hintText && hint[key] && <div style={{ fontSize: 12, color: C.dim, marginTop: 5, lineHeight: 1.4 }}>{hintText}</div>}
    </div>
  );
  const names = (settings.shuffleSeats || settings.teamDraw) ? [[0, "Du (unten)"], [1, "Mitspieler 1"], [2, "Mitspieler 2"], [3, "Mitspieler 3"]] : [[0, "Du (unten)"], [2, "Partner (oben)"], [3, "Links"], [1, "Rechts"]];
  const ownImgs = !!settings.showImgs;
  const nowGilt = inGame ? " Gilt ab dem nächsten Spiel." : "";
  return (
    <Modal title="Settings" onClose={onClose} page tight fill={big} maxW={big ? Math.min(vw - 60, 1500) : undefined}>
     <SetBigCtx.Provider value={big}>
      {/* iPad/Mac: Zeilen verteilen sich über die ganze Seitenhöhe; iPhone: kompakt */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + cols + ", minmax(0, 1fr))", gap: (big ? 10 : 6) + "px " + (big ? 36 : 12) + "px", flex: big ? 1 : undefined, gridAutoRows: big ? "1fr" : undefined, alignItems: big ? "center" : undefined, paddingBottom: big ? 8 : 0 }}>
        {row("namen", "Namen der Spieler", (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: big ? 10 : 5 }}>
            {names.map(([i, lab]) => (
              <input key={i} value={(settings.names || DEFAULT_NAMES)[i]} maxLength={14} placeholder={lab} title={lab}
                onChange={(e) => { const n = (settings.names || DEFAULT_NAMES).slice(); n[i] = e.target.value; set("names", n); }}
                style={{ width: "100%", boxSizing: "border-box", padding: big ? "11px 10px" : "5px 6px", borderRadius: 10, border: "1px solid " + C.line, background: "rgba(0,0,0,0.3)", color: C.text, fontSize: big ? 16 : 13, fontFamily: "inherit", WebkitUserSelect: "text", userSelect: "text" }} />
            ))}
          </div>
        ), "Reihenfolge: " + names.map((n) => n[1]).join(", ") + ". Leeres Feld = Standardname.", true)}
        {row("mit", "Mitspieler", <Choice value={!!settings.shuffleSeats} onChange={(v) => set("shuffleSeats", v)} options={[[false, "Fest"], [true, "Zufällig"]]} />,
          "Fest: Partner, links und rechts bleiben wie in den Namen oben. Zufällig: bei jedem neuen Spiel werden die drei Mitspieler neu auf die Plätze gesetzt – du hast nicht immer denselben Partner. Leere Namen behalten den Standardnamen des Platzes.")}
        {row("zieh", "Wer spielt zusammen", <Choice value={!!settings.teamDraw} onChange={(v) => set("teamDraw", v)} options={[[false, "Fest"], [true, "Ziehen"]]} />,
          "Ziehen: Zu Beginn jedes neuen Spiels ziehen alle eine Karte aus dem Stapel (du tippst selbst auf den Stapel); die zwei höchsten spielen zusammen. Danach ziehst du gegen den Spieler links von dir: die tiefere Karte gibt im ersten Spiel, das Ass muss geben. Bei gleichen Karten wird nochmals gezogen. Die Mitspieler heissen dann «Mitspieler 1–3» (Namen oben).")}
        {row("deck", "Karten", <Choice value={settings.deck} onChange={(v) => set("deck", v)} options={[["ch", "CH"], ["fr", "F"]]} />, "Deutschschweizer (Eicheln, Rosen, Schilten, Schellen) oder französische Karten.")}
        {row("ziel", "Zielpunkte", <Choice value={settings.target} onChange={(v) => set("target", v)} options={[[1000, "1000"], [1500, "1500"], [2500, "2500"], [3000, "3000"]]} />, "Wer zuerst die Zielpunkte erreicht, gewinnt." + nowGilt, "phone")}
        {row("mult", "Multiplikator", <Choice value={settings.mult} onChange={(v) => set("mult", v)} options={[["stufe", "1× / 2× / 3×"], ["einfach", "Alles 1×"]]} />,
          (settings.mult === "stufe" ? (settings.deck === "ch" ? "Eicheln/Rosen ×1, Schellen/Schilten ×2, Obenabe/Undenufe ×3." : "Kreuz/Herz ×1, Ecken/Schaufel ×2, Obenabe/Undenufe ×3.") : "Alle Trümpfe zählen einfach.") + nowGilt)}
        {row("level", "Spielstärke", <Choice value={settings.level} onChange={(v) => set("level", v)} options={[["normal", "Normal"], ["stark", "Stark"]]} />,
          "Normal: einfache Faustregeln. Stark: rechnet vor jedem Zug viele mögliche Kartenverteilungen durch (gilt für Partner und Gegner).")}
        {row("tempo", "Tempo", <Choice value={settings.speed} onChange={(v) => set("speed", v)} options={[["langsam", "Langsam"], ["normal", "Normal"], ["schnell", "Schnell"], ["manuell", "Manuell"]]} />,
          "Tempo der Mitspieler. Manuell: jeder Zug der Mitspieler und das Einsammeln des Stichs erst nach Tippen auf den Teppich.", "phone")}
        {row("offen", "Offene Karten", <Choice value={!!settings.openCards} onChange={(v) => set("openCards", v)} options={[[false, "Normal"], [true, "Offen"]]} />,
          "Normal: verdeckt. Offen (Lernmodus): die Karten der Mitspieler liegen offen bei ihrem Platz – nur du siehst sie, die Computer spielen wie gewohnt ohne dieses Wissen.")}
        {row("dim", "Nicht spielbare", <Choice value={settings.dimIllegal !== false} onChange={(v) => set("dimIllegal", v)} options={[[true, "Grau"], [false, "Normal"]]} />,
          "Grau: nicht spielbare Karten ausgrauen; Normal: wie alle anderen zeigen (eine nicht erlaubte Karte lässt sich trotzdem nicht spielen).")}
        {row("deal", "Austeilen", <Choice value={settings.dealMode || "geber"} onChange={(v) => set("dealMode", v)} options={[["geber", "Geber"], ["mitte", "Mitte"], ["aus", "Aus"]]} />,
          "Geber: die Karten fliegen vom Spieler, der in der Runde davor mit Trumpf/Schieben dran war; Mitte: von einem Stapel in der Tischmitte; Aus: sofort verteilt (ohne 5 Sekunden Animation).", "phone")}
        {row("weis", "Weis", <Choice value={!!settings.weisAsk} onChange={(v) => set("weisAsk", v)} options={[[false, "Auto"], [true, "Fragen"]]} />,
          "Auto: alle Weise werden automatisch angesagt. Fragen: die App fragt vor deiner ersten Karte, ob du weisen willst; Partner und Gegner entscheiden im Hintergrund nach der Spielsituation.")}
        {row("sort", "Kartensortierung", <Choice value={settings.sortDir || "lr"} onChange={(v) => set("sortDir", v)} options={[["lr", "Li → Re"], ["rl", "Re → Li"]]} />,
          "Deine Hand: Eicheln, Rosen, Schilten, Schellen, innerhalb der Farbe immer Ass → 6 (auch bei Undenufe). Links→rechts: Trumpf ganz links; Rechts→links: gespiegelt, Trumpf ganz rechts.")}
        {row("thank", "Bedanken", <Choice value={settings.thank || "knopf"} onChange={(v) => set("thank", v)} options={[["knopf", "Knopf"], ["auto", "Auto"], ["aus", "Aus"]]} />,
          "Knopf: du bedankst dich selbst (falsch bedankt = Spiel verloren), die Gegner automatisch. Auto: sobald ein Team die Zielpunkte erreicht, endet das Spiel sofort, ohne Knopf. Aus: kein vorzeitiges Ende, das Ziel zählt erst bei der Abrechnung am Rundenende.", "phone")}
        {row("bock", "Bock-Karten", <Choice value={settings.claimAll !== false} onChange={(v) => set("claimAll", v)} options={[[true, "Mehrere"], [false, "Einzeln"]]} />,
          "Mehrere: hat ein Spieler nur noch unschlagbare Böcke, werfen alle ihre Karten auf einmal hin und der Haufen geht an sein Team. Einzeln: auch dann wird jede Karte einzeln gespielt.")}
        {row("play", "Karte spielen", <Choice value={settings.playMode || (settings.oneTap ? "tap" : "confirm")} onChange={(v) => setSettings({ ...settings, playMode: v, oneTap: v === "tap" })} options={[["confirm", "2× tippen"], ["tap", "1× tippen"], ["swipe", "Wischen"]]} />,
          "2× tippen: antippen und bestätigen. 1× tippen: sofort spielen. Wischen: Karte mit dem Finger nach oben auf den Tisch ziehen.", "phone")}
        {row("backup", "Backup", <BackupRow />, "Eine Datei mit Settings, Spielstand, Statistik, Strichen und deinen eigenen Kartenbildern – z.B. per AirDrop auf ein anderes Gerät übertragen und dort laden. Die Datei enthält deine Scans: nur privat weitergeben.")}
        {/* Eigene Kartenbilder: ein-/ausblendbar */}
        {row("imgs", "Eigene Kartenbilder", ownImgs
          ? <div style={{ display: "flex", gap: 4 }}>
              <button onClick={onImages} style={{ ...btn(false), flex: 2, padding: big ? "12px 6px" : "5px 6px", fontSize: big ? 16 : 13, borderRadius: 10 }}>🃏 Bilder verwalten…</button>
              <button onClick={() => set("showImgs", false)} style={{ ...btn(false), flex: 1, padding: big ? "12px 6px" : "5px 6px", fontSize: big ? 16 : 13, borderRadius: 10 }}>Ausblenden</button>
            </div>
          : <button onClick={() => set("showImgs", true)} style={{ ...btn(false), width: "100%", padding: big ? "12px 6px" : "5px 6px", fontSize: big ? 16 : 13, borderRadius: 10 }}>Einblenden ▾</button>,
          "Fotos/Scans deiner eigenen Karten, Rückseite und Farbsymbole – aus Copyright-Gründen nur auf diesem Gerät gespeichert.")}
      </div>
     </SetBigCtx.Provider>
    </Modal>
  );
}

function RulesModal({ onClose, deck }) {
  const S = SUIT_NAMES[deck];
  const p = (t) => <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.5 }}>{t}</p>;
  const h = (t) => <div style={{ fontWeight: 800, color: C.gold, margin: "14px 0 6px" }}>{t}</div>;
  return (
    <Modal title="Regeln (Schieber)" onClose={onClose} wide page>
      {p("Du spielst mit deinem Partner (oben) gegen die beiden Gegner links und rechts. Gespielt wird mit 36 Karten im Gegenuhrzeigersinn.")}
      {h("Trumpf ansagen")}
      {p("Reihum darf ein Spieler den Trumpf bestimmen: eine Farbe, Obenabe (Ass sticht am höchsten, kein Trumpf) oder Undenufe (Sechser sticht am höchsten). Wer nicht will, kann schieben – dann muss der Partner wählen. Ausgespielt wird immer von dem, der an der Reihe war.")}
      {h("Stichregeln")}
      {p("Die ausgespielte Farbe muss angegeben werden. Stechen (Trumpf spielen) ist jederzeit erlaubt. Den Trumpf-Under (Puur) muss man nie angeben. Untertrumpfen ist verboten, ausser man hat nur noch Trumpf. Nicht erlaubte Karten werden grau dargestellt.")}
      {h("Kartenwerte")}
      {p("Trumpf: Under 20, Nell (9) 14, Ass 11, 10 10, König 4, Ober 3. Übrige Farben: Ass 11, 10 10, König 4, Ober 3, Under 2. Obenabe/Undenufe: zusätzlich Achter 8; bei Undenufe zählt der Sechser 11 statt des Asses. Letzter Stich +5. Total 157 pro Runde, alle Stiche (Match) 257.")}
      {h("Weis und Stöck")}
      {p("Weis werden automatisch erkannt. Im ersten Stich erscheint bei jedem Spieler mit seiner ersten Karte nur die Weishöhe als weisse Zahl (wie am Tisch: nur der höchste Wert wird angesagt); nach dem ersten Stich werden sie gezeigt (die gültigen des Siegerteams mit Farbe und Karte, die unterlegenen Ansagen der anderen nur als ausgegraute Zahl): Dreiblatt 20, Vierblatt 50, Fünfblatt 100, je weiteres Blatt +50; vier Gleiche 100 (alle Kartenwerte von 6 bis Ass, auch bei Obenabe und Undenufe), vier Nell 150, vier Under 200; ein Sechsblatt 150, Siebenblatt 200, Achtblatt 250, Neunblatt 300. Kreuzweise (eine Karte in zwei Weisen) sind gültig. Nur das Team mit dem höchsten Weis schreibt – dafür alle seine Weise. Bei gleichhohen Weisen gilt der Reihe nach: Eine Reihenfolge geht vor vier Gleichen; die höhere Karte des Weis (bei Undenufe die tiefste); bei gleicher höchster Karte die in der Trumpffarbe; sonst, wer zuerst an der Reihe ist (Vorhand). Ein geschriebener Weis bleibt auch bei einem Match der Gegner bestehen. König und Ober im Trumpf (Stöck) geben 20 Punkte.")}
      {h("Multiplikator & Ziel")}
      {p("Bei gestaffelter Zählung zählen " + S[3] + " und " + S[1] + " einfach, " + S[0] + " und " + S[2] + " doppelt, Obenabe und Undenufe dreifach (inkl. Weis und Stöck). Wer zuerst die Zielpunkte erreicht, gewinnt – gezählt wird in der Reihenfolge Stöck, Weis, Stich. Wer das Ziel mitten in der Runde erreicht, kann sich bedanken: für dein Team mit dem Knopf «Bedanken» (gezählt wird, was schon gutgeschrieben ist: Stöck, Weis, eingesammelte Stiche). Stimmt es nicht, gewinnen die Gegner. Die Gegner bedanken sich automatisch. In den Settings lässt sich «Bedanken» auch auf «Automatisch» (für beide Teams, ohne Knopf) oder «Nicht möglich» (nur Abrechnung am Rundenende) stellen. Spätestens am Rundenende wird abgerechnet.")}
      {h("Offene Karten (Lernmodus)")}
      {p("In den Settings lassen sich die Karten der Mitspieler offen anzeigen. Sie liegen klein bei ihrem Platz. Nur du siehst sie – die Computer spielen weiterhin nur mit ihren eigenen Karten. Gut zum Üben und um nachzuvollziehen, warum jemand welche Karte spielt.")}
      {h("Eigene Bilder")}
      {p("Unter Settings → «Eigene Kartenbilder» lassen sich Fotos/Scans deiner eigenen Karten, die Rückseite und die Farbsymbole (vier Farben sowie Pfeile für Obenabe und Undenufe) laden. Sie ersetzen die gezeichneten Bilder überall in der App und bleiben aus Copyright-Gründen nur auf diesem Gerät gespeichert.")}
      {h("Wer spielt zusammen (Ziehen)")}
      {p("Mit der Einstellung «Wer spielt zusammen: Ziehen» ziehen zu Beginn jedes neuen Spiels alle vier Spieler eine Karte aus dem noch unverteilten Stapel; du tippst selbst auf den Stapel, die anderen ziehen von allein. Die beiden höchsten Karten spielen zusammen (haben die mittleren beiden den gleichen Wert, ziehen diese nochmals). Dann ziehst du gegen den Spieler links von dir: Wer die tiefere Karte hat, gibt im ersten Spiel; das Ass gilt dabei als tiefste Karte und muss geben. Die Partner sitzen sich gegenüber, rechts vom Geber beginnt das Ansagen.")}
      {h("Mitspieler neu zuordnen")}
      {p("Mit der Einstellung «Mitspieler» werden bei jedem neuen Spiel die drei anderen Spieler zufällig auf die Plätze Partner, links und rechts verteilt. Wer dein Partner ist, ändert sich also von Spiel zu Spiel; innerhalb eines Spiels bleibt es gleich.")}
      {h("Weisen nachfragen")}
      {p("Stellst du «Weis» auf «Nachfragen», fragt die App vor deiner ersten Karte, ob du wirklich weisen willst. Partner und Gegner entscheiden im Hintergrund: Weise ab 50 Punkten werden immer angesagt, ein Dreiblatt nur, wenn es keine hohen Trümpfe verrät oder ein Team nahe am Ziel ist. Ein nicht angesagter Weis zählt nicht und wird nicht gezeigt.")}
      {h("Alle Böcke auflegen (optional)")}
      {p("Hat ein Spieler, wenn er an der Reihe ist, nur noch unschlagbare Böcke (keiner der anderen drei Spieler hat eine höhere Karte der Farbe, bei Nicht-Trumpf-Karten hat sonst niemand mehr Trumpf, und einen laufenden Stich gewinnt er selbst sicher, sodass er danach ausspielt; ihm gehören also alle restlichen Stiche), kann er alle Karten auf einmal aufs Feld werfen. Die anderen werfen ihre Karten ebenfalls hin, und der ganze Haufen geht an sein Team (inkl. 5 Punkte für den letzten Stich). Das ist optional und lässt sich in den Settings unter «Bock-Karten» ein- oder ausschalten. Bei dir geschieht es automatisch, sobald du in dieser Lage eine Karte spielst.")}
      {h("Zeichen am Tisch")}
      {p("★ beim Namen: hat den Trumpf selbst angesagt. ☆ beim Namen: der Partner hat geschoben, dieser Spieler hat den Trumpf angesagt. Grün umrandet: diesem Spieler gehört der Stich im Moment. Gelb: ist am Zug.")}
      {h("Jasstafel")}
      {p("Vorderseite: pro Team ein Z. Jede Runde wird ergänzt, nie ausradiert: 100er als Striche oben in Fünferbündeln (500 in einer einzigen Runde als «V»), 50er auf der Diagonale (je zwei über Kreuz = 100), 20er unten in Fünferbündeln. Nur die Einer stehen als Zahl und werden angepasst: ab 11 gibt es einen 20er-Strich mehr und Minus-Einer (z.B. 9 und dazu 8 = 20er-Strich und −3). Rückseite (über alle Spiele; bei Spielabbruch werden die Striche dieses Spiels entfernt, einzelne Striche lassen sich löschen): jeder Match 1 Strich, jedes gewonnene Spiel 2 Striche, und wer zuerst den Berg erreicht (60 % der Zielpunkte, bei 2500 also 1500), bekommt 1 Strich. Bei 1000 Punkten wird ohne Berg gespielt.")}
      {h("Spiel-Strategie")}
      {p("Die Computer spielen nach üblichen Faustregeln im Zusammenspiel mit dem Partner: Beim ersten Mal, wenn sie nicht Farbe angeben können, verwerfen sie eine schwache Farbe (diese spielt ihnen der Partner dann nicht an). Danach schmieren sie, wenn der Partner den Stich macht, sonst verwerfen sie wieder. Spielt der Partner einen Bock, geben sie wenn möglich die Karte direkt darunter zu. Bei der Trumpfwahl gilt für alle Computer-Spieler: Aus der Vorhand wählen sie Rosen oder Eicheln (nur einfach zählend) nur, wenn 100 Punkte realistisch sind, sonst schieben sie. In der Stufe «Stark» rechnen sie zusätzlich viele mögliche Kartenverteilungen durch, berücksichtigen gezeigte Weis und spielen gegen Spielende auf die Zielpunkte hin.")}
    </Modal>
  );
}

// ── Jasstafel: Schiefertafel mit Kreide ──
// Vorderseite: pro Team ein «Z». Jede Runde wird wie von Hand angeschrieben:
// 100er als Striche auf der oberen Linie, 50er auf der Diagonale, 20er auf der
// unteren Linie; der Rest unter 20 wird als Zahl nachgeführt (ab 20 → Strich).
// Rückseite: Striche über mehrere Partien (Match 1, Sieg 2, Berg 1).
const CHALK = "rgba(240,240,232,0.92)";
const CHALK_ROT = "rgba(222,78,64,0.92)";
const CHALK_FONT = "'Chalkboard SE', 'Chalkboard', 'Comic Sans MS', 'Segoe Print', cursive";

// Reproduzierbares «Zittern» der Kreide
function jit(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x) - 0.5; }
function ChalkLine({ x1, y1, x2, y2, seed, w, color }) {
  const j = (k) => jit(seed * 7 + k) * 1.6;
  const mx = (x1 + x2) / 2 + j(5), my = (y1 + y2) / 2 + j(6);
  const d = "M" + (x1 + j(1)) + " " + (y1 + j(2)) + " Q" + mx + " " + my + " " + (x2 + j(3)) + " " + (y2 + j(4));
  return (
    <g>
      <path d={d} stroke={color || CHALK} strokeWidth={w || 2.2} fill="none" strokeLinecap="round" filter="url(#kreide)" />
      <path d={d} stroke="rgba(255,255,255,0.25)" strokeWidth={(w || 2.2) * 2} fill="none" strokeLinecap="round" />
    </g>
  );
}
function ChalkText({ x, y, size, children, anchor }) {
  return <text x={x} y={y} fontSize={size} fill={CHALK} fontFamily={CHALK_FONT} textAnchor={anchor || "start"} filter="url(#kreide)">{children}</text>;
}

// n Striche entlang einer Linie (Start sx,sy, Richtung ux,uy), quer dazu
// (Normale nx,ny); je 4 Striche + 1 Querstrich = Fünferbündel.
function Tally({ n, sx, sy, ux, uy, nx, ny, len, step, seed }) {
  const out = [];
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const inBundle = i % 5;
    if (inBundle === 4) {
      // Querstrich über die letzten vier
      const a = pos - 4 * step - step * 0.3, b = pos - step * 0.7;
      out.push(<ChalkLine key={i} seed={seed + i} x1={sx + ux * a - nx * len * 0.55} y1={sy + uy * a - ny * len * 0.55} x2={sx + ux * b + nx * len * 0.55} y2={sy + uy * b + ny * len * 0.55} />);
      pos += step * 0.9;
    } else {
      out.push(<ChalkLine key={i} seed={seed + i} x1={sx + ux * pos - nx * len / 2} y1={sy + uy * pos - ny * len / 2} x2={sx + ux * pos + nx * len / 2} y2={sy + uy * pos + ny * len / 2} />);
      pos += step;
    }
  }
  return <g>{out}</g>;
}

// Anschreiben wie auf der echten Jasstafel: jede Runde wird ergänzt, nichts
// wird ausradiert – ausser den Einern, die jeweils angepasst werden.
// Pro Runde: 100er als Striche (je 500 in derselben Runde als «V»),
// ein 50er auf der Diagonale, 20er unten, der Rest geht in die Einer.
// Einer ab 11 → ein 20er-Strich mehr und Minus-Einer (9 + 8 = 20er und −3).
function tafelStriche(history, team) {
  const hundert = []; // Reihenfolge der Zeichen oben: "I" oder "V"
  let f = 0, z = 0, einer = 0;
  history.forEach((e0) => (e0.parts || [e0.total]).forEach((part) => {
    const p = part[team];
    const hund = Math.floor(p / 100);
    for (let i = 0; i < Math.floor(hund / 5); i++) hundert.push("V");
    for (let i = 0; i < hund % 5; i++) hundert.push("I");
    let r = p % 100;
    if (r >= 50) { f++; r -= 50; }
    z += Math.floor(r / 20);
    einer += r % 20;
    if (einer >= 11) { z++; einer -= 20; }
  }));
  return { hundert, f, z, einer };
}

function SlateDefs() {
  return (
    <defs>
      <filter id="kreide" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
      </filter>
      <filter id="schiefer">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="3" seed="8" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0" />
      </filter>
      <radialGradient id="schieferGrund" cx="45%" cy="40%" r="80%">
        <stop offset="0%" stopColor="#3c4744" />
        <stop offset="100%" stopColor="#232b29" />
      </radialGradient>
    </defs>
  );
}

function Slate({ w, h, children, pad }) {
  return (
    <div style={{ padding: pad != null ? pad : 12, borderRadius: pad != null ? pad * 0.8 : 10, background: "linear-gradient(135deg, #a8743f, #7a4b22 45%, #a8743f 70%, #6b3f1b)", boxShadow: "0 8px 24px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(0,0,0,0.25)" }}>
      <svg viewBox={"0 0 " + w + " " + h} style={{ width: "100%", display: "block", borderRadius: 3, boxShadow: "inset 0 0 12px rgba(0,0,0,0.8)" }}>
        <SlateDefs />
        {/* Foto einer echten Schiefertafel */}
        <rect width={w} height={h} fill="#2a2d33" />
        <image href="schiefer.jpg" x="0" y="0" width={w} height={h} preserveAspectRatio="xMidYMid slice" />
        {children}
      </svg>
    </div>
  );
}

// Zeichen auf der 100er-Linie in Schreibreihenfolge; «I» werden laufend zu
// Fünferbündeln zusammengefasst, «V» steht für sich.
function hundertZeichen(seq, x0, y, team) {
  const out = [];
  let x = x0, nI = 0, vert = []; // vert: x-Positionen der Senkrechten im laufenden Bündel
  seq.slice(0, 60).forEach((c, i) => {
    const seed = team * 1000 + 100 + i * 3;
    if (c === "V") {
      out.push(<g key={i}><ChalkLine x1={x} y1={y - 15} x2={x + 9} y2={y + 13} seed={seed} /><ChalkLine x1={x + 9} y1={y + 13} x2={x + 18} y2={y - 15} seed={seed + 1} /></g>);
      x += 28;
      nI = 0; vert = []; // nach einem V beginnt ein neues Bündel
      return;
    }
    if (nI % 5 === 4) {
      // fünfter Strich schräg über die vier Senkrechten des Bündels
      out.push(<ChalkLine key={i} x1={vert[0] - 4} y1={y + 10} x2={vert[vert.length - 1] + 4} y2={y - 10} seed={seed} />);
      vert = [];
      x += 8;
    } else {
      out.push(<ChalkLine key={i} x1={x} y1={y - 12} x2={x} y2={y + 12} seed={seed} />);
      vert.push(x);
      x += 10.5;
    }
    nI++;
  });
  return out;
}

function TafelVorderseite({ game, pad }) {
  const W = 360, H = 500;
  const half = (team, oy) => {
    const s = tafelStriche(game.history, team);
    const L = 40, R = 300, T = oy + 46, B = oy + 196;
    const dx = L - R, dy = B - T, dl = Math.hypot(dx, dy);
    const ux = dx / dl, uy = dy / dl;
    return (
      <g key={team}>
        {/* Z in roter Kreide, etwas dünner */}
        <ChalkLine x1={L} y1={T} x2={R} y2={T} seed={team * 100 + 1} w={1.6} color={CHALK_ROT} />
        <ChalkLine x1={R} y1={T} x2={L} y2={B} seed={team * 100 + 2} w={1.6} color={CHALK_ROT} />
        <ChalkLine x1={L} y1={B} x2={R} y2={B} seed={team * 100 + 3} w={1.6} color={CHALK_ROT} />
        {/* 100er: Fünferbündel (4 senkrecht + 1 schräg darüber), «V» = 500 in einer Runde */}
        {hundertZeichen(s.hundert, L + 12, T, team)}
        {/* 50er: je zwei Striche über Kreuz (zusammen ein Hunderter) */}
        {Array.from({ length: Math.min(s.f, 24) }, (_, i) => {
          const k = Math.floor(i / 2), d = 34 + k * 21;
          const cx = R + ux * d, cy = T + uy * d + 2;
          const a = Math.atan2(uy, ux) + (i % 2 === 0 ? 1.1 : -1.1), l = 12;
          return <ChalkLine key={"f" + i} x1={cx - Math.cos(a) * l} y1={cy - Math.sin(a) * l} x2={cx + Math.cos(a) * l} y2={cy + Math.sin(a) * l} seed={team * 1000 + 300 + i} />;
        })}
        {/* 20er: Fünferbündel */}
        <Tally n={Math.min(s.z, 30)} sx={L + 14} sy={B} ux={1} uy={0} nx={0} ny={1} len={24} step={10.5} seed={team * 1000 + 500} />
        {/* Einer als Zahl rechts der unteren Linie (angepasst, ggf. negativ) */}
        {s.einer > 0 && <ChalkText x={R + 24} y={B + 7} size={20} anchor="middle">{s.einer}</ChalkText>}
        {/* Minus-Einer: «-4» in derselben Schrift wie die Zahl; das Minuszeichen etwas kräftiger und weisser */}
        {s.einer < 0 && <ChalkText x={R + 24} y={B + 7} size={20} anchor="middle"><tspan fill="#fff" stroke="#fff" strokeWidth="1" fontWeight="700">-</tspan>{-s.einer}</ChalkText>}
        <ChalkText x={W / 2} y={oy + 24} size={20} anchor="middle">{teamName(team)}</ChalkText>
        <ChalkText x={L + 6} y={T + 64} size={15}>{game.scores[team]}</ChalkText>
        {game.berg === team && <ChalkText x={R - 70} y={B - 22} size={13}>Berg ✓</ChalkText>}
      </g>
    );
  };
  return (
    <Slate w={W} h={H} pad={pad}>
      {half(0, 4)}
      <ChalkLine x1={14} y1={250} x2={W - 14} y2={250} seed={77} w={1.6} />
      {half(1, 252)}
      <ChalkText x={W - 12} y={H - 10} size={11} anchor="end">Ziel {game.target}{bergOf(game.target) ? " · Berg " + bergOf(game.target) : " · ohne Berg"}</ChalkText>
    </Slate>
  );
}

function TafelRueckseite({ striche }) {
  const W = 360, H = 400;
  const rows = [["Match", "match", 1], ["Sieg", "sieg", 2], ["Berg", "berg", 1]];
  const total = (t) => rows.reduce((s, [, k, f]) => s + striche[k][t] * f, 0);
  return (
    <Slate w={W} h={H}>
      <ChalkText x={W * 0.25} y={38} size={NAMES[0].length + NAMES[2].length > 14 ? 13 : 17} anchor="middle">{teamName(0)}</ChalkText>
      <ChalkText x={W * 0.75} y={38} size={NAMES[1].length + NAMES[3].length > 14 ? 13 : 17} anchor="middle">{teamName(1)}</ChalkText>
      <ChalkLine x1={W * 0.5} y1={18} x2={W * 0.5} y2={H - 60} seed={11} w={1.8} />
      <ChalkLine x1={14} y1={52} x2={W - 14} y2={52} seed={12} w={1.8} />
      {rows.map(([label, k, f], i) => {
        const y = 100 + i * 80;
        return (
          <g key={k}>
            <ChalkText x={10} y={y - 30} size={12}>{label}{f === 2 ? " (2)" : ""}</ChalkText>
            {[0, 1].map((t) => (
              <Tally key={t} n={Math.min(striche[k][t] * f, 40)} sx={(t === 0 ? 24 : W * 0.5 + 16)} sy={y} ux={1} uy={0} nx={0} ny={1} len={26} step={8} seed={i * 500 + t * 100} />
            ))}
          </g>
        );
      })}
      <ChalkLine x1={14} y1={H - 52} x2={W - 14} y2={H - 52} seed={13} w={1.8} />
      <ChalkText x={W * 0.25} y={H - 20} size={20} anchor="middle">= {total(0)}</ChalkText>
      <ChalkText x={W * 0.75} y={H - 20} size={20} anchor="middle">= {total(1)}</ChalkText>
    </Slate>
  );
}

function TafelModal({ game, deck, striche, onResetStriche, onRemove, onClose }) {
  const [side, setSide] = useState("vorne");
  const [edit, setEdit] = useState(false); // Striche bearbeiten ein-/ausgeblendet
  return (
    <Modal title="Jasstafel" onClose={onClose} wide>
      <div style={{ marginBottom: 10 }}>
        <Choice value={side} onChange={setSide} options={[["vorne", "Punkte"], ["hinten", "Striche"], ["liste", "Runden"]]} />
      </div>
      {side === "vorne" && <TafelVorderseite game={game} />}
      {side === "hinten" && (
        <div>
          <TafelRueckseite striche={striche} />
          <div style={{ fontSize: 12, color: C.dim, margin: "10px 0" }}>
            Über alle Spiele (bei Spielabbruch werden die Striche dieses Spiels entfernt): jeder Match 1 Strich, jedes gewonnene Spiel 2 Striche, Berg 1 Strich ({bergOf(game.target) ? bergOf(game.target) + " Punkte zuerst erreicht" : "bei Ziel " + game.target + " ohne Berg"}).
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <button onClick={() => setEdit(!edit)} style={{ ...btn(false), padding: "6px 12px", fontSize: 13 }}>{edit ? "Bearbeiten ausblenden ▲" : "Striche bearbeiten ▼"}</button>
            <button onClick={() => { if (window.confirm("Rückseite der Tafel abwischen (alle Striche löschen)?")) onResetStriche(); }} style={{ ...btn(false), padding: "6px 12px", fontSize: 13 }}>Tafel abwischen</button>
          </div>
          {edit && <>
          <div style={{ fontSize: 13, color: C.dim, margin: "4px 0 6px" }}>Einzelne Striche löschen:</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 6, alignItems: "center", marginBottom: 12, fontSize: 13 }}>
            <div></div><div style={{ color: C.dim }}>{teamName(0)}</div><div style={{ color: C.dim }}>{teamName(1)}</div>
            {[["Match", "match", 1], ["Sieg", "sieg", 2], ["Berg", "berg", 1]].map(([lab, k, f]) => (
              <React.Fragment key={k}>
                <div>{lab}</div>
                {[0, 1].map((t) => (
                  <button key={t} disabled={!striche[k][t]} onClick={() => onRemove(k, t)}
                    style={{ ...btn(false), padding: "5px 8px", fontSize: 13, opacity: striche[k][t] ? 1 : 0.4 }}>
                    − {f === 2 ? "2 Striche" : "1 Strich"} ({striche[k][t] * f})
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
          </>}
        </div>
      )}
      {side === "liste" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ color: C.dim, textAlign: "right" }}>
              <th style={{ textAlign: "left", padding: 4 }}>#</th><th style={{ textAlign: "left", padding: 4 }}>Trumpf</th><th style={{ padding: 4 }}>Wir</th><th style={{ padding: 4 }}>Gegner</th>
            </tr>
          </thead>
          <tbody>
            {game.history.map((h) => (
              <tr key={h.no} style={{ borderTop: "1px solid " + C.line, textAlign: "right" }}>
                <td style={{ textAlign: "left", padding: 4, color: C.dim }}>{h.no}</td>
                <td style={{ textAlign: "left", padding: 4 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ModeIcon t={h.trump} deck={deck} size={16} />{modeName(h.trump, deck)}</span>
                  <span style={{ color: C.dim, fontSize: 12 }}> · {h.live ? "Weis geschrieben (laufende Runde)" : NAMES[h.decider] + (h.pushed ? " (geschoben)" : "")}</span>
                </td>
                <td style={{ padding: 4 }}>{h.total[0]}{h.parts && h.parts[0][0] > 0 ? " (" + h.parts[0][0] + ")" : ""}{h.match === 0 ? " M" : ""}</td>
                <td style={{ padding: 4 }}>{h.total[1]}{h.parts && h.parts[0][1] > 0 ? " (" + h.parts[0][1] + ")" : ""}{h.match === 1 ? " M" : ""}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid " + C.gold, fontWeight: 800, textAlign: "right" }}>
              <td colSpan={2} style={{ textAlign: "left", padding: 4 }}>Total (Ziel {game.target})</td>
              <td style={{ padding: 4 }}>{game.scores[0]}</td><td style={{ padding: 4 }}>{game.scores[1]}</td>
            </tr>
          </tbody>
        </table>
      )}
    </Modal>
  );
}

function LastTrickModal({ lt, deck, trump, onClose }) {
  return (
    <Modal title="Letzter Stich" onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {lt.cards.map((e) => (
          <div key={e.c} style={{ textAlign: "center" }}>
            <Card id={e.c} deck={deck} w={62} trump={E.isTrump(e.c, trump)} />
            <div style={{ fontSize: 12, marginTop: 4, color: e.p === lt.winner ? C.gold : C.dim, fontWeight: e.p === lt.winner ? 800 : 400 }}>{NAMES[e.p]}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>{NAMES[lt.winner]} sticht · {lt.pts} Punkte</div>
    </Modal>
  );
}

function InfoModal({ stats, onClose }) {
  return (
    <Modal title="Info" onClose={onClose} page>
      <div style={{ fontSize: 14, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, color: C.gold, marginBottom: 6 }}>Statistik</div>
        <div>Spiele: {stats.played} · gewonnen: {stats.won}{stats.played ? " (" + Math.round((100 * stats.won) / stats.played) + "%)" : ""}</div>
        <div>Runden: {stats.rounds} · Matches: {stats.matches}</div>
      </div>
      <div style={{ fontWeight: 800, color: C.gold, marginBottom: 6 }}>Änderungen</div>
      {CHANGELOG.map((e) => (
        <div key={e.version} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>v{e.version}</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13, color: C.dim }}>
            {e.changes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      ))}
    </Modal>
  );
}

function WeisAskModal({ ws, deck, onAnswer }) {
  const pts = ws.reduce((s, w) => s + w.pts, 0);
  return (
    <Modal title="Weisen?" wide>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>Du hast {ws.length > 1 ? "folgende Weise" : "einen Weis"}:</div>
      {ws.map((w, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid " + C.line, fontSize: 15 }}>
          <span>{describeWeis(w, deck)}</span><b style={{ color: C.gold }}>{w.pts}</b>
        </div>
      ))}
      <div style={{ fontSize: 13, color: C.dim, margin: "10px 0 14px", lineHeight: 1.5 }}>
        Zusammen {pts} Punkte. Es schreibt nur das Team mit dem höchsten Weis; die Karten werden nach dem ersten Stich allen gezeigt.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onAnswer(true)} style={{ ...btn(true), flex: 1 }}>Weisen</button>
        <button onClick={() => onAnswer(false)} style={{ ...btn(false), flex: 1 }}>Nicht weisen</button>
      </div>
    </Modal>
  );
}

function ClaimReportModal({ rep, deck, onClose }) {
  const t = rep.trump;
  const cards = (arr, w) => (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "4px 0" }}>
      {arr.map((x, i) => <div key={i} style={{ textAlign: "center" }}><Card id={x.c} deck={deck} w={w || 34} trump={E.isTrump(x.c, t)} />{x.q != null && <div style={{ fontSize: 10, color: C.dim }}>{NAMES[x.q]}</div>}</div>)}
    </div>
  );
  const head = (txt) => <div style={{ fontWeight: 800, color: C.gold, margin: "14px 0 4px", fontSize: 14 }}>{txt}</div>;
  const txt = (v) => <div style={{ fontSize: 13, lineHeight: 1.5, color: C.text }}>{v}</div>;
  const ok = (b) => <b style={{ color: b ? "#4ade80" : "#f87171" }}>{b ? "✓" : "✗"}</b>;
  const who = NAMES[rep.p];
  return (
    <Modal title="Bock-Protokoll" onClose={onClose} wide>
      {txt(<>{who} hat {rep.trickNo === 0 ? "vor dem ersten Stich" : "nach " + rep.trickNo + " Stichen"} alle restlichen Karten aufgelegt ({rep.remaining} Stiche offen).</>)}
      {head("1. Seine Karten – alles Böcke?")}
      {txt("Eine Karte ist ein Bock, wenn keine Karte eines anderen Spielers (auch nicht des Partners) sie schlagen kann – nur dann gehören ihm alle restlichen Stiche selbst.")}
      {rep.cardChecks.map((x, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "6px 0", padding: "6px 0", borderTop: "1px solid " + C.line }}>
          <Card id={x.c} deck={deck} w={34} trump={E.isTrump(x.c, t)} />
          <div style={{ fontSize: 12, lineHeight: 1.45 }}>
            {ok(x.ok)} {x.kind === "Trumpf" ? "Trumpfkarte" : "Karte"}:{" "}
            {x.higher.length === 0
              ? (x.kind === "Trumpf" ? "kein anderer Spieler hat einen höheren Trumpf." : "kein anderer Spieler hat eine höhere Karte dieser Farbe" + (t < 4 ? ", und " + (rep.oppTrumpN ? "jemand hat noch Trumpf und könnte stechen." : "niemand hat noch Trumpf (keiner kann stechen).") : "."))
              : "höher beim Gegner:"}
            {x.higher.length > 0 && cards(x.higher.map((o) => ({ c: o.c, q: o.q })), 26)}
            {x.higher.length === 0 && x.kind === "Farbe" && x.stechen && <> <b style={{ color: "#f87171" }}>Trumpf bei anderen vorhanden → nicht sicher.</b></>}
          </div>
        </div>
      ))}
      {rep.trickInfo && <>
        {head("2. Der laufende Stich")}
        {cards(rep.trickInfo.cards.map((e) => ({ c: e.c, q: e.p })))}
        {txt(<>{ok(rep.trickInfo.teamWins && !rep.trickInfo.beaters.length)} Mit seiner besten Karte gewinnt {NAMES[rep.trickInfo.winner]} den Stich{rep.trickInfo.teamWins ? " – er selbst, also spielt er danach aus und führt alle weiteren Stiche an" : " – nicht er selbst, also würde ein anderer ausspielen (nicht sicher!)"}
          {rep.trickInfo.beaters.length ? "; übertreffen könnten:" : rep.trickInfo.teamWins ? "; kein Spieler, der noch spielt, kann ihn übertreffen." : "."}</>)}
        {rep.trickInfo.beaters.length > 0 && cards(rep.trickInfo.beaters.map((o) => ({ c: o.c, q: o.q })), 26)}
      </>}
      {head((rep.trickInfo ? "3" : "2") + ". Der Haufen")}
      {txt(<>Alle Karten aller Spieler ({rep.pile.length}) gehen an {teamAn(rep.team)}. Kartenpunkte {rep.pilePts} + 5 für den letzten Stich = <b>{rep.claimPts}</b>; {rep.claimTeamTricks} Stiche für das Team.{rep.match ? " → Match (alle 9 Stiche)!" : ""}</>)}
      {head((rep.trickInfo ? "4" : "3") + ". Gegenprobe: einzeln durchgespielt")}
      {txt("Die restlichen Stiche wurden zusätzlich regelkonform einzeln gespielt (er legt seine stärksten Karten zuerst, die anderen geben nach den Regeln zu):")}
      {rep.simTricks.map((tr, k) => {
        const w = tr[E.trickWinnerIdx(tr, t)].p;
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 0", fontSize: 12 }}>
            <div style={{ width: 54, color: C.dim }}>Stich {rep.trickNo + k + 1}</div>
            <div style={{ display: "flex", gap: 2 }}>{tr.map((e, i) => <Card key={i} id={e.c} deck={deck} w={24} trump={E.isTrump(e.c, t)} />)}</div>
            <div style={{ color: E.team(w) === rep.team ? "#4ade80" : "#f87171" }}>→ {NAMES[w]}</div>
          </div>
        );
      })}
      {txt(<>Ergebnis einzeln: {rep.simTeam[rep.team]} von {rep.remaining} Stichen, {rep.simPts[rep.team]} Punkte für {teamAn(rep.team)}. Auflegen: {rep.claimTeamTricks} Stiche, {rep.claimPts} Punkte. {ok(rep.simTeam[rep.team] === rep.remaining && rep.simPts[rep.team] === rep.claimPts)} {rep.simTeam[rep.team] === rep.remaining && rep.simPts[rep.team] === rep.claimPts ? "Gleich – das Auflegen war korrekt." : "ABWEICHUNG – bitte melden!"}</>)}
      <div style={{ marginTop: 14, padding: "8px 10px", borderRadius: 10, background: rep.allOk && rep.simTeam[rep.team] === rep.remaining ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.18)", fontWeight: 700, fontSize: 14 }}>
        {rep.allOk && rep.simTeam[rep.team] === rep.remaining ? "✓ Alles in Ordnung: alle Karten waren sichere Böcke." : "✗ Unstimmigkeit: das Auflegen war nicht berechtigt – bitte melden."}
      </div>
    </Modal>
  );
}

function RoundEndModal({ game, deck, onNext, onTafel, onClose, onClaim }) {
  const r = game.round, res = r.result;
  const row = (label, a, b, bold) => (
    <tr style={{ borderTop: "1px solid " + C.line, fontWeight: bold ? 800 : 400 }}>
      <td style={{ padding: "5px 4px" }}>{label}</td>
      <td style={{ padding: "5px 4px", textAlign: "right" }}>{a}</td>
      <td style={{ padding: "5px 4px", textAlign: "right" }}>{b}</td>
    </tr>
  );
  const weisList = r.weis && r.weis.winnerTeam != null
    ? [0, 1, 2, 3].filter((p) => E.team(p) === r.weis.winnerTeam).flatMap((p) => r.weis.byPlayer[p].map((w) => NAMES[p] + ": " + describeWeis(w, deck) + " (" + w.pts + ")"))
    : [];
  const over = game.over;
  return (
    <Modal title={over ? (over.winner === 0 ? "🏆 Gewonnen!" : "Verloren") : "Runde " + r.no} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 14 }}>
        <ModeIcon t={r.trump} deck={deck} size={20} /> {modeName(r.trump, deck)} · {NAMES[r.decider]}{r.pushed ? " (geschoben)" : ""} · ×{res.mult}
      </div>
      {r.bedankt != null && (r.falsch
        ? <div style={{ color: C.red, fontWeight: 800, marginBottom: 8 }}>Falsch bedankt {r.bedankt ? "nach Stich " + r.bedankt : "vor dem ersten Stich"}: Wir hatten erst {game.scores[0]} von {game.target} Punkten – das Spiel geht an die Gegner.</div>
        : <div style={{ color: C.gold, fontWeight: 800, marginBottom: 8 }}>{r.bedanktVon === 0 ? "Wir bedanken uns" : "Die Gegner bedanken sich"} – Zielpunkte {r.bedankt ? "nach Stich " + r.bedankt : "vor dem ersten Stich"} erreicht.</div>)}
      {res.match != null && <div style={{ color: C.gold, fontWeight: 800, marginBottom: 8 }}>Match für {res.match === 0 ? "uns" : "die Gegner"}!</div>}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead><tr style={{ color: C.dim }}><th></th><th style={{ textAlign: "right", padding: 4 }}>Wir</th><th style={{ textAlign: "right", padding: 4 }}>Gegner</th></tr></thead>
        <tbody>
          {row("Stiche (" + r.tricks[0] + ":" + r.tricks[1] + ")", res.trick[0], res.trick[1])}
          {row("Weis", res.weis[0], res.weis[1])}
          {row("Stöck", res.stoeck[0], res.stoeck[1])}
          {row("Runde ×" + res.mult, res.total[0] + (res.weis[0] > 0 ? " (" + res.weis[0] * res.mult + ")" : ""), res.total[1] + (res.weis[1] > 0 ? " (" + res.weis[1] * res.mult + ")" : ""), true)}
          {row("Gesamt", game.scores[0], game.scores[1], true)}
        </tbody>
      </table>
      {weisList.length > 0 && <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>{weisList.join(" · ")}</div>}
      {r.claimReport && (
        <button onClick={onClaim} style={{ ...btn(false), width: "100%", marginTop: 10, padding: "9px", fontSize: 14 }}>
          ⚖ Bock-Protokoll: {NAMES[r.claimReport.p]} hat alle Böcke aufgelegt – warum das stimmt
        </button>
      )}
      {/* Miniatur der Jasstafel, öffnet die grosse Tafel */}
      <div onClick={onTafel} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, cursor: "pointer" }}>
        <div style={{ width: 92, flexShrink: 0 }}><TafelVorderseite game={game} pad={5} /></div>
        <div style={{ fontSize: 13, color: C.dim }}>Jasstafel ansehen ›</div>
      </div>
      <button onClick={onNext} style={{ ...btn(true), width: "100%", marginTop: 16 }}>{over ? "Neues Spiel" : "Nächste Runde"}</button>
    </Modal>
  );
}

function Menu({ onClose, items }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 52px)", left: 10, background: C.panel, border: "1px solid " + C.line, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: 200 }}>
        {items.filter(Boolean).map(([label, fn]) => (
          <div key={label} onClick={() => { onClose(); fn(); }} style={{ padding: "12px 16px", borderBottom: "1px solid " + C.line, cursor: "pointer", fontSize: 15 }}>{label}</div>
        ))}
      </div>
    </div>
  );
}

// ── Hauptkomponente ──
function JassApp() {
  const [settings, setSettingsRaw] = useState(() => ({ ...DEFAULT_SETTINGS, ...load("settings", {}) }));
  const [game, setGame] = useState(() => load("game", null));
  const [home, setHome] = useState(true);
  const [stats, setStats] = useState(() => ({ played: 0, won: 0, rounds: 0, matches: 0, ...load("stats", {}) }));
  const [modal, setModal] = useState(null);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [endHidden, setEndHidden] = useState(false); // Rundenabrechnung zugeklappt
  const [drag, setDrag] = useState(null); // Wischen: { c, x0, y0, dx, dy, moved }
  const [party, setParty] = useState(null); // Feier: { text, key }
  const [replay, setReplay] = useState(false); // Replay der letzten Runde offen
  const [claimAnim, setClaimAnim] = useState(null); // Böcke-Auflegen-Animation läuft
  const [weisAsk, setWeisAsk] = useState(null); // Rückfrage «wirklich weisen?»: { c } = Karte, die danach gespielt wird
  // Austeilen: step = Anzahl bereits angekommener Päckchen (0..12), perm = Reihenfolge, in der
  // die eigenen Karten in der Hand erscheinen
  const [deal, setDeal] = useState(null);
  // Geber = der Spieler vor dem ersten Ansager (also der, der in der Runde davor mit Trumpf/Schieben
  // dran war); ausgeteilt wird reihum ab dem ersten Ansager. Einstellung «Austeilen».
  const beginDeal = (ng) => {
    const mode = settings.dealMode || "geber";
    if (mode === "aus") return;
    const no = ng.round.no, first = ng.round.chooser;
    const key = Date.now();
    const perm = [...Array(9).keys()].sort((a, b) => Math.sin((a + 1) * (no + 3) * 12.9898) - Math.sin((b + 1) * (no + 3) * 12.9898));
    setDeal({ key, step: 0, perm, start: first, origin: mode === "geber" ? (first + 3) % 4 : null });
    for (let b = 1; b <= DEAL_BATCHES; b++) setTimeout(() => setDeal((d) => (d && d.key === key ? { ...d, step: b } : d)), (b - 1) * DEAL_GAP + DEAL_FLY);
    setTimeout(() => setDeal((d) => (d && d.key === key ? null : d)), DEAL_MS + 60);
  };
  // Karten, die Sitz q nach d.step Päckchen schon hat (Päckchen b geht an Sitz (start + b) % 4)
  const dealtTo = (q) => (deal ? 3 * Array.from({ length: deal.step }, (_, b) => b).filter((b) => (deal.start + b) % 4 === q).length : 9);
  // Stich einziehen: Karten gleiten in 0,5 s zum Gewinner, danach wird eingesammelt
  const [sweep, setSweep] = useState(null); // { winner }
  const sweepBusy = useRef(false);
  const sweepCollect = (g) => {
    if (sweepBusy.current) return;
    sweepBusy.current = true;
    const tr = g.round.trick;
    setSweep({ winner: tr[E.trickWinnerIdx(tr, g.round.trump)].p });
    setTimeout(() => {
      sweepBusy.current = false; setSweep(null);
      if (gameRef.current === g) collect(g); // nur, wenn inzwischen nichts anderes geschah (z.B. Bedanken)
    }, 500);
  };
  const gameRef = useRef(game);
  gameRef.current = game;
  const partyTimer = useRef(null);
  const celebrate = (text, sad) => {
    clearTimeout(partyTimer.current);
    setParty({ text, sad: !!sad, key: Date.now() });
    partyTimer.current = setTimeout(() => setParty(null), 4600);
  };
  const toastTimer = useRef(null);
  const [imgs, setImgs] = useState({});
  const reloadImgs = () => imgAll().then(setImgs).catch((e) => console.error("Kartenbilder:", e));
  useEffect(() => { reloadImgs(); }, []);
  const vw = useWidth();
  const vh = useHeight();
  const deck = settings.deck;
  THANK = settings.thank || "knopf";
  WEISASK = !!settings.weisAsk;
  // Sitz → Name: über seatPerm (Zuordnung dieses Spiels) aus der Namensliste; leerer Name = Standardname des Sitzes
  const seatPerm = (game && game.seatPerm) || [0, 1, 2, 3];
  NAMES = [0, 1, 2, 3].map((i) => ((settings.names && settings.names[seatPerm[i]]) || "").trim() || DEFAULT_NAMES[i]);
  const sp = SPEEDS[settings.speed] || SPEEDS.normal;

  const setSettings = (s) => { setSettingsRaw(s); save("settings", s); };
  const imgCtx = { on: settings.customImgs, index: settings.imgIndex, map: imgs };
  const wrap = (el) => <CardImgCtx.Provider value={imgCtx}>{el}</CardImgCtx.Provider>;
  const imgModal = modal === "images" && <CardImagesModal deck={deck} imgs={imgs} reload={reloadImgs} settings={settings} setSettings={setSettings} onClose={() => setModal("settings")} />;
  useEffect(() => { save("game", game); }, [game]);
  useEffect(() => { save("stats", stats); }, [stats]);
  const [striche, setStriche] = useState(() => ({ match: [0, 0], sieg: [0, 0], berg: [0, 0], ...load("striche", {}) }));
  useEffect(() => { save("striche", striche); }, [striche]);

  const say = (msg, ms) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), ms || 2200);
  };

  // Zustandsübergänge mit Ansagen
  const choose = (g, t) => {
    const r = g.round;
    say(NAMES[r.decider] + verb(r.decider, " wählst ", " wählt ") + modeName(t, deck));
    setGame(doChoose(g, t));
  };
  const push = (g) => {
    say(NAMES[g.round.chooser] + verb(g.round.chooser, " schiebst", " schiebt"));
    setGame(doPush(g));
  };
  const play = (g, p, c) => {
    // Nur noch Böcke beim Ausspielen: alle auf einmal auflegen
    if (g.round.phase === "play" && claimOn && canClaim(g.round, p)) {
      say(NAMES[p] + verb(p, " legst alle Böcke auf", " legt alle Böcke auf") + " – alle werfen ihre Karten, der ganze Haufen geht an " + teamAn(E.team(p)) + ".", 3500);
      const ng = doClaim(g, p);
      setSelected(null);
      setGame(ng);
      // Filmszene, Abrechnung (und ggf. Feier) erst danach
      setClaimAnim({ pile: ng.round.pile.cards, nTrick: ng.round.pile.nTrick, p, key: Date.now() });
      setTimeout(() => { setClaimAnim(null); record(g, ng); }, 2900); // Abrechnung spätestens nach 3 s
      return;
    }
    const ng = doPlay(g, p, c);
    if (ng.round.stoeckDone && !g.round.stoeckDone) say(NAMES[p] + ": Stöck! (+20)");
    setSelected(null);
    setGame(ng);
  };
  const collect = (g) => {
    const ng = doCollect(g);
    const r = g.round;
    if (r.trickNo === 0 && r.weis && r.weis.winnerTeam != null) {
      const wt = r.weis.winnerTeam;
      const parts = [0, 1, 2, 3].filter((p) => E.team(p) === wt && r.weis.byPlayer[p].length)
        .map((p) => NAMES[p] + ": " + r.weis.byPlayer[p].map((w) => describeWeis(w, deck)).join(", "));
      say((wt === 0 ? "Unser Weis" : "Weis der Gegner") + " +" + r.weis.pts[wt] + " — " + parts.join(" · "), 3500);
    }
    record(g, ng);
    setGame(ng);
  };
  // Statistik und Striche (Rückseite der Jasstafel) bei Rundenende nachführen
  const record = (g, ng) => {
    if (ng.round.phase !== "roundEnd" || g.round.phase === "roundEnd") return;
    const res = ng.round.result;
    // Feier für dein Team: Sieg vor Match
    if (ng.over && ng.over.winner === 0) celebrate("GEWONNEN!");
    else if (ng.over && ng.over.winner === 1) celebrate("verloren …", true);
    else if (res.match === 0) celebrate("MATCH!");
    else if (res.match === 1) celebrate("Match der Gegner …", true);
    setStats((s) => ({
      ...s, rounds: s.rounds + 1, matches: s.matches + (res.match === 0 ? 1 : 0),
      played: s.played + (ng.over ? 1 : 0), won: s.won + (ng.over && ng.over.winner === 0 ? 1 : 0),
    }));
    setStriche((st) => {
      const n = { match: st.match.slice(), sieg: st.sieg.slice(), berg: st.berg.slice() };
      if (res.match != null) n.match[res.match]++;
      if (ng.over) n.sieg[ng.over.winner]++;
      if (ng.berg != null && g.berg == null) n.berg[ng.berg]++;
      return n;
    });
  };
  const bedanken = () => {
    const ng = doBedanken(game);
    if (ng === game) return;
    record(game, ng);
    setSelected(null);
    setGame(ng);
  };

  // Computer-Spieler und Einsammeln: nächster Schritt (null = nichts zu tun)
  const botStep = (g) => {
    const r = g.round;
    if (r.phase === "choose" && r.decider !== 0) return () => {
      const strong = settings.level !== "normal";
      const d = strong ? E.botChooseTrumpSmart(r.hands[r.decider], !r.pushed, r.decider, g.mult, { scores: g.scores, target: g.target }) : E.botChooseTrump(r.hands[r.decider], !r.pushed, g.mult);
      if (d === "push") push(g); else choose(g, d);
    };
    if (r.phase === "play" && r.turn !== 0) return () => {
      const m = E.multiplier(r.trump, g.mult);
      const st = [0, 0]; if (r.stoeck != null && r.stoeckDone) st[E.team(r.stoeck)] = 20;
      const wp = r.trickNo >= 1 && r.weis ? r.weis.pts : [0, 0];
      const endgame = { run: [0, 1].map((i) => g.scores[i] + (st[i] + wp[i] + r.trickPts[i]) * m), mult: m, target: g.target };
      const ctx = { hand: r.hands[r.turn], trick: r.trick, t: r.trump, played: r.played, p: r.turn, declarer: r.chooser, tricks: r.tricksLog, tricksWon: r.tricks, weis: r.weis, endgame };
      // Ältere Spielstände ohne Stichverlauf: Heuristik verwenden
      const c = settings.level !== "normal" && r.tricksLog && r.tricksLog.length === r.trickNo ? E.botPlaySmart(ctx) : E.botPlay(ctx);
      play(g, r.turn, c);
    };
    if (r.phase === "trickDone") return () => sweepCollect(g);
    return null;
  };
  const manual = settings.speed === "manuell";
  const claimOn = settings.claimAll !== false; // Einstellung «Bock-Karten spielen»
  // Automatisch mit Verzögerung; im Modus «Manuell» erst beim Tippen auf den Teppich
  useEffect(() => {
    if (!game || !game.round || home || manual || replay || deal) return; // während Replay und Austeilen pausiert das Spiel
    const step = botStep(game);
    if (!step) return;
    const r = game.round;
    // Pause nach der letzten Karte des Stichs bis zum Einziehen: halbe Stich-Zeit
    const delay = r.phase === "trickDone" ? sp.trick / 2 : r.phase === "choose" ? sp.bot * 1.4 : sp.bot;
    const timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
  }, [game, home, manual, replay, deal]);

  const [draw, setDraw] = useState(false); // «Wer spielt zusammen»: Ziehen läuft
  const startNew = (pre0) => {
    const pre = pre0 && pre0.seatPerm ? pre0 : null; // (als onClick-Handler kommt ein Ereignis an)
    setSelected(null); setModal(null); setEndHidden(false); setHome(false);
    if (settings.teamDraw && !pre) { setDraw(true); return; }   // erst Karten ziehen
    setDraw(false);
    const ng = newGame(settings, pre); setGame(ng); beginDeal(ng);
    if (settings.shuffleSeats || pre) {
      // neue Mitspieler ansagen
      const nm = (i) => ((settings.names && settings.names[ng.seatPerm[i]]) || "").trim() || DEFAULT_NAMES[i];
      say("Neue Runde am Tisch – Partner: " + nm(2) + " · links: " + nm(3) + " · rechts: " + nm(1), 4500);
    }
  };
  const goNextRound = () => { setEndHidden(false); if (game.over) startNew(); else { const ng = nextRound(game); setGame(ng); beginDeal(ng); } };
  const askNew = () => {
    if (game && !game.over && (game.history.length || (game.round && game.round.trickNo > 0))) {
      if (!window.confirm("Laufendes Spiel abbrechen und neu beginnen? Die Striche dieses Spiels werden entfernt.")) return;
      setStats((s) => ({ ...s, played: s.played + 1 }));
      // Spielabbruch: Striche dieses Spiels entfernen, frühere bleiben
      const pd = game.pend;
      if (pd) setStriche((st) => ({
        ...st,
        match: [0, 1].map((t) => Math.max(0, st.match[t] - pd.match[t])),
        berg: [0, 1].map((t) => Math.max(0, st.berg[t] - pd.berg[t])),
      }));
    }
    startNew();
  };

  // ── Wer spielt zusammen? ──
  if (draw) return wrap(<DrawScreen key="draw" settings={settings} deck={deck} onDone={(pre) => startNew(pre)} />);

  // ── Startbildschirm ──
  if (!game || home) {
    const canResume = game && !game.over;
    return wrap(
      <div style={{ minHeight: "100%", background: "#1b2120", color: C.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box", gap: 14, position: "relative" }}>
        <StartSlate />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          {[3, 1, 2, 0].map((s, i) => (
            <div key={s} style={{ transform: "rotate(" + (i - 1.5) * 8 + "deg)" }}><Card id={s * 9 + 8} deck={deck} w={58} /></div>
          ))}
        </div>
        <div style={{ fontSize: 40, letterSpacing: 1, fontFamily: CHALK_FONT, color: CHALK, textShadow: "0 0 6px rgba(255,255,255,0.25)" }}>Bea’s Jass</div>
        <div style={{ color: "rgba(240,240,232,0.7)", fontSize: 15, marginTop: -10, fontFamily: CHALK_FONT }}>Schieber gegen den Computer</div>
        {canResume && <button onClick={() => setHome(false)} style={{ ...btn(true), width: 240, marginTop: 10 }}>Weiterspielen ({game.scores[0]} : {game.scores[1]})</button>}
        <button onClick={canResume ? askNew : startNew} style={{ ...btn(!canResume), width: 240, marginTop: canResume ? 0 : 10 }}>Neues Spiel</button>
        <button onClick={() => setModal("settings")} style={{ ...btn(false), width: 240 }}>Settings</button>
        <button onClick={() => setModal("rules")} style={{ ...btn(false), width: 240 }}>Regeln</button>
        <button onClick={() => setModal("info")} style={{ ...btn(false), width: 240 }}>Info & Statistik</button>
        <div style={{ color: "rgba(240,240,232,0.55)", fontSize: 12, marginTop: 10, fontFamily: CHALK_FONT }}>v{APP_VERSION}</div>
        </div>
        {modal === "settings" && <SettingsModal settings={settings} setSettings={setSettings} onImages={() => setModal("images")} onClose={() => setModal(null)} />}
        {modal === "rules" && <RulesModal deck={deck} onClose={() => setModal(null)} />}
        {modal === "info" && <InfoModal stats={stats} onClose={() => setModal(null)} />}
        {imgModal}
      </div>
    );
  }

  const r = game.round;
  const myTurn = r.phase === "play" && r.turn === 0;
  const legal = myTurn ? E.legalCards(r.hands[0], r.trick, r.trump) : [];
  // eigene Hand: beim Austeilen erscheinen die Karten nach und nach
  const handLR = deal ? r.hands[0].filter((c, i) => deal.perm.indexOf(i) < dealtTo(0)) : r.hands[0];
  const hand = settings.sortDir === "rl" ? handLR.slice().reverse() : handLR; // Einstellung «Kartensortierung»

  // Masse
  // Grosse Bildschirme (iPad): volle Breite bis 1200 px, Karten bis 150 px breit,
  // im Querformat durch die Höhe begrenzt; Beschriftungen wachsen mit (uiK).
  const big = vw >= 700;
  const MAXW = big ? Math.min(vw, 1200) : 560;
  const W = Math.min(vw, MAXW);
  const cw = Math.max(44, Math.min(big ? 150 : 78, Math.floor((W - 16) / 5.4), big ? Math.floor(vh * 0.14) : 999));
  const uiK = big ? Math.min(1.5, cw / 78) : 1;
  const step = hand.length > 1 ? Math.min(cw + 4, (W - 16 - cw) / (hand.length - 1)) : 0;
  const handW = cw + step * Math.max(0, hand.length - 1);
  // Trumpfwahl: Breite eines der 7 Knöpfe (Zeile max. 560/760 px, 10 px Rand, 6 px Abstand)
  const chooseIcon = Math.round(((Math.min(vw, big ? 760 : 560) - 20 - 6 * 6) / 7) * 0.82);
  // gelegte Karten (Stich): iPhone 1,08×, iPad hoch 1,05×, iPad quer 0,86× der Handkartenbreite
  // (quer begrenzt, damit sie nicht an die Plätze stossen)
  const tw = Math.round(cw * (big ? (vw > vh ? 0.86 : 1.05) : 1.08)), th = Math.round(tw * 1.5);

  const playMode = settings.playMode || (settings.oneTap ? "tap" : "confirm");
  // Eigene Karte spielen; vor der ersten Karte der Runde ggf. nach dem Weis fragen
  const humanPlay = (c) => {
    if (WEISASK && r.weisPending && r.phase === "play" && r.hands[0].length === 9) { setWeisAsk({ c }); return; }
    play(game, 0, c);
  };
  const answerWeis = (ja) => {
    const c = weisAsk.c;
    setWeisAsk(null);
    play(applyHumanWeis(game, ja), 0, c);
  };
  const tapCard = (c) => {
    if (deal) return;
    if (playMode === "swipe") { if (!drag || !drag.moved) say("Karte nach oben auf den Tisch wischen", 1500); return; }
    if (!myTurn) return;
    const claim = claimOn && canClaim(r, 0); // alle Böcke: jede Karte löst das Auflegen aus
    if (!claim && !legal.includes(c)) { say("Diese Karte ist nicht erlaubt", 1500); return; }
    if (playMode === "tap" || selected === c) humanPlay(c);
    else setSelected(c);
  };
  // Wischen: Karte folgt dem Finger; nach oben losgelassen (> 70 px) wird sie gespielt
  const dragStart = (e, c) => {
    if (deal) return;
    if (playMode !== "swipe") return;
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ c, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false });
  };
  const dragMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.abs(dx) + Math.abs(dy) > 6 });
  };
  const dragEnd = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (d.dy < -70) {
      if (!myTurn) { say("Du bist noch nicht dran", 1300); return; }
      if (!(claimOn && canClaim(r, 0)) && !legal.includes(d.c)) { say("Diese Karte ist nicht erlaubt", 1500); return; }
      humanPlay(d.c);
    }
  };

  const trickPos = (p) => {
    const dx = { 0: 0, 1: tw * 0.78, 2: 0, 3: -tw * 0.78 }[p];
    const dy = { 0: th * 0.42, 1: 0, 2: -th * 0.42, 3: 0 }[p];
    const rot = { 0: 0, 1: -8, 2: 3, 3: 8 }[p];
    return "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg)";
  };
  const winnerIdx = r.phase === "trickDone" ? E.trickWinnerIdx(r.trick, r.trump) : -1;
  // Zielposition beim Einziehen: Richtung Platz des Gewinners, Karten zusammengeschoben
  const sweepPos = (w, i) => {
    const d = { 0: [0, vh * 0.38], 1: [vw * 0.42, 0], 2: [0, -vh * 0.34], 3: [-vw * 0.42, 0] }[w];
    return "translate(" + (d[0] + i * 2) + "px," + (d[1] + i * 2) + "px) rotate(" + (i * 4 - 6) + "deg) scale(0.55)";
  };
  // Wem gehört der Stich im Moment? (grün markiert: Karte in der Mitte und Spieler)
  const STICH = "#4ade80";
  const curIdx = r.trick.length ? E.trickWinnerIdx(r.trick, r.trump) : -1;
  const curHolder = curIdx >= 0 ? r.trick[curIdx].p : null;

  const status = (() => {
    if (deal) return "Karten werden verteilt …";
    if (manual && r.phase === "choose" && r.decider !== 0) return NAMES[r.decider] + " wählt – auf den Teppich tippen";
    if (r.phase === "choose") return r.decider === 0 ? (r.pushed ? NAMES[2] + " hat geschoben – du wählst" : "Du bestimmst den Trumpf") : NAMES[r.decider] + " überlegt…" + (r.pushed ? " (geschoben)" : "");
    if (manual && r.phase === "play" && r.turn !== 0) return NAMES[r.turn] + " ist dran – auf den Teppich tippen";
    if (manual && r.phase === "trickDone") return "Auf den Teppich tippen zum Einsammeln";
    if (r.phase === "play") return myTurn ? (playMode === "swipe" ? "Du bist dran – Karte auf den Tisch wischen" : selected != null && playMode === "confirm" ? "Nochmals tippen zum Spielen" : "Du bist dran") : NAMES[r.turn] + " ist dran";
    if (r.phase === "trickDone") return NAMES[r.trick[winnerIdx].p] + " sticht";
    return "";
  })();

  // gewonnene Stiche je Spieler
  const wonBy = [0, 0, 0, 0];
  (r.tricksLog || []).forEach((tr) => { if (tr.length === 4) wonBy[tr[E.trickWinnerIdx(tr, r.trump)].p]++; });
  const pileW = Math.max(16, Math.round(cw * 0.32));

  // Weis der Runde beim Spieler: nach dem ersten Stich zeigt das Team mit dem
  // höchsten Weis seine Weise (wie am echten Tisch)
  // Weise eines Spielers nach dem ersten Stich: gültige (Siegerteam) vollständig, unterlegene nur als Zahl
  // Gültige Weise werden direkt nach dem ersten Stich geschrieben (vor der nächsten Karte): Kopfzeile
  // und Jasstafel zeigen sie sofort; am Rundenende sind sie ohnehin im Rundenergebnis enthalten.
  const mW = r.trump != null ? E.multiplier(r.trump, game.mult) : 1;
  const weisLive = (r.phase === "play" || r.phase === "trickDone") && r.trickNo >= 1 && r.weis && r.weis.winnerTeam != null
    ? [0, 1].map((t) => (t === r.weis.winnerTeam ? r.weis.pts[t] * mW : 0)) : [0, 0];
  const liveScores = [game.scores[0] + weisLive[0], game.scores[1] + weisLive[1]];
  const tafelGame = weisLive[0] + weisLive[1] > 0
    ? { ...game, scores: liveScores, history: game.history.concat([{ no: r.no, trump: r.trump, decider: r.decider, pushed: r.pushed, total: weisLive, match: null, live: true }]) }
    : game;
  const weisOf = (p) => (r.trickNo >= 1 && r.weis && r.weis.winnerTeam != null ? r.weis.byPlayer[p] : []);
  const weisValid = (p) => !!r.weis && r.weis.winnerTeam === E.team(p);
  // Ansage im ersten Stich: sobald der Spieler seine erste Karte gelegt hat, erscheint bei ihm nur die
  // Weishöhe (höchster Weis) als weisse Zahl. Sie bleibt bis der erste Stich entschieden ist; danach
  // gilt die bisherige Darstellung (gültige mit Farbe/Karte, unterlegene grau).
  const announcing = r.trickNo === 0 && r.trump != null && !!r.weis && (r.phase === "play" || r.phase === "trickDone");
  const WeisChips = ({ p, align }) => {
    if (announcing) {
      const mine = r.weis.byPlayer[p] || [];
      if (!mine.length || !r.trick.some((e) => e.p === p)) return null;
      const top = Math.max(...mine.map((w) => w.pts));
      return (
        <div style={{ display: "flex", justifyContent: align === "flex-start" ? "flex-start" : align === "flex-end" ? "flex-end" : "center", marginTop: 4 }}>
          <style>{`@keyframes jassAnsage { 0% { transform: scale(0.3); opacity: 0; } 55% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
          <div key={"ans" + p} style={{ fontSize: 19 * uiK, fontWeight: 800, color: "#fff", padding: "0 10px", borderRadius: 10, background: "rgba(0,0,0,0.5)", lineHeight: 1.35, animation: "jassAnsage 0.45s ease-out both" }}>{top}</div>
        </div>
      );
    }
    const ws = weisOf(p);
    if (!ws.length) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: align || "center", gap: 3, marginTop: 4 }}>
        {ws.map((w, i) => !weisValid(p) ? (
          // unterlegene Ansage: nur die Zahl, ohne Farbe und Karte
          <div key={i} style={{ fontSize: 11 * uiK, padding: "1px 7px", borderRadius: 8, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.18)", color: "#aeb6b3", opacity: 0.75, filter: "grayscale(1)", whiteSpace: "nowrap", lineHeight: 1.4 }}>{w.pts}</div>
        ) : (
          <div key={i} title={describeWeis(w, deck)} style={{ fontSize: 11 * uiK, padding: "1px 6px", borderRadius: 8, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(244,196,48,0.6)", color: C.text, whiteSpace: "nowrap", lineHeight: 1.4 }}>
            {/* Kurzform: Punkte, Farbe, Bezugskarte – bei Undenufe die tiefste
                (20 Schellen 10 = 10, U, O), sonst die höchste (20 Schellen 9 = 7, 8, 9) */}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <b style={{ color: C.gold }}>{w.pts}</b>
              {w.type === "four" ? "4×" + RANK_LABEL[deck][w.r] : <><SuitIcon s={w.s} deck={deck} size={12 * uiK} />{RANK_LABEL[deck][r.trump === E.UNDE ? w.lo : w.hi]}</>}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Lernmodus: Hand eines Mitspielers offen und klein
  const OpenHand = ({ cards }) => {
    const mw = Math.round(26 * uiK), st = Math.round(9 * uiK);
    return (
      <div style={{ position: "relative", width: mw + st * (cards.length - 1), height: Math.round(mw * 1.5), marginTop: 3 }}>
        {cards.map((c, i) => (
          <div key={c} style={{ position: "absolute", left: i * st, top: 0, zIndex: i }}>
            <Card id={c} deck={deck} w={mw} trump={r.trump != null && E.isTrump(c, r.trump)} />
          </div>
        ))}
      </div>
    );
  };

  const Seat = ({ p, style }) => {
    const active = (r.phase === "play" && r.turn === p) || (r.phase === "choose" && r.decider === p);
    const isDecider = r.trump != null && r.decider === p;
    const star = isDecider ? (r.pushed ? " ☆" : " ★") : "";
    return (
      <div style={{ position: "absolute", ...style, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        {big ? (
          // iPad: gefächerte Karten (Rückseiten, echte Anzahl), Name darunter; Markierungen: gelb = am Zug,
          // grün = hält den Stich, Stern = hat den Trumpf angesagt
          <>
            <div style={{ filter: curHolder === p ? "drop-shadow(0 0 8px " + STICH + ") drop-shadow(0 0 3px " + STICH + ")" : active ? "drop-shadow(0 0 8px " + C.gold + ") drop-shadow(0 0 3px " + C.gold + ")" : "none" }}>
              <CardFan cards={deal ? r.hands[p].slice(0, dealtTo(p)) : r.hands[p]} faceUp={!!settings.openCards} deck={deck} trump={r.trump} w={Math.round(34 * uiK)} />
            </div>
            {/* Name unter den Karten (mit Stern bei Ansage) */}
            <div style={{ padding: "2px 10px", borderRadius: 12, background: active ? C.gold : "rgba(0,0,0,0.45)", color: active ? "#1a1200" : C.text, fontSize: 14 * uiK, fontWeight: 400,
              border: curHolder === p ? "2px solid " + STICH : "1px solid " + (E.team(p) === 0 ? "rgba(244,196,48,0.5)" : C.line),
              boxShadow: curHolder === p ? "0 0 10px " + STICH : "none" }}>{NAMES[p]}{star}</div>
          </>
        ) : (
          // iPhone: nur der Name
          <div style={{ padding: 4 * uiK + "px " + 10 * uiK + "px", borderRadius: 20, background: active ? C.gold : "rgba(0,0,0,0.3)", color: active ? "#1a1200" : C.text, fontSize: 13 * uiK, fontWeight: 700,
            border: curHolder === p ? "2px solid " + STICH : "1px solid " + (E.team(p) === 0 ? "rgba(244,196,48,0.5)" : C.line),
            boxShadow: curHolder === p ? "0 0 10px " + STICH : "none" }}>
            {NAMES[p]}{star}
          </div>
        )}
        {!big && settings.openCards && r.hands[p].length > 0 && <OpenHand cards={deal ? r.hands[p].slice(0, dealtTo(p)) : r.hands[p]} />}
        <WeisChips p={p} align={p === 3 ? "flex-start" : p === 1 ? "flex-end" : "center"} />
        {wonBy[p] > 0 && <div style={{ marginTop: 4 }}><TrickPile n={wonBy[p]} w={pileW} /></div>}
      </div>
    );
  };

  return wrap(
    <div style={{ height: "100%", background: C.felt2, position: "relative", zIndex: 0, color: C.text, textShadow: "0 1px 3px rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <FeltBackground />
      {/* Kopfzeile */}
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)", paddingBottom: 4, background: "rgba(0,0,0,0.45)", borderBottom: "1px solid " + C.line }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", maxWidth: MAXW, margin: "0 auto", boxSizing: "border-box", zoom: uiK }}>
          <button onClick={() => setMenu(true)} style={{ background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: "0 6px" }}>☰</button>
          {big ? (
            // iPad: «x & y» links, Trumpf in der Mitte, Gegner rechts
            <div onClick={() => setModal("tafel")} style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              {[0, "trumpf", 1].map((t) => t === "trumpf" ? (
                <div key="t" style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.3)", padding: "4px 12px", borderRadius: 20, fontSize: 14, visibility: r.trump != null ? "visible" : "hidden" }}>
                  {r.trump != null && <ModeIcon t={r.trump} deck={deck} size={24} />}
                </div>
              ) : (
                <div key={t} style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: t === 0 ? "flex-start" : "flex-end", overflow: "hidden" }}>
                  <span style={{ fontSize: 13, color: C.dim, overflow: "hidden", textOverflow: "ellipsis" }}>{teamName(t)}</span>
                  <span style={{ fontSize: 19, fontWeight: 800, color: t === 0 ? C.gold : C.text }}>{liveScores[t]}</span>
                  {liveScores[t] > 1500 && liveScores[t] < game.target && <span style={{ fontSize: 11, color: C.dim }}>−{game.target - liveScores[t]}</span>}
                </div>
              ))}
            </div>
          ) : (
          // iPhone: «Wir» links, Trumpf in der Mitte, «Gegner» rechts
          <div onClick={() => setModal("tafel")} style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
            {[0, "trumpf", 1].map((t) => t === "trumpf" ? (
              <div key="t" title={r.trump != null ? modeName(r.trump, deck) : ""} style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.3)", padding: 5, borderRadius: 20, visibility: r.trump != null ? "visible" : "hidden", minWidth: 32, minHeight: 32, boxSizing: "border-box", justifyContent: "center" }}>
                {r.trump != null && <ModeIcon t={r.trump} deck={deck} size={22} />}
              </div>
            ) : (
              <div key={t} style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: t === 0 ? "flex-start" : "flex-end", overflow: "hidden" }}>
                <span style={{ fontSize: 11, color: C.dim }}>{t === 0 ? "Wir" : "Gegner"}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: t === 0 ? C.gold : C.text }}>{liveScores[t]}</span>
                {/* ab 1500 Punkten zusätzlich: wie viel fehlt bis zum Ziel */}
                {liveScores[t] > 1500 && liveScores[t] < game.target && <span style={{ fontSize: 11, color: C.dim }}>−{game.target - liveScores[t]}</span>}
              </div>
            ))}
          </div>
          )}
          {/* gleich breiter, unsichtbarer Platzhalter rechts: hält den Trumpf in der Bildschirmmitte */}
          {!big && <div aria-hidden="true" style={{ fontSize: 22, padding: "0 6px", visibility: "hidden" }}>☰</div>}
        </div>
      </div>

      {/* Tisch */}
      <div onClick={() => { if (deal) return; if (manual) { const st = botStep(game); if (st) st(); } else if (r.phase === "trickDone") sweepCollect(game); }} style={{ flex: 1, position: "relative", maxWidth: MAXW, width: "100%", margin: "0 auto", minHeight: 0 }}>
        <Seat p={2} style={{ top: 10, left: "50%", transform: "translateX(-50%)" }} />
        {game.lastRound && game.lastRound.tricks.length > 0 && (
          <button onClick={(ev) => { ev.stopPropagation(); setReplay(true); }} title="Letzte Runde nochmals abspielen"
            style={{ position: "absolute", top: 10, left: 8, zIndex: 5, zoom: uiK, ...btn(false), padding: "5px 9px", fontSize: 12 }}>↺ Replay</button>
        )}
        <div style={{ position: "absolute", top: 10, right: 8, zIndex: 5, zoom: uiK }} onClick={(ev) => ev.stopPropagation()}>
          <TafelBadge onClick={() => setModal("tafel")} />
        </div>
        {wonBy[0] > 0 && <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)" }}><TrickPile n={wonBy[0]} w={pileW} /></div>}
        {(announcing || weisOf(0).length > 0) && <div style={{ position: "absolute", bottom: wonBy[0] > 0 ? 10 + pileW + 22 : 10, left: "50%", transform: "translateX(-50%)" }}><WeisChips p={0} /></div>}
        <Seat p={3} style={{ top: "42%", left: 8 }} />
        <Seat p={1} style={{ top: "42%", right: 8 }} />
        <div style={{ position: "absolute", left: "50%", top: big && vw > vh ? "57%" : "50%", width: 0, height: 0 }}>
          {r.trick.map((e, i) => (
            <div key={e.c} style={{ position: "absolute", left: -tw / 2, top: -th / 2, zIndex: i,
              transform: sweep && r.phase === "trickDone" ? sweepPos(sweep.winner, i) : trickPos(e.p),
              opacity: sweep && r.phase === "trickDone" ? 0 : 1,
              transition: sweep && r.phase === "trickDone" ? "transform 0.5s cubic-bezier(.5,0,.75,.6), opacity 0.5s ease-in" : "transform 0.2s", filter: i === curIdx ? "drop-shadow(0 0 4px " + STICH + ") drop-shadow(0 0 2px " + STICH + ")" : winnerIdx >= 0 ? "brightness(0.8)" : "none" }}>
              <Card id={e.c} deck={deck} w={tw} trump={E.isTrump(e.c, r.trump)} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 12, color: C.dim, zoom: uiK }}>
          Runde {r.no}{r.trump != null ? " · Stiche " + r.tricks[0] + ":" + r.tricks[1] : ""}
          {r.trump != null && <div>Trumpf: {NAMES[r.decider]} {r.pushed ? "☆" : "★"}</div>}
        </div>
        {/* Knöpfe unten rechts übereinander: «Bedanken» über «Letzter Stich» (kollidiert so nicht mit dem Weis in der Mitte) */}
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", flexDirection: big ? "row" : "column", alignItems: big ? "center" : "flex-end", gap: 6, zoom: uiK }}>
          {THANK === "knopf" && (r.phase === "play" || r.phase === "trickDone") && !game.over && (
            <button onClick={(ev) => { ev.stopPropagation(); if (window.confirm("Bedanken? Haben wir die " + game.target + " Punkte erreicht? Wenn nicht, gewinnen die Gegner.")) bedanken(); }}
              style={{ ...btn(false), padding: "6px 10px", fontSize: 12 }}>Bedanken</button>
          )}
          {r.lastTrick && r.phase !== "roundEnd" && (
            <button onClick={(ev) => { ev.stopPropagation(); setModal("last"); }} style={{ ...btn(false), padding: "6px 10px", fontSize: 12 }}>Letzter Stich</button>
          )}
        </div>
        {toast && (
          <div style={{ position: "absolute", top: "24%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", padding: "8px 14px", borderRadius: 12, fontSize: 14 * uiK, fontWeight: 600, maxWidth: "86%", textAlign: "center", zIndex: 20, pointerEvents: "none" }}>{toast}</div>
        )}
      </div>

      {/* Trumpfwahl */}
      {r.phase === "choose" && r.decider === 0 && !deal && (
        <div style={{ maxWidth: big ? 760 : 560, width: "100%", margin: "0 auto", padding: "0 10px 8px", boxSizing: "border-box" }}>
          {/* Hinweis über den Knöpfen */}
          <div style={{ textAlign: "center", fontSize: 13 * uiK, color: C.gold, fontWeight: 700, marginBottom: 6 }}>{status}</div>
          {/* 7 quadratische Knöpfe über die ganze Breite: 6 Trumpfarten + Schieben;
              die Symbole füllen den Knopf (Knopfbreite aus der Zeilenbreite berechnet) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {[3, 1, 0, 2, 4, 5].map((t) => (
              <button key={t} onClick={() => choose(game, t)} title={modeName(t, deck) + " ×" + E.multiplier(t, game.mult)} aria-label={modeName(t, deck)}
                style={{ ...btn(false), padding: 0, aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ModeIcon t={t} deck={deck} size={chooseIcon} />
              </button>
            ))}
            <button onClick={() => !r.pushed && push(game)} disabled={r.pushed} title="Schieben" aria-label="Schieben"
              style={{ ...btn(true), padding: 0, aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center", opacity: r.pushed ? 0.3 : 1 }}>
              {/* Pfeil zum Partner (oben) */}
              <svg viewBox="0 0 40 40" width={chooseIcon} height={chooseIcon}>
                <path d="M10 32 Q10 14 26 12" stroke="#1a1200" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M21 5 L30 12 L21 19" stroke="#1a1200" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Status + Hand */}
      <div style={{ textAlign: "center", fontSize: 13 * uiK, color: myTurn ? C.gold : C.dim, fontWeight: myTurn ? 700 : 400, minHeight: 18 }}>{r.phase === "choose" && r.decider === 0 && !deal ? "" : status}</div>
      <div style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)", paddingTop: 18 }}>
        <div data-hand="1" style={{ position: "relative", width: handW, height: Math.round(cw * 1.5), margin: "0 auto" }}>
          {hand.map((c, i) => (
            <div key={c}
              onPointerDown={(e) => dragStart(e, c)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={() => setDrag(null)}
              style={{ position: "absolute", left: i * step, top: 0, zIndex: drag && drag.c === c ? 60 : i, touchAction: playMode === "swipe" ? "none" : "auto",
                transform: drag && drag.c === c ? "translate(" + drag.dx + "px," + drag.dy + "px) rotate(" + drag.dx / 20 + "deg)" : "none",
                transition: drag && drag.c === c ? "none" : "transform 0.15s" }}>
              <Card id={c} deck={deck} w={cw} onClick={() => tapCard(c)} dim={settings.dimIllegal !== false && myTurn && !legal.includes(c)} raised={selected === c} trump={r.trump != null && E.isTrump(c, r.trump)} />
            </div>
          ))}
        </div>
      </div>

      {menu && (
        <Menu onClose={() => setMenu(false)} items={[
          ["Neues Spiel", askNew],
          ["Jasstafel", () => setModal("tafel")],
          r.lastTrick ? ["Letzter Stich", () => setModal("last")] : null,
          ["Settings", () => setModal("settings")],
          ["Regeln", () => setModal("rules")],
          ["Info & Statistik", () => setModal("info")],
          ["Zum Startbildschirm", () => setHome(true)],
        ]} />
      )}
      {deal && <DealAnim key={deal.key} w={Math.round(cw * 0.55)} origin={deal.origin} start={deal.start} />}
      {weisAsk && <WeisAskModal ws={E.findWeis(r.start[0])} deck={deck} onAnswer={answerWeis} />}
      {claimAnim && <ClaimAnim key={claimAnim.key} pile={claimAnim.pile} nTrick={claimAnim.nTrick} p={claimAnim.p} deck={deck} trump={r.trump} w={tw} />}
      {r.phase === "roundEnd" && !modal && !endHidden && !claimAnim && <RoundEndModal game={game} deck={deck} onClaim={() => setModal("claim")} onTafel={() => setModal("tafel")} onClose={() => setEndHidden(true)} onNext={goNextRound} />}
      {r.phase === "roundEnd" && endHidden && !claimAnim && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)", display: "flex", justifyContent: "center", gap: 8, zIndex: 30 }}>
          <button onClick={() => setEndHidden(false)} style={{ ...btn(false), background: "rgba(10,30,22,0.92)" }}>Abrechnung</button>
          <button onClick={goNextRound} style={btn(true)}>{game.over ? "Neues Spiel" : "Nächste Runde"}</button>
        </div>
      )}
      {modal === "claim" && r.claimReport && <ClaimReportModal rep={r.claimReport} deck={deck} onClose={() => setModal(null)} />}
      {modal === "tafel" && <TafelModal game={tafelGame} deck={deck} striche={striche} onResetStriche={() => setStriche({ match: [0, 0], sieg: [0, 0], berg: [0, 0] })}
        onRemove={(k, t) => setStriche((st) => ({ ...st, [k]: st[k].map((v, i) => (i === t ? Math.max(0, v - 1) : v)) }))} onClose={() => setModal(null)} />}
      {modal === "last" && r.lastTrick && <LastTrickModal lt={r.lastTrick} deck={deck} trump={r.trump} onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal settings={settings} setSettings={setSettings} inGame onImages={() => setModal("images")} onClose={() => setModal(null)} />}
      {modal === "rules" && <RulesModal deck={deck} onClose={() => setModal(null)} />}
      {modal === "info" && <InfoModal stats={stats} onClose={() => setModal(null)} />}
      {party && (party.sad ? <Frustration key={party.key} text={party.text} /> : <Celebration key={party.key} text={party.text} />)}
      {replay && game.lastRound && <ReplayView rec={game.lastRound} deck={deck} speed={settings.speed} onClose={() => setReplay(false)} />}
      {imgModal}
    </div>
  );
}
