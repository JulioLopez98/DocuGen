import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: {
    default: "DocuGen - Generador de documentos profesionales con IA",
    template: "%s | DocuGen",
  },
  description:
    "Genera borradores profesionales de contratos, presupuestos, propuestas y documentos web adaptados al contexto español.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
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
