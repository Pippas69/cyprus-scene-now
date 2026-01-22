import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <>
      {/* Mobile Design - with flags */}
      <div className="flex sm:hidden gap-0 bg-muted rounded-full p-0.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLanguage("el")}
          className={`h-8 px-3 text-xs font-semibold rounded-full transition-all ${
            language === "el" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-transparent text-muted-foreground hover:bg-transparent"
          }`}
        >
          🇬🇷 ΕΛ
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLanguage("en")}
          className={`h-8 px-3 text-xs font-semibold rounded-full transition-all ${
            language === "en" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-transparent text-muted-foreground hover:bg-transparent"
          }`}
        >
          🇬🇧 EN
        </Button>
      </div>

      {/* Desktop/Tablet Design - without flags */}
      <div className="hidden sm:flex gap-1 bg-muted rounded-lg p-1">
        <Button
          size="sm"
          variant={language === "el" ? "default" : "ghost"}
          onClick={() => setLanguage("el")}
          className={`h-7 px-2 text-xs ${language === "el" ? "bg-primary text-primary-foreground" : ""}`}
        >
          ΕΛ
        </Button>
        <Button
          size="sm"
          variant={language === "en" ? "default" : "ghost"}
          onClick={() => setLanguage("en")}
          className={`h-7 px-2 text-xs ${language === "en" ? "bg-primary text-primary-foreground" : ""}`}
        >
          EN
        </Button>
      </div>
    </>
  );
};

export default LanguageToggle;
