import { redirect } from "next/navigation";

export default function TemplatesRedirectPage() {
  redirect("/workflows?tab=templates");
}
