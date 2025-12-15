import { redirect } from "next/navigation";

export default function AdminDashboard() {
  // For now, redirect to calendar as it's the main view
  redirect("/admin/calendar");
}
