/**
 * claude-code-peeper - Main entry point
 *
 * peeper
 */

import { greet } from "./lib";

function main(): void {
  const message = greet("World");
  console.log(message);
}

main();
