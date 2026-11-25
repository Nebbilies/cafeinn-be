import {
  weekdays,
  type Weekday,
} from "../../common/constants/weekdays.constants.ts";
import {
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_MINUTE,
  VIETNAM_OFFSET,
} from "../../common/constants/time.constants.ts";

export function expandRecurrence(input: {
  fromDate: string;
  toDate: string;
  weekdays: readonly Weekday[];
  startTime: string;
  endTime: string;
}) {
  const result: { date: string; startsAt: Date; endsAt: Date }[] = [];
  for (
    let day = Date.parse(input.fromDate);
    day <= Date.parse(input.toDate);
    day += MILLISECONDS_PER_DAY
  ) {
    const date = new Date(day).toISOString().slice(0, 10);
    const weekday =
      weekdays[
        (new Date(day).getUTCDay() + weekdays.length - 1) % weekdays.length
      ];
    if (input.weekdays.includes(weekday))
      result.push({
        date,
        startsAt: new Date(`${date}T${input.startTime}:00${VIETNAM_OFFSET}`),
        endsAt: new Date(`${date}T${input.endTime}:00${VIETNAM_OFFSET}`),
      });
  }
  return result;
}

export function holdUntil(startsAt: Date, endsAt: Date, minutes: number) {
  return new Date(
    Math.min(
      startsAt.getTime() + minutes * MILLISECONDS_PER_MINUTE,
      endsAt.getTime(),
    ),
  );
}
