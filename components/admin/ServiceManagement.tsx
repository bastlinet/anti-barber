"use client";

import { toggleServiceActive } from "@/app/admin/actions";

export default function ServiceManagement({ services }: { services: any[] }) {
  // We can add editing prices if needed, but keeping it simple for now
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Správa služeb</h1>
      
      <div className="bg-white rounded shadow">
          <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="border-b bg-gray-50">
                      <th className="p-4">Název</th>
                      <th className="p-4">Kategorie</th>
                      <th className="p-4">Trvání</th>
                      <th className="p-4">Stav</th>
                      <th className="p-4">Akce</th>
                  </tr>
              </thead>
              <tbody>
                  {services.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{s.name}</td>
                          <td className="p-4 text-gray-500">{s.category}</td>
                          <td className="p-4">{s.durationMin} min</td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs ${s.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {s.active ? "Aktivní" : "Neaktivní"}
                              </span>
                          </td>
                          <td className="p-4">
                              <button 
                                onClick={() => toggleServiceActive(s.id, !s.active)}
                                className="text-sm underline text-blue-600"
                              >
                                  {s.active ? "Deaktivovat" : "Aktivovat"}
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
}
