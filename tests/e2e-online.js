// Browser-Test für das Online-Spiel: Host + 2 Gäste im selben Browser (Test-Transport über BroadcastChannel).
// Prüft: Tisch eröffnen/beitreten, Runde durchspielen (Trumpfwahl + Karten), gleiche Punkte bei allen
// (Gegner-Gast mit vertauschten Teams), nächste Runde durch den Host, Gast verlässt den Tisch.
//
// Aufruf:  node tests/e2e-online.js
// Voraussetzung: `playwright` (require('playwright')) ist installiert. React/Babel kommen vom CDN; ohne Netz
// per Umgebungsvariable JASS_NM auf einen Ordner node_modules zeigen (mit react, react-dom, @babel/standalone).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const NM = process.env.JASS_NM ? path.resolve(process.env.JASS_NM) : null;
const TYPES = { ".html": "text/html", ".js": "application/javascript", ".jsx": "text/plain", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+$/, "/index.html"));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

function check(ok, msg) {
  console.log((ok ? "ok      " : "FEHLER  ") + msg);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const srv = await serve();
  const url = "http://127.0.0.1:" + srv.address().port + "/index.html";
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const errs = [];
  const open = async (name) => {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(name + ": " + e.message));
    if (NM) {
      await p.route("https://cdn.jsdelivr.net/**", (r) => {
        const u = r.request().url();
        const m = { "react.production": "react/umd/react.production.min.js", "react-dom.production": "react-dom/umd/react-dom.production.min.js", "babel.min": "@babel/standalone/babel.min.js" };
        const k = Object.keys(m).find((k) => u.includes(k));
        k ? r.fulfill({ path: path.join(NM, m[k]), contentType: "application/javascript" }) : r.abort();
      });
    }
    await p.addInitScript(() => { window.JASS_NET = "mock"; });
    await p.goto(url);
    await p.waitForSelector("text=Online spielen");
    return p;
  };
  const host = await open("host"), g1 = await open("gast1"), g2 = await open("gast2");

  // Tisch eröffnen, beide Gäste treten bei
  await host.click("text=Online spielen");
  await host.fill('input[placeholder="Name"]', "Heidi");
  await host.click("text=Tisch eröffnen");
  await host.waitForSelector("text=Tischcode");
  const code = await host.evaluate(() => document.body.innerText.match(/\b[A-Z2-9]{5}\b/)[0]);
  check(/^[A-Z2-9]{5}$/.test(code), "Tischcode " + code);
  for (const [p, name] of [[g1, "Gustav"], [g2, "Gerda"]]) {
    await p.click("text=Online spielen");
    await p.fill('input[placeholder="Name"]', name);
    await p.fill('input[placeholder="CODE"]', code);
    await p.click('button:has-text("Beitreten")');
    await p.waitForSelector("text=Verbunden");
    await host.waitForSelector("text=" + name);
  }
  await host.click("text=Spiel starten");
  await g1.waitForSelector("text=Runde", { timeout: 8000 });
  await g2.waitForSelector("text=Runde", { timeout: 8000 });
  check(true, "Spiel gestartet, beide Gäste sehen den Tisch");

  // Treiber: Trumpf wählen (erster Knopf = Eicheln) bzw. erste erlaubte Karte spielen
  const step = async (p) => {
    const t = await p.evaluate(() => document.body.innerText);
    if (/bestimmst den Trumpf|du wählst/.test(t)) { await p.mouse.click(33, 668); return; }
    if (/Du bist dran/.test(t)) {
      const n = await p.evaluate(() => document.querySelectorAll('[data-hand="1"] > div').length);
      for (let i = 0; i < n; i++) {
        const before = await p.evaluate(() => document.querySelectorAll('[data-hand="1"] > div').length);
        await p.locator('[data-hand="1"] > div').nth(i).click({ force: true }).catch(() => {});
        await p.waitForTimeout(60);
        const after = await p.evaluate(() => document.querySelectorAll('[data-hand="1"] > div').length);
        if (after < before) return;
      }
    }
  };
  let end = false;
  for (let i = 0; i < 500 && !end; i++) {
    await step(host); await step(g1); await step(g2);
    await host.waitForTimeout(100);
    end = await g1.evaluate(() => /Der Host startet/.test(document.body.innerText));
  }
  check(end, "Runde zu Ende gespielt (Gast sieht «Der Host startet …»)");

  const sc = (p) => p.evaluate(() => (document.body.innerText.match(/Wir\s*(\d+)[\s\S]*?Gegner\s*(\d+)/) || []).slice(1, 3).join(":"));
  const [a, b, c] = [await sc(host), await sc(g1), await sc(g2)];
  const sw = (s) => s.split(":").reverse().join(":");
  check(a === b, "Host und Partner-Gast: gleiche Punkte (" + a + " / " + b + ")");
  check(sw(a) === c, "Gegner-Gast: Teams vertauscht (" + c + ")");

  // Nächste Runde durch den Host
  await host.click('button:has-text("Nächste Runde")');
  await g1.waitForFunction(() => /Runde 2/.test(document.body.innerText), null, { timeout: 8000 }).then(() => check(true, "Runde 2 beim Gast"), () => check(false, "Runde 2 beim Gast"));

  // Gast 2 verlässt den Tisch: Host bekommt einen Hinweis, der Computer übernimmt
  await g2.evaluate(() => { window.confirm = () => true; });
  await g2.click("text=☰");
  await g2.click("text=Tisch verlassen");
  await host.waitForTimeout(800);
  check(await host.evaluate(() => /Gerda hat den Tisch verlassen/.test(document.body.innerText)), "Host sieht den Hinweis zum verlassenen Platz");

  check(errs.length === 0, "keine JS-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await browser.close();
  srv.close();
  console.log(process.exitCode ? "online e2e: FEHLER" : "online e2e: alles ok");
})().catch((e) => { console.error(e); process.exit(1); });
