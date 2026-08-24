# AutoDisplay — Módulo Financeiro — Requisitos do Sistema

> Este documento é a fonte única de requisitos funcionais para o desenvolvimento do Módulo Financeiro da AutoDisplay. Qualquer agente ou desenvolvedor pode partir deste arquivo para entender o que precisa ser construído, sem depender de contexto adicional.

## 1. Contexto do negócio

A AutoDisplay é uma fabricante de displays de papelão (embalagens promocionais, expositores de PDV), de pequeno/médio porte, **sem equipe de TI interna**. O processo financeiro hoje é 100% manual, baseado em planilhas (141 abas de planilha criadas em um único ano, com 11 erros de referência ativos, 3-5h/dia perdidas em tarefas manuais). Este é o primeiro módulo de um sistema maior que será construído de forma incremental, setor por setor — a arquitetura deve considerar que módulos futuros (compras/estoque, produção, orçamento comercial, faturamento, encerramento de pedido) poderão se conectar a este no futuro, mesmo que não sejam desenvolvidos agora.

## 2. O que foi vendido (resumo executivo)

Um sistema de controle financeiro que substitui as planilhas atuais, entregando:
- Controle automatizado de contas a pagar e a receber
- Consolidação automática de saldo de caixa (elimina o cálculo manual hoje feito "abrindo a semana")
- Confiabilidade e segurança: trilha de auditoria, validação de dados, sem exclusão definitiva de lançamentos
- Visão executiva: painel para a direção acompanhar a saúde financeira sem depender do financeiro pra montar relatório
- Fiscal simplificado: emissão de nota fiscal integrada, via plataforma de terceiros homologada

## 3. Usuários e perfis de acesso

| Perfil | Quem usa | Pode fazer |
|---|---|---|
| Lançamento | Financeiro (Gislaine) | Incluir, editar e inativar lançamentos de contas a pagar, contas a receber e movimentações de caixa |
| Visualização/Executivo | Direção (Cláudia) | Ver painel executivo e relatórios consolidados; sem permissão de inclusão/alteração |

- Login individual por usuário, com senha própria. Sem usuários genéricos ou compartilhados.

## 4. Requisitos funcionais

### 4.1 Contas a pagar
- [ ] Cadastro de fornecedor (nome, documento, dados de contato)
- [ ] Registro de conta a pagar vinculada a um fornecedor
- [ ] Campos obrigatórios: valor, data de emissão, data de vencimento, status (em aberto, paga, vencida, inativada)
- [ ] Origem do lançamento identificável (nota de compra, combinado avulso, antecipação/adiantamento)
- [ ] Baixa de pagamento com data efetiva, que pode divergir da data de vencimento

### 4.2 Contas a receber
- [ ] Vínculo com cliente e com o número do pedido de origem (mesmo que o módulo de pedidos em si não seja gerenciado por este sistema)
- [ ] Registro de valor, data de emissão, data de vencimento e status
- [ ] Baixa de recebimento com data efetiva

### 4.3 Fluxo de caixa consolidado (prioridade nº 1)
- [ ] Cálculo automático do saldo consolidado entre todas as contas/bancos cadastrados, sem exigir referência manual ao saldo do dia anterior
- [ ] Consolidação de entradas e saídas por dia, semana e mês
- [ ] Visão de compromissos futuros (contas a pagar e a receber) para a janela de 7 a 15 dias à frente

### 4.4 Trilha de auditoria e validações
- [ ] Todo lançamento (inclusão, edição ou inativação) registra: usuário responsável, data/hora, e valor anterior ao alterado
- [ ] Nenhum lançamento é excluído de forma definitiva do banco de dados — apenas inativação lógica, preservando histórico consultável
- [ ] Validação de entrada: impedir salvar lançamento sem fornecedor/cliente vinculado, sem valor, ou com data de vencimento inválida
- [ ] Validação de valores: impedir valores negativos indevidos conforme a natureza do lançamento

### 4.5 Painel executivo
- [ ] Saldo consolidado
- [ ] Entradas do mês
- [ ] Saídas do mês
- [ ] Valores a vencer nos próximos 15 dias
- [ ] Detalhamento de saídas por categoria (plano de contas)
- [ ] Detalhamento de saídas por fornecedor
- [ ] Lista dos próximos vencimentos, com prazo em dias e categoria associada

### 4.6 Módulo de crédito e antecipação
- [ ] Registro de antecipações formais (via instituição financeira) e adiantamentos informais em um único cadastro
- [ ] Campos mínimos: operador/instituição, taxa aplicada, tipo (formal/informal), valor, data

### 4.7 Emissão de nota fiscal
- [ ] Integração com plataforma homologada de terceiros para emissão de nota fiscal de venda (a plataforma em si — ex.: Focus NFe — é contratada separadamente; este sistema apenas dispara e acompanha a emissão)
- [ ] O sistema não implementa conexão própria com SEFAZ

### 4.8 Preparação para multi-empresa (apenas arquitetural)
- [ ] O modelo de dados deve ser construído de forma que, no futuro, comportar mais de uma empresa/CNPJ seja possível sem reescrita estrutural
- [ ] Nenhuma tela, cadastro ou fluxo de múltiplas empresas é desenvolvido nesta versão — é apenas uma restrição de design a observar (ex.: não assumir CNPJ único hardcoded em regras de negócio)

## 5. Fora de escopo nesta entrega

Não desenvolver, mesmo que pareça natural ou simples de adicionar:
- Conexão própria com o SEFAZ (depende de plataforma homologada de terceiros — item 4.7)
- Importação automática de XML de nota de compra
- Conciliação bancária automática (leitura de extrato OFX/API bancária)
- Integração de dados com módulos de compras/estoque, produção ou comercial/orçamento
- Encerramento de pedido e cálculo de margem real por pedido
- Qualquer tela, cadastro ou fluxo de gestão de múltiplas empresas (ver 4.8)

## 6. Critério de aceite

O sistema está pronto para entrega quando todas as funcionalidades das Seções 4.1 a 4.7 estiverem disponíveis e operacionais em ambiente de homologação. Ajustes de leiaute, cor ou disposição visual do painel executivo (4.5) não são bloqueadores de entrega, desde que os dados e funcionalidades descritos estejam presentes e corretos.
