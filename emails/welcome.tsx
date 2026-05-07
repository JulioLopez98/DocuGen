import * as React from "react";

export function WelcomeEmail({ name = "profesional" }: { name?: string }) {
  return (
    <div style={{ background: "#faf9f6", color: "#1f2933", fontFamily: "Arial, sans-serif", padding: "32px" }}>
      <div style={{ margin: "0 auto", maxWidth: "560px" }}>
        <p style={{ color: "#2d6a4f", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          DocuGen
        </p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "32px", margin: "12px 0" }}>Bienvenido a DocuGen</h1>
        <p style={{ fontSize: "16px", lineHeight: 1.6 }}>Hola, {name}.</p>
        <p style={{ fontSize: "16px", lineHeight: 1.6 }}>
          Ya puedes generar borradores profesionales con IA, guardarlos en tu historial y exportarlos para revisarlos antes
          de usarlos.
        </p>
        <a
          href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
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
          Crear mi primer documento
        </a>
        <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.6, marginTop: "24px" }}>
          DocuGen genera borradores con IA. No sustituye asesoramiento legal, laboral, fiscal ni profesional.
        </p>
      </div>
    </div>
  );
}

export default WelcomeEmail;
