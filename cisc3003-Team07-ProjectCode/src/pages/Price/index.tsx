import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Typography, Button, Card, message, Input, Badge, Modal } from 'antd';
import { CreditCardOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from "axios";
import PubSub from 'pubsub-js';

import './price.css'

const { Title, Paragraph, Text } = Typography;

const PricePage: React.FC = () => {
    const navigate = useNavigate();
    const [loginInfo, setLoginInfo] = useState<any>();
    const [code, setCode] = useState<string>('');
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const payStatus = params.get('success');
    const payUser = params.get('user');
    const orderId = params.get('order_id');
    const paymentId = params.get('paymentId');
    const PayerID = params.get('PayerID');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [planDetails, setPlanDetails] = useState({plan: '', price: '', priceId: ''});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);


    const showModal = (details: any) => {
        if (loginInfo === undefined) {
            navigate('/login')
            return;
        }
        setPlanDetails(details);
        setIsModalOpen(true);
    };


    const handleCancel = () => {
        setIsModalOpen(false);
        setPlanDetails({plan: '', price: '', priceId: ''});
    };

    const handleCodeChange = (e: any) => {
      setCode(e.target.value);
    };

    const handleSubmitCode = () => {
        if (loginInfo === undefined) {
            navigate('/login')
            return;
        }
        // 发送兑换码
        if (code === '') {
            message.info("emptyCode");
            return;
        }

        if (loginInfo !== undefined) {
            const {email} = loginInfo
            axios({
                method: "post",
                url: '/api/redemption',
                data: {
                    "user": email,
                    "code": code,
                },
            }).then(function (response) {
                const data = response.data;
                if (data.status === 200) {
                    message.success("Use redemption code successfully!")
                } else if (data.status === 301) {
                    message.info("This code is invalid.")
                } else if (data.status === 302 || data.status === 303) {
                    message.info("This code has been used.")
                } else {
                    message.error("Process redemption failed, please try again later.")
                }
                setCode('');
            }).catch(function (error) {
                message.error("Process redemption failed, please try again later.");
                setCode('');
            })
        } else {
            navigate('/login')
        }
    }

    const handlePayment = (product_id: string, paymentMethod: string) => {
        let requestUrl = ''
        if (paymentMethod === 'card') {
            requestUrl = '/api/create-checkout-session'
        } else {
            requestUrl = '/api/create_payment'
        }
        if (loginInfo !== undefined) {
            const {email} = loginInfo
            axios({
                method: "post",
                url: requestUrl,
                data: {
                    "product_id": product_id,
                    "user_id": email
                },
            }).then(function (response) {
                const data = response.data
                if (data.status === 200) {
                    window.location.href = data.redirect_url
                } else {
                    message.error("Create a payment failed, please try again later.")
                }
            })
            .catch(error => message.error("Create a payment failed, please try again later."));
        }
    };

    const processPayment = useCallback(() => {
        const item = localStorage.getItem('loginInfo');
        if (item === null) return;
        const loginInfo = JSON.parse(item);
        setLoginInfo(loginInfo);

        if (paymentId) {
            const {email} = loginInfo;
            axios({
                method: "post",
                url: '/api/purchase_paypal_callback',
                data: { paymentId, PayerID, email },
            }).then(function (response) {
                const data = response.data
                if (data.status === 200) {
                    const updatedUserInfo = {
                        ...loginInfo,
                        credit: data.newQuota,
                        memberExpiredDate: data.memberExpiredDate
                    };
                    PubSub.publish('Quota Status', data.newQuota);
                    localStorage.setItem('loginInfo', JSON.stringify(updatedUserInfo));
                    message.success("Payment confirmed, enjoy reading please!", 2)
                } else {
                    message.error("Payment processing failed, please try again later.")
                }
            }).catch(() => message.error("Payment processing failed, please try again later."));
        }

        if (orderId) {
            const {email} = loginInfo;
            axios({
                method: "post",
                url: '/api/purchase_callback',
                data: { payStatus, orderId, email: payUser || email },
            }).then(function (response) {
                const data = response.data
                if (data.status === 200) {
                    const updatedUserInfo = {
                        ...loginInfo,
                        credit: data.newQuota,
                        memberExpiredDate: data.memberExpiredDate
                    };
                    PubSub.publish('Quota Status', data.newQuota);
                    localStorage.setItem('loginInfo', JSON.stringify(updatedUserInfo));
                    message.success("Payment confirmed, enjoy reading please!", 2)
                } else if (data.status === 201) {
                    message.info("This order has already been confirmed!")
                } else {
                    message.error("Payment processing failed, please try again later.")
                }
            }).catch(() => message.error("Payment processing failed, please try again later."));
        }
    }, [paymentId, PayerID, orderId, payStatus, payUser]);

    useEffect(() => {
        window.scrollTo(0, 0);
        const handleResize = () => setIsMobile(window.innerWidth <= 576);
        window.addEventListener('resize', handleResize);
        processPayment();
        return () => window.removeEventListener('resize', handleResize);
    }, [processPayment])

  return (
        <div className="priceContainer">
            <Modal title="Pay Method" open={isModalOpen} onCancel={handleCancel} footer={null}>
                <Card bordered style={{ borderRadius: '8px', border: '1px solid rgb(167 167 167)', margin: '10px 0'}}>
                  <Title level={5} style={{ marginBottom: '16px' }}>
                    Plan Information
                  </Title>
                  <Row justify="space-between">
                    <Col>
                      <Text>{planDetails.plan}</Text>
                    </Col>
                    <Col>
                      <Text>{planDetails.price}</Text>
                    </Col>
                  </Row>
                </Card>
                <Button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      marginBottom: '10px',
                      borderRadius: '8px',
                      padding: '20px 20px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    }}
                    onClick={() => handlePayment(planDetails.priceId, 'card')}
                  >
                    <Row align="middle" style={{ flex: 1 }} justify='start'>
                      <Col className='col'>
                        <CreditCardOutlined style={{ fontSize: '24px', marginRight: '10px' }} />
                      </Col>
                      <Col flex="auto" className='col' style={{justifyContent: 'start'}}>
                        <span>Credit Card</span>
                      </Col>
                      <Col className='col' style={{gap: '5px'}}>
                        <img src="./visa.svg" width={30} alt="Visa" />
                        <img src="./mastercard.svg" width={30} alt="Mastercard" />
                        <img src="./unionpay.svg" width={30} alt="UnionPay" />
                      </Col>
                    </Row>
                  </Button>

                  <Button
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      padding: '20px 20px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    }}
                    onClick={() => handlePayment(planDetails.priceId, 'paypal')}
                  >
                    <Row align="middle" justify='center'>
                      <Col className='col'>
                        <img src="./paypal.svg" width={50} alt="PayPal" />
                      </Col>
                    </Row>
                  </Button>
            </Modal>
            <Row justify="center" className="row" align="middle" style={{ padding: '0% 5%', paddingBottom: '5%'}}>
                <Col span={24} style={{margin: '20px 0 30px 0', display: 'flex', justifyContent: 'center'}}>
                    <div className="user-quota">
                        {
                            loginInfo !== undefined ? (
                                loginInfo['pro'] === 2 ?
                                    <span>You are currently a VIP member. Expiration date: <span style={{color: '#722ed1', fontWeight: 700}}>{loginInfo['memberExpiredDate']}</span>.</span> : (
                                        loginInfo['pro'] === 1 ?
                                            <span>You are currently on the Free Plan. Expiration date: <span style={{color: '#722ed1', fontWeight: 700}}>{loginInfo['memberExpiredDate']}</span>.</span> :
                                            <span>Your member has already expired. You will still receive 20 credits daily.</span>
                                    )
                            ) : undefined
                        }
                    </div>
                </Col>
                <Col span={24} style={{padding: isMobile ? '0 2%' : '0 20%'}}>
                    <Title level={2} style={{ color: 'rgb(0 29 101)'}} className="title">Upgrade to Plus</Title>
                    <Paragraph className="description">Upgrade your member and unlock more functions. <span style={{fontWeight: 600, color: '#9254de'}}>Beta version</span> now available at <span style={{fontWeight: 600, color: '#9254de'}}>discounted rates</span>. All purchased memberships will remain valid after any price changes.</Paragraph>
                </Col>
                <Col span={24} className="col" >
                    <Row style={isMobile ? {width: '100%'} : {width: '70%'}} gutter={[8, 16]} justify="center" className="row">
                        <Col span={24} lg={8} md={8}>
                            <Card style={{backgroundColor: 'transparent'}} bordered={false} className="equal-height-card">
                                <Row>
                                    <Col span={24}>
                                        <Row align='bottom' style={{marginBottom: '15px', justifyContent: 'space-between'}}>
                                            <Title level={1} style={{ color: 'rgb(0 29 101)', marginBottom: 0}}>
                                                0
                                            </Title>
                                        </Row>
                                        <Title level={3} style={{ color: 'rgb(0 29 101)'}}>Free Plan</Title>
                                        <Paragraph style={{color: 'rgb(33 75 131)', fontSize: '18px'}}>7-days Free for everyone after registeration. </Paragraph>
                                    </Col>
                                    <Col span={24}>
                                        <Button
                                            size='large'
                                            className="product-btn"
                                            disabled={true}
                                        >
                                            Current Plan
                                        </Button>
                                    </Col>
                                    <Col span={24}>
                                        <Row style={{color: "rgb(33 75 131)"}} gutter={[8 , 8]} className="plus-descrip">
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Tracking one area and one topic
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Tracking maximum 5 papers per day
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Summary paper with one requirement
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> 20 credits per-day
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                        <Col span={24} lg={8} md={8}>
                            <Badge.Ribbon text="Most Popular" color="red">
                                <Card style={{backgroundColor: '#9254de', borderRadius: '20px'}} className="equal-height-card">
                                <Row>
                                    <Col span={24}>
                                        <Row align='bottom' style={{marginBottom: '20px', justifyContent: 'space-between'}}>
                                            <Title level={1} style={{ color: 'white', marginBottom: 0}}>
                                                $5 <span style={{fontSize: '22px'}}>/ month</span>
                                            </Title>
                                            <Title level={4} style={{ color: '#bfbfbf', marginBottom: 0, textDecoration: 'line-through'}}>
                                                <span style={{fontSize: '20px'}}>$9 / month</span>
                                            </Title>
                                        </Row>
                                        <Title level={3} style={{ color: 'white'}}>Yearly Plan</Title>
                                        <Paragraph style={{color: '#f0f0f0', fontSize: '18px'}}>Yearly discount plan for professional research.</Paragraph>
                                    </Col>
                                    <Col span={24}>
                                         <Button
                                            size='large'
                                            onClick={() => showModal({
                                                plan: 'Yearly Plan',
                                                price: '60 ($5 / month)',
                                                priceId: 2
                                            })}
                                            style={{color: '#f0f0f0'}}
                                            className="product-btn">Upgrade
                                        </Button>
                                    </Col>
                                    <Col span={24}>
                                        <Row style={{color: '#f0f0f0'}} gutter={[8 , 8]} className="plus-descrip">
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Unlimited tracking papers per day
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Unlimited chatting with AI Assistant
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Unlimited uploading and chatting with PDF
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Tracking papers in maximum 5 areas.
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Tracking papers in maximum 5 topics
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Summarize papers with maximum 5 requirements
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Track past papers related to a specific topic (Coming Soon)
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                            </Card>
                            </Badge.Ribbon>
                        </Col>
                        <Col span={24} lg={8} md={8}>
                            <Card style={{backgroundColor: 'transparent'}} bordered={false} className="equal-height-card">
                                <Row>
                                    <Col span={24}>
                                        <Row align='bottom' style={{marginBottom: '15px', justifyContent: 'space-between'}}>
                                            <Title level={1} style={{ color: 'rgb(0 29 101)', marginBottom: 0}}>
                                                $8 <span style={{fontSize: '22px'}}>/ month</span>
                                            </Title>
                                            <Title level={4} style={{ color: '#bfbfbf', marginBottom: 0, textDecoration: 'line-through'}}>
                                                <span style={{fontSize: '20px'}}>$15 / month</span>
                                            </Title>
                                        </Row>
                                        <Title level={3} style={{ color: 'rgb(0 29 101)'}}>Monthly Plan</Title>
                                        <Paragraph style={{color: 'rgb(33 75 131)', fontSize: '18px'}}>Monthly plus plan for an advanced reading experience.</Paragraph>
                                    </Col>
                                    <Col span={24}>
                                        <Button
                                            size='large'
                                            onClick={() => showModal({
                                                plan: 'Monthly Plan',
                                                price: '$8 / month',
                                                priceId: 1
                                            })}
                                            className="product-btn">Upgrade
                                        </Button>
                                    </Col>
                                    <Col span={24}>
                                        <Row style={{color: "rgb(33 75 131)"}} gutter={[8 , 8]} className="plus-descrip">
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Unlimited tracking papers per day
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Unlimited chatting with AI Assistant
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Unlimited uploading and chatting with PDF
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Tracking papers in maximum 5 areas.
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Tracking papers in maximum 5 topics
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Summarize papers with maximum 5 requirements
                                            </Col>
                                            <Col span={24}>
                                                <CheckCircleOutlined style={{marginRight: "5px"}}/> Track past papers related to a specific topic (Coming Soon)
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>
                </Col>
                <Col span={24} style={isMobile ? {marginTop: '30px'} : {marginTop: '30px', padding: '0 15%'}} className="col">
                    <Paragraph style={{marginBottom: 0, fontWeight: 600, fontSize: '16px', marginRight: '10px'}}>Redemption</Paragraph>
                    <Input style={{width: "70%"}} onChange={handleCodeChange} value={code} placeholder="Input your redemption code ..." />
                    <Button type="primary" onClick={handleSubmitCode}>Submit</Button>
                </Col>
            </Row>
    </div>
  );
};

export default PricePage;
