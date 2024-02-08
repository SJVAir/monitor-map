import { dateUtil } from "../modules";
import type { DatePickerSelection } from "../types";

export class DateRange {
  start: string;
  end: string;

  constructor(range?: DatePickerSelection) {
    if (!range) {
      this.start = dateUtil().subtract(1, "day").startOf("day").toISOString();
      this.end = dateUtil().endOf("day").toISOString();

    } else {
      this.start = dateUtil(range[0]).startOf("day").toISOString();
      this.end = dateUtil(range[1]).endOf("day").toISOString();
    }
  }

}
