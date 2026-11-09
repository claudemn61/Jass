// ── Jass (Schieber) — Hauptseite ────────────────────────────────────────
// Du + Partner (Computer) gegen zwei Computer-Gegner. Die Spiellogik liegt
// in engine.js (window.JassEngine), hier nur Zustand, Ablauf und Darstellung.
const { useState, useEffect, useRef, useContext } = React;
const E = window.JassEngine;

const APP_VERSION = "1.0.0";

const CHANGELOG = [
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

const DEFAULT_SETTINGS = { deck: "ch", target: 2500, mult: "stufe", speed: "normal", oneTap: false, customImgs: true, imgIndex: true };
const SPEEDS = { langsam: { bot: 1000, trick: 2000 }, normal: { bot: 650, trick: 1300 }, schnell: { bot: 300, trick: 700 } };
const SUIT_NAMES = { ch: ["Schellen", "Rosen", "Schilten", "Eicheln"], fr: ["Ecken", "Herz", "Schaufel", "Kreuz"] };
const RANK_LABEL = { ch: ["6", "7", "8", "9", "10", "U", "O", "K", "A"], fr: ["6", "7", "8", "9", "10", "B", "D", "K", "A"] };
const RANK_NAME = { ch: ["Sechser", "Siebner", "Achter", "Nell", "Banner", "Under", "Ober", "König", "Ass"], fr: ["Sechser", "Siebner", "Achter", "Nell", "Zehner", "Bube", "Dame", "König", "Ass"] };
const NAMES = ["Du", "Rechts", "Partner", "Links"];
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
      trickNo: 0, lastTrick: null, weis: null, stoeck: null, stoeckDone: false, result: null,
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
function doCollect(g) {
  const r = g.round;
  const w = r.trick[E.trickWinnerIdx(r.trick, r.trump)].p;
  const last = r.trickNo === 8;
  const pts = r.trick.reduce((s, e) => s + E.points(e.c, r.trump), 0) + (last ? 5 : 0);
  const trickPts = r.trickPts.slice(); trickPts[E.team(w)] += pts;
  const tricks = r.tricks.slice(); tricks[E.team(w)] += 1;
  const played = r.played.concat(r.trick.map((e) => e.c));
  const lastTrick = { cards: r.trick, winner: w, pts };
  if (!last) {
    return { ...g, round: { ...r, trick: [], turn: w, trickNo: r.trickNo + 1, phase: "play", trickPts, tricks, played, lastTrick } };
  }
  const res = E.scoreRound({ trump: r.trump, trickPts, tricks, weis: r.weis, stoeck: r.stoeck }, g.mult);
  const ap = E.applyScore(g.scores, res, g.target);
  const entry = { no: r.no, trump: r.trump, decider: r.decider, pushed: r.pushed, total: res.total, match: res.match };
  return {
    ...g, scores: ap.scores, history: g.history.concat([entry]),
    over: ap.winner != null ? { winner: ap.winner } : null,
    round: { ...r, trick: [], turn: null, phase: "roundEnd", trickPts, tricks, played, lastTrick, trickNo: 9, result: res },
  };
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
        <SuitIcon s={s} deck={deck} size={w * 0.24} />
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
// Bild auf max. 300×450 verkleinern (spart Speicher, reicht für die Anzeige)
function shrinkImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const f = Math.min(1, 300 / im.naturalWidth, 450 / im.naturalHeight);
      const cv = document.createElement("canvas");
      cv.width = Math.round(im.naturalWidth * f); cv.height = Math.round(im.naturalHeight * f);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL("image/jpeg", 0.85));
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Bild nicht lesbar: " + file.name)); };
    im.src = url;
  });
}

function CardImagesModal({ deck, imgs, reload, settings, setSettings, onClose }) {
  const [busy, setBusy] = useState(null);
  const multiRef = useRef(null);
  const singleRef = useRef(null);
  const slotRef = useRef(null);
  const order = [0, 1, 2, 3].flatMap((s) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((r) => s * 9 + r));
  const key = (id) => deck + ":" + id;
  const count = order.filter((id) => imgs[key(id)]).length;

  const store = async (pairs) => {
    setBusy("Speichere " + pairs.length + " Bild(er)…");
    try {
      const data = [];
      for (const [id, file] of pairs) data.push([key(id), await shrinkImage(file)]);
      await imgWrite((st) => data.forEach(([k, v]) => st.put(v, k)));
      await reload();
      setBusy(null);
    } catch (e) { setBusy("Fehler: " + (e.message || e)); }
  };
  const onMulti = (ev) => {
    const files = Array.from(ev.target.files || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    ev.target.value = "";
    if (!files.length) return;
    const start = Math.max(0, order.findIndex((id) => !imgs[key(id)]));
    const ids = order.slice(start).concat(order.slice(0, start));
    store(files.slice(0, 36).map((f, i) => [ids[i], f]));
  };
  const onSingle = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (f && slotRef.current != null) store([[slotRef.current, f]]);
  };
  const removeAll = async () => {
    if (!window.confirm("Alle eigenen Bilder für diese Karten löschen?")) return;
    await imgWrite((st) => order.forEach((id) => st.delete(key(id))));
    await reload();
  };
  const removeOne = async (id) => { await imgWrite((st) => st.delete(key(id))); await reload(); };

  const toggle = (k) => setSettings({ ...settings, [k]: !settings[k] });
  return (
    <Modal title="Eigene Kartenbilder" onClose={onClose} wide>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5, marginBottom: 12 }}>
        Fotos oder Scans deiner eigenen Karten ({deck === "ch" ? "Deutschschweizer" : "französische"} Karten). Die Bilder bleiben <b style={{ color: C.text }}>nur auf diesem Gerät</b> und werden nirgends hochgeladen.
        Bei mehreren Bildern gilt die Reihenfolge der Dateinamen: {SUIT_NAMES[deck].join(", ")}, je von 6 bis Ass. Einzelne Karte: Feld antippen.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={() => multiRef.current.click()} style={btn(true)}>Bilder auswählen…</button>
        {count > 0 && <button onClick={removeAll} style={btn(false)}>Alle löschen</button>}
      </div>
      <input ref={multiRef} type="file" accept="image/*" multiple onChange={onMulti} style={{ display: "none" }} />
      <input ref={singleRef} type="file" accept="image/*" onChange={onSingle} style={{ display: "none" }} />
      {busy && <div style={{ fontSize: 13, color: C.gold, marginBottom: 10 }}>{busy}</div>}
      <div style={{ fontSize: 13, marginBottom: 8 }}>{count} von 36 Karten mit eigenem Bild</div>
      {[0, 1, 2, 3].map((s) => (
        <div key={s} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 4 }}><SuitIcon s={s} deck={deck} size={16} />{SUIT_NAMES[deck][s]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 3 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((r) => {
              const id = s * 9 + r, im = imgs[key(id)];
              return (
                <div key={r} onClick={() => { slotRef.current = id; singleRef.current.click(); }}
                  onContextMenu={(e) => { e.preventDefault(); if (im && window.confirm("Bild dieser Karte löschen?")) removeOne(id); }}
                  style={{ aspectRatio: "2 / 3", borderRadius: 4, overflow: "hidden", cursor: "pointer", background: im ? "#fff" : "rgba(255,255,255,0.08)", border: "1px solid " + C.line, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.dim }}>
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

function Modal({ title, onClose, children, wide }) {
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

function SettingsModal({ settings, setSettings, onClose, inGame }) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  const row = (label, el, hint) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: C.dim, marginBottom: 6 }}>{label}</div>
      {el}
      {hint && <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{hint}</div>}
    </div>
  );
  return (
    <Modal title="Einstellungen" onClose={onClose}>
      {row("Karten", <Choice value={settings.deck} onChange={(v) => set("deck", v)} options={[["ch", "Deutschschweizer"], ["fr", "Französisch"]]} />)}
      {row("Zielpunkte", <Choice value={settings.target} onChange={(v) => set("target", v)} options={[[1000, "1000"], [1500, "1500"], [2500, "2500"], [3000, "3000"]]} />, inGame ? "Gilt ab dem nächsten Spiel." : null)}
      {row("Multiplikator", <Choice value={settings.mult} onChange={(v) => set("mult", v)} options={[["stufe", "Gestaffelt"], ["einfach", "Alles einfach"]]} />,
        (settings.mult === "stufe" ? (settings.deck === "ch" ? "Eicheln/Rosen ×1, Schellen/Schilten ×2, Obenabe/Undenufe ×3." : "Kreuz/Herz ×1, Ecken/Schaufel ×2, Obenabe/Undenufe ×3.") : "Alle Trümpfe zählen einfach.") + (inGame ? " Gilt ab dem nächsten Spiel." : ""))}
      {row("Tempo der Mitspieler", <Choice value={settings.speed} onChange={(v) => set("speed", v)} options={[["langsam", "Langsam"], ["normal", "Normal"], ["schnell", "Schnell"]]} />)}
      {row("Karte spielen", <Choice value={settings.oneTap} onChange={(v) => set("oneTap", v)} options={[[false, "Antippen + bestätigen"], [true, "Ein Tipp"]]} />)}
    </Modal>
  );
}

function RulesModal({ onClose, deck }) {
  const S = SUIT_NAMES[deck];
  const p = (t) => <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.5 }}>{t}</p>;
  const h = (t) => <div style={{ fontWeight: 800, color: C.gold, margin: "14px 0 6px" }}>{t}</div>;
  return (
    <Modal title="Regeln (Schieber)" onClose={onClose} wide>
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
      {p("Bei gestaffelter Zählung zählen " + S[3] + " und " + S[1] + " einfach, " + S[0] + " und " + S[2] + " doppelt, Obenabe und Undenufe dreifach (inkl. Weis und Stöck). Wer zuerst die Zielpunkte erreicht, gewinnt – gezählt wird in der Reihenfolge Stöck, Weis, Stich.")}
    </Modal>
  );
}

function TafelModal({ game, deck, onClose }) {
  return (
    <Modal title="Jasstafel" onClose={onClose}>
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
      {!game.history.length && <div style={{ color: C.dim, fontSize: 13, marginTop: 10 }}>Noch keine Runde gespielt.</div>}
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
    <Modal title="Info" onClose={onClose}>
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

function RoundEndModal({ game, deck, onNext }) {
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
    <Modal title={over ? (over.winner === 0 ? "🏆 Gewonnen!" : "Verloren") : "Runde " + r.no}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 14 }}>
        <ModeIcon t={r.trump} deck={deck} size={20} /> {modeName(r.trump, deck)} · {NAMES[r.decider]}{r.pushed ? " (geschoben)" : ""} · ×{res.mult}
      </div>
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
  const toastTimer = useRef(null);
  const [imgs, setImgs] = useState({});
  const reloadImgs = () => imgAll().then(setImgs).catch((e) => console.error("Kartenbilder:", e));
  useEffect(() => { reloadImgs(); }, []);
  const vw = useWidth();
  const deck = settings.deck;
  const sp = SPEEDS[settings.speed] || SPEEDS.normal;

  const setSettings = (s) => { setSettingsRaw(s); save("settings", s); };
  const imgCtx = { on: settings.customImgs, index: settings.imgIndex, map: imgs };
  const wrap = (el) => <CardImgCtx.Provider value={imgCtx}>{el}</CardImgCtx.Provider>;
  const imgModal = modal === "images" && <CardImagesModal deck={deck} imgs={imgs} reload={reloadImgs} settings={settings} setSettings={setSettings} onClose={() => setModal(null)} />;
  useEffect(() => { save("game", game); }, [game]);
  useEffect(() => { save("stats", stats); }, [stats]);

  const say = (msg, ms) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), ms || 2200);
  };

  // Zustandsübergänge mit Ansagen
  const choose = (g, t) => {
    const r = g.round;
    say(NAMES[r.decider] + (r.decider === 0 ? " wählst " : " wählt ") + modeName(t, deck));
    setGame(doChoose(g, t));
  };
  const push = (g) => {
    say(NAMES[g.round.chooser] + (g.round.chooser === 0 ? " schiebst" : " schiebt"));
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
    if (ng.round.phase === "roundEnd") {
      const res = ng.round.result;
      setStats((s) => ({
        ...s, rounds: s.rounds + 1, matches: s.matches + (res.match === 0 ? 1 : 0),
        played: s.played + (ng.over ? 1 : 0), won: s.won + (ng.over && ng.over.winner === 0 ? 1 : 0),
      }));
    }
    setGame(ng);
  };

  // Computer-Spieler und automatisches Einsammeln
  useEffect(() => {
    if (!game || !game.round || home) return;
    const r = game.round;
    let timer = null;
    if (r.phase === "choose" && r.decider !== 0) {
      timer = setTimeout(() => {
        const d = E.botChooseTrump(r.hands[r.decider], !r.pushed);
        if (d === "push") push(game); else choose(game, d);
      }, sp.bot * 1.4);
    } else if (r.phase === "play" && r.turn !== 0) {
      timer = setTimeout(() => {
        const c = E.botPlay({ hand: r.hands[r.turn], trick: r.trick, t: r.trump, played: r.played, p: r.turn, declarer: r.chooser });
        play(game, r.turn, c);
      }, sp.bot);
    } else if (r.phase === "trickDone") {
      timer = setTimeout(() => collect(game), sp.trick);
    }
    return () => clearTimeout(timer);
  }, [game, home]);

  const startNew = () => { setSelected(null); setModal(null); setHome(false); setGame(newGame(settings)); };
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
      <div style={{ minHeight: "100%", background: "radial-gradient(circle at 50% 30%, " + C.felt + ", " + C.felt2 + ")", color: C.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          {[3, 1, 2, 0].map((s, i) => (
            <div key={s} style={{ transform: "rotate(" + (i - 1.5) * 8 + "deg)" }}><Card id={s * 9 + 8} deck={deck} w={58} /></div>
          ))}
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 1 }}>Schieber</div>
        <div style={{ color: C.dim, fontSize: 14, marginTop: -8 }}>Jassen gegen den Computer</div>
        {canResume && <button onClick={() => setHome(false)} style={{ ...btn(true), width: 240, marginTop: 10 }}>Weiterspielen ({game.scores[0]} : {game.scores[1]})</button>}
        <button onClick={canResume ? askNew : startNew} style={{ ...btn(!canResume), width: 240, marginTop: canResume ? 0 : 10 }}>Neues Spiel</button>
        <button onClick={() => setModal("settings")} style={{ ...btn(false), width: 240 }}>Einstellungen</button>
        <button onClick={() => setModal("images")} style={{ ...btn(false), width: 240 }}>Eigene Kartenbilder</button>
        <button onClick={() => setModal("rules")} style={{ ...btn(false), width: 240 }}>Regeln</button>
        <button onClick={() => setModal("info")} style={{ ...btn(false), width: 240 }}>Info & Statistik</button>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 10 }}>v{APP_VERSION}</div>
        {modal === "settings" && <SettingsModal settings={settings} setSettings={setSettings} onClose={() => setModal(null)} />}
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
  const W = Math.min(vw, 560);
  const cw = Math.max(44, Math.min(78, Math.floor((W - 16) / 5.4)));
  const step = hand.length > 1 ? Math.min(cw + 4, (W - 16 - cw) / (hand.length - 1)) : 0;
  const handW = cw + step * Math.max(0, hand.length - 1);
  const tw = Math.round(cw * 0.92), th = Math.round(tw * 1.5);

  const tapCard = (c) => {
    if (!myTurn) return;
    if (!legal.includes(c)) { say("Diese Karte ist nicht erlaubt", 1500); return; }
    if (settings.oneTap || selected === c) play(game, 0, c);
    else setSelected(c);
  };

  const trickPos = (p) => {
    const dx = { 0: 0, 1: tw * 0.78, 2: 0, 3: -tw * 0.78 }[p];
    const dy = { 0: th * 0.42, 1: 0, 2: -th * 0.42, 3: 0 }[p];
    const rot = { 0: 0, 1: -8, 2: 3, 3: 8 }[p];
    return "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg)";
  };
  const winnerIdx = r.phase === "trickDone" ? E.trickWinnerIdx(r.trick, r.trump) : -1;

  const status = (() => {
    if (r.phase === "choose") return r.decider === 0 ? (r.pushed ? "Partner hat geschoben – du wählst" : "Du bestimmst den Trumpf") : NAMES[r.decider] + " überlegt…" + (r.pushed ? " (geschoben)" : "");
    if (r.phase === "play") return myTurn ? (selected != null && !settings.oneTap ? "Nochmals tippen zum Spielen" : "Du bist dran") : NAMES[r.turn] + " ist dran";
    if (r.phase === "trickDone") return NAMES[r.trick[winnerIdx].p] + " sticht";
    return "";
  })();

  const Seat = ({ p, style }) => {
    const active = (r.phase === "play" && r.turn === p) || (r.phase === "choose" && r.decider === p);
    const isDecider = r.trump != null && r.decider === p;
    return (
      <div style={{ position: "absolute", ...style, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <div style={{ padding: "4px 10px", borderRadius: 20, background: active ? C.gold : "rgba(0,0,0,0.3)", color: active ? "#1a1200" : C.text, fontSize: 13, fontWeight: 700, border: "1px solid " + (E.team(p) === 0 ? "rgba(244,196,48,0.5)" : C.line) }}>
          {NAMES[p]}{isDecider ? " ★" : ""}
        </div>
        <div style={{ fontSize: 11, color: C.dim }}>{r.hands[p].length} Karten</div>
      </div>
    );
  };

  return wrap(
    <div style={{ height: "100%", background: "radial-gradient(ellipse at 50% 40%, " + C.felt + ", " + C.felt2 + ")", color: C.text, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Kopfzeile */}
      <div style={{ paddingTop: "env(safe-area-inset-top, 0px)", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid " + C.line }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", maxWidth: 560, margin: "0 auto", boxSizing: "border-box" }}>
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
      <div onClick={() => r.phase === "trickDone" && collect(game)} style={{ flex: 1, position: "relative", maxWidth: 560, width: "100%", margin: "0 auto", minHeight: 0 }}>
        <Seat p={2} style={{ top: 10, left: "50%", transform: "translateX(-50%)" }} />
        <Seat p={3} style={{ top: "42%", left: 8 }} />
        <Seat p={1} style={{ top: "42%", right: 8 }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
          {r.trick.map((e, i) => (
            <div key={e.c} style={{ position: "absolute", left: -tw / 2, top: -th / 2, transform: trickPos(e.p), zIndex: i, transition: "transform 0.2s", filter: winnerIdx >= 0 && i !== winnerIdx ? "brightness(0.8)" : "none" }}>
              <Card id={e.c} deck={deck} w={tw} trump={E.isTrump(e.c, r.trump)} />
            </div>
          ))}
        </div>
        {r.lastTrick && r.phase !== "roundEnd" && (
          <button onClick={(ev) => { ev.stopPropagation(); setModal("last"); }} style={{ position: "absolute", bottom: 8, right: 8, ...btn(false), padding: "6px 10px", fontSize: 12 }}>Letzter Stich</button>
        )}
        <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 12, color: C.dim }}>
          Runde {r.no}{r.trump != null ? " · Stiche " + r.tricks[0] + ":" + r.tricks[1] : ""}
        </div>
        {toast && (
          <div style={{ position: "absolute", top: "24%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", padding: "8px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600, maxWidth: "86%", textAlign: "center", zIndex: 20, pointerEvents: "none" }}>{toast}</div>
        )}
      </div>

      {/* Trumpfwahl */}
      {r.phase === "choose" && r.decider === 0 && (
        <div style={{ maxWidth: 560, width: "100%", margin: "0 auto", padding: "0 10px 8px", boxSizing: "border-box" }}>
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
      <div style={{ textAlign: "center", fontSize: 13, color: myTurn ? C.gold : C.dim, fontWeight: myTurn ? 700 : 400, minHeight: 18 }}>{status}</div>
      <div style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)", paddingTop: 18 }}>
        <div style={{ position: "relative", width: handW, height: Math.round(cw * 1.5), margin: "0 auto" }}>
          {hand.map((c, i) => (
            <div key={c} style={{ position: "absolute", left: i * step, top: 0, zIndex: i }}>
              <Card id={c} deck={deck} w={cw} onClick={() => tapCard(c)} dim={myTurn && !legal.includes(c)} raised={selected === c} trump={r.trump != null && E.isTrump(c, r.trump)} />
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
          ["Eigene Kartenbilder", () => setModal("images")],
          ["Regeln", () => setModal("rules")],
          ["Info & Statistik", () => setModal("info")],
          ["Zum Startbildschirm", () => setHome(true)],
        ]} />
      )}
      {r.phase === "roundEnd" && !modal && <RoundEndModal game={game} deck={deck} onNext={() => (game.over ? startNew() : setGame(nextRound(game)))} />}
      {modal === "tafel" && <TafelModal game={game} deck={deck} onClose={() => setModal(null)} />}
      {modal === "last" && r.lastTrick && <LastTrickModal lt={r.lastTrick} deck={deck} trump={r.trump} onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal settings={settings} setSettings={setSettings} inGame onClose={() => setModal(null)} />}
      {modal === "rules" && <RulesModal deck={deck} onClose={() => setModal(null)} />}
      {modal === "info" && <InfoModal stats={stats} onClose={() => setModal(null)} />}
      {imgModal}
    </div>
  );
}
