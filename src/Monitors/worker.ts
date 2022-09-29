import { WorkerService } from "../Webworkers/WorkerService";
import * as MonitorsService from "./service";

new WorkerService("MonitorsService", MonitorsService);
