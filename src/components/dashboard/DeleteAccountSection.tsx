import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

const DeleteAccountSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);
  const [transferPossible, setTransferPossible] = useState(false);
  const [subaccountAction, setSubaccountAction] = useState<"delete_all" | "transfer">("delete_all");

  const openDialog = async () => {
    setConfirmText("");
    setNeedsChoice(false);
    setTransferPossible(false);
    setSubaccountAction("delete_all");
    setShowDialog(true);

    if (!user) return;
    const { data: ownedMains } = await supabase
      .from("account_memberships")
      .select("main_account_id")
      .eq("user_id", user.id)
      .is("sub_account_id", null)
      .eq("role", "owner");
    const mainIds = (ownedMains || []).map((m) => m.main_account_id);
    if (mainIds.length === 0) return;

    const [{ count: subCount }, { count: otherCount }] = await Promise.all([
      supabase.from("sub_accounts").select("id", { count: "exact", head: true }).in("main_account_id", mainIds),
      supabase.from("account_memberships").select("id", { count: "exact", head: true }).in("main_account_id", mainIds).neq("user_id", user.id),
    ]);
    setNeedsChoice((subCount ?? 0) > 0 || (otherCount ?? 0) > 0);
    setTransferPossible((otherCount ?? 0) > 0);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { subaccount_action: subaccountAction },
      });

      if (error) throw error;
      if (data?.error === "last_admin") {
        toast.error(t("dashboard.settings.deleteAccount.lastAdminError"));
        return;
      }
      if (data?.error === "transfer_not_possible") {
        toast.error(t("dashboard.settings.deleteAccount.transferNotPossible"));
        return;
      }
      if (data?.error) throw new Error(data.error);

      const purgeDate = data?.purge_at
        ? format(new Date(data.purge_at), "dd MMM yyyy")
        : format(addDays(new Date(), 30), "dd MMM yyyy");
      toast.success(t("dashboard.settings.deleteAccount.scheduled", { date: purgeDate }));

      await signOut();
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Error deleting account");
    } finally {
      setIsDeleting(false);
      setShowDialog(false);
      setConfirmText("");
    }
  };

  return (
    <div className="bg-card rounded-xl border border-destructive/30 p-6 shadow-card">
      <h3 className="font-display font-bold text-destructive mb-2">
        {t("dashboard.settings.deleteAccount.title")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("dashboard.settings.deleteAccount.description")}
      </p>
      <Button variant="destructive" onClick={openDialog}>
        <Trash2 className="w-4 h-4 mr-2" />
        {t("dashboard.settings.deleteAccount.button")}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.settings.deleteAccount.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.settings.deleteAccount.confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {needsChoice && (
            <div className="py-2 space-y-3">
              <p className="text-sm font-medium text-foreground">
                {t("dashboard.settings.deleteAccount.subaccountTitle")}
              </p>
              <RadioGroup
                value={subaccountAction}
                onValueChange={(v) => setSubaccountAction(v as "delete_all" | "transfer")}
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="delete_all" id="del-all" className="mt-1" />
                  <Label htmlFor="del-all" className="text-sm font-normal text-muted-foreground">
                    {t("dashboard.settings.deleteAccount.subaccountChoiceDelete")}
                  </Label>
                </div>
                {transferPossible && (
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="transfer" id="transfer" className="mt-1" />
                    <Label htmlFor="transfer" className="text-sm font-normal text-muted-foreground">
                      {t("dashboard.settings.deleteAccount.subaccountChoiceTransfer")}
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-2">
              {t("dashboard.settings.deleteAccount.typeConfirm")}
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>
              {t("dashboard.settings.deleteAccount.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting
                ? t("dashboard.settings.deleteAccount.deleting")
                : t("dashboard.settings.deleteAccount.confirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountSection;
