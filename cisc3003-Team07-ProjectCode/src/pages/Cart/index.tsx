import React, { useEffect, useRef, useState } from 'react';
import {
  Row, Col, Card, Typography, Button, InputNumber, message, Spin, Empty, Divider,
  Modal, Radio, Tag
} from 'antd';
import {
  DeleteOutlined, ShoppingCartOutlined, ShopOutlined, CreditCardOutlined,
  DashboardOutlined, ThunderboltFilled, GiftOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PubSub from 'pubsub-js';

import CheckLogin from '../../components/CheckLogin';
import Magnetic from '../../components/Effects/Magnetic';
import Spotlight from '../../components/Effects/Spotlight';
import './cart.css';

function fireConfetti() {
  const colors = ['#722ed1', '#eb2f96', '#fa8c16', '#52c41a', '#1890ff', '#fadb14'];
  const N = 90;
  const root = document.body;
  for (let i = 0; i < N; i++) {
    const piece = document.createElement('div');
    piece.style.position = 'fixed';
    piece.style.left = `${50 + (Math.random() - 0.5) * 30}%`;
    piece.style.top = '-20px';
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${10 + Math.random() * 14}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';
    piece.style.opacity = '0.95';
    piece.style.zIndex = '9999';
    piece.style.pointerEvents = 'none';
    piece.style.setProperty('--cx', `${(Math.random() - 0.5) * 600}px`);
    piece.style.setProperty('--cr', `${360 + Math.random() * 720}deg`);
    piece.style.animation = `isv-confetti-fall ${1.6 + Math.random() * 1.4}s cubic-bezier(.2,.6,.4,1) forwards`;
    piece.style.animationDelay = `${Math.random() * 0.25}s`;
    root.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

const { Title, Paragraph, Text } = Typography;

interface CartItem {
  id: number;
  quantity: number;
  product_id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  category: string;
  image_url: string;
  emoji?: string;
  gradient?: string;
}

export default function CartPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'card' | 'paypal' | 'mock'>('mock');
  const [checking, setChecking] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{
    no: string;
    total: number;
    items: CartItem[];
    creditsEarned: number;
    newCredit?: number;
    paymentMethod: string;
    when: Date;
  } | null>(null);

  const getEmail = (): string | null => {
    const raw = localStorage.getItem('loginInfo');
    if (!raw) return null;
    try { return JSON.parse(raw).email || null; } catch { return null; }
  };

  const load = () => {
    const email = getEmail();
    if (!email) {
      navigate('/login');
      return;
    }
    setLoading(true);
    axios
      .get('/api/cart', { params: { email } })
      .then((res) => {
        if (res.data.status === 200) {
          setItems(res.data.items || []);
          setSubtotal(res.data.subtotal || 0);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!CheckLogin()) {
      navigate('/login');
      return;
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateQty = async (item: CartItem, qty: number) => {
    const email = getEmail();
    if (!email) return;
    await axios.post('/api/cart/update', { email, product_id: item.product_id, quantity: qty });
    load();
    PubSub.publish('Cart Changed');
  };

  const removeItem = async (item: CartItem) => {
    const email = getEmail();
    if (!email) return;
    await axios.post('/api/cart/remove', { email, product_id: item.product_id });
    message.success(`${item.name} removed.`);
    load();
    PubSub.publish('Cart Changed');
  };

  const clearAll = async () => {
    const email = getEmail();
    if (!email) return;
    Modal.confirm({
      title: 'Clear your cart?',
      content: 'This will remove all items from your cart.',
      okText: 'Clear',
      okButtonProps: { danger: true },
      onOk: async () => {
        await axios.post('/api/cart/clear', { email });
        load();
        PubSub.publish('Cart Changed');
      },
    });
  };

  const checkout = async () => {
    const email = getEmail();
    if (!email) return;
    setChecking(true);
    try {
      const res = await axios.post('/api/cart/checkout', { email, payment_method: payMethod });
      if (res.data.status === 200) {
        const creditsEarned = items.reduce((s, it) => s + (it.credits || 0) * it.quantity, 0);
        setSuccessOrder({
          no: res.data.order_no,
          total: res.data.total,
          items: [...items],
          creditsEarned,
          newCredit: res.data.newQuota,
          paymentMethod: payMethod,
          when: new Date(),
        });
        setCheckoutOpen(false);
        fireConfetti();
        if (res.data.newQuota !== undefined) {
          const raw = localStorage.getItem('loginInfo');
          if (raw) {
            try {
              const u = JSON.parse(raw);
              u.credit = res.data.newQuota;
              if (res.data.memberExpiredDate) u.memberExpiredDate = res.data.memberExpiredDate;
              localStorage.setItem('loginInfo', JSON.stringify(u));
              PubSub.publish('Quota Status', u.credit);
            } catch {}
          }
        }
        load();
        PubSub.publish('Cart Changed');
      } else {
        message.error(res.data.message || 'Checkout failed.');
      }
    } catch {
      message.error('Checkout failed, please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <Row justify="center" align="middle" style={{ minHeight: '50vh' }}>
        <Spin size="large" />
      </Row>
    );
  }

  if (successOrder) {
    const so = successOrder;
    const itemsCount = so.items.reduce((s, i) => s + i.quantity, 0);
    const payLabel: Record<string, string> = {
      mock: 'Simulated payment',
      card: 'Credit card',
      paypal: 'PayPal',
    };
    return (
      <div className="cart-page success-page">
        <div className="success-blob success-blob--a isv-blob" />
        <div className="success-blob success-blob--b isv-blob" />

        <div className="success-hero isv-anim-fade-up">
          <div className="success-check">
            <span className="success-check-ring success-check-ring--1" />
            <span className="success-check-ring success-check-ring--2" />
            <svg viewBox="0 0 80 80" className="success-check-svg" aria-hidden>
              <circle cx="40" cy="40" r="36" className="success-check-circle" />
              <path d="M24 42 L36 54 L58 30" className="success-check-tick" />
            </svg>
          </div>
          <Title level={1} className="success-title isv-gradient-text" style={{ marginTop: 12 }}>
            Payment Successful!
          </Title>
          <Paragraph style={{ fontSize: 16, color: '#666', maxWidth: 520, margin: '8px auto 0' }}>
            Thank you for supporting <b>Team 07</b>. Your order is being processed and your credits / plans
            are already active.
          </Paragraph>
        </div>

        <Row gutter={[20, 20]} justify="center" className="success-grid">
          {/* Order summary */}
          <Col xs={24} md={14}>
            <Card className="success-card isv-anim-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="success-card-header">
                <div>
                  <Text type="secondary" style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Order receipt
                  </Text>
                  <Title level={3} style={{ margin: '4px 0' }}>
                    #{so.no}
                  </Title>
                </div>
                <div className="success-card-total">
                  <div style={{ fontSize: 12, color: '#999' }}>Total paid</div>
                  <div className="success-total-amt">${so.total.toFixed(2)}</div>
                </div>
              </div>

              <Divider style={{ margin: '12px 0 16px' }} />

              <Row gutter={[12, 12]}>
                <Col xs={12} sm={6}>
                  <div className="success-meta">
                    <div className="success-meta-label">Items</div>
                    <div className="success-meta-value">{itemsCount}</div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="success-meta">
                    <div className="success-meta-label">Method</div>
                    <div className="success-meta-value" style={{ fontSize: 14 }}>
                      {payLabel[so.paymentMethod] || so.paymentMethod}
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="success-meta">
                    <div className="success-meta-label">When</div>
                    <div className="success-meta-value" style={{ fontSize: 14 }}>
                      {so.when.toLocaleString()}
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="success-meta">
                    <div className="success-meta-label">Status</div>
                    <div>
                      <Tag color="success" style={{ fontWeight: 600 }}>PAID</Tag>
                    </div>
                  </div>
                </Col>
              </Row>

              <Divider orientation="left" plain style={{ marginTop: 24, color: '#888' }}>
                What you got
              </Divider>

              <div className="success-items">
                {so.items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="success-item isv-stagger"
                    style={{ ['--i' as any]: idx }}
                  >
                    <div
                      className="success-item-thumb"
                      style={{ background: it.gradient || 'linear-gradient(135deg,#a18cd1,#fbc2eb)' }}
                    >
                      {it.image_url && (
                        <img
                          src={it.image_url}
                          alt={it.name}
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (!img.dataset.fb) {
                              img.dataset.fb = '1';
                              img.src = `https://picsum.photos/seed/${encodeURIComponent(it.sku)}/200/200`;
                            } else {
                              img.style.display = 'none';
                            }
                          }}
                        />
                      )}
                      <span className="success-item-emoji">{it.emoji || '✨'}</span>
                    </div>
                    <div className="success-item-info">
                      <div className="success-item-name">{it.name}</div>
                      <div className="success-item-meta">
                        <Tag color="purple" style={{ marginRight: 4 }}>{it.category}</Tag>
                        ×{it.quantity}
                        {it.credits > 0 && (
                          <Tag color="magenta" style={{ marginLeft: 6 }}>
                            +{(it.credits * it.quantity).toLocaleString()} credits
                          </Tag>
                        )}
                      </div>
                    </div>
                    <div className="success-item-price">
                      ${(it.price * it.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* Side panel */}
          <Col xs={24} md={10}>
            {so.creditsEarned > 0 && (
              <Card className="success-side success-credits isv-anim-fade-up" style={{ animationDelay: '200ms' }}>
                <ThunderboltFilled className="success-credits-icon" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>Credits added</Text>
                <div className="success-credits-amt">+{so.creditsEarned.toLocaleString()}</div>
                {typeof so.newCredit === 'number' && (
                  <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                    New balance: <b>{so.newCredit.toLocaleString()}</b>
                  </Text>
                )}
              </Card>
            )}

            <Card className="success-side success-tips isv-anim-fade-up" style={{ animationDelay: '280ms', marginTop: 16 }}>
              <Title level={4} style={{ margin: '0 0 8px' }}>
                <GiftOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                What's next?
              </Title>
              <ul className="success-tips-list">
                <li>Start a new search and let AI summarise the latest papers in your field.</li>
                <li>Check your <b>Dashboard</b> for the receipt, search history and credits balance.</li>
                <li>Share your team redemption code so members can use these credits too.</li>
              </ul>

              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<DashboardOutlined />}
                  onClick={() => navigate('/dashboard')}
                  className="success-cta-primary isv-shine"
                  style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
                >
                  View dashboard <ArrowRightOutlined />
                </Button>
                <Button
                  size="large"
                  icon={<ShopOutlined />}
                  onClick={() => navigate('/shop')}
                  style={{ flex: 1 }}
                >
                  Continue shopping
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <Title level={2} className="isv-anim-fade-down">
        <ShoppingCartOutlined /> <span className="isv-gradient-text">Your Shopping Cart</span>
      </Title>

      {items.length === 0 ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty
            description="Your cart is empty."
            style={{ padding: 24 }}
          >
            <Link to="/shop">
              <Button type="primary" icon={<ShopOutlined />}>Browse the store</Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            {items.map((it, idx) => (
              <Card
                key={it.id}
                className="cart-item isv-stagger"
                style={{ ['--i' as any]: idx }}
                bodyStyle={{ padding: 12 }}
              >
                <Row gutter={12} align="middle" wrap={false}>
                  <Col flex="80px">
                    <div
                      className="cart-thumb"
                      style={{ background: it.gradient || 'linear-gradient(135deg,#a18cd1,#fbc2eb)' }}
                    >
                      {it.image_url && (
                        <img
                          className="cart-thumb-img"
                          src={it.image_url}
                          alt={it.name}
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (!img.dataset.fb) {
                              img.dataset.fb = '1';
                              img.src = `https://picsum.photos/seed/${encodeURIComponent(it.sku)}/200/200`;
                            } else {
                              img.style.display = 'none';
                            }
                          }}
                        />
                      )}
                      <span className="cart-thumb-emoji">{it.emoji || '✨'}</span>
                    </div>
                  </Col>
                  <Col flex="auto" style={{ minWidth: 0 }}>
                    <Title level={5} style={{ margin: 0 }}>{it.name}</Title>
                    <Paragraph ellipsis={{ rows: 1 }} style={{ color: '#666', marginBottom: 4 }}>
                      {it.description}
                    </Paragraph>
                    <Tag color="purple">{it.category}</Tag>
                    {it.credits > 0 && <Tag color="magenta">+{it.credits} credits</Tag>}
                  </Col>
                  <Col flex="140px" style={{ textAlign: 'right' }}>
                    <div style={{ color: '#722ed1', fontWeight: 700, fontSize: 18 }}>
                      ${(it.price * it.quantity).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      ${it.price.toFixed(2)} each
                    </div>
                  </Col>
                  <Col flex="none">
                    <InputNumber
                      min={1}
                      max={99}
                      value={it.quantity}
                      onChange={(v) => updateQty(it, Number(v) || 1)}
                    />
                  </Col>
                  <Col flex="none">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(it)}
                    />
                  </Col>
                </Row>
              </Card>
            ))}
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Button onClick={clearAll} danger>Clear cart</Button>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <Spotlight color="rgba(146,84,222,0.18)">
            <Card className="cart-summary isv-anim-fade-up" style={{ animationDelay: '120ms' }}>
              <Title level={4}>Order Summary</Title>
              <Row justify="space-between">
                <Text>Items ({items.reduce((s, i) => s + i.quantity, 0)})</Text>
                <Text>${subtotal.toFixed(2)}</Text>
              </Row>
              <Row justify="space-between">
                <Text>Tax</Text>
                <Text>$0.00</Text>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Row justify="space-between">
                <Text strong>Total</Text>
                <Text strong style={{ color: '#722ed1', fontSize: 20 }}>
                  ${subtotal.toFixed(2)}
                </Text>
              </Row>
              <Magnetic strength={10} range={120}>
                <Button
                  type="primary"
                  block
                  size="large"
                  style={{ marginTop: 16, position: 'relative', overflow: 'hidden' }}
                  icon={<CreditCardOutlined />}
                  onClick={() => setCheckoutOpen(true)}
                  className="isv-shine cart-checkout-btn"
                >
                  Checkout
                </Button>
              </Magnetic>
              <Paragraph style={{ color: '#999', fontSize: 12, marginTop: 12 }}>
                Demo mode: no real charge is made. On checkout we simulate a successful payment
                and credit your account.
              </Paragraph>
            </Card>
            </Spotlight>
          </Col>
        </Row>
      )}

      <Modal
        title="Choose a payment method"
        open={checkoutOpen}
        onCancel={() => setCheckoutOpen(false)}
        onOk={checkout}
        confirmLoading={checking}
        okText={`Pay $${subtotal.toFixed(2)}`}
      >
        <Radio.Group
          value={payMethod}
          onChange={(e) => setPayMethod(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <Radio value="mock">Simulated payment (recommended for demo)</Radio>
          <Radio value="card">Credit card (Visa / MC / UnionPay)</Radio>
          <Radio value="paypal">PayPal</Radio>
        </Radio.Group>
      </Modal>
    </div>
  );
}
