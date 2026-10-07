import { Request, Response, redirect, session } from "@elements/app";
import { demoLogins, homeFor } from "#app/shared/services/auth";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect(homeFor(session.getOrThrow("role")));
    return;
  }

  return new html({ logins: demoLogins() });
}
