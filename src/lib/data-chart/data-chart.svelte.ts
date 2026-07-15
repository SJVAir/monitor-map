import { createDateRange } from "./DateRange";
import type { DateRange } from "./DateRange";

class DataChartManager {
	dateRange: DateRange = $state(createDateRange());
	chartData: uPlot.AlignedData = $state([]);
	loading: boolean = $state(false);
}

export { DataChartManager };
