import { test, equal, sql } from "@elements/app";
import { seedPlant } from "#app/shared/testing";
import { generateDueWork, LEAD_DAYS } from "./preventive";

/** Adds a schedule and pauses the ones already in the plant, so each count below is this test's alone. */
function schedule(assetId: string, nextDue: string, every = 2, unit = "weeks"): string {
  sql(`
    update pmSchedules
    set active = false
  `);

  return sql<{ id: string }>(`
    insert into pmSchedules (
      assetId,
      title,
      every,
      unit,
      nextDue
    ) values (
      ${assetId},
      'Grease bearings',
      ${every},
      ${unit},
      ${nextDue}::date
    )
    returning id
  `).firstOrThrow().id;
}

function ordersFor(scheduleId: string): { status: string; dueDate: string }[] {
  return sql<{ status: string; dueDate: string }>(`
    select
      status,
      to_char(dueDate, 'YYYY-MM-DD') as dueDate
    from workOrders
    where pmScheduleId = ${scheduleId}
  `).all();
}

function nextDue(scheduleId: string): string {
  return sql<{ nextDue: string }>(`
    select to_char(nextDue, 'YYYY-MM-DD') as nextDue
    from pmSchedules
    where id = ${scheduleId}
  `).firstOrThrow().nextDue;
}

test("preventive schedules", () => {
  test("a schedule coming due creates a scheduled order and rolls forward", () => {
    let plant = seedPlant();
    let id = schedule(plant.asset, "2026-10-08");

    equal(generateDueWork("2026-10-06"), 1);
    equal(ordersFor(id), [{ status: "scheduled", dueDate: "2026-10-08" }]);
    equal(nextDue(id), "2026-10-22");
  });

  test(`nothing is created more than ${LEAD_DAYS} days ahead`, () => {
    let plant = seedPlant();
    let id = schedule(plant.asset, "2026-10-20");

    equal(generateDueWork("2026-10-06"), 0);
    equal(ordersFor(id).length, 0);
  });

  test("an open order holds the schedule until it is done", () => {
    let plant = seedPlant();
    let id = schedule(plant.asset, "2026-10-06", 3, "days");

    generateDueWork("2026-10-06");
    equal(generateDueWork("2026-10-06"), 0);
    equal(ordersFor(id).length, 1);

    sql(`
      update workOrders
      set status = 'done'
      where pmScheduleId = ${id}
    `);

    equal(generateDueWork("2026-10-06"), 1);
    equal(ordersFor(id).map((o) => o.dueDate).sort(), ["2026-10-06", "2026-10-09"]);
  });

  test("a paused schedule creates nothing", () => {
    let plant = seedPlant();
    let id = schedule(plant.asset, "2026-10-06");

    sql(`
      update pmSchedules
      set active = false
      where id = ${id}
    `);

    equal(generateDueWork("2026-10-06"), 0);
  });
});
