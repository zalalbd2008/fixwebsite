'use client';

import { useLayoutEffect } from 'react';

/** Keeps WordPress body classes (page-id-…, elementor-kit-…, single-post …) in sync on client navigation. */
export function BodyClass({ value }: { value: string }) {
  useLayoutEffect(() => {
    const keep = Array.from(document.body.classList).filter((c) => /^(fwi-|e--ua|translated)/.test(c));
    document.body.className = [value, ...keep].join(' ');
  }, [value]);
  return null;
}
