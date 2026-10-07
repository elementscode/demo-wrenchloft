import { test, equal, sql, ForbiddenError, ValidationError } from "@elements/app";
import { seedPlant, loginAs, throwsA } from "#app/shared/testing";
import { parts, createPart } from "#app/shared/services/work-orders";
import { lowStock, suggestedOrder } from "./template";

test("parts", () => {
  test("the reorder list is everything at or under its reorder point", () => {
    let plant = seedPlant();
    loginAs(plant.tech);
    equal(lowStock(parts.view()).some((p) => p.id === plant.part), false);

    sql(`
      update parts
      set stock = 2
      where id = ${plant.part}
    `);

    let low = lowStock(parts.view()).filter((p) => p.id === plant.part);
    equal(low.map((p) => p.sku), [plant.sku]);
    equal(suggestedOrder(low[0]), 2);
  });

  test("only managers add parts, and SKUs are unique", async () => {
    let plant = seedPlant();
    let sku = `T2-${crypto.randomUUID().slice(0, 8)}`;
    let part = {
      sku: plant.sku,
      name: "Dup",
      unit: "ea",
      stock: 1,
      reorderAt: 0,
    };

    loginAs(plant.tech);
    equal(await throwsA(() => createPart({ ...part, sku }), ForbiddenError), "");

    loginAs(plant.manager);
    equal(await throwsA(() => createPart(part), ValidationError), "");
    equal(sql<{ n: number }>(`select count(*)::int as n from parts where sku = ${sku}`).firstOrThrow().n, 0);
    createPart({ ...part, sku });
    equal(sql<{ n: number }>(`select count(*)::int as n from parts where sku = ${sku}`).firstOrThrow().n, 1);
  });
});
