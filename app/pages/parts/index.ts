import { Request, Response } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import { parts } from "#app/shared/services/work-orders";
import html from "./template";

export default function route(req: Request, res: Response) {
  let me = requirePageRole("manager", "technician");
  if (!me) {
    return;
  }

  return new html({
    stock: parts.view(),
    role: me.role,
  });
}
