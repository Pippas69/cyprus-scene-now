import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAPBOX_TOKEN = 'pk.eyJ1IjoicGlwcGFzNjkiLCJhIjoiY21oeHRoYjV6MDBmeTJtczRuNm03dWRnNyJ9.ws_aDgURsUhQ2LcoQ3EEjw';

interface Business {
  id: string;
  name: string;
  address: string;
  city: string;
  category: string[];
  phone: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
}

async function geocodeAddress(address: string, city: string): Promise<{ lng: number; lat: number } | null> {
  try {
    const searchText = `${address}, ${city}, Cyprus`;
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?access_token=${MAPBOX_TOKEN}&country=cy&limit=1`
    );
    
    if (!response.ok) {
      console.error(`Geocoding failed for ${searchText}:`, response.status);
      return null;
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lng, lat };
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding ${address}, ${city}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching businesses without geo coordinates...');

    // Get all businesses that have address and city but no geo coordinates
    const { data: businesses, error: fetchError } = await supabaseClient
      .from('businesses')
      .select('id, name, address, city, category, phone, website, description, logo_url, cover_url')
      .not('address', 'is', null)
      .not('city', 'is', null)
      .is('geo', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!businesses || businesses.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No businesses found that need geocoding',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${businesses.length} businesses to geocode`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // Process each business
    for (const business of businesses as Business[]) {
      console.log(`Geocoding: ${business.name} (${business.address}, ${business.city})`);
      
      const coordinates = await geocodeAddress(business.address, business.city);
      
      if (coordinates) {
        // Update business with geo coordinates
        const { error: updateError } = await supabaseClient.rpc('update_business_with_geo', {
          p_business_id: business.id,
          p_name: business.name,
          p_category: business.category,
          p_city: business.city,
          p_address: business.address,
          p_phone: business.phone || '',
          p_website: business.website || '',
          p_description: business.description || '',
          p_logo_url: business.logo_url || '',
          p_cover_url: business.cover_url || '',
          p_longitude: coordinates.lng,
          p_latitude: coordinates.lat
        });

        if (updateError) {
          console.error(`Failed to update ${business.name}:`, updateError);
          failCount++;
          results.push({
            business: business.name,
            status: 'failed',
            error: updateError.message
          });
        } else {
          console.log(`✓ Successfully geocoded ${business.name}`);
          successCount++;
          results.push({
            business: business.name,
            status: 'success',
            coordinates
          });
        }
      } else {
        console.log(`✗ Could not geocode ${business.name}`);
        failCount++;
        results.push({
          business: business.name,
          status: 'geocoding_failed'
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const response = {
      total: businesses.length,
      successful: successCount,
      failed: failCount,
      results
    };

    console.log('Geocoding complete:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in geocode-existing-businesses:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
