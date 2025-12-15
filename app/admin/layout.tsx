import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Calendar, Users, Scissors, Home } from "lucide-react";

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
    <div className="flex min-h-screen bg-gray-50 text-black">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col fixed inset-y-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold">Barber Admin</h1>
          <p className="text-xs text-gray-400">Backoffice v0.1</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded hover:bg-gray-100">
             <Home size={18} /> Dashboard
          </Link>
          <Link href="/admin/calendar" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded hover:bg-gray-100">
             <Calendar size={18} /> Kalendář
          </Link>
          <Link href="/admin/staff" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded hover:bg-gray-100">
             <Users size={18} /> Zaměstnanci
          </Link>
          <Link href="/admin/services" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded hover:bg-gray-100">
             <Scissors size={18} /> Služby
          </Link>
        </nav>

        <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                </div>
            </div>
            <form action={async () => {
              "use server";
              await signOut();
            }}>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                <LogOut size={16} /> Odhlásit se
              </button>
            </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 ml-64">
        {children}
      </main>
    </div>
  );
}
