CREATE TABLE "app"."passkey_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "passkey_challenges_context_valid" CHECK (("app"."passkey_challenges"."purpose" = 'authentication' AND "app"."passkey_challenges"."user_id" IS NULL AND "app"."passkey_challenges"."session_id" IS NULL) OR ("app"."passkey_challenges"."purpose" = 'registration' AND "app"."passkey_challenges"."user_id" IS NOT NULL AND "app"."passkey_challenges"."session_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "app"."passkeys" (
	"credential_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "passkeys_device_type_valid" CHECK ("app"."passkeys"."device_type" IN ('singleDevice', 'multiDevice')),
	CONSTRAINT "passkeys_counter_nonnegative" CHECK ("app"."passkeys"."counter" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ADD COLUMN "last_authenticated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "app"."auth_sessions" SET "last_authenticated_at" = "created_at" WHERE "last_authenticated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ALTER COLUMN "last_authenticated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "app"."auth_sessions" ALTER COLUMN "last_authenticated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "user_handle" text;--> statement-breakpoint
UPDATE "app"."users" SET "user_handle" = translate(rtrim(encode(uuid_send(gen_random_uuid()), 'base64'), '='), '+/', '-_') WHERE "user_handle" IS NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ALTER COLUMN "user_handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."passkey_challenges" ADD CONSTRAINT "passkey_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."passkey_challenges" ADD CONSTRAINT "passkey_challenges_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "app"."auth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "passkey_challenges_hash_unique" ON "app"."passkey_challenges" USING btree ("challenge_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_codes_hash_unique" ON "app"."recovery_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_handle_unique" ON "app"."users" USING btree ("user_handle");