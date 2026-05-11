import React, {useState, useEffect, useRef} from 'react';
import { Layout, Menu, Button, Drawer, Avatar, message, Dropdown, Space, Typography, Badge } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import {
  MenuOutlined, TranslationOutlined, SettingOutlined, LogoutOutlined, SyncOutlined,
  ShoppingCartOutlined, DashboardOutlined, TeamOutlined, ShopOutlined
} from '@ant-design/icons';
import PubSub from 'pubsub-js';
import axios from "axios";

import CheckLogin from "../CheckLogin";

import "./header.css";

const { Header } = Layout;
const { Paragraph, Title } = Typography;

function HeaderComponent() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(false);
    const [nickName, setNickName] = useState("");
    const [Avator, setAvator] = useState("");
    const [quota, setQuota] = useState(0);
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [cartCount, setCartCount] = useState(0)
    const [cartPop, setCartPop] = useState(false)
    const prevCartCountRef = useRef(0)

    function handleLogout() {
        localStorage.removeItem('loginInfo');
        sessionStorage.removeItem('paperInfo');
        PubSub.publish('Login Status', false);
        setIsLogin(false);
        navigate("/")
    };

    function getCredit() {
        setLoading(true);
        axios({
          method: "post",
          url: '/api/get_credit',
          data: {
              "email": email,
          },
        }).then(async function (response) {
            const data = response.data;
            if (data.status === 200) {
                setQuota(data.credit);
                const item = localStorage.getItem('loginInfo');
                if (item === null) return;
                let loginInfo: any;
                try { loginInfo = JSON.parse(item); } catch { return; }
                localStorage.setItem('loginInfo', JSON.stringify({...loginInfo, credit: data.credit}));
            }
        }).catch(() => {
            // silently handle
        }).finally(() => {
            setLoading(false);
        });
    };

    const items: MenuProps['items'] = [
      {
        key: '1',
        label: (
          <div>
              <Title level={5} style={{margin: 0}}>{nickName}</Title>
              <Paragraph style={{margin: 0}}>{email}</Paragraph>
          </div>
        ),
      },
      {
        key: 'dashboard',
        label: (
          <Link to="/dashboard">
            <DashboardOutlined /> Dashboard
          </Link>
        ),
      },
      {
        key: 'orders',
        label: (
          <Link to="/dashboard?tab=orders">
            <ShopOutlined /> Orders &amp; History
          </Link>
        ),
      },
      {
        key: '2',
        label: (
          <Link to="/setting">
            <SettingOutlined /> Setting
          </Link>
        ),
      },
      {
        key: '3',
        label: (
            <div onClick={handleLogout} style={{width: '100%'}}>
                <LogoutOutlined /> Logout
            </div>
        ),
      },
    ];

    function loadCartCount(userEmail: string) {
        if (!userEmail) return;
        axios.get('/api/cart', { params: { email: userEmail } }).then((res) => {
            if (res.data && res.data.status === 200) {
                const count = (res.data.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
                if (count !== prevCartCountRef.current) {
                    if (count > prevCartCountRef.current) {
                        setCartPop(true);
                        setTimeout(() => setCartPop(false), 600);
                    }
                    prevCartCountRef.current = count;
                }
                setCartCount(count);
            }
        }).catch(() => {});
    }

    useEffect(() => {
        window.scrollTo(0, 0);

        const LoginStatus = CheckLogin();
        setIsLogin(LoginStatus);
        if (LoginStatus) {
            const item = localStorage.getItem('loginInfo');
            if (item === null) {
                return;
            }
            let loginInfo: any;
            try { loginInfo = JSON.parse(item); } catch { return; }
            const {nickName, avatarUrl, credit, email} = loginInfo
            setNickName(nickName);
            setAvator(avatarUrl);
            setEmail(email);
            loadCartCount(email);
            axios({
              method: "post",
              url: '/api/get_credit',
              data: {
                  "email": email,
              },
            }).then(async function (response) {
                const data = response.data;
                if (data.status === 200) {
                    setQuota(data.credit);
                    localStorage.setItem('loginInfo', JSON.stringify({...loginInfo, credit: data.credit}));
                } else {
                    setQuota(credit)
                }
            }).catch(function (error) {
                setQuota(credit)
            })
            // wakeup();
        }

        const LoginSub = PubSub.subscribe('Login Status', (msg: string, isLoggedIn: boolean) => {
            if (isLoggedIn) {
                const item = localStorage.getItem('loginInfo');
                if (item === null) {
                    return ;
                }
                let loginInfo: any;
                try { loginInfo = JSON.parse(item); } catch { return; }
                const {nickName, avatarUrl, credit, email} = loginInfo;
                setNickName(nickName);
                setAvator(avatarUrl);
                setEmail(email ?? '');
                setQuota(credit);
                loadCartCount(email ?? '');
            } else {
                setCartCount(0);
            }
            setIsLogin(isLoggedIn);
        });

        const quotaSub = PubSub.subscribe("Quota Status", (msg: string, quota: number) => {
            setQuota(quota)
        })

        const cartSub = PubSub.subscribe("Cart Changed", () => {
            const item = localStorage.getItem('loginInfo');
            if (!item) return;
            try {
                const u = JSON.parse(item);
                if (u && u.email) loadCartCount(u.email);
            } catch {}
        });

        return () => {
            PubSub.unsubscribe(LoginSub);
            PubSub.unsubscribe(quotaSub);
            PubSub.unsubscribe(cartSub);
        }

      }, []);

  return (
    <Header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={`${process.env.PUBLIC_URL}/logo-icon.png`} alt="iSuperviz" className="logo-icon" />
                <span className="logo-text">iSuperviz</span>
            </Link>
            <button
                type="button"
                className="header-cmdk-hint"
                title="Press Ctrl+K to open"
                onClick={() => {
                    const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                    window.dispatchEvent(ev);
                }}
            >
                <span style={{ opacity: 0.7 }}>Quick nav</span>
                <kbd>Ctrl K</kbd>
            </button>
        </div>
        <div className="menu-user">
            {
                isLogin ? (
                    <div style={{display: "flex"}}>
                        <Menu theme="dark" selectedKeys={[]} className="menu" overflowedIndicator={<MenuOutlined/>}>
                            <Link to="/paper"><Menu.Item key="/paper" className="menu-item">Paper</Menu.Item></Link>
                            <Link to="/hallucination"><Menu.Item key="/hallucination" className="menu-item">Hallucination</Menu.Item></Link>
                            <Link to="/shop"><Menu.Item key="/shop" className="menu-item">Shop</Menu.Item></Link>
                            <Link to="/team"><Menu.Item key="/team" className="menu-item">Team</Menu.Item></Link>
                        </Menu>
                        <div style={{borderLeft: "1px solid #b7b7b7"}}></div>
                        <div className="user-info">
                            <div
                                className="credit-loader"
                                onClick={getCredit}
                            >
                                <p style={{fontSize: "16px", width: "max-content", margin: 0}}> Credit: {quota}</p> <SyncOutlined
                                spin={loading}/>
                            </div>
                            <Link to="/cart" className={`header-cart-link ${cartPop ? 'isv-anim-pop' : ''}`} style={{marginRight: 10, marginLeft: 6}}>
                                <Badge count={cartCount} size="small" offset={[-2, 2]}>
                                    <ShoppingCartOutlined style={{fontSize: 20, color: '#fff'}} />
                                </Badge>
                            </Link>
                            <Dropdown menu={{ items }} placement="topRight">
                                <Avatar src={Avator} style={{marginRight: "10px"}}/>
                            </Dropdown>
                        </div>
                    </div>
                ) : (
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <Link to="/team"><Button type="text" style={{color: '#fff'}} icon={<TeamOutlined />}>Team</Button></Link>
                        <Link to="/shop"><Button type="text" style={{color: '#fff'}} icon={<ShopOutlined />}>Shop</Button></Link>
                        <Link to="/login">
                            <Button type='primary' className="user-login">
                                <span className="user-text">Login</span>
                            </Button>
                        </Link>
                    </div>
                )
            }
        </div>
    </Header>
  );
}

export default HeaderComponent;
