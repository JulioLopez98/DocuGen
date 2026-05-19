import Link from "next/link";
import { PlanBadge } from "@/components/PlanBadge";
import type { DocumentRow, Profile, WorkspaceMemberRow, WorkspaceRow } from "@/lib/supabase-server";

type WorkspacePanelProps = {
  profile: Profile;
  workspaces: WorkspaceRow[];
  members: WorkspaceMemberRow[];
  documents: Pick<DocumentRow, "id" | "doc_label" | "doc_type" | "workspace_id" | "created_at">[];
};

export function WorkspacePanel({ profile, workspaces, members, documents }: WorkspacePanelProps) {
  const primaryWorkspace = workspaces[0] || null;
  const workspaceMembers = primaryWorkspace
    ? members.filter((member) => member.workspace_id === primaryWorkspace.id)
    : [];
  const workspaceDocuments = primaryWorkspace
    ? documents.filter((document) => document.workspace_id === primaryWorkspace.id)
    : [];
  const personalDocuments = documents.filter((document) => !document.workspace_id);
  const isEmpresa = profile.plan === "empresa";

  return (
    <div className="grid gap-6">
      <section className="surface rounded-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1 className="font-serif-display mt-3 text-4xl font-bold">
              {primaryWorkspace?.name || "Workspace personal"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Organiza documentos, miembros y configuracion compartida. En esta primera version dejamos visible la base
              de trabajo; las invitaciones avanzadas llegan en el siguiente paso.
            </p>
          </div>
          <PlanBadge plan={profile.plan} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <WorkspaceMetric label="Workspaces" value={workspaces.length.toString()} helper="Accesibles para ti" />
          <WorkspaceMetric label="Miembros" value={workspaceMembers.length.toString()} helper="En el workspace principal" />
          <WorkspaceMetric label="Documentos" value={workspaceDocuments.length.toString()} helper="Compartidos en workspace" />
          <WorkspaceMetric label="Personales" value={personalDocuments.length.toString()} helper="Sin workspace asociado" />
        </div>

        {!isEmpresa && (
          <div className="mt-6 rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-5">
            <p className="font-semibold text-[#2d6a4f]">Preparado para Empresa</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              El plan Empresa permitira miembros, biblioteca compartida y marca por workspace. Tu base ya esta creada
              para migrar cuando actives ese plan.
            </p>
            <Link href="/precios" className="focus-ring btn-primary mt-4 inline-flex px-4 py-3 text-sm">
              Ver plan Empresa
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="surface rounded-md p-6">
          <p className="eyebrow">Miembros</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Equipo</h2>
          <div className="mt-5 grid gap-3">
            {workspaceMembers.length === 0 ? (
              <EmptyWorkspaceBlock text="Todavia no hay miembros asociados a este workspace." />
            ) : (
              workspaceMembers.map((member) => (
                <article key={member.id} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{member.user_id === profile.id ? profile.email || "Tu cuenta" : member.user_id}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Unido el {new Date(member.joined_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
                      {member.role === "admin" ? "Admin" : "Miembro"}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="surface rounded-md p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Documentos</p>
              <h2 className="font-serif-display mt-3 text-3xl font-bold">Actividad del workspace</h2>
            </div>
            <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
              Crear documento
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {workspaceDocuments.length === 0 ? (
              <EmptyWorkspaceBlock text="Aun no hay documentos compartidos en este workspace. Por ahora tus generaciones siguen siendo personales." />
            ) : (
              workspaceDocuments.slice(0, 8).map((document) => (
                <article
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/72 p-4"
                >
                  <div>
                    <p className="font-semibold">{document.doc_label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {document.doc_type} · {new Date(document.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <Link href={`/historial/${document.id}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                    Abrir
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function WorkspaceMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="surface-flat rounded-md p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function EmptyWorkspaceBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}
