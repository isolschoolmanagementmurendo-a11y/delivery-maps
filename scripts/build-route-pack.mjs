/*
 * Builds an offline route pack for one country from OpenStreetMap roads.
 *
 *   1. Download the country from https://download.geofabrik.de (e.g. zimbabwe-latest.osm.pbf)
 *   2. osmium tags-filter zimbabwe-latest.osm.pbf w/highway -o roads.pbf
 *      osmium export roads.pbf -o roads.geojson --geometry-types=linestring
 *   3. node scripts/build-route-pack.mjs roads.geojson ZW zimbabwe.route.json.gz
 *   4. Upload the .gz as an asset on a GitHub Release (e.g. tag v1.0.0).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const [input, country, output] = process.argv.slice(2);
if (!input || !country || !output) {
  console.error("usage: build-route-pack.mjs roads.geojson ZW out.route.json.gz");
  process.exit(1);
}

const CLASS = {
  path: 0, footway: 0, cycleway: 0, track: 0, pedestrian: 0, bridleway: 0,
  residential: 1, service: 1, unclassified: 1, living_street: 1,
  tertiary: 2, secondary: 2, tertiary_link: 2, secondary_link: 2,
  primary: 3, trunk: 3, primary_link: 3, trunk_link: 3,
  motorway: 4, motorway_link: 4,
};

const fc = JSON.parse(readFileSync(input, "utf8"));
const ids = new Map();
const nodes = [];
const edges = [];
let w = 180, s = 90, e = -180, n = -90;

const node = ([lng, lat]) => {
  const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  let id = ids.get(key);
  if (id === undefined) {
    id = nodes.length / 2;
    ids.set(key, id);
    nodes.push(+lng.toFixed(6), +lat.toFixed(6));
    w = Math.min(w, lng); e = Math.max(e, lng); s = Math.min(s, lat); n = Math.max(n, lat);
  }
  return id;
};

for (const f of fc.features) {
  const cls = CLASS[f.properties?.highway];
  if (cls === undefined || f.geometry?.type !== "LineString") continue;
  const oneway = f.properties.oneway === "yes" || f.properties.highway?.startsWith("motorway") ? 8 : 0;
  const c = f.geometry.coordinates;
  for (let i = 1; i < c.length; i++) {
    edges.push(node(c[i - 1]), node(c[i]), cls | oneway);
  }
}

const pack = { v: 1, country, bbox: [w, s, e, n].map((x) => +x.toFixed(4)), nodes, edges };
writeFileSync(output, gzipSync(JSON.stringify(pack), { level: 9 }));
console.log(`${country}: ${nodes.length / 2} nodes, ${edges.length / 3} edges -> ${output}`);
