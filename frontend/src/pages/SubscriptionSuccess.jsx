import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Loader2,
  PartyPopper,
  ArrowRight,
  XCircle
} from "lucide-react";
import { subscriptionApi } from "@/lib/api";

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [status, setStatus] = useState("loading");
  const [paymentData, setPaymentData] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;
  const pollInterval = 2000;

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus("error");
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    if (attempts >= maxAttempts) {
      setStatus("timeout");
      return;
    }

    try {
      const data = await subscriptionApi.getStatus(sessionId);
      setPaymentData(data);

      if (data.payment_status === "paid") {
        setStatus("success");
        return;
      } else if (data.status === "expired") {
        setStatus("expired");
        return;
      }

      // Continue polling
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    } catch (error) {
      console.error("Error checking payment status:", error);
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    }
  };

  if (status === "loading") {
    return (
      <div className="max-w-lg mx-auto" data-testid="payment-loading">
        <Card>
          <CardContent className="p-12 text-center space-y-6">
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-['Manrope'] mb-2">
                Processing Payment...
              </h2>
              <p className="text-slate-500">
                Please wait while we confirm your payment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="max-w-lg mx-auto" data-testid="payment-success">
        <Card>
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <PartyPopper className="w-6 h-6 text-amber-500" />
                <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
                  Welcome to SummaryBoss Pro!
                </h2>
                <PartyPopper className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-slate-500">
                Your subscription has been activated successfully.
              </p>
            </div>

            {paymentData && (
              <div className="bg-slate-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-slate-900 mb-2">Subscription Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plan:</span>
                    <span className="font-medium">{paymentData.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-medium">
                      ${paymentData.amount?.toFixed(2)} {paymentData.currency?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-medium text-emerald-600">Active</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link to="/app" className="block">
                <Button className="w-full" data-testid="go-to-dashboard-btn">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/app/record" className="block">
                <Button variant="outline" className="w-full">
                  Start Recording a Meeting
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error/timeout/expired states
  return (
    <div className="max-w-lg mx-auto" data-testid="payment-error">
      <Card>
        <CardContent className="p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-rose-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-['Manrope'] mb-2">
              {status === "timeout" ? "Payment Status Unknown" : 
               status === "expired" ? "Payment Expired" : "Payment Failed"}
            </h2>
            <p className="text-slate-500">
              {status === "timeout" 
                ? "We couldn't confirm your payment status. Please check your email for confirmation or contact support."
                : status === "expired"
                ? "Your payment session has expired. Please try again."
                : "Something went wrong with your payment. Please try again."}
            </p>
          </div>

          <div className="space-y-3">
            <Link to="/app/subscription" className="block">
              <Button className="w-full" data-testid="try-again-btn">
                Try Again
              </Button>
            </Link>
            <Link to="/app" className="block">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
