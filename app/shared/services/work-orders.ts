import {
  LiveTable,
  File,
  sql,
  tx,
  session,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@elements/app";
import { requireRole } from "#app/shared/services/auth";

export type Status = "requested" | "scheduled" | "in_progress" | "on_hold" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export const STATUSES: { key: Status; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In progress" },
  { key: "on_hold", label: "On hold" },
  { key: "done", label: "Done" },
];

export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

export interface WorkOrder {
  id: string;
  number: number;
  assetId: string;
  assetName: string;
  building: string;
  line: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  assignedTo: string | null;
  assigneeName: string | null;
  requestedBy: string | null;
  requesterName: string | null;
  pmScheduleId: string | null;
  dueDate: string | null;
  assetDown: boolean;
  secondsSpent: number;
  timerStartedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  dragging?: boolean;
}

export interface Note {
  id: string;
  workOrderId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
}

export interface PartUse {
  id: string;
  workOrderId: string;
  partId: string;
  sku: string;
  partName: string;
  unit: string;
  qty: number;
  usedByName: string | null;
  createdAt: Date;
}

export interface Photo {
  id: string;
  workOrderId: string;
  name: string;
  size: number;
  createdAt: Date;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  reorderAt: number;
}

export interface Person {
  id: string;
  name: string;
}

function selectWorkOrders(p: Partial<WorkOrder>) {
  return sql<WorkOrder>(`
    select
      w.id,
      w.number,
      w.assetId,
      a.name as assetName,
      a.building,
      a.line,
      w.title,
      w.description,
      w.priority,
      w.status,
      w.assignedTo,
      t.name as assigneeName,
      w.requestedBy,
      r.name as requesterName,
      w.pmScheduleId,
      to_char(w.dueDate, 'YYYY-MM-DD') as dueDate,
      w.assetDown,
      w.secondsSpent,
      w.timerStartedAt,
      w.completedAt,
      w.createdAt,
      w.updatedAt
    from workOrders w
    join assets a on a.id = w.assetId
    left join users t on t.id = w.assignedTo
    left join users r on r.id = w.requestedBy
    where
      (${p.id ?? null}::uuid is null or w.id = ${p.id ?? null}::uuid)
      and (${p.assignedTo ?? null}::uuid is null or w.assignedTo = ${p.assignedTo ?? null}::uuid)
      and (${p.requestedBy ?? null}::uuid is null or w.requestedBy = ${p.requestedBy ?? null}::uuid)
      and (${p.assetId ?? null}::uuid is null or w.assetId = ${p.assetId ?? null}::uuid)
    order by w.number
  `);
}

export function getWorkOrder(id: string): WorkOrder {
  return selectWorkOrders({ id }).firstOrThrow(new NotFoundError("work order not found"));
}

/**
 * Moves a work order to a status and keeps the clock honest: leaving
 * in progress banks the running timer, entering done stamps completion,
 * leaving done clears it.
 */
export function applyStatus(id: string, status: Status) {
  sql(`
    update workOrders
    set
      status = ${status},
      secondsSpent = secondsSpent + case
        when timerStartedAt is not null and ${status} <> 'in_progress'
          then extract(epoch from now() - timerStartedAt)::int
        else 0
      end,
      timerStartedAt = case when ${status} = 'in_progress' then timerStartedAt else null end,
      completedAt = case when ${status} = 'done' then coalesce(completedAt, now()) else null end
    where id = ${id}
  `);
}

/** Managers see everything, technicians work any order, requesters see their own. */
export function canSee(wo: { requestedBy: string | null }): boolean {
  let role = session.get("role");
  if (role === "manager" || role === "technician") {
    return true;
  }

  return wo.requestedBy === session.get("userId");
}

function workOrderOrThrow(id: string): WorkOrder {
  let wo = getWorkOrder(id);
  if (!canSee(wo)) {
    throw new ForbiddenError();
  }

  return wo;
}

export let workOrders: LiveTable<WorkOrder> = new LiveTable<WorkOrder>({
  select: (p) => selectWorkOrders(p),

  insert: () => {
    throw new ForbiddenError("create work orders with the request form");
  },

  update: (item) => {
    requireRole("manager");

    if (!STATUSES.some((s) => s.key === item.status)) {
      throw new ValidationError("unknown status");
    }

    if (!PRIORITIES.some((p) => p.key === item.priority)) {
      throw new ValidationError("unknown priority");
    }

    if (!item.title.trim()) {
      throw new ValidationError("a work order needs a title");
    }

    return tx(() => {
      sql(`
        update workOrders
        set
          title = ${item.title.trim()},
          description = ${item.description},
          priority = ${item.priority},
          assignedTo = ${item.assignedTo || null},
          dueDate = ${item.dueDate || null}::date,
          assetDown = ${item.assetDown}
        where id = ${item.id}
      `);

      applyStatus(item.id, item.status);

      return getWorkOrder(item.id);
    });
  },

  delete: () => {
    throw new ForbiddenError();
  },
});

export let woNotes: LiveTable<Note> = new LiveTable<Note>({
  select: (p) => sql<Note>(`
    select
      n.id,
      n.workOrderId,
      n.authorId,
      u.name as authorName,
      n.body,
      n.createdAt
    from woNotes n
    left join users u on u.id = n.authorId
    where n.workOrderId = ${p.workOrderId ?? null}
    order by n.createdAt
  `),

  insert: (item) => {
    requireRole();
    workOrderOrThrow(item.workOrderId!);

    let body = (item.body ?? "").trim();
    if (!body) {
      throw new ValidationError("write a note first");
    }

    sql(`
      insert into woNotes (
        id,
        workOrderId,
        authorId,
        body
      ) values (
        ${item.id},
        ${item.workOrderId},
        ${session.getOrThrow("userId")},
        ${body}
      )
    `);

    return {
      id: item.id!,
      workOrderId: item.workOrderId!,
      authorId: session.getOrThrow("userId"),
      authorName: session.getOrThrow("userName"),
      body,
      createdAt: new Date(),
    };
  },

  update: () => {
    throw new ForbiddenError();
  },

  delete: () => {
    throw new ForbiddenError();
  },
});

export let woParts: LiveTable<PartUse> = new LiveTable<PartUse>({
  select: (p) => sql<PartUse>(`
    select
      u.id,
      u.workOrderId,
      u.partId,
      p.sku,
      p.name as partName,
      p.unit,
      u.qty,
      b.name as usedByName,
      u.createdAt
    from woParts u
    join parts p on p.id = u.partId
    left join users b on b.id = u.usedBy
    where u.workOrderId = ${p.workOrderId ?? null}
    order by u.createdAt
  `),

  insert: () => {
    throw new ForbiddenError("use usePart");
  },

  update: () => {
    throw new ForbiddenError();
  },

  delete: () => {
    throw new ForbiddenError("use returnPart");
  },
});

export let woPhotos: LiveTable<Photo> = new LiveTable<Photo>({
  select: (p) => sql<Photo>(`
    select
      id,
      workOrderId,
      name,
      size,
      createdAt
    from woPhotos
    where workOrderId = ${p.workOrderId ?? null}
    order by createdAt
  `),

  insert: () => {
    throw new ForbiddenError("use uploadPhotos");
  },

  update: () => {
    throw new ForbiddenError();
  },

  delete: () => {
    throw new ForbiddenError();
  },
});

export let parts: LiveTable<Part> = new LiveTable<Part>({
  select: () => sql<Part>(`
    select
      id,
      sku,
      name,
      unit,
      stock,
      reorderAt
    from parts
    order by name
  `),

  insert: () => {
    throw new ForbiddenError();
  },

  update: () => {
    throw new ForbiddenError("use receiveStock");
  },

  delete: () => {
    throw new ForbiddenError();
  },
});

export function technicians(): Person[] {
  return sql<Person>(`
    select
      id,
      name
    from users
    where role = 'technician'
    order by name
  `).all();
}

export interface AssetOption {
  id: string;
  name: string;
  building: string;
  line: string;
}

export function assetOptions(): AssetOption[] {
  return sql<AssetOption>(`
    select
      id,
      name,
      building,
      line
    from assets
    order by
      building,
      line,
      name
  `).all();
}

export interface RequestForm {
  assetId: string;
  title: string;
  description: string;
  priority: Priority;
  assetDown: boolean;
  assignedTo: string;
  dueDate: string;
  photos: File[];
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/** Runs before anything is written, so a bad file never leaves half a request behind. */
function checkPhotos(files: File[]) {
  for (let f of files) {
    if (!IMAGE_TYPES.has(f.contentType)) {
      throw new ValidationError(`${f.name} is not a photo`);
    }

    if (f.size > 10_000_000) {
      throw new ValidationError(`${f.name} is over 10 MB`);
    }
  }
}

function storePhotos(workOrderId: string, files: File[]) {
  for (let f of files) {
    sql(`
      insert into woPhotos (
        workOrderId,
        uploadedBy,
        name,
        contentType,
        size,
        data
      ) values (
        ${workOrderId},
        ${session.getOrThrow("userId")},
        ${f.name},
        ${f.contentType},
        ${f.size},
        ${f.data}
      )
    `);
  }
}

/**
 * A requester's report lands as requested. A manager can fill in the
 * assignment and date at once, which makes it scheduled.
 */
/** @rpc */
export function createWorkOrder(form: RequestForm): string {
  let { role } = requireRole("manager", "requester", "technician");

  let errors: Record<string, string[]> = {};
  if (!form.assetId) {
    errors.assetId = ["pick the asset"];
  }

  if (!form.title.trim()) {
    errors.title = ["say what is wrong in a few words"];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  checkPhotos(form.photos ?? []);

  let planned = role === "manager" && !!form.assignedTo && !!form.dueDate;

  return tx(() => {
    let row = sql<{ id: string }>(`
      insert into workOrders (
        assetId,
        title,
        description,
        priority,
        status,
        assignedTo,
        requestedBy,
        dueDate,
        assetDown
      ) values (
        ${form.assetId},
        ${form.title.trim()},
        ${form.description.trim()},
        ${PRIORITIES.some((p) => p.key === form.priority) ? form.priority : "medium"},
        ${planned ? "scheduled" : "requested"},
        ${role === "manager" ? form.assignedTo || null : null},
        ${session.getOrThrow("userId")},
        ${role === "manager" ? form.dueDate || null : null}::date,
        ${form.assetDown}
      )
      returning id
    `).firstOrThrow();

    storePhotos(row.id, form.photos ?? []);

    return row.id;
  });
}

function technicianWorkOrder(id: string): WorkOrder {
  let { userId, role } = requireRole("manager", "technician");
  let wo = getWorkOrder(id);

  if (role === "technician" && wo.assignedTo && wo.assignedTo !== userId) {
    throw new ForbiddenError(`this work order is assigned to ${wo.assigneeName}`);
  }

  return wo;
}

/** Starts or resumes the clock. An unassigned order is picked up by whoever starts it. */
/** @rpc */
export function startWork(id: string) {
  let wo = technicianWorkOrder(id);
  if (wo.status === "done") {
    throw new ValidationError("this work order is already done");
  }

  sql(`
    update workOrders
    set
      status = 'in_progress',
      timerStartedAt = coalesce(timerStartedAt, now()),
      completedAt = null,
      assignedTo = coalesce(assignedTo, ${session.getOrThrow("userId")}),
      dueDate = coalesce(dueDate, current_date)
    where id = ${id}
  `);
}

/** @rpc */
export function pauseWork(id: string) {
  technicianWorkOrder(id);
  applyStatus(id, "on_hold");
}

/** @rpc */
export function finishWork(id: string) {
  technicianWorkOrder(id);
  applyStatus(id, "done");
}

/** Takes parts off the shelf for a job. Stock never goes negative. */
/** @rpc */
export function usePart(workOrderId: string, partId: string, qty: number) {
  technicianWorkOrder(workOrderId);

  if (!Number.isInteger(qty) || qty < 1) {
    throw new ValidationError("quantity must be a whole number above zero");
  }

  tx(() => {
    let part = sql<{ name: string; stock: number }>(`
      select
        name,
        stock
      from parts
      where id = ${partId}
      for update
    `).firstOrThrow(new NotFoundError("part not found"));

    if (part.stock < qty) {
      throw new ValidationError(`only ${part.stock} ${part.name} in stock`);
    }

    sql(`
      update parts
      set stock = stock - ${qty}
      where id = ${partId}
    `);

    sql(`
      insert into woParts (
        workOrderId,
        partId,
        qty,
        usedBy
      ) values (
        ${workOrderId},
        ${partId},
        ${qty},
        ${session.getOrThrow("userId")}
      )
    `);
  });
}

/** Undoes a part entry and puts the stock back on the shelf. */
/** @rpc */
export function returnPart(partUseId: string) {
  let use = sql<{ workOrderId: string; partId: string; qty: number }>(`
    select
      workOrderId,
      partId,
      qty
    from woParts
    where id = ${partUseId}
  `).firstOrThrow(new NotFoundError("part entry not found"));

  technicianWorkOrder(use.workOrderId);

  tx(() => {
    sql(`
      delete from woParts
      where id = ${partUseId}
    `);

    sql(`
      update parts
      set stock = stock + ${use.qty}
      where id = ${use.partId}
    `);
  });
}

/** @rpc */
export function uploadPhotos(form: { workOrderId: string; files: File[] }) {
  requireRole();
  workOrderOrThrow(form.workOrderId);

  if (form.files.length === 0) {
    throw new ValidationError("pick a photo first");
  }

  checkPhotos(form.files);

  tx(() => storePhotos(form.workOrderId, form.files));
}

/** The bytes behind a photo, for the serve route. */
export function photoBytes(id: string): { contentType: string; data: Buffer; requestedBy: string | null } {
  return sql<{ contentType: string; data: Buffer; requestedBy: string | null }>(`
    select
      p.contentType,
      p.data,
      w.requestedBy
    from woPhotos p
    join workOrders w on w.id = p.workOrderId
    where p.id = ${id}
  `).firstOrThrow(new NotFoundError("photo not found"));
}

export function isImageType(type: string): boolean {
  return IMAGE_TYPES.has(type);
}

/** Puts delivered stock on the shelf. */
/** @rpc */
export function receiveStock(partId: string, qty: number) {
  requireRole("manager", "technician");

  if (!Number.isInteger(qty) || qty < 1) {
    throw new ValidationError("quantity must be a whole number above zero");
  }

  sql<{ id: string }>(`
    update parts
    set stock = stock + ${qty}
    where id = ${partId}
    returning id
  `).firstOrThrow(new NotFoundError("part not found"));
}

export interface PartForm {
  sku: string;
  name: string;
  unit: string;
  stock: number;
  reorderAt: number;
}

/** @rpc */
export function createPart(form: PartForm) {
  requireRole("manager");

  let errors: Record<string, string[]> = {};
  if (!form.sku.trim()) {
    errors.sku = ["required"];
  }

  if (!form.name.trim()) {
    errors.name = ["required"];
  }

  if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
    errors.stock = ["zero or more"];
  }

  if (!Number.isInteger(Number(form.reorderAt)) || Number(form.reorderAt) < 0) {
    errors.reorderAt = ["zero or more"];
  }

  let taken = !sql(`
    select 1
    from parts
    where sku = ${form.sku.trim()}
  `).empty();

  if (taken) {
    errors.sku = ["that SKU already exists"];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  sql(`
    insert into parts (
      sku,
      name,
      unit,
      stock,
      reorderAt
    ) values (
      ${form.sku.trim()},
      ${form.name.trim()},
      ${form.unit.trim() || "ea"},
      ${Number(form.stock)},
      ${Number(form.reorderAt)}
    )
  `);
}

/** @rpc */
export function setReorderPoint(partId: string, reorderAt: number) {
  requireRole("manager");

  if (!Number.isInteger(reorderAt) || reorderAt < 0) {
    throw new ValidationError("reorder point must be zero or more");
  }

  sql<{ id: string }>(`
    update parts
    set reorderAt = ${reorderAt}
    where id = ${partId}
    returning id
  `).firstOrThrow(new NotFoundError("part not found"));
}
