import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Eye, Link2, Mail, Plus, Users } from "lucide-react";

const ClientManagement = () => {
  const { t } = useTranslation();
  const { clients, invites, createInvite, startImpersonation, loadClients } = useAgency();
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    const code = await createInvite(inviteEmail.trim());
    if (code) {
      setLastInviteCode(code);
      setInviteEmail("");
      toast.success(t("agency.inviteSent"));
    } else {
      toast.error(t("agency.inviteError"));
    }
    setSending(false);
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    toast.success(t("agency.linkCopied"));
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6" />
          {t("agency.clientsTitle")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("agency.clientsDescription")}</p>
      </div>

      {/* Invite new client */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t("agency.inviteClient")}
          </CardTitle>
          <CardDescription>{t("agency.inviteDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder={t("agency.inviteEmailPlaceholder")}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={sending}>
              <Plus className="w-4 h-4 mr-1" />
              {t("agency.sendInvite")}
            </Button>
          </form>
          {lastInviteCode && (
            <div className="mt-3 p-3 bg-muted rounded-lg flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate mr-2">
                {window.location.origin}/invite/{lastInviteCode}
              </span>
              <Button variant="ghost" size="sm" onClick={() => copyInviteLink(lastInviteCode)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("agency.activeClients")}</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("agency.noClients")}</p>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => {
                const isSelf = client.agency_user_id === client.client_user_id;
                return (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${isSelf ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-border"}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {isSelf ? t("agency.myAccount") : (client.profile?.display_name || t("agency.unnamed"))}
                      </p>
                      {isSelf && <Badge variant="secondary" className="text-xs mt-1">{t("agency.owner")}</Badge>}
                      {!isSelf && <Badge variant="outline" className="text-xs mt-1">{client.status}</Badge>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        startImpersonation(
                          client.client_user_id,
                          isSelf ? t("agency.myAccount") : (client.profile?.display_name || t("agency.unnamed"))
                        )
                      }
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {t("agency.manage")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("agency.pendingInvites")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                >
                  <div>
                    <p className="text-sm text-foreground">{invite.email}</p>
                    <Badge
                      variant={invite.status === "accepted" ? "default" : "secondary"}
                      className="text-xs mt-1"
                    >
                      {invite.status}
                    </Badge>
                  </div>
                  {invite.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInviteLink(invite.invite_code)}
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      {t("agency.copyLink")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientManagement;
