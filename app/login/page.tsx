"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials (try admin/admin)");
      } else {
        router.push("/admin");
        router.refresh(); 
      }
    } catch (e) {
      setError("Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Backoffice Login</h1>
        
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
        
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input name="username" type="text" defaultValue="admin" className="mt-1 block w-full p-2 border rounded" />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700">Password</label>
             <input name="password" type="password" defaultValue="admin" className="mt-1 block w-full p-2 border rounded" />
          </div>
          <button type="submit" className="bg-black text-white p-2 rounded hover:bg-gray-800 transition">
            Sign In
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500 text-center">Dev: admin / admin</p>
      </div>
    </div>
  );
}
