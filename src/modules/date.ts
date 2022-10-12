import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';



dayjs.$defaultFormat = function(date: string | Date | dayjs.Dayjs) {
  return dayjs.utc(date).format("YYYY-MM-DD HH:mm:ss");
}

dayjs.$prettyPrint = function(date: string | Date | dayjs.Dayjs) {
  return dayjs(date).format("h:mma dddd MMM DD, YYYY")
}

const skewedDiff = (_: any, dayjsClass: any, __: any) => {
  /**
   * Calculates difference in minutes between two dates,
   * and rounds the results towards a specific value
   *
   * @remarks
   * This method comes from a local plugin.
   *
   * @param toDiff - The date to compare
   * @param skewValue - The value to round towards
   * @returns The difference in minutes
   *
   */
  dayjsClass.prototype.skewedDiff = function(toDiff: string, skewValue: number) {
    const self: dayjs.Dayjs = this;
    const minutesDiff = Math.abs(self.diff(toDiff)) / 60000;
    if (minutesDiff > skewValue) {
      return Math.floor(minutesDiff);

    } else if (minutesDiff < skewValue) {
      return Math.ceil(minutesDiff);
    }
    return minutesDiff;
  }
}

// Add the plugins we need
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(skewedDiff);
dayjs.extend(utc);

export const dateUtil = dayjs;
