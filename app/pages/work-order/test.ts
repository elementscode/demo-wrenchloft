import { test, equal, sql, ForbiddenError } from "@elements/app";
import { seedPlant, loginAs, workOrder, throwsA } from "#app/shared/testing";
import { woNotes, canSee, getWorkOrder } from "#app/shared/services/work-orders";

test("work order page", () => {
  test("a note is signed by whoever is signed in", () => {
    let plant = seedPlant();
    let id = workOrder(plant);
    loginAs(plant.tech);

    woNotes.view({ workOrderId: id }).insert({
      body: "  Found a cracked hose.  ",
      authorId: plant.manager,
    });

    let note = sql<{ authorId: string; body: string }>(`
      select
        authorId,
        body
      from woNotes
      where workOrderId = ${id}
    `).firstOrThrow();

    equal(note, { authorId: plant.tech, body: "Found a cracked hose." });
  });

  test("a requester cannot open or note someone else's order", async () => {
    let plant = seedPlant();
    let id = workOrder(plant, { requestedBy: plant.manager });
    loginAs(plant.requester);

    equal(canSee(getWorkOrder(id)), false);
    equal(await throwsA(() => woNotes.view({ workOrderId: id }).insert({ body: "hi" }), ForbiddenError), "");
  });
});
