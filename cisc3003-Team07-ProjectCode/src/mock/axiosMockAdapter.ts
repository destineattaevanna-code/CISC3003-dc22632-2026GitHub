import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { handleMockRequest } from './mockApi';

// If this env var is set at build time (e.g. GitHub Pages build) we short-circuit
// straight to the mock instead of making a failing network request first.
// Users can also override at runtime via ?mock=1 query or localStorage('isv_mock','1').
const BUILD_FORCE_MOCK = process.env.REACT_APP_FORCE_MOCK === '1';

function runtimeForceMock(): boolean {
  if (BUILD_FORCE_MOCK) return true;
  try {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).get('mock') === '1') {
      try { localStorage.setItem('isv_mock', '1'); } catch {}
      return true;
    }
    if (localStorage.getItem('isv_mock') === '1') return true;
    // Default: on github.io deployment, there's no backend → force mock.
    if (window.location.hostname.endsWith('.github.io')) return true;
  } catch {}
  return false;
}

let MOCK_STATE: boolean | null = null;

function shouldUseMock(): boolean {
  if (MOCK_STATE === null) MOCK_STATE = runtimeForceMock();
  return MOCK_STATE;
}

async function runMock<T = any>(config: AxiosRequestConfig): Promise<{ data: any; status: number; config: AxiosRequestConfig }> {
  const url = typeof config.url === 'string' ? config.url : '';
  const method = (config.method || 'get').toUpperCase();

  // If the caller used a FormData object (e.g. hallucination_check), convert it to a plain object.
  let data: any = config.data;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const obj: Record<string, any> = {};
    data.forEach((v: any, k: string) => {
      if (typeof File !== 'undefined' && v instanceof File) obj.file_name = v.name;
      else if (k === 'options') {
        try { obj.options = JSON.parse(String(v)); } catch { obj.options = []; }
      } else obj[k] = v;
    });
    data = obj;
  } else if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { /* leave as-is */ }
  }

  const payload = handleMockRequest(method, url + (config.params ? `?${new URLSearchParams(config.params as any).toString()}` : ''), data);
  // Simulate a tiny latency for realism
  await new Promise((r) => setTimeout(r, 80));
  return { data: payload, status: 200, config: config as any };
}

let installed = false;
export function installMockAdapter() {
  if (installed) return;
  installed = true;

  axios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const url = typeof config.url === 'string' ? config.url : '';
    if (!url.startsWith('/api/')) return config;

    if (shouldUseMock()) {
      // @ts-expect-error we stash the mock payload on config to pick it up below
      config.__mockBypass = true;
      // Use an adapter shortcut.
      (config as any).adapter = async (cfg: AxiosRequestConfig) => {
        const { data, status, config: cfgOut } = await runMock(cfg);
        return { data, status, statusText: 'OK', headers: {}, config: cfgOut as any, request: null };
      };
    }
    return config;
  });

  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      const cfg: InternalAxiosRequestConfig | undefined = error?.config;
      const url = cfg && typeof cfg.url === 'string' ? cfg.url : '';
      if (!url.startsWith('/api/')) throw error;

      const status = error?.response?.status;
      // Network error (no response) or server said 404/502/503 → try mock fallback
      const shouldFallback =
        !error.response ||
        status === 404 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 500;

      if (!shouldFallback) throw error;

      // Remember we should use mock for subsequent requests too
      MOCK_STATE = true;
      try { localStorage.setItem('isv_mock', '1'); } catch {}
      const { data, status: st } = await runMock(cfg!);
      return { data, status: st, statusText: 'OK', headers: {}, config: cfg as any, request: null };
    }
  );
}

export function forceMockMode(on: boolean = true) {
  MOCK_STATE = on;
  try { localStorage.setItem('isv_mock', on ? '1' : '0'); } catch {}
}
