import { getStaff } from "@/app/actions/staff";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function AdminStaffPage() {
  // Get first branch for MVP (assuming 1 branch for now)
  const branch = await prisma.branch.findFirst();

  if (!branch) {
    return <div>No branch found. Please seed the database.</div>;
  }

  const staff = await getStaff(branch.id);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Staff Management</h1>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4">Branch: {branch.name}</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p>This is a placeholder for the &quot;Create Staff&quot; form.</p>
          <p>For MVP, we will use a simple form below.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {staff.map((s) => (
          <div key={s.id} className="border p-4 rounded bg-white shadow-sm flex items-center justify-between">
            <div>
              <div className="font-bold">{s.name}</div>
              <div className="text-sm text-gray-500">{s.email || 'No email'} | {s.phone || 'No phone'}</div>
            </div>
            <div className="flex gap-2">
               <span className={`px-2 py-1 rounded text-xs ${s.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                 {s.active ? 'Active' : 'Inactive'}
               </span>
               <button className="text-blue-600 text-sm hover:underline">Edit</button>
            </div>
          </div>
        ))}
        {staff.length === 0 && <p className="text-gray-500">No staff found.</p>}
      </div>
    </div>
  );
}
