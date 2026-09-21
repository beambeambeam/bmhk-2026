DO $$
DECLARE
  offenders text;
BEGIN
  SELECT string_agg(DISTINCT acc_id, ', ') INTO offenders
  FROM (
    SELECT acc_id FROM (
      SELECT main_acc_user_id AS acc_id FROM "discord" WHERE main_acc_user_id IS NOT NULL
      UNION ALL
      SELECT alt_acc_user_id FROM "discord" WHERE alt_acc_user_id IS NOT NULL
    ) accounts
    GROUP BY acc_id HAVING count(*) > 1
  ) duplicated;
  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Discord users linked to more than one slot, unlink them first: %', offenders;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "discord" ADD CONSTRAINT "discord_main_acc_user_id_unique" UNIQUE("main_acc_user_id");--> statement-breakpoint
ALTER TABLE "discord" ADD CONSTRAINT "discord_alt_acc_user_id_unique" UNIQUE("alt_acc_user_id");--> statement-breakpoint
ALTER TABLE "discord" ADD CONSTRAINT "discord_main_alt_differ" CHECK ("discord"."main_acc_user_id" <> "discord"."alt_acc_user_id");