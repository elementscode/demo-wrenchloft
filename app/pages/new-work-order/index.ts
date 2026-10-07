import { Request, Response } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import { assetOptions, technicians } from "#app/shared/services/work-orders";
import html from "./template";

export default function route(req: Request, res: Response) {
  let me = requirePageRole();
  if (!me) {
    return;
  }

  return new html({
    role: me.role,
    assets: assetOptions(),
    techs: me.role === "manager" ? technicians() : [],
    assetId: String(req.query.asset ?? ""),
  });
}
