import React, {useState, useEffect} from "react";
import {Button, Row, Col,Typography, Card, message, Spin, Form, Input, Tooltip } from "antd";
import {GoogleOutlined, WechatOutlined, ReloadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useNavigate, Link } from 'react-router-dom';
import PubSub from 'pubsub-js';
import axios from "axios";
import { useGoogleLogin } from '@react-oauth/google';


import "./login.css";
const { Title, Paragraph } = Typography;


export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const userinfo = localStorage.getItem('loginInfo');
    const [isSignUp, setIsSignUp] = useState(false);
    const [isSendCaptcha, setIsSendcaptcha] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [form] = Form.useForm();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);
    const isLocalDev = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const googleDisabledTip = "Google login is disabled in local development because the project's Google OAuth client only allows its production domain. Please sign up with email + password instead — it works on localhost.";

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 576);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

     const login = useGoogleLogin({
      onSuccess: codeResponse => handleLogin(codeResponse),
    });

    const [loginLoading, setLoginLoading] = useState(false);

    const handleSignUp = () => {
        setIsSignUp(current => !current); // 更新状态为 true
        form.resetFields();
        // console.log("Sign up state changed to: ", isSignUp);
    };

    useEffect(() => {
        if (secondsLeft > 0) {
          // 每秒更新一次时间
          const timerId = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
          return () => clearTimeout(timerId);
        } else {
          // 当倒计时结束时，设置 'a' 为 false
          setIsSendcaptcha(false);
        }
      }, [secondsLeft]);

    const fillDemoAccount = () => {
        form.setFieldsValue({
            username: 'professor@um.edu.mo',
            password: 'demo1234',
            ...(isSignUp ? { nickname: 'Prof. Demo' } : {}),
        });
        message.info(isSignUp
            ? 'Demo details filled. Click "Create account".'
            : 'Demo credentials filled. If the account does not exist yet, click "Sign Up" once to create it.');
    };

    const sendCaptcha = async () => {
        setIsSendcaptcha(true);
        setSecondsLeft(60);
        try {
          // 假设后端的登录API URL是 `http://localhost:4000/api/login`
          const response = await axios.post('/api/sendCaptcha', {
            email: form.getFieldValue('username')
          });
          const data = response.data;
          if (data.status == 200) {
              message.success('Send captcha successfully!')
            } else {
                setSecondsLeft(0);
              message.error('Send captcha failed! Please try again later.')
          }
          // console.log('Server response:', response.data);
          // 可以在这里处理登录后的逻辑，例如页面跳转或状态更新等
        } catch (error) {
            setSecondsLeft(0);
          message.error('Send captcha failed! Please try again later.')
        }
        // console.log("发送验t证码")
    }

    const onFinish = async (values: any) => {
        setLoginLoading(true);
        const isRegister = isSignUp;
        let params: any = {
            email: values.username,
            password: values.password,
        };
        if (isRegister) {
            params.nickName = values.nickname;
            params.action = 'register';
            if (values.captcha) params.captcha = values.captcha;
        }
        try {
          const response = await axios.post('/api/login', params);
          const data = response.data;
          if (data.status === 200) {
              const userInfo = {
                "email": data.userInfo['user_id'],
                "avatarUrl": data.userInfo['avatar_url'],
                "nickName": data.userInfo['nickname'],
                "pro": data.userInfo["pro"],
                "credit": data.userInfo["credit"],
                  "summaryList": data.userInfo['summary'],
                  'topicList': data.userInfo['topic'],
                "language": data.userInfo['language'],
                "area": data.userInfo['areas'],
                 'favorite': data.userInfo['favorite'] ? data.userInfo['favorite'].split(',') : [],
                "expriedDate": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                "memberExpiredDate": data.userInfo["expired_date"]
            }
            localStorage.setItem('loginInfo', JSON.stringify(userInfo));
            PubSub.publish('Login Status', true);
            message.success(isRegister ? 'Welcome aboard! Account created.' : 'Login successful!');
            navigate("/paper")
          }  else {
            message.error(data.message || (isRegister ? 'Sign up failed.' : 'Login failed.'), 2.5);
          }
        } catch (error) {
            message.error(isRegister ? 'Sign up failed. Please try again.' : 'Login failed. Please try again.', 2.5);
        }
        setLoginLoading(false);
    };

    async function handleLogin(codeResponse: any) {
        try {
            const accessToken = codeResponse.access_token
            const userResponse = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo?access_token='+accessToken)
            const {email, name, picture} = userResponse.data
            const backResponse = await axios.post('/api/login', {
                "email": email,
                "nickName": name,
                "avatorUrl": picture,
                "accessToken": accessToken
            });
            const data = backResponse.data;

            if (data.status === 200) {
                const userInfo = {
                    "email": email,
                    "avatarUrl": picture,
                    "nickName": name,
                    "pro": data.userInfo["pro"],
                    "credit": data.userInfo["credit"],
                    "summaryList": data.userInfo['summary'],
                    'topicList': data.userInfo['topic'],
                    "language": data.userInfo['language'],
                    "area": data.userInfo['areas'],
                    'favorite': data.userInfo['favorite'] ? data.userInfo['favorite'].split(',') : [],
                    "expriedDate": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    "memberExpiredDate": data.userInfo["expired_date"]
                }
                localStorage.setItem('loginInfo', JSON.stringify(userInfo));
                PubSub.publish('Login Status', true);
                message.success("Login Successfully!")
                navigate("/paper")
            } else {
                message.error("Login Failed! Please try again later!")
            }
        } catch (error) {
            message.error("Google Login failed. Please check your network and try again.");
        }
    }


    return (
        <div className='container' style={isMobile ? {padding: '35% 10%'} : undefined}>
            { !isMobile ? (
                <div>
                    <Row className="row" justify="center" align="middle">
                      <Col span={24} className='col'>
                          <Card
                              className="login-container"
                          >
                                    <div style={{marginBottom: '20px'}}>
                                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <img src={`${process.env.PUBLIC_URL}/logo-icon.png`} alt="iSuperviz" style={{height: '25px', width: '25px', objectFit: 'contain'}}/>
                                            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 700, color: '#722ed1', letterSpacing: '0.5px' }}>iSuperviz</span>
                                        </Link>
                                    </div>
                                  {
                                      isSignUp ? (
                                          <div>
                                              <Form
                                                  name="signInForm"
                                                  onFinish={onFinish}
                                                  autoComplete="on"
                                                  form={form}
                                                    scrollToFirstError
                                                >
                                                  <Form.Item
                                                    name="nickname"
                                                    rules={[{ required: true, message: 'Please input your nickname.' }]}
                                                  >
                                                    <Input placeholder='Nickname' />
                                                  </Form.Item>
                                                  <Form.Item
                                                    name="username"
                                                    rules={[{ required: true, message: 'Please input your E-mail.' }]}
                                                  >
                                                    <Input placeholder='E-mail' />
                                                  </Form.Item>


                                                  <Form.Item
                                                    name="password"
                                                    rules={[
                                                        { required: true, message: 'Please input your password.' },
                                                        {
                                                            max: 16,
                                                            message: 'Password cannot be longer than 16 characters',
                                                          }
                                                    ]}
                                                  >
                                                    <Input.Password placeholder='Password (6-16 chars)' />
                                                  </Form.Item>
                                                  <p style={{fontSize: 12, color: '#999', marginTop: -8, marginBottom: 16}}>
                                                    Just your nickname, email and a password — no email verification needed for the demo.
                                                  </p>
                                                  <Form.Item>
                                                    <Button type="primary" htmlType="submit" loading={loginLoading}>
                                                      Create account
                                                    </Button>
                                                    <Button type="link" onClick={handleSignUp}>
                                                      Already have one? Log in
                                                    </Button>
                                                  </Form.Item>
                                                </Form>
                                          </div>
                                      ) : (
                                          <div>
                                              <Form
                                                  name="loginForm"
                                                  initialValues={{ remember: true }}
                                                  onFinish={onFinish}
                                                  autoComplete="on"
                                                  form={form}
                                                    scrollToFirstError
                                                >
                                                  <Form.Item
                                                    name="username"
                                                    rules={[{ required: true, message: 'Please input your E-mail.' }]}
                                                  >
                                                    <Input type='text' placeholder='E-mail' />
                                                  </Form.Item>

                                                  <Form.Item
                                                    name="password"
                                                    rules={[
                                                        { required: true, message: 'Please input your password.' },
                                                        {
                                                            max: 16,
                                                            message: 'Password cannot be longer than 16 characters',
                                                          }
                                                    ]}
                                                  >
                                                    <Input.Password type="password" placeholder='Password' />
                                                  </Form.Item>

                                                  <Form.Item>
                                                    <Button type="primary" htmlType="submit" loading={loginLoading}>
                                                      Login
                                                    </Button>
                                                    <Button type="link"  onClick={handleSignUp}>
                                                      Sign Up
                                                    </Button>
                                                    <Link to="/forgot-password" style={{float: 'right', fontSize: 13}}>
                                                      Forgot password?
                                                    </Link>
                                                  </Form.Item>
                                                </Form>
                                              <div style={{"display": "flex", "alignItems": "center"}}>
                                                  <div className="divider"></div>
                                                  <p style={{color: 'gainsboro', margin: 'auto'}}> OR </p>
                                                  <div className="divider"></div>
                                              </div>
                                              <Tooltip title={isLocalDev ? googleDisabledTip : ''}>
                                                  <Button
                                                      type="primary"
                                                      icon={<GoogleOutlined />}
                                                      size="large"
                                                      disabled={isLocalDev}
                                                      onClick={() => login()}
                                                  >
                                                      Google Login {isLocalDev && <InfoCircleOutlined style={{marginLeft: 4, opacity: 0.6}} />}
                                                  </Button>
                                              </Tooltip>
                                              {isLocalDev && (
                                                  <p style={{fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center'}}>
                                                      Google login isn't available on localhost — use email signup above.
                                                  </p>
                                              )}
                                          </div>
                                      )
                                  }
                                  <div style={{
                                      marginTop: 12,
                                      padding: '10px 12px',
                                      background: 'linear-gradient(135deg,#f9f0ff 0%,#fff0f6 100%)',
                                      border: '1px dashed #d3adf7',
                                      borderRadius: 8,
                                      fontSize: 12,
                                      color: '#531dab',
                                      lineHeight: 1.55,
                                  }}>
                                      <strong>Reviewer quick-start:</strong> use the Demo account
                                      <code style={{margin: '0 4px'}}>professor@um.edu.mo / demo1234</code>.
                                      <Button size="small" type="link" onClick={fillDemoAccount} style={{padding: 0, marginLeft: 4}}>
                                          Fill for me
                                      </Button>
                                  </div>
                              </Card>
                      </Col>
                  </Row>
                </div>
            ) : (
                <Row justify="center" className="row"  align="middle" >
                    <Col xs={24} sm={24} md={12} lg={12}>
                          <div>
                              <div style={{marginBottom: '20px'}}>
                                  <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                      <img src={`${process.env.PUBLIC_URL}/logo-icon.png`} alt="iSuperviz" style={{height: '25px', width: '25px', objectFit: 'contain'}}/>
                                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 700, color: '#722ed1', letterSpacing: '0.5px' }}>iSuperviz</span>
                                  </Link>
                              </div>
                              {
                                  isSignUp ? (
                                      <div>
                                          <Form
                                              name="signInForm"
                                              onFinish={onFinish}
                                              autoComplete="off"
                                              style={{ maxWidth: "90%" }}
                                              form={form}
                                                scrollToFirstError
                                            >
                                              <Form.Item
                                                name="nickname"
                                                rules={[{ required: true, message: 'Please input your nickname.' }]}
                                              >
                                                <Input placeholder='Nickname' />
                                              </Form.Item>
                                              <Form.Item
                                                name="username"
                                                rules={[{ required: true, message: 'Please input your E-mail.' }]}
                                              >
                                                <Input placeholder='E-mail' />
                                              </Form.Item>


                                              <Form.Item
                                                name="password"
                                                rules={[
                                                        { required: true, message: 'Please input your password.' },
                                                        {
                                                            max: 16,
                                                            message: 'Password cannot be longer than 16 characters',
                                                          }
                                                    ]}
                                              >
                                                <Input.Password placeholder='Password (6-16 chars)' />
                                              </Form.Item>
                                              <p style={{fontSize: 12, color: '#999', marginTop: -8, marginBottom: 16}}>
                                                Just your nickname, email and a password — no email verification needed for the demo.
                                              </p>
                                              <Form.Item>
                                                <Button type="primary" htmlType="submit" loading={loginLoading}>
                                                  Create account
                                                </Button>
                                                <Button type="link" onClick={handleSignUp}>
                                                  Already have one? Log in
                                                </Button>
                                              </Form.Item>
                                            </Form>
                                      </div>
                                  ) : (
                                      <div>
                                          <Form
                                              name="loginForm"
                                              initialValues={{ remember: true }}
                                              onFinish={onFinish}
                                              autoComplete="on"
                                              form={form}
                                              style={{ maxWidth: "90%" }}
                                              scrollToFirstError
                                            >
                                              <Form.Item
                                                name="username"
                                                rules={[{ required: true, message: 'Please input your E-mail.' }]}
                                              >
                                                <Input type="text" placeholder='E-mail' />
                                              </Form.Item>

                                              <Form.Item
                                                name="password"
                                                rules={[
                                                        { required: true, message: 'Please input your password.' },
                                                        {
                                                            max: 16,
                                                            message: 'Password cannot be longer than 16 characters',
                                                          }
                                                    ]}
                                              >
                                                <Input.Password type="password" placeholder='Password' />
                                              </Form.Item>

                                              <Form.Item>
                                                <Button type="primary" htmlType="submit" loading={loginLoading}>
                                                  Login
                                                </Button>
                                                <Button type="link" onClick={handleSignUp}>
                                                  Sign Up
                                                </Button>
                                                <Link to="/forgot-password" style={{float: 'right', fontSize: 13}}>
                                                  Forgot password?
                                                </Link>
                                              </Form.Item>
                                            </Form>
                                          <div style={{"display": "flex", "alignItems": "center"}}>
                                              <div className="divider"></div>
                                               <p style={{color: 'gainsboro', margin: 'auto'}}> OR </p>
                                              <div className="divider"></div>
                                          </div>
                                          <Tooltip title={isLocalDev ? googleDisabledTip : ''}>
                                              <Button
                                                  type="primary"
                                                  icon={<GoogleOutlined />}
                                                  size="large"
                                                  disabled={isLocalDev}
                                                  onClick={() => login()}
                                              >
                                                  Google Login {isLocalDev && <InfoCircleOutlined style={{marginLeft: 4, opacity: 0.6}} />}
                                              </Button>
                                          </Tooltip>
                                          {isLocalDev && (
                                              <p style={{fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center'}}>
                                                  Google login isn't available on localhost — use email signup above.
                                              </p>
                                          )}
                                      </div>
                                  )
                              }
                          </div>
                  </Col>
                </Row>
            )}
        </div>
    )
}