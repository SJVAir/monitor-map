import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import { getMonitorDetails, type MonitorDetails } from "@sjvair/sdk";
import "../../src/app.css";
import MonitorDetailPanel from "$lib/MonitorDetailPanel.svelte";
import { ROUTER_KEY, type MonitorMapRouterApi } from "$lib/router-context";
import { fetchTempByCoords } from "$lib/weather";
import { monitorMapUserChanged } from "$lib/user.svelte.js";

vi.mock("@sjvair/sdk", async (importOriginal) => ({
	...(await importOriginal<typeof import("@sjvair/sdk")>()),
	getMonitorDetails: vi.fn()
}));

vi.mock("$lib/weather", () => ({ fetchTempByCoords: vi.fn() }));

vi.mock("$lib/monitors/subscriptions", () => ({
	getApiToken: () => "t",
	loadSubscriptionLevel: vi.fn(() => Promise.resolve(null))
}));

vi.mock("$lib/data-chart/requests", () => ({
	fetchChartData: vi.fn(() => Promise.resolve([[], []]))
}));

vi.mock("uplot", () => ({
	default: vi.fn(function () {
		return { destroy: vi.fn() };
	})
}));

vi.mock("$lib/monitors/monitors.svelte.js", () => {
	const entryTypes: Record<string, { label: string; scale: null }> = {
		pm25: { label: "PM2.5", scale: null },
		o3: { label: "O₃", scale: null }
	};
	return {
		monitorsManager: {
			meta: {
				monitors: { purpleair: { entries: { pm25: { published: true } } } },
				entryType: (pollutant: string) => entryTypes[pollutant],
				monitorType: () => ({ expected_interval: "2m" })
			},
			pollutant: "pm25",
			store: { latest: new Map() }
		}
	};
});

const detailsMock = vi.mocked(getMonitorDetails);
const tempMock = vi.mocked(fetchTempByCoords);

function monitor(overrides: Partial<MonitorDetails> = {}): MonitorDetails {
	return {
		id: "m1",
		name: "Test Monitor",
		type: "purpleair",
		device: "PA-II",
		county: "Fresno",
		location: "outside",
		is_active: true,
		is_sjvair: false,
		position: { type: "Point", coordinates: [-119.8, 36.7] },
		data_source: { name: "PurpleAir", url: "https://example.com" },
		data_providers: [{ name: "PurpleAir", url: "https://example.com" }],
		latest: { pm25: { value: "4.93", timestamp: "2026-11-05T03:28:00Z" } },
		...overrides
	} as unknown as MonitorDetails;
}

const router = {
	route: { params: { id: "m1" } },
	navigate: vi.fn(),
	p: vi.fn(),
	isActive: Object.assign(vi.fn(), { startsWith: vi.fn() }),
	basePath: ""
} as unknown as MonitorMapRouterApi;

function renderPanel() {
	return render(MonitorDetailPanel, { context: new Map([[ROUTER_KEY, router]]) });
}

beforeEach(async () => {
	// The app.css `tall` variant: min-height 600px and min-width 500px.
	await page.viewport(1000, 800);
	tempMock.mockResolvedValue(72);
});

afterEach(() => {
	vi.clearAllMocks();
	delete (globalThis as { USER?: unknown }).USER;
	monitorMapUserChanged();
});

describe("MonitorDetailPanel", () => {
	it("shows a monitor with no current readings without the widget link", async () => {
		(globalThis as { USER?: unknown }).USER = { is_authenticated: true, api_token: "t" };
		detailsMock.mockResolvedValue(monitor({ is_active: false }));

		const screen = await renderPanel();

		await expect.element(screen.getByText("This monitor has no current readings.")).toBeVisible();
		await expect.element(screen.getByText("Temperature")).toBeVisible();
		await expect.element(screen.getByText("72°F")).toBeVisible();
		await expect.element(screen.getByRole("button", { name: "Subscribe to Alerts" })).toBeVisible();
		expect(screen.getByText("Get the widget!").query()).toBeNull();
		expect(tempMock).toHaveBeenCalledWith([-119.8, 36.7]);
	});

	it("shows an active monitor's reading, cut off, and the widget link on a tall viewport", async () => {
		detailsMock.mockResolvedValue(monitor());

		const screen = await renderPanel();

		await expect.element(screen.getByText("(2m avg)")).toBeVisible();
		await expect.element(screen.getByText("4", { exact: true })).toBeVisible();
		await expect.element(screen.getByRole("button", { name: "Get the widget!" })).toBeVisible();
		expect(screen.getByText("This monitor has no current readings.").query()).toBeNull();
	});

	it("hides the widget link on a short viewport", async () => {
		await page.viewport(1000, 500);
		detailsMock.mockResolvedValue(monitor());

		const screen = await renderPanel();

		await expect.element(screen.getByText("(2m avg)")).toBeVisible();
		// Rendered but hidden by the `tall:` variant (getByRole would skip it as hidden).
		await expect.element(screen.getByText("Get the widget!")).toBeInTheDocument();
		await expect.element(screen.getByText("Get the widget!")).not.toBeVisible();
	});
});

describe("logged-in user", () => {
	const g = globalThis as { USER?: { is_authenticated?: boolean; api_token?: string } };
	const subscribe = () => screen.getByRole("button", { name: "Subscribe to Alerts" });
	let screen: Awaited<ReturnType<typeof renderPanel>>;

	beforeEach(() => {
		detailsMock.mockResolvedValue(monitor());
	});

	it("hides the subscribe control after logout", async () => {
		g.USER = { is_authenticated: true, api_token: "t" };
		screen = await renderPanel();
		await expect.element(subscribe()).toBeVisible();

		g.USER = { is_authenticated: false };
		monitorMapUserChanged();

		await expect.element(subscribe()).not.toBeInTheDocument();
	});

	it("shows it after login", async () => {
		g.USER = { is_authenticated: false };
		screen = await renderPanel();
		await expect.element(screen.getByText("Data Provided Courtesy Of:")).toBeVisible();
		expect(subscribe().query()).toBeNull();

		g.USER = { is_authenticated: true, api_token: "t" };
		monitorMapUserChanged();

		await expect.element(subscribe()).toBeVisible();
	});

	it("follows a field edited in place", async () => {
		g.USER = { is_authenticated: true, api_token: "t" };
		screen = await renderPanel();
		await expect.element(subscribe()).toBeVisible();

		g.USER.is_authenticated = false;
		monitorMapUserChanged();

		await expect.element(subscribe()).not.toBeInTheDocument();
	});

	it("ignores a change it isn't told about", async () => {
		g.USER = { is_authenticated: true, api_token: "t" };
		screen = await renderPanel();
		await expect.element(subscribe()).toBeVisible();

		g.USER = { is_authenticated: false };
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(subscribe().query()).not.toBeNull();
	});
});
