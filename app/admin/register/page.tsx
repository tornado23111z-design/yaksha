import { redirect } from "next/navigation";

/** ลิงก์เก่า: การสมัครแอดมินทำในฐานข้อมูลเท่านั้น */
export default function AdminRegisterDeprecatedPage() {
  redirect("/admin/login");
}
