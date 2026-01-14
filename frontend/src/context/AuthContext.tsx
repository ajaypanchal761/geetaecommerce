import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import {
  setAuthToken,
} from "../services/api/config";
import {
  detectModuleFromPath,
  setModuleUserData,
  removeModuleAuthToken,
} from "../utils/moduleAuth";

interface User {
  id: string;
  userType?: "Admin" | "Seller" | "Customer" | "Delivery";
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Simple initialization - route guards handle actual auth checks
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (newToken: string, userData: User) => {
    const module = detectModuleFromPath();
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    setAuthToken(newToken);
    setModuleUserData(userData, module);
  };

  const logout = () => {
    const module = detectModuleFromPath();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    removeModuleAuthToken(module);
  };

  const updateUser = (userData: User) => {
    const module = detectModuleFromPath();
    setUser(userData);
    setModuleUserData(userData, module);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        updateUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
