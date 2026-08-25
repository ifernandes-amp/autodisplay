# Semana 1 / Etapa 01 — Setup técnico

> Runbook de execução da primeira etapa da Semana 1. Este documento trava decisões, baseline de segurança e critério de aceite. **Não substitui implementação** — é o norte para quem for codar em `appofc/`.

---

## Status

| Campo | Valor |
|---|---|
| **Etapa** | `semana1/01-setup-tecnico` |
| **Estado** | Implementação local e CI concluídas · **deploy HTTPS pendente** |
| **Última atualização** | 24/08/2026 |
| **Norte geral** | [norte-semanal.md](../../norte-semanal.md) |
| **Regras de pasta** | [CONTEXTO_AGENTES.md](../../../../CONTEXTO_AGENTES.md) |

O checkbox desta etapa em `norte-semanal.md` **permanece `[ ]`** até o critério de aceite ao final deste documento ser cumprido de fato.

---

## 1. Objetivo

Colocar o **esqueleto técnico** do sistema no ar — local e produção — com baseline de segurança, CI e convenções que as etapas seguintes vão copiar sem reabrir decisão.

**Entregável da etapa:** repositório git privado; monorepo bun em `appofc/`; NestJS + React/Vite; Postgres local (Docker) e pago (Render); um único Web Service HTTPS no Render servindo API + SPA; health/ready; CI verde.

**Não entra nesta etapa:**

- Entidades de domínio no Prisma (`Usuario`, `ContaPagar`, etc.) — etapa 02
- Login, cookie de sessão, guards de perfil — etapa 03
- CRUD de pagar, receber, categorias, caixa, painel, crédito, NF-e
- Sentry obrigatório (apenas gancho por env; se `SENTRY_DSN` faltar, o app sobe)

---

## 2. Recorte dentro da Semana 1

A Semana 1 tem três etapas **sequenciais**. Esta é a primeira.

| Ordem | Etapa | Foco |
|---|---|---|
| **01** | **Setup técnico** (esta) | Repo, skeleton, CI, Postgres, Render, baseline de segurança |
| 02 | Modelagem + auditoria | Schema Prisma das entidades + middleware `LogAuditoria` |
| 03 | AuthModule | Login individual; guard lançamento vs executivo |

Paralelo humano (não é código): abrir conta/sandbox da NF-e nas semanas 1–2.

---

## 3. Decisões travadas

Estas decisões são **norma**. Não reabrir na implementação sem registrar mudança explícita neste arquivo.

| Tema | Decisão | Motivo |
|---|---|---|
| **Topologia de produção** | **Uma origem:** um Web Service Render; Nest expõe API em `/api` e serve o build do React no resto | Cookie `httpOnly` na etapa 03; sem CORS em prod; um URL; um painel; menos superfície de ataque |
| **Desenho descartado** | API + Static Site separados no Render | Duas origens → CORS + cookie cross-site ou JWT em `localStorage` — inaceitável para dado financeiro |
| **Custo infra** | Web Service Starter (~US$7) + Postgres Starter (~US$7) | Static site grátis **não** é usado |
| **Repositório** | Git na **raiz** `autodisplay/` (código + roadmap); repo **privado** no GitHub | Histórico único; roadmap viaja com o código |
| **Código** | Só em `appofc/` | Regra do projeto |
| **Pacotes JS** | **bun** workspaces (sem npm/yarn/pnpm) | Regra do time |
| **Linguagem** | TypeScript `strict` em backend e frontend | Menos classe de bug em runtime |
| **Backend** | NestJS monolito modular | Crescimento = módulo novo, não serviço novo |
| **Frontend** | React + Vite + TanStack Query + Ant Design (dependências já instaladas; sem tela de domínio ainda) | Padrão das semanas seguintes |
| **ORM** | Prisma instalado; nesta etapa só `generator` + `datasource` | Prova conexão/migrate sem congelar colunas de crédito/NF-e |
| **Docker** | Apenas Postgres 16 local via `docker-compose.yml` | App não roda em container; Render builda com bun |
| **Auth futuro (etapa 03)** | Cookie de sessão `HttpOnly` + `Secure` + `SameSite=Lax`; **proibido** `localStorage` para sessão | Token acessível ao JS = XSS vira takeover de conta |
| **CI** | GitHub Actions: qualidade + `prisma validate`; **não** faz deploy | Deploy manual ou auto-deploy do Render na branch default |

### Topologia

```mermaid
flowchart LR
  browser[Navegador]
  nest[NestJS]
  vite[Vite_dev]
  pg[(PostgreSQL)]
  browser -->|"prod: mesmo origin"| nest
  browser -->|"dev: Vite :5173"| vite
  vite -->|"proxy /api"| nest
  nest --> pg
```

- **Produção:** navegador → HTTPS → Nest (`/api/*` = API; demais rotas = SPA estático).
- **Desenvolvimento:** Vite em `http://localhost:5173` com proxy `/api` → Nest em `http://localhost:3000`.

---

## 4. Ameaças nesta escala — o que importa vs teatro

Contexto: **2 usuárias**, cliente **sem TI**, dado **financeiro**, desenvolvedor **solo**.

| Importa agora | Teatro (fora desta etapa) |
|---|---|
| Segredos fora do git; boot falha se env inválida | WAF, mTLS, criptografia por coluna |
| Uma origem; HTTPS; sem token no browser | 2FA, OAuth, SSO |
| Validação sempre no servidor (ValidationPipe global) | Motor de regras genérico |
| Erro estável; 500 genérico ao cliente; detalhe só no log | OpenAPI de 40 rotas |
| Rate limit global (base para `/auth/login` na etapa 03) | API pública com API keys |
| Logs sem senha/cookie/authorization | SIEM enterprise |
| Postgres pago com backup; SSL na conexão | Usuário de banco separado do owner (limitação do Starter Render — revisitar se plano permitir) |
| TypeScript strict; audit de dependências no CI | Cobertura 100% |
| Convenções que a Semana 2 copia | Hexagonal / CQRS / event bus |

**Princípio:** falha fechada. App não sobe com config inválida. Cliente nunca vê stack trace. Segredo nunca no frontend.

---

## 5. Estrutura alvo em `appofc/`

```
autodisplay/                          ← raiz git
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .husky/
│   └── pre-commit
├── referencias/                      ← roadmap (já existe)
├── appofc/
│   ├── package.json                  ← workspaces: backend, frontend
│   ├── bun.lock
│   ├── docker-compose.yml            ← só Postgres 16
│   ├── .env.example                  ← sem valores secretos
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json             ← strict: true
│   │   ├── nest-cli.json
│   │   ├── prisma/
│   │   │   └── schema.prisma         ← só generator + datasource
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── config/
│   │       │   └── env.schema.ts     ← Zod: validação no boot
│   │       ├── common/
│   │       │   ├── filters/
│   │       │   │   └── http-exception.filter.ts
│   │       │   └── logger/
│   │       └── health/
│   │           ├── health.module.ts
│   │           ├── health.controller.ts
│   │           └── health.service.ts
│   └── frontend/
│       ├── package.json
│       ├── tsconfig.json             ← strict: true
│       ├── vite.config.ts            ← proxy /api → localhost:3000
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx               ← placeholder mínimo
│           └── lib/
│               └── api-client.ts     ← baseURL relativa /api em prod
└── ...
```

**Convenções de módulo Nest** (obrigatório nas etapas seguintes):

```
src/<dominio>/
  <dominio>.module.ts
  <dominio>.controller.ts
  <dominio>.service.ts
  dto/
```

Nesta etapa, único módulo de domínio: `HealthModule`.

---

## 6. Baseline de segurança (normativa)

Tudo abaixo é **obrigatório no aceite**, mesmo sem AuthModule.

### 6.1 Segredos e boot

- [ ] `.gitignore` cobre: `.env`, `.env.*` (exceto `.env.example`), `*.pem`, `dist/`, `node_modules/`, `.DS_Store`
- [ ] `.env.example` lista variáveis **sem** valor secreto; comentário de onde obter cada uma
- [ ] Schema Zod valida env no boot; **app recusa subir** se variável obrigatória faltar ou for inválida
- [ ] Variáveis obrigatórias mínimas: `NODE_ENV`, `PORT`, `DATABASE_URL`
- [ ] Produção: segredos **somente** no painel do Render; nunca commitados
- [ ] `DATABASE_URL` em produção usa SSL (`?sslmode=require` ou equivalente Render)
- [ ] Frontend: **nenhum** segredo; em produção `api-client` usa base URL relativa `/api`

### 6.2 HTTP e transporte

- [ ] `helmet` habilitado no Nest
- [ ] Header `X-Powered-By` desabilitado
- [ ] `trust proxy` habilitado (Render termina TLS)
- [ ] **Produção:** CORS desligado / same-origin (mesma origem já resolve)
- [ ] **Desenvolvimento:** CORS allowlist `http://localhost:5173` com `credentials: true`
- [ ] `@nestjs/throttler` global no `AppModule` (ex.: 100 req/min por IP — ajustar na etapa 03 para login)
- [ ] Cookie de sessão **não** emitido nesta etapa; documentar flags para etapa 03:
  - `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`
  - Nome com prefixo não trivial (ex.: `__Host-ad-session` ou similar)
  - **Proibido** armazenar token/sessão em `localStorage` ou `sessionStorage`

### 6.3 Dados, erro e observabilidade

- [ ] `HttpExceptionFilter` global: resposta `{ statusCode, message, errors }`
- [ ] Erro 500: mensagem genérica ao cliente; stack trace **somente** no log
- [ ] Logger estruturado (Pino ou Nest Logger configurado): redação de campos `authorization`, `cookie`, `password`, `senha`, `token`
- [ ] `GET /health` — processo vivo (para health check do Render); **sem** dependência de banco; **sem** vazar versão/env
- [ ] `GET /api/ready` — processo + `SELECT 1` no Postgres; 503 se banco indisponível
- [ ] Prisma: log de query **desligado** em `NODE_ENV=production`
- [ ] Frontend: `sourcemap: false` no build de produção (Vite)
- [ ] Sentry: opcional; se `SENTRY_DSN` ausente, app sobe normalmente

### 6.4 Validação e API

- [ ] `ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- [ ] Prefixo global `/api` nas rotas da API
- [ ] Datas em ISO 8601 nas respostas
- [ ] TanStack Query configurado no frontend (Provider); `api-client` único

### 6.5 CI e supply chain

- [ ] GitHub Actions (`.github/workflows/ci.yml`):
  - `bun install --frozen-lockfile`
  - ESLint (backend + frontend)
  - `tsc --noEmit` (backend + frontend)
  - Prettier `--check`
  - `prisma validate` (backend)
  - `bun audit` (falha ou warn documentado — preferir falha em high/critical)
- [ ] Husky + lint-staged: lint/format nos arquivos staged antes do commit
- [ ] Lockfile (`bun.lock`) commitado; `packageManager` pinado no `package.json` raiz
- [ ] Dependabot habilitado no GitHub **ou** rotina manual semanal de `bun outdated` anotada neste roadmap

### 6.6 O que esta etapa não finge resolver

- Autenticação, autorização por perfil, 2FA
- WAF, IDS, pentest
- Criptografia por coluna
- Usuário de banco com privilégios mínimos (limitação comum no Postgres Starter do Render)
- Backup testado end-to-end (Render faz backup automático; restore manual fica para homologação)

---

## 7. Ações humanas (fora do código)

Executar **antes ou em paralelo** à implementação:

| # | Ação | Onde | Notas |
|---|---|---|---|
| 1 | Criar repositório GitHub **privado** | github.com | Nome sugerido: `autodisplay` ou `autodisplay-financeiro` |
| 2 | Criar conta/projeto no Render | render.com | Mesmo e-mail/credencial que GitHub para deploy |
| 3 | Criar Postgres **Starter** (pago) | Render Dashboard | Backup automático ligado; anotar `DATABASE_URL` interna |
| 4 | Criar Web Service **Starter** | Render Dashboard | Conectar ao repo; branch `main` |
| 5 | Configurar env no Render | Web Service → Environment | `NODE_ENV=production`, `DATABASE_URL`, `PORT=10000` (ou porta Render) |
| 6 | Build & start commands | Render | Ver seção 8.6 |
| 7 | Health check path | Render | `/health` |
| 8 | (Paralelo) Abrir sandbox NF-e | Focus NFe ou similar | Não bloqueia esta etapa; evita surpresa na semana 7 |

---

## 8. Checklist de execução (ordem recomendada)

### 8.1 Repositório e ignore

- [ ] `git init` na raiz `autodisplay/`
- [ ] `.gitignore` completo (ver 6.1)
- [ ] Primeiro commit: estrutura existente + este roadmap

### 8.2 Monorepo bun

- [ ] `appofc/package.json` com workspaces `["backend", "frontend"]`
- [ ] Pin `packageManager` (ex.: `"packageManager": "bun@1.x.x"`)
- [ ] Scripts raiz: `dev`, `build`, `lint`, `format`, `typecheck`

### 8.3 Postgres local

- [ ] `appofc/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: autodisplay
      POSTGRES_PASSWORD: autodisplay_dev
      POSTGRES_DB: autodisplay
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- [ ] `.env.example` com `DATABASE_URL=postgresql://autodisplay:autodisplay_dev@localhost:5432/autodisplay`
- [ ] Copiar para `.env` local (nunca commitar)

### 8.4 Backend NestJS

- [ ] Scaffold Nest em `appofc/backend/` (TypeScript strict)
- [ ] Instalar: `@nestjs/config`, `@nestjs/throttler`, `helmet`, `nestjs-pino` (ou pino equivalente), `zod`, `@prisma/client`, `prisma`
- [ ] `prisma/schema.prisma` — apenas:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] `env.schema.ts` com Zod; falha no boot se inválido
- [ ] `main.ts`: helmet, trust proxy, ValidationPipe global, prefix `/api`, filtro global, logger
- [ ] ThrottlerModule global
- [ ] `HealthModule`: `GET /health` (sem prefixo api, na raiz) e `GET /api/ready`
- [ ] Em produção: servir arquivos estáticos do frontend buildado (ver 8.6)

### 8.5 Frontend React + Vite

- [ ] Scaffold Vite React TS em `appofc/frontend/` (strict)
- [ ] Instalar: `@tanstack/react-query`, `antd`, `axios` ou `fetch` wrapper
- [ ] `vite.config.ts`: proxy `/api` → `http://localhost:3000`
- [ ] `api-client.ts`: base URL `/api` (relativa)
- [ ] `App.tsx`: placeholder (“AutoDisplay Financeiro — em construção”)
- [ ] Build: `sourcemap: false` em produção

### 8.6 Build unificado (produção — uma origem)

Fluxo de build no Render (comandos sugeridos):

```bash
# Build command (raiz appofc ou repo root — ajustar cwd)
cd appofc && bun install --frozen-lockfile \
  && cd backend && bunx prisma generate \
  && cd ../frontend && bun run build \
  && cd ../backend && bun run build

# Start command
cd appofc/backend && bun run start:prod
```

No Nest (`main.ts` ou módulo dedicado), após build:

- Servir `appofc/frontend/dist` como estático
- Fallback `*` → `index.html` (SPA)
- Rotas `/api/*` têm prioridade sobre estático

### 8.7 CI e hooks

- [ ] `.github/workflows/ci.yml` conforme seção 6.5
- [ ] Husky: `bunx husky init`; pre-commit roda lint-staged
- [ ] lint-staged: eslint + prettier nos arquivos alterados

### 8.8 Deploy Render

- [ ] Push para `main`; Render auto-deploy (ou deploy manual)
- [ ] Verificar: URL HTTPS carrega SPA
- [ ] Verificar: `GET /health` → 200
- [ ] Verificar: `GET /api/ready` → 200 com Postgres Render

### 8.9 Verificação local completa

```bash
cd appofc
docker compose up -d
bun install
# terminal 1
bun run dev:backend   # ou equivalente → :3000
# terminal 2
bun run dev:frontend  # → :5173, proxy /api
curl http://localhost:3000/health
curl http://localhost:3000/api/ready
```

---

## 9. Critério de aceite

Marcar a etapa como concluída em `norte-semanal.md` **somente** quando **todos** forem verdade:

- [ ] Repositório git **privado**; `.env` fora do git; working tree limpa na branch default
- [ ] `bun install` + `docker compose up -d` + backend e frontend sobem localmente sem erro
- [ ] `GET /health` retorna 200 (sem depender do banco)
- [ ] `GET /api/ready` retorna 200 **com** Postgres no ar; 503 **sem** Postgres
- [ ] Boot do backend **falha** se `DATABASE_URL` estiver ausente ou inválida
- [ ] Produção: um único URL HTTPS no Render; SPA carrega; `/api/ready` retorna 200
- [ ] CI verde na branch default (lint, typecheck, prettier, prisma validate, audit)
- [ ] Husky pre-commit funciona (commit com erro de lint é bloqueado)
- [ ] Prisma schema **sem** entidades de domínio (só generator + datasource)
- [ ] **Nenhum** login, cookie de sessão ou guard de perfil implementado
- [ ] Baseline de segurança da seção 6 verificada (checklist 6.1–6.5)

---

## 10. Handoff para etapas 02 e 03

O que as próximas etapas **devem herdar sem reabrir**:

| Herança | Detalhe |
|---|---|
| Monorepo bun | Mesma estrutura; novos módulos seguem convenção `module/controller/service/dto` |
| Uma origem | Cookie auth na 03 usa same-origin; não introduzir segundo serviço |
| ValidationPipe global | DTOs novos já nascem validados |
| Filtro de erro único | Não criar formato de erro alternativo |
| Logger com redação | Auditoria na 02 usa o mesmo logger |
| Prisma + migrate | Etapa 02 adiciona modelos; primeira migration real |
| `/api/ready` | CI/deploy continuam usando para checar banco |
| Throttler global | Etapa 03 adiciona limite mais agressivo em `POST /auth/login` |
| `api-client` + TanStack Query | Etapa 03 consome `/auth/me` etc. pelo client existente |
| Ant Design | Telas de login na 03 usam componentes já instalados |

**Regra de ouro financeira** (documentar; código na semana 3): título não mexe saldo; só `Baixa` cria `MovimentoCaixa`. Não antecipar código de caixa nesta etapa.

---

## 11. Estimativa de esforço

Dentro da Semana 1 (19h total para **três** etapas). Esta etapa consumindo aproximadamente **6–8h** se seguida na ordem do checklist, incluindo cadastro Render e primeiro deploy.

---

## 12. Registro de execução

| Data | O que foi feito | Pendências |
|---|---|---|
| 24/08/2026 | Monorepo Bun 1.4.0 em `appofc/` (NestJS + React/Vite + Prisma 6). Baseline de segurança, health/ready, testes, Husky, CI verde. Repo privado: `github.com/IgorFernandesSantos/autodisplay`. Postgres local via `docker-compose`. Blueprint Render Free em `appofc/render.yaml`. | Deploy HTTPS no Render + `DATABASE_URL` do Neon Free (sem CLI autenticada no ambiente). Validar `/health` e `/api/ready` em produção. Aguardar e-mail com domínio oficial da empresa para configuração de domínio personalizado e apontamento DNS no Registro.br. |

### Decisões aplicadas na implementação

- **Prisma 6.19.3** (`prisma-client-js`) — Prisma 7 exige Node 20.19+; CI usa Bun com Node compatível, mas o ecossistema local/Render free ainda beneficia de Prisma 6 estável.
- **PostgreSQL gratuito:** Neon Free (não Render Postgres free — expira em 30 dias). `DATABASE_URL` entra como segredo no Render.
- **Deploy:** Render Web Service Free (cold start após inatividade). Homologação apenas; produção real exige plano pago com backup.
- **Domínio de produção:** configuração de domínio próprio ficará pendente até recebimento do e-mail com o domínio oficial da empresa; após isso, registrar/apontar DNS no Registro.br para o serviço hospedado.

### Evidências locais (24/08/2026)

- `GET /health` → 200 sem banco
- `GET /api/ready` → 200 com Postgres; 503 com banco parado
- Boot recusa `DATABASE_URL` inválida (Zod fail-fast)
- Produção (`NODE_ENV=production`) serve SPA + `/api/ready` na mesma origem
- CI GitHub Actions run `32783715622` → **success**

---

## Referências

- [Requisitos](../../../base/Requisitos_AutoDisplay_Modulo_Financeiro.md)
- [Planejamento e arquitetura](../../../base/AutoDisplay_Planejamento_Arquitetura.md)
- [Norte semanal](../../norte-semanal.md)
- [CONTEXTO_AGENTES.md](../../../../CONTEXTO_AGENTES.md)
