CREATE TYPE "public"."provider" AS ENUM('google', 'microsoft');
CREATE TABLE "credential" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(32) NOT NULL,
	"user_id" integer,
	"provider" "provider" NOT NULL,
	"scope" varchar[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "tenant" (
	"slug" varchar(32) PRIMARY KEY NOT NULL,
	"display_name" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slug_check" CHECK ("tenant"."slug" ~ '^[a-z0-9-_]{2,32}$')
);

CREATE TABLE "user" (
	"email" varchar(320) NOT NULL,
	"slug" varchar(32) NOT NULL,
	"display_name" varchar(64),
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_slug_pk" PRIMARY KEY("email","slug")
);

ALTER TABLE "credential" ADD CONSTRAINT "credential_slug_tenant_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."tenant"("slug") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "credential" ADD CONSTRAINT "credential_user_id_user_email_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("email") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user" ADD CONSTRAINT "user_slug_tenant_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."tenant"("slug") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "user_email_unique_lower" ON "user" USING btree (lower("email"));