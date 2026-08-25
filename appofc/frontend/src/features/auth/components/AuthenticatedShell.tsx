import { Alert, Button, Card, Spin, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types/auth';

const { Title, Paragraph, Text } = Typography;

interface AuthenticatedShellProps {
  user: AuthUser;
  onLogout: () => void;
  isLoggingOut: boolean;
  children?: ReactNode;
}

function perfilLabel(perfil: AuthUser['perfil']): string {
  return perfil === 'EXECUTIVO' ? 'Executivo' : 'Lançamento';
}

export function AuthenticatedShell({
  user,
  onLogout,
  isLoggingOut,
  children,
}: AuthenticatedShellProps) {
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <div>
          <Title level={4} className="auth-header-title">
            AutoDisplay Financeiro
          </Title>
          <Text type="secondary">
            {user.nome} · {perfilLabel(user.perfil)}
          </Text>
        </div>
        <Button onClick={onLogout} loading={isLoggingOut}>
          Sair
        </Button>
      </header>

      <main className="auth-main">
        <Card className="app-card" bordered={false}>
          {children ?? (
            <>
              <Title level={3}>Sessão autenticada</Title>
              <Paragraph type="secondary">
                Semana 1 concluída nesta etapa: login individual, perfil{' '}
                <strong>{perfilLabel(user.perfil)}</strong> e sessão segura ativa.
              </Paragraph>
              <Alert
                type="info"
                showIcon
                message="Próximo passo"
                description="Na Semana 2 entram categorias, fornecedores e contas a pagar."
              />
            </>
          )}
        </Card>
      </main>
    </div>
  );
}

export function AuthLoadingState() {
  return (
    <main className="app-shell">
      <Card className="app-card" bordered={false}>
        <div className="status-row">
          <Spin size="small" />
          <span>Verificando sessão…</span>
        </div>
      </Card>
    </main>
  );
}
