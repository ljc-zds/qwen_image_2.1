CREATE SCHEMA IF NOT EXISTS "qwenimage2";--> statement-breakpoint
CREATE TABLE "qwenimage2"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."ai_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_type" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"options" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"task_id" text,
	"task_info" text,
	"task_result" text,
	"cost_credits" integer DEFAULT 0 NOT NULL,
	"scene" text DEFAULT '' NOT NULL,
	"credit_id" text
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key" text,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."chat" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"parts" text NOT NULL,
	"metadata" text,
	"content" text
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text NOT NULL,
	"parts" text NOT NULL,
	"metadata" text,
	"model" text NOT NULL,
	"provider" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."config" (
	"name" text NOT NULL,
	"value" text,
	CONSTRAINT "config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."credit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"order_no" text,
	"subscription_no" text,
	"transaction_no" text NOT NULL,
	"transaction_type" text NOT NULL,
	"transaction_scene" text,
	"credits" integer NOT NULL,
	"remaining_credits" integer DEFAULT 0 NOT NULL,
	"description" text,
	"expires_at" timestamp,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"consumed_detail" text,
	"metadata" text,
	CONSTRAINT "credit_transaction_no_unique" UNIQUE("transaction_no")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."invite_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"trial_days" integer DEFAULT 15 NOT NULL,
	"note" text DEFAULT '',
	"created_by" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invite_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."order" (
	"id" text PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"product_id" text,
	"payment_type" text,
	"payment_interval" text,
	"payment_provider" text NOT NULL,
	"payment_session_id" text,
	"checkout_info" text NOT NULL,
	"checkout_result" text,
	"payment_result" text,
	"discount_code" text,
	"discount_amount" integer,
	"discount_currency" text,
	"payment_email" text,
	"payment_amount" integer,
	"payment_currency" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"description" text,
	"product_name" text,
	"subscription_id" text,
	"subscription_result" text,
	"checkout_url" text,
	"callback_url" text,
	"credits_amount" integer,
	"credits_valid_days" integer,
	"plan_name" text,
	"payment_product_id" text,
	"invoice_id" text,
	"invoice_url" text,
	"subscription_no" text,
	"transaction_id" text,
	"payment_user_name" text,
	"payment_user_id" text,
	CONSTRAINT "order_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."payment_webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"business_key" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_webhook_business_key_unique" UNIQUE("business_key")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."permission" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "permission_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."post" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"description" text,
	"image" text,
	"content" text,
	"categories" text,
	"tags" text,
	"author_name" text,
	"author_image" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."role_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_no" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"status" text NOT NULL,
	"payment_provider" text NOT NULL,
	"subscription_id" text NOT NULL,
	"subscription_result" text,
	"product_id" text,
	"description" text,
	"amount" integer,
	"currency" text,
	"interval" text,
	"interval_count" integer,
	"trial_period_days" integer,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"plan_name" text,
	"billing_url" text,
	"product_name" text,
	"credits_amount" integer,
	"credits_valid_days" integer,
	"payment_product_id" text,
	"payment_user_id" text,
	"canceled_at" timestamp,
	"canceled_end_at" timestamp,
	"canceled_reason" text,
	"canceled_reason_type" text,
	CONSTRAINT "subscription_subscription_no_unique" UNIQUE("subscription_no")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."taxonomy" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image" text,
	"icon" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "taxonomy_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."ticket_message" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"content" text NOT NULL,
	"attachments" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"utm_source" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"locale" text DEFAULT '' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."user_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"invite_code_id" text NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"trial_ends_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."user_role" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "qwenimage2"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qwenimage2"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."ai_task" ADD CONSTRAINT "ai_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."chat_message" ADD CONSTRAINT "chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."chat_message" ADD CONSTRAINT "chat_message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "qwenimage2"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."credit" ADD CONSTRAINT "credit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."invite_code" ADD CONSTRAINT "invite_code_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "qwenimage2"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."post" ADD CONSTRAINT "post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "qwenimage2"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "qwenimage2"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."taxonomy" ADD CONSTRAINT "taxonomy_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."ticket" ADD CONSTRAINT "ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."ticket_message" ADD CONSTRAINT "ticket_message_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "qwenimage2"."ticket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."ticket_message" ADD CONSTRAINT "ticket_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."user_invite" ADD CONSTRAINT "user_invite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."user_invite" ADD CONSTRAINT "user_invite_invite_code_id_invite_code_id_fk" FOREIGN KEY ("invite_code_id") REFERENCES "qwenimage2"."invite_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qwenimage2"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwenimage2"."user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "qwenimage2"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "qwenimage2"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_account_provider_account" ON "qwenimage2"."account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_ai_task_user_media_type" ON "qwenimage2"."ai_task" USING btree ("user_id","media_type");--> statement-breakpoint
CREATE INDEX "idx_ai_task_media_type_status" ON "qwenimage2"."ai_task" USING btree ("media_type","status");--> statement-breakpoint
CREATE INDEX "idx_apikey_user_status" ON "qwenimage2"."apikey" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_apikey_keyhash_status" ON "qwenimage2"."apikey" USING btree ("key_hash","status");--> statement-breakpoint
CREATE INDEX "idx_chat_user_status" ON "qwenimage2"."chat" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_chat_message_chat_id" ON "qwenimage2"."chat_message" USING btree ("chat_id","status");--> statement-breakpoint
CREATE INDEX "idx_chat_message_user_id" ON "qwenimage2"."chat_message" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_credit_consume_fifo" ON "qwenimage2"."credit" USING btree ("user_id","status","transaction_type","remaining_credits","expires_at");--> statement-breakpoint
CREATE INDEX "idx_credit_order_no" ON "qwenimage2"."credit" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "idx_credit_subscription_no" ON "qwenimage2"."credit" USING btree ("subscription_no");--> statement-breakpoint
CREATE INDEX "idx_invite_code_code" ON "qwenimage2"."invite_code" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_order_user_status_payment_type" ON "qwenimage2"."order" USING btree ("user_id","status","payment_type");--> statement-breakpoint
CREATE INDEX "idx_order_transaction_provider" ON "qwenimage2"."order" USING btree ("transaction_id","payment_provider");--> statement-breakpoint
CREATE INDEX "idx_order_created_at" ON "qwenimage2"."order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_permission_resource_action" ON "qwenimage2"."permission" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "idx_post_type_status" ON "qwenimage2"."post" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_role_status" ON "qwenimage2"."role" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_role_permission_role_permission" ON "qwenimage2"."role_permission" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_session_user_expires" ON "qwenimage2"."session" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_subscription_user_status_interval" ON "qwenimage2"."subscription" USING btree ("user_id","status","interval");--> statement-breakpoint
CREATE INDEX "idx_subscription_provider_id" ON "qwenimage2"."subscription" USING btree ("subscription_id","payment_provider");--> statement-breakpoint
CREATE INDEX "idx_subscription_created_at" ON "qwenimage2"."subscription" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_taxonomy_type_status" ON "qwenimage2"."taxonomy" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_ticket_user" ON "qwenimage2"."ticket" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_status" ON "qwenimage2"."ticket" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ticket_message_ticket" ON "qwenimage2"."ticket_message" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_user_name" ON "qwenimage2"."user" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_user_created_at" ON "qwenimage2"."user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_invite_user" ON "qwenimage2"."user_invite" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_invite_code" ON "qwenimage2"."user_invite" USING btree ("invite_code_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_user_expires" ON "qwenimage2"."user_role" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "qwenimage2"."verification" USING btree ("identifier");