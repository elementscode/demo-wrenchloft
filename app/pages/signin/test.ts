import { test, equal, sql } from "@elements/app";
import { seedPlant } from "#app/shared/testing";
import { demoLogins } from "#app/shared/services/auth";

test("signin page", () => {
  test("lists only the demo accounts", () => {
    let plant = seedPlant();
    let before = demoLogins().map((l) => l.name);
    equal(before.includes("Mia Manager"), false);

    sql(`
      update users
      set isDemo = true
      where id = ${plant.manager}
    `);

    let after = demoLogins().map((l) => l.name);
    equal(after.length, before.length + 1);
    equal(after.filter((n) => !before.includes(n)), ["Mia Manager"]);
  });
});
