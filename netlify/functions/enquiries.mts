import type { Config, Context } from "@netlify/functions";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { enquiries } from "../../db/schema.js";
import { requireStaff } from "../lib/auth.mjs";
import { json, LIMITS, STATUSES, validateEnquiry, sourceHash } from "../lib/enquiry.mjs";

/** Public submission: a family sends a visit enquiry to the school office. */
async function create(req: Request, context: Context) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "That enquiry could not be read." }, 400);
  }

  const result = validateEnquiry(body);
  if ("errors" in result) return json({ error: result.errors[0], errors: result.errors }, 422);

  const hash = sourceHash(context.ip ?? "unknown");
  const since = new Date(Date.now() - 3600_000);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(and(eq(enquiries.sourceHash, hash), gte(enquiries.createdAt, since)));

  if ((recent?.count ?? 0) >= LIMITS.perHour)
    return json(
      { error: "Several enquiries have already been sent from here. Please call the school on 0703 789 8216." },
      429,
    );

  const [saved] = await db
    .insert(enquiries)
    .values({ ...result.data, sourceHash: hash })
    .returning({ id: enquiries.id, createdAt: enquiries.createdAt });

  return json({ id: saved.id, received: saved.createdAt }, 201);
}

/** Staff view: the enquiries the office still needs to act on. */
async function list() {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const rows = await db
    .select({
      id: enquiries.id,
      name: enquiries.name,
      email: enquiries.email,
      phone: enquiries.phone,
      entryClass: enquiries.entryClass,
      proposedDate: enquiries.proposedDate,
      proposedTime: enquiries.proposedTime,
      topics: enquiries.topics,
      message: enquiries.message,
      status: enquiries.status,
      staffNote: enquiries.staffNote,
      createdAt: enquiries.createdAt,
    })
    .from(enquiries)
    .orderBy(desc(enquiries.createdAt))
    .limit(200);

  return json({ user: { email: auth.user.email, roles: auth.user.roles }, enquiries: rows });
}

/** Staff triage: mark an enquiry read/answered/closed and keep an internal note. */
async function update(req: Request, context: Context) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const id = Number(context.params.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "Unknown enquiry." }, 400);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "That update could not be read." }, 400);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.status === "string") {
    if (!(STATUSES as readonly string[]).includes(body.status))
      return json({ error: "Unknown status." }, 422);
    patch.status = body.status;
  }
  if (typeof body.staffNote === "string") patch.staffNote = body.staffNote.slice(0, LIMITS.staffNote);
  if (Object.keys(patch).length === 1) return json({ error: "Nothing to update." }, 400);

  const [row] = await db.update(enquiries).set(patch).where(eq(enquiries.id, id)).returning({
    id: enquiries.id,
    status: enquiries.status,
    staffNote: enquiries.staffNote,
  });
  if (!row) return json({ error: "Unknown enquiry." }, 404);
  return json(row);
}

export default async (req: Request, context: Context) => {
  try {
    if (req.method === "POST") return await create(req, context);
    if (req.method === "GET") return await list();
    if (req.method === "PATCH") return await update(req, context);
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("enquiries", error);
    return json({ error: "The school enquiry service is temporarily unavailable." }, 500);
  }
};

export const config: Config = {
  path: ["/api/enquiries", "/api/enquiries/:id"],
};
