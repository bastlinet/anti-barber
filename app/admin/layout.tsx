import Link from "next/link";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r p-6">
        <h1 className="font-bold text-xl mb-8">Barber Admin</h1>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/dashboard" className="p-2 hover:bg-gray-100 rounded">Dashboard</Link>
          <Link href="/admin/staff" className="p-2 hover:bg-gray-100 rounded font-medium bg-gray-100">Staff</Link>
          <Link href="/admin/services" className="p-2 hover:bg-gray-100 rounded">Services</Link>
          <Link href="/admin/bookings" className="p-2 hover:bg-gray-100 rounded">Bookings</Link>
        </nav>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
