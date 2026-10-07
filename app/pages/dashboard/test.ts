import { test, equal } from "@elements/app";
import { WorkOrder } from "#app/shared/services/work-orders";
import { openByPriority, overdue, pmThisMonth, downtimeByAsset, downNow } from "./stats";

function wo(fields: Partial<WorkOrder>): WorkOrder {
  return {
    id: crypto.randomUUID(),
    number: 1,
    assetId: "a1",
    assetName: "Press",
    building: "A",
    line: "Line 1",
    title: "Job",
    description: "",
    priority: "medium",
    status: "scheduled",
    assignedTo: null,
    assigneeName: null,
    requestedBy: null,
    requesterName: null,
    pmScheduleId: null,
    dueDate: null,
    assetDown: false,
    secondsSpent: 0,
    timerStartedAt: null,
    completedAt: null,
    createdAt: new Date("2026-10-01T08:00:00"),
    updatedAt: new Date("2026-10-01T08:00:00"),
    ...fields,
  };
}

test("dashboard", () => {
  test("open work by priority skips done work", () => {
    let counts = openByPriority([
      wo({ priority: "urgent" }),
      wo({ priority: "urgent", status: "done" }),
      wo({ priority: "low", status: "on_hold" }),
    ]);

    equal(counts.map((c) => `${c.id}:${c.count}`), ["urgent:1", "high:0", "medium:0", "low:1"]);
  });

  test("overdue counts open work past its date", () => {
    equal(overdue([
      wo({ dueDate: "2026-10-01" }),
      wo({ dueDate: "2026-10-01", status: "done" }),
      wo({ dueDate: "2026-10-09" }),
    ], "2026-10-06").length, 1);
  });

  test("preventive on time: done by the due date, with future work pending", () => {
    let score = pmThisMonth([
      wo({ pmScheduleId: "s", dueDate: "2026-10-02", status: "done", completedAt: new Date("2026-10-02T15:00:00") }),
      wo({ pmScheduleId: "s", dueDate: "2026-10-03", status: "done", completedAt: new Date("2026-10-05T09:00:00") }),
      wo({ pmScheduleId: "s", dueDate: "2026-10-04" }),
      wo({ pmScheduleId: "s", dueDate: "2026-10-20" }),
      wo({ pmScheduleId: "s", dueDate: "2026-09-28", status: "done", completedAt: new Date("2026-09-28T09:00:00") }),
      wo({ dueDate: "2026-10-02", status: "done", completedAt: new Date("2026-10-02T09:00:00") }),
    ], "2026-10-06");

    equal(score, { due: 3, onTime: 1, pending: 1 });
  });

  test("downtime adds up per asset, open orders count to now", () => {
    let now = new Date("2026-10-06T12:00:00");
    let rows = downtimeByAsset([
      wo({ assetId: "a1", assetDown: true, createdAt: new Date("2026-10-06T08:00:00"), completedAt: new Date("2026-10-06T10:00:00") }),
      wo({ assetId: "a1", assetDown: true, createdAt: new Date("2026-10-06T11:00:00") }),
      wo({ assetId: "a2", assetName: "Capper", assetDown: true, createdAt: new Date("2026-10-06T09:00:00"), completedAt: new Date("2026-10-06T09:30:00") }),
      wo({ assetId: "a3", createdAt: new Date("2026-10-06T08:00:00"), completedAt: new Date("2026-10-06T12:00:00") }),
    ], "2026-10-06", now);

    equal(rows.map((r) => `${r.id}:${r.hours}:${r.open}`), ["a1:3:true", "a2:0.5:false"]);
    equal(downNow([wo({ assetId: "a1", assetDown: true }), wo({ assetId: "a1", assetDown: true }), wo({ assetId: "a2", assetDown: true, status: "done" })]), 1);
  });
});
