import { dateUtil } from "../modules";
import type { DatePickerSelection } from "../types";

export class DateRange {
  start: string;
  end: string;

  constructor(range?: DatePickerSelection) {
    let start;
    let end;
    if (!range) {
      start = dateUtil().subtract(1, "day").startOf("day");
      end = dateUtil();
    } else {
      start = dateUtil(range[0]).startOf("day");
      end = dateUtil(range[1]);
    }

    if (!end.isSame(dateUtil(), "day")) {
      end = end.endOf("day");
    }

    this.start = start.toISOString();
    this.end = end.toISOString();
  }
}
