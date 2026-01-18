import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Zap,
  Star,
  ArrowRight,
  Loader2
} from "lucide-react";
import { subscriptionApi } from "@/lib/api";
import { toast } from "sonner";

const PricingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await subscriptionApi.getPlans();
      setPlans(data.plans || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      // Use default plans if API fails
      setPlans([
        {
          id: "monthly",
          name: "Monthly Plan",
          price: 9.99,
          interval: "month",
          description: "Unlimited meetings, transcriptions & summaries"
        },
        {
          id: "yearly",
          name: "Yearly Plan",
          price: 79.99,
          interval: "year",
          description: "Unlimited meetings, transcriptions & summaries (Save $40!)"
        }
      ]);
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
        window.location.href = result.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
      setProcessingPlan(null);
    }
  };

  const features = [
    "Unlimited meeting recordings",
    "AI-powered transcription",
    "Smart meeting summaries",
    "Action items extraction",
    "Key decisions tracking",
    "Topic identification",
    "Full-text search",
    "Export to text files",
    "Priority support"
  ];

  return (
    <div className="space-y-8" data-testid="pricing-page">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] mb-3">
          Choose Your Plan
        </h1>
        <p className="text-slate-600 max-w-xl mx-auto">
          Unlock unlimited meeting summaries and take your productivity to the next level.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <Card className="relative" data-testid="plan-monthly">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-['Manrope'] text-xl">Monthly</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold text-slate-900">$9.99</span>
              <span className="text-slate-500">/month</span>
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
              onClick={() => handleSubscribe("monthly")}
              disabled={processingPlan === "monthly"}
              className="w-full"
              variant="outline"
              data-testid="subscribe-monthly-btn"
            >
              {processingPlan === "monthly" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Subscribe Monthly
                  <ArrowRight className="w-4 h-4 ml-2" />
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
            <CardDescription>Save $40 compared to monthly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold text-slate-900">$79.99</span>
              <span className="text-slate-500">/year</span>
              <p className="text-sm text-emerald-600 font-medium mt-1">
                That's only $6.67/month!
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
                  <Zap className="w-4 h-4 mr-2" />
                  Subscribe Yearly & Save
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ/Info */}
      <div className="text-center text-sm text-slate-500 max-w-lg mx-auto">
        <p>
          All plans include a 30-day money-back guarantee. 
          Cancel anytime with no questions asked.
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
