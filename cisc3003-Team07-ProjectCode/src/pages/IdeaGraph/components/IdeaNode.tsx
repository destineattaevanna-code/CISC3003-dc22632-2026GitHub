import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { latexToHtml, hasLatex } from '../../../utils/latex';

interface IdeaNodeData {
  label: string;
  description: string;
  createdAt: string;
  feasibility: string;
  novelty: string;
  feasibilityScore?: number;
  noveltyScore?: number;
}

const normalizeScore10 = (score?: unknown): number | undefined => {
  if (score === null || score === undefined) return undefined;
  const n = typeof score === 'number' ? score : parseFloat(String(score));
  if (!Number.isFinite(n)) return undefined;
  let normalized = n;
  if (normalized <= 1) normalized = normalized * 10;
  else if (normalized <= 5) normalized = normalized * 2;
  return Math.max(0, Math.min(10, normalized));
};

const scoreToStars = (score?: unknown): number | undefined => {
  const normalized = normalizeScore10(score);
  if (typeof normalized !== 'number') return undefined;
  const halfSteps = Math.round(normalized);
  return Math.max(0, Math.min(5, halfSteps / 2));
};

const renderStars = (value: number | undefined, color: string) => {
  if (typeof value !== 'number') {
    return <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>--</span>;
  }
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const empty = Math.max(0, 5 - full - (hasHalf ? 1 : 0));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: full }).map((_, i) => (
        <StarFilled key={`f-${i}`} style={{ color, fontSize: 13 }} />
      ))}
      {hasHalf && (
        <StarFilled style={{ color, fontSize: 13, opacity: 0.5 }} />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <StarOutlined key={`e-${i}`} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }} />
      ))}
    </span>
  );
};

const IdeaNode: React.FC<NodeProps<IdeaNodeData>> = ({ data, selected }) => {
  return (
    <div className={`idea-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />

      <div className="idea-node-content">
        <div className="idea-node-header">
          <div className="node-type-badge idea-badge">IDEA</div>
          <div className="idea-date">{data.createdAt}</div>
        </div>

        <div className="idea-metrics">
          <div className="metric-item">
            <span className="metric-label">Feasibility</span>
            <span className="metric-value">
              {renderStars(scoreToStars(data.feasibilityScore), '#52c41a')}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Novelty</span>
            <span className="metric-value">
              {renderStars(scoreToStars(data.noveltyScore), '#fadb14')}
            </span>
          </div>
        </div>

        <h3 className="idea-title" title={data.label}>
          {hasLatex(data.label)
            ? <span dangerouslySetInnerHTML={{ __html: latexToHtml(data.label) }} />
            : data.label}
        </h3>

        {String(data.description || '').trim() &&
          String(data.description || '').trim() !== String(data.label || '').trim() && (
            <p className="idea-description" title={data.description}>
              {data.description}
            </p>
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

export default IdeaNode;
