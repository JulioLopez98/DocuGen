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
  title: "Asistente conversacional",
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
    <section className="container-page py-10">
      <div className="mb-6">
        <ContextualHelp
          title="Para que sirve el asistente"
          description="Usalo cuando no tengas claro el tipo de documento, cuando quieras explicar un caso con tus palabras o cuando necesites convertir una idea en un borrador guiado."
          items={[
            "No pegues datos sensibles innecesarios.",
            "Si el documento ya existe en catalogo, el generador estructurado suele ser mas rapido.",
            "Puedes proponer nuevos tipos documentales para revisarlos y convertirlos en comunidad.",
          ]}
          secondaryAction={{ href: "/generar", label: "Usar generador" }}
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
