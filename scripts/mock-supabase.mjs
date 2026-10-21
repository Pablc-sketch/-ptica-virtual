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

export function startMock(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    const json = (o, s = 200) => res.writeHead(s, { "Content-Type": "application/json" }).end(JSON.stringify(o));

    if (url.pathname.startsWith("/storage/v1/object/public/product-images/")) return res.writeHead(200, { "Content-Type": "image/png" }).end(PNG);
    if (url.pathname.startsWith("/storage/v1/object/public/product-models/")) return res.writeHead(200, { "Content-Type": "model/gltf-binary" }).end(glb());
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
    if (url.pathname.startsWith("/auth/v1/")) return json({}, 401);
    json({ message: "no mock" }, 404);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
