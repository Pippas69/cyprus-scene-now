import { Button } from "@/components/ui/button";

interface LanguageToggleProps {
  language: "el" | "en";
  onToggle: (lang: "el" | "en") => void;
}

const LanguageToggle = ({ language, onToggle }: LanguageToggleProps) => {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      <Button
        size="sm"
        variant={language === "el" ? "default" : "ghost"}
        onClick={() => onToggle("el")}
        className={language === "el" ? "bg-ocean text-primary-foreground" : ""}
      >
        🇬🇷 ΕΛ
      </Button>
      <Button
        size="sm"
        variant={language === "en" ? "default" : "ghost"}
        onClick={() => onToggle("en")}
        className={language === "en" ? "bg-ocean text-primary-foreground" : ""}
      >
        🇬🇧 EN
      </Button>
    </div>
  );
};

export default LanguageToggle;
