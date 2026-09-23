CREATE TABLE "enquiries" (
	"id" serial PRIMARY KEY,
	"name" varchar(120) NOT NULL,
	"email" varchar(160) DEFAULT '' NOT NULL,
	"phone" varchar(40) DEFAULT '' NOT NULL,
	"entry_class" varchar(40) NOT NULL,
	"proposed_date" varchar(10) DEFAULT '' NOT NULL,
	"proposed_time" varchar(5) DEFAULT '' NOT NULL,
	"topics" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"staff_note" text DEFAULT '' NOT NULL,
	"source_hash" varchar(64) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "enquiries_created_at_idx" ON "enquiries" ("created_at");--> statement-breakpoint
CREATE INDEX "enquiries_status_idx" ON "enquiries" ("status");