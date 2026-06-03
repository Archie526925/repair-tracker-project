CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('text', 'number', 'select', 'date');--> statement-breakpoint
CREATE TABLE "repairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"location" text NOT NULL,
	"category" text NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"description" text,
	"reported_by" text NOT NULL,
	"assigned_to" text,
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"field_type" "field_type" NOT NULL,
	"options" text[],
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_custom_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"repair_id" integer NOT NULL,
	"field_id" integer NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "repair_custom_values" ADD CONSTRAINT "repair_custom_values_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_custom_values" ADD CONSTRAINT "repair_custom_values_field_id_custom_field_definitions_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_field_definitions"("id") ON DELETE cascade ON UPDATE no action;