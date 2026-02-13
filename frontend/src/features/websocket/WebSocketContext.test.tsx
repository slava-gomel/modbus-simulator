import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { WebSocketProvider, useWebSocketContext } from "./WebSocketContext";
import React from "react";

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    
    // Автоматически вызываем onopen через небольшую задержку
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code: 1000 }));
    }
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

describe("WebSocketContext", () => {
  beforeEach(() => {
    // @ts-ignore
    global.WebSocket = MockWebSocket;
    MockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("should initialize with empty connection status", () => {
    const { result } = renderHook(() => useWebSocketContext(), {
      wrapper: ({ children }) => <WebSocketProvider>{children}</WebSocketProvider>,
    });

    expect(result.current.connectionStatus).toEqual({});
  });

  it("should connect when subscribing to a channel", async () => {
    const { result } = renderHook(() => useWebSocketContext(), {
      wrapper: ({ children }) => <WebSocketProvider>{children}</WebSocketProvider>,
    });

    const handler = vi.fn();
    result.current.subscribe("registers", handler);

    await waitFor(() => {
      expect(result.current.connectionStatus.registers).toBe("connected");
    });

    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain("/ws/registers");
  });

  it("should call handler when receiving message", async () => {
    const { result } = renderHook(() => useWebSocketContext(), {
      wrapper: ({ children }) => <WebSocketProvider>{children}</WebSocketProvider>,
    });

    const handler = vi.fn();
    result.current.subscribe("registers", handler);

    await waitFor(() => {
      expect(result.current.connectionStatus.registers).toBe("connected");
    });

    // Симулируем получение сообщения
    const ws = MockWebSocket.instances[0];
    const message = { event: "registers_changed", data: { kind: "holding", start: 0 } };
    
    if (ws.onmessage) {
      ws.onmessage(new MessageEvent("message", { data: JSON.stringify(message) }));
    }

    expect(handler).toHaveBeenCalledWith(message);
  });

  it("should disconnect when no more subscribers", async () => {
    const { result } = renderHook(() => useWebSocketContext(), {
      wrapper: ({ children }) => <WebSocketProvider>{children}</WebSocketProvider>,
    });

    const handler = vi.fn();
    result.current.subscribe("registers", handler);

    await waitFor(() => {
      expect(result.current.connectionStatus.registers).toBe("connected");
    });

    result.current.unsubscribe("registers", handler);

    await waitFor(() => {
      expect(MockWebSocket.instances[0].readyState).toBe(WebSocket.CLOSED);
    });
  });

  it("should handle reconnection after disconnect", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useWebSocketContext(), {
      wrapper: ({ children }) => <WebSocketProvider>{children}</WebSocketProvider>,
    });

    const handler = vi.fn();
    result.current.subscribe("registers", handler);

    await waitFor(() => {
      expect(result.current.connectionStatus.registers).toBe("connected");
    });

    // Симулируем разрыв соединения
    const ws = MockWebSocket.instances[0];
    ws.close();

    await waitFor(() => {
      expect(result.current.connectionStatus.registers).toBe("disconnected");
    });

    // Ждем первую попытку переподключения (1000ms)
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(2); // Новое соединение создано
    });

    vi.useRealTimers();
  });

  it("should support multiple channels", async () => {
    const { result } = renderHook(() => useWebSocketContext(), {
      wrapper: ({ children }) => <WebSocketProvider>{children}</WebSocketProvider>,
    });

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    result.current.subscribe("registers", handler1);
    result.current.subscribe("server", handler2);

    await waitFor(() => {
      expect(result.current.connectionStatus.registers).toBe("connected");
      expect(result.current.connectionStatus.server).toBe("connected");
    });

    expect(MockWebSocket.instances.length).toBe(2);
  });
});
