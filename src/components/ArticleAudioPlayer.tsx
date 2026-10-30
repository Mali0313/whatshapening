'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, Clock, Headphones } from 'lucide-react';

interface ArticleAudioPlayerProps {
  title: string;
  content: string;
  excerpt?: string;
}

export function ArticleAudioPlayer({ title, content, excerpt }: ArticleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [isSupported, setIsSupported] = useState(false);
  const [progress, setProgress] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Word count & estimated reading time calculation
  const totalWords = (content + ' ' + (excerpt || '')).trim().split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const cleanTextForSpeech = () => {
    // Strip markdown hashes, URLs, and blockquote symbols
    const cleanContent = content
      .replace(/#+\s/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[>*_`]/g, '');

    return `${title}. ${excerpt ? excerpt + '. ' : ''}${cleanContent}`;
  };

  const handlePlay = () => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // Cancel any previous speech
    synth.cancel();

    const textToSpeak = cleanTextForSpeech();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    utterance.rate = rate;
    utterance.pitch = 1;

    // Pick best natural English voice available
    const voices = synth.getVoices();
    const naturalVoice =
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(5);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  };

  const changeSpeed = () => {
    const nextRate = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
    setRate(nextRate);
    if (isPlaying) {
      handleStop();
    }
  };

  return (
    <div className="my-6 p-4 sm:p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
      {/* Left: Metadata & Read time badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 text-[#dc2626] dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center shrink-0 shadow-sm">
          <Headphones className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Listen to Story
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--card-bg)] px-2 py-0.5 rounded-full border border-[var(--border-light)]">
              <Clock className="w-3 h-3 text-[#dc2626]" />
              {readTimeMinutes} min read
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {isPlaying
              ? 'Audio playback in progress...'
              : isPaused
              ? 'Audio paused'
              : 'AI voice narrator powered by Web Speech'}
          </p>
        </div>
      </div>

      {/* Right: Audio Player Controls */}
      {isSupported ? (
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Animated sound wave bars when active */}
          {isPlaying && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 mr-2">
              <span className="w-1 h-3.5 bg-[#dc2626] rounded-full animate-pulse" />
              <span className="w-1 h-5 bg-[#dc2626] rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-[#dc2626] rounded-full animate-pulse delay-150" />
              <span className="w-1 h-4 bg-[#dc2626] rounded-full animate-pulse delay-100" />
            </div>
          )}

          {/* Speed Toggle */}
          <button
            onClick={changeSpeed}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--card-bg)] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-primary)] border border-[var(--border-light)] transition-colors cursor-pointer"
            title="Adjust reading speed"
          >
            {rate}x
          </button>

          {/* Play / Pause Toggle Button */}
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-sm transition-all hover:shadow-red-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isPaused ? 'Resume' : 'Listen'}</span>
            </button>
          )}

          {/* Reset / Stop Button */}
          {(isPlaying || isPaused) && (
            <button
              onClick={handleStop}
              aria-label="Stop audio"
              className="p-2 rounded-xl bg-[var(--card-bg)] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-muted)] hover:text-red-600 border border-[var(--border-light)] transition-colors cursor-pointer"
              title="Stop playback"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <span className="text-xs text-[var(--text-muted)] italic">
          Audio narration available in browser
        </span>
      )}
    </div>
  );
}
