import React, { useState, useCallback } from 'preact/compat';
import { s } from './styles';

interface Props {
  getData: () => string;
  label?: string;
}

export function CopyButton({ getData, label = 'Copy' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getData());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [getData]);

  return (
    <button
      onClick={handleCopy}
      style={{
        fontSize: 11,
        padding: '2px 8px',
        background: copied ? s.green + '22' : s.surface,
        border: `1px solid ${copied ? s.green : s.border}`,
        borderRadius: 3,
        cursor: 'pointer',
        color: copied ? s.green : s.textSecondary,
        fontFamily: 'monospace',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}
