-- Enable pgcrypto for password hashing if not already enabled
create extension if not exists pgcrypto;

-- Create the Test Admin User
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Only insert if the user does not already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@auctaveexports.com') THEN
    
    -- 1. Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@auctaveexports.com',
      crypt('password123', gen_salt('bf')), -- Password: password123
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"password_set":true}', -- Skips the "Create Password" onboarding step
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- 2. Insert into public.admins (Skips the "Complete Profile" onboarding step)
    INSERT INTO public.admins (
      id, 
      name, 
      email, 
      role, 
      company_name, 
      phone, 
      country, 
      job_role, 
      category_specialization, 
      yearly_est_revenue
    ) VALUES (
      new_user_id, 
      'Test Admin', 
      'admin@auctaveexports.com', 
      'admin',
      'Auctave Exports',
      '123-456-7890',
      'United States',
      'Super Admin',
      'All',
      '$10M+'
    );

    -- 3. Insert into auth.identities (Required for login to work)
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      new_user_id,
      format('{"sub":"%s","email":"admin@auctaveexports.com"}', new_user_id)::jsonb,
      'email',
      now(),
      now(),
      now()
    );

  END IF;
END $$;