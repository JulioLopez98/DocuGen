"use client";

import { FormShell } from "@/components/forms/FormShell";
import { getDocumentConfig } from "@/lib/document-types";

type Props = { onSubmit: (payload: { docType: string; formData: Record<string, string> }) => void; disabled?: boolean; defaultValues?: Record<string, string> };
export function AcuerdoColaboracion(props: Props) {
  return <FormShell config={getDocumentConfig("acuerdo-colaboracion")!} {...props} />;
}
