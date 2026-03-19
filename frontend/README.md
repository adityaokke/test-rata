# Healthcare CRM — Chat System

A real-time customer support chat platform built on microservices with GraphQL, WebSockets, and async message processing.

---

## Services

| Service      | Port | Responsibility                           |
|--------------|------|------------------------------------------|
| auth-service | 3001 | Registration, login, JWT validation      |
| chat-service | 3002 | Rooms, messages, queue worker, WebSocket |
| frontend     | 5173 | React UI — login, rooms, chat            |

---

## Quick Start

```bash
# 1. Copy and fill environment files
cp auth-service/.env.example auth-service/.env
cp chat-service/.env.example chat-service/.env

# Both services must share the same JWT_SECRET

# 2. Start all backend services
docker-compose up --build

# 3. Start the frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:5173` — register two accounts in separate browser tabs to test real-time chat.

---

## Project Structure

```
.
├── auth-service/                   # NestJS — JWT auth, user management
│   ├── prisma/                     # users table + migrations
│   ├── src/
│   │   ├── auth/                   # register, login, validateToken
│   │   └── common/                 # PrismaModule, JwtAuthGuard, decorators
│   ├── Dockerfile
│   └── .env.example
│
├── chat-service/                   # NestJS — rooms, messages, worker
│   ├── prisma/                     # chat_rooms, messages tables + migrations
│   ├── src/
│   │   ├── chat/
│   │   │   ├── rooms/              # list, find-or-create
│   │   │   ├── messages/           # send (→ queue), fetch (← DB)
│   │   │   ├── worker/             # BullMQ consumer → DB → Redis pub/sub
│   │   │   └── chat.gateway.ts     # Socket.IO WebSocket
│   │   └── common/                 # PrismaModule, RedisModule, JwtAuthGuard
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                       # React + Vite + Tailwind v4 + Apollo
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css               # Tailwind v4 @theme + @layer
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── RoomsPage.tsx
│       │   └── ChatPage.tsx
│       ├── components/
│       │   ├── ProtectedRoute.tsx
│       │   └── ui/
│       │       └── Input.tsx
│       ├── graphql/
│       │   ├── auth.mutations.ts
│       │   └── chat.queries.ts
│       ├── hooks/
│       │   └── useChatSocket.ts    # Socket.IO real-time hook
│       └── lib/
│           ├── apollo.ts           # authClient + chatClient
│           └── auth-context.tsx    # JWT storage + useAuth()
│
└── docker-compose.yml              # All services + postgres x2 + redis
```
