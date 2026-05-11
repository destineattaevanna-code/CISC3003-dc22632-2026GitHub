require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const db = require('./db');
const team = require('./team');
const { sendVerificationEmail, getMode } = require('./mailer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const PORT = parseInt(process.env.PORT || '4000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_team07_cisc3003';
const CAPTCHA_TTL_MS = 10 * 60 * 1000;

const isEmail = (s) =>
  typeof s === 'string' && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s.trim());
const rand6 = () => String(Math.floor(100000 + Math.random() * 900000));
const now = () => Date.now();
const safeJson = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };
const safeParseFavorite = (s) => {
  if (!s) return [];
  if (Array.isArray(s)) return s.map(String);
  const parsed = safeJson(s, null);
  if (Array.isArray(parsed)) return parsed.map(String);
  return String(s).split(',').filter(Boolean);
};

function userPublic(u) {
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
    favorite: u.favorite,
    expired_date: u.expired_date,
  };
}

// ---------- health ----------
app.get('/api/health', (_req, res) => {
  res.json({ status: 200, ok: true, mailer: getMode(), team: team.teamNumber });
});

// ---------- team info ----------
app.get('/api/team', (_req, res) => {
  res.json({ status: 200, team });
});

// ---------- captcha / signup / login ----------
app.post('/api/sendCaptcha', async (req, res) => {
  const { email, purpose = 'signup' } = req.body || {};
  if (!isEmail(email)) {
    return res.json({ status: 400, message: 'Please provide a valid email address.' });
  }
  const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
  if (purpose === 'signup' && existing && existing.email) {
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(email);
    if (row && row.password_hash) {
      return res.json({ status: 409, message: 'This email is already registered. Please login instead.' });
    }
  }
  if (purpose === 'reset' && !existing) {
    return res.json({ status: 404, message: 'No account found for this email.' });
  }

  const code = rand6();
  db.prepare(`
    INSERT INTO captchas (email, code, purpose, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email, purpose) DO UPDATE SET code = excluded.code, created_at = excluded.created_at
  `).run(email, code, purpose, now());

  const result = await sendVerificationEmail(email, code, purpose);
  if (!result.ok) {
    return res.json({ status: 500, message: 'Failed to send email. Please try again later.' });
  }
  return res.json({ status: 200, message: 'Verification code sent.', mode: result.mode });
});

function verifyCaptcha(email, code, purpose) {
  const row = db.prepare('SELECT * FROM captchas WHERE email = ? AND purpose = ?').get(email, purpose);
  if (!row) return { ok: false, reason: 'No code requested. Please send a code first.' };
  if (now() - row.created_at > CAPTCHA_TTL_MS) return { ok: false, reason: 'Code expired. Please request a new one.' };
  if (String(row.code) !== String(code).trim()) return { ok: false, reason: 'Incorrect verification code.' };
  return { ok: true };
}

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, nickName, captcha, accessToken, avatorUrl } = req.body || {};
    if (!isEmail(email)) return res.json({ status: 400, message: 'Invalid email.' });

    // Google SSO branch
    if (accessToken && !password) {
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        db.prepare(`
          INSERT INTO users (email, password_hash, nickname, avatar_url, pro, credit, expired_date)
          VALUES (?, NULL, ?, ?, 1, 20, date('now', '+7 days'))
        `).run(email, nickName || email.split('@')[0], avatorUrl || '');
        user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      } else if (avatorUrl && !user.avatar_url) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE email = ?').run(avatorUrl, email);
        user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      }
      return res.json({ status: 200, userInfo: userPublic(user) });
    }

    const wantsRegister = req.body && (req.body.action === 'register' || req.body.signup === true || nickName);
    if (wantsRegister) {
      if (captcha) {
        const check = verifyCaptcha(email, captcha, 'signup');
        if (!check.ok) return res.json({ status: 401, message: check.reason });
      }
      const existing = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(email);
      if (existing && existing.password_hash) {
        return res.json({ status: 409, message: 'This email is already registered. Please log in instead.' });
      }
      if (!password || password.length < 6 || password.length > 16) {
        return res.json({ status: 400, message: 'Password must be 6-16 characters.' });
      }
      const hash = bcrypt.hashSync(password, 10);
      if (existing) {
        db.prepare("UPDATE users SET password_hash = ?, nickname = ?, pro = 1, credit = 20, expired_date = date('now','+7 days') WHERE email = ?")
          .run(hash, nickName || email.split('@')[0], email);
      } else {
        db.prepare(`
          INSERT INTO users (email, password_hash, nickname, pro, credit, expired_date)
          VALUES (?, ?, ?, 1, 20, date('now','+7 days'))
        `).run(email, hash, nickName || email.split('@')[0]);
      }
      db.prepare('DELETE FROM captchas WHERE email = ? AND purpose = ?').run(email, 'signup');
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      return res.json({ status: 200, userInfo: userPublic(user) });
    }

    if (!password) return res.json({ status: 400, message: 'Password is required.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.password_hash) return res.json({ status: 404, message: 'Account not found. Please sign up first.' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.json({ status: 401, message: 'Incorrect password.' });
    return res.json({ status: 200, userInfo: userPublic(user) });
  } catch (e) {
    console.error('[/api/login]', e);
    return res.json({ status: 500, message: 'Server error' });
  }
});

// ---------- forgot password ----------
app.post('/api/forgot_password', async (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, message: 'Invalid email.' });
  const user = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ status: 404, message: 'No account found for this email.' });
  const code = rand6();
  db.prepare(`
    INSERT INTO captchas (email, code, purpose, created_at) VALUES (?, ?, 'reset', ?)
    ON CONFLICT(email, purpose) DO UPDATE SET code = excluded.code, created_at = excluded.created_at
  `).run(email, code, now());
  const result = await sendVerificationEmail(email, code, 'reset');
  if (!result.ok) return res.json({ status: 500, message: 'Failed to send email.' });
  return res.json({ status: 200, message: 'Reset code sent.', mode: result.mode });
});

app.post('/api/check_account', (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, exists: false, message: 'Invalid email.' });
  const user = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
  return res.json({ status: 200, exists: !!user });
});

app.post('/api/reset_password', (req, res) => {
  const { email, captcha, password } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, message: 'Invalid email.' });
  if (!password || password.length < 6 || password.length > 16) {
    return res.json({ status: 400, message: 'Password must be 6-16 characters.' });
  }
  if (captcha) {
    const check = verifyCaptcha(email, captcha, 'reset');
    if (!check.ok) return res.json({ status: 401, message: check.reason });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
  if (info.changes === 0) return res.json({ status: 404, message: 'Account not found.' });
  db.prepare('DELETE FROM captchas WHERE email = ? AND purpose = ?').run(email, 'reset');
  return res.json({ status: 200, message: 'Password has been reset. You can now log in.' });
});

app.post('/api/change_password', (req, res) => {
  const { email, oldPassword, newPassword } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, message: 'Invalid email.' });
  if (!oldPassword) return res.json({ status: 400, message: 'Current password is required.' });
  if (!newPassword || newPassword.length < 6 || newPassword.length > 16) {
    return res.json({ status: 400, message: 'New password must be 6-16 characters.' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ status: 404, message: 'Account not found.' });
  if (!user.password_hash) return res.json({ status: 400, message: 'This account has no password (e.g. signed up with Google). Use Forgot password to set one.' });
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.json({ status: 401, message: 'Current password is incorrect.' });
  }
  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    return res.json({ status: 400, message: 'New password must be different from the current one.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
  return res.json({ status: 200, message: 'Password updated successfully.' });
});

// ---------- profile ----------
app.post('/api/edit_profile', (req, res) => {
  const { email, area, language, summaryList, topicList } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400 });
  const user = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ status: 404 });
  db.prepare(`
    UPDATE users SET
      areas = COALESCE(?, areas),
      language = COALESCE(?, language),
      summary = COALESCE(?, summary),
      topics = COALESCE(?, topics)
    WHERE email = ?
  `).run(
    area != null ? JSON.stringify(area) : null,
    language || null,
    summaryList != null ? JSON.stringify(summaryList.map((x) => (x && x.summary) || x)) : null,
    topicList != null ? JSON.stringify(topicList) : null,
    email
  );
  return res.json({ status: 200 });
});

app.post('/api/get_credit', (req, res) => {
  const { email } = req.body || {};
  const user = db.prepare('SELECT credit FROM users WHERE email = ?').get(email);
  return res.json({ status: 200, credit: user ? user.credit : 20 });
});

app.post('/api/consume_credit', (req, res) => {
  const { email, amount = 10, reason = 'paper_action', paperId, paperTitle } = req.body || {};
  const cost = Math.max(1, parseInt(amount, 10) || 10);
  if (!isEmail(email)) return res.json({ status: 400, message: 'Login required.' });

  const tx = db.transaction(() => {
    const user = db.prepare('SELECT credit FROM users WHERE email = ?').get(email);
    if (!user) return { status: 404, message: 'Account not found.' };
    if (user.credit < cost) {
      return {
        status: 403,
        message: `Not enough credits. This action costs ${cost} credits.`,
        credit: user.credit,
      };
    }
    db.prepare('UPDATE users SET credit = credit - ? WHERE email = ?').run(cost, email);
    const keyword = `${reason}: ${paperTitle || paperId || 'paper'}`;
    db.prepare('INSERT INTO search_history (email, keyword, result_count) VALUES (?, ?, ?)')
      .run(email, keyword, 1);
    return { status: 200, credit: user.credit - cost, cost };
  });

  return res.json(tx());
});

// ---- Hand-curated excerpts (~120 words each, synthesised from the real
// introduction / method of every seeded paper). Kept inline so the backend
// response mirrors what src/mock/seed.ts returns on GitHub Pages. ----
const PAPER_EXCERPTS = {
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
const excerptFor = (paperId) => PAPER_EXCERPTS[paperId] || '';

// ---------- paper list + detail (USES LOCAL DB) ----------
// Front-end sends { page, pageSize, searchWord, filterFavorite, favorite, email }.
app.post('/api/get_paper_info', (req, res) => {
  const { page = 1, pageSize = 20, searchWord = '', filterFavorite = false, email = '' } = req.body || {};
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(10000, Math.max(1, parseInt(pageSize, 10) || 20));

  let userFavorites = [];
  if (filterFavorite && isEmail(email)) {
    userFavorites = safeParseFavorite(
      db.prepare('SELECT favorite FROM users WHERE email = ?').get(email)?.favorite
    );
  }

  const params = [];
  let where = 'WHERE 1=1';
  if (String(searchWord || '').trim()) {
    where += ' AND (title LIKE ? OR author LIKE ? OR abstract LIKE ? OR topic LIKE ?)';
    const like = `%${String(searchWord).trim()}%`;
    params.push(like, like, like, like);
  }
  if (filterFavorite) {
    if (userFavorites.length === 0) {
      return res.json({ status: 200, paperList: [], totalPaper: 0, fetchingPapers: false });
    }
    where += ` AND paper_id IN (${userFavorites.map(() => '?').join(',')})`;
    params.push(...userFavorites);
  }

  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM papers ${where}`).get(...params);
  const total = totalRow ? totalRow.c : 0;
  const rows = db.prepare(`
    SELECT paper_id, arxiv_id, title, author, abstract, pdf_url, upload_date, topic, conference, year, tags, thumbnail_url, video_url, video_duration, view_count, read_count
    FROM papers ${where}
    ORDER BY view_count DESC, paper_id DESC
    LIMIT ? OFFSET ?
  `).all(...params, ps, (p - 1) * ps);

  const paperList = rows.map((r) => ({
    ...r,
    tags: safeJson(r.tags, []),
    // Text-first UI: no cover, no video badges, but keep the hand-curated excerpt.
    has_video: false,
    video_url: '',
    video_duration: '',
    thumbnail_url: '',
    excerpt: excerptFor(r.paper_id),
  }));
  return res.json({ status: 200, paperList, totalPaper: total, fetchingPapers: false });
});

// Paper detail + reflective notes + ideas.
app.post('/api/get_paper_notes', (req, res) => {
  const { paperId, userId } = req.body || {};
  const pid = parseInt(paperId, 10);
  if (!pid) return res.json({ status: 400, message: 'Invalid paper id.' });
  const paper = db.prepare('SELECT * FROM papers WHERE paper_id = ?').get(pid);
  if (!paper) return res.json({ status: 404, message: 'Paper not found.' });

  db.prepare('UPDATE papers SET read_count = COALESCE(read_count, 0) + 1 WHERE paper_id = ?').run(pid);

  const notesRow = db.prepare('SELECT notes_json FROM paper_notes WHERE paper_id = ?').get(pid);
  const paperNote = notesRow ? safeJson(notesRow.notes_json, {}) : {};

  let defaultIdeas = [];
  let savedIdeas = [];
  if (isEmail(userId)) {
    savedIdeas = db.prepare(`
      SELECT idea_id AS ideaId, idea, is_saved AS isSavedInt, novelty_score, feasibility_score, created_at AS createdAt
      FROM ideas WHERE email = ? AND paper_id = ? AND is_saved = 1
      ORDER BY idea_id DESC
    `).all(userId, String(pid)).map((r) => ({
      ideaId: r.ideaId,
      idea: r.idea,
      isSaved: true,
      createdAt: r.createdAt,
      evaluation: {
        novelty_score: r.novelty_score,
        feasibility_score: r.feasibility_score,
      },
    }));
  }

  // Build a default/suggested set derived from paper notes so Suggested panel has content even
  // when the user has never saved an idea.
  const suggestions = buildDefaultIdeasForPaper(paper);
  defaultIdeas = suggestions;

  return res.json({
    status: 200,
    paperNote,
    defaultIdeas,
    savedIdeas,
  });
});

function buildDefaultIdeasForPaper(paper) {
  const tags = safeJson(paper.tags, []);
  const topic = paper.topic || 'this research area';
  const base = [
    {
      title: `Extend ${paper.title} to low-resource settings`,
      body: `Apply the ideas from "${paper.title}" to low-resource languages or domain-specific corpora; study how performance scales and what data curation strategies are needed.`,
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
    ideaId: -(paper.paper_id * 100 + i + 1),
    idea: `${b.title}\n\n${b.body}`,
    title: b.title,
    sourceType: 'default',
    isSaved: false,
    createdAt: null,
    evaluation: { novelty_score: b.novelty, feasibility_score: b.feasibility },
  }));
}

// ---------- idea CRUD ----------
app.post('/api/get_ideas', (req, res) => {
  const { paperId, userId } = req.body || {};
  const paper = db.prepare('SELECT * FROM papers WHERE paper_id = ?').get(parseInt(paperId, 10));
  if (!paper) return res.json({ status: 404, message: 'Paper not found.' });
  const saved = isEmail(userId)
    ? db.prepare(`
        SELECT idea_id AS ideaId, idea, created_at AS createdAt, novelty_score, feasibility_score
        FROM ideas WHERE email = ? AND paper_id = ? AND is_saved = 1
        ORDER BY idea_id DESC
      `).all(userId, String(paper.paper_id)).map((r) => ({
        ideaId: r.ideaId,
        idea: r.idea,
        isSaved: true,
        createdAt: r.createdAt,
        evaluation: { novelty_score: r.novelty_score, feasibility_score: r.feasibility_score },
      }))
    : [];
  return res.json({
    status: 200,
    defaultIdeas: buildDefaultIdeasForPaper(paper),
    savedIdeas: saved,
    ideas: saved,
  });
});

function scoreIdea(text) {
  const t = String(text || '').toLowerCase();
  let nov = 5 + (t.length > 120 ? 1.5 : 0) + (t.match(/\bnovel|propose|introduce|new|first\b/g)?.length || 0) * 0.4;
  let fea = 5 + (t.match(/\bbaseline|benchmark|reuse|existing|off-the-shelf|fine-tune\b/g)?.length || 0) * 0.5;
  nov = Math.max(2, Math.min(10, nov + Math.random() * 2.5 - 0.5));
  fea = Math.max(2, Math.min(10, fea + Math.random() * 2.5 - 0.5));
  return { novelty: Math.round(nov * 10) / 10, feasibility: Math.round(fea * 10) / 10 };
}

app.post('/api/submit_idea', (req, res) => {
  const { email, paperId, idea, ideaId } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, message: 'Login required.' });
  if (!idea || !String(idea).trim()) return res.json({ status: 400, message: 'Idea text is required.' });

  const eval_ = scoreIdea(idea);
  if (ideaId) {
    const existing = db.prepare('SELECT * FROM ideas WHERE idea_id = ? AND email = ?').get(parseInt(ideaId, 10), email);
    if (!existing) return res.json({ status: 404, message: 'Idea not found.' });
    db.prepare(`
      UPDATE ideas SET idea = ?, is_saved = 1, novelty_score = ?, feasibility_score = ?, updated_at = datetime('now')
      WHERE idea_id = ?
    `).run(String(idea), eval_.novelty, eval_.feasibility, existing.idea_id);
    return res.json({ status: 200, ideaId: existing.idea_id });
  }

  const info = db.prepare(`
    INSERT INTO ideas (email, paper_id, idea, novelty_score, feasibility_score, is_saved)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(email, String(paperId || ''), String(idea), eval_.novelty, eval_.feasibility);

  // Auto-seed related papers from the same topic/tags for the idea graph.
  const row = db.prepare('SELECT idea_id FROM ideas WHERE rowid = ?').get(info.lastInsertRowid);
  const newId = row ? row.idea_id : info.lastInsertRowid;
  seedRelatedPapersForIdea(newId, String(paperId || ''), String(idea || ''));
  return res.json({ status: 200, ideaId: newId });
});

function seedRelatedPapersForIdea(ideaId, paperId, ideaText) {
  const pid = parseInt(paperId, 10);
  let anchor = null;
  if (pid) anchor = db.prepare('SELECT * FROM papers WHERE paper_id = ?').get(pid);

  let candidates = [];
  if (anchor) {
    candidates = db.prepare(`
      SELECT * FROM papers WHERE paper_id <> ? AND (topic = ? OR title LIKE ?) LIMIT 6
    `).all(anchor.paper_id, anchor.topic, `%${anchor.topic}%`);
  } else {
    const keywords = String(ideaText || '')
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3);
    if (keywords.length > 0) {
      const like = keywords.map(() => '(title LIKE ? OR abstract LIKE ?)').join(' OR ');
      const args = [];
      keywords.forEach((k) => args.push(`%${k}%`, `%${k}%`));
      candidates = db.prepare(`SELECT * FROM papers WHERE ${like} LIMIT 6`).all(...args);
    } else {
      candidates = db.prepare('SELECT * FROM papers ORDER BY view_count DESC LIMIT 6').all();
    }
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO idea_related_papers
    (idea_id, related_paper_id, title, abstract, authors, year, pdf_url, relevance_score, is_new)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const tx = db.transaction((list) => {
    list.forEach((p, i) => {
      insert.run(
        ideaId,
        String(p.paper_id),
        p.title,
        p.abstract,
        p.author,
        p.year,
        p.pdf_url,
        Math.max(0.4, Math.min(0.98, 0.9 - i * 0.05 + Math.random() * 0.05))
      );
    });
  });
  tx(candidates);
}

app.post('/api/unsave_idea', (req, res) => {
  const { email, ideaId } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, message: 'Login required.' });
  const id = parseInt(ideaId, 10);
  if (!id) return res.json({ status: 400, message: 'Invalid idea id.' });
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM idea_related_papers WHERE idea_id = ?').run(id);
    return db.prepare('DELETE FROM ideas WHERE idea_id = ? AND email = ?').run(id, email);
  });
  const info = tx();
  if (info.changes === 0) return res.json({ status: 404, message: 'Idea not found.' });
  return res.json({ status: 200 });
});

// First-time demo seed: give every user 4 saved ideas the first time they
// look at the Idea Graph, so the page always looks populated (mirrors the
// iSuperviz `sampleData.ts` behaviour from the original upstream repo).
const DEMO_IDEAS = [
  {
    title: 'Sparse routing for clinical LLMs',
    body: 'Extend Mixtral-style top-2 expert routing with entropy regularisation so clinical-reasoning experts activate when the prompt contains ICD-10 tokens. Goal: cut inference cost 30% without quality loss.',
    paperId: '1',
  },
  {
    title: 'Self-RAG with trust-aware retrieval',
    body: 'Layer a trust score on every retrieved chunk (source reputation × recency × agreement) and let Self-RAG prefer high-trust passages first, falling back to low-trust only if reasoning demands.',
    paperId: '10',
  },
  {
    title: 'Evidence-linked decision support',
    body: 'Attach citations from papers and trials to every recommended clinical action; verify with the hallucination audit pipeline before the UI surfaces them.',
    paperId: '14',
  },
  {
    title: 'LoRA mixtures for on-device agents',
    body: 'Train topic-specific LoRA adapters (math, code, medicine) and serve them as a MoE on edge devices. Evaluate on ReAct + Toolformer benchmarks.',
    paperId: '23',
  },
];

function ensureDemoIdeasFor(email) {
  if (!isEmail(email)) return;
  const existing = db.prepare('SELECT COUNT(*) AS c FROM ideas WHERE email = ?').get(email);
  if (existing && existing.c > 0) return;
  const insert = db.prepare(
    "INSERT INTO ideas (email, paper_id, idea, novelty_score, feasibility_score, is_saved) VALUES (?, ?, ?, ?, ?, 1)"
  );
  const tx = db.transaction(() => {
    for (const d of DEMO_IDEAS) {
      const ev = scoreIdea(d.body);
      const r = insert.run(email, d.paperId, `${d.title}\n\n${d.body}`, ev.novelty, ev.feasibility);
      const row = db.prepare('SELECT idea_id FROM ideas WHERE rowid = ?').get(r.lastInsertRowid);
      const ideaId = row ? row.idea_id : r.lastInsertRowid;
      seedRelatedPapersForIdea(ideaId, d.paperId, d.body);
    }
  });
  tx();
}

app.post('/api/get_user_all_ideas', (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 401, message: 'Login required.', ideas: [] });
  ensureDemoIdeasFor(email);
  const rows = db.prepare(`
    SELECT idea_id AS ideaId, paper_id AS paperId, idea, novelty_score, feasibility_score, is_saved, created_at AS createdAt
    FROM ideas WHERE email = ? AND is_saved = 1
    ORDER BY idea_id DESC
  `).all(email);

  const ideas = rows.map((r) => {
    const related = db.prepare(`
      SELECT id, related_paper_id, title, abstract, authors, year, pdf_url, relevance_score, is_new
      FROM idea_related_papers WHERE idea_id = ?
    `).all(r.ideaId);
    return {
      ideaId: r.ideaId,
      paperId: r.paperId || '',
      idea: r.idea,
      isSaved: !!r.is_saved,
      createdAt: r.createdAt,
      evaluation: { novelty_score: r.novelty_score, feasibility_score: r.feasibility_score },
      relatedPapers: related,
    };
  });
  return res.json({ status: 200, ideas });
});

app.post('/api/mark_idea_related_paper_viewed', (req, res) => {
  const { email, ideaId, relatedPaperId } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 401, message: 'Login required.' });
  const id = parseInt(ideaId, 10);
  if (!id) return res.json({ status: 400, message: 'Invalid idea id.' });
  db.prepare(`
    UPDATE idea_related_papers SET is_new = 0
    WHERE idea_id = ? AND related_paper_id = ? AND idea_id IN (SELECT idea_id FROM ideas WHERE email = ?)
  `).run(id, String(relatedPaperId || ''), email);
  return res.json({ status: 200 });
});

// ---------- chat (simulated AI responses backed by paper notes) ----------
app.post('/api/chat', (req, res) => {
  const { userName, paperId, value, history = [], updateDate, language = 'en' } = req.body || {};
  if (!isEmail(userName)) return res.json({ status: 400, message: 'Login required.' });
  const pid = parseInt(paperId, 10);
  const paper = pid ? db.prepare('SELECT * FROM papers WHERE paper_id = ?').get(pid) : null;
  if (!paper) return res.json({ status: 404, message: 'Paper not found.' });

  db.prepare('INSERT INTO chat_messages (email, paper_id, role, content) VALUES (?, ?, ?, ?)')
    .run(userName, pid, 'user', String(value || ''));

  // Generate a deterministic but varied reply using notes + user question.
  const notesRow = db.prepare('SELECT notes_json FROM paper_notes WHERE paper_id = ?').get(pid);
  const notes = notesRow ? safeJson(notesRow.notes_json, {}) : {};
  const reply = composeChatReply(paper, notes, String(value || ''), language, history);
  // Reserve a slot in chat_messages so /api/get_response can pick it up in polling style.
  const assistantPk = db.prepare("INSERT INTO chat_messages (email, paper_id, role, content) VALUES (?, ?, 'assistant', ?)").run(userName, pid, reply.content);
  // Memorize last assistant message id keyed by (email,paper_id) for polling endpoint.
  pendingReplies.set(`${userName}::${pid}`, {
    id: assistantPk.lastInsertRowid,
    content: reply.content,
    ideas: reply.ideas,
    pub_at: Date.now(),
  });
  return res.json({ status: 200 });
});

const pendingReplies = new Map();

app.post('/api/get_response', (req, res) => {
  const { userName, paperId, language = 'en' } = req.body || {};
  if (!isEmail(userName)) return res.json({ status: 401 });
  const pid = parseInt(paperId, 10);
  const key = `${userName}::${pid}`;
  const pending = pendingReplies.get(key);
  if (!pending) return res.json({ status: 200, content: '' });
  // stream-like: return partial up to 3 times then final
  pending.reads = (pending.reads || 0) + 1;
  const finished = pending.reads >= 2 || Date.now() - pending.pub_at > 2500;
  if (!finished) {
    const cut = Math.max(1, Math.floor(pending.content.length * 0.5));
    return res.json({ status: 200, content: pending.content.slice(0, cut) + '[LOADING]' });
  }
  pendingReplies.delete(key);
  return res.json({ status: 200, content: pending.content, ideas: pending.ideas });
});

function composeChatReply(paper, notes, userQuestion, language, history) {
  const tags = safeJson(paper.tags, []);
  const bodyParts = [];
  const sig = notes['Key Contribution'] || `**${paper.title}** is a key paper in **${paper.topic}** by ${paper.author}.`;
  bodyParts.push(sig);
  bodyParts.push('');
  bodyParts.push('### Answering your question');
  bodyParts.push('');
  bodyParts.push(`> ${userQuestion}`);
  bodyParts.push('');
  bodyParts.push(
    `Based on the paper's method section, the authors focus on **${tags.slice(0, 3).join(', ') || paper.topic}**. ` +
      `For your specific question, the most relevant observation is that the approach can be extended by combining it with ` +
      `retrieval augmentation, chain-of-thought verification, or domain-specific fine-tuning depending on your downstream task.`
  );
  bodyParts.push('');
  bodyParts.push('Key takeaways:');
  bodyParts.push('- **What is new**: ' + (notes['Key Contribution']?.split('\n')[0] || 'A principled approach to ' + paper.topic));
  bodyParts.push('- **Why it matters**: improves on prior baselines on representative benchmarks.');
  bodyParts.push('- **Practical recipe**: reuse released checkpoints, apply the ablations in Section 4 to your data, and validate with the paper\'s evaluation protocol.');
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
      ideaId: -(Date.now() + i + 1),
      idea: `${it.title}\n\n${it.body}`,
      title: it.title,
      isSaved: false,
      evaluation: { novelty_score: 6 + Math.random() * 3, feasibility_score: 6 + Math.random() * 3 },
    })),
  };
}

// ---------- feedback ----------
app.post('/api/feedback', (req, res) => {
  const { email = '', action_type = '', like = null, idea_id = null, content = '', paper_id = '' } = req.body || {};
  db.prepare(`
    INSERT INTO feedback (email, action_type, "like", idea_id, content, paper_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email, String(action_type), like === null ? null : (like ? 1 : 0), idea_id || null, String(content), String(paper_id));
  return res.json({ status: 200 });
});

// ---------- favorites (note: keeping the frontend's typo path /api/eidt_favorite) ----------
function handleFavorite(req, res) {
  const { email, action, paper_id } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 401, message: 'Login required.' });
  const pid = String(paper_id);
  const user = db.prepare('SELECT favorite FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ status: 404, message: 'User not found.' });
  const list = safeParseFavorite(user.favorite);
  const had = list.includes(pid);
  let newList;
  // Front-end convention (double-checked against pages): action === 1 → was favorite → remove; action === 0 → add.
  if (action === 1) newList = list.filter((x) => x !== pid);
  else if (action === 0) newList = had ? list : [...list, pid];
  else newList = had ? list.filter((x) => x !== pid) : [...list, pid];
  db.prepare('UPDATE users SET favorite = ? WHERE email = ?').run(JSON.stringify(newList), email);
  return res.json({ status: 200, favorite: newList });
}
app.post('/api/eidt_favorite', handleFavorite);
app.post('/api/edit_favorite', handleFavorite);

// ---------- products ----------
app.get('/api/products', (_req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY price ASC').all();
  return res.json({ status: 200, products: rows });
});

app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.json({ status: 400, message: 'Invalid product id.' });
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(id);
  if (!product) return res.json({ status: 404, message: 'Product not found.' });
  const MIN_RELATED = 6;
  const MAX_RELATED = 8;
  const sameCat = db.prepare(`
    SELECT * FROM products
    WHERE active = 1 AND id <> ? AND category = ?
    ORDER BY price ASC
  `).all(id, product.category);
  let related = sameCat.slice(0, MAX_RELATED);
  if (related.length < MIN_RELATED) {
    const haveIds = new Set([id, ...related.map((r) => r.id)]);
    const fillers = db.prepare(`
      SELECT * FROM products
      WHERE active = 1 AND id <> ?
      ORDER BY
        CASE category WHEN ? THEN 0 ELSE 1 END, price ASC
    `).all(id, product.category).filter((r) => !haveIds.has(r.id));
    related = related.concat(fillers).slice(0, MAX_RELATED);
  }
  return res.json({ status: 200, product, related });
});

// ---------- search history ----------
app.post('/api/search', (req, res) => {
  const { email, keyword } = req.body || {};
  if (!isEmail(email) || !keyword) return res.json({ status: 400 });
  const like = `%${keyword}%`;
  const hits = db.prepare(
    'SELECT id, name, description, price FROM products WHERE active = 1 AND (name LIKE ? OR description LIKE ?)'
  ).all(like, like);
  db.prepare('INSERT INTO search_history (email, keyword, result_count) VALUES (?, ?, ?)')
    .run(email, keyword, hits.length);
  return res.json({ status: 200, results: hits });
});

app.get('/api/search_history', (req, res) => {
  const email = req.query.email;
  if (!isEmail(email)) return res.json({ status: 400, history: [] });
  const rows = db.prepare('SELECT id, keyword, result_count, created_at FROM search_history WHERE email = ? ORDER BY id DESC LIMIT 100').all(email);
  return res.json({ status: 200, history: rows });
});

app.delete('/api/search_history/:id', (req, res) => {
  const email = req.query.email;
  const id = parseInt(req.params.id, 10);
  if (!isEmail(email) || !id) return res.json({ status: 400 });
  db.prepare('DELETE FROM search_history WHERE id = ? AND email = ?').run(id, email);
  return res.json({ status: 200 });
});

app.post('/api/search_history/clear', (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400 });
  db.prepare('DELETE FROM search_history WHERE email = ?').run(email);
  return res.json({ status: 200 });
});

// ---------- shopping cart ----------
app.get('/api/cart', (req, res) => {
  const email = req.query.email;
  if (!isEmail(email)) return res.json({ status: 400, items: [] });
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, ci.added_at,
           p.id AS product_id, p.sku, p.name, p.description, p.price, p.credits, p.category, p.image_url
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.email = ? ORDER BY ci.id DESC
  `).all(email);
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  return res.json({ status: 200, items, subtotal: Number(subtotal.toFixed(2)) });
});

app.post('/api/cart/add', (req, res) => {
  const { email, product_id, quantity = 1 } = req.body || {};
  if (!isEmail(email) || !product_id) return res.json({ status: 400 });
  const p = db.prepare('SELECT id FROM products WHERE id = ? AND active = 1').get(product_id);
  if (!p) return res.json({ status: 404, message: 'Product not found.' });
  db.prepare(`
    INSERT INTO cart_items (email, product_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(email, product_id) DO UPDATE SET quantity = cart_items.quantity + excluded.quantity
  `).run(email, product_id, Math.max(1, parseInt(quantity, 10) || 1));
  return res.json({ status: 200 });
});

app.post('/api/cart/update', (req, res) => {
  const { email, product_id, quantity } = req.body || {};
  if (!isEmail(email) || !product_id) return res.json({ status: 400 });
  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1) {
    db.prepare('DELETE FROM cart_items WHERE email = ? AND product_id = ?').run(email, product_id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE email = ? AND product_id = ?').run(qty, email, product_id);
  }
  return res.json({ status: 200 });
});

app.post('/api/cart/remove', (req, res) => {
  const { email, product_id } = req.body || {};
  if (!isEmail(email) || !product_id) return res.json({ status: 400 });
  db.prepare('DELETE FROM cart_items WHERE email = ? AND product_id = ?').run(email, product_id);
  return res.json({ status: 200 });
});

app.post('/api/cart/clear', (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400 });
  db.prepare('DELETE FROM cart_items WHERE email = ?').run(email);
  return res.json({ status: 200 });
});

app.post('/api/cart/checkout', (req, res) => {
  const { email, payment_method = 'mock' } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400 });
  const items = db.prepare(`
    SELECT ci.quantity, p.id AS product_id, p.sku, p.name, p.price, p.credits, p.category
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.email = ?
  `).all(email);
  if (items.length === 0) return res.json({ status: 400, message: 'Your cart is empty.' });
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const orderNo = 'ISV' + Date.now() + Math.floor(Math.random() * 1000);
  const addedCredits = items.reduce((s, it) => s + (it.credits || 0) * it.quantity, 0);
  const hasPlan = items.some((it) => it.category === 'plan');

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO orders (order_no, email, total, status, payment_method, items_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(orderNo, email, Number(total.toFixed(2)), 'paid', payment_method, JSON.stringify(items));
    if (addedCredits > 0) {
      db.prepare('UPDATE users SET credit = credit + ? WHERE email = ?').run(addedCredits, email);
    }
    if (hasPlan) {
      db.prepare("UPDATE users SET pro = 2, expired_date = date('now', '+30 days') WHERE email = ?").run(email);
    }
    db.prepare('DELETE FROM cart_items WHERE email = ?').run(email);
  });
  tx();

  const user = db.prepare('SELECT credit, expired_date FROM users WHERE email = ?').get(email);
  return res.json({
    status: 200,
    order_no: orderNo,
    total: Number(total.toFixed(2)),
    newQuota: user ? user.credit : undefined,
    memberExpiredDate: user ? user.expired_date : undefined,
  });
});

app.get('/api/orders', (req, res) => {
  const email = req.query.email;
  if (!isEmail(email)) return res.json({ status: 400, orders: [] });
  const rows = db.prepare('SELECT * FROM orders WHERE email = ? ORDER BY id DESC').all(email);
  const orders = rows.map((r) => ({ ...r, items: safeJson(r.items_json, []) }));
  return res.json({ status: 200, orders });
});

// ---------- payment placeholders (mock) ----------
app.post('/api/create-checkout-session', (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, message: 'Login required.' });
  return res.json({ status: 200, url: '/cart?checkout=mock', session_id: 'mock_' + Date.now() });
});
app.post('/api/create_payment', (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.json({ status: 400, message: 'Login required.' });
  return res.json({ status: 200, payment_id: 'mock_' + Date.now(), url: '/cart?checkout=mock' });
});
app.post('/api/purchase_callback', (_req, res) => res.json({ status: 200 }));
app.post('/api/purchase_paypal_callback', (_req, res) => res.json({ status: 200 }));
app.post('/api/redemption', (req, res) => {
  const { email, code } = req.body || {};
  if (!isEmail(email) || !code) return res.json({ status: 400, message: 'Invalid redemption request.' });
  // Simple demo: any code of form "TEAM07-XXXX" gives +100 credits (single-use per user per day).
  if (!/^TEAM07-[A-Z0-9]{2,}$/i.test(String(code).trim())) {
    return res.json({ status: 400, message: 'Invalid redemption code.' });
  }
  db.prepare('UPDATE users SET credit = credit + 100 WHERE email = ?').run(email);
  return res.json({ status: 200, credit_added: 100 });
});

// ---------- OSS token placeholder ----------
// Return 200 with token=null so the front end falls back gracefully (no cover/video) in dev.
app.post('/api/get_ali_token', (_req, res) => res.json({ status: 200, token: null }));

// ---------- hallucination jobs (mocked async) ----------
app.post('/api/hallucination_check', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.json({ status: 400, message: 'No file uploaded.' });
  let options = [];
  try { options = JSON.parse(req.body?.options || '[]'); } catch { options = []; }
  const jobId = 'hc_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
  db.prepare(`
    INSERT INTO hallucination_jobs (job_id, email, file_name, options_json, status)
    VALUES (?, ?, ?, ?, 'processing')
  `).run(jobId, req.body?.email || '', file.originalname, JSON.stringify(options));

  // Schedule a fake analysis completion after ~3s
  setTimeout(() => {
    const resultJson = JSON.stringify(mockHallucinationReport(file.originalname, options));
    db.prepare("UPDATE hallucination_jobs SET status='done', result_json=?, updated_at=datetime('now') WHERE job_id=?")
      .run(resultJson, jobId);
  }, 3000);

  return res.json({ status: 200, job_id: jobId });
});

app.get('/api/hallucination_status', (req, res) => {
  const jobId = String(req.query.job_id || '');
  const row = db.prepare('SELECT status, result_json FROM hallucination_jobs WHERE job_id = ?').get(jobId);
  if (!row) return res.json({ status: 'error', message: 'Job not found.' });
  const data = row.result_json ? safeJson(row.result_json, null) : null;
  return res.json({ status: row.status, data });
});

function mockHallucinationReport(fileName, options) {
  const issues = [];
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

// ---------- fallback 404 ----------
app.use((req, res) => res.status(404).json({ status: 404, message: 'Not found: ' + req.path }));

app.listen(PORT, () => {
  console.log(`\n=== iSuperviz Team07 backend ===`);
  console.log(`  listening on http://localhost:${PORT}`);
  console.log(`  mailer mode:  ${getMode()}`);
  console.log(`=================================\n`);
});
