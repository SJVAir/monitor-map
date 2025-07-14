import { fetchChartData } from "./requests";
interface DataChartServiceConfig {
  webworker: boolean;
}

export async function useDataChartService(config?: DataChartServiceConfig) {
  //const opts: DataChartServiceConfig = {
  //  webworker: config?.webworker || true
  //};

  //const service = (opts.webworker)
  //  ? await import("./BackgroundRequests")
  //  : await import("./requests");


  return { fetchChartData };
}
