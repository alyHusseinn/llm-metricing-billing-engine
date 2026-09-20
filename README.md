# llm-metricing-billing-engine

how much has this customer used, what does it cost, and have
they hit their limit? Metering, quotas, correct money math, and Stripe test mode

# workflow
- Setup (nodejs, TS, TSX, Postgres, JWT, Docker, Docker Compose, stripe) [done]
- Create the database tables & setup (Drizzle | Prisma) [done]
- Set up auth routes & controllers with JWT [done]
- Each user by default has a free plan (100k tokens, 1k req) end in month
- /subscripe -> choose plan -> create stripe session -> send payment URL -> user subscripe
- Webhook for stripe updates --> update the user subscription
- Track each usage event with Idempotency Keys and Cached results