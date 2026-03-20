"use client";

import { useState } from "react";

interface ServiceLogoProps {
  name: string;
  logoDomain?: string | null;
  size?: number;
}

export default function ServiceLogo({ name, logoDomain, size = 32 }: ServiceLogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeStyle = { width: size, height: size, minWidth: size };
  const fontSize = size <= 24 ? "text-xs" : size <= 36 ? "text-sm" : "text-base";

  if (logoDomain && !imgError) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${logoDomain}&sz=64`}
        alt={name}
        style={sizeStyle}
        className="shrink-0 rounded object-contain"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-violet-600 font-bold text-white ${fontSize}`}
      style={sizeStyle}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
