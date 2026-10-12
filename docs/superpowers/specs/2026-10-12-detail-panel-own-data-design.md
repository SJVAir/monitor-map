# The monitor detail panel loads its own monitor

Date: 2026-10-12
Target release: 4.2.0 (minor)
Branch: `feat/detail-panel-own-data`

## Goal

Make the detail panel at `/monitor/:id` show a monitor whatever pollutant the map is
coloring by, and stop the chart re-requesting data that cannot have changed.

Today the panel finds its monitor in `monitorsManager.latest`, the current readings for the
map's selected pollutant. A monitor with no reading for that pollutant is not in it, and the
panel renders only its Close button.

Success means:

- Opening any existing monitor shows its name, badges and data, whatever the map's
  pollutant is and whether or not the monitor is active.
- Changing the map's pollutant with a panel open updates the panel in place.
- A chart whose date range does not include today makes no requests on the 2-minute timer.
- A chart whose range does include today picks up new points on that timer.
- The map, its markers and `monitorsManager` behave exactly as they do now.

## Findings this design rests on

- `MonitorDetailPanel.svelte` derives `monitor` from
  `monitorsManager.latest?.get(route.params.id)`. Everything below the Close button is inside
  `{#if monitor}`.
- Production's `default_pollutant` is `o3`. On the local data set 37 monitors have an ozone
  reading and 566 a PM2.5 one, so a link to `/monitor/:id` without `?pollutant=pm25` is blank
  for most monitors. Inactive and unknown ids are blank under either pollutant.
- sjvair-mobile's `Alerts.svelte` navigates to a monitor without a pollutant. `PMGauge` and
  `Subscriptions` pass `pollutant: "pm25"`, a workaround for this.
- `@sjvair/sdk` exports `getMonitorDetails(id)` (`/api/2.0/monitors/<id>/`). Its response has
  the same fields as a list entry plus `latest`, a record keyed by entry type
  (`pm25`, `o3`, `pm10`, `temperature`, ...), each with `value`, `timestamp`, `stage` and
  `processor`. It answers for inactive monitors. An unknown id is a 404, which the SDK
  raises as an `APIError` whose `cause` is the response.
- Monitor metadata lists the entry types each monitor type publishes. Only `airnow`
  publishes both `o3` and `pm25`; every other type publishes one of them.
- The map's pollutant is assumed in four places behind the panel: the monitor lookup, the
  chart's data request and CSV link (`monitorsManager.pollutant`), the chart's axis label
  and color bands (`monitorsManager.levels` in `chart-utils.ts`), and the chart tooltip
  (`monitorsManager.levels` in `tooltip.ts`).
- `DataChart.svelte` reloads whenever its `monitor` prop changes identity, which is every
  2-minute refresh, whatever the date range. A range that ends today has its `end` fixed
  at the moment it was created (`createDateRange`), so those reloads request the same
  window and never return newer points.
- `monitorsManager.update()` assigns a new `latest` map on every refresh, so `latest`
  changing identity is the signal that the map refreshed.
- The per-monitor lookup keeps returning an inactive monitor's last reading, however old:
  of 40 inactive monitors sampled locally, 29 had a PM2.5 or ozone value, some about eight
  months old. So a reading counts as current only when `is_active` is true.
- For PurpleAir PM2.5 the API returns different stages from different endpoints: the bulk
  `current` endpoint returns `calibrated`, the per-monitor endpoints return `cleaned`. Other
  monitor types agree. This is recorded as a backend fix and is out of scope here.

## Decisions

- **Data source.** The panel always reads the per-monitor lookup, never the map's readings.
  One path, one data shape. Until the backend returns consistent stages, a PurpleAir
  monitor's data box shows the cleaned value and will not match its map marker.
- **Pollutant.** The panel shows the map's pollutant when the monitor has it, otherwise the
  one the monitor has. No new control.
- **Refresh.** On each map refresh the panel re-fetches its monitor, so the data box stays
  current. The chart refreshes on that signal only when its date range includes today.
- **Temperature.** Unchanged: the weather lookup by coordinates.
- **Marker highlight.** Unchanged. A monitor that is not on the map has no marker to
  highlight.

## Design

### `monitor-details.svelte.ts` (new, `src/lib/monitors/`)

A rune module exporting a `MonitorDetailsState` class. The panel creates one instance.

- `monitor: MonitorDetails | null` (`$state.raw`).
- `status: "loading" | "ready" | "not-found" | "failed"`.
- `load(id)`: clears `monitor`, sets `loading`, requests the monitor. A 404 sets
  `not-found`; any other failure sets `failed` and logs it.
- `refresh()`: re-requests the current id without clearing `monitor` or changing `status`.
  A failed refresh keeps the data already shown and logs the error.
- `retry()`: `load()` for the current id.
- Each request carries a sequence number; a response for anything but the latest request is
  dropped. This covers switching monitors while a request is in flight.

It does not import `monitorsManager`. The panel decides when to call it.

### `panel-pollutant.ts` (new, `src/lib/monitors/`)

Pure functions, no runes.

- `readingPollutants(monitor)`: the members of `["pm25", "o3"]` that `monitor.latest` has a
  value for.
- `publishedPollutants(monitorType, meta)`: the members of `["pm25", "o3"]` the metadata
  marks as published for that monitor type.
- `choosePanelPollutant(mapPollutant, monitor, meta)` returns
  `{ pollutant, hasReading }`:
  1. For an active monitor: `mapPollutant` if `readingPollutants` contains it, else the
     first of `readingPollutants`, with `hasReading: true`.
  2. Otherwise (inactive, or nothing reported), with `hasReading: false`: `mapPollutant` if
     the type publishes it, else the first published one; if the type publishes neither,
     the same choice among the pollutants it last reported.
  3. Else `pollutant: null`.

### `DateRange.ts` (changed)

- `includesToday(range)`: whether `range.end` falls on the current calendar day.
- `extendToNow(range)`: the same range with `end` set to now.

### `MonitorDetailPanel.svelte` (changed)

- Creates a `MonitorDetailsState` and calls `load(route.params.id)` in an effect on the id.
- An effect on `monitorsManager.latest` calls `details.refresh()` and increments a
  `refreshTick` each time `latest` becomes a new non-null map after the first run (the
  manager sets it to null while a pollutant change is loading; that is ignored). Reading the
  id and status inside it is untracked.
- `panel = $derived(choosePanelPollutant(monitorsManager.pollutant, details.monitor, meta))`.
- The data box reads `details.monitor.latest[panel.pollutant]` and that entry type's label
  and levels from the metadata.
- The temperature effect, widget modal, subscription manager and data providers read
  `details.monitor` in place of the old `monitor`.

States:

| Status | Content below the Close button |
| --- | --- |
| `loading` | "Loading…" |
| `ready`, `hasReading` | Name, badges, temperature and data boxes, widget link, subscriptions, chart, data providers |
| `ready`, pollutant differs from the map's | The same, plus one line under the badges: "Showing PM2.5. This monitor has no ozone readings." (labels from the metadata) |
| `ready`, `hasReading` false | Name, badges, "This monitor has no current readings.", chart, data providers. No data box |
| `ready`, `pollutant` null | Name, badges, "This monitor has no current readings.", data providers. No chart |
| `not-found` | "Monitor not found." |
| `failed` | `LoadError` with "Couldn't load this monitor." and `details.retry` |

### Chart (changed)

`DataChart.svelte` props become:

- `monitor`: the fields it uses (`id`, `type`, `data_source`), satisfied by `MonitorDetails`.
- `pollutant: "pm25" | "o3"`.
- `refreshTick: number`.

Changes:

- Levels and label come from `monitorsManager.meta.entryType(pollutant)`, derived in the
  component and passed down. `monitorsManager.meta` is shared metadata, not the map's
  selection.
- `fetchChartData(monitor, range, pollutant)` and the CSV URL use the prop.
- `getChartConfig(...)` and the tooltip builder take `levels` and `label` as arguments.
  `chart-utils.ts` and `tooltip.ts` stop importing `monitorsManager`.
- Loading is driven by an effect on `monitor.id` and `pollutant`, not on the monitor
  object's identity.
- The chart remembers whether its range was live when chosen (`includesToday` at creation
  and on each calendar selection). An effect on `refreshTick` does nothing unless it was;
  otherwise it sets the range to `extendToNow(dateRange)` and reloads without hiding the
  current chart. Remembering, not re-testing each tick, keeps a panel left open past
  midnight following the present.
- A response for a superseded chart request is dropped.
- The calendar selection is not moved by `extendToNow`; only the request window is.

### Unchanged

`monitorsManager`, `MonitorsMapIntegration`, `MonitorMapLayout`, the route tables,
`LazyMonitorDetailPanel`, `MonitorWidgetModal` and `MonitorSubscriptionManager`.

## Error handling

- Initial load failure: the `failed` state with a retry.
- Unknown id: the `not-found` state, no retry.
- Refresh failure: logged; the panel keeps showing the last data.
- Chart request failure: unchanged, the chart shows "No Data Available For Selected Date
  Range".
- Metadata not yet loaded: the panel shows "Loading…" until both the monitor and
  `monitorsManager.meta` are available.

## Testing

Unit, in the existing `server` project:

- `panel-pollutant`: map's pollutant present; absent with the other present; both present;
  no reading with the map's pollutant published; no reading with only the other published;
  nothing published.
- `MonitorDetailsState` with `@sjvair/sdk` mocked: a successful load; a 404; another
  failure followed by a successful `retry`; a slow response for a previous id dropped; a
  failed `refresh` keeping the data.
- `DateRange`: `includesToday` for a range ending today, yesterday, and created by
  `createDateRange()` with no arguments; `extendToNow` moving only `end`.

Browser, against a dev server:

- A PM2.5-only monitor with the map on ozone: full panel with the "Showing PM2.5" line.
- An AirNow monitor with both: follows the map's pollutant, and updates when it is switched
  with the panel open.
- An inactive monitor: header, the no-readings line and a chart.
- An unknown id: "Monitor not found."
- A past date range held across a refresh: no entries request, while the monitor request
  still happens.
- A range including today held across a refresh: one entries request with a later end.

## Out of scope

- The backend returning the same PM2.5 stage from every endpoint.
- A `stage` option on the SDK's `getMonitorEntries`.
- Removing the `pollutant: "pm25"` workaround from sjvair-mobile, or adding one to
  `Alerts.svelte`; both become unnecessary.
- A pollutant switch inside the panel.
