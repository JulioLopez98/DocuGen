import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DocuGen - Generador de documentos profesionales con IA";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#faf9f6",
          color: "#1f2933",
          fontFamily: "Georgia, serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 12%, rgba(45,106,79,0.18), transparent 320px), linear-gradient(135deg, rgba(216,243,220,0.82), rgba(250,249,246,0.92))",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 70,
            top: 72,
            width: 360,
            height: 430,
            border: "2px solid rgba(45,106,79,0.22)",
            borderRadius: 18,
            background: "rgba(255,255,255,0.72)",
            display: "flex",
            flexDirection: "column",
            padding: 32,
            boxShadow: "0 24px 70px rgba(31,41,51,0.10)",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, color: "#2d6a4f", marginBottom: 26 }}>Vista de borrador</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 24 }}>Contrato de servicios</div>
          <div style={{ fontSize: 18, lineHeight: 1.55, fontFamily: "Arial, sans-serif" }}>
            1. Objeto
            <br />
            2. Alcance
            <br />
            3. Precio y pago
            <br />
            4. Firmas
          </div>
          <div
            style={{
              marginTop: "auto",
              padding: 18,
              borderRadius: 12,
              background: "#d8f3dc",
              fontFamily: "Arial, sans-serif",
              fontSize: 17,
              color: "#1f2933",
            }}
          >
            Documento generado con IA. Revisar antes de su uso legal.
          </div>
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 76,
            paddingRight: 500,
          }}
        >
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 24, fontWeight: 800, color: "#2d6a4f", letterSpacing: 4 }}>
            DOCUGEN
          </div>
          <h1 style={{ margin: "34px 0 0", fontSize: 78, lineHeight: 0.98, letterSpacing: -1 }}>
            Documentos profesionales en minutos con IA
          </h1>
          <p style={{ margin: "32px 0 0", fontSize: 28, lineHeight: 1.35, fontFamily: "Arial, sans-serif", color: "#334155" }}>
            Contratos, presupuestos, propuestas y documentos web adaptados al contexto espanol.
          </p>
          <div
            style={{
              marginTop: 42,
              display: "flex",
              gap: 14,
              fontFamily: "Arial, sans-serif",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            <span style={{ background: "#2d6a4f", color: "white", padding: "14px 20px", borderRadius: 999 }}>PDF</span>
            <span style={{ background: "#2d6a4f", color: "white", padding: "14px 20px", borderRadius: 999 }}>TXT</span>
            <span style={{ background: "#2d6a4f", color: "white", padding: "14px 20px", borderRadius: 999 }}>Word Pro</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
