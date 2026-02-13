import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type MessageHandler = (data: any) => void;

interface WebSocketContextValue {
  subscribe: (channel: string, handler: MessageHandler) => void;
  unsubscribe: (channel: string, handler: MessageHandler) => void;
  connectionStatus: Record<string, ConnectionStatus>;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

const WS_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff
const PING_INTERVAL = 10000; // 10 секунд
const MAX_RECONNECT_ATTEMPTS = 10; // Максимум 10 попыток переподключения
const DISCONNECT_DELAY_MS = 3000; // Не закрывать сокет сразу при unsubscribe — ждём 3s (избегаем "closed before established")

// Определяем базовый WebSocket URL
const getWebSocketURL = (channel: string): string => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws/${channel}`;
};

interface WebSocketManagerProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketManagerProps> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  
  // Хранилище подписчиков для каждого канала
  const subscribersRef = useRef<Record<string, Set<MessageHandler>>>({});
  
  // WebSocket соединения для каждого канала
  const websocketsRef = useRef<Record<string, WebSocket>>({});
  
  // Таймеры для reconnection
  const reconnectTimersRef = useRef<Record<string, number>>({});
  
  // Счетчики попыток переподключения
  const reconnectAttemptsRef = useRef<Record<string, number>>({});
  
  // Таймеры для ping
  const pingTimersRef = useRef<Record<string, number>>({});
  
  // Отложенное отключение: не закрывать сокет сразу при unsubscribe (React remount закрывает до открытия)
  const disconnectDelayRef = useRef<Record<string, number>>({});

  const updateStatus = (channel: string, status: ConnectionStatus) => {
    setConnectionStatus((prev) => ({ ...prev, [channel]: status }));
  };

  const startPingInterval = (channel: string) => {
    // Очистка предыдущего интервала
    if (pingTimersRef.current[channel]) {
      clearInterval(pingTimersRef.current[channel]);
    }

    pingTimersRef.current[channel] = setInterval(() => {
      const ws = websocketsRef.current[channel];
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send("ping");
        } catch (err) {
          console.error(`Failed to send ping to channel ${channel}:`, err);
        }
      }
    }, PING_INTERVAL);
  };

  const stopPingInterval = (channel: string) => {
    if (pingTimersRef.current[channel]) {
      clearInterval(pingTimersRef.current[channel]);
      delete pingTimersRef.current[channel];
    }
  };

  const connectWebSocket = (channel: string) => {
    const existing = websocketsRef.current[channel];
    if (existing) {
      if (existing.readyState === WebSocket.OPEN) return;
      if (existing.readyState === WebSocket.CONNECTING) return; // Не создавать второй сокет
      // CLOSING или CLOSED — удаляем ссылку, создадим новый ниже
      delete websocketsRef.current[channel];
    }

    // Отменить отложенное отключение, если подписчик появился снова
    if (disconnectDelayRef.current[channel]) {
      clearTimeout(disconnectDelayRef.current[channel]);
      delete disconnectDelayRef.current[channel];
    }

    updateStatus(channel, "connecting");
    
    const url = getWebSocketURL(channel);
    const ws = new WebSocket(url);
    websocketsRef.current[channel] = ws;

    ws.onopen = () => {
      console.log(`WebSocket connected to channel: ${channel}`);
      updateStatus(channel, "connected");
      reconnectAttemptsRef.current[channel] = 0;
      startPingInterval(channel);
    };

    ws.onmessage = (event) => {
      // Игнорируем pong ответы
      if (event.data === "pong") {
        return;
      }

      try {
        const message = JSON.parse(event.data);
        const handlers = subscribersRef.current[channel];
        
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(message);
            } catch (err) {
              console.error(`Error in WebSocket message handler for channel ${channel}:`, err);
            }
          });
        }
      } catch (err) {
        console.error(`Failed to parse WebSocket message from channel ${channel}:`, err);
      }
    };

    ws.onerror = (error) => {
      // Уменьшаем логирование - только count попыток
      const attempts = reconnectAttemptsRef.current[channel] || 0;
      if (attempts < 3) { // Логируем только первые 3 ошибки
        console.error(`WebSocket error on channel ${channel}:`, error);
      }
      updateStatus(channel, "error");
    };

    ws.onclose = (event) => {
      // Уменьшаем логирование
      const attempts = reconnectAttemptsRef.current[channel] || 0;
      if (attempts < 3) { // Логируем только первые 3 закрытия
        console.log(`WebSocket closed on channel ${channel}, code: ${event.code}, reason: ${event.reason || 'none'}`);
      }
      updateStatus(channel, "disconnected");
      stopPingInterval(channel);
      
      // Автоматическое переподключение только если не было явной команды закрыть
      if (event.code !== 1000) { // 1000 = normal closure
        scheduleReconnect(channel);
      }
    };
  };

  const scheduleReconnect = (channel: string) => {
    if (reconnectTimersRef.current[channel]) {
      clearTimeout(reconnectTimersRef.current[channel]);
    }

    const attempts = reconnectAttemptsRef.current[channel] || 0;
    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
      updateStatus(channel, "error");
      return;
    }
    const delayIndex = Math.min(attempts, WS_RECONNECT_DELAYS.length - 1);
    const delay = WS_RECONNECT_DELAYS[delayIndex];
    
    reconnectTimersRef.current[channel] = window.setTimeout(() => {
      reconnectAttemptsRef.current[channel] = attempts + 1;
      connectWebSocket(channel);
    }, delay);
  };

  const doDisconnectWebSocket = (channel: string) => {
    const ws = websocketsRef.current[channel];
    if (ws) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "No subscribers");
      }
      delete websocketsRef.current[channel];
    }
    stopPingInterval(channel);
    if (reconnectTimersRef.current[channel]) {
      clearTimeout(reconnectTimersRef.current[channel]);
      delete reconnectTimersRef.current[channel];
    }
    if (disconnectDelayRef.current[channel]) {
      clearTimeout(disconnectDelayRef.current[channel]);
      delete disconnectDelayRef.current[channel];
    }
    delete reconnectAttemptsRef.current[channel];
  };

  const disconnectWebSocket = (channel: string) => {
    doDisconnectWebSocket(channel);
  };

  const subscribe = useCallback((channel: string, handler: MessageHandler) => {
    if (!subscribersRef.current[channel]) {
      subscribersRef.current[channel] = new Set();
    }
    const isFirst = subscribersRef.current[channel].size === 0;
    subscribersRef.current[channel].add(handler);

    if (isFirst) {
      if (disconnectDelayRef.current[channel]) {
        clearTimeout(disconnectDelayRef.current[channel]);
        delete disconnectDelayRef.current[channel];
      }
      connectWebSocket(channel);
    }
  }, []);

  const unsubscribe = useCallback((channel: string, handler: MessageHandler) => {
    const handlers = subscribersRef.current[channel];
    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        delete subscribersRef.current[channel];
        // Не закрывать сокет сразу — иначе "closed before connection is established"
        // при быстром remount (React). Отложенное отключение через DISCONNECT_DELAY_MS.
        if (disconnectDelayRef.current[channel]) {
          clearTimeout(disconnectDelayRef.current[channel]);
        }
        disconnectDelayRef.current[channel] = window.setTimeout(() => {
          delete disconnectDelayRef.current[channel];
          doDisconnectWebSocket(channel);
        }, DISCONNECT_DELAY_MS);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.keys(disconnectDelayRef.current).forEach((ch) => {
        clearTimeout(disconnectDelayRef.current[ch]);
      });
      Object.keys(websocketsRef.current).forEach((channel) => {
        doDisconnectWebSocket(channel);
      });
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, connectionStatus }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return context;
};
