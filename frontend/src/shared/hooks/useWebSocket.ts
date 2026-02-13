import { useEffect, useRef, DependencyList } from "react";
import { useWebSocketContext } from "../../features/websocket";

/**
 * Хук для подписки на WebSocket события из указанного канала
 * @param channel Имя канала ('registers', 'server', 'generators')
 * @param onMessage Callback для обработки сообщений (event, data)
 * @param deps Зависимости для callback
 */
export const useWebSocket = (
  channel: string,
  onMessage: (event: string, data: any) => void,
  deps: DependencyList = []
) => {
  const { subscribe, unsubscribe, connectionStatus } = useWebSocketContext();
  const handlerRef = useRef<(message: any) => void>();

  // Обновляем ref при изменении callback без пересоздания подписки
  useEffect(() => {
    handlerRef.current = (message: any) => {
      if (message && message.event && message.data !== undefined) {
        onMessage(message.event, message.data);
      }
    };
  }, [onMessage]);

  useEffect(() => {
    // Стабильная функция-обёртка которая всегда вызывает актуальный callback
    const stableHandler = (message: any) => {
      handlerRef.current?.(message);
    };

    subscribe(channel, stableHandler);
    
    return () => {
      unsubscribe(channel, stableHandler);
    };
  }, [channel, subscribe, unsubscribe]); // Убрали deps из зависимостей

  return {
    status: connectionStatus[channel] || "disconnected",
  };
};
