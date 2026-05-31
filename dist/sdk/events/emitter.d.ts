/**
 * Typed event emitter for SDK events.
 *
 * Provides a type-safe event emitter that ensures event types
 * and their payloads are correctly matched at compile time.
 * Built on top of mitt for a lightweight, battle-tested implementation.
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
export declare class EventEmitter {
    /** Underlying mitt emitter - uses internal type */
    private readonly emitter;
    /** Map of one-time handlers to their wrapper functions */
    private readonly onceWrappers;
    /**
     * Subscribe to an event.
     *
     * The handler will be called every time the event is emitted.
     *
     * @param event - Event type to subscribe to
     * @param handler - Handler function to call
     * @returns Subscription handle for unsubscribing
     */
    on<E extends EventType>(event: E, handler: EventHandler<E>): Subscription;
    /**
     * Unsubscribe from an event.
     *
     * Removes the handler so it will no longer be called.
     *
     * @param event - Event type to unsubscribe from
     * @param handler - Handler function to remove
     */
    off<E extends EventType>(event: E, handler: EventHandler<E>): void;
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
    once<E extends EventType>(event: E, handler: EventHandler<E>): Subscription;
    /**
     * Emit an event to all subscribers.
     *
     * Calls all registered handlers for the event type.
     * One-time handlers are called and then removed.
     *
     * @param event - Event type to emit
     * @param data - Event payload
     */
    emit<E extends EventType>(event: E, data: EventMap[E]): void;
    /**
     * Get the number of listeners for an event.
     *
     * @param event - Event type to check
     * @returns Number of registered handlers
     */
    listenerCount(event: EventType): number;
    /**
     * Remove all listeners for a specific event or all events.
     *
     * @param event - Optional event type. If omitted, removes all listeners.
     */
    removeAllListeners(event?: EventType): void;
    /**
     * Wait for an event to be emitted.
     *
     * Returns a promise that resolves with the event payload
     * when the event is emitted.
     *
     * @param event - Event type to wait for
     * @returns Promise resolving to the event payload
     */
    waitFor<E extends EventType>(event: E): Promise<EventMap[E]>;
}
/**
 * Create a new event emitter instance.
 */
export declare function createEventEmitter(): EventEmitter;
//# sourceMappingURL=emitter.d.ts.map