import { test, equal, assert, sql, ForbiddenError, ValidationError, AuthError } from "@elements/app";
import { seedPlant, loginAs, workOrder, throwsA } from "#app/shared/testing";
import {
  workOrders,
  getWorkOrder,
  createWorkOrder,
  startWork,
  pauseWork,
  finishWork,
  usePart,
  returnPart,
  receiveStock,
  applyStatus,
} from "./work-orders";

function stock(partId: string): number {
  return sql<{ stock: number }>(`
    select stock
    from parts
    where id = ${partId}
  `).firstOrThrow().stock;
}

test("work orders", async () => {
  test("a requester's report lands as requested, unassigned", async () => {
    let plant = seedPlant();
    loginAs(plant.requester);

    let id = createWorkOrder({
      assetId: plant.asset,
      title: "Leaking",
      description: "",
      priority: "high",
      assetDown: true,
      assignedTo: plant.tech,
      dueDate: "2026-10-10",
      photos: [],
    });

    let wo = getWorkOrder(id);
    equal(wo.status, "requested");
    equal(wo.assignedTo, null);
    equal(wo.dueDate, null);
    equal(wo.requestedBy, plant.requester);
    equal(wo.assetDown, true);
  });

  test("a manager with a technician and a date schedules it at once", async () => {
    let plant = seedPlant();
    loginAs(plant.manager);

    let wo = getWorkOrder(createWorkOrder({
      assetId: plant.asset,
      title: "Swap filter",
      description: "",
      priority: "low",
      assetDown: false,
      assignedTo: plant.tech,
      dueDate: "2026-10-10",
      photos: [],
    }));

    equal(wo.status, "scheduled");
    equal(wo.assigneeName, "Theo Tech");
    equal(wo.dueDate, "2026-10-10");
  });

  test("a report needs an asset and a title", async () => {
    let plant = seedPlant();
    loginAs(plant.requester);

    let message = await throwsA(() => createWorkOrder({
      assetId: "",
      title: " ",
      description: "",
      priority: "low",
      assetDown: false,
      assignedTo: "",
      dueDate: "",
      photos: [],
    }), ValidationError);
    equal(message, "");
  });

  test("signed out callers are refused", async () => {
    let plant = seedPlant();
    equal(await throwsA(() => startWork(workOrder(plant)), AuthError), "");
  });

  test("the timer banks time when work pauses and finishes", async () => {
    let plant = seedPlant();
    let id = workOrder(plant);
    loginAs(plant.tech);

    startWork(id);
    let started = getWorkOrder(id);
    equal(started.status, "in_progress");
    assert(started.timerStartedAt !== null, "timer should be running");

    sql(`
      update workOrders
      set timerStartedAt = now() - interval '10 minutes'
      where id = ${id}
    `);

    pauseWork(id);
    let paused = getWorkOrder(id);
    equal(paused.status, "on_hold");
    equal(paused.timerStartedAt, null);
    assert(paused.secondsSpent >= 600 && paused.secondsSpent < 610, `banked ${paused.secondsSpent}s`);

    startWork(id);
    finishWork(id);
    let done = getWorkOrder(id);
    equal(done.status, "done");
    assert(done.completedAt !== null, "finish stamps completion");
    assert(done.secondsSpent >= 600, "time is kept");
  });

  test("starting an unassigned order assigns it to whoever starts it", async () => {
    let plant = seedPlant();
    let id = workOrder(plant, { assignedTo: null, status: "requested" });
    loginAs(plant.otherTech);

    startWork(id);
    equal(getWorkOrder(id).assignedTo, plant.otherTech);
  });

  test("a technician cannot work another technician's order", async () => {
    let plant = seedPlant();
    let id = workOrder(plant);
    loginAs(plant.otherTech);

    equal(await throwsA(() => startWork(id), ForbiddenError), "");
    equal(getWorkOrder(id).status, "scheduled");
  });

  test("using a part lowers stock and returning it puts it back", async () => {
    let plant = seedPlant();
    let id = workOrder(plant);
    loginAs(plant.tech);

    usePart(id, plant.part, 3);
    equal(stock(plant.part), 2);

    let use = sql<{ id: string }>(`
      select id
      from woParts
      where workOrderId = ${id}
    `).firstOrThrow();

    returnPart(use.id);
    equal(stock(plant.part), 5);
  });

  test("stock never goes negative", async () => {
    let plant = seedPlant();
    let id = workOrder(plant);
    loginAs(plant.tech);

    equal(await throwsA(() => usePart(id, plant.part, 6), ValidationError), "");
    equal(stock(plant.part), 5);
  });

  test("receiving stock adds to the shelf", async () => {
    let plant = seedPlant();
    loginAs(plant.tech);

    receiveStock(plant.part, 10);
    equal(stock(plant.part), 15);
    equal(await throwsA(() => receiveStock(plant.part, 0), ValidationError), "");
  });

  test("a manager moves a card through the view, and leaving done clears completion", async () => {
    let plant = seedPlant();
    let id = workOrder(plant, { status: "done" });
    applyStatus(id, "done");
    loginAs(plant.manager);

    let view = workOrders.view({ id });
    let wo = getWorkOrder(id);
    view.update({ ...wo, status: "scheduled" });

    let moved = getWorkOrder(id);
    equal(moved.status, "scheduled");
    equal(moved.completedAt, null);
  });

  test("only managers move cards on the board", async () => {
    let plant = seedPlant();
    let id = workOrder(plant);
    loginAs(plant.tech);

    let view = workOrders.view({ id });
    let wo = getWorkOrder(id);
    equal(await throwsA(() => view.update({ ...wo, status: "done" }), ForbiddenError), "");
    equal(getWorkOrder(id).status, "scheduled");
  });
});
