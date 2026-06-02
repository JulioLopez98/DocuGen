"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DocResult } from "@/components/DocResult";
import { PlanFirstSteps } from "@/components/PlanFirstSteps";
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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedAssistantDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Conversaciones</p>
            <h2 className="panel-title mt-2">Tu hilo de trabajo</h2>
          </div>
          <Link href="/asistente" className="focus-ring btn-secondary px-3 py-2 text-xs">
            Nueva
          </Link>
        </div>

        <div className="mt-5 grid gap-2">
          {sessions.length === 0 ? (
            <div className="status-note">
              <p className="font-semibold text-[#1f2933]">Aún no tienes conversaciones</p>
              <p className="mt-2">Cuando envíes el primer mensaje, el hilo quedará guardado aquí.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/asistente?sessionId=${session.id}`}
                className={`focus-ring rounded-xl border px-3 py-3 text-sm transition ${
                  session.id === sessionId
                    ? "border-[#2d6a4f] bg-[#d8f3dc] shadow-sm"
                    : "border-[#d8f3dc] bg-white/72 hover:border-[#2d6a4f] hover:bg-white"
                }`}
              >
                <span className="font-semibold">Conversación</span>
                <span className="mt-1 block text-xs text-slate-500">{new Date(session.updated_at).toLocaleString("es-ES")}</span>
              </Link>
            ))
          )}
        </div>

        <div className="mt-6 rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Flujo recomendado</p>
          <ol className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
            <li>1. Explica el caso con tus palabras.</li>
            <li>2. Responde las preguntas de aclaración.</li>
            <li>3. Genera el borrador cuando esté claro.</li>
          </ol>
        </div>
      </aside>

      <section className="surface p-5">
        <div className="border-b border-[#d8f3dc] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Chat libre Pro</p>
              <h1 className="panel-title mt-2">Describe el documento que necesitas</h1>
              <p className="body-muted mt-3 max-w-3xl">
                El asistente te ayuda a aclarar tipo de documento, datos necesarios y siguiente paso. Cuando tengas la
                información suficiente, puedes generar el borrador y guardarlo en Documentos.
              </p>
            </div>
            <button
              type="button"
              onClick={generateFromChat}
              disabled={generating || loading || messages.length === 0}
              className="focus-ring btn-primary px-4 py-3 text-sm disabled:opacity-60"
            >
              {generating ? "Generando..." : "Generar documento"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid min-h-[420px] content-start gap-3">
          {messages.length === 0 && (
            <div className="surface-muted p-5">
              <p className="eyebrow">Punto de partida</p>
              <h2 className="mt-3 text-xl font-bold">Empieza con una situación real</h2>
              <p className="body-muted mt-2">
                No hace falta saber el nombre exacto del documento. Cuéntale al asistente qué quieres conseguir.
              </p>
              <div className="mt-4 grid gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="focus-ring interactive-subtle rounded-xl border border-[#d8f3dc] bg-white/78 px-4 py-3 text-left text-sm font-semibold text-[#1f2933]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.length === 0 && <PlanFirstSteps plan="pro" context="assistant" compact />}
          {messages.map((chatMessage) => (
            <article
              key={chatMessage.id}
              className={`max-w-[88%] rounded-2xl p-4 text-sm leading-6 shadow-sm ${
                chatMessage.role === "user"
                  ? "ml-auto bg-[#2d6a4f] text-white"
                  : "mr-auto border border-[#d8f3dc] bg-white/88 text-[#1f2933]"
              }`}
            >
              <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${chatMessage.role === "user" ? "text-white/70" : "text-[#2d6a4f]"}`}>
                {chatMessage.role === "user" ? "Tú" : "DocuGen"}
              </p>
              <p className="whitespace-pre-wrap">{chatMessage.content}</p>
            </article>
          ))}
          {loading && (
            <div className="mr-auto rounded-2xl border border-[#d8f3dc] bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
              Pensando la mejor forma de enfocarlo...
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-[#d8f3dc] pt-4">
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
              className="field-control min-h-28"
              placeholder="Cuéntame qué documento necesitas, para qué lo vas a usar y qué datos tienes..."
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Pulsa Ctrl+Enter para enviar. Genera el documento cuando el caso esté claro.</p>
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

        {generatedDocument && (
          <div className="mt-6">
            {generatedDocument.proposal && (
              <div className="status-success mb-4">
                <p className="text-sm font-bold text-[#2d6a4f]">Propuesta enviada al admin</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Hemos creado una propuesta revisable para valorar si este tipo documental debe entrar en Tipos de documento:{" "}
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
              onRegenerate={generateFromChat}
            />
          </div>
        )}
      </section>
    </div>
  );
}
