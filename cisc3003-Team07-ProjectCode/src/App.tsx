// src/App.tsx
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import ReactGA from "react-ga4";

// 页面组件导入
import Home from './pages/Home';
import Login from './pages/Login';
import Papers from './pages/Paper';
import PaperDetail from './pages/PaperDetail';
import Setting from './pages/Setting';
import IdeaGraph from './pages/IdeaGraph';
import Price from './pages/Price';
import Terms from './pages/Terms';
import Hallucination from './pages/Hallucination';

// 布局组件导入
import Header from "./components/Header";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import Privacy from './pages/Privacy';
import Team from './pages/Team';
import ForgotPassword from './pages/ForgotPassword';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Dashboard from './pages/Dashboard';
import './App.css';
import './animations.css';
import './components/Effects/effects.css';
import './components/Effects/flourish.css';

// Global effects
import ScrollProgress from './components/Effects/ScrollProgress';
import BackToTop from './components/Effects/BackToTop';
import CommandPalette from './components/Effects/CommandPalette';
import Konami from './components/Effects/Konami';
import LoadingScreen from './components/Effects/LoadingScreen';
import PageTransition from './components/Effects/PageTransition';
import HeaderScrollState from './components/Effects/HeaderScrollState';
import CursorLight from './components/Effects/CursorLight';

const { Content } = Layout;

ReactGA.initialize('G-RCXMCT3ZLF');

// 自定义紫色主题
const purpleTheme = {
  token: {
    colorPrimary: '#722ed1',
    colorPrimaryHover: '#9254de',
    colorPrimaryActive: '#531dab',
    colorLink: '#722ed1',
    colorLinkHover: '#9254de',
    colorLinkActive: '#531dab',
    colorTextHeading: '#9254de',
  },
  components: {
    Menu: {
      itemColor: 'inherit',
      itemHoverColor: '#9254de',
      itemSelectedColor: '#722ed1',
      itemSelectedBg: '#f9f0ff',
      activeBarWidth: 0,
    },
  },
};

const App: React.FC = () => {
  return (
    <ConfigProvider theme={purpleTheme}>
      <LoadingScreen />
      <Router>
        {/* Global UI effects */}
        <HeaderScrollState />
        <ScrollProgress />
        <BackToTop />
        <CommandPalette />
        <Konami />
        <CursorLight />

        <Layout style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#f5f5f5',
        }}>
          {/* 头部导航栏 */}
          <Header />

          {/* 主要内容区域 — scroll is owned by html/body so the sticky header
              never fights an inner scroll container (fixes the header-jitter
              symptom on PaperDetail + double-scrollbar on Home). */}
          <Content style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 4% 0',
          }}>
            <ErrorBoundary>
              <PageTransition>
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/paper" element={<Papers />} />
                <Route path="/setting" element={<Setting />} />
                <Route path="/reflectiveNotes" element={<PaperDetail />} />
                <Route path="/idea-graph" element={<IdeaGraph />} />
                <Route path="/price" element={<Price />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/hallucination" element={<Hallucination />} />
                <Route path="/team" element={<Team />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PageTransition>
            </ErrorBoundary>
          </Content>

          {/* 底部页脚 */}
          <Footer />
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;
