# Norte semanal — AutoDisplay Financeiro

> To-do vivo das 9 semanas: o que falta, o que já foi feito, o norte de cada fatia (o que ela é, o que não entra, entregável). Detalhe e rastro de execução ficam na pasta da etapa. Código fica em `appofc/`. Como usar as pastas: `CONTEXTO_AGENTES.md` na raiz.

Capacidade: **19h/semana**. Escopo reestimado: **~156h**. Buffer real: **~5–9h** no projeto inteiro (apertado).

Fonte: `referencias/base/AutoDisplay_Planejamento_Arquitetura.md` e `referencias/base/Requisitos_AutoDisplay_Modulo_Financeiro.md`.

---

## Status — o que falta e o que foi feito

Marcar `[x]` só quando a etapa tiver registro na pasta correspondente **e** o entregável existir. Pasta vazia = ainda não feito.

### Antes de travar o calendário

- [ ] Definir data de início real
- [ ] Abrir conta/sandbox da NF-e (semanas 1–2)
- [ ] Confirmar baixa parcial com a Gislaine (antes da semana 3)

### Semanas e etapas

- [ ] **Semana 1** — ambiente no ar + auth por perfil
  - [ ] `semana1/01-setup-tecnico` — **roadmap escrito** ([roadmap.md](semana1/01-setup-tecnico/roadmap.md)); setup **não executado**
  - [ ] `semana1/02-modelagem-auditoria`
  - [ ] `semana1/03-auth-module`
- [ ] **Semana 2** — fornecedor, categorias, contas a pagar
  - [ ] `semana2/01-categorias`
  - [ ] `semana2/02-fornecedor`
  - [ ] `semana2/03-contas-a-pagar`
- [ ] **Semana 3** — receber + baixa + movimento na liquidação
  - [ ] `semana3/01-cliente-contas-a-receber`
  - [ ] `semana3/02-baixa`
  - [ ] `semana3/03-movimento-caixa-na-baixa`
- [ ] **Semana 4** — fluxo de caixa (prioridade nº 1)
  - [ ] `semana4/01-contas-bancarias`
  - [ ] `semana4/02-saldo-movimento-caixa`
  - [ ] `semana4/03-visoes`
- [ ] **Semana 5** — painel executivo
  - [ ] `semana5/01-guard-perfil-executivo`
  - [ ] `semana5/02-indicadores`
  - [ ] `semana5/03-detalhamentos`
- [ ] **Semana 6** — crédito + início fiscal
  - [ ] `semana6/01-credito-antecipacao`
  - [ ] `semana6/02-fiscal-sandbox`
- [ ] **Semana 7** — fecha NF-e + testes
  - [ ] `semana7/01-emissao-nfe`
  - [ ] `semana7/02-testes-focados`
  - [ ] `semana7/03-fechar-buracos`
- [ ] **Semana 8** — homologar, migrar, treinar
  - [ ] `semana8/01-homologacao`
  - [ ] `semana8/02-migracao-planilhas`
  - [ ] `semana8/03-treinamento-gislaine`
- [ ] **Semana 9** — buffer, sem feature nova
  - [ ] `semana9/01-ajustes-homologacao`
  - [ ] `semana9/02-folga-nfe-migracao`
  - [ ] `semana9/03-corte-planilhas`

---

## Antes de travar o calendário

- Definir a **data de início real** — sem isso as 9 semanas são só uma sequência, não um prazo.
- Abrir **conta/sandbox da NF-e** nas semanas 1–2, mesmo sem codar fiscal. Homologação de terceiro atrasada queima o buffer na semana 7.
- Confirmar com a Gislaine se existe **baixa parcial** — resposta **antes da semana 3**. Schema já aguenta; só muda a regra de validação.

---

## Semana 1 — Ambiente e autenticação

A semana é só isto: **ambiente no ar + autenticação por perfil funcionando**. 19h.

Três frentes, nesta ordem:

1. **Setup técnico** — repositório, Render (Web Service único: API + SPA na mesma origem) e PostgreSQL pago. CI básico (GitHub Actions, ESLint, Prettier, Husky) entra junto. Roadmap da etapa: [semana1/01-setup-tecnico/roadmap.md](semana1/01-setup-tecnico/roadmap.md) (escrito; implementação pendente).
2. **Modelagem com auditoria já embutida** — schema Prisma das entidades principais e o middleware de `LogAuditoria` desde o primeiro write. Não deixa auditoria “para depois”. Reserva `empresa_id`; nenhuma tela multi-empresa.
3. **AuthModule** — login individual, senha própria, dois perfis (lançamento vs executivo) resolvidos por guard na API. Esse é o entregável visível.

Paralelo, sem ser código: abrir sandbox da NF-e.

Não entra: CRUD de pagar/receber, categorias, caixa, painel, crédito nem emissão de nota.

**Entregável:** ambiente rodando; Gislaine e Cláudia autenticam com perfil distinto.

Pasta: `semana1/`

---

## Semana 2 — Contas a pagar e categorias

A semana é o **primeiro domínio operacional**: Gislaine cadastra fornecedor, categoria e conta a pagar. 19h. Requisitos 4.1 + plano de contas.

Três frentes:

1. **Categorias** — CRUD cadastrável pela Gislaine (entrada/saída). Precisa existir agora porque pagar já nasce com `categoria_id`.
2. **Fornecedor** — nome, documento, contato.
3. **Contas a pagar** — título vinculado a fornecedor: valor, emissão, vencimento, origem (nota de compra, combinado avulso, antecipação), status. Status “vencida” é **calculado na consulta**, não persistido. Inativação lógica; nada some do banco.

Não entra: contas a receber, baixa (isso é semana 3), fluxo de caixa, painel.

**Entregável:** cadastro de fornecedor, CRUD de contas a pagar, categorias cadastráveis.

Pasta: `semana2/`

---

## Semana 3 — Contas a receber e baixa

A semana fecha o **ciclo título → liquidação** dos dois lados. 19h. Requisito 4.2.

Bloqueio: **baixa parcial confirmada com a Gislaine antes de começar**. Se sim, a soma das baixas pode ser menor que o título; se não, a baixa precisa fechar 100%. Schema não muda — só a regra.

Três frentes:

1. **Cliente + contas a receber** — vínculo com cliente e número do pedido (texto). Pedido em si não é gerenciado aqui.
2. **Baixa** — tabela própria, data efetiva (pode divergir do vencimento), conta bancária. Serve pagar e receber.
3. **MovimentoCaixa na baixa** — liquidar um título **gera** o livro-razão automaticamente. Sem isso a semana 4 não tem de onde somar saldo.

Não entra: tela de fluxo de caixa, painel executivo, fiscal.

**Entregável:** CRUD completo de pagar/receber com baixa.

Pasta: `semana3/`

---

## Semana 4 — Fluxo de caixa (prioridade nº 1)

A semana é o **produto que foi vendido**: saldo consolidado sem “abrir a semana” na mão. 19h. Requisito 4.3.

Três frentes:

1. **Contas bancárias** — todas as contas/bancos cadastrados entram no consolidado.
2. **Saldo via `MovimentoCaixa`** — um único caminho de cálculo. Baixas já gravam movimento; transferências, aportes e ajustes entram direto. Nunca calcular saldo por outro caminho.
3. **Visões** — entradas e saídas por dia, semana e mês; compromissos futuros (pagar/receber em aberto) na janela de 7–15 dias.

Não entra: dashboard da Cláudia (semana 5). Esta semana é a verdade do caixa, não o painel executivo.

**Entregável:** saldo automático via `MovimentoCaixa`; visão de 7–15 dias.

Pasta: `semana4/`

---

## Semana 5 — Painel executivo

A semana é a **visão da Cláudia**: ela consulta sozinha, sem pedir relatório. 19h. Requisito 4.5.

O painel lê o que as semanas 2–4 já gravam. Guard de perfil importa de verdade aqui — executivo só lê.

O que precisa aparecer:

- Saldo consolidado
- Entradas e saídas do mês
- Valores a vencer nos próximos 15 dias
- Saídas por categoria e por fornecedor
- Próximos vencimentos, com prazo em dias e categoria

Ajuste de leiaute, cor ou disposição **não bloqueia** entrega, desde que os dados estejam certos.

Não entra: crédito, NF-e, polish visual como meta.

**Entregável:** dashboard com saldo, entradas/saídas, categorias e fornecedores.

Pasta: `semana5/`

---

## Semana 6 — Crédito e início do fiscal

A semana é **cadastro de crédito pronto + sandbox de NF-e testado**. 19h. Requisitos 4.6 e início do 4.7.

Duas frentes, sem misturar:

1. **Crédito/antecipação** — um cadastro só para antecipação formal (instituição) e adiantamento informal. Campos: operador, taxa, tipo, valor, data.
2. **Fiscal — só o começo** — credenciamento/sandbox já deveria existir desde as semanas 1–2. Nesta semana: cliente HTTP da plataforma (ex.: Focus NFe), payload mínimo, chamada de teste. O sistema **não** fala com SEFAZ.

Não entra: emissão de nota no fluxo real da Gislaine (isso fecha na semana 7).

**Entregável:** cadastro de crédito operacional; sandbox de NF-e respondendo.

Pasta: `semana6/`

---

## Semana 7 — Fecha fiscal e começa teste

A semana **fecha a última feature vendida** e começa a qualidade. 19h. Requisito 4.7 + início de testes.

Três frentes:

1. **Emissão de NF-e no fluxo** — disparar a partir de conta a receber, gravar `NotaFiscal` (status + referência externa), acompanhar o status. Sem conexão própria com SEFAZ.
2. **Testes focados** — Jest no cálculo financeiro (`MovimentoCaixa`, saldo, vencida calculada) e na auditoria. Não é cobertura de tela.
3. **Fechar buracos das semanas 1–6** — só o que impede as seções 4.1–4.7 de funcionarem.

Não entra: migração das 141 abas, treinamento, feature nova que não esteja nos requisitos.

**Entregável:** emissão de nota disparando e acompanhando status; bateria inicial de testes no núcleo financeiro.

Pasta: `semana7/`

---

## Semana 8 — Homologação, migração e treino

A semana **não é hora de código novo**. É agenda humana + ambiente de verdade. 19h.

Três frentes:

1. **Homologação** — 4.1 a 4.7 operacionais no ambiente de homologação (critério de aceite).
2. **Migração das 141 abas** — tempo de extração, conferência e carga. Não é feature.
3. **Treinamento da Gislaine** — operação em paralelo (sistema + planilha) até ela conseguir trabalhar no sistema.

Não entra: feature nova. Buraco encontrado volta como correção, não como escopo extra.

**Entregável:** ambiente homologado, dados migrados, operação em paralelo.

Pasta: `semana8/`

---

## Semana 9 — Buffer, sem feature nova

A semana existe **de propósito vazia de feature**. 19h para imprevisto, não para inventar módulo.

Três usos legítimos:

1. Ajustes do que quebrou na homologação/treino.
2. Folga se a NF-e ou a migração atrasou.
3. **Corte definitivo das planilhas** — critério de saída: Gislaine opera no sistema.

Não entra: “já que sobrou tempo, vamos fazer conciliação / XML / multi-empresa”. Isso está fora de escopo.

**Entregável:** ajustes finais e corte das planilhas — ou o buffer consumido, sem ampliar o produto.

Pasta: `semana9/`

---

## O que nenhuma semana deve absorver

Mesmo que pareça barato no meio do caminho:

- Conexão própria com SEFAZ
- Importação de XML de compra
- Conciliação bancária (OFX / API banco)
- Integração com compras, estoque, produção, comercial
- Encerramento de pedido e margem real
- Telas ou fluxos de multi-empresa
