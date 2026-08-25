import { Alert, Button, Card, Form, Input, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { fetchCsrfToken } from '../api/auth-api';
import { useAuth } from '../hooks/useAuth';

const { Title, Paragraph } = Typography;

interface LoginFormValues {
  email: string;
  senha: string;
}

function perfilLabel(perfil: string): string {
  return perfil === 'EXECUTIVO' ? 'Executivo' : 'Lançamento';
}

export function LoginPage() {
  const { loginMutation, authError } = useAuth();
  const [form] = Form.useForm<LoginFormValues>();
  const [csrfReady, setCsrfReady] = useState(false);
  const [csrfError, setCsrfError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchCsrfToken()
      .then(() => {
        if (active) {
          setCsrfReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setCsrfError('Não foi possível preparar a sessão de login.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (values: LoginFormValues): Promise<void> => {
    await loginMutation.mutateAsync(values);
  };

  const errorMessage =
    authError?.statusCode === 429
      ? 'Muitas tentativas. Aguarde um momento e tente novamente.'
      : authError?.statusCode === 401
        ? 'E-mail ou senha inválidos.'
        : authError?.message;

  return (
    <main className="login-shell">
      <Card className="app-card login-card" bordered={false}>
        <Title level={2}>AutoDisplay Financeiro</Title>
        <Paragraph type="secondary">Entre com sua conta individual</Paragraph>

        {csrfError ? (
          <Alert type="error" showIcon message={csrfError} className="login-alert" />
        ) : null}

        {!csrfReady && !csrfError ? (
          <div className="status-row">
            <Spin size="small" />
            <span>Preparando login…</span>
          </div>
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="on"
          disabled={!csrfReady || loginMutation.isPending}
          requiredMark={false}
        >
          <Form.Item
            label="E-mail"
            name="email"
            rules={[
              { required: true, message: 'Informe o e-mail.' },
              { type: 'email', message: 'E-mail inválido.' },
            ]}
          >
            <Input autoComplete="username" inputMode="email" type="email" size="large" />
          </Form.Item>

          <Form.Item
            label="Senha"
            name="senha"
            rules={[{ required: true, message: 'Informe a senha.' }]}
          >
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>

          {errorMessage ? (
            <Alert type="error" showIcon message={errorMessage} className="login-alert" />
          ) : null}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loginMutation.isPending}
            >
              Entrar
            </Button>
          </Form.Item>
        </Form>

        <Paragraph type="secondary" className="login-footnote">
          Perfis disponíveis: {perfilLabel('LANCAMENTO')} e {perfilLabel('EXECUTIVO')}.
        </Paragraph>
      </Card>
    </main>
  );
}
