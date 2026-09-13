# JetaFlow — Fundação + Cadastros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of JetaFlow — authentication, permissions, theme/layout shell, Configurações, and the Clientes/Fornecedores/Precificação e Substratos cadastros — as a working, testable Next.js app.

**Architecture:** Next.js App Router monolith (frontend + API routes in one project). Business logic and permission checks live in `lib/services/*.ts` (unit-tested directly); `app/api/**/route.ts` handlers are thin wrappers that pull the session role, call a service, and map errors to HTTP status codes. SQLite via Prisma stores data in a single file, no separate DB server.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, SQLite + Prisma ORM, Tailwind CSS, NextAuth v4 (Credentials provider, JWT sessions), Zod validation, bcryptjs, Vitest + Testing Library for tests.

**Spec:** `docs/superpowers/specs/2026-09-13-jetaflow-fundacao-cadastros-design.md`

## Global Constraints

- Enumerated values (Role, TipoPessoa, TipoSubstrato, TipoEquipamento, TipoDocumento, TemaPadrao) are stored as Prisma `String` fields, **not** Prisma `enum` blocks — the SQLite connector's enum support is inconsistent across Prisma versions. Validity is enforced by Zod at the API boundary and by TypeScript union types in `lib/types.ts`.
- All npm dependencies are installed once, in Task 1, with pinned versions in `package.json`.
- Tests run with Vitest against a dedicated SQLite file (`prisma/test.db`), reset before the whole suite via a Vitest `globalSetup` that runs `prisma db push --force-reset`, and with tables cleared in `beforeEach` between individual tests.
- Business logic (role checks, sanitization, DB access) lives in `lib/services/*.ts` and is unit-tested directly by calling the exported functions. API route handlers are thin wrappers (session lookup + service call + error mapping) and are verified manually via `npm run dev`, since simulating NextAuth's request-scoped session inside Vitest is out of scope for this plan.
- **Permission assumption (confirm with the user if this reads wrong):** OPERADOR can read Clientes/Fornecedores/Substratos/Equipamentos, but Substrato/Equipamento reads have `custoUnitario`/`markup`/`custoHora` stripped for OPERADOR. Only ADMIN can create/edit/delete Substratos, Equipamentos, Usuários, and everything under Configurações. Any authenticated user (ADMIN or OPERADOR) can create/edit/delete Clientes and Fornecedores.
- List search (Clientes, Fornecedores, Substratos, Equipamentos) filters in JavaScript, not SQL `LIKE`, because the SQLite Prisma connector has no `insensitive` mode for `contains`. This is fine at this project's scale (a single print shop's dataset).
- Money/percentage fields are stored as SQLite `Float`. Acceptable at this scale; revisit with `Decimal`/integer-cents later if precision issues appear.

---

## File Structure

```
prisma/schema.prisma          — all data models for this sub-project
prisma/seed.ts                — creates the bootstrap ADMIN user
lib/prisma.ts                 — Prisma client singleton
lib/types.ts                  — Role/Tipo* TypeScript unions
lib/password.ts                — bcrypt hash/verify
lib/auth.ts                    — NextAuth config + authorizeCredentials
lib/permissions.ts             — getSessionRole, isAdmin
lib/errors.ts                  — ForbiddenError, NotFoundError
lib/api-helpers.ts             — handleApiError (maps errors -> NextResponse)
lib/external/brasilapi.ts      — CNPJ lookup
lib/external/viacep.ts         — CEP lookup
lib/validators/*.ts            — Zod schemas per entity
lib/services/*.ts              — business logic per entity
components/Providers.tsx       — SessionProvider wrapper
components/layout/*.tsx        — Sidebar, Topbar, ThemeToggle
components/ui/Combobox.tsx     — reusable autocomplete
components/forms/*.tsx         — Cliente/Fornecedor/Substrato/Equipamento/Usuario forms
app/**                         — pages and API routes
tests/**                       — mirrors lib/ and components/ structure
```

---

### Task 1: Project scaffolding (Next.js + TypeScript + Tailwind + theme tokens)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `.env.example`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `tests/tailwind-config.test.ts`
- Modify: `.gitignore` (add `.env`, `.env.local` if not already present — they already are)

**Interfaces:**
- Produces: Tailwind color tokens `marinho` (#1B3A66), `ciano` (#229DCF), `amarelo` (#FBC64B), `rosa` (#E23D7D), consumed by every component task from here on. CSS variables `--bg`, `--text`, `--primary`, `--secondary`, `--warning` on `:root` and `[data-theme="dark"]`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "jetaflow",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "next-auth": "4.24.7",
    "@prisma/client": "5.18.0",
    "bcryptjs": "2.4.3",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "tsx": "4.16.5",
    "@types/node": "20.14.15",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@types/bcryptjs": "2.4.6",
    "prisma": "5.18.0",
    "tailwindcss": "3.4.9",
    "postcss": "8.4.41",
    "autoprefixer": "10.4.20",
    "vitest": "2.0.5",
    "@vitejs/plugin-react": "4.3.1",
    "jsdom": "24.1.1",
    "@testing-library/react": "16.0.0",
    "@testing-library/jest-dom": "6.4.8",
    "@testing-library/user-event": "14.5.2"
  }
}
```

Run: `npm install`
Expected: installs without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs` and `postcss.config.mjs`**

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

```js
// postcss.config.mjs
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 5: Write the failing test for theme tokens**

```ts
// tests/tailwind-config.test.ts
import { describe, it, expect } from "vitest";
import tailwindConfig from "../tailwind.config";

describe("tailwind theme tokens", () => {
  it("defines all JETAPRINT palette colors", () => {
    const colors = (tailwindConfig.theme?.extend as any)?.colors;
    expect(colors.marinho).toBe("#1B3A66");
    expect(colors.ciano).toBe("#229DCF");
    expect(colors.amarelo).toBe("#FBC64B");
    expect(colors.rosa).toBe("#E23D7D");
  });
});
```

- [ ] **Step 6: Run the test, verify it fails**

Run: `npx vitest run tests/tailwind-config.test.ts`
Expected: FAIL — cannot find module `../tailwind.config`.

- [ ] **Step 7: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        marinho: "#1B3A66",
        ciano: "#229DCF",
        amarelo: "#FBC64B",
        rosa: "#E23D7D",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 8: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #ffffff;
  --text: #1B3A66;
  --primary: #229DCF;
  --secondary: #E23D7D;
  --warning: #FBC64B;
}

[data-theme="dark"] {
  --bg: #0f1e33;
  --text: #f5f7fa;
  --primary: #4db8e8;
  --secondary: #ef6ea3;
  --warning: #FBC64B;
}

body {
  background-color: var(--bg);
  color: var(--text);
}
```

- [ ] **Step 9: Create `app/layout.tsx` and `app/page.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JetaFlow",
  description: "Sistema de gestão da JETAPRINT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
export default function Home() {
  return <p>JetaFlow</p>;
}
```

- [ ] **Step 10: Run the test again, verify it passes**

Run: `npx vitest run tests/tailwind-config.test.ts`
Expected: PASS

- [ ] **Step 11: Verify the app builds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 12: Create `.env.example`**

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs postcss.config.mjs tailwind.config.ts vitest.config.ts .env.example app/globals.css app/layout.tsx app/page.tsx tests/tailwind-config.test.ts
git commit -m "chore: scaffold Next.js project with Tailwind theme tokens"
```

---

### Task 2: Prisma schema + DB test infrastructure

**Files:**
- Create: `prisma/schema.prisma`, `lib/prisma.ts`, `.env`, `tests/global-setup.ts`, `tests/setup.ts`, `tests/lib/prisma.test.ts`
- Modify: `vitest.config.ts` (add `setupFiles`, `globalSetup`, `env`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `prisma` (PrismaClient singleton) from `lib/prisma.ts`, imported by every subsequent service/test. Data models: `User`, `Cliente`, `Fornecedor`, `Substrato`, `Equipamento`, `ConfiguracaoGeral`, `NumeracaoDocumento`, `ParametroCalculo`.

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  nome      String
  email     String   @unique
  senhaHash String
  role      String   @default("OPERADOR")
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Cliente {
  id             String   @id @default(cuid())
  tipo           String
  nome           String
  documento      String   @unique
  ie             String?
  telefone       String?
  email          String?
  cep            String?
  endereco       String?
  numero         String?
  complemento    String?
  bairro         String?
  cidade         String?
  uf             String?
  prazoPagamento Int?
  observacoes    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Fornecedor {
  id          String      @id @default(cuid())
  razaoSocial String
  cnpj        String      @unique
  contato     String?
  telefone    String?
  email       String?
  cep         String?
  endereco    String?
  numero      String?
  complemento String?
  bairro      String?
  cidade      String?
  uf          String?
  categoria   String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  substratos  Substrato[]
}

model Substrato {
  id              String      @id @default(cuid())
  nome            String
  tipo            String
  fornecedorId    String?
  fornecedor      Fornecedor? @relation(fields: [fornecedorId], references: [id])
  unidadeMedida   String
  custoUnitario   Float
  percentualPerda Float       @default(0)
  markup          Float       @default(0)
  atributos       String
  ativo           Boolean     @default(true)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Equipamento {
  id                    String   @id @default(cuid())
  nome                  String
  tipo                  String
  velocidade            Float
  unidadeVelocidade     String
  formatoMaximo         String
  custoHora             Float
  tempoSetupMin         Int
  percentualPerda       Float    @default(0)
  acabamentosSuportados String
  ativo                 Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model ConfiguracaoGeral {
  id             Int      @id @default(1)
  razaoSocial    String   @default("")
  cnpj           String   @default("")
  ie             String   @default("")
  endereco       String   @default("")
  telefone       String   @default("")
  logoUrl        String?
  whatsappNumero String   @default("")
  temaPadrao     String   @default("AUTOMATICO")
  updatedAt      DateTime @updatedAt
}

model NumeracaoDocumento {
  id            String @id @default(cuid())
  tipoDocumento String @unique
  prefixo       String
  proximoNumero Int    @default(1)
  digitos       Int    @default(4)
}

model ParametroCalculo {
  id                              Int      @id @default(1)
  margemLucroPadrao               Float    @default(0)
  custoMaoObraHoraPadrao          Float    @default(0)
  percentualCustosIndiretosPadrao Float    @default(0)
  updatedAt                       DateTime @updatedAt
}
```

- [ ] **Step 2: Create `.env` (not committed — already gitignored)**

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: Create `tests/global-setup.ts` and `tests/setup.ts`**

```ts
// tests/global-setup.ts
import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

export default function globalSetup() {
  const dbPath = path.resolve(__dirname, "../prisma/test.db");
  if (existsSync(dbPath)) unlinkSync(dbPath);
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
    stdio: "inherit",
  });
}
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

const TABLES = [
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];

beforeEach(async () => {
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});
```

- [ ] **Step 4: Write the failing test**

```ts
// tests/lib/prisma.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("prisma client", () => {
  it("creates and retrieves a User", async () => {
    const user = await prisma.user.create({
      data: { nome: "Admin", email: "admin@jetaprint.com", senhaHash: "x", role: "ADMIN" },
    });
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("admin@jetaprint.com");
  });
});
```

- [ ] **Step 5: Run the test, verify it fails**

Run: `npx vitest run tests/lib/prisma.test.ts`
Expected: FAIL — cannot resolve `@/lib/prisma` (module doesn't exist yet).

- [ ] **Step 6: Create `lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 7: Update `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL: "file:./prisma/test.db",
      NEXTAUTH_SECRET: "test-secret",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 8: Generate the Prisma client and run the test**

Run: `npx prisma generate`
Expected: generates `node_modules/@prisma/client` types.

Run: `npx vitest run tests/lib/prisma.test.ts`
Expected: PASS

- [ ] **Step 9: Push the schema to the dev database too**

Run: `npx prisma db push`
Expected: creates `prisma/dev.db` with all tables.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma lib/prisma.ts tests/global-setup.ts tests/setup.ts tests/lib/prisma.test.ts vitest.config.ts
git commit -m "feat: add Prisma schema and test database infrastructure"
```

---

### Task 3: Password hashing utility

**Files:**
- Create: `lib/password.ts`, `tests/lib/password.test.ts`

**Interfaces:**
- Produces: `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>` — consumed by Task 4 (auth) and Task 8 (usuário service).

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/password.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("segredo123");
    expect(hash).not.toBe("segredo123");
    expect(await verifyPassword("segredo123", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("segredo123");
    expect(await verifyPassword("errada", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/lib/password.test.ts`
Expected: FAIL — cannot resolve `@/lib/password`.

- [ ] **Step 3: Create `lib/password.ts`**

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/lib/password.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/password.ts tests/lib/password.test.ts
git commit -m "feat: add password hashing utility"
```

---

### Task 4: NextAuth credentials auth + login page + middleware + seed script

**Files:**
- Create: `lib/types.ts`, `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`, `components/Providers.tsx`, `middleware.ts`, `prisma/seed.ts`, `tests/lib/auth.test.ts`
- Modify: `app/layout.tsx` (wrap children in `<Providers>`)

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts`, `verifyPassword` from `lib/password.ts`.
- Produces: `authOptions` (NextAuthOptions) and `authorizeCredentials(credentials)` from `lib/auth.ts` — consumed by `lib/permissions.ts` (Task 5) and every API route that calls `getServerSession(authOptions)`. `Role` type from `lib/types.ts`, consumed everywhere.

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export type Role = "ADMIN" | "OPERADOR";
export type TipoPessoa = "PF" | "PJ";
export type TipoSubstrato =
  | "PAPEL" | "LONA" | "ADESIVO" | "PVC" | "ACRILICO"
  | "CHAPA_OFFSET" | "TINTA" | "VERNIZ" | "LAMINADO";
export type TipoEquipamento = "DIGITAL" | "OFFSET";
export type TipoDocumento = "ORCAMENTO" | "OS";
export type TemaPadrao = "CLARO" | "ESCURO" | "AUTOMATICO";
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/auth.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { authorizeCredentials } from "@/lib/auth";

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    await prisma.user.create({
      data: {
        nome: "Admin",
        email: "admin@jetaprint.com",
        senhaHash: await hashPassword("segredo123"),
        role: "ADMIN",
        ativo: true,
      },
    });
  });

  it("returns the user when credentials are valid", async () => {
    const result = await authorizeCredentials({ email: "admin@jetaprint.com", password: "segredo123" });
    expect(result?.email).toBe("admin@jetaprint.com");
    expect(result?.role).toBe("ADMIN");
  });

  it("returns null when the password is wrong", async () => {
    const result = await authorizeCredentials({ email: "admin@jetaprint.com", password: "errada" });
    expect(result).toBeNull();
  });

  it("returns null for an inactive user", async () => {
    await prisma.user.update({ where: { email: "admin@jetaprint.com" }, data: { ativo: false } });
    const result = await authorizeCredentials({ email: "admin@jetaprint.com", password: "segredo123" });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth`.

- [ ] **Step 4: Create `lib/auth.ts`**

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@/lib/types";

export async function authorizeCredentials(
  credentials: Record<"email" | "password", string> | undefined
) {
  if (!credentials?.email || !credentials?.password) return null;

  const user = await prisma.user.findUnique({ where: { email: credentials.email } });
  if (!user || !user.ativo) return null;

  const valid = await verifyPassword(credentials.password, user.senhaHash);
  if (!valid) return null;

  return { id: user.id, name: user.nome, email: user.email, role: user.role as Role };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: Role }).role = token.role as Role;
      }
      return session;
    },
  },
};
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: PASS

- [ ] **Step 6: Create the NextAuth route handler**

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 7: Create `components/Providers.tsx` and wire it into `app/layout.tsx`**

```tsx
// components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Modify `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "JetaFlow",
  description: "Sistema de gestão da JETAPRINT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create `app/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("E-mail ou senha inválidos");
      return;
    }
    router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-marinho">
      <form onSubmit={handleSubmit} className="w-80 space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-semibold text-marinho">Entrar no JetaFlow</h1>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-rosa">{error}</p>}
        <button type="submit" className="w-full rounded bg-ciano py-2 text-white">
          Entrar
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 9: Create `middleware.ts`**

```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 10: Create `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@jetaprint.com.br";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  await prisma.user.create({
    data: {
      nome: "Administrador",
      email,
      senhaHash: await bcrypt.hash("jetaflow123", 10),
      role: "ADMIN",
      ativo: true,
    },
  });
  console.log(`Usuário admin criado: ${email} / senha: jetaflow123`);
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 11: Seed the dev database and verify login manually**

Run: `npm run db:seed`
Expected: prints "Usuário admin criado: admin@jetaprint.com.br / senha: jetaflow123"

Run: `npm run dev`, visit `http://localhost:3000`
Expected: redirected to `/login`. Log in with the seeded credentials, land on `/` successfully.

- [ ] **Step 12: Commit**

```bash
git add lib/types.ts lib/auth.ts app/api/auth app/login components/Providers.tsx app/layout.tsx middleware.ts prisma/seed.ts tests/lib/auth.test.ts
git commit -m "feat: add authentication, login page, and route protection"
```

---

### Task 5: Permissions and error-mapping helpers

**Files:**
- Create: `lib/permissions.ts`, `lib/errors.ts`, `lib/api-helpers.ts`, `tests/lib/permissions.test.ts`, `tests/lib/errors.test.ts`

**Interfaces:**
- Consumes: `authOptions` from `lib/auth.ts`, `Role` from `lib/types.ts`.
- Produces: `getSessionRole(): Promise<Role | null>`, `isAdmin(role: Role | null): boolean` from `lib/permissions.ts`; `ForbiddenError`, `NotFoundError` from `lib/errors.ts`; `handleApiError(error: unknown): NextResponse` from `lib/api-helpers.ts` — all consumed by every service and API route task from here on.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/permissions.test.ts
import { describe, it, expect } from "vitest";
import { isAdmin } from "@/lib/permissions";

describe("isAdmin", () => {
  it("returns true for ADMIN", () => {
    expect(isAdmin("ADMIN")).toBe(true);
  });

  it("returns false for OPERADOR", () => {
    expect(isAdmin("OPERADOR")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAdmin(null)).toBe(false);
  });
});
```

```ts
// tests/lib/errors.test.ts
import { describe, it, expect } from "vitest";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

describe("handleApiError", () => {
  it("maps ForbiddenError to 403", () => {
    const response = handleApiError(new ForbiddenError());
    expect(response.status).toBe(403);
  });

  it("maps NotFoundError to 404", () => {
    const response = handleApiError(new NotFoundError());
    expect(response.status).toBe(404);
  });

  it("maps unknown errors to 500", () => {
    const response = handleApiError(new Error("boom"));
    expect(response.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/lib/permissions.test.ts tests/lib/errors.test.ts`
Expected: FAIL — cannot resolve `@/lib/permissions`, `@/lib/errors`, `@/lib/api-helpers`.

- [ ] **Step 3: Create `lib/permissions.ts`**

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function getSessionRole(): Promise<Role | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: Role } | undefined)?.role ?? null;
}

export function isAdmin(role: Role | null): boolean {
  return role === "ADMIN";
}
```

- [ ] **Step 4: Create `lib/errors.ts`**

```ts
export class ForbiddenError extends Error {
  constructor(message = "Acesso negado") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Não encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}
```

- [ ] **Step 5: Create `lib/api-helpers.ts`**

```ts
import { NextResponse } from "next/server";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export function handleApiError(error: unknown) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error(error);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `npx vitest run tests/lib/permissions.test.ts tests/lib/errors.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/permissions.ts lib/errors.ts lib/api-helpers.ts tests/lib/permissions.test.ts tests/lib/errors.test.ts
git commit -m "feat: add permission checks and API error mapping"
```

---

### Task 6: App shell layout, theme toggle, Painel placeholder

**Files:**
- Create: `components/layout/Sidebar.tsx`, `components/layout/Topbar.tsx`, `components/layout/ThemeToggle.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/page.tsx`, `tests/components/ThemeToggle.test.tsx`
- Modify: `tests/setup.ts` (add `window.matchMedia` polyfill for jsdom), delete `app/page.tsx` (superseded by `app/(dashboard)/page.tsx`)

**Interfaces:**
- Consumes: theme CSS variables from Task 1, `useSession`/`signOut` from `next-auth/react` (Task 4).
- Produces: `<Sidebar>`, `<Topbar>`, `<ThemeToggle>` components — consumed only by the dashboard layout, no further tasks depend on their internals.

- [ ] **Step 1: Add `matchMedia` polyfill to `tests/setup.ts`**

Append to `tests/setup.ts`:

```ts
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// tests/components/ThemeToggle.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import ThemeToggle from "@/components/layout/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.cookie = "theme=; path=/; max-age=0";
  });

  it("toggles data-theme attribute when clicked", async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /alternar tema/i });
    await userEvent.click(button);
    const first = document.documentElement.getAttribute("data-theme");
    expect(["light", "dark"]).toContain(first);
    await userEvent.click(button);
    const second = document.documentElement.getAttribute("data-theme");
    expect(second).not.toBe(first);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/components/ThemeToggle.test.tsx`
Expected: FAIL — cannot resolve `@/components/layout/ThemeToggle`.

- [ ] **Step 4: Create `components/layout/ThemeToggle.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000`;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = document.cookie.match(/theme=(light|dark)/)?.[1] as Theme | undefined;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button onClick={toggle} aria-label="Alternar tema" className="rounded px-3 py-1 text-sm">
      {theme === "light" ? "🌙 Escuro" : "☀️ Claro"}
    </button>
  );
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/components/ThemeToggle.test.tsx`
Expected: PASS

- [ ] **Step 6: Create `components/layout/Sidebar.tsx`**

```tsx
import Link from "next/link";

const modules = [
  { href: "/", label: "Painel" },
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/ordens-servico", label: "Ordens de Serviço" },
  { href: "/clientes", label: "Clientes" },
  { href: "/fornecedores", label: "Fornecedores" },
  { href: "/etiquetas", label: "Etiquetas" },
  { href: "/licitacoes", label: "Licitações" },
  { href: "/precificacao", label: "Precificação" },
  { href: "/configuracoes", label: "Configurações" },
];

export default function Sidebar() {
  return (
    <nav className="w-56 shrink-0 border-r bg-marinho text-white">
      <ul className="space-y-1 p-4">
        {modules.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className="block rounded px-3 py-2 hover:bg-ciano">
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 7: Create `components/layout/Topbar.tsx`**

```tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

export default function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold text-marinho">JetaFlow</span>
      <div className="flex items-center gap-4">
        <span className="text-sm">{session?.user?.name}</span>
        <ThemeToggle />
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-rosa">
          Sair
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 8: Create `app/(dashboard)/layout.tsx` and `app/(dashboard)/page.tsx`, delete `app/page.tsx`**

```tsx
// app/(dashboard)/layout.tsx
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// app/(dashboard)/page.tsx
const cards = [
  { label: "Orçamentos pendentes", value: "—" },
  { label: "OS em produção", value: "—" },
  { label: "Pedidos aguardando expedição", value: "—" },
  { label: "Licitações em andamento", value: "—" },
];

export default function PainelPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Painel</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-ciano">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Delete `app/page.tsx` (its route `/` is now served by `app/(dashboard)/page.tsx`).

- [ ] **Step 9: Verify manually**

Run: `npm run dev`, log in, confirm the sidebar/topbar render, the theme toggle switches light/dark, and the Painel shows placeholder cards.

- [ ] **Step 10: Commit**

```bash
git add components/layout tests/setup.ts tests/components/ThemeToggle.test.tsx "app/(dashboard)"
git add -u app/page.tsx
git commit -m "feat: add dashboard shell layout, theme toggle, and Painel placeholder"
```

---

### Task 7: Reusable Combobox component

**Files:**
- Create: `components/ui/Combobox.tsx`, `tests/components/Combobox.test.tsx`

**Interfaces:**
- Produces: `Combobox<T>({ items, value, onChange, getLabel, placeholder })` — consumed by `ClienteForm`, `FornecedorForm`, `SubstratoForm` (fornecedor selection) in later tasks.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/Combobox.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Combobox from "@/components/ui/Combobox";

interface Item { id: number; nome: string; }

const items: Item[] = [
  { id: 1, nome: "Papel Couché" },
  { id: 2, nome: "Lona Frontlight" },
];

describe("Combobox", () => {
  it("filters items by query and selects one", async () => {
    const onChange = vi.fn();
    render(
      <Combobox items={items} value={null} onChange={onChange} getLabel={(i) => i.nome} placeholder="Buscar..." />
    );

    const input = screen.getByPlaceholderText("Buscar...");
    await userEvent.click(input);
    await userEvent.type(input, "Lona");

    const option = await screen.findByText("Lona Frontlight");
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(items[1]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/components/Combobox.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/Combobox`.

- [ ] **Step 3: Create `components/ui/Combobox.tsx`**

```tsx
"use client";

import { useState } from "react";

interface ComboboxProps<T> {
  items: T[];
  value: T | null;
  onChange: (item: T) => void;
  getLabel: (item: T) => string;
  placeholder?: string;
}

export default function Combobox<T>({ items, value, onChange, getLabel, placeholder }: ComboboxProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = query === ""
    ? items
    : items.filter((item) => getLabel(item).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : (value ? getLabel(value) : "")}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded border px-3 py-2"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 max-h-48 w-full overflow-auto rounded border bg-white shadow">
          {filtered.map((item, i) => (
            <li
              key={i}
              onMouseDown={() => { onChange(item); setOpen(false); }}
              className="cursor-pointer px-3 py-2 hover:bg-ciano hover:text-white"
            >
              {getLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/components/Combobox.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/Combobox.tsx tests/components/Combobox.test.tsx
git commit -m "feat: add reusable Combobox autocomplete component"
```

---

### Task 8: Usuários service + API (ADMIN-only)

**Files:**
- Create: `lib/validators/usuario.ts`, `lib/services/usuarioService.ts`, `app/api/usuarios/route.ts`, `app/api/usuarios/[id]/route.ts`, `tests/lib/services/usuarioService.test.ts`

**Interfaces:**
- Consumes: `prisma`, `hashPassword`, `isAdmin`, `ForbiddenError`/`NotFoundError`, `getSessionRole`, `handleApiError`.
- Produces: `listUsuarios(role)`, `createUsuario(role, input)`, `updateUsuario(role, id, input)` from `lib/services/usuarioService.ts` — consumed only by Task 9 (UI) and the routes in this task.

- [ ] **Step 1: Create `lib/validators/usuario.ts`**

```ts
import { z } from "zod";

export const usuarioSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional(),
  role: z.enum(["ADMIN", "OPERADOR"]),
  ativo: z.boolean().default(true),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/services/usuarioService.test.ts
import { describe, it, expect } from "vitest";
import { listUsuarios, createUsuario, updateUsuario } from "@/lib/services/usuarioService";
import { ForbiddenError } from "@/lib/errors";

describe("usuarioService", () => {
  it("blocks non-admin from listing", async () => {
    await expect(listUsuarios("OPERADOR")).rejects.toThrow(ForbiddenError);
  });

  it("allows admin to create and list a user", async () => {
    await createUsuario("ADMIN", {
      nome: "Maria", email: "maria@jetaprint.com", senha: "segredo123", role: "OPERADOR", ativo: true,
    });
    const list = await listUsuarios("ADMIN");
    expect(list.some((u) => u.email === "maria@jetaprint.com")).toBe(true);
  });

  it("updates a user without changing password when senha is omitted", async () => {
    const created = await createUsuario("ADMIN", {
      nome: "Carlos", email: "carlos@jetaprint.com", senha: "segredo123", role: "OPERADOR", ativo: true,
    });
    const updated = await updateUsuario("ADMIN", created.id, {
      nome: "Carlos Silva", email: "carlos@jetaprint.com", role: "OPERADOR", ativo: true,
    });
    expect(updated.nome).toBe("Carlos Silva");
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/usuarioService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/usuarioService`.

- [ ] **Step 4: Create `lib/services/usuarioService.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { UsuarioInput } from "@/lib/validators/usuario";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores podem gerenciar usuários");
}

export async function listUsuarios(role: Role | null) {
  assertAdmin(role);
  return prisma.user.findMany({
    select: { id: true, nome: true, email: true, role: true, ativo: true },
    orderBy: { nome: "asc" },
  });
}

export async function createUsuario(role: Role | null, input: UsuarioInput) {
  assertAdmin(role);
  if (!input.senha) throw new Error("Senha obrigatória ao criar usuário");
  const senhaHash = await hashPassword(input.senha);
  return prisma.user.create({
    data: { nome: input.nome, email: input.email, senhaHash, role: input.role, ativo: input.ativo },
    select: { id: true, nome: true, email: true, role: true, ativo: true },
  });
}

export async function updateUsuario(role: Role | null, id: string, input: UsuarioInput) {
  assertAdmin(role);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Usuário não encontrado");

  const senhaHash = input.senha ? await hashPassword(input.senha) : existing.senhaHash;
  return prisma.user.update({
    where: { id },
    data: { nome: input.nome, email: input.email, senhaHash, role: input.role, ativo: input.ativo },
    select: { id: true, nome: true, email: true, role: true, ativo: true },
  });
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/usuarioService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API routes**

```ts
// app/api/usuarios/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { usuarioSchema } from "@/lib/validators/usuario";
import { listUsuarios, createUsuario } from "@/lib/services/usuarioService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const usuarios = await listUsuarios(role);
    return NextResponse.json(usuarios);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = usuarioSchema.parse(await request.json());
    const usuario = await createUsuario(role, body);
    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

```ts
// app/api/usuarios/[id]/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { usuarioSchema } from "@/lib/validators/usuario";
import { updateUsuario } from "@/lib/services/usuarioService";
import { handleApiError } from "@/lib/api-helpers";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = usuarioSchema.parse(await request.json());
    const usuario = await updateUsuario(role, params.id, body);
    return NextResponse.json(usuario);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/usuario.ts lib/services/usuarioService.ts app/api/usuarios tests/lib/services/usuarioService.test.ts
git commit -m "feat: add usuarios service and API (admin-only)"
```

---

### Task 9: Usuários UI

**Files:**
- Create: `components/forms/UsuarioForm.tsx`, `app/(dashboard)/configuracoes/usuarios/page.tsx`, `app/(dashboard)/configuracoes/usuarios/novo/page.tsx`, `app/(dashboard)/configuracoes/usuarios/[id]/page.tsx`

**Interfaces:**
- Consumes: `app/api/usuarios` routes (Task 8).
- Produces: nothing consumed by later tasks (leaf UI).

- [ ] **Step 1: Create `components/forms/UsuarioForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface UsuarioFormValues {
  id?: string;
  nome: string;
  email: string;
  senha: string;
  role: "ADMIN" | "OPERADOR";
  ativo: boolean;
}

const empty: UsuarioFormValues = { nome: "", email: "", senha: "", role: "OPERADOR", ativo: true };

export default function UsuarioForm({ initial }: { initial?: UsuarioFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<UsuarioFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof UsuarioFormValues>(key: K, value: UsuarioFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = { ...values, senha: values.senha || undefined };
    const url = values.id ? `/api/usuarios/${values.id}` : "/api/usuarios";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar usuário");
      return;
    }
    router.push("/configuracoes/usuarios");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <input placeholder="Nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <input type="email" placeholder="E-mail" value={values.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <input type="password" placeholder={values.id ? "Nova senha (opcional)" : "Senha"} value={values.senha} onChange={(e) => set("senha", e.target.value)} className="w-full rounded border px-3 py-2" required={!values.id} />
      <select value={values.role} onChange={(e) => set("role", e.target.value as "ADMIN" | "OPERADOR")} className="w-full rounded border px-3 py-2">
        <option value="OPERADOR">Operador</option>
        <option value="ADMIN">Administrador</option>
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.ativo} onChange={(e) => set("ativo", e.target.checked)} />
        Ativo
      </label>
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
```

- [ ] **Step 2: Create the list, new, and edit pages**

```tsx
// app/(dashboard)/configuracoes/usuarios/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Usuario { id: string; nome: string; email: string; role: string; ativo: boolean; }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    fetch("/api/usuarios").then((r) => r.json()).then(setUsuarios);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Usuários</h1>
        <Link href="/configuracoes/usuarios/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo usuário</Link>
      </div>
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">E-mail</th><th className="py-2">Perfil</th><th className="py-2">Status</th></tr></thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/configuracoes/usuarios/${u.id}`}>{u.nome}</Link></td>
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.role}</td>
              <td className="py-2">{u.ativo ? "Ativo" : "Inativo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// app/(dashboard)/configuracoes/usuarios/novo/page.tsx
import UsuarioForm from "@/components/forms/UsuarioForm";

export default function NovoUsuarioPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Novo usuário</h1>
      <UsuarioForm />
    </div>
  );
}
```

```tsx
// app/(dashboard)/configuracoes/usuarios/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import UsuarioForm from "@/components/forms/UsuarioForm";
import { notFound } from "next/navigation";

export default async function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const usuario = await prisma.user.findUnique({ where: { id: params.id } });
  if (!usuario) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar usuário</h1>
      <UsuarioForm
        initial={{
          id: usuario.id, nome: usuario.nome, email: usuario.email, senha: "",
          role: usuario.role as "ADMIN" | "OPERADOR", ativo: usuario.ativo,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, log in as admin, visit `/configuracoes/usuarios`, create a user, edit it, confirm it saves.

- [ ] **Step 4: Commit**

```bash
git add components/forms/UsuarioForm.tsx "app/(dashboard)/configuracoes/usuarios"
git commit -m "feat: add usuarios management UI"
```

---

### Task 10: Configurações — Empresa / WhatsApp / Tema (service + API + logo upload)

**Files:**
- Create: `lib/validators/configuracao.ts`, `lib/services/configuracaoService.ts`, `app/api/configuracoes/empresa/route.ts`, `app/api/configuracoes/empresa/logo/route.ts`, `tests/lib/services/configuracaoService.test.ts`
- Modify: `.gitignore` (add `public/uploads/`)

**Interfaces:**
- Produces: `getEmpresa(role)`, `updateEmpresa(role, input)` from `lib/services/configuracaoService.ts` (this file grows in Tasks 11-12 with numeração/parâmetros functions) — consumed by Task 13 (UI).

- [ ] **Step 1: Create `lib/validators/configuracao.ts`**

```ts
import { z } from "zod";

export const empresaSchema = z.object({
  razaoSocial: z.string().min(1),
  cnpj: z.string().min(1),
  ie: z.string().optional().default(""),
  endereco: z.string().optional().default(""),
  telefone: z.string().optional().default(""),
  whatsappNumero: z.string().optional().default(""),
  temaPadrao: z.enum(["CLARO", "ESCURO", "AUTOMATICO"]),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/services/configuracaoService.test.ts
import { describe, it, expect } from "vitest";
import { getEmpresa, updateEmpresa } from "@/lib/services/configuracaoService";
import { ForbiddenError } from "@/lib/errors";

describe("configuracaoService — empresa", () => {
  it("blocks OPERADOR", async () => {
    await expect(getEmpresa("OPERADOR")).rejects.toThrow(ForbiddenError);
  });

  it("creates the singleton row on first read", async () => {
    const empresa = await getEmpresa("ADMIN");
    expect(empresa.id).toBe(1);
  });

  it("updates empresa fields for ADMIN", async () => {
    const updated = await updateEmpresa("ADMIN", {
      razaoSocial: "JETAPRINT LTDA", cnpj: "12345678000199", ie: "", endereco: "",
      telefone: "11999998888", whatsappNumero: "11999998888", temaPadrao: "AUTOMATICO",
    });
    expect(updated.razaoSocial).toBe("JETAPRINT LTDA");
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/configuracaoService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/configuracaoService`.

- [ ] **Step 4: Create `lib/services/configuracaoService.ts`** (empresa functions only — numeração/parâmetros added in Tasks 11-12)

```ts
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { EmpresaInput } from "@/lib/validators/configuracao";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores acessam Configurações");
}

export async function getEmpresa(role: Role | null) {
  assertAdmin(role);
  return prisma.configuracaoGeral.upsert({
    where: { id: 1 }, update: {}, create: { id: 1 },
  });
}

export async function updateEmpresa(role: Role | null, input: EmpresaInput) {
  assertAdmin(role);
  return prisma.configuracaoGeral.upsert({
    where: { id: 1 }, update: input, create: { id: 1, ...input },
  });
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/configuracaoService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API routes**

```ts
// app/api/configuracoes/empresa/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { empresaSchema } from "@/lib/validators/configuracao";
import { getEmpresa, updateEmpresa } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getEmpresa(role));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = empresaSchema.parse(await request.json());
    return NextResponse.json(await updateEmpresa(role, body));
  } catch (error) {
    return handleApiError(error);
  }
}
```

```ts
// app/api/configuracoes/empresa/logo/route.ts
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSessionRole, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(role)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("logo") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "png";
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, `logo.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const logoUrl = `/uploads/logo.${ext}`;
  await prisma.configuracaoGeral.upsert({
    where: { id: 1 }, update: { logoUrl }, create: { id: 1, logoUrl },
  });

  return NextResponse.json({ logoUrl });
}
```

Note: this route is not covered by an automated test (filesystem side effects have low test value at this scale) — verify it manually in Task 13's step.

- [ ] **Step 7: Add `public/uploads/` to `.gitignore`**

Append to `.gitignore`:

```
public/uploads/
```

- [ ] **Step 8: Commit**

```bash
git add lib/validators/configuracao.ts lib/services/configuracaoService.ts app/api/configuracoes/empresa tests/lib/services/configuracaoService.test.ts .gitignore
git commit -m "feat: add empresa/whatsapp/tema settings service and API"
```

---

### Task 11: Configurações — Numeração de Documentos (service + API)

**Files:**
- Modify: `lib/services/configuracaoService.ts` (add numeração functions), `tests/lib/services/configuracaoService.test.ts`
- Create: `lib/validators/configuracao.ts` addition (numeracaoSchema), `app/api/configuracoes/numeracao/route.ts`, `app/api/configuracoes/numeracao/[tipo]/route.ts`

**Interfaces:**
- Produces: `listNumeracoes(role)`, `updateNumeracao(role, tipoDocumento, input)` — consumed by Task 13 (UI) and, later, the Orçamentos/OS sub-projects (which read `proximoNumero` when issuing documents).

- [ ] **Step 1: Add `numeracaoSchema` to `lib/validators/configuracao.ts`**

Append:

```ts
export const numeracaoSchema = z.object({
  prefixo: z.string().min(1),
  proximoNumero: z.number().int().positive(),
  digitos: z.number().int().min(1).max(10),
});

export type NumeracaoInput = z.infer<typeof numeracaoSchema>;
```

- [ ] **Step 2: Write the failing test**

Append to `tests/lib/services/configuracaoService.test.ts`:

```ts
import { listNumeracoes, updateNumeracao } from "@/lib/services/configuracaoService";
import { NotFoundError } from "@/lib/errors";

describe("configuracaoService — numeração", () => {
  it("seeds ORCAMENTO and OS rows on first read", async () => {
    const rows = await listNumeracoes("ADMIN");
    expect(rows.map((r) => r.tipoDocumento).sort()).toEqual(["OS", "ORCAMENTO"]);
  });

  it("updates a numeração row", async () => {
    await listNumeracoes("ADMIN");
    const updated = await updateNumeracao("ADMIN", "ORCAMENTO", { prefixo: "ORC", proximoNumero: 42, digitos: 4 });
    expect(updated.proximoNumero).toBe(42);
  });

  it("throws NotFoundError for an unknown tipoDocumento", async () => {
    await expect(
      updateNumeracao("ADMIN", "INEXISTENTE", { prefixo: "X", proximoNumero: 1, digitos: 4 })
    ).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/configuracaoService.test.ts`
Expected: FAIL — `listNumeracoes`/`updateNumeracao` not exported yet.

- [ ] **Step 4: Append to `lib/services/configuracaoService.ts`**

```ts
import { NotFoundError } from "@/lib/errors";
import type { NumeracaoInput } from "@/lib/validators/configuracao";

export async function listNumeracoes(role: Role | null) {
  assertAdmin(role);
  const tipos = ["ORCAMENTO", "OS"];
  for (const tipo of tipos) {
    await prisma.numeracaoDocumento.upsert({
      where: { tipoDocumento: tipo },
      update: {},
      create: { tipoDocumento: tipo, prefixo: tipo === "ORCAMENTO" ? "ORC" : "OS", proximoNumero: 1, digitos: 4 },
    });
  }
  return prisma.numeracaoDocumento.findMany({ orderBy: { tipoDocumento: "asc" } });
}

export async function updateNumeracao(role: Role | null, tipoDocumento: string, input: NumeracaoInput) {
  assertAdmin(role);
  const existing = await prisma.numeracaoDocumento.findUnique({ where: { tipoDocumento } });
  if (!existing) throw new NotFoundError("Numeração não encontrada");
  return prisma.numeracaoDocumento.update({ where: { tipoDocumento }, data: input });
}
```

(Merge the `NotFoundError` import into the existing `@/lib/errors` import line at the top of the file rather than duplicating it.)

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/configuracaoService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API routes**

```ts
// app/api/configuracoes/numeracao/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { listNumeracoes } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await listNumeracoes(role));
  } catch (error) {
    return handleApiError(error);
  }
}
```

```ts
// app/api/configuracoes/numeracao/[tipo]/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { numeracaoSchema } from "@/lib/validators/configuracao";
import { updateNumeracao } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function PUT(request: Request, { params }: { params: { tipo: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = numeracaoSchema.parse(await request.json());
    return NextResponse.json(await updateNumeracao(role, params.tipo, body));
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/configuracao.ts lib/services/configuracaoService.ts app/api/configuracoes/numeracao tests/lib/services/configuracaoService.test.ts
git commit -m "feat: add numeração de documentos service and API"
```

---

### Task 12: Configurações — Parâmetros de Cálculo (service + API)

**Files:**
- Modify: `lib/validators/configuracao.ts` (add `parametrosSchema`), `lib/services/configuracaoService.ts` (add parâmetros functions), `tests/lib/services/configuracaoService.test.ts`
- Create: `app/api/configuracoes/parametros/route.ts`

**Interfaces:**
- Produces: `getParametros(role)`, `updateParametros(role, input)` — consumed by Task 13 (UI) and, later, the Orçamentos sub-project's calculation engine.

- [ ] **Step 1: Append `parametrosSchema` to `lib/validators/configuracao.ts`**

```ts
export const parametrosSchema = z.object({
  margemLucroPadrao: z.number().min(0),
  custoMaoObraHoraPadrao: z.number().min(0),
  percentualCustosIndiretosPadrao: z.number().min(0),
});

export type ParametrosInput = z.infer<typeof parametrosSchema>;
```

- [ ] **Step 2: Write the failing test**

Append to `tests/lib/services/configuracaoService.test.ts`:

```ts
import { getParametros, updateParametros } from "@/lib/services/configuracaoService";

describe("configuracaoService — parâmetros", () => {
  it("creates the singleton row on first read", async () => {
    const parametros = await getParametros("ADMIN");
    expect(parametros.id).toBe(1);
  });

  it("updates parâmetros for ADMIN", async () => {
    const updated = await updateParametros("ADMIN", {
      margemLucroPadrao: 25, custoMaoObraHoraPadrao: 40, percentualCustosIndiretosPadrao: 10,
    });
    expect(updated.margemLucroPadrao).toBe(25);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/configuracaoService.test.ts`
Expected: FAIL — `getParametros`/`updateParametros` not exported yet.

- [ ] **Step 4: Append to `lib/services/configuracaoService.ts`**

```ts
import type { ParametrosInput } from "@/lib/validators/configuracao";

export async function getParametros(role: Role | null) {
  assertAdmin(role);
  return prisma.parametroCalculo.upsert({
    where: { id: 1 }, update: {}, create: { id: 1 },
  });
}

export async function updateParametros(role: Role | null, input: ParametrosInput) {
  assertAdmin(role);
  return prisma.parametroCalculo.upsert({
    where: { id: 1 }, update: input, create: { id: 1, ...input },
  });
}
```

(Merge the type-only import into the existing `@/lib/validators/configuracao` import line.)

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/configuracaoService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API route**

```ts
// app/api/configuracoes/parametros/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { parametrosSchema } from "@/lib/validators/configuracao";
import { getParametros, updateParametros } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getParametros(role));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = parametrosSchema.parse(await request.json());
    return NextResponse.json(await updateParametros(role, body));
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/configuracao.ts lib/services/configuracaoService.ts app/api/configuracoes/parametros tests/lib/services/configuracaoService.test.ts
git commit -m "feat: add parâmetros de cálculo service and API"
```

---

### Task 13: Configurações UI (Empresa, Numeração, Parâmetros tabs)

**Files:**
- Create: `app/(dashboard)/configuracoes/page.tsx`

**Interfaces:**
- Consumes: `/api/configuracoes/empresa`, `/api/configuracoes/empresa/logo`, `/api/configuracoes/numeracao`, `/api/configuracoes/numeracao/[tipo]`, `/api/configuracoes/parametros`. Links to `/configuracoes/usuarios` (Task 9).

- [ ] **Step 1: Create `app/(dashboard)/configuracoes/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Empresa {
  razaoSocial: string; cnpj: string; ie: string; endereco: string;
  telefone: string; whatsappNumero: string; temaPadrao: string; logoUrl: string | null;
}
interface Numeracao { tipoDocumento: string; prefixo: string; proximoNumero: number; digitos: number; }
interface Parametros { margemLucroPadrao: number; custoMaoObraHoraPadrao: number; percentualCustosIndiretosPadrao: number; }

type Tab = "empresa" | "numeracao" | "parametros";

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>("empresa");
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [numeracoes, setNumeracoes] = useState<Numeracao[]>([]);
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/configuracoes/empresa").then((r) => r.json()).then(setEmpresa);
    fetch("/api/configuracoes/numeracao").then((r) => r.json()).then(setNumeracoes);
    fetch("/api/configuracoes/parametros").then((r) => r.json()).then(setParametros);
  }, []);

  async function salvarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa) return;
    const response = await fetch("/api/configuracoes/empresa", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(empresa),
    });
    setStatus(response.ok ? "Salvo" : "Erro ao salvar");
  }

  async function enviarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);
    const response = await fetch("/api/configuracoes/empresa/logo", { method: "POST", body: formData });
    if (response.ok) {
      const data = await response.json();
      setEmpresa((prev) => (prev ? { ...prev, logoUrl: data.logoUrl } : prev));
    }
  }

  async function salvarNumeracao(n: Numeracao) {
    const response = await fetch(`/api/configuracoes/numeracao/${n.tipoDocumento}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixo: n.prefixo, proximoNumero: n.proximoNumero, digitos: n.digitos }),
    });
    setStatus(response.ok ? "Salvo" : "Erro ao salvar");
  }

  async function salvarParametros(e: React.FormEvent) {
    e.preventDefault();
    if (!parametros) return;
    const response = await fetch("/api/configuracoes/parametros", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parametros),
    });
    setStatus(response.ok ? "Salvo" : "Erro ao salvar");
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Configurações</h1>
      <div className="mb-4 flex gap-4 border-b">
        {(["empresa", "numeracao", "parametros"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 ${tab === t ? "border-b-2 border-ciano font-semibold" : ""}`}>
            {t === "empresa" ? "Empresa" : t === "numeracao" ? "Numeração" : "Parâmetros"}
          </button>
        ))}
        <Link href="/configuracoes/usuarios" className="pb-2 text-sm text-gray-500">Usuários →</Link>
      </div>

      {tab === "empresa" && empresa && (
        <form onSubmit={salvarEmpresa} className="max-w-xl space-y-4">
          <input placeholder="Razão social" value={empresa.razaoSocial} onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="CNPJ" value={empresa.cnpj} onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="IE" value={empresa.ie} onChange={(e) => setEmpresa({ ...empresa, ie: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="Endereço" value={empresa.endereco} onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="Telefone" value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="WhatsApp" value={empresa.whatsappNumero} onChange={(e) => setEmpresa({ ...empresa, whatsappNumero: e.target.value })} className="w-full rounded border px-3 py-2" />
          <select value={empresa.temaPadrao} onChange={(e) => setEmpresa({ ...empresa, temaPadrao: e.target.value })} className="w-full rounded border px-3 py-2">
            <option value="AUTOMATICO">Automático</option>
            <option value="CLARO">Claro</option>
            <option value="ESCURO">Escuro</option>
          </select>
          <div>
            <label className="block text-sm">Logotipo</label>
            <input type="file" accept="image/*" onChange={enviarLogo} />
            {empresa.logoUrl && <img src={empresa.logoUrl} alt="Logotipo" className="mt-2 h-16" />}
          </div>
          <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
        </form>
      )}

      {tab === "numeracao" && (
        <div className="max-w-xl space-y-4">
          {numeracoes.map((n, i) => (
            <div key={n.tipoDocumento} className="flex items-end gap-2 border-b pb-2">
              <span className="w-24 text-sm text-gray-500">{n.tipoDocumento}</span>
              <input placeholder="Prefixo" value={n.prefixo} onChange={(e) => {
                const next = [...numeracoes]; next[i] = { ...n, prefixo: e.target.value }; setNumeracoes(next);
              }} className="rounded border px-3 py-2" />
              <input type="number" placeholder="Próximo número" value={n.proximoNumero} onChange={(e) => {
                const next = [...numeracoes]; next[i] = { ...n, proximoNumero: Number(e.target.value) }; setNumeracoes(next);
              }} className="rounded border px-3 py-2" />
              <button onClick={() => salvarNumeracao(n)} className="rounded bg-ciano px-3 py-2 text-white">Salvar</button>
            </div>
          ))}
        </div>
      )}

      {tab === "parametros" && parametros && (
        <form onSubmit={salvarParametros} className="max-w-xl space-y-4">
          <input type="number" placeholder="Margem de lucro padrão (%)" value={parametros.margemLucroPadrao} onChange={(e) => setParametros({ ...parametros, margemLucroPadrao: Number(e.target.value) })} className="w-full rounded border px-3 py-2" />
          <input type="number" placeholder="Custo de mão de obra/hora padrão" value={parametros.custoMaoObraHoraPadrao} onChange={(e) => setParametros({ ...parametros, custoMaoObraHoraPadrao: Number(e.target.value) })} className="w-full rounded border px-3 py-2" />
          <input type="number" placeholder="Custos indiretos padrão (%)" value={parametros.percentualCustosIndiretosPadrao} onChange={(e) => setParametros({ ...parametros, percentualCustosIndiretosPadrao: Number(e.target.value) })} className="w-full rounded border px-3 py-2" />
          <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
        </form>
      )}

      {status && <p className="mt-4 text-sm text-ciano">{status}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, log in as admin, visit `/configuracoes`, fill in empresa data, upload a logo, edit numeração and parâmetros, confirm each tab saves and reloads with the saved values.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/configuracoes/page.tsx"
git commit -m "feat: add Configurações UI with empresa, numeração, and parâmetros tabs"
```

---

### Task 14: CNPJ/CEP lookup proxies

**Files:**
- Create: `lib/external/brasilapi.ts`, `lib/external/viacep.ts`, `app/api/lookup/cnpj/route.ts`, `app/api/lookup/cep/route.ts`, `tests/lib/external/brasilapi.test.ts`, `tests/lib/external/viacep.test.ts`

**Interfaces:**
- Produces: `lookupCnpj(cnpj: string): Promise<CnpjResult | null>`, `lookupCep(cep: string): Promise<CepResult | null>` — consumed by `ClienteForm` (Task 16) via the `/api/lookup/*` routes.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/external/brasilapi.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupCnpj } from "@/lib/external/brasilapi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupCnpj", () => {
  it("maps a successful response to CnpjResult", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        razao_social: "JETAPRINT LTDA", cep: "12345000", logradouro: "Rua A",
        numero: "100", bairro: "Centro", municipio: "São Paulo", uf: "SP",
      }),
    }));

    const result = await lookupCnpj("12.345.678/0001-99");
    expect(result?.razaoSocial).toBe("JETAPRINT LTDA");
    expect(result?.uf).toBe("SP");
  });

  it("returns null when the API responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await lookupCnpj("00000000000000");
    expect(result).toBeNull();
  });
});
```

```ts
// tests/lib/external/viacep.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupCep } from "@/lib/external/viacep";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupCep", () => {
  it("maps a successful response to CepResult", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: "Rua A", bairro: "Centro", localidade: "São Paulo", uf: "SP" }),
    }));

    const result = await lookupCep("12345-000");
    expect(result?.endereco).toBe("Rua A");
  });

  it("returns null when ViaCEP reports an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) }));
    const result = await lookupCep("00000000");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/lib/external`
Expected: FAIL — cannot resolve `@/lib/external/brasilapi`, `@/lib/external/viacep`.

- [ ] **Step 3: Create `lib/external/brasilapi.ts`**

```ts
export interface CnpjResult {
  razaoSocial: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export async function lookupCnpj(cnpj: string): Promise<CnpjResult | null> {
  const digits = cnpj.replace(/\D/g, "");
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  if (!response.ok) return null;
  const data = await response.json();
  return {
    razaoSocial: data.razao_social ?? "",
    cep: data.cep ?? "",
    endereco: data.logradouro ?? "",
    numero: data.numero ?? "",
    bairro: data.bairro ?? "",
    cidade: data.municipio ?? "",
    uf: data.uf ?? "",
  };
}
```

- [ ] **Step 4: Create `lib/external/viacep.ts`**

```ts
export interface CepResult {
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export async function lookupCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, "");
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.erro) return null;
  return {
    endereco: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx vitest run tests/lib/external`
Expected: PASS

- [ ] **Step 6: Create the proxy API routes**

```ts
// app/api/lookup/cnpj/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { lookupCnpj } from "@/lib/external/brasilapi";

export async function GET(request: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cnpj = new URL(request.url).searchParams.get("cnpj");
  if (!cnpj) return NextResponse.json({ error: "Parâmetro cnpj obrigatório" }, { status: 400 });

  const result = await lookupCnpj(cnpj);
  if (!result) return NextResponse.json({ error: "CNPJ não encontrado" }, { status: 404 });
  return NextResponse.json(result);
}
```

```ts
// app/api/lookup/cep/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { lookupCep } from "@/lib/external/viacep";

export async function GET(request: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cep = new URL(request.url).searchParams.get("cep");
  if (!cep) return NextResponse.json({ error: "Parâmetro cep obrigatório" }, { status: 400 });

  const result = await lookupCep(cep);
  if (!result) return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
  return NextResponse.json(result);
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/external app/api/lookup tests/lib/external
git commit -m "feat: add CNPJ and CEP lookup proxies"
```

---

### Task 15: Cliente service + API

**Files:**
- Create: `lib/validators/cliente.ts`, `lib/services/clienteService.ts`, `app/api/clientes/route.ts`, `app/api/clientes/[id]/route.ts`, `tests/lib/services/clienteService.test.ts`

**Interfaces:**
- Produces: `listClientes(search?)`, `getCliente(id)`, `createCliente(input)`, `updateCliente(id, input)`, `deleteCliente(id)` — consumed by Task 16 (UI).

- [ ] **Step 1: Create `lib/validators/cliente.ts`**

```ts
import { z } from "zod";

export const clienteSchema = z.object({
  tipo: z.enum(["PF", "PJ"]),
  nome: z.string().min(1, "Nome obrigatório"),
  documento: z.string().min(11, "CPF/CNPJ inválido"),
  ie: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  prazoPagamento: z.number().int().nonnegative().optional(),
  observacoes: z.string().optional(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/services/clienteService.test.ts
import { describe, it, expect } from "vitest";
import { createCliente, listClientes, getCliente, updateCliente, deleteCliente } from "@/lib/services/clienteService";
import { NotFoundError } from "@/lib/errors";

const base = { tipo: "PJ" as const, nome: "Gráfica Exemplo", documento: "12345678000199" };

describe("clienteService", () => {
  it("creates and finds a cliente by search", async () => {
    await createCliente(base);
    const results = await listClientes("gráfica");
    expect(results).toHaveLength(1);
  });

  it("throws NotFoundError for a missing id", async () => {
    await expect(getCliente("id-inexistente")).rejects.toThrow(NotFoundError);
  });

  it("updates a cliente", async () => {
    const created = await createCliente(base);
    const updated = await updateCliente(created.id, { ...base, nome: "Gráfica Nova" });
    expect(updated.nome).toBe("Gráfica Nova");
  });

  it("deletes a cliente", async () => {
    const created = await createCliente(base);
    await deleteCliente(created.id);
    await expect(getCliente(created.id)).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/clienteService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/clienteService`.

- [ ] **Step 4: Create `lib/services/clienteService.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { ClienteInput } from "@/lib/validators/cliente";

export async function listClientes(search?: string) {
  const all = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  if (!search) return all;
  const query = search.toLowerCase();
  return all.filter((c) => c.nome.toLowerCase().includes(query) || c.documento.includes(query));
}

export async function getCliente(id: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new NotFoundError("Cliente não encontrado");
  return cliente;
}

export async function createCliente(input: ClienteInput) {
  return prisma.cliente.create({ data: input });
}

export async function updateCliente(id: string, input: ClienteInput) {
  await getCliente(id);
  return prisma.cliente.update({ where: { id }, data: input });
}

export async function deleteCliente(id: string) {
  await getCliente(id);
  await prisma.cliente.delete({ where: { id } });
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/clienteService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API routes**

```ts
// app/api/clientes/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { clienteSchema } from "@/lib/validators/cliente";
import { listClientes, createCliente } from "@/lib/services/clienteService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listClientes(search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = clienteSchema.parse(await request.json());
    return NextResponse.json(await createCliente(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

```ts
// app/api/clientes/[id]/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { clienteSchema } from "@/lib/validators/cliente";
import { getCliente, updateCliente, deleteCliente } from "@/lib/services/clienteService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getCliente(params.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = clienteSchema.parse(await request.json());
    return NextResponse.json(await updateCliente(params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    await deleteCliente(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/cliente.ts lib/services/clienteService.ts app/api/clientes tests/lib/services/clienteService.test.ts
git commit -m "feat: add cliente service and API"
```

---

### Task 16: Cliente UI (list, form with CNPJ/CEP autofill)

**Files:**
- Create: `components/forms/ClienteForm.tsx`, `app/(dashboard)/clientes/page.tsx`, `app/(dashboard)/clientes/novo/page.tsx`, `app/(dashboard)/clientes/[id]/page.tsx`, `tests/components/ClienteForm.test.tsx`

**Interfaces:**
- Consumes: `/api/clientes`, `/api/lookup/cnpj`, `/api/lookup/cep`.
- Produces: `ClienteForm` pattern reused structurally (not imported) by `FornecedorForm` (Task 18).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/ClienteForm.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import ClienteForm from "@/components/forms/ClienteForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ClienteForm", () => {
  it("autofills address fields after typing a CNPJ and blurring", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        razaoSocial: "JETAPRINT LTDA", cep: "12345000", endereco: "Rua A",
        numero: "100", bairro: "Centro", cidade: "São Paulo", uf: "SP",
      }),
    }));

    render(<ClienteForm />);
    const documento = screen.getByPlaceholderText("CNPJ");
    await userEvent.type(documento, "12345678000199");
    documento.blur();

    expect(await screen.findByDisplayValue("Rua A")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/components/ClienteForm.test.tsx`
Expected: FAIL — cannot resolve `@/components/forms/ClienteForm`.

- [ ] **Step 3: Create `components/forms/ClienteForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ClienteFormValues {
  id?: string;
  tipo: "PF" | "PJ";
  nome: string;
  documento: string;
  ie: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  prazoPagamento: string;
  observacoes: string;
}

const empty: ClienteFormValues = {
  tipo: "PJ", nome: "", documento: "", ie: "", telefone: "", email: "",
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  prazoPagamento: "", observacoes: "",
};

export default function ClienteForm({ initial }: { initial?: ClienteFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<ClienteFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleCnpjBlur() {
    if (values.tipo !== "PJ" || values.documento.replace(/\D/g, "").length !== 14) return;
    const response = await fetch(`/api/lookup/cnpj?cnpj=${values.documento}`);
    if (!response.ok) return;
    const data = await response.json();
    setValues((v) => ({
      ...v, nome: v.nome || data.razaoSocial, cep: data.cep, endereco: data.endereco,
      numero: data.numero, bairro: data.bairro, cidade: data.cidade, uf: data.uf,
    }));
  }

  async function handleCepBlur() {
    if (values.cep.replace(/\D/g, "").length !== 8) return;
    const response = await fetch(`/api/lookup/cep?cep=${values.cep}`);
    if (!response.ok) return;
    const data = await response.json();
    setValues((v) => ({ ...v, endereco: data.endereco, bairro: data.bairro, cidade: data.cidade, uf: data.uf }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = { ...values, prazoPagamento: values.prazoPagamento ? Number(values.prazoPagamento) : undefined };
    const url = values.id ? `/api/clientes/${values.id}` : "/api/clientes";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar cliente");
      return;
    }
    router.push("/clientes");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <select value={values.tipo} onChange={(e) => set("tipo", e.target.value as "PF" | "PJ")} className="rounded border px-3 py-2">
          <option value="PJ">Pessoa Jurídica</option>
          <option value="PF">Pessoa Física</option>
        </select>
        <input
          placeholder={values.tipo === "PJ" ? "CNPJ" : "CPF"}
          value={values.documento}
          onChange={(e) => set("documento", e.target.value)}
          onBlur={handleCnpjBlur}
          className="rounded border px-3 py-2"
          required
        />
      </div>
      <input placeholder="Nome / Razão Social" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="IE" value={values.ie} onChange={(e) => set("ie", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Telefone/WhatsApp" value={values.telefone} onChange={(e) => set("telefone", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <input placeholder="E-mail" value={values.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded border px-3 py-2" />
      <div className="grid grid-cols-3 gap-4">
        <input placeholder="CEP" value={values.cep} onChange={(e) => set("cep", e.target.value)} onBlur={handleCepBlur} className="rounded border px-3 py-2" />
        <input placeholder="Endereço" value={values.endereco} onChange={(e) => set("endereco", e.target.value)} className="col-span-2 rounded border px-3 py-2" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <input placeholder="Número" value={values.numero} onChange={(e) => set("numero", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Complemento" value={values.complemento} onChange={(e) => set("complemento", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Bairro" value={values.bairro} onChange={(e) => set("bairro", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Cidade/UF" value={`${values.cidade}${values.uf ? "/" + values.uf : ""}`} readOnly className="rounded border bg-gray-100 px-3 py-2" />
      </div>
      <input placeholder="Prazo de pagamento (dias)" type="number" value={values.prazoPagamento} onChange={(e) => set("prazoPagamento", e.target.value)} className="w-full rounded border px-3 py-2" />
      <textarea placeholder="Observações" value={values.observacoes} onChange={(e) => set("observacoes", e.target.value)} className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/components/ClienteForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Create the list, new, and edit pages**

```tsx
// app/(dashboard)/clientes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Cliente { id: string; nome: string; documento: string; telefone: string | null; }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/clientes?search=${encodeURIComponent(search)}`).then((r) => r.json()).then(setClientes);
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Clientes</h1>
        <Link href="/clientes/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo cliente</Link>
      </div>
      <input placeholder="Buscar por nome ou documento..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full max-w-md rounded border px-3 py-2" />
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">Documento</th><th className="py-2">Telefone</th></tr></thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/clientes/${c.id}`}>{c.nome}</Link></td>
              <td className="py-2">{c.documento}</td>
              <td className="py-2">{c.telefone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// app/(dashboard)/clientes/novo/page.tsx
import ClienteForm from "@/components/forms/ClienteForm";

export default function NovoClientePage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Novo cliente</h1>
      <ClienteForm />
    </div>
  );
}
```

```tsx
// app/(dashboard)/clientes/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import ClienteForm from "@/components/forms/ClienteForm";
import { notFound } from "next/navigation";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const cliente = await prisma.cliente.findUnique({ where: { id: params.id } });
  if (!cliente) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar cliente</h1>
      <ClienteForm
        initial={{
          id: cliente.id, tipo: cliente.tipo as "PF" | "PJ", nome: cliente.nome, documento: cliente.documento,
          ie: cliente.ie ?? "", telefone: cliente.telefone ?? "", email: cliente.email ?? "",
          cep: cliente.cep ?? "", endereco: cliente.endereco ?? "", numero: cliente.numero ?? "",
          complemento: cliente.complemento ?? "", bairro: cliente.bairro ?? "", cidade: cliente.cidade ?? "",
          uf: cliente.uf ?? "", prazoPagamento: cliente.prazoPagamento?.toString() ?? "",
          observacoes: cliente.observacoes ?? "",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, visit `/clientes`, create a client with a real CNPJ to confirm autofill, edit it, confirm the search box filters the list.

- [ ] **Step 7: Commit**

```bash
git add components/forms/ClienteForm.tsx "app/(dashboard)/clientes" tests/components/ClienteForm.test.tsx
git commit -m "feat: add cliente management UI with CNPJ/CEP autofill"
```

---

### Task 17: Fornecedor service + API

**Files:**
- Create: `lib/validators/fornecedor.ts`, `lib/services/fornecedorService.ts`, `app/api/fornecedores/route.ts`, `app/api/fornecedores/[id]/route.ts`, `tests/lib/services/fornecedorService.test.ts`

**Interfaces:**
- Produces: `listFornecedores(search?)`, `getFornecedor(id)`, `createFornecedor(input)`, `updateFornecedor(id, input)`, `deleteFornecedor(id)` — consumed by Task 18 (UI) and later by Task 19 (Substrato's fornecedor Combobox).

- [ ] **Step 1: Create `lib/validators/fornecedor.ts`**

```ts
import { z } from "zod";

export const fornecedorSchema = z.object({
  razaoSocial: z.string().min(1, "Razão social obrigatória"),
  cnpj: z.string().min(11, "CNPJ inválido"),
  contato: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  categoria: z.string().optional(),
});

export type FornecedorInput = z.infer<typeof fornecedorSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/services/fornecedorService.test.ts
import { describe, it, expect } from "vitest";
import { createFornecedor, listFornecedores, getFornecedor, updateFornecedor, deleteFornecedor } from "@/lib/services/fornecedorService";
import { NotFoundError } from "@/lib/errors";

const base = { razaoSocial: "Papelaria Central", cnpj: "98765432000188", categoria: "papel" };

describe("fornecedorService", () => {
  it("creates and finds a fornecedor by search", async () => {
    await createFornecedor(base);
    const results = await listFornecedores("papelaria");
    expect(results).toHaveLength(1);
  });

  it("throws NotFoundError for a missing id", async () => {
    await expect(getFornecedor("id-inexistente")).rejects.toThrow(NotFoundError);
  });

  it("updates a fornecedor", async () => {
    const created = await createFornecedor(base);
    const updated = await updateFornecedor(created.id, { ...base, razaoSocial: "Papelaria Nova" });
    expect(updated.razaoSocial).toBe("Papelaria Nova");
  });

  it("deletes a fornecedor", async () => {
    const created = await createFornecedor(base);
    await deleteFornecedor(created.id);
    await expect(getFornecedor(created.id)).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/fornecedorService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/fornecedorService`.

- [ ] **Step 4: Create `lib/services/fornecedorService.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { FornecedorInput } from "@/lib/validators/fornecedor";

export async function listFornecedores(search?: string) {
  const all = await prisma.fornecedor.findMany({ orderBy: { razaoSocial: "asc" } });
  if (!search) return all;
  const query = search.toLowerCase();
  return all.filter((f) => f.razaoSocial.toLowerCase().includes(query) || f.cnpj.includes(query));
}

export async function getFornecedor(id: string) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } });
  if (!fornecedor) throw new NotFoundError("Fornecedor não encontrado");
  return fornecedor;
}

export async function createFornecedor(input: FornecedorInput) {
  return prisma.fornecedor.create({ data: input });
}

export async function updateFornecedor(id: string, input: FornecedorInput) {
  await getFornecedor(id);
  return prisma.fornecedor.update({ where: { id }, data: input });
}

export async function deleteFornecedor(id: string) {
  await getFornecedor(id);
  await prisma.fornecedor.delete({ where: { id } });
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/fornecedorService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API routes**

```ts
// app/api/fornecedores/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { fornecedorSchema } from "@/lib/validators/fornecedor";
import { listFornecedores, createFornecedor } from "@/lib/services/fornecedorService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listFornecedores(search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = fornecedorSchema.parse(await request.json());
    return NextResponse.json(await createFornecedor(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

```ts
// app/api/fornecedores/[id]/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { fornecedorSchema } from "@/lib/validators/fornecedor";
import { getFornecedor, updateFornecedor, deleteFornecedor } from "@/lib/services/fornecedorService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getFornecedor(params.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = fornecedorSchema.parse(await request.json());
    return NextResponse.json(await updateFornecedor(params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    await deleteFornecedor(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/fornecedor.ts lib/services/fornecedorService.ts app/api/fornecedores tests/lib/services/fornecedorService.test.ts
git commit -m "feat: add fornecedor service and API"
```

---

### Task 18: Fornecedor UI (list, form with CNPJ/CEP autofill)

**Files:**
- Create: `components/forms/FornecedorForm.tsx`, `app/(dashboard)/fornecedores/page.tsx`, `app/(dashboard)/fornecedores/novo/page.tsx`, `app/(dashboard)/fornecedores/[id]/page.tsx`

**Interfaces:**
- Consumes: `/api/fornecedores`, `/api/lookup/cnpj`, `/api/lookup/cep`.
- Produces: fornecedor list data shape `{ id, razaoSocial }` consumed by the Combobox in Task 19 (Substrato form).

Mirrors `ClienteForm` from Task 16 (same autofill pattern; no PF/PJ toggle since fornecedores are always CNPJ). No dedicated component test — the autofill logic is already covered structurally by Task 16's test; this task is verified manually.

- [ ] **Step 1: Create `components/forms/FornecedorForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FornecedorFormValues {
  id?: string;
  razaoSocial: string;
  cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  categoria: string;
}

const empty: FornecedorFormValues = {
  razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", cep: "",
  endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", categoria: "",
};

export default function FornecedorForm({ initial }: { initial?: FornecedorFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<FornecedorFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof FornecedorFormValues>(key: K, value: FornecedorFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleCnpjBlur() {
    if (values.cnpj.replace(/\D/g, "").length !== 14) return;
    const response = await fetch(`/api/lookup/cnpj?cnpj=${values.cnpj}`);
    if (!response.ok) return;
    const data = await response.json();
    setValues((v) => ({
      ...v, razaoSocial: v.razaoSocial || data.razaoSocial, cep: data.cep, endereco: data.endereco,
      numero: data.numero, bairro: data.bairro, cidade: data.cidade, uf: data.uf,
    }));
  }

  async function handleCepBlur() {
    if (values.cep.replace(/\D/g, "").length !== 8) return;
    const response = await fetch(`/api/lookup/cep?cep=${values.cep}`);
    if (!response.ok) return;
    const data = await response.json();
    setValues((v) => ({ ...v, endereco: data.endereco, bairro: data.bairro, cidade: data.cidade, uf: data.uf }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = values.id ? `/api/fornecedores/${values.id}` : "/api/fornecedores";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar fornecedor");
      return;
    }
    router.push("/fornecedores");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <input placeholder="CNPJ" value={values.cnpj} onChange={(e) => set("cnpj", e.target.value)} onBlur={handleCnpjBlur} className="w-full rounded border px-3 py-2" required />
      <input placeholder="Razão social" value={values.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="Contato" value={values.contato} onChange={(e) => set("contato", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Telefone" value={values.telefone} onChange={(e) => set("telefone", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <input placeholder="E-mail" value={values.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded border px-3 py-2" />
      <div className="grid grid-cols-3 gap-4">
        <input placeholder="CEP" value={values.cep} onChange={(e) => set("cep", e.target.value)} onBlur={handleCepBlur} className="rounded border px-3 py-2" />
        <input placeholder="Endereço" value={values.endereco} onChange={(e) => set("endereco", e.target.value)} className="col-span-2 rounded border px-3 py-2" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <input placeholder="Número" value={values.numero} onChange={(e) => set("numero", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Complemento" value={values.complemento} onChange={(e) => set("complemento", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Bairro" value={values.bairro} onChange={(e) => set("bairro", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Cidade/UF" value={`${values.cidade}${values.uf ? "/" + values.uf : ""}`} readOnly className="rounded border bg-gray-100 px-3 py-2" />
      </div>
      <input placeholder="Categoria de fornecimento (papel, tinta, chapas...)" value={values.categoria} onChange={(e) => set("categoria", e.target.value)} className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
```

- [ ] **Step 2: Create the list, new, and edit pages**

```tsx
// app/(dashboard)/fornecedores/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fornecedor { id: string; razaoSocial: string; cnpj: string; categoria: string | null; }

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/fornecedores?search=${encodeURIComponent(search)}`).then((r) => r.json()).then(setFornecedores);
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Fornecedores</h1>
        <Link href="/fornecedores/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo fornecedor</Link>
      </div>
      <input placeholder="Buscar por razão social ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full max-w-md rounded border px-3 py-2" />
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Razão social</th><th className="py-2">CNPJ</th><th className="py-2">Categoria</th></tr></thead>
        <tbody>
          {fornecedores.map((f) => (
            <tr key={f.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/fornecedores/${f.id}`}>{f.razaoSocial}</Link></td>
              <td className="py-2">{f.cnpj}</td>
              <td className="py-2">{f.categoria}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// app/(dashboard)/fornecedores/novo/page.tsx
import FornecedorForm from "@/components/forms/FornecedorForm";

export default function NovoFornecedorPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Novo fornecedor</h1>
      <FornecedorForm />
    </div>
  );
}
```

```tsx
// app/(dashboard)/fornecedores/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import FornecedorForm from "@/components/forms/FornecedorForm";
import { notFound } from "next/navigation";

export default async function EditarFornecedorPage({ params }: { params: { id: string } }) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id: params.id } });
  if (!fornecedor) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar fornecedor</h1>
      <FornecedorForm
        initial={{
          id: fornecedor.id, razaoSocial: fornecedor.razaoSocial, cnpj: fornecedor.cnpj,
          contato: fornecedor.contato ?? "", telefone: fornecedor.telefone ?? "", email: fornecedor.email ?? "",
          cep: fornecedor.cep ?? "", endereco: fornecedor.endereco ?? "", numero: fornecedor.numero ?? "",
          complemento: fornecedor.complemento ?? "", bairro: fornecedor.bairro ?? "", cidade: fornecedor.cidade ?? "",
          uf: fornecedor.uf ?? "", categoria: fornecedor.categoria ?? "",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, visit `/fornecedores`, create a fornecedor with autofill, edit it, confirm search filters correctly.

- [ ] **Step 4: Commit**

```bash
git add components/forms/FornecedorForm.tsx "app/(dashboard)/fornecedores"
git commit -m "feat: add fornecedor management UI"
```

---

### Task 19: Substrato service + API (per-tipo atributos, cost sanitization for OPERADOR)

**Files:**
- Create: `lib/validators/substrato.ts`, `lib/services/substratoService.ts`, `app/api/substratos/route.ts`, `app/api/substratos/[id]/route.ts`, `tests/lib/services/substratoService.test.ts`

**Interfaces:**
- Consumes: `isAdmin`, `ForbiddenError`/`NotFoundError`.
- Produces: `listSubstratos(role, search?)`, `getSubstrato(role, id)`, `createSubstrato(role, input)`, `updateSubstrato(role, id, input)`, `deleteSubstrato(role, id)` — consumed by Task 20 (UI). `tiposSubstrato` constant array — consumed by Task 20's dynamic form.

This is the task that implements the spec's requirement that OPERADOR has no visibility into `custoUnitario`/`markup` in Precificação — read is open to any authenticated role (sanitized), writes are ADMIN-only.

- [ ] **Step 1: Create `lib/validators/substrato.ts`**

```ts
import { z } from "zod";

export const tiposSubstrato = [
  "PAPEL", "LONA", "ADESIVO", "PVC", "ACRILICO", "CHAPA_OFFSET", "TINTA", "VERNIZ", "LAMINADO",
] as const;

export const substratoSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo: z.enum(tiposSubstrato),
  fornecedorId: z.string().optional(),
  unidadeMedida: z.string().min(1, "Unidade de medida obrigatória"),
  custoUnitario: z.number().nonnegative(),
  percentualPerda: z.number().min(0).max(100).default(0),
  markup: z.number().min(0).default(0),
  atributos: z.record(z.string(), z.union([z.string(), z.number()])),
  ativo: z.boolean().default(true),
});

export type SubstratoInput = z.infer<typeof substratoSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/services/substratoService.test.ts
import { describe, it, expect } from "vitest";
import { createSubstrato, listSubstratos, getSubstrato } from "@/lib/services/substratoService";
import { ForbiddenError } from "@/lib/errors";

const base = {
  nome: "Couché 300g", tipo: "PAPEL" as const, unidadeMedida: "folha",
  custoUnitario: 1.5, percentualPerda: 5, markup: 30,
  atributos: { gramatura: 300, formato: "66x96", acabamento: "brilho" },
  ativo: true,
};

describe("substratoService", () => {
  it("blocks OPERADOR from creating a substrato", async () => {
    await expect(createSubstrato("OPERADOR", base)).rejects.toThrow(ForbiddenError);
  });

  it("stores and returns atributos as an object for ADMIN", async () => {
    const created = await createSubstrato("ADMIN", base);
    expect(created.atributos).toEqual(base.atributos);
  });

  it("hides custoUnitario and markup for OPERADOR reads", async () => {
    const created = await createSubstrato("ADMIN", base);
    const found = (await getSubstrato("OPERADOR", created.id)) as Record<string, unknown>;
    expect(found.custoUnitario).toBeUndefined();
    expect(found.markup).toBeUndefined();
    expect(found.nome).toBe("Couché 300g");
  });

  it("shows custoUnitario and markup for ADMIN reads", async () => {
    const created = await createSubstrato("ADMIN", base);
    const found = (await getSubstrato("ADMIN", created.id)) as Record<string, unknown>;
    expect(found.custoUnitario).toBe(1.5);
  });

  it("filters by name in listSubstratos", async () => {
    await createSubstrato("ADMIN", base);
    const results = await listSubstratos("ADMIN", "couché");
    expect(results).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/substratoService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/substratoService`.

- [ ] **Step 4: Create `lib/services/substratoService.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { SubstratoInput } from "@/lib/validators/substrato";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores podem gerenciar precificação e substratos");
}

function parseAtributos(raw: string): Record<string, string | number> {
  return JSON.parse(raw);
}

type SubstratoRow = Awaited<ReturnType<typeof prisma.substrato.findFirstOrThrow>>;

function sanitize(substrato: SubstratoRow, role: Role | null) {
  const withParsedAtributos = { ...substrato, atributos: parseAtributos(substrato.atributos) };
  if (isAdmin(role)) return withParsedAtributos;
  const { custoUnitario, markup, ...rest } = withParsedAtributos;
  return rest;
}

export async function listSubstratos(role: Role | null, search?: string) {
  const all = await prisma.substrato.findMany({ orderBy: { nome: "asc" } });
  const filtered = search ? all.filter((s) => s.nome.toLowerCase().includes(search.toLowerCase())) : all;
  return filtered.map((s) => sanitize(s, role));
}

export async function getSubstrato(role: Role | null, id: string) {
  const substrato = await prisma.substrato.findUnique({ where: { id } });
  if (!substrato) throw new NotFoundError("Substrato não encontrado");
  return sanitize(substrato, role);
}

export async function createSubstrato(role: Role | null, input: SubstratoInput) {
  assertAdmin(role);
  const created = await prisma.substrato.create({ data: { ...input, atributos: JSON.stringify(input.atributos) } });
  return { ...created, atributos: parseAtributos(created.atributos) };
}

export async function updateSubstrato(role: Role | null, id: string, input: SubstratoInput) {
  assertAdmin(role);
  const existing = await prisma.substrato.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Substrato não encontrado");
  const updated = await prisma.substrato.update({
    where: { id }, data: { ...input, atributos: JSON.stringify(input.atributos) },
  });
  return { ...updated, atributos: parseAtributos(updated.atributos) };
}

export async function deleteSubstrato(role: Role | null, id: string) {
  assertAdmin(role);
  const existing = await prisma.substrato.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Substrato não encontrado");
  await prisma.substrato.delete({ where: { id } });
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/substratoService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API routes**

```ts
// app/api/substratos/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { substratoSchema } from "@/lib/validators/substrato";
import { listSubstratos, createSubstrato } from "@/lib/services/substratoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listSubstratos(role, search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = substratoSchema.parse(await request.json());
    return NextResponse.json(await createSubstrato(role, body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

```ts
// app/api/substratos/[id]/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { substratoSchema } from "@/lib/validators/substrato";
import { getSubstrato, updateSubstrato, deleteSubstrato } from "@/lib/services/substratoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getSubstrato(role, params.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = substratoSchema.parse(await request.json());
    return NextResponse.json(await updateSubstrato(role, params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    await deleteSubstrato(role, params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/substrato.ts lib/services/substratoService.ts app/api/substratos tests/lib/services/substratoService.test.ts
git commit -m "feat: add substrato service and API with per-tipo atributos and cost sanitization"
```

---

### Task 20: Substrato UI (dynamic fields by tipo)

**Files:**
- Create: `components/forms/SubstratoForm.tsx`, `app/(dashboard)/precificacao/page.tsx`, `app/(dashboard)/precificacao/substratos/novo/page.tsx`, `app/(dashboard)/precificacao/substratos/[id]/page.tsx`

**Interfaces:**
- Consumes: `/api/substratos`, `/api/fornecedores` (for the fornecedor Combobox), `tiposSubstrato` from `lib/validators/substrato.ts`, `Combobox` from Task 7.
- Produces: `app/(dashboard)/precificacao/page.tsx` also lists Equipamentos, added to in Task 22.

- [ ] **Step 1: Create `components/forms/SubstratoForm.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "@/components/ui/Combobox";
import { tiposSubstrato } from "@/lib/validators/substrato";

interface Fornecedor { id: string; razaoSocial: string; }

const camposPorTipo: Record<(typeof tiposSubstrato)[number], { key: string; label: string }[]> = {
  PAPEL: [
    { key: "gramatura", label: "Gramatura (g/m²)" },
    { key: "formato", label: "Formato da folha" },
    { key: "acabamento", label: "Acabamento superficial" },
  ],
  LONA: [
    { key: "tipoLona", label: "Tipo (frontlight/backlight/blackout)" },
    { key: "larguraBobina", label: "Largura da bobina (m)" },
    { key: "gramatura", label: "Gramatura" },
  ],
  ADESIVO: [
    { key: "tipoAdesivo", label: "Tipo (brilho/fosco/perfurado/refletivo)" },
    { key: "larguraBobina", label: "Largura da bobina (m)" },
  ],
  PVC: [
    { key: "espessura", label: "Espessura (mm)" },
    { key: "formatoChapa", label: "Formato da chapa" },
  ],
  ACRILICO: [
    { key: "espessura", label: "Espessura (mm)" },
    { key: "formatoChapa", label: "Formato da chapa" },
    { key: "corTransparencia", label: "Cor/transparência" },
  ],
  CHAPA_OFFSET: [
    { key: "formato", label: "Formato" },
    { key: "tipoCtp", label: "Tipo CTP" },
  ],
  TINTA: [
    { key: "sistema", label: "Sistema (CMYK/Pantone)" },
    { key: "rendimento", label: "Rendimento" },
    { key: "uso", label: "Uso (offset/digital/UV)" },
  ],
  VERNIZ: [
    { key: "tipoVerniz", label: "Tipo (UV total/localizado)" },
    { key: "rendimento", label: "Rendimento" },
  ],
  LAMINADO: [
    { key: "tipoLaminado", label: "Tipo (BOPP fosco/brilho/soft touch)" },
    { key: "larguraBobina", label: "Largura da bobina (m)" },
  ],
};

export interface SubstratoFormValues {
  id?: string;
  nome: string;
  tipo: (typeof tiposSubstrato)[number];
  fornecedorId: string;
  unidadeMedida: string;
  custoUnitario: string;
  percentualPerda: string;
  markup: string;
  atributos: Record<string, string>;
  ativo: boolean;
}

const empty: SubstratoFormValues = {
  nome: "", tipo: "PAPEL", fornecedorId: "", unidadeMedida: "",
  custoUnitario: "", percentualPerda: "0", markup: "0", atributos: {}, ativo: true,
};

export default function SubstratoForm({ initial }: { initial?: SubstratoFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<SubstratoFormValues>(initial ?? empty);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/fornecedores").then((r) => r.json()).then(setFornecedores);
  }, []);

  function set<K extends keyof SubstratoFormValues>(key: K, value: SubstratoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setAtributo(key: string, value: string) {
    setValues((v) => ({ ...v, atributos: { ...v.atributos, [key]: value } }));
  }

  const fornecedorSelecionado = fornecedores.find((f) => f.id === values.fornecedorId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      ...values,
      fornecedorId: values.fornecedorId || undefined,
      custoUnitario: Number(values.custoUnitario),
      percentualPerda: Number(values.percentualPerda),
      markup: Number(values.markup),
    };
    const url = values.id ? `/api/substratos/${values.id}` : "/api/substratos";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar substrato");
      return;
    }
    router.push("/precificacao");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <input placeholder="Nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <select value={values.tipo} onChange={(e) => set("tipo", e.target.value as SubstratoFormValues["tipo"])} className="w-full rounded border px-3 py-2">
        {tiposSubstrato.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
      </select>
      <Combobox
        items={fornecedores}
        value={fornecedorSelecionado}
        onChange={(f) => set("fornecedorId", f.id)}
        getLabel={(f) => f.razaoSocial}
        placeholder="Fornecedor"
      />
      <div className="grid grid-cols-3 gap-4">
        <input placeholder="Unidade de medida" value={values.unidadeMedida} onChange={(e) => set("unidadeMedida", e.target.value)} className="rounded border px-3 py-2" required />
        <input type="number" step="0.01" placeholder="Custo unitário" value={values.custoUnitario} onChange={(e) => set("custoUnitario", e.target.value)} className="rounded border px-3 py-2" required />
        <input type="number" step="0.01" placeholder="Markup (%)" value={values.markup} onChange={(e) => set("markup", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <input type="number" step="0.01" placeholder="Perda padrão (%)" value={values.percentualPerda} onChange={(e) => set("percentualPerda", e.target.value)} className="w-full rounded border px-3 py-2" />

      <fieldset className="space-y-2 rounded border p-4">
        <legend className="px-1 text-sm text-gray-500">Campos específicos de {values.tipo}</legend>
        {camposPorTipo[values.tipo].map((campo) => (
          <input
            key={campo.key}
            placeholder={campo.label}
            value={values.atributos[campo.key] ?? ""}
            onChange={(e) => setAtributo(campo.key, e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.ativo} onChange={(e) => set("ativo", e.target.checked)} />
        Ativo
      </label>
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/precificacao/page.tsx`** (Substratos list only for now — Equipamentos list added in Task 22)

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Substrato { id: string; nome: string; tipo: string; unidadeMedida: string; ativo: boolean; }

export default function PrecificacaoPage() {
  const [substratos, setSubstratos] = useState<Substrato[]>([]);

  useEffect(() => {
    fetch("/api/substratos").then((r) => r.json()).then(setSubstratos);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Precificação e Substratos</h1>
        <Link href="/precificacao/substratos/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo substrato</Link>
      </div>
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">Tipo</th><th className="py-2">Unidade</th><th className="py-2">Status</th></tr></thead>
        <tbody>
          {substratos.map((s) => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/precificacao/substratos/${s.id}`}>{s.nome}</Link></td>
              <td className="py-2">{s.tipo}</td>
              <td className="py-2">{s.unidadeMedida}</td>
              <td className="py-2">{s.ativo ? "Ativo" : "Inativo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create the new/edit substrato pages**

```tsx
// app/(dashboard)/precificacao/substratos/novo/page.tsx
import SubstratoForm from "@/components/forms/SubstratoForm";

export default function NovoSubstratoPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Novo substrato</h1>
      <SubstratoForm />
    </div>
  );
}
```

```tsx
// app/(dashboard)/precificacao/substratos/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import SubstratoForm from "@/components/forms/SubstratoForm";
import { notFound } from "next/navigation";
import type { tiposSubstrato } from "@/lib/validators/substrato";

export default async function EditarSubstratoPage({ params }: { params: { id: string } }) {
  const substrato = await prisma.substrato.findUnique({ where: { id: params.id } });
  if (!substrato) notFound();

  const atributos = JSON.parse(substrato.atributos) as Record<string, string>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar substrato</h1>
      <SubstratoForm
        initial={{
          id: substrato.id, nome: substrato.nome, tipo: substrato.tipo as (typeof tiposSubstrato)[number],
          fornecedorId: substrato.fornecedorId ?? "", unidadeMedida: substrato.unidadeMedida,
          custoUnitario: substrato.custoUnitario.toString(), percentualPerda: substrato.percentualPerda.toString(),
          markup: substrato.markup.toString(), atributos, ativo: substrato.ativo,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev` as ADMIN, visit `/precificacao`, create substratos of a few different tipos, confirm the extra fields switch correctly and save/load properly. Log in as OPERADOR (create one via Usuários) and confirm the substrato list loads without a custo/markup column (the API response has those fields stripped).

- [ ] **Step 5: Commit**

```bash
git add components/forms/SubstratoForm.tsx "app/(dashboard)/precificacao"
git commit -m "feat: add substrato management UI with per-tipo dynamic fields"
```

---

### Task 21: Equipamento service + API

**Files:**
- Create: `lib/validators/equipamento.ts`, `lib/services/equipamentoService.ts`, `app/api/equipamentos/route.ts`, `app/api/equipamentos/[id]/route.ts`, `tests/lib/services/equipamentoService.test.ts`

**Interfaces:**
- Produces: `listEquipamentos(role, search?)`, `getEquipamento(role, id)`, `createEquipamento(role, input)`, `updateEquipamento(role, id, input)`, `deleteEquipamento(role, id)` — consumed by Task 22 (UI). Same permission model as Substrato: reads open to any role (with `custoHora` stripped for OPERADOR), writes ADMIN-only.

- [ ] **Step 1: Create `lib/validators/equipamento.ts`**

```ts
import { z } from "zod";

export const tiposEquipamento = ["DIGITAL", "OFFSET"] as const;

export const equipamentoSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo: z.enum(tiposEquipamento),
  velocidade: z.number().positive(),
  unidadeVelocidade: z.string().min(1, "Unidade de velocidade obrigatória"),
  formatoMaximo: z.string().min(1, "Formato máximo obrigatório"),
  custoHora: z.number().nonnegative(),
  tempoSetupMin: z.number().int().nonnegative(),
  percentualPerda: z.number().min(0).max(100).default(0),
  acabamentosSuportados: z.array(z.string()),
  ativo: z.boolean().default(true),
});

export type EquipamentoInput = z.infer<typeof equipamentoSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/services/equipamentoService.test.ts
import { describe, it, expect } from "vitest";
import { createEquipamento, listEquipamentos, getEquipamento } from "@/lib/services/equipamentoService";
import { ForbiddenError } from "@/lib/errors";

const base = {
  nome: "HP Indigo 12000", tipo: "DIGITAL" as const, velocidade: 4600, unidadeVelocidade: "folhas/hora",
  formatoMaximo: "72x104cm", custoHora: 350, tempoSetupMin: 15, percentualPerda: 3,
  acabamentosSuportados: ["laminação", "verniz UV"], ativo: true,
};

describe("equipamentoService", () => {
  it("blocks OPERADOR from creating an equipamento", async () => {
    await expect(createEquipamento("OPERADOR", base)).rejects.toThrow(ForbiddenError);
  });

  it("hides custoHora for OPERADOR reads", async () => {
    const created = await createEquipamento("ADMIN", base);
    const found = (await getEquipamento("OPERADOR", created.id)) as Record<string, unknown>;
    expect(found.custoHora).toBeUndefined();
    expect(found.nome).toBe("HP Indigo 12000");
  });

  it("shows custoHora for ADMIN reads", async () => {
    const created = await createEquipamento("ADMIN", base);
    const found = (await getEquipamento("ADMIN", created.id)) as Record<string, unknown>;
    expect(found.custoHora).toBe(350);
  });

  it("filters by name in listEquipamentos", async () => {
    await createEquipamento("ADMIN", base);
    const results = await listEquipamentos("ADMIN", "indigo");
    expect(results).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run tests/lib/services/equipamentoService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/equipamentoService`.

- [ ] **Step 4: Create `lib/services/equipamentoService.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { EquipamentoInput } from "@/lib/validators/equipamento";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores podem gerenciar equipamentos");
}

function parseAcabamentos(raw: string): string[] {
  return JSON.parse(raw);
}

type EquipamentoRow = Awaited<ReturnType<typeof prisma.equipamento.findFirstOrThrow>>;

function sanitize(equipamento: EquipamentoRow, role: Role | null) {
  const parsed = { ...equipamento, acabamentosSuportados: parseAcabamentos(equipamento.acabamentosSuportados) };
  if (isAdmin(role)) return parsed;
  const { custoHora, ...rest } = parsed;
  return rest;
}

export async function listEquipamentos(role: Role | null, search?: string) {
  const all = await prisma.equipamento.findMany({ orderBy: { nome: "asc" } });
  const filtered = search ? all.filter((e) => e.nome.toLowerCase().includes(search.toLowerCase())) : all;
  return filtered.map((e) => sanitize(e, role));
}

export async function getEquipamento(role: Role | null, id: string) {
  const equipamento = await prisma.equipamento.findUnique({ where: { id } });
  if (!equipamento) throw new NotFoundError("Equipamento não encontrado");
  return sanitize(equipamento, role);
}

export async function createEquipamento(role: Role | null, input: EquipamentoInput) {
  assertAdmin(role);
  const created = await prisma.equipamento.create({
    data: { ...input, acabamentosSuportados: JSON.stringify(input.acabamentosSuportados) },
  });
  return { ...created, acabamentosSuportados: parseAcabamentos(created.acabamentosSuportados) };
}

export async function updateEquipamento(role: Role | null, id: string, input: EquipamentoInput) {
  assertAdmin(role);
  const existing = await prisma.equipamento.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Equipamento não encontrado");
  const updated = await prisma.equipamento.update({
    where: { id }, data: { ...input, acabamentosSuportados: JSON.stringify(input.acabamentosSuportados) },
  });
  return { ...updated, acabamentosSuportados: parseAcabamentos(updated.acabamentosSuportados) };
}

export async function deleteEquipamento(role: Role | null, id: string) {
  assertAdmin(role);
  const existing = await prisma.equipamento.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Equipamento não encontrado");
  await prisma.equipamento.delete({ where: { id } });
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run tests/lib/services/equipamentoService.test.ts`
Expected: PASS

- [ ] **Step 6: Create the API routes**

```ts
// app/api/equipamentos/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { equipamentoSchema } from "@/lib/validators/equipamento";
import { listEquipamentos, createEquipamento } from "@/lib/services/equipamentoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listEquipamentos(role, search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = equipamentoSchema.parse(await request.json());
    return NextResponse.json(await createEquipamento(role, body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

```ts
// app/api/equipamentos/[id]/route.ts
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { equipamentoSchema } from "@/lib/validators/equipamento";
import { getEquipamento, updateEquipamento, deleteEquipamento } from "@/lib/services/equipamentoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getEquipamento(role, params.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = equipamentoSchema.parse(await request.json());
    return NextResponse.json(await updateEquipamento(role, params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    await deleteEquipamento(role, params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/equipamento.ts lib/services/equipamentoService.ts app/api/equipamentos tests/lib/services/equipamentoService.test.ts
git commit -m "feat: add equipamento service and API with cost sanitization"
```

---

### Task 22: Equipamento UI

**Files:**
- Create: `components/forms/EquipamentoForm.tsx`, `app/(dashboard)/precificacao/equipamentos/novo/page.tsx`, `app/(dashboard)/precificacao/equipamentos/[id]/page.tsx`
- Modify: `app/(dashboard)/precificacao/page.tsx` (add an Equipamentos section/tab alongside Substratos)

**Interfaces:**
- Consumes: `/api/equipamentos`.
- Produces: nothing consumed by later tasks — this is the last task of the sub-project.

- [ ] **Step 1: Create `components/forms/EquipamentoForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tiposEquipamento } from "@/lib/validators/equipamento";

export interface EquipamentoFormValues {
  id?: string;
  nome: string;
  tipo: (typeof tiposEquipamento)[number];
  velocidade: string;
  unidadeVelocidade: string;
  formatoMaximo: string;
  custoHora: string;
  tempoSetupMin: string;
  percentualPerda: string;
  acabamentosSuportados: string;
  ativo: boolean;
}

const empty: EquipamentoFormValues = {
  nome: "", tipo: "DIGITAL", velocidade: "", unidadeVelocidade: "", formatoMaximo: "",
  custoHora: "", tempoSetupMin: "0", percentualPerda: "0", acabamentosSuportados: "", ativo: true,
};

export default function EquipamentoForm({ initial }: { initial?: EquipamentoFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<EquipamentoFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof EquipamentoFormValues>(key: K, value: EquipamentoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      ...values,
      velocidade: Number(values.velocidade),
      custoHora: Number(values.custoHora),
      tempoSetupMin: Number(values.tempoSetupMin),
      percentualPerda: Number(values.percentualPerda),
      acabamentosSuportados: values.acabamentosSuportados.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const url = values.id ? `/api/equipamentos/${values.id}` : "/api/equipamentos";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar equipamento");
      return;
    }
    router.push("/precificacao");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <input placeholder="Nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <select value={values.tipo} onChange={(e) => set("tipo", e.target.value as EquipamentoFormValues["tipo"])} className="w-full rounded border px-3 py-2">
        {tiposEquipamento.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-4">
        <input type="number" placeholder="Velocidade" value={values.velocidade} onChange={(e) => set("velocidade", e.target.value)} className="rounded border px-3 py-2" required />
        <input placeholder="Unidade (folhas/hora, m²/hora...)" value={values.unidadeVelocidade} onChange={(e) => set("unidadeVelocidade", e.target.value)} className="rounded border px-3 py-2" required />
      </div>
      <input placeholder="Formato máximo" value={values.formatoMaximo} onChange={(e) => set("formatoMaximo", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <div className="grid grid-cols-3 gap-4">
        <input type="number" step="0.01" placeholder="Custo por hora" value={values.custoHora} onChange={(e) => set("custoHora", e.target.value)} className="rounded border px-3 py-2" required />
        <input type="number" placeholder="Setup (min)" value={values.tempoSetupMin} onChange={(e) => set("tempoSetupMin", e.target.value)} className="rounded border px-3 py-2" />
        <input type="number" step="0.01" placeholder="Perda padrão (%)" value={values.percentualPerda} onChange={(e) => set("percentualPerda", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <input placeholder="Acabamentos suportados (separados por vírgula)" value={values.acabamentosSuportados} onChange={(e) => set("acabamentosSuportados", e.target.value)} className="w-full rounded border px-3 py-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.ativo} onChange={(e) => set("ativo", e.target.checked)} />
        Ativo
      </label>
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
```

- [ ] **Step 2: Create the new/edit equipamento pages**

```tsx
// app/(dashboard)/precificacao/equipamentos/novo/page.tsx
import EquipamentoForm from "@/components/forms/EquipamentoForm";

export default function NovoEquipamentoPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Novo equipamento</h1>
      <EquipamentoForm />
    </div>
  );
}
```

```tsx
// app/(dashboard)/precificacao/equipamentos/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import EquipamentoForm from "@/components/forms/EquipamentoForm";
import { notFound } from "next/navigation";
import type { tiposEquipamento } from "@/lib/validators/equipamento";

export default async function EditarEquipamentoPage({ params }: { params: { id: string } }) {
  const equipamento = await prisma.equipamento.findUnique({ where: { id: params.id } });
  if (!equipamento) notFound();

  const acabamentos = JSON.parse(equipamento.acabamentosSuportados) as string[];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar equipamento</h1>
      <EquipamentoForm
        initial={{
          id: equipamento.id, nome: equipamento.nome, tipo: equipamento.tipo as (typeof tiposEquipamento)[number],
          velocidade: equipamento.velocidade.toString(), unidadeVelocidade: equipamento.unidadeVelocidade,
          formatoMaximo: equipamento.formatoMaximo, custoHora: equipamento.custoHora.toString(),
          tempoSetupMin: equipamento.tempoSetupMin.toString(), percentualPerda: equipamento.percentualPerda.toString(),
          acabamentosSuportados: acabamentos.join(", "), ativo: equipamento.ativo,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add an Equipamentos section to the Precificação page**

Modify `app/(dashboard)/precificacao/page.tsx` — add a second state/list and section below the Substratos table:

```tsx
// add near the top, alongside the Substrato interface and state
interface Equipamento { id: string; nome: string; tipo: string; formatoMaximo: string; ativo: boolean; }

// inside the component, alongside the substratos state and effect
const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);

useEffect(() => {
  fetch("/api/equipamentos").then((r) => r.json()).then(setEquipamentos);
}, []);
```

Add this JSX block after the Substratos `</table>`:

```tsx
<div className="mt-10 mb-4 flex items-center justify-between">
  <h2 className="text-xl font-semibold text-marinho">Equipamentos</h2>
  <Link href="/precificacao/equipamentos/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo equipamento</Link>
</div>
<table className="w-full text-left">
  <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">Tipo</th><th className="py-2">Formato máximo</th><th className="py-2">Status</th></tr></thead>
  <tbody>
    {equipamentos.map((e) => (
      <tr key={e.id} className="border-b hover:bg-gray-50">
        <td className="py-2"><Link href={`/precificacao/equipamentos/${e.id}`}>{e.nome}</Link></td>
        <td className="py-2">{e.tipo}</td>
        <td className="py-2">{e.formatoMaximo}</td>
        <td className="py-2">{e.ativo ? "Ativo" : "Inativo"}</td>
      </tr>
    ))}
  </tbody>
</table>
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests across every task pass.

- [ ] **Step 5: Verify manually end-to-end**

Run: `npm run dev`. As ADMIN: create an equipamento, confirm it appears in `/precificacao`. As OPERADOR: confirm the equipamento list loads without `custoHora`. Click through every sidebar module (Clientes, Fornecedores, Precificação, Configurações) to confirm nothing is broken.

- [ ] **Step 6: Commit**

```bash
git add components/forms/EquipamentoForm.tsx "app/(dashboard)/precificacao"
git commit -m "feat: add equipamento management UI, completing Fundação + Cadastros"
```
