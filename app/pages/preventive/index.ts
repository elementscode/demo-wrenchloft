import { Request, Response } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import { assetOptions, technicians } from "#app/shared/services/work-orders";
import { schedules } from "#app/shared/services/preventive";
import { plantToday } from "#app/shared/services/plant";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requirePageRole("manager")) {
    return;
  }

  return new html({
    initial: schedules(),
    assets: assetOptions(),
    techs: technicians(),
    today: plantToday(),
  });
}
