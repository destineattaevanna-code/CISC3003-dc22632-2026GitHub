import { PAPERS, PRODUCTS, TEAM, buildDefaultIdeasForPaper, makePaperNotes } from '../mock/seed';

describe('Seed data integrity', () => {
  test('Team 07 has exactly 6 members with UM student IDs', () => {
    expect(TEAM.members).toHaveLength(6);
    TEAM.members.forEach((m) => {
      expect(m.studentId).toMatch(/^DC\d{6}$/);
      expect(m.email?.endsWith('umac.mo') || m.email?.endsWith('um.edu.mo')).toBe(true);
      expect(m.individualUrl).toMatch(/^https?:\/\//);
      expect(m.pairUrl).toMatch(/^https?:\/\//);
    });
  });

  test('Papers catalog has unique arxiv_ids', () => {
    const ids = PAPERS.map((p) => p.arxiv_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('Products catalog has unique SKUs and all categories present', () => {
    const skus = PRODUCTS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
    const cats = new Set(PRODUCTS.map((p) => p.category));
    ['credit', 'plan', 'report', 'service', 'merch'].forEach((c) =>
      expect(cats.has(c)).toBe(true)
    );
  });

  test('buildDefaultIdeasForPaper produces ≥ 3 evaluated ideas per paper', () => {
    PAPERS.forEach((p) => {
      const ideas = buildDefaultIdeasForPaper(p);
      expect(ideas.length).toBeGreaterThanOrEqual(3);
      ideas.forEach((i) => {
        expect(i.idea).toContain(i.title);
        expect(i.evaluation?.novelty_score).toBeGreaterThanOrEqual(0);
        expect(i.evaluation?.novelty_score).toBeLessThanOrEqual(10);
      });
    });
  });

  test('makePaperNotes returns all standard sections', () => {
    const notes = makePaperNotes(PAPERS[0]);
    ['Key Contribution', 'Method Overview', 'Strengths', 'Open Questions', 'Why It Matters For You']
      .forEach((section) => expect(notes[section as keyof typeof notes]).toBeTruthy());
  });
});
