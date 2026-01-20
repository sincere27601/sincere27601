import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  Zap,
  Star,
  ArrowRight,
  Loader2,
  Gift,
  Copy,
  Users,
  Sparkles,
  Clock,
  CreditCard
} from "lucide-react";
import { subscriptionApi, promoApi, referralApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusData, referralInfo] = await Promise.all([
        subscriptionApi.getStatus(),
        referralApi.getReferrals()
      ]);
      setSubscriptionStatus(statusData);
      setReferralData(referralInfo);
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setProcessingPlan(planId);
    
    try {
      const originUrl = window.location.origin;
      const result = await subscriptionApi.createCheckout(planId, originUrl);
      
      if (result.checkout_url) {
        toast.success(`Starting ${result.trial_days}-day free trial!`);
        window.location.href = result.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error.response?.data?.detail || "Failed to start checkout. Please try again.");
      setProcessingPlan(null);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    setApplyingPromo(true);
    try {
      await promoApi.apply(promoCode);
      toast.success("Promo code applied! You now have lifetime free access!");
      await checkAuth();
      await fetchData();
      setPromoCode("");
    } catch (error) {
      console.error("Promo code error:", error);
      toast.error(error.response?.data?.detail || "Invalid promo code");
    } finally {
      setApplyingPromo(false);
    }
  };

  const copyReferralCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referral_code) {
      const link = `${window.location.origin}/register?ref=${referralData.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    }
  };

  const features = [
    "Unlimited meeting recordings",
    "AI-powered transcription",
    "Smart meeting summaries",
    "Executive summaries",
    "Action items extraction",
    "Key decisions tracking",
    "Full-text search",
    "Export to text files"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show lifetime access message
  if (subscriptionStatus?.status === "lifetime") {
    return (
      <div className="max-w-2xl mx-auto space-y-8" data-testid="subscription-lifetime">
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
              Lifetime Access Active
            </h2>
            <p className="text-slate-600">
              You have lifetime free access to all Summary Boss features. Enjoy!
            </p>
          </CardContent>
        </Card>

        {/* Referral Section */}
        <ReferralSection referralData={referralData} onCopy={copyReferralCode} onCopyLink={copyReferralLink} copied={copied} />
      </div>
    );
  }

  // Show active subscription
  if (subscriptionStatus?.has_access && subscriptionStatus?.status === "active") {
    return (
      <div className="max-w-2xl mx-auto space-y-8" data-testid="subscription-active">
        <Card className="border-emerald-500 bg-emerald-50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
              Subscription Active
            </h2>
            <p className="text-slate-600">
              Your {subscriptionStatus.plan === "weekly" ? "Weekly" : "Yearly"} plan is active.
            </p>
            {subscriptionStatus.expires_at && (
              <p className="text-sm text-slate-500">
                Renews on: {new Date(subscriptionStatus.expires_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Referral Section */}
        <ReferralSection referralData={referralData} onCopy={copyReferralCode} onCopyLink={copyReferralLink} copied={copied} />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="subscription-page">
      {/* Trial Banner */}
      {subscriptionStatus?.status === "trial" && (
        <Card className="border-amber-500 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Free Trial Active</p>
                <p className="text-sm text-amber-600">
                  Expires: {subscriptionStatus.expires_at ? new Date(subscriptionStatus.expires_at).toLocaleDateString() : "Soon"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promo Code Section */}
      <Card data-testid="promo-code-card">
        <CardHeader>
          <CardTitle className="font-['Manrope'] flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Have a Promo Code?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              disabled={applyingPromo}
              data-testid="promo-code-input"
            />
            <Button 
              onClick={handleApplyPromo} 
              disabled={applyingPromo}
              data-testid="apply-promo-btn"
            >
              {applyingPromo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Cards */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] mb-2">
          Choose Your Plan
        </h1>
        <p className="text-slate-600 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Start with a 3-day free trial
          <Sparkles className="w-4 h-4 text-amber-500" />
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Weekly Plan */}
        <Card className="relative" data-testid="plan-weekly">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-['Manrope'] text-xl">Weekly</CardTitle>
            <CardDescription>Flexible weekly billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold text-slate-900">$7</span>
              <span className="text-slate-500">/week</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-800 font-medium">
                <Clock className="w-4 h-4 inline mr-1" />
                3-day FREE trial included
              </p>
            </div>
            
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-slate-600">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              onClick={() => handleSubscribe("weekly")}
              disabled={processingPlan === "weekly"}
              className="w-full"
              variant="outline"
              data-testid="subscribe-weekly-btn"
            >
              {processingPlan === "weekly" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Start Free Trial
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Yearly Plan - Featured */}
        <Card className="relative border-primary shadow-lg" data-testid="plan-yearly">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-white px-4 py-1">
              <Star className="w-3 h-3 mr-1" />
              Best Value
            </Badge>
          </div>
          
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="font-['Manrope'] text-xl">Yearly</CardTitle>
            <CardDescription>Save over 40%!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold text-slate-900">$78</span>
              <span className="text-slate-500">/year</span>
              <p className="text-sm text-emerald-600 font-medium mt-1">
                Only $1.50/week!
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-800 font-medium">
                <Clock className="w-4 h-4 inline mr-1" />
                3-day FREE trial included
              </p>
            </div>
            
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-slate-600">{feature}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm font-medium text-primary">
                <Zap className="w-5 h-5 shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>
            
            <Button 
              onClick={() => handleSubscribe("yearly")}
              disabled={processingPlan === "yearly"}
              className="w-full bg-primary hover:bg-primary/90"
              data-testid="subscribe-yearly-btn"
            >
              {processingPlan === "yearly" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Start Free Trial
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Referral Section */}
      <ReferralSection referralData={referralData} onCopy={copyReferralCode} onCopyLink={copyReferralLink} copied={copied} />

      {/* Info */}
      <div className="text-center text-sm text-slate-500 max-w-lg mx-auto">
        <p>
          Your card will be charged after the 3-day free trial ends. Cancel anytime before the trial ends to avoid charges.
        </p>
      </div>
    </div>
  );
};

// Referral Section Component
const ReferralSection = ({ referralData, onCopy, onCopyLink, copied }) => {
  if (!referralData) return null;

  return (
    <Card data-testid="referral-card">
      <CardHeader>
        <CardTitle className="font-['Manrope'] flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Refer a Friend & Earn $50
        </CardTitle>
        <CardDescription>
          Get $50 when your friend signs up for the yearly plan!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code */}
        <div className="space-y-2">
          <Label>Your Referral Code</Label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-100 rounded-lg px-4 py-3 font-mono text-lg font-bold text-center">
              {referralData.referral_code}
            </div>
            <Button variant="outline" onClick={onCopy} data-testid="copy-code-btn">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Copy Link Button */}
        <Button variant="outline" className="w-full" onClick={onCopyLink} data-testid="copy-link-btn">
          <Copy className="w-4 h-4 mr-2" />
          Copy Referral Link
        </Button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{referralData.referrals?.length || 0}</p>
            <p className="text-sm text-slate-500">Friends Referred</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">${referralData.total_earnings || 0}</p>
            <p className="text-sm text-slate-500">Total Earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 mb-2">How it works:</h4>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>Share your referral code or link with friends</li>
            <li>They sign up and subscribe to the yearly plan</li>
            <li>You earn $50 for each successful referral!</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionPage;
