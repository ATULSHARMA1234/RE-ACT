
# RADIANCE CRM — AI-Native Marketing & Engagement Platform

> An intelligent, AI-first Customer Relationship Management platform built for D2C beauty brands. RADIANCE doesn't just store customer data — it **thinks**, **segments**, **drafts**, and **delivers** campaigns autonomously using an agentic AI copilot.

<p align="center">
  <strong>Built with</strong><br/>
  Next.js 14 · Prisma · PostgreSQL (Neon) · Groq (LLaMA 3.3 70B) · Google Gemini 2.0 Flash · Socket.IO · React Flow · Recharts
</p>

### 🌐 Live Demo

| Service | URL |
|---|---|
| **CRM Dashboard** | [re-act-crm-dashboard.onrender.com](https://re-act-crm-dashboard.onrender.com) |
| **Channel Stub** | [radiancechannel-stub.onrender.com](https://radiancechannel-stub.onrender.com) |

---

## ✨ Key Features

### 🧠 AI-Native (Not Bolted On)
AI is woven into **every layer** of the product:

| Feature | What It Does |
|---|---|
| **Aura AI Chat Copilot** | Full agentic chat — ask questions, create segments, launch campaigns, query data — all in natural language |
| **AI Segmentation** | Describe your audience in plain English → AI generates structured filters → instant preview |
| **AI Copywriter** | Provide a campaign goal → AI drafts personalized message copy with template tokens ({{first_name}}, {{last_product}}) |
| **AI Workflow Generator** | Describe an automation → AI generates a full visual workflow with triggers, delays, splits, and actions |
| **Agentic Voice Copilot** | Speak to the CRM: "Create a win-back campaign for dormant VIPs via WhatsApp" → AI parses intent → confirms → executes |
| **Proactive AI Advisor** | AI analyzes your database stats and proactively recommends 3 targeted campaigns with one-click launch |
| **Revenue Attribution AI** | AI generates actionable insights from channel revenue attribution data |
| **Dual-Provider Resilience** | Groq (LLaMA 3.3 70B) as primary with automatic Gemini 2.0 Flash fallback — 5-8s timeout ensures fast responses |

### 📊 Campaign Lifecycle
- Multi-channel support: **Email, WhatsApp, SMS**
- Full delivery pipeline: `PENDING → SENT → DELIVERED → OPENED → READ → CLICKED` (or `FAILED`)
- **Real-time tracking** via WebSockets — watch delivery events stream in live
- Campaign drilldown with conversion funnel, status distribution, and per-recipient status log
- **Follow-up campaigns** — target recipients by engagement status (Opened, Clicked, Failed, etc.)
- AI creates campaigns as **DRAFT** → review → **Launch** with one click

### 👥 Customer Intelligence
- Customer 360° drawer with order history, lifetime value, and engagement timeline
- **RFM scoring engine** with configurable thresholds (HIGH_VALUE / MID_TIER / LOW_VALUE)
- **Lifecycle stage automation** (NEW → ACTIVE → AT_RISK → DORMANT) based on recency rules
- Bulk CSV upload and JSON ingestion API
- Paginated customer table with search

### 🔄 Visual Workflow Builder
- Drag-and-drop React Flow canvas
- 5 node types: Trigger, Delay, Split (A/B), Message, Action
- AI-generated workflows from natural language
- Save, edit, and manage automation sequences

### 📈 Analytics & Dashboard
- Real-time conversion funnel (Sent → Delivered → Opened → Clicked)
- Engagement heatmap by day-of-week and time-of-day
- Channel performance breakdown (volume, delivery rate, open rate)
- Revenue Attribution Matrix with AI insights
- Live Feed page showing real-time delivery events via WebSocket

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────┐
│              RADIANCE CRM (Next.js on Render)          │
│                                                        │
│  ┌──────────┐  ┌───────────┐  ┌─────────────────────┐ │
│  │ Dashboard │  │ Segments  │  │ Campaign Creator    │ │
│  │ Analytics │  │ Customers │  │ Workflow Builder    │ │
│  │ Settings  │  │ Customer  │  │ Aura AI Chat        │ │
│  │ Live Feed │  │   360°    │  │ Voice Copilot       │ │
│  └──────────┘  └───────────┘  └─────────────────────┘ │
│                        │                               │
│              ┌─────────┴──────────┐                    │
│              │   API Routes       │                    │
│              │  /api/campaigns/*  │                    │
│              │  /api/customers/*  │                    │
│              │  /api/segments/*   │                    │
│              │  /api/receipts     │◄──── Callback ─────┤─── Channel Stub
│              │  /api/ai/*         │                    │    (Render)
│              └─────────┬──────────┘                    │
│                        │                               │
│              ┌─────────┴──────────┐                    │
│              │   Prisma ORM       │                    │
│              │   Neon PostgreSQL   │                    │
│              └────────────────────┘                    │
└────────────────────────────────────────────────────────┘
                         │
                    Fire /send
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│              Channel Stub Service (Render)             │
│              (Express + Socket.IO)                     │
│                                                        │
│  1. Receives batch of communications                   │
│  2. Simulates delivery lifecycle (90% success rate)    │
│  3. Fires async callbacks to CRM /api/receipts        │
│  4. Emits WebSocket events for live UI updates         │
│  5. Exponential backoff retry on callback failures     │
└────────────────────────────────────────────────────────┘
```

### Data Flow: Campaign Delivery
```
User creates campaign (or AI drafts it) → Launch → /api/campaigns/fire
  ├── 1. Evaluates segment filter → finds matching customers
  ├── 2. Creates/updates Campaign record (status: SENDING)
  ├── 3. Creates Communication records (status: PENDING)
  ├── 4. Sends batch to Channel Stub /send
  │       └── Stub ACKs with 202 → Campaign → SENT
  └── 5. Stub asynchronously processes each message:
          ├── SENT event → callback to /api/receipts
          ├── DELIVERED event (90%) → callback
          ├── OPENED event (40% of delivered) → callback
          ├── READ event (70% of opened) → callback
          ├── CLICKED event (20% of opened) → callback
          └── FAILED event (10%) → callback
              └── Retry with exponential backoff (up to 3 attempts)
```

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | Server Components for DB queries, Client Components for interactivity |
| **Styling** | Tailwind CSS | Custom design system with semantic tokens (brand colors, typography) |
| **Database** | PostgreSQL (Neon) | Serverless Postgres with branching, hosted on Neon |
| **ORM** | Prisma 7 | Type-safe queries, migrations, schema-as-code |
| **AI (Primary)** | Groq + LLaMA 3.3 70B | Ultra-fast inference (~200ms), structured JSON output |
| **AI (Fallback)** | Google Gemini 2.0 Flash | Automatic failover with 5-8s timeout |
| **Real-time** | Socket.IO | WebSocket events for live campaign tracking |
| **Charts** | Recharts | Responsive, composable React charting |
| **Workflows** | React Flow (@xyflow/react) | Drag-and-drop node graph editor |
| **Icons** | Lucide React | Consistent, tree-shakeable SVG icons |
| **Channel Stub** | Express.js | Lightweight microservice simulating message delivery |
| **Hosting** | Render | Both services deployed as Web Services |
| **Monorepo** | pnpm Workspaces | Shared dependencies, single install |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- pnpm (`npm i -g pnpm`)
- Docker (for local PostgreSQL) or a Neon database URL
- A [Groq API key](https://console.groq.com) (free tier)
- A [Google AI API key](https://aistudio.google.com/apikey) (free tier, for Gemini fallback)

### 1. Clone & Install
```bash
git clone https://github.com/ATULSHARMA1234/RE-ACT.git
cd RE-ACT
pnpm install
```

### 2. Start PostgreSQL (if using Docker)
```bash
docker compose up -d
```

### 3. Configure Environment
Create `apps/crm/.env`:
```env
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5433/reach_crm"
GROQ_API_KEY="your-groq-api-key"
GOOGLE_API_KEY="your-google-ai-api-key"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
CHANNEL_STUB_URL="http://localhost:3001"
```

### 4. Initialize Database
```bash
cd apps/crm
npx prisma db push
npx prisma generate
```

### 5. Run Both Services
```bash
# Terminal 1: CRM App (port 3000)
cd apps/crm && pnpm dev

# Terminal 2: Channel Stub (port 3001)
cd apps/channel-stub && pnpm dev
```

### 6. Seed Demo Data
Open `http://localhost:3000/settings` → Data Management → click **Seed Database** (generates 1000 customers with order history, then recalculates RFM scores and lifecycle stages).

---

## 📁 Project Structure

```
RE-ACT/
├── apps/
│   ├── crm/                           # Main CRM application (Next.js)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx           # Landing page
│   │   │   │   ├── dashboard/         # Main dashboard with stat widgets
│   │   │   │   ├── campaigns/         # Campaign list, creator, drilldown report
│   │   │   │   ├── customers/         # Customer table with 360° drawer
│   │   │   │   ├── segments/          # Segment builder (manual + AI)
│   │   │   │   ├── workflows/         # Workflow list + React Flow editor
│   │   │   │   ├── analytics/         # Revenue attribution + campaign analytics
│   │   │   │   ├── aura/              # Dedicated Aura AI chat page
│   │   │   │   ├── live-feed/         # Real-time WebSocket delivery feed
│   │   │   │   ├── settings/          # RFM rules, lifecycle config, data mgmt
│   │   │   │   └── api/
│   │   │   │       ├── ai/            # chat, voice-agent, advisor, execute-tool
│   │   │   │       ├── campaigns/     # fire, draft, [id]/report, [id]/followup
│   │   │   │       ├── customers/     # list, upload, recalculate
│   │   │   │       ├── segments/      # CRUD, evaluate
│   │   │   │       ├── receipts/      # Delivery callback handler
│   │   │   │       ├── live-feed/     # SSE feed endpoint
│   │   │   │       ├── analytics/     # Dashboard analytics data
│   │   │   │       ├── ingest/        # JSON customer ingestion
│   │   │   │       ├── dashboard/     # Dashboard widget data
│   │   │   │       ├── settings/      # Settings CRUD
│   │   │   │       └── workflows/     # Workflow CRUD
│   │   │   ├── components/
│   │   │   │   ├── AppShell.tsx       # Sidebar layout shell
│   │   │   │   ├── CopilotWidget.tsx  # Floating Aura AI chat widget
│   │   │   │   ├── CommandPalette.tsx # Voice command palette (Ctrl+K)
│   │   │   │   ├── ProactiveAdvisor   # AI campaign recommendation cards
│   │   │   │   ├── dashboard/         # Dashboard widget components
│   │   │   │   ├── customers/         # Customer360Drawer
│   │   │   │   └── workflows/         # Custom React Flow nodes
│   │   │   └── lib/
│   │   │       ├── ai.ts              # All AI functions (dual-provider)
│   │   │       └── prisma.ts          # Prisma client singleton
│   │   ├── prisma/
│   │   │   └── schema.prisma          # Database schema (8 models)
│   │   ├── tailwind.config.ts         # Design system tokens
│   │   └── package.json
│   │
│   └── channel-stub/                  # Delivery simulation microservice
│       ├── src/index.ts               # Express + Socket.IO server
│       └── package.json
│
├── .github/workflows/deploy.yml       # CI/CD (GitHub Actions)
├── docker-compose.yml                 # Local PostgreSQL container
├── pnpm-workspace.yaml                # Monorepo workspace config
└── package.json                       # Root package
```

---

## 🧪 Scale Assumptions & Tradeoffs

### Conscious Tradeoffs (MVP)
| Decision | Tradeoff | Production Alternative |
|---|---|---|
| **In-memory segment filtering** | Order-aggregate filters (min_spend, min_orders) evaluated in JS | Push to SQL with aggregate subqueries or materialized views |
| **Individual Communication INSERTs** | N separate INSERT queries for N recipients | `createMany()` or bulk SQL INSERT with batching |
| **Synchronous stub call** | Campaign fire blocks until stub ACKs | Redis/BullMQ job queue with consumer workers |
| **Single-instance stub** | No horizontal scaling | Kubernetes deployment with load balancer |
| **Dual AI providers** | Two API keys required | Single fine-tuned model or self-hosted LLM |

### What We'd Add at Scale
- **Message Queue** (Redis + BullMQ): Decouple campaign firing from delivery processing
- **Read Replicas**: Separate read/write database connections for analytics vs. transactions
- **Rate Limiting**: Per-channel rate limits to respect provider quotas
- **Observability**: Structured logging (Pino), distributed tracing (OpenTelemetry)
- **CDC (Change Data Capture)**: Stream database changes to analytics pipelines

---

## 👤 Author

**Atul Sharma** — [github.com/ATULSHARMA1234](https://github.com/ATULSHARMA1234)

Built as part of the Xeno SDE Internship Assignment (2026).
