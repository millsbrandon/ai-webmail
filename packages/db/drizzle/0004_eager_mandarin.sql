CREATE TABLE "app"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_session_id" uuid,
	"organization_id" uuid,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"outcome" text DEFAULT 'success' NOT NULL,
	"correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_action_valid" CHECK ("app"."audit_events"."action" IN ('session.created', 'session.revoked', 'sessions.revoked_others', 'user.disabled', 'passkey.registered', 'passkey.removed', 'recovery.rotated')),
	CONSTRAINT "audit_events_target_bounded" CHECK (char_length("app"."audit_events"."target_id") BETWEEN 1 AND 2048),
	CONSTRAINT "audit_events_outcome_valid" CHECK ("app"."audit_events"."outcome" = 'success')
);
--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ADD COLUMN "authentication_method" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ADD COLUMN "device_label" text DEFAULT 'Browser session' NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_events_actor_created_idx" ON "app"."audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ADD CONSTRAINT "auth_sessions_method_valid" CHECK ("app"."auth_sessions"."authentication_method" IN ('password', 'passkey', 'recovery', 'unknown'));--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ADD CONSTRAINT "auth_sessions_device_label_bounded" CHECK (char_length("app"."auth_sessions"."device_label") BETWEEN 1 AND 80);--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "app"."audit_events" FROM webmail_runtime;