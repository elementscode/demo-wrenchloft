-- demo plant: accounts, assets, parts, preventive schedules and work orders

insert into users (
  email,
  name,
  role,
  passwordHash,
  isDemo
)
select
  v.email,
  v.name,
  v.role::userRole,
  crypt('wrenchloft', genSalt('bf', 12)),
  true
from (values
  ('dana@wrenchloft.test', 'Dana Reyes', 'manager'),
  ('marcus@wrenchloft.test', 'Marcus Lee', 'technician'),
  ('priya@wrenchloft.test', 'Priya Shah', 'technician'),
  ('tom@wrenchloft.test', 'Tom Becker', 'technician'),
  ('alice@wrenchloft.test', 'Alice Ng', 'requester'),
  ('sam@wrenchloft.test', 'Sam Ortiz', 'requester')
) as v(email, name, role);

insert into assets (
  name,
  building,
  line,
  category
) values
  ('Press 400T #1', 'Building A', 'Line 1', 'Press'),
  ('Press 400T #2', 'Building A', 'Line 1', 'Press'),
  ('CNC Mill VF-4', 'Building A', 'Line 1', 'Machining'),
  ('Robotic Welder W-12', 'Building A', 'Line 2', 'Welding'),
  ('Conveyor C-21', 'Building A', 'Line 2', 'Conveyor'),
  ('Air Compressor AC-1', 'Building A', 'Utilities', 'Compressed air'),
  ('Filler F-300', 'Building B', 'Line 3', 'Filling'),
  ('Capper CP-2', 'Building B', 'Line 3', 'Capping'),
  ('Case Packer CK-5', 'Building B', 'Line 4', 'Packaging'),
  ('Palletizer PZ-1', 'Building B', 'Line 4', 'Packaging'),
  ('Forklift FL-07', 'Building B', 'Warehouse', 'Material handling'),
  ('Chiller CH-2', 'Building B', 'Utilities', 'HVAC');

insert into parts (
  sku,
  name,
  unit,
  stock,
  reorderAt
) values
  ('HYD-F10', 'Hydraulic filter element 10µ', 'ea', 6, 4),
  ('HYD-OIL46', 'Hydraulic oil ISO 46', 'gal', 18, 20),
  ('BRG-6205', 'Ball bearing 6205-2RS', 'ea', 3, 6),
  ('BLT-C21', 'Conveyor belt splice kit', 'kit', 2, 1),
  ('WLD-TIP', 'Welder contact tip', 'ea', 40, 25),
  ('WLD-CAP', 'Welder electrode cap', 'ea', 12, 20),
  ('AIR-FLT', 'Compressor intake filter', 'ea', 1, 2),
  ('ORG-216', 'O-ring 2-216 EPDM', 'ea', 64, 30),
  ('NZL-F3', 'Filler nozzle valve', 'ea', 4, 2),
  ('CHK-INS', 'Capper chuck insert', 'ea', 8, 12),
  ('VAC-CUP', 'Vacuum cup 40mm', 'ea', 14, 10),
  ('GRS-EP2', 'Grease EP2 cartridge', 'ea', 9, 6),
  ('PRX-18', 'Proximity sensor M18', 'ea', 2, 3),
  ('FUS-10A', 'Fuse 10A class CC', 'ea', 22, 10);

insert into pmSchedules (
  assetId,
  title,
  description,
  priority,
  every,
  unit,
  nextDue,
  assignedTo
)
select
  a.id,
  v.title,
  v.description,
  v.priority,
  v.every,
  v.unit,
  (now() at time zone 'America/Los_Angeles')::date + v.dueIn,
  t.id
from (values
  ('Press 400T #1', 'Hydraulic pressure check', 'Check system pressure, inspect hoses and fittings, top off reservoir.', 'medium', 2, 'weeks', 10, 'marcus@wrenchloft.test'),
  ('Press 400T #2', 'Hydraulic pressure check', 'Check system pressure, inspect hoses and fittings, top off reservoir.', 'medium', 2, 'weeks', 16, 'marcus@wrenchloft.test'),
  ('Robotic Welder W-12', 'Tip dress and cable check', 'Dress tips, replace caps if worn, inspect weld cables for wear.', 'medium', 1, 'weeks', 9, 'priya@wrenchloft.test'),
  ('Air Compressor AC-1', 'Replace intake filter', 'Swap intake filter, drain condensate, log hours.', 'low', 30, 'days', 30, 'tom@wrenchloft.test'),
  ('Palletizer PZ-1', 'Lube chain and bearings', 'Grease all zerks, oil lift chain, check tension.', 'medium', 3, 'weeks', 24, 'tom@wrenchloft.test'),
  ('Filler F-300', 'Nozzle clean and O-rings', 'Clean all 12 nozzles, replace O-rings, verify fill weights.', 'medium', 1, 'weeks', 7, 'priya@wrenchloft.test'),
  ('Forklift FL-07', 'Weekly safety inspection', 'Forks, chains, brakes, horn, lights, fluid levels.', 'medium', 1, 'weeks', 5, 'tom@wrenchloft.test'),
  ('Conveyor C-21', 'Belt and roller inspection', 'Check belt tracking and splice, spin rollers, inspect gearbox oil.', 'low', 4, 'weeks', 4, 'marcus@wrenchloft.test'),
  ('Chiller CH-2', 'Condenser coil clean', 'Wash condenser coils, check refrigerant pressures and amps.', 'low', 12, 'weeks', 40, 'tom@wrenchloft.test')
) as v(asset, title, description, priority, every, unit, dueIn, tech)
join assets a on a.name = v.asset
join users t on t.email = v.tech;

-- Work history: jobs finished over the last two months, older than anything
-- still open, so each asset's page has a record to read.
insert into workOrders (
  assetId,
  title,
  description,
  priority,
  status,
  assignedTo,
  requestedBy,
  pmScheduleId,
  dueDate,
  assetDown,
  secondsSpent,
  completedAt,
  createdAt
)
select
  a.id,
  v.title,
  v.description,
  v.priority,
  'done',
  t.id,
  r.id,
  pm.id,
  ((now() - v.completedAgo::interval) at time zone 'America/Los_Angeles')::date,
  v.down,
  v.seconds,
  now() - v.completedAgo::interval,
  now() - v.createdAgo::interval
from (values
  ('Press 400T #1', 'Hydraulic pressure check', 'Check system pressure, inspect hoses and fittings, top off reservoir.', 'medium', 'marcus@wrenchloft.test', null, true, false, 2100, '25 days', '32 days'),
  ('Press 400T #1', 'Hose leak at the ram cylinder', 'Oil weeping from the return hose fitting at the main cylinder.', 'high', 'marcus@wrenchloft.test', 'alice@wrenchloft.test', false, true, 6300, '41 days', '41 days 6 hours'),
  ('Press 400T #2', 'Light curtain faulting', 'Light curtain trips with nothing in the field, press stops mid-cycle.', 'high', 'tom@wrenchloft.test', 'alice@wrenchloft.test', false, true, 4500, '19 days', '19 days 5 hours'),
  ('CNC Mill VF-4', 'Coolant pump replacement', 'Coolant flow weak at the spindle, pump running hot.', 'medium', 'marcus@wrenchloft.test', null, false, true, 7200, '33 days', '35 days'),
  ('CNC Mill VF-4', 'Way lube refill and leak check', 'Way lube low alarm twice this week.', 'low', 'priya@wrenchloft.test', 'sam@wrenchloft.test', false, false, 1800, '52 days', '54 days'),
  ('Robotic Welder W-12', 'Tip dress and cable check', 'Dress tips, replace caps if worn, inspect weld cables for wear.', 'medium', 'priya@wrenchloft.test', null, true, false, 1500, '17 days', '24 days'),
  ('Robotic Welder W-12', 'Wire feed slipping', 'Porosity on welds, wire feed stutters on long seams.', 'high', 'priya@wrenchloft.test', 'alice@wrenchloft.test', false, true, 3600, '28 days', '28 days 4 hours'),
  ('Conveyor C-21', 'Belt and roller inspection', 'Check belt tracking and splice, spin rollers, inspect gearbox oil.', 'low', 'marcus@wrenchloft.test', null, true, false, 2700, '24 days', '31 days'),
  ('Conveyor C-21', 'Belt splice torn', 'Splice opened up at the transfer, line stopped.', 'urgent', 'tom@wrenchloft.test', 'sam@wrenchloft.test', false, true, 8100, '45 days', '45 days 3 hours'),
  ('Air Compressor AC-1', 'Replace intake filter', 'Swap intake filter, drain condensate, log hours.', 'low', 'tom@wrenchloft.test', null, true, false, 1200, '29 days', '36 days'),
  ('Filler F-300', 'Fill weights drifting low', 'Bottles on heads 9 to 12 running 4 g under target.', 'high', 'priya@wrenchloft.test', 'alice@wrenchloft.test', false, true, 5400, '21 days', '21 days 7 hours'),
  ('Capper CP-2', 'Cap chute jamming', 'Caps hang up in the chute every few minutes.', 'medium', 'priya@wrenchloft.test', 'alice@wrenchloft.test', false, false, 2400, '38 days', '39 days'),
  ('Case Packer CK-5', 'Flap folder out of adjustment', 'Top flaps folding unevenly, cases rejected at the sealer.', 'medium', 'tom@wrenchloft.test', 'sam@wrenchloft.test', false, true, 3300, '16 days', '16 days 5 hours'),
  ('Palletizer PZ-1', 'Lube chain and bearings', 'Grease all zerks, oil lift chain, check tension.', 'medium', 'tom@wrenchloft.test', null, true, false, 2700, '20 days', '27 days'),
  ('Forklift FL-07', 'Hydraulic mast drift', 'Mast lowers slowly under load when parked.', 'high', 'marcus@wrenchloft.test', 'sam@wrenchloft.test', false, true, 4800, '35 days', '36 days'),
  ('Chiller CH-2', 'Condenser coil clean', 'Wash condenser coils, check refrigerant pressures and amps.', 'low', 'tom@wrenchloft.test', null, true, false, 3000, '44 days', '50 days')
) as v(asset, title, description, priority, tech, requester, isPm, down, seconds, completedAgo, createdAgo)
join assets a on a.name = v.asset
join users t on t.email = v.tech
left join users r on r.email = v.requester
left join pmSchedules pm on v.isPm and pm.assetId = a.id and pm.title = v.title;

insert into woParts (
  workOrderId,
  partId,
  qty,
  usedBy,
  createdAt
)
select
  w.id,
  p.id,
  v.qty,
  w.assignedTo,
  w.completedAt
from (values
  ('Hydraulic pressure check', 'Press 400T #1', 'HYD-OIL46', 3),
  ('Hose leak at the ram cylinder', 'Press 400T #1', 'HYD-OIL46', 6),
  ('Hose leak at the ram cylinder', 'Press 400T #1', 'ORG-216', 4),
  ('Light curtain faulting', 'Press 400T #2', 'FUS-10A', 1),
  ('Coolant pump replacement', 'CNC Mill VF-4', 'ORG-216', 2),
  ('Tip dress and cable check', 'Robotic Welder W-12', 'WLD-CAP', 4),
  ('Tip dress and cable check', 'Robotic Welder W-12', 'WLD-TIP', 6),
  ('Wire feed slipping', 'Robotic Welder W-12', 'WLD-TIP', 10),
  ('Belt splice torn', 'Conveyor C-21', 'BLT-C21', 1),
  ('Replace intake filter', 'Air Compressor AC-1', 'AIR-FLT', 1),
  ('Fill weights drifting low', 'Filler F-300', 'NZL-F3', 2),
  ('Fill weights drifting low', 'Filler F-300', 'ORG-216', 12),
  ('Flap folder out of adjustment', 'Case Packer CK-5', 'PRX-18', 1),
  ('Lube chain and bearings', 'Palletizer PZ-1', 'GRS-EP2', 3),
  ('Hydraulic mast drift', 'Forklift FL-07', 'HYD-OIL46', 2)
) as v(title, asset, sku, qty)
join assets a on a.name = v.asset
join workOrders w on w.assetId = a.id and w.title = v.title and w.createdAt < now() - interval '14 days'
join parts p on p.sku = v.sku;

insert into woNotes (
  workOrderId,
  authorId,
  body,
  createdAt
)
select
  w.id,
  u.id,
  v.body,
  w.completedAt - interval '5 minutes'
from (values
  ('Hose leak at the ram cylinder', 'marcus@wrenchloft.test', 'Fitting was cracked, not just loose. Replaced the fitting and both O-rings, topped off 6 gal.'),
  ('Light curtain faulting', 'tom@wrenchloft.test', 'Receiver lens was coated in oil mist. Cleaned both sides, realigned, replaced a blown fuse in the controller.'),
  ('Coolant pump replacement', 'marcus@wrenchloft.test', 'Impeller worn through. New pump in, flow back to spec at the spindle.'),
  ('Wire feed slipping', 'priya@wrenchloft.test', 'Drive rolls worn and liner kinked. New liner and rolls, ran a test coupon, welds clean.'),
  ('Belt splice torn', 'tom@wrenchloft.test', 'Respliced with a new kit and reset tracking. Recommend a new belt at the next shutdown.'),
  ('Fill weights drifting low', 'priya@wrenchloft.test', 'Two nozzle valves sticking. Replaced both and the O-rings on all four heads, weights within 0.5 g.'),
  ('Flap folder out of adjustment', 'tom@wrenchloft.test', 'Folder arm sensor loose and reading late. New sensor, re-timed the folder.'),
  ('Hydraulic mast drift', 'marcus@wrenchloft.test', 'Lift cylinder seals bypassing. Resealed, drift under 1 in. over 10 minutes with a full load.')
) as v(title, email, body)
join workOrders w on w.title = v.title and w.createdAt < now() - interval '14 days'
join users u on u.email = v.email;

insert into workOrders (
  assetId,
  title,
  description,
  priority,
  status,
  assignedTo,
  requestedBy,
  pmScheduleId,
  dueDate,
  assetDown,
  secondsSpent,
  timerStartedAt,
  completedAt,
  createdAt
)
select
  a.id,
  v.title,
  v.description,
  v.priority,
  v.status,
  t.id,
  r.id,
  pm.id,
  (now() at time zone 'America/Los_Angeles')::date + v.dueIn,
  v.down,
  v.seconds,
  now() - v.timerAgo::interval,
  now() - v.completedAgo::interval,
  now() - v.createdAgo::interval
from (values
  ('Filler F-300', 'Nozzle 6 dripping after shutoff', 'Product drips onto the conveyor after each fill cycle. Started this morning.', 'high', 'requested', null, 'alice@wrenchloft.test', false, null::int, false, 0, null, null, '40 minutes'),
  ('Conveyor C-21', 'Belt tracking off near transfer', 'Belt is riding up on the left guide at the transfer to Line 2.', 'medium', 'requested', null, 'sam@wrenchloft.test', false, null, false, 0, null, null, '3 hours'),
  ('Forklift FL-07', 'Horn not working', 'Horn button does nothing. Truck tagged out of the dock aisle until fixed.', 'low', 'requested', null, 'sam@wrenchloft.test', false, null, false, 0, null, null, '5 hours'),
  ('Case Packer CK-5', 'Glue gun clogging every hour', 'Gun 2 clogs roughly hourly, operators clearing it by hand.', 'high', 'requested', null, 'alice@wrenchloft.test', false, null, false, 0, null, null, '1 day 2 hours'),
  ('Press 400T #2', 'Hydraulic pressure check', 'Check system pressure, inspect hoses and fittings, top off reservoir.', 'medium', 'scheduled', 'marcus@wrenchloft.test', null, true, 2, false, 0, null, null, '5 days'),
  ('Robotic Welder W-12', 'Tip dress and cable check', 'Dress tips, replace caps if worn, inspect weld cables for wear.', 'medium', 'scheduled', 'priya@wrenchloft.test', null, true, 2, false, 0, null, null, '5 days'),
  ('Air Compressor AC-1', 'Replace intake filter', 'Swap intake filter, drain condensate, log hours.', 'low', 'scheduled', 'tom@wrenchloft.test', null, true, 0, false, 0, null, null, '7 days'),
  ('Palletizer PZ-1', 'Lube chain and bearings', 'Grease all zerks, oil lift chain, check tension.', 'medium', 'scheduled', 'tom@wrenchloft.test', null, true, 3, false, 0, null, null, '4 days'),
  ('Capper CP-2', 'Replace worn chuck inserts', 'Loose caps on 38mm closures. Inserts on heads 3 and 5 look worn.', 'high', 'scheduled', 'priya@wrenchloft.test', 'alice@wrenchloft.test', false, 1, false, 0, null, null, '2 days'),
  ('CNC Mill VF-4', 'Spindle warm-up alarm', 'Alarm 9031 on the warm-up program, clears on reset.', 'medium', 'scheduled', 'marcus@wrenchloft.test', null, false, -2, false, 0, null, null, '6 days'),
  ('Press 400T #2', 'Slide gib adjustment', 'Parts out of flatness spec. Slide has play on the operator side.', 'high', 'in_progress', 'marcus@wrenchloft.test', null, false, 0, true, 1800, '35 minutes', null, '3 hours'),
  ('Filler F-300', 'Nozzle clean and O-rings', 'Clean all 12 nozzles, replace O-rings, verify fill weights.', 'medium', 'in_progress', 'priya@wrenchloft.test', null, true, 0, false, 0, '12 minutes', null, '7 days'),
  ('Chiller CH-2', 'Low refrigerant alarm', 'Low suction pressure alarm, process water running warm.', 'urgent', 'in_progress', 'tom@wrenchloft.test', 'sam@wrenchloft.test', false, -1, true, 2700, null, null, '6 hours'),
  ('Conveyor C-21', 'Gearbox noise on motor 3', 'Grinding noise from the motor 3 gearbox under load.', 'high', 'on_hold', 'marcus@wrenchloft.test', 'sam@wrenchloft.test', false, -3, false, 3600, null, null, '4 days'),
  ('Case Packer CK-5', 'Replace vacuum cups', 'Cups on the pick head are cracked; drops cases now and then.', 'medium', 'on_hold', 'tom@wrenchloft.test', 'alice@wrenchloft.test', false, 2, false, 900, null, null, '2 days'),
  ('Press 400T #1', 'Hydraulic pressure check', 'Check system pressure, inspect hoses and fittings, top off reservoir.', 'medium', 'done', 'marcus@wrenchloft.test', null, true, -4, false, 2400, null, '4 days 2 hours', '11 days'),
  ('Robotic Welder W-12', 'Tip dress and cable check', 'Dress tips, replace caps if worn, inspect weld cables for wear.', 'medium', 'done', 'priya@wrenchloft.test', null, true, -5, false, 1500, null, '3 days 1 hour', '12 days'),
  ('Forklift FL-07', 'Weekly safety inspection', 'Forks, chains, brakes, horn, lights, fluid levels.', 'medium', 'done', 'tom@wrenchloft.test', null, true, -2, false, 1200, null, '2 days 4 hours', '9 days'),
  ('Capper CP-2', 'Capper jammed, torque fault', 'Torque fault on head 4, line stopped.', 'urgent', 'done', 'priya@wrenchloft.test', 'alice@wrenchloft.test', false, -5, true, 5400, null, '5 days 2 hours', '5 days 5 hours 30 minutes'),
  ('Palletizer PZ-1', 'Layer gripper sensor failed', 'Gripper never sees the layer, pallet cycle faults out.', 'high', 'done', 'marcus@wrenchloft.test', 'sam@wrenchloft.test', false, -8, true, 3900, null, '8 days 1 hour', '8 days 4 hours')
) as v(asset, title, description, priority, status, tech, requester, isPm, dueIn, down, seconds, timerAgo, completedAgo, createdAgo)
join assets a on a.name = v.asset
left join users t on t.email = v.tech
left join users r on r.email = v.requester
left join pmSchedules pm on v.isPm and pm.assetId = a.id and pm.title = v.title;

-- A requested job has no date until a manager schedules it.
update workOrders
set dueDate = null
where status = 'requested';

insert into woParts (
  workOrderId,
  partId,
  qty,
  usedBy
)
select
  w.id,
  p.id,
  v.qty,
  w.assignedTo
from (values
  ('Hydraulic pressure check', 'Press 400T #1', 'HYD-OIL46', 2),
  ('Hydraulic pressure check', 'Press 400T #1', 'HYD-F10', 1),
  ('Tip dress and cable check', 'Robotic Welder W-12', 'WLD-CAP', 4),
  ('Capper jammed, torque fault', 'Capper CP-2', 'CHK-INS', 2),
  ('Capper jammed, torque fault', 'Capper CP-2', 'FUS-10A', 1),
  ('Layer gripper sensor failed', 'Palletizer PZ-1', 'PRX-18', 1),
  ('Gearbox noise on motor 3', 'Conveyor C-21', 'GRS-EP2', 1)
) as v(title, asset, sku, qty)
join assets a on a.name = v.asset
join workOrders w on w.assetId = a.id and w.title = v.title and (w.status = 'done' or w.status = 'on_hold')
  and w.createdAt > now() - interval '14 days'
join parts p on p.sku = v.sku;

insert into woNotes (
  workOrderId,
  authorId,
  body,
  createdAt
)
select
  w.id,
  u.id,
  v.body,
  now() - v.ago::interval
from (values
  ('Gearbox noise on motor 3', 'marcus@wrenchloft.test', 'Output bearing is rough. Ordered two 6205s, holding until they arrive.', '3 days'),
  ('Replace vacuum cups', 'tom@wrenchloft.test', 'Only 14 cups on the shelf and the head takes 16. Waiting on stock.', '1 day'),
  ('Capper jammed, torque fault', 'priya@wrenchloft.test', 'Blown fuse on the head 4 servo, chuck insert chewed up. Replaced both, ran 200 caps clean.', '5 days 2 hours'),
  ('Slide gib adjustment', 'marcus@wrenchloft.test', 'Loosened gib bolts, shimmed operator side 0.004". Checking parts now.', '10 minutes'),
  ('Low refrigerant alarm', 'tom@wrenchloft.test', 'Found oil at the schrader on the suction line. Leak checking the rest before charging.', '2 hours')
) as v(title, email, body, ago)
join workOrders w on w.title = v.title and w.createdAt > now() - interval '14 days'
join users u on u.email = v.email;
