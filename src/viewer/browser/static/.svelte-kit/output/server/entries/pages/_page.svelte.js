import { V as attr, U as ensure_array_like, W as attr_class, Z as stringify, _ as head } from "../../chunks/index2.js";
import { e as escape_html } from "../../chunks/context.js";
function SessionList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { sessions } = $$props;
    let searchQuery = "";
    let selectedProject = "all";
    let sortBy = "date";
    let projects = (() => {
      if (!sessions || !Array.isArray(sessions)) return [];
      const projectSet = new Set(sessions.map((s) => s.projectPath));
      return Array.from(projectSet).sort();
    })();
    let filteredSessions = (() => {
      if (!sessions || !Array.isArray(sessions)) return [];
      return sessions.filter((session) => {
        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const projectPath = session.projectPath.toLowerCase();
          const sessionId = session.id.toLowerCase();
          return projectPath.includes(query) || sessionId.includes(query);
        }
        return true;
      });
    })();
    let sortedSessions = (() => {
      const sorted = [...filteredSessions];
      sorted.sort((a, b) => {
        let comparison = 0;
        {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return -comparison;
      });
      return sorted;
    })();
    function getStatusBadgeClass(status) {
      switch (status) {
        case "active":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "completed":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        case "failed":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        case "paused":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
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
      if (cost === void 0) {
        return "N/A";
      }
      return `$${cost.toFixed(2)}`;
    }
    function shortenPath(path) {
      const parts = path.split("/");
      if (parts.length > 3) {
        return `.../${parts.slice(-2).join("/")}`;
      }
      return path;
    }
    $$renderer2.push(`<div class="space-y-4"><div class="flex flex-col sm:flex-row gap-4"><div class="flex-1"><input type="search"${attr("value", searchQuery)} placeholder="Search by project path or session ID..." class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"/></div> <div>`);
    $$renderer2.select(
      {
        value: selectedProject,
        class: "px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All Projects`);
        });
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(projects);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let project = each_array[$$index];
          $$renderer3.option({ value: project }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(shortenPath(project))}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</div> <div class="flex gap-2"><button${attr_class("btn btn-secondary text-sm svelte-1h8243g", void 0, { "active": sortBy === "date" })}>Date ${escape_html("↓")}</button> <button${attr_class("btn btn-secondary text-sm svelte-1h8243g", void 0, { "active": sortBy === "cost" })}>Cost ${escape_html("")}</button> <button${attr_class("btn btn-secondary text-sm svelte-1h8243g", void 0, { "active": sortBy === "messages" })}>Messages ${escape_html("")}</button></div></div> <div class="text-sm text-gray-600 dark:text-gray-400">Showing ${escape_html(sortedSessions.length)} of ${escape_html(sessions.length)} sessions</div> `);
    if (sortedSessions.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card p-6"><p class="text-gray-500 dark:text-gray-400 text-center">${escape_html("No sessions found. Start a Claude Code session to see it here.")}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="space-y-3"><!--[-->`);
      const each_array_1 = ensure_array_like(sortedSessions);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let session = each_array_1[$$index_1];
        $$renderer2.push(`<button class="card w-full p-4 hover:shadow-md transition-shadow text-left cursor-pointer"><div class="flex flex-col sm:flex-row justify-between gap-3"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-2"><span${attr_class(`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stringify(getStatusBadgeClass(session.status))}`, "svelte-1h8243g")}>${escape_html(session.status)}</span> <span class="text-xs text-gray-500 dark:text-gray-400">${escape_html(formatDate(session.createdAt))}</span></div> <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"${attr("title", session.projectPath)}>${escape_html(session.projectPath)}</p> <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">ID: ${escape_html(session.id)}</p></div> <div class="flex sm:flex-col sm:items-end gap-4 sm:gap-2 text-sm"><div class="flex items-center gap-1"><span class="text-gray-500 dark:text-gray-400">Messages:</span> <span class="font-medium text-gray-900 dark:text-gray-100">${escape_html(session.messageCount)}</span></div> `);
        if (session.costUsd !== void 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex items-center gap-1"><span class="text-gray-500 dark:text-gray-400">Cost:</span> <span class="font-medium text-gray-900 dark:text-gray-100">${escape_html(formatCost(session.costUsd))}</span></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (session.tokenUsage) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><span>${escape_html((session.tokenUsage.input + session.tokenUsage.output).toLocaleString())} tokens</span></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></div></button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let sessions = [];
    let loading = true;
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Sessions - Claude Code Agent</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6"><div class="flex justify-between items-center"><h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Sessions</h1> <button class="btn btn-secondary"${attr("disabled", loading, true)} aria-label="Refresh sessions">${escape_html("Loading...")}</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
      if (sessions.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="card p-6"><p class="text-gray-500 dark:text-gray-400 text-center">Loading sessions...</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        SessionList($$renderer2, { sessions });
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
