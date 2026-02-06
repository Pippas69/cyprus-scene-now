// Shared Web Push encryption module for iOS/Safari PWA compatibility
// Implements ECDH + HKDF + AES-128-GCM + VAPID JWT (ES256)

import { createClient } from "npm:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const logStep = (step: string, details?: unknown) => {
  console.log(`[WEB-PUSH-CRYPTO] ${step}`, details ? JSON.stringify(details) : '');
};

// Base64 URL encoding/decoding utilities
export function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  // Clean the input - remove quotes, whitespace
  const cleaned = str.trim().replace(/^["']|["']$/g, '');
  const base64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// HKDF implementation for Web Push
async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const saltBuffer = salt.length > 0 ? salt.buffer : new Uint8Array(32).buffer;
  const key = await crypto.subtle.importKey(
    "raw",
    saltBuffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, ikm.buffer as ArrayBuffer)
  );
  
  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  
  const okm = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkKey, infoWithCounter.buffer as ArrayBuffer)
  );
  
  return okm.slice(0, length);
}

// Create info for HKDF
function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  
  // Format: "Content-Encoding: <type>\0" + "P-256\0" + length(65) + clientPublicKey + length(65) + serverPublicKey
  const info = new Uint8Array(
    18 + typeBytes.length + 1 + 5 + 1 + 2 + 65 + 2 + 65
  );
  
  let offset = 0;
  
  // "Content-Encoding: "
  const contentEncoding = encoder.encode("Content-Encoding: ");
  info.set(contentEncoding, offset);
  offset += contentEncoding.length;
  
  // type
  info.set(typeBytes, offset);
  offset += typeBytes.length;
  
  // null byte
  info[offset++] = 0;
  
  // "P-256"
  const p256 = encoder.encode("P-256");
  info.set(p256, offset);
  offset += p256.length;
  
  // null byte
  info[offset++] = 0;
  
  // client public key length (65 bytes for uncompressed P-256)
  info[offset++] = 0;
  info[offset++] = 65;
  
  // client public key
  info.set(clientPublicKey, offset);
  offset += 65;
  
  // server public key length
  info[offset++] = 0;
  info[offset++] = 65;
  
  // server public key
  info.set(serverPublicKey, offset);
  
  return info;
}

// Encrypt payload using Web Push encryption (aesgcm)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<{ encrypted: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  
  // Decode subscription keys
  const clientPublicKey = base64UrlDecode(p256dhKey);
  const authSecret = base64UrlDecode(authKey);
  
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Generate ephemeral key pair for ECDH
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  // Export server public key (65 bytes uncompressed)
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );
  
  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // Derive shared secret using ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      serverKeyPair.privateKey,
      256
    )
  );
  
  // Derive PRK using auth secret as salt
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await hkdf(sharedSecret, authSecret, authInfo, 32);
  
  // Create info strings for key and nonce derivation
  const keyInfo = createInfo("aesgcm", clientPublicKey, serverPublicKeyRaw);
  const nonceInfo = createInfo("nonce", clientPublicKey, serverPublicKeyRaw);
  
  // Derive content encryption key and nonce
  const cek = await hkdf(prk, salt, keyInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);
  
  // Create padding (2 bytes length + padding bytes) - aesgcm format
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);
  
  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  // Encrypt using AES-128-GCM
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce.buffer as ArrayBuffer, tagLength: 128 },
      aesKey,
      paddedPayload.buffer as ArrayBuffer
    )
  );
  
  return { encrypted, serverPublicKey: serverPublicKeyRaw, salt };
}

// Create VAPID JWT for authorization
async function createVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode keys (with cleaning)
  const privateKeyBytes = base64UrlDecode(privateKey);
  const publicKeyBytes = base64UrlDecode(publicKey);

  // Public key is 65 bytes: 0x04 + 32 bytes X + 32 bytes Y
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    d: base64UrlEncode(privateKeyBytes),
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Web Crypto returns signature in IEEE P1363 format (r || s, 64 bytes) which is what we need
  const signatureBytes = new Uint8Array(signatureBuffer);
  const signatureB64 = base64UrlEncode(signatureBytes);

  return `${unsignedToken}.${signatureB64}`;
}

// Subscription interface
interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

// Push notification payload
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Result of sending push to a single subscription
interface SinglePushResult {
  success: boolean;
  endpoint: string;
  error?: string;
}

// Send encrypted push to a single subscription
async function sendToSubscription(
  sub: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  supabase: SupabaseClient
): Promise<SinglePushResult> {
  try {
    const audience = new URL(sub.endpoint).origin;

    if (!sub.p256dh_key || !sub.auth_key) {
      return { 
        success: false, 
        endpoint: sub.endpoint, 
        error: "Subscription missing encryption keys" 
      };
    }

    // Create VAPID JWT
    const jwt = await createVapidJwt(
      audience,
      "mailto:notifications@fomo.com.cy",
      vapidPublicKey,
      vapidPrivateKey
    );

    // Encrypt the payload
    const { encrypted, serverPublicKey, salt } = await encryptPayload(
      payload,
      sub.p256dh_key,
      sub.auth_key
    );

    // Send the push notification with encrypted payload
    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "TTL": "86400",
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aesgcm",
        "Crypto-Key": `dh=${base64UrlEncode(serverPublicKey)}; p256ecdsa=${vapidPublicKey}`,
        "Encryption": `salt=${base64UrlEncode(salt)}`,
        "Urgency": "normal",
      },
      body: encrypted.buffer as ArrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // If subscription is expired/invalid, remove it
      if (response.status === 404 || response.status === 410) {
        logStep("Removing invalid subscription", { endpoint: sub.endpoint.substring(0, 50) });
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
      
      return { 
        success: false, 
        endpoint: sub.endpoint, 
        error: `${response.status} - ${errorText}` 
      };
    }

    return { success: true, endpoint: sub.endpoint };
  } catch (error) {
    return { 
      success: false, 
      endpoint: sub.endpoint, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Main function: Send encrypted push notification to a user
export async function sendEncryptedPush(
  userId: string,
  payload: PushPayload,
  supabase?: SupabaseClient
): Promise<{ sent: number; failed: number }> {
  // Create Supabase client if not provided
  const client = supabase || createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Global dedupe by payload.tag across ALL callers/functions.
  // Race-safe: we "reserve" the tag in notification_log using the unique index.
  // If another invocation already reserved it, we skip.
  let reservedPushTagKey: string | null = null;
  if (payload.tag) {
    reservedPushTagKey = `push_tag:${userId}:${payload.tag}`;

    // IMPORTANT:
    // - notification_log.reference_id is a UUID column in our schema.
    // - payload.tag is an arbitrary string (e.g. "n:offer_redeemed:...") and must NOT be written there.
    // We store the tag only inside notification_type (the unique key) and keep reference_id null.
    const { error } = await client.from("notification_log").insert({
      user_id: userId,
      notification_type: reservedPushTagKey,
      reference_type: "push_tag",
      reference_id: null,
      // Reserve first; set after successful delivery.
      sent_at: null,
    });

    if (error) {
      if (error.code === "23505" || /duplicate key/i.test(error.message)) {
        logStep("Skipping duplicate push by tag (reserved)", { userId, tag: payload.tag });
        return { sent: 0, failed: 0 };
      }

      // Non-fatal: if the log table is unavailable, we still attempt delivery.
      logStep("Push tag reserve failed (non-fatal)", {
        userId,
        tag: payload.tag,
        error: error.message,
      });
      reservedPushTagKey = null;
    }
  }

  // Get user's push subscriptions
  const { data: subscriptions, error: subError } = await client
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (subError) {
    logStep("Error fetching subscriptions", { error: subError.message });
    return { sent: 0, failed: 0 };
  }

  if (!subscriptions || subscriptions.length === 0) {
    logStep("No push subscriptions found", { userId });
    return { sent: 0, failed: 0 };
  }

  // Dedupe subscriptions by endpoint to prevent double notifications when the same
  // device/browser is subscribed multiple times.
  const byEndpoint = new Map<string, PushSubscription>();
  const duplicates: PushSubscription[] = [];

  for (const sub of subscriptions as PushSubscription[]) {
    if (!sub?.endpoint) continue;
    if (byEndpoint.has(sub.endpoint)) {
      duplicates.push(sub);
      continue;
    }
    byEndpoint.set(sub.endpoint, sub);
  }

  // Best-effort cleanup of true duplicates (do NOT block sending)
  if (duplicates.length > 0) {
    try {
      await client
        .from("push_subscriptions")
        .delete()
        .in(
          "id",
          duplicates
            .map((d) => d.id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        );
      logStep("Removed duplicate subscriptions", { userId, removed: duplicates.length });
    } catch (e) {
      logStep("Failed to remove duplicate subscriptions (non-fatal)", {
        userId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const uniqueSubscriptions = Array.from(byEndpoint.values());

  // Get and clean VAPID keys
  const vapidPublicKey = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim().replace(/^['"]|['"]$/g, '');
  const vapidPrivateKey = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim().replace(/^['"]|['"]$/g, '');

  if (!vapidPublicKey || !vapidPrivateKey) {
    logStep("VAPID keys not configured");
    return { sent: 0, failed: uniqueSubscriptions.length };
  }

  // Build notification payload
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/fomo-logo-new.png",
    badge: payload.badge || "/fomo-logo-new.png",
    tag: payload.tag,
    data: payload.data || {},
  });

  // Send to all subscriptions in parallel
  const results = await Promise.allSettled(
    uniqueSubscriptions.map((sub: PushSubscription) =>
      sendToSubscription(sub, notificationPayload, vapidPublicKey, vapidPrivateKey, client)
    )
  );

  let sent = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
      if (result.status === "fulfilled") {
        logStep("Push failed", { 
          endpoint: result.value.endpoint?.substring(0, 50), 
          error: result.value.error 
        });
      }
    }
  }

  // Finalize reservation row for tag-dedupe.
  if (reservedPushTagKey) {
    try {
      if (sent > 0) {
        await client
          .from("notification_log")
          .update({ sent_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("notification_type", reservedPushTagKey);
      } else {
        // If we didn't deliver to any endpoint, remove the reservation so a retry can happen.
        await client
          .from("notification_log")
          .delete()
          .eq("user_id", userId)
          .eq("notification_type", reservedPushTagKey)
          .is("sent_at", null);
      }
    } catch (e) {
      logStep("Failed to finalize push tag reservation (non-fatal)", {
        userId,
        tag: payload.tag,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  logStep("Push notifications sent", { userId, sent, failed });
  return { sent, failed };
}

// Helper: Check if user has push enabled in preferences
// ROBUST: If user has active subscriptions but pref is false, treat as enabled (and self-heal)
export async function isUserPushEnabled(
  userId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Check preferences
  const { data: prefs } = await client
    .from("user_preferences")
    .select("notification_push_enabled")
    .eq("user_id", userId)
    .single();

  const prefEnabled = prefs?.notification_push_enabled;

  // If explicitly enabled, great
  if (prefEnabled === true) {
    return true;
  }

  // If explicitly disabled (false), respect that
  if (prefEnabled === false) {
    // But check if they have active subscriptions - if so, there's a mismatch
    const { data: subs } = await client
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (subs && subs.length > 0) {
      // Self-heal: they have subscriptions but pref is false - fix it
      logStep("Self-healing: user has subscriptions but pref was false, enabling", { userId });
      await client
        .from("user_preferences")
        .upsert({
          user_id: userId,
          notification_push_enabled: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      return true;
    }
    return false;
  }

  // If no preference set (null/undefined), default to enabled
  return true;
}

// Convenience function: Send push if user has it enabled
export async function sendPushIfEnabled(
  userId: string,
  payload: PushPayload,
  supabase?: SupabaseClient
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const client = supabase || createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const enabled = await isUserPushEnabled(userId, client);
  
  if (!enabled) {
    logStep("Push disabled for user", { userId });
    return { sent: 0, failed: 0, skipped: true };
  }

  const result = await sendEncryptedPush(userId, payload, client);
  return { ...result, skipped: false };
}
