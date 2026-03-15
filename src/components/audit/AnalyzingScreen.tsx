import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const messages = [
  "Landingspagina analyseren...",
  "Conversie lekken identificeren...",
  "Funnel strategie evalueren...",
  "Rapport genereren...",
];

const AnalyzingScreen = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center animate-pulse-glow mb-8">
        <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
      </div>
      <h2 className="text-2xl font-display font-bold text-foreground mb-3">
        Bezig met analyseren
      </h2>
      <p className="text-muted-foreground text-lg animate-fade-in" key={msgIndex}>
        {messages[msgIndex]}
      </p>
    </div>
  );
};

export default AnalyzingScreen;
