import { test, equal, ForbiddenError } from "@elements/app";
import { seedPlant, loginAs, throwsA } from "#app/shared/testing";
import { createSchedule, ScheduleForm } from "#app/shared/services/preventive";
import { todayIn } from "#app/shared/services/format";
import config from "#config";

test("preventive page", () => {
  test("a schedule due this week gets its work order straight away", async () => {
    let plant = seedPlant();
    let form: ScheduleForm = {
      assetId: plant.asset,
      title: "Lube chain",
      description: "",
      priority: "low",
      every: 1,
      unit: "weeks",
      nextDue: todayIn(config.plant.timeZone),
      assignedTo: plant.tech,
    };

    loginAs(plant.tech);
    equal(await throwsA(() => createSchedule(form), ForbiddenError), "");

    loginAs(plant.manager);
    let mine = createSchedule(form).filter((s) => s.assetId === plant.asset);
    equal(mine.length, 1);
    equal(mine[0].openOrderDue, form.nextDue);
    equal(mine[0].assigneeName, "Theo Tech");
  });
});
