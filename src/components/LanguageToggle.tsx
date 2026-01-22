import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex gap-0.5 sm:gap-1 bg-muted rounded-md sm:rounded-lg p-0.5 sm:p-1">
      <Button
        size="sm"
        variant={language === "el" ? "default" : "ghost"}
        onClick={() => setLanguage("el")}
        className={`h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs ${language === "el" ? "bg-primary text-primary-foreground" : ""}`}
      >
        <span className="hidden sm:inline">🇬🇷 </span>ΕΛ
      </Button>
      <Button
        size="sm"
        variant={language === "en" ? "default" : "ghost"}
        onClick={() => setLanguage("en")}
        className={`h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs ${language === "en" ? "bg-primary text-primary-foreground" : ""}`}
      >
        <span className="hidden sm:inline">🇬🇧 </span>EN
      </Button>
    </div>
  );
};

export default LanguageToggle;
