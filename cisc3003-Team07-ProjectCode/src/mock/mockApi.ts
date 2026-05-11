// Pure client-side mock API. Activated when the real backend isn't reachable
// (e.g. GitHub Pages static deployment). Provides the same endpoints as
// `/server/index.js` but stores data in `localStorage`.
//
// Contract: every handler returns a plain object (same shape as the JSON
// returned by the backend). The axios interceptor wraps it into
// `{ status: 200, data: <obj>, ... }` so existing code using `res.data.*`
// works unchanged.

import { PAPERS, PRODUCTS, TEAM, buildDefaultIdeasForPaper, makePaperNotes, getPaperExcerpt, MockPaper } from './seed';

// ---- Paper decoration ----
// Text-first layout: no covers, no video badges, no duration chips. Detail
// panel shows the full abstract + a hand-curated excerpt per paper so it
// reads like a real article preview.
function enrichPaper(p: MockPaper) {
  return {
    ...p,
    read_count: p.read_count ?? p.view_count,
    has_video: false,
    video_url: '',
    video_duration: '',
    thumbnail_url: '',
    excerpt: getPaperExcerpt(p),
  };
}

type Json = any;

const STORAGE_KEY = 'isv_mock_db_v1';

type MockUser = {
  email: string;
  password?: string;
  nickname: string;
  avatar_url: string;
  pro: number;
  credit: number;
  language: string;
  areas: string;
  topics: string;
  summary: string;
  favorite: string[];
  expired_date: string;
};

type MockIdea = {
  idea_id: number;
  email: string;
  paper_id: string;
  idea: string;
  novelty_score: number;
  feasibility_score: number;
  is_saved: number;
  created_at: string;
};

type MockDB = {
  users: MockUser[];
  ideas: MockIdea[];
  idea_related: Array<{
    id: number; idea_id: number; related_paper_id: string;
    title: string; abstract: string; authors: string; year: number;
    pdf_url: string; relevance_score: number; is_new: number;
  }>;
  cart: Array<{ email: string; product_id: number; quantity: number; added_at: string }>;
  orders: Array<{
    id: number; order_no: string; email: string; total: number; status: string;
    payment_method: string; items: any[]; created_at: string;
  }>;
  search_history: Array<{ id: number; email: string; keyword: string; result_count: number; created_at: string }>;
  captchas: Array<{ email: string; code: string; purpose: string; created_at: number }>;
  hallucination_jobs: Array<{ job_id: string; email: string; file_name: string; options: string[]; status: string; result: Json }>;
  _next_idea_id: number;
  _next_rel_id: number;
  _next_order_id: number;
  _next_history_id: number;
};

function loadDB(): MockDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) return parsed;
    }
  } catch {}
  return {
    users: [],
    ideas: [],
    idea_related: [],
    cart: [],
    orders: [],
    search_history: [],
    captchas: [],
    hallucination_jobs: [],
    _next_idea_id: 1,
    _next_rel_id: 1,
    _next_order_id: 1,
    _next_history_id: 1,
  };
}

function saveDB(db: MockDB) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {}
}

const db: MockDB = loadDB();

/**
 * When the specific reviewer account hits the Idea Graph for the first time,
 * seed a few saved ideas so the graph is interesting. We only seed *once* per
 * user and only for the documented demo email — real users start with an
 * empty graph (so the "save your first idea" CTA still makes sense).
 */
const SEEDED_USERS = new Set<string>();
// When this flag is on, ANY logged-in user gets 4 demo ideas the first time
// they hit the Idea Graph, so the page always looks populated (mirrors the
// iSuperviz sampleData.ts demo behaviour). Turn it off if you prefer each
// new user to start with an empty graph.
const SEED_FOR_EVERYONE = true;
const DEMO_SEED_EMAILS = new Set(['professor@um.edu.mo']);

// Curated demo ideas spanning three iSuperviz domains so the graph clusters nicely.
const DEMO_IDEAS: Array<{ title: string; body: string; paperId: string; novelty: number; feasibility: number }> = [
  {
    title: 'Sparse routing for clinical LLMs',
    body: 'Extend Mixtral-style top-2 expert routing with entropy regularisation so clinical-reasoning experts activate when the prompt contains ICD-10 tokens. Goal: cut inference cost 30% without quality loss.',
    paperId: '1', novelty: 8.6, feasibility: 6.8,
  },
  {
    title: 'Self-RAG with trust-aware retrieval',
    body: 'Layer a trust score on every retrieved chunk (source reputation × recency × agreement) and let Self-RAG prefer high-trust passages first, falling back to low-trust only if reasoning demands.',
    paperId: '10', novelty: 7.9, feasibility: 7.6,
  },
  {
    title: 'Evidence-linked decision support',
    body: 'Attach citations from papers and trials to every recommended clinical action; verify with the hallucination audit pipeline before the UI surfaces them.',
    paperId: '14', novelty: 8.3, feasibility: 6.9,
  },
  {
    title: 'LoRA mixtures for on-device agents',
    body: 'Train topic-specific LoRA adapters (math, code, medicine) and serve them as a MoE on edge devices. Evaluate on ReAct + Toolformer benchmarks.',
    paperId: '23', novelty: 7.4, feasibility: 7.8,
  },
];

function ensureDemoIdeasFor(email: string) {
  if (!isEmail(email)) return;
  if (!SEED_FOR_EVERYONE && !DEMO_SEED_EMAILS.has(email)) return;
  if (SEEDED_USERS.has(email)) return;
  SEEDED_USERS.add(email);
  const existing = db.ideas.filter((i) => i.email === email);
  if (existing.length > 0) return;
  DEMO_IDEAS.forEach((d) => {
    const id = db._next_idea_id++;
    db.ideas.push({
      idea_id: id,
      email,
      paper_id: d.paperId,
      idea: `${d.title}\n\n${d.body}`,
      novelty_score: d.novelty,
      feasibility_score: d.feasibility,
      is_saved: 1,
      created_at: nowIso(),
    });
    seedRelatedPapersForIdea(id, d.paperId, d.body);
  });
  saveDB(db);
}
const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const nowMs = () => Date.now();

function isEmail(s: any) {
  return typeof s === 'string' && /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(s.trim());
}

function userPublic(u: MockUser | null) {
  if (!u) return null;
  return {
    user_id: u.email,
    nickname: u.nickname,
    avatar_url: u.avatar_url,
    pro: u.pro,
    credit: u.credit,
    language: u.language,
    areas: u.areas,
    topic: u.topics,
    summary: u.summary,
    favorite: u.favorite.join(','),
    expired_date: u.expired_date,
  };
}

function addDays(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

function getPaper(id: number): MockPaper | undefined {
  return PAPERS.find((p) => p.paper_id === id);
}

function scoreIdea(text: string) {
  const t = String(text || '').toLowerCase();
  let nov = 5 + (t.length > 120 ? 1.5 : 0) + ((t.match(/\bnovel|propose|introduce|new|first\b/g) || []).length * 0.4);
  let fea = 5 + ((t.match(/\bbaseline|benchmark|reuse|existing|off-the-shelf|fine-tune\b/g) || []).length * 0.5);
  nov = Math.max(2, Math.min(10, nov + Math.random() * 2.5 - 0.5));
  fea = Math.max(2, Math.min(10, fea + Math.random() * 2.5 - 0.5));
  return { novelty: Math.round(nov * 10) / 10, feasibility: Math.round(fea * 10) / 10 };
}

function seedRelatedPapersForIdea(ideaId: number, paperId: string, ideaText: string) {
  const pid = parseInt(paperId, 10);
  const anchor = pid ? getPaper(pid) : undefined;
  let candidates: MockPaper[] = [];
  if (anchor) {
    candidates = PAPERS.filter(
      (p) => p.paper_id !== anchor.paper_id && (p.topic === anchor.topic || p.title.includes(anchor.topic))
    ).slice(0, 6);
  } else {
    const keywords = String(ideaText || '')
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3)
      .map((w) => w.toLowerCase());
    candidates = PAPERS.filter((p) =>
      keywords.some(
        (k) => p.title.toLowerCase().includes(k) || p.abstract.toLowerCase().includes(k)
      )
    ).slice(0, 6);
    if (candidates.length === 0) {
      candidates = [...PAPERS].sort((a, b) => b.view_count - a.view_count).slice(0, 6);
    }
  }
  candidates.forEach((p, i) => {
    db.idea_related.push({
      id: db._next_rel_id++,
      idea_id: ideaId,
      related_paper_id: String(p.paper_id),
      title: p.title,
      abstract: p.abstract,
      authors: p.author,
      year: p.year,
      pdf_url: p.pdf_url,
      relevance_score: Math.max(0.4, Math.min(0.98, 0.9 - i * 0.05 + Math.random() * 0.05)),
      is_new: 1,
    });
  });
}

function composeChatReply(paper: MockPaper, userQuestion: string) {
  const tags = paper.tags || [];
  const notes = makePaperNotes(paper);
  const bodyParts: string[] = [];
  bodyParts.push(notes['Key Contribution'] || `**${paper.title}** is a key paper in **${paper.topic}**.`);
  bodyParts.push('');
  bodyParts.push('### Answering your question');
  bodyParts.push('');
  bodyParts.push(`> ${userQuestion}`);
  bodyParts.push('');
  bodyParts.push(
    `Based on the paper's method section, the authors focus on **${tags.slice(0, 3).join(', ') || paper.topic}**. ` +
    `For your question, the most relevant observation is that the approach can be extended by combining it with ` +
    `retrieval augmentation, chain-of-thought verification, or domain-specific fine-tuning depending on your downstream task.`
  );
  bodyParts.push('');
  bodyParts.push('Key takeaways:');
  bodyParts.push('- **What is new**: ' + (notes['Key Contribution']?.split('\n')[0] || `A principled approach to ${paper.topic}`));
  bodyParts.push('- **Why it matters**: improves on prior baselines on representative benchmarks.');
  bodyParts.push("- **Practical recipe**: reuse released checkpoints, apply the ablations in Section 4 to your data, and validate with the paper's evaluation protocol.");
  bodyParts.push('');
  bodyParts.push('## Ideas');
  const ideas = buildDefaultIdeasForPaper(paper).slice(0, 3).map((i) => ({
    title: i.title,
    body: (i.idea.split('\n\n').slice(1).join('\n\n') || i.idea),
  }));
  ideas.forEach((idea) => {
    bodyParts.push(`- **${idea.title}**: ${idea.body}`);
  });
  return {
    content: bodyParts.join('\n'),
    ideas: ideas.map((it, i) => ({
      ideaId: -(nowMs() + i + 1),
      idea: `${it.title}\n\n${it.body}`,
      title: it.title,
      isSaved: false,
      evaluation: { novelty_score: 6 + Math.random() * 3, feasibility_score: 6 + Math.random() * 3 },
    })),
  };
}

const chatReplies = new Map<string, { content: string; ideas: any[]; reads: number; ts: number }>();

function routeHandler(method: string, path: string, body: any, query: any): any {
  const m = method.toUpperCase();

  // ---- health + team ----
  if (m === 'GET' && path === '/api/health') {
    return { status: 200, ok: true, mailer: 'mock', team: TEAM.teamNumber };
  }
  if (m === 'GET' && path === '/api/team') {
    return { status: 200, team: TEAM };
  }

  // ---- captcha ----
  if (m === 'POST' && path === '/api/sendCaptcha') {
    const { email } = body || {};
    if (!isEmail(email)) return { status: 400, message: 'Please provide a valid email.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const existing = db.captchas.find((c) => c.email === email && c.purpose === (body.purpose || 'signup'));
    if (existing) { existing.code = code; existing.created_at = nowMs(); }
    else db.captchas.push({ email, code, purpose: body.purpose || 'signup', created_at: nowMs() });
    saveDB(db);
    if (typeof window !== 'undefined') {
      console.info(`[mock] Verification code for ${email} = ${code}`);
    }
    return { status: 200, message: 'Verification code sent. (check browser console in mock mode)', mode: 'console', mock_code: code };
  }

  // ---- login / signup ----
  if (m === 'POST' && path === '/api/login') {
    const { email, password, nickName, captcha, accessToken, avatorUrl } = body || {};
    if (!isEmail(email)) return { status: 400, message: 'Invalid email.' };

    if (accessToken && !password) {
      let user = db.users.find((u) => u.email === email);
      if (!user) {
        user = {
          email, nickname: nickName || email.split('@')[0],
          avatar_url: avatorUrl || '', pro: 1, credit: 20, language: 'en',
          areas: '[]', topics: '[]', summary: '[]', favorite: [], expired_date: addDays(7),
        };
        db.users.push(user);
      } else if (avatorUrl && !user.avatar_url) {
        user.avatar_url = avatorUrl;
      }
      saveDB(db);
      return { status: 200, userInfo: userPublic(user) };
    }

    const wantsRegister = body && (body.action === 'register' || body.signup === true || nickName);
    if (wantsRegister) {
      if (captcha) {
        const cap = db.captchas.find((c) => c.email === email && c.purpose === 'signup');
        if (!cap) return { status: 401, message: 'No code requested.' };
        if (nowMs() - cap.created_at > 10 * 60 * 1000) return { status: 401, message: 'Code expired.' };
        if (String(cap.code) !== String(captcha).trim()) return { status: 401, message: 'Incorrect verification code.' };
      }
      const existing = db.users.find((u) => u.email === email);
      if (existing && existing.password) return { status: 409, message: 'This email is already registered.' };
      if (!password || password.length < 6 || password.length > 16) return { status: 400, message: 'Password must be 6-16 characters.' };
      if (existing) {
        existing.password = password;
        existing.nickname = nickName || existing.nickname;
        existing.pro = 1; existing.credit = 20; existing.expired_date = addDays(7);
      } else {
        db.users.push({
          email, password, nickname: nickName || email.split('@')[0],
          avatar_url: '', pro: 1, credit: 20, language: 'en',
          areas: '[]', topics: '[]', summary: '[]', favorite: [], expired_date: addDays(7),
        });
      }
      db.captchas = db.captchas.filter((c) => !(c.email === email && c.purpose === 'signup'));
      saveDB(db);
      const user = db.users.find((u) => u.email === email)!;
      return { status: 200, userInfo: userPublic(user) };
    }

    if (!password) return { status: 400, message: 'Password is required.' };
    const user = db.users.find((u) => u.email === email);
    if (!user || !user.password) return { status: 404, message: 'Account not found. Please sign up first.' };
    if (user.password !== password) return { status: 401, message: 'Incorrect password.' };
    return { status: 200, userInfo: userPublic(user) };
  }

  if (m === 'POST' && path === '/api/check_account') {
    const email = body?.email;
    const u = db.users.find((x) => x.email === email);
    return { status: 200, exists: !!u };
  }
  if (m === 'POST' && path === '/api/forgot_password') {
    const email = body?.email;
    const u = db.users.find((x) => x.email === email);
    if (!u) return { status: 404, message: 'No account found.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const ex = db.captchas.find((c) => c.email === email && c.purpose === 'reset');
    if (ex) { ex.code = code; ex.created_at = nowMs(); } else db.captchas.push({ email, code, purpose: 'reset', created_at: nowMs() });
    saveDB(db);
    console.info(`[mock] Reset code for ${email} = ${code}`);
    return { status: 200, message: 'Reset code sent. (check browser console)', mode: 'console', mock_code: code };
  }
  if (m === 'POST' && path === '/api/reset_password') {
    const { email, password, captcha } = body || {};
    if (!password || password.length < 6 || password.length > 16) return { status: 400, message: 'Password must be 6-16 characters.' };
    const u = db.users.find((x) => x.email === email);
    if (!u) return { status: 404, message: 'Account not found.' };
    if (captcha) {
      const cap = db.captchas.find((c) => c.email === email && c.purpose === 'reset');
      if (!cap || String(cap.code) !== String(captcha).trim()) return { status: 401, message: 'Incorrect code.' };
    }
    u.password = password;
    db.captchas = db.captchas.filter((c) => !(c.email === email && c.purpose === 'reset'));
    saveDB(db);
    return { status: 200, message: 'Password has been reset. You can now log in.' };
  }
  if (m === 'POST' && path === '/api/change_password') {
    const { email, oldPassword, newPassword } = body || {};
    const u = db.users.find((x) => x.email === email);
    if (!u) return { status: 404, message: 'Account not found.' };
    if (!u.password) return { status: 400, message: 'This account has no password.' };
    if (u.password !== oldPassword) return { status: 401, message: 'Current password is incorrect.' };
    if (!newPassword || newPassword.length < 6) return { status: 400, message: 'New password too short.' };
    if (u.password === newPassword) return { status: 400, message: 'New password must be different.' };
    u.password = newPassword; saveDB(db);
    return { status: 200, message: 'Password updated successfully.' };
  }

  // ---- profile + credits ----
  if (m === 'POST' && path === '/api/edit_profile') {
    const { email, area, language, summaryList, topicList } = body || {};
    const u = db.users.find((x) => x.email === email);
    if (!u) return { status: 404 };
    if (area != null) u.areas = JSON.stringify(area);
    if (language) u.language = language;
    if (summaryList != null) u.summary = JSON.stringify(summaryList.map((x: any) => (x && x.summary) || x));
    if (topicList != null) u.topics = JSON.stringify(topicList);
    saveDB(db);
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/get_credit') {
    const u = db.users.find((x) => x.email === body?.email);
    return { status: 200, credit: u ? u.credit : 20 };
  }
  if (m === 'POST' && path === '/api/consume_credit') {
    const { email, amount = 10, reason = 'paper_action', paperId, paperTitle } = body || {};
    const cost = Math.max(1, parseInt(String(amount), 10) || 10);
    if (!isEmail(email)) return { status: 400, message: 'Login required.' };
    const u = db.users.find((x) => x.email === email);
    if (!u) return { status: 404, message: 'Account not found.' };
    if (u.credit < cost) {
      return {
        status: 403,
        message: `Not enough credits. This action costs ${cost} credits.`,
        credit: u.credit,
      };
    }
    u.credit -= cost;
    db.search_history.push({
      id: db._next_history_id++,
      email,
      keyword: `${reason}: ${paperTitle || paperId || 'paper'}`,
      result_count: 1,
      created_at: nowIso(),
    });
    saveDB(db);
    return { status: 200, credit: u.credit, cost };
  }

  // ---- products ----
  if (m === 'GET' && path === '/api/products') {
    return { status: 200, products: PRODUCTS };
  }
  const prodMatch = path.match(/^\/api\/products\/(\d+)$/);
  if (m === 'GET' && prodMatch) {
    const id = parseInt(prodMatch[1], 10);
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) return { status: 404, message: 'Product not found.' };
    const same = PRODUCTS.filter((p) => p.id !== id && p.category === product.category);
    const others = PRODUCTS.filter((p) => p.id !== id && p.category !== product.category);
    const related = [...same, ...others].slice(0, 8);
    return { status: 200, product, related };
  }

  // ---- papers ----
  if (m === 'POST' && path === '/api/get_paper_info') {
    const { page = 1, pageSize = 20, searchWord = '', filterFavorite = false, email } = body || {};
    let list = [...PAPERS];
    const kw = String(searchWord || '').trim().toLowerCase();
    if (kw) list = list.filter((p) =>
      p.title.toLowerCase().includes(kw) ||
      p.author.toLowerCase().includes(kw) ||
      p.abstract.toLowerCase().includes(kw) ||
      p.topic.toLowerCase().includes(kw));
    if (filterFavorite) {
      const u = db.users.find((x) => x.email === email);
      const fav = new Set(u ? u.favorite.map(String) : []);
      list = list.filter((p) => fav.has(String(p.paper_id)));
    }
    const total = list.length;
    list.sort((a, b) => b.view_count - a.view_count);
    const start = (Math.max(1, page) - 1) * pageSize;
    const paperList = list.slice(start, start + pageSize).map((p) => enrichPaper(p));
    return { status: 200, paperList, totalPaper: total, fetchingPapers: false };
  }
  if (m === 'POST' && path === '/api/get_paper_notes') {
    const { paperId, userId } = body || {};
    const p = getPaper(parseInt(paperId, 10));
    if (!p) return { status: 404, message: 'Paper not found.' };
    ensureDemoIdeasFor(userId);
    const saved = isEmail(userId)
      ? db.ideas.filter((it) => it.email === userId && it.paper_id === String(p.paper_id) && it.is_saved === 1)
          .map((r) => ({
            ideaId: r.idea_id, idea: r.idea, isSaved: true, createdAt: r.created_at,
            evaluation: { novelty_score: r.novelty_score, feasibility_score: r.feasibility_score },
          }))
      : [];
    return {
      status: 200,
      paperNote: makePaperNotes(p),
      defaultIdeas: buildDefaultIdeasForPaper(p),
      savedIdeas: saved,
    };
  }
  if (m === 'POST' && path === '/api/get_ideas') {
    const { paperId, userId } = body || {};
    const p = getPaper(parseInt(paperId, 10));
    if (!p) return { status: 404, message: 'Paper not found.' };
    ensureDemoIdeasFor(userId);
    const saved = isEmail(userId)
      ? db.ideas.filter((it) => it.email === userId && it.paper_id === String(p.paper_id) && it.is_saved === 1)
          .map((r) => ({
            ideaId: r.idea_id, idea: r.idea, isSaved: true, createdAt: r.created_at,
            evaluation: { novelty_score: r.novelty_score, feasibility_score: r.feasibility_score },
          }))
      : [];
    return {
      status: 200,
      defaultIdeas: buildDefaultIdeasForPaper(p),
      savedIdeas: saved,
      ideas: saved,
    };
  }
  if (m === 'POST' && path === '/api/submit_idea') {
    const { email, paperId, idea, ideaId } = body || {};
    if (!isEmail(email)) return { status: 400, message: 'Login required.' };
    if (!idea || !String(idea).trim()) return { status: 400, message: 'Idea text is required.' };
    const score = scoreIdea(idea);
    if (ideaId) {
      const existing = db.ideas.find((i) => i.idea_id === parseInt(ideaId, 10) && i.email === email);
      if (!existing) return { status: 404, message: 'Idea not found.' };
      existing.idea = String(idea); existing.is_saved = 1;
      existing.novelty_score = score.novelty; existing.feasibility_score = score.feasibility;
      saveDB(db);
      return { status: 200, ideaId: existing.idea_id };
    }
    const newId = db._next_idea_id++;
    db.ideas.push({
      idea_id: newId, email, paper_id: String(paperId || ''), idea: String(idea),
      novelty_score: score.novelty, feasibility_score: score.feasibility,
      is_saved: 1, created_at: nowIso(),
    });
    seedRelatedPapersForIdea(newId, String(paperId || ''), String(idea));
    saveDB(db);
    return { status: 200, ideaId: newId };
  }
  if (m === 'POST' && path === '/api/unsave_idea') {
    const { email, ideaId } = body || {};
    const id = parseInt(ideaId, 10);
    const initial = db.ideas.length;
    db.ideas = db.ideas.filter((i) => !(i.idea_id === id && i.email === email));
    db.idea_related = db.idea_related.filter((r) => r.idea_id !== id);
    saveDB(db);
    if (db.ideas.length === initial) return { status: 404, message: 'Idea not found.' };
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/get_user_all_ideas') {
    const { email } = body || {};
    if (!isEmail(email)) return { status: 401, message: 'Login required.', ideas: [] };
    ensureDemoIdeasFor(email);
    const ideas = db.ideas
      .filter((i) => i.email === email && i.is_saved === 1)
      .sort((a, b) => b.idea_id - a.idea_id)
      .map((r) => {
        const related = db.idea_related.filter((x) => x.idea_id === r.idea_id);
        return {
          ideaId: r.idea_id,
          paperId: r.paper_id,
          idea: r.idea,
          isSaved: true,
          createdAt: r.created_at,
          evaluation: { novelty_score: r.novelty_score, feasibility_score: r.feasibility_score },
          relatedPapers: related,
        };
      });
    return { status: 200, ideas };
  }
  if (m === 'POST' && path === '/api/mark_idea_related_paper_viewed') {
    const { email, ideaId, relatedPaperId } = body || {};
    db.idea_related.forEach((r) => {
      if (r.idea_id === parseInt(ideaId, 10) && r.related_paper_id === String(relatedPaperId)) {
        const owner = db.ideas.find((i) => i.idea_id === r.idea_id);
        if (owner && owner.email === email) r.is_new = 0;
      }
    });
    saveDB(db);
    return { status: 200 };
  }

  // ---- chat ----
  if (m === 'POST' && path === '/api/chat') {
    const { userName, paperId, value } = body || {};
    const p = getPaper(parseInt(paperId, 10));
    if (!p) return { status: 404, message: 'Paper not found.' };
    const reply = composeChatReply(p, String(value || ''));
    chatReplies.set(`${userName}::${paperId}`, { content: reply.content, ideas: reply.ideas, reads: 0, ts: nowMs() });
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/get_response') {
    const { userName, paperId } = body || {};
    const key = `${userName}::${paperId}`;
    const entry = chatReplies.get(key);
    if (!entry) return { status: 200, content: '' };
    entry.reads += 1;
    const finished = entry.reads >= 2 || nowMs() - entry.ts > 2500;
    if (!finished) {
      const cut = Math.max(1, Math.floor(entry.content.length * 0.5));
      return { status: 200, content: entry.content.slice(0, cut) + '[LOADING]' };
    }
    chatReplies.delete(key);
    return { status: 200, content: entry.content, ideas: entry.ideas };
  }

  // ---- feedback ----
  if (m === 'POST' && path === '/api/feedback') {
    return { status: 200 };
  }

  // ---- favorites ----
  if (m === 'POST' && (path === '/api/eidt_favorite' || path === '/api/edit_favorite')) {
    const { email, action, paper_id } = body || {};
    const u = db.users.find((x) => x.email === email);
    if (!u) return { status: 404 };
    const pid = String(paper_id);
    const had = u.favorite.includes(pid);
    if (action === 1) u.favorite = u.favorite.filter((x) => x !== pid);
    else if (action === 0) u.favorite = had ? u.favorite : [...u.favorite, pid];
    else u.favorite = had ? u.favorite.filter((x) => x !== pid) : [...u.favorite, pid];
    saveDB(db);
    return { status: 200, favorite: u.favorite };
  }

  // ---- search history ----
  if (m === 'POST' && path === '/api/search') {
    const { email, keyword } = body || {};
    if (!isEmail(email) || !keyword) return { status: 400 };
    const like = String(keyword).toLowerCase();
    const hits = PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(like) || p.description.toLowerCase().includes(like)
    ).map((p) => ({ id: p.id, name: p.name, description: p.description, price: p.price }));
    db.search_history.push({ id: db._next_history_id++, email, keyword, result_count: hits.length, created_at: nowIso() });
    saveDB(db);
    return { status: 200, results: hits };
  }
  if (m === 'GET' && path === '/api/search_history') {
    const email = query?.email;
    const rows = db.search_history
      .filter((h) => h.email === email)
      .sort((a, b) => b.id - a.id)
      .slice(0, 100);
    return { status: 200, history: rows };
  }
  const shidDelete = path.match(/^\/api\/search_history\/(\d+)$/);
  if (m === 'DELETE' && shidDelete) {
    const id = parseInt(shidDelete[1], 10);
    const email = query?.email;
    db.search_history = db.search_history.filter((h) => !(h.id === id && h.email === email));
    saveDB(db);
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/search_history/clear') {
    const { email } = body || {};
    db.search_history = db.search_history.filter((h) => h.email !== email);
    saveDB(db);
    return { status: 200 };
  }

  // ---- cart ----
  if (m === 'GET' && path === '/api/cart') {
    const email = query?.email;
    const items = db.cart
      .filter((c) => c.email === email)
      .map((c, idx) => {
        const p = PRODUCTS.find((x) => x.id === c.product_id);
        if (!p) return null;
        return {
          id: idx + 1, quantity: c.quantity, added_at: c.added_at,
          product_id: p.id, sku: p.sku, name: p.name, description: p.description,
          price: p.price, credits: p.credits, category: p.category, image_url: p.image_url,
        };
      })
      .filter(Boolean) as any[];
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    return { status: 200, items, subtotal: Number(subtotal.toFixed(2)) };
  }
  if (m === 'POST' && path === '/api/cart/add') {
    const { email, product_id, quantity = 1 } = body || {};
    if (!isEmail(email)) return { status: 400 };
    const existing = db.cart.find((c) => c.email === email && c.product_id === product_id);
    if (existing) existing.quantity += Math.max(1, parseInt(String(quantity), 10) || 1);
    else db.cart.push({ email, product_id, quantity: Math.max(1, parseInt(String(quantity), 10) || 1), added_at: nowIso() });
    saveDB(db);
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/cart/update') {
    const { email, product_id, quantity } = body || {};
    const qty = parseInt(String(quantity), 10);
    if (!qty || qty < 1) db.cart = db.cart.filter((c) => !(c.email === email && c.product_id === product_id));
    else { const e = db.cart.find((c) => c.email === email && c.product_id === product_id); if (e) e.quantity = qty; }
    saveDB(db);
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/cart/remove') {
    const { email, product_id } = body || {};
    db.cart = db.cart.filter((c) => !(c.email === email && c.product_id === product_id));
    saveDB(db);
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/cart/clear') {
    const { email } = body || {};
    db.cart = db.cart.filter((c) => c.email !== email);
    saveDB(db);
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/cart/checkout') {
    const { email, payment_method = 'mock' } = body || {};
    const items = db.cart
      .filter((c) => c.email === email)
      .map((c) => {
        const p = PRODUCTS.find((x) => x.id === c.product_id);
        return p ? { quantity: c.quantity, product_id: p.id, sku: p.sku, name: p.name, price: p.price, credits: p.credits, category: p.category } : null;
      })
      .filter(Boolean) as any[];
    if (items.length === 0) return { status: 400, message: 'Your cart is empty.' };
    const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const orderNo = 'ISV' + nowMs() + Math.floor(Math.random() * 1000);
    const addedCredits = items.reduce((s, it) => s + (it.credits || 0) * it.quantity, 0);
    const hasPlan = items.some((it) => it.category === 'plan');
    const u = db.users.find((x) => x.email === email);
    if (u) {
      if (addedCredits > 0) u.credit += addedCredits;
      if (hasPlan) { u.pro = 2; u.expired_date = addDays(30); }
    }
    db.orders.push({
      id: db._next_order_id++, order_no: orderNo, email,
      total: Number(total.toFixed(2)), status: 'paid', payment_method, items, created_at: nowIso(),
    });
    db.cart = db.cart.filter((c) => c.email !== email);
    saveDB(db);
    return {
      status: 200, order_no: orderNo, total: Number(total.toFixed(2)),
      newQuota: u?.credit, memberExpiredDate: u?.expired_date,
    };
  }
  if (m === 'GET' && path === '/api/orders') {
    const email = query?.email;
    const orders = db.orders
      .filter((o) => o.email === email)
      .sort((a, b) => b.id - a.id);
    return { status: 200, orders };
  }

  // ---- misc placeholders ----
  if (path === '/api/get_ali_token') return { status: 200, token: null };
  if (path === '/api/create-checkout-session' || path === '/api/create_payment') {
    return { status: 200, session_id: 'mock_' + nowMs(), url: '/cart?checkout=mock' };
  }
  if (path === '/api/purchase_callback' || path === '/api/purchase_paypal_callback') {
    return { status: 200 };
  }
  if (m === 'POST' && path === '/api/redemption') {
    const { email, code } = body || {};
    if (!isEmail(email) || !code) return { status: 400, message: 'Invalid redemption request.' };
    if (!/^TEAM07-[A-Z0-9]{2,}$/i.test(String(code).trim())) {
      return { status: 400, message: 'Invalid redemption code.' };
    }
    const u = db.users.find((x) => x.email === email);
    if (u) u.credit += 100;
    saveDB(db);
    return { status: 200, credit_added: 100 };
  }

  // ---- hallucination (mocked delay) ----
  if (m === 'POST' && path === '/api/hallucination_check') {
    const jobId = 'hc_' + nowMs() + '_' + Math.floor(Math.random() * 1e6);
    const options = Array.isArray(body?.options)
      ? body.options
      : (() => { try { return JSON.parse(body?.options || '[]'); } catch { return []; } })();
    db.hallucination_jobs.push({
      job_id: jobId, email: body?.email || '', file_name: body?.file_name || 'upload',
      options, status: 'processing', result: null,
    });
    // Schedule "completion"
    setTimeout(() => {
      const job = db.hallucination_jobs.find((j) => j.job_id === jobId);
      if (job) {
        job.status = 'done';
        job.result = mockHallucinationReport(job.file_name, job.options);
        saveDB(db);
      }
    }, 2500);
    saveDB(db);
    return { status: 200, job_id: jobId };
  }
  if (m === 'GET' && path === '/api/hallucination_status') {
    const jobId = query?.job_id;
    const job = db.hallucination_jobs.find((j) => j.job_id === jobId);
    if (!job) return { status: 'error', message: 'Job not found.' };
    return { status: job.status, data: job.result };
  }

  return null;
}

function mockHallucinationReport(fileName: string, options: string[]) {
  const issues: any[] = [];
  if (options.includes('ai')) {
    issues.push({ id: 'ai-1', markId: 'mark-ai-1', category: 'ai', severity: 'high', summary: 'Over-confident unsupported claim', excerpt: 'The proposed model outperforms all known baselines by 50%.', suggestion: 'Add citation or run the claimed comparison.' });
    issues.push({ id: 'ai-2', markId: 'mark-ai-2', category: 'ai', severity: 'medium', summary: 'Hedging without source', excerpt: 'Many researchers believe that ...', suggestion: 'Cite a survey or remove the claim.' });
  }
  if (options.includes('citation')) {
    issues.push({ id: 'ci-1', markId: 'mark-ci-1', category: 'citation', severity: 'high', summary: 'Non-existent reference', excerpt: '(Vaswani et al., 2025)', suggestion: 'Fix year, check DOI.' });
  }
  if (options.includes('writing')) {
    issues.push({ id: 'wr-1', markId: 'mark-wr-1', category: 'writing', severity: 'low', summary: 'Passive voice overuse', excerpt: 'It is observed that ...', suggestion: 'Rewrite in active voice.' });
  }
  if (options.includes('polish')) {
    issues.push({ id: 'po-1', markId: 'mark-po-1', category: 'polish', severity: 'low', summary: 'Inconsistent terminology', excerpt: 'LLMs vs. large language models', suggestion: 'Introduce the abbreviation once and keep it.' });
  }
  return {
    fileName,
    pollFinished: { ai: true, citation: true, writing: true, polish: true },
    aiResult: options.includes('ai') ? { risk: 'medium', score: 0.42 } : null,
    citations: issues.filter((i) => i.category === 'citation'),
    results: issues,
    fullText: `# Hallucination audit for ${fileName}\n\nAutomated audit generated by iSuperviz. Review each flagged span on the left and apply the suggestion.`,
  };
}

export function handleMockRequest(method: string, url: string, body: any): Json {
  try {
    const u = new URL(url, 'http://mock.isv');
    const query: Record<string, string> = {};
    u.searchParams.forEach((v, k) => { query[k] = v; });
    const path = u.pathname;
    const out = routeHandler(method, path, body, query);
    if (!out) return { status: 404, message: 'Not found: ' + path };
    return out;
  } catch (e: any) {
    return { status: 500, message: 'Mock error: ' + (e?.message || e) };
  }
}

export function resetMockDB() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  SEEDED_USERS.clear();
  // Also wipe the in-memory `db` so subsequent tests see a clean slate.
  db.users.length = 0;
  db.ideas.length = 0;
  db.idea_related.length = 0;
  db.cart.length = 0;
  db.orders.length = 0;
  db.search_history.length = 0;
  db.captchas.length = 0;
  db.hallucination_jobs.length = 0;
  db._next_idea_id = 1;
  db._next_rel_id = 1;
  db._next_order_id = 1;
  db._next_history_id = 1;
}
