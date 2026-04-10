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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#161d2b_0%,#0d1118_100%)]">
        <Image
          src="/placeholder-cover.svg"
          alt=""
          fill
          sizes={sizes}
          className="object-cover opacity-95"
        />
      </div>

      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={className}
          onError={() => {
            setHasError(true);
          }}
        />
      ) : null}
    </>
  );
}
