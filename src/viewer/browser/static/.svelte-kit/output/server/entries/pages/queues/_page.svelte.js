import { U as ensure_array_like, W as attr_class, V as attr, $ as attr_style, Z as stringify, _ as head, X as store_get, Y as unsubscribe_stores } from "../../../chunks/index2.js";
import { e as escape_html } from "../../../chunks/context.js";
import { q as queuesError, i as isLoadingQueues, a as queues } from "../../../chunks/queues.js";
function QueueList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { queues: queues2 } = $$props;
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
    function formatDate(isoDate) {
      const date = new Date(isoDate);
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
      if (diffDays === 0) {
        return `Today at ${date.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })}`;
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" });
      }
    }
    function formatCost(cost) {
      return `$${cost.toFixed(2)}`;
    }
    function shortenPath(path) {
      const parts = path.split("/");
      if (parts.length > 3) {
        return `.../${parts.slice(-2).join("/")}`;
      }
      return path;
    }
    function calculateProgress(queue) {
      if (queue.commands.length === 0) {
        return 0;
      }
      const completed = queue.commands.filter((cmd) => cmd.status === "completed").length;
      return Math.round(completed / queue.commands.length * 100);
    }
    function getCompletedCount(queue) {
      const completed = queue.commands.filter((cmd) => cmd.status === "completed").length;
      return `${completed}/${queue.commands.length}`;
    }
    if (queues2.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card p-6"><p class="text-gray-500 dark:text-gray-400 text-center">No command queues found. Create a new queue to get started.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="space-y-3"><!--[-->`);
      const each_array = ensure_array_like(queues2);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let queue = each_array[$$index];
        $$renderer2.push(`<button class="card w-full p-4 hover:shadow-md transition-shadow text-left cursor-pointer"><div class="flex flex-col gap-3"><div class="flex items-start justify-between gap-3"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-2"><span${attr_class(`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stringify(getStatusBadgeClass(queue.status))}`)}>${escape_html(queue.status)}</span> <span class="text-xs text-gray-500 dark:text-gray-400">${escape_html(formatDate(queue.createdAt))}</span></div> <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">${escape_html(queue.name)}</p> <p class="text-xs text-gray-500 dark:text-gray-400 truncate"${attr("title", queue.projectPath)}>${escape_html(shortenPath(queue.projectPath))}</p></div> <div class="flex flex-col items-end gap-2 text-sm"><div class="flex items-center gap-1"><span class="text-gray-500 dark:text-gray-400">Cost:</span> <span class="font-medium text-gray-900 dark:text-gray-100">${escape_html(formatCost(queue.totalCostUsd))}</span></div></div></div> <div class="space-y-1"><div class="flex items-center justify-between text-xs"><span class="text-gray-600 dark:text-gray-400">Commands: ${escape_html(getCompletedCount(queue))}</span> <span class="text-gray-600 dark:text-gray-400">${escape_html(calculateProgress(queue))}%</span></div> <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div class="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"${attr_style(`width: ${stringify(calculateProgress(queue))}%`)}></div></div></div></div></button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("q0gb1p", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Queues - Claude Code Agent</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6"><div class="flex justify-between items-center"><h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Command Queues</h1> <button class="btn btn-primary">New Queue</button></div> `);
    if (store_get($$store_subs ??= {}, "$queuesError", queuesError) !== null) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"><p class="text-red-800 dark:text-red-200">${escape_html(store_get($$store_subs ??= {}, "$queuesError", queuesError))}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (store_get($$store_subs ??= {}, "$isLoadingQueues", isLoadingQueues)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card p-6"><p class="text-gray-500 dark:text-gray-400 text-center">Loading queues...</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      QueueList($$renderer2, {
        queues: store_get($$store_subs ??= {}, "$queues", queues)
      });
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
