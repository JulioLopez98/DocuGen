"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function AuthForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/onboarding";
  const initialError = getAuthErrorMessage(searchParams.get("error"), searchParams.get("error_description"));
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  async function signInWithMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("La autenticación no está configurada todavía. Revisa las variables de Supabase.");
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
      setError("No se pudo enviar el enlace mágico. Revisa el email e inténtalo de nuevo.");
      return;
    }

    setMessage("Te hemos enviado un enlace mágico. Revisa tu correo y la carpeta de spam.");
  }

  async function signInWithGoogle() {
    setError(null);

    if (!supabase) {
      setError("La autenticación no está configurada todavía. Revisa las variables de Supabase.");
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
    <div className="surface mx-auto max-w-md p-6">
      <p className="eyebrow">Acceso</p>
      <h1 className="panel-title mt-3">Accede a DocuGen</h1>
      <p className="body-muted mt-3">Entra con enlace mágico o Google para generar y guardar documentos.</p>
      <form onSubmit={signInWithMagicLink} className="mt-6 grid gap-4">
        <label>
          <span className="text-sm font-semibold">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field-control mt-2"
            placeholder="tu@email.com"
          />
        </label>
        <button type="submit" disabled={loading} className="focus-ring btn-primary px-4 py-3 text-sm disabled:opacity-60">
          {loading ? "Enviando..." : "Enviar enlace mágico"}
        </button>
      </form>
      <button type="button" onClick={signInWithGoogle} className="focus-ring btn-secondary mt-3 w-full px-4 py-3 text-sm">
        Continuar con Google
      </button>
      {message && <p className="status-success mt-4">{message}</p>}
      {error && <p className="status-error mt-4">{error}</p>}
    </div>
  );
}

function getAuthErrorMessage(error: string | null, description: string | null) {
  if (!error && !description) {
    return null;
  }

  const value = `${error || ""} ${description || ""}`.toLowerCase();

  if (value.includes("database")) {
    return "No se pudo crear tu usuario. Revisa la configuración de Supabase y vuelve a intentarlo.";
  }

  if (value.includes("access_denied")) {
    return "El acceso se canceló antes de completar el inicio de sesión.";
  }

  if (value.includes("expired")) {
    return "El enlace ha caducado. Solicita uno nuevo para entrar.";
  }

  return "No se pudo completar el inicio de sesión. Inténtalo de nuevo.";
}
