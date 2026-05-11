import React from 'react';

/**
 * Soft animated "mesh gradient" effect rendered as four blurred radial blobs
 * positioned absolutely. Place inside a relative container.
 */
export default function MeshBackground({
  className,
  style,
}: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`mesh-bg ${className || ''}`} style={style} aria-hidden>
      <span className="mesh-blob mesh-blob--1" />
      <span className="mesh-blob mesh-blob--2" />
      <span className="mesh-blob mesh-blob--3" />
      <span className="mesh-blob mesh-blob--4" />
    </div>
  );
}
