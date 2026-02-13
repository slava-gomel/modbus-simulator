import { useState, useCallback } from "react";

export interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<T>;
}

/**
 * Универсальный хук для выполнения API вызовов с состоянием загрузки и ошибок
 */
export function useApiCall<T>(apiCall: () => Promise<T>): UseApiCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Произошла ошибка";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { data, loading, error, execute };
}
