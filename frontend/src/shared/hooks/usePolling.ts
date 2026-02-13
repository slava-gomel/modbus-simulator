import { useEffect, useRef } from "react";

/**
 * Универсальный хук для polling с автоматической очисткой
 * @param callback Функция для выполнения
 * @param interval Интервал в миллисекундах (null для отключения)
 * @param deps Зависимости для callback
 */
export const usePolling = (
  callback: () => void | Promise<void>,
  interval: number | null,
  deps: React.DependencyList = []
): void => {
  const savedCallback = useRef<() => void | Promise<void>>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    if (interval === null) return;

    const tick = () => {
      if (savedCallback.current) {
        void savedCallback.current();
      }
    };

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
};
