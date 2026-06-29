import { redirect } from "next/navigation";

export default function ExecutionsRedirectPage() {
  redirect("/workflows?tab=executions");
}
