import type { Config } from "@netlify/functions";
import { AuthError, getUser, login, logout, MissingIdentityError } from "@netlify/identity";
import { json } from "../lib/enquiry.mjs";
import { STAFF_ROLES } from "../lib/auth.mjs";

/**
 * Staff sign-in for the enquiry desk.
 *
 * Login runs server-side so the public site keeps shipping zero third-party
 * JavaScript: the function sets the `nf_jwt` session cookie and the browser
 * simply reloads. Holding a valid account is not enough to read enquiries —
 * `requireStaff` separately demands an admin/staff role on every data request.
 */
export default async (req: Request) => {
  const action = new URL(req.url).pathname.split("/").pop();

  try {
    if (req.method === "GET" || action === "session") {
      const user = await getUser();
      if (!user) return json({ signedIn: false });
      const roles = user.roles ?? [];
      return json({
        signedIn: true,
        email: user.email ?? "",
        name: user.name ?? "",
        roles,
        authorised: roles.some((role) => STAFF_ROLES.includes(role)),
      });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

    if (action === "logout") {
      await logout();
      return json({ signedIn: false });
    }

    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) return json({ error: "Enter your email address and password." }, 422);

    const user = await login(email, password);
    const roles = user.roles ?? [];
    return json({
      signedIn: true,
      email: user.email ?? "",
      name: user.name ?? "",
      roles,
      authorised: roles.some((role) => STAFF_ROLES.includes(role)),
    });
  } catch (error) {
    if (error instanceof MissingIdentityError)
      return json({ error: "Staff sign-in is not enabled on this deploy." }, 503);
    if (error instanceof AuthError)
      return json(
        { error: error.status === 401 ? "Invalid email or password." : error.message },
        error.status ?? 400,
      );
    console.error("staff-session", error);
    return json({ error: "Sign-in is temporarily unavailable." }, 500);
  }
};

export const config: Config = {
  path: ["/api/staff/login", "/api/staff/logout", "/api/staff/session"],
};
