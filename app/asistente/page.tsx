import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssistantChatClient } from "@/components/AssistantChatClient";
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
      <AssistantChatClient
        initialSessionId={activeSession?.id || null}
        initialMessages={messages || []}
        sessions={sessions || []}
      />
    </section>
  );
}
