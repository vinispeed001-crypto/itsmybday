import Link from "next/link";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // This layout wraps every route under /admin, including /admin/login itself.
  // Skip the session guard there — otherwise an unauthenticated visitor to the
  // login page would be redirected to /admin/login, which re-runs this layout
  // and redirects again, looping forever and making the login page unreachable.
  const pathname = headers().get("x-pathname");
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 border-b border-border bg-surface p-4 text-sm">
        <Link href="/admin" className="text-gold">Pedidos</Link>
        <Link href="/admin/disponibilidade" className="text-muted hover:text-ink">Disponibilidade</Link>
        <Link href="/admin/regras" className="text-muted hover:text-ink">Regras da casa</Link>
        <Link href="/admin/integracoes" className="text-muted hover:text-ink">Integrações</Link>
        <SignOutButton />
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
