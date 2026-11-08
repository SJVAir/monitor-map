#!/usr/bin/env node
// Comparison page for the 5.0 parity check: paired screenshots of monitor-map 5.0 (a local dev
// server against the local sjvair.com stack) beside the public map at https://www.sjvair.com/.
//
//   node scripts/compare/compare.mjs --local http://localhost:5181 --out ../compare-5.0
//   node scripts/compare/compare.mjs --out ../compare-5.0 --html-only   (rebuild the page)
//
// Options (or env): --local (COMPARE_LOCAL_URL, default http://localhost:5181),
// --prod (COMPARE_PROD_URL, default https://www.sjvair.com), --out (COMPARE_OUT_DIR, required),
// --html (COMPARE_HTML, default <out>.html), --only desktop|phone, --html-only,
// --inactive <monitor id> (a monitor with no current readings on both sides).
//
// The public site is only viewed: no logins, no forms, no subscribe clicks. Its state is reached
// through the UI (menus, zoom buttons, double-clicks, hover, search typing) and a monitor
// deep link. The load screen and its error are shown by delaying or failing the API requests in
// this browser only. Nothing here reads .env, and no URL or console message is printed (map tile
// URLs carry the MapTiler key).

import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

// ---------------------------------------------------------------------------------------------
// Arguments

function arg(name, env, fallback) {
	const i = process.argv.indexOf(`--${name}`);
	if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
		return process.argv[i + 1];
	}
	return process.env[env] ?? fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const LOCAL = arg("local", "COMPARE_LOCAL_URL", "http://localhost:5181").replace(/\/$/, "");
const PROD = arg("prod", "COMPARE_PROD_URL", "https://www.sjvair.com").replace(/\/$/, "");
const OUT_ARG = arg("out", "COMPARE_OUT_DIR");
if (!OUT_ARG) {
	console.error("--out <dir> (or COMPARE_OUT_DIR) is required");
	process.exit(2);
}
const OUT = resolve(OUT_ARG);
const HTML = resolve(arg("html", "COMPARE_HTML", `${OUT}.html`));
const ONLY = arg("only", "COMPARE_ONLY");
// A monitor that is inactive on both sides (no current readings): CCAC BAM - Delano.
const INACTIVE_ID = arg("inactive", "COMPARE_INACTIVE_ID", "RLRxqeEJQLKz49fzDBlt5g");
// A place no monitor name contains: places are searched only when no monitor matches.
const SEARCH_PLACE = "Lemoore";
const SEARCH_MONITOR = "Fresno - Garland";

const VIEWPORTS = {
	desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
	phone: { width: 390, height: 844, deviceScaleFactor: 2 }
};

/** Never let a key reach the terminal. */
const redact = (s) => String(s).replace(/(key|api_key|apiKey)=[^&\s"']+/gi, "$1=…");
const log = (...a) => console.log(...a.map(redact));

// ---------------------------------------------------------------------------------------------
// Labels: set after reviewing the screenshots. "<id>@phone" / "<id>@desktop" override "<id>".

const LEGEND_SAME =
	"Level labels and outlined swatches are accessibility additions. Section titles: see the Legend pair.";
const LABELS = {
	load: {
		label: "question",
		note: `Attribution: 5.0 adds "NOAA Hazard Mapping System | SJVAir sensors, AirNow, AQview, AQLite" with underlined links, and on phones folds it behind an (i) button; 4.3 shows only MapTiler/OSM text and the MapTiler logo bottom-left.`
	},
	legend: {
		label: "question",
		note: 'Section titles differ: 5.0 "Fires" and "Smoke", 4.3 "Fire" and "Smoke Density". Also: level labels and outlined swatches (accessibility additions), and 5.0 lists "Very Hazardous" for ozone.'
	},
	"legend-pm25": {
		label: "same",
		note: `One card now (no nested box). ${LEGEND_SAME}`
	},
	"legend-ev": {
		label: "same",
		note: `Neither side adds an EV section. ${LEGEND_SAME}`
	},
	"legend-collapsed": { label: "same", note: "Collapsed card, chevron turned right." },
	"options-panel": { label: "same", note: "Map Options panel, sections closed." },
	"menu-pollutant": { label: "same", note: "" },
	"menu-monitors": {
		label: "same",
		note: `Ozone hides the types that don't report it on both.`
	},
	"menu-monitors-pm25": { label: "same", note: "Collocation Sites shows for PM2.5." },
	"menu-layers": { label: "same", note: "" },
	"menu-layers-ev": { label: "same", note: "EV Chargers expanded with Level 2 and Level 3." },
	"menu-overlays": { label: "same", note: "" },
	"menu-settings": { label: "same", note: "" },
	"options-panel@phone": { label: "same", note: "" },
	"map-pm25": {
		label: "fix",
		note: "Cluster averages ignore monitors without a reading, and no-reading monitors keep their shape in neutral; values differ (local vs production data)."
	},
	"tip-monitor": {
		label: "same",
		note: 'Date matches 4.3 minus its stray colon, in Pacific time ("12:29 pm Sunday Nov 08, 2026" vs "12:31:pm …"; map-sdk beta.4). 5.0 keeps its own style: the level name under the name, larger text (decided 2026-11-07).'
	},
	"tip-cluster": {
		label: "same",
		note: 'Area line is back (map-sdk beta.4): "3 monitors within a 22.619 mi² area", the same area as 4.3\'s "3 monitors covering 22.619mi²". 5.0 keeps the level name and larger text (decided 2026-11-07). Clusters of 4+ may show a different area (convex hull), as expected. Max/min differ on phones only because local and production readings differ.'
	},
	collocation: {
		label: "same",
		note: "Crosshairs in #4A5FC6. The local stack has no collocation records, so this run served the 5.0 page the public list."
	},
	"tip-collocation": {
		label: "same",
		note: "Both show the site tooltip over the monitor cluster (beta.2 fix). Different sites were hovered (the pointer lands on whichever site is near the same pixel), and the local stack's readings differ, so the 5.0 tooltip shows No reading / No level and so no date. Its date uses the same formatter as the monitor tooltip (map-sdk beta.4)."
	},
	"tip-smoke": {
		label: "same",
		note: "No hover tooltip on either (map-sdk beta.4, decided 2026-11-07). Plumes stay in the keyboard list with their density."
	},
	wind: { label: "same", note: "Wind layer at 0.5 opacity, drawn lowest." },
	"theme-default": { label: "same", note: "" },
	"theme-dark": { label: "same", note: "" },
	"theme-pastel": { label: "same", note: "" },
	reset: { label: "same", note: "Back to Streets default, Ozone, defaults." },
	"fire-z9": { label: "same", note: "Fire groups below zoom 10." },
	"fire-z10": {
		label: "same",
		note: "Hotspot icon now drawn at zoom 10 on both (map-sdk beta.2). 4.3 shows monitor triangles here that the local stack has no data for."
	},
	"tip-fire": {
		label: "accessibility",
		note: '5.0 shows the reading box on a hotspot: "Fire (MW)", the power in its level color (0.6), "1 fire detection" and "<10 MW" (map-sdk beta.4, decided 2026-11-07); 4.3 shows no fire tooltip.'
	},
	ev: {
		label: "same",
		note: "Per-level clusters and icons. Livermore (94550) and Hollister (95023) chargers no longer show in 5.0 (ZIP list fix)."
	},
	"tip-ev-cluster": {
		label: "question",
		note: "5.0 shows the EV cluster tooltip (Level 3 Chargers, 44 stations); 4.3 shows the monitor cluster's under it. Could not be settled: the local stack has only two Ozone monitors, so 5.0 has no monitor cluster under the EV cluster to compete. The EV tooltip itself matches."
	},
	"ev-popup": {
		label: "same",
		note: 'Station popup contents and layout. 5.0 also gives stations a hover tooltip ("Level 2/3 charger"), an accessibility addition; 4.3 had none.'
	},
	"ev-cluster-click": { label: "same", note: "Click eases to the expansion zoom." },
	"search-place": {
		label: "same",
		note: "Geocode results (shown when no monitor name matches)."
	},
	"search-pin": { label: "same", note: "Pin dropped at the place." },
	"search-monitor": { label: "same", note: "Monitor result with data-source logo." },
	panel: { label: "same", note: "" },
	"panel-bottom": { label: "same", note: "" },
	"widget-modal": {
		label: "same",
		note: "Modal and embed code match; the local iframe shows the local Django debug toolbar (local stack, not 5.0)."
	},
	"widget-modal@phone": {
		label: "same",
		note: "Not reachable on either side: the widget link shows only on screens at least 500 px wide and 600 px tall."
	},
	"panel-no-readings": {
		label: "fix",
		note: '"Get the widget!" hidden for a monitor with no current readings. The empty county badge is local data.'
	},
	"load-screen": { label: "same", note: "API held back in this browser." },
	"load-error": { label: "same", note: "API failing in this browser." },
	"sub-none": {
		label: "same",
		note: "5.0 only: the subscription manager for a signed-in user with none (faked user, stubbed response). Not reachable on sjvair.com without signing in."
	},
	"sub-error": {
		label: "fix",
		note: '5.0 only: "Couldn\'t load your alert settings." with Try again (subscription error line). Not reachable on sjvair.com without signing in.'
	}
};

// ---------------------------------------------------------------------------------------------
// Page helpers

const READY = () => !document.querySelector(".z-50.bg-white") && !!document.querySelector("canvas");

async function mapRect(page) {
	return page.evaluate(() => {
		const r = document.querySelector("#SJVAirMonitorMap").getBoundingClientRect();
		return { x: r.x, y: r.y, width: r.width, height: r.height };
	});
}

/** Lets the local page reach its GL map, for finding where features are drawn (local only). */
async function hookMap(page) {
	await page.evaluate(async () => {
		const url = performance
			.getEntriesByType("resource")
			.map((e) => e.name)
			.find((n) => n.includes(".vite/deps/@maptiler_sdk.js"));
		const mod = await import(url);
		const proto = mod.Map.prototype;
		if (proto.__compareHooked) return;
		const fire = proto.fire;
		proto.fire = function (...a) {
			window.__map = this;
			return fire.apply(this, a);
		};
		proto.__compareHooked = true;
	});
	// map-sdk replaces the GL map on a basemap change: wait for the current one to fire.
	await page.evaluate(() => (window.__map = null));
	const r = await mapRect(page);
	await page.mouse.move(r.x + r.width - 40, r.y + r.height / 2);
	await page.mouse.move(r.x + r.width - 44, r.y + r.height / 2 + 4);
	await page.waitForFunction(() => !!window.__map, null, { timeout: 10000 });
}

/**
 * Local only: a point (container pixels) of a rendered feature in a layer matching `layer`,
 * not under UI, nearest `near` (default: the container's center), at least `apart` px from any
 * other point feature of `others`.
 */
async function findFeature(page, { layer, exclude, near, apart = 0, others, polygon = false }) {
	return page.evaluate(
		({ layer, exclude, near, apart, others, polygon }) => {
			const map = window.__map;
			const box = document.querySelector("#SJVAirMonitorMap").getBoundingClientRect();
			const ids = map.getStyle().layers.map((l) => l.id);
			const re = new RegExp(layer);
			const ex = exclude ? new RegExp(exclude) : null;
			const layers = ids.filter((id) => re.test(id) && !(ex && ex.test(id)));
			if (!layers.length)
				return { error: `no layer /${layer}/`, ids: ids.filter((i) => i.includes(":")) };
			const free = (x, y) => {
				if (x < 30 || y < 70 || x > box.width - 60 || y > box.height - 30) return false;
				const el = document.elementFromPoint(box.x + x, box.y + y);
				return el && el.tagName === "CANVAS";
			};
			const c = near ?? { x: box.width / 2, y: box.height / 2 };
			let pts = [];
			if (polygon) {
				for (let y = 80; y < box.height - 30; y += 16) {
					for (let x = 40; x < box.width - 60; x += 16) {
						const fs = map.queryRenderedFeatures([x, y]);
						if (
							fs.length &&
							fs.every((f) => layers.includes(f.layer.id) || !f.layer.id.includes(":"))
						) {
							if (fs.some((f) => layers.includes(f.layer.id)) && free(x, y)) pts.push({ x, y });
						}
					}
				}
			} else {
				for (const f of map.queryRenderedFeatures({ layers })) {
					if (f.geometry.type !== "Point") continue;
					const p = map.project(f.geometry.coordinates);
					pts.push({
						x: Math.round(p.x),
						y: Math.round(p.y),
						props: f.properties,
						layer: f.layer.id
					});
				}
				pts = pts.filter((p) => free(p.x, p.y));
				if (apart && others) {
					const oth = ids.filter((id) => new RegExp(others).test(id));
					const all = map
						.queryRenderedFeatures({ layers: oth })
						.filter((f) => f.geometry.type === "Point")
						.map((f) => map.project(f.geometry.coordinates));
					// Any other drawn point (not this one, which may be listed more than once) too close.
					pts = pts.filter((p) =>
						all.every((o) => {
							const d = Math.hypot(o.x - p.x, o.y - p.y);
							return d <= 2 || d >= apart;
						})
					);
				}
			}
			pts.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
			return pts[0] ? { ...pts[0], count: pts.length } : { error: `nothing in /${layer}/ in view` };
		},
		{ layer, exclude, near, apart, others, polygon }
	);
}

async function cursorIsPointer(page) {
	return page.evaluate(
		() => getComputedStyle(document.querySelector("#SJVAirMonitorMap canvas")).cursor === "pointer"
	);
}

/** Hovers container point `p`; on a miss, searches a few pixels around it. */
async function hoverAt(page, p) {
	const r = await mapRect(page);
	const rings = [[0, 0]];
	for (let d = 3; d <= 15; d += 3) {
		for (const [dx, dy] of [
			[d, 0],
			[-d, 0],
			[0, d],
			[0, -d],
			[d, d],
			[-d, -d],
			[d, -d],
			[-d, d]
		]) {
			rings.push([dx, dy]);
		}
	}
	for (const [dx, dy] of rings) {
		await page.mouse.move(r.x + p.x + dx - 30, r.y + p.y + dy - 30);
		await page.mouse.move(r.x + p.x + dx, r.y + p.y + dy, { steps: 3 });
		await page.waitForTimeout(150);
		if (await cursorIsPointer(page)) {
			await page.waitForTimeout(500);
			return { x: p.x + dx, y: p.y + dy };
		}
	}
	return null;
}

async function clickAt(page, p, opts = {}) {
	const r = await mapRect(page);
	await page.mouse.click(r.x + p.x, r.y + p.y, opts);
}

async function dblclickAt(page, p) {
	const r = await mapRect(page);
	await page.mouse.dblclick(r.x + p.x, r.y + p.y);
}

/** Moves the mouse to a quiet corner of the map (no feature, no UI). */
async function parkMouse(page) {
	const r = await mapRect(page);
	await page.mouse.move(r.x + r.width - 8, r.y + r.height * 0.6);
	await page.waitForTimeout(200);
}

async function isWide(page) {
	return (await mapRect(page)).width >= 768;
}

const MENU_INDEX = { pollutant: 0, monitors: 1, layers: 2, overlays: 3, settings: 4 };

/** Opens a toolbar menu (desktop) or its section in the options panel (phone). */
async function openMenu(page, id) {
	const trigger = page.locator("[data-options-menu] > button").nth(MENU_INDEX[id]);
	if (!(await isWide(page))) {
		await page.getByRole("button", { name: "Open map options" }).click();
		await page.waitForTimeout(350);
	}
	await trigger.click();
	await page.waitForTimeout(350);
}

async function closeMenu(page, id) {
	if (await isWide(page)) {
		await page.keyboard.press("Escape");
		await parkMouse(page);
	} else {
		const trigger = page.locator("[data-options-menu] > button").nth(MENU_INDEX[id]);
		if ((await trigger.getAttribute("aria-expanded")) === "true") await trigger.click();
		await page.getByRole("button", { name: "Close map options" }).click();
	}
	await page.waitForTimeout(400);
}

/** Clicks a row (checkbox/radio label) by its text inside an open menu. */
async function clickRow(page, id, text) {
	const scope = page.locator(`[data-options-menu]`).nth(MENU_INDEX[id]);
	await scope
		.locator("label", { hasText: new RegExp(`^\\s*${escapeRe(text)}(?![\\w.])`) })
		.first()
		.click();
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function withMenu(page, id, fn) {
	await openMenu(page, id);
	try {
		return await fn();
	} finally {
		await closeMenu(page, id);
	}
}

async function legendCard(page) {
	return page
		.locator("#SJVAirMonitorMap button", { hasText: /^\s*Legend\s*$/ })
		.first()
		.locator("xpath=..");
}

// ---------------------------------------------------------------------------------------------
// Capture

const manifest = { generated: new Date().toISOString(), states: [] };

function record(id, title, vp, side, data) {
	let s = manifest.states.find((x) => x.id === id && x.vp === vp);
	if (!s) {
		s = { id, title, vp, local: null, prod: null, notes: {} };
		manifest.states.push(s);
	}
	if (data.file) s[side] = data.file;
	if (data.note) s.notes[side] = data.note;
}

/** Screenshot of the map container, or of `clip` (container pixels), clamped to it. */
async function shot(page, side, vp, id, title, clip) {
	const r = await mapRect(page);
	let c = { x: r.x, y: r.y, width: r.width, height: r.height };
	if (clip) {
		const x = Math.max(0, Math.min(clip.x, r.width - 40));
		const y = Math.max(0, Math.min(clip.y, r.height - 40));
		c = {
			x: r.x + x,
			y: r.y + y,
			width: Math.min(clip.width, r.width - x),
			height: Math.min(clip.height, r.height - y)
		};
	}
	const file = `${vp}-${id}-${side === "local" ? "5.0" : "4.3"}.png`;
	await page.screenshot({ path: `${OUT}/${file}`, clip: c });
	record(id, title, vp, side, { file });
	log(`  ${vp} ${side} ${id}`);
}

function around(p, w, h) {
	return { x: Math.round(p.x - w / 2), y: Math.round(p.y - h / 2), width: w, height: h };
}

/** Runs one state on both sides: local first (which may find targets), then production. */
/** With --states a,b: capture only those states (merged into the last capture). */
const STATES = arg("states", "COMPARE_STATES")
	? new Set(arg("states", "COMPARE_STATES").split(","))
	: null;
const wanted = (ids) => !STATES || ids.some((id) => STATES.has(id));

async function both(sides, vp, id, title, fn) {
	if (!wanted([id])) return;
	const t = {};
	for (const side of ["local", "prod"]) {
		const page = sides[side];
		if (side === "prod" && fn.length >= 3 && t.failed) {
			record(id, title, vp, side, { note: "Skipped: the 5.0 side found nothing to point at." });
			continue;
		}
		try {
			await fn(page, side, t);
		} catch (e) {
			const msg = redact(e.message.split("\n")[0]);
			log(`  ${vp} ${side} ${id} FAILED: ${msg}`);
			record(id, title, vp, side, { note: `not captured: ${msg}` });
			if (side === "local") t.failed = true;
			try {
				await page.keyboard.press("Escape");
				await parkMouse(page);
			} catch {
				/* the page may be gone */
			}
		}
	}
}

// The local stack has no collocation (calibration) records, so the local page is served the
// public list (one GET of a public endpoint, cached for the run) to compare how sites look.
const calibrations = new Map();
async function useProdCalibrations(context) {
	await context.route("**/api/2.0/calibrations/**", async (route) => {
		try {
			const u = new URL(route.request().url());
			const key = `${u.pathname}${u.search}`;
			if (!calibrations.has(key)) {
				calibrations.set(
					key,
					await fetch(`${PROD}${key}`).then(async (r) => ({
						status: r.status,
						body: await r.text()
					}))
				);
			}
			const hit = calibrations.get(key);
			await route.fulfill({
				status: hit.status,
				contentType: "application/json",
				headers: { "access-control-allow-origin": "*" },
				body: hit.body
			});
		} catch {
			await route.continue();
		}
	});
}

async function open(context, side, path, { waitReady = true } = {}) {
	const page = await context.newPage();
	const base = side === "local" ? LOCAL : PROD;
	await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
	if (waitReady) {
		try {
			await page.waitForFunction(READY, null, { timeout: 90000 });
		} catch {
			// One reload for a load that stalled (a slow tile or API response).
			log(`  ${side} ${path}: not ready after 90 s, reloading once`);
			await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
			await page.waitForFunction(READY, null, { timeout: 90000 });
		}
		await page.waitForTimeout(3500);
		if (side === "local") await hookMap(page);
		await parkMouse(page);
	}
	return page;
}

async function captureViewport(browser, vp) {
	const v = VIEWPORTS[vp];
	log(`${vp}:`);
	const prodCtx = await browser.newContext({ viewport: v, deviceScaleFactor: v.deviceScaleFactor });
	// The production map sits under the site's header; the local page gets a viewport of the
	// map's height so both maps are the same size and show the same view.
	let sides = { prod: await open(prodCtx, "prod", "/") };
	const pr = await mapRect(sides.prod);
	const localViewport = { width: v.width, height: Math.round(pr.height) };
	const localCtx = await browser.newContext({
		viewport: localViewport,
		deviceScaleFactor: v.deviceScaleFactor
	});
	await useProdCalibrations(localCtx);
	sides.local = await open(localCtx, "local", "/");
	manifest.viewports ??= {};
	manifest.viewports[vp] = { prod: v, prodMap: pr, local: localViewport };
	const wide = v.width >= 768;

	// --- A: the map at load, menus, legend, tooltips, wind, themes, fire ---
	await both(sides, vp, "load", "Map at load", async (p, side) => {
		await shot(p, side, vp, "load", "Map at load");
	});
	await both(sides, vp, "legend", "Legend (default pollutant)", async (p, side) => {
		const box = await (await legendCard(p)).boundingBox();
		const r = await mapRect(p);
		await shot(p, side, vp, "legend", "Legend (default pollutant)", {
			x: box.x - r.x - 8,
			y: box.y - r.y - 8,
			width: box.width + 16,
			height: box.height + 16
		});
	});
	await both(sides, vp, "legend-collapsed", "Legend collapsed", async (p, side) => {
		const card = await legendCard(p);
		await card.locator("button").first().click();
		await p.waitForTimeout(400);
		const box = await card.boundingBox();
		const r = await mapRect(p);
		await shot(p, side, vp, "legend-collapsed", "Legend collapsed", {
			x: box.x - r.x - 8,
			y: box.y - r.y - 8,
			width: box.width + 16,
			height: box.height + 16
		});
		await card.locator("button").first().click();
		await p.waitForTimeout(300);
	});

	if (!wide) {
		await both(sides, vp, "options-panel", "Options panel", async (p, side) => {
			await p.getByRole("button", { name: "Open map options" }).click();
			await p.waitForTimeout(500);
			await shot(p, side, vp, "options-panel", "Options panel");
			await p.getByRole("button", { name: "Close map options" }).click();
			await p.waitForTimeout(400);
		});
	}
	const menuClip = wide ? { x: 0, y: 0, width: 1000, height: 640 } : undefined;
	for (const id of Object.keys(MENU_INDEX)) {
		const sid = `menu-${id}`;
		const title = `${id[0].toUpperCase()}${id.slice(1)} menu (${wide ? "toolbar" : "panel"})`;
		await both(sides, vp, sid, title, async (p, side) => {
			await withMenu(p, id, () => shot(p, side, vp, sid, title, menuClip));
		});
	}

	// PM2.5
	await both(sides, vp, "map-pm25", "Map, PM2.5", async (p, side) => {
		await withMenu(p, "pollutant", () => clickRow(p, "pollutant", "PM2.5"));
		await p.waitForTimeout(3500);
		await shot(p, side, vp, "map-pm25", "Map, PM2.5");
	});
	await both(sides, vp, "legend-pm25", "Legend, PM2.5", async (p, side) => {
		const box = await (await legendCard(p)).boundingBox();
		const r = await mapRect(p);
		await shot(p, side, vp, "legend-pm25", "Legend, PM2.5", {
			x: box.x - r.x - 8,
			y: box.y - r.y - 8,
			width: box.width + 16,
			height: box.height + 16
		});
	});
	await both(sides, vp, "menu-monitors-pm25", "Monitors menu, PM2.5", async (p, side) => {
		await withMenu(p, "monitors", () =>
			shot(p, side, vp, "menu-monitors-pm25", "Monitors menu, PM2.5", menuClip)
		);
	});

	const tipW = wide ? 560 : 390;
	const tipH = wide ? 380 : 330;
	const monitorPoints = "monitors:points";
	await both(sides, vp, "tip-monitor", "Monitor tooltip", async (p, side, t) => {
		if (side === "local") {
			t.pt = await findFeature(p, {
				layer: monitorPoints,
				apart: 40,
				others: "monitors:(points|cluster-icon)"
			});
			if (t.pt.error) throw new Error(t.pt.error);
		}
		const at = await hoverAt(p, t.pt);
		if (!at) throw new Error("no feature under the pointer");
		await shot(p, side, vp, "tip-monitor", "Monitor tooltip", around(at, tipW, tipH));
		await parkMouse(p);
	});
	await both(sides, vp, "tip-cluster", "Cluster tooltip", async (p, side, t) => {
		if (side === "local") {
			t.pt = await findFeature(p, {
				layer: "monitors:cluster-icon",
				apart: 40,
				others: "monitors:(points|cluster-icon)"
			});
			if (t.pt.error) throw new Error(t.pt.error);
		}
		const at = await hoverAt(p, t.pt);
		if (!at) throw new Error("no feature under the pointer");
		await shot(p, side, vp, "tip-cluster", "Cluster tooltip", around(at, tipW, tipH));
		await parkMouse(p);
	});
	await both(sides, vp, "collocation", "Collocation sites on", async (p, side) => {
		await withMenu(p, "monitors", () => clickRow(p, "monitors", "Collocation Sites"));
		await p.waitForTimeout(2500);
		await shot(p, side, vp, "collocation", "Collocation sites on");
	});
	await both(sides, vp, "tip-collocation", "Collocation tooltip", async (p, side, t) => {
		if (side === "local") {
			t.pt = await findFeature(p, { layer: "colloc", exclude: "selected" });
			if (t.pt.error) throw new Error(t.pt.error);
		}
		const at = await hoverAt(p, t.pt);
		if (!at) throw new Error("no feature under the pointer");
		await shot(p, side, vp, "tip-collocation", "Collocation tooltip", around(at, tipW, tipH));
		await parkMouse(p);
	});
	await both(sides, vp, "collocation-off", "(collocation off)", async (p) => {
		await withMenu(p, "monitors", () => clickRow(p, "monitors", "Collocation Sites"));
		await p.waitForTimeout(800);
	});
	manifest.states = manifest.states.filter((s) => s.id !== "collocation-off");

	await both(sides, vp, "tip-smoke", "Smoke hover", async (p, side, t) => {
		if (side === "local") {
			t.pt = await findFeature(p, { layer: "hms-smoke:fill", polygon: true });
			if (t.pt.error) throw new Error(t.pt.error);
		}
		const r = await mapRect(p);
		await p.mouse.move(r.x + t.pt.x - 20, r.y + t.pt.y);
		await p.mouse.move(r.x + t.pt.x, r.y + t.pt.y, { steps: 3 });
		await p.waitForTimeout(700);
		await shot(p, side, vp, "tip-smoke", "Smoke hover", around(t.pt, tipW, tipH));
		await parkMouse(p);
	});

	await both(sides, vp, "wind", "Wind on", async (p, side) => {
		await withMenu(p, "overlays", () => clickRow(p, "overlays", "Wind"));
		await p.waitForTimeout(7000);
		await shot(p, side, vp, "wind", "Wind on");
		await withMenu(p, "overlays", () => clickRow(p, "overlays", "Wind"));
		await p.waitForTimeout(800);
	});

	// Themes of the default basemap
	let themes = [];
	await both(sides, vp, "themes-list", "", async (p, side, t) => {
		if (side !== "local") return;
		themes = await withMenu(p, "settings", () =>
			p
				.locator("[data-options-menu]")
				.nth(MENU_INDEX.settings)
				.locator("label:has(input[type=radio])")
				.allInnerTexts()
		);
		themes = themes.map((s) => s.trim());
		t.themes = themes;
	});
	manifest.states = manifest.states.filter((s) => s.id !== "themes-list");
	for (const theme of themes) {
		const sid = `theme-${theme.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
		await both(sides, vp, sid, `Theme: ${theme}`, async (p, side) => {
			await withMenu(p, "settings", () => clickRow(p, "settings", theme));
			await p.waitForTimeout(4500);
			await shot(p, side, vp, sid, `Theme: ${theme}`);
		});
	}
	await both(sides, vp, "reset", "After Reset Map Options", async (p, side) => {
		await withMenu(p, "settings", () =>
			p.getByRole("button", { name: "Reset Map Options" }).first().click()
		);
		await p.waitForTimeout(4500);
		if (side === "local") await hookMap(p);
		await shot(p, side, vp, "reset", "After Reset Map Options");
	});

	// Fire at zoom 9 and 10: double-clicks just beside a fire (zoom stays centered there).
	await both(sides, vp, "fire-z9", "Fire at zoom 9", async (p, side, t) => {
		if (side === "local") {
			// Zoom 7 draws fire groups; zoom 10 draws their hotspots, which can sit away from the
			// group's center. Anchor the zoom just beside a hotspot with no monitor close by, so the
			// double-clicks open nothing and the hotspot stays in view.
			t.pt = await p.evaluate(() => {
				const map = window.__map;
				const box = document.querySelector("#SJVAirMonitorMap").getBoundingClientRect();
				const id = Object.keys(map.getStyle().sources).find((k) => /hms-fire:hotspots/.test(k));
				const data = id && map.getSource(id).serialize().data;
				if (!data?.features) return { error: "no fire hotspot data" };
				const monitorLayers = map
					.getStyle()
					.layers.map((l) => l.id)
					.filter((l) => /monitors:(points|cluster-icon)/.test(l));
				const monitors = map
					.queryRenderedFeatures({ layers: monitorLayers })
					.map((f) => map.project(f.geometry.coordinates));
				const pts = data.features
					.map((f) => map.project(f.geometry.coordinates))
					.filter((q) => q.x > 60 && q.y > 90 && q.x < box.width - 80 && q.y < box.height - 60)
					.filter((q) => {
						const el = document.elementFromPoint(box.x + q.x, box.y + q.y);
						return el && el.tagName === "CANVAS";
					})
					.map((q) => ({
						x: Math.round(q.x),
						y: Math.round(q.y),
						clear: Math.min(...monitors.map((m) => Math.hypot(m.x - q.x, m.y - q.y)), 999)
					}))
					.sort((a, b) => b.clear - a.clear);
				return pts[0] ?? { error: "no fire hotspot in view" };
			});
			if (t.pt.error) throw new Error(t.pt.error);
			t.z = { x: t.pt.x - 12, y: t.pt.y };
			// Three zoom steps around t.z leave the hotspot 12 * 2^3 px to its right.
			t.expect = { x: t.z.x + 96, y: t.z.y };
		}
		await dblclickAt(p, t.z);
		await p.waitForTimeout(1500);
		await dblclickAt(p, t.z);
		await p.waitForTimeout(3000);
		await parkMouse(p);
		await shot(p, side, vp, "fire-z9", "Fire at zoom 9");
		await dblclickAt(p, t.z);
		await p.waitForTimeout(3000);
		await parkMouse(p);
		await shot(p, side, vp, "fire-z10", "Fire at zoom 10");
		if (side === "local") {
			t.hot = await findFeature(p, { layer: "hms-fire:hotspots:points", near: t.expect });
			if (t.hot.error) t.hot = t.expect;
		}
		const at = await hoverAt(p, t.hot);
		if (!at) {
			record("tip-fire", "Fire tooltip at zoom 10", vp, side, {
				note: "no feature under the pointer"
			});
			const r = await mapRect(p);
			await p.mouse.move(r.x + t.hot.x, r.y + t.hot.y);
			await p.waitForTimeout(600);
		}
		await shot(p, side, vp, "tip-fire", "Fire tooltip at zoom 10", around(at ?? t.hot, tipW, tipH));
	});
	await sides.prod.close();
	await sides.local.close();

	// --- B: EV chargers, then search and the detail panel ---
	if (
		wanted(["ev", "menu-layers-ev", "legend-ev", "tip-ev-cluster", "ev-popup", "ev-cluster-click"])
	) {
		sides = { prod: await open(prodCtx, "prod", "/"), local: await open(localCtx, "local", "/") };
		await both(sides, vp, "ev", "EV chargers on (clusters)", async (p, side) => {
			await withMenu(p, "layers", () => clickRow(p, "layers", "EV Chargers"));
			await p.waitForTimeout(7000);
			await shot(p, side, vp, "ev", "EV chargers on (clusters)");
		});
		await both(sides, vp, "menu-layers-ev", "Layers menu, EV on", async (p, side) => {
			await withMenu(p, "layers", () =>
				shot(p, side, vp, "menu-layers-ev", "Layers menu, EV on", menuClip)
			);
		});
		await both(sides, vp, "legend-ev", "Legend with EV chargers", async (p, side) => {
			const box = await (await legendCard(p)).boundingBox();
			const r = await mapRect(p);
			await shot(p, side, vp, "legend-ev", "Legend with EV chargers", {
				x: box.x - r.x - 8,
				y: box.y - r.y - 8,
				width: box.width + 16,
				height: box.height + 16
			});
		});
		const evCluster = "ev-l[23].*cluster";
		await both(sides, vp, "tip-ev-cluster", "EV cluster tooltip", async (p, side, t) => {
			if (side === "local") {
				t.pt = await findFeature(p, { layer: evCluster, exclude: "count|label|selected" });
				if (t.pt.error) throw new Error(t.pt.error);
			}
			const at = await hoverAt(p, t.pt);
			if (!at) throw new Error("no feature under the pointer");
			await shot(p, side, vp, "tip-ev-cluster", "EV cluster tooltip", around(at, tipW, tipH));
		});
		await both(sides, vp, "ev-popup", "EV station popup", async (p, side, t) => {
			if (side === "local") {
				t.station = await findFeature(p, {
					layer: "ev-l[23]:points",
					apart: 34,
					others: "ev-l[23]:(points|cluster-circle)|monitors:(points|cluster-icon)"
				});
				if (t.station.error) throw new Error(t.station.error);
			}
			const at = (await hoverAt(p, t.station)) ?? t.station;
			await clickAt(p, at);
			await p.waitForTimeout(1200);
			await parkMouse(p);
			const pop = p.locator("#SJVAirMonitorMap .maplibregl-popup").first();
			const r = await mapRect(p);
			const box = (await pop.count()) ? await pop.boundingBox() : null;
			await shot(
				p,
				side,
				vp,
				"ev-popup",
				"EV station popup",
				box
					? {
							x: box.x - r.x - 40,
							y: box.y - r.y - 40,
							width: box.width + 80,
							height: box.height + 100
						}
					: around(at, tipW, tipH)
			);
		});
		await both(
			sides,
			vp,
			"ev-cluster-click",
			"EV cluster clicked (zooms in)",
			async (p, side, t) => {
				if (side === "local") {
					t.pt = await findFeature(p, {
						layer: "ev-l[23]:cluster-circle",
						apart: 30,
						others: "ev-l[23]:(points|cluster-circle)|monitors:(points|cluster-icon)"
					});
					if (t.pt.error) throw new Error(t.pt.error);
				}
				await clickAt(p, t.pt);
				await p.waitForTimeout(3500);
				await parkMouse(p);
				await shot(p, side, vp, "ev-cluster-click", "EV cluster clicked (zooms in)");
			}
		);
		await sides.prod.close();
		await sides.local.close();
	}

	if (
		wanted([
			"search-place",
			"search-pin",
			"search-monitor",
			"panel",
			"panel-bottom",
			"widget-modal"
		])
	) {
		sides = { prod: await open(prodCtx, "prod", "/"), local: await open(localCtx, "local", "/") };
		await both(sides, vp, "search-place", "Search: place results", async (p, side) => {
			await p.getByRole("button", { name: "Open search" }).click();
			const input = p.getByPlaceholder("Search monitors or locations...");
			await input.click();
			await input.pressSequentially(SEARCH_PLACE, { delay: 80 });
			// Monitors first, then places after the 3 s location fallback and the geocode.
			await p.waitForTimeout(8000);
			await shot(p, side, vp, "search-place", "Search: place results", menuClip);
		});
		await both(sides, vp, "search-pin", "Search: place picked (pin)", async (p, side) => {
			await p.locator("#SJVAirMonitorMap button.h-12:not(:has(img))").first().click();
			await p.waitForTimeout(4000);
			await parkMouse(p);
			await shot(p, side, vp, "search-pin", "Search: place picked (pin)");
		});
		await both(sides, vp, "search-monitor", "Search: monitor results", async (p, side) => {
			const input = p.getByPlaceholder("Search monitors or locations...");
			// Picking a place collapses the box; opening an open box does nothing.
			await p.getByRole("button", { name: "Open search" }).click();
			await p.waitForTimeout(400);
			await input.fill("");
			await input.pressSequentially(SEARCH_MONITOR, { delay: 60 });
			await p.waitForTimeout(3000);
			await shot(p, side, vp, "search-monitor", "Search: monitor results", menuClip);
		});
		await both(sides, vp, "panel", "Detail panel (current readings)", async (p, side) => {
			await p.locator("#SJVAirMonitorMap button.h-12:has(img)").first().click();
			await p.getByText("Data Provided Courtesy Of:").waitFor({ timeout: 30000 });
			await p.waitForTimeout(5000);
			await parkMouse(p);
			await shot(p, side, vp, "panel", "Detail panel (current readings)");
		});
		await both(
			sides,
			vp,
			"panel-bottom",
			"Detail panel scrolled (chart, providers)",
			async (p, side) => {
				await p.evaluate(() => {
					for (const el of document.querySelectorAll("#SJVAirMonitorMap *")) {
						const o = getComputedStyle(el).overflowY;
						if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 4) {
							if (!el.closest("#monitor-map-options-panel")) el.scrollTop = el.scrollHeight;
						}
					}
				});
				await p.waitForTimeout(800);
				await shot(p, side, vp, "panel-bottom", "Detail panel scrolled (chart, providers)");
			}
		);
		await both(sides, vp, "widget-modal", "Widget modal", async (p, side) => {
			const link = p.getByRole("button", { name: "Get the widget!" });
			if (!(await link.isVisible())) {
				throw new Error(
					"the widget link is hidden at this size (tall: min-height 600px, min-width 500px)"
				);
			}
			await link.click();
			await p.waitForTimeout(4000);
			await shot(p, side, vp, "widget-modal", "Widget modal");
		});
		await sides.prod.close();
		await sides.local.close();
	}

	// --- C: a monitor with no current readings (deep link) ---
	if (wanted(["panel-no-readings"])) {
		sides = {
			prod: await open(prodCtx, "prod", `/monitor/${INACTIVE_ID}/`),
			local: await open(localCtx, "local", `/monitor/${INACTIVE_ID}`)
		};
		await both(
			sides,
			vp,
			"panel-no-readings",
			"Detail panel, no current readings",
			async (p, side) => {
				await p.getByText("Data Provided Courtesy Of:").waitFor({ timeout: 30000 });
				await p.waitForTimeout(5000);
				await parkMouse(p);
				await shot(p, side, vp, "panel-no-readings", "Detail panel, no current readings");
			}
		);
		await sides.prod.close();
		await sides.local.close();
	}

	// --- D/E: the load screen (API held back) and its error (API failing), this browser only ---
	if (wanted(["load-screen", "load-error"])) {
		for (const [id, title] of [
			["load-screen", "Load screen"],
			["load-error", "Load screen, monitors failed"]
		]) {
			for (const [side, ctx] of [
				["local", localCtx],
				["prod", prodCtx]
			]) {
				const page = await ctx.newPage();
				const handler =
					id === "load-screen"
						? async (route) => {
								await new Promise((r) => setTimeout(r, 15000));
								await route.continue().catch(() => {});
							}
						: (route) => route.abort();
				await page.route("**/api/2.0/**", handler);
				try {
					await page.goto((side === "local" ? LOCAL : PROD) + "/", {
						waitUntil: "domcontentloaded",
						timeout: 60000
					});
					if (id === "load-screen") {
						await page.locator(".z-50.bg-white").first().waitFor({ timeout: 30000 });
						await page.waitForTimeout(2500);
					} else {
						await page
							.getByText(/Couldn.t load/)
							.first()
							.waitFor({ timeout: 45000 });
						await page.waitForTimeout(800);
					}
					await shot(page, side, vp, id, title);
				} catch (e) {
					const msg = redact(e.message.split("\n")[0]);
					log(`  ${vp} ${side} ${id} FAILED: ${msg}`);
					record(id, title, vp, side, { note: `not captured: ${msg}` });
				}
				await page.unrouteAll({ behavior: "ignoreErrors" });
				await page.close();
			}
		}
	}

	// --- 5.0 only: subscription states need a signed-in user, never used on the public site ---
	if (wanted(["sub-none", "sub-error"])) {
		const subCtx = await browser.newContext({
			viewport: localViewport,
			deviceScaleFactor: v.deviceScaleFactor
		});
		await subCtx.addInitScript(() => {
			globalThis.USER = { is_authenticated: true, api_token: "compare-page-fake-token" };
		});
		for (const [id, title, handler] of [
			[
				"sub-none",
				"Subscriptions, signed in, none (5.0 only)",
				(route) =>
					route.fulfill({ status: 200, contentType: "application/json", body: '{"data":[]}' })
			],
			[
				"sub-error",
				"Subscriptions, status failed (5.0 only)",
				(route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
			]
		]) {
			const page = await subCtx.newPage();
			await page.route("**/alerts/subscriptions/**", handler);
			try {
				await page.goto(`${LOCAL}/monitor/nh78Kf2OSXWtdB0tiNXjdQ`, {
					waitUntil: "domcontentloaded"
				});
				await page.getByText("Data Provided Courtesy Of:").waitFor({ timeout: 30000 });
				await page.waitForTimeout(4000);
				await shot(page, "local", vp, id, title);
				record(id, title, vp, "prod", {
					note: "Not reachable on sjvair.com: needs a signed-in user."
				});
			} catch (e) {
				record(id, title, vp, "local", {
					note: `not captured: ${redact(e.message.split("\n")[0])}`
				});
			}
			await page.close();
		}
		await subCtx.close();
	}
	await prodCtx.close();
	await localCtx.close();
}

// ---------------------------------------------------------------------------------------------
// The page

function labelFor(s) {
	return (
		LABELS[`${s.id}@${s.vp}`] ?? LABELS[s.id] ?? { label: "question", note: "Not reviewed yet." }
	);
}

const esc = (s) =>
	String(s).replace(
		/[&<>"]/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
	);

async function writeHtml() {
	const m = JSON.parse(await readFile(`${OUT}/manifest.json`, "utf8"));
	const rel = relative(dirname(HTML), OUT) || ".";
	const img = (f) => `${rel}/${f}`;
	const order = ["fix", "accessibility", "pending", "question", "same"];
	const states = m.states.filter((s) => s.title);
	const counts = Object.fromEntries(order.map((l) => [l, 0]));
	for (const s of states) counts[labelFor(s).label] = (counts[labelFor(s).label] ?? 0) + 1;
	const questions = states.filter((s) => labelFor(s).label === "question");
	const pairHtml = (s) => {
		const { label, note } = labelFor(s);
		const side = (k, name) =>
			s[k]
				? `<a href="${esc(img(s[k]))}"><img loading="lazy" src="${esc(img(s[k]))}" alt="${esc(`${name}: ${s.title}`)}"></a>`
				: `<div class="missing">${esc(s.notes[k] ?? "not captured")}</div>`;
		return `<section class="pair" id="${esc(`${s.vp}-${s.id}`)}">
<header><h3>${esc(s.title)} <span class="vp">${esc(s.vp)}</span></h3><span class="badge ${esc(label)}">${esc(label)}</span></header>
<p class="note">${esc(note)}</p>
<div class="shots"><figure><figcaption>5.0 (local)</figcaption>${side("local", "5.0")}</figure><figure><figcaption>4.3.0 (sjvair.com)</figcaption>${side("prod", "4.3.0")}</figure></div>
</section>`;
	};
	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Monitor map 5.0 parity</title>
<style>
:root{--bg:#f7f7f5;--fg:#1d1d1b;--muted:#61615c;--card:#fff;--line:#deded8;
--same:#2f6f3e;--fix:#2456a6;--accessibility:#7a3fa0;--pending:#8a6a00;--question:#b3261e;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ececea;--muted:#a3a39e;--card:#1f1f1e;--line:#363633;
--same:#7cc68d;--fix:#8fb4f2;--accessibility:#c9a0e6;--pending:#e2c15a;--question:#f2928b;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.6rem;margin:0 0 4px}h2{margin:32px 0 8px;font-size:1.2rem}
p{margin:6px 0}.muted{color:var(--muted)}a{color:inherit}
table{border-collapse:collapse;margin:8px 0}td,th{border-bottom:1px solid var(--line);padding:4px 12px 4px 0;text-align:left;vertical-align:top}
.badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.8rem;font-weight:600;border:1.5px solid currentColor;white-space:nowrap}
.badge.same{color:var(--same)}.badge.fix{color:var(--fix)}.badge.accessibility{color:var(--accessibility)}.badge.pending{color:var(--pending)}.badge.question{color:var(--question)}
.pair{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;margin:16px 0}
.pair header{display:flex;gap:12px;align-items:center;justify-content:space-between}.pair h3{margin:0;font-size:1.05rem}
.vp{font-weight:400;color:var(--muted);font-size:.85rem;margin-left:6px}.note{color:var(--muted);margin:4px 0 10px}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;min-width:0}figcaption{font-size:.8rem;color:var(--muted);margin-bottom:4px}
.shots img{display:block;max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px}
.missing{padding:24px 12px;border:1px dashed var(--line);border-radius:6px;color:var(--muted);font-size:.9rem}
ul{padding-left:20px}li{margin:3px 0}
@media (max-width:700px){.shots{grid-template-columns:1fr}.pair header{flex-wrap:wrap}}
</style>
</head>
<body><main>
<h1>Monitor map 5.0 parity</h1>
<p class="muted">5.0 on the local stack (left) beside the public map at sjvair.com, 4.3.0 (right). Captured ${esc(m.generated)}. Data differs between the two (local vs production), so compare looks, not values. Click a screenshot for full size.</p>
<p class="muted">The production map sits under the site header; the screenshots show only the map, and the local page is sized to the same map height so both show the same view. Text in the map's own UI uses the site's font on sjvair.com and the browser default locally (the dev page loads no site font).</p>
<h2>Summary</h2>
<table><thead><tr><th>Label</th><th>Pairs</th></tr></thead><tbody>
${order.map((l) => `<tr><td><span class="badge ${l}">${l}</span></td><td>${counts[l] ?? 0}</td></tr>`).join("")}
<tr><td>total</td><td>${states.length}</td></tr></tbody></table>
<h2>Questions</h2>
${questions.length ? `<ul>${questions.map((s) => `<li><a href="#${esc(`${s.vp}-${s.id}`)}">${esc(s.title)} (${esc(s.vp)})</a>: ${esc(labelFor(s).note)}</li>`).join("")}</ul>` : "<p>None.</p>"}
<h2>Known changes</h2>
<ul>
<li><b>Fixes:</b> cluster averages ignore monitors without a reading; a no-reading monitor keeps its shape in neutral; level boundaries half-open; data box parsing; chart label "PM2.5"; Pacific chart days; chart spinner; subscription error line; widget link hidden with no current readings.</li>
<li><b>Accessibility:</b> smoke and fire tooltips; hover tooltips on EV stations; map focus outline; zoom-button tips; readable cluster text; legend level labels and outlined swatches; EV legend status line when NREL fails.</li>
<li><b>Pending map-sdk:</b> the List button is still at map-sdk's default top-left under the toolbar (moves top right, keyboard focus only); the legend box is nested in the "Legend" card (unframed option coming); EV list rows say "No level".</li>
<li><b>EV ZIP list:</b> chargers in Livermore (94550) and Hollister (95023) no longer show; the typo 09534 was dropped. Galt (95632), Isleton (95641) and Discovery Bay (94505) await your decision and are not added.</li>
</ul>
${["desktop", "phone"]
	.map(
		(vp) =>
			`<h2>${vp === "desktop" ? "Desktop 1440×900" : "Phone 390×844"}</h2>\n${states
				.filter((s) => s.vp === vp)
				.map(pairHtml)
				.join("\n")}`
	)
	.join("\n")}
</main></body></html>
`;
	await writeFile(HTML, html);
	log(`wrote ${HTML}`);
}

// ---------------------------------------------------------------------------------------------

async function main() {
	await mkdir(OUT, { recursive: true });
	if (!flag("html-only")) {
		const browser = await chromium.launch({
			args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
		});
		let prev = { states: [] };
		try {
			prev = JSON.parse(await readFile(`${OUT}/manifest.json`, "utf8"));
		} catch {
			/* first run */
		}
		const run = Object.keys(VIEWPORTS).filter((vp) => !ONLY || ONLY === vp);
		try {
			for (const vp of run) {
				try {
					await captureViewport(browser, vp);
				} catch (e) {
					log(`${vp}: stopped early: ${e.message.split("\n")[0]}`);
				}
				// Saved after each viewport; viewports not run this time keep their last capture.
				const fresh = new Set(manifest.states.map((s) => `${s.vp}/${s.id}`));
				const kept = prev.states.filter((s) =>
					STATES ? !fresh.has(`${s.vp}/${s.id}`) : !run.includes(s.vp)
				);
				const states = [...kept, ...manifest.states];
				const viewports = { ...prev.viewports, ...manifest.viewports };
				await writeFile(
					`${OUT}/manifest.json`,
					JSON.stringify({ ...manifest, states, viewports }, null, "\t")
				);
			}
		} finally {
			await browser.close();
		}
	}
	await writeHtml();
}

main().catch((e) => {
	console.error(redact(e.stack ?? e));
	process.exit(1);
});
