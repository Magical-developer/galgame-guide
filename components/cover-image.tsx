"use client";

import Image from "next/image";
import { useState } from "react";

type CoverImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
};

export function CoverImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: CoverImageProps) {
  const [hasError, setHasError] = useState(!src);
  const fallbackTitle = alt.replace(/\s*封面$/, "").trim();

  return (
    <>
      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={className}
          loading={priority ? "eager" : "lazy"}
          onError={() => {
            setHasError(true);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(160deg,#1a2130_0%,#10141c_60%,#0b0e14_100%)]">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-display text-2xl text-white/60">
            {fallbackTitle.slice(0, 1)}
          </span>
          <span className="px-4 text-center text-xs tracking-[0.2em] text-white/35">
            {fallbackTitle}
          </span>
        </div>
      )}
    </>
  );
}
