import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { installMockAdapter } from './mock/axiosMockAdapter';

installMockAdapter();

// Suppress noisy ResizeObserver errors in development overlay (Chrome known issue).
// See: "ResizeObserver loop limit exceeded" / "ResizeObserver loop completed with undelivered notifications."
if (process.env.NODE_ENV === 'development') {
  const RO_ERROR_RE = /ResizeObserver loop/i;

  // Disable CRA runtime error overlay completely
  import('react-error-overlay')
    .then((overlay: any) => {
      if (typeof overlay.stopReportingRuntimeErrors === 'function') {
        overlay.stopReportingRuntimeErrors();
      }
    })
    .catch(() => {});

  // Fallback: Use MutationObserver to hide any error overlay iframe that appears
  // This catches the overlay even if react-error-overlay import is slow
  const hideOverlayIfResizeObserver = () => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.body) {
          const text = iframeDoc.body.textContent || '';
          if (RO_ERROR_RE.test(text)) {
            iframe.style.display = 'none';
            iframe.remove();
          }
        }
      } catch {
        // Cross-origin iframe, check by id/class patterns
        if (iframe.id?.includes('webpack-dev-server') || 
            iframe.src?.includes('overlay') ||
            !iframe.src) {
          // Check if it just appeared and might be showing ResizeObserver error
          const style = window.getComputedStyle(iframe);
          if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 9999) {
            iframe.style.display = 'none';
          }
        }
      }
    });
  };

  // Observe DOM for overlay iframes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        setTimeout(hideOverlayIfResizeObserver, 50);
        setTimeout(hideOverlayIfResizeObserver, 200);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Intercept via window.onerror
  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (RO_ERROR_RE.test(String(message || '')) || RO_ERROR_RE.test(String((error as any)?.message || ''))) {
      setTimeout(hideOverlayIfResizeObserver, 0);
      return true;
    }
    return prevOnError ? prevOnError.call(window, message, source, lineno, colno, error) : false;
  };

  const prevOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    if (RO_ERROR_RE.test(String((event as PromiseRejectionEvent).reason?.message || (event as PromiseRejectionEvent).reason || ''))) {
      event.preventDefault();
      setTimeout(hideOverlayIfResizeObserver, 0);
      return;
    }
    prevOnUnhandledRejection?.call(window, event);
  };

  // Capture phase listeners
  window.addEventListener('error', (event) => {
    if (RO_ERROR_RE.test(String((event as ErrorEvent).message || '')) ||
        RO_ERROR_RE.test(String((event as ErrorEvent).error?.message || ''))) {
      event.stopImmediatePropagation();
      event.preventDefault();
      setTimeout(hideOverlayIfResizeObserver, 0);
      return false;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (RO_ERROR_RE.test(String(event.reason?.message || event.reason || ''))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && RO_ERROR_RE.test(args[0])) return;
    if (args[0] instanceof Error && RO_ERROR_RE.test(args[0].message)) return;
    originalConsoleError(...args);
  };
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
       <GoogleOAuthProvider clientId="359105765877-0ianufo7hh351revf1stgfugq4gis1h5.apps.googleusercontent.com">
               <App />
       </GoogleOAuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
