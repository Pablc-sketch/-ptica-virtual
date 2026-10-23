// Prueba UI con catálogo poblado contra un Supabase simulado (no toca ninguna base real).
// Uso: npm run test:e2e   (construye, levanta mock + next start y ejecuta Playwright)
import { spawn, execSync } from "node:child_process";
import { chromium } from "playwright-core";
import { startMock, quoteCalls, rx, control, GOOD_PASSWORD } from "./mock-supabase.mjs";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

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
// Espera a que React hidrate un elemento antes de interactuar (evita actuar sobre HTML aún inerte).
const hydrated = (page, sel) =>
  page.waitForFunction((q) => { const el = document.querySelector(q); return el && Object.keys(el).some((k) => k.startsWith("__reactProps")); }, sel, { timeout: 15000 });
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "OK  " : "FAIL"} ${name} ${extra}`); };

execSync("npx next build", { env, stdio: "ignore" });
const mock = await startMock(MOCK);
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(APP)], { env, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 6000));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  for (const [label, vp] of [["móvil", { width: 390, height: 844 }], ["escritorio", { width: 1440, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const base = `http://localhost:${APP}`;
    const noOverflow = async (p) => !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));

    control.productsDown = true;
    await page.goto(`${base}/marcos`, { waitUntil: "networkidle" });
    const down = await page.textContent("main");
    check(`${label}: fallo de base en catálogo NO se muestra como catálogo vacío`, down.includes("No pudimos cargar el catálogo") && !down.includes("Estamos preparando el catálogo"));
    control.productsDown = false;
    await page.goto(`${base}/marcos`, { waitUntil: "networkidle" });
    await hydrated(page, "#q");
    check(`${label}: catálogo muestra 3 marcos`, (await page.locator("article").count()) === 3);
    check(`${label}: catálogo sin desborde`, await noOverflow());
    check(`${label}: precio rotulado "solo marco"`, (await page.locator("article").first().textContent()).includes("solo marco"));

    // Filtros: la forma va en botones; material, favoritos y búsqueda viven en "Más filtros" (plegado en móvil).
    const openFilters = async () => { if (!(await page.locator("#material").isVisible())) await page.locator(".catalog-filter-toggle").click(); };
    await page.getByRole("group", { name: "Forma" }).getByRole("button", { name: "Rectangular" }).click();
    await openFilters();
    await page.selectOption("#material", "Acetato");
    check(`${label}: forma+material combinados -> Cedro`, (await page.locator("article").count()) === 1 && (await page.locator("article").first().textContent()).includes("Cedro"));
    await page.fill("#q", "zzz");
    check(`${label}: sin resultados muestra estado vacío`, (await page.textContent("main")).includes("Ningún marco coincide"));
    await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
    check(`${label}: limpiar filtros restaura 3`, (await page.locator("article").count()) === 3);

    await page.getByRole("button", { name: /Guardar Ámbar en favoritos/ }).click();
    await page.reload({ waitUntil: "networkidle" });
    await hydrated(page, "#q");
    await openFilters();
    check(`${label}: favorito persiste tras recargar`, await page.getByRole("button", { name: /Quitar Ámbar de favoritos/ }).count() === 1);
    await page.getByLabel("Solo favoritos").check();
    check(`${label}: solo favoritos -> 1`, (await page.locator("article").count()) === 1);
    await page.getByLabel("Solo favoritos").uncheck();

    await page.getByRole("button", { name: "+ Guardar en selección" }).nth(1).click();
    check(`${label}: selección actualiza contador del header`, (await page.locator("header").textContent()).includes("Selección1"));

    await page.goto(`${base}/marcos/ambar`, { waitUntil: "networkidle" });
    await hydrated(page, "main button");
    const main = await page.textContent("main");
    check(`${label}: ficha con medidas y "solo el marco"`, main.includes("48 mm") && main.includes("solo marco"));
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
    await hydrated(page, 'input[type="number"]');
    check(`${label}: cotizar lista la selección con total`, (await page.textContent("main")).includes("Basalto"));
    await page.fill('input[type="number"]', "2");
    check(`${label}: total refleja cantidad (2 × $50.000)`, (await page.textContent("main")).replace(/\s/g, " ").includes("100.000"));
    check(`${label}: cotizar sin cuenta muestra el formulario (sin obligar a registrarse)`, (await page.locator('input[name="name"]').count()) === 1);
    await hydrated(page, 'input[name="name"]');
    check(`${label}: despacho sin cuenta pide la dirección en el formulario`, (await page.locator('input[name="addr_street"]').count()) === 1);
    await page.getByLabel("Retiro coordinado (te escribimos para acordarlo)").check();
    await page.fill('input[name="name"]', "Ana Pérez");
    await page.fill('input[name="email"]', "ana@correo.cl");
    await page.check('input[name="consent"]');
    const before = quoteCalls.length;
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    await page.waitForSelector("text=Recibimos tu cotización", { timeout: 8000 }).catch(() => {});
    check(`${label}: cotización enviada muestra confirmación real`, (await page.textContent("main")).includes("Recibimos tu cotización"));
    const sent = quoteCalls.at(-1);
    check(`${label}: payload sin precios del cliente`, quoteCalls.length === before + 1 && JSON.stringify(sent.p_items) === JSON.stringify([{ product_id: "22222222-2222-4222-8222-222222222222", quantity: 2 }]));
    check(`${label}: la cotización registra la forma de entrega`, String(sent?.p_notes ?? "").includes("Entrega: retiro coordinado."));

    // ---- Menú móvil ----
    if (label === "móvil") {
      await page.goto(`${base}/`, { waitUntil: "networkidle" });
      await hydrated(page, 'button[aria-controls="menu-movil"]');
      const burger = page.locator('button[aria-controls="menu-movil"]');
      await burger.click();
      check(`${label}: menú se abre (aria-expanded)`, (await burger.getAttribute("aria-expanded")) === "true");
      await page.locator("#menu-movil").getByRole("link", { name: "Probador" }).click();
      await page.waitForURL("**/probador");
      check(`${label}: menú se cierra al navegar`, (await page.locator("#menu-movil").count()) === 0);
      await burger.click();
      await page.keyboard.press("Escape");
      check(`${label}: Escape cierra el menú y devuelve el foco al botón`, (await page.locator("#menu-movil").count()) === 0 && (await page.evaluate(() => document.activeElement?.getAttribute("aria-controls"))) === "menu-movil");
      await burger.click();
      await page.mouse.click(200, 600);
      check(`${label}: clic fuera cierra el menú`, (await page.locator("#menu-movil").count()) === 0);
    }

    // ---- Cuenta y recetas ----
    await page.context().clearCookies();
    await page.goto(`${base}/mi-cuenta`, { waitUntil: "networkidle" });
    await hydrated(page, 'input[name="email"]');
    check(`${label}: /mi-cuenta sin sesión muestra ingreso y no exige cuenta para explorar`, (await page.textContent("main")).includes("No necesitas cuenta para explorar"));
    check(`${label}: /mi-cuenta sin desborde`, await noOverflow());
    const anonPost = await page.request.post(`${base}/api/recetas`, { headers: { origin: base }, multipart: { consent: "true" } });
    const anonGet = await page.request.get(`${base}/api/recetas/bbbbbbbb-bbbb-4bbb-8bbb-000000000001`);
    const xorigin = await page.request.post(`${base}/api/recetas`, { headers: { origin: "https://evil.example" }, multipart: { consent: "true" } });
    check(`${label}: API recetas anónima -> 401 (POST y GET) y origen ajeno -> 403`, anonPost.status() === 401 && anonGet.status() === 401 && xorigin.status() === 403, `(${anonPost.status()}/${anonGet.status()}/${xorigin.status()})`);
    await page.fill('input[name="email"]', "cliente@test.cl");
    await page.fill('input[name="password"]', "incorrecta");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForSelector("text=Correo o contraseña incorrectos");
    check(`${label}: credenciales malas -> mensaje único`, true);
    await page.fill('input[name="email"]', "cliente@test.cl");
    await page.fill('input[name="password"]', GOOD_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForSelector("text=Enviar mi receta");
    check(`${label}: ingreso correcto muestra la cuenta`, (await page.textContent("main")).includes("cliente@test.cl"));
    check(`${label}: no muestra receta ni cotización ajenas (filtro de dueño)`, (await page.getByRole("button", { name: /Abrir \(enlace/ }).count()) === 0 && (await page.locator('select[name="quote_id"] option').count()) === 2, `(recetas visibles=${await page.getByRole("button", { name: /Abrir \(enlace/ }).count()}, opciones=${await page.locator('select[name="quote_id"] option').count()})`);
    await hydrated(page, 'input[name="file"]');
    const png = "/tmp/e2e-receta.png";
    writeFileSync(png, Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4", "hex"));
    const txt = "/tmp/e2e-receta.txt";
    writeFileSync(txt, "no soy una receta");
    const rxBefore = rx.length;
    await page.setInputFiles('input[name="file"]', txt);
    await page.check('input[name="consent"]');
    await page.getByRole("button", { name: "Enviar receta" }).click();
    await page.waitForSelector('[role="alert"]');
    check(`${label}: archivo no permitido se rechaza`, (await page.textContent("main")).includes("Usa JPG, PNG, WebP o PDF") && rx.length === rxBefore);
    await page.setInputFiles('input[name="file"]', png);
    await page.getByRole("button", { name: "Enviar receta" }).click();
    await page.waitForSelector("text=Recibimos tu receta");
    check(`${label}: receta válida enviada (pendiente de revisión, no confirmada)`, rx.length === rxBefore + 1 && (await page.textContent("main")).includes("no está confirmada"));
    await page.waitForSelector("text=Pendiente de revisión por una persona");
    await hydrated(page, "main li button");
    await page.waitForTimeout(1000); // router.refresh() reemplaza el nodo: esperar a que se estabilice
    const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: /Abrir \(enlace/ }).first().click()]);
    await popup.waitForURL(/object\/sign\/prescriptions/, { timeout: 8000 }).catch(() => {});
    check(`${label}: abrir receta usa URL firmada temporal`, /object\/sign\/prescriptions/.test(popup.url()), popup.url().slice(0, 90));
    await popup.close();
    // ---- Borrado propio ----
    await hydrated(page, "main li button");
    await page.getByRole("button", { name: "Eliminar" }).first().click();
    check(`${label}: eliminar pide confirmación y enfoca "Sí, eliminar"`, (await page.getByText("¿Eliminar esta receta definitivamente?").count()) === 1 && (await page.evaluate(() => document.activeElement?.textContent)) === "Sí, eliminar");
    await page.getByRole("button", { name: "Cancelar" }).click();
    check(`${label}: cancelar devuelve el foco a "Eliminar" y no borra`, (await page.evaluate(() => document.activeElement?.textContent)) === "Eliminar" && rx.some((r) => r.user_id === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"));
    control.failStorageDelete = 1;
    await page.getByRole("button", { name: "Eliminar" }).first().click();
    await page.getByRole("button", { name: "Sí, eliminar" }).click();
    await page.waitForSelector("text=Tu receta sigue guardada");
    check(`${label}: si falla Storage el registro se conserva y se puede reintentar`, rx.some((r) => r.user_id === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"));
    // Reintento: remove() sigue fallando pero el archivo ya no existe -> se cierra el registro (no depende de que remove sea idempotente)
    control.failStorageDelete = 1;
    control.objectMissing = true;
    await page.getByRole("button", { name: "Sí, eliminar" }).click();
    await page.waitForSelector("text=Aún no has enviado ninguna receta");
    control.objectMissing = false;
    check(`${label}: reintento con archivo ya inexistente cierra el registro; la receta ajena queda intacta`, !rx.some((r) => r.user_id === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") && rx.some((r) => r.id.endsWith("0000000000ff")));
    const delAnon = await page.request.delete(`${base}/api/recetas/bbbbbbbb-bbbb-4bbb-8bbb-0000000000ff`, { headers: { origin: "https://evil.example" } });
    check(`${label}: DELETE con origen ajeno -> 403`, delAnon.status() === 403);
    const delForeign = await page.request.delete(`${base}/api/recetas/bbbbbbbb-bbbb-4bbb-8bbb-0000000000ff`, { headers: { origin: base } });
    check(`${label}: no se puede borrar la receta de otra persona (404)`, delForeign.status() === 404 && rx.some((r) => r.id.endsWith("0000000000ff")), `(${delForeign.status()})`);

    // ---- Caída del servicio de acceso: no se confunde con "sin sesión" ----
    control.authDown = true;
    await page.goto(`${base}/mi-cuenta`, { waitUntil: "networkidle" });
    check(`${label}: servicio de acceso caído -> aviso, no formulario de ingreso`, (await page.textContent("main")).includes("No pudimos verificar tu sesión") && (await page.locator('input[name="password"]').count()) === 0);
    const post503 = await page.request.post(`${base}/api/recetas`, { headers: { origin: base }, multipart: { consent: "true" } });
    check(`${label}: API recetas con acceso caído -> 503 (no 401)`, post503.status() === 503, `(${post503.status()})`);
    control.authDown = false;

    await page.goto(`${base}/mi-cuenta`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForSelector("text=No necesitas cuenta para explorar");
    check(`${label}: cerrar sesión vuelve al ingreso`, true);
    const priv = await page.goto(`${base}/privacidad`, { waitUntil: "networkidle" });
    check(`${label}: privacidad se declara borrador y lista pendientes`, priv.status() === 200 && (await page.textContent("main")).includes("borrador pendiente de revisión"));
    check(`${label}: privacidad sin desborde`, await noOverflow());

    // ---- Teclado: el primer Tab llega al enlace "Saltar al contenido" y lleva al contenido ----
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    check(`${label}: primer Tab -> "Saltar al contenido" visible`, (await page.evaluate(() => document.activeElement?.textContent)) === "Saltar al contenido" && (await page.locator("a", { hasText: "Saltar al contenido" }).boundingBox())?.y >= 0);
    await page.keyboard.press("Enter");
    check(`${label}: el enlace de salto navega a #contenido`, page.url().endsWith("#contenido"));

    // ---- Accesibilidad (axe-core: solo se exigen violaciones serious/critical) ----
    for (const path of ["/", "/marcos", "/marcos/ambar", "/marcos/basalto", "/cotizar", "/cristales", "/como-funciona", "/ayuda", "/privacidad", "/mi-cuenta", "/admin/login"]) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}[${v.nodes.length}]: ${v.nodes[0].target.join(" ")}`));
      check(`${label}: axe ${path}`, violations.length === 0, violations.join(" | "));
    }
    await ctx.close();
  }

  // ---- Estilos calculados, anchos de contenedor y encabezado en 5 anchos (320/390/768/1024/1440) ----
  const PAGES = ["/", "/marcos", "/marcos/ambar", "/cotizar", "/cristales", "/como-funciona", "/ayuda", "/privacidad", "/mi-cuenta", "/admin/login"];
  for (const w of [320, 390, 768, 1024, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    const base = `http://localhost:${APP}`;
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    const st = await page.evaluate(() => {
      const cs = (e) => getComputedStyle(e);
      const rects = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width }; };
      const collect = (rules) => rules.flatMap((r) => [r.selectorText ?? "", ...(r.cssRules ? collect([...r.cssRules]) : [])]);
      const sel = collect([...document.styleSheets].flatMap((s) => [...s.cssRules]));
      const hdr = document.querySelector("header .container-page");
      const kids = [...hdr.children].filter((c) => cs(c).display !== "none").map(rects);
      return {
        paper: cs(document.documentElement).getPropertyValue("--paper").trim(),
        bodyBg: cs(document.body).backgroundColor,
        btnBg: cs(document.querySelector(".hero-copy .btn")).backgroundColor,
        container: Math.round(hdr.getBoundingClientRect().width),
        hdrRight: Math.max(...kids.map((k) => k.r)),
        gaps: kids.slice(1).map((k, i) => k.l - kids[i].r),
        inCSSOM: [".container-page", ".btn", ":root"].every((s) => sel.some((x) => x.includes(s))),
        burger: document.querySelector('button[aria-controls="menu-movil"]').getClientRects().length > 0,
        nav: document.querySelector('nav[aria-label="Principal"]').getClientRects().length > 0,
      };
    });
    check(`${w}px: --paper #fbf8f3 y fondo del body calculado`, st.paper === "#fbf8f3" && st.bodyBg === "rgb(251, 248, 243)", JSON.stringify([st.paper, st.bodyBg]));
    check(`${w}px: botón naranjo oscuro #b65432`, st.btnBg === "rgb(182, 84, 50)", st.btnBg);
    check(`${w}px: contenedor = min(1240, viewport-40)`, st.container === Math.min(1240, w - 40), `(${st.container})`);
    check(`${w}px: CSS servido contiene .container-page, .btn y :root`, st.inCSSOM);
    check(`${w}px: encabezado dentro del contenedor y sin solapes (holgura ≥ 4px)`, st.hdrRight <= w - 20 + 1 && st.gaps.every((g) => g >= 4), `(derecha=${Math.round(st.hdrRight)} máx=${w - 20}, huecos=${st.gaps.map(Math.round)})`);
    check(`${w}px: navegación completa solo desde 1024 y menú móvil debajo`, w >= 1024 ? st.nav && !st.burger : !st.nav && st.burger, JSON.stringify([st.nav, st.burger]));
    const overflowing = [];
    for (const path of PAGES) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) overflowing.push(path);
    }
    check(`${w}px: sin desborde horizontal en ${PAGES.length} páginas`, overflowing.length === 0, overflowing.join(" "));
    await ctx.close();
  }

  // ---- Rendimiento: three/R3F no se descarga hasta pulsar "Vista 3D" ----
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const base = `http://localhost:${APP}`;
    const js = new Map();
    page.on("response", async (r) => {
      if (r.request().resourceType() === "script") js.set(r.url(), await r.text().catch(() => ""));
    });
    await page.goto(`${base}/marcos/ambar`, { waitUntil: "networkidle" });
    await hydrated(page, "main button");
    const kb = () => Math.round([...js.values()].reduce((a, t) => a + Buffer.byteLength(t), 0) / 1024);
    const hasThree = () => [...js.values()].some((t) => t.includes("WebGLRenderer"));
    const beforeKb = kb();
    check("rendimiento: la ficha NO descarga three.js antes de pedir el 3D", !hasThree(), `(JS inicial ${beforeKb} KB sin comprimir)`);
    check("rendimiento: la ficha NO descarga el cliente de Supabase (se carga solo en /cotizar)", ![...js.values()].some((t) => t.includes("GoTrueClient")), `(JS ${beforeKb} KB)`);
    await page.getByRole("button", { name: "Vista 3D" }).click();
    await page.waitForTimeout(3000);
    check("rendimiento: three.js se descarga solo tras pulsar Vista 3D", hasThree(), `(JS tras 3D ${kb()} KB)`);
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
