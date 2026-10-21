// QA de humo en navegador real: rutas 200, sin desborde horizontal 390x844 y 1440x900, vacíos honestos.
// Uso: npm run build && npx next start -p 3100 & node scripts/qa-visual.mjs
import { chromium } from "playwright-core";
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const results = [];
for (const [label, vp] of [["movil", { width: 390, height: 844 }], ["escritorio", { width: 1440, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  for (const path of ["/", "/marcos", "/cristales", "/como-funciona", "/ayuda", "/cotizar", "/admin/login"]) {
    const res = await page.goto(base + path, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    results.push(`${label} ${path} -> ${res.status()} overflow=${overflow}`);
  }
  await page.goto(base + "/marcos", { waitUntil: "networkidle" });
  results.push(`${label} marcos vacío honesto: ${(await page.textContent("main")).includes("Estamos preparando el catálogo")}`);
  await page.goto(base + "/cotizar", { waitUntil: "networkidle" });
  results.push(`${label} cotizar vacío: ${(await page.textContent("main")).includes("Tu selección está vacía")}`);
  const r = await page.goto(base + "/admin", { waitUntil: "networkidle" });
  results.push(`${label} /admin sin sesión -> ${page.url()}`);
  const api = await page.request.post(base + "/api/cotizaciones", { data: { name: "Ana", email: "a@b.cl", items: [] } });
  results.push(`${label} POST cotizaciones (cerradas) -> ${api.status()}`);
  if (label === "movil") await page.screenshot({ path: "/tmp/home-movil.png" });
  else { await page.goto(base + "/", { waitUntil: "networkidle" }); await page.screenshot({ path: "/tmp/home-escritorio.png" }); }
  await ctx.close();
}
await browser.close();
console.log(results.join("\n"));
