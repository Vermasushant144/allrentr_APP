import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate user session
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Invalid user session:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid session' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { amount, currency = 'INR', receipt, packageId, listingId } = await req.json();

    let verifiedAmount = amount;

    // Security check: verify amount against database if packageId or listingId is provided
    if (packageId) {
      const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .select('price')
        .eq('id', packageId)
        .single();
      
      if (pkgError || !pkg) {
        throw new Error('Invalid package ID');
      }
      verifiedAmount = pkg.price;
    } else if (listingId) {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('rent_price')
        .eq('id', listingId)
        .single();
      
      if (listingError || !listing) {
        throw new Error('Invalid listing ID');
      }
      verifiedAmount = listing.rent_price;
    }

    // Validate amount (prevent abuse with unreasonable amounts)
    if (!verifiedAmount || verifiedAmount < 1 || verifiedAmount > 20000) {
      console.error('Invalid amount:', verifiedAmount);
      return new Response(
        JSON.stringify({ error: 'Invalid amount: must be between 1 and 20000' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    // Create Basic Auth header for Razorpay
    const razorpayAuthHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Create Razorpay order
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuthHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: verifiedAmount * 100, // Amount in paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Razorpay API error:', errorData);
      throw new Error(`Razorpay API error: ${response.status}`);
    }

    const order = await response.json();

    console.log('Creating Razorpay order for user:', user.id, 'amount:', amount);

    return new Response(
      JSON.stringify({ 
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
