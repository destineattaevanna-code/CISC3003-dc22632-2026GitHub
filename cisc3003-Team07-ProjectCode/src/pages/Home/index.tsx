import React, {useEffect, useState} from "react";
import { useNavigate  } from 'react-router-dom';
import { App, Row, Col, Spin, Typography, Button, Card, Image, Steps, Carousel, message, Tabs, Tag, Space } from "antd";
import { ArrowRightOutlined, TeamOutlined, ShopOutlined, ThunderboltFilled, BulbOutlined, RocketOutlined, FileSearchOutlined } from "@ant-design/icons";
import { Link } from 'react-router-dom';

import CheckLogin from "../../components/CheckLogin";
import ParallaxHero from "../../components/ParallaxHero";
import Tilt3D from "../../components/Tilt3D";
import Magnetic from "../../components/Effects/Magnetic";
import Reveal from "../../components/Effects/Reveal";
import Typewriter from "../../components/Effects/Typewriter";
import ParticlesBackground from "../../components/Effects/ParticlesBackground";
import BentoGrid from "../../components/Effects/BentoGrid";
import Marquee from "../../components/Effects/Marquee";
import MeshBackground from "../../components/Effects/MeshBackground";
import WordSphere from "../../components/Effects/WordSphere";
import LayeredTitle from "../../components/Effects/LayeredTitle";
import "./home.css"

const { Title, Paragraph } = Typography;

function HomePage() {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);
    const [isTablet, setIsTablet] = useState(window.innerWidth <= 768);

    const tabList = [
        {
          label: <div>
              <Row justify="start">
                  <Col span={24} className="tab-col">
                      <Title level={4} style={{fontSize: '20px'}}>
                          <span role="img" aria-label="preferences" style={{marginRight: 8}}>⚙️</span>
                          Smart Preference Setup
                      </Title>
                  </Col>
                  <Col span={24} className="tab-col">
                      <Title className="tab-descrip" level={5}>
                          Tell us your research interests just once - we'll remember your field, favorite topics,
                          and reading style to deliver perfectly tailored recommendations.
                      </Title>
                  </Col>
              </Row>
          </div>,
          children: <div><img className="feature-image" src="./feature-1.png" alt="Set your literature preferences" /></div>,
        },
        {
          label: <div>
              <Row justify="start">
                  <Col span={24} className="tab-col">
                      <Title level={4} style={{fontSize: '20px'}}>
                          <span role="img" aria-label="search" style={{marginRight: 8}}>🔍</span>
                          Intelligent Paper Discovery
                      </Title>
                  </Col>
                  <Col span={24} className="tab-col">
                      <Title className="tab-descrip" level={5}>
                          Get daily handpicked research papers that match your exact needs - no more idea collisions
                          or wasted hours searching. We surface what matters most to your work.
                      </Title>
                  </Col>
              </Row>
          </div>,
          children: <div><img className="feature-image" src="feature-2.png" alt="Precision scraping of topic-specific academic literature" /></div>,
        },
        {
          label: <div>
              <Row justify="start">
                  <Col span={24} className="tab-col">
                      <Title level={4} style={{fontSize: '20px'}}>
                          <span role="img" aria-label="chat" style={{marginRight: 8}}>💬</span>
                          Instant Paper Insights
                      </Title>
                  </Col>
                  <Col span={24} className="tab-col">
                      <Title className="tab-descrip" level={5}>
                          Digest papers in minutes with AI-powered summaries tailored to your interests.
                          Ask questions about any paper and get immediate, intelligent answers.
                      </Title>
                  </Col>
              </Row>
          </div>,
          children: <div><img className="feature-image" src="feature-3.png" alt="Read quickly, question flexibly" /></div>,
        }
    ]

    const CarouselTabList = [
        {
          label: <div>
              <Row justify="start" style={{padding: '0 15px', margin: '0 10px'}}>
                  <Col span={24} className="tab-col">
                      <Title level={4}>
                          <span role="img" aria-label="preferences" style={{marginRight: 8}}>⚙️</span>
                          Smart Preference Setup
                      </Title>
                  </Col>
                  <Col span={24} className="tab-col">
                      <Title level={5}>Set your research field, topics, and reading habits. AI Assistant learns your preferences to deliver personalized recommendations.</Title>
                  </Col>
              </Row>
          </div>,
          children: <div><img className="feature-image" src="./feature-1.png" alt="Set your literature preferences" style={{width: '100%'}} /></div>,
        },
        {
          label: <div>
              <Row justify="start" style={{padding: '0 15px', margin: '0 10px'}}>
                  <Col span={24} className="tab-col">
                      <Title level={4}>
                          <span role="img" aria-label="search" style={{marginRight: 8}}>🔍</span>
                          Intelligent Paper Discovery
                      </Title>
                  </Col>
                  <Col span={24} className="tab-col">
                      <Title level={5}>Daily curated research papers to avoid idea clashes, saving you time on literature search and reading, significantly boosting your research efficiency.</Title>
                  </Col>
              </Row>
          </div>,
          children: <div><img className="feature-image" src="feature-2.png" alt="Precision scraping of topic-specific academic literature" style={{width: '100%'}} /></div>,
        },
        {
          label: <div>
              <Row justify="start" style={{padding: '0 15px', margin: '0 10px'}}>
                  <Col span={24} className="tab-col">
                      <Title level={4}>
                          <span role="img" aria-label="chat" style={{marginRight: 8}}>💬</span>
                          Instant Paper Insights
                      </Title>
                  </Col>
                  <Col span={24} className="tab-col">
                      <Title level={5}>AI Assistant summarizes content based on your preferences for faster reading. Ask about any paper content—get instant answers.</Title>
                  </Col>
              </Row>
          </div>,
          children: <div><img className="feature-image" src="feature-3.png" alt="Read quickly, question flexibly" style={{width: '100%'}} /></div>,
        }
    ];

    function handleClick() {
        const LoginStatus = CheckLogin();
        if (LoginStatus) {
            // 用户已登录
            navigate("/paper");
            } else {
        // 用户未登录，跳转到登录页面
        navigate('/login');
        }
    }


    useEffect(() => {
        window.scrollTo(0, 0);
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 576);
            setIsTablet(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <App>
            <div className="container">
            <ParallaxHero
                className="hero-section isv-cursor-light"
                maxTilt={5}
                background={
                    <>
                        <div className="hero-gradient"></div>
                        <div className="parallax-blob" style={{ width: 480, height: 480, top: -120, left: -160, background: 'radial-gradient(circle at 30% 30%, #d3adf7, transparent 60%)' }} />
                        <div className="parallax-blob" style={{ width: 460, height: 460, bottom: -120, right: -140, background: 'radial-gradient(circle at 70% 30%, #ffd6e7, transparent 60%)', animationDirection: 'reverse' }} />
                        <ParticlesBackground density={0.07} />
                    </>
                }
                floats={isMobile ? [] : [
                    {
                        key: 'tag-ai',
                        left: '6%', top: '18%', depth: 0.55, z: 60, rotate: -6,
                        content: (
                            <div className="parallax-card">
                                <span className="parallax-card-emoji">🧠</span>
                                <div className="parallax-card-meta">
                                    AI Summary
                                    <small>3 papers · just now</small>
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'tag-cite',
                        right: '6%', top: '14%', depth: 0.7, z: 80, rotate: 4,
                        content: (
                            <div className="parallax-card">
                                <span className="parallax-card-emoji" style={{ background: 'linear-gradient(135deg,#fa709a,#fee140)' }}>📄</span>
                                <div className="parallax-card-meta">
                                    1,284 Citations
                                    <small>tracked this week</small>
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'tag-credit',
                        left: '8%', bottom: '18%', depth: 0.45, z: 50, rotate: 5,
                        content: (
                            <div className="parallax-card">
                                <span className="parallax-card-emoji" style={{ background: 'linear-gradient(135deg,#43cea2,#185a9d)' }}>
                                    <ThunderboltFilled />
                                </span>
                                <div className="parallax-card-meta">
                                    +320 Credits
                                    <small>after Team 07 boost</small>
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'tag-spark',
                        right: '10%', bottom: '22%', depth: 0.6, z: 65, rotate: -3,
                        content: (
                            <div className="parallax-card">
                                <span className="parallax-card-emoji" style={{ background: 'linear-gradient(135deg,#4facfe,#00f2fe)' }}>✨</span>
                                <div className="parallax-card-meta">
                                    Idea Graph
                                    <small>linked 14 nodes</small>
                                </div>
                            </div>
                        ),
                    },
                ]}
            >
                <Row justify="center" className="row" style={{ position: 'relative', zIndex: 5 }}>
                    <Col span={24} className="tilt-pop-3" style={{ transform: 'translateZ(40px)', textAlign: 'center' }}>
                        <LayeredTitle
                            words={['Your', 'AI', 'Research', 'Supervisor']}
                            fontSize={isMobile ? 30 : 60}
                            maxZ={isMobile ? 20 : 70}
                            className="home-title-3d"
                        />
                        <Paragraph id="home-subtitle" className="isv-anim-fade-up" style={{animationDelay: '120ms', fontSize: isMobile ? '16px' : '28px', fontWeight: 400, color: 'rgb(45, 45, 45)', marginTop: '10px', textAlign: 'center', minHeight: isMobile ? 26 : 42}}>
                            <Typewriter
                                words={[
                                    "From arXiv to publication-ready drafts.",
                                    "Track papers. Summarise faster. Cite smarter.",
                                    "Your AI co-pilot for every research step.",
                                ]}
                                typeSpeed={55}
                                eraseSpeed={28}
                                pause={1800}
                            />
                        </Paragraph>
                    </Col>
                    <Col span={24} className="isv-anim-fade-up" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '30px', animationDelay: '240ms', transform: 'translateZ(60px)', gap: 12, flexWrap: 'wrap'}}>
                        <Magnetic strength={18} range={120}>
                            <Button onClick={handleClick} type="primary" size='large' id="home-buttom" className="isv-shine" style={{position: 'relative', overflow: 'hidden'}}>
                                Get Started <ArrowRightOutlined />
                            </Button>
                        </Magnetic>
                        <Magnetic strength={12} range={100}>
                            <Button size='large' onClick={() => navigate('/team')} style={{height: 60, padding: '20px 30px', borderRadius: 100, fontSize: 18, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderColor: '#d3adf7'}}>
                                <TeamOutlined /> Meet Team 07
                            </Button>
                        </Magnetic>
                    </Col>
                    {!isMobile && (
                        <Col span={24} style={{ display: 'flex', justifyContent: 'center', marginTop: 18, gap: 16, color: '#9254de', fontSize: 13, transform: 'translateZ(20px)' }} className="isv-anim-fade-up">
                            <span><BulbOutlined /> Move your mouse · Press <kbd style={{background:'#fff', padding:'1px 6px', borderRadius:4, border:'1px solid #d3adf7', color:'#722ed1'}}>Ctrl K</kbd> to jump anywhere</span>
                        </Col>
                    )}
                    <Col xs={24} style={{ display: 'flex', justifyContent: 'center', marginTop: 18, transform: 'translateZ(15px)', padding: '0 16px' }} className="isv-anim-fade-up">
                        <div className="isv-reviewer-chip isv-halo">
                            <span className="isv-reviewer-chip-tag">Demo</span>
                            <span className="isv-reviewer-chip-text">
                                <code>professor@um.edu.mo</code>
                                <span className="isv-reviewer-chip-sep">·</span>
                                <code>demo1234</code>
                                <span className="isv-reviewer-chip-sep">·</span>
                                redeem <code>TEAM07-ABC</code> for +100 credits
                            </span>
                        </div>
                    </Col>
                </Row>
            </ParallaxHero>

            {/* Brand stats marquee */}
            <Reveal as="section" y={20} className="home-marquee-wrap">
                <Marquee
                    duration={30}
                    items={[
                        <><span>🌐</span> Built for CISC3003 Team 07</>,
                        <><span className="marquee-dot" /> 15 Products in store</>,
                        <><span>⚡</span> Real-time AI summaries</>,
                        <><span className="marquee-dot" /> Email signup · Password reset · Cart · Orders</>,
                        <><span>🎓</span> University of Macau</>,
                        <><span className="marquee-dot" /> 6 Members · 3 Pairs</>,
                        <><span>✨</span> Press <code>Ctrl K</code> to navigate</>,
                        <><span className="marquee-dot" /> Try the Konami code: ↑↑↓↓←→←→BA</>,
                    ]}
                />
            </Reveal>

            {/* === Drag-to-rotate 3D Word Sphere === */}
            <Reveal as="section" y={40} className="home-sphere-section">
                <Row align="middle" gutter={[24, 24]}>
                    <Col xs={24} md={11} style={{ textAlign: 'center' }}>
                        <Tag color="purple" style={{ padding: '4px 12px' }}>Drag me · 3D</Tag>
                        <Title level={2} style={{ marginTop: 8 }}>
                            Every keyword <span className="isv-gradient-text">spinning around you</span>
                        </Title>
                        <Paragraph style={{ color: '#666', fontSize: 16, maxWidth: 460, margin: '8px auto 0' }}>
                            Press &amp; drag the sphere to spin it freely. Release to keep its momentum.
                            Click any word to jump to a related page. The whole thing is pure DOM + CSS 3D.
                        </Paragraph>
                        <Paragraph style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
                            👆 Try grabbing it · auto-rotates when idle
                        </Paragraph>
                    </Col>
                    <Col xs={24} md={13} style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                        <WordSphere
                            size={isMobile ? 320 : 460}
                            radius={isMobile ? 130 : 200}
                            autoSpin={6}
                            words={[
                                { text: 'iSuperviz', color: '#fa8c16', href: '#' },
                                { text: 'AI Summary', href: '#' },
                                { text: 'Research', href: '#' },
                                { text: 'Papers', href: '#' },
                                { text: 'arXiv', href: '#' },
                                { text: 'Insights' },
                                { text: 'Idea Graph' },
                                { text: 'Hallucination' },
                                { text: 'Reflective Notes' },
                                { text: 'Citations' },
                                { text: 'CISC3003' },
                                { text: 'Team 07' },
                                { text: 'Macau' },
                                { text: 'University' },
                                { text: 'Credits' },
                                { text: 'Plus Plan' },
                                { text: 'Cart' },
                                { text: 'Shop' },
                                { text: 'Dashboard' },
                                { text: 'Sign Up' },
                                { text: 'NeurIPS' },
                                { text: 'ICLR' },
                                { text: 'ACL' },
                                { text: 'CVPR' },
                                { text: 'LLM' },
                                { text: 'RAG' },
                                { text: 'Multi-Agent' },
                                { text: 'Vision' },
                                { text: 'Robotics' },
                                { text: 'Theory' },
                                { text: 'Benchmark' },
                                { text: 'Notebook' },
                                { text: 'Open Access' },
                                { text: 'Markdown' },
                                { text: 'BibTeX' },
                                { text: '✨' },
                                { text: '📚' },
                                { text: '🧠' },
                                { text: '⚡' },
                                { text: '🚀' },
                            ]}
                        />
                    </Col>
                </Row>
            </Reveal>

            {/* Bento feature grid */}
            <Reveal as="section" y={40} className="home-bento-section">
                <div style={{ position: 'relative' }}>
                    <MeshBackground />
                    <div style={{ position: 'relative', textAlign: 'center', padding: '36px 16px 8px', zIndex: 2 }}>
                        <Tag color="purple" style={{ padding: '4px 12px', marginBottom: 8 }}>Why iSuperviz</Tag>
                        <Title level={2} style={{ margin: 0 }}>
                            <span className="isv-gradient-text">An entire research workflow, redesigned.</span>
                        </Title>
                        <Paragraph style={{ color: '#666', fontSize: 16, marginTop: 8 }}>
                            Track papers, generate insights, and ship literature reviews — without leaving your browser.
                        </Paragraph>
                    </div>
                    <BentoGrid
                        cards={[
                            {
                                key: 'preferences',
                                title: 'Smart Preference Setup',
                                description: 'Tell us your fields & topics once. We curate everything to match.',
                                emoji: '⚙️',
                                gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                                span: 1,
                                decoration: <span className="bento-chip">Saves ~3h / week</span>,
                            },
                            {
                                key: 'discovery',
                                title: 'Intelligent Paper Discovery',
                                description: 'Daily handpicked arXiv papers tailored to your interests — no noise.',
                                emoji: '🔍',
                                gradient: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)',
                                span: 2,
                                decoration: (
                                    <>
                                        <div className="bento-stat">+1,284</div>
                                        <span className="bento-chip">papers tracked this week</span>
                                    </>
                                ),
                            },
                            {
                                key: 'insights',
                                title: 'Instant Paper Insights',
                                description: 'Multi-language summaries answering YOUR questions, not generic abstracts.',
                                emoji: '💬',
                                gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                                span: 2,
                                decoration: (
                                    <>
                                        <span className="bento-chip">8 languages</span>
                                        <span className="bento-chip">Custom prompts</span>
                                        <span className="bento-chip">Cite-ready</span>
                                    </>
                                ),
                            },
                            {
                                key: 'graph',
                                title: 'Idea Graph',
                                description: 'Visualise the conceptual links between papers and your own notes.',
                                emoji: '🧠',
                                gradient: 'linear-gradient(135deg, #fa8c16 0%, #d4380d 100%)',
                                span: 1,
                                decoration: <span className="bento-chip">14 saved nodes</span>,
                            },
                            {
                                key: 'ecommerce',
                                title: 'Built-in Research Store',
                                description: 'Top up credits, upgrade plans or buy curated literature packs — checkout in seconds.',
                                emoji: '🛒',
                                gradient: 'linear-gradient(135deg, #13c2c2 0%, #006d75 100%)',
                                span: 2,
                                decoration: (
                                    <>
                                        <span className="bento-chip">15 SKUs</span>
                                        <span className="bento-chip">Cart + orders</span>
                                        <span className="bento-chip">Mock checkout</span>
                                    </>
                                ),
                            },
                            {
                                key: 'team',
                                title: 'CISC3003 Team 07',
                                description: 'Six students. Three pairs. One full-stack web app you can deploy today.',
                                emoji: '🤝',
                                gradient: 'linear-gradient(135deg, #722ed1 0%, #eb2f96 60%, #fa8c16 100%)',
                                span: 1,
                                decoration: <span className="bento-chip">University of Macau</span>,
                            },
                        ]}
                    />
                </div>
            </Reveal>

            <Reveal as="section" y={50} className="home-team-strip" delay={120}>
                <Row justify="center" align="middle" gutter={[16, 24]}>
                    <Col xs={24} md={10}>
                        <Tag color="purple" style={{ padding: '4px 12px' }}>
                            <TeamOutlined /> CISC3003 Team 07
                        </Tag>
                        <Title level={2} style={{ marginTop: 10 }}>
                            Built by 6 students, reviewed by you.
                        </Title>
                        <Paragraph style={{ fontSize: 16, color: '#555' }}>
                            iSuperviz is our CISC3003 team project — a full-stack web application with
                            responsive UI, verified email sign-up, password reset, a research dashboard,
                            and a credit-based shopping cart.
                        </Paragraph>
                        <Space wrap>
                            <Link to="/team"><Button type="primary" icon={<TeamOutlined />}>Meet the team</Button></Link>
                            <Link to="/shop"><Button icon={<ShopOutlined />}>Visit the store</Button></Link>
                        </Space>
                    </Col>
                    <Col xs={24} md={12}>
                        <Row gutter={[10, 10]}>
                            {[
                                { pair: 'Pair 08', name: 'Yang Xu (Leader)', id: 'DC328669', c: '#722ed1',
                                  indiv: 'https://elsayx.github.io/CISC3003-dc328669-2026GitHub/CISC3003-IndAssgn-dc328669/public/cisc3003-IndAssgn-dc328669.html',
                                  pairUrl: 'https://elsayx.github.io/CISC3003-dc328669-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html' },
                                { pair: 'Pair 08', name: 'Jiang Xingyu', id: 'DC328023', c: '#722ed1',
                                  indiv: 'https://bishoujodaisuki.github.io/CISC3003-dc328023-2026GitHub/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html',
                                  pairUrl: 'https://bishoujodaisuki.github.io/CISC3003-dc328023-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html' },
                                { pair: 'Pair 12', name: 'HUANG SOFIA', id: 'DC326312', c: '#eb2f96',
                                  indiv: 'https://sofia74077.github.io/CISC3003-IndAssgn-2026MAR01/',
                                  pairUrl: 'https://sofia74077.github.io/CISC3003-DC326312-2026GitHub/CISC3003-PairAssgn-2026APR02/public/index.html' },
                                { pair: 'Pair 12', name: 'FAN ZOU CHEN', id: 'DC326351', c: '#eb2f96',
                                  indiv: 'https://emilyum.github.io/Hello-World/cisc3003-IndAssgn-2026MAR01/cisc3003-IndAssgn.html',
                                  pairUrl: 'https://sofia74077.github.io/CISC3003-DC326312-2026GitHub/CISC3003-PairAssgn-2026APR02/public/index.html' },
                                { pair: 'Pair 04', name: 'SI TIN IEK', id: 'DC227126', c: '#13c2c2',
                                  indiv: 'https://useriiiis.github.io/CISC3003-dc227126-2026GitHub/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html',
                                  pairUrl: 'https://useriiiis.github.io/CISC3003-dc227126-2026GitHub/CISC3003-PairAssgn-2026APR02/public/cisc3003-PairAssgn.html' },
                                { pair: 'Pair 04', name: 'MA IAT TIM', id: 'DC226328', c: '#13c2c2',
                                  indiv: 'https://qiyao33.github.io/CISC3003-2026-github1/CISC3003-IndAssgn-2026MAR01/CISC3003-IndAssgn-2026MAR01/public/cisc3003-IndAssgn-home.html',
                                  pairUrl: 'https://qiyao33.github.io/CISC3003-2026-github1/CISC3003-PairAssgn-2026APR02/cisc3003-PairAssgn.html' },
                            ].map((m, i) => (
                                <Col xs={12} key={m.id}>
                                    <div className="isv-stagger" style={{ ['--i' as any]: i }}>
                                        <Card
                                          size="small"
                                          className="home-member-card"
                                          hoverable
                                          onClick={() => window.open(m.indiv, '_blank', 'noopener')}
                                          style={{ borderLeft: `4px solid ${m.c}`, borderRadius: 10, cursor: 'pointer' }}
                                        >
                                            <div style={{ fontWeight: 700 }}>{m.name}</div>
                                            <div style={{ color: '#888', fontSize: 12, fontFamily: 'monospace' }}>
                                                {m.id} · {m.pair}
                                            </div>
                                            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                <a
                                                  onClick={(e) => e.stopPropagation()}
                                                  href={m.indiv}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  style={{ fontSize: 11, color: m.c, textDecoration: 'underline' }}
                                                >
                                                  Individual
                                                </a>
                                                <a
                                                  onClick={(e) => e.stopPropagation()}
                                                  href={m.pairUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  style={{ fontSize: 11, color: m.c, textDecoration: 'underline' }}
                                                >
                                                  Pair
                                                </a>
                                            </div>
                                        </Card>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Col>
                </Row>
            </Reveal>
        </div>
        </App>
    )
}

export default HomePage;
