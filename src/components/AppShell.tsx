import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "./Nav";
import type { Player } from "@/lib/types";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", user.id)
    .single<Player>();

  return (
    <>
      <Nav isAdmin={player?.is_admin ?? false} />
      <main className="max-w-[600px] mx-auto px-5 py-6 w-full">{children}</main>
    </>
  );
}
