import { U as ensure_array_like, V as attr, W as attr_class, X as store_get, Y as unsubscribe_stores } from "../../chunks/index2.js";
import { g as getContext, e as escape_html } from "../../chunks/context.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children } = $$props;
    const navLinks = [
      { href: "/", label: "Sessions" },
      { href: "/queues", label: "Queues" }
    ];
    function isActive(href, currentPath) {
      if (href === "/") {
        return currentPath === "/";
      }
      return currentPath.startsWith(href);
    }
    $$renderer2.push(`<div class="min-h-screen flex flex-col"><header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between h-16"><div class="flex"><div class="flex-shrink-0 flex items-center"><span class="text-xl font-bold text-primary-600 dark:text-primary-400">Claude Code Agent</span></div> <nav class="hidden sm:ml-8 sm:flex sm:space-x-4 items-center"><!--[-->`);
    const each_array = ensure_array_like(navLinks);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let link = each_array[$$index];
      $$renderer2.push(`<a${attr("href", link.href)}${attr_class("nav-link", void 0, {
        "active": isActive(link.href, store_get($$store_subs ??= {}, "$page", page).url.pathname)
      })}>${escape_html(link.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></nav></div> <div class="flex items-center"><button class="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500" aria-label="Toggle theme">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`);
    }
    $$renderer2.push(`<!--]--></button></div></div></div> <nav class="sm:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-2"><div class="flex space-x-4"><!--[-->`);
    const each_array_1 = ensure_array_like(navLinks);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let link = each_array_1[$$index_1];
      $$renderer2.push(`<a${attr("href", link.href)}${attr_class("nav-link", void 0, {
        "active": isActive(link.href, store_get($$store_subs ??= {}, "$page", page).url.pathname)
      })}>${escape_html(link.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></div></nav></header> <main class="flex-1"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`);
    children($$renderer2);
    $$renderer2.push(`<!----></div></main> <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><p class="text-center text-sm text-gray-500 dark:text-gray-400">Claude Code Agent Viewer</p></div></footer></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
