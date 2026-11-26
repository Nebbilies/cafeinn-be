// Monday-first ordering is used when converting JavaScript's Sunday-first weekday index.
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
