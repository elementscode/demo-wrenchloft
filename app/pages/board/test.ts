import { test, equal, sql } from "@elements/app";
import { seedPlant, loginAs, workOrder } from "#app/shared/testing";
import { workOrders } from "#app/shared/services/work-orders";
import { column } from "./template";

test("board", () => {
  test("a column holds its status, most urgent first", () => {
    let plant = seedPlant();
    let low = workOrder(plant, { status: "scheduled", dueDate: "2026-10-07" });
    let urgent = workOrder(plant, { status: "scheduled", dueDate: "2026-10-09" });
    workOrder(plant, { status: "requested" });

    sql(`
      update workOrders
      set priority = case when id = ${urgent} then 'urgent' else 'low' end
      where id in (${low}, ${urgent})
    `);

    loginAs(plant.manager);
    let ids = column(workOrders.view({ assetId: plant.asset }), "scheduled", "2026-10-06").map((wo) => wo.id);
    equal(ids, [urgent, low]);
  });

  test("done work leaves the board after two weeks", () => {
    let plant = seedPlant();
    let recent = workOrder(plant, { status: "done" });
    let old = workOrder(plant, { status: "done" });

    sql(`
      update workOrders
      set completedAt = case when id = ${old} then '2026-09-01'::timestamptz else '2026-10-05'::timestamptz end
      where id in (${recent}, ${old})
    `);

    loginAs(plant.manager);
    equal(column(workOrders.view({ assetId: plant.asset }), "done", "2026-10-06").map((wo) => wo.id), [recent]);
  });
});
