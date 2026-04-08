import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MainAccount {
  id: string;
  name: string;
  type: "standard" | "agency";
  created_at: string;
  updated_at: string;
}

interface SubAccount {
  id: string;
  main_account_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface Membership {
  id: string;
  user_id: string;
  main_account_id: string;
  sub_account_id: string | null;
  role: string;
}

interface WorkspaceContextType {
  mainAccount: MainAccount | null;
  subAccounts: SubAccount[];
  activeSubAccount: SubAccount | null;
  activeSubAccountId: string | null;
  switchSubAccount: (id: string) => void;
  memberships: Membership[];
  isAgency: boolean;
  isAppAdmin: boolean;
  effectiveUserId: string | null;
  loading: boolean;
  renameSubAccount: (id: string, name: string) => Promise<void>;
  createClientSubAccount: (name: string) => Promise<SubAccount | null>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [mainAccount, setMainAccount] = useState<MainAccount | null>(null);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeSubAccountId, setActiveSubAccountId] = useState<string | null>(() =>
    localStorage.getItem("activeSubAccountId")
  );
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setMainAccount(null);
      setSubAccounts([]);
      setMemberships([]);
      setActiveSubAccountId(null);
      setIsAppAdmin(false);
      setLoading(false);
      loadedForUserRef.current = null;
      localStorage.removeItem("activeSubAccountId");
      return;
    }

    if (loadedForUserRef.current === userId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Load memberships
      const { data: membershipData } = await supabase
        .from("account_memberships")
        .select("*")
        .eq("user_id", userId);
      if (cancelled) return;

      const mems = (membershipData || []) as Membership[];
      setMemberships(mems);

      // Find main account (owner membership without sub_account_id)
      const ownerMembership = mems.find((m) => m.role === "owner" && !m.sub_account_id);
      if (!ownerMembership) {
        // User might not have account yet (edge case during signup)
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      // Load main account
      const { data: mainData } = await supabase
        .from("main_accounts")
        .select("*")
        .eq("id", ownerMembership.main_account_id)
        .single();
      if (cancelled) return;
      setMainAccount(mainData as MainAccount | null);

      // Load all sub accounts this user has access to
      const subAccountIds = mems
        .filter((m) => m.sub_account_id)
        .map((m) => m.sub_account_id!);

      if (subAccountIds.length > 0) {
        const { data: subData } = await supabase
          .from("sub_accounts")
          .select("*")
          .in("id", subAccountIds)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        setSubAccounts((subData || []) as SubAccount[]);

        // Set active sub account
        const stored = localStorage.getItem("activeSubAccountId");
        const match = (subData || []).find((s: any) => s.id === stored);
        if (match) {
          setActiveSubAccountId(match.id);
        } else if (subData && subData.length > 0) {
          const defaultSub = subData.find((s: any) => s.is_default) || subData[0];
          setActiveSubAccountId(defaultSub.id);
          localStorage.setItem("activeSubAccountId", defaultSub.id);
        }
      }

      // Check admin role
      const { data: adminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setIsAppAdmin(!!adminData);

      loadedForUserRef.current = userId;
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (activeSubAccountId) localStorage.setItem("activeSubAccountId", activeSubAccountId);
  }, [activeSubAccountId]);

  const switchSubAccount = useCallback((id: string) => {
    setActiveSubAccountId(id);
    localStorage.setItem("activeSubAccountId", id);
  }, []);

  const isAgency = mainAccount?.type === "agency";
  const activeSubAccount = subAccounts.find((s) => s.id === activeSubAccountId) || null;

  const renameSubAccount = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("sub_accounts").update({ name }).eq("id", id);
    if (!error) {
      setSubAccounts((prev) => prev.map((s) => s.id === id ? { ...s, name } : s));
    }
  }, []);

  const createClientSubAccount = useCallback(async (name: string): Promise<SubAccount | null> => {
    if (!mainAccount) return null;
    const { data, error } = await supabase
      .from("sub_accounts")
      .insert({ main_account_id: mainAccount.id, name, is_default: false })
      .select()
      .single();
    if (error || !data) return null;
    const newSub = data as SubAccount;
    setSubAccounts((prev) => [...prev, newSub]);
    return newSub;
  }, [mainAccount]);

  return (
    <WorkspaceContext.Provider value={{
      mainAccount,
      subAccounts,
      activeSubAccount,
      activeSubAccountId,
      switchSubAccount,
      memberships,
      isAgency,
      isAppAdmin,
      effectiveUserId: userId,
      loading,
      renameSubAccount,
      createClientSubAccount,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
