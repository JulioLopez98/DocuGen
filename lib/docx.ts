"use client";

type DocxOptions = {
  title: string;
  content: string;
  includesSignatures?: boolean;
  canExportDocx: boolean;
};

export async function downloadDocumentDocx({ title, content, includesSignatures, canExportDocx }: DocxOptions) {
  if (!canExportDocx) {
    window.alert("La exportación Word está disponible solo en DocuGen Pro.");
    return;
  }

  const response = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, includesSignatures }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    window.alert(payload?.message || "No se pudo exportar a Word.");
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(title)}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
