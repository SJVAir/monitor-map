import { WorkerService } from "../Webworkers/WorkerService";
import * as DataChartService from "./requests";

new WorkerService("DataChartService", DataChartService);
