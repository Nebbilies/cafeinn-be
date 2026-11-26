import { VIETNAM_OFFSET_MS } from "../constants/time.constants.ts";
// The business zone has fixed UTC+07:00 throughout the supported operational range.
export function vietnamDate(value: Date) {
  return new Date(value.getTime() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
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
