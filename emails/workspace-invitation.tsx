import * as React from "react";

export function WorkspaceInvitationEmail({
  workspaceName,
  inviterEmail,
  inviteUrl,
  role,
}: {
  workspaceName: string;
  inviterEmail?: string | null;
  inviteUrl: string;
  role: "admin" | "member";
}) {
  return (
    <div style={{ background: "#faf9f6", color: "#1f2933", fontFamily: "Arial, sans-serif", padding: "32px" }}>
      <div style={{ margin: "0 auto", maxWidth: "560px" }}>
        <p style={{ color: "#2d6a4f", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          DocuGen
        </p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "32px", margin: "12px 0" }}>
          Invitacion a un workspace
        </h1>
        <p style={{ fontSize: "16px", lineHeight: 1.6 }}>
          {inviterEmail || "Un administrador"} te ha invitado a colaborar en <strong>{workspaceName}</strong> como{" "}
          <strong>{role === "admin" ? "admin" : "miembro"}</strong>.
        </p>
        <p style={{ fontSize: "16px", lineHeight: 1.6 }}>
          Acepta la invitacion para acceder al workspace y trabajar con documentos compartidos en DocuGen.
        </p>
        <a
          href={inviteUrl}
          style={{
            background: "#2d6a4f",
            borderRadius: "10px",
            color: "#ffffff",
            display: "inline-block",
            fontWeight: 700,
            marginTop: "16px",
            padding: "12px 18px",
            textDecoration: "none",
          }}
        >
          Aceptar invitacion
        </a>
        <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.6, marginTop: "24px" }}>
          Si no esperabas esta invitacion, puedes ignorar este correo.
        </p>
      </div>
    </div>
  );
}

export default WorkspaceInvitationEmail;
