"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AcceptWorkspaceInvitationProps = {
  token: string;
  isAuthenticated: boolean;
  userEmail?: string | null;
  invitedEmail: string;
};

type AcceptResponse = {
  workspaceId?: string;
  message?: string;
};

export function AcceptWorkspaceInvitation({
  token,
  isAuthenticated,
  userEmail,
  invitedEmail,
}: AcceptWorkspaceInvitationProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailMatches = userEmail?.toLowerCase() === invitedEmail.toLowerCase();

  async function acceptInvitation() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/workspace-invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = (await response.json()) as AcceptResponse;

    setLoading(false);

    if (!response.ok) {
      setError(data.message || "No se pudo aceptar la invitacion.");
      return;
    }

    setSuccess(true);
    router.refresh();
    setTimeout(() => router.push("/workspace"), 700);
  }

  if (!isAuthenticated) {
    return (
      <Link
        className="focus-ring btn-primary mt-6 inline-flex px-5 py-3 text-sm"
        href={`/auth?next=${encodeURIComponent(`/workspace/invitaciones/${token}`)}`}
      >
        Iniciar sesion para aceptar
      </Link>
    );
  }

  if (!emailMatches) {
    return (
      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Has iniciado sesion como <strong>{userEmail}</strong>, pero la invitacion es para{" "}
        <strong>{invitedEmail}</strong>. Cierra sesion y entra con el email invitado.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button className="focus-ring btn-primary px-5 py-3 text-sm" type="button" onClick={acceptInvitation} disabled={loading || success}>
        {loading ? "Aceptando..." : success ? "Invitacion aceptada" : "Aceptar invitacion"}
      </button>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
