# iSuperviz — CISC3003 Team 07

Full-stack AI research supervisor web application built for the CISC3003 Project
Assignment (2026APR13 – 2026MAY04).

## Live URL (GitHub Pages)

```
https://<your-github-user>.github.io/iSuperviz/
```

The static bundle under `build/` is self-contained: it includes a drop-in mock
backend that intercepts every `/api/*` call (see `src/mock/`), so GitHub Pages
can host it without a Node.js server. When the real Express backend *is*
available (`http://localhost:4000` during development), the mock stays out of
the way and forwards calls transparently.

### Reviewer quick-start

Without signing up you can still explore every page via **Ctrl/Cmd + K**.
To see the authenticated flow use the Demo account (works on mock + real backend):

| Field        | Value                     |
| ------------ | ------------------------- |
| Email        | `professor@um.edu.mo`     |
| Password     | `demo1234`                |
| Redeem code  | `TEAM07-ABC` → +100 credits |

The Login page has a one-click **"Fill for me"** button that pre-fills these
values for the reviewer.

## Team 07

| Pair | Role    | Student ID | Name           | Nickname | Individual site | Pair site |
|------|---------|------------|----------------|----------|-----------------|-----------|
| 08   | Member  | DC328023   | Jiang Xingyu   | Sean     | [site](https://bishoujodaisuki.github.io/CISC3003-dc328023-2026GitHub/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html) | [pair](https://bishoujodaisuki.github.io/CISC3003-dc328023-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html) |
| 08   | Partner | DC328669   | Yang Xu        | Elsa     | [site](https://elsayx.github.io/CISC3003-dc328669-2026GitHub/CISC3003-IndAssgn-dc328669/public/cisc3003-IndAssgn-dc328669.html) | [pair](https://elsayx.github.io/CISC3003-dc328669-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html) |
| 12   | Member  | DC326312   | HUANG SOFIA    | Sofia    | [site](https://sofia74077.github.io/CISC3003-IndAssgn-2026MAR01/) | [pair](https://sofia74077.github.io/CISC3003-DC326312-2026GitHub/CISC3003-PairAssgn-2026APR02/public/index.html) |
| 12   | Partner | DC326351   | FAN ZOU CHEN   | Emily    | [site](https://emilyum.github.io/Hello-World/cisc3003-IndAssgn-2026MAR01/cisc3003-IndAssgn.html) | [pair](https://sofia74077.github.io/CISC3003-DC326312-2026GitHub/CISC3003-PairAssgn-2026APR02/public/index.html) |
| 04   | Member  | DC227126   | SI TIN IEK     | Mikey    | [site](https://useriiiis.github.io/CISC3003-dc227126-2026GitHub/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html) | [pair](https://useriiiis.github.io/CISC3003-dc227126-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html) |
| 04   | Partner | DC226328   | MA IAT TIM     | Tim      | [site](https://qiyao33.github.io/CISC3003-2026-github1/CISC3003-IndAssgn-2026MAR01/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html) | [pair](https://qiyao33.github.io/CISC3003-2026-github1/CISC3003-PairAssgn-2026APR02/cisc3003-PairAssgn.html) |

## Repository layout

- `src/` – React + TypeScript SPA (Create React App, Ant Design, React-Flow).
- `src/mock/` – zero-dependency mock of the backend used when no real server is
  reachable (i.e. GitHub Pages static deployment).
- `server/` – Node.js / Express backend with SQLite + Nodemailer.
- `public/` – static assets (including `.nojekyll` and `404.html` for Pages).
- `docs/` – internal design notes for the shared paper graph.
- `build/` – optimized production bundle (checked in so GitHub Pages can serve
  it directly from the repo root).

## API coverage (what the backend implements)

| Category | Endpoint |
|----------|----------|
| Health / Team | `GET /api/health` · `GET /api/team` |
| Signup / login / email verification | `POST /api/sendCaptcha` · `POST /api/login` |
| Password reset | `POST /api/forgot_password` · `POST /api/check_account` · `POST /api/reset_password` · `POST /api/change_password` |
| Profile / credits | `POST /api/edit_profile` · `POST /api/get_credit` |
| Paper tracking | `POST /api/get_paper_info` · `POST /api/get_paper_notes` · `POST /api/get_ideas` · `POST /api/submit_idea` · `POST /api/unsave_idea` · `POST /api/get_user_all_ideas` · `POST /api/mark_idea_related_paper_viewed` |
| Chat (polling) | `POST /api/chat` · `POST /api/get_response` |
| Feedback / favourites | `POST /api/feedback` · `POST /api/eidt_favorite` |
| Products catalog | `GET /api/products` · `GET /api/products/:id` |
| Search + history | `POST /api/search` · `GET /api/search_history` · `DELETE /api/search_history/:id` · `POST /api/search_history/clear` |
| Shopping cart + orders | `GET /api/cart` · `POST /api/cart/add` · `POST /api/cart/update` · `POST /api/cart/remove` · `POST /api/cart/clear` · `POST /api/cart/checkout` · `GET /api/orders` |
| Payment stubs | `POST /api/create-checkout-session` · `POST /api/create_payment` · `POST /api/purchase_callback` · `POST /api/purchase_paypal_callback` · `POST /api/redemption` |
| OSS token stub | `POST /api/get_ali_token` |
| Hallucination audit | `POST /api/hallucination_check` · `GET /api/hallucination_status` |

Every endpoint is mirrored in `src/mock/mockApi.ts` so the static bundle has
parity with the Express server.

## Development — running locally

Prereqs: Node.js 18/20/22, npm.

```bash
# --- frontend ---
cd iSuperviz
npm install

# --- backend (optional) ---
cd server
npm install
```

Run **backend** on port 4000:

```bash
cd iSuperviz/server
npm start
```

Run **frontend** on port 8080 (the CRA dev server proxies `/api/*` to 4000):

```bash
cd iSuperviz
npm start
```

Open http://localhost:8080 .

## Building a production bundle

```bash
cd iSuperviz
CI=false REACT_APP_FORCE_MOCK=1 npm run build
```

- `REACT_APP_FORCE_MOCK=1` sets the static bundle to use the in-browser mock
  from the first paint (ideal for GitHub Pages).
- Omit that variable if you want the bundle to talk to a real backend first
  (it still falls back to the mock on network/4xx errors).

## Deploying to GitHub Pages

**Preferred — GitHub Actions (already configured):**

1. Push this repo to a new GitHub repository.
2. In **Settings → Pages**, set **Source** to "GitHub Actions".
3. On every push to `main`, the workflow at `.github/workflows/deploy-pages.yml`
   runs unit tests, builds the mock-first bundle, and publishes it. The URL
   will appear in the run summary.

**Alternative — manual:**

1. Commit the `build/` directory (already configured via `package.json#homepage = "."`).
2. In your GitHub repo settings, enable **Pages** → **Source**: deploy from
   `build/` on the branch you push to.
3. Visit `https://<user>.github.io/iSuperviz/` — the SPA uses HashRouter
   (`/#/team`, `/#/paper`…) so deep-links work without server rewrites.

If you host the build under a sub-path (e.g. `/iSuperviz/`), nothing else is
required — CRA already baked `./` relative asset URLs.

## Testing

```bash
cd iSuperviz
CI=true npm test -- --watchAll=false
```

The test suite (at `src/__tests__/`) covers:

- Mock API parity (18+ assertions across auth, cart, ideas, search, redemption).
- Seed data integrity (unique SKUs, ISO student IDs, URL validity).
- **Testable responsive design** — a `matchMedia` mock driving viewport tests
  at 360 / 768 / 1440 widths.

The same tests run in CI via the GitHub Actions workflow before the bundle is
deployed.

## Screenshots and PPT content

- `/3003-screenshots/` — 12 page captures, generated by
  `/3003-tools/screenshots.js` (Playwright).
- `/3003-tools/generate_ppt_doc.py` — writes
  `iSuperviz_Team07_PPT_Content.docx` in the repo root. Each "slide" in the
  Word doc maps to one PowerPoint slide and embeds the matching screenshot.

To regenerate:

```bash
cd iSuperviz && CI=false REACT_APP_FORCE_MOCK=1 npm run build
cd build && python3 -m http.server 5500 &
cd ../3003-tools && npx playwright install chromium
BASE_URL=http://localhost:5500 node screenshots.js
python3 generate_ppt_doc.py
```

## Project requirements coverage

Mapped directly to the CISC3003 project brief:

- [x] **Testable responsive design** — all pages use Ant Design Grid with
  custom breakpoints at 576 / 768 / 1024 / 1440 pixels.
- [x] **Full-stack web application** — React SPA + Express/SQLite backend.
- [x] **User sign-up + email verification** — Nodemailer SMTP with a console
  fallback.
- [x] **User login / password reset (forgotten)** — bcrypt-hashed passwords, pre-flight `check_account`.
- [x] **User dashboard** — profile, credits, search history, cart, orders in one page.
- [x] **Search-related services** — `/api/get_paper_info`, `/api/search`.
- [x] **History-related services** — `search_history` CRUD.
- [x] **Shopping-cart services** — `/api/cart/*`, `/api/orders`.
- [x] **Peculiar services** — AI Paper Chat, Idea Graph, Hallucination audit,
  credit redemption, Plus plan subscription.
- [x] **Project deployment** — single Web URL (GitHub Pages), backend instructions
  included.

## License

MIT — see [`LICENSE`](./LICENSE).
