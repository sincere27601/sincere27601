import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Mic,
  Upload,
  Filter
} from "lucide-react";
import { meetingsApi } from "@/lib/api";
import { format } from "date-fns";

const MeetingHistory = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const data = await meetingsApi.getAll("", 100);
      setMeetings(data);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await meetingsApi.getAll(searchQuery, 100);
      setMeetings(data);
    } catch (error) {
      console.error("Error searching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return meeting.status === "completed";
    if (statusFilter === "processing") {
      return ["processing", "transcribing", "summarizing", "transcribed", "uploaded"].includes(meeting.status);
    }
    if (statusFilter === "error") return meeting.status === "error";
    return true;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      processing: { label: "Processing", className: "bg-amber-100 text-amber-700", icon: Clock },
      transcribing: { label: "Transcribing", className: "bg-amber-100 text-amber-700", icon: Clock },
      summarizing: { label: "Summarizing", className: "bg-amber-100 text-amber-700", icon: Clock },
      transcribed: { label: "Transcribed", className: "bg-blue-100 text-blue-700", icon: FileText },
      uploaded: { label: "Uploaded", className: "bg-slate-100 text-slate-700", icon: Upload },
      pending: { label: "Pending", className: "bg-slate-100 text-slate-700", icon: Clock },
      error: { label: "Error", className: "bg-rose-100 text-rose-700", icon: AlertCircle }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="meeting-history-page">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} data-testid="search-btn">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meetings List */}
      <Card data-testid="meetings-list">
        <CardHeader>
          <CardTitle className="font-['Manrope']">
            All Meetings ({filteredMeetings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="empty-state py-16">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No meetings found</h3>
              <p className="text-slate-500 mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Start by recording or uploading a meeting"}
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/app/record">
                  <Button data-testid="empty-state-record">
                    <Mic className="w-4 h-4 mr-2" />
                    Record Meeting
                  </Button>
                </Link>
                <Link to="/app/upload">
                  <Button variant="outline" data-testid="empty-state-upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Audio
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMeetings.map((meeting) => (
                <Link 
                  key={meeting.id} 
                  to={`/app/meeting/${meeting.id}`}
                  data-testid={`meeting-row-${meeting.id}`}
                >
                  <div className="meeting-card group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">
                          {meeting.title}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                          {meeting.description || "No description"}
                        </p>
                      </div>
                      <div className="ml-4 shrink-0">
                        {getStatusBadge(meeting.status)}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(meeting.created_at), "MMM d, yyyy")}
                      </span>
                      
                      {meeting.action_items?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          {meeting.action_items.length} action items
                        </span>
                      )}
                      
                      {meeting.topics?.length > 0 && (
                        <div className="flex items-center gap-1">
                          {meeting.topics.slice(0, 3).map((topic, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {meeting.topics.length > 3 && (
                            <span className="text-slate-400">
                              +{meeting.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {meeting.summary && (
                      <p className="text-sm text-slate-600 mt-3 line-clamp-2 bg-slate-50 p-3 rounded-lg">
                        {meeting.summary}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MeetingHistory;
