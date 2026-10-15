SELECT cron.schedule_in_database('recount-all-upvotes', '0 4 * * *', 'select public.recount_all_upvotes()', 'postgres', NULL, true);
