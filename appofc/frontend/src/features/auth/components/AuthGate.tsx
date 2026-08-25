import { LoginPage } from '../pages/LoginPage';
import { useAuth } from '../hooks/useAuth';
import { AuthLoadingState, AuthenticatedShell } from './AuthenticatedShell';

export function AuthGate() {
  const { user, status, logoutMutation } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingState />;
  }

  if (status === 'anonymous' || !user) {
    return <LoginPage />;
  }

  return (
    <AuthenticatedShell
      user={user}
      onLogout={() => logoutMutation.mutate()}
      isLoggingOut={logoutMutation.isPending}
    />
  );
}
