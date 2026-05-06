"use client";

import { jsPDF } from "jspdf";

type PdfOptions = {
  title: string;
  content: string;
  includesSignatures?: boolean;
};

const margin = 18;

export function downloadDocumentTxt(title: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(title)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDocumentPdf({ title, content, includesSignatures }: PdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  let y = 24;

  doc.setFillColor(45, 106, 79);
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("DocuGen", margin, 16);
  doc.setFontSize(13);
  doc.text(title, margin, 27);

  y = 52;
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
      addHeader(doc, title);
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
      addHeader(doc, title);
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

function addHeader(doc: jsPDF, title: string) {
  doc.setTextColor(45, 106, 79);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`DocuGen - ${title}`, margin, 14);
  doc.setDrawColor(216, 243, 220);
  doc.line(margin, 18, doc.internal.pageSize.getWidth() - margin, 18);
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
