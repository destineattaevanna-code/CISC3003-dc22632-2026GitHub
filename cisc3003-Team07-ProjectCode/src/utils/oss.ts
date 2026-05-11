import OSS from 'ali-oss';
import axios from 'axios';

const REGION = 'oss-cn-beijing';
const BUCKET = 'paper-gpt';
const URL_EXPIRY_SECONDS = 300;

let cachedCredentials: any = null;
let credentialExpiry = 0;
let tokenFetchFailed = false;

const getCredentials = async () => {
  const now = Date.now();
  if (cachedCredentials && now < credentialExpiry) {
    return cachedCredentials;
  }
  if (tokenFetchFailed && now < credentialExpiry) {
    throw new Error('OSS token fetch previously failed, skipping retry');
  }
  try {
    const res = await axios.post('/api/get_ali_token');
    const data = res.data?.token || res.data;
    if (!data || (!data.accessKeyId && !data.AccessKeyId)) {
      console.warn('[OSS] /api/get_ali_token returned unexpected format:', res.data);
      tokenFetchFailed = true;
      credentialExpiry = now + 60 * 1000;
      throw new Error('Invalid OSS credentials format');
    }
    cachedCredentials = data;
    credentialExpiry = now + 50 * 60 * 1000;
    tokenFetchFailed = false;
    return cachedCredentials;
  } catch (err: any) {
    if (!tokenFetchFailed) {
      console.warn('[OSS] Failed to fetch credentials from /api/get_ali_token:', err?.message || err);
    }
    tokenFetchFailed = true;
    credentialExpiry = Date.now() + 60 * 1000;
    throw err;
  }
};

const createClient = async (): Promise<OSS> => {
  const creds = await getCredentials();
  return new OSS({
    region: REGION,
    accessKeyId: creds.accessKeyId || creds.AccessKeyId,
    accessKeySecret: creds.accessKeySecret || creds.AccessKeySecret,
    stsToken: creds.securityToken || creds.SecurityToken,
    bucket: BUCKET,
    secure: true,
  });
};

const extractArxivId = (pdfUrlOrId: string): string => {
  const m = String(pdfUrlOrId || '').match(/(\d{4}\.\d{4,5}(?:v\d+)?)/);
  return m ? m[1] : String(pdfUrlOrId || '');
};

const VIDEO_CANDIDATES = [
  '1_merage.mp4',
  '1_merge.mp4',
  'video.mp4',
  'merged.mp4',
];

const findVideoInBucket = async (client: OSS, prefix: string): Promise<string | null> => {
  try {
    const result = await (client as any).list({ prefix: `${prefix}/`, 'max-keys': 50 }, {});
    const objects = (result as any)?.objects || (result as any)?.res?.objects || [];
    if (!Array.isArray(objects) || objects.length === 0) return null;
    const mp4 = objects.find((obj: any) =>
      typeof obj.name === 'string' && obj.name.toLowerCase().endsWith('.mp4')
    );
    return mp4?.name || null;
  } catch {
    return null;
  }
};

export const getOssVideoUrl = async (paperId: string): Promise<string | null> => {
  try {
    const client = await createClient();
    const arxivId = extractArxivId(paperId);
    if (!arxivId) return null;

    const videoKey = await findVideoInBucket(client, arxivId);
    if (videoKey) {
      return client.signatureUrl(videoKey, { expires: URL_EXPIRY_SECONDS });
    }

    for (const candidate of VIDEO_CANDIDATES) {
      try {
        await client.head(`${arxivId}/${candidate}`);
        return client.signatureUrl(`${arxivId}/${candidate}`, { expires: URL_EXPIRY_SECONDS });
      } catch {
        // file not found, try next
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const getOssVideoUrlFallback = async (paperId: string): Promise<string | null> => {
  try {
    const client = await createClient();
    const arxivId = extractArxivId(paperId);
    if (!arxivId) return null;
    const baseId = arxivId.replace(/v\d+$/, '');
    if (baseId === arxivId) return null;

    const videoKey = await findVideoInBucket(client, baseId);
    if (videoKey) {
      return client.signatureUrl(videoKey, { expires: URL_EXPIRY_SECONDS });
    }

    for (const candidate of VIDEO_CANDIDATES) {
      try {
        await client.head(`${baseId}/${candidate}`);
        return client.signatureUrl(`${baseId}/${candidate}`, { expires: URL_EXPIRY_SECONDS });
      } catch {
        // file not found, try next
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const getOssCoverUrls = async (
  paperIds: string[]
): Promise<Record<string, string>> => {
  let client: OSS;
  try {
    client = await createClient();
  } catch {
    return {};
  }

  const covers: Record<string, string> = {};
  for (const pid of paperIds) {
    try {
      const arxivId = extractArxivId(pid);
      if (!arxivId) continue;
      covers[pid] = client.signatureUrl(`${arxivId}/thumbnail.jpg`, { expires: URL_EXPIRY_SECONDS });
    } catch {
      // skip
    }
  }
  return covers;
};
