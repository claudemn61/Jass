// ── Jass (Schieber) — Hauptseite ────────────────────────────────────────
// Du + Partner (Computer) gegen zwei Computer-Gegner. Die Spiellogik liegt
// in engine.js (window.JassEngine), hier nur Zustand, Ablauf und Darstellung.
const { useState, useEffect, useRef, useContext } = React;
const E = window.JassEngine;

const APP_VERSION = "1.1.1";

const CHANGELOG = [
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
const teamName = (t) => NAMES[t] + " & " + NAMES[t + 2];
// «Du wählst» vs. «Anna wählt»
const verb = (p, du, er) => (p === 0 && NAMES[0] === "Du" ? du : er);
const TEAM = ["Wir", "Ihr"];
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
function newGame(settings) {
  return startRound({ id: Date.now(), scores: [0, 0], history: [], nextChooser: Math.floor(Math.random() * 4), target: settings.target, mult: settings.mult, over: null, round: null });
}
function doPush(g) {
  const r = g.round;
  return { ...g, round: { ...r, pushed: true, decider: (r.chooser + 2) % 4 } };
}
function doChoose(g, t) {
  const r = g.round;
  return {
    ...g,
    round: {
      ...r, trump: t, phase: "play", turn: r.chooser, hands: r.hands.map((h) => E.sortHand(h, t)),
      weis: E.resolveWeis(r.start, t, r.chooser), stoeck: E.findStoeck(r.start, t),
    },
  };
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
  const entry = { no: r.no, trump: r.trump, decider: r.decider, pushed: r.pushed, total: res.total, match: res.match };
  return {
    ...g, scores, berg, history: g.history.concat([entry]),
    over: winner != null ? { winner } : null,
    round: { ...r, trick: [], turn: null, phase: "roundEnd", result: res, ...(extra || {}) },
  };
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
  if (g.scores[1] + res.total[1] >= g.target) return finishRound(g, upd, res, 1, { bedankt: upd.trickNo, bedanktVon: 1 });
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
  if (t < 4) return <SuitIcon s={t} deck={deck} size={size} />;
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
        transform: raised ? "translateY(-14px)" : "none", transition: "transform 0.12s",
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
      transform: raised ? "translateY(-14px)" : "none", transition: "transform 0.12s",
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
        Fotos oder Scans deiner eigenen Karten ({deck === "ch" ? "Deutschschweizer" : "französische"} Karten). Die Bilder bleiben <b style={{ color: C.text }}>nur auf diesem Gerät</b> und werden nirgends hochgeladen.
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
  const kratzer = Array.from({ length: 38 }, (_, i) => {
    const x = 40 + rnd(i) * 320, y = 40 + rnd(i + 50) * 720, l = 8 + rnd(i + 99) * 40, a = (rnd(i + 7) - 0.5) * 2.4;
    return <path key={i} d={"M" + x + " " + y + " l" + l * Math.cos(a) + " " + l * Math.sin(a)} stroke="rgba(255,255,255,0.10)" strokeWidth={0.6 + rnd(i + 3)} />;
  });
  const flecken = Array.from({ length: 9 }, (_, i) => (
    <ellipse key={i} cx={40 + rnd(i + 200) * 320} cy={60 + rnd(i + 300) * 680} rx={30 + rnd(i + 400) * 90} ry={10 + rnd(i + 500) * 30} transform={"rotate(" + (rnd(i + 600) * 40 - 20) + ")"} fill={"rgba(255,255,255," + (0.025 + rnd(i + 700) * 0.04) + ")"} />
  ));
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
      <rect x="20" y="20" width="360" height="760" rx="4" fill="url(#schieferAlt)" />
      <rect x="20" y="20" width="360" height="760" rx="4" filter="url(#schieferKorn)" />
      <rect x="20" y="20" width="360" height="760" rx="4" filter="url(#verwittert)" />
      {flecken}
      {geist(70, 1)}
      {geist(480, 2)}
      {kratzer}
      <rect x="20" y="20" width="360" height="760" rx="4" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="6" />
      <rect x="17" y="17" width="366" height="766" rx="5" fill="none" stroke="rgba(255,220,170,0.12)" strokeWidth="1.5" />
    </svg>
  );
}

// Spielteppich: grüner Filz, abgegriffen (hellere, abgewetzte Stellen dort,
// wo Karten gespielt und Stiche eingezogen werden), Flecken, dunkle Ränder.
function FeltBackground() {
  const rnd = (i) => { const x = Math.sin(i * 57.31) * 43758.5453; return x - Math.floor(x); };
  const flecken = Array.from({ length: 7 }, (_, i) => (
    <ellipse key={i} cx={30 + rnd(i) * 340} cy={80 + rnd(i + 20) * 640} rx={6 + rnd(i + 40) * 16} ry={4 + rnd(i + 60) * 10}
      fill={i % 3 === 0 ? "rgba(255,255,230,0.035)" : "rgba(0,0,0,0.10)"} />
  ));
  const fusseln = Array.from({ length: 30 }, (_, i) => {
    const x = rnd(i + 100) * 400, y = rnd(i + 200) * 800, a = rnd(i + 300) * 6.28, l = 3 + rnd(i + 400) * 6;
    return <path key={i} d={"M" + x + " " + y + " q" + l * Math.cos(a) + " " + l * Math.sin(a) + " " + l * 1.6 * Math.cos(a + 0.6) + " " + l * 1.6 * Math.sin(a + 0.6)} stroke="rgba(230,240,220,0.10)" strokeWidth="0.6" fill="none" />;
  });
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: -1, pointerEvents: "none" }}>
      <defs>
        <radialGradient id="filz" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#17573f" /><stop offset="60%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#07221a" />
        </radialGradient>
        <filter id="filzfaser">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="5" />
          <feColorMatrix values="0 0 0 0 0.9  0 0 0 0 1  0 0 0 0 0.85  0 0 0 0.13 0" />
        </filter>
        <filter id="filzwolken">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="9" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" />
        </filter>
        <radialGradient id="abgewetzt">
          <stop offset="0%" stopColor="rgba(190,215,170,0.17)" /><stop offset="60%" stopColor="rgba(190,215,170,0.07)" /><stop offset="100%" stopColor="rgba(190,215,170,0)" />
        </radialGradient>
      </defs>
      <rect width="400" height="800" fill="url(#filz)" />
      <rect width="400" height="800" filter="url(#filzwolken)" />
      {/* abgewetzte Stellen: Tischmitte und vor jedem Spieler */}
      <ellipse cx="200" cy="400" rx="150" ry="170" fill="url(#abgewetzt)" />
      <ellipse cx="200" cy="740" rx="170" ry="70" fill="url(#abgewetzt)" />
      <ellipse cx="200" cy="90" rx="110" ry="60" fill="url(#abgewetzt)" />
      <ellipse cx="25" cy="400" rx="60" ry="120" fill="url(#abgewetzt)" />
      <ellipse cx="375" cy="400" rx="60" ry="120" fill="url(#abgewetzt)" />
      {flecken}
      {fusseln}
      <rect width="400" height="800" filter="url(#filzfaser)" />
    </svg>
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

function Modal({ title, onClose, children, wide, page }) {
  if (page) {
    // Ganze Seite auf der alten Schiefertafel (wie der Startbildschirm)
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", background: "#1b2120", color: C.text }}>
        <StartSlate />
        <div style={{ position: "relative", zIndex: 1, maxWidth: window.innerWidth >= 700 ? 760 : 560, margin: "0 auto", padding: "calc(env(safe-area-inset-top, 0px) + 34px) 30px calc(env(safe-area-inset-bottom, 0px) + 40px)", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <div style={{ flex: 1, fontSize: 28, fontFamily: CHALK_FONT, color: CHALK, textShadow: "0 0 6px rgba(255,255,255,0.2)" }}>{title}</div>
            {onClose && <button onClick={onClose} style={{ background: "rgba(0,0,0,0.25)", border: "1px solid " + C.line, borderRadius: 20, color: C.text, fontSize: 18, width: 36, height: 36, cursor: "pointer" }}>✕</button>}
          </div>
          {children}
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

function Choice({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(([v, l]) => (
        <button key={String(v)} onClick={() => onChange(v)} style={{ ...btn(value === v), padding: "8px 12px", fontSize: 14 }}>{l}</button>
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
  const name = "jass-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Jass-Backup" }); return "geteilt"; }
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
    if (!window.confirm("Backup laden? Einstellungen, Spielstand, Statistik, Striche und eigene Kartenbilder auf diesem Gerät werden ersetzt.")) return;
    try {
      const n = await importBackup(f);
      setMsg("Backup geladen (" + n + " Bilder). Die App startet neu…");
      setTimeout(() => location.reload(), 900);
    } catch (e) { setMsg("Fehler: " + (e.message || e)); }
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={doExport} style={btn(false)}>Backup exportieren…</button>
        <button onClick={() => inRef.current.click()} style={btn(false)}>Backup laden…</button>
      </div>
      <input ref={inRef} type="file" accept="application/json,.json" onChange={doImport} style={{ display: "none" }} />
      {msg && <div style={{ fontSize: 13, color: C.gold, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

function SettingsModal({ settings, setSettings, onClose, inGame, onImages }) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  const row = (label, el, hint) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: C.dim, marginBottom: 6 }}>{label}</div>
      {el}
      {hint && <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{hint}</div>}
    </div>
  );
  return (
    <Modal title="Einstellungen" onClose={onClose} page>
      {row("Namen der Spieler", (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[[0, "Du (unten)"], [2, "Partner (oben)"], [3, "Links"], [1, "Rechts"]].map(([i, lab]) => (
            <label key={i} style={{ fontSize: 12, color: C.dim }}>
              {lab}
              <input value={(settings.names || DEFAULT_NAMES)[i]} maxLength={14}
                onChange={(e) => { const n = (settings.names || DEFAULT_NAMES).slice(); n[i] = e.target.value; set("names", n); }}
                style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 3, padding: "8px 10px", borderRadius: 10, border: "1px solid " + C.line, background: "rgba(0,0,0,0.3)", color: C.text, fontSize: 15, fontFamily: "inherit", WebkitUserSelect: "text", userSelect: "text" }} />
            </label>
          ))}
        </div>
      ), "Leeres Feld = Standardname.")}
      {row("Karten", <Choice value={settings.deck} onChange={(v) => set("deck", v)} options={[["ch", "Deutschschweizer"], ["fr", "Französisch"]]} />)}
      {row("Zielpunkte", <Choice value={settings.target} onChange={(v) => set("target", v)} options={[[1000, "1000"], [1500, "1500"], [2500, "2500"], [3000, "3000"]]} />, inGame ? "Gilt ab dem nächsten Spiel." : null)}
      {row("Multiplikator", <Choice value={settings.mult} onChange={(v) => set("mult", v)} options={[["stufe", "Gestaffelt"], ["einfach", "Alles einfach"]]} />,
        (settings.mult === "stufe" ? (settings.deck === "ch" ? "Eicheln/Rosen ×1, Schellen/Schilten ×2, Obenabe/Undenufe ×3." : "Kreuz/Herz ×1, Ecken/Schaufel ×2, Obenabe/Undenufe ×3.") : "Alle Trümpfe zählen einfach.") + (inGame ? " Gilt ab dem nächsten Spiel." : ""))}
      {row("Spielstärke der Computer-Spieler", <Choice value={settings.level} onChange={(v) => set("level", v)} options={[["normal", "Normal"], ["stark", "Stark"]]} />,
        settings.level === "normal" ? "Einfache Faustregeln." : "Rechnet vor jedem Zug viele mögliche Kartenverteilungen durch (gilt für Partner und Gegner).")}
      {row("Tempo der Mitspieler", <Choice value={settings.speed} onChange={(v) => set("speed", v)} options={[["langsam", "Langsam"], ["normal", "Normal"], ["schnell", "Schnell"], ["manuell", "Manuell"]]} />,
        settings.speed === "manuell" ? "Jeder Zug der Mitspieler und das Einsammeln des Stichs erst nach Tippen auf den Teppich." : null)}
      {row("Backup", <BackupRow />, "Eine Datei mit Einstellungen, Spielstand, Statistik, Strichen und deinen eigenen Kartenbildern – z.B. per AirDrop auf ein anderes iPhone übertragen und dort laden. Die Datei enthält deine Scans: nur privat weitergeben, nicht veröffentlichen.")}
      {row("Eigene Kartenbilder", <button onClick={onImages} style={{ ...btn(false), display: "inline-flex", alignItems: "center", gap: 8 }}>🃏 Eigene Kartenbilder…</button>, "Fotos/Scans deiner eigenen Karten und Rückseite – nur auf diesem Gerät gespeichert.")}
      {row("Offene Karten", <Choice value={!!settings.openCards} onChange={(v) => set("openCards", v)} options={[[false, "Verdeckt"], [true, "Offen (Lernmodus)"]]} />,
        settings.openCards ? "Die Karten der Mitspieler liegen offen bei ihrem Platz – nur du siehst sie, die Computer spielen wie gewohnt ohne dieses Wissen." : null)}
      {row("Nicht spielbare Karten", <Choice value={settings.dimIllegal !== false} onChange={(v) => set("dimIllegal", v)} options={[[true, "Ausgrauen"], [false, "Normal zeigen"]]} />,
        settings.dimIllegal === false ? "Alle Karten sehen gleich aus; eine nicht erlaubte Karte lässt sich trotzdem nicht spielen." : null)}
      {row("Karte spielen", <Choice value={settings.playMode || (settings.oneTap ? "tap" : "confirm")} onChange={(v) => setSettings({ ...settings, playMode: v, oneTap: v === "tap" })} options={[["confirm", "Antippen + bestätigen"], ["tap", "Ein Tipp"], ["swipe", "Wischen"]]} />,
        (settings.playMode === "swipe") ? "Karte mit dem Finger aus der Hand nach oben auf den Tisch ziehen." : null)}
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
      {p("Weis werden automatisch erkannt und nach dem ersten Stich gezeigt: Dreiblatt 20, Vierblatt 50, Fünfblatt 100, je weiteres Blatt +50; vier Under 200, vier Nell 150, vier Ass/König/Ober/Zehner 100. Nur das Team mit dem höchsten Weis schreibt – dafür alle seine Weise. König und Ober im Trumpf (Stöck) geben 20 Punkte.")}
      {h("Multiplikator & Ziel")}
      {p("Bei gestaffelter Zählung zählen " + S[3] + " und " + S[1] + " einfach, " + S[0] + " und " + S[2] + " doppelt, Obenabe und Undenufe dreifach (inkl. Weis und Stöck). Wer zuerst die Zielpunkte erreicht, gewinnt – gezählt wird in der Reihenfolge Stöck, Weis, Stich. Wer das Ziel mitten in der Runde erreicht, muss sich bedanken: für dein Team mit dem Knopf «Bedanken» (gezählt wird, was schon gutgeschrieben ist: Stöck, Weis, eingesammelte Stiche). Stimmt es nicht, gewinnen die Gegner. Die Gegner bedanken sich automatisch. Spätestens am Rundenende wird abgerechnet.")}
      {h("Offene Karten (Lernmodus)")}
      {p("In den Einstellungen lassen sich die Karten der Mitspieler offen anzeigen. Sie liegen klein bei ihrem Platz. Nur du siehst sie – die Computer spielen weiterhin nur mit ihren eigenen Karten. Gut zum Üben und um nachzuvollziehen, warum jemand welche Karte spielt.")}
      {h("Zeichen am Tisch")}
      {p("★ beim Namen: hat den Trumpf selbst angesagt. ☆ beim Namen: der Partner hat geschoben, dieser Spieler hat den Trumpf angesagt. Grün umrandet: diesem Spieler gehört der Stich im Moment. Gelb: ist am Zug.")}
      {h("Jasstafel")}
      {p("Vorderseite: pro Team ein Z. Jede Runde wird ergänzt, nie ausradiert: 100er als Striche oben in Fünferbündeln (500 in einer einzigen Runde als «V»), 50er auf der Diagonale (je zwei über Kreuz = 100), 20er unten in Fünferbündeln. Nur die Einer stehen als Zahl und werden angepasst: ab 11 gibt es einen 20er-Strich mehr und Minus-Einer (z.B. 9 und dazu 8 = 20er-Strich und −3). Rückseite (über alle Partien): jeder Match 1 Strich, jedes gewonnene Spiel 2 Striche, und wer zuerst den Berg erreicht (60 % der Zielpunkte, bei 2500 also 1500), bekommt 1 Strich. Bei 1000 Punkten wird ohne Berg gespielt.")}
      {h("Computer-Spieler")}
      {p("Die Computer spielen nach üblichen Faustregeln im Zusammenspiel mit dem Partner: Beim ersten Mal, wenn sie nicht Farbe angeben können, verwerfen sie eine schwache Farbe (diese spielt ihnen der Partner dann nicht an). Danach schmieren sie, wenn der Partner den Stich macht, sonst verwerfen sie wieder. Spielt der Partner einen Bock, geben sie wenn möglich die Karte direkt darunter zu. In der Stufe «Stark» rechnen sie zusätzlich viele mögliche Kartenverteilungen durch, berücksichtigen gezeigte Weis und spielen gegen Spielende auf die Zielpunkte hin.")}
    </Modal>
  );
}

// ── Jasstafel: Schiefertafel mit Kreide ──
// Vorderseite: pro Team ein «Z». Jede Runde wird wie von Hand angeschrieben:
// 100er als Striche auf der oberen Linie, 50er auf der Diagonale, 20er auf der
// unteren Linie; der Rest unter 20 wird als Zahl nachgeführt (ab 20 → Strich).
// Rückseite: Striche über mehrere Partien (Match 1, Sieg 2, Berg 1).
const CHALK = "rgba(240,240,232,0.92)";
const CHALK_FONT = "'Chalkboard SE', 'Chalkboard', 'Comic Sans MS', 'Segoe Print', cursive";

// Reproduzierbares «Zittern» der Kreide
function jit(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x) - 0.5; }
function ChalkLine({ x1, y1, x2, y2, seed, w }) {
  const j = (k) => jit(seed * 7 + k) * 1.6;
  const mx = (x1 + x2) / 2 + j(5), my = (y1 + y2) / 2 + j(6);
  const d = "M" + (x1 + j(1)) + " " + (y1 + j(2)) + " Q" + mx + " " + my + " " + (x2 + j(3)) + " " + (y2 + j(4));
  return (
    <g>
      <path d={d} stroke={CHALK} strokeWidth={w || 2.2} fill="none" strokeLinecap="round" filter="url(#kreide)" />
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
  history.forEach((e) => {
    const p = e.total[team];
    const hund = Math.floor(p / 100);
    for (let i = 0; i < Math.floor(hund / 5); i++) hundert.push("V");
    for (let i = 0; i < hund % 5; i++) hundert.push("I");
    let r = p % 100;
    if (r >= 50) { f++; r -= 50; }
    z += Math.floor(r / 20);
    einer += r % 20;
    if (einer >= 11) { z++; einer -= 20; }
  });
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
        <rect width={w} height={h} fill="url(#schieferGrund)" />
        <rect width={w} height={h} filter="url(#schiefer)" />
        {/* Reste weggewischter Kreide */}
        <ellipse cx={w * 0.7} cy={h * 0.3} rx={w * 0.25} ry={h * 0.05} fill="rgba(255,255,255,0.035)" />
        <ellipse cx={w * 0.3} cy={h * 0.75} rx={w * 0.3} ry={h * 0.06} fill="rgba(255,255,255,0.03)" />
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
        <ChalkLine x1={L} y1={T} x2={R} y2={T} seed={team * 100 + 1} w={2.6} />
        <ChalkLine x1={R} y1={T} x2={L} y2={B} seed={team * 100 + 2} w={2.6} />
        <ChalkLine x1={L} y1={B} x2={R} y2={B} seed={team * 100 + 3} w={2.6} />
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
        {s.einer !== 0 && <ChalkText x={R + 24} y={B + 7} size={20} anchor="middle">{s.einer < 0 ? "−" + (-s.einer) : s.einer}</ChalkText>}
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

function TafelModal({ game, deck, striche, onResetStriche, onClose }) {
  const [side, setSide] = useState("vorne");
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
            Über alle Partien: jeder Match 1 Strich, jedes gewonnene Spiel 2 Striche, Berg 1 Strich ({bergOf(game.target) ? bergOf(game.target) + " Punkte zuerst erreicht" : "bei Ziel " + game.target + " ohne Berg"}).
          </div>
          <button onClick={() => { if (window.confirm("Rückseite der Tafel abwischen (alle Striche löschen)?")) onResetStriche(); }} style={btn(false)}>Tafel abwischen</button>
        </div>
      )}
      {side === "liste" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ color: C.dim, textAlign: "right" }}>
              <th style={{ textAlign: "left", padding: 4 }}>#</th><th style={{ textAlign: "left", padding: 4 }}>Trumpf</th><th style={{ padding: 4 }}>Wir</th><th style={{ padding: 4 }}>Ihr</th>
            </tr>
          </thead>
          <tbody>
            {game.history.map((h) => (
              <tr key={h.no} style={{ borderTop: "1px solid " + C.line, textAlign: "right" }}>
                <td style={{ textAlign: "left", padding: 4, color: C.dim }}>{h.no}</td>
                <td style={{ textAlign: "left", padding: 4 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ModeIcon t={h.trump} deck={deck} size={16} />{modeName(h.trump, deck)}</span>
                  <span style={{ color: C.dim, fontSize: 12 }}> · {NAMES[h.decider]}{h.pushed ? " (geschoben)" : ""}</span>
                </td>
                <td style={{ padding: 4 }}>{h.total[0]}{h.match === 0 ? " M" : ""}</td>
                <td style={{ padding: 4 }}>{h.total[1]}{h.match === 1 ? " M" : ""}</td>
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

function RoundEndModal({ game, deck, onNext, onTafel, onClose }) {
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
        : <div style={{ color: C.gold, fontWeight: 800, marginBottom: 8 }}>{r.bedanktVon === 0 ? "Wir bedanken uns" : "Ihr bedankt euch"} – Zielpunkte {r.bedankt ? "nach Stich " + r.bedankt : "vor dem ersten Stich"} erreicht.</div>)}
      {res.match != null && <div style={{ color: C.gold, fontWeight: 800, marginBottom: 8 }}>Match für {TEAM[res.match]}!</div>}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead><tr style={{ color: C.dim }}><th></th><th style={{ textAlign: "right", padding: 4 }}>Wir</th><th style={{ textAlign: "right", padding: 4 }}>Ihr</th></tr></thead>
        <tbody>
          {row("Stiche (" + r.tricks[0] + ":" + r.tricks[1] + ")", res.trick[0], res.trick[1])}
          {row("Weis", res.weis[0], res.weis[1])}
          {row("Stöck", res.stoeck[0], res.stoeck[1])}
          {row("Runde ×" + res.mult, res.total[0], res.total[1], true)}
          {row("Gesamt", game.scores[0], game.scores[1], true)}
        </tbody>
      </table>
      {weisList.length > 0 && <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>{weisList.join(" · ")}</div>}
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
  const toastTimer = useRef(null);
  const [imgs, setImgs] = useState({});
  const reloadImgs = () => imgAll().then(setImgs).catch((e) => console.error("Kartenbilder:", e));
  useEffect(() => { reloadImgs(); }, []);
  const vw = useWidth();
  const vh = useHeight();
  const deck = settings.deck;
  NAMES = [0, 1, 2, 3].map((i) => ((settings.names && settings.names[i]) || "").trim() || DEFAULT_NAMES[i]);
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
      say("Weis " + TEAM[wt] + " +" + r.weis.pts[wt] + " — " + parts.join(" · "), 3500);
    }
    record(g, ng);
    setGame(ng);
  };
  // Statistik und Striche (Rückseite der Jasstafel) bei Rundenende nachführen
  const record = (g, ng) => {
    if (ng.round.phase !== "roundEnd" || g.round.phase === "roundEnd") return;
    const res = ng.round.result;
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
      const d = strong ? E.botChooseTrumpSmart(r.hands[r.decider], !r.pushed, r.decider, g.mult, { scores: g.scores, target: g.target }) : E.botChooseTrump(r.hands[r.decider], !r.pushed);
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
    if (r.phase === "trickDone") return () => collect(g);
    return null;
  };
  const manual = settings.speed === "manuell";
  // Automatisch mit Verzögerung; im Modus «Manuell» erst beim Tippen auf den Teppich
  useEffect(() => {
    if (!game || !game.round || home || manual) return;
    const step = botStep(game);
    if (!step) return;
    const r = game.round;
    const delay = r.phase === "trickDone" ? sp.trick : r.phase === "choose" ? sp.bot * 1.4 : sp.bot;
    const timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
  }, [game, home, manual]);

  const startNew = () => { setSelected(null); setModal(null); setEndHidden(false); setHome(false); setGame(newGame(settings)); };
  const askNew = () => {
    if (game && !game.over && (game.history.length || (game.round && game.round.trickNo > 0))) {
      if (!window.confirm("Laufendes Spiel abbrechen und neu beginnen?")) return;
      setStats((s) => ({ ...s, played: s.played + 1 }));
    }
    startNew();
  };

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
        <div style={{ fontSize: 40, letterSpacing: 1, fontFamily: CHALK_FONT, color: CHALK, textShadow: "0 0 6px rgba(255,255,255,0.25)" }}>Schieber</div>
        <div style={{ color: "rgba(240,240,232,0.7)", fontSize: 15, marginTop: -10, fontFamily: CHALK_FONT }}>Jassen gegen den Computer</div>
        {canResume && <button onClick={() => setHome(false)} style={{ ...btn(true), width: 240, marginTop: 10 }}>Weiterspielen ({game.scores[0]} : {game.scores[1]})</button>}
        <button onClick={canResume ? askNew : startNew} style={{ ...btn(!canResume), width: 240, marginTop: canResume ? 0 : 10 }}>Neues Spiel</button>
        <button onClick={() => setModal("settings")} style={{ ...btn(false), width: 240 }}>Einstellungen</button>
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
  const hand = r.hands[0];

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
  const tw = Math.round(cw * (big && vw > vh ? 0.72 : 0.92)), th = Math.round(tw * 1.5); // iPad quer: Stichkarten kleiner, damit sie nicht an die Plätze stossen

  const playMode = settings.playMode || (settings.oneTap ? "tap" : "confirm");
  const tapCard = (c) => {
    if (playMode === "swipe") { if (!drag || !drag.moved) say("Karte nach oben auf den Tisch wischen", 1500); return; }
    if (!myTurn) return;
    if (!legal.includes(c)) { say("Diese Karte ist nicht erlaubt", 1500); return; }
    if (playMode === "tap" || selected === c) play(game, 0, c);
    else setSelected(c);
  };
  // Wischen: Karte folgt dem Finger; nach oben losgelassen (> 70 px) wird sie gespielt
  const dragStart = (e, c) => {
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
      if (!legal.includes(d.c)) { say("Diese Karte ist nicht erlaubt", 1500); return; }
      play(game, 0, d.c);
    }
  };

  const trickPos = (p) => {
    const dx = { 0: 0, 1: tw * 0.78, 2: 0, 3: -tw * 0.78 }[p];
    const dy = { 0: th * 0.42, 1: 0, 2: -th * 0.42, 3: 0 }[p];
    const rot = { 0: 0, 1: -8, 2: 3, 3: 8 }[p];
    return "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg)";
  };
  const winnerIdx = r.phase === "trickDone" ? E.trickWinnerIdx(r.trick, r.trump) : -1;
  // Wem gehört der Stich im Moment? (grün markiert: Karte in der Mitte und Spieler)
  const STICH = "#4ade80";
  const curIdx = r.trick.length ? E.trickWinnerIdx(r.trick, r.trump) : -1;
  const curHolder = curIdx >= 0 ? r.trick[curIdx].p : null;

  const status = (() => {
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
  const weisOf = (p) => (r.trickNo >= 1 && r.weis && r.weis.winnerTeam === E.team(p) ? r.weis.byPlayer[p] : []);
  const WeisChips = ({ p, align }) => {
    const ws = weisOf(p);
    if (!ws.length) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: align || "center", gap: 3, marginTop: 4 }}>
        {ws.map((w, i) => (
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
    return (
      <div style={{ position: "absolute", ...style, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <div style={{ padding: 4 * uiK + "px " + 10 * uiK + "px", borderRadius: 20, background: active ? C.gold : "rgba(0,0,0,0.3)", color: active ? "#1a1200" : C.text, fontSize: 13 * uiK, fontWeight: 700,
          border: curHolder === p ? "2px solid " + STICH : "1px solid " + (E.team(p) === 0 ? "rgba(244,196,48,0.5)" : C.line),
          boxShadow: curHolder === p ? "0 0 10px " + STICH : "none" }}>
          {NAMES[p]}{isDecider ? (r.pushed ? " ☆" : " ★") : ""}
        </div>
        <div style={{ fontSize: 11 * uiK, color: C.dim }}>{r.hands[p].length} Karten</div>
        {settings.openCards && r.hands[p].length > 0 && <OpenHand cards={r.hands[p]} />}
        <WeisChips p={p} align={p === 3 ? "flex-start" : p === 1 ? "flex-end" : "center"} />
        {wonBy[p] > 0 && <div style={{ marginTop: 4 }}><TrickPile n={wonBy[p]} w={pileW} /></div>}
      </div>
    );
  };

  return wrap(
    <div style={{ height: "100%", background: C.felt2, position: "relative", zIndex: 0, color: C.text, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <FeltBackground />
      {/* Kopfzeile */}
      <div style={{ paddingTop: "env(safe-area-inset-top, 0px)", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid " + C.line }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", maxWidth: MAXW, margin: "0 auto", boxSizing: "border-box", zoom: uiK }}>
          <button onClick={() => setMenu(true)} style={{ background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: "0 6px" }}>☰</button>
          <div onClick={() => setModal("tafel")} style={{ flex: 1, display: "flex", gap: 14, cursor: "pointer", alignItems: "baseline" }}>
            <div><span style={{ fontSize: 11, color: C.dim }}>Wir </span><span style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{game.scores[0]}</span></div>
            <div><span style={{ fontSize: 11, color: C.dim }}>Ihr </span><span style={{ fontSize: 18, fontWeight: 800 }}>{game.scores[1]}</span></div>
            <div style={{ fontSize: 11, color: C.dim }}>/ {game.target}</div>
          </div>
          {r.trump != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: 20, fontSize: 13 }}>
              <ModeIcon t={r.trump} deck={deck} size={18} />
              <span style={{ fontWeight: 700 }}>{modeName(r.trump, deck)}</span>
              <span style={{ color: C.dim }}>×{E.multiplier(r.trump, game.mult)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tisch */}
      <div onClick={() => { if (manual) { const st = botStep(game); if (st) st(); } else if (r.phase === "trickDone") collect(game); }} style={{ flex: 1, position: "relative", maxWidth: MAXW, width: "100%", margin: "0 auto", minHeight: 0 }}>
        <Seat p={2} style={{ top: 10, left: "50%", transform: "translateX(-50%)" }} />
        <div style={{ position: "absolute", top: 10, right: 8, zIndex: 5, zoom: uiK }} onClick={(ev) => ev.stopPropagation()}>
          <TafelBadge onClick={() => setModal("tafel")} />
        </div>
        {wonBy[0] > 0 && <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)" }}><TrickPile n={wonBy[0]} w={pileW} /></div>}
        {weisOf(0).length > 0 && <div style={{ position: "absolute", bottom: wonBy[0] > 0 ? 10 + pileW + 22 : 10, left: "50%", transform: "translateX(-50%)" }}><WeisChips p={0} /></div>}
        <Seat p={3} style={{ top: "42%", left: 8 }} />
        <Seat p={1} style={{ top: "42%", right: 8 }} />
        <div style={{ position: "absolute", left: "50%", top: big && vw > vh ? "57%" : "50%", width: 0, height: 0 }}>
          {r.trick.map((e, i) => (
            <div key={e.c} style={{ position: "absolute", left: -tw / 2, top: -th / 2, transform: trickPos(e.p), zIndex: i, transition: "transform 0.2s", filter: i === curIdx ? "drop-shadow(0 0 4px " + STICH + ") drop-shadow(0 0 2px " + STICH + ")" : winnerIdx >= 0 ? "brightness(0.8)" : "none" }}>
              <Card id={e.c} deck={deck} w={tw} trump={E.isTrump(e.c, r.trump)} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 12, color: C.dim, zoom: uiK }}>
          Runde {r.no}{r.trump != null ? " · Stiche " + r.tricks[0] + ":" + r.tricks[1] : ""}
          {r.trump != null && <div>Trumpf: {NAMES[r.decider]} {r.pushed ? "☆" : "★"}</div>}
        </div>
        {/* Knöpfe unten rechts nebeneinander (kollidieren so nicht mit den Plätzen) */}
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6, zoom: uiK }}>
          {(r.phase === "play" || r.phase === "trickDone") && !game.over && (
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
      {r.phase === "choose" && r.decider === 0 && (
        <div style={{ maxWidth: big ? 760 : 560, width: "100%", margin: "0 auto", padding: "0 10px 8px", boxSizing: "border-box" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {[3, 1, 0, 2, 4, 5].map((t) => (
              <button key={t} onClick={() => choose(game, t)} style={{ ...btn(false), padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14 }}>
                <ModeIcon t={t} deck={deck} size={20} />{modeName(t, deck)}
                <span style={{ color: C.dim, fontSize: 11 }}>×{E.multiplier(t, game.mult)}</span>
              </button>
            ))}
          </div>
          {!r.pushed && <button onClick={() => push(game)} style={{ ...btn(true), width: "100%", marginTop: 6, padding: "10px" }}>Schieben</button>}
        </div>
      )}

      {/* Status + Hand */}
      <div style={{ textAlign: "center", fontSize: 13 * uiK, color: myTurn ? C.gold : C.dim, fontWeight: myTurn ? 700 : 400, minHeight: 18 }}>{status}</div>
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
          ["Einstellungen", () => setModal("settings")],
          ["Regeln", () => setModal("rules")],
          ["Info & Statistik", () => setModal("info")],
          ["Zum Startbildschirm", () => setHome(true)],
        ]} />
      )}
      {r.phase === "roundEnd" && !modal && !endHidden && <RoundEndModal game={game} deck={deck} onTafel={() => setModal("tafel")} onClose={() => setEndHidden(true)} onNext={() => { setEndHidden(false); if (game.over) startNew(); else setGame(nextRound(game)); }} />}
      {r.phase === "roundEnd" && endHidden && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)", display: "flex", justifyContent: "center", gap: 8, zIndex: 30 }}>
          <button onClick={() => setEndHidden(false)} style={{ ...btn(false), background: "rgba(10,30,22,0.92)" }}>Abrechnung</button>
          <button onClick={() => { setEndHidden(false); if (game.over) startNew(); else setGame(nextRound(game)); }} style={btn(true)}>{game.over ? "Neues Spiel" : "Nächste Runde"}</button>
        </div>
      )}
      {modal === "tafel" && <TafelModal game={game} deck={deck} striche={striche} onResetStriche={() => setStriche({ match: [0, 0], sieg: [0, 0], berg: [0, 0] })} onClose={() => setModal(null)} />}
      {modal === "last" && r.lastTrick && <LastTrickModal lt={r.lastTrick} deck={deck} trump={r.trump} onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal settings={settings} setSettings={setSettings} inGame onImages={() => setModal("images")} onClose={() => setModal(null)} />}
      {modal === "rules" && <RulesModal deck={deck} onClose={() => setModal(null)} />}
      {modal === "info" && <InfoModal stats={stats} onClose={() => setModal(null)} />}
      {imgModal}
    </div>
  );
}
