"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceMemberProfile, WorkspaceNotificationRow } from "@/lib/supabase-server";

type WorkspaceNotificationsPanelProps = {
  workspaceId: string | null;
  notifications: WorkspaceNotificationRow[];
  actorProfiles: WorkspaceMemberProfile[];
};

type NotificationApiResponse = {
  message?: string;
};

export function WorkspaceNotificationsPanel({
  workspaceId,
  notifications,
  actorProfiles,
}: WorkspaceNotificationsPanelProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actorById = useMemo(
    () => new Map(actorProfiles.map((profile) => [profile.id, profile.email])),
    [actorProfiles],
  );
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  async function markAsRead(notificationId?: string) {
    if (!notificationId && !workspaceId) {
      return;
    }

    setPendingAction(notificationId || "all");
    setError(null);

    const response = await fetch("/api/workspace-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationId ? { notificationId } : { workspaceId, markAll: true }),
    });
    const data = (await response.json()) as NotificationApiResponse;

    if (!response.ok) {
      setError(data.message || "No se pudieron actualizar las notificaciones.");
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    router.refresh();
  }

  return (
    <section className="surface rounded-md p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Notificaciones</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Avisos del workspace</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Lo importante que ha ocurrido en tu equipo, separado del registro completo de auditoria.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
            {unreadCount} sin leer
          </span>
          {unreadCount > 0 && (
            <button
              className="focus-ring btn-secondary px-3 py-2 text-xs"
              type="button"
              onClick={() => markAsRead()}
              disabled={pendingAction === "all"}
            >
              {pendingAction === "all" ? "Marcando..." : "Marcar todo leido"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-5 grid gap-3">
        {notifications.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
            Aun no tienes notificaciones internas. Cuando otro miembro actue en el workspace apareceran aqui.
          </div>
        ) : (
          notifications.map((notification) => {
            const unread = !notification.read_at;
            const actor = notification.actor_id ? actorById.get(notification.actor_id) : null;
            const content = (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {unread && <span className="h-2 w-2 rounded-full bg-[#2d6a4f]" aria-label="Sin leer" />}
                  <p className="font-semibold">{notification.title}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {actor || "Sistema"} -{" "}
                  {new Date(notification.created_at).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );

            return (
              <article
                key={notification.id}
                className={`rounded-md border p-4 transition ${
                  unread ? "border-[#2d6a4f] bg-[#f4fbf6]" : "border-[#d8f3dc] bg-white/72"
                }`}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  {notification.href ? (
                    <Link className="focus-ring rounded-md" href={notification.href}>
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                  {unread && (
                    <button
                      className="focus-ring btn-secondary px-3 py-2 text-xs"
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      disabled={pendingAction === notification.id}
                    >
                      {pendingAction === notification.id ? "Marcando..." : "Marcar leida"}
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
