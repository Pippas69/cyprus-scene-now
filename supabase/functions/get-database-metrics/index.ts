import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    console.log('Fetching database metrics for admin:', user.id);

    // Get connection stats
    const { data: connectionStats } = await supabase
      .from('connection_stats_monitor')
      .select('*');

    // Get recent monitoring alerts
    const { data: recentAlerts } = await supabase
      .from('monitoring_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const stats = connectionStats || [];
    const totalConnections = stats.reduce((sum, stat) => sum + stat.connection_count, 0);
    const activeConnections = stats.find(s => s.state === 'active')?.connection_count || 0;
    const idleConnections = stats.find(s => s.state === 'idle')?.connection_count || 0;

    // Calculate error rate from recent alerts
    const errorAlerts = recentAlerts?.filter(a => a.severity === 'error') || [];
    const errorRate = recentAlerts ? (errorAlerts.length / recentAlerts.length) * 100 : 0;

    return new Response(
      JSON.stringify({
        slowQueries: [], // Not available without postgres_logs access
        connectionStats: stats,
        totalConnections,
        activeConnections,
        idleConnections,
        errorRate,
        avgQueryTime: 0, // Not available
        recentAlerts: recentAlerts || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching database metrics:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
