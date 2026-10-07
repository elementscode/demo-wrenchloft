import { test, equal } from "@elements/app";
import { seedPlant, loginAs, workOrder } from "#app/shared/testing";
import { usePart, finishWork } from "#app/shared/services/work-orders";
import { assetHistory, assetById } from "#app/shared/services/assets";

test("asset", () => {
  test("history lists each job with the parts it used", () => {
    let plant = seedPlant();
    let id = workOrder(plant);
    loginAs(plant.tech);
    usePart(id, plant.part, 2);
    finishWork(id);

    let history = assetHistory(plant.asset);
    equal(history.length, 1);
    equal(history[0].status, "done");
    equal(history[0].parts, "2 × Test filter");
    equal(assetById(plant.asset).openCount, 0);
  });
});
