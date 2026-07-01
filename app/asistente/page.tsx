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

  const requestedSessionId = searchParams?.sessionId || null;

  if (profile.plan === "free") {
    return (
      <section className="container-page py-8 lg:py-10">
        <div className="surface overflow-hidden">
          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_420px] lg:p-8">
            <div>
              <p className="eyebrow">Asistente Pro</p>
              <h1 className="section-title mt-3 max-w-3xl">Crea documentos hablando con DocuGen</h1>
              <p className="body-muted mt-4 max-w-2xl">
                El asistente te ayuda cuando no sabes que tipo elegir o necesitas un documento mas personalizado. Te hace
                preguntas, ordena la informacion y prepara el borrador cuando el caso esta claro.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["1", "Describe el caso", "Explica lo que necesitas con tus palabras."],
                  ["2", "Responde preguntas", "DocuGen pide solo los datos importantes."],
                  ["3", "Genera el borrador", "Obtienes un documento listo para revisar."],
                ].map(([step, title, text]) => (
                  <div key={step} className="surface-muted p-4">
                    <span className="badge badge-free">{step}</span>
                    <p className="mt-3 font-bold text-[#1f2933]">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/precios" className="focus-ring btn-primary px-5 py-3 text-sm">
                  Desbloquear asistente
                </a>
                <a href="/generar" className="focus-ring btn-secondary px-5 py-3 text-sm">
                  Crear con Free
                </a>
              </div>

              <p className="status-note mt-5 max-w-2xl">
                Estas viendo una vista previa. El chat guiado esta incluido en Pro y Empresa; en Free puedes generar
                documentos del catalogo base y probar un documento a medida al mes.
              </p>
            </div>

            <div className="rounded-2xl border border-[#b7e4c7] bg-[#fffdf8] p-4 shadow-[0_18px_50px_rgba(31,41,51,0.08)]">
              <div className="rounded-xl bg-[#f4fbf5] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2d6a4f]">Vista previa</p>
                <div className="mt-4 rounded-xl bg-[#2d6a4f] p-4 text-sm leading-6 text-white">
                  Necesito responder formalmente a una reclamacion de un cliente.
                </div>
                <div className="mt-4 rounded-xl border border-[#d8f3dc] bg-white p-4 text-sm leading-6 text-slate-700">
                  Perfecto. Para preparar una respuesta profesional necesito saber el motivo de la reclamacion, si
                  reconoces algun fallo, que solucion propones y que tono quieres usar.
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-[#b7e4c7] p-4 text-sm text-slate-500">
                  El asistente seguira preguntando hasta tener lo justo para generar el documento.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
        <h1 className="section-title mt-3">Describe lo que necesitas y deja que DocuGen te guie</h1>
        <p className="body-muted mt-4">
          Usa el asistente cuando no sepas que tipo elegir o cuando el documento requiera contexto. Te hara preguntas,
          ordenara la informacion y podras generar el borrador cuando el caso este claro.
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
