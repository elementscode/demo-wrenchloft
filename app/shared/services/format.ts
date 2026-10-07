/** Pure display helpers. Safe in templates, on the server and in the browser. */

export interface Clocked {
  secondsSpent: number;
  timerStartedAt: Date | null;
}

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Local calendar date as YYYY-MM-DD, the shape `dueDate` arrives in. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDate(s: string): Date {
  let [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  let next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week containing `d`. */
export function weekStart(d: Date): Date {
  let offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

export function elapsedSeconds(wo: Clocked, now: Date): number {
  let running = wo.timerStartedAt ? Math.max(0, Math.floor((now.getTime() - wo.timerStartedAt.getTime()) / 1000)) : 0;
  return wo.secondsSpent + running;
}

/** 1:05:09 while a clock runs. */
export function clock(seconds: number): string {
  let h = Math.floor(seconds / 3600);
  let m = Math.floor((seconds % 3600) / 60);
  let s = seconds % 60;
  return `${h}:${pad(m)}:${pad(s)}`;
}

/** 1h 05m for totals. */
export function hours(seconds: number): string {
  let total = Math.round(seconds / 60);
  let h = Math.floor(total / 60);
  let m = total % 60;
  if (h === 0) {
    return `${m}m`;
  }

  return `${h}h ${pad(m)}m`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function shortDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function dayName(d: Date): string {
  return DAYS[d.getDay()];
}

/** "Today", "Tomorrow", "2 days late", "Oct 14". */
export function dueLabel(dueDate: string | null, today: string): string {
  if (!dueDate) {
    return "No date";
  }

  let days = Math.round((parseIsoDate(dueDate).getTime() - parseIsoDate(today).getTime()) / 86_400_000);

  switch (days) {
    case 0:
      return "Today";

    case 1:
      return "Tomorrow";

    case -1:
      return "1 day late";
  }

  if (days < 0) {
    return `${-days} days late`;
  }

  return shortDate(parseIsoDate(dueDate));
}

/** dueLabel for the middle of a sentence: "today", "2 days late", "Oct 14". */
export function dueLabelInline(dueDate: string | null, today: string): string {
  let label = dueLabel(dueDate, today);
  if (MONTHS.some((m) => label.startsWith(m))) {
    return label;
  }

  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function isOverdue(wo: { dueDate: string | null; status: string }, today: string): boolean {
  return !!wo.dueDate && wo.status !== "done" && wo.dueDate < today;
}

export function timeAgo(date: Date, now: Date): string {
  let minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  let h = Math.floor(minutes / 60);
  if (h < 24) {
    return `${h}h ago`;
  }

  return shortDate(date);
}

export const PRIORITY_PILL: Record<string, string> = {
  urgent: "is-danger",
  high: "is-warning",
  medium: "is-info",
  low: "",
};

export const STATUS_PILL: Record<string, string> = {
  requested: "",
  scheduled: "is-info",
  in_progress: "is-accent",
  on_hold: "is-warning",
  done: "is-success",
};

export const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  in_progress: "In progress",
  on_hold: "On hold",
  done: "Done",
};

export const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** The calendar date right now in a time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
