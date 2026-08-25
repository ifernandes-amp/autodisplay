-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('LANCAMENTO', 'EXECUTIVO');
CREATE TYPE "TipoCategoria" AS ENUM ('ENTRADA', 'SAIDA');
CREATE TYPE "StatusTituloPagar" AS ENUM ('EM_ABERTO', 'PAGA');
CREATE TYPE "StatusTituloReceber" AS ENUM ('EM_ABERTO', 'RECEBIDA');
CREATE TYPE "OrigemContaPagar" AS ENUM ('NOTA_COMPRA', 'COMBINADO_AVULSO', 'ANTECIPACAO');
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA');
CREATE TYPE "OrigemMovimento" AS ENUM ('MANUAL', 'BAIXA_PAGAR', 'BAIXA_RECEBER');
CREATE TYPE "TipoCredito" AS ENUM ('FORMAL', 'INFORMAL');
CREATE TYPE "StatusEmissaoNf" AS ENUM ('PENDENTE', 'EMITIDA', 'CANCELADA', 'ERRO');
CREATE TYPE "AcaoAuditoria" AS ENUM ('CREATE', 'UPDATE', 'INACTIVATE');

-- CreateTable
CREATE TABLE "empresa" (
    "id" UUID NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" VARCHAR(14) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conta_bancaria" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT,
    "saldo_inicial" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conta_bancaria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categoria" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fornecedor" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "contato" TEXT,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "contato" TEXT,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conta_pagar" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "fornecedor_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "data_emissao" DATE NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "status" "StatusTituloPagar" NOT NULL,
    "origem" "OrigemContaPagar" NOT NULL,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conta_pagar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conta_receber" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "categoria_id" UUID,
    "pedido_referencia" TEXT,
    "valor" DECIMAL(15,2) NOT NULL,
    "data_emissao" DATE NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "status" "StatusTituloReceber" NOT NULL,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conta_receber_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "baixa" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "conta_pagar_id" UUID,
    "conta_receber_id" UUID,
    "valor" DECIMAL(15,2) NOT NULL,
    "data" DATE NOT NULL,
    "conta_bancaria_id" UUID NOT NULL,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "baixa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movimento_caixa" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "conta_bancaria_id" UUID NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "data" DATE NOT NULL,
    "origem" "OrigemMovimento" NOT NULL,
    "referencia_id" UUID,
    "usuario_id" UUID,
    "descricao" TEXT,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "movimento_caixa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credito_antecipacao" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "operador" TEXT NOT NULL,
    "taxa" DECIMAL(7,4),
    "tipo" "TipoCredito" NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "data" DATE NOT NULL,
    "inativado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "credito_antecipacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nota_fiscal" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "conta_receber_id" UUID NOT NULL,
    "status_emissao" "StatusEmissaoNf" NOT NULL,
    "referencia_externa" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nota_fiscal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "log_auditoria" (
    "id" UUID NOT NULL,
    "empresa_id" UUID,
    "entidade" TEXT NOT NULL,
    "entidade_id" UUID NOT NULL,
    "usuario_id" UUID,
    "correlation_id" TEXT,
    "acao" "AcaoAuditoria" NOT NULL,
    "valor_anterior" JSONB,
    "valor_novo" JSONB,
    "ocorrido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_cnpj_key" ON "empresa"("cnpj");
CREATE INDEX "usuario_empresa_id_idx" ON "usuario"("empresa_id");
CREATE UNIQUE INDEX "usuario_empresa_id_email_key" ON "usuario"("empresa_id", "email");
CREATE INDEX "conta_bancaria_empresa_id_idx" ON "conta_bancaria"("empresa_id");
CREATE INDEX "categoria_empresa_id_idx" ON "categoria"("empresa_id");
CREATE UNIQUE INDEX "categoria_empresa_id_nome_tipo_key" ON "categoria"("empresa_id", "nome", "tipo");
CREATE INDEX "fornecedor_empresa_id_idx" ON "fornecedor"("empresa_id");
CREATE INDEX "cliente_empresa_id_idx" ON "cliente"("empresa_id");
CREATE INDEX "conta_pagar_empresa_id_idx" ON "conta_pagar"("empresa_id");
CREATE INDEX "conta_pagar_empresa_id_data_vencimento_idx" ON "conta_pagar"("empresa_id", "data_vencimento");
CREATE INDEX "conta_pagar_empresa_id_status_idx" ON "conta_pagar"("empresa_id", "status");
CREATE INDEX "conta_receber_empresa_id_idx" ON "conta_receber"("empresa_id");
CREATE INDEX "conta_receber_empresa_id_data_vencimento_idx" ON "conta_receber"("empresa_id", "data_vencimento");
CREATE INDEX "conta_receber_empresa_id_status_idx" ON "conta_receber"("empresa_id", "status");
CREATE INDEX "baixa_empresa_id_idx" ON "baixa"("empresa_id");
CREATE INDEX "baixa_conta_pagar_id_idx" ON "baixa"("conta_pagar_id");
CREATE INDEX "baixa_conta_receber_id_idx" ON "baixa"("conta_receber_id");
CREATE INDEX "movimento_caixa_empresa_id_idx" ON "movimento_caixa"("empresa_id");
CREATE INDEX "movimento_caixa_empresa_id_referencia_id_idx" ON "movimento_caixa"("empresa_id", "referencia_id");
CREATE INDEX "movimento_caixa_conta_bancaria_id_data_idx" ON "movimento_caixa"("conta_bancaria_id", "data");
CREATE INDEX "credito_antecipacao_empresa_id_idx" ON "credito_antecipacao"("empresa_id");
CREATE INDEX "nota_fiscal_empresa_id_idx" ON "nota_fiscal"("empresa_id");
CREATE INDEX "nota_fiscal_conta_receber_id_idx" ON "nota_fiscal"("conta_receber_id");
CREATE INDEX "log_auditoria_entidade_entidade_id_idx" ON "log_auditoria"("entidade", "entidade_id");
CREATE INDEX "log_auditoria_usuario_id_idx" ON "log_auditoria"("usuario_id");
CREATE INDEX "log_auditoria_ocorrido_em_idx" ON "log_auditoria"("ocorrido_em" DESC);
CREATE INDEX "log_auditoria_empresa_id_idx" ON "log_auditoria"("empresa_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_bancaria" ADD CONSTRAINT "conta_bancaria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fornecedor" ADD CONSTRAINT "fornecedor_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_pagar" ADD CONSTRAINT "conta_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_pagar" ADD CONSTRAINT "conta_pagar_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_pagar" ADD CONSTRAINT "conta_pagar_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_receber" ADD CONSTRAINT "conta_receber_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_receber" ADD CONSTRAINT "conta_receber_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_receber" ADD CONSTRAINT "conta_receber_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baixa" ADD CONSTRAINT "baixa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baixa" ADD CONSTRAINT "baixa_conta_pagar_id_fkey" FOREIGN KEY ("conta_pagar_id") REFERENCES "conta_pagar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baixa" ADD CONSTRAINT "baixa_conta_receber_id_fkey" FOREIGN KEY ("conta_receber_id") REFERENCES "conta_receber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baixa" ADD CONSTRAINT "baixa_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimento_caixa" ADD CONSTRAINT "movimento_caixa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimento_caixa" ADD CONSTRAINT "movimento_caixa_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimento_caixa" ADD CONSTRAINT "movimento_caixa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credito_antecipacao" ADD CONSTRAINT "credito_antecipacao_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nota_fiscal" ADD CONSTRAINT "nota_fiscal_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nota_fiscal" ADD CONSTRAINT "nota_fiscal_conta_receber_id_fkey" FOREIGN KEY ("conta_receber_id") REFERENCES "conta_receber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tenant composite keys
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_empresa_unique" UNIQUE ("id", "empresa_id");
ALTER TABLE "conta_bancaria" ADD CONSTRAINT "conta_bancaria_id_empresa_unique" UNIQUE ("id", "empresa_id");
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_id_empresa_unique" UNIQUE ("id", "empresa_id");
ALTER TABLE "fornecedor" ADD CONSTRAINT "fornecedor_id_empresa_unique" UNIQUE ("id", "empresa_id");
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_empresa_unique" UNIQUE ("id", "empresa_id");
ALTER TABLE "conta_pagar" ADD CONSTRAINT "conta_pagar_id_empresa_unique" UNIQUE ("id", "empresa_id");
ALTER TABLE "conta_receber" ADD CONSTRAINT "conta_receber_id_empresa_unique" UNIQUE ("id", "empresa_id");

ALTER TABLE "conta_pagar" ADD CONSTRAINT "conta_pagar_fornecedor_tenant_fkey" FOREIGN KEY ("fornecedor_id", "empresa_id") REFERENCES "fornecedor"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_pagar" ADD CONSTRAINT "conta_pagar_categoria_tenant_fkey" FOREIGN KEY ("categoria_id", "empresa_id") REFERENCES "categoria"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_receber" ADD CONSTRAINT "conta_receber_cliente_tenant_fkey" FOREIGN KEY ("cliente_id", "empresa_id") REFERENCES "cliente"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conta_receber" ADD CONSTRAINT "conta_receber_categoria_tenant_fkey" FOREIGN KEY ("categoria_id", "empresa_id") REFERENCES "categoria"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baixa" ADD CONSTRAINT "baixa_conta_pagar_tenant_fkey" FOREIGN KEY ("conta_pagar_id", "empresa_id") REFERENCES "conta_pagar"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baixa" ADD CONSTRAINT "baixa_conta_receber_tenant_fkey" FOREIGN KEY ("conta_receber_id", "empresa_id") REFERENCES "conta_receber"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baixa" ADD CONSTRAINT "baixa_conta_bancaria_tenant_fkey" FOREIGN KEY ("conta_bancaria_id", "empresa_id") REFERENCES "conta_bancaria"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimento_caixa" ADD CONSTRAINT "movimento_caixa_conta_bancaria_tenant_fkey" FOREIGN KEY ("conta_bancaria_id", "empresa_id") REFERENCES "conta_bancaria"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimento_caixa" ADD CONSTRAINT "movimento_caixa_usuario_tenant_fkey" FOREIGN KEY ("usuario_id", "empresa_id") REFERENCES "usuario"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nota_fiscal" ADD CONSTRAINT "nota_fiscal_conta_receber_tenant_fkey" FOREIGN KEY ("conta_receber_id", "empresa_id") REFERENCES "conta_receber"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business CHECK constraints
ALTER TABLE "conta_pagar"
  ADD CONSTRAINT "conta_pagar_valor_pos" CHECK ("valor" > 0),
  ADD CONSTRAINT "conta_pagar_vencimento" CHECK ("data_vencimento" >= "data_emissao"),
  ADD CONSTRAINT "conta_pagar_inativada_status" CHECK ("inativado_em" IS NULL OR "status" = 'EM_ABERTO');

ALTER TABLE "conta_receber"
  ADD CONSTRAINT "conta_receber_valor_pos" CHECK ("valor" > 0),
  ADD CONSTRAINT "conta_receber_vencimento" CHECK ("data_vencimento" >= "data_emissao"),
  ADD CONSTRAINT "conta_receber_inativada_status" CHECK ("inativado_em" IS NULL OR "status" = 'EM_ABERTO');

ALTER TABLE "baixa"
  ADD CONSTRAINT "baixa_xor_titulo" CHECK (
    ("conta_pagar_id" IS NOT NULL AND "conta_receber_id" IS NULL)
    OR ("conta_pagar_id" IS NULL AND "conta_receber_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "baixa_valor_pos" CHECK ("valor" > 0);

ALTER TABLE "movimento_caixa"
  ADD CONSTRAINT "movimento_caixa_valor_pos" CHECK ("valor" > 0),
  ADD CONSTRAINT "movimento_caixa_referencia_obrigatoria" CHECK (
    "origem" = 'MANUAL'
    OR "referencia_id" IS NOT NULL
  );

ALTER TABLE "credito_antecipacao"
  ADD CONSTRAINT "credito_antecipacao_valor_pos" CHECK ("valor" > 0);

-- Audit schema and functions
CREATE SCHEMA IF NOT EXISTS audit;

CREATE OR REPLACE FUNCTION audit.redact_jsonb(data jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(data, '{}'::jsonb)
    - 'senhaHash'
    - 'senha_hash'
    - 'password'
    - 'token'
    - 'authorization'
    - 'DATABASE_URL';
$$;

CREATE OR REPLACE FUNCTION audit.resolve_empresa_id(
  table_name text,
  new_row jsonb,
  old_row jsonb
)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF table_name = 'empresa' THEN
    RETURN COALESCE((new_row ->> 'id')::uuid, (old_row ->> 'id')::uuid);
  END IF;

  RETURN COALESCE((new_row ->> 'empresa_id')::uuid, (old_row ->> 'empresa_id')::uuid);
END;
$$;

CREATE OR REPLACE FUNCTION audit.resolve_action(
  table_name text,
  old_row jsonb,
  new_row jsonb
)
RETURNS "AcaoAuditoria"
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF table_name = 'empresa'
     AND COALESCE((old_row ->> 'ativa')::boolean, true) = true
     AND COALESCE((new_row ->> 'ativa')::boolean, false) = false THEN
    RETURN 'INACTIVATE';
  END IF;

  IF COALESCE(old_row ->> 'inativado_em', '') = ''
     AND COALESCE(new_row ->> 'inativado_em', '') <> '' THEN
    RETURN 'INACTIVATE';
  END IF;

  IF old_row IS NULL THEN
    RETURN 'CREATE';
  END IF;

  RETURN 'UPDATE';
END;
$$;

CREATE OR REPLACE FUNCTION audit.capture_row_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_json jsonb;
  new_json jsonb;
  action "AcaoAuditoria";
BEGIN
  old_json := CASE WHEN TG_OP = 'UPDATE' THEN audit.redact_jsonb(to_jsonb(OLD)) END;
  new_json := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN audit.redact_jsonb(to_jsonb(NEW)) END;
  action := audit.resolve_action(TG_TABLE_NAME, old_json, new_json);

  INSERT INTO log_auditoria (
    id,
    empresa_id,
    entidade,
    entidade_id,
    usuario_id,
    correlation_id,
    acao,
    valor_anterior,
    valor_novo,
    ocorrido_em
  ) VALUES (
    gen_random_uuid(),
    audit.resolve_empresa_id(TG_TABLE_NAME, new_json, old_json),
    TG_TABLE_NAME,
    COALESCE((new_json ->> 'id')::uuid, (old_json ->> 'id')::uuid),
    NULLIF(current_setting('app.usuario_id', true), '')::uuid,
    NULLIF(current_setting('app.correlation_id', true), ''),
    action,
    old_json,
    new_json,
    CURRENT_TIMESTAMP
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION audit.deny_physical_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'physical DELETE forbidden on %', TG_TABLE_NAME
    USING ERRCODE = '23503';
END;
$$;

CREATE OR REPLACE FUNCTION audit.deny_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'log_auditoria is append-only'
    USING ERRCODE = '23503';
END;
$$;

CREATE OR REPLACE FUNCTION audit.attach_table_triggers(target_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  audit_trigger_name text;
  delete_trigger_name text;
BEGIN
  audit_trigger_name := format('%s_audit_capture', target_table);
  delete_trigger_name := format('%s_deny_delete', target_table);

  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON %s',
    audit_trigger_name,
    target_table
  );
  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON %s',
    delete_trigger_name,
    target_table
  );

  EXECUTE format(
    'CREATE TRIGGER %I AFTER INSERT OR UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change()',
    audit_trigger_name,
    target_table
  );
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE DELETE ON %s FOR EACH ROW EXECUTE FUNCTION audit.deny_physical_delete()',
    delete_trigger_name,
    target_table
  );
END;
$$;

SELECT audit.attach_table_triggers('empresa'::regclass);
SELECT audit.attach_table_triggers('usuario'::regclass);
SELECT audit.attach_table_triggers('conta_bancaria'::regclass);
SELECT audit.attach_table_triggers('categoria'::regclass);
SELECT audit.attach_table_triggers('fornecedor'::regclass);
SELECT audit.attach_table_triggers('cliente'::regclass);
SELECT audit.attach_table_triggers('conta_pagar'::regclass);
SELECT audit.attach_table_triggers('conta_receber'::regclass);
SELECT audit.attach_table_triggers('baixa'::regclass);
SELECT audit.attach_table_triggers('movimento_caixa'::regclass);
SELECT audit.attach_table_triggers('credito_antecipacao'::regclass);
SELECT audit.attach_table_triggers('nota_fiscal'::regclass);

DROP TRIGGER IF EXISTS log_auditoria_immutable ON log_auditoria;
CREATE TRIGGER log_auditoria_immutable
  BEFORE UPDATE OR DELETE ON log_auditoria
  FOR EACH ROW
  EXECUTE FUNCTION audit.deny_log_mutation();
