import { getUser } from "@netlify/identity";
import { json } from "./enquiry.mjs";

/** Roles allowed to read or triage enquiries. Assigned in the Netlify Identity UI. */
export const STAFF_ROLES = ["admin", "staff"];

export type StaffUser = { id: string; email: string; name: string; roles: string[] };

/**
 * Resolve the signed-in staff member from the request's Identity session.
 *
 * Identity registration is open by default, so a valid login is NOT on its own
 * proof of school staff. Access additionally requires an explicit `admin` or
 * `staff` role, which only a project administrator can grant.
 */
export async function requireStaff(): Promise<{ user: StaffUser } | { response: Response }> {
  let user = null;
  try {
    user = await getUser();
  } catch {
    return { response: json({ error: "Staff sign-in is not available on this deploy." }, 503) };
  }
  if (!user) return { response: json({ error: "Please sign in to continue." }, 401) };

  const roles = user.roles ?? [];
  if (!roles.some((role) => STAFF_ROLES.includes(role)))
    return {
      response: json(
        {
          error:
            "This account has no school staff role yet. A project administrator must add the 'staff' or 'admin' role in Netlify Identity.",
        },
        403,
      ),
    };

  return {
    user: { id: user.id ?? "", email: user.email ?? "", name: user.name ?? "", roles },
  };
}
