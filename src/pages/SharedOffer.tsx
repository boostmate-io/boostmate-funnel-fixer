import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OfferEditor from "@/components/offers/OfferEditor";
import logo from "@/assets/logo-boostmate.svg";

const SharedOffer = () => {
  const { token } = useParams<{ token: string }>();
  const [offerId, setOfferId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("offers")
        .select("id, status")
        .eq("share_token", token)
        .single();
      if (err || !data) setError(true);
      else setOfferId((data as any).id);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !offerId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={logo} alt="Boostmate" className="h-8" />
        <p className="text-muted-foreground">This offer link is invalid or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <OfferEditor offerId={offerId} onBack={() => window.history.back()} />
    </div>
  );
};

export default SharedOffer;
