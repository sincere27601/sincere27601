import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Loader2,
  Shield,
  Camera
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Profile form
  const [name, setName] = useState(user?.name || "");
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      await authApi.updateProfile({ name });
      await checkAuth(); // Refresh user data
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const isGoogleUser = user?.auth_provider === "google";

  return (
    <div className="max-w-2xl mx-auto space-y-8" data-testid="profile-page">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-primary text-white text-2xl">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
                {user?.name}
              </h2>
              <p className="text-slate-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isGoogleUser ? "secondary" : "outline"}>
                  {isGoogleUser ? (
                    <>
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google Account
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3 mr-1" />
                      Email Account
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card data-testid="profile-settings-card">
        <CardHeader>
          <CardTitle className="font-['Manrope'] flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                data-testid="name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="save-profile-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings - Only for email users */}
      {!isGoogleUser && (
        <Card data-testid="password-settings-card">
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordLoading}
                  placeholder="••••••••"
                  data-testid="current-password-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                  placeholder="••••••••"
                  data-testid="new-password-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                  placeholder="••••••••"
                  data-testid="confirm-password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={passwordLoading}
                data-testid="change-password-btn"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Google Account Notice */}
      {isGoogleUser && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Password Management</h4>
                <p className="text-sm text-slate-600">
                  Your account is linked to Google. Password management is handled through your Google account settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
