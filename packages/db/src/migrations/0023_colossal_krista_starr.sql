ALTER TABLE "staff_check_ins" RENAME COLUMN "staff_user_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "staff_check_ins" DROP CONSTRAINT "staff_check_ins_staff_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_check_ins" ADD CONSTRAINT "staff_check_ins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;