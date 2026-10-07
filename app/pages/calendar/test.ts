import { test, equal } from "@elements/app";
import { seedPlant, loginAs, workOrder } from "#app/shared/testing";
import { workOrders } from "#app/shared/services/work-orders";
import { onDay } from "./template";

test("calendar", () => {
  test("late open work rolls onto today; requests without a plan stay off", () => {
    let plant = seedPlant();
    let late = workOrder(plant, { dueDate: "2026-10-05" });
    let thursday = workOrder(plant, { dueDate: "2026-10-08" });
    workOrder(plant, { dueDate: "2026-10-08", status: "requested" });

    loginAs(plant.manager);
    let view = workOrders.view({ assetId: plant.asset });

    equal(onDay(view, "2026-10-05", "2026-10-06").length, 0);
    equal(onDay(view, "2026-10-06", "2026-10-06").map((wo) => wo.id), [late]);
    equal(onDay(view, "2026-10-08", "2026-10-06").map((wo) => wo.id), [thursday]);
  });
});
