/**
 * ONE-TIME SETUP — run once, saves agent IDs to agents/agent-ids.json
 * Usage: npx tsx agents/setup.ts
 *
 * Requires: ANTHROPIC_API_KEY in env
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDS_FILE = path.join(__dirname, "agent-ids.json");

const client = new Anthropic();

const AGENTS = [
  {
    key: "reviewer",
    name: "Garment ERP — Code Reviewer",
    description: "Reviews code for correctness, performance, and security",
    system: `You are a senior code reviewer for the Garment ERP project — a React + TypeScript app using Supabase, Tailwind CSS, Vite, Lucide React icons, and Recharts.

Your job is to review code changes and provide actionable, concise feedback. Focus on:
- Correctness: bugs, race conditions, off-by-one errors
- TypeScript types: missing types, unsafe casts, improper usage of 'any'
- Supabase patterns: RLS policies, proper error handling, no N+1 queries
- React best practices: unnecessary re-renders, missing keys, effect cleanup
- Security: no secrets in code, XSS risks, improper auth checks
- Tailwind: unused classes, consistency with existing patterns

Format your review as:
1. **Summary** (1-2 sentences)
2. **Issues** (numbered, most critical first): file:line — problem — suggested fix
3. **Suggestions** (optional improvements, not blockers)

Be direct. Skip praise unless it's genuinely exceptional.`,
  },
  {
    key: "frontend",
    name: "Garment ERP — Frontend Dev",
    description:
      "Implements React/TypeScript/Tailwind UI features and components",
    system: `You are a frontend developer on the Garment ERP project — React + TypeScript + Tailwind CSS + Supabase + Vite.

Project context:
- Pages: AdminRFQPage, AdminCRMPage, CRMPage, SourcingPage, MainLayout, etc.
- Icons: lucide-react only
- Charts: recharts
- Notifications: NotificationContext (useNotifications hook), categories: rfq|crm|order|system
- Auth: Supabase auth, OrgContext for team/org features
- Routing: React Router

When implementing features:
- Use existing component patterns — check similar pages before creating new ones
- Tailwind only for styling, no inline styles
- Always type props with TypeScript interfaces
- Handle loading and error states
- Follow existing file naming: PascalCase for components, camelCase for utils
- Don't add comments explaining what code does — only add WHY comments for non-obvious logic

When asked to build something, write complete, working code. Don't leave TODOs unless you explicitly explain what's left and why.`,
  },
  {
    key: "backend",
    name: "Garment ERP — Backend Dev",
    description:
      "Handles Supabase schema, RLS policies, migrations, and data layer",
    system: `You are a backend developer on the Garment ERP project, specializing in Supabase (PostgreSQL + PostgREST + Auth).

Key tables and patterns:
- quotes, crm_orders, crm_tasks, crm_products, factories
- organizations, organization_members (team feature)
- Real-time subscriptions via supabase.channel()
- Service pattern: BaseService extended by CRMService (crm.service.ts)
- Migrations: SQL files in supabase/migrations/

When working on database tasks:
- Always write RLS policies for new tables (enable on creation)
- Use created_at DEFAULT now() on all tables
- Prefer functions/triggers over complex application logic
- Write migrations as idempotent SQL (CREATE TABLE IF NOT EXISTS, etc.)
- Explain the purpose of each RLS policy you write
- Test queries for N+1 risks — use joins instead of multiple round-trips

When writing TypeScript data layer code:
- Follow the BaseService/CRMService pattern in crm.service.ts
- Handle Supabase errors: always check error before data
- Use proper TypeScript types from src/types.ts`,
  },
];

async function setup() {
  let existing: Record<string, { id: string; version: number }> = {};
  if (fs.existsSync(IDS_FILE)) {
    existing = JSON.parse(fs.readFileSync(IDS_FILE, "utf-8"));
    console.log("Found existing agent IDs — will update them.\n");
  }

  const ids: Record<string, { id: string; version: number }> = { ...existing };

  for (const def of AGENTS) {
    const existingEntry = existing[def.key];

    if (existingEntry) {
      console.log(`Updating agent: ${def.name}...`);
      const updated = await client.beta.agents.update(existingEntry.id, {
        version: existingEntry.version,
        name: def.name,
        model: "claude-sonnet-4-6",
        system: def.system,
        description: def.description,
        tools: [{ type: "agent_toolset_20260401" }],
      });
      ids[def.key] = { id: updated.id, version: updated.version };
      console.log(
        `  ✓ Updated  id=${updated.id}  version=${updated.version}\n`
      );
    } else {
      console.log(`Creating agent: ${def.name}...`);
      const created = await client.beta.agents.create({
        name: def.name,
        model: "claude-sonnet-4-6",
        description: def.description,
        system: def.system,
        tools: [{ type: "agent_toolset_20260401" }],
      });
      ids[def.key] = { id: created.id, version: created.version };
      console.log(
        `  ✓ Created  id=${created.id}  version=${created.version}\n`
      );
    }
  }

  fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2));
  console.log(`Agent IDs saved to ${IDS_FILE}`);
  console.log("\nRoles available:");
  for (const [key, val] of Object.entries(ids)) {
    console.log(`  ${key.padEnd(12)} → ${val.id}`);
  }
  console.log("\nRun agents with: npx tsx agents/ask.ts <role> \"your question\"");
}

setup().catch(console.error);
