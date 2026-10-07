import { test, equal } from "@elements/app";
import { seedPlant, loginAs, workOrder } from "#app/shared/testing";
import { workOrders, getWorkOrder } from "#app/shared/services/work-orders";
import { progress } from "./template";

test("requests", () => {
  test("a requester sees only what they reported", () => {
    let plant = seedPlant();
    let mine = workOrder(plant, { requestedBy: plant.requester, status: "requested" });
    workOrder(plant, { requestedBy: plant.manager });

    loginAs(plant.requester);
    equal([...workOrders.view({ requestedBy: plant.requester })].map((wo) => wo.id), [mine]);
  });

  test("progress says who has it", () => {
    let plant = seedPlant();
    let id = workOrder(plant, { requestedBy: plant.requester, status: "in_progress" });

    equal(progress(getWorkOrder(id), "2026-10-06"), "Theo Tech is working on it now");
  });
});
