import { WorkerService } from "../Webworkers/WorkerService";
import * as MonitorsService from "./requests";

new WorkerService("MonitorsService", MonitorsService);
