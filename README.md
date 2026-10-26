![Maintenance work orders with parts stock, built by Claude Code on Elements: the manager's board with work orders in requested, scheduled, in progress, on hold and done, priority pills, asset-down flags and technician timers running.](https://elements.dev/demos/01a11403-eb60-7a31-9200-27c9491b2bbc/poster?v=a19791b761eb)

# Maintenance work orders with parts stock, built by Claude Code on Elements

> Wrenchloft is a full-stack app built with Claude Code on Elements.

Work orders on a live status board, preventive schedules that open jobs when due, phone timers for technicians, parts stock with a reorder list and a downtime dashboard.

[Run this app on your machine](https://elements.dev/demos/01a11403-eb60-7a31-9200-27c9491b2bbc). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Wrenchloft needed three kinds of accounts, a board and technician timers that update on every screen, stock that drops as parts are used, and preventive work that opens itself on schedule. Each of those is a part of Elements, so the agent spent its 23 minutes on the maintenance shop itself.

- **A live board and timers.** Work orders, notes, photos, part uses and parts are LiveTables. A manager drags a card to On hold and the technician's phone shows it at once; a technician presses Start and the card on the manager's board starts its clock.

- **Stock that stays right.** Using a part is an `@rpc` call that locks the part's row, lowers its stock and records the use in one transaction, so the count stays exact when two technicians reach for the same part. The parts page and its reorder list update as the count changes.

- **Preventive work on a schedule.** A one-line cron schedule runs a job every 15 minutes that opens a work order a week before each schedule comes due, then rolls the schedule forward.

- **Photos from the floor.** Technicians and requesters attach photos straight from a phone camera through a server call, stored in Postgres and served by the app's own route.

- **Roles and sessions.** One guard on the signed-in user's role sends managers, technicians and requesters to their own pages and keeps every server call to the right people.

- **Data from SQL files.** Migrations define the plant and seed six accounts, twelve assets across two buildings, nine preventive schedules, fourteen parts and thirty-six work orders with their parts and notes. The project server applied each one as soon as it was saved.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
