import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography, Card, message, Button, Row, Spin, Splitter, Input, Drawer,
  Tooltip, Flex, Segmented
} from 'antd';
import {
  SendOutlined, FilePdfOutlined, FileTextOutlined, StarOutlined, StarFilled,
  CopyOutlined, CheckOutlined, ReloadOutlined,
  BulbOutlined, MessageOutlined, DownOutlined, UpOutlined,
  LikeOutlined, DislikeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import emoji from 'remark-emoji';
import gemoji from 'remark-gemoji';
import remarkGfm from "remark-gfm";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { latexToHtml, hasLatex } from '../../utils/latex';
import './paperdetail.css';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  name: string;
  content: string;
  updateDate: string;
  loading: boolean;
  ideas?: Idea[]; // 每条AI消息可能包含多个ideas
  // UI-only messages (e.g. reference ideas) should not be sent to backend history.
  excludeFromHistory?: boolean;
  // Mark helper/system messages to hide actions like copy/regenerate.
  uiOnly?: boolean;
};

const { Title, Text, Paragraph } = Typography;

interface Paper {
  paper_id: number;
  title: string;
  author: string;
  abstract: string;
  pdf_url: string;
}

interface PaperNote {
  [key: string]: string;
}

interface Idea {
  id: number;
  title: string;
  description: string;
  noveltyScore?: number;
  feasibilityScore?: number;
  isSaved: boolean;
  timestamp?: number; // 添加时间戳用于排序
}

type ApiIdeaEvaluation = {
  feasibility_score?: number;
  feasibility_reason?: string;
  novelty_score?: number;
  novelty_reason?: string;
} | null;

type ApiIdea = {
  ideaId: number;
  idea: string;
  title?: string;
  sourceType?: string;
  isSaved?: boolean;
  createdAt?: string;
  evaluation?: ApiIdeaEvaluation;
  novelty_score?: number;
  feasibility_score?: number;
  novelty?: number;
  feasibility?: number;
  noveltyScore?: number;
  feasibilityScore?: number;
  relatedPapers?: any[];
};

const parseIdeaTextWithTitle = (raw: string): { title: string; content: string } => {
  const text = String(raw || '').trim();
  if (!text) return { title: 'Idea', content: '' };

  const normalizeForCompare = (s: string) =>
    String(s || '')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const stripDuplicatedTitleFromContent = (title: string, content: string) => {
    const t = String(title || '').trim();
    let c = String(content || '').trim();
    if (!t || !c) return c;

    const nt = normalizeForCompare(t);
    const nc = normalizeForCompare(c);
    if (!nt || !nc.startsWith(nt)) return c;

    // Case 1: content first non-empty line equals title → drop that line
    const rawLines = c.split('\n');
    const firstNonEmptyIdx = rawLines.findIndex((l) => l.trim().length > 0);
    if (firstNonEmptyIdx >= 0) {
      const firstLine = rawLines[firstNonEmptyIdx].trim();
      if (normalizeForCompare(firstLine) === nt) {
        const next = rawLines.slice(firstNonEmptyIdx + 1).join('\n').trim();
        return next || c;
      }
    }

    // Case 2: content starts with title inline (e.g. "Title  ...") → strip title prefix
    c = c.replace(new RegExp(`^\\s*${escapeRegExp(t)}\\s*`), '').trim();
    c = c.replace(/^[:：\-–—]+\s*/, '').trim();
    return c || content;
  };

  // Preferred persisted format: "title\n\ncontent"
  const parts = text.split(/\n\s*\n/);
  if (parts.length >= 2) {
    const title = parts[0].trim();
    const contentRaw = parts.slice(1).join('\n\n').trim();
    const content = stripDuplicatedTitleFromContent(title, contentRaw);
    return { title: title || makeIdeaTitle(text), content };
  }

  // Secondary format: "title\ncontent" (single newline)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const title = lines[0];
    const contentRaw = lines.slice(1).join('\n').trim();
    const content = stripDuplicatedTitleFromContent(title, contentRaw);
    return { title: title || makeIdeaTitle(text), content: content || text };
  }

  // Heuristic: split first sentence as title
  const maxScan = Math.min(text.length, 120);
  const scan = text.slice(0, maxScan);
  const m = scan.match(/(.+?[.!?。！？])\s+/);
  if (m && m[1]) {
    const title = m[1].trim();
    const contentRaw = text.slice(m[0].length).trim();
    const content = stripDuplicatedTitleFromContent(title, contentRaw);
    return { title: title || makeIdeaTitle(text), content: content || text };
  }

  return { title: makeIdeaTitle(text), content: text };
};

const extractIdeasFromResponseContent = (rawContent: string) => {
  const content = String(rawContent || '');
  const lines = content.split('\n');
  const headerIndex = lines.findIndex((l) =>
    /^\s*##\s*(?:Ideas|Research Ideas|Generated Research Ideas|生成的研究想法|研究想法)\s*[:：]?\s*$/i.test(
      l.trim()
    )
  );
  if (headerIndex < 0) return { cleanedContent: content, ideas: [] as Idea[] };

  const ideaLines = lines.slice(headerIndex + 1);
  const ideas: { title: string; content: string }[] = [];

  const parseTitleColonLine = (line: string) =>
    line.match(/^\s*(?:\d+\.\s*)?(?:-?\s*)?(?:\*\*)?(.+?)(?:\*\*)?\s*[:：]\s*(.*)$/);

  let currentTitle = '';
  let currentBody: string[] = [];

  const flush = () => {
    const t = currentTitle.trim();
    const b = currentBody.join('\n').trim();
    if (t && b) ideas.push({ title: t, content: b });
    currentTitle = '';
    currentBody = [];
  };

  ideaLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentTitle) currentBody.push('');
      return;
    }

    // Pattern A: "Title: content" (supports optional **Title**)
    const mColon = parseTitleColonLine(line);
    if (mColon && mColon[1]) {
      flush();
      currentTitle = mColon[1].trim().replace(/\*\*/g, '');
      const rest = (mColon[2] || '').trim();
      if (rest) currentBody.push(rest);
      return;
    }

    // Pattern B: "1. **Title**" (title only, body in following "- ..." lines)
    const mBoldOnly = trimmed.match(/^\s*\d+\.\s*\*\*(.+?)\*\*\.?\s*$/);
    if (mBoldOnly && mBoldOnly[1]) {
      flush();
      currentTitle = mBoldOnly[1].trim();
      return;
    }

    // Pattern C: "1. **Title**. rest..." or "1. **Title** rest..."
    const mBoldInline = trimmed.match(/^\s*\d+\.\s*\*\*(.+?)\*\*\s*(.*)$/);
    if (mBoldInline && mBoldInline[1]) {
      flush();
      currentTitle = mBoldInline[1].trim();
      const restRaw = (mBoldInline[2] || '').trim();
      const rest = restRaw.replace(/^[.。:：\-–—]+\s*/, '').trim();
      if (rest) currentBody.push(rest);
      return;
    }

    // Body bullet: "- explanation"
    const mBullet = trimmed.match(/^\s*[-•]\s+(.*)$/);
    if (mBullet && currentTitle) {
      const bodyLine = (mBullet[1] || '').trim();
      if (bodyLine) currentBody.push(bodyLine);
      return;
    }

    if (currentTitle) currentBody.push(trimmed);
  });
  flush();

  if (ideas.length === 0) return { cleanedContent: content, ideas: [] as Idea[] };

  const cleanedContent = lines.slice(0, headerIndex).join('\n').trimEnd();
  const uiIdeas: Idea[] = ideas.map((it, idx) => ({
    id: -(Date.now() + idx + 1),
    title: it.title,
    description: it.content,
    isSaved: false,
  }));

  return { cleanedContent, ideas: uiIdeas };
};

const toFiniteNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

const normalizeScore10 = (score?: unknown): number | undefined => {
  const n = toFiniteNumber(score);
  if (typeof n !== 'number') return undefined;

  // Normalize various backend historical ranges into 0-10.
  // - Some data may be 0-1 (probabilities)
  // - Some data may be 0-5
  // - Newer data may already be 0-10
  let normalized = n;
  if (normalized <= 1) normalized = normalized * 10;
  else if (normalized <= 5) normalized = normalized * 2;

  return Math.max(0, Math.min(10, normalized));
};

const score10ToStars = (score?: unknown): number | undefined => {
  const normalized = normalizeScore10(score);
  if (typeof normalized !== 'number') return undefined;
  // Each 1 point = 0.5 star, round to nearest half-star
  const halfSteps = Math.round(normalized);
  return Math.max(0, Math.min(5, halfSteps / 2));
};

const makeIdeaTitle = (text: string): string => {
  const cleaned = (text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Idea';
  // 用户要求标题完整展示：这里不再做截断省略
  return cleaned;
};

const normalizeIdeaText = (text: string): string =>
  (text || '').trim().replace(/\s+/g, ' ').toLowerCase();

const mapChatIdeasToUi = (ideas: any[]): Idea[] => {
  return ideas
    .map((it, idx) => {
      if (typeof it === 'string') {
        const text = it.trim();
        const parsed = parseIdeaTextWithTitle(text);
        return {
          id: -(Date.now() + idx + 1),
          title: parsed.title,
          description: parsed.content || text,
          isSaved: false,
        };
      }
      if (it && typeof it === 'object') {
        // If backend uses the same schema as get_ideas
        if (typeof it.ideaId === 'number' && typeof it.idea === 'string') {
          return mapApiIdeaToUi(it as ApiIdea);
        }
        const desc = String(it.idea || it.description || it.content || '').trim();
        const parsed = parseIdeaTextWithTitle(desc);
        // Support number OR numeric string, and various ranges (0-1 / 0-5 / 0-10)
        const feasibilityScore = normalizeScore10((it as any).feasibility_score ?? (it as any).feasibility);
        const noveltyScore = normalizeScore10((it as any).novelty_score ?? (it as any).novelty);
        return {
          id: typeof it.id === 'number' ? it.id : -(Date.now() + idx + 1),
          title: parsed.title,
          description: parsed.content || desc,
          noveltyScore,
          feasibilityScore,
          isSaved: Boolean(it.isSaved),
        };
      }
      return null;
    })
    .filter(Boolean) as Idea[];
};

const mapApiIdeaToUi = (api: ApiIdea): Idea => {
  const raw = api.idea ?? '';
  const parsed = parseIdeaTextWithTitle(raw);
  const titleFromApi = typeof api.title === 'string' ? api.title.trim() : '';
  const evaluation = api.evaluation ?? null;
  const noveltyRaw =
    toFiniteNumber((evaluation as any)?.novelty_score) ??
    toFiniteNumber((api as any).novelty_score) ??
    toFiniteNumber((api as any).novelty) ??
    toFiniteNumber((api as any).noveltyScore);
  const feasibilityRaw =
    toFiniteNumber((evaluation as any)?.feasibility_score) ??
    toFiniteNumber((api as any).feasibility_score) ??
    toFiniteNumber((api as any).feasibility) ??
    toFiniteNumber((api as any).feasibilityScore);
  return {
    id: api.ideaId,
    title: titleFromApi || parsed.title,
    description: parsed.content || raw,
    noveltyScore: normalizeScore10(noveltyRaw),
    feasibilityScore: normalizeScore10(feasibilityRaw),
    isSaved: Boolean(api.isSaved),
    timestamp: api.createdAt ? Date.parse(api.createdAt) : undefined,
  };
};

const getFormattedTime = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
};

const PaperDetail = () => {
  const fullContentRef = useRef('');
  const currentContentRef = useRef('');
  const currentIndexRef = useRef(0);
  const location = useLocation();
  const item = (location.state as any)?.item as Paper | undefined;
  const navigate = useNavigate();
  const [paperNote, setPaperNote] = useState<PaperNote>({});
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChatBusy, setIsChatBusy] = useState(false);
  const [userInfo, setUserInfo] = useState<any>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'notes' | 'pdf'>('notes');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState<string>('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const pendingAssistantIdRef = useRef<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([]);
  const savedIdeasRef = useRef<Idea[]>([]); // 用于追踪savedIdeas的引用
  const [savedIdeasExpanded, setSavedIdeasExpanded] = useState<boolean>(true); // 默认展开
  const [messageIdeasExpanded, setMessageIdeasExpanded] = useState<{[key: number]: boolean}>({});
  const [paperIdeas, setPaperIdeas] = useState<Idea[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);
  const injectedReferenceIdeasRef = useRef(false);
  const isComposingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const pollErrorCountRef = useRef(0);
  const [votedIdeas, setVotedIdeas] = useState<Set<number>>(() => {
    try {
      const stored = sessionStorage.getItem('votedIdeas_gen');
      return stored ? new Set(JSON.parse(stored) as number[]) : new Set();
    } catch { return new Set(); }
  });
  const [animatingIdea, setAnimatingIdea] = useState<{ id: number; like: boolean } | null>(null);

  const handleIdeaFeedback = async (ideaId: number, like: number, idea: Idea) => {
    setAnimatingIdea({ id: ideaId, like: like === 1 });
    try {
      await axios.post('/api/feedback', {
        action_type: 'idea_generation',
        like,
        idea_id: ideaId,
        content: `${idea.title}\n\n${idea.description || ''}`.trim(),
        paper_id: item ? String(item.paper_id) : '',
        email: userInfo?.email || '',
      });
    } catch {}
    setTimeout(() => {
      setVotedIdeas(prev => {
        const next = new Set(prev).add(ideaId);
        try { sessionStorage.setItem('votedIdeas_gen', JSON.stringify(Array.from(next))); } catch {}
        return next;
      });
      setAnimatingIdea(null);
    }, 600);
  };

  const applySavedStatus = useCallback((ideas: Idea[]) => {
    // Sync "saved" state AND scores from backend savedIdeas.
    // Left "Saved Ideas" is driven by backend `/api/get_ideas`, but right-side Suggested/Message ideas
    // were previously only syncing isSaved, leaving stale novelty/feasibility scores.
    const savedById = new Map<number, Idea>();
    const savedByText = new Map<string, Idea>();
    savedIdeasRef.current.forEach((si) => {
      savedById.set(si.id, si);
      savedByText.set(normalizeIdeaText(si.description), si);
    });

    return ideas.map((i) => {
      const matched =
        (typeof i.id === 'number' && savedById.get(i.id)) ||
        savedByText.get(normalizeIdeaText(i.description)) ||
        null;
      if (!matched) return { ...i, isSaved: false };
      return {
        ...i,
        isSaved: true,
        noveltyScore: typeof matched.noveltyScore === 'number' ? matched.noveltyScore : i.noveltyScore,
        feasibilityScore: typeof matched.feasibilityScore === 'number' ? matched.feasibilityScore : i.feasibilityScore,
      };
    });
  }, []);

  const fetchIdeasForPaper = useCallback(async (): Promise<Idea[] | null> => {
    if (!userInfo || !item) return null;
    try {
      const res = await axios.post('/api/get_ideas', {
        paperId: String(item.paper_id),
        userId: userInfo.email,
      });

      const data = res.data;
      if (data?.status === 200) {
        const ideasList = Array.isArray(data.ideas) ? data.ideas : null;
        const defaultIdeas = Array.isArray(data.defaultIdeas) ? data.defaultIdeas : null;
        const saved = Array.isArray(data.savedIdeas) ? data.savedIdeas : null;

        let mappedDefault: Idea[] = [];
        let mappedSaved: Idea[] = [];

        if (Array.isArray(defaultIdeas)) {
          // Backend explicitly provided default suggestions.
          mappedDefault = defaultIdeas.map((i: ApiIdea) => mapApiIdeaToUi(i));
        } else if (Array.isArray(ideasList)) {
          // Backend returned a mixed ideas list (saved + unsaved). Use it directly as suggestions
          // so suggested ideas appear even when nothing is saved.
          mappedDefault = ideasList.map((i: ApiIdea) => mapApiIdeaToUi(i));
        }

        if (Array.isArray(saved)) {
          mappedSaved = saved.map((i: ApiIdea) => ({ ...mapApiIdeaToUi(i), isSaved: true }));
        } else if (mappedDefault.length > 0) {
          mappedSaved = mappedDefault.filter((i: Idea) => i.isSaved);
        }

        // Only show database-backed ideas. If backend doesn't provide any ideas, suggestions stay empty.
        const effectiveDefault = mappedDefault;

        // 当 defaultIdeas 使用 demo（负 id）时，如果 savedIdeas 返回了真实 ideaId，
        // 将 demo 卡片“对齐”为已保存状态，且 id 替换为后端 ideaId（便于取消保存/Graph 使用）
        const savedByText = new Map<string, Idea>();
        const savedById = new Map<number, Idea>();
        mappedSaved.forEach(si => {
          savedByText.set(normalizeIdeaText(si.description), si);
          savedById.set(si.id, si);
        });
        const reconciledDefault = effectiveDefault.map(di => {
          if (di.id > 0) return di;
          const matched = savedByText.get(normalizeIdeaText(di.description));
          if (!matched) return di;
          return {
            ...di,
            id: matched.id,
            isSaved: true,
            timestamp: matched.timestamp ?? di.timestamp,
            noveltyScore: typeof matched.noveltyScore === 'number' ? matched.noveltyScore : di.noveltyScore,
            feasibilityScore: typeof matched.feasibilityScore === 'number' ? matched.feasibilityScore : di.feasibilityScore,
          };
        });

        const savedSet = new Set(mappedSaved.map(i => i.id));
        const finalDefault = reconciledDefault.map(i => {
          const saved = savedById.get(i.id);
          if (!saved) {
            return { ...i, isSaved: i.isSaved || savedSet.has(i.id) };
          }
          return {
            ...i,
            isSaved: true,
            noveltyScore: typeof saved.noveltyScore === 'number' ? saved.noveltyScore : i.noveltyScore,
            feasibilityScore: typeof saved.feasibilityScore === 'number' ? saved.feasibilityScore : i.feasibilityScore,
          };
        });

        setPaperIdeas(finalDefault);
        setSavedIdeas(mappedSaved);
        savedIdeasRef.current = mappedSaved;

        // 同步所有消息里的保存状态（避免“已存/保存”按钮状态错乱）
        setMessageList(prev =>
          prev.map(msg =>
            msg.ideas ? { ...msg, ideas: applySavedStatus(msg.ideas) } : msg
          )
        );
        return finalDefault;
      } else {
        message.error(data?.message || 'Failed to load ideas.');
      }
    } catch (e) {
      console.error('Failed to fetch ideas:', e);
      message.error('Failed to load ideas. Please try again later.');
    }
    return null;
  }, [userInfo, item, applySavedStatus]);

  const clearAllIntervals = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 576);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stopGenerating = useCallback(() => {
    if (chatAbortRef.current) {
      try {
        chatAbortRef.current.abort();
      } catch {
        // ignore
      }
      chatAbortRef.current = null;
    }

    clearAllIntervals();
    setIsChatBusy(false);

    const pendingId = pendingAssistantIdRef.current;
    if (pendingId !== null) {
      setMessageList(prev =>
        prev.map(msg => {
          if (msg.id !== pendingId) return msg;
          const nextContent =
            String(msg.content || '').trim() ||
            String(currentContentRef.current || '').trim() ||
            '⏹️ Stopped.';
          return { ...msg, content: nextContent, loading: false };
        })
      );
    }

    // 重置这批 refs，防止下一轮新问题因为后台还在跑而把旧答案闪现出来
    pendingAssistantIdRef.current = null;
    fullContentRef.current = '';
    currentContentRef.current = '';
    currentIndexRef.current = 0;
    isFetchingRef.current = false;
    pollErrorCountRef.current = 0;
  }, [clearAllIntervals]);

  const handleCopy = async (content: string, id: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      message.success('Message copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      message.success('Message copied to clipboard!');
    }
  };

  const typeWriterEffect = useCallback((currentId: number) => {
    const total = fullContentRef.current.length;
    if (currentIndexRef.current < total) {
      const charsPerTick = total > 1500 ? 6 : total > 600 ? 4 : 2;
      const end = Math.min(currentIndexRef.current + charsPerTick, total);
      currentContentRef.current = fullContentRef.current.slice(0, end);
      currentIndexRef.current = end;
      setMessageList(prev =>
        prev.map(msg =>
          msg.id === currentId
            ? { ...msg, content: currentContentRef.current, loading: true }
            : msg
        )
      );
    } else {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }
      setMessageList(prev =>
        prev.map(msg =>
          msg.id === currentId
            ? {
                ...msg,
                content: fullContentRef.current,
                loading: false,
                updateDate: getFormattedTime()
              }
            : msg
        )
      );
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setIsChatBusy(false);
    }
  }, []);

  const fetchContent = useCallback(async (currentId: number, userEmail: string) => {
    if (isFetchingRef.current) return;
    // 守卫：如果当前不是这一轮的等待消息（比如用户已经暂停 / 换新问题了），
    // 直接放弃这次拉取，避免把旧答案闪现在新对话框里。
    if (pendingAssistantIdRef.current !== currentId) return;
    isFetchingRef.current = true;
    try {
      const preferredLanguage =
        (typeof userInfo?.language === 'string' && userInfo.language) ? userInfo.language : 'en';
      const res = await axios.post(
        '/api/get_response',
        {
          userName: userEmail,
          paperId: item!.paper_id,
          language: preferredLanguage,
        },
        {
          signal: chatAbortRef.current?.signal,
          timeout: 15000,
        }
      );
      // 请求期间用户又暂停/发了新消息？丢弃这次结果。
      if (pendingAssistantIdRef.current !== currentId) {
        return;
      }
      const data = res.data;
      pollErrorCountRef.current = 0;

      if (data.status === 403) {
        clearAllIntervals();
        setIsChatBusy(false);
        setMessageList(prevList =>
          prevList.map(msg =>
            msg.id === currentId
              ? { ...msg, content: '⚠️ Current credit is insufficient, it will be reset tomorrow.', loading: false }
              : msg
          )
        );
        message.info('Your credit is not enough, it will be reset tomorrow.', 2);
        return;
      }

      const responseContent = typeof data?.content === 'string' ? data.content : '';

      if (responseContent.includes('[LOADING]')) {
        const partial = responseContent.replace(/\[LOADING\]/g, '').trim();
        setMessageList(prevList =>
          prevList.map(msg =>
            msg.id === currentId
              ? {
                  ...msg,
                  content: partial || 'Generating response...',
                  loading: true,
                }
              : msg
          )
        );
        return;
      }

      if (responseContent.trim() === '') {
        return;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const extracted = extractIdeasFromResponseContent(responseContent);

      const rawIdeas =
        (Array.isArray(data?.idea) && data.idea) ||
        (Array.isArray(data?.ideas) && data.ideas) ||
        (Array.isArray(data?.result?.idea) && data.result.idea) ||
        (Array.isArray(data?.result?.ideas) && data.result.ideas) ||
        (Array.isArray(data?.data?.idea) && data.data.idea) ||
        (Array.isArray(data?.data?.ideas) && data.data.ideas) ||
        null;
      const ideasFromBackend = rawIdeas ? mapChatIdeasToUi(rawIdeas) : extracted.ideas;

      if (ideasFromBackend.length > 0) {
        setMessageList(prevList =>
          prevList.map(msg =>
            msg.id === currentId
              ? { ...msg, ideas: applySavedStatus(ideasFromBackend) }
              : msg
          )
        );
        setMessageIdeasExpanded(prev => ({ ...prev, [currentId]: true }));
      }

      const finalContent = extracted.cleanedContent;
      fullContentRef.current = finalContent;

      setMessageList(prevList => {
        const currentMsg = prevList.find(msg => msg.id === currentId);
        const alreadyShown = (currentMsg?.content || '').length;
        if (alreadyShown > 0 && finalContent.startsWith((currentMsg?.content || '').slice(0, 20))) {
          currentIndexRef.current = alreadyShown;
        } else {
          currentIndexRef.current = 0;
        }
        currentContentRef.current = finalContent.slice(0, currentIndexRef.current);
        return prevList;
      });

      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
      typewriterIntervalRef.current = setInterval(() => typeWriterEffect(currentId), 16);

    } catch (error: any) {
      if (axios.isAxiosError(error) && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')) {
        return;
      }
      console.error("Error fetching content:", error);
      pollErrorCountRef.current += 1;
      if (pollErrorCountRef.current >= 5) {
        clearAllIntervals();
        setIsChatBusy(false);
        setMessageList(prevList =>
          prevList.map(msg =>
            msg.id === currentId
              ? { ...msg, content: '⚠️ Network error, please try again later.', loading: false }
              : msg
          )
        );
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [item?.paper_id, typeWriterEffect, clearAllIntervals, applySavedStatus, userInfo?.language]);

  const sendMessage = async (input?: string) => {
    if (isChatBusy) {
      message.info('Please wait for the current answer to finish.');
      return;
    }
    if (localStorage.getItem('loginInfo') === null) {
      message.info("Please login first!", 2);
      return;
    }

    if (value === '' && (input === undefined || input === '')) {
      message.info('Please input your question...');
      return;
    }

    // Keep track of the pending assistant message so we can flip loading off on errors.
    let pendingAssistantId: number | null = null;
    try {
      if (userInfo !== undefined) {
        setIsChatBusy(true);
        const updateDate = getFormattedTime();
        const MAX_HISTORY = 20;
        const allHistory = messageList
          .slice(1)
          .filter(item => !item.excludeFromHistory && !item.uiOnly)
          .map(item => ({
            role: item.role,
            content: item.content,
          }));
        const historyList = allHistory.length > MAX_HISTORY
          ? allHistory.slice(-MAX_HISTORY)
          : allHistory;

        clearAllIntervals();

        // 在启动新一轮前，先把上一轮残留的打字机 refs 全部清掉，
        // 避免 typeWriter 拿着上一轮的 fullContentRef 直接写到新消息里。
        fullContentRef.current = '';
        currentContentRef.current = '';
        currentIndexRef.current = 0;
        isFetchingRef.current = false;
        pollErrorCountRef.current = 0;

        const userId = Date.now();
        const currentId = userId + 1;
        pendingAssistantId = currentId;
        pendingAssistantIdRef.current = currentId;
        // New request: reset abort controller
        if (chatAbortRef.current) {
          try {
            chatAbortRef.current.abort();
          } catch {
            // ignore
          }
        }
        chatAbortRef.current = new AbortController();
        // Every time user sends a message, collapse previous idea panels.
        setMessageIdeasExpanded({});

        // 创建新消息
        const updatedMessages = (prev: Message[]) => [
          ...prev,
          {
            id: userId,
            role: 'user' as const,
            name: userInfo['nickName'],
            content: input ?? value,
            updateDate,
            loading: false,
          },
          {
            id: currentId,
            role: 'assistant' as const,
            name: 'Assistant',
            content: '',
            updateDate: getFormattedTime(),
            loading: true,
            // ideas/candidates are returned by backend (optional) with get_response
          },
        ];

        setMessageList(updatedMessages);
        setValue('');

        const params = {
          userName: userInfo['email'],
          paperId: item!.paper_id,
          updateDate,
          value: input === undefined ? value : input,
          history: historyList,
          language: (typeof userInfo?.language === 'string' && userInfo.language) ? userInfo.language : 'en',
        };

        const response = await axios.post('/api/chat', params, {
          timeout: 60000,
          signal: chatAbortRef.current.signal,
        });
        const data = response.data;

        // idea list may be returned with the chat response (optional)
        // Note: backend may use either `idea` or `ideas`.
        const rawChatIdeas =
          (Array.isArray(data?.idea) && data.idea) ||
          (Array.isArray(data?.ideas) && data.ideas) ||
          (Array.isArray(data?.result?.idea) && data.result.idea) ||
          (Array.isArray(data?.result?.ideas) && data.result.ideas) ||
          (Array.isArray(data?.data?.idea) && data.data.idea) ||
          (Array.isArray(data?.data?.ideas) && data.data.ideas) ||
          null;
        const chatIdeas = rawChatIdeas ? mapChatIdeasToUi(rawChatIdeas) : [];

        // If backend only embeds ideas inside content, extract them here too.
        if (!chatIdeas.length && typeof data?.content === 'string') {
          const extracted = extractIdeasFromResponseContent(data.content);
          if (extracted.ideas.length > 0) {
            setMessageList(prevList =>
              prevList.map(msg =>
                msg.id === currentId
                  ? {
                      ...msg,
                      ideas: applySavedStatus(extracted.ideas),
                    }
                  : msg
              )
            );
            setMessageIdeasExpanded(prev => ({
              ...prev,
              [currentId]: true
            }));
          }
        }
        if (chatIdeas.length > 0) {
          setMessageList(prevList =>
            prevList.map(msg =>
              msg.id === currentId
                ? {
                    ...msg,
                    ideas: chatIdeas.length > 0 ? applySavedStatus(chatIdeas) : undefined,
                  }
                : msg
            )
          );
          if (chatIdeas.length > 0) {
            setMessageIdeasExpanded(prev => ({
              ...prev,
              [currentId]: true
            }));
          }
        }

        if (data.status === 200) {
          pollErrorCountRef.current = 0;
          timeoutRef.current = setTimeout(() => {
            clearAllIntervals();
            setIsChatBusy(false);
            setMessageList(prevList =>
              prevList.map(msg =>
                msg.id === currentId
                  ? {
                      ...msg,
                      content: '⚠️ Response timeout, please try again.',
                      loading: false
                    }
                  : msg
              )
            );
            message.error('Request timeout, please try again.');
          }, 120000);

          pollIntervalRef.current = setInterval(() => {
            fetchContent(currentId, userInfo['email']);
          }, 2000);
        } else {
          setIsChatBusy(false);
          setMessageList(prevList =>
            prevList.map(msg =>
              msg.id === currentId
                ? {
                    ...msg,
                    content: '⚠️ Request failed, please try again.',
                    loading: false
                  }
                : msg
            )
          );
        }
      }
    } catch (error: any) {
      // Stopped by user
      if (axios.isAxiosError(error) && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')) {
        setIsChatBusy(false);
        return;
      }
      console.error("Error sending message:", error);
      clearAllIntervals();
      setIsChatBusy(false);
      if (pendingAssistantId !== null) {
        // Provide more actionable error info than a generic "Network error".
        let errText = '⚠️ Network error, please try again later.';
        try {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data: any = error.response?.data;
            const serverMsg =
              (typeof data?.message === 'string' && data.message) ||
              (typeof data?.description === 'string' && data.description) ||
              '';
            if (error.code === 'ECONNABORTED') {
              errText = '⚠️ Request timeout. Please try again.';
            } else if (typeof status === 'number') {
              errText = `⚠️ Request failed (${status})${serverMsg ? `: ${serverMsg}` : ''}`;
            } else if (typeof error.message === 'string' && error.message) {
              errText = `⚠️ ${error.message}`;
            }
          }
        } catch {
          // ignore formatting failures
        }
        setMessageList(prevList =>
          prevList.map(msg =>
            msg.id === pendingAssistantId
              ? {
                  ...msg,
                  content: errText,
                  loading: false,
                }
              : msg
          )
        );
      }
      message.error('Request failed. Please check backend/API status.');
    }
  };

  const toggleFavorite = () => {
    const loginInfo = localStorage.getItem('loginInfo');
    if (loginInfo === null) {
      message.info("Please login first!", 2);
      return;
    }

    let parsedInfo: any;
    try { parsedInfo = JSON.parse(loginInfo); } catch { return; }
    axios.post('/api/eidt_favorite', {
      email: parsedInfo['email'],
      action: favorite ? 1 : 0,
      paper_id: item!.paper_id
    })
      .then(response => {
        if (response.data.status === 200) {
          const new_loginInfo = {
            ...userInfo,
            favorite: response.data.favorite
          };
          localStorage.setItem('loginInfo', JSON.stringify(new_loginInfo));
          setFavorite(!favorite);
        } else {
          message.error('Edit your favorite list failed! Please try again later.', 2);
        }
      })
      .catch(error => {
        console.error("Error toggling favorite:", error);
        message.error('Edit your favorite list failed! Please try again later.', 2);
      });
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || isComposingRef.current) return;
      if (!e.shiftKey) {
        e.preventDefault();
        if (isChatBusy) {
          message.info('Please wait for the current answer to finish.');
          return;
        }
        await sendMessage();
      }
    }
  };

  const IDEA_MAX_LENGTH = 300;

  const handleSaveIdea = async (idea: Idea, messageId: number) => {
    if (!userInfo) {
      message.info('User info is still loading. Please try again in a second.');
      return;
    }
    try {
      if (!idea.isSaved) {
        const ideaText = `${idea.title}\n\n${idea.description || ''}`.trim();
        if (idea.id <= 0 && ideaText.length > IDEA_MAX_LENGTH) {
          message.warning(`Idea is too long (${ideaText.length} chars). Max ${IDEA_MAX_LENGTH} characters allowed.`);
          return;
        }
        const payload: Record<string, any> = {
          email: userInfo.email,
          paperId: String(item!.paper_id),
          idea: ideaText,
        };
        if (idea.id > 0) {
          payload.ideaId = idea.id;
        }

        const res = await axios.post('/api/submit_idea', payload);
        const status = res.data?.status;
        if (status === 200) {
          const returnedId = Number(res.data?.ideaId);
          const hasReturnedId = Number.isFinite(returnedId) && returnedId > 0;
          // Only after backend confirms save, update local id/isSaved so it can appear in Saved list correctly.
          if (hasReturnedId) {
            // Update paperIdeas (for reference ideas & any other UI using it)
            setPaperIdeas(prev =>
              prev.map(it =>
                // Match by original id first, then by text as fallback (demo ideas may have negative id)
                it.id === idea.id || normalizeIdeaText(it.description) === normalizeIdeaText(idea.description)
                  ? { ...it, id: returnedId, isSaved: true }
                  : it
              )
            );
            // Update all message idea cards so future unsave uses correct id
            setMessageList(prev =>
              prev.map(m => {
                if (!m.ideas?.length) return m;
                return {
                  ...m,
                  ideas: m.ideas.map(it =>
                    it.id === idea.id || normalizeIdeaText(it.description) === normalizeIdeaText(idea.description)
                      ? { ...it, id: returnedId, isSaved: true }
                      : it
                  ),
                };
              })
            );
          }
          message.success('Idea saved.');
        } else if (status === 403) {
          message.error('Saving ideas is blocked by backend premium restriction. Please ask backend to disable it or enable your account.');
          return;
        } else {
          message.error(res.data?.message || 'Failed to save idea.');
          return;
        }
      } else {
        const res = await axios.post('/api/unsave_idea', {
          email: userInfo.email,
          ideaId: idea.id,
        });
        const status = res.data?.status;
        if (status === 200) {
          message.success('Idea removed.');
        } else {
          message.error(res.data?.message || 'Failed to unsave idea.');
          return;
        }
      }

      await fetchIdeasForPaper();

      // 额外同步当前消息的按钮状态（立即生效）
      setMessageList(prevList =>
        prevList.map(msg => {
          if (msg.id === messageId && msg.ideas) {
            return {
              ...msg,
              ideas: applySavedStatus(msg.ideas),
            };
          }
          return msg;
        })
      );
    } catch (e: any) {
      console.error('Save/unsave idea failed:', e);
      message.error('Request failed. Please try again later.');
    }
  };

  const handleDiscuss = (idea: Idea) => {
    const question = `About the idea "${idea.title}", ${idea.description}`;
    sendMessage(question);
  };

  const startChatWithSuggestedIdea = (idea: Idea) => {
    // On mobile, open the chat drawer so user sees the conversation immediately.
    if (isMobile) setDrawerOpen(true);
    const prompt = `Let's discuss this idea:\n\n**${idea.title}**\n\n${idea.description}`;
    sendMessage(prompt);
  };

  const handleRemoveFromSaved = async (ideaId: number) => {
    if (!userInfo) {
      message.info('User info is still loading. Please try again in a second.');
      return;
    }
    try {
      const res = await axios.post('/api/unsave_idea', {
        email: userInfo.email,
        ideaId,
      });
      const status = res.data?.status;
      if (status === 200) {
        message.success('Idea removed.');
      } else {
        message.error(res.data?.message || 'Failed to remove idea.');
        return;
      }
      await fetchIdeasForPaper();
    } catch (e) {
      console.error('Remove idea failed:', e);
      message.error('Request failed. Please try again later.');
    }
  };

  const toggleMessageIdeas = (messageId: number) => {
    setMessageIdeasExpanded(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const renderStars = (value: number | undefined, color: string) => {
    if (typeof value !== 'number') {
      return (
        <span style={{ fontSize: 12, color: '#999' }}>--</span>
      );
    }
    const full = Math.floor(value);
    const hasHalf = value - full >= 0.5;
    const empty = Math.max(0, 5 - full - (hasHalf ? 1 : 0));

    return (
      <span className="pd-star-row">
        {Array.from({ length: full }).map((_, i) => (
          <StarFilled key={`f-${i}`} style={{ color, fontSize: 12 }} />
        ))}
        {hasHalf && (
          <StarFilled style={{ color, fontSize: 12, opacity: 0.5 }} />
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <StarOutlined key={`e-${i}`} style={{ color: '#d9d9d9', fontSize: 12 }} />
        ))}
      </span>
    );
  };

  const renderIdeaCard = (
    idea: Idea,
    messageId: number,
    isSavedList: boolean = false,
    onCardClick?: () => void
  ) => {
    const cardStyle: React.CSSProperties = {
      borderRadius: 8,
      border: 'none',
      marginBottom: 12,
      backgroundColor: '#f8f9fa',
      transition: 'all 0.3s',
      boxShadow: 'none',
      overflow: 'hidden',
      width: '100%',
      cursor: onCardClick ? 'pointer' : 'default'
    };
    const noveltyStars = score10ToStars(idea.noveltyScore);
    const feasibilityStars = score10ToStars(idea.feasibilityScore);

    return (
      <div
        key={idea.id}
        style={cardStyle}
        className="idea-card"
        onClick={onCardClick}
      >
        <div style={{
          padding: '12px 16px 8px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px dashed #e8e8e8'
        }}>
          <Flex justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Title level={5} style={{
                color: '#1f1f1f',
                fontSize: 14,
                fontWeight: 600,
                margin: 0
              }}>
                {idea.title}
              </Title>
            </div>

            {isSavedList ? (
              <Flex
                align="center"
                gap={4}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#fa8c16',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromSaved(idea.id);
                }}
              >
                <StarFilled style={{ color: 'white', fontSize: 12 }} />
                <span style={{ marginLeft: 4 }}>Saved</span>
              </Flex>
            ) : (
              <Button
                type={idea.isSaved ? "primary" : "default"}
                icon={idea.isSaved ? <StarFilled /> : <StarOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveIdea(idea, messageId);
                }}
                size="small"
                style={{
                  backgroundColor: idea.isSaved ? '#fa8c16' : undefined,
                  borderColor: idea.isSaved ? '#fa8c16' : undefined,
                  fontSize: 12
                }}
              >
                {idea.isSaved ? 'Saved' : 'Save'}
              </Button>
            )}
          </Flex>
        </div>

        <div style={{ padding: '12px 16px' }}>
          <Paragraph style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: '#333',
            marginBottom: 12
          }}>
            {idea.description}
          </Paragraph>

          <div
            className="pd-rating-wrap"
            style={{ border: 'none', background: 'transparent', boxShadow: 'none', outline: 'none' }}
          >
            <div
              className="pd-ratings-row"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
                border: 'none',
                background: 'transparent',
                boxShadow: 'none',
                outline: 'none',
              }}
            >
              <div
                className="pd-ratings-list"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  border: 'none',
                  background: 'transparent',
                  boxShadow: 'none',
                  outline: 'none',
                }}
              >
                <div
                  className="pd-rating-item"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent' }}
                >
                  <Text strong style={{ fontSize: 12, color: '#666' }}>Novelty</Text>
                  {renderStars(noveltyStars, '#9254de')}
                </div>
                <div
                  className="pd-rating-item"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent' }}
                >
                  <Text strong style={{ fontSize: 12, color: '#666' }}>Feasibility</Text>
                  {renderStars(feasibilityStars, '#52c41a')}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!votedIdeas.has(idea.id) ? (
                  animatingIdea?.id === idea.id ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', fontSize: 16,
                      color: animatingIdea.like ? '#52c41a' : '#ff4d4f',
                      animation: 'feedbackPop 0.6s ease forwards',
                    }}>
                      {animatingIdea.like ? <LikeOutlined /> : <DislikeOutlined />}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleIdeaFeedback(idea.id, 1, idea); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 8px', borderRadius: 5,
                          border: '1px solid #e8e8e8', background: '#fff',
                          cursor: 'pointer', fontSize: 13, color: '#999',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#52c41a'; e.currentTarget.style.color = '#52c41a'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.color = '#999'; }}
                      >
                        <LikeOutlined />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleIdeaFeedback(idea.id, 0, idea); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 8px', borderRadius: 5,
                          border: '1px solid #e8e8e8', background: '#fff',
                          cursor: 'pointer', fontSize: 13, color: '#999',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4d4f'; e.currentTarget.style.color = '#ff4d4f'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.color = '#999'; }}
                      >
                        <DislikeOutlined />
                      </button>
                    </>
                  )
                ) : null}
                <Button
                  type="link"
                  icon={<MessageOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDiscuss(idea);
                  }}
                  size="small"
                  style={{
                    color: '#1890ff',
                    fontSize: 12,
                    padding: 0
                  }}
                >
                  Discuss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [messageList, setMessageList] = useState<Message[]>([{
    id: 1,
    role: 'assistant',
    name: 'Assistant',
    updateDate: getFormattedTime(),
    content: "Hello, I am your paper assistant. You can ask me any question about this paper.",
    loading: false
  }]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList]);

  useEffect(() => {
    setLoading(true);

    if (!item) {
      navigate('/paper');
      return;
    }

    const loginInfoStr = localStorage.getItem('loginInfo');
    if (!loginInfoStr) {
      navigate('/login');
      return;
    }

    let userInfo: any;
    try { userInfo = JSON.parse(loginInfoStr); } catch { navigate('/login'); return; }
    setUserInfo(userInfo);
    setFavorite(userInfo['favorite']?.includes(item.paper_id.toString()) || false);

    axios.post('/api/get_paper_notes', {
      paperId: item.paper_id,
      userId: userInfo.email
    })
      .then(response => {
        if (response.data.status === 200) {
          setPaperNote(response.data.paperNote);
          
          // 处理后端返回的 ideas 数据 - 支持两种格式：
          // 1. 新格式: { defaultIdeas: [...], savedIdeas: [...] }
          // 2. 旧格式: { ideas: [...] }
          const defaultIdeasRaw = response.data.defaultIdeas;
          const savedIdeasRaw = response.data.savedIdeas;
          const ideasRaw = response.data.ideas;
          
          if (Array.isArray(defaultIdeasRaw) || Array.isArray(savedIdeasRaw)) {
            // 新格式：分离的 defaultIdeas 和 savedIdeas
            let mappedDefault: Idea[] = [];
            let mappedSaved: Idea[] = [];
            
            if (Array.isArray(defaultIdeasRaw)) {
              mappedDefault = defaultIdeasRaw.map((apiIdea: ApiIdea) => mapApiIdeaToUi(apiIdea));
            }
            
            if (Array.isArray(savedIdeasRaw)) {
              mappedSaved = savedIdeasRaw.map((apiIdea: ApiIdea) => ({ 
                ...mapApiIdeaToUi(apiIdea), 
                isSaved: true 
              }));
            }
            
            // 合并：savedIdeas 的状态同步到 defaultIdeas
            const savedByText = new Map<string, Idea>();
            const savedById = new Map<number, Idea>();
            mappedSaved.forEach(si => {
              savedByText.set(normalizeIdeaText(si.description), si);
              savedById.set(si.id, si);
            });
            
            const finalDefault = mappedDefault.map(di => {
              const matched = savedById.get(di.id) || savedByText.get(normalizeIdeaText(di.description));
              if (!matched) return di;
              return {
                ...di,
                id: matched.id,
                isSaved: true,
                noveltyScore: typeof matched.noveltyScore === 'number' ? matched.noveltyScore : di.noveltyScore,
                feasibilityScore: typeof matched.feasibilityScore === 'number' ? matched.feasibilityScore : di.feasibilityScore,
              };
            });
            
            setPaperIdeas(finalDefault);
            setSavedIdeas(mappedSaved);
            savedIdeasRef.current = mappedSaved;
          } else if (Array.isArray(ideasRaw) && ideasRaw.length > 0) {
            // 旧格式：单一 ideas 数组
            const mappedIdeas = ideasRaw.map((apiIdea: ApiIdea) => mapApiIdeaToUi(apiIdea));
            setPaperIdeas(mappedIdeas);
            
            // 更新已保存的 ideas
            const saved = mappedIdeas.filter((idea: Idea) => idea.isSaved);
            setSavedIdeas(saved);
            savedIdeasRef.current = saved;
          }
        } else {
          message.error('Get paper notes failed! Please try again later.');
        }
      })
      .catch(error => {
        console.error("Error getting paper notes:", error);
        message.error('Get paper notes failed! Please try again later.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearAllIntervals();
      if (chatAbortRef.current) {
        try { chatAbortRef.current.abort(); } catch {}
        chatAbortRef.current = null;
      }
    };
  }, [item, navigate, clearAllIntervals]);

  // 在 userInfo 和 item 都加载后，从后端拉取该论文的 ideas（默认 + 已保存）
  // 注意：get_paper_notes 已经返回 ideas，所以这里不需要再调用 fetchIdeasForPaper
  // 除非 get_paper_notes 没有返回 ideas
  useEffect(() => {
    if (userInfo && item && paperIdeas.length === 0) {
      fetchIdeasForPaper();
    }
  }, [userInfo, item, paperIdeas.length, fetchIdeasForPaper]);

  // Attach 3 suggested ideas under the initial greeting (no extra helper text)
  useEffect(() => {
    if (injectedReferenceIdeasRef.current) return;
    if (!paperIdeas || paperIdeas.length === 0) {
      return;
    }
    if (messageList.length !== 1) {
      return;
    }

    // IMPORTANT:
    // Injected ideas must be synced with backend-saved scores; otherwise this injection
    // can overwrite the later "applySavedStatus" update and show stale/default scores.
    const top3 = applySavedStatus(paperIdeas.slice(0, 3));
    if (top3.length === 0) return;

    injectedReferenceIdeasRef.current = true;
    // Put suggested ideas directly under the hello message (id=1)
    setMessageList(prev => prev.map(m => (m.id === 1 ? { ...m, ideas: top3 } : m)));
    setMessageIdeasExpanded(prev => ({ ...prev, 1: true }));
  }, [paperIdeas, messageList.length, applySavedStatus]);

  const getLastUserMessage = (currentId: number) => {
    const messages = messageList.slice(0, messageList.findIndex(item => item.id === currentId));
    return messages.reverse().find(item => item.role === 'user')?.content || '';
  };

  const getLatestAssistantMessage = () => {
    const assistantMessages = messageList.filter(msg => msg.role === 'assistant' && msg.id !== 1);
    return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const latestAssistantMsg = getLatestAssistantMessage();

  if (!item) {
    return null;
  }

  return (
    <div className='paper-container' id="detail-container">
      <Splitter className="detail-splitter">
        {/* 左侧论文详情面板 */}
        <Splitter.Panel
          defaultSize={!isMobile ? '55%' : '100%'}
          min="30%"
          max="70%"
          resizable={!isMobile}
          style={{
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
        >
          {/* View mode toggle */}
          <div className={`pd-view-toggle ${viewMode === 'pdf' ? 'pd-mode-pdf' : 'pd-mode-notes'}`}>
            <Segmented
              options={[
                { label: <span><FileTextOutlined /> Thinking Notes</span>, value: 'notes' },
                { label: <span><FilePdfOutlined /> PDF</span>, value: 'pdf' },
              ]}
              value={viewMode}
              onChange={(val) => setViewMode(val as 'notes' | 'pdf')}
              block
            />
          </div>

          {viewMode === 'pdf' ? (
            <div className="pd-pdf-container">
              {item.pdf_url ? (() => {
                const pdfDirectUrl = item.pdf_url.replace('/abs/', '/pdf/').replace(/\/?$/, '');
                const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfDirectUrl)}&embedded=true`;
                return (
                  <>
                    <iframe
                      src={googleViewerUrl}
                      className="pd-pdf-iframe"
                      title="Paper PDF"
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      zIndex: 10,
                    }}>
                      <Button
                        type="primary"
                        size="small"
                        href={pdfDirectUrl}
                        target="_blank"
                        style={{ opacity: 0.85, borderRadius: 6, fontSize: 12 }}
                      >
                        Open PDF in new tab
                      </Button>
                    </div>
                  </>
                );
              })() : (
                <div className="pd-pdf-unavailable">
                  PDF is not available for this paper
                </div>
              )}
            </div>
          ) : (
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 20,
            minHeight: 0
          }}>
            {loading ? (
              <Row justify='center' align='middle' style={{ height: '100%' }}>
                <Spin tip="Loading..." size='large' />
              </Row>
            ) : (
              <Card
                className="content-card"
                style={{
                  minHeight: '100%',
                  border: 'none',
                  boxShadow: 'none',
                  padding: 0
                }}
                bodyStyle={{ padding: 0 }}
              >
                <div style={{ padding: '12px 20px' }}>
                  <div className="paper-detail-header">
                    <Title level={2} style={{ textAlign: 'left', marginBottom: 4 }}>
                      {hasLatex(item.title)
                        ? <span dangerouslySetInnerHTML={{ __html: latexToHtml(item.title) }} />
                        : item.title}
                      <Button
                        type='text'
                        style={{ padding: '0 10px' }}
                        onClick={toggleFavorite}
                        icon={
                          favorite ? (
                            <StarFilled style={{ fontSize: '24px', color: 'gold' }} />
                          ) : (
                            <StarOutlined style={{ fontSize: '24px', color: 'black' }} />
                          )
                        }
                      />
                    </Title>
                    <Text style={{ color: 'darkgray', textAlign: 'left', fontSize: '16px' }}>
                      <ReactMarkdown>{item.author}</ReactMarkdown>
                    </Text>
                  </div>


                  {paperNote && Object.keys(paperNote).length > 0 && (
                    <div className="paper-notes">
                      {Object.entries(paperNote).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: '12px' }}>
                          <Title level={3} style={{ textAlign: 'left' }}>{key}</Title>
                          <Text style={{ color: 'black', textAlign: 'left', fontSize: '16px' }}>
                            <ReactMarkdown
                              remarkPlugins={[emoji, gemoji, remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                table: ({ node, ...props }) => (
                                  <div className="table-container">
                                    <table {...props} />
                                  </div>
                                )
                              }}
                            >
                              {value}
                            </ReactMarkdown>
                          </Text>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 已保存的Ideas区域 - 放在文章内容同一个卡片内，简约设计 */}
                  {savedIdeas.length > 0 && (
                    <div style={{
                      marginTop: 24,
                      borderTop: '1px solid #f0f0f0',
                      paddingTop: 20
                    }}>
                      {/* 标题区域 - 可点击展开/收起，但无视觉提示 */}
                      <div
                        style={{
                          marginBottom: 16,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                        onClick={() => setSavedIdeasExpanded(!savedIdeasExpanded)}
                      >
                        <StarFilled style={{ color: '#fa8c16', fontSize: 18 }} />
                        <Title level={5} style={{
                          margin: 0,
                          color: '#1f1f1f',
                          fontSize: 18,
                          fontWeight: 600
                        }}>
                          Saved Ideas ({savedIdeas.length})
                        </Title>
                      </div>

                      {/* 内容区域，有平滑过渡效果 */}
                      <div
                        style={{
                          maxHeight: savedIdeasExpanded ? '5000px' : '0',
                          overflow: 'hidden',
                          transition: 'max-height 0.3s ease-in-out',
                          opacity: savedIdeasExpanded ? 1 : 0,
                          transform: savedIdeasExpanded ? 'translateY(0)' : 'translateY(-10px)',
                          transitionProperty: 'max-height, opacity, transform',
                          transitionDuration: '0.3s',
                          transitionTimingFunction: 'ease-in-out'
                        }}
                      >
                        {savedIdeasExpanded && savedIdeas.map(idea => renderIdeaCard(idea, 0, true))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
          )}
        </Splitter.Panel>

        {/* 右侧聊天面板（桌面端） */}
        {!isMobile ? (
          <Splitter.Panel style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Card
              className="contentCardBody"
              bordered={false}
              title={
                <div className="cardTitle" style={{ padding: '16px 20px' }}>
                  <Title level={4} style={{ margin: 0 }}>AI Assistant</Title>
                </div>
              }
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
              headStyle={{ padding: 0, borderBottom: '1px solid #f0f0f0' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}
            >
              {/* 消息列表区域 */}
              <div
                className='messages'
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '20px',
                  backgroundColor: '#fafafa'
                }}
              >
                {messageList.map((msg) => {
                  const isUser = msg.role === 'user';
                  const contentLen = String(msg.content || '').trim().length;
                  const bubblePadding = isUser && contentLen <= 40 ? '8px 12px' : '12px 16px';
                  const bubbleMinWidth = isUser ? 0 : 100;
                  return (
                  <div key={msg.id}>
                    <Row
                      justify={msg.role === 'user' ? 'end' : 'start'}
                      style={{
                        marginBottom: 12,
                        position: 'relative'
                      }}
                    >
                      <div
                        className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                        style={{
                          padding: bubblePadding,
                          borderRadius: '16px',
                          maxWidth: '80%',
                          minWidth: bubbleMinWidth,
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div className='text' style={{
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          <ReactMarkdown
                            remarkPlugins={[emoji, gemoji, remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              table: ({ node, ...props }) => (
                                <div className="table-container">
                                  <table {...props} />
                                </div>
                              )
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {msg.loading && String(msg.content || '').trim() === '' && (
                            <Spin size="small" style={{ marginLeft: 8 }} />
                          )}
                        </div>

                        {/* 复制和重新生成按钮（仅AI消息） */}
                      {msg.role === 'assistant' && msg.loading === false && msg.id !== 1 && !msg.uiOnly && (
                          <div style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            alignSelf: 'flex-end',
                            marginTop: 2
                          }}>
                            <Tooltip title={copied === msg.id ? 'Copied!' : 'Copy'} placement="top">
                              {copied === msg.id ? (
                                <CheckOutlined style={{
                                  color: '#9254de',  // 改为紫色
                                  cursor: 'pointer',
                                  fontSize: 12
                                }} />
                              ) : (
                                <CopyOutlined
                                  onClick={() => handleCopy(msg.content, msg.id)}
                                  style={{
                                    color: '#9254de',  // 改为紫色
                                    cursor: 'pointer',
                                    fontSize: 12
                                  }}
                                />
                              )}
                            </Tooltip>
                            <Tooltip title="Re-Generate" placement="top">
                              <ReloadOutlined
                                onClick={() => sendMessage(getLastUserMessage(msg.id))}
                                style={{
                                  color: '#9254de',  // 改为紫色
                                  cursor: 'pointer',
                                  fontSize: 12
                                }}
                              />
                            </Tooltip>
                          </div>
                        )}

                        {/* AI回答中的Ideas - 按照您的要求，保留在AI回答框内 */}
                        {msg.role === 'assistant' && msg.ideas && msg.ideas.length > 0 && msg.loading === false && (
                          <div style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid rgba(0,0,0,0.1)'
                          }}>
                            {/* Ideas标题区域 - 可点击展开/收起 */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 8,
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: 4,
                                backgroundColor: messageIdeasExpanded[msg.id] ? 'rgba(146, 84, 222, 0.1)' : 'transparent',
                                transition: 'background-color 0.2s'
                              }}
                              onClick={() => toggleMessageIdeas(msg.id)}
                            >
                              <BulbOutlined style={{
                                color: '#9254de',
                                fontSize: 16
                              }} />
                              <Text strong style={{
                                fontSize: 13,
                                color: '#666',
                                flex: 1
                              }}>
                                Suggested Ideas ({msg.ideas.length})
                              </Text>
                              {messageIdeasExpanded[msg.id] ? (
                                <UpOutlined style={{ color: '#666', fontSize: 12 }} />
                              ) : (
                                <DownOutlined style={{ color: '#666', fontSize: 12 }} />
                              )}
                            </div>

                            {/* Ideas内容区域 */}
                            {messageIdeasExpanded[msg.id] && (
                              <div style={{
                                maxHeight: 300,
                                overflow: 'auto',
                                padding: '8px 0',
                                transition: 'max-height 0.3s ease-in-out'
                              }}>
                                {msg.ideas.map(idea =>
                                  renderIdeaCard(
                                    idea,
                                    msg.id,
                                    false,
                                    (msg.uiOnly || msg.id === 1) ? () => startChatWithSuggestedIdea(idea) : undefined
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Row>

                    {/* candidate prompt chips: temporarily ignored per backend instruction */}
                  </div>
                );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区域 */}
              <div style={{
                padding: '20px',
                borderTop: '1px solid #f0f0f0',
                backgroundColor: 'white'
              }}>
                <Row align='middle'>
                  <div style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    transition: 'border-color 0.3s'
                  }}>
                    <Input.TextArea
                      bordered={false}
                      placeholder='Ask any question...'
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      style={{
                        fontSize: 16,
                        padding: '12px 0',
                        flex: 1,
                        resize: 'none'
                      }}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onCompositionStart={() => { isComposingRef.current = true; }}
                      onCompositionEnd={() => { isComposingRef.current = false; }}
                      disabled={isChatBusy}
                    />
                    {isChatBusy ? (
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<span className="pd-stop-icon" />}
                        onClick={stopGenerating}
                        className="pd-stop-btn"
                        style={{ marginLeft: 8 }}
                      />
                    ) : (
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<SendOutlined />}
                        onClick={() => sendMessage()}
                        disabled={isChatBusy}
                        loading={isChatBusy}
                        style={{
                          backgroundColor: '#9254de',
                          borderColor: '#9254de',
                          marginLeft: 8
                        }}
                      />
                    )}
                  </div>
                </Row>
              </div>
            </Card>
          </Splitter.Panel>
        ) : (
          // 移动端抽屉
          <Drawer
            title="AI Assistant"
            placement="right"
            onClose={() => setDrawerOpen(false)}
            open={drawerOpen}
            width={Math.min(window.innerWidth, 400)}
            bodyStyle={{
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              backgroundColor: '#fafafa'
            }}
            headerStyle={{
              backgroundColor: '#f5f5f5',
              borderBottom: '1px solid #f0f0f0'
            }}
          >
            <div className='messages' style={{
              flex: 1,
              overflow: 'auto',
              padding: 16
            }}>
              {messageList.map((msg) => {
                const isUser = msg.role === 'user';
                const contentLen = String(msg.content || '').trim().length;
                const bubblePadding = isUser && contentLen <= 40 ? '8px 12px' : '10px 16px';
                const bubbleMinWidth = isUser ? 0 : 100;
                return (
                <div key={msg.id}>
                  <Row
                    justify={msg.role === 'user' ? 'end' : 'start'}
                    style={{
                      marginBottom: 12,
                      position: 'relative'
                    }}
                  >
                    <div
                      className="message"
                      style={{
                        backgroundColor: msg.role === 'user' ? 'rgb(73 107 237)' : 'rgb(231 231 231)',
                        color: msg.role === 'user' ? 'white' : 'black',
                        padding: bubblePadding,
                        borderRadius: '12px',
                        maxWidth: '80%',
                        minWidth: bubbleMinWidth,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <div className='text' style={{
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <ReactMarkdown
                          remarkPlugins={[emoji, gemoji, remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="table-container">
                                <table {...props} />
                              </div>
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {msg.loading && String(msg.content || '').trim() === '' && (
                          <Spin size="small" style={{ marginLeft: 8 }} />
                        )}
                      </div>

                      {/* 移动端复制和重新生成按钮 */}
                      {msg.role === 'assistant' && msg.loading === false && msg.id !== 1 && !msg.uiOnly && (
                        <div style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          alignSelf: 'flex-end',
                          marginTop: 2
                        }}>
                          <Tooltip title={copied === msg.id ? 'Copied!' : 'Copy'} placement="top">
                            {copied === msg.id ? (
                              <CheckOutlined style={{
                                color: '#9254de',
                                cursor: 'pointer',
                                fontSize: 12
                              }} />
                            ) : (
                              <CopyOutlined
                                onClick={() => handleCopy(msg.content, msg.id)}
                                style={{
                                  color: '#9254de',
                                  cursor: 'pointer',
                                  fontSize: 12
                                }}
                              />
                            )}
                          </Tooltip>
                          <Tooltip title="Re-Generate" placement="top">
                            <ReloadOutlined
                              onClick={() => sendMessage(getLastUserMessage(msg.id))}
                              style={{
                                color: '#9254de',
                                cursor: 'pointer',
                                fontSize: 12
                              }}
                            />
                          </Tooltip>
                        </div>
                      )}

                      {/* 移动端AI回答中的Ideas - 保留在AI回答框内 */}
                      {msg.role === 'assistant' && msg.ideas && msg.ideas.length > 0 && msg.loading === false && (
                        <div style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px solid rgba(0,0,0,0.1)'
                        }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 8,
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: 4,
                              backgroundColor: messageIdeasExpanded[msg.id] ? 'rgba(146, 84, 222, 0.1)' : 'transparent'
                            }}
                            onClick={() => toggleMessageIdeas(msg.id)}
                          >
                            <BulbOutlined style={{
                              color: '#9254de',
                              fontSize: 16
                            }} />
                            <Text strong style={{
                              fontSize: 13,
                              color: '#666',
                              flex: 1
                            }}>
                              Suggested Ideas ({msg.ideas.length})
                            </Text>
                            {messageIdeasExpanded[msg.id] ? (
                              <UpOutlined style={{ color: '#666', fontSize: 12 }} />
                            ) : (
                              <DownOutlined style={{ color: '#666', fontSize: 12 }} />
                            )}
                          </div>

                          {messageIdeasExpanded[msg.id] && (
                            <div style={{
                              maxHeight: 200,
                              overflow: 'auto',
                              padding: '8px 0'
                            }}>
                              {msg.ideas.map(idea =>
                                renderIdeaCard(
                                  idea,
                                  msg.id,
                                  false,
                                  (msg.uiOnly || msg.id === 1) ? () => startChatWithSuggestedIdea(idea) : undefined
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Row>

                  {/* candidate prompt chips: temporarily ignored per backend instruction */}
                </div>
              );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 移动端输入区域 */}
            <div style={{
              padding: 16,
              borderTop: '1px solid #f0f0f0',
              backgroundColor: 'white'
            }}>
              <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                backgroundColor: 'white',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px'
              }}>
                <Input.TextArea
                  bordered={false}
                  placeholder='Ask any question...'
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{
                    fontSize: 16,
                    padding: '10px 0',
                    flex: 1
                  }}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={() => { isComposingRef.current = false; }}
                  disabled={isChatBusy}
                />
                {isChatBusy ? (
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<span className="pd-stop-icon" />}
                    onClick={stopGenerating}
                    className="pd-stop-btn"
                    style={{ marginLeft: 8 }}
                  />
                ) : (
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={() => sendMessage()}
                    disabled={isChatBusy}
                    loading={isChatBusy}
                    style={{
                      backgroundColor: '#9254de',
                      borderColor: '#9254de',
                      marginLeft: 8
                    }}
                  />
                )}
              </div>
            </div>
          </Drawer>
        )}
      </Splitter>

      {/* 移动端聊天按钮 */}
      {isMobile && (
        <div
          onClick={() => setDrawerOpen(true)}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            cursor: 'pointer',
            background: 'white',
            borderRadius: '50%',
            padding: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <img
            src="./chatbot-icon.png"
            width={60}
            style={{ borderRadius: '50%' }}
            alt="Chatbot"
          />
        </div>
      )}
    </div>
  );
};

export default PaperDetail;