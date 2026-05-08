-- ให้สิทธิ์แอดมินใน public.admin_users เท่านั้น (ต้องมี user ใน auth.users แล้ว)
-- ถ้ายังไม่มี user เลย → ใช้ไฟล์ insert-admin-auth-user.sql แทน
-- (ทางเลือก) ดู user ก่อน
-- select id, email, created_at from auth.users order by created_at desc;

insert into public.admin_users (user_id, email, role)
select u.id, u.email, 'admin'
from auth.users u
where lower(trim(u.email)) = lower(trim('admin@yaksha.local'))
  and u.email is not null
limit 1
on conflict (user_id) do update
set
  role = excluded.role,
  email = excluded.email;

-- ตรวจผล
select user_id, email, role, created_at
from public.admin_users
order by created_at desc;
