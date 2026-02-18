import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="fomo-theme">
      <ThemeSyncer>{children}</ThemeSyncer>
    </NextThemesProvider>
  );
};

// Component to sync theme with user preferences
const ThemeSyncer = ({ children }: { children: React.ReactNode }) => {
  const { setTheme, theme } = useTheme();

  // Force dark mode always - never allow light mode
  useEffect(() => {
    if (theme !== 'dark') {
      setTheme('dark');
    }
  }, [theme, setTheme]);

  return <>{children}</>;
};
