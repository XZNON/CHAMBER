export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateEdit(
  content: string,
  oldString: string,
  newString: string,
): ValidationResult {
  if (oldString === newString) {
    return { ok: false, error: "old_string and new_string are identical — no edit needed." };
  }

  const occurrences = content.split(oldString).length - 1;

  if (occurrences === 0) {
    return { ok: false, error: "old_string not found in file. Read the file first to get the exact text." };
  }

  if (occurrences >= 2) {
    return {
      ok: false,
      error: `old_string appears ${occurrences} times in file. Provide more surrounding context to make it unique.`,
    };
  }

  return { ok: true };
}
