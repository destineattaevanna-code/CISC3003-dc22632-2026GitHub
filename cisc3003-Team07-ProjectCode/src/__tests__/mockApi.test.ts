import { handleMockRequest, resetMockDB } from '../mock/mockApi';
import { PAPERS, PRODUCTS } from '../mock/seed';

describe('Mock API parity with Express backend', () => {
  beforeEach(() => {
    resetMockDB();
    // Each test starts with an empty DB
  });

  test('GET /api/team returns Team 07 data', () => {
    const res = handleMockRequest('GET', '/api/team', null);
    expect(res.status).toBe(200);
    expect(res.team.teamNumber).toBe('Team 07');
    expect(res.team.members).toHaveLength(6);
  });

  test('GET /api/products returns 15 seeded products', () => {
    const res = handleMockRequest('GET', '/api/products', null);
    expect(res.status).toBe(200);
    expect(res.products.length).toBe(PRODUCTS.length);
  });

  test('POST /api/get_paper_info paginates the 25-paper catalog', () => {
    const res = handleMockRequest('POST', '/api/get_paper_info', {
      page: 1,
      pageSize: 10,
      searchWord: '',
      filterFavorite: false,
    });
    expect(res.status).toBe(200);
    expect(res.paperList).toHaveLength(10);
    expect(res.totalPaper).toBe(PAPERS.length);
  });

  test('POST /api/get_paper_info filters by keyword', () => {
    const res = handleMockRequest('POST', '/api/get_paper_info', {
      page: 1,
      pageSize: 20,
      searchWord: 'Transformer',
      filterFavorite: false,
    });
    expect(res.status).toBe(200);
    expect(res.paperList.length).toBeGreaterThan(0);
    expect(
      res.paperList.every((p: any) =>
        (p.title + p.author + p.abstract + p.topic).toLowerCase().includes('transformer')
      )
    ).toBe(true);
  });

  test('full auth flow: sign up → login → forgot password → reset', () => {
    const signup = handleMockRequest('POST', '/api/login', {
      email: 'test@isuperviz.app',
      password: 'test1234',
      nickName: 'Tester',
      action: 'register',
    });
    expect(signup.status).toBe(200);
    expect(signup.userInfo.user_id).toBe('test@isuperviz.app');

    const login = handleMockRequest('POST', '/api/login', {
      email: 'test@isuperviz.app',
      password: 'test1234',
    });
    expect(login.status).toBe(200);

    const wrong = handleMockRequest('POST', '/api/login', {
      email: 'test@isuperviz.app',
      password: 'wrongpass',
    });
    expect(wrong.status).toBe(401);

    const check = handleMockRequest('POST', '/api/check_account', { email: 'test@isuperviz.app' });
    expect(check.exists).toBe(true);

    const reset = handleMockRequest('POST', '/api/reset_password', {
      email: 'test@isuperviz.app',
      password: 'new12345',
    });
    expect(reset.status).toBe(200);

    const login2 = handleMockRequest('POST', '/api/login', {
      email: 'test@isuperviz.app',
      password: 'new12345',
    });
    expect(login2.status).toBe(200);
  });

  test('cart + checkout adds credits and keeps order history', () => {
    // Register user first
    handleMockRequest('POST', '/api/login', {
      email: 'cart@isuperviz.app',
      password: 'cart1234',
      nickName: 'Cart',
      action: 'register',
    });

    const add = handleMockRequest('POST', '/api/cart/add', {
      email: 'cart@isuperviz.app',
      product_id: 1,
      quantity: 2,
    });
    expect(add.status).toBe(200);

    const cart = handleMockRequest('GET', '/api/cart?email=cart@isuperviz.app', null);
    expect(cart.status).toBe(200);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.subtotal).toBeGreaterThan(0);

    const checkout = handleMockRequest('POST', '/api/cart/checkout', {
      email: 'cart@isuperviz.app',
      payment_method: 'mock',
    });
    expect(checkout.status).toBe(200);
    expect(checkout.order_no).toMatch(/^ISV/);
    // CREDIT_50 credits = 50 × 2 = 100 credits, initial balance 20 → 120.
    expect(checkout.newQuota).toBe(20 + 50 * 2);

    const orders = handleMockRequest('GET', '/api/orders?email=cart@isuperviz.app', null);
    expect(orders.orders).toHaveLength(1);
  });

  test('idea save + unsave mutates graph data', () => {
    handleMockRequest('POST', '/api/login', {
      email: 'idea@isuperviz.app',
      password: 'idea1234',
      nickName: 'Ideator',
      action: 'register',
    });

    const saved = handleMockRequest('POST', '/api/submit_idea', {
      email: 'idea@isuperviz.app',
      paperId: '1',
      idea: 'Test idea title\n\nAnd some descriptive body text.',
    });
    expect(saved.status).toBe(200);
    expect(saved.ideaId).toBeGreaterThan(0);

    const all = handleMockRequest('POST', '/api/get_user_all_ideas', {
      email: 'idea@isuperviz.app',
    });
    expect(all.status).toBe(200);
    expect(all.ideas).toHaveLength(1);
    expect(all.ideas[0].relatedPapers.length).toBeGreaterThan(0);

    const unsave = handleMockRequest('POST', '/api/unsave_idea', {
      email: 'idea@isuperviz.app',
      ideaId: saved.ideaId,
    });
    expect(unsave.status).toBe(200);

    const afterUnsave = handleMockRequest('POST', '/api/get_user_all_ideas', {
      email: 'idea@isuperviz.app',
    });
    expect(afterUnsave.ideas).toHaveLength(0);
  });

  test('redemption code with TEAM07-* format adds 100 credits', () => {
    handleMockRequest('POST', '/api/login', {
      email: 'code@isuperviz.app',
      password: 'code1234',
      nickName: 'Coder',
      action: 'register',
    });
    const before = handleMockRequest('POST', '/api/get_credit', { email: 'code@isuperviz.app' });
    expect(before.credit).toBe(20);

    const bad = handleMockRequest('POST', '/api/redemption', {
      email: 'code@isuperviz.app',
      code: 'NOT-A-CODE',
    });
    expect(bad.status).toBe(400);

    const ok = handleMockRequest('POST', '/api/redemption', {
      email: 'code@isuperviz.app',
      code: 'TEAM07-ABC',
    });
    expect(ok.status).toBe(200);
    expect(ok.credit_added).toBe(100);

    const after = handleMockRequest('POST', '/api/get_credit', { email: 'code@isuperviz.app' });
    expect(after.credit).toBe(120);
  });

  test('search history and delete', () => {
    handleMockRequest('POST', '/api/login', {
      email: 'sh@isuperviz.app',
      password: 'shist1234',
      nickName: 'Historian',
      action: 'register',
    });
    handleMockRequest('POST', '/api/search', { email: 'sh@isuperviz.app', keyword: 'credit' });
    handleMockRequest('POST', '/api/search', { email: 'sh@isuperviz.app', keyword: 'plan' });

    const h1 = handleMockRequest('GET', '/api/search_history?email=sh@isuperviz.app', null);
    expect(h1.history).toHaveLength(2);

    const del = handleMockRequest(
      'DELETE',
      `/api/search_history/${h1.history[0].id}?email=sh@isuperviz.app`,
      null
    );
    expect(del.status).toBe(200);

    const h2 = handleMockRequest('GET', '/api/search_history?email=sh@isuperviz.app', null);
    expect(h2.history).toHaveLength(1);

    const clear = handleMockRequest('POST', '/api/search_history/clear', {
      email: 'sh@isuperviz.app',
    });
    expect(clear.status).toBe(200);

    const h3 = handleMockRequest('GET', '/api/search_history?email=sh@isuperviz.app', null);
    expect(h3.history).toHaveLength(0);
  });

  test('unknown /api/* path returns 404', () => {
    const res = handleMockRequest('GET', '/api/does_not_exist', null);
    expect(res.status).toBe(404);
  });
});
