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
export const control = { authDown: false, productsDown: false, failStorageDelete: 0, objectMissing: false, hidePrecheck: false, rxReadDown: false };
export const removed = [];
const FOREIGN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
// Receta y cotización de OTRA persona: la UI de cuenta nunca debe mostrarlas (RLS de admin las dejaría pasar).
export const rx = [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-0000000000ff", user_id: FOREIGN, created_at: "2026-03-03T10:00:00Z", quote_id: null, path: `${FOREIGN}/x.png`, status: "pending", version: 0, status_changed_at: "2026-03-03T10:00:00Z", client_message: null, replaces_id: null }];
// ---- Pedidos de laboratorio (doble de prueba; las reglas autoritativas están en supabase/pendientes/04) ----
const THIRD = "abababab-abab-4bab-8bab-abababababab";
const AMBAR = "11111111-1111-4111-8111-111111111111";
rx.push(
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-0000000000aa", user_id: THIRD, created_at: "2026-04-01T10:00:00Z", quote_id: null, path: `${THIRD}/m.png`, status: "reviewed", version: 2, status_changed_at: "2026-04-01T11:00:00Z", client_message: null, replaces_id: null, product_id: AMBAR, requested_family: "Monofocal", requested_use: "distance", requested_treatment: "Orgánico Antirreflejo" },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-0000000000bb", user_id: THIRD, created_at: "2026-04-02T10:00:00Z", quote_id: null, path: `${THIRD}/f.png`, status: "reviewed", version: 2, status_changed_at: "2026-04-02T11:00:00Z", client_message: null, replaces_id: null, product_id: AMBAR, requested_family: "Multifocal", requested_use: null, requested_treatment: "Orgánico Antirreflejo" },
);
export const PROC = { [AMBAR]: { supplier_code: "PRV-PRUEBA-01", color_code: "=CMD()", confirmed: true } };
export const orders = [];
export const orderEvents = [];
const RXF = ["od_sph", "od_cyl", "od_axis", "od_add", "oi_sph", "oi_cyl", "oi_axis", "oi_add", "od_pd", "oi_pd", "od_height", "oi_height", "measurement_source", "measured_by", "measured_at", "notes"];
function orderBlocker(o) {
  const r = rx.find((x) => x.id === o.prescription_id);
  if (!r || r.status !== "reviewed") return "prescription_not_reviewed";
  if (!PROC[o.product_id]?.confirmed) return "procurement_not_confirmed";
  if ([o.od_sph, o.od_cyl, o.oi_sph, o.oi_cyl].some((v) => v == null)) return "rx_incomplete";
  if ((o.od_cyl !== 0 && o.od_axis == null) || (o.oi_cyl !== 0 && o.oi_axis == null)) return "axis_required";
  if (o.od_pd == null || o.oi_pd == null) return "pd_required";
  if (o.family === "Monofocal") {
    if (!o.requested_use) return "use_unconfirmed";
    if (o.od_add != null || o.oi_add != null) return "add_not_allowed_for_single_vision";
  } else {
    if (o.od_add == null || o.oi_add == null) return "add_required";
    if (o.od_height == null || o.oi_height == null) return "heights_required";
    if (o.measurement_source !== "professional_on_fitted_frame" || !o.measured_by || !o.measured_at) return "professional_measurement_required";
  }
  return null;
}
const QUOTES = [
  { id: "dddddddd-dddd-4ddd-8ddd-000000000001", user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", created_at: "2026-02-01T10:00:00Z" },
  { id: "dddddddd-dddd-4ddd-8ddd-000000000002", user_id: FOREIGN, created_at: "2026-03-03T10:00:00Z" },
];
const USER = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "cliente@test.cl", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
export const GOOD_PASSWORD = "clave-segura-123";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const TOKEN = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, aud: "authenticated", role: "authenticated", email: USER.email, iat: 1700000000, exp: 4102444800 })}.${Buffer.from("firma-simulada").toString("base64url")}`;
const ADMIN = { ...USER, id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", email: "admin@test.cl" };
const ADMIN_TOKEN = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: ADMIN.id, aud: "authenticated", role: "authenticated", email: ADMIN.email, iat: 1700000000, exp: 4102444800 })}.${Buffer.from("firma-admin").toString("base64url")}`;
export const events = [];
const adminSession = () => ({ access_token: ADMIN_TOKEN, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "ra", user: ADMIN });
const TRANSITIONS = { pending: ["in_review"], in_review: ["pending", "needs_new_file", "reviewed"], needs_new_file: [], reviewed: [] };
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
    const who = () => { const a = req.headers.authorization ?? ""; return a.includes(ADMIN_TOKEN) ? ADMIN : a.includes(TOKEN) ? USER : null; };
    if (url.pathname === "/auth/v1/user") return who() ? json(who()) : json({ message: "no session" }, 401);
    if (url.pathname === "/rest/v1/rpc/is_admin") return json(who()?.id === ADMIN.id);
    const isAdmin = () => who()?.id === ADMIN.id;
    const wantsObject = () => (req.headers.accept ?? "").includes("vnd.pgrst.object");
    const pgErr = (message, code = "P0001", status = 400) => json({ code, message, details: null, hint: null }, status);
    if (url.pathname === "/rest/v1/product_procurement") {
      if (!isAdmin()) return pgErr("permission denied for table product_procurement", "42501", 401);
      const pid = (url.searchParams.get("product_id") ?? "").slice(3);
      const row = PROC[pid];
      return wantsObject() ? (row ? json(row) : json({ message: "no rows" }, 406)) : json(row ? [row] : []);
    }
    if (url.pathname === "/rest/v1/product_images") {
      const pid = (url.searchParams.get("product_id") ?? "").slice(3);
      return json(PRODUCTS.some((p) => p.id === pid) ? [{ path: `${pid}/a.png`, position: 0 }] : []);
    }
    if (url.pathname === "/rest/v1/lab_order_events") {
      if (!isAdmin()) return json([]);
      const oid = (url.searchParams.get("order_id") ?? "").slice(3);
      return json(orderEvents.filter((e) => e.order_id === oid));
    }
    if (url.pathname === "/rest/v1/lab_orders") {
      if (!isAdmin()) return req.method === "GET" ? json([]) : pgErr("new row violates row-level security policy for table \"lab_orders\"", "42501", 403);
      const idq = (url.searchParams.get("id") ?? "").slice(3);
      if (req.method === "GET") {
        const st = (url.searchParams.get("status") ?? "").slice(3);
        const rows = orders.filter((o) => (!idq || o.id === idq) && (!st || o.status === st));
        return wantsObject() ? (rows[0] ? json(rows[0]) : json({ message: "no rows" }, 406)) : json(rows);
      }
      if (req.method === "POST") return readBody((b) => {
        const d = JSON.parse(b);
        const r = rx.find((x) => x.id === d.prescription_id);
        if (!r) return pgErr("prescription_not_found", "P0002");
        if (r.status !== "reviewed") return pgErr("prescription_not_reviewed", "22023");
        if (!r.product_id || !r.requested_family) return pgErr("prescription_context_missing", "22023");
        if (orders.some((o) => o.prescription_id === r.id && o.status !== "cancelled")) return pgErr("duplicate key value violates unique constraint \"lab_orders_one_active\"", "23505", 409);
        const prod = PRODUCTS.find((p) => p.id === r.product_id);
        const o = { id: `cccccccc-0000-4000-8000-${String(orders.length + 1).padStart(12, "0")}`, prescription_id: r.id, product_id: r.product_id, product_name: prod?.name ?? "Marco no disponible",
          family: r.requested_family, requested_use: r.requested_use, treatment: r.requested_treatment, status: "draft", version: 0,
          ...Object.fromEntries(RXF.map((f) => [f, null])), created_at: new Date().toISOString(), validated_at: null };
        orders.push(o);
        json(wantsObject() ? { id: o.id } : [{ id: o.id }], 201);
      });
      if (req.method === "PATCH") return readBody((b) => {
        const d = JSON.parse(b);
        const vq = Number((url.searchParams.get("version") ?? "").slice(3));
        const o = orders.find((x) => x.id === idq && x.version === vq);
        if (!o) return wantsObject() ? json({ message: "no rows" }, 406) : json([]);
        if (d.version !== o.version + 1) return pgErr("version_conflict", "40001");
        if (o.status === "cancelled") return pgErr("order_cancelled", "22023");
        const to = d.status ?? o.status;
        const rxChanged = RXF.some((f) => f in d && d[f] !== o[f]);
        if (to === o.status && o.status !== "draft") return pgErr("reopen_to_edit", "22023");
        if (to !== o.status && rxChanged) return pgErr("save_before_transition", "22023");
        const next = { ...o, ...d };
        if (to !== o.status) {
          const ok = { draft: ["validated", "cancelled"], validated: ["draft", "cancelled"] }[o.status] ?? [];
          if (!ok.includes(to)) return pgErr("invalid_transition", "22023");
          if (to === "validated") { const bl = orderBlocker(next); if (bl) return pgErr(bl, "22023"); next.validated_at = new Date().toISOString(); }
          else next.validated_at = null;
          orderEvents.push({ order_id: o.id, from_status: o.status, to_status: to, created_at: new Date().toISOString() });
        }
        Object.assign(o, next);
        const out = { id: o.id, status: o.status, version: o.version };
        json(wantsObject() ? out : [out]);
      });
    }
    if (url.pathname === "/rest/v1/rpc/review_prescription") return readBody((b) => {
      const d = JSON.parse(b || "{}");
      const err = (message, code = "P0001") => json({ code, message, details: null, hint: null }, 400);
      if (who()?.id !== ADMIN.id) return err("not_admin", "42501");
      const r = rx.find((x) => x.id === d.p_id);
      if (!r) return err("not_found", "P0002");
      if (r.version !== d.p_expected_version) return err("version_conflict", "40001");
      if (!TRANSITIONS[r.status].includes(d.p_to)) return err("invalid_transition", "22023");
      const msg = (d.p_message ?? "").trim() || null;
      if (d.p_to === "needs_new_file" && (!msg || msg.length < 5 || msg.length > 300)) return err("reason_required", "22023");
      events.push({ prescription_id: r.id, from_status: r.status, to_status: d.p_to, message: d.p_to === "needs_new_file" ? msg : null, created_at: new Date().toISOString() });
      Object.assign(r, { status: d.p_to, version: r.version + 1, status_changed_at: new Date().toISOString(), client_message: d.p_to === "needs_new_file" ? msg : null });
      json([{ status: r.status, version: r.version, status_changed_at: r.status_changed_at }]);
    });
    if (url.pathname === "/rest/v1/prescription_events") {
      if (who()?.id !== ADMIN.id) return json([]);
      const inq = url.searchParams.get("prescription_id");
      const set = inq?.startsWith("in.(") ? inq.slice(4, -1).split(",") : null;
      return json(events.filter((e) => !set || set.includes(e.prescription_id)));
    }
    if (url.pathname === "/auth/v1/token") return readBody((b) => { const d = JSON.parse(b || "{}"); d.password === GOOD_PASSWORD ? json(d.email === ADMIN.email ? adminSession() : session()) : json({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400); });
    if (url.pathname === "/auth/v1/signup") return readBody(() => json({ ...USER, identities: [] }));
    if (url.pathname === "/auth/v1/logout") return res.writeHead(204).end();
    if (url.pathname === "/rest/v1/quotes") { const uq = url.searchParams.get("user_id"); return json(QUOTES.filter((q) => !uq?.startsWith("eq.") || q.user_id === uq.slice(3))); }
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "GET") {
      res.setHeader("Content-Range", `0-${Math.max(rx.length - 1, 0)}/${rx.length}`);
      const idq = url.searchParams.get("id");
      const uq = url.searchParams.get("user_id");
      const rq = url.searchParams.get("replaces_id");
      if (control.rxReadDown) return json({ message: "db down" }, 500);
      // Simula una carrera: otra petición aún no ha insertado su reemplazo cuando esta hace la comprobación previa.
      if (control.hidePrecheck && rq?.startsWith("eq.")) return (req.headers.accept ?? "").includes("vnd.pgrst.object") ? json({ message: "no rows" }, 406) : json([]);
      const sq = url.searchParams.get("status");
      const sset = sq?.startsWith("in.(") ? sq.slice(4, -1).split(",") : null;
      const rows = rx.filter((r) => (!idq?.startsWith("eq.") || r.id === idq.slice(3)) && (!uq?.startsWith("eq.") || r.user_id === uq.slice(3))
        && (!rq?.startsWith("eq.") || r.replaces_id === rq.slice(3)) && (!sset || sset.includes(r.status)));
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows[0] ? json(rows[0]) : json({ message: "no rows" }, 406);
      return json(rows);
    }
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "HEAD") { res.setHeader("Content-Range", `*/${rx.length}`); return res.writeHead(200).end(); }
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "POST") return readBody((b) => {
      const d = JSON.parse(b);
      if (d.replaces_id) {
        const old = rx.find((o) => o.id === d.replaces_id && o.user_id === USER.id && o.status === "needs_new_file");
        if (!old) return json({ code: "42501", message: "replacement_not_allowed" }, 403);
        if (rx.some((o) => o.replaces_id === d.replaces_id)) return json({ code: "23505", message: "duplicate key value violates unique constraint \"prescriptions_replaces_once\"" }, 409);
      }
      const r = { id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(rx.length + 1).padStart(12, "0")}`, created_at: new Date().toISOString(), quote_id: d.quote_id ?? null, path: d.path, user_id: USER.id,
        status: "pending", version: 0, status_changed_at: new Date().toISOString(), client_message: null, replaces_id: d.replaces_id ?? null };
      rx.push(r); json({ id: r.id }, 201);
    });
    if (url.pathname === "/rest/v1/prescriptions" && req.method === "DELETE") {
      const id = (url.searchParams.get("id") ?? "").slice(3);
      const i = rx.findIndex((r) => r.id === id && r.user_id === USER.id);
      if (i >= 0) rx.splice(i, 1);
      return res.writeHead(204).end();
    }
    if (url.pathname.startsWith("/storage/v1/object/prescriptions/") && req.method === "HEAD") return res.writeHead(control.objectMissing ? 404 : 200).end();
    if (url.pathname === "/storage/v1/object/prescriptions" && req.method === "DELETE") return readBody((b) => {
      try { removed.push(...(JSON.parse(b || "{}").prefixes ?? [])); } catch { /* cuerpo no JSON */ } if (control.failStorageDelete > 0) { control.failStorageDelete--; return json({ message: "storage down" }, 500); } json([{ name: "x" }]); });
    if (url.pathname.startsWith("/storage/v1/object/prescriptions/") && req.method === "POST") return readBody(() => json({ Key: url.pathname }));
    if (url.pathname.startsWith("/storage/v1/object/sign/prescriptions/")) return readBody(() => json({ signedURL: `/object/sign/prescriptions/x?token=t${Date.now()}` }));
    if (url.pathname.startsWith("/auth/v1/")) return json({}, 401);
    json({ message: "no mock" }, 404);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
