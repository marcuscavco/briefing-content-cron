import { redirect } from "next/navigation";

/** O cadastro vive dentro do fluxo único de onboarding. */
export default function SignupPage() {
  redirect("/onboarding");
}
