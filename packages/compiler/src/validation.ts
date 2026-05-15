import Ajv2020 from "ajv/dist/2020";
import type { DeckSpec, ValidationResult } from "./types";

export function validateDeckSpec(spec: unknown, schema: Record<string, unknown>): ValidationResult {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(spec);

  return {
    ok,
    errors:
      validate.errors?.map((error) => {
        const path = error.instancePath || "/";
        return `${path} ${error.message ?? "is invalid"}`;
      }) ?? [],
  };
}

export function assertDeckSpec(spec: unknown): asserts spec is DeckSpec {
  if (typeof spec !== "object" || spec === null || !("meta" in spec) || !("slides" in spec)) {
    throw new Error("Invalid DeckSpec shape");
  }
}
