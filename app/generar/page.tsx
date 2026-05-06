import { Suspense } from "react";
import { GeneratorClient } from "@/components/GeneratorClient";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export default function GeneratePage() {
  return (
    <section className="container-page py-10">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6a4f]">Generador</p>
        <h1 className="font-serif-display mt-3 text-4xl font-bold">Crea un borrador profesional</h1>
        <p className="mt-3 text-slate-600">Completa el formulario y revisa el documento antes de usarlo.</p>
      </div>
      <Suspense>
        <GeneratorClient />
      </Suspense>
      <div className="mt-8">
        <LegalDisclaimer />
      </div>
    </section>
  );
}
