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
      setError(data.message || "No se pudo aceptar la invitación.");
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
        Iniciar sesión para aceptar
      </Link>
    );
  }

  if (!emailMatches) {
    return (
      <div className="status-warning mt-6">
        Has iniciado sesión como <strong>{userEmail}</strong>, pero la invitación es para{" "}
        <strong>{invitedEmail}</strong>. Cierra sesión y entra con el email invitado.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button className="focus-ring btn-primary px-5 py-3 text-sm" type="button" onClick={acceptInvitation} disabled={loading || success}>
        {loading ? "Aceptando..." : success ? "Invitación aceptada" : "Aceptar invitación"}
      </button>
      {error && <p className="status-error mt-4">{error}</p>}
    </div>
  );
}
