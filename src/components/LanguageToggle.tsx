import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      <Button
        size="sm"
        variant={language === "el" ? "default" : "ghost"}
        onClick={() => setLanguage("el")}
        className={language === "el" ? "bg-primary text-primary-foreground" : ""}
      >
        🇬🇷 ΕΛ
      </Button>
      <Button
        size="sm"
        variant={language === "en" ? "default" : "ghost"}
        onClick={() => setLanguage("en")}
        className={language === "en" ? "bg-primary text-primary-foreground" : ""}
      >
        🇬🇧 EN
      </Button>
    </div>
  );
};

export default LanguageToggle;
