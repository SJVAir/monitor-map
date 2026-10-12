// Proves the light entries stay light: bundles each one from dist/lib the way a host app
// would and fails if maplibre is reachable without a dynamic import. Run through
// `npm run test:bundle`, which builds dist/lib first.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { enhancedImages } from "@sveltejs/enhanced-img";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const HEAVY = /maplibre/i;
// The shape sv-router's isLazyImport() looks for; it must survive minification.
const LAZY_IMPORT = /\(\)\s?=>\s?import\(/g;
const FIXTURE = "virtual:bundle-check";

const failures = [];

function entryFile(subpath) {
	const entry = pkg.exports[subpath];
	if (!entry) {
		failures.push(`package.json has no "${subpath}" export`);
		return null;
	}
	for (const condition of ["svelte", "types", "default"]) {
		if (!entry[condition]) {
			failures.push(`"${subpath}" export has no "${condition}" condition`);
		} else if (!existsSync(resolve(root, entry[condition]))) {
			failures.push(`"${subpath}" export's "${condition}" file is missing: ${entry[condition]}`);
		}
	}
	return entry.svelte ? resolve(root, entry.svelte) : null;
}

// Bundles a module that imports everything from `files`, and splits the output chunks into
// those loaded up front (the entry and its static imports) and those behind a dynamic import.
async function bundle(files) {
	const code =
		files.map((file, i) => `import * as m${i} from ${JSON.stringify(file)};`).join("\n") +
		`\nglobalThis.__keep = [${files.map((_, i) => `m${i}`).join(", ")}];\n`;

	const result = await build({
		configFile: false,
		root,
		logLevel: "error",
		plugins: [
			{
				name: "bundle-check-fixture",
				resolveId: (id) => (id === FIXTURE ? "\0" + FIXTURE : null),
				load: (id) => (id === "\0" + FIXTURE ? code : null)
			},
			enhancedImages(),
			svelte()
		],
		build: { write: false, rolldownOptions: { input: FIXTURE } }
	});

	const output = (Array.isArray(result) ? result[0] : result).output;
	const chunks = output.filter((item) => item.type === "chunk");
	const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));

	const eagerNames = new Set();
	const queue = chunks.filter((chunk) => chunk.isEntry).map((chunk) => chunk.fileName);
	while (queue.length > 0) {
		const name = queue.pop();
		if (eagerNames.has(name)) continue;
		eagerNames.add(name);
		queue.push(...byName.get(name).imports);
	}

	return {
		eager: chunks.filter((chunk) => eagerNames.has(chunk.fileName)),
		lazy: chunks.filter((chunk) => !eagerNames.has(chunk.fileName))
	};
}

const size = (chunks) => chunks.reduce((total, chunk) => total + chunk.code.length, 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const core = entryFile("./core");
const routes = entryFile("./routes");

if (core) {
	const { eager } = await bundle([core]);
	console.log(`./core            eager ${kb(size(eager))}`);
	if (eager.some((chunk) => HEAVY.test(chunk.code))) {
		failures.push('"./core" pulls maplibre into the startup bundle');
	}
}

if (core && routes) {
	const { eager, lazy } = await bundle([core, routes]);
	console.log(`./core + ./routes eager ${kb(size(eager))}, lazy ${kb(size(lazy))}`);
	if (eager.some((chunk) => HEAVY.test(chunk.code))) {
		failures.push('"./core" + "./routes" pull maplibre into the startup bundle');
	}
	// Guards the check itself: if maplibre is in no chunk at all, HEAVY is matching nothing.
	if (!lazy.some((chunk) => HEAVY.test(chunk.code))) {
		failures.push("no lazy chunk contains maplibre, so this check cannot detect it");
	}
	const lazyImports = eager.flatMap((chunk) => chunk.code.match(LAZY_IMPORT) ?? []);
	if (lazyImports.length < 3) {
		failures.push(
			`expected the layout and both routes to stay \`() => import(...)\` in the startup ` +
				`bundle, found ${lazyImports.length}`
		);
	}
}

if (failures.length > 0) {
	console.error("\nBundle check failed:");
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}

console.log("Bundle check passed.");
