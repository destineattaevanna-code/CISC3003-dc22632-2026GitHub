import React, { useEffect, useRef, useState } from 'react';
import {
  Row, Col, Typography, Tag, Button, Input, message, Spin, Empty, Select
} from 'antd';
import { ShoppingCartOutlined, SearchOutlined, FireOutlined, ThunderboltFilled, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PubSub from 'pubsub-js';

import CheckLogin from '../../components/CheckLogin';
import './shop.css';

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

const categoryIcon: Record<string, string> = {
  credit: '⚡',
  plan: '✨',
  report: '📚',
  service: '🎓',
  merch: '🎁',
};

export default function ShopPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [addingId, setAddingId] = useState<number | null>(null);
  const buttonRefs = useRef<Record<number, HTMLElement | null>>({});

  const loadProducts = () => {
    setLoading(true);
    axios
      .get('/api/products')
      .then((res) => {
        if (res.data.status === 200) setProducts(res.data.products || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadProducts();
  }, []);

  const getLoginEmail = (): string | null => {
    const raw = localStorage.getItem('loginInfo');
    if (!raw) return null;
    try { return JSON.parse(raw).email || null; } catch { return null; }
  };

  // ---- the "fly to cart" effect: clones the emoji and animates it to the cart icon ----
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

  const addToCart = async (p: Product) => {
    if (!CheckLogin()) {
      message.info('Please log in first.');
      navigate('/login');
      return;
    }
    const email = getLoginEmail();
    if (!email) return;
    setAddingId(p.id);

    // Trigger the visual effect immediately for snappy feel.
    const btn = buttonRefs.current[p.id];
    if (btn) flyToCart(btn, p.emoji || '🛒');

    try {
      const res = await axios.post('/api/cart/add', { email, product_id: p.id, quantity: 1 });
      if (res.data.status === 200) {
        message.success({
          content: `${p.name} added to cart`,
          icon: <ShoppingCartOutlined style={{ color: '#722ed1' }} />,
        });
        PubSub.publish('Cart Changed');
      } else {
        message.error(res.data.message || 'Failed to add to cart.');
      }
    } catch {
      message.error('Failed to add to cart.');
    } finally {
      setAddingId(null);
    }
  };

  const handleSearch = async (value: string) => {
    setKeyword(value);
    if (!value) return;
    const email = getLoginEmail();
    if (email) {
      axios.post('/api/search', { email, keyword: value }).catch(() => {});
    }
  };

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const okCat = category === 'all' || p.category === category;
    const okKw = !keyword || (p.name + ' ' + p.description).toLowerCase().includes(keyword.toLowerCase());
    return okCat && okKw;
  });

  return (
    <div className="shop-page">
      {/* decorative blobs */}
      <div className="shop-blob shop-blob--a isv-blob" />
      <div className="shop-blob shop-blob--b isv-blob" />

      <div className="shop-header isv-anim-fade-down">
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            <FireOutlined style={{ color: '#ff4d4f', marginRight: 8 }} className="isv-anim-bounce" />
            <span className="isv-gradient-text">Team 07 Research Store</span>
          </Title>
          <Paragraph style={{ color: '#666', marginBottom: 0 }}>
            Top up credits, upgrade plans, or browse our curated research resources.
          </Paragraph>
        </div>
        <div className="shop-actions">
          <Input.Search
            prefix={<SearchOutlined />}
            placeholder="Search products…"
            allowClear
            onSearch={handleSearch}
            onChange={(e) => setKeyword(e.target.value)}
            size="large"
            style={{ width: 260 }}
          />
          <Select
            value={category}
            onChange={setCategory}
            size="large"
            style={{ width: 160 }}
            options={categories.map((c) => ({
              label: c === 'all'
                ? '🛍 All categories'
                : `${categoryIcon[c] || '•'} ${categoryLabel[c] || c}`,
              value: c,
            }))}
          />
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            size="large"
            onClick={() => navigate('/cart')}
          >
            Cart
          </Button>
        </div>
      </div>

      {/* category quick-pills */}
      <div className="shop-pills isv-anim-fade-up">
        {categories.map((c) => (
          <button
            key={c}
            className={`shop-pill ${category === c ? 'shop-pill--active' : ''}`}
            onClick={() => setCategory(c)}
          >
            <span style={{ marginRight: 4 }}>
              {c === 'all' ? '🛍' : categoryIcon[c] || '•'}
            </span>
            {c === 'all' ? 'All' : (categoryLabel[c] || c)}
          </button>
        ))}
      </div>

      {loading ? (
        <Row justify="center" align="middle" style={{ minHeight: 240 }}>
          <Spin size="large" />
        </Row>
      ) : filtered.length === 0 ? (
        <Empty description="No products match your filter." style={{ padding: 48 }} />
      ) : (
        <Row gutter={[20, 20]} key={category + keyword /* re-mount → re-stagger */}>
          {filtered.map((p, idx) => (
            <Col xs={24} sm={12} md={12} lg={8} xl={6} key={p.id}>
              <div
                className="isv-stagger product-card product-card-clickable"
                data-product-id={p.id}
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  // eslint-disable-next-line no-console
                  console.log('[shop] card click →', p.id, p.name);
                  navigate(`/shop/${p.id}`);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/shop/${p.id}`); }}
                style={{ ['--i' as any]: idx }}
              >
                <div
                  className="product-cover"
                  style={{ background: p.gradient || 'linear-gradient(135deg,#a18cd1,#fbc2eb)' }}
                >
                  {p.image_url && (
                    <img
                      className="product-cover-img"
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.dataset.fb) {
                          img.dataset.fb = '1';
                          img.src = `https://picsum.photos/seed/${encodeURIComponent(p.sku)}/800/500`;
                        } else {
                          img.style.display = 'none';
                        }
                      }}
                    />
                  )}
                  <div className="product-cover-overlay" />
                  <div className="product-cover-emoji" aria-hidden>
                    {p.emoji || '✨'}
                  </div>
                  <div className="product-cover-glow" />
                  {p.badge && (
                    <div className="product-badge">
                      <ThunderboltFilled style={{ marginRight: 4 }} />
                      {p.badge}
                    </div>
                  )}
                  <div className="product-cat-pill">
                    {categoryIcon[p.category] || '•'} {categoryLabel[p.category] || p.category}
                  </div>
                </div>

                <div className="product-body">
                  <Title level={4} style={{ marginTop: 0, marginBottom: 6 }}>
                    {p.name}
                  </Title>
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ minHeight: 44, color: '#666', marginBottom: 8 }}
                  >
                    {p.description}
                  </Paragraph>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <div className="product-price">
                        <Text className="product-price-amt">${p.price.toFixed(2)}</Text>
                      </div>
                      {p.credits > 0 && (
                        <Tag color="magenta" style={{ marginTop: 4 }}>
                          +{p.credits.toLocaleString()} credits
                        </Tag>
                      )}
                    </Col>
                    <Col>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          icon={<EyeOutlined />}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/shop/${p.id}`); }}
                          className="product-view-btn"
                          title="View details"
                        />
                        <Button
                          ref={(el) => { buttonRefs.current[p.id] = el as unknown as HTMLElement | null; }}
                          type="primary"
                          icon={<ShoppingCartOutlined />}
                          loading={addingId === p.id}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(p); }}
                          className="product-add-btn"
                        >
                          Add
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
