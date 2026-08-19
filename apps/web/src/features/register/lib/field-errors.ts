import type { z } from "zod";

/**
 * A reader for one step's validation messages, taken live off the step's own zod schema.
 *
 * The register flow used to report a failed submit with a toast carrying `issues[0].message`,
 * which said one thing about a form that might have six problems and never said WHICH control
 * it meant. The gate in `form/wizard-nav` already answers both questions — it points at the
 * first offending control, scrolls to it and focuses it — but it can only do that for fields
 * that have told it they are invalid, and a field learns that from its `error` prop.
 *
 * So the schema stays the single source of truth and this is the adapter. It reads ONE field
 * at a time, against that field's own branch of the schema, because the call site is inside a
 * `<form.Field>` render prop: that subscribes to exactly one value and re-runs when it
 * changes, so the message tracks what the user is typing without the step re-rendering on
 * every keystroke. Every rule in this flow is per-field, so nothing is lost by not parsing the
 * object as a whole.
 *
 * Nothing is DISPLAYED as a result — `useGateField` shows a message only once `validate()` has
 * flagged that field — so a freshly-arrived step is silent even though every empty required
 * control is already, correctly, invalid.
 *
 * The FIRST issue wins: zod reports `min` before `email` on an empty string, and
 * "กรุณาระบุอีเมล" is the more useful of the two while the box is still blank.
 */
export function fieldErrorReader(
  schema: z.ZodObject<z.ZodRawShape>,
): (field: string, value: unknown) => string | null {
  return (field, value) => {
    /*
     * Parsed as a one-key object rather than by reaching into `schema.shape`, which hands back
     * zod's internal node type rather than a parser. The other keys are absent and raise their
     * own issues; filtering by path is what keeps this field's answer to itself.
     */
    const result = schema.safeParse({ [field]: value });
    if (result.success) {
      return null;
    }
    return result.error.issues.find((issue) => issue.path[0] === field)?.message ?? null;
  };
}
