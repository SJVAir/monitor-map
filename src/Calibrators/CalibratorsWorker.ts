import { WorkerService } from "../Webworkers/WorkerService";
import * as CalibratorsService from "./requests";

new WorkerService("CalibratorsService", CalibratorsService);
