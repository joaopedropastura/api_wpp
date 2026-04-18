# WhatsApp API SaaS

SaaS that allows small business owners (barbershops, salons, shops) to connect
their business WhatsApp and activate an AI bot that automatically answers
customer questions. Focus on simplicity: 4-step onboarding, no technical
knowledge required from the user.

## Stack

### Monorepo (Turborepo)

- `apps/api` — NestJS (backend)
- `apps/web` — Next.js 14+ App Router (frontend)
- `packages/types` — shared TypeScript types between api and web

### Backend (apps/api)

- **Framework**: NestJS 10+ with strict TypeScript
- **ORM**: Prisma + PostgreSQL
- **Auth**: JWT + bcrypt (via @nestjs/jwt + @nestjs/passport)
- **Validation**: class-validator + class-transformer
- **HTTP client**: axios (Meta API calls)
- **AI SDK**: Vercel AI SDK (`ai` + `@ai-sdk/google`) — provider-agnostic, swap models via env var
- **Tests**: Jest (unit) + Supertest (e2e)

### Frontend (apps/web)

- **Framework**: Next.js 14+ App Router
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: NextAuth.js (frontend session, validates NestJS JWT)
- **Data fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + zod

### Infrastructure

- **API deploy**: Railway or Render
- **Web deploy**: Vercel
- **Database**: PostgreSQL (Railway or Supabase)

## Folder Structure

```text
whatsapp-api/
├── apps/
│   ├── api/                     # NestJS
│   │   └── src/
│   │       ├── auth/            # register, login, JWT guard
│   │       ├── users/           # user entity
│   │       ├── businesses/      # business data + bot config
│   │       ├── whatsapp/        # webhook, embedded signup, message sending
│   │       └── bot/             # AI bot logic (provider abstraction)
│   └── web/                     # Next.js
│       └── app/
│           ├── (auth)/          # login, register
│           ├── (dashboard)/     # authenticated area
│           │   ├── onboarding/  # 4-step onboarding flow
│           │   ├── businesses/  # business list
│           │   └── settings/    # bot configuration
│           └── api/             # proxy to NestJS if needed
├── packages/
│   └── types/                   # shared DTOs and types
├── turbo.json
└── package.json
```

## Database (Prisma)

Main models:

- `User` — business owner account
- `Business` — business data (name, type, description)
- `WhatsAppAccount` — Meta credentials (WABA ID, Phone Number ID, encrypted token)
- `BotConfig` — FAQ, business hours, welcome message
- `Conversation` — conversation between customer and bot (unique per business + customerPhone)
- `Message` — individual messages (role: customer | bot)

## Environment Variables

### apps/api/.env

```text
DATABASE_URL=
JWT_SECRET=
META_APP_ID=
META_APP_SECRET=
ENCRYPTION_KEY=          # AES-256 for Meta access tokens
AI_PROVIDER=             # openai | anthropic | gemini
OPENAI_API_KEY=          # required if AI_PROVIDER=openai
ANTHROPIC_API_KEY=       # required if AI_PROVIDER=anthropic
GOOGLE_AI_API_KEY=       # required if AI_PROVIDER=gemini
WEBHOOK_VERIFY_TOKEN=    # random string registered in Meta Dashboard
```

### apps/web/.env.local

```text
NEXT_PUBLIC_API_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## WhatsApp Integration (Meta Cloud API)

- Use **Embedded Signup** for number onboarding — user never copies tokens manually
- Single webhook endpoint `POST /webhooks/whatsapp` routed by `phone_number_id`
- Always validate HMAC-SHA256 signature from `X-Hub-Signature-256` header
- Respond to webhook with HTTP 200 immediately, process asynchronously
- Meta access tokens stored AES-256 encrypted in the database
- API version: `v21.0`

## AI Bot

- Mandatory abstraction layer via `AiProvider` interface:

```typescript
interface AiProvider {
  chat(messages: AiMessage[], systemPrompt: string): Promise<string>;
}
```

- Each provider (OpenAI, Anthropic, Gemini) implements the interface — swapping providers does not affect the rest of the system
- Implemented via **Vercel AI SDK** (`ai` + provider packages like `@ai-sdk/google`)
- Current provider: Gemini (`gemini-2.0-flash`) via `@ai-sdk/google`
- Provider injected via NestJS DI — swap by changing `AI_PROVIDER` env var and importing the corresponding `@ai-sdk/*` package
- System prompt includes: business name, description, configured FAQ, last 10 messages of conversation history
- Respects business hours — outside hours, sends a default offline message
- Does not respond if bot is disabled in `BotConfig`

## Onboarding (4 steps)

1. Create account (email + password)
2. Business details (name, type, description)
3. Connect WhatsApp (Embedded Signup button — 1 click)
4. Configure bot (visual FAQ builder + business hours + welcome message)

## Conventions

- Never use `any` in TypeScript — use proper types or `unknown`
- Business logic always in Services, never in Controllers
- Never expose Meta access tokens in API responses — only confirm existence
- DTOs with class-validator on all endpoints
- Errors handled with NestJS global exception filters — no manual try/catch in controllers
- All code (variables, functions, classes, comments) and commits in English
- Commit convention: `feat:`, `fix:`, `chore:`, `refactor:`

## What NOT to Do

- Do not use third-party WhatsApp SDKs — maintain full control via direct axios calls
- Do not store Meta access tokens as plain text in the database
- Do not commit `.env` files
- Do not make direct database calls in controllers
- Do not use `any` as a shortcut — use proper types or `unknown`
