import { test, equal } from "@elements/app";
import { seedPlant, loginAs, workOrder } from "#app/shared/testing";
import { workOrders } from "#app/shared/services/work-orders";
import { todaysWork, upcoming } from "./template";

test("today", () => {
  test("a technician's list is their own work: due or late, then the coming week", () => {
    let plant = seedPlant();
    let late = workOrder(plant, { dueDate: "2026-10-01" });
    let due = workOrder(plant, { dueDate: "2026-10-06" });
    let soon = workOrder(plant, { dueDate: "2026-10-09" });
    workOrder(plant, { dueDate: "2026-10-30" });
    workOrder(plant, { dueDate: "2026-10-06", assignedTo: plant.otherTech });
    workOrder(plant, { dueDate: "2026-10-06", status: "done" });

    loginAs(plant.tech);
    let mine = workOrders.view({ assignedTo: plant.tech });

    equal(todaysWork(mine, "2026-10-06").map((wo) => wo.id), [late, due]);
    equal(upcoming(mine, "2026-10-06").map((wo) => wo.id), [soon]);
  });
});
