# Semana 1 / Etapa 02 — Modelagem e Auditoria

> Runbook de execução da segunda etapa da Semana 1. Este documento trava decisões de schema, auditoria híbrida, baseline de segurança de dados e critério de aceite. **Não substitui implementação** — é o norte para quem for codar em `appofc/backend/prisma/` e `appofc/backend/src/auditoria/`.

---

## Status

| Campo | Valor |
|---|---|
| **Etapa** | `semana1/02-modelagem-auditoria` |
| **Estado** | **Implementação local concluída** · CI remoto pendente de validação |
| **Última atualização** | 24/08/2026 |
| **Norte geral** | [norte-semanal.md](../../norte-semanal.md) |
| **Pré-requisito** | [Etapa 01 — Setup técnico](../01-setup-tecnico/roadmap.md) (implementação local + CI concluídas) |
| **Regras de pasta** | [CONTEXTO_AGENTES.md](../../../../CONTEXTO_AGENTES.md) |

O checkbox desta etapa em `norte-semanal.md` **permanece `[ ]`** até o critério de aceite ao final deste documento ser cumplido de fato.

---

## 1. Objetivo

Construir a **fundação de dados** do módulo financeiro: schema Prisma completo, primeira migration versionada e **trilha de auditoria imutável** ativa desde o primeiro write — antes de qualquer CRUD, login ou tela de domínio.

**Entregável da etapa:**

- `schema.prisma` com **todas** as entidades de domínio previstas na arquitetura
- Migration inicial `init_domain_schema` commitada em `prisma/migrations/`
- Auditoria **híbrida**: contexto de ator/correlação na aplicação + triggers PostgreSQL na mesma transação da mutação
- Módulo Nest `AuditoriaModule` com `AuditContextService` (AsyncLocalStorage)
- Scripts `prisma:migrate:*` no monorepo; `migrate deploy` no CI e no Render
- Testes de integração com Postgres real validando constraints, trilha e redação

**Não entra nesta etapa:**

- Endpoints CRUD de domínio (fornecedor, pagar, receber, categorias, caixa, etc.)
- AuthModule, login, cookie, bcrypt, guards de perfil — **Etapa 03**
- Geração automática de `MovimentoCaixa` na baixa — **Semana 3**
- Regras de negócio (validação de valor, status calculado, baixa parcial) — **Semanas 2–3**
- Seed de usuários com senha real — **Etapa 03**
- Telas ou fluxos multi-empresa — **fora de escopo da versão**
- Integração NF-e, painel executivo, crédito operacional — **Semanas 5–7**

---

## 2. Recorte dentro da Semana 1

A Semana 1 tem três etapas **sequenciais**. Esta é a segunda.

| Ordem | Etapa | Foco |
|---|---|---|
| 01 | Setup técnico | Repo, skeleton, CI, Postgres, Render, baseline HTTP |
| **02** | **Modelagem + auditoria** (esta) | Schema completo + trilha híbrida + primeira migration |
| 03 | AuthModule | Login individual; guard lançamento vs executivo |

**Dependência:** Etapa 01 concluída localmente (CI verde, Prisma vazio, health/ready). Deploy HTTPS da Etapa 01 **não bloqueia** esta etapa — migrations rodam localmente e no CI.

---

## 3. Decisões travadas

Estas decisões são **norma**. Não reabrir na implementação sem registrar mudança explícita neste arquivo.

| Tema | Decisão | Motivo |
|---|---|---|
| **Escopo do schema** | **Todas** as entidades da arquitetura §3.1 na primeira migration | Evita migrations fragmentadas; semanas 2–7 só adicionam lógica, não estrutura |
| **Multi-empresa** | Modelo `Empresa` + `empresaId` **obrigatório** em dados empresariais; seed de uma empresa padrão | Isolamento futuro sem reescrita; nenhuma UI multi-empresa agora |
| **Auditoria** | **Híbrida:** triggers PostgreSQL + contexto app (`AsyncLocalStorage`) | Resistente a bypass do ORM; atômica na mesma transação; fail-closed |
| **Exclusão física** | **Proibida** em entidades auditáveis — soft delete + triggers bloqueiam `DELETE` | Requisito 4.4: histórico consultável; dado financeiro |
| **LogAuditoria** | **Append-only** — triggers bloqueiam `UPDATE`/`DELETE` na própria tabela | Trilha não adulterável |
| **Dinheiro** | `Decimal @db.Decimal(15, 2)` — **nunca** `Float` | Precisão financeira; arredondamento previsível |
| **Taxas** | `Decimal @db.Decimal(7, 4)` em `CreditoAntecipacao.taxa` | Percentuais com precisão suficiente |
| **Datas de negócio** | `@db.Date` (emissão, vencimento, baixa, movimento) | Sem ambiguidade de timezone em “dia contábil” |
| **Eventos** | `@db.Timestamptz(3)` (createdAt, updatedAt, inativadoEm, LogAuditoria) | ISO 8601; auditoria com instante exato |
| **IDs** | `String @id @default(uuid()) @db.Uuid` | Estável para audit trail e FKs |
| **Status "vencida"** | **Não persistido** — calculado na query (Semana 2+) | Evita cron/job de manutenção |
| **Baixa polimórfica** | FKs opcionais `contaPagarId` / `contaReceberId` + **CHECK XOR** no SQL | Baixa parcial futura sem migração |
| **MovimentoCaixa** | Schema completo agora; **sem** trigger de geração na baixa | Semana 3 implementa a regra |
| **Naming DB** | Prisma camelCase → PostgreSQL `snake_case` via `@map` / `@@map` | Consistência SQL legível |
| **usuario_id na auditoria** | Nullable até Etapa 03; contexto preenchido por interceptor futuro | Auth ainda não existe; testes passam ID explicitamente |
| **Redação** | `senhaHash`, tokens e segredos **omitidos** do JSON de audit | Segurança; LGPD implícita em PII |
| **Migrations** | `prisma migrate dev` local; `prisma migrate deploy` CI/prod — **proibido** `db push` fora de ambiente descartável | Histórico versionado; rollback possível |
| **Prisma** | **6.19.3** (herança Etapa 01) | Estabilidade com Bun/Render free |

### Arquitetura de auditoria híbrida

```mermaid
flowchart TB
  subgraph app [Aplicacao NestJS]
    req[Request futuro Auth]
    ctx[AuditContextService AsyncLocalStorage]
    prisma[PrismaClient estendido]
    req --> ctx
    ctx --> prisma
  end

  subgraph db [PostgreSQL]
    tbl[Tabelas de dominio]
    trig[Triggers audit_log]
    log[(LogAuditoria append-only)]
    prisma --> tbl
    tbl -->|"INSERT UPDATE DELETE"| trig
    trig -->|"mesma transacao"| log
    ctx -->|"SET LOCAL app.usuario_id app.correlation_id"| db
  end
```

**Fluxo:**

1. Antes de cada operação de escrita, a aplicação define variáveis de sessão PostgreSQL (`SET LOCAL app.usuario_id`, `app.correlation_id`) dentro da transação Prisma.
2. Triggers `BEFORE INSERT/UPDATE/DELETE` nas tabelas auditáveis capturam `OLD`/`NEW` como JSON e gravam em `LogAuditoria`.
3. Se a gravação do log falhar, a transação inteira faz rollback — **fail-closed**.
4. `LogAuditoria` está **fora** do conjunto de tabelas com trigger de auditoria (evita recursão).

---

## 4. Ameaças nesta escala — o que importa vs teatro

Contexto: **2 usuárias**, dado **financeiro**, trilha **obrigatória**, desenvolvedor **solo**.

| Importa agora | Teatro (fora desta etapa) |
|---|---|
| Auditoria no banco (não só no ORM) | Criptografia por coluna |
| Soft delete + bloqueio de DELETE | Row Level Security multi-tenant completo |
| Redação de senha_hash no JSON de audit | DPO / política LGPD formal escrita |
| Constraints SQL (XOR Baixa, CHECK valor > 0) | Motor de regras genérico |
| Migration testada em CI com Postgres 16 | Usuário DB com privilégios mínimos (meta produção) |
| Append-only em LogAuditoria | SIEM / export para data lake |
| `empresaId` obrigatório + índices compostos | UI de troca de empresa |
| Fail-closed se audit falhar | Cobertura 100% de testes |
| Tipos monetários Decimal | Event sourcing completo |

**Princípio:** para dado financeiro, **confiança no histórico** vale mais que velocidade de entrega. Um write sem trilha é pior que um write que falha.

---

## 5. Modelo de dados (especificação normativa)

Fonte: [AutoDisplay_Planejamento_Arquitetura.md](../../../base/AutoDisplay_Planejamento_Arquitetura.md) §3.1 + [Requisitos](../../../base/Requisitos_AutoDisplay_Modulo_Financeiro.md) §4.4 e §4.8.

### 5.1 Entidades e campos

Todas as entidades mutáveis incluem: `id`, `createdAt`, `updatedAt`. Entidades de lançamento/cadastro incluem soft delete: `inativadoEm DateTime?`, `inativadoPorId String? @db.Uuid`.

#### `Empresa` (nova — raiz de isolamento)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | UUID | sim | PK |
| razaoSocial | String | sim | |
| nomeFantasia | String? | não | |
| cnpj | String | sim | Unique; normalizar só dígitos na app (Semana 2+) |
| ativa | Boolean | sim | default true |
| createdAt / updatedAt | Timestamptz | sim | |

#### `Usuario`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | FK → Empresa |
| nome | String | sim | |
| email | String | sim | Unique por empresa (`@@unique([empresaId, email])`) |
| senhaHash | String | sim | **Redigir** em LogAuditoria |
| perfil | Enum PerfilUsuario | sim | `LANCAMENTO` \| `EXECUTIVO` |
| inativadoEm / inativadoPorId | soft delete | não | Login bloqueado se inativado (Etapa 03) |

#### `ContaBancaria`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| nome | String | sim | |
| banco | String? | não | Código ou nome |
| saldoInicial | Decimal(15,2) | sim | default 0 |
| ativa | Boolean | sim | default true |

#### `Categoria`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| nome | String | sim | |
| tipo | Enum TipoCategoria | sim | `ENTRADA` \| `SAIDA` |

#### `Fornecedor` / `Cliente`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| nome | String | sim | |
| documento | String? | não | CPF/CNPJ — PII; considerar mascaramento em logs HTTP |
| contato | String? | não | |

#### `ContaPagar`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| fornecedorId | UUID | sim | FK |
| categoriaId | UUID | sim | FK |
| valor | Decimal(15,2) | sim | CHECK > 0 |
| dataEmissao | Date | sim | |
| dataVencimento | Date | sim | CHECK >= dataEmissao |
| status | Enum StatusTitulo | sim | **Sem** `VENCIDA` |
| origem | Enum OrigemContaPagar | sim | `NOTA_COMPRA` \| `COMBINADO_AVULSO` \| `ANTECIPACAO` |

Enums `StatusTitulo`: `EM_ABERTO`, `PAGA`, `INATIVADA` (receber usa `RECEBIDA` no lugar de `PAGA` — ver abaixo).

#### `ContaReceber`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| clienteId | UUID | sim | FK |
| pedidoReferencia | String? | não | Texto livre; pedido não é módulo |
| valor | Decimal(15,2) | sim | CHECK > 0 |
| dataEmissao / dataVencimento | Date | sim | Mesmas checks |
| status | Enum StatusTituloReceber | sim | `EM_ABERTO`, `RECEBIDA`, `INATIVADA` |

#### `Baixa`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| contaPagarId | UUID? | XOR | Exatamente um preenchido |
| contaReceberId | UUID? | XOR | |
| valor | Decimal(15,2) | sim | CHECK > 0 |
| data | Date | sim | Data efetiva |
| contaBancariaId | UUID | sim | FK |

**Constraint SQL:**

```sql
CHECK (
  (conta_pagar_id IS NOT NULL AND conta_receber_id IS NULL)
  OR (conta_pagar_id IS NULL AND conta_receber_id IS NOT NULL)
)
```

#### `MovimentoCaixa` (livro-razão)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| contaBancariaId | UUID | sim | FK |
| tipo | Enum TipoMovimento | sim | `ENTRADA` \| `SAIDA` |
| valor | Decimal(15,2) | sim | CHECK > 0 |
| data | Date | sim | |
| origem | Enum OrigemMovimento | sim | `MANUAL`, `BAIXA_PAGAR`, `BAIXA_RECEBER` |
| referenciaId | UUID? | não | ID da Baixa ou outro — sem FK polimórfica rígida |
| usuarioId | UUID? | não | Nullable até auth; FK → Usuario |
| descricao | String? | não | Transferência, aporte, ajuste |

#### `CreditoAntecipacao`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| operador | String | sim | Instituição |
| taxa | Decimal(7,4)? | não | |
| tipo | Enum TipoCredito | sim | `FORMAL` \| `INFORMAL` |
| valor | Decimal(15,2) | sim | CHECK > 0 |
| data | Date | sim | |

#### `NotaFiscal`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| empresaId | UUID | sim | |
| contaReceberId | UUID | sim | FK |
| statusEmissao | Enum StatusEmissaoNf | sim | `PENDENTE`, `EMITIDA`, `CANCELADA`, `ERRO` |
| referenciaExterna | String? | não | ID na plataforma terceira |

#### `LogAuditoria`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | UUID | sim | PK |
| empresaId | UUID? | não | Herdado da entidade auditada quando aplicável |
| entidade | String | sim | Nome da tabela/modelo |
| entidadeId | UUID | sim | |
| usuarioId | UUID? | não | De `current_setting('app.usuario_id')` |
| correlationId | String? | não | De `app.correlation_id` |
| acao | Enum AcaoAuditoria | sim | `CREATE`, `UPDATE`, `DELETE`, `INACTIVATE` |
| valorAnterior | Json? | não | Snapshot OLD redigido |
| valorNovo | Json? | não | Snapshot NEW redigido |
| ocorridoEm | Timestamptz | sim | default now() |

**Índices recomendados:**

- `LogAuditoria`: `(entidade, entidadeId)`, `(usuarioId)`, `(ocorridoEm DESC)`
- Todas entidades com `empresaId`: índice em `empresaId`
- `ContaPagar` / `ContaReceber`: `(empresaId, dataVencimento)`, `(empresaId, status)`

### 5.2 Tabelas auditáveis vs excluídas

| Auditadas (trigger) | Excluídas do trigger |
|---|---|
| Empresa, Usuario, ContaBancaria, Categoria, Fornecedor, Cliente, ContaPagar, ContaReceber, Baixa, MovimentoCaixa, CreditoAntecipacao, NotaFiscal | **LogAuditoria** |

`DELETE` físico: **bloqueado** por trigger (raise exception) em todas as auditadas. Inativação = `UPDATE` com `inativadoEm` preenchido → ação `INACTIVATE` ou `UPDATE` conforme implementação do trigger.

### 5.3 Regra de ouro financeira (schema only)

Documentar no código e nos comentários do schema — **implementação na Semana 3**:

> Título (`ContaPagar` / `ContaReceber`) **não mexe saldo**. Só `Baixa` gera `MovimentoCaixa`. Saldo consolidado = soma de `MovimentoCaixa` + saldos iniciais.

---

## 6. Baseline de segurança de dados (normativa)

Tudo abaixo é **obrigatório no aceite**, além da baseline HTTP da Etapa 01.

### 6.1 Integridade e imutabilidade

- [ ] Nenhuma entidade de lançamento/cadastro permite `DELETE` físico via SQL ou Prisma
- [ ] `LogAuditoria` não permite `UPDATE` nem `DELETE`
- [ ] Valores monetários usam `Decimal`; constraints `CHECK (valor > 0)` onde aplicável
- [ ] `Baixa` respeita XOR pagar/receber via constraint SQL
- [ ] FKs com `onDelete: Restrict` (Prisma default) — nunca `Cascade` em dados financeiros

### 6.2 Auditoria híbrida

- [ ] Função PostgreSQL `audit.capture_row_change()` registrada na migration
- [ ] Triggers `BEFORE INSERT OR UPDATE OR DELETE` em todas as tabelas auditáveis
- [ ] `AuditContextService` define `SET LOCAL app.usuario_id` e `app.correlation_id` por transação
- [ ] Wrapper/interceptor no `PrismaService` executa writes dentro de `$transaction` com contexto
- [ ] Falha ao inserir em `LogAuditoria` **aborta** a mutação de negócio
- [ ] JSON de audit **não contém** `senhaHash`, `senha_hash`, tokens, `DATABASE_URL`

### 6.3 Isolamento multi-empresa (design)

- [ ] `empresaId` NOT NULL em todas as entidades empresariais (exceto `LogAuditoria` nullable)
- [ ] Unicidades compostas onde fizer sentido (`Usuario.email` por empresa)
- [ ] Seed de **uma** `Empresa` padrão na migration ou seed script documentado
- [ ] Nenhum hardcode de CNPJ único em constraints — CNPJ vive em `Empresa`

### 6.4 Migrations e deploy

- [ ] Pasta `prisma/migrations/` commitada; nunca editar migration já aplicada em prod
- [ ] Scripts no `appofc/package.json`: `prisma:migrate:dev`, `prisma:migrate:deploy`, `prisma:reset` (só dev)
- [ ] CI: job com Postgres 16 service roda `migrate deploy` + testes de integração
- [ ] `render.yaml`: `migrate deploy` **antes** de `start:prod`
- [ ] Proibido `prisma db push` exceto sandbox descartável documentado

### 6.5 Credenciais de banco (meta produção — documentar)

| Papel | Privilégios | Quando |
|---|---|---|
| `autodisplay_migrate` | DDL + DML | CI deploy, release |
| `autodisplay_app` | DML apenas | Runtime NestJS |

Neon/Render free hoje usa um único usuário — aceitável em homologação; **registrar dívida técnica** para produção real.

### 6.6 O que esta etapa não finge resolver

- Autenticação e autorização por perfil
- Row Level Security PostgreSQL por `empresaId`
- Criptografia at-rest além do provedor
- Política LGPD formal / base legal / retenção
- Backup testado end-to-end

---

## 7. Estrutura alvo em `appofc/backend/`

```
appofc/backend/
├── prisma/
│   ├── schema.prisma              ← todos os modelos + enums
│   └── migrations/
│       └── YYYYMMDDHHMMSS_init_domain_schema/
│           └── migration.sql      ← tabelas + constraints + triggers + functions
└── src/
    ├── auditoria/
    │   ├── auditoria.module.ts    ← GlobalModule
    │   ├── audit-context.service.ts
    │   ├── prisma-audit.middleware.ts   ← $transaction + SET LOCAL
    │   ├── audit-redaction.ts     ← omit senhaHash, tokens
    │   ├── audit.constants.ts     ← AUDITED_MODELS, REDACTED_FIELDS
    │   ├── audit-redaction.spec.ts
    │   └── audit-context.service.spec.ts
    ├── database/
    │   ├── database.module.ts
    │   └── prisma.service.ts      ← estende client com middleware de contexto
    └── app.module.ts              ← import AuditoriaModule
```

**SQL na migration** (não só Prisma generate):

- Função `audit.redact_jsonb(data jsonb) returns jsonb`
- Função `audit.capture_row_change()`
- Triggers por tabela auditável
- Policies de bloqueio UPDATE/DELETE em `log_auditoria`

---

## 8. Ações humanas (fora do código)

| # | Ação | Bloqueia? | Notas |
|---|---|---|---|
| 1 | Manter Postgres local via `docker compose up -d` | Não | Mesmo da Etapa 01 |
| 2 | Revisar schema com checklist §5 antes de `migrate dev` | Recomendado | Evita migration errada |
| 3 | Confirmar baixa parcial com Gislaine | **Não** (Semana 3) | Schema já preparado |
| 4 | Deploy HTTPS Etapa 01 | Não | Etapa 02 valida local + CI |

---

## 9. Checklist de execução (ordem recomendada)

### Fase A — Schema estático (sem migration)

- [ ] Atualizar `schema.prisma` com todos os modelos, enums e `@map`
- [ ] Revisão manual: Decimal, Date, Timestamptz, soft delete, empresaId
- [ ] `bun run prisma:validate` passa
- [ ] `bun run typecheck` passa (após generate)

### Fase B — Migration inicial

- [ ] `bun run prisma:migrate:dev --name init_domain_schema`
- [ ] Revisar SQL gerado; **adicionar manualmente** triggers, functions e CHECK XOR se Prisma não gerar
- [ ] Aplicar limpo: `docker compose down -v && docker compose up -d && migrate dev`
- [ ] `bunx prisma studio` — inspecionar tabelas e constraints

### Fase C — Módulo de auditoria (aplicação)

- [ ] Criar `AuditoriaModule` global + `AuditContextService`
- [ ] Implementar `withAuditContext(usuarioId, correlationId, fn)` usando `$transaction` + `SET LOCAL`
- [ ] Integrar no `PrismaService` — todo write de domínio futuro passa pelo wrapper
- [ ] `audit-redaction.ts` com lista de campos redigidos; testes unitários

### Fase D — Scripts, CI e deploy

- [ ] Adicionar scripts `prisma:migrate:*` em `appofc/package.json`
- [ ] CI: service `postgres:16-alpine`; `migrate deploy`; testes integração
- [ ] `render.yaml`: incluir `bun run prisma:migrate:deploy` no build/release
- [ ] `/api/ready` continua 200 após migration aplicada

### Fase E — Testes e evidências

- [ ] `audit-redaction.spec.ts` — senhaHash ausente do JSON
- [ ] `auditoria.integration-spec.ts` (Postgres real):
  - CREATE gera linha em LogAuditoria
  - UPDATE grava valorAnterior e valorNovo
  - DELETE tentado → exception; row count inalterado
  - UPDATE com inativadoEm → trilha registrada
  - Write em LogAuditoria não gera log recursivo
  - Falha simulada no trigger → rollback da mutação
- [ ] Pipeline completo: `lint && typecheck && test && build && prisma:validate`

### Fase F — Documentação da execução

- [ ] Preencher **Registro de execução** (§14)
- [ ] Marcar `[x]` em `norte-semanal.md` **somente** se critério §13 cumprido

---

## 10. Testes obrigatórios

### 10.1 Unitários (CI sem Postgres)

| Arquivo | Casos |
|---|---|
| `audit-redaction.spec.ts` | Remove senhaHash; remove campos aninhados; preserva campos financeiros |
| `audit-context.service.spec.ts` | Contexto isolado entre chamadas paralelas (AsyncLocalStorage) |

### 10.2 Integração (CI com Postgres 16)

| Caso | Esperado |
|---|---|
| Insert Fornecedor com contexto usuarioId | 1 row LogAuditoria, acao CREATE |
| Update ContaPagar | valorAnterior + valorNovo preenchidos |
| Delete ContaPagar via Prisma | Exception; 0 rows deleted |
| Soft delete (inativadoEm) | LogAuditoria com acao UPDATE ou INACTIVATE |
| Insert Baixa só contaPagarId | OK |
| Insert Baixa com ambos IDs | Constraint violation |
| Insert Baixa sem nenhum ID | Constraint violation |
| valor <= 0 em ContaPagar | Constraint violation |
| LogAuditoria UPDATE | Exception |
| Transação com erro no audit | Rollback total |

### 10.3 Comandos de verificação

```bash
cd appofc
docker compose up -d
bun install
bun run prisma:migrate:dev
bun run test
bun run typecheck
bun run build
bun run prisma:validate

# Inspeção manual
cd backend && bunx prisma studio
```

---

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação | Residual |
|---|---|---|---|
| Bypass do ORM (SQL direto) | Trilha ausente | Triggers no PostgreSQL | Admin com superuser |
| Recursão LogAuditoria | Loop / stack overflow | Excluir tabela dos triggers | — |
| senhaHash no JSON | Vazamento | Redaction + teste que falha CI | Campos PII não listados |
| Migration grande de uma vez | Erro difícil de reverter | Revisão SQL manual; backup local | Tempo de rollback |
| usuarioId null até Auth | Trilha incompleta | Aceitar null; Etapa 03 preenche | Logs “sistema” na 02 |
| Prisma não gera triggers | Audit só na app | SQL manual na migration | Manter sync schema/SQL |
| CI sem Postgres | Falsa confiança | Job integração obrigatório | — |
| Buffer 19h/semana (3 etapas) | Etapa 02 comprimida | Escopo fechado; sem CRUD | — |
| Neon/Render free | Sem backup prod | Documentar; homologação only | Aceito na 02 |

---

## 12. Critério de aceite

Marcar a etapa como concluída em `norte-semanal.md` **somente** quando **todos** forem verdade:

### Schema e migration

- [ ] `schema.prisma` contém **todas** entidades §5.1 + enums + `LogAuditoria`
- [ ] `empresaId` NOT NULL em entidades empresariais
- [ ] Valores monetários usam `Decimal`; status **não** inclui `VENCIDA`
- [ ] Soft delete (`inativadoEm`) em cadastros e títulos
- [ ] Migration commitada em `prisma/migrations/`
- [ ] `bun run prisma:validate` passa
- [ ] `bun run prisma:migrate:dev` aplica limpo em Postgres local

### Auditoria

- [ ] Triggers PostgreSQL ativos em todas tabelas auditáveis
- [ ] CREATE gera `LogAuditoria` na mesma transação
- [ ] UPDATE grava `valorAnterior` e `valorNovo` (JSON redigido)
- [ ] DELETE físico **bloqueado** em entidades de negócio
- [ ] `LogAuditoria` imutável (UPDATE/DELETE bloqueados)
- [ ] `senhaHash` **ausente** dos JSONs (teste automatizado)
- [ ] `AuditContextService` operacional; pronto para Etapa 03

### Pipeline

- [ ] CI verde incluindo testes de integração com Postgres
- [ ] CI executa `migrate deploy` em banco efêmero
- [ ] `render.yaml` inclui `migrate deploy` antes do start
- [ ] `/api/ready` → 200 com migration aplicada

### Escopo negativo

- [ ] **Nenhum** endpoint CRUD de domínio
- [ ] **Nenhum** AuthModule, login, cookie, guard
- [ ] **Nenhuma** geração automática de `MovimentoCaixa` na baixa
- [ ] Frontend inalterado ou só texto placeholder

### Documentação

- [ ] Este `roadmap.md` com registro de execução preenchido
- [ ] Handoff §13 documentado

---

## 13. Handoff para Etapa 03 (AuthModule)

| Herança | Detalhe |
|---|---|
| `Usuario` no schema | email unique por empresa, senhaHash, enum perfil |
| `Empresa` + seed | Uma empresa padrão; usuárias vinculadas na seed |
| `AuditContextService` | Interceptor pós-login preenche `usuarioId` + `correlationId` |
| Prisma com contexto | Todo write auth e domínio passa por `withAuditContext` |
| Soft delete | Login rejeita `inativadoEm != null` |
| Migrations no deploy | Auth só precisa seed de 2 usuárias + bcrypt |
| Logger + filtro Etapa 01 | Mesmos; login usa throttler agressivo |
| LogAuditoria | Já captura troca de senha quando Usuario for atualizado |

**Regra:** na Etapa 03, **primeiro** login bem-sucedido deve gerar trilha de audit em `Usuario` (update último acesso) com `usuarioId` preenchido.

---

## 14. Estimativa de esforço

Dentro da Semana 1 (19h total para **três** etapas). Etapa 01 ≈ 6–8h.

Esta etapa: **6–8h** (schema + migration + triggers + módulo auditoria + testes integração + CI/deploy).

> Escopo ampliado (todas entidades + auditoria híbrida) consome mais que o mínimo, mas **reduz risco de perda ou adulteração silenciosa** — trade-off consciente aprovado.

---

## 15. Registro de execução

| Data | O que foi feito | Pendências |
|---|---|---|
| 24/08/2026 | Runbook normativo criado; decisões travadas (schema completo, auditoria híbrida, fail-closed) | Implementação do schema, migration, triggers, módulo auditoria, testes e CI |
| 24/08/2026 | Implementação concluída: schema Prisma completo, migration `20250824194500_init_domain_schema`, triggers SQL, `AuditoriaModule`, `PrismaService.withAuditTransaction`, seed explícita, testes unitários/integração, CI job `integration`, Render `migrate deploy` no build | Validar pipeline remoto no GitHub Actions; aplicar migration em Neon/Render quando deploy HTTPS da Etapa 01 estiver ativo |

### Decisões aplicadas no planejamento

- **Auditoria híbrida** (triggers PostgreSQL + contexto app) — escolha do time; resistente a bypass do ORM.
- **Schema completo** na primeira migration — todas entidades da arquitetura §3.1.
- **`Empresa` como raiz** — `empresaId` obrigatório; seed explícita via env.
- **Prisma 6.19.3** — herança Etapa 01.

### Decisões aplicadas na implementação

- **`inativadoEm` como única fonte de inativação** — enums de status sem `INATIVADA`; `VENCIDA` continua calculada.
- **`LogAuditoria` sem FKs** — histórico imutável e independente de mutações cadastrais futuras.
- **Responsável da ação só em `LogAuditoria.usuarioId`** — evitou `inativadoPorId` duplicado em todas as tabelas.
- **Redação centralizada no SQL** (`audit.redact_jsonb`) — testada por integração.
- **Isolamento cross-tenant via FKs compostas** — constraints adicionais além das FKs simples do Prisma.
- **DELETE físico bloqueado em trigger `BEFORE DELETE`** — auditoria em `AFTER INSERT OR UPDATE`.
- **Seed não roda automaticamente** — exige `SEED_EMPRESA_RAZAO_SOCIAL` + `SEED_EMPRESA_CNPJ`.

### Evidências locais (24/08/2026)

- [ ] `bun run prisma:validate`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `DATABASE_URL=.../autodisplay_test bun run test:integration`
- [ ] `bun run build`
- [ ] Link CI run ___ (pendente push/Actions)

---

## Referências

- [Requisitos](../../../base/Requisitos_AutoDisplay_Modulo_Financeiro.md)
- [Planejamento e arquitetura](../../../base/AutoDisplay_Planejamento_Arquitetura.md)
- [Etapa 01 — Setup técnico](../01-setup-tecnico/roadmap.md)
- [Norte semanal](../../norte-semanal.md)
- [CONTEXTO_AGENTES.md](../../../../CONTEXTO_AGENTES.md)
