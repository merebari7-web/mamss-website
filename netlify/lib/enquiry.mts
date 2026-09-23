import { createHash } from "node:crypto";

/** Entry classes published on the school's own admission flyer, plus a general enquiry. */
export const ENTRY_CLASSES = ["JSS 1", "JSS 2", "SS 1", "SS 2", "general"] as const;

/** Discussion topics offered by the guided visit enquiry on the public site. */
export const TOPIC_KEYS = ["places", "learning", "faith", "visit"] as const;

export const STATUSES = ["new", "read", "answered", "closed"] as const;

export const LIMITS = {
  name: 120,
  email: 160,
  phone: 40,
  message: 400,
  staffNote: 500,
  /** Maximum submissions accepted from one source hash per hour. */
  perHour: 5,
};

export type EnquiryInput = {
  name: string;
  email: string;
  phone: string;
  entryClass: string;
  proposedDate: string;
  proposedTime: string;
  topics: string;
  message: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[0-9+][0-9\s()+-]{5,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

/** Today in Africa/Lagos (UTC+01:00), matching the date rules used on the public site. */
export function lagosToday(now = new Date()) {
  return new Date(now.getTime() + 3600_000).toISOString().slice(0, 10);
}

/**
 * Validate an enquiry submitted by the public. Returns either the cleaned record
 * or a list of human-readable problems. Nothing is trusted from the client:
 * every field is re-checked here even though the browser checks it too.
 */
export function validateEnquiry(body: unknown): { data: EnquiryInput } | { errors: string[] } {
  const errors: string[] = [];
  const raw = (body ?? {}) as Record<string, unknown>;

  const name = text(raw.name).slice(0, LIMITS.name);
  if (name.length < 2) errors.push("Please give the name the school should reply to.");

  const email = text(raw.email).slice(0, LIMITS.email);
  if (email && !EMAIL.test(email)) errors.push("That email address does not look complete.");

  const phone = text(raw.phone).slice(0, LIMITS.phone);
  if (phone && !PHONE.test(phone)) errors.push("That phone number does not look complete.");

  if (!email && !phone) errors.push("Add an email address or a phone number so the school can reply.");

  const entryClass = text(raw.entryClass);
  if (!(ENTRY_CLASSES as readonly string[]).includes(entryClass))
    errors.push("Choose one of the published entry classes, or a general enquiry.");

  const proposedDate = text(raw.proposedDate);
  if (proposedDate) {
    if (!DATE.test(proposedDate) || Number.isNaN(Date.parse(proposedDate)))
      errors.push("The proposed day is not a valid date.");
    else if (proposedDate < lagosToday()) errors.push("The proposed day is in the past.");
    else if (proposedDate > "2100-12-31") errors.push("The proposed day is too far ahead.");
  }

  const proposedTime = text(raw.proposedTime);
  if (proposedTime && !TIME.test(proposedTime)) errors.push("The preferred time is not valid.");
  if (proposedTime && !proposedDate) errors.push("Choose a proposed day before a preferred time.");

  const topicList = Array.isArray(raw.topics) ? raw.topics : [];
  const topics = [...new Set(topicList.map(text))].filter((t) =>
    (TOPIC_KEYS as readonly string[]).includes(t),
  );

  const message = typeof raw.message === "string" ? raw.message.trim().slice(0, LIMITS.message) : "";

  return errors.length ? { errors } : {
    data: { name, email, phone, entryClass, proposedDate, proposedTime, topics: topics.join(","), message },
  };
}

/**
 * A salted, truncated, one-way hash of the caller's IP, used only to rate limit
 * abuse. It cannot be reversed to an address and is never returned to staff.
 */
export function sourceHash(ip: string) {
  const salt = process.env.ENQUIRY_HASH_SALT || process.env.SITE_ID || "mamss-local";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
