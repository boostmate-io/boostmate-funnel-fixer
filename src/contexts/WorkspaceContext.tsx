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

  const fetchSubAccountsForMain = useCallback(async (
    mainId: string,
    mems: Membership[],
    adminStatus: boolean,
    ownMainId: string | null
  ): Promise<SubAccount[]> => {
    const isOwnAccount = ownMainId === mainId;
    const isOwner = mems.some((m) => m.main_account_id === mainId && m.role === "owner" && !m.sub_account_id);

    if (adminStatus || (isOwner && isOwnAccount)) {
      const { data } = await supabase
        .from("sub_accounts")
        .select("*")
        .eq("main_account_id", mainId)
        .order("created_at", { ascending: true });

      return (data || []) as SubAccount[];
    }

    const subAccountIds = mems
      .filter((m) => m.main_account_id === mainId && m.sub_account_id)
      .map((m) => m.sub_account_id!);

    if (subAccountIds.length === 0) {
      return [];
    }

    const { data } = await supabase
      .from("sub_accounts")
      .select("*")
      .in("id", subAccountIds)
      .order("created_at", { ascending: true });

    return (data || []) as SubAccount[];
  }, []);

  const applySubAccountSelection = useCallback((nextSubAccounts: SubAccount[]) => {
    setSubAccounts(nextSubAccounts);

    if (nextSubAccounts.length === 0) {
      setActiveSubAccountId(null);
      localStorage.removeItem("activeSubAccountId");
      return;
    }

    const storedSubId = localStorage.getItem("activeSubAccountId");
    const matchedSub = nextSubAccounts.find((sub) => sub.id === storedSubId);
    const nextSub = matchedSub || nextSubAccounts.find((sub) => sub.is_default) || nextSubAccounts[0];

    setActiveSubAccountId(nextSub.id);
    localStorage.setItem("activeSubAccountId", nextSub.id);
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
      }, 2500);

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

      const ownerMembership = mems.find((m) => m.role === "owner" && !m.sub_account_id) || null;
      // For invited users: find any main account they have membership to
      const anyMainMembership = mems.find((m) => m.main_account_id) || null;
      
      if (!ownerMembership && !anyMainMembership && !adminStatus) {
        setAllMainAccounts([]);
        setMainAccount(null);
        setSubAccounts([]);
        setActiveSubAccountId(null);
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      ownMainAccountIdRef.current = ownerMembership?.main_account_id ?? null;
      // The primary main account: owner's account, or for invited users, any account they belong to
      const primaryMainAccountId = ownerMembership?.main_account_id ?? anyMainMembership?.main_account_id ?? null;

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
        // For non-admin users, load all main accounts they have membership to
        const uniqueMainIds = [...new Set(mems.map(m => m.main_account_id))];
        if (uniqueMainIds.length > 0) {
          const { data: memberMains } = await supabase
            .from("main_accounts")
            .select("*")
            .in("id", uniqueMainIds)
            .order("name", { ascending: true });
          if (cancelled) return;
          availableMainAccounts = (memberMains || []) as MainAccount[];
        }
        setAllMainAccounts(availableMainAccounts);
      }

      const storedMainId = localStorage.getItem("activeMainAccountId");
      const preferredMainId = adminStatus
        ? (storedMainId && availableMainAccounts.some((account) => account.id === storedMainId)
            ? storedMainId
            : availableMainAccounts.find((account) => account.id === primaryMainAccountId)?.id || availableMainAccounts[0]?.id || null)
        : (storedMainId && availableMainAccounts.some((account) => account.id === storedMainId)
            ? storedMainId
            : primaryMainAccountId || availableMainAccounts[0]?.id || null);

      const candidateMainIds = Array.from(new Set([
        preferredMainId,
        ownerMembership?.main_account_id || null,
        ...availableMainAccounts.map((account) => account.id),
      ].filter(Boolean))) as string[];

      if (candidateMainIds.length === 0) {
        localStorage.removeItem("activeMainAccountId");
        localStorage.removeItem("activeSubAccountId");
        setMainAccount(null);
        setSubAccounts([]);
        setActiveSubAccountId(null);
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      let resolvedMain: MainAccount | null = null;
      let resolvedSubAccounts: SubAccount[] = [];

      for (const candidateMainId of candidateMainIds) {
        const { data: candidateMain } = await supabase
          .from("main_accounts")
          .select("*")
          .eq("id", candidateMainId)
          .maybeSingle();

        if (cancelled) return;
        if (!candidateMain) continue;

        const candidateSubs = await fetchSubAccountsForMain(
          candidateMainId,
          mems,
          adminStatus,
          ownerMembership?.main_account_id ?? null,
        );

        if (cancelled) return;

        if (!resolvedMain) {
          resolvedMain = candidateMain as MainAccount;
          resolvedSubAccounts = candidateSubs;
        }

        if (candidateSubs.length > 0) {
          resolvedMain = candidateMain as MainAccount;
          resolvedSubAccounts = candidateSubs;
          break;
        }
      }

      if (!resolvedMain) {
        localStorage.removeItem("activeMainAccountId");
        localStorage.removeItem("activeSubAccountId");
        setMainAccount(null);
        setSubAccounts([]);
        setActiveSubAccountId(null);
        setLoading(false);
        loadedForUserRef.current = userId;
        return;
      }

      localStorage.setItem("activeMainAccountId", resolvedMain.id);
      setMainAccount(resolvedMain);
      applySubAccountSelection(resolvedSubAccounts);

      loadedForUserRef.current = userId;
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, isReady, reloadVersion, fetchSubAccountsForMain, applySubAccountSelection]);

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

    const nextSubAccounts = await fetchSubAccountsForMain(
      mainAccountId,
      memberships,
      isAppAdmin,
      ownMainAccountIdRef.current,
    );

    if (nextSubAccounts.length === 0) {
      await refreshWorkspace();
      return;
    }

    setMainAccount(mainData as MainAccount);
    applySubAccountSelection(nextSubAccounts);
  }, [refreshWorkspace, fetchSubAccountsForMain, memberships, isAppAdmin, applySubAccountSelection]);

  // Only show agency features if the user is an owner/admin of the main account (not just a workspace member)
  const isAgencyOwner = mainAccount?.type === "agency" && memberships.some(
    (m) => m.main_account_id === mainAccount.id && !m.sub_account_id && ["owner", "admin"].includes(m.role)
  );
  const isAgency = isAgencyOwner || false;
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