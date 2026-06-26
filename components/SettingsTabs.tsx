"use client";

import { useState, type ReactNode } from "react";

type TabId = "cuenta" | "suscripcion" | "marca" | "datos";

type SettingsTabsProps = {
  sections: {
    id: TabId;
    label: string;
    description: string;
    content: ReactNode;
  }[];
};

export function SettingsTabs({ sections }: SettingsTabsProps) {
  const [active, setActive] = useState<TabId>(sections[0]?.id || "cuenta");
  const current = sections.find((section) => section.id === active) || sections[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="surface h-fit p-3">
        <nav className="grid gap-2">
          {sections.map((section) => {
            const isActive = section.id === active;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                className={`focus-ring rounded-xl px-4 py-3 text-left transition ${
                  isActive ? "bg-[#d8f3dc] text-[#1f2933] shadow-sm" : "hover:bg-[#fffdf8]/82"
                }`}
              >
                <span className="block text-sm font-bold">{section.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{section.description}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div>{current?.content}</div>
    </div>
  );
}
