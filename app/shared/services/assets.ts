import { sql, ValidationError, NotFoundError } from "@elements/app";
import { requireRole } from "#app/shared/services/auth";

export interface AssetRow {
  id: string;
  name: string;
  building: string;
  line: string;
  category: string;
  openCount: number;
  down: boolean;
  schedules: number;
  lastWork: Date | null;
}

export interface AssetForm {
  name: string;
  building: string;
  line: string;
  category: string;
}

export interface HistoryRow {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  pmScheduleId: string | null;
  assigneeName: string | null;
  createdAt: Date;
  completedAt: Date | null;
  secondsSpent: number;
  assetDown: boolean;
  parts: string | null;
}

export function assetRows(): AssetRow[] {
  return sql<AssetRow>(`
    select
      a.id,
      a.name,
      a.building,
      a.line,
      a.category,
      (
        select count(*)::int
        from workOrders w
        where
          w.assetId = a.id
          and w.status <> 'done'
      ) as openCount,
      exists (
        select 1
        from workOrders w
        where
          w.assetId = a.id
          and w.status <> 'done'
          and w.assetDown
      ) as down,
      (
        select count(*)::int
        from pmSchedules s
        where
          s.assetId = a.id
          and s.active
      ) as schedules,
      (
        select max(w.completedAt)
        from workOrders w
        where w.assetId = a.id
      ) as lastWork
    from assets a
    order by
      a.building,
      a.line,
      a.name
  `).all();
}

export function assetById(id: string): AssetRow {
  return assetRows().find((a) => a.id === id) ?? (() => { throw new NotFoundError("asset not found"); })();
}

/** Every work order the asset has had, newest first, with the parts each used. */
export function assetHistory(assetId: string): HistoryRow[] {
  return sql<HistoryRow>(`
    select
      w.id,
      w.number,
      w.title,
      w.status,
      w.priority,
      w.pmScheduleId,
      t.name as assigneeName,
      w.createdAt,
      w.completedAt,
      w.secondsSpent,
      w.assetDown,
      (
        select string_agg(u.qty || ' × ' || p.name, ', ' order by u.createdAt)
        from woParts u
        join parts p on p.id = u.partId
        where u.workOrderId = w.id
      ) as parts
    from workOrders w
    left join users t on t.id = w.assignedTo
    where w.assetId = ${assetId}
    order by
      coalesce(w.completedAt, w.createdAt) desc
  `).all();
}

/** @rpc */
export function createAsset(form: AssetForm): AssetRow[] {
  requireRole("manager");

  let errors: Record<string, string[]> = {};
  for (let key of ["name", "building", "line", "category"] as const) {
    if (!form[key].trim()) {
      errors[key] = ["required"];
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  sql(`
    insert into assets (
      name,
      building,
      line,
      category
    ) values (
      ${form.name.trim()},
      ${form.building.trim()},
      ${form.line.trim()},
      ${form.category.trim()}
    )
  `);

  return assetRows();
}
