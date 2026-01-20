import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, ArrowLeft, Mail } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState(""); // For testing - remove in production

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.forgotPassword(email);
      setSubmitted(true);
      // For testing only - in production, token would be sent via email
      if (result.reset_token) {
        setResetToken(result.reset_token);
      }
      toast.success("If an account exists, a reset link has been sent");
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="forgot-password-success">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl font-['Manrope'] text-slate-900">Summary Boss</span>
            </Link>
            <CardTitle className="font-['Manrope']">Check your email</CardTitle>
            <CardDescription>
              If an account exists with {email}, we've sent password reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* For testing only - remove in production */}
            {resetToken && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium mb-2">Testing Mode:</p>
                <p className="text-xs text-amber-700 mb-2">Reset token (would be sent via email in production):</p>
                <code className="text-xs bg-amber-100 px-2 py-1 rounded break-all">{resetToken}</code>
                <Link to={`/reset-password?token=${resetToken}`} className="block mt-3">
                  <Button size="sm" variant="outline" className="w-full">
                    Reset Password Now
                  </Button>
                </Link>
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Try another email
              </Button>
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="forgot-password-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl font-['Manrope'] text-slate-900">Summary Boss</span>
          </Link>
          <CardTitle className="font-['Manrope']">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                data-testid="email-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>

          <Link to="/login" className="block">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
