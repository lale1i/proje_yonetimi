import React, { useEffect, useRef } from 'react';
import { initCloth } from './cloth';

export default function CanvasEffect() {
  const containerRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let cleanup = null;
    let debounceId = null;
    let retryId = null;
    let ignoreRo = false;
    let alive = true;

    const readSize = () => {
      const el = containerRef.current;
      if (!el) return { w: 0, h: 0 };
      // Prefer parent wrapper size — absolute child can report 0 before layout
      const box = el.parentElement || el;
      const w = Math.round(box.clientWidth || el.clientWidth || 0);
      const h = Math.round(box.clientHeight || el.clientHeight || 0);
      return { w, h };
    };

    const mount = () => {
      if (!alive || !containerRef.current) return;

      const { w, h } = readSize();
      if (w < 40 || h < 40) {
        retryId = setTimeout(mount, 120);
        return;
      }

      if (
        cleanup &&
        Math.abs(w - sizeRef.current.w) < 2 &&
        Math.abs(h - sizeRef.current.h) < 2
      ) {
        return;
      }

      sizeRef.current = { w, h };
      ignoreRo = true;
      if (cleanup) cleanup();
      try {
        cleanup = initCloth(containerRef.current, { width: w, height: h });
      } catch (err) {
        console.error('Curtain effect failed to start:', err);
        cleanup = null;
      }
      requestAnimationFrame(() => {
        ignoreRo = false;
      });
    };

    const scheduleMount = () => {
      if (!alive || ignoreRo) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(mount, 40);
    };

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(mount);
    });

    const ro = new ResizeObserver(scheduleMount);
    ro.observe(root);
    if (root.parentElement) ro.observe(root.parentElement);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      clearTimeout(debounceId);
      clearTimeout(retryId);
      ro.disconnect();
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={containerRef} className="curtain-effect-root" />;
}
