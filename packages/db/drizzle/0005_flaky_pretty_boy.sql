CREATE TABLE "app"."poll_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"state" text DEFAULT 'ready' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_succeeded_at" timestamp with time zone,
	CONSTRAINT "poll_jobs_mailbox_unique" UNIQUE("organization_id","mailbox_id"),
	CONSTRAINT "poll_jobs_kind_valid" CHECK ("app"."poll_jobs"."kind" = 'synthetic.poll'),
	CONSTRAINT "poll_jobs_state_valid" CHECK ("app"."poll_jobs"."state" IN ('ready', 'running', 'failed')),
	CONSTRAINT "poll_jobs_attempts_valid" CHECK ("app"."poll_jobs"."attempts" BETWEEN 0 AND 5),
	CONSTRAINT "poll_jobs_error_valid" CHECK ("app"."poll_jobs"."last_error" IN ('processor_failed', 'lease_expired')),
	CONSTRAINT "poll_jobs_lease_valid" CHECK (("app"."poll_jobs"."state" = 'running' AND "app"."poll_jobs"."lease_token" IS NOT NULL AND "app"."poll_jobs"."lease_expires_at" IS NOT NULL) OR ("app"."poll_jobs"."state" <> 'running' AND "app"."poll_jobs"."lease_token" IS NULL AND "app"."poll_jobs"."lease_expires_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "app"."poll_jobs" ADD CONSTRAINT "poll_jobs_organization_id_mailbox_id_mailboxes_organization_id_id_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "app"."mailboxes"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "poll_jobs_due_idx" ON "app"."poll_jobs" USING btree ("state","due_at");