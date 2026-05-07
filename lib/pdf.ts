"use client";

import { jsPDF } from "jspdf";

type PdfOptions = {
  title: string;
  content: string;
  includesSignatures?: boolean;
  brandSettings?: PdfBrandSettings | null;
};

const margin = 18;

export type PdfBrandSettings = {
  company_name: string | null;
  cif: string | null;
  address: string | null;
  logo_url: string | null;
};

export function downloadDocumentTxt(title: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(title)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadDocumentPdf({ title, content, includesSignatures, brandSettings }: PdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  let y = 24;
  const brandName = brandSettings?.company_name || "DocuGen";
  const brandMeta = [brandSettings?.cif ? `CIF/NIF: ${brandSettings.cif}` : null, brandSettings?.address]
    .filter(Boolean)
    .join(" · ");

  doc.setFillColor(45, 106, 79);
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(brandName, margin, 16);
  doc.setFontSize(13);
  doc.text(title, margin, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Generado con DocuGen", margin, 37);

  if (brandMeta) {
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(brandMeta, 90) as string[], pageWidth - margin, 16, { align: "right" });
  }

  if (brandSettings?.logo_url) {
    await addLogo(doc, brandSettings.logo_url, pageWidth - margin - 24, 23, 24, 14);
  }

  y = 58;
  doc.setTextColor(31, 41, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, margin, y);
  y += 12;

  const lines = content.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const isClause = /^\d+\./.test(line) || /^cl[aá]usula/i.test(line);
    const wrapped = doc.splitTextToSize(line || " ", usableWidth) as string[];
    const blockHeight = Math.max(wrapped.length * 5 + 2, 6);

    if (y + blockHeight > pageHeight - 22) {
      addFooter(doc, title);
      doc.addPage();
      addHeader(doc, title, brandName);
      y = 28;
    }

    if (isClause && line) {
      doc.setFillColor(216, 243, 220);
      doc.roundedRect(margin - 2, y - 4, usableWidth + 4, blockHeight, 1, 1, "F");
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }

    doc.setFontSize(isClause ? 11 : 10);
    doc.setTextColor(31, 41, 51);
    doc.text(wrapped, margin, y);
    y += blockHeight;
  }

  if (includesSignatures) {
    if (y > pageHeight - 65) {
      addFooter(doc, title);
      doc.addPage();
      addHeader(doc, title, brandName);
      y = 38;
    }

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Firmas", margin, y);
    y += 18;
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
    doc.setFont("helvetica", "normal");
    doc.text("Parte 1", margin, y + 7);
    doc.text("Parte 2", pageWidth - margin - 70, y + 7);
  }

  addFooter(doc, title);
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${page} / ${total}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  doc.save(`${slugify(title)}.pdf`);
}

function addHeader(doc: jsPDF, title: string, brandName: string) {
  doc.setTextColor(45, 106, 79);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${brandName} - ${title}`, margin, 14);
  doc.setDrawColor(216, 243, 220);
  doc.line(margin, 18, doc.internal.pageSize.getWidth() - margin, 18);
}

async function addLogo(doc: jsPDF, url: string, x: number, y: number, maxWidth: number, maxHeight: number) {
  try {
    const dataUrl = await imageUrlToDataUrl(url);
    const image = await loadImage(dataUrl);
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    doc.addImage(dataUrl, getImageFormat(dataUrl), x + maxWidth - width, y, width, height);
  } catch (error) {
    console.warn("pdf_logo_skipped", error);
  }
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getImageFormat(dataUrl: string) {
  if (dataUrl.includes("image/png")) {
    return "PNG";
  }

  if (dataUrl.includes("image/webp")) {
    return "WEBP";
  }

  return "JPEG";
}

function addFooter(doc: jsPDF, title: string) {
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(216, 243, 220);
  doc.line(margin, pageHeight - 16, doc.internal.pageSize.getWidth() - margin, pageHeight - 16);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Documento generado con IA. Revisar antes de su uso legal.", margin, pageHeight - 8);
  doc.setProperties({ title });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
