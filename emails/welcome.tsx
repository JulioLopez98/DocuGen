import * as React from "react";

export function WelcomeEmail({ name = "profesional" }: { name?: string }) {
  return (
    <div>
      <h1>Bienvenido a DocuGen</h1>
      <p>Hola, {name}. Ya puedes generar borradores profesionales con IA y revisarlos antes de usarlos.</p>
      <p>DocuGen no sustituye asesoramiento legal o profesional.</p>
    </div>
  );
}

export default WelcomeEmail;
