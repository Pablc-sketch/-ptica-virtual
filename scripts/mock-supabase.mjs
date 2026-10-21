// Supabase simulado SOLO para pruebas UI locales (scripts/e2e-ui.mjs). Datos sintéticos en memoria.
import { createServer } from "node:http";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

function glb() {
  const pos = Buffer.alloc(36);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, i) => pos.writeFloatLE(v, i * 4));
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
      bufferViews: [{ buffer: 0, byteLength: 36 }], buffers: [{ byteLength: 36 }],
    }),
  );
  const pad = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20);
  const j = Buffer.concat([json, pad]);
  const head = Buffer.alloc(12);
  head.write("glTF", 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + j.length + 8 + 36, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(j.length, 0); jh.write("JSON", 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(36, 0); bh.write("BIN\0", 4);
  return Buffer.concat([head, jh, j, bh, pos]);
}

const img = (id, n) => [{ path: `${id}/${n}.png`, alt: null, position: 0, verified: true }];
const PRODUCTS = [
  { id: "11111111-1111-4111-8111-111111111111", slug: "ambar", name: "Ámbar", description: "Marco redondo de acetato.", price_clp: 90000, frame_shape: "Redondo", material: "Acetato", color: "Carey", gender: null, lens_width_mm: 48, bridge_mm: 21, temple_mm: 145, brands: { name: "Taller" }, product_images: img("11111111-1111-4111-8111-111111111111", "a"), product_models: { glb_path: "11111111-1111-4111-8111-111111111111/m.glb", verified: true } },
  { id: "22222222-2222-4222-8222-222222222222", slug: "basalto", name: "Basalto", description: null, price_clp: 50000, frame_shape: "Rectangular", material: "Metal", color: "Negro", gender: null, lens_width_mm: null, bridge_mm: null, temple_mm: null, brands: null, product_images: img("22222222-2222-4222-8222-222222222222", "b"), product_models: null },
  { id: "33333333-3333-4333-8333-333333333333", slug: "cedro", name: "Cedro", description: null, price_clp: 70000, frame_shape: "Rectangular", material: "Acetato", color: "Oliva", gender: null, lens_width_mm: null, bridge_mm: null, temple_mm: null, brands: null, product_images: img("33333333-3333-4333-8333-333333333333", "c"), product_models: null },
];

export const quoteCalls = [];
export const control = { authDown: false, productsDown: false, failStorageDelete: 0, objectMissing: false };
const FOREIGN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
// Receta y cotización de OTRA persona: la UI de cuenta nunca debe mostrarlas (RLS de admin las dejaría pasar).
export const rx = [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-0000000000ff", user_id: FOREIGN, created_at: "2026-03-03T10:00:00Z", quote_id: null, path: `${FOREIGN}/x.png` }];
const QUOTES = [
  { id: "dddddddd-dddd-4ddd-8ddd-000000000001", user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", created_at: "2026-02-01T10:00:00Z" },
  { id: "dddddddd-dddd-4ddd-8ddd-000000000002", user_id: FOREIGN, created_at: "2026-03-03T10:00:00Z" },
];
const USER = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "cliente@test.cl", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
export const GOOD_PASSWORD = "clave-segura-123";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const TOKEN = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, aud: "authenticated", role: "authenticated", email: USER.email, iat: 1700000000, exp: 4102444800 })}.${Buffer.from("firma-simulada").toString("base64url")}`;
const session = () => ({ access_token: TOKEN, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: USER });

export function startMock(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,HEAD,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    const json = (o, s = 200) => res.writeHead(s, { "Content-Type": "application/json" }).end(JSON.stringify(o));

    if (url.pathname.startsWith("/storage/v1/object/public/product-images/")) return res.writeHead(200, { "Content-Type": "image/png" }).end(PNG);
    if (url.pathname.startsWith("/storage/v1/object/public/product-models/")) return res.writeHead(200, { "Content-Type": "model/gltf-binary" }).end(glb());
    if (url.pathname === "/rest/v1/products" && control.productsDown) return json({ message: "db down" }, 500);
    if (url.pathname === "/rest/v1/products" && req.method === "GET") {
      let list = PRODUCTS;
      const slug = url.searchParams.get("slug");
      if (slug?.startsWith("eq.")) list = list.filter((p) => p.slug === slug.slice(3));
      const ids = url.searchParams.get("id");
      if (ids?.startsWith("in.")) {
        const set = ids.slice(4, -1).split(",");
        list = list.filter((p) => set.includes(p.id));
      }
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return list[0] ? json(list[0]) : json({ message: "no rows" }, 406);
      return json(list);
    }
    if (url.pathname === "/rest/v1/rpc/create_quote" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => { quoteCalls.push(JSON.parse(body)); json("99999999-9999-4999-8999-999999999999"); });
      return;
    }
    const readBody = (cb) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => cb(b)); };
    if (url.pathname === "/auth/v1/user" && control.authDown) return json({ message: "down" }, 503);
    if (url.pathname === "/auth/v1/user") return (req.headers.authorization ?? "").includes(TOKEN) ? json(USER) : json({ message: "no session" }, 401);
    if (url.pathname === "/auth/v1/token") return readBody((b) => { const d = JSON.parse(b || "{}"); d.password === GOOD_PASSWORD ? json(session()) : json({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400); });
    if (url.pathname === "/auth/v1/signup") return readBody(() => json({ ...USER, identities: [] }));
    if (url.pathname === "/auth/v1/logout") return res.writeHead(204).end();
    if (url.pathname === "/rest/v1/quotes") { const uq = url.searchParams.get("user_id"); return json(QUOTES.filter((q) => !uq?.startsWith("eq.") || q.user_id === uq.slice(3))); }
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "GET") {
      res.setHeader("Content-Range", `0-${Math.max(rx.length - 1, 0)}/${rx.length}`);
      const idq = url.searchParams.get("id");
      const uq = url.searchParams.get("user_id");
      const rows = rx.filter((r) => (!idq?.startsWith("eq.") || r.id === idq.slice(3)) && (!uq?.startsWith("eq.") || r.user_id === uq.slice(3)));
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows[0] ? json(rows[0]) : json({ message: "no rows" }, 406);
      return json(rows);
    }
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "HEAD") { res.setHeader("Content-Range", `*/${rx.length}`); return res.writeHead(200).end(); }
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "POST") return readBody((b) => { const r = { id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(rx.length + 1).padStart(12, "0")}`, created_at: new Date().toISOString(), quote_id: null, path: JSON.parse(b).path, user_id: USER.id }; rx.push(r); json({ id: r.id }, 201); });
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "DELETE") {
      const id = (url.searchParams.get("id") ?? "").slice(3);
      const i = rx.findIndex((r) => r.id === id && r.user_id === USER.id);
      if (i >= 0) rx.splice(i, 1);
      return res.writeHead(204).end();
    }
    if (url.pathname.startsWith("/storage/v1/object/prescriptions/") && req.method === "HEAD") return res.writeHead(control.objectMissing ? 404 : 200).end();
    if (url.pathname === "/storage/v1/object/prescriptions" && req.method === "DELETE") return readBody(() => { if (control.failStorageDelete > 0) { control.failStorageDelete--; return json({ message: "storage down" }, 500); } json([{ name: "x" }]); });
    if (url.pathname.startsWith("/storage/v1/object/prescriptions/") && req.method === "POST") return readBody(() => json({ Key: url.pathname }));
    if (url.pathname.startsWith("/storage/v1/object/sign/prescriptions/")) return readBody(() => json({ signedURL: `/object/sign/prescriptions/x?token=t${Date.now()}` }));
    if (url.pathname.startsWith("/auth/v1/")) return json({}, 401);
    json({ message: "no mock" }, 404);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
