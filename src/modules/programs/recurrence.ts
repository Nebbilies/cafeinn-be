export const weekdays = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
] as const;
export type Weekday = (typeof weekdays)[number];

// The business zone has fixed UTC+07:00 throughout the supported operational range.
export function vietnamDate(value: Date) {
  return new Date(value.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

export function validInterval(start: Date, end: Date) {
  return start < end && vietnamDate(start) === vietnamDate(end);
}

export function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

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
    day += 86400000
  ) {
    const date = new Date(day).toISOString().slice(0, 10);
    const weekday = weekdays[(new Date(day).getUTCDay() + 6) % 7];
    if (input.weekdays.includes(weekday))
      result.push({
        date,
        startsAt: new Date(`${date}T${input.startTime}:00+07:00`),
        endsAt: new Date(`${date}T${input.endTime}:00+07:00`),
      });
  }
  return result;
}

export function holdUntil(startsAt: Date, endsAt: Date, minutes: number) {
  return new Date(
    Math.min(startsAt.getTime() + minutes * 60000, endsAt.getTime()),
  );
}
