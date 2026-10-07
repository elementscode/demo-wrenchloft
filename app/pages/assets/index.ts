import { Request, Response } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import { assetRows } from "#app/shared/services/assets";
import html from "./template";

export default function route(req: Request, res: Response) {
  let me = requirePageRole("manager", "technician");
  if (!me) {
    return;
  }

  return new html({
    initial: assetRows(),
    role: me.role,
  });
}
