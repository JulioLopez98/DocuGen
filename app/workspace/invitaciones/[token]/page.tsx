import type { Metadata } from "next";
import Link from "next/link";
import { AcceptWorkspaceInvitation } from "@/components/AcceptWorkspaceInvitation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  type WorkspaceInvitationRow,
  type WorkspaceRow,
} from "@/lib/supabase-server";
import { hashInvitationToken } from "@/lib/workspace-invitations";

type PageProps = {
  params: {
    token: string;
  };
};

export const metadata: Metadata = {
  title: "Invitacion al workspace",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspaceInvitationPage({ params }: PageProps) {
  const serviceClient = createSupabaseServiceClient();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!serviceClient) {
    return <InvitationShell title="Configuracion incompleta" message="Falta configurar SUPABASE_SERVICE_ROLE_KEY." />;
  }

  const tokenHash = hashInvitationToken(params.token);
  const { data: invitation } = await serviceClient
    .from("workspace_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle<WorkspaceInvitationRow>();

  if (!invitation || invitation.status !== "pending") {
    return (
      <InvitationShell
        title="Invitacion no disponible"
        message="Esta invitacion no existe, ya fue usada o fue revocada."
      />
    );
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return <InvitationShell title="Invitacion caducada" message="Pide al administrador que te envie una nueva invitacion." />;
  }

  const { data: workspace } = await serviceClient
    .from("workspaces")
    .select("*")
    .eq("id", invitation.workspace_id)
    .maybeSingle<WorkspaceRow>();

  return (
    <section className="container-page py-12">
      <div className="surface mx-auto max-w-2xl rounded-md p-8">
        <p className="eyebrow">Workspace</p>
        <h1 className="font-serif-display mt-3 text-4xl font-bold">Te han invitado a DocuGen</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          La invitacion es para colaborar en <strong>{workspace?.name || "un workspace"}</strong> como{" "}
          <strong>{invitation.role === "admin" ? "admin" : "miembro"}</strong>.
        </p>
        <div className="mt-6 grid gap-3 rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-4 text-sm">
          <p>
            <span className="font-semibold">Email invitado:</span> {invitation.email}
          </p>
          <p>
            <span className="font-semibold">Caduca:</span>{" "}
            {new Date(invitation.expires_at).toLocaleDateString("es-ES")}
          </p>
        </div>
        <AcceptWorkspaceInvitation
          token={params.token}
          isAuthenticated={Boolean(user)}
          userEmail={user?.email}
          invitedEmail={invitation.email}
        />
        <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-[#2d6a4f]">
          Volver a DocuGen
        </Link>
      </div>
    </section>
  );
}

function InvitationShell({ title, message }: { title: string; message: string }) {
  return (
    <section className="container-page py-12">
      <div className="surface mx-auto max-w-2xl rounded-md p-8">
        <p className="eyebrow">Workspace</p>
        <h1 className="font-serif-display mt-3 text-4xl font-bold">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
        <Link href="/" className="focus-ring btn-primary mt-6 inline-flex px-5 py-3 text-sm">
          Volver a DocuGen
        </Link>
      </div>
    </section>
  );
}
