import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, UserPlus, Gift, Sparkles, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authApi, referralApi, promoApi, subscriptionApi } from "@/lib/api";
import { toast } from "sonner";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const planId = searchParams.get("plan"); // weekly or yearly
  const promoFromUrl = searchParams.get("promo"); // promo code like "Gillian"
  
  const { setUser, setIsAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(refCode || "");
  const [referrerName, setReferrerName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Determine if user has lifetime promo code
  const hasLifetimePromo = promoFromUrl && promoFromUrl.toLowerCase() === "gillian";

  useEffect(() => {
    if (refCode) {
      validateReferralCode(refCode);
    }
  }, [refCode]);

  const validateReferralCode = async (code) => {
    try {
      const result = await referralApi.validateCode(code);
      if (result.valid) {
        setReferrerName(result.referrer_name);
      }
    } catch (error) {
      console.error("Invalid referral code:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const userData = await authApi.register(email, password, name, referralCode || undefined);
      setUser(userData);
      setIsAuthenticated(true);
      toast.success("Account created successfully!");
      
      // If user has lifetime promo code (Gillian), apply it and go to dashboard
      if (hasLifetimePromo) {
        try {
          await promoApi.apply(promoFromUrl);
          toast.success("Lifetime free access activated!");
          navigate("/app");
        } catch (promoError) {
          console.error("Promo code error:", promoError);
          toast.error("Failed to apply promo code, but account created");
          navigate("/app");
        }
      }
      // If user selected a plan, redirect to Stripe checkout
      else if (planId && (planId === "weekly" || planId === "yearly")) {
        try {
          const originUrl = window.location.origin;
          const result = await subscriptionApi.createCheckout(planId, originUrl);
          
          if (result.checkout_url) {
            toast.success(`Starting 3-day free trial! Redirecting to payment setup...`);
            window.location.href = result.checkout_url;
          } else {
            navigate("/app/subscription");
          }
        } catch (checkoutError) {
          console.error("Checkout error:", checkoutError);
          toast.error("Failed to start checkout. Please try again from the subscription page.");
          navigate("/app/subscription");
        }
      }
      // No plan or promo, go to subscription page to choose
      else {
        navigate("/app/subscription");
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error(error.response?.data?.detail || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    // Store referral code in sessionStorage for after OAuth
    if (referralCode) {
      sessionStorage.setItem("referral_code", referralCode);
    }
    const redirectUrl = window.location.origin + '/app';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="register-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl font-['Manrope'] text-slate-900">Summary Boss</span>
          </Link>
          <CardTitle className="font-['Manrope']">Create an account</CardTitle>
          <CardDescription>Get started with Summary Boss today</CardDescription>
          
          {/* Show selected plan */}
          {planId && !hasLifetimePromo && (
            <Badge className="mt-2 bg-primary">
              <CreditCard className="w-3 h-3 mr-1" />
              {planId === "yearly" ? "Yearly Plan ($78/year)" : "Weekly Plan ($7/week)"} • 3-day free trial
            </Badge>
          )}
          
          {/* Show lifetime promo */}
          {hasLifetimePromo && (
            <Badge className="mt-2 bg-emerald-600">
              <Sparkles className="w-3 h-3 mr-1" />
              Lifetime Free Access (No credit card needed!)
            </Badge>
          )}
          
          {referrerName && (
            <Badge variant="secondary" className="mt-2">
              <Gift className="w-3 h-3 mr-1" />
              Referred by {referrerName}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            data-testid="google-signup-btn"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with email</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
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
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                data-testid="email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                data-testid="password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                data-testid="confirm-password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code (optional)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                disabled={loading}
                data-testid="referral-code-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium" data-testid="login-link">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
