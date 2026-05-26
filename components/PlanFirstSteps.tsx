import Link from "next/link";

type Plan = "free" | "pro" | "empresa";
type Context = "general" | "documents" | "templates" | "assistant" | "team";

type PlanFirstStepsProps = {
  plan: Plan;
  context?: Context;
  compact?: boolean;
};

type Step = {
  title: string;
  text: string;
  href: string;
  action: string;
};

export function PlanFirstSteps({ plan, context = "general", compact = false }: PlanFirstStepsProps) {
  const steps = getSteps(plan, context);

  return (
    <section className={`rounded-md border border-[#d8f3dc] bg-white/72 ${compact ? "p-4" : "p-5"}`} aria-label="Primeros pasos recomendados">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Primeros pasos</p>
          <h3 className={`font-serif-display font-bold ${compact ? "mt-1 text-2xl" : "mt-2 text-3xl"}`}>
            {getTitle(plan, context)}
          </h3>
        </div>
        <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold uppercase text-[#2d6a4f]">{plan}</span>
      </div>

      <ol className={`mt-4 grid gap-3 ${compact ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
        {steps.map((step, index) => (
          <li key={step.title}>
            <Link href={step.href} className="focus-ring block rounded-md border border-[#d8f3dc] bg-[#faf9f6]/75 p-4 transition hover:-translate-y-0.5 hover:border-[#2d6a4f] hover:bg-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2d6a4f] text-xs font-bold text-white">
                {index + 1}
              </span>
              <h4 className="mt-3 font-bold">{step.title}</h4>
              <p className="mt-2 text-xs leading-5 text-slate-600">{step.text}</p>
              <span className="mt-3 inline-flex text-xs font-bold text-[#2d6a4f]">{step.action}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function getTitle(plan: Plan, context: Context) {
  if (context === "documents") {
    return plan === "free" ? "Crea tu primer documento" : "Convierte Documentos en tu mesa de trabajo";
  }

  if (context === "templates") {
    return plan === "free" ? "Desbloquea plantillas cuando las necesites" : "Prepara una biblioteca reutilizable";
  }

  if (context === "assistant") {
    return "Usa el asistente para casos abiertos";
  }

  if (context === "team") {
    return plan === "empresa" ? "Pon tu equipo en marcha" : "Prepara tu salto a Empresa";
  }

  return plan === "free" ? "Empieza sin perderte" : plan === "pro" ? "Saca partido a Pro" : "Organiza el trabajo en equipo";
}

function getSteps(plan: Plan, context: Context): Step[] {
  if (context === "documents") {
    if (plan === "free") {
      return [
        { title: "Elige un tipo", text: "Empieza por contrato, presupuesto, carta o documento web.", href: "/generar", action: "Crear documento" },
        { title: "Revisa el borrador", text: "Completa marcadores pendientes antes de descargar o copiar.", href: "/catalogo", action: "Ver tipos" },
        { title: "Guarda margen", text: "Free incluye 3 documentos al mes; Pro elimina el limite.", href: "/precios", action: "Comparar planes" },
      ];
    }

    return [
      { title: "Crea o reutiliza", text: "Genera un documento nuevo o parte de uno ya guardado.", href: "/generar", action: "Crear" },
      { title: "Usa plantillas", text: "Aplica estructura o tono de documentos propios.", href: "/plantillas", action: "Abrir plantillas" },
      { title: "Exporta Word", text: "Descarga versiones editables con tu marca si la tienes configurada.", href: "/ajustes", action: "Revisar marca" },
    ];
  }

  if (context === "templates") {
    if (plan === "free") {
      return [
        { title: "Prueba el flujo base", text: "Crea documentos con tipos esenciales antes de subir ejemplos propios.", href: "/generar", action: "Crear" },
        { title: "Evalua Pro", text: "Plantillas, Word y a medida se desbloquean para uso recurrente.", href: "/precios", action: "Ver Pro" },
        { title: "Prepara archivos", text: "Ten a mano DOCX/PDF limpios con buenos ejemplos de tu empresa.", href: "/catalogo", action: "Ver tipos" },
      ];
    }

    return [
      { title: "Sube un DOCX/PDF", text: "Empieza con una plantilla clara y representativa.", href: "/plantillas#subir-plantilla", action: "Subir" },
      { title: "Procesa y revisa", text: "Extrae estructura, resumen, variables y calidad antes de usarla.", href: "/plantillas", action: "Ver biblioteca" },
      { title: "Genera con referencia", text: "Elige cuanto influye la plantilla: estructura, tono o ambos.", href: "/generar", action: "Generar" },
    ];
  }

  if (context === "assistant") {
    return [
      { title: "Describe el caso", text: "Explica para que lo necesitas, partes implicadas y datos disponibles.", href: "/asistente", action: "Empezar chat" },
      { title: "Aterriza requisitos", text: "Pide al asistente que te diga que informacion falta.", href: "/asistente", action: "Preguntar" },
      { title: "Genera y guarda", text: "Cuando el caso este claro, crea el borrador en Documentos.", href: "/asistente", action: "Generar" },
    ];
  }

  if (context === "team") {
    if (plan !== "empresa") {
      return [
        { title: "Trabaja personal", text: "Usa Documentos y Plantillas como espacio individual.", href: "/dashboard", action: "Ir al panel" },
        { title: "Compara Empresa", text: "Equipo anade miembros, roles, avisos y documentos compartidos.", href: "/precios", action: "Ver Empresa" },
        { title: "Prepara procesos", text: "Define quien crea, revisa y reutiliza documentos.", href: "/plantillas", action: "Ver plantillas" },
      ];
    }

    return [
      { title: "Invita miembros", text: "Anade personas y asigna permisos segun su papel.", href: "/workspace", action: "Gestionar equipo" },
      { title: "Crea compartido", text: "Guarda documentos en el equipo para que otros los vean.", href: "/generar", action: "Crear" },
      { title: "Revisa avisos", text: "Controla actividad, notificaciones y cambios sensibles.", href: "/workspace", action: "Ver actividad" },
    ];
  }

  if (plan === "empresa") {
    return getSteps(plan, "team");
  }

  if (plan === "pro") {
    return getSteps(plan, "templates");
  }

  return getSteps(plan, "documents");
}
