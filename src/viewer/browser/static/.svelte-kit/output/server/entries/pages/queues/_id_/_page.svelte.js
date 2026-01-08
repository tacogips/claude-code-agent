import { W as attr_class, $ as attr_style, Z as stringify, U as ensure_array_like, V as attr, X as store_get, _ as head, Y as unsubscribe_stores } from "../../../../chunks/index2.js";
import { o as onDestroy } from "../../../../chunks/index-server.js";
import { p as page } from "../../../../chunks/stores.js";
import { e as escape_html } from "../../../../chunks/context.js";
import { u as unloadQueue, c as currentQueue, q as queuesError, b as isLoadingQueue } from "../../../../chunks/queues.js";
function QueueDetail($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { queue } = $$props;
    let expandedCommandIds = /* @__PURE__ */ new Set();
    function getStatusBadgeClass(status) {
      switch (status) {
        case "running":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "completed":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        case "failed":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        case "paused":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        case "stopped":
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
        case "pending":
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      }
    }
    function getCommandStatusBadgeClass(status) {
      switch (status) {
        case "running":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "completed":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        case "failed":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        case "skipped":
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
        case "pending":
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      }
    }
    function formatDate(isoDate) {
      const date = new Date(isoDate);
      return date.toLocaleString(void 0, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function formatCost(cost) {
      if (cost === void 0) {
        return "N/A";
      }
      return `$${cost.toFixed(2)}`;
    }
    function calculateProgress(queue2) {
      if (queue2.commands.length === 0) {
        return 0;
      }
      const completed = queue2.commands.filter((cmd) => cmd.status === "completed").length;
      return Math.round(completed / queue2.commands.length * 100);
    }
    function getCompletedCount(queue2) {
      const completed = queue2.commands.filter((cmd) => cmd.status === "completed").length;
      return `${completed}/${queue2.commands.length}`;
    }
    function isCommandExpanded(commandId) {
      return expandedCommandIds.has(commandId);
    }
    function truncateText(text, maxLength) {
      if (text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength) + "...";
    }
    function getCommandIndex(queue2, commandId) {
      const index = queue2.commands.findIndex((cmd) => cmd.id === commandId);
      return index + 1;
    }
    $$renderer2.push(`<div class="space-y-6"><div class="card p-6"><div class="space-y-4"><div class="flex items-start justify-between gap-4"><div class="flex-1 min-w-0"><h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">${escape_html(queue.name)}</h1> <p class="text-sm text-gray-600 dark:text-gray-400">${escape_html(queue.projectPath)}</p></div> <span${attr_class(`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stringify(getStatusBadgeClass(queue.status))}`)}>${escape_html(queue.status)}</span></div> <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><span class="text-gray-500 dark:text-gray-400 block">Created</span> <span class="text-gray-900 dark:text-gray-100 font-medium">${escape_html(formatDate(queue.createdAt))}</span></div> <div><span class="text-gray-500 dark:text-gray-400 block">Updated</span> <span class="text-gray-900 dark:text-gray-100 font-medium">${escape_html(formatDate(queue.updatedAt))}</span></div> <div><span class="text-gray-500 dark:text-gray-400 block">Commands</span> <span class="text-gray-900 dark:text-gray-100 font-medium">${escape_html(getCompletedCount(queue))}</span></div> <div><span class="text-gray-500 dark:text-gray-400 block">Total Cost</span> <span class="text-gray-900 dark:text-gray-100 font-medium">${escape_html(formatCost(queue.totalCostUsd))}</span></div></div> <div class="space-y-1"><div class="flex items-center justify-between text-xs"><span class="text-gray-600 dark:text-gray-400">Overall Progress</span> <span class="text-gray-600 dark:text-gray-400">${escape_html(calculateProgress(queue))}%</span></div> <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div class="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"${attr_style(`width: ${stringify(calculateProgress(queue))}%`)}></div></div></div></div></div> <div class="space-y-3"><h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Commands</h2> `);
    if (queue.commands.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card p-6"><p class="text-gray-500 dark:text-gray-400 text-center">No commands in this queue.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(queue.commands);
      for (let index = 0, $$length = each_array.length; index < $$length; index++) {
        let command = each_array[index];
        $$renderer2.push(`<div${attr_class(`card p-4 ${stringify(queue.currentIndex === index ? "border-primary-500 border-2" : "")}`)}><div class="space-y-3"><div class="flex items-start justify-between gap-3"><div class="flex-1 min-w-0 space-y-2"><div class="flex items-center gap-2"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Command #${escape_html(getCommandIndex(queue, command.id))}</span> <span${attr_class(`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stringify(getCommandStatusBadgeClass(command.status))}`)}>${escape_html(command.status)}</span> `);
        if (queue.currentIndex === index) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">Current</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">${escape_html(command.sessionMode)}</span></div> <button class="text-left w-full"><p class="text-sm text-gray-700 dark:text-gray-300">${escape_html(isCommandExpanded(command.id) ? command.prompt : truncateText(command.prompt, 150))}</p> `);
        if (command.prompt.length > 150) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="text-xs text-primary-600 dark:text-primary-400">${escape_html(isCommandExpanded(command.id) ? "Show less" : "Show more")}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></button></div> <div class="flex flex-col items-end gap-1 text-xs">`);
        if (command.costUsd !== void 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex items-center gap-1"><span class="text-gray-500 dark:text-gray-400">Cost:</span> <span class="font-medium text-gray-900 dark:text-gray-100">${escape_html(formatCost(command.costUsd))}</span></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (command.sessionId !== void 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<a${attr("href", `/sessions/${stringify(command.sessionId)}`)} class="text-primary-600 dark:text-primary-400 hover:underline">View Session</a>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></div> `);
        if (command.status === "completed" || command.status === "failed") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="border-t border-gray-200 dark:border-gray-700 pt-3"><div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">`);
          if (command.startedAt !== void 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div><span class="text-gray-500 dark:text-gray-400 block">Started</span> <span class="text-gray-900 dark:text-gray-100">${escape_html(formatDate(command.startedAt))}</span></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> `);
          if (command.completedAt !== void 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div><span class="text-gray-500 dark:text-gray-400 block">Completed</span> <span class="text-gray-900 dark:text-gray-100">${escape_html(formatDate(command.completedAt))}</span></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> `);
          if (command.sessionId !== void 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div><span class="text-gray-500 dark:text-gray-400 block">Session ID</span> <span class="text-gray-900 dark:text-gray-100 font-mono">${escape_html(command.sessionId.substring(0, 8))}...</span></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div> `);
          if (command.error !== void 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded"><p class="text-sm text-red-800 dark:text-red-200"><span class="font-medium">Error:</span> ${escape_html(command.error)}</p></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    store_get($$store_subs ??= {}, "$page", page).params.id;
    onDestroy(() => {
      unloadQueue();
    });
    head("70uf45", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>
    ${escape_html(store_get($$store_subs ??= {}, "$currentQueue", currentQueue) !== null ? `Queue: ${store_get($$store_subs ??= {}, "$currentQueue", currentQueue).name}` : "Queue")} - Claude Code
    Agent
  </title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6"><div><button class="btn btn-secondary text-sm inline-flex items-center gap-2"><span>←</span> Back to Queues</button></div> `);
    if (store_get($$store_subs ??= {}, "$queuesError", queuesError) !== null) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"><p class="text-red-800 dark:text-red-200">${escape_html(store_get($$store_subs ??= {}, "$queuesError", queuesError))}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (store_get($$store_subs ??= {}, "$isLoadingQueue", isLoadingQueue)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card p-6"><p class="text-gray-500 dark:text-gray-400 text-center">Loading queue...</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (store_get($$store_subs ??= {}, "$currentQueue", currentQueue) !== null) {
        $$renderer2.push("<!--[-->");
        QueueDetail($$renderer2, {
          queue: store_get($$store_subs ??= {}, "$currentQueue", currentQueue)
        });
      } else {
        $$renderer2.push("<!--[!-->");
        if (store_get($$store_subs ??= {}, "$queuesError", queuesError) === null) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="card p-6"><p class="text-gray-500 dark:text-gray-400 text-center">Queue not found.</p></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
