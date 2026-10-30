-- ==============================================================================
-- WHAT'S HAPPENING - AUTOMATIC NOTIFICATIONS & REALTIME TRIGGERS
-- ==============================================================================

-- 1. Enable Supabase Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Function: Automatic Article Publication and Editorial Review Notifications
CREATE OR REPLACE FUNCTION public.handle_article_publication_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
BEGIN
  -- Get author name if available
  SELECT full_name INTO v_author_name
  FROM public.profiles
  WHERE id = NEW.author_id;

  -- A. ARTICLE TRANSITIONS TO 'PUBLISHED'
  -- When published: notify every user in the platform, and notify author specifically
  IF (TG_OP = 'INSERT' AND NEW.status = 'published') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published')) THEN

    -- Insert notification for all registered users (excluding author to avoid duplicate notification)
    INSERT INTO public.notifications (user_id, article_id, title, message, is_read, created_at)
    SELECT
      p.id,
      NEW.id,
      'New Story: ' || NEW.title,
      COALESCE(NEW.excerpt, 'A new story has just been published on What''s Happening.'),
      false,
      now()
    FROM public.profiles p
    WHERE p.id <> NEW.author_id;

    -- Send specialized confirmation to the author
    IF NEW.author_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, article_id, title, message, is_read, created_at)
      VALUES (
        NEW.author_id,
        NEW.id,
        'Your Story is Live!',
        'Congratulations! Your story "' || NEW.title || '" has been approved and published on What''s Happening.',
        false,
        now()
      );
    END IF;

  -- B. ARTICLE TRANSITIONS TO 'REJECTED'
  -- When rejected: notify the author with the editorial reason
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected')) THEN

    IF NEW.author_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, article_id, title, message, is_read, created_at)
      VALUES (
        NEW.author_id,
        NEW.id,
        'Editorial Review Update',
        'Your article "' || NEW.title || '" requires revisions. Editor note: ' || COALESCE(NEW.rejection_reason, 'Please align with current editorial guidelines.'),
        false,
        now()
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger attached to articles table
DROP TRIGGER IF EXISTS tr_article_publication_notifications ON public.articles;
CREATE TRIGGER tr_article_publication_notifications
  AFTER INSERT OR UPDATE OF status ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_article_publication_notifications();

-- 4. Verify RLS policies on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System and admins can insert notifications" ON public.notifications;
CREATE POLICY "System and admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
