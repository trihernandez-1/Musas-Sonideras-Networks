import { useEffect, useState } from 'react';
import { getImage } from '../db/repos';

/** Renders a screenshot stored in IndexedDB by its image id. */
export default function StoredImageView({
  imageId,
  alt,
  style,
  onClick,
}: {
  imageId: string;
  alt: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    getImage(imageId).then((image) => {
      if (cancelled || !image) return;
      url = URL.createObjectURL(image.blob);
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageId]);

  if (!src) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          ...style,
        }}
      />
    );
  }

  return <img src={src} alt={alt} style={style} onClick={onClick} />;
}
