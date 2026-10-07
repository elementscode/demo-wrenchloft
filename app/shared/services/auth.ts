import { sql, session, AuthError, ForbiddenError, redirect } from "@elements/app";

export type Role = "manager" | "technician" | "requester";

export interface DemoLogin {
  email: string;
  name: string;
  role: Role;
}

export const DEMO_PASSWORD = "wrenchloft";

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  switch (role) {
    case "manager":
      return "/dashboard";

    case "technician":
      return "/today";

    default:
      return "/requests";
  }
}

/**
 * The guard for routes and rpc. A missing session is a 401 and the wrong role
 * a 403, so the error page can tell "sign in" from "not for you".
 */
export function requireRole(...roles: Role[]): { userId: string; role: Role } {
  session.isLoggedInOrThrow();

  let role = session.getOrThrow("role");
  if (roles.length > 0 && !roles.includes(role)) {
    throw new ForbiddenError("your account does not have access to this page");
  }

  return {
    userId: session.getOrThrow("userId"),
    role,
  };
}

/**
 * The page guard. A signed-out visitor goes to sign in, and someone on the
 * wrong page for their role goes to their own home, rather than an error.
 */
export function requirePageRole(...roles: Role[]): { userId: string; role: Role } | undefined {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return undefined;
  }

  let role = session.getOrThrow("role");
  if (roles.length > 0 && !roles.includes(role)) {
    redirect(homeFor(role));
    return undefined;
  }

  return requireRole(...roles);
}

/** The seeded accounts, shown on the sign-in page. Empty on a database without the demo seed. */
export function demoLogins(): DemoLogin[] {
  return sql<DemoLogin>(`
    select
      email,
      name,
      role
    from users
    where isDemo
    order by
      role,
      name
  `).all();
}

/** @rpc */
export function signin(email: string, password: string): string {
  let address = email.trim().toLowerCase();

  if (!address || !password) {
    throw new AuthError("enter your email and password");
  }

  let user = sql<{ id: string; name: string; role: Role }>(`
    select
      id,
      name,
      role
    from users
    where
      email = ${address}
      and passwordHash = crypt(${password}, passwordHash)
  `).firstOrThrow(new AuthError("invalid email or password"));

  session.login({
    userId: user.id,
    userName: user.name,
    role: user.role,
  });

  return homeFor(user.role);
}

/** @rpc */
export function signout() {
  session.logout();
}
