// Online-Spiel: Sichten auf den Spielstand (Sitz-Drehung) und Verbindung zwischen den Geräten.
// Aufbau: Der Host (Gerät, das den Tisch eröffnet) führt das Spiel wie bisher und sendet jedem
// Gast eine auf dessen Sitz gedrehte Sicht (Gast = immer Sitz 0 = «du», unten). Die Hände der
// anderen werden nicht gesendet. Gäste schicken nur Aktionen (Karte spielen, Trumpf, Schieben).
// Im Browser als window.JassOnline, in Node per require() testbar (node tests/online.js).
(function (root) {
  "use strict";

  // ── Sitz-Drehung ──
  // Sitz s aus Sicht von k: (s - k + 4) % 4. Teams (Sitz % 2) vertauschen sich bei ungeradem k.
  const rs = (s, k) => (s == null ? s : (s - k + 4) % 4);
  const ra = (a, k) => (a ? a.map((_, i) => a[(i + k) % 4]) : a); // Feld je Sitz
  const rt = (a, k) => (a ? (k % 2 ? [a[1], a[0]] : a.slice()) : a); // Feld je Team
  const rti = (t, k) => (t == null ? t : k % 2 ? 1 - t : t); // Team-Nummer
  const rtrick = (tr, k) => (tr ? tr.map((e) => ({ ...e, p: rs(e.p, k) })) : tr);

  function rotRec(rec, k) {
    if (!rec) return rec;
    return {
      ...rec,
      start: ra(rec.start, k),
      chooser: rs(rec.chooser, k), decider: rs(rec.decider, k),
      tricks: rec.tricks ? rec.tricks.map((t) => rtrick(t, k)) : rec.tricks,
      pile: rec.pile ? { ...rec.pile, p: rs(rec.pile.p, k), cards: rtrick(rec.pile.cards, k) } : rec.pile,
    };
  }

  function rotWeis(w, k) {
    if (!w) return w;
    return { ...w, byPlayer: ra(w.byPlayer, k), winnerTeam: rti(w.winnerTeam, k), pts: rt(w.pts, k) };
  }

  function rotRound(r, k, mask) {
    if (!r) return r;
    const over = r.phase === "roundEnd";
    const hid = (a) => ra(a, k).map((h, i) => (i === 0 || !mask ? h : h.map(() => -1)));
    const out = {
      ...r,
      hands: hid(r.hands),
      start: over ? ra(r.start, k) : hid(r.start),
      chooser: rs(r.chooser, k), decider: rs(r.decider, k), turn: rs(r.turn, k),
      trick: rtrick(r.trick, k),
      trickPts: rt(r.trickPts, k), tricks: rt(r.tricks, k),
      lastTrick: r.lastTrick ? { ...r.lastTrick, cards: rtrick(r.lastTrick.cards, k), winner: rs(r.lastTrick.winner, k) } : r.lastTrick,
      tricksLog: r.tricksLog ? r.tricksLog.map((t) => rtrick(t, k)) : r.tricksLog,
      weis: rotWeis(r.weis, k),
      weisSkip: ra(r.weisSkip, k),
      stoeck: rs(r.stoeck, k),
      result: r.result ? { ...r.result, trick: rt(r.result.trick, k), weis: rt(r.result.weis, k), stoeck: rt(r.result.stoeck, k), total: rt(r.result.total, k), match: rti(r.result.match, k) } : r.result,
      pile: r.pile ? { ...r.pile, p: rs(r.pile.p, k), cards: rtrick(r.pile.cards, k) } : r.pile,
      replayTricks: r.replayTricks ? r.replayTricks.map((t) => rtrick(t, k)) : r.replayTricks,
    };
    if (r.bedanktVon != null) out.bedanktVon = rti(r.bedanktVon, k);
    if (mask) { out.claimReport = null; out.weisPending = false; }
    return out;
  }

  // Sicht des Sitzes k auf das Spiel g. mask = Hände der anderen nicht mitsenden.
  function viewFor(g, k, opts) {
    opts = opts || {};
    const mask = opts.mask !== false;
    return {
      ...g,
      scores: rt(g.scores, k),
      history: g.history.map((h) => ({
        ...h, decider: rs(h.decider, k), total: rt(h.total, k), match: rti(h.match, k),
        parts: h.parts ? h.parts.map((p) => rt(p, k)) : h.parts, rec: rotRec(h.rec, k),
      })),
      nextChooser: rs(g.nextChooser, k),
      over: g.over ? { ...g.over, winner: rti(g.over.winner, k) } : g.over,
      berg: rti(g.berg, k),
      pend: g.pend ? { match: rt(g.pend.match, k), berg: rt(g.pend.berg, k) } : g.pend,
      lastRound: rotRec(g.lastRound, k),
      round: rotRound(g.round, k, mask),
      seatPerm: [0, 1, 2, 3],
      onlineNames: opts.names ? ra(opts.names, k) : null,
    };
  }

  // Wirkt eine Gast-Aktion (Sitz k, in Host-Zählung) im aktuellen Spielstand?
  // Gibt null (zulässig) oder einen Grund zurück.
  function checkAction(g, k, a, legalCards) {
    const r = g && g.round;
    if (!r) return "kein Spiel";
    if (a.t === "play") {
      if (r.phase !== "play" || r.turn !== k) return "nicht an der Reihe";
      if (!r.hands[k].includes(a.c)) return "Karte nicht in der Hand";
      if (!legalCards(r.hands[k], r.trick, r.trump).includes(a.c)) return "Karte nicht erlaubt";
      return null;
    }
    if (a.t === "choose") {
      if (r.phase !== "choose" || r.decider !== k) return "nicht an der Reihe";
      if (!(a.m >= 0 && a.m <= 5)) return "ungültiger Trumpf";
      return null;
    }
    if (a.t === "push") {
      if (r.phase !== "choose" || r.decider !== k || r.pushed) return "Schieben nicht möglich";
      return null;
    }
    return "unbekannt";
  }

  // ── Verbindung ──
  // Transport-Schnittstelle (austauschbar, z.B. für Tests):
  //   host(cb) → { code, close(), send(id, msg), onGuest(fn(id)), onMsg(fn(id, msg)), onLeave(fn(id)) }
  //   join(code) → { send(msg), onMsg(fn(msg)), onClose(fn()), close() }  (Promise)
  const PEER_SRC = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
  const PREFIX = "bea-jass-";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

  function loadPeer() {
    if (root.Peer) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = PEER_SRC; s.onload = res; s.onerror = () => rej(new Error("Verbindungsdienst nicht erreichbar"));
      document.head.appendChild(s);
    });
  }

  const peerTransport = {
    async host() {
      await loadPeer();
      for (let i = 0; i < 6; i++) {
        const code = newCode();
        const peer = await new Promise((res, rej) => {
          const p = new root.Peer(PREFIX + code);
          p.on("open", () => res(p));
          p.on("error", (e) => rej(e));
        }).catch((e) => (e && e.type === "unavailable-id" ? null : Promise.reject(e)));
        if (!peer) continue;
        const conns = {}; const h = { guest: [], msg: [], leave: [] };
        peer.on("connection", (c) => {
          c.on("open", () => { conns[c.peer] = c; h.guest.forEach((f) => f(c.peer)); });
          c.on("data", (m) => h.msg.forEach((f) => f(c.peer, m)));
          const gone = () => { if (conns[c.peer]) { delete conns[c.peer]; h.leave.forEach((f) => f(c.peer)); } };
          c.on("close", gone); c.on("error", gone);
        });
        return {
          code,
          send: (id, m) => { try { conns[id] && conns[id].send(m); } catch (e) { /* Verbindung weg */ } },
          onGuest: (f) => h.guest.push(f), onMsg: (f) => h.msg.push(f), onLeave: (f) => h.leave.push(f),
          close: () => { try { peer.destroy(); } catch (e) { /* */ } },
        };
      }
      throw new Error("Kein freier Tischcode gefunden");
    },
    async join(code) {
      await loadPeer();
      const peer = await new Promise((res, rej) => { const p = new root.Peer(); p.on("open", () => res(p)); p.on("error", rej); });
      const conn = peer.connect(PREFIX + code.toUpperCase().trim(), { reliable: true });
      const h = { msg: [], close: [] };
      await new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error("Tisch nicht gefunden")), 12000);
        conn.on("open", () => { clearTimeout(t); res(); });
        peer.on("error", (e) => { clearTimeout(t); rej(new Error(e && e.type === "peer-unavailable" ? "Tisch nicht gefunden" : "Verbindungsfehler")); });
      });
      conn.on("data", (m) => h.msg.forEach((f) => f(m)));
      conn.on("close", () => h.close.forEach((f) => f()));
      return {
        send: (m) => { try { conn.send(m); } catch (e) { /* */ } },
        onMsg: (f) => h.msg.push(f), onClose: (f) => h.close.push(f),
        close: () => { try { peer.destroy(); } catch (e) { /* */ } },
      };
    },
  };

  // Test-Transport im selben Browser (BroadcastChannel): window.JASS_NET = "mock"
  const mockTransport = {
    async host() {
      const code = newCode();
      const ch = new BroadcastChannel("jass-mock-" + code);
      const h = { guest: [], msg: [], leave: [] };
      ch.onmessage = (ev) => {
        const m = ev.data;
        if (m.to !== "host") return;
        if (m.m.t === "__join") h.guest.forEach((f) => f(m.from));
        else if (m.m.t === "__bye") h.leave.forEach((f) => f(m.from));
        else h.msg.forEach((f) => f(m.from, m.m));
      };
      return {
        code,
        send: (id, m) => ch.postMessage({ to: id, from: "host", m }),
        onGuest: (f) => h.guest.push(f), onMsg: (f) => h.msg.push(f), onLeave: (f) => h.leave.push(f),
        close: () => ch.close(),
      };
    },
    async join(code) {
      const id = "g" + Math.random().toString(36).slice(2, 8);
      const ch = new BroadcastChannel("jass-mock-" + code.toUpperCase().trim());
      const h = { msg: [], close: [] };
      ch.onmessage = (ev) => { if (ev.data.to === id) h.msg.forEach((f) => f(ev.data.m)); };
      ch.postMessage({ to: "host", from: id, m: { t: "__join" } });
      return {
        send: (m) => ch.postMessage({ to: "host", from: id, m }),
        onMsg: (f) => h.msg.push(f), onClose: (f) => h.close.push(f),
        close: () => { ch.postMessage({ to: "host", from: id, m: { t: "__bye" } }); ch.close(); },
      };
    },
  };

  const transport = () => (root.JASS_NET === "mock" ? mockTransport : peerTransport);

  const api = { rs, ra, rt, rti, viewFor, checkAction, transport, newCode };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JassOnline = api;
})(typeof window !== "undefined" ? window : this);
