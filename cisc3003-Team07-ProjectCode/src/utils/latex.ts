// Lightweight LaTeX-to-HTML helpers shared across pages.
// Focused on inline math patterns commonly seen in paper titles/abstracts.

const GREEK_MAP: [RegExp, string][] = [
  [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'], [/\\delta/g, 'δ'],
  [/\\epsilon/g, 'ε'], [/\\varepsilon/g, 'ε'], [/\\zeta/g, 'ζ'], [/\\eta/g, 'η'],
  [/\\theta/g, 'θ'], [/\\iota/g, 'ι'], [/\\kappa/g, 'κ'], [/\\lambda/g, 'λ'],
  [/\\mu/g, 'μ'], [/\\nu/g, 'ν'], [/\\xi/g, 'ξ'], [/\\pi/g, 'π'],
  [/\\rho/g, 'ρ'], [/\\sigma/g, 'σ'], [/\\tau/g, 'τ'], [/\\phi/g, 'φ'],
  [/\\varphi/g, 'φ'], [/\\chi/g, 'χ'], [/\\psi/g, 'ψ'], [/\\omega/g, 'ω'],
  [/\\Gamma/g, 'Γ'], [/\\Delta/g, 'Δ'], [/\\Theta/g, 'Θ'], [/\\Lambda/g, 'Λ'],
  [/\\Xi/g, 'Ξ'], [/\\Pi/g, 'Π'], [/\\Sigma/g, 'Σ'], [/\\Phi/g, 'Φ'],
  [/\\Psi/g, 'Ψ'], [/\\Omega/g, 'Ω'], [/\\infty/g, '∞'], [/\\pm/g, '±'],
  [/\\times/g, '×'], [/\\cdot/g, '·'], [/\\leq/g, '≤'], [/\\geq/g, '≥'],
  [/\\neq/g, '≠'], [/\\approx/g, '≈'], [/\\sim/g, '∼'], [/\\ell/g, 'ℓ'],
  [/\\nabla/g, '∇'], [/\\partial/g, '∂'], [/\\forall/g, '∀'], [/\\exists/g, '∃'],
  [/\\in/g, '∈'], [/\\subset/g, '⊂'], [/\\subseteq/g, '⊆'], [/\\cup/g, '∪'],
  [/\\cap/g, '∩'], [/\\to/g, '→'], [/\\rightarrow/g, '→'], [/\\leftarrow/g, '←'],
  [/\\Rightarrow/g, '⇒'], [/\\Leftarrow/g, '⇐'], [/\\sum/g, '∑'], [/\\prod/g, '∏'],
  [/\\int/g, '∫'], [/\\sqrt/g, '√'], [/\\propto/g, '∝'], [/\\ldots/g, '…'],
  [/\\cdots/g, '⋯'],
];

const ACCENT_CHAR: Record<string, Record<string, string>> = {
  "'": {a:'á',e:'é',i:'í',o:'ó',u:'ú',c:'ć',n:'ń',s:'ś',z:'ź',y:'ý',A:'Á',E:'É',I:'Í',O:'Ó',U:'Ú',C:'Ć',N:'Ń',S:'Ś',Z:'Ź',Y:'Ý'},
  '`': {a:'à',e:'è',i:'ì',o:'ò',u:'ù',A:'À',E:'È',I:'Ì',O:'Ò',U:'Ù'},
  '"': {a:'ä',e:'ë',i:'ï',o:'ö',u:'ü',y:'ÿ',A:'Ä',E:'Ë',I:'Ï',O:'Ö',U:'Ü'},
  '^': {a:'â',e:'ê',i:'î',o:'ô',u:'û',A:'Â',E:'Ê',I:'Î',O:'Ô',U:'Û'},
  '~': {a:'ã',n:'ñ',o:'õ',A:'Ã',N:'Ñ',O:'Õ'},
};

const CMD_ACCENT: Record<string, Record<string, string>> = {
  c: {c:'ç',C:'Ç',s:'ş',S:'Ş',t:'ţ',T:'Ţ'},
  v: {c:'č',s:'š',z:'ž',r:'ř',n:'ň',e:'ě',C:'Č',S:'Š',Z:'Ž',R:'Ř',N:'Ň',E:'Ě'},
  H: {o:'ő',u:'ű',O:'Ő',U:'Ű'},
  k: {a:'ą',e:'ę',A:'Ą',E:'Ę'},
  r: {a:'å',A:'Å'},
};

export const cleanLatexAccents = (text: string): string => {
  let s = String(text || '');
  s = s.replace(/\\([`'^"~])\{([a-zA-Z])\}/g, (_, a, c) => ACCENT_CHAR[a]?.[c] ?? c);
  s = s.replace(/\\([`'^"~])([a-zA-Z])/g, (_, a, c) => ACCENT_CHAR[a]?.[c] ?? c);
  s = s.replace(/\\([cvHkr])\{([a-zA-Z])\}/g, (_, cmd, c) => CMD_ACCENT[cmd]?.[c] ?? c);
  s = s.replace(/[{}]/g, '');
  return s;
};

export const latexToHtml = (text: string): string => {
  let s = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // en dash for double hyphen
  s = s.replace(/--/g, '–');

  // Inline math delimited by single $...$
  s = s.replace(/\$([^$]+)\$/g, (_match, inner) => {
    let m = inner as string;
    for (const [pat, repl] of GREEK_MAP) {
      m = m.replace(pat, repl);
    }
    // Strip common LaTeX wrappers but keep content
    m = m.replace(/\\(?:mathcal|mathbb|mathfrak|mathscr)\{([^}]+)\}/g, '$1');
    m = m.replace(/\\(?:text|mathrm|mathbf|textbf|textit|emph|operatorname)\{([^}]+)\}/g, '$1');
    m = m.replace(/\\(?:bar|hat|tilde|vec|dot|ddot|overline)\{([^}]+)\}/g, '$1');
    // Superscripts/subscripts, including patterns like Li$_x$Si
    m = m.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    m = m.replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>');
    m = m.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    m = m.replace(/_([a-zA-Z0-9])/g, '<sub>$1</sub>');
    // Drop remaining backslash-commands and braces
    m = m.replace(/\\[a-zA-Z]+/g, '');
    m = m.replace(/[{}]/g, '');
    return m;
  });

  // Also handle LaTeX commands that appear outside explicit $...$
  for (const [pat, repl] of GREEK_MAP) {
    s = s.replace(pat, repl);
  }
  s = s.replace(/\\(?:text|mathrm|mathbf|textbf|textit|emph|mathcal)\{([^}]+)\}/g, '$1');
  s = s.replace(/\\[a-zA-Z]+/g, '');
  s = s.replace(/[{}]/g, '');

  return s;
};

export const hasLatex = (title: string): boolean => {
  return /\$|\\[a-zA-Z]/.test(String(title || ''));
};

