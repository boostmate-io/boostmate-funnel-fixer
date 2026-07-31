import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/dashboard/LanguageSwitcher";

const ProfileSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoadingProfile(false);
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .maybeSingle();
        if (!cancelled) {
          setFirstName((data as any)?.first_name || "");
          setLastName((data as any)?.last_name || "");
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName.trim(), last_name: lastName.trim() } as any)
      .eq("id", userId);
    if (error) toast.error("Failed to save");
    else toast.success("Profile updated");
    setSavingProfile(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-display font-bold text-foreground">Your Name</h3>
        <p className="text-sm text-muted-foreground">Update your first and last name.</p>
        {!loadingProfile && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Last name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-9 text-sm" />
            </div>
            <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-display font-bold text-foreground mb-2">{t("dashboard.settings.account")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.settings.email")}: {user?.email}
        </p>
      </div>

      <div className="border-t border-border pt-6">
        <LanguageSwitcher />
      </div>
    </div>
  );
};

export default ProfileSettings;
