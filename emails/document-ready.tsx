import * as React from "react";

export function DocumentReadyEmail({ documentTitle = "tu documento" }: { documentTitle?: string }) {
  return (
    <div>
      <h1>Documento listo</h1>
      <p>Tu borrador "{documentTitle}" se ha generado correctamente.</p>
      <p>Revísalo antes de usarlo, especialmente si puede tener efectos legales.</p>
    </div>
  );
}

export default DocumentReadyEmail;
