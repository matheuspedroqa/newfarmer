// Gera src/lib/climate-maps.ts: um mapa por país do guia "o que plantar", com cada estado/província pintado no seu clima.
// Uso: node scripts/build-climate-maps.mts <ne_10m_admin_1_states_provinces.geojson> <cache.json>
// Fronteiras: Natural Earth admin-1 1:10m (domínio público). Clima: médias mensais 2001–2025 da NASA POWER
// em até 5 pontos dentro de cada região, classificadas pela mesma regra do cadastro; vale o clima da maioria.
import fs from "node:fs";
import { classifyClimate, type ClimateZone } from "../src/server/climate.ts";

const [, , geoFile, cacheFile] = process.argv;
if (!geoFile || !cacheFile) throw new Error("uso: node scripts/build-climate-maps.mts <admin1.geojson> <cache.json>");

// Mesmos climas de COUNTRY_CLIMATES em src/lib/plant-guide.ts.
const ALLOWED: Record<string, ClimateZone[]> = {
  BR: ["tropical", "subtropical", "semiarid"], US: ["temperate", "subtropical", "semiarid", "cold"], CA: ["cold", "temperate"],
  DE: ["temperate"], ES: ["subtropical", "temperate", "semiarid"], FR: ["temperate", "subtropical"], PT: ["subtropical", "temperate"],
  IT: ["subtropical", "temperate"], MX: ["tropical", "subtropical", "semiarid"],
};
// Territórios longe do continente deixariam o mapa minúsculo.
const SKIP = new Set(["Alaska", "Hawaii", "Canary Is.", "Ceuta", "Melilla", "Madeira", "Azores", "Guyane française", "Martinique", "Guadeloupe", "Réunion", "Mayotte"]);
// Clima que o país não usa no guia vira o vizinho mais parecido que ele usa.
const NEAREST: Record<ClimateZone, ClimateZone[]> = {
  tropical: ["subtropical", "semiarid", "temperate"], subtropical: ["tropical", "temperate", "semiarid"],
  temperate: ["subtropical", "cold", "semiarid"], cold: ["temperate"], semiarid: ["subtropical", "temperate", "tropical"],
};
const WIDTH = 400;

type Ring = number[][];
type Feature = { properties: Record<string, string | null>; geometry: { type: string; coordinates: unknown } };
const polygons = (f: Feature): Ring[][] => (f.geometry.type === "Polygon" ? [f.geometry.coordinates as Ring[]] : (f.geometry.coordinates as Ring[][]));

function inside([x, y]: number[], rings: Ring[]): boolean {
  let hit = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) hit = !hit;
  return hit;
}

/** Até `n` pontos de uma grade dentro da região, espalhados; sem nenhum, o meio do maior polígono. */
function samples(f: Feature, n: number): number[][] {
  const polys = polygons(f);
  const all = polys.flat(2) as unknown as number[][];
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const step = Math.max((x1 - x0) / 6, (y1 - y0) / 6, 0.05);
  const pts: number[][] = [];
  for (let x = x0 + step / 2; x < x1; x += step) for (let y = y0 + step / 2; y < y1; y += step) if (polys.some((p) => inside([x, y], p))) pts.push([x, y]);
  if (!pts.length) {
    const big = polys.reduce((a, b) => (b[0].length > a[0].length ? b : a))[0];
    pts.push([big.reduce((s, p) => s + p[0], 0) / big.length, big.reduce((s, p) => s + p[1], 0) / big.length]);
  }
  return Array.from({ length: Math.min(n, pts.length) }, (_, i) => pts[Math.floor((i * pts.length) / Math.min(n, pts.length))]);
}

const cache: Record<string, ClimateZone> = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : {};
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// A NASA POWER bloqueia muitos pedidos por ponto; a grade regional (0,5°) cobre um país em poucos pedidos.
const grid: [number, number, ClimateZone][] = (cache as unknown as Record<string, [number, number, ClimateZone][]>).grid ?? [];

async function getJson(url: string) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (attempt === 45) throw new Error(`NASA POWER ${res.status}: ${url}`);
    console.error(`NASA POWER ${res.status}, nova tentativa em 2 min`);
    await new Promise((r) => setTimeout(r, 120_000));
  }
}

async function loadGrid([x0, x1, y0, y1]: number[]) {
  // A grade regional aceita de 2° a 10° de cada lado e um parâmetro por pedido.
  for (let lat = y0; lat < y1; lat += 10)
    for (let lon = x0; lon < x1; lon += 10) {
      const box = `latitude-min=${lat.toFixed(2)}&latitude-max=${Math.max(Math.min(lat + 10, y1), lat + 2).toFixed(2)}&longitude-min=${lon.toFixed(2)}&longitude-max=${Math.max(Math.min(lon + 10, x1), lon + 2).toFixed(2)}`;
      const base = `https://power.larc.nasa.gov/api/temporal/climatology/regional?community=AG&format=JSON&${box}&parameters=`;
      const [temp, rain] = [await getJson(base + "T2M"), await getJson(base + "PRECTOTCORR")];
      temp.features.forEach((f: { geometry: { coordinates: number[] }; properties: { parameter: { T2M: Record<string, number> } } }, i: number) => {
        const [x, y] = f.geometry.coordinates;
        const zone = classifyClimate({ monthlyMeanTemp: MONTHS.map((m) => f.properties.parameter.T2M[m]), annualPrecip: rain.features[i].properties.parameter.PRECTOTCORR.ANN * 365.25 });
        grid.push([x, y, zone]);
      });
      (cache as unknown as Record<string, unknown>).grid = grid;
      fs.writeFileSync(cacheFile, JSON.stringify(cache));
    }
}

async function zoneAt([lon, lat]: number[]): Promise<ClimateZone> {
  const key = `${lon.toFixed(2)},${lat.toFixed(2)}`;
  if (cache[key]) return cache[key];
  const near = grid.reduce<[number, ClimateZone] | null>((best, [x, y, z]) => {
    const d = Math.hypot(x - lon, y - lat);
    return d < 0.6 && (!best || d < best[0]) ? [d, z] : best;
  }, null);
  if (near) return near[1];
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon.toFixed(2)}&latitude=${lat.toFixed(2)}&format=JSON`;
  const p = (await getJson(url)).properties.parameter;
  cache[key] = classifyClimate({ monthlyMeanTemp: MONTHS.map((m) => p.T2M[m]), annualPrecip: p.PRECTOTCORR.ANN * 365.25 });
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  return cache[key];
}

function simplify(pts: number[][], tol: number): number[][] {
  if (pts.length < 4) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1);
    if (d > max) [max, idx] = [d, i];
  }
  return max > tol ? [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)] : [a, b];
}
const area = (r: number[][]) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0)) / 2;

const geo = JSON.parse(fs.readFileSync(geoFile, "utf8")) as { features: Feature[] };
const out: Record<string, { viewBox: string; zones: Partial<Record<ClimateZone, string>> }> = {};

for (const [country, allowed] of Object.entries(ALLOWED)) {
  const feats = geo.features.filter((f) => f.properties.iso_a2 === country && !SKIP.has(f.properties.name!) && !SKIP.has(f.properties.region!));
  const zoneOf = new Map<Feature, ClimateZone>();
  const pts = feats.flatMap((f) => samples(f, 5));
  if (pts.some((p) => !cache[`${p[0].toFixed(2)},${p[1].toFixed(2)}`]) && !grid.some(([x, y]) => Math.hypot(x - pts[0][0], y - pts[0][1]) < 0.6)) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    await loadGrid([Math.min(...xs) - 0.5, Math.max(...xs) + 0.5, Math.min(...ys) - 0.5, Math.max(...ys) + 0.5]);
  }
  for (const f of feats) {
    // Províncias pequenas (ES, FR, IT, PT) pedem menos pontos; a NASA POWER limita o ritmo.
    const votes = await Promise.all(samples(f, ["ES", "FR", "IT", "PT"].includes(country) ? 3 : 5).map(zoneAt));
    const fit = votes.map((z) => (allowed.includes(z) ? z : NEAREST[z].find((n) => allowed.includes(n))!));
    const winner = [...new Set(fit)].sort((a, b) => fit.filter((z) => z === b).length - fit.filter((z) => z === a).length)[0];
    zoneOf.set(f, winner);
    console.log(country, f.properties.name, votes.join(" "), "→", winner);
  }
  // Projeção equirretangular com a escala da latitude média: basta para um país só.
  const lonLat = feats.flatMap((f) => polygons(f).flatMap((p) => p[0]));
  const [minX, maxX] = [Math.min(...lonLat.map((p) => p[0])), Math.max(...lonLat.map((p) => p[0]))];
  const [minY, maxY] = [Math.min(...lonLat.map((p) => p[1])), Math.max(...lonLat.map((p) => p[1]))];
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const scale = WIDTH / ((maxX - minX) * k);
  const proj = ([x, y]: number[]) => [(x - minX) * k * scale, (maxY - y) * scale];
  const zones: Partial<Record<ClimateZone, string>> = {};
  for (const f of feats)
    for (const poly of polygons(f)) {
      // Anel fechado (início = fim): simplifica as duas metades, senão a reta de referência tem comprimento zero.
      const full = poly[0].map(proj), mid = Math.floor(full.length / 2);
      const ring = [...simplify(full.slice(0, mid + 1), 0.9).slice(0, -1), ...simplify(full.slice(mid), 0.9)];
      if (ring.length < 4 || area(ring) < 2) continue;
      const z = zoneOf.get(f)!;
      zones[z] = (zones[z] ?? "") + "M" + ring.slice(0, -1).map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") + "Z";
    }
  out[country] = { viewBox: `0 0 ${WIDTH} ${Math.ceil((maxY - minY) * scale)}`, zones };
}

fs.writeFileSync(
  "src/lib/climate-maps.ts",
  `// Gerado por scripts/build-climate-maps.mts — não edite à mão.\n// Fronteiras: Natural Earth (domínio público). Clima: NASA POWER 2001–2025, mesma regra do cadastro, por estado/província.\nimport type { ClimateZone } from "@/server/climate";\n\nexport const CLIMATE_MAPS: Record<string, { viewBox: string; zones: Partial<Record<ClimateZone, string>> }> = ${JSON.stringify(out)};\n`,
);
console.log("ok", fs.statSync("src/lib/climate-maps.ts").size, "bytes");
