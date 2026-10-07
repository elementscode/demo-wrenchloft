import { test, equal } from "@elements/app";
import { clock, hours, dueLabel, isOverdue, weekStart, isoDate, parseIsoDate, elapsedSeconds, todayIn } from "./format";

test("format", () => {
  test("clocks and totals", () => {
    equal(clock(3909), "1:05:09");
    equal(hours(1500), "25m");
    equal(hours(5400), "1h 30m");
  });

  test("due labels", () => {
    equal(dueLabel("2026-10-06", "2026-10-06"), "Today");
    equal(dueLabel("2026-10-07", "2026-10-06"), "Tomorrow");
    equal(dueLabel("2026-10-03", "2026-10-06"), "3 days late");
    equal(dueLabel("2026-10-20", "2026-10-06"), "Oct 20");
    equal(dueLabel(null, "2026-10-06"), "No date");
  });

  test("done work is never overdue", () => {
    equal(isOverdue({ dueDate: "2026-10-01", status: "scheduled" }, "2026-10-06"), true);
    equal(isOverdue({ dueDate: "2026-10-01", status: "done" }, "2026-10-06"), false);
  });

  test("weeks start on Monday", () => {
    equal(isoDate(weekStart(parseIsoDate("2026-10-06"))), "2026-10-05");
    equal(isoDate(weekStart(parseIsoDate("2026-10-11"))), "2026-10-05");
  });

  test("a running timer adds to the banked time", () => {
    let now = new Date("2026-10-06T10:00:00Z");
    equal(elapsedSeconds({ secondsSpent: 60, timerStartedAt: new Date("2026-10-06T09:59:00Z") }, now), 120);
    equal(elapsedSeconds({ secondsSpent: 60, timerStartedAt: null }, now), 60);
  });

  test("today follows the plant's time zone, not GMT", () => {
    equal(todayIn("America/Los_Angeles", new Date("2026-10-07T01:00:00Z")), "2026-10-06");
  });
});
