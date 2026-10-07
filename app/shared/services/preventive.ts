import { sql, tx, ValidationError, NotFoundError } from "@elements/app";
import { requireRole } from "#app/shared/services/auth";
import { Priority, PRIORITIES } from "#app/shared/services/work-orders";
import { plantToday } from "#app/shared/services/plant";

/** Preventive work orders are created this many days before they come due, so they land on the week's plan. */
export const LEAD_DAYS = 7;

export interface Schedule {
  id: string;
  assetId: string;
  assetName: string;
  line: string;
  title: string;
  description: string;
  priority: Priority;
  every: number;
  unit: "days" | "weeks";
  nextDue: string;
  assignedTo: string | null;
  assigneeName: string | null;
  active: boolean;
  openOrderId: string | null;
  openOrderDue: string | null;
  lastDone: Date | null;
}

export interface ScheduleForm {
  assetId: string;
  title: string;
  description: string;
  priority: Priority;
  every: number;
  unit: "days" | "weeks";
  nextDue: string;
  assignedTo: string;
}

export function schedules(assetId: string | null = null): Schedule[] {
  return sql<Schedule>(`
    select
      s.id,
      s.assetId,
      a.name as assetName,
      a.line,
      s.title,
      s.description,
      s.priority,
      s.every,
      s.unit,
      to_char(s.nextDue, 'YYYY-MM-DD') as nextDue,
      s.assignedTo,
      t.name as assigneeName,
      s.active,
      (
        select w.id
        from workOrders w
        where
          w.pmScheduleId = s.id
          and w.status <> 'done'
        limit 1
      ) as openOrderId,
      (
        select to_char(w.dueDate, 'YYYY-MM-DD')
        from workOrders w
        where
          w.pmScheduleId = s.id
          and w.status <> 'done'
        limit 1
      ) as openOrderDue,
      (
        select max(w.completedAt)
        from workOrders w
        where w.pmScheduleId = s.id
      ) as lastDone
    from pmSchedules s
    join assets a on a.id = s.assetId
    left join users t on t.id = s.assignedTo
    where ${assetId}::uuid is null or s.assetId = ${assetId}::uuid
    order by
      s.active desc,
      s.nextDue,
      a.name
  `).all();
}

/**
 * Turns every active schedule coming due within the lead time into a
 * scheduled work order, then rolls the schedule forward one interval. A
 * schedule whose last order is still open waits, so missed work does not
 * pile up duplicates. Returns how many orders it created.
 */
export function generateDueWork(today: string = plantToday()): number {
  return tx(() => {
    let due = sql<{ id: string; assetId: string; title: string; description: string; priority: string; assignedTo: string | null; nextDue: string }>(`
      select
        s.id,
        s.assetId,
        s.title,
        s.description,
        s.priority,
        s.assignedTo,
        to_char(s.nextDue, 'YYYY-MM-DD') as nextDue
      from pmSchedules s
      where
        s.active
        and s.nextDue <= ${today}::date + ${LEAD_DAYS}::int
        and not exists (
          select 1
          from workOrders w
          where
            w.pmScheduleId = s.id
            and w.status <> 'done'
        )
      for update skip locked
    `).all();

    for (let s of due) {
      sql(`
        insert into workOrders (
          assetId,
          title,
          description,
          priority,
          status,
          assignedTo,
          pmScheduleId,
          dueDate
        ) values (
          ${s.assetId},
          ${s.title},
          ${s.description},
          ${s.priority},
          'scheduled',
          ${s.assignedTo},
          ${s.id},
          ${s.nextDue}::date
        )
      `);

      sql(`
        update pmSchedules
        set nextDue = nextDue + every * case when unit = 'weeks' then 7 else 1 end
        where id = ${s.id}
      `);
    }

    return due.length;
  });
}

function validate(form: ScheduleForm) {
  let errors: Record<string, string[]> = {};

  if (!form.assetId) {
    errors.assetId = ["pick the asset"];
  }

  if (!form.title.trim()) {
    errors.title = ["name the task"];
  }

  if (!Number.isInteger(Number(form.every)) || Number(form.every) < 1) {
    errors.every = ["a whole number above zero"];
  }

  if (form.unit !== "days" && form.unit !== "weeks") {
    errors.unit = ["days or weeks"];
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.nextDue)) {
    errors.nextDue = ["pick the first due date"];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}

/** @rpc */
export function createSchedule(form: ScheduleForm): Schedule[] {
  requireRole("manager");
  validate(form);

  sql(`
    insert into pmSchedules (
      assetId,
      title,
      description,
      priority,
      every,
      unit,
      nextDue,
      assignedTo
    ) values (
      ${form.assetId},
      ${form.title.trim()},
      ${form.description.trim()},
      ${PRIORITIES.some((p) => p.key === form.priority) ? form.priority : "medium"},
      ${Number(form.every)},
      ${form.unit},
      ${form.nextDue}::date,
      ${form.assignedTo || null}
    )
  `);

  generateDueWork();

  return schedules();
}

/** @rpc */
export function setScheduleActive(id: string, active: boolean): Schedule[] {
  requireRole("manager");

  sql<{ id: string }>(`
    update pmSchedules
    set active = ${active}
    where id = ${id}
    returning id
  `).firstOrThrow(new NotFoundError("schedule not found"));

  if (active) {
    generateDueWork();
  }

  return schedules();
}

/** @rpc */
export function runScheduler(): { created: number; schedules: Schedule[] } {
  requireRole("manager");

  let created = generateDueWork();

  return {
    created,
    schedules: schedules(),
  };
}
