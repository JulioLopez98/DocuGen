import * as React from "react";

export function DocumentReadyEmail({
  documentTitle = "tu documento",
  documentUrl,
}: {
  documentTitle?: string;
  documentUrl?: string;
}) {
  return (
    <div style={{ background: "#faf9f6", color: "#1f2933", fontFamily: "Arial, sans-serif", padding: "32px" }}>
      <div style={{ margin: "0 auto", maxWidth: "560px" }}>
        <p style={{ color: "#2d6a4f", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          DocuGen
        </p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "32px", margin: "12px 0" }}>Documento listo</h1>
        <p style={{ fontSize: "16px", lineHeight: 1.6 }}>
          Tu borrador <strong>{documentTitle}</strong> se ha generado correctamente y ya esta guardado en tu historial.
        </p>
        {documentUrl && (
          <a
            href={documentUrl}
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
            Ver documento
          </a>
        )}
        <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.6, marginTop: "24px" }}>
          Revisalo antes de usarlo, especialmente si puede tener efectos legales o profesionales relevantes.
        </p>
      </div>
    </div>
  );
}

export default DocumentReadyEmail;
