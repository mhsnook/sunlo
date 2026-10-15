CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (((old.email_confirmed_at IS NULL) AND (new.email_confirmed_at IS NOT NULL)))
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN ((new.email_confirmed_at IS NOT NULL))
  EXECUTE FUNCTION public.handle_new_user();
