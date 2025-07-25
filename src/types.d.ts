import type { AxiosResponse } from "axios";
import type { Dayjs } from "dayjs";
import type L from "./modules/Leaflet";
import type { Monitor } from "./Monitors";
import type { MonitorFieldColors } from "./Monitors";
import type { MonitorDataField } from "./MonitorDataFields";
import { Ref } from "vue";

declare module "leaflet" {
  export function shapeMarker(latLng: L.LatLngExpression, IShapeOpions): ShapeMarker;

  export interface ShapeMarkerOpions extends L.CircleMarkerOptions {
    shape: "diamond" | "square" | "circle" | "triangle-up";
  }

  declare class ShapeMarker extends L.CircleMarker {
    options: ShapeMarkerOpions;

    setRadius(radius: number): ShapeMarker;
    getRadius(): number;

    setRotation(rotation: number): ShapeMarker;
    getRotation(): number;

    toGeoJSON(): InstanceType<L.GeoJSON>;
  }
}

declare module "dayjs" {
  export function $prettyPrint(date: string | Date | dayjs.Dayjs): string;
  export function $defaultFormat(date: string | Date | dayjs.Dayjs): string;

  interface Dayjs {
    skewedDiff(toDiff: string, skewValue: number): number;
  }
}

// Function Types
export type PromiseResolver = (value: unknown) => void;
export type PromiseRejector = (reason?: any) => void;

// Utility types
export type Nullable<T> = T | null;
export type Override<T, U> = Omit<T, keyof U> & U;
export type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;
export type ReplaceReturnType<T extends (...a: any) => any, R> = (...a: Parameters<T>) => R;
export type ValueOf<T> = T[keyof T];

// Data types
export type ChartDataArray = Array<Array<ChartDataPoint>>;
export type ChartDataField = keyof typeof MonitorFieldColors;
export type DatePickerSelection = [Date, Date] | [string, string];
//export type ChartDataRecord = Record<ChartDataField, Array<ChartDataPoint>>;
export type MonitorDevice = "PurpleAir" | "BAM 1022" | "AQview" | "PA-II-FLEX" | "PA-II" | "PA-II-SD";
export type EntriesPageResponse = AxiosResponse<IEntriesPageResponse, any>;
// Declare first element should always be default
export type MapTilesetCollection = [Override<ILeafletTileLayer, { isDefault: true }>, ...ILeafletTileLayer[]];
export type MonitorDataFieldName = "pm10" | "pm25" | "pm25_avg_15" | "pm25_avg_60" | "pm100";
export type MonitorFieldColor = ValueOf<typeof MonitorFieldColors>;
export type MonitorId = Monitor["data"]["id"];
export type MonitorsRecord = Record<MonitorId, Monitor>;
export type MonitorSerachParams = { id: string } | { name: string } | { county: string } | ((m: Monitor) => Monitor);

// Interfaces
export interface IActiveMonitor {
  entries: Array<IMonitorEntry>;
  monitor: Monitor;
}

export interface IWorkerServiceModule {
  [key: string]: (...input: Array<any>) => any;
}

export interface IChartDataPoint {
  xData: any;
  yData: number;
}

export interface IDateRange {
  startDate: string | typeof Dayjs;
  endDate: string | typeof Dayjs;
}

export interface IEntriesPageResponse {
  count: number;
  data: Array<any>;
  has_next_page: boolean;
  has_previous_page: boolean;
  page: number;
  pages: number;
}

export interface IEvStation {
  access_code: string
  access_days_time: string;
  access_detail_code: string;
  cards_accepted: null | string;
  date_last_confirmed: string;
  groups_with_access_code: string;
  id: number;
  station_name: string;
  station_phone: string,
  updated_at: string,
  facility_type: string,
  latitude: number,
  longitude: number,
  city: string,
  state: string,
  street_address: string,
  zip: string,
  country: string,
  ev_connector_types: Array<string>,
  ev_dc_fast_num: number,
  ev_network: string,
  ev_pricing: string,
}

export interface ILeafletTileLayer {
  containerClass?: string;
  isDefault?: boolean;
  svg?: string;
  icon?: string;
  label: string;
  options: ITileLayerOptions;
  urlTemplate: string;
}

export interface IMarkerParams {
  border_color: string;
  border_size: number;
  fill_color: string;
  value_color: string;
  size: number;
  shape: string;
}

export interface IMonitorDataSource {
  name: "AirNow.gov" | "AQview" | "Central California Asthma Collaborative" | "PurpleAir";
  url: string;
}

export interface IMonitorProvider {
  name: string;
  url: string;
}

export interface IMonitorEntry {
  timestamp: string;
  sensor: string;
  [field: string]: string;
}

export interface IMonitorManager {
  monitors: MonitorsRecord;
  sjvAirPurple: MonitorsRecord;
  sjvAirInactive: MonitorsRecord
  sjvAirBAM: MonitorsRecord;
  purpleAir: MonitorsRecord;
  purpleAirInside: MonitorsRecord;
  airNow: MonitorsRecord;
}

export interface IMonitorPosition {
  type: string;
  coordinates: [number, number];
}

export interface IMonitorSensorData {
  fahrenheit: string;
  id: string;
  celcius: string;
  humidity: string;
  pm10: string;
  pm25: string;
  pm100: string;
  pm25_avg_15: string;
  pm25_avg_60: string;
  pm10_standard: string;
  pm25_standard: string;
  pm100_standard: string;
  particles_03um: string;
  particles_05um: string;
  particles_10um: string;
  particles_25um: string;
  particles_50um: string;
  particles_100um: string;
  pressure: string | null;
  sensor: string;
  timestamp: string;
}

export interface IMonitorSubscription {
  level: "unhealthy_sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";
  monitor: IMonitorSensorData["id"];
}

export interface IMonitorVisibility {
  SJVAirPurpleAir: IMonitorVisibilityOptions;
  SJVAirBAM: IMonitorVisibilityOptions;
  PurpleAir: IMonitorVisibilityOptions;
  PurpleAirInside: IMonitorVisibilityOptions;
  AirNow: IMonitorVisibilityOptions;
  displayInactive: IMonitorVisibilityOptions;
}

export interface IMonitorVisibilityOptions {
  containerClass?: string;
  icon: string;
  isChecked: boolean;
  label: string;
}

export interface IOverlayTileset extends ILeafletTileLayer, IMonitorVisibilityOptions {
  isChecked: Ref<boolean>;
}

export interface ITileLayerOptions extends L.TileLayerOptions {
  apiKey?: string;
}

