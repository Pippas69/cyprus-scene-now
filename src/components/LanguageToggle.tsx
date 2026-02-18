import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <div className="flex gap-0 bg-muted rounded-full p-0.5">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setLanguage("el")}
        className={`h-6 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-full transition-all ${
          language === "el"
            ? "bg-gradient-ocean text-white shadow-sm"
            : "bg-transparent text-muted-foreground hover:bg-transparent"
        }`}
      >
        🇬🇷 ΕΛ
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setLanguage("en")}
        className={`h-6 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-full transition-all ${
          language === "en"
            ? "bg-gradient-ocean text-white shadow-sm"
            : "bg-transparent text-muted-foreground hover:bg-transparent"
        }`}
      >
        🇬🇧 EN
      </Button>
    </div>
  );
};

export default LanguageToggle;
