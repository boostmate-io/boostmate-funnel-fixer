import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const DeleteAccountSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.auth.signOut();
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
      <Button variant="destructive" onClick={() => setShowDialog(true)}>
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
