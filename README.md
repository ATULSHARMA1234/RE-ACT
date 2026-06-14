
# RADIANCE CRM — AI-Native Marketing & Engagement Platform

> An intelligent, AI-first Customer Relationship Management platform built for D2C brands. RADIANCE doesn't just store customer data — it **thinks**, **segments**, **drafts**, and **delivers** campaigns autonomously using an agentic AI copilot.

<p align="center">
  <strong>Built with</strong><br/>
  Next.js 14 · Prisma · PostgreSQL · Groq (LLaMA 3.3 70B) · Socket.IO · React Flow · Recharts
</p>

---

## ✨ Key Features

### 🧠 AI-Native (Not Bolted On)
AI is woven into **every layer** of the product:

| Feature | What It Does |
|---|---|
| **AI Segmentation** | Describe your audience in plain English → AI generates structured filters → instant preview |
| **AI Copywriter** | Provide a campaign goal → AI drafts personalized message copy with template tokens |
| **AI Workflow Generator** | Describe an automation → AI generates a full visual workflow with triggers, delays, splits, and actions |
| **Agentic Voice Copilot** | Speak to the CRM: "Create a win-back campaign for dormant VIPs via WhatsApp" → AI parses intent → confirms → executes |
| **Proactive AI Advisor** | AI analyzes your database stats and proactively recommends 3 targeted campaigns |
| **Revenue Attribution AI** | AI generates actionable insights from channel revenue attribution data |

### 📊 Campaign Lifecycle
- Multi-channel support: **Email, WhatsApp, SMS**
- Full delivery pipeline: `PENDING → SENT → DELIVERED → OPENED → READ → CLICKED` (or `FAILED`)
- **Real-time tracking** via WebSockets — watch delivery events stream in live
- **Retry failed deliveries** with one click
- Campaign drilldown with funnel analysis and per-recipient status log

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
- Aggregate analytics page with top campaigns table

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────┐
│                    RADIANCE CRM (Next.js)                 │
│                                                        │
│  ┌──────────┐  ┌───────────┐  ┌─────────────────────┐ │
│  │ Dashboard │  │ Segments  │  │ Campaign Creator    │ │
│  │ Analytics │  │ Customers │  │ Workflow Builder    │ │
│  │ Settings  │  │ Customer  │  │ Voice Copilot       │ │
│  │           │  │   360°    │  │ Proactive Advisor   │ │
│  └──────────┘  └───────────┘  └─────────────────────┘ │
│                        │                               │
│              ┌─────────┴──────────┐                    │
│              │   API Routes       │                    │
│              │  /api/campaigns/*  │                    │
│              │  /api/customers/*  │                    │
│              │  /api/segments/*   │                    │
│              │  /api/receipts     │◄──── Callback ─────┤─── Channel Stub
│              │  /api/ai/*         │                    │      (port 3001)
│              └─────────┬──────────┘                    │
│                        │                               │
│              ┌─────────┴──────────┐                    │
│              │   Prisma ORM       │                    │
│              │   PostgreSQL       │                    │
│              └────────────────────┘                    │
└────────────────────────────────────────────────────────┘
                         │
                    Fire /send
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│              Channel Stub Service                      │
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
User creates campaign → /api/campaigns/fire
  ├── 1. Evaluates segment filter → finds matching customers
  ├── 2. Creates Campaign record (status: SENDING)
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
| **Styling** | Tailwind CSS | Custom design system with semantic tokens |
| **Database** | PostgreSQL 16 | Relational data with foreign keys, composite unique constraints |
| **ORM** | Prisma 7 | Type-safe queries, migrations, schema-as-code |
| **AI** | Groq + LLaMA 3.3 70B | Ultra-fast inference (~200ms), structured JSON output |
| **Real-time** | Socket.IO | WebSocket events for live campaign tracking |
| **Charts** | Recharts | Responsive, composable React charting |
| **Workflows** | React Flow (@xyflow/react) | Drag-and-drop node graph editor |
| **Channel Stub** | Express.js | Lightweight microservice simulating message delivery |
| **Containerization** | Docker Compose | One-command PostgreSQL setup |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL)
- A [Groq API key](https://console.groq.com) (free tier)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/RE-ACT.git
cd RE-ACT
pnpm install
```

### 2. Start PostgreSQL
```bash
docker compose up -d
```

### 3. Configure Environment
Create `apps/crm/.env`:
```env
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5433/reach_crm"
GROQ_API_KEY="your-groq-api-key"
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
# Terminal 1: CRM App
cd apps/crm && npm run dev

# Terminal 2: Channel Stub
cd apps/channel-stub && npm run dev
```

### 6. Seed Demo Data
Open `http://localhost:3000/settings` → Data Management → click **Seed Database** (generates 1000 customers with order history, then recalculates RFM scores and lifecycle stages).

---

## 🧪 Scale Assumptions & Tradeoffs

### Conscious Tradeoffs (MVP)
| Decision | Tradeoff | Production Alternative |
|---|---|---|
| **In-memory segment filtering** | Order-aggregate filters (min_spend, min_orders) are evaluated in JS after fetching from DB | Push to SQL with aggregate subqueries or materialized views |
| **Individual Communication INSERTs** | N separate INSERT queries for N recipients | `createMany()` or bulk SQL INSERT with batching |
| **Synchronous stub call** | Campaign fire blocks until stub ACKs | Redis/BullMQ job queue with consumer workers |
| **Single-instance stub** | No horizontal scaling | Kubernetes deployment with load balancer |
| **Groq/LLaMA for all AI** | Single model for all tasks | Fine-tuned models per task, or GPT-4 for complex reasoning |

### What We'd Add at Scale
- **Message Queue** (Redis + BullMQ): Decouple campaign firing from delivery processing. Enable backpressure, dead letter queues, and retry without blocking the API.
- **Read Replicas**: Separate read/write database connections for analytics queries vs. transactional writes.
- **Rate Limiting**: Per-channel rate limits to respect provider quotas (e.g., WhatsApp Business API limits).
- **Observability**: Structured logging (Pino), distributed tracing (OpenTelemetry), metrics (Prometheus/Grafana).
- **CDC (Change Data Capture)**: Stream database changes to analytics pipelines instead of polling.

---

## 📁 Project Structure

```
RE-ACT/
├── apps/
│   ├── crm/                          # Main CRM application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── dashboard/        # Main dashboard with widgets
│   │   │   │   ├── campaigns/        # Campaign list, creator, drilldown
│   │   │   │   ├── customers/        # Customer table
│   │   │   │   ├── segments/         # Segment builder (manual + AI)
│   │   │   │   ├── workflows/        # Workflow list + React Flow editor
│   │   │   │   ├── analytics/        # Aggregate analytics page
│   │   │   │   ├── settings/         # RFM rules, lifecycle config, data mgmt
│   │   │   │   └── api/
│   │   │   │       ├── campaigns/    # fire, draft, [id]/retry
│   │   │   │       ├── customers/    # list, upload, recalculate
│   │   │   │       ├── segments/     # CRUD, evaluate
│   │   │   │       ├── receipts/     # Delivery callback handler
│   │   │   │       ├── ingest/       # JSON customer ingestion
│   │   │   │       ├── dashboard/    # Dashboard widget data
│   │   │   │       └── ai/           # voice-agent, advisor, chat, draft
│   │   │   ├── components/
│   │   │   │   ├── dashboard/        # Widget components
│   │   │   │   ├── customers/        # Customer360Drawer
│   │   │   │   ├── workflows/        # Custom React Flow nodes
│   │   │   │   ├── CopilotWidget.tsx # Agentic Voice Copilot
│   │   │   │   └── ProactiveAdvisor.tsx
│   │   │   └── lib/
│   │   │       ├── ai.ts             # All AI functions (7 total)
│   │   │       └── prisma.ts         # Prisma client singleton
│   │   └── prisma/
│   │       └── schema.prisma         # Database schema (8 models)
│   └── channel-stub/                 # Delivery simulation microservice
│       └── src/index.ts              # Express + Socket.IO server
├── docker-compose.yml                # PostgreSQL container
└── package.json                      # Monorepo root (pnpm workspaces)
```

---

## 📄 License

This project was built as part of the Xeno SDE Internship Assignment (2026).
