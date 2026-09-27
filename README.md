# LLM Metering & Billing Engine

> A high-throughput, idempotent LLM metering, quota enforcement, and subscription billing engine built with **Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL, and Stripe**.

Answers three fundamental questions in usage-based SaaS:
1. **How much has this tenant used?** (Exact token accounting with cached input & reasoning breakdown)
2. **What does it cost?** (Deterministic, pinned multi-token pricing math)
3. **Have they hit their limit?** (Pre-flight quota checks, 30-day billing windows with stripe)

---

## System Architecture

```mermaid
flowchart TD
    Client["Client"]
    
    subgraph Engine ["LLM Metering & Billing Engine"]
        Gateway["Express API Gateway"]
        AuthMiddleware["JWT Auth Middleware"]
        IdempCheck["Idempotency & Cache Guard"]
        QuotaCheck["Quota & Cycle Validator"]
        LLMProvider["LLM Inference Simulation"]
        CostEngine["Token Cost Engine"]
        Ledger["Append-Only Usage Ledger"]
        StripeController["Stripe Checkout & Webhook"]
    end
    
    subgraph Storage ["PostgreSQL (Drizzle ORM)"]
        UsersDB[("users")]
        PlansDB[("plans")]
        SubsDB[("subscriptions")]
        EventsDB[("usage_events")]
        StripeEventsDB[("stripe_event")]
    end
    
    subgraph External ["External Services"]
        StripeAPI["Stripe API & Webhooks"]
    end

    Client -->|"HTTP Request + JWT + Idempotency-Key"| Gateway
    Gateway --> AuthMiddleware
    AuthMiddleware --> IdempCheck
    
    IdempCheck -->|"Key Exists -> return Cached LLM output"| Client
    IdempCheck -->|"New Key"| QuotaCheck
    
    QuotaCheck -->|"429 (Quota Exceeded) / 402 (Past Due)"| Client
    QuotaCheck -->|"Quota OK"| LLMProvider
    
    LLMProvider --> CostEngine
    CostEngine --> Ledger
    Ledger --> EventsDB
    
    Client -->|"POST /subscription/subscripe"| StripeController
    StripeController -->|"Create Session"| StripeAPI
    StripeAPI -->|"POST /webhook (Raw Body + Signature)"| StripeController
    StripeController --> StripeEventsDB
    StripeController --> SubsDB
```


## Request Lifecycle & Idempotency Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as Gateway / Middleware
    participant DB as PostgreSQL 
    participant LLM as LLM Engine
    
    Client->>API: POST /llm/generate (Headers: JWT, Idempotency-Key)
    API->>API: Verify JWT signature & extract tenant ID
    API->>DB: Check usage_events for existing Idempotency-Key
    
    alt Idempotency Key Already Exists (Client Retry)
        DB-->>API: Found existing event
        API-->>Client: 200 OK (cached: true, 0 duplicate tokens charged)
    else First Time Request
        API->>DB: Query active subscription, 30-day cycle, & current quota
        alt Quota Exceeded (Tokens or Requests)
            API-->>Client: 429 Too Many Requests (QUOTA_EXCEEDED)
        else Subscription Expired (> 30 days)
            API->>DB: Update subscription status to 'Past_due'
            API-->>Client: 402 Payment Required (SUBSCRIPTION_EXPIRED)
        else Quota Available
            API->>LLM: Generate response
            LLM-->>API: Tokens: Input, Cached Input, Reasoning, Output
            API->>API: Calculate cost via pinned pricing constants
            API->>DB: Insert usage event into append-only ledger
            API-->>Client: 200 OK (answer, usage breakdown, remaining quota, cost)
        end
    end
```

--->


## Key Features

### 1. Robust Metering & Deduplication
- Track each usage event with tokens used
- No double counting: Every billable action requries unique "idempotency-key", replays returns cached response.

### 2. Quota & State Enforcement
- **Multi-Tier Limits**: Checks both `tokens_limit` and `requests_limit`.
- **Automatic State Transitions**: Automatically change the subscription state when it "Past_due", or "Limit_Exceeded"

### 3. End-to-End Stripe Integration
- Add Stripe as a main payment method
- Listen for stripe events with webhooks 

### 4. Monthly Usage & Cost Rollup 
- `GET /usage` provides the user with:
  - Token breakdown (input, cached, reasoning, output)
  - Cost breakdown (tokens costs)
  - Remaining quota balance

---

##  Database Schema

```mermaid
erDiagram
    users ||--o{ subscriptions : "has"
    plans ||--o{ subscriptions : "defines limits"
    subscriptions ||--o{ usage_events : "accumulates"
    
    users {
        int id PK
        varchar name
        varchar email UK
        varchar password_hash
        timestamp created_at
    }
    
    plans {
        int id PK
        enum name UK "Free, Pro"
        int price_in_cents
        int tokens_limit
        int requests_limit
    }
    
    subscriptions {
        int id PK
        int user_id FK
        int plan_id FK
        text stripe_subscription_id
        enum status "Active, Past_due, Limit_Exceeded, Canceled"
        timestamp start_date
        timestamp updated_at
    }
    
    usage_events {
        int id PK
        int subscription_id FK
        text request_id UK "Idempotency Key, and it is unqiue with subscription_id together"
        int input_tokens
        int output_tokens
        int reasoning_tokens
        int cached_tokens
        int total_tokens "Generated: input + cached + reasoning + output"
        int cost_in_cents
        timestamp created_at
    }

    stripe_event {
        int id PK
        varchar stripe_event_id UK "Stripe evt_ ID"
        varchar type
        timestamp received_at
    }
```

---

## Setup

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook forwarding
- (optional) [Docker](https://www.docker.com/) & Docker Compose
---

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/alyHusseinn/llm-metricing-billing-engine.git
cd llm-metricing-billing-engine
pnpm install
```

---

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
PORT=3000
JWT_SECRET=super-secret-jwt-key
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICEID=price_...
APP_URL=http://localhost:3000
NODE_ENV=development
```
---

### 3. Start Database & Seed Plans
Start the PostgreSQL container:
```bash
docker compose up -d
```

Seed the default subscription tiers (`Free` and `Pro`):
```bash
pnpm db:seed
```

---

### 4. Push database schema
```bash
pnpm db:push
```
---

### 4. Run Development Server
```bash
pnpm dev
```
The server will start at `http://localhost:3000`.

---

### 5. Forward Stripe Webhooks Locally
```bash
stripe listen --forward-to localhost:3000/webhook --events=checkout.session.completed,customer.subscription.updated,customer.subscription.deleted
```
Copy the printed webhook secret (`whsec_...`) into your `.env` as `STRIPE_WEBHOOK_SECRET`.


## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/health` | No | Server health check (`{ "health": "zy el fol" }`) |
| `POST` | `/auth/signup` | No | Create account & automatically initialize `Free` subscription |
| `POST` | `/auth/login` | No | Authenticate with email/password and obtain JWT |
| `POST` | `/llm/generate` | Yes | Execute LLM inference (requires `Idempotency-Key` header) |
| `POST` | `/subscription/subscripe` | Yes | Generate Stripe Checkout Session URL for `Pro` plan |
| `GET` | `/subscription/success` | No | Post-checkout success landing page |
| `GET` | `/usage` | Yes | Monthly token usage breakdown and cost rollup per tenant |
| `POST` | `/webhook` | Stripe | Handle asynchronous Stripe subscription lifecycle events |

---

# To do next
- [-] Full test, and add build CI/CD pipline.
- [-] Add notificaiton service to alert user with email about limits when 80% or 100%
- [-] Integrate local LLamma model and as LLM provider.
- [-] Use Redis as a caching layer to cach responses.

