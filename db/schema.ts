import { index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Visit enquiries submitted from the public website.
 *
 * Only what a family chooses to type is stored. There is no tracking identifier,
 * no analytics profile and no student record. `sourceHash` is a salted, truncated
 * hash of the submitting IP used purely for abuse rate limiting; it is not
 * reversible to an address and is never shown to staff.
 */
export const enquiries = pgTable(
  "enquiries",
  {
    id: serial().primaryKey(),
    name: varchar({ length: 120 }).notNull(),
    email: varchar({ length: 160 }).notNull().default(""),
    phone: varchar({ length: 40 }).notNull().default(""),
    entryClass: varchar("entry_class", { length: 40 }).notNull(),
    proposedDate: varchar("proposed_date", { length: 10 }).notNull().default(""),
    proposedTime: varchar("proposed_time", { length: 5 }).notNull().default(""),
    topics: text().notNull().default(""),
    message: text().notNull().default(""),
    status: varchar({ length: 20 }).notNull().default("new"),
    staffNote: text("staff_note").notNull().default(""),
    sourceHash: varchar("source_hash", { length: 64 }).notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("enquiries_created_at_idx").on(table.createdAt),
    index("enquiries_status_idx").on(table.status),
  ],
);
