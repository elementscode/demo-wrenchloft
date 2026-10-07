import { test, equal, File, ValidationError, sql } from "@elements/app";
import { seedPlant, loginAs, throwsA } from "#app/shared/testing";
import { createWorkOrder, RequestForm } from "#app/shared/services/work-orders";

function form(assetId: string, photos: File[]): RequestForm {
  return {
    assetId,
    title: "Belt squeal",
    description: "",
    priority: "medium",
    assetDown: false,
    assignedTo: "",
    dueDate: "",
    photos,
  };
}

function file(name: string, contentType: string): File {
  return Object.assign(Object.create(File.prototype), {
    name,
    contentType,
    size: 4,
    data: new Uint8Array([1, 2, 3, 4]),
    lastModified: 0,
  });
}

test("new work order", () => {
  test("photos attach to the new order", async () => {
    let plant = seedPlant();
    loginAs(plant.requester);

    let id = createWorkOrder(form(plant.asset, [file("belt.jpg", "image/jpeg")]));
    equal(sql<{ n: number }>(`
      select count(*)::int as n
      from woPhotos
      where workOrderId = ${id}
    `).firstOrThrow().n, 1);
  });

  test("anything but a photo is refused, and nothing is saved", async () => {
    let plant = seedPlant();
    loginAs(plant.requester);

    equal(await throwsA(() => createWorkOrder(form(plant.asset, [file("evil.html", "text/html")])), ValidationError), "");
    equal(sql<{ n: number }>(`select count(*)::int as n from workOrders where assetId = ${plant.asset}`).firstOrThrow().n, 0);
  });
});
