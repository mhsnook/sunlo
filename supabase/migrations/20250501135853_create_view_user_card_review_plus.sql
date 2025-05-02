create or replace view public.user_card_review_plus with (security_invoker=true) AS (
  select r.*, c.phrase_id, p.lang
  from public.user_card_review r
  join public.user_card c on (c.id = r.user_card_id)
  join public.phrase p on (c.phrase_id = p.id)
)