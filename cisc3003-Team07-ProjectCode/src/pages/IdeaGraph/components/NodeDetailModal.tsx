import React, { useState } from 'react';
import { Node } from 'reactflow';
import { useNavigate } from 'react-router-dom';
import { StarFilled, StarOutlined, LoadingOutlined, LikeOutlined, DislikeOutlined } from '@ant-design/icons';
import axios from 'axios';
import { latexToHtml, hasLatex } from '../../../utils/latex';

interface ActionRelatedIdea {
  ideaId?: number;
  ideaContent?: string;
  paperId?: string;
  sourceType?: string;
  createdAt?: string;
}

interface ActionRelatedPaper {
  paperId?: string;
  title?: string;
  url?: string;
}

interface ActionHistoryItem {
  actionType?: string;
  description?: string;
  createdAt?: string;
  relatedPaper?: ActionRelatedPaper;
  relatedPaperId?: string;
  relatedPaperTitle?: string;
  relatedIdea?: ActionRelatedIdea;
}

interface RelatedPaperData {
  related_paper_id: string;
  title?: string;
  abstract?: string;
  pdf_url?: string;
  relevance_score?: number;
  authors?: string[];
  year?: number;
  is_new?: boolean;
}

interface SourcePaperData {
  paperId: string;
  title?: string;
  authors?: string[] | string;
  year?: number;
  pdf_url?: string;
}

interface NodeDetailModalProps {
  node: Node;
  onClose: () => void;
  relatedPapers?: RelatedPaperData[];
  sourcePaper?: SourcePaperData;
}

const STATE_MAP: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  budding:           { label: 'Budding',           desc: 'Newly formed, unverified',          color: '#3a9a3a', bg: '#e6f9e6' },
  developing:        { label: 'Developing',        desc: 'Actively refined, taking shape',    color: '#b8860b', bg: '#fff8dc' },
  mature:            { label: 'Mature',             desc: 'Well-tested, stable and reliable',  color: '#2E8B57', bg: '#e0f2eb' },
  obsolete:          { label: 'Obsolete',           desc: 'May be outdated, needs revisiting', color: '#707070', bg: '#f0f0f0' },
};

const getStateInfo = (state?: string) => {
  if (!state) return null;
  const s = state.toLowerCase().trim();
  if (STATE_MAP[s]) return STATE_MAP[s];
  for (const key of Object.keys(STATE_MAP)) {
    if (s.includes(key)) return STATE_MAP[key];
  }
  return { label: state, desc: '', color: '#64748b', bg: '#f1f5f9' };
};

const getActionTypeStyle = (actionType?: string) => {
  if (!actionType) return { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' };
  const t = actionType.toLowerCase();
  if (t === 'strengthen' || t === 'support')
    return { bg: '#d1fae5', text: '#059669', dot: '#10b981' };
  if (t === 'pivot' || t === 'challenge' || t === 'contradict')
    return { bg: '#fce7f3', text: '#db2777', dot: '#ec4899' };
  if (t === 'extend' || t === 'evolve' || t === 'refine')
    return { bg: '#dbeafe', text: '#2563eb', dot: '#3b82f6' };
  if (t === 'combine' || t === 'merge')
    return { bg: '#ede9fe', text: '#7c3aed', dot: '#8b5cf6' };
  return { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' };
};

const CollapsibleIdea: React.FC<{ idea: ActionRelatedIdea }> = ({ idea }) => {
  const [expanded, setExpanded] = useState(false);
  const content = idea.ideaContent || '';
  const preview = content.length > 80 ? content.slice(0, 80) + '...' : content;

  return (
    <div style={{
      marginTop: 8,
      padding: '8px 10px',
      background: '#f8fafc',
      borderRadius: 8,
      border: '1px solid #e2e8f0',
      fontSize: 14,
    }}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: content.length > 80 ? 'pointer' : 'default' }}
        onClick={() => content.length > 80 && setExpanded(prev => !prev)}
      >
        <span style={{ color: '#8b5cf6', fontWeight: 600, flexShrink: 0, fontSize: 13 }}>Related Idea</span>
        {content.length > 80 && (
          <span style={{ color: '#94a3b8', fontSize: 11, flexShrink: 0 }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
      <div style={{ marginTop: 4, color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}>
        {expanded ? content : preview}
      </div>
    </div>
  );
};

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose, relatedPapers = [], sourcePaper }) => {
  const isIdea = node.type === 'idea';
  const data = node.data || {};
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'papers'>('overview');
  const [papersPage, setPapersPage] = useState(1);
  const PAPERS_PER_PAGE = 10;
  const ideaKey = String(data.ideaId ?? data.id ?? node.id);
  const [votedTracking, setVotedTracking] = useState<Set<number>>(() => {
    try {
      const stored = sessionStorage.getItem(`votedTracking_${ideaKey}`);
      return stored ? new Set(JSON.parse(stored) as number[]) : new Set();
    } catch { return new Set(); }
  });
  const [animatingTracking, setAnimatingTracking] = useState<{ idx: number; like: boolean } | null>(null);

  const handleTrackingFeedback = async (idx: number, like: number, action: ActionHistoryItem) => {
    setAnimatingTracking({ idx, like: like === 1 });
    try {
      const loginInfoStr = localStorage.getItem('loginInfo');
      const loginInfo = loginInfoStr ? JSON.parse(loginInfoStr) : null;
      await axios.post('/api/feedback', {
        action_type: 'idea_tracking',
        like,
        idea_id: data.ideaId ?? data.id ?? null,
        history_id: idx,
        content: action.description || '',
        event_type: action.actionType || '',
        email: loginInfo?.email || '',
      });
    } catch {}
    setTimeout(() => {
      setVotedTracking(prev => {
        const next = new Set(prev).add(idx);
        try { sessionStorage.setItem(`votedTracking_${ideaKey}`, JSON.stringify(Array.from(next))); } catch {}
        return next;
      });
      setAnimatingTracking(null);
    }, 600);
  };

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
      return <span style={{ fontSize: 12, color: '#999' }}>--</span>;
    }
    const full = Math.floor(value);
    const hasHalf = value - full >= 0.5;
    const empty = Math.max(0, 5 - full - (hasHalf ? 1 : 0));
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        {Array.from({ length: full }).map((_, i) => (
          <StarFilled key={`f-${i}`} style={{ color, fontSize: 15 }} />
        ))}
        {hasHalf && (
          <StarFilled style={{ color, fontSize: 15, opacity: 0.5 }} />
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <StarOutlined key={`e-${i}`} style={{ color: '#d9d9d9', fontSize: 15 }} />
        ))}
      </span>
    );
  };

  const actionHistory: ActionHistoryItem[] = Array.isArray(data.actionHistory)
    ? [...data.actionHistory].sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      })
    : [];

  const stateInfo = getStateInfo(data.state);

  const handlePaperClick = async (paperId?: string, paperTitle?: string) => {
    if (!paperId) return;
    let loginInfo: any = null;
    try {
      const loginInfoStr = localStorage.getItem('loginInfo');
      loginInfo = loginInfoStr ? JSON.parse(loginInfoStr) : null;
    } catch {}
    const email = loginInfo?.email;

    try {
      if (email) {
        const res = await axios.post('/api/get_paper_info', {
          page: 1,
          email,
          pageSize: 10,
          favorite: loginInfo?.favorite || '',
          filterFavorite: false,
          searchWord: String(paperId),
        });
        const list = Array.isArray(res.data?.paperList) ? res.data.paperList : [];
        const exact =
          list.find((p: any) => String(p?.paper_id) === String(paperId)) ||
          list.find((p: any) => typeof p?.pdf_url === 'string' && p.pdf_url.includes(String(paperId))) ||
          null;
        if (exact) {
          sessionStorage.setItem('returningFromNotes', 'true');
          navigate('/reflectiveNotes', { state: { item: exact } });
          onClose();
          return;
        }
      }
    } catch (e) {
      console.error('Failed to resolve paper:', e);
    }

    sessionStorage.setItem('returningFromNotes', 'true');
    navigate('/reflectiveNotes', {
      state: {
        item: {
          paper_id: paperId,
          title: paperTitle || paperId,
          author: '',
          abstract: '',
          pdf_url: '',
        }
      }
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${isIdea ? 'idea-modal' : 'paper-modal'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isIdea ? 'Idea Details' : 'Paper Details'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {isIdea ? (
            <>
              {relatedPapers.length > 0 && (
                <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
                  {(['overview', 'papers'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '10px 20px',
                        fontSize: 14,
                        fontWeight: activeTab === tab ? 600 : 400,
                        color: activeTab === tab ? '#7c3aed' : '#64748b',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === tab ? '2px solid #7c3aed' : '2px solid transparent',
                        marginBottom: -2,
                        cursor: 'pointer',
                      }}
                    >
                      {tab === 'overview' ? 'Overview' : `Related Papers (${relatedPapers.length})`}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'overview' ? (
              <>
              <div className="detail-section">
                <h3>{data.label}</h3>
                {String(data.description || '').trim() &&
                  String(data.description || '').trim() !== String(data.label || '').trim() && (
                    <p className="description-text">{data.description}</p>
                  )}
              </div>

              <div className="metrics-row">
                <div className="metric-box">
                  <span className="metric-label">Feasibility</span>
                  <span className="metric-value">
                    {renderStars(scoreToStars(data.feasibilityScore), '#52c41a')}
                  </span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Novelty</span>
                  <span className="metric-value">
                    {renderStars(scoreToStars(data.noveltyScore), '#9254de')}
                  </span>
                </div>
              </div>
              {typeof data.feasibilityScore !== 'number' && typeof data.noveltyScore !== 'number' && (
                <div style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#a78bfa',
                  fontStyle: 'italic',
                }}>
                  <LoadingOutlined spin style={{ fontSize: 12 }} />
                  System is processing this new idea
                </div>
              )}

              <div className="date-section">
                <span className="date-label">Created</span>
                <span className="date-value">{data.createdAt}</span>
              </div>

              {stateInfo && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid #e2e8f0',
                }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>State</span>
                  <span style={{
                    fontSize: 12,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: stateInfo.bg,
                    color: stateInfo.color,
                  }}>
                    <span style={{ fontWeight: 600 }}>{stateInfo.label}</span>
                    {stateInfo.desc && (
                      <span style={{ fontWeight: 400 }}>{' - '}{stateInfo.desc}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Action History Timeline */}
              {actionHistory.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: 14,
                    paddingBottom: 8,
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    Evolution Timeline
                  </div>
                  <div style={{ position: 'relative', paddingLeft: 20 }}>
                    {/* Vertical line */}
                    <div style={{
                      position: 'absolute',
                      left: 6,
                      top: 4,
                      bottom: 4,
                      width: 2,
                      background: '#e2e8f0',
                      borderRadius: 1,
                    }} />

                    {actionHistory.map((action, idx) => {
                      const typeStyle = getActionTypeStyle(action.actionType);
                      return (
                        <div key={idx} style={{ position: 'relative', marginBottom: idx < actionHistory.length - 1 ? 20 : 0 }}>
                          {/* Dot */}
                          <div style={{
                            position: 'absolute',
                            left: -17,
                            top: 4,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: typeStyle.dot,
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 2px ' + typeStyle.dot + '40',
                          }} />

                          {/* Action content */}
                          <div style={{
                            background: '#fafbfc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: '12px 14px',
                          }}>
                            {/* Header: type badge + date */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              {action.actionType && (
                                <span style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: '3px 10px',
                                  borderRadius: 999,
                                  background: typeStyle.bg,
                                  color: typeStyle.text,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                }}>
                                  {action.actionType}
                                </span>
                              )}
                              {action.createdAt && (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                  {action.createdAt}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {action.description && (
                              <div style={{
                                fontSize: 14,
                                color: '#475569',
                                lineHeight: 1.6,
                                wordBreak: 'break-word',
                              }}>
                                {action.description}
                              </div>
                            )}

                            {/* Related Paper */}
                            {(action.relatedPaper?.title || action.relatedPaperTitle) && (
                              <div style={{
                                marginTop: 8,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 6,
                              }}>
                                <span style={{ fontSize: 13, color: '#3b82f6', flexShrink: 0, fontWeight: 600 }}>📄</span>
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: '#3b82f6',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    textDecorationColor: '#93c5fd',
                                    wordBreak: 'break-word',
                                  }}
                                  onClick={() => handlePaperClick(
                                    action.relatedPaper?.paperId || action.relatedPaperId,
                                    action.relatedPaper?.title || action.relatedPaperTitle,
                                  )}
                                >
                                  {action.relatedPaper?.title || action.relatedPaperTitle}
                                </span>
                              </div>
                            )}

                            {/* Related Idea (collapsible) */}
                            {action.relatedIdea?.ideaContent && (
                              <CollapsibleIdea idea={action.relatedIdea} />
                            )}

                            {/* Feedback: like / dislike */}
                            {!votedTracking.has(idx) && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 4,
                                marginTop: 10,
                                paddingTop: 8,
                                borderTop: '1px solid #f0f0f0',
                              }}>
                                {animatingTracking?.idx === idx ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', fontSize: 16,
                                    color: animatingTracking.like ? '#10b981' : '#ef4444',
                                    animation: 'feedbackPop 0.6s ease forwards',
                                  }}>
                                    {animatingTracking.like ? <LikeOutlined /> : <DislikeOutlined />}
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleTrackingFeedback(idx, 1, action); }}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '4px 10px', borderRadius: 6,
                                        border: '1px solid #e2e8f0', background: '#fff',
                                        cursor: 'pointer', fontSize: 13, color: '#64748b',
                                        transition: 'all 0.2s',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                                    >
                                      <LikeOutlined />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleTrackingFeedback(idx, 0, action); }}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '4px 10px', borderRadius: 6,
                                        border: '1px solid #e2e8f0', background: '#fff',
                                        cursor: 'pointer', fontSize: 13, color: '#64748b',
                                        transition: 'all 0.2s',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                                    >
                                      <DislikeOutlined />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </>
              ) : (
              (() => {
                const totalPages = Math.ceil(relatedPapers.length / PAPERS_PER_PAGE);
                const pageItems = relatedPapers.slice((papersPage - 1) * PAPERS_PER_PAGE, papersPage * PAPERS_PER_PAGE);
                const globalOffset = (papersPage - 1) * PAPERS_PER_PAGE;
                return (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {relatedPapers.length} papers sorted by relevance
                  </div>
                </div>

                {/* Paper list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pageItems.map((rp, idx) => {
                    const rank = globalOffset + idx + 1;
                    const score = rp.relevance_score;
                    const hasScore = typeof score === 'number';
                    const scoreBg = hasScore ? (score >= 0.7 ? '#dcfce7' : score >= 0.4 ? '#fef3c7' : '#fee2e2') : '#f1f5f9';
                    const scoreColor = hasScore ? (score >= 0.7 ? '#16a34a' : score >= 0.4 ? '#ca8a04' : '#dc2626') : '#94a3b8';
                    return (
                    <div
                      key={rp.related_paper_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', borderRadius: 10,
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#c084fc';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(168,85,247,0.08)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => handlePaperClick(rp.related_paper_id, rp.title)}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: rank <= 10 ? 'linear-gradient(135deg, #f472b6, #fb923c)' : '#e2e8f0',
                        color: rank <= 10 ? '#fff' : '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>{rank}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 500, color: '#1e293b', lineHeight: 1.4,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                          overflow: 'hidden',
                        }}>
                          {hasLatex(rp.title || '') ? (
                            <span dangerouslySetInnerHTML={{ __html: latexToHtml(rp.title || rp.related_paper_id) }} />
                          ) : (rp.title || rp.related_paper_id)}
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                          {(rp.authors || []).slice(0, 3).join(', ')}{(rp.authors || []).length > 3 ? ' et al.' : ''}
                          {rp.year ? ` · ${rp.year}` : ''}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px', borderRadius: 999,
                        background: scoreBg, color: scoreColor,
                        fontSize: 12, fontWeight: 600, flexShrink: 0,
                      }}>
                        {hasScore ? score.toFixed(2) : '—'}
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    gap: 6, marginTop: 16, paddingTop: 14,
                    borderTop: '1px solid #e2e8f0',
                  }}>
                    <button
                      disabled={papersPage <= 1}
                      onClick={() => setPapersPage(p => Math.max(1, p - 1))}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: papersPage <= 1 ? '#cbd5e1' : '#475569',
                        cursor: papersPage <= 1 ? 'default' : 'pointer',
                        fontSize: 13, fontWeight: 500,
                      }}
                    >←</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - papersPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        typeof item === 'string' ? (
                          <span key={`dot-${i}`} style={{ color: '#94a3b8', fontSize: 12, padding: '0 2px' }}>…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setPapersPage(item)}
                            style={{
                              width: 32, height: 32, borderRadius: 8,
                              border: item === papersPage ? '1px solid #a855f7' : '1px solid #e2e8f0',
                              background: item === papersPage ? '#f5f3ff' : '#fff',
                              color: item === papersPage ? '#7c3aed' : '#475569',
                              cursor: 'pointer', fontSize: 13, fontWeight: item === papersPage ? 700 : 400,
                            }}
                          >{item}</button>
                        )
                      )
                    }
                    <button
                      disabled={papersPage >= totalPages}
                      onClick={() => setPapersPage(p => Math.min(totalPages, p + 1))}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: papersPage >= totalPages ? '#cbd5e1' : '#475569',
                        cursor: papersPage >= totalPages ? 'default' : 'pointer',
                        fontSize: 13, fontWeight: 500,
                      }}
                    >→</button>
                  </div>
                )}
              </div>
                );
              })()
              )}
            </>
          ) : (
            <>
              <div className="detail-section">
                <h3>
                  {hasLatex(data.title || data.paperId || '') ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: latexToHtml(data.title || data.paperId || 'Paper'),
                      }}
                    />
                  ) : (
                    data.title || data.paperId || 'Paper'
                  )}
                </h3>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 14 }}>
                    Year: {data.year || '-'}
                  </div>
                  <button
                    className="control-btn"
                    onClick={async () => {
                      const paperId = data.paperId || data.title;
                      if (!paperId) return;

                      let loginInfo: any = null;
                      try {
                        const loginInfoStr = localStorage.getItem('loginInfo');
                        loginInfo = loginInfoStr ? JSON.parse(loginInfoStr) : null;
                      } catch {}
                      const email = loginInfo?.email;

                      try {
                        if (email) {
                          const res = await axios.post('/api/get_paper_info', {
                            page: 1,
                            email,
                            pageSize: 10,
                            favorite: loginInfo?.favorite || '',
                            filterFavorite: false,
                            searchWord: String(paperId),
                          });
                          const list = Array.isArray(res.data?.paperList) ? res.data.paperList : [];
                          const exact =
                            list.find((p: any) => String(p?.paper_id) === String(paperId)) ||
                            list.find((p: any) => typeof p?.pdf_url === 'string' && p.pdf_url.includes(String(paperId))) ||
                            list.find((p: any) => typeof p?.title === 'string' && p.title === String(data.title)) ||
                            null;

                          if (exact) {
                            sessionStorage.setItem('returningFromNotes', 'true');
                            navigate('/reflectiveNotes', { state: { item: exact } });
                            onClose();
                            return;
                          }
                        }
                      } catch (e) {
                        console.error('Failed to resolve paper by id:', e);
                      }

                      sessionStorage.setItem('returningFromNotes', 'true');
                      navigate('/reflectiveNotes', {
                        state: {
                          item: {
                            paper_id: paperId,
                            title: data.title || paperId,
                            author: Array.isArray(data.authors) ? data.authors.join(', ') : '',
                            abstract: data.abstract || '',
                            pdf_url: data.pdf_url || '',
                          }
                        }
                      });
                      onClose();
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Open Thinking Notes
                  </button>
                </div>
              </div>

              {data.abstract && (
                <div className="paper-abstract-section">
                  <h4>Abstract</h4>
                  <p
                    className="paper-abstract-text"
                    {...(hasLatex(data.abstract)
                      ? { dangerouslySetInnerHTML: { __html: latexToHtml(data.abstract) } }
                      : { children: data.abstract })}
                  />
                </div>
              )}
              {!data.abstract && (
                <div className="paper-abstract-section">
                  <h4>Abstract</h4>
                  <p className="paper-abstract-text">
                    Abstract is not available (not returned by the API).
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeDetailModal;
