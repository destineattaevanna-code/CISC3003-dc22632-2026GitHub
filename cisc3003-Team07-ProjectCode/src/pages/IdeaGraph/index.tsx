import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  EdgeProps,
  NodeTypes,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowInstance,
  ConnectionLineType,
  getBezierPath,
  useStore,
} from 'reactflow';
import axios from 'axios';
import PubSub from 'pubsub-js';
import { message, Slider } from 'antd';
import { CloseOutlined, StarFilled, StarOutlined, LoadingOutlined } from '@ant-design/icons';
import 'reactflow/dist/style.css';
import IdeaNode from './components/IdeaNode';
import PaperNode from './components/PaperNode';
import NodeDetailModal from './components/NodeDetailModal';
import HeaderComponent from '../../components/Header';
import { latexToHtml, hasLatex } from '../../utils/latex';
import './IdeaGraph.css';

const ZOOM_PREVIEW_THRESHOLD = 0.50;
const FIT_VIEW_MAX_ZOOM = 0.55;

const IDEA_STATE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  budding:             { color: '#22c55e', bg: '#dcfce7', label: 'Budding' },
  developing:          { color: '#f59e0b', bg: '#fef3c7', label: 'Developing' },
  mature:              { color: '#3b82f6', bg: '#dbeafe', label: 'Mature' },
  obsolete:            { color: '#9ca3af', bg: '#f3f4f6', label: 'Obsolete' },
};

const getIdeaStateStyle = (state?: string) => {
  if (!state) return null;
  const s = state.toLowerCase().trim();
  if (IDEA_STATE_COLORS[s]) return IDEA_STATE_COLORS[s];
  for (const key of Object.keys(IDEA_STATE_COLORS)) {
    if (s.includes(key)) return IDEA_STATE_COLORS[key];
  }
  return { color: '#94a3b8', bg: '#f1f5f9', label: state };
};

const normalizeScore10 = (score?: unknown): number | undefined => {
  if (score === null || score === undefined) return undefined;
  const n = typeof score === 'number' ? score : parseFloat(String(score));
  if (!Number.isFinite(n)) return undefined;
  let v = n;
  if (v <= 1) v = v * 10;
  else if (v <= 5) v = v * 2;
  return Math.max(0, Math.min(10, v));
};
const scoreToStars = (score?: unknown): number | undefined => {
  const v = normalizeScore10(score);
  if (typeof v !== 'number') return undefined;
  return Math.max(0, Math.min(5, Math.round(v) / 2));
};
const renderStarsPreview = (value: number | undefined, color: string) => {
  if (typeof value !== 'number') return <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>--</span>;
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = Math.max(0, 5 - full - (half ? 1 : 0));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: full }).map((_, i) => <StarFilled key={`f${i}`} style={{ color, fontSize: 15 }} />)}
      {half && <StarFilled style={{ color, fontSize: 15, opacity: 0.5 }} />}
      {Array.from({ length: empty }).map((_, i) => <StarOutlined key={`e${i}`} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }} />)}
    </span>
  );
};

const ZoomWatcher: React.FC<{ zoomRef: React.MutableRefObject<number>; onZoomChange: (z: number) => void }> = ({ zoomRef, onZoomChange }) => {
  const zoom = useStore((s) => s.transform[2]);
  React.useEffect(() => {
    zoomRef.current = zoom;
    onZoomChange(zoom);
  }, [zoom, zoomRef, onZoomChange]);
  return null;
};

// 定义节点数据类型接口
interface IdeaNodeData {
  label: string;
  description: string;
  createdAt: string;
  feasibility: string;
  novelty: string;
}

interface PaperNodeData {
  title: string;
  authors: string[];
  year: number;
  abstract?: string;
  paperId?: string;
  kind?: 'source' | 'related';
  pdf_url?: string;
}

type ApiIdeaEvaluation = {
  feasibility_score?: number;
  novelty_score?: number;
} | null;

type ApiRelatedPaper = {
  related_paper_id: string;
  title?: string;
  abstract?: string;
  pdf_url?: string;
  relevance_score?: number;
  authors?: string[];
  year?: number;
  is_new?: boolean;
};

type ApiActionHistoryItem = {
  actionType?: string;
  description?: string;
  createdAt?: string;
  relatedPaper?: {
    paperId?: string;
    title?: string;
    url?: string;
  };
  relatedPaperId?: string;
  relatedPaperTitle?: string;
  relatedIdea?: {
    ideaId?: number;
    ideaContent?: string;
    paperId?: string;
    sourceType?: string;
    createdAt?: string;
  };
};

type ApiUserIdea = {
  ideaId: number;
  idea: string;
  paperId: string;
  createdAt?: string;
  updateAt?: string;
  updatedAt?: string;
  evaluation?: ApiIdeaEvaluation;
  relatedPapers?: ApiRelatedPaper[];
  state?: string;
  actionHistory?: ApiActionHistoryItem[];
  sourcePaper?: {
    title?: string;
    abstract?: string;
    pdf_url?: string;
    authors?: string[] | string;
    year?: number;
  };
};

const levelFromScore = (score?: number): 'High' | 'Medium' | 'Low' => {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'Medium';
  if (score >= 0.67) return 'High';
  if (score >= 0.34) return 'Medium';
  return 'Low';
};

const fallbackTitleFromIdeaText = (text: string) => {
  const cleaned = (text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Idea';
  // NOTE: Do not add hard "..." truncation here; UI already clamps lines visually.
  return cleaned;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const shortTitleFromText = (text: string) => {
  const cleaned = String(text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Idea';
  // Prefer first ~10-12 words for English-like titles
  const words = cleaned.split(' ').filter(Boolean);
  const wordLimited = words.length > 12 ? words.slice(0, 12).join(' ') : cleaned;
  // Hard cap for extremely long single-sentence titles, without adding explicit "..."
  return wordLimited.length > 80 ? wordLimited.slice(0, 80).trim() : wordLimited;
};

/**
 * Backend `idea` text might look like:
 * - "Title\n\nContent..."
 * - "Title\nContent..."
 * - "Title Content..." (same line)
 * We normalize it into { title, content } and remove duplicated leading title from content.
 */
const parseIdeaTextWithTitle = (text: string): { title: string; content: string } => {
  const raw = String(text || '').trim();
  if (!raw) return { title: 'Idea', content: '' };

  // Prefer splitting by blank line (Title\n\nContent)
  const partsByBlank = raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  let title = '';
  let content = '';

  if (partsByBlank.length >= 2) {
    title = partsByBlank[0];
    content = partsByBlank.slice(1).join('\n\n').trim();
  } else {
    // Fallback: first non-empty line as title, rest as content
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length >= 2) {
      title = lines[0];
      content = lines.slice(1).join('\n').trim();
    } else {
      // Single line: keep full text as title; content can be shown separately if desired.
      title = raw;
      content = raw;
    }
  }

  let finalTitle = (title || '').trim() || fallbackTitleFromIdeaText(raw);
  let finalContent = (content || '').trim();

  // If content starts with the title again (and content isn't identical to title), strip it once.
  // e.g. "动态上下文压缩策略 研究和设计..." when title is "动态上下文压缩策略"
  if (finalContent && finalTitle && finalContent !== finalTitle) {
    const directPrefix = new RegExp(`^${escapeRegExp(finalTitle)}[\\s\\n\\r\\t:：\\-—]*`);
    if (directPrefix.test(finalContent)) {
      finalContent = finalContent.replace(directPrefix, '').trim();
    } else {
      // Also handle: first line equals title
      const cLines = finalContent.split('\n');
      if ((cLines[0] || '').trim() === finalTitle) {
        finalContent = cLines.slice(1).join('\n').trim();
      }
    }
  }

  // If backend provides only one line (or duplicated lines), keep full text as content
  // and derive a short title so UI shows both title and body.
  if (finalContent && finalTitle && finalContent === finalTitle) {
    finalTitle = shortTitleFromText(finalTitle);
  }

  return { title: finalTitle || 'Idea', content: finalContent || '' };
};

const parseArxivYear = (paperId: string): number => {
  const m = (paperId || '').match(/^(\d{2})/);
  if (!m) return 0;
  const yy = Number(m[1]);
  if (Number.isNaN(yy)) return 0;
  return 2000 + yy;
};

const normalizeAuthors = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v));
  if (typeof value === 'string') {
    return value
      .split(/,|;|\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Build graph with "balloon" layout approach:
 * - Each idea has its own set of papers (not shared with other ideas)
 * - Papers connect directly to the idea (no hub node)
 * - Papers are still duplicated per-idea when shared across ideas
 */
const buildGraphFromUserIdeas = (ideas: ApiUserIdea[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seenIdeaNodeIds = new Set<string>();

  // Track which ideas share papers (for grouping related ideas together)
  const paperToIdeaIds = new Map<string, Set<number>>();

  // First pass: collect paper->idea relationships
  ideas.forEach((ideaItem) => {
    const sourcePaperKey = String(ideaItem.paperId || '').trim();
    if (sourcePaperKey) {
      if (!paperToIdeaIds.has(sourcePaperKey)) paperToIdeaIds.set(sourcePaperKey, new Set());
      paperToIdeaIds.get(sourcePaperKey)!.add(ideaItem.ideaId);
    }
    (ideaItem.relatedPapers ?? []).forEach((rp) => {
      const paperId = rp.related_paper_id;
      if (!paperToIdeaIds.has(paperId)) paperToIdeaIds.set(paperId, new Set());
      paperToIdeaIds.get(paperId)!.add(ideaItem.ideaId);
    });
  });

  // Build idea groups (ideas that share at least one paper)
  const ideaIdToGroup = new Map<number, number>();
  let groupCounter = 0;
  ideas.forEach((ideaItem) => {
    if (ideaIdToGroup.has(ideaItem.ideaId)) return;
    const visited = new Set<number>();
    const queue = [ideaItem.ideaId];
    visited.add(ideaItem.ideaId);
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentIdea = ideas.find(i => i.ideaId === currentId);
      if (!currentIdea) continue;
      const sourcePaperKey = String(currentIdea.paperId || '').trim();
      if (sourcePaperKey && paperToIdeaIds.has(sourcePaperKey)) {
        paperToIdeaIds.get(sourcePaperKey)!.forEach(linkedId => {
          if (!visited.has(linkedId)) {
            visited.add(linkedId);
            queue.push(linkedId);
          }
        });
      }
      (currentIdea.relatedPapers ?? []).forEach(rp => {
        const linkedIds = paperToIdeaIds.get(rp.related_paper_id);
        if (linkedIds) {
          linkedIds.forEach(linkedId => {
            if (!visited.has(linkedId)) {
              visited.add(linkedId);
              queue.push(linkedId);
            }
          });
        }
      });
    }
    visited.forEach(id => ideaIdToGroup.set(id, groupCounter));
    groupCounter++;
  });

  ideas.forEach((ideaItem) => {
    const ideaNodeId = `idea-${ideaItem.ideaId}`;
    if (seenIdeaNodeIds.has(ideaNodeId)) return;
    seenIdeaNodeIds.add(ideaNodeId);

    const feasibility = levelFromScore(ideaItem.evaluation?.feasibility_score);
    const novelty = levelFromScore(ideaItem.evaluation?.novelty_score);
    const feasibilityScore = ideaItem.evaluation?.feasibility_score;
    const noveltyScore = ideaItem.evaluation?.novelty_score;
    const parsedIdea = parseIdeaTextWithTitle(ideaItem.idea);
    const groupId = ideaIdToGroup.get(ideaItem.ideaId) ?? 0;

    // Create idea node
    nodes.push({
      id: ideaNodeId,
      type: 'idea',
      position: { x: 0, y: 0 },
      data: {
        label: parsedIdea.title,
        description: parsedIdea.content || ideaItem.idea,
        createdAt: ideaItem.updateAt || ideaItem.updatedAt || ideaItem.createdAt || '',
        feasibility,
        novelty,
        feasibilityScore,
        noveltyScore,
        groupId,
        state: ideaItem.state,
        actionHistory: ideaItem.actionHistory,
      },
    });

    // Collect all papers for this idea (each idea gets its own copy).
    // Deduplicate by paperId — source paper wins over related if both exist.
    const paperMap = new Map<string, { paperId: string; data: any; isSource: boolean; relevanceScore?: number }>();

    // Source paper
    const sourcePaperKey = String(ideaItem.paperId || '').trim();
    if (sourcePaperKey) {
      const sp = ideaItem.sourcePaper;
      paperMap.set(sourcePaperKey, {
        paperId: sourcePaperKey,
        data: {
          title: (sp?.title || '').trim() || sourcePaperKey,
          authors: normalizeAuthors(sp?.authors),
          year: typeof sp?.year === 'number' ? sp.year : parseArxivYear(sourcePaperKey),
          abstract: (sp?.abstract || '').trim() || undefined,
          paperId: sourcePaperKey,
          kind: 'source',
          pdf_url: sp?.pdf_url,
        },
        isSource: true,
      });
    }

    const MAX_GRAPH_PAPERS = 10;
    const sortedRelated = (ideaItem.relatedPapers ?? [])
      .filter(rp => !paperMap.has(rp.related_paper_id))
      .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
      .slice(0, MAX_GRAPH_PAPERS);

    sortedRelated.forEach((rp) => {
      paperMap.set(rp.related_paper_id, {
        paperId: rp.related_paper_id,
        data: {
          title: rp.title || rp.related_paper_id,
          authors: rp.authors || [],
          year: typeof rp.year === 'number' ? rp.year : parseArxivYear(rp.related_paper_id),
          abstract: rp.abstract,
          paperId: rp.related_paper_id,
          kind: 'related',
          pdf_url: rp.pdf_url,
          isNew: Boolean(rp.is_new),
        },
        isSource: false,
        relevanceScore: typeof rp.relevance_score === 'number' ? rp.relevance_score : undefined,
      });
    });

    const allPapers = Array.from(paperMap.values());

    // Create paper nodes (unique per idea) and connect directly to idea
    allPapers.forEach((paper, idx) => {
      const paperNodeId = `paper-${ideaItem.ideaId}-${paper.paperId}`;

      nodes.push({
        id: paperNodeId,
        type: 'paper',
        position: { x: 0, y: 0 },
        data: {
          ...paper.data,
          ownerIdeaId: ideaItem.ideaId,
          paperIndex: idx,
          paperCount: allPapers.length,
          groupId,
          relevanceScore: paper.relevanceScore,
        },
      });

      // Paper connects directly to idea (no hub)
      edges.push({
        id: `e-${ideaNodeId}-${paperNodeId}`,
        source: ideaNodeId,
        target: paperNodeId,
        type: 'floating',
        style: {
          stroke: '#c084fc',
          strokeWidth: 2.2,
          opacity: 0.85,
        },
        data: {
          isSource: paper.isSource,
          relevanceScore: paper.relevanceScore,
          isPaperLink: true,
        },
      });
    });
  });

  return { nodes, edges };
};

// 定义节点类型
const nodeTypes: NodeTypes = {
  idea: IdeaNode,
  paper: PaperNode,
};

// Curved edge
const CurvedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      style={style}
      markerEnd={markerEnd}
    />
  );
};

// Floating edge: connect to nearest node boundary (guaranteed to touch cards)
// Inspired by the official ReactFlow "floating edges" pattern.
// Add padding so edges connect a bit outside the visual card boundary
const DEFAULT_NODE_W = 300;
const DEFAULT_NODE_H = 180;
const EDGE_PADDING = 0;

const getNodeCenter = (node: any) => {
  const w = typeof node.width === 'number' && node.width > 0 ? node.width : DEFAULT_NODE_W;
  const h = typeof node.height === 'number' && node.height > 0 ? node.height : DEFAULT_NODE_H;
  const x = (node.positionAbsolute?.x ?? node.position.x ?? 0) + w / 2;
  const y = (node.positionAbsolute?.y ?? node.position.y ?? 0) + h / 2;
  return { x, y };
};

const getRectIntersectionPoint = (fromNode: any, toNode: any) => {
  const from = getNodeCenter(fromNode);
  const to = getNodeCenter(toNode);

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const w = typeof fromNode.width === 'number' && fromNode.width > 0 ? fromNode.width : DEFAULT_NODE_W;
  const h = typeof fromNode.height === 'number' && fromNode.height > 0 ? fromNode.height : DEFAULT_NODE_H;
  // Add padding to push edge endpoints slightly outside the card boundary
  const halfW = w / 2 + EDGE_PADDING;
  const halfH = h / 2 + EDGE_PADDING;

  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return { x: from.x + dx * scale, y: from.y + dy * scale };
};

/**
 * Floating edge with gentle curve - connects to card boundaries with a subtle,
 * aesthetically pleasing bezier curve (not overly twisted).
 */
const FloatingEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  style,
  markerEnd,
}) => {
  const sourceNode = useStore((s) => s.nodeInternals.get(source));
  const targetNode = useStore((s) => s.nodeInternals.get(target));
  const transform = useStore((s) => s.transform);
  const viewWidth = useStore((s) => s.width);
  const viewHeight = useStore((s) => s.height);

  if (!sourceNode || !targetNode) return null;
  const hasSize = (node: any) =>
    typeof node.width === 'number' &&
    node.width > 0 &&
    typeof node.height === 'number' &&
    node.height > 0;
  // Avoid rendering edges while node sizes are not ready (prevents orphan/short stubs)
  if (!hasSize(sourceNode) || !hasSize(targetNode)) return null;

  const { x: sx, y: sy } = getRectIntersectionPoint(sourceNode, targetNode);
  const { x: tx, y: ty } = getRectIntersectionPoint(targetNode, sourceNode);
  if (![sx, sy, tx, ty].every((v) => Number.isFinite(v))) return null;

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len < 2) return null;

  // Viewport culling: hide edges that don't intersect the visible area.
  // "Both endpoints outside" is not enough — a line can cross the viewport
  // even when both ends are off-screen. We use a proper segment-vs-rect test.
  const [tX, tY, zoom] = transform;
  if (typeof viewWidth === 'number' && typeof viewHeight === 'number') {
    const sxS = sx * zoom + tX;
    const syS = sy * zoom + tY;
    const txS = tx * zoom + tX;
    const tyS = ty * zoom + tY;
    const margin = 80;
    const left = -margin;
    const top = -margin;
    const right = viewWidth + margin;
    const bottom = viewHeight + margin;

    // Quick accept: either endpoint inside viewport
    const sInside = sxS >= left && sxS <= right && syS >= top && syS <= bottom;
    const tInside = txS >= left && txS <= right && tyS >= top && tyS <= bottom;

    if (!sInside && !tInside) {
      // Both endpoints outside — check if segment actually crosses the viewport rect.
      // Liang-Barsky line clipping: if the clipped interval is empty, segment misses the rect.
      const sDx = txS - sxS;
      const sDy = tyS - syS;
      let t0 = 0, t1 = 1;
      const clip = (p: number, q: number) => {
        if (p === 0) return q >= 0; // parallel & outside → miss
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else       { if (r < t0) return false; if (r < t1) t1 = r; }
        return true;
      };
      const visible =
        clip(-sDx, sxS - left) &&
        clip(sDx, right - sxS) &&
        clip(-sDy, syS - top) &&
        clip(sDy, bottom - syS) &&
        t0 <= t1;
      if (!visible) return null;
    }
  }

  // Use a straight segment between the two boundary intersection points.
  const edgePath = `M ${sx} ${sy} L ${tx} ${ty}`;

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      style={style}
      markerEnd={markerEnd}
    />
  );
};

// Straight edge utility (kept for future use)
const StraightEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}) => {
  // Simple straight line from source to target
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      style={style}
      markerEnd={markerEnd}
    />
  );
};

const edgeTypes = {
  curved: CurvedEdge,
  straight: StraightEdge,
  floating: FloatingEdge,
};

const parseCreatedAtMs = (createdAt: string): number => {
  const raw = (createdAt || '').trim();
  if (!raw) return 0;
  const isoLike = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const t = Date.parse(isoLike);
  return Number.isNaN(t) ? 0 : t;
};

const normalizeIdeaKey = (ideaText: string) => {
  return String(ideaText || '').trim().replace(/\s+/g, ' ').toLowerCase();
};

const dedupeUserIdeas = (ideas: ApiUserIdea[]) => {
  // Dedupe by normalized full idea text (backend may return duplicates with different timestamps/ids)
  const byText = new Map<string, ApiUserIdea>();
  ideas.forEach((it) => {
    const key = normalizeIdeaKey(it.idea);
    const prev = byText.get(key);
    if (!prev) {
      byText.set(key, it);
      return;
    }
    const tPrev = parseCreatedAtMs(prev.updateAt || prev.updatedAt || prev.createdAt || '');
    const tNow = parseCreatedAtMs(it.updateAt || it.updatedAt || it.createdAt || '');
    if (tNow > tPrev) {
      byText.set(key, it);
      return;
    }
    if (tNow === tPrev && (it.ideaId || 0) > (prev.ideaId || 0)) {
      byText.set(key, it);
    }
  });

  // Also guard against duplicated ideaId across different texts
  const byId = new Map<number, ApiUserIdea>();
  Array.from(byText.values()).forEach((it) => {
    const prev = byId.get(it.ideaId);
    if (!prev) {
      byId.set(it.ideaId, it);
      return;
    }
    const tPrev = parseCreatedAtMs(prev.updateAt || prev.updatedAt || prev.createdAt || '');
    const tNow = parseCreatedAtMs(it.updateAt || it.updatedAt || it.createdAt || '');
    if (tNow > tPrev) byId.set(it.ideaId, it);
  });

  return Array.from(byId.values());
};

const applySearchToSubgraph = (nodes: Node[], edges: Edge[], searchValue: string) => {
  const q = (searchValue || '').trim().toLowerCase();
  if (!q) return { nodes, edges };

  const matchedNodes = nodes.filter(node => {
    if (node.type === 'idea') {
      const ideaData = node.data as IdeaNodeData;
      return (
        ideaData.label?.toLowerCase().includes(q) ||
        ideaData.description?.toLowerCase().includes(q)
      );
    }
    if (node.type === 'paper') {
      const paperData = node.data as PaperNodeData;
      return (
        paperData.title?.toLowerCase().includes(q) ||
        (paperData.abstract || '').toLowerCase().includes(q)
      );
    }
    return false;
  });

  const matchedNodeIds = matchedNodes.map(n => n.id);
  const relatedEdges = edges.filter(e =>
    matchedNodeIds.includes(e.source) || matchedNodeIds.includes(e.target)
  );

  const relatedNodeIds = new Set<string>();
  matchedNodeIds.forEach(id => relatedNodeIds.add(id));
  relatedEdges.forEach(e => {
    relatedNodeIds.add(e.source);
    relatedNodeIds.add(e.target);
  });

  const relatedNodes = nodes.filter(n => relatedNodeIds.has(n.id));
  return { nodes: relatedNodes, edges: relatedEdges };
};

const clampScore = (value: number) => Math.max(0, Math.min(1, value));

const buildEdgeOffsets = (edges: Edge[]) => edges;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const applyRelevanceFilterToGraph = (nodes: Node[], edges: Edge[], minRelevance: number) => {
  const minScore = clampScore(minRelevance);
  const keepNodeIds = new Set<string>();

  // Always keep idea nodes
  nodes.forEach((n) => {
    if (n.type === 'idea') keepNodeIds.add(n.id);
  });

  // Keep papers based on edge relevance; keep source papers always
  nodes.forEach((n) => {
    if (n.type !== 'paper') return;
    const kind = (n.data as any)?.kind;
    if (kind === 'source') {
      keepNodeIds.add(n.id);
      return;
    }
    const incoming = edges.find((e) => e.target === n.id && Boolean((e.data as any)?.isPaperLink));
    const score = (incoming?.data as any)?.relevanceScore;
    if (typeof score !== 'number' || score >= minScore) {
      keepNodeIds.add(n.id);
    }
  });

  const nextNodes = nodes.filter((n) => keepNodeIds.has(n.id));
  const nextEdges = edges.filter((e) => keepNodeIds.has(e.source) && keepNodeIds.has(e.target));
  return { nodes: nextNodes, edges: nextEdges };
};

/**
 * "Balloon" layout algorithm - optimized for visual aesthetics:
 * 1. Ideas cluster together
 * 2. Papers fan out from each idea in a radial pattern
 * 3. Paper radius auto-adjusts based on paper count
 *
 * Key principles:
 * - Papers spread outward from idea (never toward the center)
 * - More papers = wider paper spread
 */
const createForceLayout = (
  nodes: Node[],
  _edges: Edge[],
  seedIdeaId?: number,
  placementRef?: React.MutableRefObject<Map<number, { x: number; y: number; r: number }>>,
) => {
  if (nodes.length === 0) return nodes;

  // Separate node types
  const ideaNodes = nodes.filter(n => n.type === 'idea');
  const paperNodes = nodes.filter(n => n.type === 'paper');

  // Base layout constants
  const IDEA_SPACING = 900;
  const CARD_RADIUS = 360;
  const CLUSTER_GAP = 800;
  const PAPER_CARD_MIN_SEP = 720;
  const PAPER_DISTANCE_BASE = 480;
  const PAPER_DISTANCE_STEP = 70;
  const CANVAS_CENTER_X = 800;
  const CANVAS_CENTER_Y = 600;

  const positions = new Map<string, { x: number; y: number }>();

  const centerX = CANVAS_CENTER_X;
  const centerY = CANVAS_CENTER_Y;
  const seedId = typeof seedIdeaId === 'number' ? seedIdeaId : undefined;

  const totalIdeasCount = ideaNodes.length;
  const useTriangleLayout = totalIdeasCount >= 3;

  const R0 = 3200;
  const R_STEP = 600;
  const ANGLE_STEPS = 16;

  const getPaperDistance = (paperCount: number) => {
    if (paperCount <= 0) return 0;
    const base = PAPER_DISTANCE_BASE + Math.max(0, paperCount - 8) * PAPER_DISTANCE_STEP;
    if (paperCount <= 1) return base;
    const stepAngle = (2 * Math.PI) / paperCount;
    const minRadiusForSep =
      PAPER_CARD_MIN_SEP / (2 * Math.sin(Math.max(0.08, stepAngle / 2)));
    return Math.max(base, minRadiusForSep);
  };

  const getClusterRadius = (ideaId: number) => {
    const paperCount = paperNodes.filter((p) => (p.data as any).ownerIdeaId === ideaId).length;
    if (paperCount === 0) {
      return CARD_RADIUS + CLUSTER_GAP;
    }
    const paperDistance = getPaperDistance(paperCount);
    return Math.max(CARD_RADIUS, paperDistance + CARD_RADIUS) + CLUSTER_GAP;
  };

  const isFree = (x: number, y: number, r: number, placed: { x: number; y: number; r: number }[]) => {
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < r + p.r) return false;
    }
    return true;
  };

  const findPlacement = (ideaId: number, placed: { x: number; y: number; r: number }[]) => {
    const r = getClusterRadius(ideaId);
    for (let ring = 0; ring < 80; ring++) {
      const radius = R0 + ring * R_STEP;
      for (let i = 0; i < ANGLE_STEPS; i++) {
        const angle = (2 * Math.PI * i) / ANGLE_STEPS + ring * 0.21;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (isFree(x, y, r, placed)) return { x, y, r };
      }
    }
    return { x: centerX + 5000, y: centerY + 5000, r };
  };

  // Place ideas
  // Always use the CURRENT cluster radius (which depends on current paper count)
  // instead of the stale cached radius from placementRef.
  const placedClusters: { x: number; y: number; r: number; ideaId: number }[] = [];

  ideaNodes.forEach((ideaNode) => {
    const ideaId = Number(String(ideaNode.id).replace('idea-', ''));
    const currentR = getClusterRadius(ideaId);

    if (seedId && ideaId === seedId) {
      positions.set(ideaNode.id, { x: centerX, y: centerY });
      const v = { x: centerX, y: centerY, r: currentR };
      if (placementRef) placementRef.current.set(ideaId, v);
      placedClusters.push({ ...v, ideaId });
      return;
    }

    if (seedId) {
      if (placementRef) {
        const existing = placementRef.current.get(ideaId);
        if (existing) {
          // Reuse cached position ONLY if it still satisfies collision constraints
          // (other clusters may have grown since this position was first computed)
          if (isFree(existing.x, existing.y, currentR, placedClusters)) {
            positions.set(ideaNode.id, { x: existing.x, y: existing.y });
            const updated = { x: existing.x, y: existing.y, r: currentR };
            placementRef.current.set(ideaId, updated);
            placedClusters.push({ ...updated, ideaId });
            return;
          }
          // Cached position is no longer valid, fall through to find a new one
        }
      }

      const found = findPlacement(ideaId, placedClusters);
      positions.set(ideaNode.id, { x: found.x, y: found.y });
      const v = { x: found.x, y: found.y, r: currentR };
      if (placementRef) placementRef.current.set(ideaId, v);
      placedClusters.push({ ...v, ideaId });
      return;
    }

    const found = findPlacement(ideaId, placedClusters);
    positions.set(ideaNode.id, { x: found.x, y: found.y });
    const v = { x: found.x, y: found.y, r: currentR };
    if (placementRef) placementRef.current.set(ideaId, v);
    placedClusters.push({ ...v, ideaId });
  });

  if (useTriangleLayout && !seedId) {
    const clusterRadii = ideaNodes.map(n => {
      const id = Number(String(n.id).replace('idea-', ''));
      return getClusterRadius(id);
    });
    const count = ideaNodes.length;
    const halfAngle = Math.sin(Math.PI / count);
    let maxSide = 0;
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      maxSide = Math.max(maxSide, clusterRadii[i] + clusterRadii[j]);
    }
    const polyRadius = maxSide / (2 * halfAngle);
    const angleOffset = -Math.PI / 2;

    ideaNodes.forEach((ideaNode, i) => {
      const ideaId = Number(String(ideaNode.id).replace('idea-', ''));
      const angle = angleOffset + (2 * Math.PI * i) / count;
      const x = centerX + Math.cos(angle) * polyRadius;
      const y = centerY + Math.sin(angle) * polyRadius;
      const r = clusterRadii[i];
      positions.set(ideaNode.id, { x, y });
      if (placementRef) placementRef.current.set(ideaId, { x, y, r });
    });
  }

  // Post-placement validation: ensure ALL pairs satisfy collision constraints.
  // Earlier placement only checks against previously-processed ideas, so
  // an idea placed early (from cache) might conflict with one placed later.
  let changed = true;
  let passes = 0;
  while (changed && passes < 10) {
    changed = false;
    passes++;
    for (let i = 0; i < placedClusters.length; i++) {
      const ci = placedClusters[i];
      for (let j = i + 1; j < placedClusters.length; j++) {
        const cj = placedClusters[j];
        const dist = Math.hypot(ci.x - cj.x, ci.y - cj.y);
        if (dist < ci.r + cj.r) {
          // Conflict: relocate the non-seed cluster
          const toMove = (seedId && ci.ideaId === seedId) ? j : i;
          const mover = placedClusters[toMove];
          const others = placedClusters.filter((_, idx) => idx !== toMove);
          const newPos = findPlacement(mover.ideaId, others);
          mover.x = newPos.x;
          mover.y = newPos.y;
          const ideaNodeId = `idea-${mover.ideaId}`;
          positions.set(ideaNodeId, { x: newPos.x, y: newPos.y });
          if (placementRef) placementRef.current.set(mover.ideaId, { x: newPos.x, y: newPos.y, r: mover.r });
          changed = true;
        }
      }
    }
  }

  ideaNodes.forEach((ideaNode) => {
    const ideaId = Number(String(ideaNode.id).replace('idea-', ''));
    const ideaPos = positions.get(ideaNode.id);
    if (!ideaPos) return;

    const ideaPapers = paperNodes.filter((p) => (p.data as any).ownerIdeaId === ideaId);
    const paperCount = ideaPapers.length;
    const paperDistance = getPaperDistance(paperCount);

    ideaPapers.forEach((paperNode, paperIndex) => {
      const paperAngle =
        paperCount <= 1 ? 0 : (2 * Math.PI * paperIndex) / paperCount;
      const paperX = ideaPos.x + Math.cos(paperAngle) * paperDistance;
      const paperY = ideaPos.y + Math.sin(paperAngle) * paperDistance;
      positions.set(paperNode.id, { x: paperX, y: paperY });
    });
  });

  // Handle any orphan nodes (shouldn't happen, but just in case)
  nodes.forEach((node, index) => {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: CANVAS_CENTER_X + (index % 10) * 200,
        y: CANVAS_CENTER_Y + Math.floor(index / 10) * 200,
      });
    }
  });

  // Apply positions to nodes
  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
  }));
};

const IdeaGraph: React.FC = () => {
  // IMPORTANT: Graph only shows SAVED ideas and their related papers.
  // If user has no saved ideas, graph should be empty (no sample data).
  const location = useLocation();
  const navigate = useNavigate();
  const highlightIdeaId = (location.state as any)?.highlightIdeaId;
  
  const [allIdeasData, setAllIdeasData] = useState<ApiUserIdea[]>([]);
  const ideaToPaperIdsRef = useRef<Map<number, string[]>>(new Map());
  // Idea cluster placement cache: {x,y} center and cluster radius r (used for collision-free layout)
  const placementRef = useRef<Map<number, { x: number; y: number; r: number }>>(new Map());
  const expansionRunRef = useRef(0);
  const autoSelectedRef = useRef(false);
  const highlightHandledRef = useRef<string | null>(null);
  const [loginVersion, setLoginVersion] = useState(0);
  const pendingSelectNewIdeaRef = useRef(false);

  const [rawNodes, setRawNodes] = useState<Node[]>([]);
  const [rawEdges, setRawEdges] = useState<Edge[]>([]);
  const [graphStatus, setGraphStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  const [graphStatusMessage, setGraphStatusMessage] = useState<string>('');

  const [seedIdeaNodeId, setSeedIdeaNodeId] = useState<string>('');
  const [expandedIdeaIds, setExpandedIdeaIds] = useState<number[]>([]);

  const seedIdeaIdNum = useMemo(() => {
    if (!seedIdeaNodeId) return 0;
    const n = Number(seedIdeaNodeId.replace('idea-', ''));
    return Number.isNaN(n) ? 0 : n;
  }, [seedIdeaNodeId]);

  const layoutedNodes = useMemo(
    () => createForceLayout(rawNodes, rawEdges, seedIdeaIdNum || undefined, placementRef),
    [rawNodes, rawEdges, seedIdeaIdNum]
  );
  const layoutedEdges = useMemo(
    () => buildEdgeOffsets(rawEdges),
    [rawEdges]
  );

  const allNodes = layoutedNodes;
  const allEdges = layoutedEdges;

  const [ideaListFilter, setIdeaListFilter] = useState('');
  const [unsavingById, setUnsavingById] = useState<Record<string, boolean>>({});
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [submittingIdea, setSubmittingIdea] = useState(false);
  const NEW_IDEA_MAX_LENGTH = 300;
  const [minRelevanceInput, setMinRelevanceInput] = useState<number>(0);
  const [minRelevanceApplied, setMinRelevanceApplied] = useState<number>(0);
  const relevanceApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const currentZoomRef = useRef(0.95);
  const [currentZoom, setCurrentZoom] = useState(0.95);
  const handleZoomChange = useCallback((z: number) => setCurrentZoom(z), []);
  const showHoverPreview = hoveredNode && !isModalOpen && currentZoom < ZOOM_PREVIEW_THRESHOLD;
  const hasFittedViewRef = useRef(false);
  const pendingFitRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const markingViewedRef = useRef<Set<string>>(new Set());

  const markRelatedPaperViewed = useCallback(async (ideaId: number, relatedPaperId: string) => {
    if (!ideaId || !relatedPaperId) return;
    const key = `${ideaId}:${relatedPaperId}`;
    if (markingViewedRef.current.has(key)) return;
    markingViewedRef.current.add(key);
    try {
      const res = await axios.post('/api/mark_idea_related_paper_viewed', {
        ideaId,
        relatedPaperId,
      });
      if (res.data?.status === 200) {
        setAllIdeasData(prev =>
          prev.map(idea =>
            idea.ideaId === ideaId
              ? {
                  ...idea,
                  relatedPapers: (idea.relatedPapers ?? []).map(rp =>
                    rp.related_paper_id === relatedPaperId ? { ...rp, is_new: false } : rp
                  ),
                }
              : idea
          )
        );
        setRawNodes(prev =>
          prev.map(n => {
            if (
              n.type === 'paper' &&
              (n.data as any)?.ownerIdeaId === ideaId &&
              (n.data as any)?.paperId === relatedPaperId
            ) {
              return { ...n, data: { ...(n.data as any), isNew: false } };
            }
            return n;
          })
        );
        setSelectedNode(prev => {
          if (!prev) return prev;
          const data: any = prev.data || {};
          if (
            prev.type === 'paper' &&
            data.ownerIdeaId === ideaId &&
            data.paperId === relatedPaperId
          ) {
            return { ...prev, data: { ...data, isNew: false } };
          }
          return prev;
        });
      }
    } catch (e) {
      console.error('Failed to mark related paper as viewed:', e);
    } finally {
      markingViewedRef.current.delete(key);
    }
  }, []);

  const visible = useMemo(() => {
    const applied = applySearchToSubgraph(allNodes, allEdges, searchTerm);
    // Safety: ensure no orphan edges (both source and target must exist in nodes)
    const nodeIds = new Set(applied.nodes.map((n) => n.id));
    const safeEdges = applied.edges.filter((e) => {
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
      // Only keep idea -> paper edges (avoid any stale/invalid edge types)
      if (!String(e.source).startsWith('idea-')) return false;
      if (!String(e.target).startsWith('paper-')) return false;
      return true;
    });
    return { nodes: applied.nodes, edges: safeEdges };
  }, [allNodes, allEdges, searchTerm]);

  const renderedNodes = useMemo(() => {
    return visible.nodes.map((n) => ({
      ...n,
      selected: seedIdeaNodeId === n.id,
    }));
  }, [visible.nodes, seedIdeaNodeId]);

  const visibleNodes = visible.nodes;
  const visibleEdges = visible.edges;
  const ideaCount = useMemo(
    () => visibleNodes.filter(n => n.type === 'idea').length,
    [visibleNodes]
  );
  const paperCount = useMemo(
    () => visibleNodes.filter(n => n.type === 'paper').length,
    [visibleNodes]
  );

  const { minRelevanceFloor, maxRelevanceCeil } = useMemo(() => {
    if (!seedIdeaIdNum || !allIdeasData.length) return { minRelevanceFloor: 0, maxRelevanceCeil: 1 };
    const seedIdea = allIdeasData.find(it => it.ideaId === seedIdeaIdNum);
    if (!seedIdea) return { minRelevanceFloor: 0, maxRelevanceCeil: 1 };
    const scores = (seedIdea.relatedPapers ?? [])
      .map(rp => rp.relevance_score)
      .filter((s): s is number => typeof s === 'number');
    if (!scores.length) return { minRelevanceFloor: 0, maxRelevanceCeil: 1 };
    return {
      minRelevanceFloor: Number(clampScore(Math.min(...scores)).toFixed(2)),
      maxRelevanceCeil: Number(clampScore(Math.max(...scores)).toFixed(2)) || 1,
    };
  }, [seedIdeaIdNum, allIdeasData]);

  useEffect(() => {
    return () => {
      if (relevanceApplyTimerRef.current) {
        clearTimeout(relevanceApplyTimerRef.current);
        relevanceApplyTimerRef.current = null;
      }
    };
  }, []);

  const ideasSorted = useMemo(() => {
    const list = allIdeasData.map((ideaItem) => {
      const feasibility = levelFromScore(ideaItem.evaluation?.feasibility_score);
      const novelty = levelFromScore(ideaItem.evaluation?.novelty_score);
      const parsedIdea = parseIdeaTextWithTitle(ideaItem.idea);
      const hasEvaluation = ideaItem.evaluation != null &&
        (typeof ideaItem.evaluation.feasibility_score === 'number' || typeof ideaItem.evaluation.novelty_score === 'number');
      const hasRelatedPapers = Array.isArray(ideaItem.relatedPapers) && ideaItem.relatedPapers.length > 0;
      const hasState = Boolean(ideaItem.state);
      return {
        id: `idea-${ideaItem.ideaId}`,
        ideaId: ideaItem.ideaId,
        label: parsedIdea.title,
        description: parsedIdea.content || ideaItem.idea,
        createdAt: ideaItem.updateAt || ideaItem.updatedAt || ideaItem.createdAt || '',
        feasibility,
        novelty,
        processing: !hasEvaluation && !hasRelatedPapers && !hasState,
        state: ideaItem.state,
      };
    });
    return [...list].sort((a, b) => {
      const ta = parseCreatedAtMs(String(a.createdAt || ''));
      const tb = parseCreatedAtMs(String(b.createdAt || ''));
      if (tb !== ta) return tb - ta;
      return (b.ideaId || 0) - (a.ideaId || 0);
    });
  }, [allIdeasData]);

  const filteredIdeaList = useMemo(() => {
    const q = (ideaListFilter || '').trim().toLowerCase();
    if (!q) return ideasSorted;
    return ideasSorted.filter(n => {
      return (
        String(n.label || '').toLowerCase().includes(q) ||
        String(n.description || '').toLowerCase().includes(q)
      );
    });
  }, [ideasSorted, ideaListFilter]);

  // Listen for login/logout events and refresh data accordingly
  useEffect(() => {
    const sub = PubSub.subscribe('Login Status', (_msg: string, isLoggedIn: boolean) => {
      // Reset all graph state so stale data from previous account is gone
      expansionRunRef.current++;
      setAllIdeasData([]);
      setRawNodes([]);
      setRawEdges([]);
      setSeedIdeaNodeId('');
      setExpandedIdeaIds([]);
      setSearchTerm('');
      ideaToPaperIdsRef.current = new Map();
      placementRef.current = new Map();
      autoSelectedRef.current = false;

      if (isLoggedIn) {
        setLoginVersion((v) => v + 1);
      } else {
        setGraphStatus('idle');
        setGraphStatusMessage('Login to see your saved ideas graph.');
      }
    });
    return () => { PubSub.unsubscribe(sub); };
  }, []);

  // Load graph data from API
  useEffect(() => {
    const loadGraph = async () => {
      // Demo mode: if no login info, silently impersonate a guest account so
      // that the Idea Graph always shows the seeded demo ideas instead of a
      // "please log in" wall. The backend's ensureDemoIdeasFor handles the
      // seeding on first touch.
      let email: string | undefined;
      try {
        const loginInfoStr = localStorage.getItem('loginInfo');
        if (loginInfoStr) {
          const loginInfo = JSON.parse(loginInfoStr);
          email = loginInfo?.email;
        }
      } catch {}
      if (!email) {
        email = 'guest@isuperviz.app';
      }
      try {

        setGraphStatus('loading');
        setGraphStatusMessage('Loading your graph...');

        const res = await axios.post('/api/get_user_all_ideas', { email });
        const data = res.data;
        if (data?.status === 200 && Array.isArray(data.ideas)) {
          const ideasRaw = data.ideas as ApiUserIdea[];

          const ideas = dedupeUserIdeas(ideasRaw);
          // Normalize ideaId and evaluation scores (API may return strings)
          ideas.forEach(it => {
            if (typeof it.ideaId !== 'number') {
              (it as any).ideaId = Number(it.ideaId) || 0;
            }
            if (it.evaluation) {
              const fs = it.evaluation.feasibility_score;
              if (fs !== undefined && fs !== null && typeof fs !== 'number') {
                (it.evaluation as any).feasibility_score = Number(fs);
                if (!Number.isFinite((it.evaluation as any).feasibility_score)) {
                  (it.evaluation as any).feasibility_score = undefined;
                }
              }
              const ns = it.evaluation.novelty_score;
              if (ns !== undefined && ns !== null && typeof ns !== 'number') {
                (it.evaluation as any).novelty_score = Number(ns);
                if (!Number.isFinite((it.evaluation as any).novelty_score)) {
                  (it.evaluation as any).novelty_score = undefined;
                }
              }
            }
            (it.relatedPapers ?? []).forEach(rp => {
              if (rp.relevance_score !== undefined && typeof rp.relevance_score !== 'number') {
                (rp as any).relevance_score = Number(rp.relevance_score);
                if (!Number.isFinite((rp as any).relevance_score)) {
                  (rp as any).relevance_score = undefined;
                }
              }
            });
          });
          if (ideas.length === 0) {
            setGraphStatus('empty');
            setGraphStatusMessage('No saved ideas yet. Save ideas on a paper page, then come back here.');
            setAllIdeasData([]);
            setRawNodes([]);
            setRawEdges([]);
            setSearchTerm('');
            return;
          }

          // Cache all ideas and precompute each idea's paperIds for fast intersection checks
          setAllIdeasData(ideas);
          const ideaToPaperIds = new Map<number, string[]>();
          ideas.forEach((it) => {
            const paperIds: string[] = [];
            const sp = String(it.paperId || '').trim();
            if (sp) paperIds.push(sp);
            (it.relatedPapers ?? []).forEach((rp) => {
              if (rp?.related_paper_id) paperIds.push(rp.related_paper_id);
            });
            const uniq = Array.from(new Set(paperIds.filter(Boolean)));
            ideaToPaperIds.set(it.ideaId, uniq);
          });
          ideaToPaperIdsRef.current = ideaToPaperIds;

          setRawNodes([]);
          setRawEdges([]);
          setSearchTerm('');
          setGraphStatus('ready');
          setGraphStatusMessage('');
        } else {
          setGraphStatus('error');
          setGraphStatusMessage(data?.message || 'Failed to load graph. Please try again later.');
        }
      } catch (e) {
        console.error('Failed to load user graph:', e);
        setGraphStatus('error');
        setGraphStatusMessage('Failed to load graph. Please check your network or API server.');
      }
    };

    loadGraph();
  }, [loginVersion]);

  // Build the currently visible graph from expanded idea ids (incremental reveal).
  useEffect(() => {
    if (graphStatus !== 'ready') return;
    if (!seedIdeaIdNum || allIdeasData.length === 0) {
      setRawNodes([]);
      setRawEdges([]);
      return;
    }
    const expanded = expandedIdeaIds.length ? expandedIdeaIds : [seedIdeaIdNum];
    const expandedSet = new Set<number>(expanded);
    const subset = allIdeasData.filter((it) => expandedSet.has(it.ideaId));
    const graph = buildGraphFromUserIdeas(subset);
    const filtered = applyRelevanceFilterToGraph(graph.nodes, graph.edges, minRelevanceApplied);
    setRawNodes(filtered.nodes);
    setRawEdges(filtered.edges);
    hasFittedViewRef.current = false;
  }, [graphStatus, seedIdeaIdNum, expandedIdeaIds, allIdeasData, minRelevanceApplied]);

  // 点击节点时打开详情弹窗
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsModalOpen(true);

    if (node.type === 'paper') {
      const data: any = node.data || {};
      if (data.isNew) {
        const relatedPaperId = String(data.paperId || '').trim();
        const ownerIdeaId = data.ownerIdeaId;
        if (ownerIdeaId && relatedPaperId && data.kind !== 'source') {
          markRelatedPaperViewed(ownerIdeaId, relatedPaperId);
        }
      }
    }
  }, [markRelatedPaperViewed]);

  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    setHoveredNode(node);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const handleUnsaveIdea = useCallback(async (ideaNodeId: string) => {
    const ideaId = Number(String(ideaNodeId).replace('idea-', ''));
    if (!ideaId || Number.isNaN(ideaId)) {
      message.error('Invalid idea id.');
      return;
    }
    let loginInfo: any = null;
    try {
      const loginInfoStr = localStorage.getItem('loginInfo');
      loginInfo = loginInfoStr ? JSON.parse(loginInfoStr) : null;
    } catch {}
    const email = loginInfo?.email;
    if (!email) {
      message.info('Please login first.');
      return;
    }

    setUnsavingById(prev => ({ ...prev, [ideaNodeId]: true }));
    try {
      const res = await axios.post('/api/unsave_idea', { email, ideaId });
      if (res.data?.status !== 200) {
        message.error(res.data?.message || 'Failed to unsave idea.');
        return;
      }

      // Cancel any running incremental expansion loop
      expansionRunRef.current++;
      setSearchTerm('');

      setAllIdeasData((prev) => {
        const next = prev.filter((it) => it.ideaId !== ideaId);
        if (next.length === 0) {
          setGraphStatus('empty');
          setGraphStatusMessage('No saved ideas yet. Save ideas on a paper page, then come back here.');
          setRawNodes([]);
          setRawEdges([]);
        }
        return next;
      });
      ideaToPaperIdsRef.current.delete(ideaId);
      placementRef.current.delete(ideaId);

      setExpandedIdeaIds((prev) => prev.filter((id) => id !== ideaId));
      if (seedIdeaNodeId === ideaNodeId) {
        setSeedIdeaNodeId('');
        setExpandedIdeaIds([]);
      }

      message.success('Idea removed from saved.');
    } catch (e) {
      console.error('Unsave idea failed:', e);
      message.error('Request failed. Please try again.');
    } finally {
      setUnsavingById(prev => ({ ...prev, [ideaNodeId]: false }));
    }
  }, [seedIdeaNodeId]);

  const handleSubmitNewIdea = useCallback(async () => {
    const text = newIdeaText.trim();
    if (!text) {
      message.info('Please enter your idea.');
      return;
    }
    if (text.length > NEW_IDEA_MAX_LENGTH) {
      message.warning(`Idea is too long (${text.length} chars). Max ${NEW_IDEA_MAX_LENGTH} characters.`);
      return;
    }
    let loginInfo: any = null;
    try {
      const loginInfoStr = localStorage.getItem('loginInfo');
      loginInfo = loginInfoStr ? JSON.parse(loginInfoStr) : null;
    } catch {}
    const email = loginInfo?.email;
    if (!email) {
      message.info('Please login first.');
      return;
    }
    setSubmittingIdea(true);
    try {
      const res = await axios.post('/api/submit_idea', { email, paperId: '', idea: text });
      if (res.data?.status === 200) {
        message.success('Idea submitted!');
        setNewIdeaText('');
        setShowNewIdeaModal(false);
        const reloadRes = await axios.post('/api/get_user_all_ideas', { email });
        if (reloadRes.data?.status === 200 && Array.isArray(reloadRes.data.ideas)) {
          const ideas = dedupeUserIdeas(reloadRes.data.ideas as ApiUserIdea[]);
          ideas.forEach(it => { if (typeof it.ideaId !== 'number') (it as any).ideaId = Number(it.ideaId) || 0; });
          pendingSelectNewIdeaRef.current = true;
          setAllIdeasData(ideas);
          if (ideas.length > 0) {
            setGraphStatus('ready');
          }
        }
      } else {
        message.error(res.data?.message || 'Failed to submit idea.');
      }
    } catch (e) {
      console.error('Submit idea failed:', e);
      message.error('Request failed. Please try again.');
    } finally {
      setSubmittingIdea(false);
    }
  }, [newIdeaText, allIdeasData]);

  const focusOnSeedIdea = useCallback((instance: ReactFlowInstance, seedId: number) => {
    const seedNodeId = `idea-${seedId}`;
    const clusterNodeIds = new Set<string>();
    clusterNodeIds.add(seedNodeId);
    rawNodes.forEach((n) => {
      if (n.type === 'paper' && (n.data as any)?.ownerIdeaId === seedId) {
        clusterNodeIds.add(n.id);
      }
    });
    const clusterNodes = layoutedNodes.filter((n) => clusterNodeIds.has(n.id));
    if (clusterNodes.length > 0) {
      try {
        instance.fitView({ nodes: clusterNodes, padding: 0.05, duration: 800, maxZoom: FIT_VIEW_MAX_ZOOM });
      } catch { /* ignore */ }
    } else {
      const pos = placementRef.current.get(seedId);
      const x = pos ? pos.x : 800;
      const y = pos ? pos.y : 600;
      try {
        instance.setCenter(x, y, { zoom: 0.3, duration: 800 });
      } catch { /* ignore */ }
    }
    pendingFitRef.current = false;
    hasFittedViewRef.current = true;
  }, [rawNodes, layoutedNodes]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);

    if (!hasFittedViewRef.current && instance) {
      requestAnimationFrame(() => {
        if (instance && !hasFittedViewRef.current) {
          if (seedIdeaIdNum) {
            focusOnSeedIdea(instance, seedIdeaIdNum);
          } else {
            instance.fitView({ padding: 0.08, duration: 0, nodes: visibleNodes, maxZoom: FIT_VIEW_MAX_ZOOM });
            hasFittedViewRef.current = true;
          }
        }
      });
    }
  }, [visibleNodes, seedIdeaIdNum, focusOnSeedIdea]);

  // 重置视图 - with immersive zoom animation
  const handleResetView = () => {
    if (reactFlowInstance) {
      const currentViewport = reactFlowInstance.getViewport();
      const zoomOutLevel = Math.max(0.12, currentViewport.zoom * 0.35);
      reactFlowInstance.setViewport(
        { x: currentViewport.x, y: currentViewport.y, zoom: zoomOutLevel },
        { duration: 220 }
      );

      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.12,
          duration: 520,
          nodes: visibleNodes,
          maxZoom: FIT_VIEW_MAX_ZOOM,
        });
      }, 240);
    }
  };

  const startIncrementalExpand = useCallback(async (seedIdeaId: number) => {
    if (!seedIdeaId) return;

    const runId = ++expansionRunRef.current;
    placementRef.current = new Map();

    setSeedIdeaNodeId(`idea-${seedIdeaId}`);
    setExpandedIdeaIds([seedIdeaId]);
    setSearchTerm('');
    const seedIdea = allIdeasData.find(it => it.ideaId === seedIdeaId);
    const allScores = (seedIdea?.relatedPapers ?? [])
      .map(rp => rp.relevance_score)
      .filter((s): s is number => typeof s === 'number');
    const initFloor = allScores.length
      ? Number(clampScore(Math.min(...allScores)).toFixed(2))
      : 0;
    setMinRelevanceInput(initFloor);
    setMinRelevanceApplied(initFloor);
    hasFittedViewRef.current = false;
    pendingFitRef.current = true;

    if (reactFlowInstance) {
      try {
        reactFlowInstance.fitView({ padding: 0.12, duration: 600, maxZoom: FIT_VIEW_MAX_ZOOM });
      } catch { /* ignore */ }
    }

    const seedPaperIds = new Set<string>(ideaToPaperIdsRef.current.get(seedIdeaId) || []);
    if (!seedPaperIds.size) return;

    // Scan other ideas one by one (so UI can update progressively)
    const candidateIds = ideasSorted
      .map((it) => it.ideaId)
      .filter((id) => id !== seedIdeaId);

    for (let i = 0; i < candidateIds.length; i++) {
      if (expansionRunRef.current !== runId) return;
      const otherId = candidateIds[i];
      const otherPaperIds = ideaToPaperIdsRef.current.get(otherId) || [];
      let shares = false;
      for (let j = 0; j < otherPaperIds.length; j++) {
        if (seedPaperIds.has(otherPaperIds[j])) {
          shares = true;
          break;
        }
      }
      if (shares) {
        setExpandedIdeaIds((prev) => (prev.includes(otherId) ? prev : [...prev, otherId]));
        // Give React time to render between additions
        await sleep(120);
      } else if (i % 15 === 0) {
        // Yield occasionally even if no match, to keep UI responsive
        await sleep(0);
      }
    }
  }, [ideasSorted, reactFlowInstance, focusOnSeedIdea, allIdeasData]);

  // Auto-select idea when navigating from Paper page with highlightIdeaId (run once per ID)
  useEffect(() => {
    if (!highlightIdeaId) return;
    if (graphStatus !== 'ready') return;
    if (highlightHandledRef.current === String(highlightIdeaId)) return;
    highlightHandledRef.current = String(highlightIdeaId);
    startIncrementalExpand(Number(highlightIdeaId));
    // Clear navigation state so browser back/forward won't re-trigger
    navigate(location.pathname, { replace: true, state: {} });
  }, [highlightIdeaId, graphStatus, startIncrementalExpand, navigate, location.pathname]);

  // Auto-select newly submitted idea
  useEffect(() => {
    if (!pendingSelectNewIdeaRef.current) return;
    if (graphStatus !== 'ready') return;
    if (!ideasSorted.length) return;
    pendingSelectNewIdeaRef.current = false;
    startIncrementalExpand(ideasSorted[0].ideaId);
  }, [graphStatus, ideasSorted, startIncrementalExpand]);

  // Default: auto-select the first idea when entering graph
  useEffect(() => {
    if (graphStatus !== 'ready') return;
    if (highlightIdeaId) return;
    if (seedIdeaNodeId) return;
    if (autoSelectedRef.current) return;
    if (!ideasSorted.length) return;
    autoSelectedRef.current = true;
    startIncrementalExpand(ideasSorted[0].ideaId);
  }, [graphStatus, highlightIdeaId, seedIdeaNodeId, ideasSorted, startIncrementalExpand]);

  const modalRelatedPapers = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'idea') return [];
    const ideaId = Number(String(selectedNode.id).replace('idea-', ''));
    const idea = allIdeasData.find(it => it.ideaId === ideaId);
    if (!idea) return [];
    return (idea.relatedPapers ?? [])
      .filter(rp => rp.related_paper_id)
      .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
  }, [selectedNode, allIdeasData]);

  const modalSourcePaper = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'idea') return undefined;
    const ideaId = Number(String(selectedNode.id).replace('idea-', ''));
    const idea = allIdeasData.find(it => it.ideaId === ideaId);
    if (!idea) return undefined;
    const paperId = String(idea.paperId || '').trim();
    if (!paperId) return undefined;
    const sp = idea.sourcePaper;
    return { paperId, title: sp?.title, authors: sp?.authors, year: sp?.year, pdf_url: sp?.pdf_url };
  }, [selectedNode, allIdeasData]);

  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
  };

  // 修复ResizeObserver错误
  useEffect(() => {
    const handleResizeObserverError = (e: ErrorEvent) => {
      if (e.message && e.message.includes('ResizeObserver')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    };

    window.addEventListener('error', handleResizeObserverError);

    // 立即设置为准备就绪
    setIsReady(true);

    return () => {
      window.removeEventListener('error', handleResizeObserverError);
    };
  }, []);

  useEffect(() => {
    if (!reactFlowInstance) return;
    if (!searchTerm) return;
    if (pendingFitRef.current) return;
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.08,
        duration: 0,
        nodes: visibleNodes,
        maxZoom: FIT_VIEW_MAX_ZOOM,
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [reactFlowInstance, visibleNodes, searchTerm]);

  // When user selects a seed idea, focus on it after nodes are ready
  useEffect(() => {
    if (!reactFlowInstance) return;
    if (!pendingFitRef.current) return;
    if (!seedIdeaNodeId) return;
    if (!visibleNodes.length) return;

    const timer = setTimeout(() => {
      if (!pendingFitRef.current) return;
      if (seedIdeaIdNum) {
        focusOnSeedIdea(reactFlowInstance, seedIdeaIdNum);
      } else {
        reactFlowInstance.fitView({ padding: 0.16, duration: 420, nodes: visibleNodes, maxZoom: FIT_VIEW_MAX_ZOOM });
        pendingFitRef.current = false;
        hasFittedViewRef.current = true;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [reactFlowInstance, seedIdeaNodeId, seedIdeaIdNum, visibleNodes, focusOnSeedIdea]);

  return (
    <div className={`idea-graph-container ${isMoving ? 'is-moving' : ''}`} ref={containerRef}>
      <HeaderComponent />

      <div className="graph-layout">
        {showNewIdeaModal && (
          <div className="new-idea-modal-overlay" onClick={() => { if (!submittingIdea) setShowNewIdeaModal(false); }}>
            <div className="new-idea-modal" onClick={(e) => e.stopPropagation()}>
              <div className="new-idea-modal-header">
                <span>Submit Your Idea</span>
                <button className="new-idea-modal-close" onClick={() => { if (!submittingIdea) { setShowNewIdeaModal(false); setNewIdeaText(''); } }}>×</button>
              </div>
              <textarea
                className="new-idea-textarea"
                placeholder="Describe your research idea..."
                value={newIdeaText}
                onChange={(e) => { if (e.target.value.length <= NEW_IDEA_MAX_LENGTH) setNewIdeaText(e.target.value); }}
                maxLength={NEW_IDEA_MAX_LENGTH}
                rows={5}
                autoFocus
                disabled={submittingIdea}
              />
              <div className="new-idea-modal-footer">
                <span className={`new-idea-char-count ${newIdeaText.length >= NEW_IDEA_MAX_LENGTH ? 'limit' : ''}`}>
                  {newIdeaText.length}/{NEW_IDEA_MAX_LENGTH}
                </span>
                <button
                  className="new-idea-submit-btn"
                  onClick={handleSubmitNewIdea}
                  disabled={submittingIdea || !newIdeaText.trim()}
                >
                  {submittingIdea ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="idea-list-panel">
          <div className="idea-list-header">
            <div className="idea-list-title">Saved Ideas</div>
            <input
              className="idea-list-search"
              placeholder="Filter ideas..."
              value={ideaListFilter}
              onChange={(e) => setIdeaListFilter(e.target.value)}
            />
            <button
              className="new-idea-btn"
              onClick={() => setShowNewIdeaModal(true)}
            >
              <span className="new-idea-btn-icon">+</span>
              New Idea
            </button>
          </div>

          <div className="idea-state-legend">
            {Object.entries(IDEA_STATE_COLORS).map(([key, val]) => (
              <div key={key} className="idea-state-legend-item">
                <span className="idea-state-dot" style={{ background: val.color }} />
                <span>{val.label}</span>
              </div>
            ))}
          </div>

          <div className="idea-list-items">
            {filteredIdeaList.map((n) => {
              const isSelected = seedIdeaNodeId === n.id;
              const isUnsaving = Boolean(unsavingById[n.id]);
              const stateStyle = getIdeaStateStyle(n.state);
              return (
                <button
                  key={n.id}
                  className={`idea-list-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    startIncrementalExpand(n.ideaId);
                  }}
                  title={String(n.description || '')}
                >
                  <span
                    className={`idea-unsave-btn ${isUnsaving ? 'disabled' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isUnsaving) return;
                      handleUnsaveIdea(String(n.id));
                    }}
                    title="Remove"
                    role="button"
                    aria-label="Remove idea"
                  >
                    <CloseOutlined />
                  </span>
                  <div className="idea-list-item-title">{String(n.label || 'Idea')}</div>
                  <div className="idea-list-item-bottom">
                    <span className="idea-list-item-meta">{String(n.createdAt || '')}</span>
                    {stateStyle && (
                      <span
                        className="idea-state-tag"
                        style={{ color: stateStyle.color, background: stateStyle.bg }}
                      >
                        <span className="idea-state-dot" style={{ background: stateStyle.color }} />
                        {stateStyle.label}
                      </span>
                    )}
                  </div>
                  {n.processing && (
                    <div className="idea-list-item-processing">
                      <LoadingOutlined spin style={{ fontSize: 10, marginRight: 4 }} />
                      Processing
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="graph-area">
          <div className="controls-panel">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search in current graph..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="score-filter">
              <div className="score-filter-label">Filter by Relevance</div>
              <div className="score-filter-slider">
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={minRelevanceInput}
                  onChange={(value) => {
                    if (typeof value !== 'number') return;
                    const v = Math.max(minRelevanceFloor, Math.min(clampScore(value), maxRelevanceCeil));
                    setMinRelevanceInput(v);
                    if (relevanceApplyTimerRef.current) {
                      clearTimeout(relevanceApplyTimerRef.current);
                    }
                    relevanceApplyTimerRef.current = setTimeout(() => {
                      setMinRelevanceApplied(v);
                    }, 120);
                  }}
                  onAfterChange={(value) => {
                    if (typeof value !== 'number') return;
                    const v = Math.max(minRelevanceFloor, Math.min(clampScore(value), maxRelevanceCeil));
                    if (relevanceApplyTimerRef.current) {
                      clearTimeout(relevanceApplyTimerRef.current);
                      relevanceApplyTimerRef.current = null;
                    }
                    setMinRelevanceApplied(v);
                    if (seedIdeaNodeId) {
                      pendingFitRef.current = true;
                      hasFittedViewRef.current = false;
                    }
                  }}
                />
              </div>
              <div className="score-filter-values">
                Showing papers with relevance ≥ {minRelevanceApplied.toFixed(2)}
                <span style={{ marginLeft: 8, color: '#64748b' }}>
                  (range {minRelevanceFloor.toFixed(2)} – {maxRelevanceCeil.toFixed(2)})
                </span>
              </div>
            </div>
            <div className="view-controls">
              <button onClick={handleResetView} className="control-btn">
                Reset View
              </button>
              {searchTerm && (
                <button
                  onClick={() => handleSearch('')}
                  className="control-btn clear-btn"
                >
                  Clear Search
                </button>
              )}
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-color idea-color"></div>
                  <span>Idea</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color paper-color"></div>
                  <span>Paper</span>
                </div>
              </div>
            </div>
          </div>
        {(graphStatus === 'loading' || graphStatus === 'empty' || graphStatus === 'error') && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: 24,
            }}
          >
            <div
              style={{
                maxWidth: 720,
                width: '100%',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
                color: '#334155',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {graphStatus === 'loading'
                  ? 'Loading'
                  : graphStatus === 'empty'
                    ? 'No Data'
                    : 'Error'}
              </div>
              <div>{graphStatusMessage}</div>
              {graphStatus === 'empty' && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#475569' }}>
                  Next step: open any paper, save one or more ideas (⭐), then come back to Graph.
                </div>
              )}
            </div>
          </div>
        )}
        {graphStatus === 'ready' && !seedIdeaNodeId && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: 24,
            }}
          >
            <div
              style={{
                maxWidth: 720,
                width: '100%',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
                color: '#334155',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Select an idea</div>
              <div>Click any idea on the left to start. The graph will expand progressively.</div>
            </div>
          </div>
        )}
        {isReady && (
          <ReactFlow
            key="react-flow-instance"
            nodes={renderedNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onInit={onInit}
            onMoveStart={() => setIsMoving(true)}
            onMoveEnd={() => setIsMoving(false)}
            // 确保fitView在初始化时执行
            fitView={false} // 手动控制fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            // 使用曲线连接
            connectionLineType={ConnectionLineType.Bezier}
            defaultEdgeOptions={{
              type: 'floating',
              animated: false,
              style: {
                stroke: '#667eea',
                strokeWidth: 2,
              },
            }}
            fitViewOptions={{
              padding: 0.08,
              duration: 0,
              maxZoom: FIT_VIEW_MAX_ZOOM,
            }}
            elevateNodesOnSelect={false}
            // 设置一个初始的默认视图，避免完全空白
            defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
            minZoom={0.08}
            // 添加自动适应配置
            proOptions={{ hideAttribution: true }}
          >
            <ZoomWatcher zoomRef={currentZoomRef} onZoomChange={handleZoomChange} />
            <Controls showInteractive={false} />
            <MiniMap
              style={{
                width: 120,
                height: 80,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '8px',
              }}
              pannable
              zoomable
              maskColor="rgba(168, 85, 247, 0.08)"
              maskStrokeColor="#a855f7"
              maskStrokeWidth={2}
              nodeStrokeColor={(n) => {
                if (n.type === 'idea') return '#a855f7';
                if (n.type === 'paper') return '#f472b6';
                return '#94a3b8';
              }}
              nodeColor={(n) => {
                if (n.type === 'idea') return '#a855f7';
                if (n.type === 'paper') return '#f472b6';
                return '#e2e8f0';
              }}
              nodeBorderRadius={2}
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        )}

        {showHoverPreview && hoveredNode.type === 'idea' && (() => {
          const d: any = hoveredNode.data || {};
          return (
            <div className="node-hover-preview">
              <div className="idea-node" style={{ width: '100%', minHeight: 'auto', transform: 'none', cursor: 'default' }}>
                <div className="idea-node-content">
                  <div className="idea-node-header">
                    <div className="node-type-badge idea-badge">IDEA</div>
                    <div className="idea-date">{d.createdAt}</div>
                  </div>
                  <div className="idea-metrics">
                    <div className="metric-item">
                      <span className="metric-label">Feasibility</span>
                      <span className="metric-value">{renderStarsPreview(scoreToStars(d.feasibilityScore), '#52c41a')}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Novelty</span>
                      <span className="metric-value">{renderStarsPreview(scoreToStars(d.noveltyScore), '#fadb14')}</span>
                    </div>
                  </div>
                  <h3 className="idea-title">
                    {hasLatex(d.label) ? <span dangerouslySetInnerHTML={{ __html: latexToHtml(d.label) }} /> : d.label}
                  </h3>
                  {String(d.description || '').trim() && String(d.description || '').trim() !== String(d.label || '').trim() && (
                    <p className="idea-description">{d.description}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {showHoverPreview && hoveredNode.type === 'paper' && (() => {
          const d: any = hoveredNode.data || {};
          const title = d.title || d.paperId || 'Paper';
          return (
            <div className="node-hover-preview">
              <div className="paper-node" style={{ width: '100%', minHeight: 'auto', transform: 'none', cursor: 'default' }}>
                <div className="paper-node-content">
                  <div className="paper-node-header">
                    <div className="node-type-badge paper-badge">PAPER</div>
                    {d.isNew && <span className="paper-new-pill">NEW</span>}
                  </div>
                  <h3 className="paper-title">
                    {hasLatex(title) ? <span dangerouslySetInnerHTML={{ __html: latexToHtml(title) }} /> : title}
                  </h3>
                  {d.abstract && (
                    <div className="paper-abstract-preview">
                      {hasLatex(d.abstract) ? <span dangerouslySetInnerHTML={{ __html: latexToHtml(d.abstract) }} /> : d.abstract}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      </div>

      {isModalOpen && selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setIsModalOpen(false)}
          relatedPapers={modalRelatedPapers}
          sourcePaper={modalSourcePaper}
        />
      )}

      <div className="stats-bar">
        <span className="stat-ideas">Ideas: {ideaCount}</span>
        <span className="stat-papers">Papers: {paperCount}</span>
        <span className="stat-tip">Tip: click one idea to expand progressively</span>
      </div>
    </div>
  );
};

export default IdeaGraph;