import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { language } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const text = {
    el: {
      title: "404",
      subtitle: "Ουπς! Η σελίδα δεν βρέθηκε",
      description: "Η σελίδα που αναζητάτε δεν υπάρχει ή έχει μετακινηθεί.",
      returnHome: "Επιστροφή στην Αρχική",
    },
    en: {
      title: "404",
      subtitle: "Oops! Page not found",
      description: "The page you're looking for doesn't exist or has been moved.",
      returnHome: "Return to Home",
    },
  };

  const t = text[language];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-8xl font-bold text-primary font-cinzel">{t.title}</h1>
        <p className="mb-2 text-2xl font-semibold text-foreground">{t.subtitle}</p>
        <p className="mb-8 text-muted-foreground">{t.description}</p>
        <Button asChild variant="gradient" size="lg">
          <Link to="/">
            {t.returnHome}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;