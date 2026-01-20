import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  Calendar,
  Download,
  Trash2,
  Copy,
  Lightbulb,
  Target,
  Tag,
  RefreshCw,
  Briefcase
} from "lucide-react";
import { meetingsApi } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import AudioWaveform from "@/components/AudioWaveform";

const MeetingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const fetchMeeting = async () => {
    try {
      const data = await meetingsApi.getById(id);
      setMeeting(data);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      toast.error("Failed to load meeting");
      navigate("/app/history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await meetingsApi.delete(id);
      toast.success("Meeting deleted successfully");
      navigate("/app/history");
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
      setDeleting(false);
    }
  };

  const handleReprocess = async () => {
    if (!meeting.transcript) {
      toast.error("No transcript available to summarize");
      return;
    }

    setReprocessing(true);
    try {
      await meetingsApi.summarize(id);
      await fetchMeeting();
      toast.success("Meeting re-summarized successfully");
    } catch (error) {
      console.error("Error reprocessing meeting:", error);
      toast.error("Failed to reprocess meeting");
    } finally {
      setReprocessing(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadAsText = () => {
    const content = `
MEETING SUMMARY
===============
Title: ${meeting.title}
Date: ${format(new Date(meeting.created_at), "MMMM d, yyyy 'at' h:mm a")}
${meeting.description ? `Description: ${meeting.description}` : ""}

EXECUTIVE SUMMARY (For Quick Review)
------------------------------------
${meeting.executive_summary || "No executive summary available"}

FULL SUMMARY
------------
${meeting.summary || "No summary available"}

ACTION ITEMS
------------
${meeting.action_items?.length > 0 
  ? meeting.action_items.map((item, i) => `${i + 1}. ${item}`).join("\n")
  : "No action items"}

KEY DECISIONS
-------------
${meeting.key_decisions?.length > 0 
  ? meeting.key_decisions.map((item, i) => `${i + 1}. ${item}`).join("\n")
  : "No key decisions"}

TOPICS DISCUSSED
----------------
${meeting.topics?.length > 0 
  ? meeting.topics.join(", ")
  : "No topics identified"}

FULL TRANSCRIPT
---------------
${meeting.transcript || "No transcript available"}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/\s+/g, "_")}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Summary downloaded");
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
      processing: { label: "Processing", className: "bg-amber-100 text-amber-700" },
      transcribing: { label: "Transcribing", className: "bg-amber-100 text-amber-700" },
      summarizing: { label: "Summarizing", className: "bg-amber-100 text-amber-700" },
      transcribed: { label: "Transcribed", className: "bg-blue-100 text-blue-700" },
      uploaded: { label: "Uploaded", className: "bg-slate-100 text-slate-700" },
      pending: { label: "Pending", className: "bg-slate-100 text-slate-700" },
      error: { label: "Error", className: "bg-rose-100 text-rose-700" }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="meeting-details-loading">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="meeting-details-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link 
            to="/app/history" 
            className="inline-flex items-center text-sm text-slate-500 hover:text-primary transition-colors"
            data-testid="back-to-history"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to History
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']" data-testid="meeting-title">
            {meeting.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(meeting.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </span>
            {getStatusBadge(meeting.status)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={downloadAsText}
            data-testid="download-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-rose-600 hover:text-rose-700" data-testid="delete-btn">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the meeting
                  and all associated data including the transcript and summary.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-rose-600 hover:bg-rose-700"
                  data-testid="confirm-delete-btn"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {meeting.description && (
        <p className="text-slate-600" data-testid="meeting-description">
          {meeting.description}
        </p>
      )}

      {/* Audio Player - Show if audio file exists */}
      {meeting.audio_file_id && (
        <Card data-testid="audio-player-card" className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleAudioPlayback}
                className="h-12 w-12 rounded-full"
                data-testid="play-audio-btn"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">Original Recording</p>
                <p className="text-xs text-slate-500">{meeting.audio_filename}</p>
              </div>
              <Volume2 className="w-5 h-5 text-slate-400" />
            </div>
            <audio
              ref={audioRef}
              src={meetingsApi.getAudioUrl(id)}
              onEnded={handleAudioEnded}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content - Split View */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Transcript */}
        <div className="lg:col-span-2">
          <Card data-testid="transcript-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Transcript
              </CardTitle>
              {meeting.transcript && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(meeting.transcript, "Transcript")}
                  data-testid="copy-transcript-btn"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {meeting.transcript ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="transcript-container whitespace-pre-wrap text-slate-700" data-testid="transcript-content">
                    {meeting.transcript}
                  </div>
                </ScrollArea>
              ) : (
                <div className="empty-state py-12">
                  <FileText className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-slate-500">No transcript available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Summary & Details */}
        <div className="space-y-6">
          {/* Executive Summary */}
          <Card data-testid="executive-summary-card" className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2 text-primary">
                <Briefcase className="w-5 h-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.executive_summary ? (
                <p className="text-slate-800 font-medium leading-relaxed" data-testid="executive-summary-content">
                  {meeting.executive_summary}
                </p>
              ) : (
                <p className="text-slate-500 italic">Executive summary will be generated with the full summary</p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card data-testid="summary-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Full Summary
              </CardTitle>
              {meeting.transcript && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReprocess}
                  disabled={reprocessing}
                  data-testid="reprocess-btn"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${reprocessing ? 'animate-spin' : ''}`} />
                  {reprocessing ? "Processing..." : "Regenerate"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {meeting.summary ? (
                <p className="text-slate-700 leading-relaxed" data-testid="summary-content">
                  {meeting.summary}
                </p>
              ) : (
                <p className="text-slate-500 italic">No summary available</p>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card data-testid="action-items-card">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.action_items?.length > 0 ? (
                <ul className="space-y-3">
                  {meeting.action_items.map((item, index) => (
                    <li 
                      key={index} 
                      className="action-item"
                      data-testid={`action-item-${index}`}
                    >
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">No action items identified</p>
              )}
            </CardContent>
          </Card>

          {/* Key Decisions */}
          <Card data-testid="key-decisions-card">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <Target className="w-5 h-5" />
                Key Decisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.key_decisions?.length > 0 ? (
                <ul className="space-y-3">
                  {meeting.key_decisions.map((item, index) => (
                    <li 
                      key={index} 
                      className="action-item"
                      data-testid={`decision-${index}`}
                    >
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">No key decisions identified</p>
              )}
            </CardContent>
          </Card>

          {/* Topics */}
          <Card data-testid="topics-card">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Topics Discussed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.topics?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {meeting.topics.map((topic, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      data-testid={`topic-${index}`}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No topics identified</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetails;
