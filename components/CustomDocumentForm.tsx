"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const customDocumentFormSchema = z.object({
  title: z.string().trim().min(3, "Indica un nombre para el documento.").max(160),
  description: z.string().trim().min(20, "Describe un poco más lo que necesitas.").max(5000),
  intendedUse: z.string().trim().max(1000).optional(),
  tone: z.enum(["formal", "comercial", "laboral_prudente", "legal_prudente", "email", "carta", "natural"]),
  sector: z.string().trim().max(160).optional(),
  requiredData: z.string().trim().max(3000).optional(),
});

export type CustomDocumentFormValues = z.infer<typeof customDocumentFormSchema>;

type CustomDocumentFormProps = {
  onSubmit: (payload: CustomDocumentFormValues) => void;
  disabled?: boolean;
};

const toneOptions: Array<{ value: CustomDocumentFormValues["tone"]; label: string }> = [
  { value: "formal", label: "Formal" },
  { value: "comercial", label: "Comercial" },
  { value: "laboral_prudente", label: "Laboral prudente" },
  { value: "legal_prudente", label: "Legal prudente" },
  { value: "email", label: "Email" },
  { value: "carta", label: "Carta" },
  { value: "natural", label: "Natural" },
];

export function CustomDocumentForm({ onSubmit, disabled }: CustomDocumentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomDocumentFormValues>({
    resolver: zodResolver(customDocumentFormSchema),
    defaultValues: {
      tone: "formal",
    },
  });

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
      <label>
        <span className="text-sm font-semibold">Nombre del documento</span>
        <input
          {...register("title")}
          className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
          placeholder="Ej. Carta de reclamacion a proveedor"
        />
        {errors.title && <span className="mt-1 block text-xs text-red-700">{errors.title.message}</span>}
      </label>

      <label>
        <span className="text-sm font-semibold">Que necesitas generar?</span>
        <textarea
          {...register("description")}
          rows={5}
          className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
          placeholder="Describe el documento, las partes, contexto, condiciones y cualquier detalle importante."
        />
        {errors.description && <span className="mt-1 block text-xs text-red-700">{errors.description.message}</span>}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold">Uso previsto</span>
          <input
            {...register("intendedUse")}
            className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
            placeholder="Interno, cliente, web, seleccion..."
          />
        </label>

        <label>
          <span className="text-sm font-semibold">Sector</span>
          <input
            {...register("sector")}
            className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
            placeholder="Tecnologia, inmobiliario, comercio..."
          />
        </label>
      </div>

      <label>
        <span className="text-sm font-semibold">Tono</span>
        <select
          {...register("tone")}
          className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
        >
          {toneOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-sm font-semibold">Datos que debe incluir</span>
        <textarea
          {...register("requiredData")}
          rows={4}
          className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
          placeholder="Nombres, fechas, importes, condiciones, plazos o puntos que no deben faltar."
        />
      </label>

      <p className="rounded-md bg-[#faf9f6] p-3 text-xs leading-5 text-slate-600">
        DocuGen generará un borrador orientativo. No sustituye asesoramiento legal, laboral, fiscal ni profesional.
      </p>

      <button
        type="submit"
        disabled={disabled}
        className="focus-ring btn-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? "Generando..." : "Generar documento a medida"}
      </button>
    </form>
  );
}
