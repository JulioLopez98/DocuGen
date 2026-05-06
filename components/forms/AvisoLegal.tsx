"use client";

import { FormShell } from "@/components/forms/FormShell";
import { getDocumentConfig } from "@/lib/document-types";

type Props = { onSubmit: (payload: { docType: string; formData: Record<string, string> }) => void; disabled?: boolean; defaultValues?: Record<string, string> };
export function AvisoLegal(props: Props) {
  return <FormShell config={getDocumentConfig("aviso-legal")!} {...props} />;
}
