# Contexto para agentes — AutoDisplay

Leia este arquivo **antes** de criar, mover ou apagar qualquer coisa. Ele define o esquema de pastas e como preenchê-lo. O código do produto **não** mora em `referencias/`.

```
autodisplay/
├── CONTEXTO_AGENTES.md          ← este arquivo
├── appofc/                      ← código do sistema (único lugar)
├── documentacoes/               ← só o que o humano pedir
└── referencias/
    ├── base/                    ← docs oficiais de origem (não reescrever sem pedido)
    ├── roadmap/                 ← to-do do projeto (seguir e preencher)
    └── temporarias/             ← rascunho, uso único ou poucas vezes
```

---

## 1. Roadmaps — to-do list do projeto

Caminho: `referencias/roadmap/`

Trate **todo** o roadmap como lista de tarefas, não como texto morto. Conforme o projeto anda, as pastas e o norte **são atualizados**. Semana e etapa só saem de “pendente” quando o entregável daquela fatia existe de fato.

### `norte-semanal.md`

É o resumo vivo de **o que precisa ser feito** e **o que já foi feito**.

- Quadro de status no topo: marcar `[x]` o que fechou; deixar `[ ]` o que falta.
- Texto de cada semana: o norte da fatia (o que ela é, o que não entra, entregável). Não apague o norte ao marcar progresso — acrescente o status.
- Se o escopo de uma semana mudar de verdade, atualize o norte **e** a pasta da etapa. Não deixe os dois divergirem.

### Pastas `semana1/` … `semana9/`

Ordem do calendário. Não pule semana para “adiantar” feature da frente (ex.: não fazer painel na semana 1).

Dentro de cada semana, as pastas numeradas (`01-…`, `02-…`, `03-…`) são as **etapas maiores**. Trabalhe nessa ordem.

**Como preencher (to-do de verdade):**

- Ao **começar** uma etapa: anote na pasta o que vai ser feito (checklist curto, decisões, links).
- Ao **terminar** uma etapa: registre o que saiu (arquivos em `appofc/`, decisões, pendências). Marque a etapa no `norte-semanal.md`.
- Pasta vazia = etapa não feita. Não marque o norte como concluído se a pasta da etapa não tiver registro.

Não use pasta de etapa de roadmap para código da aplicação. Código vai em `appofc/`. Roadmap guarda o rastro da semana (notas, checklists, status).

---

## 2. Temporárias — nada oficial

Caminho: `referencias/temporarias/`

Aqui entra o que **não é oficial** e tende a ser usado **uma vez ou poucas vezes**:

- rascunho, dump, print, export de planilha, payload de teste, anotação de reunião, experimento
- qualquer arquivo que não deva virar fonte de verdade do produto

Não copie isso para `referencias/base/`, `documentacoes/` ou `appofc/` “porque pode ser útil”. Se virar oficial, o humano pede e aí sobe de pasta.

Pode apagar conteúdo antigo de `temporarias/` quando não servir mais. Não trate essa pasta como arquivo permanente.

---

## 3. Documentações — só o que for pedido

Caminho: `documentacoes/`

Aqui **só** entra o que o humano pedir de fato. Sem pedido explícito:

- não crie README, guia, ADR, runbook, doc de API, comentário longo em `.md`
- não “complete” a pasta porque parece profissional
- não mova rascunho de `temporarias/` para cá por conta própria

Se pedir uma documentação, grave **somente** o que foi pedido, neste diretório (ou no caminho que ele indicar).

`referencias/base/` é outra coisa: são os docs de origem do projeto (requisitos e arquitetura). Não acrescente arquivos em `base/` sem pedido.

---

## 4. `appofc/` — código

Caminho: `appofc/`

Único lugar do repositório para o código da aplicação (backend, frontend, schema, testes, config de deploy do app).

- Não espalhe código em `referencias/` nem em `documentacoes/`.
- Stack já decidida nos docs de `referencias/base/`: NestJS + Prisma + PostgreSQL; React + Vite + TypeScript; TanStack Query; Ant Design; Render. Linguagem: TypeScript. Pacotes JS: bun. Python (se aparecer): uv.
- Semana 1 do roadmap é o momento de nascer a estrutura aqui. Até lá, a pasta pode existir vazia.

---

## Ordem de leitura para qualquer agente

1. Este arquivo.
2. `referencias/roadmap/norte-semanal.md` (o que falta vs. o que fechou).
3. Pasta da **semana e etapa atuais** em `referencias/roadmap/`.
4. `referencias/base/` se a tarefa for de produto/requisito/arquitetura.
5. Código em `appofc/` se a tarefa for implementação.

Não use `referencias/temporarias/` como fonte de verdade.

---

## Regras rápidas

| Precisa… | Onde |
|---|---|
| Saber o que falta e o que já foi feito | `referencias/roadmap/norte-semanal.md` |
| Registrar progresso da etapa | pasta `semanaN/0X-…/` **e** marcar o norte |
| Código do sistema | `appofc/` |
| Doc que o humano pediu | `documentacoes/` |
| Rascunho / uso único | `referencias/temporarias/` |
| Requisito ou arquitetura oficiais | `referencias/base/` (ler; não inflar) |

Não invente pasta nova na raiz. Não misture to-do, rascunho, doc pedida e código na mesma árvore.
