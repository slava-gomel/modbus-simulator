import React, { useState } from "react";
import { useAuth } from "./AuthContext";

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    try {
      await login(loginUser, loginPass);
    } catch {
      setLoginError("Неверный логин или пароль");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-title">Modbus TCP Simulator</div>
        <div className="login-subtitle">Требуется авторизация для доступа к панели управления</div>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="field">
            <label className="field-label" htmlFor="login-user">
              Логин
            </label>
            <input
              id="login-user"
              className="field-input"
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              required
              autoComplete="username"
              placeholder="admin"
              disabled={isLoading}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="login-pass">
              Пароль
            </label>
            <input
              id="login-pass"
              className="field-input"
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
          {loginError && (
            <div className="error-text">
              <span className="error-dot" />
              {loginError}
            </div>
          )}
          <button type="submit" className="btn" disabled={isLoading}>
            <span data-dot="" />
            {isLoading ? "Вход..." : "Войти в панель"}
          </button>
        </form>
        <div className="login-footer">
          Доступ через Basic Auth. <strong>GUI_USER / GUI_PASSWORD</strong> задаются в окружении backend.
        </div>
      </div>
    </div>
  );
};

export default React.memo(LoginForm);
