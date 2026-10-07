-- add maintenance schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

-- Announces a write on the table's LiveTable channel by id, so writes from an
-- rpc, a job or psql reach open pages. Each app server reads the row back
-- through the view's select, which carries the joined names.
create or replace function notifyRowById()
returns trigger
language plpgsql
as $$
declare
  r record;
begin
  r := coalesce(new, old);

  perform pg_notify(
    channel_name(tg_table_name),
    json_build_object('op', lower(tg_op), 'id', r.id)::text
  );

  return r;
end;
$$;

create type userRole as enum ('manager', 'technician', 'requester');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  role userRole not null,
  passwordHash text not null,
  isDemo boolean not null default false
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table assets (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  building text not null,
  line text not null,
  category text not null
);

create trigger assetsTouchUpdatedAt
  before update on assets
  for each row execute function touchUpdatedAt();

create table parts (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  sku text not null unique,
  name text not null,
  unit text not null default 'ea',
  stock integer not null default 0 check (stock >= 0),
  reorderAt integer not null default 0 check (reorderAt >= 0)
);

create trigger partsTouchUpdatedAt
  before update on parts
  for each row execute function touchUpdatedAt();

create trigger partsNotify
  after insert or update or delete on parts
  for each row execute function notifyRowById();

create table pmSchedules (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  assetId uuid not null references assets(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  every integer not null check (every > 0),
  unit text not null check (unit in ('days', 'weeks')),
  nextDue date not null,
  assignedTo uuid references users(id) on delete set null,
  active boolean not null default true
);

create trigger pmSchedulesTouchUpdatedAt
  before update on pmSchedules
  for each row execute function touchUpdatedAt();

create sequence workOrderNumbers start 1001;

create table workOrders (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  number integer not null unique default nextval('workOrderNumbers'),
  assetId uuid not null references assets(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'in_progress', 'on_hold', 'done')),
  assignedTo uuid references users(id) on delete set null,
  requestedBy uuid references users(id) on delete set null,
  pmScheduleId uuid references pmSchedules(id) on delete set null,
  dueDate date,
  assetDown boolean not null default false,
  secondsSpent integer not null default 0,
  timerStartedAt timestamptz,
  completedAt timestamptz
);

create index workOrdersAssetId on workOrders (assetId);
create index workOrdersAssignedTo on workOrders (assignedTo);
create index workOrdersStatus on workOrders (status);

create trigger workOrdersTouchUpdatedAt
  before update on workOrders
  for each row execute function touchUpdatedAt();

create trigger workOrdersNotify
  after insert or update or delete on workOrders
  for each row execute function notifyRowById();

create table woNotes (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  workOrderId uuid not null references workOrders(id) on delete cascade,
  authorId uuid references users(id) on delete set null,
  body text not null
);

create index woNotesWorkOrderId on woNotes (workOrderId);

create trigger woNotesTouchUpdatedAt
  before update on woNotes
  for each row execute function touchUpdatedAt();

create trigger woNotesNotify
  after insert or update or delete on woNotes
  for each row execute function notifyRowById();

create table woParts (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  workOrderId uuid not null references workOrders(id) on delete cascade,
  partId uuid not null references parts(id),
  qty integer not null check (qty > 0),
  usedBy uuid references users(id) on delete set null
);

create index woPartsWorkOrderId on woParts (workOrderId);

create trigger woPartsTouchUpdatedAt
  before update on woParts
  for each row execute function touchUpdatedAt();

create trigger woPartsNotify
  after insert or update or delete on woParts
  for each row execute function notifyRowById();

create table woPhotos (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  workOrderId uuid not null references workOrders(id) on delete cascade,
  uploadedBy uuid references users(id) on delete set null,
  name text not null,
  contentType text not null,
  size integer not null,
  data bytea not null
);

create index woPhotosWorkOrderId on woPhotos (workOrderId);

create trigger woPhotosTouchUpdatedAt
  before update on woPhotos
  for each row execute function touchUpdatedAt();

create trigger woPhotosNotify
  after insert or update or delete on woPhotos
  for each row execute function notifyRowById();
