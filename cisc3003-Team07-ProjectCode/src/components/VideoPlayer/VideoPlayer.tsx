// src/components/VideoPlayer/VideoPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Slider, Button, Space, message, Spin } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  SoundOutlined,
  MutedOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import './VideoPlayer.css';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  thumbnailUrl?: string;
  width?: number | string;
  height?: number | string;
  onClose?: () => void;
  showControls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  abstract?: string;
  author?: string;
  topic?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title = 'Paper Video',
  thumbnailUrl,
  width = '100%',
  height = 400,
  onClose,
  showControls = true,
  autoPlay = false,
  loop = false,
  muted = false,
}) => {
  const [playing, setPlaying] = useState(autoPlay);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mutedState, setMutedState] = useState(muted);
  const [fullscreen, setFullscreen] = useState(false);
  const [showFullControls, setShowFullControls] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    setPlaying(prev => !prev);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (autoPlay) {
        videoRef.current.play().catch(() => setPlaying(false));
      }
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      if (value === 0) {
        setMutedState(true);
      } else if (mutedState) {
        setMutedState(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !mutedState;
      videoRef.current.muted = newMutedState;
      setMutedState(newMutedState);
      if (newMutedState) {
        setVolume(0);
      } else {
        setVolume(1);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = title || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Video download started');
    } catch (error) {
      message.error('Download failed. Please try again.');
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (showControls) {
      setShowFullControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowFullControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls]);

  useEffect(() => {
    const handleFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.play().catch(() => setPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [playing]);

  useEffect(() => {
    setLoadError(false);
    setPlaying(false);
    setBuffering(false);
    setCurrentTime(0);
    setDuration(0);
  }, [videoUrl]);

  if (loadError) {
    return (
      <div
        style={{
          width, height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f0f0f0', borderRadius: 8, color: '#999', fontSize: 14,
        }}
      >
        Video unavailable
      </div>
    );
  }

  return (
    <div
      className="video-player-container"
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      style={{ width, height }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onError={() => { setLoadError(true); setPlaying(false); }}
        className="video-element"
        controls={false}
        autoPlay={autoPlay}
        loop={loop}
        muted={mutedState}
        onClick={handlePlayPause}
      />

      {buffering && playing && (
        <div className="play-overlay" style={{ pointerEvents: 'none' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#fff' }} />} />
        </div>
      )}

      {showControls && (
        <div className={`video-controls ${showFullControls ? 'visible' : 'hidden'}`}>
          <div className="progress-bar">
            <Slider
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              tooltip={{ formatter: (v?: number) => v !== undefined ? formatTime(v) : null }}
              className="progress-slider"
              trackStyle={{ backgroundColor: '#1890ff' }}
              railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
            />
          </div>

          <div className="control-bar">
            <div className="left-controls">
              <Button
                type="text"
                icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
                className="control-button"
              />
              <div className="time-display">
                <span className="time-current">{formatTime(currentTime)}</span>
                <span className="time-separator">/</span>
                <span className="time-duration">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="center-controls">
              {title && <div className="video-title-text">{title}</div>}
            </div>

            <div className="right-controls">
              <div className="volume-control">
                <Button
                  type="text"
                  icon={mutedState || volume === 0 ? <MutedOutlined /> : <SoundOutlined />}
                  onClick={toggleMute}
                  className="control-button"
                />
                <Slider
                  min={0} max={1} step={0.1}
                  value={mutedState ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                  trackStyle={{ backgroundColor: '#1890ff' }}
                  railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </div>
              <Space>
                <Button type="text" icon={<DownloadOutlined />} onClick={handleDownload} className="control-button" title="Download" />
                <Button type="text" icon={<FullscreenOutlined />} onClick={toggleFullscreen} className="control-button" title="Fullscreen" />
              </Space>
            </div>
          </div>
        </div>
      )}

      {!playing && currentTime === 0 && !buffering && (
        <div className="play-overlay" onClick={handlePlayPause}>
          <PlayCircleOutlined className="play-icon" />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;