import { Request, Response } from "@elements/app";
import { requirePageRole } from "#app/shared/services/auth";
import { workOrders } from "#app/shared/services/work-orders";
import { plantToday } from "#app/shared/services/plant";
import { isoDate, weekStart, parseIsoDate } from "#app/shared/services/format";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requirePageRole("manager")) {
    return;
  }

  let today = plantToday();
  let week = String(req.query.week ?? "");
  let start = /^\d{4}-\d{2}-\d{2}$/.test(week) ? weekStart(parseIsoDate(week)) : weekStart(parseIsoDate(today));

  return new html({
    orders: workOrders.view(),
    today,
    start: isoDate(start),
  });
}
