#!/usr/bin/env node
// Checks the EV charger ZIP lists (src/lib/ev-stations/zip-codes.ts) against the Census 2020
// ZCTA-to-county relationship file. For each county list it prints:
//   - ZIPs whose ZCTA doesn't overlap that county (misfiled),
//   - ZIPs that are no ZCTA at all (PO box or unique ZIPs; the file can't place them),
//   - ZIPs listed twice in the same county,
//   - ZCTAs that overlap the county but are missing from its list, with the share of the ZCTA's
//     land in that county (a small share is a sliver along the line).
//
// Usage: node scripts/check-ev-zips.mjs [cache dir]
// The Census file (~7 MB) is downloaded into the cache dir (default: the OS temp dir) once.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CENSUS_URL =
	"https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";

/** The export name in zip-codes.ts -> the county's FIPS code. */
const COUNTIES = {
	SanJoaquin: "06077",
	Stanislaus: "06099",
	Merced: "06047",
	Madera: "06039",
	Fresno: "06019",
	Kings: "06031",
	Tulare: "06107",
	Kern: "06029",
	Calaveras: "06009",
	Tuolumne: "06109",
	Mono: "06051",
	Mariposa: "06043",
	Inyo: "06027"
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = resolve(process.argv[2] ?? tmpdir());
const censusPath = join(cacheDir, "tab20_zcta520_county20_natl.txt");

if (!existsSync(censusPath)) {
	console.error(`Downloading ${CENSUS_URL}`);
	const res = await fetch(CENSUS_URL);
	if (!res.ok) throw new Error(`Census download failed: ${res.status}`);
	writeFileSync(censusPath, Buffer.from(await res.arrayBuffer()));
}

/** ZCTA -> Map(county FIPS -> land area in that county); and ZCTA -> total land area. */
const parts = new Map();
const zctaLand = new Map();
const lines = readFileSync(censusPath, "utf8")
	.replace(/^\uFEFF/, "")
	.split(/\r?\n/);
const header = lines[0].split("|");
const col = (name) => header.indexOf(name);
const [iZcta, iZctaLand, iCounty, iPartLand] = [
	col("GEOID_ZCTA5_20"),
	col("AREALAND_ZCTA5_20"),
	col("GEOID_COUNTY_20"),
	col("AREALAND_PART")
];
for (const line of lines.slice(1)) {
	if (!line) continue;
	const f = line.split("|");
	const zcta = f[iZcta];
	if (!zcta) continue;
	zctaLand.set(zcta, Number(f[iZctaLand]));
	if (!parts.has(zcta)) parts.set(zcta, new Map());
	parts.get(zcta).set(f[iCounty], Number(f[iPartLand]));
}

/** Parses the per-county arrays out of zip-codes.ts (string literals only). */
const source = readFileSync(join(root, "src/lib/ev-stations/zip-codes.ts"), "utf8");
const lists = {};
for (const match of source.matchAll(/export const (\w+)\s*=\s*\[([^\]]*)\]/g)) {
	lists[match[1]] = [...match[2].matchAll(/"(\d+)"/g)].map((m) => m[1]);
}

const nameOf = Object.fromEntries(Object.entries(COUNTIES).map(([name, fips]) => [fips, name]));
const pct = (zcta, fips) => {
	const total = zctaLand.get(zcta) || 0;
	const part = parts.get(zcta)?.get(fips) ?? 0;
	return total ? `${((part / total) * 100).toFixed(1)}%` : "n/a";
};

let problems = 0;
for (const [name, fips] of Object.entries(COUNTIES)) {
	const list = lists[name];
	if (!list) {
		console.log(`\n${name}: no list in zip-codes.ts`);
		problems++;
		continue;
	}
	const seen = new Set();
	const repeats = [];
	const misfiled = [];
	const notZcta = [];
	for (const zip of list) {
		if (seen.has(zip)) repeats.push(zip);
		seen.add(zip);
		const counties = parts.get(zip);
		// California ZIPs run 90001-96162: anything else is a typo, whatever the file says.
		if (!/^9[0-6]\d{3}$/.test(zip)) misfiled.push(`${zip} (not a California ZIP)`);
		else if (!counties) notZcta.push(zip);
		else if (!counties.has(fips)) {
			const where = [...counties.keys()].map((c) => nameOf[c] ?? c).join(", ");
			misfiled.push(`${zip} (in ${where})`);
		}
	}
	const missing = [];
	for (const [zcta, counties] of parts) {
		if (!counties.has(fips) || seen.has(zcta)) continue;
		const listedIn = Object.keys(lists).filter((other) => lists[other].includes(zcta));
		const note = listedIn.length ? `in ${listedIn.join(", ")}'s list` : "in no list";
		missing.push(`${zcta} (${pct(zcta, fips)} of its land, ${note})`);
	}
	missing.sort();
	console.log(`\n${name} (${fips}): ${list.length} ZIPs`);
	if (misfiled.length) console.log(`  not in this county: ${misfiled.join("; ")}`);
	if (notZcta.length) console.log(`  not a ZCTA: ${notZcta.join(", ")}`);
	if (repeats.length) console.log(`  listed twice: ${repeats.join(", ")}`);
	if (missing.length) console.log(`  missing ZCTAs: ${missing.join("; ")}`);
	problems += misfiled.length + repeats.length;
}

const all = Object.values(lists).flat();
const across = all.length - new Set(all).size;
console.log(
	`\n${all.length} entries, ${new Set(all).size} distinct (${across} repeats across lists)`
);
process.exitCode = problems ? 1 : 0;
