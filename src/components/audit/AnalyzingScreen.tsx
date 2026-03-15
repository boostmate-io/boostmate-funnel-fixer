import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

const messageKeys = [
  "analyzing.messages.landing",
  "analyzing.messages.leaks",
  "analyzing.messages.strategy",
  "analyzing.messages.report",
];

const AnalyzingScreen = () => {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messageKeys.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center animate-pulse-glow mb-8">
        <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
      </div>
      <h2 className="text-2xl font-display font-bold text-foreground mb-3">
        {t("analyzing.title")}
      </h2>
      <p className="text-muted-foreground text-lg animate-fade-in" key={msgIndex}>
        {t(messageKeys[msgIndex])}
      </p>
    </div>
  );
};

export default AnalyzingScreen;
