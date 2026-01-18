import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Calendar,
  AlertCircle
} from "lucide-react";
import { meetingsApi, statsApi } from "@/lib/api";
import { format } from "date-fns";

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_meetings: 0,
    completed_meetings: 0,
    pending_meetings: 0
  });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, meetingsData] = await Promise.all([
          statsApi.get(),
          meetingsApi.getAll("", 5)
        ]);
        setStats(statsData);
        setRecentMeetings(meetingsData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

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

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/app/record" data-testid="quick-action-record">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                <Mic className="w-7 h-7 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 font-['Manrope']">Record Meeting</h3>
                <p className="text-slate-500 text-sm">Start a new recording</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/app/upload" data-testid="quick-action-upload">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Upload className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 font-['Manrope']">Upload Audio</h3>
                <p className="text-slate-500 text-sm">Upload existing recording</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card data-testid="stat-total">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Meetings</p>
                <p className="text-3xl font-bold text-slate-900 font-['Manrope']">
                  {loading ? "-" : stats.total_meetings}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="stat-completed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-slate-900 font-['Manrope']">
                  {loading ? "-" : stats.completed_meetings}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="stat-pending">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-slate-900 font-['Manrope']">
                  {loading ? "-" : stats.pending_meetings}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Meetings */}
      <Card data-testid="recent-meetings">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-['Manrope']">Recent Meetings</CardTitle>
          <Link to="/app/history">
            <Button variant="ghost" size="sm" data-testid="view-all-meetings">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentMeetings.length === 0 ? (
            <div className="empty-state py-12">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No meetings yet</h3>
              <p className="text-slate-500 mb-4">Start by recording or uploading a meeting</p>
              <div className="flex gap-3">
                <Link to="/app/record">
                  <Button data-testid="empty-state-record">
                    <Mic className="w-4 h-4 mr-2" />
                    Record
                  </Button>
                </Link>
                <Link to="/app/upload">
                  <Button variant="outline" data-testid="empty-state-upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMeetings.map((meeting) => (
                <Link 
                  key={meeting.id} 
                  to={`/app/meeting/${meeting.id}`}
                  data-testid={`meeting-${meeting.id}`}
                >
                  <div className="meeting-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{meeting.title}</h4>
                        <p className="text-sm text-slate-500 line-clamp-1">
                          {meeting.description || "No description"}
                        </p>
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(meeting.created_at), "MMM d, yyyy")}
                      </span>
                      {meeting.action_items?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {meeting.action_items.length} action items
                        </span>
                      )}
                    </div>
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

export default Dashboard;
