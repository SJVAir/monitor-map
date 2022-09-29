import type { AxiosResponse } from "axios";
import type { Dayjs } from "dayjs";
import type L from "./modules/Leaflet";
import type { Monitor } from "./Monitors";
import type { ChartDataPoint, MonitorField } from "./models";
import type { MonitorFieldColors } from "./modules";
import type { MonitorDataField } from "./MonitorDataFields";

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

// Value types
export type ChartDataArray = Array<Array<ChartDataPoint>>;
export type ChartDataField = keyof typeof MonitorFieldColors;
//export type ChartDataRecord = Record<ChartDataField, Array<ChartDataPoint>>;
export type MonitorDevice = "AirNow" | "BAM1022" | "PurpleAir";
export type EntriesPageResponse = AxiosResponse<IEntriesPageResponse, any>;
// Declare first element should always be default
export type MapTilesetCollection = [Override<ILeafletTileLayer, { isDefault: true }>, ...ILeafletTileLayer[]];
export type MonitorDataFieldName = "pm10" | "pm25" | "pm25_avg_15" | "pm25_avg_60" | "pm100";
export type MonitorFieldColor = ValueOf<typeof MonitorFieldColors>;
export type MonitorId = Monitor["data"]["id"];
export type MonitorsRecord = Record<MonitorId, Monitor>;
export type MonitorSerachParams = { id: string} | { name: string } | { county: string } | ((m: Monitor) => Monitor);

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

export interface IColorLevel {
  min: number;
  color: string;
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

export interface ILeafletTileLayer {
  isDefault?: boolean;
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

export interface IMonitor {
  data: IMonitorData;
  dataFields: Array<ChartDataField>;
  displayField: MonitorDataField;
  lastUpdated: string;
  markerParams: Partial<IMarkerParams>;
  monitorFields: Record<ChartDataField, MonitorField>;
}

export interface IMonitorData {
  id: string;
  name: string;
  device: MonitorDevice;
  is_active: boolean;
  is_sjvair: boolean;
  position: IMonitorPosition;
  last_active_limit: number;
  location: string;
  latest: IMonitorSensorData;
  county: string;
  purple_id: number | null;
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
  SJVAirPurple: IMonitorVisibilityOptions;
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
  isChecked: boolean;
}

//export interface IParsedEntry {
//  timestamp: string | null,
//  data: {
//    [key: string]: string;
//  }
//}
//
export interface ITileLayerOptions extends L.TileLayerOptions {
  apiKey?: string;
}

