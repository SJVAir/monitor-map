import { WorkerService } from "../Webworkers/WorkerService";
import * as DataChartService from "./service";

new WorkerService("DataChartService", DataChartService);
