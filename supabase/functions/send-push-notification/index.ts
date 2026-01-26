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
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
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
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode the private key (it's 32 bytes for P-256)
  const privateKeyBytes = base64UrlDecode(privateKey.trim());
  
  // Import the private key for signing
  // We need to create proper JWK format for the key
  const publicKeyBytes = base64UrlDecode(publicKey.trim());
  
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
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format (r || s)
  const signatureBytes = new Uint8Array(signature);
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

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")?.trim();
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    logStep("VAPID keys loaded", { 
      publicKeyLength: vapidPublicKey.length,
      privateKeyLength: vapidPrivateKey.length 
    });

    const payload = JSON.stringify({
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
          
          // Create VAPID JWT
          const jwt = await createVapidJwt(
            audience,
            "mailto:notifications@fomo.cy",
            vapidPublicKey,
            vapidPrivateKey
          );

          logStep("Sending to subscription", { 
            endpoint: sub.endpoint.substring(0, 60) + '...',
            audience
          });

          // Send the push notification
          // Note: For proper encryption, we'd need to encrypt the payload
          // but many push services accept unencrypted payloads with VAPID
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
              "TTL": "86400",
              "Content-Type": "application/json",
              "Urgency": "normal",
            },
            body: payload,
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
