import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Save,
  Clock,
  AlertCircle
} from "lucide-react";
import { meetingsApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RecordMeeting = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [progress, setProgress] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
      toast.info("Recording paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      toast.info("Recording resumed");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
      toast.success("Recording stopped");
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleSave = async () => {
    if (!audioBlob) {
      toast.error("No recording to save");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Create a file from the blob
      const file = new File([audioBlob], `meeting_${Date.now()}.webm`, { type: 'audio/webm' });

      setProcessingStage("Uploading recording...");
      setProgress(20);

      // Process the meeting (upload + transcribe + summarize)
      setProcessingStage("Transcribing audio...");
      setProgress(40);
      
      const result = await meetingsApi.process(
        title,
        description,
        file,
        (uploadProgress) => {
          setProgress(Math.min(20 + (uploadProgress * 0.2), 40));
        }
      );

      setProgress(100);
      setProcessingStage("Complete!");
      
      toast.success("Meeting processed successfully!");
      navigate(`/app/meeting/${result.id}`);
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error(error.response?.data?.detail || "Failed to process meeting");
      setProcessing(false);
      setProcessingStage("");
      setProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="record-meeting-page">
      {/* Recording Interface */}
      <Card data-testid="recording-card">
        <CardHeader>
          <CardTitle className="font-['Manrope']">Record Your Meeting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Waveform Visualizer */}
          <div className="flex justify-center">
            <div className={cn(
              "waveform-container",
              !isRecording && "opacity-30"
            )}>
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "waveform-bar",
                    isRecording && !isPaused ? "animate-[waveform_0.5s_ease-in-out_infinite]" : ""
                  )}
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    height: isRecording && !isPaused ? undefined : "20%"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <span className="text-5xl font-mono font-bold text-slate-900" data-testid="recording-timer">
              {formatTime(recordingTime)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {!isRecording && !audioBlob && (
              <Button
                size="lg"
                onClick={startRecording}
                className="record-button idle"
                data-testid="start-recording-btn"
              >
                <Mic className="w-8 h-8 text-white" />
              </Button>
            )}

            {isRecording && (
              <>
                {isPaused ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resumeRecording}
                    className="w-14 h-14 rounded-full"
                    data-testid="resume-recording-btn"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={pauseRecording}
                    className="w-14 h-14 rounded-full"
                    data-testid="pause-recording-btn"
                  >
                    <Pause className="w-6 h-6" />
                  </Button>
                )}
                
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="w-14 h-14 rounded-full"
                  data-testid="stop-recording-btn"
                >
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetRecording}
                  data-testid="reset-recording-btn"
                >
                  Record Again
                </Button>
              </>
            )}
          </div>

          {/* Audio Preview */}
          {audioUrl && (
            <div className="pt-4">
              <audio 
                controls 
                src={audioUrl} 
                className="w-full"
                data-testid="audio-preview"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Details Form */}
      {audioBlob && (
        <Card data-testid="meeting-details-form">
          <CardHeader>
            <CardTitle className="font-['Manrope']">Meeting Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Weekly Team Standup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={processing}
                data-testid="meeting-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the meeting..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={processing}
                rows={3}
                data-testid="meeting-description-input"
              />
            </div>

            {processing && (
              <div className="space-y-3" data-testid="processing-indicator">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{processingStage}</span>
                  <span className="text-slate-500">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={processing || !title.trim()}
              className="w-full"
              data-testid="save-meeting-btn"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save & Process Meeting
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Recording Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ensure you're in a quiet environment for best results</li>
                <li>• Speak clearly and at a moderate pace</li>
                <li>• Keep your microphone at a consistent distance</li>
                <li>• Maximum recording duration: 25 minutes (file size limit)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecordMeeting;
