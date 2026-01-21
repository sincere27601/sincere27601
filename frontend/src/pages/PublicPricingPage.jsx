import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Zap,
  Star,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Gift,
  Clock,
  CreditCard,
  Sparkles,
  FileText
} from "lucide-react";
import { toast } from "sonner";

const PublicPricingPage = () => {
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

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

  const handleSelectPlan = (planId) => {
    // Navigate to register with the selected plan
    window.location.href = `/register?plan=${planId}`;
  };

  const handlePromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    setCheckingPromo(true);
    
    // Check if it's the special "Gillian" code (case-insensitive)
    if (promoCode.trim().toLowerCase() === "gillian") {
      toast.success("Valid promo code! You'll get lifetime free access.");
      // Navigate to register with promo code
      window.location.href = `/register?promo=${promoCode.trim()}`;
    } else {
      toast.error("Invalid promo code. Please try again or select a plan.");
    }
    
    setCheckingPromo(false);
  };

  return (
    <div className="min-h-screen bg-white" data-testid="public-pricing-page">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl font-['Manrope'] text-slate-900">Summary Boss</span>
          </Link>
          
          <Link to="/login" data-testid="login-link">
            <Button variant="outline">
              Already have an account? Log In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Manrope'] mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-slate-600 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Start with a 3-day FREE trial • Cancel anytime
              <Sparkles className="w-5 h-5 text-amber-500" />
            </p>
          </div>

          {/* Promo Code Section */}
          <Card className="mb-10 border-primary/30 bg-primary/5" data-testid="promo-code-section">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-slate-900">Have a promo code?</span>
                </div>
                <div className="flex gap-3 flex-1 w-full sm:w-auto">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={checkingPromo}
                    className="flex-1"
                    data-testid="promo-code-input"
                    onKeyPress={(e) => e.key === 'Enter' && handlePromoCode()}
                  />
                  <Button 
                    onClick={handlePromoCode} 
                    disabled={checkingPromo}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="apply-promo-btn"
                  >
                    {checkingPromo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Cards */}
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
                
                <Link to="/register?plan=weekly" className="w-full">
                  <Button 
                    className="w-full"
                    variant="outline"
                    data-testid="select-weekly-btn"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Select Weekly Plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
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
                  onClick={() => handleSelectPlan("yearly")}
                  className="w-full bg-primary hover:bg-primary/90"
                  data-testid="select-yearly-btn"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Select Yearly Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="text-center text-sm text-slate-500 max-w-lg mx-auto mt-10">
            <p>
              Your card will be charged after the 3-day free trial ends. 
              Cancel anytime before the trial ends to avoid charges.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#022C22] py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-400 text-sm">
            © 2025 Summary Boss. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicPricingPage;
