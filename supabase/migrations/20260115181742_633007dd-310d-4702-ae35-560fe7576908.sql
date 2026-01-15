-- Enable RLS (safe if already enabled)
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

-- Business owners can delete their own offers
CREATE POLICY "Business owners can delete their offers"
ON public.discounts
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = discounts.business_id
      AND b.user_id = auth.uid()
  )
);

-- Business owners can delete dependent rows for their offers (needed for clean deletion)
CREATE POLICY "Business owners can delete discount views for their offers"
ON public.discount_views
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = discount_views.discount_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete discount scans for their offers"
ON public.discount_scans
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = discount_scans.discount_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete favorites for their offers"
ON public.favorite_discounts
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = favorite_discounts.discount_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete discount items for their offers"
ON public.discount_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = discount_items.discount_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete offer boosts for their offers"
ON public.offer_boosts
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = offer_boosts.discount_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete offer purchases for their offers"
ON public.offer_purchases
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = offer_purchases.discount_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete redemptions for their offers"
ON public.redemptions
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = redemptions.discount_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete commission rows for their offers"
ON public.commission_ledger
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.discounts d
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.id = commission_ledger.discount_id
      AND b.user_id = auth.uid()
  )
);
