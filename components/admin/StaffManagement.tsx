"use client";

import { useState } from "react";
import { createStaff, toggleStaffActive } from "@/app/admin/actions";

export default function StaffManagement({ staff, branches }: { staff: any[], branches: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const branchId = formData.get("branchId") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    
    await createStaff({ name, branchId, email, phone });
    setIsAdding(false);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Správa zaměstnanců</h1>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-black text-white px-4 py-2 rounded">
            {isAdding ? "Zavřít" : "Přidat zaměstnance"}
        </button>
      </div>

      {isAdding && (
          <div className="bg-gray-100 p-4 rounded mb-6 border">
              <h3 className="font-bold mb-2">Nový zaměstnanec</h3>
              <form action={handleSubmit} className="grid gap-4 max-w-md">
                  <input name="name" placeholder="Jméno" required className="p-2 border rounded" />
                  <input name="email" placeholder="Email (pro login)" className="p-2 border rounded" />
                  <input name="phone" placeholder="Telefon" className="p-2 border rounded" />
                  <select name="branchId" className="p-2 border rounded" required>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <button type="submit" className="bg-green-600 text-white p-2 rounded">Uložit</button>
              </form>
          </div>
      )}

      <div className="bg-white rounded shadow">
          <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="border-b bg-gray-50">
                      <th className="p-4">Jméno</th>
                      <th className="p-4">Email / Telefon</th>
                      <th className="p-4">Pobočka</th>
                      <th className="p-4">Stav</th>
                      <th className="p-4">Akce</th>
                  </tr>
              </thead>
              <tbody>
                  {staff.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{s.name}</td>
                          <td className="p-4 text-sm text-gray-500">
                              <div>{s.email}</div>
                              <div>{s.phone}</div>
                          </td>
                          <td className="p-4">{branches.find(b => b.id === s.branchId)?.name}</td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs ${s.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {s.active ? "Aktivní" : "Neaktivní"}
                              </span>
                          </td>
                          <td className="p-4">
                              <button 
                                onClick={() => toggleStaffActive(s.id, !s.active)}
                                className="text-sm underline text-blue-600"
                              >
                                  {s.active ? "Deaktivovat" : "Aktivovat"}
                              </button>
                          </td>
                      </tr>
                  ))}
                  {staff.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Žádní zaměstnanci</td></tr>}
              </tbody>
          </table>
      </div>
    </div>
  );
}
