import { Alert, Card, Spin, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { fetchReadyStatus } from '../lib/api-client';

const { Title, Paragraph, Text } = Typography;

export function App() {
  const readinessQuery = useQuery({
    queryKey: ['ready'],
    queryFn: fetchReadyStatus,
    retry: 1,
  });

  return (
    <main className="app-shell">
      <Card className="app-card" bordered={false}>
        <Title level={2}>AutoDisplay Financeiro</Title>
        <Paragraph type="secondary">Em construção — Semana 1 / Etapa 01</Paragraph>

        <section aria-live="polite" aria-label="Status do ambiente">
          {readinessQuery.isLoading ? (
            <div className="status-row">
              <Spin size="small" />
              <Text>Verificando disponibilidade do ambiente…</Text>
            </div>
          ) : null}

          {readinessQuery.isSuccess ? (
            <Alert
              type="success"
              showIcon
              message="Ambiente pronto"
              description={`API e banco respondendo. Última verificação: ${new Date(readinessQuery.data.checkedAt).toLocaleString('pt-BR')}.`}
            />
          ) : null}

          {readinessQuery.isError ? (
            <Alert
              type="warning"
              showIcon
              message="Ambiente indisponível"
              description="A API ou o banco ainda não estão acessíveis. Em desenvolvimento, confirme se o backend e o Postgres local estão no ar."
            />
          ) : null}
        </section>
      </Card>
    </main>
  );
}
