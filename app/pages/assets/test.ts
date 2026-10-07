import { test, equal, ValidationError, ForbiddenError } from "@elements/app";
import { seedPlant, loginAs, throwsA } from "#app/shared/testing";
import { createAsset } from "#app/shared/services/assets";

test("assets", () => {
  test("a manager adds an asset with every field filled in", async () => {
    let plant = seedPlant();
    let asset = {
      name: "Lathe",
      building: "Building T",
      line: "Line 9",
      category: "Machining",
    };

    loginAs(plant.tech);
    equal(await throwsA(() => createAsset(asset), ForbiddenError), "");

    loginAs(plant.manager);
    equal(await throwsA(() => createAsset({ ...asset, line: "" }), ValidationError), "");
    let names = createAsset(asset).map((a) => a.name);
    equal(names.filter((n) => n === "Lathe").length, 1);
    equal(names.filter((n) => n === "Lathe" || n === "Test Press").sort(), ["Lathe", "Test Press"]);
  });
});
