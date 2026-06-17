import { redirect } from "next/navigation";

export default function ConcernsPage() {
  redirect("/dashboard/settings?tab=concern");
}
