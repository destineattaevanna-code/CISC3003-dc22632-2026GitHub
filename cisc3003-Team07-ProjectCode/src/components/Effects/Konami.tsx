import React, { useEffect } from 'react';
import { message } from 'antd';

const SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

function fireworks() {
  const colors = ['#722ed1', '#eb2f96', '#fa8c16', '#52c41a', '#1890ff', '#fadb14', '#13c2c2'];
  const symbols = ['✦', '✧', '★', '✺', '❀', '✿', '❉', '✾'];
  const N = 70;
  for (let i = 0; i < N; i++) {
    const piece = document.createElement('div');
    const isText = Math.random() > 0.5;
    if (isText) {
      piece.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      piece.style.fontSize = `${14 + Math.random() * 22}px`;
    } else {
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${10 + Math.random() * 14}px`;
      piece.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';
    }
    piece.style.position = 'fixed';
    piece.style.left = `${50 + (Math.random() - 0.5) * 40}%`;
    piece.style.top = `${20 + (Math.random() - 0.5) * 20}%`;
    piece.style.color = colors[i % colors.length];
    piece.style.background = isText ? 'transparent' : colors[i % colors.length];
    piece.style.opacity = '1';
    piece.style.zIndex = '99999';
    piece.style.pointerEvents = 'none';
    piece.style.setProperty('--cx', `${(Math.random() - 0.5) * 800}px`);
    piece.style.setProperty('--cr', `${360 + Math.random() * 720}deg`);
    piece.style.animation = `isv-confetti-fall ${1.4 + Math.random() * 1.6}s cubic-bezier(.2,.6,.4,1) forwards`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

/**
 * Listens for the Konami code globally and triggers a celebration.
 */
export default function Konami() {
  useEffect(() => {
    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      if (typeof e.key !== 'string' || e.key.length === 0) return;
      const need = SEQUENCE[pos];
      const got = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (got === need) {
        pos += 1;
        if (pos === SEQUENCE.length) {
          pos = 0;
          fireworks();
          try {
            message.success({
              content: '🎉 Easter egg unlocked — Team 07 says hi!',
              duration: 4,
            });
          } catch { /* ignore — message might not be ready */ }
        }
      } else {
        pos = (got === SEQUENCE[0]) ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
