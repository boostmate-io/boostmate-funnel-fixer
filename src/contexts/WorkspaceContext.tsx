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
  // Admin: all main accounts for switching
  allMainAccounts: MainAccount[];
  switchMainAccount: (mainAccountId: string) => Promise<void>;
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
  const [allMainAccounts, setAllMainAccounts] = useState<MainAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedForUserRef = useRef<string | null>(null);

  // Load user's own main account id for reference
  const ownMainAccountIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setMainAccount(null);
      setSubAccounts([]);
      setMemberships([]);
      setActiveSubAccountId(null);
      setIsAppAdmin(false);
      setAllMainAccounts([]);
      setLoading(false);
      loadedForUserRef.current = null;
      ownMainAccountIdRef.current = null;
      localStorage.removeItem("activeSubAccountId");
      localStorage.removeItem("activeMainAccountId");
      return;
    }

    if (loadedForUserRef.current === userId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Check admin role first
      const { data: adminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      const adminStatus = !!adminData;
      setIsAppAdmin(adminStatus);

      // Load memberships
      const { data: membershipData } = await supabase
        .from("account_memberships")
        .select("*")
        .eq("user_id", userId);
      if (cancelled) return;

      const mems = (membershipData || []) as Membership[];
      setMemberships(mems);

      // Find user's own main account
      const ownerMembership = mems.find((m) => m.role === "owner" && !m.sub_account_id);
      if (!ownerMembership) {
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      ownMainAccountIdRef.current = ownerMembership.main_account_id;

      // If admin, load ALL main accounts for the switcher
      if (adminStatus) {
        const { data: allMains } = await supabase
          .from("main_accounts")
          .select("*")
          .order("name", { ascending: true });
        if (cancelled) return;
        setAllMainAccounts((allMains || []) as MainAccount[]);
      }

      // Determine which main account to show
      const storedMainId = localStorage.getItem("activeMainAccountId");
      const targetMainId = (adminStatus && storedMainId) ? storedMainId : ownerMembership.main_account_id;

      // Load main account
      const { data: mainData } = await supabase
        .from("main_accounts")
        .select("*")
        .eq("id", targetMainId)
        .single();
      if (cancelled) return;
      setMainAccount(mainData as MainAccount | null);

      // Load sub accounts for the active main account
      await loadSubAccountsForMain(targetMainId, cancelled, mems, adminStatus, ownerMembership.main_account_id);

      loadedForUserRef.current = userId;
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  const loadSubAccountsForMain = async (
    mainId: string,
    cancelled: boolean,
    mems: Membership[],
    adminStatus: boolean,
    ownMainId: string
  ) => {
    const isOwnAccount = mainId === ownMainId;
    const isOwner = mems.some((m) => m.role === "owner" && !m.sub_account_id);

    let subData: any[] | null = null;

    if (adminStatus || (isOwner && isOwnAccount)) {
      // Admin or agency owner: load ALL sub accounts under this main account
      const { data } = await supabase
        .from("sub_accounts")
        .select("*")
        .eq("main_account_id", mainId)
        .order("created_at", { ascending: true });
      subData = data;
    } else {
      // Regular user: only load sub accounts they have membership for
      const subAccountIds = mems
        .filter((m) => m.sub_account_id)
        .map((m) => m.sub_account_id!);
      if (subAccountIds.length > 0) {
        const { data } = await supabase
          .from("sub_accounts")
          .select("*")
          .in("id", subAccountIds)
          .order("created_at", { ascending: true });
        subData = data;
      }
    }

    if (cancelled) return;

    if (subData && subData.length > 0) {
      setSubAccounts(subData as SubAccount[]);

      const stored = localStorage.getItem("activeSubAccountId");
      const match = subData.find((s: any) => s.id === stored);
      if (match) {
        setActiveSubAccountId(match.id);
      } else {
        const defaultSub = subData.find((s: any) => s.is_default) || subData[0];
        setActiveSubAccountId(defaultSub.id);
        localStorage.setItem("activeSubAccountId", defaultSub.id);
      }
    } else {
      setSubAccounts([]);
      setActiveSubAccountId(null);
    }
  };

  useEffect(() => {
    if (activeSubAccountId) localStorage.setItem("activeSubAccountId", activeSubAccountId);
  }, [activeSubAccountId]);

  const switchSubAccount = useCallback((id: string) => {
    setActiveSubAccountId(id);
    localStorage.setItem("activeSubAccountId", id);
  }, []);

  const switchMainAccount = useCallback(async (mainAccountId: string) => {
    localStorage.setItem("activeMainAccountId", mainAccountId);
    localStorage.removeItem("activeSubAccountId");

    // Load the new main account
    const { data: mainData } = await supabase
      .from("main_accounts")
      .select("*")
      .eq("id", mainAccountId)
      .single();
    setMainAccount(mainData as MainAccount | null);

    // Load sub accounts for it
    const { data: subData } = await supabase
      .from("sub_accounts")
      .select("*")
      .eq("main_account_id", mainAccountId)
      .order("created_at", { ascending: true });

    const subs = (subData || []) as SubAccount[];
    setSubAccounts(subs);

    if (subs.length > 0) {
      const defaultSub = subs.find((s) => s.is_default) || subs[0];
      setActiveSubAccountId(defaultSub.id);
      localStorage.setItem("activeSubAccountId", defaultSub.id);
    } else {
      setActiveSubAccountId(null);
    }
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
      allMainAccounts,
      switchMainAccount,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
