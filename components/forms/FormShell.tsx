"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { buildFormSchema, type DocumentTypeConfig } from "@/lib/document-types";

type FormShellProps = {
  config: DocumentTypeConfig;
  onSubmit: (payload: { docType: string; formData: Record<string, string> }) => void;
  defaultValues?: Record<string, string>;
  submitLabel?: string;
  disabled?: boolean;
};

export function FormShell({ config, onSubmit, defaultValues, submitLabel = "Generar documento", disabled }: FormShellProps) {
  const schema = buildFormSchema(config);
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as Partial<FormValues>,
  });

  return (
    <form
      className="grid gap-5"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          docType: config.type,
          formData: values as Record<string, string>,
        }),
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {config.fields.map((field) => {
          const error = errors[field.name]?.message as string | undefined;
          const common =
            "focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]";

          return (
            <label key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              <span className="text-sm font-semibold">{field.label}</span>
              {field.type === "textarea" ? (
                <textarea {...register(field.name)} rows={4} className={common} placeholder={field.placeholder} />
              ) : (
                <input
                  {...register(field.name)}
                  type={field.type || "text"}
                  className={common}
                  placeholder={field.placeholder}
                />
              )}
              {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
            </label>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="focus-ring btn-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? "Generando..." : submitLabel}
      </button>
    </form>
  );
}
