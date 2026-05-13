import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  applicationName: "DocuGen",
  title: {
    default: "DocuGen - Generador de documentos profesionales con IA",
    template: "%s | DocuGen",
  },
  description:
    "Genera borradores profesionales de contratos, presupuestos, propuestas y documentos web adaptados al contexto espanol.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DocuGen - Generador de documentos profesionales con IA",
    description:
      "Contratos, presupuestos, propuestas y documentos web adaptados al contexto espanol. Crea borradores claros y editables en minutos.",
    url: "/",
    siteName: "DocuGen",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DocuGen - Generador de documentos profesionales con IA",
    description:
      "Genera borradores profesionales con IA para el mercado espanol. Exporta PDF, TXT y Word con Pro.",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "generador documentos IA",
    "contratos con IA",
    "presupuestos profesionales",
    "documentos legales Espana",
    "borradores profesionales",
    "DocuGen",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#faf9f6] text-[#1f2933] antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
