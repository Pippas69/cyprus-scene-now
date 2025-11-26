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
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response('Forbidden', { status: 403 });
    }

    console.log('Fetching database metrics...');

    // Get connection stats from pg_stat_activity
    const { data: connectionData } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          state,
          COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `
    });

    // Get slow queries from postgres logs (last hour)
    const { data: slowQueries } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          timestamp,
          CAST(parsed.duration_ms AS FLOAT) as duration_ms,
          parsed.query as query,
          identifier as user
        FROM postgres_logs
        CROSS JOIN unnest(metadata) as m
        CROSS JOIN unnest(m.parsed) as parsed
        WHERE parsed.duration_ms IS NOT NULL
          AND CAST(parsed.duration_ms AS FLOAT) > 1000
          AND timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY CAST(parsed.duration_ms AS FLOAT) DESC
        LIMIT 50
      `
    });

    // Get error rate from logs
    const { data: errorData } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) FILTER (WHERE parsed.error_severity IN ('ERROR', 'FATAL', 'PANIC')) as errors,
          COUNT(*) as total
        FROM postgres_logs
        CROSS JOIN unnest(metadata) as m
        CROSS JOIN unnest(m.parsed) as parsed
        WHERE timestamp > NOW() - INTERVAL '1 hour'
      `
    });

    const connectionStats = connectionData || [];
    const totalConnections = connectionStats.reduce((sum: number, stat: any) => sum + stat.count, 0);
    const activeConnections = connectionStats.find((s: any) => s.state === 'active')?.count || 0;
    const idleConnections = connectionStats.find((s: any) => s.state === 'idle')?.count || 0;

    const queries = slowQueries || [];
    const avgQueryTime = queries.length > 0
      ? queries.reduce((sum: number, q: any) => sum + q.duration_ms, 0) / queries.length
      : 0;

    const errorRate = errorData?.[0]
      ? (errorData[0].errors / errorData[0].total) * 100
      : 0;

    return new Response(
      JSON.stringify({
        slowQueries: queries,
        connectionStats,
        totalConnections,
        activeConnections,
        idleConnections,
        errorRate,
        avgQueryTime,
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
