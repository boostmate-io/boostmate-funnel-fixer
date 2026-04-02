import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

interface Profile {
  id: string;
  account_type: "personal" | "agency" | "client";
  display_name: string;
}

interface AgencyClient {
  id: string;
  agency_user_id: string;
  client_user_id: string;
  status: string;
  created_at: string;
  profile?: Profile;
}

interface AgencyInvite {
  id: string;
  agency_user_id: string;
  email: string;
  invite_code: string;
  status: string;
  created_at: string;
}

interface AgencyContextType {
  profile: Profile | null;
  isAgency: boolean;
  isClient: boolean;
  clients: AgencyClient[];
  invites: AgencyInvite[];
  impersonatedUserId: string | null;
  impersonatedName: string | null;
  effectiveUserId: string | null;
  startImpersonation: (clientUserId: string, clientName: string) => void;
  stopImpersonation: () => void;
  upgradeToAgency: () => Promise<void>;
  loadClients: () => Promise<void>;
  loadInvites: () => Promise<void>;
  createInvite: (email: string) => Promise<string | null>;
  loading: boolean;
}

const AgencyContext = createContext<AgencyContextType | null>(null);

export const useAgency = () => {
  const ctx = useContext(AgencyContext);
  if (!ctx) throw new Error("useAgency must be used within AgencyProvider");
  return ctx;
};

export const AgencyProvider = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useAuthReady();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [invites, setInvites] = useState<AgencyInvite[]>([]);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setProfile((data as unknown as Profile) || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isReady) {
      setLoading(true);
      return;
    }

    if (!user) {
      setProfile(null);
      setCurrentUserId(null);
      setClients([]);
      setInvites([]);
      setImpersonatedUserId(null);
      setImpersonatedName(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setCurrentUserId(user.id);
    setImpersonatedUserId(null);
    setImpersonatedName(null);
    void loadProfile(user.id);
  }, [isReady, user, loadProfile]);

  const isAgency = profile?.account_type === "agency";
  const isClient = profile?.account_type === "client";
  const effectiveUserId = impersonatedUserId || currentUserId;

  const loadClients = useCallback(async () => {
    if (!isAgency || !currentUserId) return;
    const { data } = await supabase
      .from("agency_clients")
      .select("*")
      .eq("agency_user_id", currentUserId);

    if (data && data.length > 0) {
      const clientIds = data.map((c: any) => c.client_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", clientIds);

      const enriched = data.map((c: any) => ({
        ...c,
        profile: (profiles || []).find((p: any) => p.id === c.client_user_id),
      }));
      setClients(enriched as AgencyClient[]);
    } else {
      setClients([]);
    }
  }, [isAgency, currentUserId]);

  const loadInvites = useCallback(async () => {
    if (!isAgency || !currentUserId) return;
    const { data } = await supabase
      .from("agency_invites")
      .select("*")
      .eq("agency_user_id", currentUserId)
      .order("created_at", { ascending: false });
    setInvites((data || []) as AgencyInvite[]);
  }, [isAgency, currentUserId]);

  useEffect(() => {
    if (isAgency) {
      void loadClients();
      void loadInvites();
    }
  }, [isAgency, loadClients, loadInvites]);

  const startImpersonation = (clientUserId: string, clientName: string) => {
    setImpersonatedUserId(clientUserId);
    setImpersonatedName(clientName);
  };

  const stopImpersonation = () => {
    setImpersonatedUserId(null);
    setImpersonatedName(null);
  };

  const upgradeToAgency = useCallback(async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ account_type: "agency" } as any)
      .eq("id", currentUserId);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, account_type: "agency" } : prev);
      await supabase
        .from("agency_clients")
        .insert({ agency_user_id: currentUserId, client_user_id: currentUserId } as any);
    }
  }, [currentUserId]);

  const createInvite = useCallback(async (email: string): Promise<string | null> => {
    if (!currentUserId) return null;
    const { data, error } = await supabase
      .from("agency_invites")
      .insert({ agency_user_id: currentUserId, email } as any)
      .select()
      .single();
    if (error || !data) return null;
    await loadInvites();
    return (data as any).invite_code;
  }, [currentUserId, loadInvites]);

  return (
    <AgencyContext.Provider value={{
      profile, isAgency, isClient, clients, invites,
      impersonatedUserId, impersonatedName, effectiveUserId,
      startImpersonation, stopImpersonation,
      upgradeToAgency, loadClients, loadInvites, createInvite, loading,
    }}>
      {children}
    </AgencyContext.Provider>
  );
};
