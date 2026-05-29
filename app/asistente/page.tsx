import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssistantChatClient } from "@/components/AssistantChatClient";
import { ContextualHelp } from "@/components/ContextualHelp";
import { getCurrentProfile, type ChatMessageRow, type ChatSessionRow } from "@/lib/supabase-server";

type Props = {
  searchParams?: {
    sessionId?: string;
  };
};

export const metadata: Metadata = {
  title: "Asistente",
  description: "Chat Pro para definir documentos profesionales a medida en DocuGen.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AssistantPage({ searchParams }: Props) {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  if (profile.plan === "free") {
    redirect("/precios");
  }

  const requestedSessionId = searchParams?.sessionId || null;
  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(20)
    .returns<ChatSessionRow[]>();

  const activeSession = requestedSessionId
    ? (sessions || []).find((session) => session.id === requestedSessionId) || null
    : null;

  const { data: messages } = activeSession
    ? await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", activeSession.id)
        .order("created_at", { ascending: true })
        .returns<ChatMessageRow[]>()
    : { data: [] as ChatMessageRow[] };

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface mb-6 overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="eyebrow">Asistente Pro</p>
            <h1 className="section-title mt-3 max-w-4xl">Convierte una explicación en un borrador profesional</h1>
            <p className="body-muted mt-4 max-w-3xl">
              Úsalo cuando no sepas qué tipo elegir, cuando el caso sea demasiado específico o cuando quieras crear un
              primer documento a partir de una conversación guiada.
            </p>
          </div>
          <div className="surface-muted p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Mejor uso</p>
            <p className="body-muted mt-3">
              Describe objetivo, partes implicadas, contexto, fechas, importes y cualquier condición importante. Evita
              datos sensibles que no sean necesarios para el borrador.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <ContextualHelp
          title="Cómo sacarle partido"
          description="El asistente aclara el caso, propone estructura y puede generar un borrador. Si ya sabes el tipo documental, Crear suele ser más rápido."
          items={[
            "Empieza con una frase natural: qué necesitas y para qué.",
            "Añade solo los datos necesarios para redactar el borrador.",
            "Si el caso se repite, podrá convertirse en tipo documental comunitario.",
          ]}
          secondaryAction={{ href: "/generar", label: "Usar Crear" }}
          tone="pro"
        />
      </div>
      <AssistantChatClient
        initialSessionId={activeSession?.id || null}
        initialMessages={messages || []}
        sessions={sessions || []}
      />
    </section>
  );
}
