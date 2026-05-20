import { createDateRange } from "./DateRange.ts";
import type { DateRange } from "./DateRange.ts";

class DataChartManager {
	dateRange: DateRange = $state(createDateRange());
	chartData: uPlot.AlignedData = $state([]);
	loading: boolean = $state(false);
}

export { DataChartManager };
