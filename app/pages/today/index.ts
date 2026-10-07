import { Request, Response } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import { workOrders } from "#app/shared/services/work-orders";
import { plantToday } from "#app/shared/services/plant";
import html from "./template";

export default function route(req: Request, res: Response) {
  let me = requirePageRole("technician");
  if (!me) {
    return;
  }

  return new html({
    orders: workOrders.view({ assignedTo: me.userId }),
    today: plantToday(),
  });
}
