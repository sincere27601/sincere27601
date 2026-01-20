import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import api from "@/lib/api";

const AudioWaveform = ({ audioUrl, filename }) => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);

  // Fetch audio and generate waveform data
  const generateWaveform = useCallback(async () => {
    if (!audioUrl) return;
    
    setIsLoading(true);
    try {
      // Use axios to fetch with credentials
      const response = await api.get(audioUrl.replace(api.defaults.baseURL, ''), {
        responseType: 'arraybuffer'
      });
      
      const arrayBuffer = response.data;
      
      // Create blob URL for audio playback
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      setAudioBlobUrl(blobUrl);
      
      // Decode for waveform visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      
      // Get audio data from the first channel
      const channelData = audioBuffer.getChannelData(0);
      const samples = 150; // Number of bars in waveform
      const blockSize = Math.floor(channelData.length / samples);
      const waveform = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }
      
      // Normalize
      const max = Math.max(...waveform);
      const normalized = waveform.map(val => val / max);
      
      setWaveformData(normalized);
      setDuration(audioBuffer.duration);
      audioContext.close();
    } catch (error) {
      console.error("Error generating waveform:", error);
      // Generate fallback random waveform for visual appeal
      const fallback = Array.from({ length: 150 }, () => 0.2 + Math.random() * 0.8);
      setWaveformData(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [audioUrl]);

  useEffect(() => {
    generateWaveform();
    
    // Cleanup blob URL on unmount
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [generateWaveform]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;
    
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const barWidth = width / waveformData.length;
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = progress * width;
    
    ctx.clearRect(0, 0, width, height);
    
    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * (height * 0.8);
      const y = (height - barHeight) / 2;
      
      // Color based on progress
      if (x < progressX) {
        ctx.fillStyle = "#22c55e"; // Green for played portion
      } else {
        ctx.fillStyle = "#d1d5db"; // Gray for unplayed
      }
      
      // Draw rounded bar
      const radius = Math.min(barWidth / 2 - 1, 2);
      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, radius);
      ctx.fill();
    });
    
    // Draw progress line
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(progressX - 1, 0, 2, height);
    
  }, [waveformData, currentTime, duration]);

  // Animation loop for smooth progress updates
  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    animationRef.current = requestAnimationFrame(updateProgress);
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        cancelAnimationFrame(animationRef.current);
      } else {
        audioRef.current.play();
        animationRef.current = requestAnimationFrame(updateProgress);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current || duration === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationRef.current);
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3" data-testid="audio-waveform">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Original Recording</p>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{filename}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8"
            data-testid="mute-btn"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-500" />
            )}
          </Button>
          <div className="w-20">
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="cursor-pointer"
              data-testid="volume-slider"
            />
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="relative">
        {isLoading ? (
          <div className="h-16 bg-slate-200 rounded animate-pulse flex items-center justify-center">
            <span className="text-xs text-slate-400">Loading waveform...</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-16 cursor-pointer rounded"
            onClick={handleCanvasClick}
            data-testid="waveform-canvas"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayPause}
          className="h-10 w-10 rounded-full border-2 border-primary hover:bg-primary hover:text-white transition-colors"
          data-testid="play-pause-btn"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-slate-500 w-10 text-right font-mono">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 w-10 font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="use-credentials"
        className="hidden"
      />
    </div>
  );
};

export default AudioWaveform;
