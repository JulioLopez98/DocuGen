"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChatMessageRow, ChatSessionRow } from "@/lib/supabase-server";

type AssistantChatClientProps = {
  initialSessionId: string | null;
  initialMessages: ChatMessageRow[];
  sessions: ChatSessionRow[];
};

type ApiError = {
  message?: string;
};

export function AssistantChatClient({ initialSessionId, initialMessages, sessions }: AssistantChatClientProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
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
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="surface rounded-md p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Conversaciones</p>
            <h2 className="font-serif-display mt-2 text-2xl font-bold">Asistente</h2>
          </div>
          <Link href="/asistente" className="focus-ring btn-secondary px-3 py-2 text-xs">
            Nueva
          </Link>
        </div>

        <div className="mt-5 grid gap-2">
          {sessions.length === 0 ? (
            <p className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-4 text-sm leading-6 text-slate-600">
              Aun no tienes conversaciones guardadas.
            </p>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/asistente?sessionId=${session.id}`}
                className={`focus-ring rounded-md border px-3 py-3 text-sm transition ${
                  session.id === sessionId
                    ? "border-[#2d6a4f] bg-[#d8f3dc]"
                    : "border-[#d8f3dc] bg-white/72 hover:border-[#2d6a4f]"
                }`}
              >
                <span className="font-semibold">Conversacion</span>
                <span className="mt-1 block text-xs text-slate-500">{new Date(session.updated_at).toLocaleString("es-ES")}</span>
              </Link>
            ))
          )}
        </div>
      </aside>

      <section className="surface rounded-md p-5">
        <div className="border-b border-[#d8f3dc] pb-4">
          <p className="eyebrow">Chat libre Pro</p>
          <h1 className="font-serif-display mt-2 text-3xl font-bold">Describe el documento que necesitas</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            El asistente te ayuda a aclarar tipo de documento, datos necesarios y siguiente paso. Todavia no sustituye
            una revision profesional cuando el documento pueda tener efectos legales.
          </p>
        </div>

        <div className="mt-5 grid min-h-[420px] content-start gap-3">
          {messages.length === 0 && (
            <div className="rounded-md bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
              Prueba con algo como: “Necesito un documento para autorizar a otra persona a recoger un certificado” o
              “Quiero preparar un acuerdo comercial sencillo para un colaborador”.
            </div>
          )}
          {messages.map((chatMessage) => (
            <article
              key={chatMessage.id}
              className={`max-w-[86%] rounded-md p-4 text-sm leading-6 ${
                chatMessage.role === "user"
                  ? "ml-auto bg-[#2d6a4f] text-white"
                  : "mr-auto border border-[#d8f3dc] bg-white/80 text-[#1f2933]"
              }`}
            >
              <p className="whitespace-pre-wrap">{chatMessage.content}</p>
            </article>
          ))}
          {loading && (
            <div className="mr-auto rounded-md border border-[#d8f3dc] bg-white/80 p-4 text-sm text-slate-600">
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
              className="focus-ring min-h-28 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Cuéntame qué documento necesitas, para qué lo vas a usar y qué datos tienes..."
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Pulsa Ctrl+Enter para enviar.</p>
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
          {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      </section>
    </div>
  );
}
