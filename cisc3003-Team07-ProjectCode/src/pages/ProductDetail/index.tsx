import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Row, Col, Typography, Tag, Button, InputNumber, Spin, Empty, Card,
  Breadcrumb, Divider, Rate, Collapse, message,
} from 'antd';
import {
  ShoppingCartOutlined, HomeOutlined, ShopOutlined, ThunderboltFilled,
  CheckCircleFilled, SafetyCertificateFilled, ClockCircleFilled,
  GlobalOutlined, RocketOutlined, ArrowRightOutlined, HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import axios from 'axios';
import PubSub from 'pubsub-js';

import CheckLogin from '../../components/CheckLogin';
import Tilt3D from '../../components/Tilt3D';
import Spotlight from '../../components/Effects/Spotlight';
import Magnetic from '../../components/Effects/Magnetic';
import Reveal from '../../components/Effects/Reveal';
import './product-detail.css';

const { Title, Paragraph, Text } = Typography;

interface Product {
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
}

const categoryLabel: Record<string, string> = {
  credit: 'Credits',
  plan: 'Plans',
  report: 'Reports',
  service: 'Services',
  merch: 'Merch',
};

// Synthesise category-specific highlights so each detail page feels rich.
function highlightsFor(p: Product) {
  const base = [
    { icon: <CheckCircleFilled />, label: 'Instant activation', detail: 'Available right after checkout — no waiting.' },
    { icon: <SafetyCertificateFilled />, label: 'Secure checkout', detail: 'All payments simulated for the demo; no real card needed.' },
    { icon: <RocketOutlined />,        label: 'Use anywhere',     detail: 'Accessible from your dashboard the moment it lands.' },
  ];
  if (p.category === 'credit') {
    return [
      { icon: <ThunderboltFilled />,    label: `+${p.credits.toLocaleString()} credits`,
        detail: 'Spend on AI summaries, idea graphs, hallucination checks and more.' },
      { icon: <ClockCircleFilled />,    label: 'Never expire',
        detail: 'Credits stay in your account until you use them.' },
      ...base,
    ];
  }
  if (p.category === 'plan') {
    return [
      { icon: <CheckCircleFilled />, label: 'Unlimited paper tracking',
        detail: 'Track all the topics that matter — no daily caps.' },
      { icon: <GlobalOutlined />,    label: 'Multi-area support',
        detail: 'Up to 5 research areas / 5 topics simultaneously.' },
      { icon: <ThunderboltFilled />, label: 'Priority AI access',
        detail: 'Faster responses and longer context windows during peak hours.' },
      ...base,
    ];
  }
  if (p.category === 'report') {
    return [
      { icon: <CheckCircleFilled />, label: 'Curated by Team 07',
        detail: 'Hand-picked papers, executive summary, and reading order.' },
      { icon: <GlobalOutlined />,    label: 'PDF + editable Markdown',
        detail: 'Drop straight into Notion / Obsidian / your LaTeX draft.' },
      ...base,
    ];
  }
  if (p.category === 'service') {
    return [
      { icon: <CheckCircleFilled />, label: 'Live, 1:1 conversation',
        detail: 'Schedule via your dashboard after purchase.' },
      { icon: <ClockCircleFilled />, label: 'Reschedulable',
        detail: 'Cancel or move your slot up to 24 hours before.' },
      ...base,
    ];
  }
  if (p.category === 'merch') {
    return [
      { icon: <CheckCircleFilled />, label: 'Ships worldwide',
        detail: 'Free shipping for Macau · 5–10 days everywhere else.' },
      ...base,
    ];
  }
  return base;
}

function faqsFor(p: Product) {
  const generic = [
    { q: 'Can I get a refund?', a: 'Yes — within 7 days, no questions asked. Just open a ticket from your dashboard.' },
    { q: 'Will my purchase show up immediately?', a: 'Yes. Plans and credits are activated the second the simulated payment succeeds, and they appear on your dashboard right away.' },
  ];
  if (p.category === 'credit') {
    return [
      { q: 'Do credits expire?', a: 'Credits never expire. They sit in your account until you spend them.' },
      { q: 'How much does each AI request cost?', a: 'Most summaries cost 5–10 credits. Long PDF chats can use 20+ depending on length.' },
      ...generic,
    ];
  }
  if (p.category === 'plan') {
    return [
      { q: 'Can I cancel?', a: 'Cancel any time from Settings. Your plan stays active until the end of the current period.' },
      { q: 'What happens to my credits if I downgrade?', a: 'Existing credits remain. Plan-specific perks (unlimited chat, etc.) end at renewal.' },
      ...generic,
    ];
  }
  return generic;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const buyBtnRef = useRef<HTMLElement | null>(null);

  const getEmail = () => {
    const raw = localStorage.getItem('loginInfo');
    if (!raw) return null;
    try { return JSON.parse(raw).email || null; } catch { return null; }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setProduct(null);
    setRelated([]);
    setQty(1);
    axios.get(`/api/products/${id}`)
      .then((res) => {
        if (res.data.status === 200) {
          setProduct(res.data.product);
          setRelated(res.data.related || []);
        } else {
          message.error(res.data.message || 'Product not found.');
        }
      })
      .catch(() => message.error('Failed to load product.'))
      .finally(() => setLoading(false));
  }, [id]);

  function flyToCart(fromEl: HTMLElement, emoji: string) {
    const cartIcon = document.querySelector('.menu-user a[href="/cart"]');
    if (!cartIcon || !fromEl) return;
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = cartIcon.getBoundingClientRect();
    const tx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const ty = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
    const node = document.createElement('div');
    node.className = 'isv-fly';
    node.textContent = emoji || '🛒';
    node.style.left = fromRect.left + fromRect.width / 2 - 18 + 'px';
    node.style.top = fromRect.top + fromRect.height / 2 - 18 + 'px';
    node.style.fontSize = '32px';
    node.style.lineHeight = '36px';
    node.style.width = '36px';
    node.style.height = '36px';
    node.style.textAlign = 'center';
    node.style.setProperty('--tx', `${tx}px`);
    node.style.setProperty('--ty', `${ty}px`);
    document.body.appendChild(node);
    node.addEventListener('animationend', () => {
      node.remove();
      cartIcon.classList.add('isv-pulse-ring');
      setTimeout(() => cartIcon.classList.remove('isv-pulse-ring'), 800);
    });
  }

  const handleAdd = async (afterAddNavigate?: 'cart') => {
    if (!product) return;
    if (!CheckLogin()) {
      message.info('Please log in first.');
      navigate('/login');
      return;
    }
    const email = getEmail();
    if (!email) return;
    setAdding(true);
    if (buyBtnRef.current) flyToCart(buyBtnRef.current, product.emoji || '🛒');
    try {
      const res = await axios.post('/api/cart/add', {
        email, product_id: product.id, quantity: qty,
      });
      if (res.data.status === 200) {
        message.success({
          content: `${product.name} × ${qty} added to cart`,
          icon: <ShoppingCartOutlined style={{ color: '#722ed1' }} />,
        });
        PubSub.publish('Cart Changed');
        if (afterAddNavigate === 'cart') navigate('/cart');
      } else {
        message.error(res.data.message || 'Failed to add to cart.');
      }
    } catch {
      message.error('Failed to add to cart.');
    } finally {
      setAdding(false);
    }
  };

  const highlights = useMemo(() => product ? highlightsFor(product) : [], [product]);
  const faqs = useMemo(() => product ? faqsFor(product) : [], [product]);

  if (loading) {
    return (
      <Row justify="center" align="middle" style={{ minHeight: '60vh' }}>
        <Spin size="large" />
      </Row>
    );
  }
  if (!product) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Empty description="Product not found." />
        <Button type="primary" onClick={() => navigate('/shop')} style={{ marginTop: 16 }}>
          Back to shop
        </Button>
      </div>
    );
  }

  return (
    <div className="pd-page">
      {/* === breadcrumbs === */}
      <Breadcrumb
        className="pd-breadcrumb"
        items={[
          { title: <Link to="/"><HomeOutlined /> Home</Link> },
          { title: <Link to="/shop"><ShopOutlined /> Shop</Link> },
          { title: <Tag color="purple" style={{ marginInlineEnd: 0 }}>{categoryLabel[product.category] || product.category}</Tag> },
          { title: <span>{product.name}</span> },
        ]}
      />

      {/* === hero (image + buy panel) === */}
      <Row gutter={[28, 28]} className="pd-hero">
        <Col xs={24} md={13}>
          <Tilt3D max={5} perspective={1300} className="pd-hero-tilt">
            <Spotlight color="rgba(255,255,255,0.18)" className="pd-hero-spot">
              <div
                className="pd-hero-card"
                style={{ background: product.gradient || 'linear-gradient(135deg,#a18cd1,#fbc2eb)' }}
              >
                <div className="pd-hero-img-wrap">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.dataset.fb) {
                          img.dataset.fb = '1';
                          img.src = `https://picsum.photos/seed/${encodeURIComponent(product.sku)}/900/600`;
                        }
                      }}
                    />
                  )}
                  <div className="pd-hero-overlay" />
                  <div className="pd-hero-emoji" aria-hidden>{product.emoji || '✨'}</div>
                  {product.badge && (
                    <div className="pd-hero-badge">
                      <ThunderboltFilled /> {product.badge}
                    </div>
                  )}
                </div>
              </div>
            </Spotlight>
          </Tilt3D>

          {/* small specs strip */}
          <Row className="pd-quick-strip" gutter={[12, 12]}>
            <Col xs={12} sm={6}><div className="pd-stat"><div className="pd-stat-k">SKU</div><div className="pd-stat-v">{product.sku}</div></div></Col>
            <Col xs={12} sm={6}><div className="pd-stat"><div className="pd-stat-k">Category</div><div className="pd-stat-v">{categoryLabel[product.category] || product.category}</div></div></Col>
            <Col xs={12} sm={6}><div className="pd-stat"><div className="pd-stat-k">Credits</div><div className="pd-stat-v">{product.credits ? `+${product.credits.toLocaleString()}` : '—'}</div></div></Col>
            <Col xs={12} sm={6}><div className="pd-stat"><div className="pd-stat-k">Rating</div><div className="pd-stat-v"><Rate disabled defaultValue={5} count={5} style={{ fontSize: 14 }} /></div></div></Col>
          </Row>
        </Col>

        <Col xs={24} md={11}>
          <Reveal y={20}>
            <Tag color="purple" className="pd-cat-tag">
              {categoryLabel[product.category] || product.category}
            </Tag>
            <Title level={1} className="pd-title">
              <span className="isv-gradient-text">{product.name}</span>
            </Title>
            <Paragraph style={{ fontSize: 16, color: '#555' }}>{product.description}</Paragraph>

            <div className="pd-price-row">
              <div className="pd-price">${product.price.toFixed(2)}</div>
              {product.credits > 0 && (
                <Tag color="magenta" style={{ fontSize: 13, padding: '4px 10px' }}>
                  +{product.credits.toLocaleString()} credits
                </Tag>
              )}
              <Tag color="green" style={{ fontSize: 12 }}>
                <SafetyCertificateFilled /> 7-day refund
              </Tag>
            </div>

            <div className="pd-buy">
              <span style={{ marginRight: 10, color: '#888' }}>Quantity</span>
              <InputNumber min={1} max={99} value={qty} onChange={(v) => setQty(Number(v) || 1)} size="large" />
              <Magnetic strength={10} range={140}>
                <Button
                  ref={(el) => { buyBtnRef.current = el as unknown as HTMLElement | null; }}
                  type="primary"
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  loading={adding}
                  onClick={() => handleAdd()}
                  className="pd-buy-add isv-shine"
                  style={{ position: 'relative', overflow: 'hidden' }}
                >
                  Add to cart
                </Button>
              </Magnetic>
              <Magnetic strength={6} range={100}>
                <Button
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => handleAdd('cart')}
                  className="pd-buy-now"
                >
                  Buy now <ArrowRightOutlined />
                </Button>
              </Magnetic>
              <Button
                size="large"
                shape="circle"
                icon={favorite ? <HeartFilled /> : <HeartOutlined />}
                onClick={() => { setFavorite((v) => !v); message.info(favorite ? 'Removed from wishlist' : 'Added to wishlist'); }}
                className={`pd-buy-fav ${favorite ? 'is-fav' : ''}`}
                aria-label="Add to wishlist"
              />
            </div>

            <div className="pd-trust">
              <span>🚀 Activates instantly</span>
              <span>🔒 Demo mode — nothing is charged</span>
              <span>💬 Backed by Team 07 support</span>
            </div>
          </Reveal>
        </Col>
      </Row>

      {/* === highlights === */}
      <Reveal y={30} className="pd-section">
        <Title level={3} className="pd-section-title">What you get</Title>
        <Row gutter={[16, 16]}>
          {highlights.map((h, i) => (
            <Col xs={24} sm={12} md={8} key={i}>
              <div className="isv-stagger pd-highlight-card" style={{ ['--i' as any]: i }}>
                <div className="pd-highlight-icon">{h.icon}</div>
                <Title level={4} style={{ marginTop: 0 }}>{h.label}</Title>
                <Paragraph style={{ color: '#666', marginBottom: 0 }}>{h.detail}</Paragraph>
              </div>
            </Col>
          ))}
        </Row>
      </Reveal>

      {/* === long description / "About this item" === */}
      <Reveal y={30} className="pd-section">
        <Card className="pd-about-card" bordered={false}>
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={4} style={{ textAlign: 'center' }}>
              <div
                className="pd-about-emoji"
                style={{ background: product.gradient || 'linear-gradient(135deg,#a18cd1,#fbc2eb)' }}
              >
                {product.emoji || '✨'}
              </div>
            </Col>
            <Col xs={24} md={20}>
              <Title level={3} style={{ margin: 0 }}>About this {categoryLabel[product.category] || 'item'}</Title>
              <Paragraph style={{ marginTop: 8, fontSize: 15, color: '#444' }}>
                {product.description} Whether you're researching for a coursework deadline or shipping
                a literature review for publication, <b>{product.name}</b> integrates seamlessly with
                everything else in the iSuperviz workflow — including the idea graph, hallucination
                check and reflective notes.
              </Paragraph>
              <ul className="pd-about-list">
                <li>One-click activation, no extra setup.</li>
                <li>Stacks with other purchases — your dashboard always shows the right balance.</li>
                <li>Backed by the CISC3003 Team 07 student maintainers.</li>
              </ul>
            </Col>
          </Row>
        </Card>
      </Reveal>

      {/* === FAQ === */}
      <Reveal y={30} className="pd-section">
        <Title level={3} className="pd-section-title">FAQ</Title>
        <Collapse
          accordion
          className="pd-faq"
          defaultActiveKey={['0']}
          items={faqs.map((f, i) => ({
            key: String(i),
            label: <span style={{ fontWeight: 600 }}>{f.q}</span>,
            children: <Paragraph style={{ marginBottom: 0, color: '#555' }}>{f.a}</Paragraph>,
          }))}
        />
      </Reveal>

      {/* === related === */}
      {related.length > 0 && (
        <Reveal y={30} className="pd-section">
          {(() => {
            const sameCatCount = related.filter((r) => r.category === product.category).length;
            const allSame = sameCatCount === related.length;
            const heading = allSame
              ? `More in ${categoryLabel[product.category] || product.category}`
              : 'You may also like';
            return (
              <Title level={3} className="pd-section-title">{heading}</Title>
            );
          })()}
          <Row gutter={[16, 16]}>
            {related.map((p, idx) => (
              <Col xs={24} sm={12} md={8} lg={6} key={p.id}>
                <div
                  className="isv-stagger pd-related-card"
                  data-related-id={p.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => {
                    // eslint-disable-next-line no-console
                    console.log('[product-detail] related click →', p.id, p.name);
                    navigate(`/shop/${p.id}`);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/shop/${p.id}`); }}
                  style={{ ['--i' as any]: idx }}
                >
                  <div
                    className="pd-related-cover"
                    style={{ background: p.gradient || 'linear-gradient(135deg,#a18cd1,#fbc2eb)' }}
                  >
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.fb) {
                            img.dataset.fb = '1';
                            img.src = `https://picsum.photos/seed/${encodeURIComponent(p.sku)}/600/400`;
                          }
                        }}
                      />
                    )}
                    <div className="pd-related-overlay" />
                    <div className="pd-related-emoji">{p.emoji || '✨'}</div>
                  </div>
                  <div className="pd-related-body">
                    <Title level={5} style={{ margin: 0 }}>{p.name}</Title>
                    <Row justify="space-between" align="middle" style={{ marginTop: 6 }}>
                      <Text strong style={{ color: '#722ed1', fontSize: 18 }}>${p.price.toFixed(2)}</Text>
                      {p.credits > 0 && <Tag color="magenta">+{p.credits.toLocaleString()}</Tag>}
                    </Row>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Reveal>
      )}

      <Divider style={{ margin: '32px 0 16px' }} />
      <div style={{ textAlign: 'center', color: '#888', fontSize: 13, paddingBottom: 60 }}>
        Backed by CISC3003 Team 07 · Demo product — no real payment is processed.
      </div>

      {/* === sticky bottom buy bar (mobile-friendly) === */}
      <div className="pd-sticky-bar">
        <div className="pd-sticky-info">
          <span className="pd-sticky-emoji">{product.emoji || '✨'}</span>
          <div>
            <div className="pd-sticky-name">{product.name}</div>
            <div className="pd-sticky-price">${(product.price * qty).toFixed(2)} · qty {qty}</div>
          </div>
        </div>
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          onClick={() => handleAdd()}
          loading={adding}
          className="pd-sticky-cta"
          size="large"
        >
          Add to cart
        </Button>
      </div>
    </div>
  );
}
