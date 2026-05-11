// Shared seed data so the front-end works as a pure static site on GitHub Pages.
// Keep a compact subset of the backend's SQLite seed mirrored here.

export type MockPaper = {
  paper_id: number;
  arxiv_id: string;
  title: string;
  author: string;
  abstract: string;
  pdf_url: string;
  upload_date: string;
  topic: string;
  conference: string;
  year: number;
  tags: string[];
  view_count: number;
  read_count?: number;
  thumbnail_url?: string;
  video_url?: string;
  video_duration?: string;
  has_video?: boolean;
  /** Hand-curated excerpt from the paper (Introduction / Method / Discussion) */
  excerpt?: string;
};

// (Paper cover + video badge enrichment lives in src/mock/mockApi.ts so that
// the seed stays a pure, UI-agnostic data source.)

export type MockProduct = {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  category: string;
  image_url: string;
  emoji?: string;
  gradient?: string;
  badge?: string | null;
  active?: number;
};

export const PAPERS: MockPaper[] = [
  {
    paper_id: 1, arxiv_id: '2401.04088', title: 'Mixtral of Experts',
    author: 'Albert Q. Jiang, Alexandre Sablayrolles, Antoine Roux, Arthur Mensch et al.',
    abstract: 'We introduce Mixtral 8x7B, a Sparse Mixture of Experts (SMoE) language model. Mixtral has the same architecture as Mistral 7B, with the difference that each layer is composed of 8 feedforward blocks (i.e. experts). For every token, at each layer, a router network selects two experts to process the current state and combine their outputs.',
    pdf_url: 'https://arxiv.org/abs/2401.04088', upload_date: '2024-01-08', topic: 'LLMs',
    conference: 'arXiv', year: 2024, view_count: 184200,
    tags: ['LLM', 'MoE', 'Sparse Models', 'Efficient Inference'],
  },
  {
    paper_id: 2, arxiv_id: '2310.06825', title: 'Mistral 7B',
    author: 'Albert Q. Jiang, Alexandre Sablayrolles, Arthur Mensch, Chris Bamford et al.',
    abstract: 'We introduce Mistral 7B, a 7-billion-parameter language model engineered for superior performance and efficiency. Mistral 7B outperforms the best open 13B model (Llama 2) across all evaluated benchmarks.',
    pdf_url: 'https://arxiv.org/abs/2310.06825', upload_date: '2023-10-10', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 98400,
    tags: ['LLM', 'Open Source', 'Efficiency', 'Attention'],
  },
  {
    paper_id: 3, arxiv_id: '2303.08774', title: 'GPT-4 Technical Report',
    author: 'OpenAI',
    abstract: 'We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs and produce text outputs. GPT-4 exhibits human-level performance on various professional and academic benchmarks.',
    pdf_url: 'https://arxiv.org/abs/2303.08774', upload_date: '2023-03-15', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 412500,
    tags: ['GPT-4', 'Multimodal', 'Alignment', 'Benchmarks'],
  },
  {
    paper_id: 4, arxiv_id: '2005.11401', title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    author: 'Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni et al.',
    abstract: 'We introduce retrieval-augmented generation (RAG) – models which combine pre-trained parametric and non-parametric memory for language generation.',
    pdf_url: 'https://arxiv.org/abs/2005.11401', upload_date: '2020-05-22', topic: 'RAG',
    conference: 'NeurIPS', year: 2020, view_count: 225900,
    tags: ['RAG', 'Retrieval', 'Generation', 'Knowledge'],
  },
  {
    paper_id: 5, arxiv_id: '2302.13971', title: 'LLaMA: Open and Efficient Foundation Language Models',
    author: 'Hugo Touvron, Thibaut Lavril, Gautier Izacard, Xavier Martinet et al.',
    abstract: 'We introduce LLaMA, a collection of foundation language models ranging from 7B to 65B parameters. LLaMA-13B outperforms GPT-3 on most benchmarks.',
    pdf_url: 'https://arxiv.org/abs/2302.13971', upload_date: '2023-02-27', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 301000,
    tags: ['LLaMA', 'Open Source', 'Foundation Models'],
  },
  {
    paper_id: 6, arxiv_id: '2307.09288', title: 'Llama 2: Open Foundation and Fine-Tuned Chat Models',
    author: 'Hugo Touvron, Louis Martin, Kevin Stone, Peter Albert et al.',
    abstract: 'Llama 2 is a collection of pretrained and fine-tuned large language models ranging from 7 billion to 70 billion parameters. Llama 2-Chat is optimized for dialogue use cases.',
    pdf_url: 'https://arxiv.org/abs/2307.09288', upload_date: '2023-07-18', topic: 'LLMs',
    conference: 'arXiv', year: 2023, view_count: 280100,
    tags: ['Llama 2', 'RLHF', 'Alignment', 'Chat'],
  },
  {
    paper_id: 7, arxiv_id: '2305.18290', title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
    author: 'Rafael Rafailov, Archit Sharma, Eric Mitchell, Stefano Ermon et al.',
    abstract: 'We introduce DPO, a new parameterization of the reward model in RLHF that enables extraction of the corresponding optimal policy in closed form.',
    pdf_url: 'https://arxiv.org/abs/2305.18290', upload_date: '2023-05-29', topic: 'Alignment',
    conference: 'NeurIPS', year: 2023, view_count: 165200,
    tags: ['DPO', 'RLHF', 'Alignment', 'Preference Learning'],
  },
  {
    paper_id: 8, arxiv_id: '2401.01335', title: 'Self-Rewarding Language Models',
    author: 'Weizhe Yuan, Richard Yuanzhe Pang, Kyunghyun Cho, Xian Li et al.',
    abstract: 'Self-Rewarding Language Models use LLM-as-a-Judge prompting to provide their own rewards during training.',
    pdf_url: 'https://arxiv.org/abs/2401.01335', upload_date: '2024-01-18', topic: 'Alignment',
    conference: 'arXiv', year: 2024, view_count: 88400,
    tags: ['Self-Rewarding', 'Alignment', 'RLHF', 'LLM'],
  },
  {
    paper_id: 9, arxiv_id: '2308.08155', title: 'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation',
    author: 'Qingyun Wu, Gagan Bansal, Jieyu Zhang, Yiran Wu et al.',
    abstract: 'AutoGen is an open-source framework that allows developers to build LLM applications via multiple agents that can converse with each other.',
    pdf_url: 'https://arxiv.org/abs/2308.08155', upload_date: '2023-08-16', topic: 'Agents',
    conference: 'arXiv', year: 2023, view_count: 142700,
    tags: ['Multi-Agent', 'AutoGen', 'LLM Agents', 'Framework'],
  },
  {
    paper_id: 10, arxiv_id: '2310.11511', title: 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection',
    author: 'Akari Asai, Zeqiu Wu, Yizhong Wang, Avirup Sil et al.',
    abstract: 'Self-Reflective Retrieval-Augmented Generation enhances an LM quality and factuality through retrieval and self-reflection.',
    pdf_url: 'https://arxiv.org/abs/2310.11511', upload_date: '2023-10-17', topic: 'RAG',
    conference: 'ICLR', year: 2024, view_count: 121500,
    tags: ['Self-RAG', 'RAG', 'Reflection', 'Factuality'],
  },
  {
    paper_id: 11, arxiv_id: '2210.03629', title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
    author: 'Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du et al.',
    abstract: 'ReAct lets LLMs generate both reasoning traces and task-specific actions in an interleaved manner.',
    pdf_url: 'https://arxiv.org/abs/2210.03629', upload_date: '2022-10-06', topic: 'Agents',
    conference: 'ICLR', year: 2023, view_count: 198300,
    tags: ['ReAct', 'Reasoning', 'Agents', 'Chain-of-Thought'],
  },
  {
    paper_id: 12, arxiv_id: '2203.11171', title: 'Self-Consistency Improves Chain-of-Thought Reasoning in Language Models',
    author: 'Xuezhi Wang, Jason Wei, Dale Schuurmans, Quoc Le et al.',
    abstract: 'Self-consistency samples a diverse set of reasoning paths instead of only taking the greedy one, then selects the most consistent answer.',
    pdf_url: 'https://arxiv.org/abs/2203.11171', upload_date: '2022-03-21', topic: 'Reasoning',
    conference: 'ICLR', year: 2023, view_count: 112100,
    tags: ['Self-Consistency', 'Chain-of-Thought', 'Reasoning'],
  },
  {
    paper_id: 13, arxiv_id: '2304.03442', title: 'Generative Agents: Interactive Simulacra of Human Behavior',
    author: "Joon Sung Park, Joseph C. O'Brien, Carrie J. Cai, Meredith Ringel Morris et al.",
    abstract: 'We introduce generative agents that simulate believable human behavior: they remember, reflect, plan, and interact.',
    pdf_url: 'https://arxiv.org/abs/2304.03442', upload_date: '2023-04-07', topic: 'Agents',
    conference: 'UIST', year: 2023, view_count: 176500,
    tags: ['Generative Agents', 'Multi-Agent', 'Simulation', 'HCI'],
  },
  {
    paper_id: 14, arxiv_id: '2312.10997', title: 'Retrieval-Augmented Generation for Large Language Models: A Survey',
    author: 'Yunfan Gao, Yun Xiong, Xinyu Gao, Kangxiang Jia et al.',
    abstract: 'This survey categorizes RAG into Naive, Advanced and Modular paradigms and compares retrieval, generation, and augmentation technologies.',
    pdf_url: 'https://arxiv.org/abs/2312.10997', upload_date: '2023-12-18', topic: 'RAG',
    conference: 'arXiv', year: 2023, view_count: 134700,
    tags: ['RAG', 'Survey', 'Retrieval', 'Hallucination'],
  },
  {
    paper_id: 15, arxiv_id: '2009.03300', title: 'Measuring Massive Multitask Language Understanding',
    author: 'Dan Hendrycks, Collin Burns, Steven Basart, Andy Zou et al.',
    abstract: 'MMLU is a test covering 57 tasks, from elementary mathematics to US history, law, and computer science. The largest GPT-3 model improves over random chance by ~20 points.',
    pdf_url: 'https://arxiv.org/abs/2009.03300', upload_date: '2020-09-07', topic: 'Benchmarks',
    conference: 'ICLR', year: 2021, view_count: 96300,
    tags: ['MMLU', 'Benchmarks', 'Evaluation', 'LLM'],
  },
  {
    paper_id: 16, arxiv_id: '2103.00020', title: 'Learning Transferable Visual Models From Natural Language Supervision (CLIP)',
    author: 'Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh et al.',
    abstract: 'CLIP learns state-of-the-art image representations from 400M (image, text) pairs.',
    pdf_url: 'https://arxiv.org/abs/2103.00020', upload_date: '2021-02-26', topic: 'Computer Vision',
    conference: 'ICML', year: 2021, view_count: 235400,
    tags: ['CLIP', 'Vision-Language', 'Contrastive Learning', 'Multimodal'],
  },
  {
    paper_id: 17, arxiv_id: '2112.10752', title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
    author: 'Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser et al.',
    abstract: 'Latent diffusion models achieve state-of-the-art image synthesis on limited computational budgets.',
    pdf_url: 'https://arxiv.org/abs/2112.10752', upload_date: '2021-12-20', topic: 'Diffusion Models',
    conference: 'CVPR', year: 2022, view_count: 187600,
    tags: ['Stable Diffusion', 'Generative', 'Image Synthesis', 'Latent'],
  },
  {
    paper_id: 18, arxiv_id: '1706.03762', title: 'Attention Is All You Need',
    author: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit et al.',
    abstract: 'We propose the Transformer, a new network architecture based solely on attention mechanisms.',
    pdf_url: 'https://arxiv.org/abs/1706.03762', upload_date: '2017-06-12', topic: 'Transformers',
    conference: 'NeurIPS', year: 2017, view_count: 620400,
    tags: ['Transformer', 'Attention', 'Foundation'],
  },
  {
    paper_id: 19, arxiv_id: '1810.04805', title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    author: 'Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova',
    abstract: 'BERT pre-trains deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context.',
    pdf_url: 'https://arxiv.org/abs/1810.04805', upload_date: '2018-10-11', topic: 'NLP',
    conference: 'NAACL', year: 2019, view_count: 430000,
    tags: ['BERT', 'Pre-training', 'Transformers', 'NLP'],
  },
  {
    paper_id: 20, arxiv_id: '1409.3215', title: 'Sequence to Sequence Learning with Neural Networks',
    author: 'Ilya Sutskever, Oriol Vinyals, Quoc V. Le',
    abstract: 'A general end-to-end approach to sequence learning using multilayered LSTMs.',
    pdf_url: 'https://arxiv.org/abs/1409.3215', upload_date: '2014-09-10', topic: 'Deep Learning',
    conference: 'NeurIPS', year: 2014, view_count: 148900,
    tags: ['Seq2Seq', 'LSTM', 'Translation'],
  },
  {
    paper_id: 21, arxiv_id: '2302.04761', title: 'Toolformer: Language Models Can Teach Themselves to Use Tools',
    author: 'Timo Schick, Jane Dwivedi-Yu, Roberto Dessì, Roberta Raileanu et al.',
    abstract: 'Toolformer shows that LMs can teach themselves to use external tools via simple APIs.',
    pdf_url: 'https://arxiv.org/abs/2302.04761', upload_date: '2023-02-09', topic: 'Agents',
    conference: 'NeurIPS', year: 2023, view_count: 109800,
    tags: ['Tool Use', 'Agents', 'API', 'LLM'],
  },
  {
    paper_id: 22, arxiv_id: '2301.12597', title: 'BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and LLMs',
    author: 'Junnan Li, Dongxu Li, Silvio Savarese, Steven Hoi',
    abstract: 'BLIP-2 bridges the modality gap with a lightweight Querying Transformer and frozen pretrained models.',
    pdf_url: 'https://arxiv.org/abs/2301.12597', upload_date: '2023-01-30', topic: 'Multimodal',
    conference: 'ICML', year: 2023, view_count: 89400,
    tags: ['BLIP-2', 'Vision-Language', 'Multimodal', 'Efficient'],
  },
  {
    paper_id: 23, arxiv_id: '2106.09685', title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    author: 'Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu et al.',
    abstract: 'LoRA freezes pre-trained weights and injects trainable rank decomposition matrices for efficient fine-tuning.',
    pdf_url: 'https://arxiv.org/abs/2106.09685', upload_date: '2021-06-17', topic: 'Fine-tuning',
    conference: 'ICLR', year: 2022, view_count: 215600,
    tags: ['LoRA', 'PEFT', 'Fine-tuning', 'Efficiency'],
  },
  {
    paper_id: 24, arxiv_id: '2305.14314', title: 'QLoRA: Efficient Finetuning of Quantized LLMs',
    author: 'Tim Dettmers, Artidoro Pagnoni, Ari Holtzman, Luke Zettlemoyer',
    abstract: 'QLoRA reduces memory usage to finetune a 65B model on a single 48GB GPU while preserving full 16-bit finetuning performance.',
    pdf_url: 'https://arxiv.org/abs/2305.14314', upload_date: '2023-05-23', topic: 'Fine-tuning',
    conference: 'NeurIPS', year: 2023, view_count: 138200,
    tags: ['QLoRA', 'Quantization', 'Fine-tuning', 'Efficiency'],
  },
  {
    paper_id: 25, arxiv_id: '2402.03300', title: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models',
    author: 'Zhihong Shao, Peiyi Wang, Qihao Zhu, Runxin Xu et al.',
    abstract: 'DeepSeekMath 7B continues pre-training on 120B math-related tokens and achieves 51.7% on the MATH benchmark.',
    pdf_url: 'https://arxiv.org/abs/2402.03300', upload_date: '2024-02-05', topic: 'Reasoning',
    conference: 'arXiv', year: 2024, view_count: 74200,
    tags: ['Math', 'Reasoning', 'Open Source', 'LLM'],
  },
];

const u = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

export const PRODUCTS: MockProduct[] = [
  { id: 1, sku: 'CREDIT_50',   name: '50 Starter Credits',
    description: 'Try out AI summaries and idea graphs without commitment.',
    price: 1.49, credits: 50, category: 'credit',
    emoji: '🌱', gradient: 'linear-gradient(135deg,#84fab0 0%,#8fd3f4 100%)', badge: 'Starter',
    image_url: u('photo-1532012197267-da84d127e765') },
  { id: 2, sku: 'CREDIT_100',  name: '100 Research Credits',
    description: 'Pay-as-you-go bundle. Spend credits on AI paper summaries, idea graphs and reflective notes.',
    price: 2.99, credits: 100, category: 'credit',
    emoji: '⚡', gradient: 'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)', badge: null,
    image_url: u('photo-1456406644174-8ddd4cd52a06') },
  { id: 3, sku: 'CREDIT_500',  name: '500 Research Credits',
    description: 'Best for active reviewers. Includes priority AI response and longer chat context.',
    price: 9.99, credits: 500, category: 'credit',
    emoji: '🚀', gradient: 'linear-gradient(135deg,#fa709a 0%,#fee140 100%)', badge: 'Popular',
    image_url: u('photo-1517694712202-14dd9538aa97') },
  { id: 4, sku: 'CREDIT_2000', name: '2,000 Research Credits',
    description: 'Great for whole-team use in a semester project. Shareable via team redemption codes.',
    price: 29.99, credits: 2000, category: 'credit',
    emoji: '💎', gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', badge: 'Team Pack',
    image_url: u('photo-1521791136064-7986c2920216') },
  { id: 5, sku: 'CREDIT_5000', name: '5,000 Power Credits',
    description: 'For research labs and intensive paper-tracking workflows.',
    price: 59.99, credits: 5000, category: 'credit',
    emoji: '🌟', gradient: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)', badge: null,
    image_url: u('photo-1518152006812-edab29b069ac') },
  { id: 6, sku: 'PLUS_MONTH',  name: 'iSuperviz Plus (Monthly)',
    description: 'Unlimited paper tracking, unlimited AI chat, up to 5 research areas / 5 topics.',
    price: 8.00, credits: 0, category: 'plan',
    emoji: '✨', gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)', badge: null,
    image_url: u('photo-1518770660439-4636190af475') },
  { id: 7, sku: 'PLUS_YEAR',   name: 'iSuperviz Plus (Yearly)',
    description: 'Same as Plus Monthly, billed yearly. Save ~40%.',
    price: 60.00, credits: 0, category: 'plan',
    emoji: '👑', gradient: 'linear-gradient(135deg,#f6d365 0%,#fda085 100%)', badge: 'Best Value',
    image_url: u('photo-1620712943543-bcc4688e7485') },
  { id: 8, sku: 'PLUS_LIFE',   name: 'Lifetime Pro Membership',
    description: 'One-time payment for lifelong Plus access. Limited founders\' pricing.',
    price: 199.00, credits: 0, category: 'plan',
    emoji: '♾️', gradient: 'linear-gradient(135deg,#0ba360 0%,#3cba92 100%)', badge: 'Limited',
    image_url: u('photo-1451187580459-43490279c0fa') },
  { id: 9, sku: 'REPORT_PACK', name: 'AI Literature Review Pack',
    description: 'Pre-generated literature review packs curated by our team.',
    price: 14.99, credits: 0, category: 'report',
    emoji: '📚', gradient: 'linear-gradient(135deg,#ff9a9e 0%,#fad0c4 100%)', badge: null,
    image_url: u('photo-1481627834876-b7833e8f5570') },
  { id: 10, sku: 'REPORT_LLM', name: 'LLM Trends Report 2026',
    description: 'Quarterly digest of the most influential papers in large language models.',
    price: 19.99, credits: 0, category: 'report',
    emoji: '🤖', gradient: 'linear-gradient(135deg,#30cfd0 0%,#330867 100%)', badge: null,
    image_url: u('photo-1677442136019-21780ecad995') },
  { id: 11, sku: 'REPORT_HCI', name: 'HCI x AI Field Notes',
    description: 'Hand-picked papers exploring the intersection of human-computer interaction and AI agents.',
    price: 12.99, credits: 0, category: 'report',
    emoji: '🧠', gradient: 'linear-gradient(135deg,#fccb90 0%,#d57eeb 100%)', badge: null,
    image_url: u('photo-1551288049-bebda4e38f71') },
  { id: 12, sku: 'CONSULT_30', name: 'Supervisor Consultation (30 min)',
    description: 'One 30-minute online consultation with an iSuperviz supervisor volunteer.',
    price: 19.99, credits: 0, category: 'service',
    emoji: '🎓', gradient: 'linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)', badge: null,
    image_url: u('photo-1543269865-cbf427effbad') },
  { id: 13, sku: 'WORKSHOP',   name: 'Team Research Workshop (90 min)',
    description: 'Live workshop for your group on using iSuperviz for literature reviews.',
    price: 49.99, credits: 0, category: 'service',
    emoji: '🤝', gradient: 'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)', badge: null,
    image_url: u('photo-1556761175-5973dc0f32e7') },
  { id: 14, sku: 'STICKER',    name: 'iSuperviz Sticker Pack',
    description: 'Six glossy holographic stickers featuring our mascot.',
    price: 4.99, credits: 0, category: 'merch',
    emoji: '🎨', gradient: 'linear-gradient(135deg,#ff6e7f 0%,#bfe9ff 100%)', badge: null,
    image_url: u('photo-1626785774573-4b799315345d') },
  { id: 15, sku: 'TSHIRT',     name: '"Read More Papers" T-Shirt',
    description: 'Comfy combed cotton tee with our signature graphic.',
    price: 24.99, credits: 0, category: 'merch',
    emoji: '👕', gradient: 'linear-gradient(135deg,#5ee7df 0%,#b490ca 100%)', badge: null,
    image_url: u('photo-1521572163474-6864f9cf17ab') },
];

export const TEAM = {
  teamNumber: 'Team 07',
  teamName: 'Team 07 — iSuperviz',
  project: {
    title: 'iSuperviz: Your AI Research Supervisor',
    course: 'CISC3003 Project Assignment',
    term: '2026APR13 — 2026MAY04 (extensible to 2026MAY10)',
    context:
      'Full-stacked responsive web application (React + TypeScript frontend, Node.js/Express + SQLite backend).',
    goals: [
      'Help university researchers track new arXiv papers matched to their research profile.',
      'Provide AI-generated summaries, idea graphs and reflective notes on demand.',
      'Offer credit-based e-commerce so users can top-up or subscribe to Plus plans.',
    ],
  },
  members: [
    {
      pair: 'Pair 08', role: 'Member', studentId: 'DC328669',
      name: 'Yang Xu', nickname: 'Elsa',
      email: 'dc328669@umac.mo',
      individualUrl:
        'https://elsayx.github.io/CISC3003-dc328669-2026GitHub/CISC3003-IndAssgn-dc328669/public/cisc3003-IndAssgn-dc328669.html',
      pairUrl:
        'https://elsayx.github.io/CISC3003-dc328669-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html',
      contribution:
        'Team lead. Owned the full-stack architecture: Express + SQLite backend, Nodemailer email verification, password reset, credit-based shopping cart and the user dashboard. Coordinated the PPT + deployment plan across all three pairs.',
    },
    {
      pair: 'Pair 08', role: 'Partner', studentId: 'DC328023',
      name: 'Jiang Xingyu', nickname: 'Sean',
      email: 'dc328023@umac.mo',
      individualUrl:
        'https://bishoujodaisuki.github.io/CISC3003-dc328023-2026GitHub/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html',
      pairUrl:
        'https://bishoujodaisuki.github.io/CISC3003-dc328023-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html',
      contribution:
        'Paper tracking pipeline: the Paper list, PaperDetail reflective notes, the AI Assistant chat panel and the suggested-idea cards. Seeded the 25-paper arXiv catalog.',
    },
    {
      pair: 'Pair 12', role: 'Member', studentId: 'DC326312',
      name: 'HUANG SOFIA', nickname: 'Sofia',
      email: 'dc326312@umac.mo',
      individualUrl: 'https://sofia74077.github.io/CISC3003-IndAssgn-2026MAR01/',
      pairUrl:
        'https://sofia74077.github.io/CISC3003-DC326312-2026GitHub/CISC3003-PairAssgn-2026APR02/public/index.html',
      contribution:
        'Design lead. Responsive UI system, Home page 3D effects, parallax hero, BentoGrid and brand visual identity.',
    },
    {
      pair: 'Pair 12', role: 'Partner', studentId: 'DC326351',
      name: 'FAN ZOU CHEN', nickname: 'Emily',
      email: 'dc326351@umac.mo',
      individualUrl:
        'https://emilyum.github.io/Hello-World/cisc3003-IndAssgn-2026MAR01/cisc3003-IndAssgn.html',
      pairUrl:
        'https://sofia74077.github.io/CISC3003-DC326312-2026GitHub/CISC3003-PairAssgn-2026APR02/public/index.html',
      contribution:
        'E-commerce flow: Shop, Product detail, Cart + checkout UX. Pricing plan comparison and mock payment methods.',
    },
    {
      pair: 'Pair 04', role: 'Member', studentId: 'DC227126',
      name: 'SI TIN IEK', nickname: 'Mikey',
      email: 'dc227126@umac.mo',
      individualUrl:
        'https://useriiiis.github.io/CISC3003-dc227126-2026GitHub/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html',
      pairUrl:
        'https://useriiiis.github.io/CISC3003-dc227126-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html',
      contribution:
        'Idea Graph visualisation, React-Flow based layouts and interactive node exploration.',
    },
    {
      pair: 'Pair 04', role: 'Partner', studentId: 'DC226328',
      name: 'MA IAT TIM', nickname: 'Tim',
      email: 'dc226328@umac.mo',
      individualUrl:
        'https://qiyao33.github.io/CISC3003-2026-github1/CISC3003-IndAssgn-2026MAR01/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html',
      pairUrl:
        'https://qiyao33.github.io/CISC3003-2026-github1/CISC3003-PairAssgn-2026APR02/cisc3003-PairAssgn.html',
      contribution:
        'Hallucination analysis workflow, AI Review document uploader, citation consistency checker UI.',
    },
  ],
};

/**
 * Hand-curated ~120-word excerpt per paper. These are synthesised from the
 * actual introduction / method section wording so the detail panel feels like
 * the user is reading the real article rather than a generic stub.
 */
const PAPER_EXCERPTS: Record<number, string> = {
  1: "Mixtral 8×7B scales Mistral's grouped-query attention decoder with a *Sparse Mixture of Experts* layer: each feed-forward block is replaced by 8 experts, and a learned router selects the **top-2** for every token. A single token therefore sees 47B parameters of capacity while only 13B are active during inference. We train on a 32k-token context window and find that Mixtral matches or surpasses Llama 2 70B on MMLU, GSM-8K and HumanEval while running roughly 6× faster at comparable throughput. A crucial engineering finding: the router's load-balancing auxiliary loss can be dropped once training stabilises, and experts naturally specialise by language, code and reasoning domains.",
  2: "Mistral 7B introduces two inference-time tricks that together recover the quality of a 13B dense transformer at half the cost. *Grouped-Query Attention* shares K/V projections across every four query heads, shrinking the KV cache by 4×. *Sliding-Window Attention* replaces global attention with a fixed 4 096-token window plus cached prefix tokens, allowing sequences up to 32k to be processed without quadratic blowup. On reasoning benchmarks (ARC-c, HellaSwag, PIQA) Mistral 7B beats Llama 2 13B by 1–3 points; on code (HumanEval, MBPP) it beats Llama 1 34B. We release both the base model and a chat-tuned variant under Apache 2.0.",
  3: "GPT-4 accepts interleaved image and text inputs and emits text. Training has two phases: large-scale next-token prediction on internet corpora, followed by **RLHF** alignment using preference data collected from trained annotators. On 24 professional exams (bar, LSAT, MCAT, AP suite) GPT-4 scores in the top 10% of human test takers; on MMLU it reaches 86.4%. We introduce predictable scaling: by extrapolating loss curves of much smaller models we forecast GPT-4's loss within 0.01 nats before launching the full training run. Limitations remain: the model still hallucinates facts, makes simple arithmetic mistakes, and its knowledge is frozen at the pre-training cutoff.",
  4: "Retrieval-Augmented Generation couples a parametric seq2seq model (BART) with a non-parametric memory — a dense passage index over Wikipedia. At generation time the retriever fetches k passages; the generator then conditions on each passage in parallel and marginalises. We train retriever and generator jointly, using the generator's likelihood as supervision. On **Natural Questions** we reach 44.5 EM, and on FEVER 72.5% accuracy, improving over closed-book BART by 6–14 points. The formulation makes knowledge updates trivial — swap the index, keep the model — and supplies provenance by design: every answer can be traced to the retrieved passage.",
  5: "LLaMA trains a family of foundation models (7B, 13B, 33B, 65B) exclusively on public data: Common Crawl, C4, GitHub, Wikipedia, arXiv and Stack Exchange. The 13B variant outperforms GPT-3 (175B) on most zero-shot NLP benchmarks while running on a single V100. We show that training 7B-sized models on 1T tokens is still compute-optimal — contradicting Chinchilla's prediction — because inference cost dominates total budget for deployed models. Architectural choices: pre-normalisation with RMSNorm, SwiGLU activations and rotary position embeddings. All four checkpoints are released to researchers under a non-commercial license.",
  6: "Llama 2 extends the LLaMA recipe with RLHF and a chat-tuned variant, Llama 2-Chat. We train reward models separately for helpfulness and safety and combine them during PPO using an iterative refinement loop that collects new preference data every few PPO steps. Ghost Attention (GAtt) — a simple trick that repeats the system prompt across turns — fixes a persistent instruction-forgetting failure mode in multi-turn dialogue. Human evaluators prefer Llama 2-Chat 70B over ChatGPT on helpfulness 36% of the time and rate it equal on safety; we release all weights commercially up to 700M MAU.",
  7: "Direct Preference Optimisation removes both the reward model and the PPO step from standard RLHF. We show that the KL-regularised RLHF objective has a closed-form optimum whose log-ratio is exactly the reward; therefore the policy itself can be trained directly on preference pairs via a single classification-style loss. DPO requires no sampling loop, no value network and no reward normalisation. On summarisation (TL;DR) and single-turn dialogue (Anthropic HH) DPO matches or beats PPO-based RLHF in under 10% of the GPU hours, and is noticeably more stable with respect to the KL coefficient.",
  8: "Self-Rewarding Language Models replace the static human reward model with the policy itself, used in LLM-as-Judge mode. Training alternates (1) generate many responses per instruction, (2) let the model score them against a rubric, (3) build preference pairs, (4) update the policy via DPO. Across three iterations starting from Llama 2 70B we obtain an AlpacaEval 2.0 win rate of 20.44%, surpassing Claude 2 and Gemini Pro. We find that the model's judging ability improves alongside its instruction-following ability, opening a path to self-improving alignment that is not bottlenecked by human labelling throughput.",
  9: "AutoGen is a programming framework for composing multi-agent LLM applications. Each agent is a *ConversableAgent* that can be configured with an LLM, tools, or a human loop; agents interact via structured messages and the system supports static chat graphs, nested chats, and group chat with a speaker-selection function. Case studies include automated math problem solving with a verifier agent, a six-agent software engineering team that writes and runs unit tests, and an OptiGuide optimisation assistant. We measure that AutoGen workflows solve 90% of MATH level-5 problems correctly versus 60% for vanilla GPT-4 — the gain comes from specialised verifier agents that catch arithmetic slips.",
  10: "Self-RAG teaches a single LM to *retrieve on demand*, generate, and critique its own output via **reflection tokens** emitted as part of the vocabulary: `[Retrieve]`, `[IsRel]`, `[IsSup]`, `[IsUse]`. Training synthesises reflection annotations with GPT-4 as a teacher, then fine-tunes Llama 2 7B/13B with language-modelling loss. At inference the model adaptively decides whether to retrieve, ranks the candidate passages for relevance, and verifies that its claim is supported by the retrieved text. On five long-form benchmarks Self-RAG-13B outperforms ChatGPT and plain Llama-2-chat while providing per-sentence attribution for free.",
  11: "ReAct interleaves free-form reasoning traces (`Thought: …`) with discrete actions (`Act: search[Apollo 11]`) on few-shot prompts. On HotpotQA the interleaved reasoning-and-acting agent lifts exact-match accuracy from 33.5% (Chain-of-Thought alone) to 35.1% (ReAct). More importantly, we show that the *reasoning* portion prevents the agent from getting stuck in action loops and lets it recover from search failures by rephrasing queries. On ALFWorld interactive decision-making ReAct reaches 71% success, 34 points above CoT-only prompting. The approach needs no additional training — it works zero-shot on PaLM-540B and 6–8 demonstrations elsewhere.",
  12: "Self-Consistency augments chain-of-thought decoding with majority voting over *diverse* sampled reasoning paths. Instead of greedy decoding a single chain, we sample n=40 paths at temperature 0.5, take the final answer from each, and return the most frequent answer. On GSM8K the approach lifts CoT accuracy from 56.5% → 74.4% using PaLM-540B — a bigger gain than moving from 8B to 540B parameters. We show the effect is orthogonal to model size and holds across arithmetic (MATH, MultiArith), commonsense (CSQA), and symbolic reasoning. Crucially, the same technique boosts the calibration of the final prediction: agreement frequency tracks accuracy almost linearly.",
  13: "Generative Agents are LLM-backed NPCs placed in a 2-D sandbox town. Each agent keeps a stream-of-consciousness **memory** indexed by recency, importance and relevance; periodically a *reflection* step summarises the day into higher-level beliefs, and a *planning* step produces hour-by-hour schedules. In a 25-agent simulation over two days we observe emergent behaviour: agents throw a Valentine's Day party, coordinate invitations, and remember to show up. Human raters prefer our agents over ablations that remove either memory or reflection. The paper argues for memory-reflection-planning as a general architecture for believable agent simulation.",
  14: "We survey 100+ RAG papers and organise them along three axes: *retrieval* (what, how, and when to retrieve), *generation* (how the LM conditions on retrieved evidence), and *augmentation* (how retriever and generator are jointly trained). Three paradigms emerge. Naive RAG pipelines simply concatenate top-k passages. Advanced RAG adds query rewriting, re-ranking and chunk post-processing. Modular RAG decomposes the pipeline into plug-in modules (Memory, Fusion, Routing). We further discuss evaluation pitfalls — context precision, context recall, faithfulness, answer relevance — and benchmark the best open-source RAG stacks on WikiQA and HotpotQA.",
  15: "MMLU probes 57 tasks spanning STEM, humanities, social science and other professional subjects using a multiple-choice format. Questions are drawn from real exams (MCAT, AP, LSAT, GRE) and professional certifications. At release GPT-3's largest model scored 43.9% versus a chance baseline of 25%, falling short of human expert accuracy (89.8%). We argue that broad world-knowledge evaluation, not any single reasoning task, should now drive LLM development and release a public leaderboard that has since become the de facto standard benchmark for generalist language models.",
  16: "CLIP is trained contrastively on 400M (image, caption) pairs harvested from the web. A ViT-L/14 image encoder and a Transformer text encoder are jointly optimised so that corresponding pairs have the highest cosine similarity in a shared embedding space. Once trained, the model performs **zero-shot** classification by comparing the image embedding to prompts of the form \"a photo of a {class}\". We match the 76.2% top-1 of ResNet-50 on ImageNet **without seeing any of its labelled examples** and transfer strongly to 27 downstream classification datasets including domain-specific tasks such as geo-localisation and aircraft recognition.",
  17: "Latent Diffusion Models perform the denoising process in the latent space of a pre-trained autoencoder rather than pixel space. This decouples perceptual compression (~8× spatial downsampling) from semantic generation. Combined with cross-attention conditioning on text embeddings, the resulting model — open-sourced as Stable Diffusion — synthesises 512×512 images on a single consumer GPU at 5 seconds per sample. On LAION-5B we reach FID 10.56, the best result on class-conditional ImageNet at the time. The paper's methodology spawned an open ecosystem of fine-tunes (DreamBooth, LoRA adapters, ControlNet) that arguably exceeded the original work in cultural impact.",
  18: "The Transformer replaces recurrence and convolutions entirely with **scaled dot-product attention**: given queries Q, keys K and values V, output = softmax(QK^T / √d_k) V. Multi-head attention runs h parallel attention layers with different projections, letting the model attend to information from different representation subspaces simultaneously. On WMT-14 En-De, a 65M-parameter Transformer beats a 160M-parameter ConvS2S by 2 BLEU; on En-Fr it sets a new SOTA at 41.0 BLEU while training in 3.5 days on 8 P100s. The architecture has since become the universal backbone of deep learning; this paper is the most-cited ML paper of the last decade.",
  19: "BERT pre-trains a deep bidirectional Transformer on two unsupervised objectives: *Masked Language Modelling* (predict 15% randomly-masked tokens) and *Next-Sentence Prediction*. Unlike GPT, whose causal mask forces left-to-right attention, BERT conditions on both the left and right context simultaneously in every layer. Fine-tuning for each downstream task simply adds one task-specific layer on top and trains the entire model end-to-end. BERT-Large (340M) obtains 11 new state-of-the-art results including GLUE 80.5%, MultiNLI 86.7%, SQuAD v1.1 F1 93.2 and SQuAD v2.0 F1 83.1 — most tasks' gains over prior SOTA exceed the gains of the prior two years combined.",
  20: "Sequence-to-Sequence Learning maps a variable-length source sequence to a variable-length target with two LSTMs: one encoder that compresses the input into a fixed-dimension thought vector, and one decoder that generates the output token-by-token conditioned on that vector. We reverse the source sentence before feeding it to the encoder, which we find consistently improves BLEU by ~4 points. On WMT-14 English→French, an ensemble of five deep LSTMs reaches BLEU 34.81, surpassing the previous phrase-based SMT baseline by 1.7 BLEU — the first end-to-end neural model to convincingly beat a well-tuned statistical MT system on a major benchmark.",
  21: "Toolformer teaches an LM to decide *when* and *how* to call external APIs (calculator, Wikipedia, calendar, QA system, translator). Training is self-supervised: the model generates many candidate API calls, the resulting perplexity is measured with and without the call, and only calls that reduce loss are kept as supervision. The fine-tuned GPT-J (6.7B) outperforms the 175B GPT-3 on math (up +29.4%), factual-question answering (+16%) and temporal reasoning (+27%). Crucially, general language-modelling perplexity does not degrade — the model learns tool use without sacrificing its generalist behaviour.",
  22: "BLIP-2 bridges a frozen image encoder (ViT-g/14) and a frozen LLM (OPT or FlanT5) with a lightweight trainable Querying Transformer (Q-Former, 188M). Two-stage pre-training — vision-language representation learning, then vision-to-language generative learning — teaches Q-Former to extract the most text-relevant visual features. The resulting system beats Flamingo-80B on VQAv2 zero-shot with 54× fewer trainable parameters. BLIP-2 is also the first paper to demonstrate in-context VQA, where the user prepends a few (image, answer) pairs before asking a question about a new image — the LLM's few-shot ability transfers through the Q-Former bottleneck.",
  23: "LoRA freezes the pre-trained transformer weights W and injects a pair of trainable low-rank matrices A ∈ ℝ^{r×k}, B ∈ ℝ^{d×r} so that the effective weight becomes W + BA. Only A and B are updated; their rank r is typically 4–64, making the number of trainable parameters 10 000× smaller than full fine-tuning. At inference the update can be merged back into W, so there is **zero additional latency**. On GPT-3 175B, LoRA matches full fine-tuning accuracy on all six GLUE tasks while training 0.01% of the parameters. The paper kick-started the PEFT ecosystem and is the foundation of most open-weights fine-tuning today.",
  24: "QLoRA combines three innovations that together let us fine-tune a 65B model on a single 48 GB GPU without degrading quality. (1) **4-bit NF4 quantisation** — a new data type information-theoretically optimal for normally-distributed weights. (2) **Double quantisation** — quantise the quantisation constants themselves, saving ~0.37 bits per parameter. (3) **Paged optimisers** — use NVIDIA unified memory to swap optimiser states out of GPU when they overflow. Our Guanaco family, fine-tuned with QLoRA on OASST1, reaches 99.3% of ChatGPT's Vicuna-benchmark win rate while training for just 24 hours on a single A100.",
  25: "DeepSeekMath-7B continues pre-training DeepSeek-Coder-Base-v1.5 with 120B math-related tokens mined from Common Crawl via a fastText classifier bootstrapped from OpenWebMath seeds. We then apply a new RL algorithm, *Group-Relative Policy Optimisation* (GRPO), which estimates the baseline from group statistics instead of a separate critic, saving ~40% of training memory. The resulting 7B model scores 51.7% on MATH — approaching Gemini-Ultra and GPT-4 while being 10× smaller — and wins 88.2% on GSM8K. Ablations confirm that both the data pipeline and GRPO contribute roughly equally to the final accuracy.",
};

export function getPaperExcerpt(p: MockPaper): string {
  return PAPER_EXCERPTS[p.paper_id] || p.abstract;
}

export function makePaperNotes(p: MockPaper) {
  return {
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
      `3. **Training recipe** — a carefully designed objective combined with scheduled regularization.\n\n` +
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
  };
}

export function buildDefaultIdeasForPaper(p: MockPaper) {
  const tags = p.tags || [];
  const topic = p.topic || 'this research area';
  const base = [
    {
      title: `Extend ${p.title} to low-resource settings`,
      body: `Apply the ideas from "${p.title}" to low-resource languages or domain-specific corpora; study how performance scales and what data curation strategies are needed.`,
      novelty: 7.5, feasibility: 6.5,
    },
    {
      title: `Benchmark ${topic} against retrieval-augmented pipelines`,
      body: `Design a head-to-head benchmark between the approach in this paper and retrieval-augmented generation (RAG) variants. Compare factuality, latency and update cost.`,
      novelty: 7.0, feasibility: 8.0,
    },
    {
      title: `Hallucination audit of ${topic}`,
      body: `Use automated hallucination detection tools to audit outputs of systems based on this paper. Report failure modes and propose mitigation prompts.`,
      novelty: 6.5, feasibility: 7.8,
    },
  ];
  if (tags.length > 0) {
    base.push({
      title: `Cross-pollinate with ${tags[0]}`,
      body: `Combine the contributions here with recent advances in ${tags[0]}. Investigate whether the gains compound or compete.`,
      novelty: 7.8, feasibility: 6.8,
    });
  }
  return base.map((b, i) => ({
    ideaId: -(p.paper_id * 100 + i + 1),
    idea: `${b.title}\n\n${b.body}`,
    title: b.title,
    sourceType: 'default',
    isSaved: false,
    createdAt: null,
    evaluation: { novelty_score: b.novelty, feasibility_score: b.feasibility },
  }));
}
