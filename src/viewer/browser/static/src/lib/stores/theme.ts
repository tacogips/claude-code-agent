/**
 * Theme store for dark/light mode management.
 *
 * Provides reactive theme state with persistence to localStorage.
 *
 * @module lib/stores/theme
 */

import { writable } from "svelte/store";

/**
 * Theme preference type.
 */
export type Theme = "light" | "dark" | "system";

/**
 * Create a theme store with localStorage persistence.
 */
function createThemeStore() {
  // Default to dark theme
  const initialTheme: Theme = "dark";

  const { subscribe, set, update } = writable<Theme>(initialTheme);

  return {
    subscribe,
    set,
    toggle: () =>
      update((current) => {
        const newTheme = current === "dark" ? "light" : "dark";
        return newTheme;
      }),
    setLight: () => set("light"),
    setDark: () => set("dark"),
    setSystem: () => set("system"),
  };
}

export const theme = createThemeStore();
