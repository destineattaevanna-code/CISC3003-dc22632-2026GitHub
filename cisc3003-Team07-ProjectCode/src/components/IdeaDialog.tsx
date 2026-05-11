// src/components/IdeaDialog.tsx
import React, { useState } from 'react';
import SuggestChips from './SuggestChips';
import './IdeaDialog.css';

export type IdeaDialogProps = {
  open: boolean;
  idea: string | null;
  title?: string;
  onClose: () => void;
  onSend?: (message: string) => Promise<void> | void; // 点击发送时的回调
};

const IdeaDialog: React.FC<IdeaDialogProps> = ({
  open,
  idea,
  title = 'Idea',
  onClose,
  onSend,
}) => {
  const [input, setInput] = useState('');

  if (!open) return null;

  // 先用固定建议，之后再改成根据 idea 动态生成
  const suggestions = [
    'What are the key points of this idea?',
    'Give me an application example related to this idea',
    'List the limitations and improvement directions of this idea',
  ];

  const handleSubmit = async (text?: string) => {
    const toSend = (text ?? input).trim();
    if (!toSend) return;
    setInput('');
    await onSend?.(toSend);
  };

  return (
    <div className="idea-dialog__overlay" onClick={onClose}>
      <div className="idea-dialog__container" onClick={(e) => e.stopPropagation()}>
        <div className="idea-dialog__header">
          <h3 className="idea-dialog__title">{title}</h3>
          <button className="idea-dialog__close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="idea-dialog__content">
          {idea ? (
            <p className="idea-dialog__text">{idea}</p>
          ) : (
            <p className="idea-dialog__placeholder">No content available</p>
          )}
        </div>

        <div className="idea-dialog__footer">
          <div className="idea-dialog__inputRow">
            <input
              className="idea-dialog__input"
              value={input}
              placeholder="Enter your question..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button className="idea-dialog__send" onClick={() => handleSubmit()}>
              Send
            </button>
          </div>

          <SuggestChips
            suggestions={suggestions}
            onSelect={(text) => handleSubmit(text)} // 点击即自动发送
            title="You can try:"
          />
        </div>
      </div>
    </div>
  );
};

export default IdeaDialog;
