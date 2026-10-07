import { App, redirect, session } from "@elements/app";
import config from "#config";
import { homeFor } from "#app/shared/services/auth";
import signin from "#app/pages/signin";
import board from "#app/pages/board";
import workOrder from "#app/pages/work-order";
import servePhoto from "#app/routes/photos";
import today from "#app/pages/today";
import newWorkOrder from "#app/pages/new-work-order";
import requests from "#app/pages/requests";
import calendar from "#app/pages/calendar";
import dashboard from "#app/pages/dashboard";
import preventive from "#app/pages/preventive";
import assets from "#app/pages/assets";
import asset from "#app/pages/asset";
import partsPage from "#app/pages/parts";
import { GeneratePreventiveJob } from "#app/jobs/generate-preventive";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

const app = new App();

app.route("/", () => {
  redirect(session.isLoggedIn() ? homeFor(session.getOrThrow("role")) : "/signin");
});

app.route("/signin", signin);
app.route("/board", board);
app.route("/work-orders/new", newWorkOrder);
app.route("/work-orders/:id", workOrder);
app.route("/photos/:id", servePhoto);
app.route("/today", today);
app.route("/requests", requests);
app.route("/calendar", calendar);
app.route("/dashboard", dashboard);
app.route("/pm", preventive);
app.route("/equipment", assets);
app.route("/equipment/:id", asset);
app.route("/parts", partsPage);

// Preventive schedules turn into work orders as they come due.
app.cron("every 15m", "generate preventive work", () => new GeneratePreventiveJob().schedule());

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
