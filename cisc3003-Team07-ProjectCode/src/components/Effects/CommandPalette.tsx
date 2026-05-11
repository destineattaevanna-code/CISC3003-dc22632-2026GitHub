import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HomeOutlined, ReadOutlined, BulbOutlined, ExperimentOutlined,
  ShopOutlined, ShoppingCartOutlined, DashboardOutlined, SettingOutlined,
  TeamOutlined, LoginOutlined, LogoutOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import PubSub from 'pubsub-js';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  group: 'Navigate' | 'Account' | 'Action';
  run: () => void;
  match: string; // lowercased text used for filtering
}

/**
 * Spotlight-style command palette opened with Ctrl+K / Cmd+K.
 * Provides quick navigation + small actions.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Build the command list. We rebuild when navigate changes to keep the
  // closures fresh.
  const commands = useMemo<Cmd[]>(() => {
    const isLogged = !!localStorage.getItem('loginInfo');
    const list: Cmd[] = [
      { id: 'home',  group: 'Navigate', label: 'Home',           hint: 'go /',           icon: <HomeOutlined />,         run: () => navigate('/'),            match: 'home start landing 主页' },
      { id: 'paper', group: 'Navigate', label: 'Paper feed',     hint: 'arXiv tracker',  icon: <ReadOutlined />,         run: () => navigate('/paper'),       match: 'paper papers feed arxiv 文献 论文' },
      { id: 'hall',  group: 'Navigate', label: 'Hallucination check', hint: 'detector', icon: <ExperimentOutlined />,    run: () => navigate('/hallucination'),match: 'hallucination check halu' },
      { id: 'shop',  group: 'Navigate', label: 'Shop',           hint: 'credits & plans',icon: <ShopOutlined />,         run: () => navigate('/shop'),        match: 'shop store buy 商店 购物' },
      { id: 'cart',  group: 'Navigate', label: 'Cart',           hint: 'your basket',    icon: <ShoppingCartOutlined />, run: () => navigate('/cart'),        match: 'cart basket 购物车' },
      { id: 'dash',  group: 'Navigate', label: 'Dashboard',      hint: 'history & orders', icon: <DashboardOutlined />,  run: () => navigate('/dashboard'),   match: 'dashboard history orders 控制台' },
      { id: 'team',  group: 'Navigate', label: 'Team 07',        hint: 'meet the team',  icon: <TeamOutlined />,         run: () => navigate('/team'),        match: 'team 07 cisc3003 members about' },
      { id: 'set',   group: 'Account',  label: 'Settings',       hint: 'preferences',    icon: <SettingOutlined />,      run: () => navigate('/setting'),     match: 'settings preferences profile change password 设置' },
    ];
    if (isLogged) {
      list.push({
        id: 'logout', group: 'Account', label: 'Log out', hint: 'sign out', icon: <LogoutOutlined />,
        run: () => {
          localStorage.removeItem('loginInfo');
          PubSub.publish('Login Status', false);
          navigate('/');
        },
        match: 'logout signout 退出 登出',
      });
    } else {
      list.push({
        id: 'login', group: 'Account', label: 'Log in / Sign up', hint: 'access account', icon: <LoginOutlined />,
        run: () => navigate('/login'), match: 'login signup register 登录 注册',
      });
    }
    list.push(
      {
        id: 'topup', group: 'Action', label: 'Top up credits', hint: 'open shop',
        icon: <ThunderboltOutlined />,
        run: () => navigate('/shop'),
        match: 'topup credits buy refill 充值',
      },
    );
    return list;
  }, [navigate]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter((c) => c.match.includes(term) || c.label.toLowerCase().includes(term));
  }, [q, commands]);

  // Keyboard handler — global shortcut and palette navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      // Toggle palette
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // Closed shortcut: "/" focuses palette (ignored when typing in inputs)
      if (!open && e.key === '/' && !(e.target as HTMLElement)?.matches?.('input, textarea, [contenteditable=""], [contenteditable="true"]')) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      else if (e.key === 'Enter')     {
        e.preventDefault();
        const c = filtered[active];
        if (c) { c.run(); setOpen(false); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, active]);

  // Reset selection when query changes; focus input when opened.
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <span className="cmdk-input-icon">⌘</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a page or action…  (Esc to close)"
            className="cmdk-input"
            autoFocus
          />
          <kbd className="cmdk-kbd">Esc</kbd>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 && (
            <div className="cmdk-empty">No matches for "{q}"</div>
          )}
          {filtered.map((c, idx) => {
            const prev = idx > 0 ? filtered[idx - 1] : null;
            const showHeader = !prev || prev.group !== c.group;
            return (
              <React.Fragment key={c.id}>
                {showHeader && <div className="cmdk-group">{c.group}</div>}
                <button
                  type="button"
                  className={`cmdk-item ${idx === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => { c.run(); setOpen(false); }}
                >
                  <span className="cmdk-item-icon">{c.icon}</span>
                  <span className="cmdk-item-label">{c.label}</span>
                  {c.hint && <span className="cmdk-item-hint">{c.hint}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmdk-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
