import React, { createContext, useState, useEffect, ReactNode } from "react";
import { authRequired, setAuth } from "../../api";

interface AuthContextValue {
  authRequiredState: boolean | null;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ 
  children: ReactNode;
  onAuthSuccess?: () => void;
}> = ({ children, onAuthSuccess }) => {
  const [authRequiredState, setAuthRequiredState] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { required } = await authRequired();
        setAuthRequiredState(required);
        if (!required) {
          setAuthenticated(true);
          onAuthSuccess?.();
        }
      } catch {
        setAuthRequiredState(false);
        setAuthenticated(true);
        onAuthSuccess?.();
      }
    };
    void init();
  }, [onAuthSuccess]);

  useEffect(() => {
    const onAuthRequired = () => setAuthenticated(false);
    window.addEventListener("auth:required", onAuthRequired);
    return () => window.removeEventListener("auth:required", onAuthRequired);
  }, []);

  const login = async (username: string, password: string) => {
    setAuth(username, password);
    setAuthenticated(true);
    onAuthSuccess?.();
  };

  const logout = () => {
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ authRequiredState, authenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
