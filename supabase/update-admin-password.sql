-- รีเซ็ตรหัสผ่านแอดมิน (มี user ใน auth แล้ว แต่ล็อกอินไม่ผ่าน)
-- แก้อีเมล + รหัสใหม่ใน DECLARE แล้ว Run

create extension if not exists pgcrypto;

do $$
declare
  v_email text := 'admin@yaksha.local';
  v_new_password text := 'HlSgkqaVO4OOI2YG';
begin
  update auth.users
  set
    encrypted_password = crypt(v_new_password, gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where lower(trim(email)) = lower(trim(v_email));

  if not found then
    raise exception 'ไม่พบอีเมล % ใน auth.users', v_email;
  end if;
end $$;
