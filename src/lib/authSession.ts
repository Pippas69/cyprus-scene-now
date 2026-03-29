import { supabase } from "@/integrations/supabase/client";

const AUTH_TOKEN_KEY_SUFFIX = "-auth-token";

export const clearAuthStorage = () => {
  if (typeof window === "undefined") return;

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith(AUTH_TOKEN_KEY_SUFFIX)) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith(AUTH_TOKEN_KEY_SUFFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Failed to clear auth storage", error);
  }
};

export const forceLocalSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("Supabase signOut returned an error", error.message);
    }
  } catch (error) {
    console.warn("Supabase signOut threw an exception", error);
  } finally {
    clearAuthStorage();
  }
};
