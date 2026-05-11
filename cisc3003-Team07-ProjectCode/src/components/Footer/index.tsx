import React from 'react';
import { Layout, Typography } from 'antd';
import { GithubOutlined, MailOutlined } from '@ant-design/icons';

import "./footer.css";

const { Footer } = Layout;
const { Text } = Typography;

function FooterComponent() {
  return (
    <Footer id="footer">
      <div className="footer-inner">
        <Text type="secondary" className="footer-left">
          © 2026 iSuperviz. All Rights Reserved.
        </Text>
        <div className="footer-right">
          <a href="/team">Team 07</a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>
          <a href="https://github.com/MagicianChen/iSuperviz" target="_blank" rel="noopener noreferrer" title="GitHub" className="footer-icon-link">
            <GithubOutlined />
          </a>
          <a href="mailto:q1218605102@gmail.com" title="Contact us" className="footer-icon-link">
            <MailOutlined />
          </a>
        </div>
      </div>
    </Footer>
  );
}

export default FooterComponent;
