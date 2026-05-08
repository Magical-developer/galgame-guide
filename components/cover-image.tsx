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
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#161d2b_0%,#0d1118_100%)]">
          <span className="text-xs uppercase tracking-widest text-white/30">
            封面加载失败
          </span>
        </div>
      )}
    </>
  );
}
