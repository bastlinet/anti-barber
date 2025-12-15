import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Calendar, Users, Scissors, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col fixed inset-y-0 z-30">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold tracking-tight">Barber Admin</h1>
          <p className="text-xs text-muted-foreground">Backoffice v0.1</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground">
             <Home size={18} /> Dashboard
          </Link>
          <Link href="/admin/calendar" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground">
             <Calendar size={18} /> Kalendář
          </Link>
          <Link href="/admin/staff" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground">
             <Users size={18} /> Zaměstnanci
          </Link>
          <Link href="/admin/services" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground">
             <Scissors size={18} /> Služby
          </Link>
        </nav>

        <div className="p-4 border-t bg-muted/10">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                    {session.user.name?.charAt(0) || "A"}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                </div>
            </div>
            <form action={async () => {
              "use server";
              await signOut();
            }}>
              <Button variant="destructive" className="w-full justify-start gap-2" size="sm">
                <LogOut size={16} /> Odhlásit se
              </Button>
            </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 ml-64 overflow-auto">
        {children}
      </main>
    </div>
  );
}
