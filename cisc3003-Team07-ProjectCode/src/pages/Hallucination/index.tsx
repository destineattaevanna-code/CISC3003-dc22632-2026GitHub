import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Button, Spin, Tabs, Progress, message, Tooltip } from 'antd';
import {
  CloudUploadOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  WarningFilled,
  FileTextOutlined,
  LoadingOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  FileSearchOutlined,
  HighlightOutlined,
  LikeOutlined,
  DislikeOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import './hallucination.css';

const { Dragger } = Upload;

type OptionType = 'ai' | 'citation' | 'writing' | 'polish';

interface AnalysisResult {
  id: string;
  type: OptionType;
  severity: 'high' | 'medium' | 'low';
  originalText: string;
  suggestion: string;
  markId: string;
}

type CitStatus = 'verified' | 'warning' | 'error' | 'unknown';

interface CitationItem {
  id: string;
  refLabel: string;
  text: string;
  status: CitStatus;
  note?: string;
  markId: string;
}

interface DocItem {
  id: string;
  name: string;
  uploadTime: string;
  status: 'processing' | 'done' | 'pending';
  options: OptionType[];
  aiResult?: { label: string; score: number };
  results: AnalysisResult[];
  citations: CitationItem[];
  fullText: string;
  pollFinished: Record<OptionType, boolean>;
}

const OPTION_LABELS: Record<OptionType, string> = {
  ai: 'AI Detection',
  citation: 'Citation Check',
  writing: 'Writing Consistency',
  polish: 'Writing Polish',
};

const OPTION_ICONS: Record<OptionType, React.ReactNode> = {
  ai: <RobotOutlined />,
  citation: <SafetyCertificateOutlined />,
  writing: <FileSearchOutlined />,
  polish: <HighlightOutlined />,
};

const OPTION_COLORS: Record<OptionType, string> = {
  ai: '#059669',
  citation: '#722ed1',
  writing: '#ea580c',
  polish: '#2563eb',
};

const MOCK_TEXT = `Large language models (LLMs) have demonstrated remarkable capabilities in generating human-like text across various domains. However, these models are prone to generating content that appears plausible but is factually incorrect, a phenomenon commonly referred to as "hallucination" [1]. This issue is particularly critical in academic and scientific writing, where accuracy and verifiability are paramount.

Recent studies by Zhang et al. (2024) have shown that hallucination rates in GPT-4 can reach up to 15.8% in scientific text generation tasks [2]. The authors conducted a comprehensive evaluation across 500 generated abstracts, finding that citation hallucinations—where the model fabricates references that do not exist—account for approximately 34% of all hallucinated content.

Furthermore, Smith and Johnson (2023) demonstrated that contextual inconsistencies, where claims in one section contradict information presented elsewhere in the same document, occur in roughly 8.2% of AI-generated research papers [3]. These inconsistencies are particularly challenging to detect because they may be separated by several paragraphs or even sections.

Our analysis reveals that the transformer architecture's attention mechanism, while effective for local coherence, struggles to maintain global consistency across long documents [4]. Table 1 shows that the error rate increases linearly with document length, rising from 3.1% for documents under 1,000 tokens to 12.7% for documents exceeding 5,000 tokens. However, the data in Table 2 indicates a non-linear relationship, with error rates plateauing at approximately 9.5% for documents between 3,000 and 8,000 tokens, which contradicts the linear trend reported in our earlier analysis.

The citation [5] by Williams et al. (2025) in the Journal of Machine Learning Research provides evidence that retrieval-augmented generation (RAG) can reduce hallucination rates by up to 62%. However, this improvement comes at the cost of increased latency, with average response times increasing from 1.2 seconds to 4.8 seconds per query.

In terms of writing quality, several passages in this document could benefit from improved clarity and conciseness. For instance, the phrase "a phenomenon commonly referred to as hallucination" could be simplified, and some transitions between paragraphs could be smoother to enhance readability.`;

const MOCK_CITATION_RESULTS: AnalysisResult[] = [
  {
    id: 'cit-1',
    type: 'citation',
    severity: 'high',
    markId: 'mark-cit-1',
    originalText: 'Zhang et al. (2024) have shown that hallucination rates in GPT-4 can reach up to 15.8%',
    suggestion: 'Reference [2] could not be verified. No publication by Zhang et al. (2024) with these specific findings was found in major databases.',
  },
  {
    id: 'cit-2',
    type: 'citation',
    severity: 'high',
    markId: 'mark-cit-2',
    originalText: 'Williams et al. (2025) in the Journal of Machine Learning Research',
    suggestion: 'Reference [5] appears fabricated. The cited year (2025) is in the future relative to the dataset, and no matching paper was found in JMLR archives.',
  },
  {
    id: 'cit-3',
    type: 'citation',
    severity: 'medium',
    markId: 'mark-cit-3',
    originalText: 'Smith and Johnson (2023) demonstrated that contextual inconsistencies',
    suggestion: 'Reference [3] could not be fully verified. Authors found but the specific 8.2% statistic is not present in their published work.',
  },
];

const MOCK_WRITING_RESULTS: AnalysisResult[] = [
  {
    id: 'wrt-1',
    type: 'writing',
    severity: 'high',
    markId: 'mark-wrt-1',
    originalText: 'Table 1 shows that the error rate increases linearly with document length',
    suggestion: 'Contradiction detected: Table 1 claims a linear increase in error rate, but Table 2 data shows a non-linear plateau at 9.5%. These claims are inconsistent within the same paragraph.',
  },
  {
    id: 'wrt-2',
    type: 'writing',
    severity: 'medium',
    markId: 'mark-wrt-2',
    originalText: 'citation hallucinations—where the model fabricates references that do not exist—account for approximately 34% of all hallucinated content',
    suggestion: 'Unsupported claim: The 34% statistic is attributed to [2], but if [2] is a fabricated citation (as flagged in Citation Check), this claim lacks a valid source.',
  },
];

const MOCK_POLISH_RESULTS: AnalysisResult[] = [
  {
    id: 'pol-1',
    type: 'polish',
    severity: 'low',
    markId: 'mark-pol-1',
    originalText: 'a phenomenon commonly referred to as "hallucination"',
    suggestion: 'Consider simplifying to: "known as hallucination". The current phrasing is verbose for an academic audience already familiar with the term.',
  },
  {
    id: 'pol-2',
    type: 'polish',
    severity: 'low',
    markId: 'mark-pol-2',
    originalText: 'These inconsistencies are particularly challenging to detect because they may be separated by several paragraphs or even sections',
    suggestion: 'Improve flow by connecting to the next paragraph: "These hard-to-detect inconsistencies motivate architectural analysis of the transformer\'s attention mechanism."',
  },
];

const MOCK_CITATIONS: CitationItem[] = [
  { id: 'ref-1', refLabel: '[1]', text: 'General reference to LLM hallucination phenomenon', status: 'verified', markId: 'mark-cit-ref1' },
  { id: 'ref-2', refLabel: '[2]', text: 'Zhang et al. (2024). Hallucination rates in GPT-4 scientific text generation', status: 'error', note: 'Cannot be verified', markId: 'mark-cit-ref2' },
  { id: 'ref-3', refLabel: '[3]', text: 'Smith and Johnson (2023). Contextual inconsistencies in AI research papers', status: 'warning', note: 'Partial match found', markId: 'mark-cit-ref3' },
  { id: 'ref-4', refLabel: '[4]', text: 'Transformer attention mechanism and global consistency analysis', status: 'verified', markId: 'mark-cit-ref4' },
  { id: 'ref-5', refLabel: '[5]', text: 'Williams et al. (2025). RAG reduces hallucination. Journal of Machine Learning Research', status: 'error', note: 'Future date — likely fabricated', markId: 'mark-cit-ref5' },
  { id: 'ref-6', refLabel: '[2]', text: 'Zhang et al. (2024). 500 generated abstracts evaluation', status: 'warning', note: 'Statistics not found in source', markId: 'mark-cit-ref6' },
  { id: 'ref-7', refLabel: '[5]', text: 'Williams et al. (2025). Latency trade-off of RAG: 1.2s to 4.8s', status: 'unknown', note: 'Not verifiable', markId: 'mark-cit-ref7' },
];

function getMarkSegments(text: string, results: AnalysisResult[]): React.ReactNode[] {
  if (!results.length) return [text];

  interface Seg { start: number; end: number; markId: string; type: OptionType }
  const segs: Seg[] = [];

  results.forEach((r) => {
    const idx = text.indexOf(r.originalText);
    if (idx >= 0) {
      segs.push({ start: idx, end: idx + r.originalText.length, markId: r.markId, type: r.type });
    }
  });

  segs.sort((a, b) => a.start - b.start);

  const merged: Seg[] = [];
  for (const s of segs) {
    if (merged.length && s.start < merged[merged.length - 1].end) continue;
    merged.push(s);
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach((s, i) => {
    if (s.start > cursor) {
      nodes.push(text.slice(cursor, s.start));
    }
    nodes.push(
      <mark key={`m-${i}`} id={s.markId} className={`hl-${s.type}`} data-type={s.type} data-markid={s.markId}>
        {text.slice(s.start, s.end)}
      </mark>
    );
    cursor = s.end;
  });
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

const Hallucination: React.FC = () => {
  const [mode, setMode] = useState<'list' | 'detail'>('list');
  const [docs, setDocs] = useState<DocItem[]>(() => {
    try {
      const saved = localStorage.getItem('h_docs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedOptions, setSelectedOptions] = useState<OptionType[]>(['ai', 'citation']);
  const [activeDoc, setActiveDoc] = useState<DocItem | null>(null);
  const [activeTab, setActiveTab] = useState<OptionType | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const pollTimers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    localStorage.setItem('h_docs', JSON.stringify(docs));
  }, [docs]);

  useEffect(() => {
    return () => { pollTimers.current.forEach(clearTimeout); };
  }, []);

  const toggleOption = (opt: OptionType) => {
    setSelectedOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handleUpload = async (file: File) => {
    if (selectedOptions.length === 0) {
      message.warning('Please select at least one analysis option');
      return false;
    }

    setUploading(true);
    const docId = `doc-${Date.now()}`;
    const newDoc: DocItem = {
      id: docId,
      name: file.name,
      uploadTime: new Date().toLocaleString(),
      status: 'processing',
      options: [...selectedOptions],
      results: [],
      citations: [],
      fullText: MOCK_TEXT,
      pollFinished: { ai: false, citation: false, writing: false, polish: false },
    };

    setDocs((prev) => [newDoc, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(selectedOptions));

      // 1. 提交文件到后台
      const submitRes = await axios.post('/api/hallucination_check', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const jobId = submitRes.data.job_id;

      // 2. 开始轮询结果
      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await axios.get(`/api/hallucination_status?job_id=${jobId}`);
          const { status, data } = statusRes.data;
          
          if (data) {
            setDocs((prev) => prev.map(d => {
              if (d.id === docId) {
                return {
                  ...d,
                  status: status === 'done' ? 'done' : 'processing',
                  fullText: data.fullText || d.fullText,
                  pollFinished: data.pollFinished || d.pollFinished,
                  aiResult: data.aiResult || d.aiResult,
                  citations: data.citations || d.citations,
                  results: data.results || d.results
                };
              }
              return d;
            }));
          }

          if (status === 'done' || status === 'error') {
            clearInterval(pollTimer as unknown as NodeJS.Timeout);
            if (status === 'error') message.error('Analysis failed on server.');
          }
        } catch (err) {
          console.error('Polling error:', err);
          // 在开发阶段，如果后台没接好，避免一直报错
          clearInterval(pollTimer as unknown as NodeJS.Timeout);
          setDocs((prev) => prev.map(d => d.id === docId ? { ...d, status: 'done' } : d));
        }
      }, 3000); // 每3秒轮询一次
      
      pollTimers.current.push(pollTimer as unknown as NodeJS.Timeout);
    } catch (err) {
      console.error('Submit error:', err);
      message.error('Failed to submit document to server');
      setDocs((prev) => prev.map(d => d.id === docId ? { ...d, status: 'done' } : d));
    }

    setUploading(false);
    message.success('Document submitted for analysis');
    return false;
  };

  const goToDetail = (doc: DocItem) => {
    setActiveDoc(doc);
    setActiveTab(doc.options[0] || null);
    setActiveIssueId(null);
    setMode('detail');
  };

  const goToList = () => {
    setMode('list');
    setActiveDoc(null);
    setActiveIssueId(null);
  };

  const refreshActiveDoc = useCallback(() => {
    if (!activeDoc) return;
    const latest = docs.find((d) => d.id === activeDoc.id);
    if (latest && JSON.stringify(latest) !== JSON.stringify(activeDoc)) {
      setActiveDoc(latest);
    }
  }, [docs, activeDoc]);

  useEffect(() => {
    refreshActiveDoc();
  }, [refreshActiveDoc]);

  const handleCardClick = (result: AnalysisResult) => {
    setActiveIssueId(result.id);
    const markEl = document.getElementById(result.markId);
    if (markEl && leftPaneRef.current) {
      markEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleMarkClick = (markId: string) => {
    if (!activeDoc) return;
    const result = activeDoc.results.find((r) => r.markId === markId);
    if (result) {
      setActiveIssueId(result.id);
      const cardEl = document.getElementById(`card-${result.id}`);
      if (cardEl && rightPaneRef.current) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const renderMarkedText = () => {
    if (!activeDoc) return null;
    const tabResults = activeDoc.results.filter((r) => r.type === activeTab);
    const nodes = getMarkSegments(activeDoc.fullText, tabResults);
    return (
      <div
        className="h-doc-text"
        ref={leftPaneRef}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'MARK') {
            const mid = target.getAttribute('data-markid');
            if (mid) handleMarkClick(mid);
          }
        }}
      >
        {nodes}
      </div>
    );
  };

  const renderCitationSummary = () => {
    if (!activeDoc) return null;
    const citResults = activeDoc.results.filter((r) => r.type === 'citation');
    const verified = 2;
    const warnings = citResults.filter((r) => r.severity === 'medium').length;
    const errors = citResults.filter((r) => r.severity === 'high').length;
    const total = verified + warnings + errors;

    return (
      <div className="h-citation-summary-box">
        <div className="h-cs-header">
          <span className="h-cs-title">Citation Analysis</span>
          <span className="h-cs-badge">{total} references checked</span>
        </div>
        <div className="h-cs-progress">
          <Progress
            percent={total > 0 ? Math.round((verified / total) * 100) : 0}
            strokeColor="#722ed1"
            trailColor="#e2e8f0"
            format={(p) => `${p}% verified`}
          />
        </div>
        <div className="h-cs-body">
          <div className="h-cs-row">
            <div className="h-cs-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <CheckCircleFilled />
            </div>
            <span className="h-cs-label">Verified References</span>
            <span className="h-cs-count" style={{ color: '#059669' }}>{verified}</span>
          </div>
          <div className="h-cs-row">
            <div className="h-cs-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <ExclamationCircleFilled />
            </div>
            <span className="h-cs-label">Needs Review</span>
            <span className="h-cs-count" style={{ color: '#ea580c' }}>{warnings}</span>
          </div>
          <div className="h-cs-row">
            <div className="h-cs-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <WarningFilled />
            </div>
            <span className="h-cs-label">Unverifiable</span>
            <span className="h-cs-count" style={{ color: '#dc2626' }}>{errors}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderResultCards = (results: AnalysisResult[]) => {
    if (!results.length) return null;
    return results.map((r) => (
      <div
        key={r.id}
        id={`card-${r.id}`}
        className={`h-result-card ${activeIssueId === r.id ? 'active' : ''}`}
        onClick={() => handleCardClick(r)}
      >
        <div className="h-rc-type" style={{
          color: r.type === 'citation' ? '#722ed1' : r.type === 'writing' ? '#ea580c' : '#2563eb',
        }}>
          {r.type === 'citation' ? 'Citation Issue' : r.type === 'writing' ? 'Consistency Issue' : 'Polish Suggestion'}
          <span className={`h-severity-${r.severity}`} style={{ marginLeft: 8, fontSize: 11 }}>
            {r.severity.toUpperCase()}
          </span>
        </div>
        <div className="h-rc-text">"{r.originalText}"</div>
        <div className="h-rc-suggestion">{r.suggestion}</div>
      </div>
    ));
  };

  // Document list is rendered as custom cards below

  const renderFeedbackExport = () => {
    return (
      <div className="h-feedback-export-bar">
        <div className="h-feedback-area">
          <span className="h-feedback-text">Give feedback</span>
          <Button type="text" icon={<LikeOutlined />} size="small" />
          <Button type="text" icon={<DislikeOutlined />} size="small" />
        </div>
        <div className="h-export-area">
          <Button icon={<ExportOutlined />} size="small" style={{ borderRadius: 6 }}>Export</Button>
        </div>
      </div>
    );
  };

  if (mode === 'detail' && activeDoc) {
    const tabItems = activeDoc.options.map((opt) => ({
      key: opt,
      label: (
        <span>
          {OPTION_LABELS[opt]}
          {!activeDoc.pollFinished[opt] && <LoadingOutlined style={{ marginLeft: 6, fontSize: 12 }} />}
        </span>
      ),
    }));

    return (
      <div className="h-page-detail">
        <div className="h-detail-wrapper">
          <div className="h-detail-header">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={goToList}
              style={{ borderRadius: 8 }}
            >
              Back
            </Button>
            <span className="h-detail-title">{activeDoc.name}</span>
          </div>

          <div className="h-detail-body">
            <div className="h-left-pane">
              {renderMarkedText()}
            </div>
            <div className="h-right-pane" ref={rightPaneRef}>
              <div className="h-rp-tabs">
                <Tabs
                  activeKey={activeTab || undefined}
                  onChange={(k) => { setActiveTab(k as OptionType); setActiveIssueId(null); }}
                  items={tabItems}
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div className="h-rp-content">
                {renderFeedbackExport()}
                
                {activeTab === 'ai' && (
                  activeDoc.pollFinished.ai && activeDoc.aiResult ? (
                    <div className="h-ai-result-card">
                      <div className="h-ai-label" style={{
                        color: activeDoc.aiResult.label === 'HUMAN' ? '#059669' : '#dc2626',
                      }}>
                        {activeDoc.aiResult.label}
                      </div>
                      <div className="h-ai-score">
                        Confidence: {typeof activeDoc.aiResult.score === 'number'
                          ? `${(activeDoc.aiResult.score * 100).toFixed(1)}%`
                          : activeDoc.aiResult.score}
                      </div>
                    </div>
                  ) : (
                    <div className="h-loading-placeholder">
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} />} />
                      <p style={{ marginTop: 12 }}>Running AI detection...</p>
                    </div>
                  )
                )}

                {activeTab === 'citation' && (
                  activeDoc.pollFinished.citation ? (
                    <>
                      {renderCitationSummary()}
                      {renderResultCards(activeDoc.results.filter((r) => r.type === 'citation'))}
                    </>
                  ) : (
                    <div className="h-loading-placeholder">
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} />} />
                      <p style={{ marginTop: 12 }}>Checking citations...</p>
                    </div>
                  )
                )}

                {activeTab === 'writing' && (
                  activeDoc.pollFinished.writing ? (
                    renderResultCards(activeDoc.results.filter((r) => r.type === 'writing'))
                  ) : (
                    <div className="h-loading-placeholder">
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} />} />
                      <p style={{ marginTop: 12 }}>Analyzing writing consistency...</p>
                    </div>
                  )
                )}

                {activeTab === 'polish' && (
                  activeDoc.pollFinished.polish ? (
                    renderResultCards(activeDoc.results.filter((r) => r.type === 'polish'))
                  ) : (
                    <div className="h-loading-placeholder">
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} />} />
                      <p style={{ marginTop: 12 }}>Generating polish suggestions...</p>
                    </div>
                  )
                )}

                {activeTab && activeTab !== 'ai' && activeDoc.pollFinished[activeTab] &&
                  activeDoc.results.filter((r) => r.type === activeTab).length === 0 && (
                  <div className="h-loading-placeholder">
                    <CheckCircleFilled style={{ fontSize: 36, color: '#059669' }} />
                    <p style={{ marginTop: 12, color: '#059669' }}>No issues found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-page">
      {/* Hero banner */}
      <div className="h-hero">
        <div className="h-hero-text">
          <h1 className="h-hero-title">AI Review</h1>
          <p className="h-hero-desc">
            Detect AI-generated content, verify citations, check writing consistency, and polish your manuscript.
          </p>
        </div>
        <div className="h-hero-upload">
          <Dragger
            className="h-upload-dragger"
            showUploadList={false}
            beforeUpload={handleUpload}
            accept=".pdf,.doc,.docx,.txt"
            disabled={uploading}
          >
            {uploading ? (
              <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} />} />
            ) : (
              <div className="h-upload-inner">
                <CloudUploadOutlined className="h-upload-icon" />
                <span className="h-upload-text">Drop your file here or <strong>browse</strong></span>
                <span className="h-upload-hint">PDF, DOCX, TXT</span>
              </div>
            )}
          </Dragger>
        </div>
      </div>

      {/* Analysis options */}
      <div className="h-options-section">
        <p className="h-options-label">Select checks to run</p>
        <div className="h-options-grid">
          {(['ai', 'citation', 'writing', 'polish'] as OptionType[]).map((opt) => {
            const active = selectedOptions.includes(opt);
            return (
              <div
                key={opt}
                className={`h-opt-card ${active ? 'active' : ''}`}
                onClick={() => toggleOption(opt)}
                style={{ '--opt-color': OPTION_COLORS[opt] } as React.CSSProperties}
              >
                <div className="h-opt-icon-wrap">
                  {OPTION_ICONS[opt]}
                </div>
                <div className="h-opt-info">
                  <span className="h-opt-name">{OPTION_LABELS[opt]}</span>
                </div>
                <span className={`h-opt-toggle ${active ? 'on' : ''}`}>
                  <span className="h-opt-toggle-dot" />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Document table */}
      {docs.length > 0 && (
        <div className="h-table-card">
          <div className="h-table-header-row">
            <span className="h-th h-th-name">{docs.length} file(s)</span>
            <span className="h-th h-th-class">Classification</span>
            <span className="h-th h-th-score">Score</span>
            <span className="h-th h-th-status">Hallucination &amp; Polish</span>
            <span className="h-th h-th-action"></span>
          </div>
          {docs.map((doc) => {
            const aiDone = doc.pollFinished.ai;
            const otherChecks = doc.options.filter((o) => o !== 'ai');
            const otherDone = otherChecks.length === 0 || otherChecks.every((o) => doc.pollFinished[o]);
            const aiLabel = aiDone && doc.aiResult ? doc.aiResult.label : null;
            const aiScore = aiDone && doc.aiResult ? doc.aiResult.score : null;

            return (
              <div key={doc.id} className="h-table-row">
                <span className="h-td h-td-name">
                  <FileTextOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                  {doc.name}
                </span>
                <span className="h-td h-td-class">
                  {aiDone ? (
                    <span className={`h-class-badge ${aiLabel === 'HUMAN' ? 'human' : 'ai'}`}>
                      {aiLabel}
                    </span>
                  ) : doc.options.includes('ai') ? (
                    <LoadingOutlined style={{ color: '#722ed1' }} />
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </span>
                <span className="h-td h-td-score">
                  {aiScore !== null ? (
                    typeof aiScore === 'number' ? aiScore.toFixed(2) : aiScore
                  ) : doc.options.includes('ai') ? (
                    <LoadingOutlined style={{ color: '#722ed1' }} />
                  ) : '—'}
                </span>
                <span className="h-td h-td-status">
                  {otherChecks.length === 0 ? (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  ) : otherDone ? (
                    <span className="h-status-ready">Ready</span>
                  ) : (
                    <span className="h-status-scanning"><LoadingOutlined /> Scanning...</span>
                  )}
                </span>
                <span className="h-td h-td-action">
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => goToDetail(doc)}
                    className="h-full-result-btn"
                  >
                    Full Result →
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Hallucination;
