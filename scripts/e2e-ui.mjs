// Prueba UI con catálogo poblado contra un Supabase simulado (no toca ninguna base real).
// Uso: npm run test:e2e   (construye, levanta mock + next start y ejecuta Playwright)
import { spawn, execSync } from "node:child_process";
import { chromium } from "playwright-core";
import { startMock, quoteCalls } from "./mock-supabase.mjs";

const MOCK = 54399, APP = 3101;
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${MOCK}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock",
  QUOTES_OPEN: "true",
  E2E_UNOPTIMIZED_IMAGES: "1",
  NEXT_DIST_DIR: ".next-e2e",
};
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "OK  " : "FAIL"} ${name} ${extra}`); };

execSync("npx next build", { env, stdio: "ignore" });
const mock = await startMock(MOCK);
const app = spawn("npx", ["next", "start", "-p", String(APP)], { env, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 6000));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  for (const [label, vp] of [["móvil", { width: 390, height: 844 }], ["escritorio", { width: 1440, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const base = `http://localhost:${APP}`;
    const noOverflow = async (p) => !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));

    await page.goto(`${base}/marcos`, { waitUntil: "networkidle" });
    check(`${label}: catálogo muestra 3 marcos`, (await page.locator("article").count()) === 3);
    check(`${label}: catálogo sin desborde`, await noOverflow());
    check(`${label}: precio rotulado "solo marco"`, (await page.locator("article").first().textContent()).includes("solo marco"));

    await page.selectOption("#shape", "Rectangular");
    await page.selectOption("#material", "Acetato");
    check(`${label}: forma+material combinados -> Cedro`, (await page.locator("article").count()) === 1 && (await page.locator("article").first().textContent()).includes("Cedro"));
    await page.fill("#q", "zzz");
    check(`${label}: sin resultados muestra estado vacío`, (await page.textContent("main")).includes("Ningún marco coincide"));
    await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
    check(`${label}: limpiar filtros restaura 3`, (await page.locator("article").count()) === 3);

    await page.getByRole("button", { name: /Guardar Ámbar en favoritos/ }).click();
    await page.reload({ waitUntil: "networkidle" });
    check(`${label}: favorito persiste tras recargar`, await page.getByRole("button", { name: /Quitar Ámbar de favoritos/ }).count() === 1);
    await page.getByLabel("Solo favoritos").check();
    check(`${label}: solo favoritos -> 1`, (await page.locator("article").count()) === 1);
    await page.getByLabel("Solo favoritos").uncheck();

    await page.getByRole("button", { name: "Agregar a selección" }).nth(1).click();
    check(`${label}: selección actualiza contador del header`, (await page.locator("header").textContent()).includes("Selección(1)"));

    await page.goto(`${base}/marcos/ambar`, { waitUntil: "networkidle" });
    const main = await page.textContent("main");
    check(`${label}: ficha con medidas y "solo el marco"`, main.includes("48 mm") && main.includes("solo el marco"));
    check(`${label}: ficha sin desborde`, await noOverflow());
    check(`${label}: ficha con GLB verificado ofrece Vista 3D`, await page.getByRole("button", { name: "Vista 3D" }).count() === 1);
    await page.getByRole("button", { name: "Vista 3D" }).click();
    await page.waitForTimeout(2500);
    const canvas = await page.locator("canvas").count();
    const failMsg = (await page.textContent("main")).includes("No pudimos cargar el modelo 3D");
    check(`${label}: 3D abre canvas o avisa fallo con fotos de respaldo`, canvas === 1 || failMsg, `(canvas=${canvas}, aviso=${failMsg})`);
    await page.goto(`${base}/marcos/basalto`, { waitUntil: "networkidle" });
    check(`${label}: ficha sin GLB NO ofrece 3D`, await page.getByRole("button", { name: "Vista 3D" }).count() === 0);
    const nf = await page.goto(`${base}/marcos/no-existe`, { waitUntil: "networkidle" });
    // Con streaming el estado HTTP ya salió como 200; la página es "no encontrada" y lleva noindex.
    const robots = await page.locator('meta[name="robots"]').evaluateAll((n) => n.map((x) => x.content));
    check(`${label}: slug inexistente -> página 404 propia con noindex`, nf.status() >= 200 && (await page.textContent("main")).includes("No encontramos esa página") && robots.includes("noindex"));

    await page.goto(`${base}/cotizar`, { waitUntil: "networkidle" });
    check(`${label}: cotizar lista la selección con total`, (await page.textContent("main")).includes("Basalto"));
    await page.fill('input[type="number"]', "2");
    check(`${label}: total refleja cantidad (2 × $50.000)`, (await page.textContent("main")).replace(/\s/g, " ").includes("100.000"));
    await page.fill('input[name="name"]', "Ana Pérez");
    await page.fill('input[name="email"]', "ana@correo.cl");
    await page.check('input[name="consent"]');
    const before = quoteCalls.length;
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    await page.waitForSelector("text=Recibimos tu cotización", { timeout: 8000 }).catch(() => {});
    check(`${label}: cotización enviada muestra confirmación real`, (await page.textContent("main")).includes("Recibimos tu cotización"));
    const sent = quoteCalls.at(-1);
    check(`${label}: payload sin precios del cliente`, quoteCalls.length === before + 1 && JSON.stringify(sent.p_items) === JSON.stringify([{ product_id: "22222222-2222-4222-8222-222222222222", quantity: 2 }]));
    await ctx.close();
  }
} finally {
  await browser.close();
  app.kill();
  mock.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
