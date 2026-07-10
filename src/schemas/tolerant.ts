import { z } from "zod";

/**
 * Build a *coercive* clone of a Zod schema for validating MODEL OUTPUT only
 * (never sent to the model — the strict schema still drives structured output).
 *
 * Gemini intermittently returns a field with the wrong type — a null or an
 * OBJECT where a string is expected, a bare value where an array is expected,
 * etc. With a strict `.parse()` that throws, one such flake makes the whole item
 * get saved as an error and blocks all downstream enrichment (retrying 5× and
 * failing every time). Here every leaf coerces ANY input to its target type
 * (object → JSON string, missing → "", non-array → [it], etc.) so a usable
 * result is always produced. Enums stay strict (the one safety net: a genuinely
 * wrong critical value like a bad category still fails). Recurses through nested
 * objects and arrays.
 */
const toStr = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
};
const toNum = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return 0;
};
const toBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return Boolean(v);
};

function makeTolerant(t: z.ZodTypeAny): z.ZodTypeAny {
  if (t instanceof z.ZodString) return z.any().transform(toStr);
  if (t instanceof z.ZodNumber) return z.any().transform(toNum);
  if (t instanceof z.ZodBoolean) return z.any().transform(toBool);
  if (t instanceof z.ZodArray) {
    const el = makeTolerant((t as z.ZodArray<z.ZodTypeAny>).element);
    return z.preprocess((v) => (Array.isArray(v) ? v : v == null ? [] : [v]), z.array(el));
  }
  if (t instanceof z.ZodObject) {
    const next: Record<string, z.ZodTypeAny> = {};
    for (const [k, v] of Object.entries((t as z.ZodObject<z.ZodRawShape>).shape)) {
      next[k] = makeTolerant(v as z.ZodTypeAny);
    }
    return z.preprocess((v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}), z.object(next));
  }
  // Preserve genuine nullability (e.g. a url that is legitimately null); coerce inner.
  if (t instanceof z.ZodNullable || t instanceof z.ZodOptional) {
    return makeTolerant((t as z.ZodNullable<z.ZodTypeAny> | z.ZodOptional<z.ZodTypeAny>).unwrap()).nullish();
  }
  return t; // ZodEnum, ZodLiteral, etc. — stay strict
}

/** Returns a tolerant schema that still parses to the ORIGINAL inferred type
 *  (structurally identical — every field is coerced to its strict type), so
 *  downstream typed usage of the parsed value is preserved. */
export function tolerantOutput<T extends z.ZodTypeAny>(schema: T): z.ZodType<z.infer<T>> {
  return makeTolerant(schema) as unknown as z.ZodType<z.infer<T>>;
}
