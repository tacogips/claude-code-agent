/**
 * Typed event emitter for SDK events.
 *
 * Provides a type-safe event emitter that ensures event types
 * and their payloads are correctly matched at compile time.
 *
 * @module sdk/events/emitter
 */

import type { EventMap, EventType } from "./types";

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
  /** Map of event types to arrays of handlers */
  private readonly handlers: Map<EventType, Set<EventHandler<EventType>>> =
    new Map();

  /** Map of one-time handlers */
  private readonly onceHandlers: Map<EventType, Set<EventHandler<EventType>>> =
    new Map();

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
    let handlerSet = this.handlers.get(event);
    if (handlerSet === undefined) {
      handlerSet = new Set();
      this.handlers.set(event, handlerSet);
    }

    // Cast is safe because we're using the correct event type
    const typedHandler = handler as EventHandler<EventType>;
    handlerSet.add(typedHandler);

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
    const handlerSet = this.handlers.get(event);
    if (handlerSet !== undefined) {
      handlerSet.delete(handler as EventHandler<EventType>);
      if (handlerSet.size === 0) {
        this.handlers.delete(event);
      }
    }

    const onceSet = this.onceHandlers.get(event);
    if (onceSet !== undefined) {
      onceSet.delete(handler as EventHandler<EventType>);
      if (onceSet.size === 0) {
        this.onceHandlers.delete(event);
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
    let onceSet = this.onceHandlers.get(event);
    if (onceSet === undefined) {
      onceSet = new Set();
      this.onceHandlers.set(event, onceSet);
    }

    const typedHandler = handler as EventHandler<EventType>;
    onceSet.add(typedHandler);

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
    // Call regular handlers
    const handlerSet = this.handlers.get(event);
    if (handlerSet !== undefined) {
      for (const handler of handlerSet) {
        try {
          handler(data);
        } catch (error: unknown) {
          // Log but don't throw - one handler error shouldn't affect others
          console.error(
            `Error in event handler for ${event}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    // Call and remove once handlers
    const onceSet = this.onceHandlers.get(event);
    if (onceSet !== undefined) {
      // Create a copy to iterate since we're modifying the set
      const handlers = Array.from(onceSet);
      this.onceHandlers.delete(event);

      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error: unknown) {
          console.error(
            `Error in once handler for ${event}:`,
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
    const regularCount = this.handlers.get(event)?.size ?? 0;
    const onceCount = this.onceHandlers.get(event)?.size ?? 0;
    return regularCount + onceCount;
  }

  /**
   * Remove all listeners for a specific event or all events.
   *
   * @param event - Optional event type. If omitted, removes all listeners.
   */
  removeAllListeners(event?: EventType): void {
    if (event !== undefined) {
      this.handlers.delete(event);
      this.onceHandlers.delete(event);
    } else {
      this.handlers.clear();
      this.onceHandlers.clear();
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
