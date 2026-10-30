'use client';

import { useEffect, useRef } from 'react';

export function ViewCounterTracker({ slug }: { slug: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current && slug) {
      trackedRef.current = true;
      try {
        fetch(`/api/articles/${slug}/view`, {
          method: 'POST',
        }).catch(() => {
          // ignore tracking errors silently
        });
      } catch {
        // silent
      }
    }
  }, [slug]);

  return null;
}
