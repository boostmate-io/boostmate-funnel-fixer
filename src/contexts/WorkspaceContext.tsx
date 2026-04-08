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
  renameMainAccount: (name: string) => Promise<boolean>;
  updateMainAccountType: (type: "standard" | "agency") => Promise<boolean>;
  createClientSubAccount: (name: string) => Promise<SubAccount | null>;
  allMainAccounts: MainAccount[];
  switchMainAccount: (mainAccountId: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useAuth();
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
  const [reloadVersion, setReloadVersion] = useState(0);
  const loadedForUserRef = useRef<string | null>(null);
  const pendingWorkspaceResetRef = useRef<number | null>(null);
  const ownMainAccountIdRef = useRef<string | null>(null);

  const clearPendingWorkspaceReset = () => {
    if (pendingWorkspaceResetRef.current) {
      window.clearTimeout(pendingWorkspaceResetRef.current);
      pendingWorkspaceResetRef.current = null;
    }
  };

  const resetWorkspaceState = () => {
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
  };

  const loadSubAccountsForMain = useCallback(async (
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
      const { data } = await supabase
        .from("sub_accounts")
        .select("*")
        .eq("main_account_id", mainId)
        .order("created_at", { ascending: true });
      subData = data;
    } else {
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

      const storedSubId = localStorage.getItem("activeSubAccountId");
      const matchedSub = subData.find((sub: any) => sub.id === storedSubId);
      const nextSub = matchedSub || subData.find((sub: any) => sub.is_default) || subData[0];

      setActiveSubAccountId(nextSub.id);
      localStorage.setItem("activeSubAccountId", nextSub.id);
    } else {
      setSubAccounts([]);
      setActiveSubAccountId(null);
      localStorage.removeItem("activeSubAccountId");
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      if (!isReady) return;

      clearPendingWorkspaceReset();

      if (!loadedForUserRef.current) {
        resetWorkspaceState();
        return;
      }

      pendingWorkspaceResetRef.current = window.setTimeout(() => {
        resetWorkspaceState();
      }, 1500);

      return () => {
        clearPendingWorkspaceReset();
      };
    }

    clearPendingWorkspaceReset();

    if (loadedForUserRef.current === userId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: adminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;

      const adminStatus = !!adminData;
      setIsAppAdmin(adminStatus);

      const { data: membershipData } = await supabase
        .from("account_memberships")
        .select("*")
        .eq("user_id", userId);
      if (cancelled) return;

      const mems = (membershipData || []) as Membership[];
      setMemberships(mems);

      const ownerMembership = mems.find((m) => m.role === "owner" && !m.sub_account_id);
      if (!ownerMembership) {
        setAllMainAccounts([]);
        setMainAccount(null);
        setSubAccounts([]);
        setActiveSubAccountId(null);
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      ownMainAccountIdRef.current = ownerMembership.main_account_id;

      let availableMainAccounts: MainAccount[] = [];
      if (adminStatus) {
        const { data: allMains } = await supabase
          .from("main_accounts")
          .select("*")
          .order("name", { ascending: true });
        if (cancelled) return;

        availableMainAccounts = (allMains || []) as MainAccount[];
        setAllMainAccounts(availableMainAccounts);
      } else {
        setAllMainAccounts([]);
      }

      const storedMainId = localStorage.getItem("activeMainAccountId");
      const targetMainId = adminStatus
        ? (storedMainId && availableMainAccounts.some((account) => account.id === storedMainId)
            ? storedMainId
            : availableMainAccounts.find((account) => account.id === ownerMembership.main_account_id)?.id || availableMainAccounts[0]?.id || null)
        : ownerMembership.main_account_id;

      if (!targetMainId) {
        localStorage.removeItem("activeMainAccountId");
        localStorage.removeItem("activeSubAccountId");
        setMainAccount(null);
        setSubAccounts([]);
        setActiveSubAccountId(null);
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      localStorage.setItem("activeMainAccountId", targetMainId);

      const { data: mainData } = await supabase
        .from("main_accounts")
        .select("*")
        .eq("id", targetMainId)
        .maybeSingle();
      if (cancelled) return;

      if (!mainData) {
        localStorage.removeItem("activeMainAccountId");
        localStorage.removeItem("activeSubAccountId");
        setMainAccount(null);
        setSubAccounts([]);
        setActiveSubAccountId(null);
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      setMainAccount(mainData as MainAccount);
      await loadSubAccountsForMain(targetMainId, cancelled, mems, adminStatus, ownerMembership.main_account_id);

      loadedForUserRef.current = userId;
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, isReady, reloadVersion, loadSubAccountsForMain]);

  useEffect(() => {
    return () => {
      clearPendingWorkspaceReset();
    };
  }, []);

  useEffect(() => {
    if (activeSubAccountId) {
      localStorage.setItem("activeSubAccountId", activeSubAccountId);
    }
  }, [activeSubAccountId]);

  const switchSubAccount = useCallback((id: string) => {
    setActiveSubAccountId(id);
    localStorage.setItem("activeSubAccountId", id);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    loadedForUserRef.current = null;
    setLoading(true);
    setReloadVersion((current) => current + 1);
  }, []);

  const switchMainAccount = useCallback(async (mainAccountId: string) => {
    localStorage.setItem("activeMainAccountId", mainAccountId);
    localStorage.removeItem("activeSubAccountId");

    const { data: mainData } = await supabase
      .from("main_accounts")
      .select("*")
      .eq("id", mainAccountId)
      .maybeSingle();

    if (!mainData) {
      await refreshWorkspace();
      return;
    }

    setMainAccount(mainData as MainAccount);

    const { data: subData } = await supabase
      .from("sub_accounts")
      .select("*")
      .eq("main_account_id", mainAccountId)
      .order("created_at", { ascending: true });

    const subs = (subData || []) as SubAccount[];
    setSubAccounts(subs);

    if (subs.length > 0) {
      const defaultSub = subs.find((sub) => sub.is_default) || subs[0];
      setActiveSubAccountId(defaultSub.id);
      localStorage.setItem("activeSubAccountId", defaultSub.id);
    } else {
      setActiveSubAccountId(null);
      localStorage.removeItem("activeSubAccountId");
    }
  }, [refreshWorkspace]);

  const isAgency = mainAccount?.type === "agency";
  const activeSubAccount = subAccounts.find((sub) => sub.id === activeSubAccountId) || null;

  const renameSubAccount = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("sub_accounts").update({ name }).eq("id", id);
    if (!error) {
      setSubAccounts((prev) => prev.map((sub) => sub.id === id ? { ...sub, name } : sub));
    }
  }, []);

  const renameMainAccount = useCallback(async (name: string) => {
    if (!mainAccount) return false;

    const trimmedName = name.trim();
    if (!trimmedName) return false;

    const { error } = await supabase
      .from("main_accounts")
      .update({ name: trimmedName })
      .eq("id", mainAccount.id);

    if (error) return false;

    setMainAccount((prev) => prev ? { ...prev, name: trimmedName } : prev);
    setAllMainAccounts((prev) => prev.map((account) => (
      account.id === mainAccount.id ? { ...account, name: trimmedName } : account
    )));

    return true;
  }, [mainAccount]);

  const updateMainAccountType = useCallback(async (type: "standard" | "agency") => {
    if (!mainAccount) return false;

    const { error } = await supabase
      .from("main_accounts")
      .update({ type })
      .eq("id", mainAccount.id);

    if (error) return false;

    setMainAccount((prev) => prev ? { ...prev, type } : prev);
    setAllMainAccounts((prev) => prev.map((account) => (
      account.id === mainAccount.id ? { ...account, type } : account
    )));

    return true;
  }, [mainAccount]);

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
      renameMainAccount,
      updateMainAccountType,
      createClientSubAccount,
      allMainAccounts,
      switchMainAccount,
      refreshWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};