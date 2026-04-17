-- 1. Create coupon_usage table to prevent multi-use by same user
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coupon_id uuid REFERENCES coupons(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, coupon_id) -- Ensures one use per user
);

-- Enable RLS
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own usage
CREATE POLICY "Users can view their own coupon usage" ON public.coupon_usage
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Add an RPC to validate and record coupon usage atomically
CREATE OR REPLACE FUNCTION public.apply_coupon(coupon_code_param text, listing_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon_rec record;
  user_id uuid := auth.uid();
BEGIN
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Find the coupon
  SELECT * INTO coupon_rec 
  FROM coupons 
  WHERE code = UPPER(coupon_code_param) AND active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid coupon code');
  END IF;

  -- Check dates
  IF now() < coupon_rec.valid_from THEN
    RETURN json_build_object('success', false, 'error', 'Coupon not yet valid');
  END IF;

  IF coupon_rec.valid_until IS NOT NULL AND now() > coupon_rec.valid_until THEN
    RETURN json_build_object('success', false, 'error', 'Coupon has expired');
  END IF;

  -- Check global usage limit
  IF coupon_rec.usage_limit IS NOT NULL AND coupon_rec.used_count >= coupon_rec.usage_limit THEN
    RETURN json_build_object('success', false, 'error', 'Coupon total usage limit reached');
  END IF;

  -- Check per-user usage limit (NEW)
  IF EXISTS (SELECT 1 FROM coupon_usage WHERE user_id = user_id AND coupon_id = coupon_rec.id) THEN
    RETURN json_build_object('success', false, 'error', 'You have already used this coupon');
  END IF;

  -- Record usage
  INSERT INTO coupon_usage (user_id, coupon_id, listing_id)
  VALUES (user_id, coupon_rec.id, listing_id_param);

  -- Increment use count
  UPDATE coupons SET used_count = used_count + 1 WHERE id = coupon_rec.id;

  RETURN json_build_object(
    'success', true, 
    'discount_percentage', coupon_rec.discount_percentage,
    'discount_amount', coupon_rec.discount_amount,
    'is_percentage', coupon_rec.is_percentage
  );
END;
$$;
