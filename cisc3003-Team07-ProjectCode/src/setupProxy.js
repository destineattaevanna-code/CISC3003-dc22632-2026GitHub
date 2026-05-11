// We use http-proxy-middleware v2: `app.use('/api', createProxyMiddleware({...}))`
// which scopes the proxy to /api at the Express layer and lets webpack-dev-server's
// history-API fallback handle every other route (SPA navigation).
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_TARGET || 'http://localhost:4000',
      changeOrigin: true,
    })
  );
};
