// src/components/ItemIcon.tsx
import { useState } from 'react';
import { iconUrl } from '../lib/icons';

type Props = {
  name: string;
  size?: number;
  className?: string;
};

export default function ItemIcon({ name, size = 20, className }: Props) {
  const [failed, setFailed] = useState(false);
  const url = iconUrl(name);
  if (!url || failed) {
    return (
      <span
        className={'icon-fallback ' + (className ?? '')}
        style={{ width: size, height: size }}
        title={name}
      />
    );
  }
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className={'item-icon ' + (className ?? '')}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}