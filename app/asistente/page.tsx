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

  const sessionIds = (sessions || []).map((session) => session.id);
  const { data: sessionTitleMessages } = sessionIds.length
    ? await supabase
        .from("chat_messages")
        .select("session_id,content,created_at")
        .in("session_id", sessionIds)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .returns<Array<Pick<ChatMessageRow, "session_id" | "content" | "created_at">>>()
    : { data: [] as Array<Pick<ChatMessageRow, "session_id" | "content" | "created_at">> };
  const sessionTitles = Object.fromEntries(
    (sessionTitleMessages || []).reduce<Array<[string, string]>>((items, message) => {
      if (!items.some(([sessionId]) => sessionId === message.session_id)) {
        items.push([message.session_id, message.content]);
      }

      return items;
    }, []),
  );

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
      <div className="mb-6 max-w-3xl">
        <p className="eyebrow">Asistente Pro</p>
        <h1 className="section-title mt-3">Describe lo que necesitas y deja que DocuGen te guíe</h1>
        <p className="body-muted mt-4">
          Usa el asistente cuando no sepas qué tipo elegir o cuando el documento requiera contexto. Te hará preguntas, ordenará la información y podrás generar el borrador cuando el caso esté claro.
        </p>
      </div>
      <AssistantChatClient
        initialSessionId={activeSession?.id || null}
        initialMessages={messages || []}
        sessions={sessions || []}
        sessionTitles={sessionTitles}
      />
    </section>
  );
}
