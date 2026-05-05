/**
 * Ask a dev agent a question or paste code for review.
 *
 * Usage:
 *   npx tsx agents/ask.ts reviewer "Review this file:" < src/App.tsx
 *   npx tsx agents/ask.ts frontend "Add a loading spinner to AdminRFQPage"
 *   npx tsx agents/ask.ts backend "Write an RLS policy for the new invoices table"
 *
 * Roles: reviewer | frontend | backend
 * Requires: ANTHROPIC_API_KEY in env, run setup.ts first
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDS_FILE = path.join(__dirname, "agent-ids.json");

const client = new Anthropic();

async function ask(role: string, question: string) {
  if (!fs.existsSync(IDS_FILE)) {
    console.error("No agent IDs found. Run: npx tsx agents/setup.ts first");
    process.exit(1);
  }

  const ids: Record<string, { id: string; version: number }> = JSON.parse(
    fs.readFileSync(IDS_FILE, "utf-8")
  );

  if (!ids[role]) {
    console.error(
      `Unknown role: "${role}". Available: ${Object.keys(ids).join(", ")}`
    );
    process.exit(1);
  }

  const { id: agentId, version } = ids[role];

  // Create environment for the session
  const env = await client.beta.environments.create({
    name: `garment-erp-session-${Date.now()}`,
    config: { type: "cloud", networking: { type: "unrestricted" } },
  });

  // Create session pinned to the agent version
  const session = await client.beta.sessions.create({
    agent: { type: "agent", id: agentId, version },
    environment_id: env.id,
    title: `${role} — ${question.slice(0, 60)}`,
  });

  // Stream-first, then send
  const streamPromise = client.beta.sessions.events.stream(session.id);

  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: question }],
      },
    ],
  });

  const stream = await streamPromise;

  console.log(`\n[${role.toUpperCase()} AGENT]\n`);

  for await (const event of stream) {
    if (event.type === "agent.message") {
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
    } else if (event.type === "session.status_terminated") {
      break;
    } else if (event.type === "session.status_idle") {
      if (event.stop_reason?.type !== "requires_action") break;
    }
  }

  console.log("\n");

  // Cleanup
  await client.beta.sessions.archive(session.id).catch(() => {});
}

// Read piped stdin if available
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

const [, , role, ...rest] = process.argv;
if (!role) {
  console.error(
    "Usage: npx tsx agents/ask.ts <role> \"question\"\nRoles: reviewer | frontend | backend"
  );
  process.exit(1);
}

const questionArg = rest.join(" ");
const stdin = await readStdin();
const question = stdin
  ? `${questionArg}\n\n\`\`\`\n${stdin}\n\`\`\``
  : questionArg;

if (!question.trim()) {
  console.error("No question provided.");
  process.exit(1);
}

ask(role, question).catch(console.error);
