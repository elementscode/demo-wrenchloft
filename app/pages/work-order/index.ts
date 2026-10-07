import { Request, Response, ForbiddenError } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import {
  workOrders,
  woNotes,
  woParts,
  woPhotos,
  parts,
  getWorkOrder,
  canSee,
  technicians,
} from "#app/shared/services/work-orders";
import { plantToday } from "#app/shared/services/plant";
import html from "./template";

export default function route(req: Request, res: Response) {
  let me = requirePageRole();
  if (!me) {
    return;
  }

  let id = req.params.id;
  if (!canSee(getWorkOrder(id))) {
    throw new ForbiddenError("this work order belongs to someone else");
  }

  return new html({
    id,
    role: me.role,
    orders: workOrders.view({ id }),
    notes: woNotes.view({ workOrderId: id }),
    used: woParts.view({ workOrderId: id }),
    photos: woPhotos.view({ workOrderId: id }),
    stock: me.role === "requester" ? null : parts.view(),
    techs: technicians(),
    today: plantToday(),
  });
}
