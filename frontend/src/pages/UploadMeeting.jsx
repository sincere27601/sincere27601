import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileAudio, 
  X, 
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { meetingsApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const UploadMeeting = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const acceptedTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
    "audio/m4a",
    "video/webm",
    "video/mp4"
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    // Check file type
    if (!acceptedTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type. Please upload an audio or video file.");
      return;
    }

    // Check file size (25MB max)
    const maxSize = 25 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("File too large. Maximum size is 25MB.");
      return;
    }

    setFile(selectedFile);
    
    // Auto-fill title from filename if empty
    if (!title) {
      const name = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(name.replace(/[-_]/g, " "));
    }
    
    toast.success("File selected successfully");
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      setProcessingStage("Uploading file...");
      
      const result = await meetingsApi.process(
        title,
        description,
        file,
        (uploadProgress) => {
          setProgress(Math.min(uploadProgress * 0.3, 30));
          if (uploadProgress === 100) {
            setProcessingStage("Transcribing audio...");
          }
        }
      );

      setProgress(100);
      setProcessingStage("Complete!");
      
      toast.success("Meeting processed successfully!");
      navigate(`/app/meeting/${result.id}`);
    } catch (error) {
      console.error("Error uploading meeting:", error);
      toast.error(error.response?.data?.detail || "Failed to process meeting");
      setProcessing(false);
      setProcessingStage("");
      setProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="upload-meeting-page">
      {/* Upload Zone */}
      <Card data-testid="upload-card">
        <CardHeader>
          <CardTitle className="font-['Manrope']">Upload Audio File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!file ? (
            <div
              className={cn(
                "upload-zone",
                isDragging && "dragging"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="upload-dropzone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".mp3,.wav,.webm,.mp4,.m4a,.mpeg"
                className="hidden"
                data-testid="file-input"
              />
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-2">
                Drop your audio file here
              </p>
              <p className="text-slate-500 mb-4">
                or click to browse
              </p>
              <p className="text-sm text-slate-400">
                Supported: MP3, WAV, WebM, MP4, M4A (max 25MB)
              </p>
            </div>
          ) : (
            <div className="border rounded-xl p-6" data-testid="file-preview">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileAudio className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                </div>
                {!processing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    data-testid="remove-file-btn"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Details Form */}
      {file && (
        <Card data-testid="meeting-details-form">
          <CardHeader>
            <CardTitle className="font-['Manrope']">Meeting Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Q4 Planning Session"
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
              onClick={handleUpload}
              disabled={processing || !title.trim()}
              className="w-full"
              data-testid="process-meeting-btn"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Process Meeting
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
              <h4 className="font-semibold text-blue-900 mb-2">Tips for Best Results</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use high-quality audio recordings for better transcription</li>
                <li>• Avoid files with heavy background noise</li>
                <li>• Supported formats: MP3, WAV, WebM, MP4, M4A</li>
                <li>• Maximum file size: 25MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadMeeting;
