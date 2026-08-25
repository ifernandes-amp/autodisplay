-- AlterTable
ALTER TABLE "usuario" ADD COLUMN "ultimo_acesso_em" TIMESTAMPTZ(3),
ADD COLUMN "senha_alterada_em" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "sessao_usuario" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_uso_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "revogada_em" TIMESTAMPTZ(3),
    "motivo_revogacao" TEXT,

    CONSTRAINT "sessao_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessao_usuario_token_hash_key" ON "sessao_usuario"("token_hash");
CREATE INDEX "sessao_usuario_usuario_id_revogada_em_idx" ON "sessao_usuario"("usuario_id", "revogada_em");
CREATE INDEX "sessao_usuario_expira_em_idx" ON "sessao_usuario"("expira_em");
CREATE INDEX "sessao_usuario_empresa_id_usuario_id_idx" ON "sessao_usuario"("empresa_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "sessao_usuario" ADD CONSTRAINT "sessao_usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessao_usuario" ADD CONSTRAINT "sessao_usuario_usuario_id_empresa_id_fkey" FOREIGN KEY ("usuario_id", "empresa_id") REFERENCES "usuario"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "sessao_usuario" ADD CONSTRAINT "sessao_usuario_expira_em_check" CHECK ("expira_em" > "criada_em");
