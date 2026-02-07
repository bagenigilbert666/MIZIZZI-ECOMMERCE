'use client';

import React from "react";
import { useEffect, useRef, useState } from "react";
type IntersectionObserverOptions = IntersectionObserverInit;

interface UseLazyImageLoadProps {
  src: string;
  onLoad?: () => void;
}

export function useLazyImageLoad({ src, onLoad }: UseLazyImageLoadProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Create a new image to preload
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageSrc(src);
      onLoad?.();
    };
    img.onerror = () => {
      // Fallback on error
      setImageSrc(src);
    };
    img.src = src;
    imgRef.current = img;
  }, [src, onLoad]);

  return imageSrc;
}

// Intersection Observer for lazy loading visibility
export function useIntersectionObserver(ref: React.RefObject<HTMLElement>, options?: IntersectionObserverOptions) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      rootMargin: "50px", // Start loading 50px before element comes into view
      ...options,
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isVisible;
}
