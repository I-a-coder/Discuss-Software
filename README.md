# 🗣️ Yusi Discuss

> **Beginner-friendly team collaboration software** — a unified workspace for discussions, project boards, whiteboards, AI assistance, meeting notes, and more. Built with a clean purple-and-white aesthetic matching the Yusi Discuss brand.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Email/password signup & Google OAuth via NextAuth.js |
| 💬 **Team Discussion** | Real-time team chat with AES-256-GCM encrypted messages |
| 🎨 **Whiteboard** | Shared collaborative drawing canvas |
| 🤖 **AI Assistant** | Built-in help for summaries, task generation, and drafting |
| 📋 **Meeting Notes** | Encrypted meeting records with auto-generated summaries |
| 📌 **Project Board** | Sticky-note Kanban with assignee, status, deadline & comments |
| 📝 **My Notes** | Private encrypted personal notes |
| 📊 **Activity History** | Organisation-wide and personal audit logs |
| 👥 **Team & Roles** | Owner · Admin · Member · Guest with full RBAC |
| 🔒 **Security** | AES-256-GCM encryption at rest for all sensitive data |

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/I-a-coder/Discuss-Software.git
cd Discuss-Software

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Set up the database
npx prisma db push

# 5. Seed demo data
npm run db:seed

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Demo Accounts

All demo accounts use password: **`demo1234`**

| Email | Role | Access |
|-------|------|--------|
| owner@yusi.com | **Owner** | Full access + role management |
| admin@yusi.com | **Admin** | All features except role changes |
| member@yusi.com | **Member** | Discussion, board, AI, whiteboard, notes |
| guest@yusi.com | **Guest** | Read-only discussion + personal notes |

---

## 🔑 Role-Based Access Control (RBAC)

| Permission | Owner | Admin | Member | Guest |
|-----------|:-----:|:-----:|:------:|:-----:|
| Discussion (read) | ✅ | ✅ | ✅ | ✅ |
| Discussion (write) | ✅ | ✅ | ✅ | ❌ |
| Project Board | ✅ | ✅ | ✅ | ❌ |
| AI Assistant | ✅ | ✅ | ✅ | ❌ |
| Whiteboard | ✅ | ✅ | ✅ | ❌ |
| Meeting Notes | ✅ | ✅ | ✅ | ❌ |
| My Notes | ✅ | ✅ | ✅ | ✅ |
| Activity History | ✅ | ✅ | ❌ | ✅ (own) |
| Change Member Roles | ✅ | ❌ | ❌ | ❌ |

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Database
DATABASE_URL="file:./dev.db"          # SQLite (switch to PostgreSQL for production)

# NextAuth
NEXTAUTH_SECRET="your-random-secret-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Encryption
ENCRYPTION_KEY="your-32-char-minimum-encryption-key"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials → **Web application**
3. Add Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret to `.env.local`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **Auth** | NextAuth.js 4 |
| **Database ORM** | Prisma 6 + SQLite |
| **Styling** | Tailwind CSS 4 |
| **Icons** | Lucide React |
| **Encryption** | Node.js `crypto` — AES-256-GCM |

---

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST API endpoints
│   └── dashboard/        # Dashboard feature pages
├── components/
│   ├── features/         # Feature-specific components
│   └── layout/           # Layout components (Sidebar, Header, etc.)
└── lib/                  # Shared utilities (auth, db, encryption)
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Demo data seeder
```

---

## 🚢 Production Notes

- **Database**: Switch SQLite → PostgreSQL for production
- **Secrets**: Use strong `NEXTAUTH_SECRET` (≥ 32 chars) and `ENCRYPTION_KEY`
- **HTTPS**: Enable HTTPS and secure cookies
- **AI**: Connect a real provider (e.g. OpenAI) in `/api/ai` for advanced responses
- **Storage**: Configure persistent storage for uploaded files

---

## 📄 License

MIT © 2026 Sadia Shafeeq
