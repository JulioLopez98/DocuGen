export type EditableTemplateVariable = {
  name: string;
  source: "placeholder" | "label" | "manual";
  confidence: "high" | "medium" | "manual";
};

export function readTemplateVariables(metadata: Record<string, unknown> | null): EditableTemplateVariable[] {
  const value = metadata?.variables;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = readRecord(item);
      const name = readString(record?.name);

      if (!name) {
        return null;
      }

      return {
        name,
        source: readVariableSource(record?.source),
        confidence: readVariableConfidence(record?.confidence),
      };
    })
    .filter((item): item is EditableTemplateVariable => item !== null);
}

export function variableKey(variableName: string) {
  const normalized = variableName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "dato";
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readVariableSource(value: unknown): EditableTemplateVariable["source"] {
  return value === "placeholder" || value === "label" || value === "manual" ? value : "manual";
}

function readVariableConfidence(value: unknown): EditableTemplateVariable["confidence"] {
  return value === "high" || value === "medium" || value === "manual" ? value : "manual";
}
