import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlowQuery {
  timestamp: string;
  duration_ms: number;
  query: string;
  user: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting database performance monitoring...');

    // Query slow queries from postgres logs (last 5 minutes)
    const { data: slowQueries, error: slowQueriesError } = await supabase.rpc(
      'exec_sql',
      {
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
            AND timestamp > NOW() - INTERVAL '5 minutes'
          ORDER BY CAST(parsed.duration_ms AS FLOAT) DESC
          LIMIT 10
        `
      }
    );

    if (slowQueriesError) {
      console.error('Error querying slow queries:', slowQueriesError);
      throw slowQueriesError;
    }

    const queries = (slowQueries as SlowQuery[]) || [];
    console.log(`Found ${queries.length} slow queries in the last 5 minutes`);

    // If we found slow queries, notify admins
    if (queries.length > 0) {
      // Get all admin users
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_admin', true);

      if (adminsError) {
        console.error('Error fetching admins:', adminsError);
        throw adminsError;
      }

      // Create notification for each admin
      const notifications = (admins || []).map(admin => ({
        user_id: admin.id,
        title: '🚨 Database Performance Alert',
        message: `${queries.length} slow queries detected (>${queries[0].duration_ms.toFixed(0)}ms). Check the Database Monitoring page for details.`,
        type: 'system',
        entity_type: 'database',
        entity_id: null,
        read: false,
      }));

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error creating notifications:', notificationError);
        } else {
          console.log(`Created ${notifications.length} admin notifications`);
        }
      }

      // Log the slowest query details
      const slowest = queries[0];
      console.log('Slowest query:', {
        duration: `${slowest.duration_ms.toFixed(0)}ms`,
        query: slowest.query.substring(0, 100) + '...',
        user: slowest.user,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        slowQueriesFound: queries.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Database monitoring error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
