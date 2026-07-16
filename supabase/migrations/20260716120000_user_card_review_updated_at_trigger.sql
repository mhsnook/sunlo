-- Give user_card_review a server-owned updated_at.
create or replace function public.update_user_card_review_updated_at () returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger update_user_card_review_updated_at
before update on public.user_card_review for each row
execute function public.update_user_card_review_updated_at ();
