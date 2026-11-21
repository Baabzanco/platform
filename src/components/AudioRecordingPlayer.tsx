import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Pause, Play } from 'lucide-react';
import { createCallRecordingWavUrl } from '../utils/audioSynth';
import { formatDuration } from '../utils/formatters';

interface AudioRecordingPlayerProps {
  orderCode: string;
  durationSeconds: number;
}

export const AudioRecordingPlayer: React.FC<AudioRecordingPlayerProps> = ({
  orderCode,
  durationSeconds,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState<number>(
    Math.max(4, Math.min(durationSeconds, 12))
  );

  const seed = useMemo(() => {
    return orderCode.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  }, [orderCode]);

  const audioUrl = useMemo(
    () => createCallRecordingWavUrl(durationSeconds, seed),
    [durationSeconds, seed]
  );

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const nextTime = Number(e.target.value);
    setCurrentTime(nextTime);
    if (audio) {
      audio.currentTime = nextTime;
    }
  };

  return (
    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[240px] max-w-[320px] flex-1">
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setActualDuration(d);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
      <Mic className="w-4 h-4 text-slate-400 shrink-0" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'توقف پخش مکالمه' : 'پخش فایل صوتی مکالمه'}
        className="w-7 h-7 rounded-full bg-[#0f5864] text-white flex items-center justify-center shrink-0 hover:bg-[#0b434d] transition-colors"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 mr-[-1px]" />}
      </button>
      <input
        type="range"
        min={0}
        max={actualDuration || 1}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        aria-label="پیشرفت پخش مکالمه"
        className="flex-1 h-1.5 accent-[#0f5864] cursor-pointer"
      />
      <span className="tabular-nums text-[11px] text-slate-600 shrink-0">
        {formatDuration(currentTime)} / {formatDuration(actualDuration)}
      </span>
    </div>
  );
};
