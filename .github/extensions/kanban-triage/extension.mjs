// Extension: kanban-triage
// A Kanban canvas for prioritizing and loading GitHub issues into the current session context.

import { createServer } from "node:http";
import { URL } from "node:url";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const servers = new Map();
const DEFAULT_REPOSITORY = "Arjun-333/tailspin-toys";

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function scoreIssue(issue) {
    const labels = issue.labels.map((label) => label.name.toLowerCase());
    let score = 0;
    if (labels.some((label) => /critical|urgent|security|blocker/.test(label))) score += 12;
    if (labels.some((label) => /bug|regression|broken/.test(label))) score += 8;
    if (labels.some((label) => /priority|important|p0|p1/.test(label))) score += 6;
    score += Math.min(issue.comments, 5);
    const ageInDays = (Date.now() - new Date(issue.updated_at).getTime()) / 86400000;
    if (ageInDays < 3) score += 4;
    else if (ageInDays < 14) score += 2;
    return score;
}

function explainPriority(issue, rank) {
    const labels = issue.labels.map((label) => label.name.toLowerCase());
    const reasons = [];
    if (labels.some((label) => /critical|urgent|security|blocker/.test(label))) reasons.push("high-impact label");
    if (labels.some((label) => /bug|regression|broken/.test(label))) reasons.push("bug/regression label");
    if (issue.comments > 0) reasons.push(`${issue.comments} comment${issue.comments === 1 ? "" : "s"}`);
    if (reasons.length === 0) reasons.push("recently updated or otherwise active");
    return `Ranked #${rank} because it has ${reasons.join(", ")}.`;
}

async function fetchIssues(repository) {
    const response = await fetch(`https://api.github.com/repos/${repository}/issues?state=open&per_page=30`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "kanban-triage-canvas" },
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status} while loading issues.`);
    const issues = await response.json();
    return issues.filter((issue) => !issue.pull_request).sort((a, b) => scoreIssue(b) - scoreIssue(a));
}

function renderIssue(issue, priority) {
    return `<article class="card">
      <div class="card-top"><span class="number">#${issue.number}</span><span class="meta">${escapeHtml(new Date(issue.updated_at).toLocaleDateString())}</span></div>
      <h3>${escapeHtml(issue.title)}</h3>
      <p>${escapeHtml(issue.body || "No description provided.")}</p>
      <div class="labels">${issue.labels.map((label) => `<span>${escapeHtml(label.name)}</span>`).join("")}</div>
      ${priority ? `<div class="why"><strong>Why now:</strong> ${escapeHtml(priority)}</div>` : ""}
      <button data-issue="${escapeHtml(JSON.stringify({ number: issue.number, title: issue.title, url: issue.html_url, body: issue.body || "" }))}">Add to current context</button>
    </article>`;
}

function renderHtml(repository, issues, errorMessage) {
    const top = issues.slice(0, 3);
    const remainder = issues.slice(3);
    return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Issue triage</title>
    <style>
      :root { color-scheme: light dark; } body { margin: 0; padding: 20px; background: var(--background-color-default,#fff); color: var(--text-color-default,#1f2328); font: 14px/1.45 var(--font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif); }
      h1 { margin: 0 0 4px; font-size: 24px; } h2 { margin: 24px 0 10px; font-size: 16px; } .subtle,.meta { color: var(--text-color-muted,#656d76); }
      .board { display: grid; gap: 12px; } .card { border: 1px solid var(--border-color-default,#d0d7de); border-radius: 8px; padding: 14px; background: var(--background-color-default,#fff); }
      .card-top { display:flex; justify-content:space-between; } .number { font-weight: 600; color: var(--true-color-blue,#0969da); } h3 { margin: 6px 0; font-size: 16px; } p { margin: 8px 0; white-space: pre-wrap; }
      .labels { display:flex; flex-wrap:wrap; gap: 5px; margin: 10px 0; } .labels span { border-radius: 999px; padding: 2px 8px; background: var(--true-color-blue-muted,#ddf4ff); font-size: 12px; }
      .why { margin: 10px 0; padding: 8px; border-left: 3px solid var(--true-color-orange,#bc4c00); background: var(--background-color-muted,#f6f8fa); }
      button { border: 1px solid var(--border-color-default,#d0d7de); border-radius: 6px; padding: 7px 10px; background: var(--background-color-default,#fff); color: inherit; cursor: pointer; } button:hover { border-color: var(--true-color-blue,#0969da); }
      .empty { padding: 16px; border: 1px dashed var(--border-color-default,#d0d7de); border-radius: 8px; } .status { min-height: 20px; color: var(--text-color-muted,#656d76); }
    </style>
  </head>
  <body>
    <h1>Issue triage</h1><div class="subtle">${escapeHtml(repository)} · open issues</div><div class="status">${escapeHtml(errorMessage || "")}</div>
    <h2>Needs attention now</h2>
    <section class="board">${top.length ? top.map((issue, index) => renderIssue(issue, explainPriority(issue, index + 1))).join("") : '<div class="empty">No open issues found.</div>'}</section>
    <h2>Remaining open issues</h2>
    <section class="board">${remainder.length ? remainder.map((issue) => renderIssue(issue, "")).join("") : '<div class="empty">All open issues are shown above.</div>'}</section>
    <script>
      document.querySelectorAll("button").forEach((button) => button.addEventListener("click", async () => {
        button.disabled = true; button.textContent = "Adding...";
        const issue = JSON.parse(button.dataset.issue);
        const response = await fetch("/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(issue) });
        button.textContent = response.ok ? "Added to context" : "Could not add";
      }));
    </script>
  </body>
</html>`;
}

async function startServer(repository, session) {
    const state = { issues: [], errorMessage: "" };
    try {
        state.issues = await fetchIssues(repository);
    } catch (error) {
        state.errorMessage = error instanceof Error ? error.message : "Unable to load GitHub issues.";
    }
    const server = createServer(async (req, res) => {
        const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
        if (req.method === "POST" && requestUrl.pathname === "/context") {
            let body = "";
            for await (const chunk of req) body += chunk;
            const issue = JSON.parse(body);
            await session.send({ prompt: `Add GitHub issue #${issue.number} to the current context and start working on it.\n\nTitle: ${issue.title}\nURL: ${issue.url}\n\nDescription:\n${issue.body}` });
            res.writeHead(204).end();
            return;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderHtml(repository, state.issues, state.errorMessage));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/`, repository, state };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "kanban-triage",
            displayName: "Issue triage board",
            description: "A Kanban board that ranks open GitHub issues and adds selected issues to the current session context.",
            inputSchema: {
                type: "object",
                properties: { repository: { type: "string", description: "GitHub repository in owner/name form." } },
                additionalProperties: false,
            },
            actions: [
                {
                    name: "refresh",
                    description: "Reload the issue ranking from GitHub.",
                    handler: async (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        if (!entry) return { refreshed: false, reason: "Canvas is not open." };
                        entry.state.issues = await fetchIssues(entry.repository);
                        entry.state.errorMessage = "";
                        return { refreshed: true, issueCount: entry.state.issues.length };
                    },
                },
            ],
            open: async (ctx) => {
                const repository = typeof ctx.input?.repository === "string" && ctx.input.repository.includes("/")
                    ? ctx.input.repository
                    : DEFAULT_REPOSITORY;
                let entry = servers.get(ctx.instanceId);
                if (!entry || entry.repository !== repository) {
                    if (entry) await new Promise((resolve) => entry.server.close(() => resolve()));
                    entry = await startServer(repository, session);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Issue triage board", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
