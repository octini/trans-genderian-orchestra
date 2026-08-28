export interface CompletionSignal {
  complete: boolean;
  exitGate?: boolean;
}

export function parseCompletionSignal(text: string): CompletionSignal {
  try {
    const input = typeof text === "string" ? text : String(text ?? "");
    let complete = false;
    const lines = input.split(/\r?\n/);
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      // tolerant: line after trimming starts with STATUS: (case-insensitive)
      if (trimmed.length >= 7 && trimmed.slice(0, 7).toLowerCase() === "status:") {
        const value = trimmed.slice(7).trim().toLowerCase();
        if (value === "complete") {
          complete = true;
          break;
        }
      } else if (/^\s*STATUS\s*:/i.test(rawLine)) {
        // fallback regex for lines with leading spaces (already trimmed case handled above)
        // extract after colon
        const colon = rawLine.indexOf(":");
        if (colon !== -1) {
          const value = rawLine.slice(colon + 1).trim().toLowerCase();
          if (value === "complete") {
            complete = true;
            break;
          }
        }
      }
    }
    let exitGate: boolean | undefined;
    if (/"?exit\s*gate"?\s*:\s*true\b/i.test(input)) {
      exitGate = true;
    } else if (/"?exit\s*gate"?\s*:\s*false\b/i.test(input)) {
      exitGate = false;
    }
    const result: CompletionSignal = { complete };
    if (exitGate !== undefined) result.exitGate = exitGate;
    return result;
  } catch {
    return { complete: false };
  }
}

export type Condition<T> = (input: T) => boolean;

export const and =
  <T>(...cs: Condition<T>[]) =>
  (i: T): boolean =>
    cs.every((c) => c(i));

export const or =
  <T>(...cs: Condition<T>[]) =>
  (i: T): boolean =>
    cs.some((c) => c(i));

export const not =
  <T>(c: Condition<T>) =>
  (i: T): boolean =>
    !c(i);

export interface TerminationInput {
  signal: CompletionSignal;
  exitGateRequired: boolean;
  toolCallsAfterCompletion: number;
}

export const terminationDecision: Condition<TerminationInput> = and(
  (i) => i.signal.complete,
  (i) => !i.exitGateRequired || i.signal.exitGate === true,
  (i) => i.toolCallsAfterCompletion >= 1,
);
