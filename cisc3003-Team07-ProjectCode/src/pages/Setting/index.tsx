import React, {useState, useEffect} from "react";
import {Button, Row, Col, Typography, message, Spin, Form, Input, Select, Switch, Tooltip, Card, Divider} from "antd";
import {MinusCircleOutlined, PlusOutlined, GlobalOutlined, BookOutlined, BulbOutlined, FileTextOutlined, AimOutlined, LockOutlined, KeyOutlined} from "@ant-design/icons";
import { useNavigate  } from 'react-router-dom';
import axios from "axios";

import './setting.css'

const { Title, Paragraph } = Typography;
const { Option } = Select;

type Dict = { [key: string]: any };
interface UserInfo {
  email: string;
  area?: any[];
  language?: string;
  summaryList?: any[];
  topicList?: any[]
}

export default function Setting() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [form] = Form.useForm();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [language, setLanguage] = useState("English")
    const [area, setArea] = useState(["Computer Linguistic"])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [topicList, setTopicList] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [summaryList, setSummaryList] = useState<any[]>([])
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<any>({});

    const languages: Record<string, string> = {
      "es": "Spanish",
      "ja": "Japanese",
      "ru": "Russian",
      "en": "English",
      "zh": "Chinese",
      "fr": "French",
      "de": "German",
      "pt": "Portuguese"
    };

    const areas = [
        "Artificial Intelligence",
        "Hardware Architecture",
        "Computational Complexity",
        "Computational Engineering",
        "Computation and Language",
        "Computer Vision",
        "Computers and Society",
        "Databases",
        "Distributed Cluster Computing",
        "Digital Libraries",
        "Discrete Mathematics",
        "Data Structures",
        "Emerging Technologies",
        "Formal Languages",
        "General Literature",
        "Graphics",
        "Game Theory",
        "Human-Computer Interaction",
        "Information Retrieval",
        "Information Theory",
        "Machine Learning",
        "Logic in Computer Science",
        "Multiagent Systems",
        "Multimedia",
        "Mathematical Software",
        "Numerical Analysis",
        "Neural and Evolutionary Computing",
        "Networking and Internet Architecture",
        "Other Computer Science",
        "Operating Systems",
        "Performance",
        "Programming Languages",
        "Robotics",
        "Symbolic Computation",
        "Sound",
        "Software Engineering",
        "Social and Information Networks",
        "Systems and Control",
        "Econometrics",
        "General Economics",
        "Theoretical Economics",
        "Audio and Speech Processing",
        "Image and Video Processing",
        "Signal Processing",
        "Algebraic Geometry",
        "Algebraic Topology",
        "Analysis of PDEs",
        "Category Theory",
        "Classical Analysis and ODEs",
        "Combinatorics",
        "Commutative Algebra",
        "Complex Variables",
        "Differential Geometry",
        "Dynamical Systems",
        "Functional Analysis",
        "General Mathematics",
        "General Topology",
        "Geometric Topology",
        "Group Theory",
        "History and Overview",
        "Information Theory",
        "K-Theory and Homology",
        "Logic",
        "Mathematical Physics",
        "Metric Geometry",
        "Number Theory",
        "Numerical Analysis",
        "Operator Algebras",
        "Optimization and Control",
        "Probability",
        "Quantum Algebra",
        "Rings and Algebras",
        "Representation Theory",
        "Spectral Theory",
        "Statistics Theory",
        "Symplectic Geometry",
        "Astrophysics of Galaxies",
        "Cosmology and Nongalactic Astrophysics",
        "Earth and Planetary Astrophysics",
        "High Energy Astrophysical Phenomena",
        "Instrumentation and Methods for Astrophysics",
        "Solar and Stellar Astrophysics",
        "Materials Science",
        "Mesoscale and Nanoscale Physics",
        "Other Condensed Matter",
        "Quantum Gases",
        "Soft Condensed Matter",
        "Statistical Mechanics",
        "Strongly Correlated Electrons",
        "Superconductivity",
        "Disordered Systems and Neural Networks",
        "Chaotic Dynamics",
        "Adaptation and Self-Organizing Systems",
        "Cellular Automata and Lattice Gases",
        "Exactly Solvable and Integrable Systems",
        "Pattern Formation and Solitons",
        "Biomolecules",
        "Cell Behavior",
        "Genomics",
        "Molecular Networks",
        "Neurons and Cognition",
        "Other Quantitative Biology",
        "Populations and Evolution",
        "Quantitative Methods",
        "Subcellular Processes",
        "Tissues and Organs",
        "Computational Finance",
        "Economics",
        "General Finance",
        "Mathematical Finance",
        "Portfolio Management",
        "Pricing of Securities",
        "Risk Management",
        "Statistical Finance",
        "Trading and Market Microstructure",
        "Applications",
        "Computation",
        "Machine Learning",
        "Methodology",
        "Other Statistics",
        "Statistics Theory"
    ];

    function deepEqual(obj1: any, obj2: any): boolean {
      if (obj1 === obj2) return true;
      if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        return obj1.every((item, index) => deepEqual(item, obj2[index]));
      }
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      if (keys1.length !== keys2.length) return false;
      return keys1.every(key => deepEqual(obj1[key], obj2[key]));
    }

    function areValuesEqual(dict1: Dict, dict2: Dict): boolean {
      return Object.keys(dict1).every(key => deepEqual(dict1[key], dict2[key]));
    }

    const onFinish = async (values: any) => {
        setIsLoading(true);
        const item = localStorage.getItem('loginInfo');
        if (item === null) {
            setIsLoading(false);
            return false;
        }
        const loginInfo = JSON.parse(item);
        if (areValuesEqual(values, loginInfo)) {
            setIsLoading(false);
            return;
        }
        const topicData = (values.topicList || []).map((item: any) => ({
            topic: item.topic || '',
            mode: item.mode || 'precise'
        }));
        const params: UserInfo = {
            email: loginInfo['email'],
            area: values.area,
            language: values.language,
            summaryList: values.summaryList,
            topicList: topicData
        }
        try {
          const response = await axios.post('/api/edit_profile', params);
          const data = response.data;
          if (data.status === 200) {
              const userInfo = {
                  ...loginInfo,
                  area: JSON.stringify(values.area),
                  language: values.language,
                  summaryList: JSON.stringify(values.summaryList.map((item: any) => item.summary)),
                  topicList: JSON.stringify(topicData)
              }
              localStorage.setItem('loginInfo', JSON.stringify(userInfo));
              message.success('Preferences updated successfully!');
          } else {
              message.error('Failed to save. Please try again.');
          }
        } catch (error) {
            message.error('Failed to save. Please try again.');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const item = localStorage.getItem('loginInfo');
        if (item === null) {
            navigate('/login');
            return;
        }
        let loginInfo: any;
        try { loginInfo = JSON.parse(item); } catch { navigate('/login'); return; }
        setUserInfo(loginInfo);
        setLanguage(loginInfo['language']);

        const parseField = (val: any) => {
          if (Array.isArray(val)) return val.length ? val : null;
          if (!val || val === '' || val === '[]') return null;
          try { return JSON.parse(val); } catch { return null; }
        };

        const areaArr = parseField(loginInfo['area']) || [];
        const summaryArr = parseField(loginInfo['summaryList']);
        const topicArr = parseField(loginInfo['topicList']);

        setArea(areaArr);
        setSummaryList(summaryArr ? summaryArr.map((item: any) => ({ summary: item })) : [{}]);

        const normalizedTopics = topicArr
          ? topicArr.map((item: any) => {
              if (typeof item === 'string') return { topic: item, mode: 'precise' };
              return { topic: item.topic || '', mode: item.mode || 'precise' };
            })
          : [{ topic: '', mode: 'precise' }];
        setTopicList(normalizedTopics);

        form.setFieldsValue({
            language: loginInfo['language'],
            area: areaArr,
            summaryList: summaryArr ? summaryArr.map((item: any) => ({ summary: item })) : [{}],
            topicList: normalizedTopics
        });
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        loading ? (
            <Row justify='center' align='middle' className='spin-container'>
                <Spin tip="Loading..." size='large' />
            </Row>
        ) : (
            <div className="setting-page">
                <div className="setting-header">
                    <Title level={2}>Research Preferences</Title>
                    <Paragraph>Tell us what you care about. We'll curate and summarize papers that matter most.</Paragraph>
                </div>

                <Form
                    name="userForm"
                    onFinish={onFinish}
                    autoComplete="off"
                    form={form}
                    layout="vertical"
                    scrollToFirstError
                >
                    {/* Research Area */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <Title level={4}><BookOutlined style={{color: '#722ed1'}} /> Core Field</Title>
                            <p>Select your broad academic discipline (e.g. Machine Learning). We use this to filter arXiv papers.</p>
                        </div>
                        <div className="setting-control">
                            <Form.Item
                                name="area"
                                rules={[{ required: true, message: 'Please select at least one area' }]}
                            >
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%' }}
                                    defaultValue={area}
                                    placeholder="Search and select fields..."
                                    maxCount={userInfo['pro'] === 2 ? 5 : 1}
                                    showSearch
                                    optionFilterProp="children"
                                    size="large"
                                >
                                    {areas.map((a, index) => (
                                        <Option key={index} value={a}>{a}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <Title level={4}><GlobalOutlined style={{color: '#722ed1'}} /> Language</Title>
                            <p>Your preferred language for AI-generated summaries and insights.</p>
                        </div>
                        <div className="setting-control">
                            <Form.Item
                                name="language"
                                rules={[{ required: true, message: 'Please select a language' }]}
                            >
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder="Select language"
                                    size="large"
                                >
                                    {Object.entries(languages).map(([key, value]) => (
                                        <Option key={key} value={key}>{value}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </div>
                    </div>

                    {/* Topics */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <Title level={4}><BulbOutlined style={{color: '#722ed1'}} /> Specific Topics</Title>
                            <p>What exact problems or technologies are you tracking right now? We'll prioritize these.</p>
                            <div style={{ marginTop: 12, fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                                <div style={{ marginBottom: 2 }}>
                                    <AimOutlined style={{ color: '#722ed1', marginRight: 4 }} />
                                    <span style={{ color: '#722ed1', fontWeight: 600 }}>Precise</span> — Only closely matching papers
                                </div>
                                <div>
                                    <GlobalOutlined style={{ color: '#1890ff', marginRight: 4 }} />
                                    <span style={{ color: '#1890ff', fontWeight: 600 }}>Broad</span> — Include loosely related papers
                                </div>
                            </div>
                        </div>
                        <div className="setting-control">
                            <Form.List name="topicList">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} className="dynamic-list-row">
                                                <Row align='middle' gutter={12}>
                                                    <Col flex="auto">
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'topic']}
                                                            style={{marginBottom: 0}}
                                                        >
                                                            <Input size="large" placeholder='e.g. "multi-agents with open source LLM for RAG"' bordered={false} style={{background: 'transparent', padding: 0, boxShadow: 'none'}}/>
                                                        </Form.Item>
                                                    </Col>
                                                    <Col flex="none">
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'mode']}
                                                            valuePropName="checked"
                                                            getValueFromEvent={(checked: boolean) => checked ? 'broad' : 'precise'}
                                                            getValueProps={(value: string) => ({ checked: value === 'broad' })}
                                                            style={{marginBottom: 0}}
                                                            initialValue="precise"
                                                        >
                                                            <Tooltip title={
                                                                form.getFieldValue(['topicList', name, 'mode']) === 'broad'
                                                                  ? 'Broad: includes loosely related papers'
                                                                  : 'Precise: only closely matching papers'
                                                            }>
                                                                <Switch
                                                                    size="small"
                                                                    checkedChildren="Broad"
                                                                    unCheckedChildren="Precise"
                                                                    className="topic-mode-switch"
                                                                    style={{ minWidth: 70 }}
                                                                />
                                                            </Tooltip>
                                                        </Form.Item>
                                                    </Col>
                                                    <Col flex="32px" style={{textAlign: 'center'}}>
                                                        <MinusCircleOutlined
                                                            onClick={() => remove(name)}
                                                            style={{color: '#bfbfbf', fontSize: 18, cursor: 'pointer', transition: 'color 0.2s'}}
                                                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4f')}
                                                            onMouseLeave={(e) => (e.currentTarget.style.color = '#bfbfbf')}
                                                        />
                                                    </Col>
                                                </Row>
                                            </div>
                                        ))}
                                        {((fields.length < 5 && userInfo['pro'] === 2) || (fields.length < 1 && userInfo['pro'] === 1)) && (
                                            <Button type="dashed" onClick={() => add({ topic: '', mode: 'precise' })} block icon={<PlusOutlined />} size="large" style={{borderRadius: 8, marginTop: 4}}>
                                                Add topic focus
                                            </Button>
                                        )}
                                    </>
                                )}
                            </Form.List>
                        </div>
                    </div>

                    {/* Summary Requirements */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <Title level={4}><FileTextOutlined style={{color: '#722ed1'}} /> Summary Focus</Title>
                            <p>Guide the AI on how to read the paper for you. Ask specific questions you want answered from every paper.</p>
                        </div>
                        <div className="setting-control">
                            <Form.List name="summaryList">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} className="dynamic-list-row">
                                                <Row align='middle' gutter={12}>
                                                    <Col flex="auto">
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'summary']}
                                                            style={{marginBottom: 0}}
                                                        >
                                                            <Input size="large" placeholder='e.g. "What is the core contribution?", "Compared to baselines?"' bordered={false} style={{background: 'transparent', padding: 0, boxShadow: 'none'}}/>
                                                        </Form.Item>
                                                    </Col>
                                                    <Col flex="32px" style={{textAlign: 'center'}}>
                                                        {fields.length > 1 && (
                                                            <MinusCircleOutlined
                                                                onClick={() => remove(name)}
                                                                style={{color: '#bfbfbf', fontSize: 18, cursor: 'pointer', transition: 'color 0.2s'}}
                                                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4f')}
                                                                onMouseLeave={(e) => (e.currentTarget.style.color = '#bfbfbf')}
                                                            />
                                                        )}
                                                    </Col>
                                                </Row>
                                            </div>
                                        ))}
                                        {((fields.length < 5 && userInfo['pro'] === 2) || (fields.length < 1 && userInfo['pro'] === 1)) && (
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="large" style={{borderRadius: 8, marginTop: 4}}>
                                                Add question for AI
                                            </Button>
                                        )}
                                    </>
                                )}
                            </Form.List>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="setting-submit">
                        <Button type="primary" htmlType="submit" loading={isLoading}>
                            Save Preferences
                        </Button>
                    </div>
                </Form>

                <Divider style={{ margin: '40px 0 24px' }} />

                <ChangePasswordCard email={userInfo['email']} />
            </div>
        )
    )
}

function ChangePasswordCard({ email }: { email: string }) {
    const [pwForm] = Form.useForm();
    const [pwLoading, setPwLoading] = React.useState(false);

    const onChangePw = async (values: any) => {
        setPwLoading(true);
        try {
            const res = await axios.post('/api/change_password', {
                email,
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
            });
            if (res.data.status === 200) {
                message.success(res.data.message || 'Password changed.');
                pwForm.resetFields();
            } else {
                message.error(res.data.message || 'Failed to change password.');
            }
        } catch {
            message.error('Network error. Please try again.');
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <Card
            className="setting-pw-card"
            style={{ borderRadius: 14, background: 'linear-gradient(160deg, #faf5ff 0%, #fff 70%)', borderColor: '#efe0ff' }}
        >
            <Title level={4} style={{ marginTop: 0 }}>
                <LockOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                Change Password
            </Title>
            <Paragraph style={{ color: '#666' }}>
                Choose a new password for <b>{email}</b>. We'll log you out of nothing — just update the password.
            </Paragraph>

            <Form form={pwForm} layout="vertical" onFinish={onChangePw} autoComplete="off">
                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="oldPassword"
                            label="Current password"
                            rules={[{ required: true, message: 'Enter your current password.' }]}
                        >
                            <Input.Password size="large" prefix={<KeyOutlined />} placeholder="Current password" autoComplete="current-password" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="newPassword"
                            label="New password"
                            rules={[
                                { required: true, message: 'Enter a new password.' },
                                { min: 6, message: 'At least 6 characters.' },
                                { max: 16, message: 'No longer than 16 characters.' },
                            ]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined />} placeholder="6-16 characters" autoComplete="new-password" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="confirm"
                            label="Confirm new password"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Confirm your new password.' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                        return Promise.reject(new Error('Passwords do not match.'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined />} placeholder="Repeat new password" autoComplete="new-password" />
                        </Form.Item>
                    </Col>
                </Row>
                <Button type="primary" htmlType="submit" loading={pwLoading} size="large">
                    Update password
                </Button>
            </Form>
        </Card>
    );
}
