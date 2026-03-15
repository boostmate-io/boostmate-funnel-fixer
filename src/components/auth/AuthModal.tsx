import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultEmail?: string;
}

const AuthModal = ({ open, onClose, onSuccess, defaultEmail = "" }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account aangemaakt! Check je e-mail om te bevestigen.");
        onSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Succesvol ingelogd!");
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-xl shadow-xl border border-border p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-display font-bold text-foreground mb-1">
          {mode === "signup" ? "Account aanmaken" : "Inloggen"}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {mode === "signup" ? "Bewaar je audit en krijg toegang tot alle tools." : "Log in op je Boostmate account."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
          <Input
            type="password"
            placeholder="Wachtwoord (min. 6 tekens)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11"
          />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Even geduld..." : mode === "signup" ? "Account aanmaken" : "Inloggen"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "signup" ? (
            <>Heb je al een account?{" "}
              <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
                Inloggen
              </button>
            </>
          ) : (
            <>Nog geen account?{" "}
              <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                Registreren
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
