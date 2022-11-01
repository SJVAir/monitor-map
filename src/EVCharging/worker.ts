import { WorkerService } from "../Webworkers/WorkerService";
import * as EVChargingService from "./service";

new WorkerService("EVChargingService", EVChargingService);
