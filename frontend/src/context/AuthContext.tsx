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
  getModuleAuthToken,
  getModuleUserData,
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
  // Initialize state from local storage based on the current module
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const module = detectModuleFromPath();
    const token = getModuleAuthToken(module);
    console.log(`[AuthProvider] Initializing: module=${module}, hasToken=${!!token}`);
    return !!token;
  });

  const [user, setUser] = useState<User | null>(() => {
    const module = detectModuleFromPath();
    return getModuleUserData(module);
  });

  const [token, setToken] = useState<string | null>(() => {
    const module = detectModuleFromPath();
    const storedToken = getModuleAuthToken(module);
    if (storedToken) {
      setAuthToken(storedToken); // Ensure api config has the token
    }
    return storedToken;
  });

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
