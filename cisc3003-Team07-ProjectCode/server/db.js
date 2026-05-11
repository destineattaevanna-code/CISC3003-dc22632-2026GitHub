const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email            TEXT PRIMARY KEY,
    password_hash    TEXT,
    nickname         TEXT,
    avatar_url       TEXT,
    pro              INTEGER DEFAULT 1,
    credit           INTEGER DEFAULT 20,
    language         TEXT DEFAULT 'en',
    areas            TEXT DEFAULT '[]',
    topics           TEXT DEFAULT '[]',
    summary          TEXT DEFAULT '[]',
    favorite         TEXT DEFAULT '',
    expired_date     TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS captchas (
    email            TEXT NOT NULL,
    code             TEXT NOT NULL,
    purpose          TEXT NOT NULL,
    created_at       INTEGER NOT NULL,
    PRIMARY KEY (email, purpose)
  );

  CREATE TABLE IF NOT EXISTS products (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    sku              TEXT UNIQUE NOT NULL,
    name             TEXT NOT NULL,
    description      TEXT,
    price            REAL NOT NULL,
    credits          INTEGER DEFAULT 0,
    category         TEXT DEFAULT 'credit',
    image_url        TEXT,
    emoji            TEXT,
    gradient         TEXT,
    badge            TEXT,
    active           INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    email            TEXT NOT NULL,
    product_id       INTEGER NOT NULL,
    quantity         INTEGER NOT NULL DEFAULT 1,
    added_at         TEXT DEFAULT (datetime('now')),
    UNIQUE(email, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no         TEXT UNIQUE NOT NULL,
    email            TEXT NOT NULL,
    total            REAL NOT NULL,
    status           TEXT NOT NULL DEFAULT 'paid',
    payment_method   TEXT DEFAULT 'mock',
    items_json       TEXT NOT NULL,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    email            TEXT NOT NULL,
    keyword          TEXT NOT NULL,
    result_count     INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  -- ===== Paper / Research domain =====
  CREATE TABLE IF NOT EXISTS papers (
    paper_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    arxiv_id         TEXT UNIQUE,
    title            TEXT NOT NULL,
    author           TEXT,
    abstract         TEXT,
    pdf_url          TEXT,
    upload_date      TEXT,
    topic            TEXT,
    conference       TEXT,
    year             INTEGER,
    tags             TEXT DEFAULT '[]',
    thumbnail_url    TEXT,
    video_url        TEXT,
    video_duration   TEXT,
    view_count       INTEGER DEFAULT 0,
    read_count       INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS paper_notes (
    paper_id         INTEGER PRIMARY KEY,
    notes_json       TEXT NOT NULL,
    FOREIGN KEY (paper_id) REFERENCES papers(paper_id)
  );

  CREATE TABLE IF NOT EXISTS ideas (
    idea_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email            TEXT NOT NULL,
    paper_id         TEXT,
    idea             TEXT NOT NULL,
    novelty_score    REAL,
    feasibility_score REAL,
    state            TEXT DEFAULT 'budding',
    is_saved         INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS idea_related_papers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id          INTEGER NOT NULL,
    related_paper_id TEXT NOT NULL,
    title            TEXT,
    abstract         TEXT,
    authors          TEXT,
    year             INTEGER,
    pdf_url          TEXT,
    relevance_score  REAL,
    is_new           INTEGER DEFAULT 1,
    UNIQUE (idea_id, related_paper_id),
    FOREIGN KEY (idea_id) REFERENCES ideas(idea_id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    email            TEXT NOT NULL,
    paper_id         INTEGER,
    role             TEXT NOT NULL,
    content          TEXT NOT NULL,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    email            TEXT,
    action_type      TEXT,
    like             INTEGER,
    idea_id          INTEGER,
    content          TEXT,
    paper_id         TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hallucination_jobs (
    job_id           TEXT PRIMARY KEY,
    email            TEXT,
    file_name        TEXT,
    options_json     TEXT,
    status           TEXT DEFAULT 'processing',
    result_json      TEXT,
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
  );
`);

// Backwards compatibility: add emoji/gradient/badge columns if older db exists.
function ensureColumn(table, name, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn('products', 'emoji', "emoji TEXT");
ensureColumn('products', 'gradient', "gradient TEXT");
ensureColumn('products', 'badge', "badge TEXT");

// Helper: Unsplash CDN URL with consistent sizing.
const u = (id) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

// ---- product catalog (re-seed by SKU; safe across restarts) ----
const PRODUCTS = [
  // ===== Credits =====
  { sku: 'CREDIT_50',   name: '50 Starter Credits',
    description: 'Try out AI summaries and idea graphs without commitment.',
    price: 1.49, credits: 50, category: 'credit',
    emoji: '🌱', gradient: 'linear-gradient(135deg,#84fab0 0%,#8fd3f4 100%)', badge: 'Starter',
    image_url: u('photo-1532012197267-da84d127e765') },
  { sku: 'CREDIT_100',  name: '100 Research Credits',
    description: 'Pay-as-you-go bundle. Spend credits on AI paper summaries, idea graphs and reflective notes.',
    price: 2.99, credits: 100, category: 'credit',
    emoji: '⚡', gradient: 'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
    image_url: u('photo-1456406644174-8ddd4cd52a06') },
  { sku: 'CREDIT_500',  name: '500 Research Credits',
    description: 'Best for active reviewers. Includes priority AI response and longer chat context.',
    price: 9.99, credits: 500, category: 'credit',
    emoji: '🚀', gradient: 'linear-gradient(135deg,#fa709a 0%,#fee140 100%)', badge: 'Popular',
    image_url: u('photo-1517694712202-14dd9538aa97') },
  { sku: 'CREDIT_2000', name: '2,000 Research Credits',
    description: 'Great for whole-team use in a semester project. Shareable via team redemption codes.',
    price: 29.99, credits: 2000, category: 'credit',
    emoji: '💎', gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', badge: 'Team Pack',
    image_url: u('photo-1521791136064-7986c2920216') },
  { sku: 'CREDIT_5000', name: '5,000 Power Credits',
    description: 'For research labs and intensive paper-tracking workflows. Never run out mid-experiment.',
    price: 59.99, credits: 5000, category: 'credit',
    emoji: '🌟', gradient: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
    image_url: u('photo-1518152006812-edab29b069ac') },

  // ===== Plans =====
  { sku: 'PLUS_MONTH',  name: 'iSuperviz Plus (Monthly)',
    description: 'Unlimited paper tracking, unlimited AI chat, up to 5 research areas / 5 topics. Billed monthly.',
    price: 8.00, credits: 0, category: 'plan',
    emoji: '✨', gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
    image_url: u('photo-1518770660439-4636190af475') },
  { sku: 'PLUS_YEAR',   name: 'iSuperviz Plus (Yearly)',
    description: 'Same as Plus Monthly, billed yearly at $5/month equivalent. Save ~40%.',
    price: 60.00, credits: 0, category: 'plan',
    emoji: '👑', gradient: 'linear-gradient(135deg,#f6d365 0%,#fda085 100%)', badge: 'Best Value',
    image_url: u('photo-1620712943543-bcc4688e7485') },
  { sku: 'PLUS_LIFE',   name: 'Lifetime Pro Membership',
    description: 'One-time payment for lifelong Plus access. Limited founders\' pricing while in beta.',
    price: 199.00, credits: 0, category: 'plan',
    emoji: '♾️', gradient: 'linear-gradient(135deg,#0ba360 0%,#3cba92 100%)', badge: 'Limited',
    image_url: u('photo-1451187580459-43490279c0fa') },

  // ===== Reports =====
  { sku: 'REPORT_PACK', name: 'AI Literature Review Pack',
    description: 'Pre-generated literature review packs curated by our team (PDF + editable Markdown).',
    price: 14.99, credits: 0, category: 'report',
    emoji: '📚', gradient: 'linear-gradient(135deg,#ff9a9e 0%,#fad0c4 100%)',
    image_url: u('photo-1481627834876-b7833e8f5570') },
  { sku: 'REPORT_LLM',  name: 'LLM Trends Report 2026',
    description: 'Quarterly digest of the most influential papers in large language models, with key insights.',
    price: 19.99, credits: 0, category: 'report',
    emoji: '🤖', gradient: 'linear-gradient(135deg,#30cfd0 0%,#330867 100%)',
    image_url: u('photo-1677442136019-21780ecad995') },
  { sku: 'REPORT_HCI',  name: 'HCI x AI Field Notes',
    description: 'Hand-picked papers exploring the intersection of human-computer interaction and AI agents.',
    price: 12.99, credits: 0, category: 'report',
    emoji: '🧠', gradient: 'linear-gradient(135deg,#fccb90 0%,#d57eeb 100%)',
    image_url: u('photo-1551288049-bebda4e38f71') },

  // ===== Services =====
  { sku: 'CONSULT_30',  name: 'Supervisor Consultation (30 min)',
    description: 'One 30-minute online consultation with an iSuperviz supervisor volunteer.',
    price: 19.99, credits: 0, category: 'service',
    emoji: '🎓', gradient: 'linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)',
    image_url: u('photo-1543269865-cbf427effbad') },
  { sku: 'WORKSHOP',    name: 'Team Research Workshop (90 min)',
    description: 'Live workshop for your group on using iSuperviz for systematic literature reviews.',
    price: 49.99, credits: 0, category: 'service',
    emoji: '🤝', gradient: 'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',
    image_url: u('photo-1556761175-5973dc0f32e7') },

  // ===== Merch =====
  { sku: 'STICKER',     name: 'iSuperviz Sticker Pack',
    description: 'Six glossy holographic stickers featuring our mascot. Ships worldwide.',
    price: 4.99, credits: 0, category: 'merch',
    emoji: '🎨', gradient: 'linear-gradient(135deg,#ff6e7f 0%,#bfe9ff 100%)',
    image_url: u('photo-1626785774573-4b799315345d') },
  { sku: 'TSHIRT',      name: '"Read More Papers" T-Shirt',
    description: 'Comfy combed cotton tee with our signature graphic. Sizes S–XXL.',
    price: 24.99, credits: 0, category: 'merch',
    emoji: '👕', gradient: 'linear-gradient(135deg,#5ee7df 0%,#b490ca 100%)',
    image_url: u('photo-1521572163474-6864f9cf17ab') },
];

const seedProducts = db.transaction(() => {
  const upsert = db.prepare(`
    INSERT INTO products (sku, name, description, price, credits, category, image_url, emoji, gradient, badge, active)
    VALUES (@sku, @name, @description, @price, @credits, @category, @image_url, @emoji, @gradient, @badge, 1)
    ON CONFLICT(sku) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      credits = excluded.credits,
      category = excluded.category,
      image_url = excluded.image_url,
      emoji = excluded.emoji,
      gradient = excluded.gradient,
      badge = excluded.badge,
      active = 1
  `);
  for (const p of PRODUCTS) upsert.run({ image_url: '', badge: null, ...p });
});
seedProducts();

// ===== Seed a compact research paper catalog =====
// Each paper has a realistic arxiv_id, title, abstract, notes, and demo ideas.
// These papers are consciously curated so they connect via shared themes (LLMs,
// retrieval, multi-agents, vision, reinforcement learning) so the idea-graph
// feature actually has meaningful edges.

const PAPERS = [
  {
    arxiv_id: '2401.04088', title: 'Mixtral of Experts',
    author: 'Albert Q. Jiang, Alexandre Sablayrolles, Antoine Roux, Arthur Mensch et al.',
    abstract: "We introduce Mixtral 8x7B, a Sparse Mixture of Experts (SMoE) language model. Mixtral has the same architecture as Mistral 7B, with the difference that each layer is composed of 8 feedforward blocks (i.e. experts). For every token, at each layer, a router network selects two experts to process the current state and combine their outputs. Even though each token only sees two experts, the selected experts can be different at each timestep. As a result, each token has access to 47B parameters, but only uses 13B active parameters during inference. Mixtral was trained with a context size of 32k tokens and outperforms Llama 2 70B on most benchmarks.",
    pdf_url: 'https://arxiv.org/abs/2401.04088', upload_date: '2024-01-08', topic: 'LLMs',
    conference: 'arXiv', year: 2024, view_count: 184200,
    tags: ['LLM', 'MoE', 'Sparse Models', 'Efficient Inference'],
  },
  {
    arxiv_id: '2310.06825', title: 'Mistral 7B',
    author: 'Albert Q. Jiang, Alexandre Sablayrolles, Arthur Mensch, Chris Bamford et al.',
    abstract: "We introduce Mistral 7B, a 7-billion-parameter language model engineered for superior performance and efficiency. Mistral 7B outperforms the best open 13B model (Llama 2) across all evaluated benchmarks, and the best released 34B model (Llama 1) in reasoning, mathematics, and code generation. Our model leverages grouped-query attention for faster inference, coupled with sliding window attention to effectively handle sequences of arbitrary length with a reduced inference cost.",
    pdf_url: 'https://arxiv.org/abs/2310.06825', upload_date: '2023-10-10', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 98400,
    tags: ['LLM', 'Open Source', 'Efficiency', 'Attention'],
  },
  {
    arxiv_id: '2303.08774', title: 'GPT-4 Technical Report',
    author: 'OpenAI',
    abstract: "We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs and produce text outputs. While less capable than humans in many real-world scenarios, GPT-4 exhibits human-level performance on various professional and academic benchmarks, including passing a simulated bar exam with a score around the top 10% of test takers. GPT-4 is a Transformer-based model pre-trained to predict the next token in a document. The post-training alignment process results in improved performance on measures of factuality and adherence to desired behavior.",
    pdf_url: 'https://arxiv.org/abs/2303.08774', upload_date: '2023-03-15', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 412500,
    tags: ['GPT-4', 'Multimodal', 'Alignment', 'Benchmarks'],
  },
  {
    arxiv_id: '2005.11401', title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    author: 'Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni et al.',
    abstract: "Large pre-trained language models have been shown to store factual knowledge in their parameters and achieve state-of-the-art results when fine-tuned on downstream NLP tasks. However, their ability to access and precisely manipulate knowledge is still limited, and hence on knowledge-intensive tasks, their performance lags behind task-specific architectures. Additionally, providing provenance for their decisions and updating their world knowledge remain open research problems. We introduce retrieval-augmented generation (RAG) – models which combine pre-trained parametric and non-parametric memory for language generation.",
    pdf_url: 'https://arxiv.org/abs/2005.11401', upload_date: '2020-05-22', topic: 'RAG',
    conference: 'NeurIPS', year: 2020, view_count: 225900,
    tags: ['RAG', 'Retrieval', 'Generation', 'Knowledge'],
  },
  {
    arxiv_id: '2302.13971', title: 'LLaMA: Open and Efficient Foundation Language Models',
    author: 'Hugo Touvron, Thibaut Lavril, Gautier Izacard, Xavier Martinet et al.',
    abstract: "We introduce LLaMA, a collection of foundation language models ranging from 7B to 65B parameters. We train our models on trillions of tokens, and show that it is possible to train state-of-the-art models using publicly available datasets exclusively, without resorting to proprietary and inaccessible datasets. In particular, LLaMA-13B outperforms GPT-3 (175B) on most benchmarks, and LLaMA-65B is competitive with the best models, Chinchilla-70B and PaLM-540B. We release all our models to the research community.",
    pdf_url: 'https://arxiv.org/abs/2302.13971', upload_date: '2023-02-27', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 301000,
    tags: ['LLaMA', 'Open Source', 'Foundation Models'],
  },
  {
    arxiv_id: '2307.09288', title: 'Llama 2: Open Foundation and Fine-Tuned Chat Models',
    author: 'Hugo Touvron, Louis Martin, Kevin Stone, Peter Albert et al.',
    abstract: "In this work, we develop and release Llama 2, a collection of pretrained and fine-tuned large language models (LLMs) ranging in scale from 7 billion to 70 billion parameters. Our fine-tuned LLMs, called Llama 2-Chat, are optimized for dialogue use cases. Our models outperform open-source chat models on most benchmarks we tested, and based on our human evaluations for helpfulness and safety, may be a suitable substitute for closed-source models.",
    pdf_url: 'https://arxiv.org/abs/2307.09288', upload_date: '2023-07-18', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 280100,
    tags: ['Llama 2', 'RLHF', 'Alignment', 'Chat'],
  },
  {
    arxiv_id: '2305.18290', title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
    author: 'Rafael Rafailov, Archit Sharma, Eric Mitchell, Stefano Ermon et al.',
    abstract: "While large-scale unsupervised language models (LMs) learn broad world knowledge and some reasoning skills, achieving precise control of their behavior is difficult due to the completely unsupervised nature of their training. Existing methods for gaining such steerability collect human labels of the relative quality of model generations and fine-tune the unsupervised LM to align with these preferences. We introduce a new parameterization of the reward model in RLHF that enables extraction of the corresponding optimal policy in closed form, allowing us to solve the standard RLHF problem with only a simple classification loss.",
    pdf_url: 'https://arxiv.org/abs/2305.18290', upload_date: '2023-05-29', topic: 'Alignment',
    conference: 'NeurIPS', year: 2023, view_count: 165200,
    tags: ['DPO', 'RLHF', 'Alignment', 'Preference Learning'],
  },
  {
    arxiv_id: '2401.01335', title: 'Self-Rewarding Language Models',
    author: 'Weizhe Yuan, Richard Yuanzhe Pang, Kyunghyun Cho, Xian Li et al.',
    abstract: "We posit that to achieve superhuman agents, future models require superhuman feedback in order to provide an adequate training signal. Current approaches commonly train reward models from human preferences, which may then be bottlenecked by human performance level. In this work, we study Self-Rewarding Language Models, where the language model itself is used via LLM-as-a-Judge prompting to provide its own rewards during training. We show that during Iterative DPO training the instruction following ability improves, but also the ability to provide high-quality rewards to itself.",
    pdf_url: 'https://arxiv.org/abs/2401.01335', upload_date: '2024-01-18', topic: 'Alignment',
    conference: 'arXiv', year: 2024, view_count: 88400,
    tags: ['Self-Rewarding', 'Alignment', 'RLHF', 'LLM'],
  },
  {
    arxiv_id: '2308.08155', title: 'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation',
    author: 'Qingyun Wu, Gagan Bansal, Jieyu Zhang, Yiran Wu et al.',
    abstract: "AutoGen is an open-source framework that allows developers to build LLM applications via multiple agents that can converse with each other to accomplish tasks. AutoGen agents are customizable, conversable, and can operate in various modes that employ combinations of LLMs, human inputs, and tools. Using AutoGen, developers can also flexibly define agent interaction behaviors. Both natural language and computer code can be used to program flexible conversation patterns for different applications.",
    pdf_url: 'https://arxiv.org/abs/2308.08155', upload_date: '2023-08-16', topic: 'Agents',
    conference: 'arXiv', year: 2023, view_count: 142700,
    tags: ['Multi-Agent', 'AutoGen', 'LLM Agents', 'Framework'],
  },
  {
    arxiv_id: '2310.11511', title: 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection',
    author: 'Akari Asai, Zeqiu Wu, Yizhong Wang, Avirup Sil et al.',
    abstract: "Despite their remarkable capabilities, large language models (LLMs) often produce responses containing factual inaccuracies due to their sole reliance on the parametric knowledge they encapsulate. Retrieval-Augmented Generation (RAG) augments LMs with retrieved relevant knowledge, but indiscriminately retrieving and incorporating passages hurt LMs' versatility. We introduce Self-Reflective Retrieval-Augmented Generation, a new framework that enhances an LM's quality and factuality through retrieval and self-reflection.",
    pdf_url: 'https://arxiv.org/abs/2310.11511', upload_date: '2023-10-17', topic: 'RAG',
    conference: 'ICLR', year: 2024, view_count: 121500,
    tags: ['Self-RAG', 'RAG', 'Reflection', 'Factuality'],
  },
  {
    arxiv_id: '2210.03629', title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
    author: 'Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du et al.',
    abstract: "While large language models (LLMs) have demonstrated impressive capabilities across tasks in language understanding and interactive decision making, their abilities for reasoning (e.g. chain-of-thought prompting) and acting (e.g. action plan generation) have primarily been studied as separate topics. In this paper, we explore the use of LLMs to generate both reasoning traces and task-specific actions in an interleaved manner, allowing for greater synergy between the two.",
    pdf_url: 'https://arxiv.org/abs/2210.03629', upload_date: '2022-10-06', topic: 'Agents',
    conference: 'ICLR', year: 2023, view_count: 198300,
    tags: ['ReAct', 'Reasoning', 'Agents', 'Chain-of-Thought'],
  },
  {
    arxiv_id: '2203.11171', title: 'Self-Consistency Improves Chain-of-Thought Reasoning in Language Models',
    author: 'Xuezhi Wang, Jason Wei, Dale Schuurmans, Quoc Le et al.',
    abstract: "Chain-of-thought prompting combined with pre-trained large language models has achieved encouraging results on complex reasoning tasks. In this paper, we propose a new decoding strategy, self-consistency, to replace the naive greedy decoding used in chain-of-thought prompting. It first samples a diverse set of reasoning paths instead of only taking the greedy one, and then selects the most consistent answer by marginalizing out the sampled reasoning paths.",
    pdf_url: 'https://arxiv.org/abs/2203.11171', upload_date: '2022-03-21', topic: 'Reasoning',
    conference: 'ICLR', year: 2023, view_count: 112100,
    tags: ['Self-Consistency', 'Chain-of-Thought', 'Reasoning'],
  },
  {
    arxiv_id: '2304.03442', title: 'Generative Agents: Interactive Simulacra of Human Behavior',
    author: 'Joon Sung Park, Joseph C. O\'Brien, Carrie J. Cai, Meredith Ringel Morris et al.',
    abstract: "Believable proxies of human behavior can empower interactive applications ranging from immersive environments to rehearsal spaces for interpersonal communication to prototyping tools. In this paper, we introduce generative agents—computational software agents that simulate believable human behavior. Generative agents wake up, cook breakfast, and head to work; artists paint, while authors write; they form opinions, notice each other, and initiate conversations; they remember and reflect on days past as they plan the next day.",
    pdf_url: 'https://arxiv.org/abs/2304.03442', upload_date: '2023-04-07', topic: 'Agents',
    conference: 'UIST', year: 2023, view_count: 176500,
    tags: ['Generative Agents', 'Multi-Agent', 'Simulation', 'HCI'],
  },
  {
    arxiv_id: '2312.10997', title: 'Retrieval-Augmented Generation for Large Language Models: A Survey',
    author: 'Yunfan Gao, Yun Xiong, Xinyu Gao, Kangxiang Jia et al.',
    abstract: "Large Language Models (LLMs) demonstrate significant capabilities but face challenges such as hallucination, outdated knowledge, and non-transparent reasoning. Retrieval-Augmented Generation (RAG) has emerged as a promising solution by incorporating knowledge from external databases. This paper outlines the development paradigms of RAG, categorizing them into Naive RAG, Advanced RAG, and Modular RAG, and comprehensively compares approaches across retrieval, generation, and augmentation technologies.",
    pdf_url: 'https://arxiv.org/abs/2312.10997', upload_date: '2023-12-18', topic: 'RAG',
    conference: 'arXiv', year: 2023, view_count: 134700,
    tags: ['RAG', 'Survey', 'Retrieval', 'Hallucination'],
  },
  {
    arxiv_id: '2009.03300', title: 'Measuring Massive Multitask Language Understanding',
    author: 'Dan Hendrycks, Collin Burns, Steven Basart, Andy Zou et al.',
    abstract: "We propose a new test to measure a text model's multitask accuracy. The test covers 57 tasks including elementary mathematics, US history, computer science, law, and more. To attain high accuracy on this test, models must possess extensive world knowledge and problem solving ability. We find that while most recent models have near random-chance accuracy, the very largest GPT-3 model improves over random chance by almost 20 percentage points on average.",
    pdf_url: 'https://arxiv.org/abs/2009.03300', upload_date: '2020-09-07', topic: 'Benchmarks',
    conference: 'ICLR', year: 2021, view_count: 96300,
    tags: ['MMLU', 'Benchmarks', 'Evaluation', 'LLM'],
  },
  {
    arxiv_id: '2103.00020', title: 'Learning Transferable Visual Models From Natural Language Supervision (CLIP)',
    author: 'Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh et al.',
    abstract: "State-of-the-art computer vision systems are trained to predict a fixed set of predetermined object categories. This restricted form of supervision limits their generality and usability. Learning directly from raw text about images is a promising alternative which leverages a much broader source of supervision. We demonstrate that the simple pre-training task of predicting which caption goes with which image is an efficient and scalable way to learn SOTA image representations from scratch on a dataset of 400 million (image, text) pairs.",
    pdf_url: 'https://arxiv.org/abs/2103.00020', upload_date: '2021-02-26', topic: 'Computer Vision',
    conference: 'ICML', year: 2021, view_count: 235400,
    tags: ['CLIP', 'Vision-Language', 'Contrastive Learning', 'Multimodal'],
  },
  {
    arxiv_id: '2112.10752', title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
    author: 'Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser et al.',
    abstract: "By decomposing the image formation process into a sequential application of denoising autoencoders, diffusion models (DMs) achieve state-of-the-art synthesis results on image data and beyond. Additionally, their formulation allows for a guiding mechanism to control the image generation process without retraining. To enable DM training on limited computational resources while retaining their quality and flexibility, we apply them in the latent space of powerful pretrained autoencoders.",
    pdf_url: 'https://arxiv.org/abs/2112.10752', upload_date: '2021-12-20', topic: 'Diffusion Models',
    conference: 'CVPR', year: 2022, view_count: 187600,
    tags: ['Stable Diffusion', 'Generative', 'Image Synthesis', 'Latent'],
  },
  {
    arxiv_id: '1706.03762', title: 'Attention Is All You Need',
    author: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit et al.',
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
    pdf_url: 'https://arxiv.org/abs/1706.03762', upload_date: '2017-06-12', topic: 'Transformers',
    conference: 'NeurIPS', year: 2017, view_count: 620400,
    tags: ['Transformer', 'Attention', 'Foundation'],
  },
  {
    arxiv_id: '1810.04805', title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    author: 'Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova',
    abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pretrain deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks.",
    pdf_url: 'https://arxiv.org/abs/1810.04805', upload_date: '2018-10-11', topic: 'NLP',
    conference: 'NAACL', year: 2019, view_count: 430000,
    tags: ['BERT', 'Pre-training', 'Transformers', 'NLP'],
  },
  {
    arxiv_id: '1409.3215', title: 'Sequence to Sequence Learning with Neural Networks',
    author: 'Ilya Sutskever, Oriol Vinyals, Quoc V. Le',
    abstract: "Deep Neural Networks (DNNs) are powerful models that have achieved excellent performance on difficult learning tasks. In this paper, we present a general end-to-end approach to sequence learning that makes minimal assumptions on the sequence structure. Our method uses a multilayered Long Short-Term Memory (LSTM) to map the input sequence to a vector of a fixed dimensionality, and then another deep LSTM to decode the target sequence from the vector.",
    pdf_url: 'https://arxiv.org/abs/1409.3215', upload_date: '2014-09-10', topic: 'Deep Learning',
    conference: 'NeurIPS', year: 2014, view_count: 148900,
    tags: ['Seq2Seq', 'LSTM', 'Translation'],
  },
  {
    arxiv_id: '2302.04761', title: 'Toolformer: Language Models Can Teach Themselves to Use Tools',
    author: 'Timo Schick, Jane Dwivedi-Yu, Roberto Dessì, Roberta Raileanu et al.',
    abstract: "Language models (LMs) exhibit remarkable abilities to solve new tasks from just a few examples or textual instructions, especially at scale. They also, paradoxically, struggle with basic functionality, such as arithmetic or factual lookup, where much simpler and smaller models excel. In this paper, we show that LMs can teach themselves to use external tools via simple APIs and achieve the best of both worlds.",
    pdf_url: 'https://arxiv.org/abs/2302.04761', upload_date: '2023-02-09', topic: 'Agents',
    conference: 'NeurIPS', year: 2023, view_count: 109800,
    tags: ['Tool Use', 'Agents', 'API', 'LLM'],
  },
  {
    arxiv_id: '2301.12597', title: 'BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and LLMs',
    author: 'Junnan Li, Dongxu Li, Silvio Savarese, Steven Hoi',
    abstract: "The cost of vision-and-language pre-training has become increasingly prohibitive due to end-to-end training of large-scale models. This paper proposes BLIP-2, a generic and efficient pre-training strategy that bootstraps vision-language pre-training from off-the-shelf frozen pre-trained image encoders and frozen large language models. BLIP-2 bridges the modality gap with a lightweight Querying Transformer.",
    pdf_url: 'https://arxiv.org/abs/2301.12597', upload_date: '2023-01-30', topic: 'Multimodal',
    conference: 'ICML', year: 2023, view_count: 89400,
    tags: ['BLIP-2', 'Vision-Language', 'Multimodal', 'Efficient'],
  },
  {
    arxiv_id: '2106.09685', title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    author: 'Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu et al.',
    abstract: "An important paradigm of natural language processing consists of large-scale pre-training on general domain data and adaptation to particular tasks or domains. As we pre-train larger models, full fine-tuning, which retrains all model parameters, becomes less feasible. Using GPT-3 175B as an example — deploying independent instances of fine-tuned models, each with 175B parameters, is prohibitively expensive. We propose Low-Rank Adaptation, or LoRA, which freezes the pre-trained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture.",
    pdf_url: 'https://arxiv.org/abs/2106.09685', upload_date: '2021-06-17', topic: 'Fine-tuning',
    conference: 'ICLR', year: 2022, view_count: 215600,
    tags: ['LoRA', 'PEFT', 'Fine-tuning', 'Efficiency'],
  },
  {
    arxiv_id: '2305.14314', title: 'QLoRA: Efficient Finetuning of Quantized LLMs',
    author: 'Tim Dettmers, Artidoro Pagnoni, Ari Holtzman, Luke Zettlemoyer',
    abstract: "We present QLoRA, an efficient finetuning approach that reduces memory usage enough to finetune a 65B parameter model on a single 48GB GPU while preserving full 16-bit finetuning task performance. QLoRA backpropagates gradients through a frozen, 4-bit quantized pretrained language model into Low Rank Adapters (LoRA). Our best model family, which we name Guanaco, outperforms all previously openly released models on the Vicuna benchmark, reaching 99.3% of the performance level of ChatGPT.",
    pdf_url: 'https://arxiv.org/abs/2305.14314', upload_date: '2023-05-23', topic: 'Fine-tuning',
    conference: 'NeurIPS', year: 2023, view_count: 138200,
    tags: ['QLoRA', 'Quantization', 'Fine-tuning', 'Efficiency'],
  },
  {
    arxiv_id: '2402.03300', title: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models',
    author: 'Zhihong Shao, Peiyi Wang, Qihao Zhu, Runxin Xu et al.',
    abstract: "Mathematical reasoning poses a significant challenge for language models due to its complex and structured nature. In this paper, we introduce DeepSeekMath 7B, which continues pre-training DeepSeek-Coder-Base-v1.5 7B with 120B math-related tokens sourced from Common Crawl, together with natural language and code data. DeepSeekMath 7B has achieved an impressive score of 51.7% on the competition-level MATH benchmark without relying on external toolkits and voting techniques, approaching the performance level of Gemini-Ultra and GPT-4.",
    pdf_url: 'https://arxiv.org/abs/2402.03300', upload_date: '2024-02-05', topic: 'Reasoning',
    conference: 'arXiv', year: 2024, view_count: 74200,
    tags: ['Math', 'Reasoning', 'Open Source', 'LLM'],
  },
];

// Paper notes - reflective analysis of each paper (shown on PaperDetail page)
const makeNotes = (p) => ({
  'Key Contribution':
    `**${p.title}** introduces a novel approach in the area of **${p.topic}**. ` +
    `The authors (${(p.author || '').split(',').slice(0, 2).join(',')} et al.) present a systematic methodology ` +
    `that significantly improves on prior baselines across benchmark suites.\n\n` +
    `> Core claim: the proposed method achieves state-of-the-art results on multiple evaluation protocols ` +
    `relevant to **${(p.tags || []).slice(0, 3).join(', ')}**.`,
  'Method Overview':
    `The authors describe a three-stage pipeline:\n\n` +
    `1. **Data curation** — they construct a high-quality dataset tailored to the problem setting.\n` +
    `2. **Model design** — the architecture leverages ideas from ${(p.tags || ['transformers'])[0]} to balance capacity and efficiency.\n` +
    `3. **Training recipe** — a carefully designed objective combined with scheduled regularization avoids overfitting and improves generalization.\n\n` +
    `The ablation studies in Section 4 highlight which components contribute the most to the reported gains.`,
  'Strengths':
    `- Extensive empirical evaluation across multiple benchmarks.\n` +
    `- Clean and reproducible training pipeline with released checkpoints.\n` +
    `- Clear analysis of failure modes and limitations.\n` +
    `- Strong connection to prior work, showing a principled extension rather than a pure engineering hack.`,
  'Open Questions':
    `- How well does this method transfer to low-resource languages or domain-specific corpora?\n` +
    `- Can the scaling trends be replicated with smaller compute budgets in academic labs?\n` +
    `- What are the safety and fairness implications when the model is deployed in real-world systems?`,
  'Why It Matters For You':
    `If you're working on **${p.topic}** or any downstream task that depends on it, this paper gives you: ` +
    `(a) a clear baseline to compare against, (b) a reusable training recipe, and (c) a dataset that you ` +
    `can build on. Pairs nicely with the retrieval-augmented and alignment literature indexed in iSuperviz.`,
});

// Seed papers + notes (idempotent)
const seedPapers = db.transaction(() => {
  const insert = db.prepare(`
    INSERT INTO papers (arxiv_id, title, author, abstract, pdf_url, upload_date, topic, conference, year, tags, view_count)
    VALUES (@arxiv_id, @title, @author, @abstract, @pdf_url, @upload_date, @topic, @conference, @year, @tags, @view_count)
    ON CONFLICT(arxiv_id) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      abstract = excluded.abstract,
      pdf_url = excluded.pdf_url,
      upload_date = excluded.upload_date,
      topic = excluded.topic,
      conference = excluded.conference,
      year = excluded.year,
      tags = excluded.tags,
      view_count = excluded.view_count
  `);
  const upsertNotes = db.prepare(`
    INSERT INTO paper_notes (paper_id, notes_json) VALUES (?, ?)
    ON CONFLICT(paper_id) DO UPDATE SET notes_json = excluded.notes_json
  `);
  for (const p of PAPERS) {
    insert.run({
      arxiv_id: p.arxiv_id,
      title: p.title,
      author: p.author,
      abstract: p.abstract,
      pdf_url: p.pdf_url,
      upload_date: p.upload_date,
      topic: p.topic,
      conference: p.conference,
      year: p.year,
      tags: JSON.stringify(p.tags || []),
      view_count: p.view_count || 0,
    });
    const row = db.prepare('SELECT paper_id FROM papers WHERE arxiv_id = ?').get(p.arxiv_id);
    if (row) {
      upsertNotes.run(row.paper_id, JSON.stringify(makeNotes(p)));
    }
  }
});
seedPapers();

module.exports = db;
