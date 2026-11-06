import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(root, "f2l-data.json"), "utf8"));
const dir = join(root, "svg-cache", "f2l");
mkdirSync(dir, { recursive: true });

const COLOR_MAP = {
  "#FEFE00": "#FFFFFF",
  "#FFA100": "#FFB000",
  "#404040": "#5A6270",
};

function recolor(svg) {
  let out = svg.replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "").trim();
  for (const [from, to] of Object.entries(COLOR_MAP)) {
    out = out.replaceAll(from, to);
    out = out.replaceAll(from.toLowerCase(), to);
  }
  return out;
}

function urlFor(setup) {
  const params = new URLSearchParams({
    fmt: "svg",
    size: "180",
    stage: "f2l",
    bg: "t",
    sch: "wrbyog",
    alg: setup,
  });
  return `https://visualcube.api.cubing.net/?${params}`;
}

async function fetchOne(entry) {
  const path = join(dir, `${entry.id}.svg`);
  const res = await fetch(urlFor(entry.setup));
  if (!res.ok) throw new Error(`${entry.id} ${res.status}`);
  const raw = await res.text();
  if (!raw.includes("<svg")) throw new Error(`${entry.id} not svg`);
  writeFileSync(path, recolor(raw), "utf8");
  return "fetched";
}

let cursor = 0;
const counts = { cached: 0, fetched: 0 };
async function worker() {
  while (cursor < data.cases.length) {
    const entry = data.cases[cursor++];
    const result = await fetchOne(entry);
    counts[result] += 1;
    if (result === "fetched") process.stdout.write(`${entry.id}\n`);
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
console.log(`done cached=${counts.cached} fetched=${counts.fetched}`);
