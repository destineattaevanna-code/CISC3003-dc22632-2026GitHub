// src/pages/Paper/index.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import PubSub from 'pubsub-js';
import {
  ReloadOutlined,
  SmileOutlined,
  VideoCameraOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  StarFilled,
  StarOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  Pagination,
  Typography,
  Button,
  Row,
  Col,
  message,
  Flex,
  Spin,
  Switch,
  Input,
  InputNumber,
  Result,
  Tag,
  Space,
  Avatar,
  Popover,
  Tooltip,
} from 'antd';
import 'antd/dist/reset.css';
import { latexToHtml, hasLatex, cleanLatexAccents } from '../../utils/latex';
import { getOssCoverUrls, getOssVideoUrl, getOssVideoUrlFallback } from '../../utils/oss';
import './paper.css';

const { Search } = Input;
const { Text, Title } = Typography;
const PAPER_ACTION_CREDIT_COST = 10;

const stripHighlightTags = (text: string): string =>
  text.replace(/<\/?highlight>/gi, '');

interface Paper {
  paper_id: number;
  title: string;
  author: string;
  abstract: string;
  pdf_url: string;
  upload_date: string;
  topic: string;
  video_url?: string;
  thumbnail_url?: string;
  has_video?: boolean;
  tags?: string[];
  conference?: string;
  year?: number;
  read_count?: number;
  view_count?: number;
  video_duration?: string;
  channel_name?: string;
  channel_avatar?: string;
  published_time?: string;
  excerpt?: string;
}

const Papers: React.FC = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [searchWord, setSearchWord] = useState<string>("");
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [abstractExpanded, setAbstractExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [searchTopic, setSearchTopic] = useState<string>("All Papers");
  const [fetchingPapers, setFetchingPapers] = useState(false);
  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
  const [gotoPageValue, setGotoPageValue] = useState<number | null>(null);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const allPapersLoadedRef = useRef(false);
  const [ossCoverUrls, setOssCoverUrls] = useState<Record<string, string>>({});
  const [ossVideoUrl, setOssVideoUrl] = useState<string>('');
  const ossVideoPaperRef = useRef<string>('');
  const [videoStatus, setVideoStatus] = useState<'checking' | 'ready' | 'unavailable'>('unavailable');
  const [coverFailed, setCoverFailed] = useState<Record<string, boolean>>({});
  const videoFallbackTriedRef = useRef<string>('');
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());
  const [creditAction, setCreditAction] = useState<'explore' | 'download' | null>(null);

  const mapPaperData = (paper: Paper): Paper => {
    const cleanTitle = stripHighlightTags(paper.title || '');
    return {
      ...paper,
      title: cleanTitle,
      author: cleanLatexAccents(paper.author || ''),
      view_count:
        (typeof paper.read_count === 'number' ? paper.read_count : undefined) ??
        (typeof paper.view_count === 'number' ? paper.view_count : 0),
      video_duration: paper.video_duration || '',
      channel_name: paper.author || '',
      channel_avatar: '',
      published_time: paper.upload_date || '',
    };
  };

  const consumePaperCredit = async (item: Paper, action: 'explore' | 'download') => {
    const loginInfoStr = localStorage.getItem('loginInfo');
    if (!loginInfoStr) {
      message.info('Please login first!');
      navigate('/login');
      return null;
    }

    let loginInfo: any;
    try {
      loginInfo = JSON.parse(loginInfoStr);
    } catch {
      message.error('Failed to parse login information. Please login again.');
      navigate('/login');
      return null;
    }

    setCreditAction(action);
    try {
      const res = await axios.post('/api/consume_credit', {
        email: loginInfo.email,
        amount: PAPER_ACTION_CREDIT_COST,
        reason: action === 'explore' ? 'Explore paper' : 'Download PDF',
        paperId: item.paper_id,
        paperTitle: item.title,
      });
      const data = res.data;
      if (data.status === 200) {
        const updatedLoginInfo = { ...loginInfo, credit: data.credit };
        localStorage.setItem('loginInfo', JSON.stringify(updatedLoginInfo));
        PubSub.publish('Quota Status', data.credit);
        message.success(`${PAPER_ACTION_CREDIT_COST} credits used. Remaining: ${data.credit}`);
        return data.credit;
      }
      if (data.status === 403) {
        message.warning(data.message || 'Not enough credits for this action.');
        return null;
      }
      message.error(data.message || 'Failed to use credits.');
      return null;
    } catch {
      message.error('Failed to use credits. Please try again.');
      return null;
    } finally {
      setCreditAction(null);
    }
  };

  const handleNavigate = async (item: Paper) => {
    const remainingCredit = await consumePaperCredit(item, 'explore');
    if (remainingCredit === null) return;
    sessionStorage.setItem('returningFromNotes', 'true');
    navigate('/reflectiveNotes', { state: { item: item } });
  };

  const handleDownloadPdf = async (item: Paper) => {
    const pdfUrl = item.pdf_url?.replace('abs', 'pdf');
    if (!pdfUrl) {
      message.warning('PDF link is not available for this paper.');
      return;
    }

    const popup = window.open('', '_blank');
    const remainingCredit = await consumePaperCredit(item, 'download');
    if (remainingCredit === null) {
      popup?.close();
      return;
    }
    if (popup) {
      popup.location.href = pdfUrl;
    } else {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const loadAllPapers = useCallback(() => {
    if (allPapersLoadedRef.current) return;
    const item = localStorage.getItem('loginInfo');
    if (!item) return;
    try {
      const loginInfo = JSON.parse(item);
      axios.post('/api/get_paper_info', {
        page: 1,
        email: loginInfo['email'],
        pageSize: 10000,
        favorite: loginInfo['favorite'],
        filterFavorite: false,
        searchWord: '',
      }).then(response => {
        if (response.data.status === 200 && Array.isArray(response.data.paperList)) {
          setAllPapers(response.data.paperList.map(mapPaperData));
          allPapersLoadedRef.current = true;
        }
      }).catch(() => {
        message.warning('Failed to load full paper index. Search may be limited.');
      });
    } catch {}
  }, []);

  const fetchPapers = (page: number, checkedFavorite?: boolean, searchValue?: string) => {
    const item = localStorage.getItem('loginInfo');
    if (item === null) {
      navigate('/login');
      return;
    }

    try {
      const loginInfo = JSON.parse(item);
      const params = {
        page: page,
        email: loginInfo['email'],
        pageSize: window.innerWidth > 576 ? 20 : 10,
        favorite: loginInfo['favorite'],
        filterFavorite: checkedFavorite === undefined ? filterFavorite : checkedFavorite,
        searchWord: searchValue === undefined ? searchWord : searchValue,
      };

      axios.post('/api/get_paper_info', params)
        .then(response => {
          if (response.data.status === 200) {
            const rawList = Array.isArray(response.data.paperList) ? response.data.paperList : [];
            const papersData = rawList.map(mapPaperData);

            setPapers(papersData);
            setTotalItems(response.data.totalPaper);
            setFetchingPapers(Boolean(response.data.fetchingPapers));

            if (papersData.length > 0) {
              const savedPaperId = sessionStorage.getItem('selectedPaperId');
              if (savedPaperId) {
                const savedPaper = papersData.find((p: Paper) => p.paper_id === parseInt(savedPaperId));
                if (savedPaper) {
                  setSelectedPaper(savedPaper);
                } else {
                  setSelectedPaper(papersData[0]);
                }
              } else {
                setSelectedPaper(papersData[0]);
              }
            }

            sessionStorage.setItem('paperInfo', JSON.stringify({
              totalPaper: response.data.totalPaper,
              currentPapers: papersData,
              currentPage: page
            }));
            setLoading(false);
          } else {
            message.error(response.data.message);
            setLoading(false);
          }
        })
        .catch(error => {
          message.error('Something wrong. Please contact us through E-mail or Twitter!');
          setLoading(false);
        });
    } catch (error) {
      message.error('Failed to parse login information. Please login again.');
      navigate('/login');
    }
  };

  useEffect(() => {
    const returningFromNotes = sessionStorage.getItem('returningFromNotes') === 'true';
    if (returningFromNotes) {
      sessionStorage.removeItem('returningFromNotes');
    }

    const item = sessionStorage.getItem('paperInfo');
    const loginItem = localStorage.getItem('loginInfo');
    if (loginItem === null) {
      navigate('/login');
      return;
    }

    try {
      const loginInfo = JSON.parse(loginItem);
      if (!loginInfo['area'] || !loginInfo['summaryList']) {
        navigate('/setting');
        return;
      }

      const favArr = Array.isArray(loginInfo['favorite'])
        ? loginInfo['favorite']
        : typeof loginInfo['favorite'] === 'string'
          ? (() => { try { return JSON.parse(loginInfo['favorite']); } catch { return []; } })()
          : [];
      setFavoriteSet(new Set(favArr.map(String)));

      if (item === null) {
        fetchPapers(1);
      } else {
        const paperInfo = JSON.parse(item);
        fetchPapers(paperInfo['currentPage']);
        setCurrentPage(paperInfo['currentPage']);
      }
    } catch (error) {
      message.error('Failed to parse login information. Please login again.');
      navigate('/login');
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [location.pathname]);

  useEffect(() => {
    if (selectedPaper) {
      sessionStorage.setItem('selectedPaperId', selectedPaper.paper_id.toString());
    }
  }, [selectedPaper]);

  useEffect(() => {
    if (!loading && totalItems > 0) {
      loadAllPapers();
    }
  }, [loading, totalItems, loadAllPapers]);

  const fetchSavedIdeas = useCallback(async (paper: Paper | null) => {
    if (!paper) {
      setSavedIdeas([]);
      return;
    }
    try {
      const loginItem = localStorage.getItem('loginInfo');
      if (!loginItem) {
        setSavedIdeas([]);
        return;
      }
      const loginInfo = JSON.parse(loginItem);
      const email = loginInfo?.email;

      if (!email) {
        setSavedIdeas([]);
        return;
      }

      const res = await axios.post('/api/get_ideas', {
        paperId: String(paper.paper_id),
        userId: email,
      });
      const data = res.data;
      const saved = Array.isArray(data?.savedIdeas) ? data.savedIdeas : [];
      const defaultIdeas = Array.isArray(data?.defaultIdeas) ? data.defaultIdeas : [];
      const allIdeas = [...saved, ...defaultIdeas.filter((d: any) => d?.isSaved)];

      if (allIdeas.length > 0) {
        setSavedIdeas(allIdeas);
        return;
      }

      const ideas = Array.isArray(data?.ideas) ? data.ideas : [];
      const filtered = ideas.filter((i: any) => i?.isSaved);
      if (filtered.length > 0) {
        setSavedIdeas(filtered);
        return;
      }

      // 没有任何已保存的 idea 时，保持为空，由 UI 显示 "No saved ideas yet"
      setSavedIdeas([]);
    } catch {
      setSavedIdeas([]);
    }
  }, []);

  // Re-fetch saved ideas when selectedPaper changes
  useEffect(() => {
    fetchSavedIdeas(selectedPaper);
  }, [selectedPaper, fetchSavedIdeas]);

  // Fetch OSS video for the selected paper
  useEffect(() => {
    if (!selectedPaper) {
      setOssVideoUrl('');
      ossVideoPaperRef.current = '';
      videoFallbackTriedRef.current = '';
      return;
    }
    if (selectedPaper.video_url) return;

    const key = String(selectedPaper.pdf_url || selectedPaper.paper_id || '');
    if (!key || key === ossVideoPaperRef.current) return;
    ossVideoPaperRef.current = key;
    videoFallbackTriedRef.current = '';
    setOssVideoUrl('');

    getOssVideoUrl(key).then(url => {
      if (ossVideoPaperRef.current === key && url) {
        setOssVideoUrl(url);
      }
    }).catch(() => {});
  }, [selectedPaper]);

  // Re-fetch (or clear) saved ideas when login status changes
  useEffect(() => {
    const sub = PubSub.subscribe('Login Status', (_msg: string, isLoggedIn: boolean) => {
      if (isLoggedIn) {
        fetchSavedIdeas(selectedPaper);
      } else {
        setSavedIdeas([]);
      }
    });
    return () => { PubSub.unsubscribe(sub); };
  }, [fetchSavedIdeas, selectedPaper]);

  // Navigate to idea in graph
  const handleNavigateToIdea = (ideaId: string) => {
    navigate('/idea-graph', { state: { highlightIdeaId: ideaId } });
  };

  // Unsave idea directly from the hover popover
  const handleUnsaveIdeaFromPopover = async (ideaIdStr: string) => {
    const ideaId = Number(ideaIdStr);
    if (!ideaId || Number.isNaN(ideaId)) return;
    try {
      const loginItem = localStorage.getItem('loginInfo');
      if (!loginItem) return;
      const loginInfo = JSON.parse(loginItem);
      const email = loginInfo?.email;
      if (!email) return;

      const res = await axios.post('/api/unsave_idea', { email, ideaId });
      if (res.data?.status === 200) {
        setSavedIdeas(prev =>
          prev.filter((it: any) => String(it?.ideaId ?? it?.idea_id ?? it?.id ?? '') !== String(ideaId))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleSearch = (value: string) => {
    if (value.trim()) {
      const shortTopic = getShortTopic(value);
      setSearchTopic(shortTopic);
    } else {
      setSearchTopic("All Papers");
    }

    setSearchWord(value);

    if (!value.trim()) {
      setCurrentPage(1);
      fetchPapers(1, filterFavorite, '');
    }
  };

  const getShortTopic = (searchTerm: string): string => {
    const lc = searchTerm.toLowerCase();
    const terms = lc.split(' ');

    if (lc.includes('reinforcement') || terms.includes('rl'))
      return 'Reinforcement Learning';
    if (lc.includes('deep learning') || terms.includes('dl'))
      return 'Deep Learning';
    if (lc.includes('machine learning') || terms.includes('ml'))
      return 'Machine Learning';
    if (terms.includes('neural') || terms.includes('network'))
      return 'Neural Networks';
    if (terms.includes('computer') && terms.includes('vision') || terms.includes('cv'))
      return 'Computer Vision';
    if (lc.includes('natural language') || terms.includes('nlp'))
      return 'NLP';
    if (terms.includes('transformer') || terms.includes('attention'))
      return 'Transformers';
    if (terms.includes('diffusion'))
      return 'Diffusion Models';
    if (terms.includes('llm') || lc.includes('large language'))
      return 'LLMs';
    if (terms.includes('graph') || terms.includes('gnn'))
      return 'Graph Neural Networks';
    if (terms.includes('robotics') || terms.includes('robot'))
      return 'Robotics';
    if (terms.includes('optimization') || terms.includes('optimize'))
      return 'Optimization';
    if (terms.includes('generative') && terms.includes('ai'))
      return 'Generative AI';
    if (searchTerm.length > 15)
      return `${searchTerm.substring(0, 12)}...`;
    return searchTerm;
  };

  const filterPaper = (checked: boolean) => {
    setFilterFavorite(checked);
    setCurrentPage(1);
    fetchPapers(1, checked, searchWord);
  };

  const handlePageChange = (page: number) => {
    fetchPapers(page, filterFavorite, searchWord);
    setCurrentPage(page);
  };

  const handleReload = () => {
    setLoading(true);
    fetchPapers(currentPage, filterFavorite, searchWord);
  };

  const toggleFavorite = (paperId: number) => {
    const loginInfoStr = localStorage.getItem('loginInfo');
    if (!loginInfoStr) { message.info('Please login first!'); return; }
    let loginInfo: any;
    try { loginInfo = JSON.parse(loginInfoStr); } catch { return; }
    const idStr = String(paperId);
    const isFav = favoriteSet.has(idStr);
    axios.post('/api/eidt_favorite', {
      email: loginInfo['email'],
      action: isFav ? 1 : 0,
      paper_id: paperId
    }).then(response => {
      if (response.data.status === 200) {
        const newLoginInfo = { ...loginInfo, favorite: response.data.favorite };
        localStorage.setItem('loginInfo', JSON.stringify(newLoginInfo));
        const newFavArr = Array.isArray(response.data.favorite) ? response.data.favorite : [];
        setFavoriteSet(new Set(newFavArr.map(String)));
        message.success(isFav ? 'Removed from favorites' : 'Added to favorites');
      } else {
        message.error('Failed to update favorites.');
      }
    }).catch(() => { message.error('Failed to update favorites.'); });
  };

  const getPageSize = () => (window.innerWidth > 576 ? 20 : 10);
  const getTotalPages = () => Math.max(1, Math.ceil(totalItems / getPageSize()));

  const handleGotoPage = () => {
    const totalPages = getTotalPages();
    if (gotoPageValue == null || gotoPageValue < 1 || gotoPageValue > totalPages || !Number.isInteger(gotoPageValue)) {
      message.warning(`Please enter a valid page number (1 - ${totalPages})`);
      return;
    }
    handlePageChange(gotoPageValue);
    setGotoPageValue(null);
  };

  const displayPapers = useMemo(() => {
    const term = searchWord.trim().toLowerCase();
    if (!term) return papers;
    const source = allPapers.length > 0 ? allPapers : papers;
    return source.filter(p =>
      p.title.toLowerCase().includes(term) ||
      (p.author || '').toLowerCase().includes(term) ||
      (p.topic || '').toLowerCase().includes(term) ||
      (p.tags || []).some(t => t.toLowerCase().includes(term))
    );
  }, [papers, allPapers, searchWord]);

  useEffect(() => {
    if (displayPapers.length > 0) {
      const isInList = selectedPaper && displayPapers.some(p => p.paper_id === selectedPaper.paper_id);
      if (!isInList) {
        setSelectedPaper(displayPapers[0]);
      }
    }
  }, [displayPapers]);

  // Fetch OSS cover URLs for displayed papers (covers only; videos fetched on select)
  useEffect(() => {
    if (!displayPapers.length) return;
    const pdfIds = displayPapers
      .map(p => String(p.pdf_url || p.paper_id || ''))
      .filter(Boolean);
    if (!pdfIds.length) return;

    setCoverFailed({});
    getOssCoverUrls(pdfIds).then(covers => {
      if (Object.keys(covers).length > 0) setOssCoverUrls(prev => ({ ...prev, ...covers }));
    }).catch(() => {});
  }, [displayPapers]);

  const effectiveVideoUrl = useMemo(() => {
    if (!selectedPaper) return '';
    return (selectedPaper.video_url && selectedPaper.video_url.trim()) || ossVideoUrl || '';
  }, [selectedPaper, ossVideoUrl]);

  useEffect(() => {
    setVideoStatus(effectiveVideoUrl ? 'checking' : 'unavailable');
  }, [effectiveVideoUrl]);

  const handleSelectPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    setAbstractExpanded(false);
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      const v = (count / 1000000).toFixed(1);
      return `${v.endsWith('.0') ? v.slice(0, -2) : v}M`;
    } else if (count >= 1000) {
      // >1000 show K
      const v = (count / 1000).toFixed(1);
      return `${v.endsWith('.0') ? v.slice(0, -2) : v}K`;
    }
    return count.toString();
  };

  const renderDetailSection = () => {
    if (!selectedPaper) {
      return (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#999',
          paddingBottom: 24
        }}>
          <Title level={4}>Select a paper to view details</Title>
          <Text>Choose a paper from the list on the left to watch the video and read the abstract.</Text>
        </div>
      );
    }

    const pdfKey = String(selectedPaper.pdf_url || selectedPaper.paper_id || '');
    const effectiveThumbnail = selectedPaper.thumbnail_url || ossCoverUrls[pdfKey] || '';
    const hasVideo = videoStatus === 'ready';

    return (
      <div className="video-detail-section" style={{ paddingBottom: 24, overflowX: 'hidden' }}>
        {effectiveVideoUrl && videoStatus !== 'unavailable' && (
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: hasVideo ? 16 : 0,
            background: '#000',
            height: hasVideo ? 'auto' : 0,
          }}>
            <video
              key={effectiveVideoUrl}
              src={effectiveVideoUrl}
              poster={effectiveThumbnail || undefined}
              controls
              preload="auto"
              crossOrigin="anonymous"
              style={{ width: '100%', height: isMobile ? 240 : 400, display: 'block' }}
              onLoadedMetadata={() => setVideoStatus('ready')}
              onError={() => {
                const key = String(selectedPaper?.pdf_url || selectedPaper?.paper_id || '');
                if (key && videoFallbackTriedRef.current !== key) {
                  videoFallbackTriedRef.current = key;
                  getOssVideoUrlFallback(key).then(fallbackUrl => {
                    if (fallbackUrl && ossVideoPaperRef.current === key) {
                      setOssVideoUrl(fallbackUrl);
                      setVideoStatus('checking');
                    } else {
                      setVideoStatus('unavailable');
                    }
                  }).catch(() => setVideoStatus('unavailable'));
                } else {
                  setVideoStatus('unavailable');
                }
              }}
            />
          </div>
        )}

        <div style={{ padding: 0 }}>
          <Flex align="center" wrap="wrap" gap={8} style={{ marginBottom: 8 }}>
            <Title level={3} style={{ marginBottom: 0, flex: 1 }}>
              {hasLatex(selectedPaper.title)
                ? <span dangerouslySetInnerHTML={{ __html: latexToHtml(selectedPaper.title) }} />
                : selectedPaper.title}
            </Title>
            <Tooltip title={favoriteSet.has(String(selectedPaper.paper_id)) ? 'Remove from favorites' : 'Add to favorites'}>
              <Button
                type="text"
                icon={favoriteSet.has(String(selectedPaper.paper_id))
                  ? <StarFilled style={{ fontSize: 22, color: '#faad14' }} />
                  : <StarOutlined style={{ fontSize: 22, color: '#999' }} />}
                onClick={() => toggleFavorite(selectedPaper.paper_id)}
                style={{ flexShrink: 0, padding: '0 4px' }}
              />
            </Tooltip>
            {hasVideo && (
              <Tag
                color="blue"
                icon={<VideoCameraOutlined />}
                style={{ flexShrink: 0 }}
              >
                Video
              </Tag>
            )}
          </Flex>

          <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <Flex align="center" gap={12}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {selectedPaper.view_count ? `${formatViewCount(selectedPaper.view_count)} views` : ''}
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {selectedPaper.published_time}
              </Text>
            </Flex>

            {/* Right side: keep tags, and place quick-access buttons near the far right */}
            <Flex align="center" gap={10} className="paper-meta-right">
              <Space>
                {selectedPaper.year && <Tag color="blue">{selectedPaper.year}</Tag>}
                {selectedPaper.conference && <Tag color="green">{selectedPaper.conference}</Tag>}
              </Space>

              {/* Quick Access Buttons */}
              <div className="quick-access-buttons">
                {/* Recommended Papers Button - Purple */}
                {/*
                <Popover
                  trigger="hover"
                  placement="bottomRight"
                  overlayClassName="quick-access-ant-popover quick-access-ant-popover-purple"
                  getPopupContainer={() => document.body}
                  content={(
                    <div className="quick-access-popover-content">
                      <div className="popover-title">Recommended Papers</div>
                      {papers.filter((p: Paper) => p.paper_id !== selectedPaper.paper_id).length > 0 ? (
                        papers
                          .filter((p: Paper) => p.paper_id !== selectedPaper.paper_id)
                          .slice(0, 6)
                          .map((paper: Paper) => (
                            <div
                              key={paper.paper_id}
                              className="popover-item"
                              onClick={() => handleSelectPaper(paper)}
                            >
                              <div className="popover-thumb-wrap">
                                {paper.thumbnail_url ? (
                                  <img src={paper.thumbnail_url} alt="" className="popover-item-thumb" />
                                ) : (
                                  <div className="popover-item-thumb placeholder">
                                    <VideoCameraOutlined />
                                  </div>
                                )}
                                {paper.video_duration && (
                                  <div className="popover-thumb-duration">{paper.video_duration}</div>
                                )}
                              </div>
                              <div className="popover-item-content">
                                <div className="popover-item-title">{paper.title}</div>
                                <div className="popover-item-meta">
                                  {paper.author} · {paper.year || paper.upload_date}
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="popover-empty">No recommendations available</div>
                      )}
                    </div>
                  )}
                >
                  <button className="quick-access-btn purple-btn">
                    <span className="btn-text">Recommended Papers</span>
                  </button>
                </Popover>
                */}

                {/* Saved Ideas Button - Gold */}
                <Popover
                  trigger="hover"
                  placement="topRight"
                  overlayClassName="quick-access-ant-popover quick-access-ant-popover-gold"
                  getPopupContainer={() => document.body}
                  content={(
                    <div className="quick-access-popover-content">
                      <div className="popover-title">Saved Ideas</div>
                      {savedIdeas.length > 0 ? (
                        savedIdeas.slice(0, 14).map((idea: any, idx: number) => {
                          const ideaId = String(idea?.ideaId ?? idea?.idea_id ?? idea?.id ?? '');
                          const ideaText = String(idea?.idea ?? idea?.text ?? idea?.content ?? '');
                          const title = (ideaText.split('\n')[0] || '').trim();
                          const created = String(idea?.updateAt ?? idea?.updatedAt ?? idea?.createdAt ?? '');
                          return (
                          <div
                            key={ideaId || `idea-${idx}`}
                            className="popover-item popover-item-idea"
                            onClick={() => {
                              if (!ideaId) return;
                              handleNavigateToIdea(ideaId);
                            }}
                          >
                            <span
                              className="popover-item-action"
                              title="Unsave"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!ideaId) return;
                                handleUnsaveIdeaFromPopover(ideaId);
                              }}
                            >
                              <StarFilled />
                            </span>
                            <div className="popover-item-content">
                              <div className="popover-item-title">
                                {title.slice(0, 120) || 'Untitled Idea'}
                              </div>
                              <div className="popover-item-meta">
                                {created || 'No date'}
                              </div>
                            </div>
                          </div>
                          );
                        })
                      ) : (
                        <div className="popover-empty">No saved ideas yet</div>
                      )}
                    </div>
                  )}
                >
                  <button className="quick-access-btn gold-btn">
                    <span className="btn-text">
                      <span className="glowing-bulb-wrapper">
                        <BulbOutlined className="glowing-bulb-icon" />
                      </span>
                      Ideas
                    </span>
                  </button>
                </Popover>
              </div>
            </Flex>
          </Flex>

          <div style={{
            padding: 12,
            backgroundColor: '#f9f9f9',
            borderRadius: 8,
            marginBottom: 16
          }}>
            {(() => {
              const authorStr = selectedPaper.author || selectedPaper.channel_name || '';
              const authors = authorStr.split(/,\s*/g).filter(Boolean);
              const MAX_SHOW = 3;
              const visible = authors.slice(0, MAX_SHOW);
              const hidden = authors.slice(MAX_SHOW);
              const hasHidden = hidden.length > 0;
              return (
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
                <Tooltip
                  title={hasHidden ? authors.join(', ') : undefined}
                  placement="bottom"
                  overlayStyle={{ maxWidth: 400 }}
                >
                  <Avatar
                    size={40}
                    style={{ backgroundColor: '#9254de', flexShrink: 0 }}
                    className={hasHidden ? 'author-avatar-has-more' : ''}
                  >
                    {authors[0]?.[0] || 'R'}
                  </Avatar>
                </Tooltip>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <Text strong style={{ fontSize: 15, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {visible.join(', ')}
                    {hasHidden && (
                      <span style={{ color: '#9254de', fontSize: 12, fontWeight: 400 }}>
                        {' '}+{hidden.length} more
                      </span>
                    )}
                  </Text>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {selectedPaper.upload_date}
                  </div>
                </div>
              </Flex>
              <Flex gap={8}>
                <Button
                  type="primary"
                  onClick={() => handleNavigate(selectedPaper)}
                  loading={creditAction === 'explore'}
                  disabled={creditAction !== null}
                >
                  Explore (-10 credits)
                </Button>
                <Button
                  onClick={() => handleDownloadPdf(selectedPaper)}
                  loading={creditAction === 'download'}
                  disabled={creditAction !== null}
                >
                  Download PDF (-10 credits)
                </Button>
              </Flex>
            </Flex>
              );
            })()}
          </div>

          {selectedPaper.abstract && (
            <div style={{
              padding: 16,
              backgroundColor: '#f9f9f9',
              borderRadius: 8,
              marginBottom: 16
            }}>
              <div style={{ marginBottom: 12 }}>
                <Title level={5} style={{ marginBottom: 8 }}>
                  Abstract
                </Title>
                <Flex wrap="wrap" gap={4}>
                  {selectedPaper.tags?.slice(0, 5).map((tag: string) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Flex>
              </div>

              <div style={{
                position: 'relative',
                maxHeight: hasVideo ? (abstractExpanded ? 'none' : 120) : 'none',
                overflow: hasVideo ? 'hidden' : 'visible'
              }}>
                <div
                  style={{ fontSize: 14, lineHeight: 1.6, color: '#333' }}
                  dangerouslySetInnerHTML={{ __html: latexToHtml(selectedPaper.abstract) }}
                />

                {hasVideo && !abstractExpanded && selectedPaper.abstract.length > 200 && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 60,
                    background: 'linear-gradient(to top, rgba(249,249,249,1), rgba(249,249,249,0))'
                  }} />
                )}
              </div>

              {hasVideo && selectedPaper.abstract.length > 200 && (
                <Button
                  type="link"
                  onClick={() => setAbstractExpanded(!abstractExpanded)}
                  style={{
                    padding: 0,
                    marginTop: 8,
                    color: '#1890ff',
                    fontSize: 13
                  }}
                >
                  {abstractExpanded ? 'Show less' : 'Show more'}
                </Button>
              )}
            </div>
          )}

          {/* Hand-curated excerpt — a ~120-word passage synthesised from the
              paper's real introduction/method so the reader gets a feel for
              the actual article. */}
          {selectedPaper.excerpt && (
            <div
              style={{
                padding: '16px 18px',
                background: 'linear-gradient(135deg,#faf5ff 0%,#fff0f6 100%)',
                border: '1px solid #efdbff',
                borderRadius: 10,
                marginBottom: 16,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#722ed1',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: 999,
                    background: 'linear-gradient(135deg,#722ed1 0%,#eb2f96 100%)',
                  }}
                />
                Paper excerpt
              </div>
              <div
                style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}
                dangerouslySetInnerHTML={{ __html: latexToHtml(selectedPaper.excerpt) }}
              />
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 6,
                  fontSize: 12,
                  color: '#9254de',
                }}
              >
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleDownloadPdf(selectedPaper)}
                  loading={creditAction === 'download'}
                  disabled={creditAction !== null}
                  style={{ color: 'inherit', padding: 0, height: 'auto' }}
                >
                  Download full PDF (-10 credits) →
                </Button>
              </div>
            </div>
          )}

          {/* Recommended Papers section removed per request */}
        </div>
      </div>
    );
  };

  return (
    <div className='paper-container isv-cursor-light'>
      {/* 顶部工具栏 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 12px' }}>
          <Row gutter={[16, 16]} justify="center" align="middle">
            <Col xs={24} md={6}>
              <Flex justify="end" align="center" style={{ paddingRight: 20 }}>
                <Text style={{ marginRight: 8, fontSize: 16 }}>Favorite</Text>
                <Switch
                  size='small'
                  checkedChildren="On"
                  unCheckedChildren="Off"
                  onChange={filterPaper}
                />
              </Flex>
            </Col>
            <Col xs={24} md={18}>
              <Flex align="center" wrap="wrap" gap={16}>
                <Text style={{ width: 120, fontSize: 16, flexShrink: 0 }}>Search Papers:</Text>
                <Search
                  placeholder="Search papers by title, author, or keywords"
                  allowClear
                  enterButton="Search"
                  onSearch={handleSearch}
                  value={searchWord}
                  onChange={e => setSearchWord(e.target.value)}
                  style={{ flex: 1, maxWidth: 420 }}
                />
                <Space style={{ marginLeft: 8 }}>
                  <Button
                    loading={loading}
                    icon={<ReloadOutlined style={{ fontSize: 16 }} />}
                    onClick={handleReload}
                  />
                </Space>
              </Flex>
            </Col>
          </Row>
        </div>
      </div>

      {loading ? (
        <Row justify='center' align='middle' className='spin-container'>
          <Spin tip="Loading..." size='large' />
        </Row>
      ) : displayPapers.length === 0 ? (
        <Row justify='center' align='middle' className='spin-container'>
          <Col span={24}>
            <Result
              icon={<SmileOutlined style={{ color: '#9254de' }} />}
              title={
                filterFavorite ? (
                  <div>
                    <p>You haven't saved any favorite papers yet.</p>
                    <p>Click the star icon on a paper to add it to your favorites.</p>
                  </div>
                ) : searchWord.trim() ? (
                  <div>
                    <p>No papers matching "{searchWord}".</p>
                    <p>Try a different keyword.</p>
                  </div>
                ) : (
                  <div>
                    <p>There is still no any related papers now~</p>
                    <p>We will keep tracking for you.</p>
                  </div>
                )
              }
            />
          </Col>
        </Row>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {isMobile ? (
            <div>
              {selectedPaper && renderDetailSection()}

              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Title level={4} style={{ marginBottom: 0 }}>
                    {searchTopic}
                  </Title>
                  {fetchingPapers && (
                    <span style={{ fontSize: 13, color: '#4a4a4a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <LoadingOutlined spin /> Updating Papers
                    </span>
                  )}
                </div>
                {displayPapers.map((item: Paper) => {
                  return (
                    <div
                      key={item.paper_id}
                      className="video-card"
                      onClick={() => handleSelectPaper(item)}
                      style={{
                        cursor: 'pointer',
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: selectedPaper?.paper_id === item.paper_id ? '#f0f0f0' : 'transparent',
                        transition: 'all 0.3s',
                        border: selectedPaper?.paper_id === item.paper_id ? '1px solid #9254de' : '1px solid transparent',
                        minHeight: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: '#1f1f1f',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          {...(hasLatex(item.title)
                            ? { dangerouslySetInnerHTML: { __html: latexToHtml(item.title) } }
                            : { children: item.title })}
                        />

                        <Text
                          type="secondary"
                          style={{
                            fontSize: 12,
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.author || item.channel_name}
                        </Text>

                        <Flex gap={10} align="center" style={{ fontSize: 11, flexWrap: 'wrap', color: '#8c8c8c' }}>
                          {!!item.view_count && (
                            <Flex align="center" gap={3}>
                              <EyeOutlined style={{ fontSize: 10 }} />
                              <span>{formatViewCount(item.view_count)} views</span>
                            </Flex>
                          )}
                          {item.conference && (
                            <Tag
                              color="purple"
                              style={{ margin: 0, fontSize: 10, padding: '0 6px', lineHeight: '16px' }}
                            >
                              {item.conference}{item.year ? ` ${item.year}` : ''}
                            </Tag>
                          )}
                          {item.published_time && (
                            <Flex align="center" gap={3}>
                              <ClockCircleOutlined style={{ fontSize: 10 }} />
                              <span>{item.published_time}</span>
                            </Flex>
                          )}
                        </Flex>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 移动端分页器 */}
              {!searchWord.trim() ? (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Pagination
                  current={currentPage}
                  total={totalItems}
                  pageSize={10}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                />
                <div style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#666'
                }}>
                  <span>Go to</span>
                  <InputNumber
                    min={1}
                    max={getTotalPages()}
                    value={gotoPageValue}
                    onChange={(v) => setGotoPageValue(v)}
                    onPressEnter={handleGotoPage}
                    size="small"
                    style={{ width: 56 }}
                    controls={false}
                  />
                  <span>/ {getTotalPages()}</span>
                  <Button size="small" type="primary" onClick={handleGotoPage} style={{ fontSize: 12 }}>
                    Go
                  </Button>
                </div>
              </div>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#999' }}>
                  {displayPapers.length} result{displayPapers.length !== 1 ? 's' : ''} found
                </div>
              )}
            </div>
          ) : (
            <div style={{ paddingBottom: 32 }}>
              {(() => {
                const DESKTOP_PANEL_HEIGHT = 720;
                return (
              <div style={{
                display: 'flex',
                gap: '2%',
                width: '100%',
                maxWidth: '100%',
                margin: 0,
                padding: 0,
                alignItems: 'flex-start',
              }}>
                {/* 左侧：All Papers框 */}
                <div style={{
                  flex: '0 0 32%',
                  maxWidth: '32%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: DESKTOP_PANEL_HEIGHT,
                  marginBottom: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
                    <Title level={5} style={{ marginBottom: 0 }}>
                      {searchTopic}
                    </Title>
                    {fetchingPapers && (
                      <span style={{ fontSize: 12, color: '#4a4a4a', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        <LoadingOutlined spin /> Updating Papers
                      </span>
                    )}
                  </div>

                  {/* 论文列表容器 */}
                  <div
                    className="paper-scroll paper-scroll-left"
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      marginBottom: 0
                    }}
                  >
                    {displayPapers.map((item: Paper) => (
                      <div
                        key={item.paper_id}
                        className="video-card"
                        onClick={() => handleSelectPaper(item)}
                        style={{
                          cursor: 'pointer',
                          marginBottom: 12,
                          padding: 12,
                          borderRadius: 8,
                          backgroundColor: selectedPaper?.paper_id === item.paper_id ? '#f0f0f0' : 'transparent',
                          transition: 'all 0.3s',
                          border: selectedPaper?.paper_id === item.paper_id ? '1px solid #9254de' : '1px solid transparent',
                          minHeight: 100,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          minWidth: 0,
                          gap: 6,
                        }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              lineHeight: 1.4,
                              color: '#1f1f1f',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as const,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word',
                            }}
                            {...(hasLatex(item.title)
                              ? { dangerouslySetInnerHTML: { __html: latexToHtml(item.title) } }
                              : { children: item.title })}
                          />

                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word',
                            }}
                          >
                            {item.author || item.channel_name}
                          </Text>

                          <Flex gap={10} align="center" style={{ fontSize: 11, flexWrap: 'wrap', color: '#8c8c8c' }}>
                            {!!item.view_count && (
                              <Flex align="center" gap={3} style={{ flexShrink: 0 }}>
                                <EyeOutlined style={{ fontSize: 10 }} />
                                <span>{formatViewCount(item.view_count)} views</span>
                              </Flex>
                            )}
                            {item.conference && (
                              <Flex align="center" gap={3} style={{ flexShrink: 0 }}>
                                <Tag
                                  color="purple"
                                  style={{ margin: 0, fontSize: 10, padding: '0 6px', lineHeight: '16px' }}
                                >
                                  {item.conference}{item.year ? ` ${item.year}` : ''}
                                </Tag>
                              </Flex>
                            )}
                            {item.published_time && (
                              <Flex align="center" gap={3} style={{ flexShrink: 0 }}>
                                <ClockCircleOutlined style={{ fontSize: 10 }} />
                                <span>{item.published_time}</span>
                              </Flex>
                            )}
                          </Flex>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 分页器（搜索模式下隐藏，搜索结果已是全量过滤） */}
                  {!searchWord.trim() && (
                  <div style={{
                    textAlign: 'center',
                    flexShrink: 0,
                    padding: '16px 0 8px 0',
                    borderTop: '1px solid #f0f0f0',
                    marginTop: 8,
                    backgroundColor: 'white',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <Pagination
                      current={currentPage}
                      total={totalItems}
                      pageSize={20}
                      onChange={handlePageChange}
                      showSizeChanger={false}
                      size="small"
                      style={{
                        margin: '0 auto',
                        display: 'inline-block'
                      }}
                    />
                    <div style={{
                      marginTop: 12,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: '#666'
                    }}>
                      <span>Go to</span>
                      <InputNumber
                        min={1}
                        max={getTotalPages()}
                        value={gotoPageValue}
                        onChange={(v) => setGotoPageValue(v)}
                        onPressEnter={handleGotoPage}
                        size="small"
                        style={{ width: 56 }}
                        controls={false}
                      />
                      <span>/ {getTotalPages()}</span>
                      <Button size="small" type="primary" onClick={handleGotoPage} style={{ fontSize: 12 }}>
                        Go
                      </Button>
                    </div>
                  </div>
                  )}
                  {searchWord.trim() && (
                    <div style={{
                      textAlign: 'center',
                      flexShrink: 0,
                      padding: '10px 0',
                      borderTop: '1px solid #f0f0f0',
                      marginTop: 8,
                      fontSize: 12,
                      color: '#999'
                    }}>
                      {displayPapers.length} result{displayPapers.length !== 1 ? 's' : ''} found
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：视频详情 */}
              <div style={{
                flex: '1 1 68%',
                maxWidth: '68%',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: DESKTOP_PANEL_HEIGHT,
                  marginBottom: 8
                }}>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingBottom: 16
                  }} className="paper-scroll paper-scroll-right">
                    {renderDetailSection()}
                  </div>
                </div>
              </div>
            </div>
                );
              })()}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Papers;