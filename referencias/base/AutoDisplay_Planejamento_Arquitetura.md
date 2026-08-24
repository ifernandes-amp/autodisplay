# AutoDisplay — Módulo Financeiro
## Planejamento de prazo e arquitetura técnica

> Documento de referência consolidando as decisões de cronograma, modelo de dados e stack tecnológica discutidas na etapa de planejamento. Complementa (não substitui) o `CONTEXTO_CONSOLIDADO_AutoDisplay.md` e o `Requisitos_AutoDisplay_Modulo_Financeiro.md`.

---

## 1. Contexto

- Primeiro módulo de um sistema maior que vai, ao longo do tempo, cobrir todas as áreas da AutoDisplay (financeiro, compras/estoque, produção, comercial, faturamento).
- Hoje: **2 usuárias** (Gislaine — lançamento; Cláudia — visualização executiva).
- Premissa de projeto: **não superdimensionar agora pensando no sistema final**, mas manter decisões de arquitetura que não fechem porta pra esse crescimento.
- Desenvolvedor único (Igor), sem equipe de TI de apoio no lado do cliente.

---

## 2. Cronograma

### 2.1 Capacidade real vs. escopo

- Disponibilidade original informada: 2h/dia (seg-sex) + 4h sábado = 14h/semana.
- Escopo original da proposta: 177h — **incompatível** com 14h/semana em 2 meses (~120-140h disponíveis).
- Reestimativa item a item do escopo técnico (não do valor comercial): **~156h reais**, com o item fiscal (4.7) identificado como o mais inflado na proposta original (45h → ~19h realista).
- Decisão: **aumentar a disponibilidade semanal**, não cortar escopo nem esticar o prazo prometido ao cliente.
  - Dias de semana: 2h → **3h** (+5h/semana)
  - Sábado: mantido em 4h
  - **Nova disponibilidade: 19h/semana**
- Capacidade em 8,7 semanas (2 meses): ~165h — cobre as ~156h necessárias, com **buffer real de ~5-9h** (apertado, não confortável).

### 2.2 Cronograma semana a semana (9 semanas, 19h/semana)

| Semana | Foco | Entregável | Horas |
|---|---|---|---|
| 1 | Setup técnico (repo, Render, Postgres) + início da modelagem com auditoria já embutida + AuthModule | Ambiente rodando, autenticação por perfil funcionando | 19h |
| 2 | Contas a pagar (4.1) + módulo de categorias (CRUD) | Cadastro de fornecedor, CRUD de contas a pagar, categorias cadastráveis | 19h |
| 3 | Contas a receber (4.2) — **confirmar com Gislaine se existe baixa parcial antes desta semana** | CRUD completo de pagar/receber com baixa | 19h |
| 4 | Fluxo de caixa consolidado (4.3) — prioridade nº1 do escopo | Saldo automático via `MovimentoCaixa`, visão de 7-15 dias | 19h |
| 5 | Painel executivo (4.5) | Dashboard com saldo, entradas/saídas, categorias, fornecedores | 19h |
| 6 | Crédito/antecipação (4.6) + início da integração fiscal (4.7) | Cadastro de crédito pronto; sandbox de NF-e testado | 19h |
| 7 | Fecha integração fiscal + início de testes | Emissão de nota disparando e acompanhando status | 19h |
| 8 | Testes/homologação + migração das 141 abas + treinamento da Gislaine | Ambiente homologado, dados migrados, operação em paralelo | 19h |
| 9 | Buffer — sem feature nova alocada de propósito | Ajustes finais, imprevistos, corte definitivo das planilhas | 19h |

### 2.3 Riscos de prazo em aberto

- Buffer real de apenas ~5-9h no projeto inteiro — qualquer imprevisto (doença, outro cliente, atraso de homologação de terceiro) consome isso rápido.
- Homologação da plataforma de NF-e depende de terceiro — abrir conta/sandbox já nas semanas 1-2, mesmo sem codar nada, para não descobrir problema de credenciamento na semana 7.
- Migração das 141 abas + treinamento da Gislaine é tempo de agenda/acompanhamento humano, não hora de código — reservado explicitamente na Semana 8.

---

## 3. Modelo de dados

### 3.1 Entidades

| Entidade | Campos principais | Observação |
|---|---|---|
| `Usuario` | nome, email, senha_hash, perfil (lançamento / executivo) | Login individual, sem usuário genérico |
| `ContaBancaria` | nome, banco, saldo_inicial, ativa | Suporta "todas as contas/bancos cadastrados" (4.3) |
| `Categoria` | nome, tipo (entrada/saída) | Plano de contas — **cadastrável pela Gislaine** |
| `MovimentoCaixa` | conta_bancaria_id, tipo, valor, data, origem (manual / baixa_pagar / baixa_receber), referencia_id, usuario_id | **Livro-razão central** — todo saldo é somado a partir daqui, nunca calculado manualmente |
| `Fornecedor` | nome, documento, contato | |
| `Cliente` | nome, documento, contato | |
| `ContaPagar` | fornecedor_id, categoria_id, valor, data_emissão, data_vencimento, status, origem | Status "vencida" é **calculado na consulta**, não persistido (evita depender de job agendado) |
| `ContaReceber` | cliente_id, pedido_id (referência textual), valor, data_emissão, data_vencimento, status | |
| `Baixa` | conta_pagar_id ou conta_receber_id, valor, data, conta_bancaria_id | Tabela genérica, já preparada para baixa parcial (hoje a regra exige soma = 100% do valor) |
| `CreditoAntecipacao` | operador, taxa, tipo (formal/informal), valor, data | |
| `NotaFiscal` | conta_receber_id, status_emissão, referencia_externa | Integração via plataforma de terceiro homologada |
| `LogAuditoria` | entidade, entidade_id, usuario_id, ação, valor_anterior (JSON), valor_novo (JSON), timestamp | Capturado via middleware do Prisma — um único ponto de captura, não repetido por módulo |

Todas as entidades principais reservam um campo `empresa_id` (nullable/default), preparando terreno para multi-empresa (4.8) sem construir nenhuma tela ou fluxo disso agora.

### 3.2 Decisões de design que evitam retrabalho futuro

- **`MovimentoCaixa` como fonte única de verdade do saldo** — baixas de contas a pagar/receber geram um registro automaticamente; movimentações manuais (transferência, aporte, ajuste) entram direto. Elimina o risco de dois caminhos de cálculo divergentes.
- **`Baixa` como tabela própria, não colunas soltas** — permite suportar baixa parcial no futuro sem migração de schema, caso a Gislaine confirme que isso acontece na operação real (pendência aberta).
- **Status "vencida" calculado, não armazenado** — evita depender de um scheduler/cron só para manter esse dado atualizado.

### 3.3 Pendência a confirmar com a Gislaine

- **Baixa parcial de contas a pagar/receber acontece na operação real?** Precisa de resposta antes da Semana 3. Se sim, a regra de validação muda (sem alteração de schema); se não, mantém como está.

---

## 4. Arquitetura da aplicação

### 4.1 Visão geral

```
Navegador (Gislaine e Cláudia)
        │
        ▼
Aplicação (Render — NestJS + Prisma)
   ├── Auditoria (intercepta tudo)
   └── Módulos do domínio (contas, caixa, painel, crédito, fiscal, categoria, auth)
        │                                   │
        ▼                                   ▼
   PostgreSQL (Render)          Plataforma de NF-e (serviço terceiro homologado)
```

- **Auditoria como módulo transversal**, não embutida em cada módulo de domínio — captura tudo via middleware, sem duplicar lógica.
- **Fiscal (4.7) não é código próprio** — é uma chamada de API para uma plataforma de terceiros homologada (ex.: Focus NFe). O sistema nunca conecta direto ao SEFAZ.
- **Perfis de acesso** (lançamento vs. executivo) resolvidos dentro da aplicação via guard, não em camada separada.

### 4.2 Backend

- **NestJS + TypeScript** — estrutura modular nativa: cada domínio (contas a pagar, contas a receber, caixa, auditoria, fiscal, crédito, categoria) é um módulo isolado com injeção de dependência. Módulos futuros (compras, produção, comercial) entram como módulos novos, sem reescrever o que já existe.
- **Prisma** como ORM — migrations simples de versionar e reverter, importante para manutenção solo.
- **Monolito modular, não microsserviços** — adequado para 2 usuárias hoje e sem overhead operacional de múltiplos serviços para manter sozinho.

### 4.3 Frontend

- **React + Vite + TypeScript**
- **React Router com carregamento por módulo (lazy loading)** — cada área futura da empresa vira uma rota nova, carregada sob demanda, sem inflar o app que a Gislaine usa hoje.
- **TanStack Query** para dado de servidor (cache, invalidação) — evita a complexidade desnecessária de um Redux para esse tamanho de aplicação.
- **Ant Design** como biblioteca de componentes — acelera telas de tabela/formulário/dashboard, que são a maior parte do sistema.

### 4.4 Infraestrutura e deploy

| Item | Escolha | Custo/mês |
|---|---|---|
| Backend | Render — Web Service (Starter) | $7 |
| Banco de dados | Render — PostgreSQL (Starter) | $7 |
| Frontend | Render — Static Site | grátis |
| CI/CD | GitHub Actions | grátis |
| Qualidade de código | ESLint + Prettier + Husky (pre-commit) | grátis |
| Testes | Jest — focado em cálculo financeiro e auditoria | grátis |
| Monitoramento de erro | Sentry (tier gratuito) | grátis |
| Monitoramento de disponibilidade | UptimeRobot (tier gratuito) | grátis |

**Total estimado: ~$14/mês (~R$75 a R$5,35/dólar)** — dentro do teto de R$100/mês já comprometido no plano de precificação, com ~R$25 de margem.

- Todos os serviços consolidados no Render (um único painel de controle, uma senha, um lugar para checar logs).
- Postgres contratado desde já no plano pago (não no tier gratuito) — bancos gratuitos de provedores de nuvem costumam não ser recomendados para produção e têm limite de expiração, o que é inaceitável para dado financeiro.
- Escalar para o resto da empresa depois é, nesse modelo, uma **mudança de plano no Render**, não uma rearquitetura.

---

## 5. Riscos consolidados

- Buffer de cronograma apertado (~5-9h no projeto inteiro).
- Homologação de terceiro (plataforma de NF-e) fora do controle do desenvolvedor — mitigado começando essa integração cedo (Semana 6, não deixada para o fim).
- Confirmação pendente sobre baixa parcial — pode adicionar validação extra (não schema) se confirmado necessário.
- Tiers gratuitos de Sentry/UptimeRobot têm limites de volume — suficientes para 2 usuárias, a revisitar quando a base crescer.

---

## 6. Próximos passos

1. Confirmar com a Gislaine: baixa parcial acontece na operação real? (antes da Semana 3)
2. Definir data de início real para travar o calendário semana a semana.
3. Abrir conta/sandbox na plataforma de NF-e escolhida (idealmente já nas Semanas 1-2).
4. Gerar o código inicial (schema Prisma + estrutura de pastas NestJS/React) — próxima etapa, ainda não iniciada.
