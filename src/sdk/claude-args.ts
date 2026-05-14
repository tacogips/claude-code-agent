const PRINT_MODE_FLAGS = new Set([
  "-p",
  "--print",
  "--output-format",
  "--input-format",
]);

/**
 * Reject print-mode-only Claude Code flags from caller-provided passthrough
 * arguments before they can reach an internal spawn path.
 */
export function assertNoPrintModeArgs(
  args: readonly string[],
  source: string,
): void {
  const blockedArg = args.find((arg) => {
    if (PRINT_MODE_FLAGS.has(arg)) {
      return true;
    }

    return (
      arg.startsWith("--output-format=") || arg.startsWith("--input-format=")
    );
  });

  if (blockedArg !== undefined) {
    throw new Error(
      `${source} cannot include Claude Code print-mode argument: ${blockedArg}`,
    );
  }
}
