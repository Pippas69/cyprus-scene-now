// Shared helpers for fetching the "real" email of a user.
// Many flows rely on profiles.email, but some accounts may not have it populated.
// This helper falls back to the authentication user record (service role required).

// deno-lint-ignore-file no-explicit-any

export async function getEmailForUserId(
  supabaseAdmin: any,
  userId: string
): Promise<string | null> {
  if (!userId) return null;

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    const profileEmail = (profile as any)?.email as string | undefined;
    if (profileEmail && profileEmail.includes("@")) return profileEmail;
  } catch {
    // ignore and fallback
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) return null;
    const authEmail = (data as any)?.user?.email as string | undefined;
    if (authEmail && authEmail.includes("@")) return authEmail;
  } catch {
    // ignore
  }

  return null;
}
