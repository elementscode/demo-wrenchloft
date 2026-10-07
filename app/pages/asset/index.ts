import { Request, Response } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import { assetById, assetHistory } from "#app/shared/services/assets";
import { schedules } from "#app/shared/services/preventive";
import { plantToday } from "#app/shared/services/plant";
import html from "./template";

export default function route(req: Request, res: Response) {
  let me = requirePageRole("manager", "technician");
  if (!me) {
    return;
  }

  let asset = assetById(req.params.id);

  return new html({
    asset,
    history: assetHistory(asset.id),
    plans: schedules(asset.id),
    role: me.role,
    today: plantToday(),
  });
}
