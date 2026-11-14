/**
 * Typed event emitter for SDK events.
 *
 * Provides a type-safe event emitter that ensures event types
 * and their payloads are correctly matched at compile time.
 * Built on top of mitt for a lightweight, battle-tested implementation.
 *
 * @module sdk/events/emitter
 */

import mitt from "mitt";

import { createTaggedLogger } from "../../logger";
import type { EventMap, EventType } from "./types";

const logger = createTaggedLogger("events");

// Internal type for mitt compatibility - uses string index
type MittEvents = {
  [K in EventType]: EventMap[K];
};

// Internal handler type for mitt
type InternalHandler = (event: unknown) => void;

/**
 * Handler function type for event callbacks.
 */
export type EventHandler<E extends EventType> = (event: EventMap[E]) => void;

/**
 * Subscription handle for removing event listeners.
 */
export interface Subscription {
  /** Remove this subscription */
  unsubscribe(): void;
}

/**
 * Typed event emitter for SDK events.
 *
 * Provides on/off/once/emit methods with full type safety.
 * Event types are checked at compile time to ensure handlers
 * receive the correct event payload.
 *
 * @example
 * ```typescript
 * const emitter = new EventEmitter();
 *
 * // Type-safe: handler receives SessionStartedEvent
 * emitter.on("session_started", (event) => {
 *   console.log(event.sessionId);
 * });
 *
 * // Type-safe: emit requires SessionStartedEvent payload
 * emitter.emit("session_started", {
 *   type: "session_started",
 *   timestamp: new Date().toISOString(),
 *   sessionId: "abc123",
 *   projectPath: "/path/to/project",
 * });
 * ```
 */
export class EventEmitter {
  /** Underlying mitt emitter - uses internal type */
  private readonly emitter = mitt<MittEvents>();

  /** Map of one-time handlers to their wrapper functions */
  private readonly onceWrappers: Map<
    EventType,
    Map<InternalHandler, InternalHandler>
  > = new Map();

  /**
   * Subscribe to an event.
   *
   * The handler will be called every time the event is emitted.
   *
   * @param event - Event type to subscribe to
   * @param handler - Handler function to call
   * @returns Subscription handle for unsubscribing
   */
  on<E extends EventType>(event: E, handler: EventHandler<E>): Subscription {
    this.emitter.on(event, handler as InternalHandler);

    return {
      unsubscribe: () => {
        this.off(event, handler);
      },
    };
  }

  /**
   * Unsubscribe from an event.
   *
   * Removes the handler so it will no longer be called.
   *
   * @param event - Event type to unsubscribe from
   * @param handler - Handler function to remove
   */
  off<E extends EventType>(event: E, handler: EventHandler<E>): void {
    this.emitter.off(event, handler as InternalHandler);

    // Also remove from once handlers if present
    const eventOnceWrappers = this.onceWrappers.get(event);
    if (eventOnceWrappers !== undefined) {
      const wrapper = eventOnceWrappers.get(handler as InternalHandler);
      if (wrapper !== undefined) {
        this.emitter.off(event, wrapper);
        eventOnceWrappers.delete(handler as InternalHandler);
        if (eventOnceWrappers.size === 0) {
          this.onceWrappers.delete(event);
        }
      }
    }
  }

  /**
   * Subscribe to an event once.
   *
   * The handler will be called only the first time the event is emitted,
   * then automatically unsubscribed.
   *
   * @param event - Event type to subscribe to
   * @param handler - Handler function to call once
   * @returns Subscription handle for early unsubscription
   */
  once<E extends EventType>(event: E, handler: EventHandler<E>): Subscription {
    const wrapper: InternalHandler = (data) => {
      // Remove the wrapper first
      this.emitter.off(event, wrapper);

      // Remove from tracking map
      const eventOnceWrappers = this.onceWrappers.get(event);
      if (eventOnceWrappers !== undefined) {
        eventOnceWrappers.delete(handler as InternalHandler);
        if (eventOnceWrappers.size === 0) {
          this.onceWrappers.delete(event);
        }
      }

      // Call the handler with error protection
      try {
        handler(data as EventMap[E]);
      } catch (error: unknown) {
        logger.error(
          `Error in once handler for ${event}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    };

    // Track the wrapper so we can remove it via off()
    let eventOnceWrappers = this.onceWrappers.get(event);
    if (eventOnceWrappers === undefined) {
      eventOnceWrappers = new Map();
      this.onceWrappers.set(event, eventOnceWrappers);
    }
    eventOnceWrappers.set(handler as InternalHandler, wrapper);

    this.emitter.on(event, wrapper);

    return {
      unsubscribe: () => {
        this.off(event, handler);
      },
    };
  }

  /**
   * Emit an event to all subscribers.
   *
   * Calls all registered handlers for the event type.
   * One-time handlers are called and then removed.
   *
   * @param event - Event type to emit
   * @param data - Event payload
   */
  emit<E extends EventType>(event: E, data: EventMap[E]): void {
    // Get the handlers before emitting (for error handling)
    const handlers = this.emitter.all.get(event) as
      | InternalHandler[]
      | undefined;

    if (handlers !== undefined && handlers.length > 0) {
      // Call handlers with error protection
      for (const handler of [...handlers]) {
        try {
          handler(data);
        } catch (error: unknown) {
          logger.error(
            `Error in event handler for ${event}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
  }

  /**
   * Get the number of listeners for an event.
   *
   * @param event - Event type to check
   * @returns Number of registered handlers
   */
  listenerCount(event: EventType): number {
    const handlers = this.emitter.all.get(event);
    return handlers?.length ?? 0;
  }

  /**
   * Remove all listeners for a specific event or all events.
   *
   * @param event - Optional event type. If omitted, removes all listeners.
   */
  removeAllListeners(event?: EventType): void {
    if (event !== undefined) {
      // Remove all handlers for the specific event
      const handlers = this.emitter.all.get(event);
      if (handlers !== undefined) {
        // Clear the handlers array
        handlers.length = 0;
      }
      // Also clear once wrappers for this event
      this.onceWrappers.delete(event);
    } else {
      // Remove all handlers for all events
      this.emitter.all.clear();
      this.onceWrappers.clear();
    }
  }

  /**
   * Wait for an event to be emitted.
   *
   * Returns a promise that resolves with the event payload
   * when the event is emitted.
   *
   * @param event - Event type to wait for
   * @returns Promise resolving to the event payload
   */
  waitFor<E extends EventType>(event: E): Promise<EventMap[E]> {
    return new Promise((resolve) => {
      this.once(event, (data) => {
        resolve(data);
      });
    });
  }
}

/**
 * Create a new event emitter instance.
 */
export function createEventEmitter(): EventEmitter {
  return new EventEmitter();
}
