CREATE TABLE "staff_check_ins" (
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_in_by_user_id" text NOT NULL,
	"staff_user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_check_ins" ADD CONSTRAINT "staff_check_ins_checked_in_by_user_id_user_id_fk" FOREIGN KEY ("checked_in_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_check_ins" ADD CONSTRAINT "staff_check_ins_staff_user_id_user_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_check_ins_checked_in_by_user_id_idx" ON "staff_check_ins" USING btree ("checked_in_by_user_id");