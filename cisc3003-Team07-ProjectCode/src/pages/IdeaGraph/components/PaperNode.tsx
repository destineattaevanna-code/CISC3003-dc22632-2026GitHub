import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { latexToHtml, hasLatex } from '../../../utils/latex';

interface PaperNodeData {
  title: string;
  authors: string[];
  year: number;
  abstract?: string;
  paperId?: string;
  kind?: 'source' | 'related';
  isNew?: boolean;
}

const PaperNode: React.FC<NodeProps<PaperNodeData>> = ({ data, selected }) => {
  const rawTitle = data.title || data.paperId || 'Paper';
  const displayTitle = rawTitle;

  return (
    <div className={`paper-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />

      <div className="paper-node-content">
        <div className="paper-node-header">
          <div className="node-type-badge paper-badge">PAPER</div>
          {data.isNew && <span className="paper-new-pill">NEW</span>}
        </div>

        <h3 className="paper-title">
          {hasLatex(displayTitle)
            ? <span dangerouslySetInnerHTML={{ __html: latexToHtml(displayTitle) }} />
            : displayTitle}
        </h3>

        {data.abstract && (
          <div
            className="paper-abstract-preview"
            {...(hasLatex(data.abstract)
              ? { dangerouslySetInnerHTML: { __html: latexToHtml(data.abstract) } }
              : { children: data.abstract.length > 80 ? `${data.abstract.substring(0, 80)}...` : data.abstract })}
          />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default PaperNode;