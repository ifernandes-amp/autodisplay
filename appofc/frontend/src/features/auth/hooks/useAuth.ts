import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api-client';
import { clearCsrfToken } from '../../../lib/csrf-token';
import { fetchCsrfToken, fetchMe, login, logout } from '../api/auth-api';
import type { LoginPayload } from '../types/auth';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      await fetchCsrfToken();
      return login(payload);
    },
    onSuccess: async (user) => {
      await fetchCsrfToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearCsrfToken();
      queryClient.removeQueries({ queryKey: ['auth'] });
    },
  });

  const status =
    meQuery.isLoading || loginMutation.isPending
      ? 'loading'
      : meQuery.isSuccess
        ? 'authenticated'
        : 'anonymous';

  const authError = loginMutation.error instanceof ApiError ? loginMutation.error : null;

  return {
    user: meQuery.data,
    status,
    meQuery,
    loginMutation,
    logoutMutation,
    authError,
    isForbidden: meQuery.error instanceof ApiError && meQuery.error.statusCode === 403,
  };
}
