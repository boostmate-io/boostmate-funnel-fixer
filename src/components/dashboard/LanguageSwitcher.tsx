import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("boostmate-lang", lang);
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-1">{t("dashboard.settings.language")}</h4>
      <p className="text-sm text-muted-foreground mb-3">{t("dashboard.settings.languageDescription")}</p>
      <div className="flex gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              i18n.language === lang.code
                ? "border-primary bg-sidebar-accent text-sidebar-accent-foreground"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
