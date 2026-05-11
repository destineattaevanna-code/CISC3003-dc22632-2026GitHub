import React, { useState } from 'react';
import { Row, Col, Card, Form, Input, Button, Typography, message, Result } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Paragraph } = Typography;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [donePayload, setDonePayload] = useState<{ email: string } | null>(null);

  const submit = async (values: any) => {
    const email = (values.email || '').trim();
    setLoading(true);
    try {
      // Lightweight pre-check so we can show a friendly error.
      try {
        const chk = await axios.post('/api/check_account', { email });
        if (chk.data && chk.data.status === 200 && !chk.data.exists) {
          message.error("We couldn't find an account with that email.");
          setLoading(false);
          return;
        }
      } catch { /* ignore — fall through to reset attempt */ }

      const res = await axios.post('/api/reset_password', {
        email,
        password: values.password,
      });
      if (res.data.status === 200) {
        setDonePayload({ email });
        setDone(true);
      } else {
        message.error(res.data.message || 'Failed to reset password.');
      }
    } catch {
      message.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done && donePayload) {
    return (
      <Row justify="center" align="middle" style={{ minHeight: '70vh', padding: 16 }}>
        <Col xs={24} sm={20} md={14} lg={10} xl={8}>
          <Card
            style={{ borderRadius: 16, boxShadow: '0 14px 40px rgba(114,46,209,0.10)' }}
            className="isv-anim-fade-up"
          >
            <Result
              status="success"
              title={<span className="isv-gradient-text">Password updated!</span>}
              subTitle={
                <span>
                  You can now log in to <b>{donePayload.email}</b> with your new password.
                </span>
              }
              extra={[
                <Button type="primary" key="login" onClick={() => navigate('/login')}>
                  Go to login
                </Button>,
              ]}
            />
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row justify="center" align="middle" style={{ minHeight: '70vh', padding: 16 }}>
      <Col xs={24} sm={20} md={14} lg={10} xl={8}>
        <Card
          className="isv-anim-fade-up"
          style={{ borderRadius: 16, boxShadow: '0 14px 40px rgba(114,46,209,0.10)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Link
              to="/"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <img
                src={`${process.env.PUBLIC_URL}/logo-icon.png`}
                alt="iSuperviz"
                style={{ height: 26, width: 26, objectFit: 'contain' }}
              />
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#722ed1',
                  letterSpacing: '0.5px',
                }}
              >
                iSuperviz
              </span>
            </Link>
          </div>

          <Title level={3} style={{ marginTop: 0, textAlign: 'center' }}>
            Reset your password
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#888' }}>
            Enter your registered email and pick a new password.
          </Paragraph>

          <Form layout="vertical" form={form} onFinish={submit}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please input your email.' },
                { type: 'email', message: 'Invalid email address.' },
              ]}
            >
              <Input placeholder="you@example.com" size="large" autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="password"
              label="New password"
              rules={[
                { required: true, message: 'Please input a new password.' },
                { min: 6, message: 'At least 6 characters.' },
                { max: 16, message: 'No longer than 16 characters.' },
              ]}
            >
              <Input.Password size="large" placeholder="New password (6-16 chars)" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirm"
              label="Confirm new password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('Passwords do not match.'));
                  },
                }),
              ]}
            >
              <Input.Password size="large" placeholder="Repeat new password" autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Reset password
            </Button>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link to="/login">Back to login</Link>
            </div>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
