import { WorkerService } from "../Webworkers/WorkerService";
import * as EVChargingService from "./requests";

new WorkerService("EVChargingService", EVChargingService);
