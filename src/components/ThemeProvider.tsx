import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      <ThemeSyncer>{children}</ThemeSyncer>
    </NextThemesProvider>
  );
};

// Component to sync theme with user preferences
const ThemeSyncer = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: preferences } = useQuery({
    queryKey: ['user-preferences', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('theme_preference')
        .eq('user_id', session.user.id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    if (preferences?.theme_preference) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      if (preferences.theme_preference === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(preferences.theme_preference);
      }
    }
  }, [preferences?.theme_preference]);

  return <>{children}</>;
};
