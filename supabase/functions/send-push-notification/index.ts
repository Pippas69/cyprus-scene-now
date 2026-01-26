import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-PUSH-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

// Base64 URL encoding/decoding utilities
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
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
  
  logStep("Subscription keys decoded", {
    clientPublicKeyLength: clientPublicKey.length,
    authSecretLength: authSecret.length
  });
  
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
  
  logStep("ECDH shared secret derived", { length: sharedSecret.length });
  
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
  
  logStep("Payload encrypted", { encryptedLength: encrypted.length });
  
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

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, title, body, icon, data }: PushNotificationRequest = await req.json();
    logStep("Request data", { userId, title });

    if (!userId || !title || !body) {
      throw new Error("Missing required fields: userId, title, body");
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      logStep("No push subscriptions found for user");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No subscriptions found",
        sent: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found subscriptions", { count: subscriptions.length });

    // Get and clean VAPID keys
    const vapidPublicKey = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim().replace(/^["']|["']$/g, '');
    const vapidPrivateKey = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim().replace(/^["']|["']$/g, '');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    logStep("VAPID keys loaded", { 
      publicKeyLength: vapidPublicKey.length,
      privateKeyLength: vapidPrivateKey.length 
    });

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || "/fomo-logo-new.png",
      badge: "/fomo-logo-new.png",
      data: {
        url: data?.url || "/dashboard-business/ticket-sales",
        ...data,
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const audience = new URL(sub.endpoint).origin;
          
          logStep("Sending to subscription", { 
            endpoint: sub.endpoint.substring(0, 60) + '...',
            audience,
            hasP256dh: !!sub.p256dh_key,
            hasAuth: !!sub.auth_key
          });

          if (!sub.p256dh_key || !sub.auth_key) {
            throw new Error("Subscription missing encryption keys (p256dh_key or auth_key)");
          }

          // Create VAPID JWT
          const jwt = await createVapidJwt(
            audience,
            "mailto:notifications@fomo.cy",
            vapidPublicKey,
            vapidPrivateKey
          );

          // Encrypt the payload
          const { encrypted, serverPublicKey, salt } = await encryptPayload(
            notificationPayload,
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
              await supabaseClient
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            }
            
            throw new Error(`Push failed: ${response.status} - ${errorText}`);
          }

          logStep("Push sent successfully", { endpoint: sub.endpoint.substring(0, 50) });
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          logStep("Push error for subscription", { 
            endpoint: sub.endpoint.substring(0, 50), 
            error: error instanceof Error ? error.message : String(error)
          });
          return { success: false, endpoint: sub.endpoint, error };
        }
      })
    );

    const successful = results.filter(r => r.status === "fulfilled" && (r.value as { success: boolean }).success).length;
    const failed = results.length - successful;

    logStep("Push notifications sent", { successful, failed });

    return new Response(JSON.stringify({ 
      success: true,
      sent: successful,
      failed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
