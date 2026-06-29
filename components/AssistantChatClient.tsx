"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DocResult } from "@/components/DocResult";
import type { ChatMessageRow, ChatSessionRow } from "@/lib/supabase-server";

type AssistantChatClientProps = {
  initialSessionId: string | null;
  initialMessages: ChatMessageRow[];
  sessions: ChatSessionRow[];
};

type ApiError = {
  message?: string;
};

type GeneratedAssistantDocument = {
  id: string;
  docType: string;
  docLabel: string;
  content: string;
  proposal?: {
    title: string;
    status: string;
    category: string | null;
  };
};

const starterPrompts = [
  "Necesito autorizar a otra persona a recoger documentación en mi nombre.",
  "Quiero preparar un acuerdo sencillo con un colaborador externo.",
  "Tengo que responder formalmente a una reclamación de un cliente.",
];

export function AssistantChatClient({ initialSessionId, initialMessages, sessions }: AssistantChatClientProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages);
  const [localSessions, setLocalSessions] = useState<ChatSessionRow[]>(sessions);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedAssistantDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startNewChat() {
    setSessionId(null);
    setMessages([]);
    setMessage("");
    setGeneratedDocument(null);
    setError(null);
    router.replace("/asistente");
  }

  async function deleteSession(targetSessionId: string) {
    const confirmed = window.confirm("¿Borrar esta conversación? Esta acción no elimina documentos ya generados desde ella.");

    if (!confirmed) {
      return;
    }

    setDeletingSessionId(targetSessionId);
    setError(null);

    try {
      const response = await fetch(`/api/assistant/sessions/${targetSessionId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(payload.message || "No se pudo borrar la conversación.");
        return;
      }

      setLocalSessions((current) => current.filter((session) => session.id !== targetSessionId));

      if (sessionId === targetSessionId) {
        startNewChat();
      } else {
        router.refresh();
      }
    } catch {
      setError("No se pudo borrar la conversación. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setDeletingSessionId(null);
    }
  }

  async function sendMessage() {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    const optimisticMessage: ChatMessageRow = {
      id: `local-${Date.now()}`,
      session_id: sessionId || "pending",
      role: "user",
      content: cleanMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setMessage("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: cleanMessage }),
      });
      const payload = (await response.json()) as { sessionId?: string; message?: ChatMessageRow } & ApiError;

      if (!response.ok || !payload.sessionId || !payload.message) {
        setError(payload.message || "No se pudo responder.");
        return;
      }

      setSessionId(payload.sessionId);
      setMessages((current) => [
        ...current.map((item) => (item.id === optimisticMessage.id ? { ...item, session_id: payload.sessionId! } : item)),
        payload.message!,
      ]);

      if (!sessionId) {
        router.replace(`/asistente?sessionId=${payload.sessionId}`);
      }

      router.refresh();
    } catch {
      setError("No se pudo contactar con el asistente. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function generateFromChat() {
    if (!sessionId) {
      setError("Primero envía al menos un mensaje al asistente.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/assistant/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = (await response.json()) as Partial<GeneratedAssistantDocument> & ApiError;

      if (!response.ok || !payload.id || !payload.docType || !payload.docLabel || !payload.content) {
        setError(payload.message || "No se pudo generar el documento.");
        return;
      }

      setGeneratedDocument({
        id: payload.id,
        docType: payload.docType,
        docLabel: payload.docLabel,
        content: payload.content,
        proposal: payload.proposal,
      });
      router.refresh();
    } catch {
      setError("No se pudo generar desde el asistente. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
      <section className="surface order-2 overflow-hidden p-0 xl:order-1">
        <div className="border-b border-[#d8f3dc] bg-[#fffdf8]/74 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#2d6a4f]">Describe el documento. DocuGen te guía.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Incluye objetivo, partes implicadas, fechas, importes y condiciones importantes. Evita datos sensibles innecesarios.
              </p>
            </div>
            <button
              type="button"
              onClick={generateFromChat}
              disabled={generating || loading || messages.length === 0}
              className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60"
            >
              {generating ? "Generando..." : "Generar documento"}
            </button>
          </div>
        </div>

        <div className="grid min-h-[500px] content-start gap-3 p-5">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl rounded-xl border border-[#d8f3dc] bg-[#faf9f6]/85 p-5 text-center">
              <p className="eyebrow">Empieza con una frase</p>
              <h2 className="mt-3 text-2xl font-bold">No necesitas saber el nombre del documento</h2>
              <p className="body-muted mt-2">Cuéntale al asistente qué quieres conseguir y él ordenará el caso.</p>
              <div className="mt-5 grid gap-2 text-left">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="focus-ring interactive-subtle rounded-md border border-[#d8f3dc] bg-[#fffdf8]/82 px-4 py-3 text-left text-sm font-semibold text-[#1f2933]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((chatMessage) => (
            <article
              key={chatMessage.id}
              className={`max-w-[86%] rounded-2xl p-4 text-sm leading-6 shadow-sm ${
                chatMessage.role === "user"
                  ? "ml-auto bg-[#2d6a4f] text-white"
                  : "mr-auto border border-[#d8f3dc] bg-[#fffdf8]/92 text-[#1f2933]"
              }`}
            >
              <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${chatMessage.role === "user" ? "text-white/70" : "text-[#2d6a4f]"}`}>
                {chatMessage.role === "user" ? "Tú" : "DocuGen"}
              </p>
              <p className="whitespace-pre-wrap">{chatMessage.content}</p>
            </article>
          ))}

          {loading && (
            <div className="mr-auto rounded-2xl border border-[#d8f3dc] bg-[#fffdf8]/82 p-4 text-sm text-slate-600 shadow-sm">
              Pensando la mejor forma de enfocarlo...
            </div>
          )}
        </div>

        <div className="border-t border-[#d8f3dc] bg-[#faf9f6]/70 p-4">
          <label className="block">
            <span className="sr-only">Mensaje</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  void sendMessage();
                }
              }}
              className="field-control min-h-24"
              placeholder="Ejemplo: necesito una autorización para que mi hermano recoja un documento en el ayuntamiento..."
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Ctrl+Enter para enviar. Genera el documento cuando el caso esté claro.</p>
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
          {error && <p className="status-error mt-3">{error}</p>}
        </div>
      </section>

      <aside className="surface-flat order-1 p-4 xl:sticky xl:top-24 xl:order-2 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
        <button type="button" onClick={startNewChat} className="focus-ring btn-primary w-full px-4 py-3 text-sm">
          Nuevo chat
        </button>

        <div className="mt-5 rounded-md border border-[#d8f3dc] bg-[#fffdf8]/74 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Cuándo usarlo</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Usa el asistente si no sabes qué documento elegir o necesitas que DocuGen te haga preguntas antes de redactar.
          </p>
          <Link href="/generar?mode=custom" className="focus-ring btn-ghost mt-3 px-0 py-2 text-sm">
            A medida: una petición directa
          </Link>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#1f2933]">Conversaciones</p>
            <span className="badge badge-free">{localSessions.length}</span>
          </div>

          {localSessions.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-[#d8f3dc] bg-[#fffdf8]/74 p-3 text-sm text-slate-500">
              Aún no hay chats guardados.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {localSessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-md border p-2 transition ${
                    session.id === sessionId ? "border-[#2d6a4f] bg-[#d8f3dc]/72" : "border-[#d8f3dc] bg-[#fffdf8]/74"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Link href={`/asistente?sessionId=${session.id}`} className="focus-ring min-w-0 flex-1 rounded-md px-2 py-1 text-sm">
                      <span className="block truncate font-semibold">Conversación</span>
                      <span className="mt-1 block text-xs text-slate-500">{new Date(session.updated_at).toLocaleString("es-ES")}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteSession(session.id)}
                      disabled={deletingSessionId === session.id}
                      className="focus-ring rounded-md px-2 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      aria-label="Borrar conversación"
                    >
                      {deletingSessionId === session.id ? "..." : "Borrar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {generatedDocument && (
        <div className="order-3 xl:col-span-2">
          {generatedDocument.proposal && (
            <div className="status-success mb-4">
              <p className="text-sm font-bold text-[#2d6a4f]">Propuesta enviada al admin</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Hemos creado una propuesta revisable para valorar si este tipo documental debe entrar en el catálogo: {" "}
                <strong>{generatedDocument.proposal.title}</strong>
                {generatedDocument.proposal.category ? ` · ${generatedDocument.proposal.category}` : ""}.
              </p>
            </div>
          )}
          <DocResult
            documentId={generatedDocument.id}
            docType={generatedDocument.docType}
            title={generatedDocument.docLabel}
            content={generatedDocument.content}
            canExportDocx
            canSaveToCatalog={generatedDocument.docType === "assistant"}
            onRegenerate={generateFromChat}
          />
        </div>
      )}
    </div>
  );
}
