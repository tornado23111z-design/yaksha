-- สร้างแอดมินใน Auth + ใส่ admin_users (รันใน Supabase → SQL Editor)
-- แก้ v_email / v_password ใน DECLARE ด้านล่าง แล้ว Run ทั้งบล็อก

create extension if not exists pgcrypto;

do $$
declare
  v_email text := 'admin@yaksha.local';
  v_password text := 'HlSgkqaVO4OOI2YG';
  v_user_id uuid := gen_random_uuid();
  v_hash text := crypt(v_password, gen_salt('bf'));
begin
  if exists (select 1 from auth.users u where lower(trim(u.email)) = lower(trim(v_email))) then
    raise exception 'มีอีเมล % ใน auth.users อยู่แล้ว — ลบ user นั้นใน Authentication ก่อน หรือใช้ไฟล์ update-admin-password.sql', v_email;
  end if;

  insert into auth.users (
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
  )
  values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    v_hash,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  insert into public.admin_users (user_id, email, role)
  values (v_user_id, v_email, 'admin')
  on conflict (user_id) do update
    set email = excluded.email,
        role = excluded.role;
end $$;

select u.id, u.email, u.email_confirmed_at, a.role
from auth.users u
left join public.admin_users a on a.user_id = u.id
where lower(trim(u.email)) = lower(trim('admin@yaksha.local'));  -- แก้ให้ตรงกับอีเมลที่ใช้ใน DO ด้านบน
