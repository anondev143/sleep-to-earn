## SleepToEarn Backend

- NestJS API for WHOOP webhooks
- Prisma + PostgreSQL for persistence

### Setup

1. Create `.env` with:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public
WHOOP_CLIENT_SECRET=your_whoop_client_secret
```

2. Install deps and migrate:

```
yarn install
yarn prisma:generate
yarn prisma:migrate
```

3. Run dev server:

```
yarn start:dev
```

### WHOOP Webhook

Configure WHOOP to POST to `/api/webhooks/whoop`.
Signature verification follows the docs: prepend timestamp to raw body, HMAC-SHA256 with client secret, base64, compare header `X-WHOOP-Signature`.

Docs: https://developer.whoop.com/docs/developing/webhooks/
