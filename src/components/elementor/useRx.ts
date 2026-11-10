'use client';

import { useEffect, useState } from 'react';

/** Returns the DOM element rendered with data-rx="<id>" (see lib/render.tsx). */
export function useRxElement(rx: string) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => { setEl(document.querySelector<HTMLElement>(`[data-rx="${rx}"]`)); }, [rx]);
  return el;
}
