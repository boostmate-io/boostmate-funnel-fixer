import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicSupabase } from "@/integrations/supabase/publicClient";

const RedirectSlug = () => {
  const { slug } = useParams<{ slug: string }>();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!slug) { setNotFound(true); return; }
      const { data, error } = await (publicSupabase as any).rpc("resolve_redirect", { _slug: slug });
      if (cancelled) return;
      const destination = typeof data === "string" ? data : null;
      if (error || !destination || !/^https?:\/\//i.test(destination)) {
        setNotFound(true);
        return;
      }
      window.location.replace(destination);
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);

  if (notFound) {
    return (
      <main className="flex flex-col items-center justify-center h-screen bg-background px-6 text-center">
        <h1 className="text-3xl font-display font-bold text-foreground">404</h1>
        <p className="text-muted-foreground mt-2">This link does not exist or has been removed.</p>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <span className="sr-only">Redirecting…</span>
    </main>
  );
};

export default RedirectSlug;
