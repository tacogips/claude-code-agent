/**
 * claude-code-peeper - Main entry point
 *
 * peeper
 */

import { greet } from "./lib";
import { logger } from "./logger";

function main(): void {
  const message = greet("World");
  logger.log(message);
}

main();
