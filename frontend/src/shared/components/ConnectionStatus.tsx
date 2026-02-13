import React from "react";
import { useWebSocketContext } from "../../features/websocket";

export const ConnectionStatus: React.FC = () => {
  const { connectionStatus } = useWebSocketContext();

  // Проверяем, есть ли проблемы с соединениями
  const issues = Object.entries(connectionStatus).filter(
    ([_, status]) => status !== "connected"
  );

  if (issues.length === 0) {
    return null; // Всё подключено, ничего не показываем
  }

  // Определяем общий статус
  const hasError = issues.some(([_, status]) => status === "error");
  const isConnecting = issues.some(([_, status]) => status === "connecting");
  const isDisconnected = issues.some(([_, status]) => status === "disconnected");

  let message = "";
  let bgColor = "";

  if (hasError) {
    message = "Ошибка WebSocket соединения";
    bgColor = "#dc2626"; // red-600
  } else if (isDisconnected) {
    message = "Переподключение к серверу...";
    bgColor = "#ea580c"; // orange-600
  } else if (isConnecting) {
    message = "Подключение к серверу...";
    bgColor = "#2563eb"; // blue-600
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: bgColor,
        color: "white",
        padding: "8px 16px",
        textAlign: "center",
        fontSize: "14px",
        fontWeight: 500,
        zIndex: 9999,
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      {message}
      {issues.length > 1 && (
        <span style={{ marginLeft: "8px", opacity: 0.8 }}>
          ({issues.map(([channel]) => channel).join(", ")})
        </span>
      )}
    </div>
  );
};
