<script lang="ts">
  import "../app.css";
  import { page } from "$app/stores";

  let { children } = $props();

  let isDark = $state(true);

  function toggleTheme() {
    isDark = !isDark;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  }

  // Initialize theme on mount
  $effect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  });

  const navLinks = [
    { href: "/", label: "Sessions" },
    { href: "/queues", label: "Queues" },
  ];

  function isActive(href: string, currentPath: string): boolean {
    if (href === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(href);
  }
</script>

<div class="min-h-screen flex flex-col">
  <!-- Navigation Header -->
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo and Navigation -->
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <span class="text-xl font-bold text-primary-600 dark:text-primary-400">
              Claude Code Agent
            </span>
          </div>
          <nav class="hidden sm:ml-8 sm:flex sm:space-x-4 items-center">
            {#each navLinks as link}
              <a
                href={link.href}
                class="nav-link"
                class:active={isActive(link.href, $page.url.pathname)}
              >
                {link.label}
              </a>
            {/each}
          </nav>
        </div>

        <!-- Theme Toggle -->
        <div class="flex items-center">
          <button
            onclick={toggleTheme}
            class="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle theme"
          >
            {#if isDark}
              <!-- Sun icon for light mode -->
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            {:else}
              <!-- Moon icon for dark mode -->
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <nav class="sm:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-2">
      <div class="flex space-x-4">
        {#each navLinks as link}
          <a
            href={link.href}
            class="nav-link"
            class:active={isActive(link.href, $page.url.pathname)}
          >
            {link.label}
          </a>
        {/each}
      </div>
    </nav>
  </header>

  <!-- Main Content -->
  <main class="flex-1">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {@render children()}
    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Claude Code Agent Viewer
      </p>
    </div>
  </footer>
</div>
