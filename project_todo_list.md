# REACH CRM - Project Task List

This task list is generated based on the REACH PRD v1.1, Design Language v1.1, and Tech Stack v1.1 documents. Each task is sequential, atomic, and structured to prevent overlapping dependencies.

## Phase 1: Environment & Scaffolding
- [ ] **Task 1.1**: Initialize monorepo structure using pnpm workspaces (create directories for `apps/crm` and `apps/channel-stub`).
- [x] **Task 1.2**: Initialize Next.js 14 (App Router) in `apps/crm` with TypeScript, Tailwind CSS, and Lucide React.
- [x] **Task 1.3**: Initialize Express.js in `apps/channel-stub` with TypeScript, Socket.io, and basic error handling.
- [x] **Task 1.4**: Create a local `docker-compose.yml` at the root for a PostgreSQL 16 database.
- [x] **Task 1.5**: Initialize Prisma in `apps/crm` and connect it to the local Docker PostgreSQL database.

## Phase 2: Data Layer & Seeding (F-01)
- [x] **Task 2.1**: Define the Prisma Schema (`Customer`, `Order`, `Segment`, `Campaign`, `Communication`, `CommEvent`) including the unique composite index for idempotency on `CommEvent`.
- [x] **Task 2.2**: Generate the Prisma client and run the initial database migration (`npx prisma migrate dev`).
- [x] **Task 2.3**: Write a database seed script (`seed.ts`) to generate realistic mock `Customer` and `Order` data, including pre-calculated RFM (Recency, Frequency, Monetary) scores.
- [x] **Task 2.4**: Create a CSV ingestion API endpoint (`POST /api/customers/upload`) that parses a CSV and upserts records into the database.

## Phase 3: Design System & Core UI (REACH Design Language)
- [x] **Task 3.1**: Extend `tailwind.config.js` with REACH semantic color tokens (`ink-navy`, `electric-blue`, `signal-green`, `coral-accent`, etc.) and the 4px-based spacing scale.
- [x] **Task 3.2**: Implement global typography (Inter for body, DM Sans for display) using `next/font/google`.
- [x] **Task 3.3**: Build the global Layout shell: fixed left sidebar (dark) with navigation icons, top bar, and a fluid light-grey content canvas.
- [x] **Task 3.4**: Build reusable atomic UI components: Buttons (Primary, AI/Accent, Secondary, Danger) and Status Badges (Delivered, Pending, AI Draft, etc.).

## Phase 4: Customer View & AI Foundations (F-02, F-04, F-05)
- [x] **Task 4.1**: Build `GET /api/customers` endpoint with support for pagination and basic searching.
- [x] **Task 4.2**: Implement the Customer List Page UI: a data table displaying name, email, RFM score badges, and last purchase date.
- [x] **Task 4.3**: Create `lib/ai.ts` abstraction layer and configure the Groq SDK with `llama-3.3-70b-versatile`.
- [x] **Task 4.4**: Build the Groq AI Intent Parser function that translates natural language text into a structured JSON segment filter.
- [x] **Task 4.5**: Build the Groq AI Message Drafter function that accepts audience context and outputs personalized copy using dynamic tokens.

## Phase 5: Segmentation UI (F-03, F-04)
- [x] **Task 5.1**: Build `POST /api/segments/evaluate` to return the customer count and preview list based on a provided JSON filter.
- [x] **Task 5.2**: Build the Manual Segment Builder UI components (dropdowns/inputs for recency, frequency, spend, lifecycle).
- [x] **Task 5.3**: Build the AI Sidebar Drawer UI that accepts natural language input, calls the AI Intent Parser, and maps the output back into the Segment Builder UI.

## Phase 6: The Channel Stub Service (F-07)
- [x] **Task 6.1**: In `apps/channel-stub`, implement the `POST /send` endpoint that accepts an array of communications.
- [x] **Task 6.2**: Implement the async callback engine inside the stub: an event loop that simulates delivery outcomes (Delivered, Failed, Opened, Clicked) after randomized delays.
- [x] **Task 6.3**: Add exponential backoff retry logic (1s -> 2s -> 4s -> dead letter) to the callback engine for failed CRM receipt deliveries.
- [x] **Task 6.4**: Initialize the Socket.io server within the stub service to emit live event updates to connected clients.

## Phase 7: Campaign Orchestration (F-06, F-08)
- [x] **Task 7.1**: Build the CRM Receipt API (`POST /api/receipts`) to handle incoming callbacks from the stub. Ensure idempotent inserts into the `CommEvent` table.
- [x] **Task 7.2**: Build the Campaign Creator UI flow: Step 1 (Select/Build Segment), Step 2 (Draft Message with AI assist), Step 3 (Review & Send).
- [x] **Task 7.3**: Implement the `POST /api/campaigns/fire` endpoint that creates `Communication` records for the segment and forwards the payload to the channel stub's `POST /send` endpoint.

## Phase 8: Analytics & Real-Time Tracking (F-09, F-10)
- [x] **Task 8.1**: Build the Campaign Analytics Dashboard UI with aggregated KPI cards (Total Sent, Delivery Rate, Open Rate, Failures).
- [x] **Task 8.2**: Build the Per-Campaign Drilldown API and UI, showing a list of all recipients and their current delivery status.
- [x] **Task 8.3**: Integrate the Socket.io client in the Next.js Drilldown page to listen for live events from the channel stub and optimistically update the communication status badges.

## Phase 9: Deployment & Validation
- [ ] **Task 9.1**: Provision Azure Database for PostgreSQL Flexible Server and update production `.env` variables.
- [ ] **Task 9.2**: Configure GitHub Actions workflow to deploy `apps/crm` to Azure Static Web Apps.
- [ ] **Task 9.3**: Configure GitHub Actions workflow to deploy `apps/channel-stub` to Azure App Service.
- [ ] **Task 9.4**: Perform end-to-end testing: upload a CSV, build an AI segment, draft an AI message, fire the campaign, and verify real-time callback ingestion.
