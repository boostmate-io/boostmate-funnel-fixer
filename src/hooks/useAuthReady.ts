import { useAuth } from "@/contexts/AuthContext";

export function useAuthReady() {
  const { user, isReady } = useAuth();
  return { user, isReady };
}
