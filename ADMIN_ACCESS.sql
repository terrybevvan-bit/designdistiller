ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.user_profiles
SET is_admin = TRUE
WHERE lower(email) = 'terrybevvan@gmail.com';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin)
  VALUES (
    new.id,
    new.email,
    lower(coalesce(new.email, '')) = 'terrybevvan@gmail.com'
  );
  RETURN new;
END;
$$;
