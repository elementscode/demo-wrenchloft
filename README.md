![Wrenchloft, maintenance work orders for a manufacturing plant built with Elements: the manager's board with work orders in requested, scheduled, in progress, on hold and done, priority pills, asset-down flags and technician timers running.](https://elements.dev/demos/01a11403-eb60-7a31-9200-27c9491b2bbc/poster?v=a19791b761eb)

# Wrenchloft

> A demo app built with [Elements](https://elements.dev).

Work orders on a live status board, preventive schedules that open jobs when due, phone timers for technicians, parts stock with a reorder list and a downtime dashboard.

**Demo:** [Wrenchloft](https://elements.dev/demos/01a11403-eb60-7a31-9200-27c9491b2bbc)

## Agent specs

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 23 min
- **Cost:** $9.45 at API rates, October 2026

## Get started

```bash
elements create wrenchloft -scaffold=elementscode/demo-wrenchloft
```

## How it's built

Wrenchloft needed three kinds of accounts, a board and technician timers that update on every screen, stock that drops as parts are used, and preventive work that opens itself on schedule. Each of those is a part of Elements, so the agent spent its 23 minutes on the maintenance shop itself.

### What Elements gave the app

- **A live board and timers.** Work orders, notes, photos, part uses and parts are LiveTables. A manager drags a card to On hold and the technician's phone shows it at once; a technician presses Start and the card on the manager's board starts its clock.

- **Stock that stays right.** Using a part is an `@rpc` call that locks the part's row, lowers its stock and records the use in one transaction, so the count stays exact when two technicians reach for the same part. The parts page and its reorder list update as the count changes.

- **Preventive work on a schedule.** A one-line cron schedule runs a job every 15 minutes that opens a work order a week before each schedule comes due, then rolls the schedule forward.

- **Photos from the floor.** Technicians and requesters attach photos straight from a phone camera through a server call, stored in Postgres and served by the app's own route.

- **Roles and sessions.** One guard on the signed-in user's role sends managers, technicians and requesters to their own pages and keeps every server call to the right people.

- **Data from SQL files.** Migrations define the plant and seed six accounts, twelve assets across two buildings, nine preventive schedules, fourteen parts and thirty-six work orders with their parts and notes. The project server applied each one as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 46 tests pass. Every page works on desktop and phone, and live updates arrive across tabs, such as a card moving on the board, a timer starting and a stock count dropping.

## Seed data and demo accounts

The seed loads in every environment: twelve assets across two buildings, nine
preventive schedules, fourteen parts (several below their reorder point), and
thirty-six work orders. Twenty are current, in every status from requested to
done, with two technician timers running; sixteen are finished jobs from the
last two months that make up each asset's work history.

Every account's password is `wrenchloft`, and the sign-in page lists them.

| Email                    | Name        | Role       |
| ------------------------ | ----------- | ---------- |
| dana@wrenchloft.test     | Dana Reyes  | manager    |
| marcus@wrenchloft.test   | Marcus Lee  | technician |
| priya@wrenchloft.test    | Priya Shah  | technician |
| tom@wrenchloft.test      | Tom Becker  | technician |
| alice@wrenchloft.test    | Alice Ng    | requester  |
| sam@wrenchloft.test      | Sam Ortiz   | requester  |

Managers land on the dashboard and plan work on the board and calendar.
Technicians land on Today, a phone view of their work with a timer. Requesters
report problems and follow their requests. "Today" follows the plant's time
zone, `PLANT_TIME_ZONE` in config, which defaults to America/Los_Angeles.

**Demo:** [Wrenchloft](https://elements.dev/demos/01a11403-eb60-7a31-9200-27c9491b2bbc)

## License

MIT. See [LICENSE](LICENSE).
