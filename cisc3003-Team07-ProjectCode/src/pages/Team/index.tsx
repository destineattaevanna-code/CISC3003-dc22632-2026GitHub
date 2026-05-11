import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Avatar, Spin, Divider, Space,
} from 'antd';
import {
  UserOutlined, TeamOutlined, MailOutlined, BookOutlined, LinkOutlined,
  HomeOutlined, ShopOutlined, GithubOutlined, CrownOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import Reveal from '../../components/Effects/Reveal';
import './team.css';

const { Title, Paragraph } = Typography;

interface Member {
  pair: string;
  role: string;
  studentId: string;
  name: string;
  nickname?: string;
  bio?: string;
  contribution?: string;
  individualUrl?: string;
  pairUrl?: string;
  accent?: string;
}

// Hard-coded team-lead identifier — the project leader's student ID.
const TEAM_LEAD_ID = 'DC328669';
interface TeamData {
  teamNumber: string;
  teamName: string;
  project: {
    title: string;
    course: string;
    term: string;
    context: string;
    goals: string[];
  };
  members: Member[];
}

const roleColor = (role: string) => (role === 'Member' ? 'purple' : 'magenta');
const pairColor = (pair: string, accent?: string) => {
  if (accent) return accent;
  if (pair.endsWith('04')) return '#13c2c2';
  if (pair.endsWith('08')) return '#722ed1';
  if (pair.endsWith('12')) return '#eb2f96';
  return '#1890ff';
};

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    axios
      .get('/api/team')
      .then((res) => {
        if (res.data && res.data.status === 200) setData(res.data.team);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Row justify="center" align="middle" style={{ minHeight: '60vh' }}>
        <Spin size="large" />
      </Row>
    );
  }
  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Title level={3}>Team information is unavailable.</Title>
      </div>
    );
  }

  return (
    <div className="team-page">
      <section className="team-hero">
        <Tag color="purple" className="isv-anim-fade-down" style={{ fontSize: 14, padding: '4px 12px' }}>
          <TeamOutlined /> {data.teamNumber}
        </Tag>
        <Title level={1} className="isv-anim-fade-up" style={{ marginTop: 12 }}>
          <span className="isv-gradient-text">{data.project.title}</span>
        </Title>
        <Paragraph style={{ fontSize: 18, color: '#555', maxWidth: 860, margin: '0 auto' }}>
          {data.project.context}
        </Paragraph>
        <Space size={8} wrap style={{ marginTop: 16 }}>
          <Tag color="geekblue"><BookOutlined /> {data.project.course}</Tag>
          <Tag color="purple">{data.project.term}</Tag>
        </Space>
      </section>

      <section className="team-goals">
        <Title level={3}>Project Goals</Title>
        <Row gutter={[16, 16]}>
          {data.project.goals.map((g, i) => (
            <Col xs={24} md={8} key={i}>
              <div className="isv-stagger" style={{ ['--i' as any]: i }}>
                <Card className="goal-card" bordered={false}>
                  <div className="goal-index">0{i + 1}</div>
                  <Paragraph style={{ marginBottom: 0 }}>{g}</Paragraph>
                </Card>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      <Divider />

      <section className="team-members">
        <Title level={3}>Meet {data.teamNumber}</Title>
        <Paragraph style={{ color: '#666' }}>
          We are three paired teams from CISC3003 joining forces to deliver a full-stack AI research
          assistant — from responsive UI to verified user accounts, e-commerce, and deployment. Click any
          card to open that member's individual &amp; pair-assignment deliverables.
        </Paragraph>

        <div className="member-card-grid">
          {data.members.map((m, i) => {
            const color = pairColor(m.pair, m.accent);
            return (
              <div className="member-card-cell" key={m.studentId}>
                <Reveal y={30} delay={i * 60}>
                  <Card
                    className="member-card"
                    hoverable
                    style={{ borderTop: `4px solid ${color}` }}
                  >
                    <Row align="middle" gutter={16} wrap={false}>
                      <Col flex="none">
                        <Avatar
                          size={64}
                          style={{ background: color, color: '#fff', fontWeight: 700 }}
                        >
                          {m.name
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Avatar>
                      </Col>
                      <Col flex="auto" style={{ minWidth: 0 }}>
                        <Title level={4} style={{ margin: 0 }}>
                          {m.name}
                        </Title>
                        <Space size={6} wrap style={{ marginTop: 4 }}>
                          <Tag color={color} style={{ color: '#fff', borderColor: color }}>
                            {m.pair}
                          </Tag>
                          <Tag color={roleColor(m.role)}>{m.role}</Tag>
                          {m.studentId === TEAM_LEAD_ID && (
                            <Tag
                              color="gold"
                              icon={<CrownOutlined />}
                              style={{ fontWeight: 700, margin: 0 }}
                            >
                              Team Lead
                            </Tag>
                          )}
                        </Space>
                        <div style={{ marginTop: 8, color: '#555', fontFamily: 'monospace' }}>
                          <UserOutlined /> {m.studentId}
                        </div>
                      </Col>
                    </Row>
                    {(m.contribution || m.bio) && (
                      <Paragraph style={{ marginTop: 12, marginBottom: 12, color: '#555', fontSize: 13, lineHeight: 1.55 }}>
                        {m.contribution || m.bio}
                      </Paragraph>
                    )}
                    <div className="member-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {m.individualUrl && (
                        <a
                          href={m.individualUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="team-link-btn team-link-btn--primary"
                          style={{ borderColor: color, color }}
                        >
                          <HomeOutlined /> Individual site
                        </a>
                      )}
                      {m.pairUrl && (
                        <a
                          href={m.pairUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="team-link-btn"
                        >
                          <ShopOutlined /> Pair site
                        </a>
                      )}
                    </div>
                  </Card>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      <Divider />

      <section className="team-footer-note">
        <Paragraph style={{ textAlign: 'center', color: '#888' }}>
          <MailOutlined /> Contact your team representative for inquiries about this project.
          <br />
          <LinkOutlined style={{ marginTop: 8 }} /> Looking for our source?{' '}
          <a href="https://github.com/elsayx" target="_blank" rel="noopener noreferrer">
            <GithubOutlined /> Team 07 on GitHub
          </a>
        </Paragraph>
      </section>
    </div>
  );
}
