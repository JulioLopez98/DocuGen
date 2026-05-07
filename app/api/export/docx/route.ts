import { NextResponse } from "next/server";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { z } from "zod";
import { requireUser, type Profile } from "@/lib/supabase-server";

const exportSchema = z.object({
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(60000),
  includesSignatures: z.boolean().optional(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para exportar a Word.");
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();

    if (!profile || profile.plan === "free") {
      return errorResponse(403, "pro_required", "La exportación Word está disponible solo para planes Pro.");
    }

    const payload = exportSchema.parse(await request.json());
    const doc = new Document({
      creator: "DocuGen",
      title: payload.title,
      description: "Documento generado con IA por DocuGen",
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "DocuGen",
              heading: HeadingLevel.TITLE,
              spacing: { after: 180 },
            }),
            new Paragraph({
              text: payload.title,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 220 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Fecha de exportación: ${new Date().toLocaleDateString("es-ES")}`,
                  italics: true,
                  color: "64748B",
                }),
              ],
              spacing: { after: 360 },
            }),
            ...contentToParagraphs(payload.content),
            ...(payload.includesSignatures ? signatureParagraphs() : []),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Documento generado con IA. Revisar antes de su uso legal o profesional relevante.",
                  italics: true,
                  color: "64748B",
                }),
              ],
              spacing: { before: 360 },
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slugify(payload.title)}.docx"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "No se pudo preparar el documento Word con esos datos.");
    }

    console.error("docx_export_error", error);
    return errorResponse(500, "docx_export_failed", "No se pudo preparar la exportación Word.");
  }
}

function contentToParagraphs(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cleanLine = stripMarkdown(line);
      const headingMatch = cleanLine.match(/^(\d+\.|[A-ZÁÉÍÓÚÑ ]{6,})/);
      const isHeading = line.startsWith("#") || /^\*\*[^*]+\*\*$/.test(line) || Boolean(headingMatch);

      return new Paragraph({
        children: [
          new TextRun({
            text: cleanLine,
            bold: isHeading,
          }),
        ],
        heading: isHeading && cleanLine.length < 90 ? HeadingLevel.HEADING_2 : undefined,
        spacing: { after: isHeading ? 180 : 140 },
      });
    });
}

function signatureParagraphs() {
  return [
    new Paragraph({
      text: "Firmas",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 260 },
    }),
    new Paragraph({
      children: [new TextRun("______________________________        ______________________________")],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun("Parte 1                                      Parte 2")],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

function stripMarkdown(value: string) {
  return value
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^[-–—]\s*/, "")
    .replace(/---+/g, "")
    .trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
