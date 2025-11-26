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

    console.log('Starting database performance monitoring...');

    // Query connection statistics
    const { data: connectionStats, error: connError } = await supabase
      .from('connection_stats_monitor')
      .select('*');

    if (connError) {
      console.error('Error querying connection stats:', connError);
      throw connError;
    }

    const totalConnections = connectionStats?.reduce((sum, stat) => sum + stat.connection_count, 0) || 0;
    const activeConnections = connectionStats?.find(s => s.state === 'active')?.connection_count || 0;

    console.log(`Total connections: ${totalConnections}, Active: ${activeConnections}`);

    // Check if connection pool usage is high (>80%)
    const CONNECTION_POOL_LIMIT = 100; // typical default
    const connectionPoolUsage = (totalConnections / CONNECTION_POOL_LIMIT) * 100;

    if (connectionPoolUsage > 80) {
      console.log('⚠️ High connection pool usage detected:', connectionPoolUsage.toFixed(1) + '%');

      // Log the alert
      const { error: alertError } = await supabase
        .from('monitoring_alerts')
        .insert({
          alert_type: 'high_connection_usage',
          severity: 'warning',
          message: `Connection pool usage is at ${connectionPoolUsage.toFixed(1)}%`,
          details: {
            total_connections: totalConnections,
            active_connections: activeConnections,
            threshold: 80,
          },
        });

      if (alertError) {
        console.error('Error logging alert:', alertError);
      }

      // Get all admin users
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_admin', true);

      if (adminsError) {
        console.error('Error fetching admins:', adminsError);
      } else if (admins && admins.length > 0) {
        // Create notification for each admin
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: '⚠️ Database Alert',
          message: `Connection pool usage is high (${connectionPoolUsage.toFixed(1)}%). Check the Database Monitoring page.`,
          type: 'system',
          entity_type: 'database',
          entity_id: null,
          read: false,
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error creating notifications:', notificationError);
        } else {
          console.log(`Created ${notifications.length} admin notifications`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        connectionPoolUsage: connectionPoolUsage.toFixed(1) + '%',
        totalConnections,
        activeConnections,
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
