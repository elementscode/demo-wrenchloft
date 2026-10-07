import { sql, session } from "@elements/app";
import { Role } from "#app/shared/services/auth";

/** A small plant for tests, added beside the demo seed; tests scope to its ids. */
export interface Plant {
  manager: string;
  tech: string;
  otherTech: string;
  requester: string;
  asset: string;
  part: string;
  sku: string;
}

function user(name: string, role: Role, tag: string): string {
  return sql<{ id: string }>(`
    insert into users (
      email,
      name,
      role,
      passwordHash
    ) values (
      ${`${name.toLowerCase().replace(/\s+/g, ".")}.${tag}@test.plant`},
      ${name},
      ${role}::userRole,
      'not-a-hash'
    )
    returning id
  `).firstOrThrow().id;
}

export function seedPlant(): Plant {
  // Emails and SKUs are unique, and test files run in parallel; a fixed value would make them wait on each other.
  let tag = crypto.randomUUID().slice(0, 8);
  let sku = `T-${tag}`;

  let asset = sql<{ id: string }>(`
    insert into assets (
      name,
      building,
      line,
      category
    ) values (
      'Test Press',
      'Building T',
      'Line 9',
      'Press'
    )
    returning id
  `).firstOrThrow().id;

  let part = sql<{ id: string }>(`
    insert into parts (
      sku,
      name,
      stock,
      reorderAt
    ) values (
      ${sku},
      'Test filter',
      5,
      2
    )
    returning id
  `).firstOrThrow().id;

  return {
    manager: user("Mia Manager", "manager", tag),
    tech: user("Theo Tech", "technician", tag),
    otherTech: user("Olga Other", "technician", tag),
    requester: user("Rae Requester", "requester", tag),
    asset,
    part,
    sku,
  };
}

export function loginAs(userId: string) {
  let u = sql<{ name: string; role: Role }>(`
    select
      name,
      role
    from users
    where id = ${userId}
  `).firstOrThrow();

  session.login({
    userId,
    userName: u.name,
    role: u.role,
  });
}

export function workOrder(plant: Plant, fields: { status?: string; assignedTo?: string | null; requestedBy?: string | null; dueDate?: string | null; pmScheduleId?: string | null } = {}): string {
  return sql<{ id: string }>(`
    insert into workOrders (
      assetId,
      title,
      status,
      assignedTo,
      requestedBy,
      dueDate,
      pmScheduleId
    ) values (
      ${plant.asset},
      'Test job',
      ${fields.status ?? "scheduled"},
      ${fields.assignedTo === undefined ? plant.tech : fields.assignedTo},
      ${fields.requestedBy ?? null},
      ${fields.dueDate ?? null}::date,
      ${fields.pmScheduleId ?? null}
    )
    returning id
  `).firstOrThrow().id;
}

/** Runs `fn` and reports whether it threw an error of the given class. */
export async function throwsA(fn: () => unknown, kind: Function): Promise<string> {
  try {
    await fn();
  } catch (err: any) {
    return err instanceof kind ? "" : `threw ${err?.constructor?.name}: ${err?.message}`;
  }

  return "did not throw";
}
