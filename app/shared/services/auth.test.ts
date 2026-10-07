import { test, equal, sql, session, AuthError } from "@elements/app";
import { throwsA } from "#app/shared/testing";
import { signin, homeFor } from "./auth";

test("signin", async () => {
  sql(`
    insert into users (
      email,
      name,
      role,
      passwordHash
    ) values (
      'tess@test.plant',
      'Tess',
      'technician',
      crypt('right-password', genSalt('bf', 4))
    )
  `);

  test("the right password signs in and lands on the role's home", async () => {
    equal(signin(" Tess@Test.Plant ", "right-password"), "/today");
    equal(session.get("role"), "technician");
    equal(session.get("userName"), "Tess");
  });

  test("a wrong password is refused", async () => {
    equal(await throwsA(() => signin("tess@test.plant", "wrong"), AuthError), "");
    equal(session.isLoggedIn(), false);
  });

  test("an unknown email is refused the same way", async () => {
    equal(await throwsA(() => signin("nobody@test.plant", "right-password"), AuthError), "");
  });

  test("each role has a home", async () => {
    equal(homeFor("manager"), "/dashboard");
    equal(homeFor("requester"), "/requests");
  });
});
