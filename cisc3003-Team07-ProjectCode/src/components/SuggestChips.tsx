// src/components/SuggestChips.tsx
import React from 'react';
import './SuggestChips.css';

export type SuggestChipsProps = {
  suggestions: string[];
  onSelect: (text: string) => void;
  title?: string;
};

const SuggestChips: React.FC<SuggestChipsProps> = ({ suggestions, onSelect, title = 'You can try:' }) => {
  if (!suggestions?.length) return null;
  return (
    <div className="chips__wrap">
      <span className="chips__title">{title}</span>
      <div className="chips__list">
        {suggestions.map((s, i) => (
          <button
            key={`${i}-${s}`}
            className="chips__item"
            onClick={() => onSelect(s)}
            aria-label={`Select suggestion: ${s}`}
            title={s}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestChips;
