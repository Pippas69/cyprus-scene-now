-- Create favorite_discounts table to track user's favorite offers
CREATE TABLE IF NOT EXISTS public.favorite_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, discount_id)
);

-- Enable RLS on favorite_discounts
ALTER TABLE public.favorite_discounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorite discounts
CREATE POLICY "Users can view their own favorite discounts"
ON public.favorite_discounts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own favorite discounts
CREATE POLICY "Users can add their own favorite discounts"
ON public.favorite_discounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorite discounts
CREATE POLICY "Users can remove their own favorite discounts"
ON public.favorite_discounts
FOR DELETE
USING (auth.uid() = user_id);

-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorite_discounts_user_id ON public.favorite_discounts(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_discounts_discount_id ON public.favorite_discounts(discount_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;