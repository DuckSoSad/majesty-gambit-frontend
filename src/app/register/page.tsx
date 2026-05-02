"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/register", form);
      router.push("/login");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.values(data.errors).join(", ");
        setError(msgs);
      } else {
        setError(data?.error || "Đăng ký thất bại");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#302E2B] bg-[url('/layouts/Cover-Dark.png')]">
      <div className="w-full max-w-md bg-[#2A2D45]/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold text-[#B1A7FC] text-center mb-8">Đăng ký</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-300 text-sm font-medium mb-1 block">Tên đăng nhập</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#1E2035] text-white border border-gray-600 focus:border-[#B1A7FC] focus:outline-none transition-colors"
              placeholder="3-50 ký tự"
              required
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#1E2035] text-white border border-gray-600 focus:border-[#B1A7FC] focus:outline-none transition-colors"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-1 block">Mật khẩu</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#1E2035] text-white border border-gray-600 focus:border-[#B1A7FC] focus:outline-none transition-colors"
              placeholder="Ít nhất 6 ký tự"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#B1A7FC] hover:bg-[#9990EC] disabled:opacity-50 text-white text-lg font-bold py-3 rounded-xl transition-all shadow-[0_4px_0_#8C82D9] active:shadow-none active:translate-y-1 cursor-pointer mt-2"
          >
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-[#B1A7FC] hover:underline font-medium">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
