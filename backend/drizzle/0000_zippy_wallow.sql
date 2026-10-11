CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"visibility" text DEFAULT 'private' NOT NULL,
	"origin" text DEFAULT 'url' NOT NULL,
	"source_url" text,
	"source_handle" text,
	"parent_recipe_id" uuid,
	"remix_prompt" text,
	"title" text NOT NULL,
	"description" text,
	"emoji" text,
	"category" text,
	"is_recipe" boolean DEFAULT true NOT NULL,
	"prep_time" integer,
	"cook_time" integer,
	"servings" numeric,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"tips" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_url" text,
	"image_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_prompt" text,
	"is_ai_cover" boolean DEFAULT false NOT NULL,
	"transcript" text,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instructions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alternative_ingredients" jsonb,
	"nutritional_values" jsonb,
	"source_nutritional_values" jsonb,
	"health_score" numeric,
	"health_score_breakdown" jsonb,
	"has_explicit_nutritional_values" boolean DEFAULT false NOT NULL,
	"has_incomplete_source_info" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"nutrition_coverage" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"source_job_id" uuid,
	"source" text DEFAULT 'extraction' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text DEFAULT 'url' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source_url" text NOT NULL,
	"source_url_normalized" text,
	"parent_recipe_id" uuid,
	"remix_prompt" text,
	"recipe_id" uuid,
	"progress" jsonb,
	"error" text,
	"client_frames" jsonb,
	"scrape_meta" jsonb,
	"llm_usage" jsonb,
	"media_bytes" bigint DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_collections" (
	"collection_id" uuid NOT NULL,
	"user_recipe_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "recipe_collections_collection_id_user_recipe_id_pk" PRIMARY KEY("collection_id","user_recipe_id")
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"plan_date" date NOT NULL,
	"meal_type" text DEFAULT 'dinner' NOT NULL,
	"servings" numeric DEFAULT '2' NOT NULL,
	"is_cooked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_name" text,
	"mapping_key" text,
	"category" text,
	"amount" numeric DEFAULT '0' NOT NULL,
	"unit" text NOT NULL,
	"canonical_id" text,
	"notes" text,
	"expires_at" date,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_name" text,
	"parent_ingredient" jsonb,
	"modifier" text,
	"brand" text,
	"amount" numeric DEFAULT '0' NOT NULL,
	"unit" text NOT NULL,
	"recipe_id" uuid,
	"recipe_title" text,
	"checked" boolean DEFAULT false NOT NULL,
	"category" text,
	"canonical_id" text,
	"notes" text,
	"in_pantry_warning" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapping_key" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"product_code" text,
	"resolution" text NOT NULL,
	"estimated_nutrients" jsonb,
	"source" text DEFAULT 'agent' NOT NULL,
	"confidence" numeric(3, 2),
	"model" text,
	"reasoning" text,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"typical_package_amount" numeric,
	"typical_package_unit" text,
	"shelf_life_days" integer,
	"mapping_key_de" text,
	"aliases" text[] DEFAULT '{}'::text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid,
	"cooked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"coins_awarded" integer DEFAULT 0 NOT NULL,
	"has_photo" boolean DEFAULT false NOT NULL,
	"photo_path" text,
	"verified" boolean DEFAULT false NOT NULL,
	"leaderboard_eligible" boolean DEFAULT false NOT NULL,
	"trust_score" numeric(4, 2) DEFAULT '0' NOT NULL,
	"via_cooking_mode" boolean DEFAULT false NOT NULL,
	"timer_elapsed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cook_event_id" uuid,
	"delta_xp" integer DEFAULT 0 NOT NULL,
	"delta_coins" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_key" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_key_pk" PRIMARY KEY("user_id","badge_key")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"xp" bigint DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"coins" bigint DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_cook_date" date,
	"total_cooks" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT 'Chef' NOT NULL,
	"avatar_url" text,
	"friend_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_friend_code_unique" UNIQUE("friend_code")
);
--> statement-breakpoint
CREATE TABLE "app_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"version" text NOT NULL,
	"storage_path" text NOT NULL,
	"checksum" text NOT NULL,
	"min_version_code" integer NOT NULL,
	"max_version_code" integer,
	"active" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text DEFAULT 'bug' NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"screenshot_urls" text[],
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gemini_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"request_type" text NOT NULL,
	"model" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"success" boolean NOT NULL,
	"error_msg" text,
	"input_data" jsonb,
	"token_prompt" integer,
	"token_candidate" integer,
	"token_total" integer,
	"cost_input_usd" numeric(10, 6),
	"cost_output_usd" numeric(10, 6),
	"cost_total_usd" numeric(10, 6)
);
--> statement-breakpoint
CREATE TABLE "global_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"recipe_id" uuid,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_parent_recipe_id_recipes_id_fk" FOREIGN KEY ("parent_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recipes" ADD CONSTRAINT "user_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_parent_recipe_id_recipes_id_fk" FOREIGN KEY ("parent_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_collections" ADD CONSTRAINT "recipe_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_collections" ADD CONSTRAINT "recipe_collections_user_recipe_id_user_recipes_id_fk" FOREIGN KEY ("user_recipe_id") REFERENCES "public"."user_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cook_events" ADD CONSTRAINT "cook_events_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_cook_event_id_cook_events_id_fk" FOREIGN KEY ("cook_event_id") REFERENCES "public"."cook_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipes_created_by_idx" ON "recipes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "recipes_parent_idx" ON "recipes" USING btree ("parent_recipe_id");--> statement-breakpoint
CREATE INDEX "recipes_category_idx" ON "recipes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "recipes_health_score_idx" ON "recipes" USING btree ("health_score");--> statement-breakpoint
CREATE UNIQUE INDEX "user_recipes_user_recipe_key" ON "user_recipes" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE INDEX "user_recipes_user_added_idx" ON "user_recipes" USING btree ("user_id","added_at");--> statement-breakpoint
CREATE INDEX "user_recipes_recipe_idx" ON "user_recipes" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "jobs_user_created_idx" ON "jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_status_created_idx" ON "jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "jobs_source_normalized_idx" ON "jobs" USING btree ("user_id","source_url_normalized");--> statement-breakpoint
CREATE INDEX "collections_user_id_idx" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_collections_user_id_idx" ON "recipe_collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_collections_user_recipe_idx" ON "recipe_collections" USING btree ("user_recipe_id");--> statement-breakpoint
CREATE INDEX "idx_meal_plans_user_date" ON "meal_plans" USING btree ("user_id","plan_date");--> statement-breakpoint
CREATE INDEX "idx_meal_plans_recipe_id" ON "meal_plans" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "pantry_items_user_expires_idx" ON "pantry_items" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "pantry_items_user_key_idx" ON "pantry_items" USING btree ("user_id","mapping_key");--> statement-breakpoint
CREATE INDEX "pantry_items_user_basename_idx" ON "pantry_items" USING btree ("user_id","base_name");--> statement-breakpoint
CREATE INDEX "shopping_list_user_checked_idx" ON "shopping_list" USING btree ("user_id","checked","created_at");--> statement-breakpoint
CREATE INDEX "shopping_list_user_recipe_idx" ON "shopping_list" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_mappings_key_category_key" ON "ingredient_mappings" USING btree ("mapping_key","category");--> statement-breakpoint
CREATE INDEX "ingredient_mappings_key_idx" ON "ingredient_mappings" USING btree ("mapping_key");--> statement-breakpoint
CREATE INDEX "ingredient_mappings_key_de_idx" ON "ingredient_mappings" USING btree ("mapping_key_de");--> statement-breakpoint
CREATE INDEX "ingredient_mappings_source_created_idx" ON "ingredient_mappings" USING btree ("source","created_at");--> statement-breakpoint
CREATE INDEX "cook_events_user_time_idx" ON "cook_events" USING btree ("user_id","cooked_at");--> statement-breakpoint
CREATE INDEX "cook_events_user_recipe_idx" ON "cook_events" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE INDEX "point_ledger_user_time_idx" ON "point_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_badges_user_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_unique" ON "friendships" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX "friendships_requester_idx" ON "friendships" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bundles_channel_version_key" ON "app_bundles" USING btree ("channel","version");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "gemini_logs_created_at_idx" ON "gemini_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_log_user_sent_idx" ON "notification_log" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens" USING btree ("user_id");