import { redirect } from "next/navigation";

export default function Home() {
  // O middleware manda não-autenticados para /login.
  redirect("/dashboard");
}
