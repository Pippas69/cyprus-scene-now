import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-PUSH-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
};

// Convert VAPID key from base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Web Push crypto functions using Web Crypto API
async function generatePushHeaders(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ headers: Record<string, string>; body: Uint8Array }> {
  const audience = new URL(endpoint).origin;
  
  // Create VAPID JWT
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:notifications@fomo.cy",
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import VAPID private key
  const privateKeyBuffer = base64ToUint8Array(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/'));
  
  // Create proper PKCS8 format for the private key
  const keyData = new Uint8Array(138);
  keyData.set([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20
  ], 0);
  keyData.set(privateKeyBuffer, 36);
  keyData.set([0xa1, 0x44, 0x03, 0x42, 0x00, 0x04], 68);
  
  const publicKeyBuffer = base64ToUint8Array(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/'));
  keyData.set(publicKeyBuffer, 74);
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  // Convert signature from DER to raw format
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const jwt = `${unsignedToken}.${signatureB64}`;
  
  return {
    headers: {
      "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      "TTL": "86400",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
    },
    body: new Uint8Array(0), // Simplified - actual encryption would go here
  };
}

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
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

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/fomo-logo.png",
      badge: "/fomo-logo.png",
      data: {
        url: data?.url || "/dashboard-business/ticket-sales",
        ...data,
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Use a simpler fetch approach with the raw endpoint
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "TTL": "86400",
              "Content-Type": "application/json",
              "Authorization": `vapid t=${vapidPublicKey}, k=${vapidPublicKey}`,
            },
            body: payload,
          });

          if (!response.ok) {
            // If subscription is expired/invalid, remove it
            if (response.status === 404 || response.status === 410) {
              logStep("Removing invalid subscription", { endpoint: sub.endpoint });
              await supabaseClient
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            }
            throw new Error(`Push failed: ${response.status}`);
          }

          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          logStep("Push error for subscription", { 
            endpoint: sub.endpoint, 
            error: error instanceof Error ? error.message : String(error) 
          });
          return { success: false, endpoint: sub.endpoint, error };
        }
      })
    );

    const successful = results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;
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
