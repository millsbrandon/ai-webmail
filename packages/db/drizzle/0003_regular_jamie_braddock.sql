CREATE TABLE "app"."mailbox_memberships" (
	"organization_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"approve_ai" boolean,
	"export" boolean DEFAULT false NOT NULL,
	"delete" boolean DEFAULT false NOT NULL,
	"manage_rules" boolean,
	CONSTRAINT "mailbox_memberships_organization_id_mailbox_id_user_id_pk" PRIMARY KEY("organization_id","mailbox_id","user_id"),
	CONSTRAINT "mailbox_memberships_role_valid" CHECK ("app"."mailbox_memberships"."role" IN ('viewer', 'responder', 'manager'))
);
--> statement-breakpoint
CREATE TABLE "app"."mailboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"address" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mailboxes_organization_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "mailboxes_address_normalized" CHECK ("app"."mailboxes"."address" = lower(btrim("app"."mailboxes"."address"))),
	CONSTRAINT "mailboxes_status_valid" CHECK ("app"."mailboxes"."status" IN ('active', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "app"."organization_memberships" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "organization_memberships_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id"),
	CONSTRAINT "organization_memberships_role_valid" CHECK ("app"."organization_memberships"."role" IN ('owner', 'administrator', 'member'))
);
--> statement-breakpoint
CREATE TABLE "app"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."mailbox_memberships" ADD CONSTRAINT "mailbox_memberships_mailbox_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "app"."mailboxes"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mailbox_memberships" ADD CONSTRAINT "mailbox_memberships_organization_member_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "app"."organization_memberships"("organization_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mailboxes" ADD CONSTRAINT "mailboxes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mailboxes_organization_address_unique" ON "app"."mailboxes" USING btree ("organization_id","address");