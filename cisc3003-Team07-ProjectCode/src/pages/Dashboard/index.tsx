import React, { useEffect, useRef, useState } from 'react';
import {
  Tabs, Card, Row, Col, Typography, Avatar, Tag, Table, Button, message,
  Empty, Spin, Input, Descriptions, Badge
} from 'antd';
import {
  UserOutlined, HistoryOutlined, ShoppingCartOutlined, ShoppingOutlined,
  ReloadOutlined, DeleteOutlined, HeartOutlined, SearchOutlined
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PubSub from 'pubsub-js';

import CheckLogin from '../../components/CheckLogin';
import SlotNumber from '../../components/Effects/SlotNumber';
import './dashboard.css';

const { Title, Paragraph, Text } = Typography;

function AnimatedNumber({ value, duration = 800, prefix = '', suffix = '' }: { value: number; duration?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const isInt = Number.isInteger(value);
  return <>{prefix}{isInt ? Math.round(display) : display.toFixed(2)}{suffix}</>;
}

interface SearchRecord {
  id: number;
  keyword: string;
  result_count: number;
  created_at: string;
}
interface Order {
  id: number;
  order_no: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  items: Array<{ name: string; price: number; quantity: number; credits?: number }>;
}
interface CartItem {
  id: number;
  quantity: number;
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  credits: number;
  category: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<SearchRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<{ items: CartItem[]; subtotal: number }>({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchKw, setSearchKw] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const getEmail = (): string | null => {
    const raw = localStorage.getItem('loginInfo');
    if (!raw) return null;
    try { return JSON.parse(raw).email || null; } catch { return null; }
  };

  const loadAll = async () => {
    const email = getEmail();
    if (!email) return;
    setLoading(true);
    try {
      const [hRes, oRes, cRes] = await Promise.all([
        axios.get('/api/search_history', { params: { email } }),
        axios.get('/api/orders', { params: { email } }),
        axios.get('/api/cart', { params: { email } }),
      ]);
      if (hRes.data.status === 200) setHistory(hRes.data.history || []);
      if (oRes.data.status === 200) setOrders(oRes.data.orders || []);
      if (cRes.data.status === 200) setCart({ items: cRes.data.items || [], subtotal: cRes.data.subtotal || 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!CheckLogin()) {
      navigate('/login');
      return;
    }
    const raw = localStorage.getItem('loginInfo');
    if (raw) {
      try { setProfile(JSON.parse(raw)); } catch {}
    }
    loadAll();
  }, []); // eslint-disable-line

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab && ['overview', 'search', 'cart', 'orders'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const runSearch = async () => {
    const email = getEmail();
    if (!email || !searchKw.trim()) return;
    setSearching(true);
    try {
      const res = await axios.post('/api/search', { email, keyword: searchKw.trim() });
      if (res.data.status === 200) {
        message.success(`Found ${res.data.results?.length || 0} matching products in the store.`);
        loadAll();
      }
    } finally {
      setSearching(false);
    }
  };

  const deleteHistory = async (id: number) => {
    const email = getEmail();
    if (!email) return;
    await axios.delete(`/api/search_history/${id}`, { params: { email } });
    loadAll();
  };

  const clearHistory = async () => {
    const email = getEmail();
    if (!email) return;
    await axios.post('/api/search_history/clear', { email });
    loadAll();
  };

  const tabs: any[] = [
    {
      key: 'overview',
      label: <span><UserOutlined /> Overview</span>,
      children: (
        <div>
          {profile && (
            <Card className="dash-card">
              <Row gutter={16} align="middle" wrap>
                <Col>
                  <Avatar size={72} src={profile.avatarUrl} icon={<UserOutlined />} />
                </Col>
                <Col flex="auto">
                  <Title level={3} style={{ margin: 0 }}>
                    {profile.nickName || profile.email}
                  </Title>
                  <Paragraph style={{ marginBottom: 4, color: '#666' }}>{profile.email}</Paragraph>
                  <Tag color={profile.pro === 2 ? 'gold' : 'purple'}>
                    {profile.pro === 2 ? 'Plus Member' : profile.pro === 1 ? 'Free Plan' : 'Expired'}
                  </Tag>
                  {profile.memberExpiredDate && (
                    <Tag color="blue">Expires {profile.memberExpiredDate}</Tag>
                  )}
                </Col>
                <Col>
                  <div className="dash-credit-box">
                    <div style={{ fontSize: 12, color: '#888' }}>Credits</div>
                    <div className="dash-credit">
                      <SlotNumber value={profile.credit ?? 0} />
                    </div>
                    <Button type="link" onClick={() => navigate('/shop')}>Top up →</Button>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={8}>
              <div className="isv-stagger" style={{ ['--i' as any]: 0 }}>
                <Card className="dash-card stat-card" onClick={() => navigate('/dashboard?tab=search')}>
                  <div className="stat-label"><HistoryOutlined /> Search History</div>
                  <div className="stat-value"><AnimatedNumber value={history.length} /></div>
                  <Text type="secondary">Past searches recorded</Text>
                </Card>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="isv-stagger" style={{ ['--i' as any]: 1 }}>
                <Card className="dash-card stat-card" onClick={() => navigate('/cart')}>
                  <div className="stat-label"><ShoppingCartOutlined /> Cart Items</div>
                  <div className="stat-value">
                    <AnimatedNumber value={cart.items.reduce((s, i) => s + i.quantity, 0)} />
                  </div>
                  <Text type="secondary">
                    Subtotal <AnimatedNumber value={cart.subtotal} prefix="$" />
                  </Text>
                </Card>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="isv-stagger" style={{ ['--i' as any]: 2 }}>
                <Card className="dash-card stat-card" onClick={() => navigate('/dashboard?tab=orders')}>
                  <div className="stat-label"><ShoppingOutlined /> Orders</div>
                  <div className="stat-value"><AnimatedNumber value={orders.length} /></div>
                  <Text type="secondary">
                    Total spent <AnimatedNumber value={orders.reduce((s, o) => s + o.total, 0)} prefix="$" />
                  </Text>
                </Card>
              </div>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'search',
      label: <span><HistoryOutlined /> Search &amp; History</span>,
      children: (
        <div>
          <Card className="dash-card" style={{ marginBottom: 12 }}>
            <Row gutter={8} align="middle">
              <Col flex="auto">
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Search products, plans, reports…"
                  value={searchKw}
                  onChange={(e) => setSearchKw(e.target.value)}
                  onPressEnter={runSearch}
                  size="large"
                />
              </Col>
              <Col>
                <Button type="primary" size="large" loading={searching} onClick={runSearch}>
                  Search
                </Button>
              </Col>
            </Row>
          </Card>

          <Card
            className="dash-card"
            title="Recent searches"
            extra={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button icon={<ReloadOutlined />} onClick={loadAll} />
                {history.length > 0 && (
                  <Button danger onClick={clearHistory}>Clear all</Button>
                )}
              </div>
            }
          >
            {history.length === 0 ? (
              <Empty description="No search history yet." />
            ) : (
              <Table
                rowKey="id"
                pagination={{ pageSize: 10 }}
                dataSource={history}
                columns={[
                  { title: 'Keyword', dataIndex: 'keyword' },
                  { title: 'Results', dataIndex: 'result_count', width: 100 },
                  { title: 'When', dataIndex: 'created_at', width: 200 },
                  {
                    title: '',
                    width: 60,
                    render: (_, r) => (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteHistory(r.id)}
                      />
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'cart',
      label: (
        <span>
          <ShoppingCartOutlined /> Cart{' '}
          {cart.items.length > 0 && <Badge count={cart.items.length} />}
        </span>
      ),
      children: (
        <Card className="dash-card">
          {cart.items.length === 0 ? (
            <Empty description="Your cart is empty.">
              <Link to="/shop"><Button type="primary">Go shopping</Button></Link>
            </Empty>
          ) : (
            <>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={cart.items}
                columns={[
                  { title: 'Product', dataIndex: 'name' },
                  { title: 'Qty', dataIndex: 'quantity', width: 80 },
                  {
                    title: 'Subtotal',
                    width: 120,
                    render: (_, r) => `$${(r.price * r.quantity).toFixed(2)}`,
                  },
                ]}
              />
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <Text strong style={{ fontSize: 18, marginRight: 16 }}>
                  Subtotal: ${cart.subtotal.toFixed(2)}
                </Text>
                <Link to="/cart"><Button type="primary">Open cart →</Button></Link>
              </div>
            </>
          )}
        </Card>
      ),
    },
    {
      key: 'orders',
      label: <span><ShoppingOutlined /> Orders &amp; History</span>,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card className="dash-card" title="Orders">
              {orders.length === 0 ? (
                <Empty description="No orders yet." />
              ) : (
                <Table
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  dataSource={orders}
                  expandable={{
                    expandedRowRender: (order) => (
                      <Descriptions size="small" column={1} bordered>
                        {order.items.map((it, i) => (
                          <Descriptions.Item key={i} label={`${it.name} × ${it.quantity}`}>
                            ${(it.price * it.quantity).toFixed(2)}
                            {it.credits ? ` · +${it.credits * it.quantity} credits` : ''}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    ),
                  }}
                  columns={[
                    { title: 'Order #', dataIndex: 'order_no' },
                    { title: 'Date', dataIndex: 'created_at', width: 180 },
                    {
                      title: 'Total',
                      dataIndex: 'total',
                      width: 120,
                      render: (v: number) => `$${v.toFixed(2)}`,
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      width: 110,
                      render: (s: string) => (
                        <Tag color={s === 'paid' ? 'success' : 'default'}>{s.toUpperCase()}</Tag>
                      ),
                    },
                    { title: 'Payment', dataIndex: 'payment_method', width: 110 },
                  ]}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card
              className="dash-card"
              title="History"
              extra={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button icon={<ReloadOutlined />} onClick={loadAll} />
                  {history.length > 0 && (
                    <Button danger onClick={clearHistory}>Clear all</Button>
                  )}
                </div>
              }
            >
              {history.length === 0 ? (
                <Empty description="No search or credit history yet." />
              ) : (
                <Table
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  dataSource={history}
                  columns={[
                    { title: 'Activity', dataIndex: 'keyword' },
                    { title: 'When', dataIndex: 'created_at', width: 180 },
                    {
                      title: '',
                      width: 56,
                      render: (_, r) => (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => deleteHistory(r.id)}
                        />
                      ),
                    },
                  ]}
                />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  if (loading) {
    return (
      <Row justify="center" align="middle" style={{ minHeight: '50vh' }}>
        <Spin size="large" />
      </Row>
    );
  }

  return (
    <div className="dashboard-page">
      <Title level={2} style={{ marginBottom: 4 }}>My Dashboard</Title>
      <Paragraph style={{ color: '#666' }}>
        Manage your searches, cart, orders and account in one place.
      </Paragraph>
      <Tabs
        items={tabs}
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          navigate(`/dashboard?tab=${key}`, { replace: true });
        }}
      />
    </div>
  );
}
