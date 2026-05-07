"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function AuthForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  async function signInWithMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Configura Supabase antes de iniciar sesión.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);

    if (signInError) {
      setError("No se pudo enviar el enlace mágico.");
      return;
    }

    setMessage("Te hemos enviado un enlace mágico. Revisa tu correo.");
  }

  async function signInWithGoogle() {
    setError(null);

    if (!supabase) {
      setError("Configura Supabase antes de iniciar sesión.");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <div className="surface mx-auto max-w-md rounded-md p-6">
      <p className="eyebrow">Acceso</p>
      <h1 className="font-serif-display mt-3 text-3xl font-bold">Accede a DocuGen</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Entra con magic link o Google OAuth para generar documentos.</p>
      <form onSubmit={signInWithMagicLink} className="mt-6 grid gap-4">
        <label>
          <span className="text-sm font-semibold">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 transition focus:border-[#2d6a4f]"
            placeholder="tu@email.com"
          />
        </label>
        <button type="submit" disabled={loading} className="focus-ring btn-primary px-4 py-3 text-sm disabled:opacity-60">
          {loading ? "Enviando..." : "Enviar magic link"}
        </button>
      </form>
      <button type="button" onClick={signInWithGoogle} className="focus-ring btn-secondary mt-3 w-full px-4 py-3 text-sm">
        Continuar con Google
      </button>
      {message && <p className="mt-4 rounded-md bg-[#d8f3dc] p-3 text-sm text-[#1f2933]">{message}</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
