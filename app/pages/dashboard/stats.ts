import { WorkOrder, Priority, PRIORITIES } from "#app/shared/services/work-orders";
import { isOverdue, isoDate, addDays, parseIsoDate } from "#app/shared/services/format";

/** The dashboard's numbers, computed from the live rows so they move with the board. */

export interface PriorityCount {
  id: Priority;
  label: string;
  count: number;
}

export function openByPriority(orders: Iterable<WorkOrder>): PriorityCount[] {
  let rows = [...orders].filter((wo) => wo.status !== "done");

  return PRIORITIES.map((p) => ({
    id: p.key,
    label: p.label,
    count: rows.filter((wo) => wo.priority === p.key).length,
  }));
}

export function overdue(orders: Iterable<WorkOrder>, today: string): WorkOrder[] {
  return [...orders]
    .filter((wo) => isOverdue(wo, today))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}

export interface PmScore {
  due: number;
  onTime: number;
  pending: number;
}

/**
 * Preventive work due this month so far: done on or before its due date
 * counts as on time. Work due later this month and not done yet is pending,
 * not late.
 */
export function pmThisMonth(orders: Iterable<WorkOrder>, today: string): PmScore {
  let month = today.slice(0, 7);
  let score = { due: 0, onTime: 0, pending: 0 };

  for (let wo of orders) {
    if (!wo.pmScheduleId || !wo.dueDate || wo.dueDate.slice(0, 7) !== month) {
      continue;
    }

    let done = wo.status === "done" && !!wo.completedAt;
    if (!done && wo.dueDate >= today) {
      score.pending++;
      continue;
    }

    score.due++;
    if (done && isoDate(wo.completedAt!) <= wo.dueDate) {
      score.onTime++;
    }
  }

  return score;
}

export interface Downtime {
  id: string;
  name: string;
  line: string;
  hours: number;
  open: boolean;
}

/** Hours each asset spent down over the last 30 days, from orders flagged asset down. */
export function downtimeByAsset(orders: Iterable<WorkOrder>, today: string, now: Date): Downtime[] {
  let since = addDays(parseIsoDate(today), -30).getTime();
  let byAsset = new Map<string, Downtime>();

  for (let wo of orders) {
    if (!wo.assetDown) {
      continue;
    }

    let start = Math.max(wo.createdAt.getTime(), since);
    let end = (wo.completedAt ?? now).getTime();
    if (end <= start) {
      continue;
    }

    let row = byAsset.get(wo.assetId) ?? {
      id: wo.assetId,
      name: wo.assetName,
      line: wo.line,
      hours: 0,
      open: false,
    };
    row.hours += (end - start) / 3_600_000;
    row.open = row.open || !wo.completedAt;
    byAsset.set(wo.assetId, row);
  }

  return [...byAsset.values()].sort((a, b) => b.hours - a.hours);
}

export function downNow(orders: Iterable<WorkOrder>): number {
  return new Set([...orders].filter((wo) => wo.assetDown && wo.status !== "done").map((wo) => wo.assetId)).size;
}
