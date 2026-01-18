import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Mic, 
  FileText, 
  Clock, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Play,
  Upload,
  FileSearch,
  Check,
  Star
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Record Meetings",
    description: "Record meetings directly in your browser with high-quality audio capture."
  },
  {
    icon: FileText,
    title: "AI Transcription",
    description: "Powered by OpenAI Whisper for accurate speech-to-text conversion."
  },
  {
    icon: Zap,
    title: "Smart Summaries",
    description: "GPT-5.2 generates comprehensive business summaries automatically."
  },
  {
    icon: CheckCircle,
    title: "Action Items",
    description: "Extract key decisions, action items, and topics from every meeting."
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "Turn hour-long meetings into digestible summaries in minutes."
  },
  {
    icon: FileSearch,
    title: "Searchable History",
    description: "Find any meeting detail with full-text search across all transcripts."
  }
];

const howItWorks = [
  {
    step: 1,
    icon: Mic,
    title: "Record or Upload",
    description: "Record your meeting live or upload an existing audio file."
  },
  {
    step: 2,
    icon: FileText,
    title: "AI Transcription",
    description: "Our AI transcribes your meeting with high accuracy."
  },
  {
    step: 3,
    icon: Zap,
    title: "Get Summary",
    description: "Receive a comprehensive summary with action items."
  }
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200" data-testid="landing-header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="logo">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl font-['Manrope'] text-slate-900">Summary Boss</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link" data-testid="nav-features">Features</a>
            <a href="#how-it-works" className="nav-link" data-testid="nav-how-it-works">How it Works</a>
            <a href="#pricing" className="nav-link" data-testid="nav-pricing">Pricing</a>
          </nav>
          
          <Link to="/app" data-testid="get-started-btn">
            <Button className="bg-primary hover:bg-primary/90">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20 px-6" data-testid="hero-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 font-['Manrope'] tracking-tight leading-tight">
                Turn Meetings into
                <span className="text-primary"> Actionable Insights</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
                Record, transcribe, and summarize your meetings with AI. 
                Get key decisions, action items, and topics extracted automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/app/record" data-testid="cta-record">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </Button>
                </Link>
                <Link to="/app/upload" data-testid="cta-upload">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Audio
                  </Button>
                </Link>
              </div>
              
              {/* Trust indicators */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[
                    "https://images.unsplash.com/photo-1651684215020-f7a5b6610f23?w=100&h=100&fit=crop",
                    "https://images.unsplash.com/photo-1576558656222-ba66febe3dec?w=100&h=100&fit=crop",
                    "https://images.unsplash.com/photo-1762522921456-cdfe882d36c3?w=100&h=100&fit=crop"
                  ].map((src, i) => (
                    <img 
                      key={i}
                      src={src}
                      alt="User"
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">1,000+</span> meetings summarized
                </p>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1758691736975-9f7f643d178e?w=600&h=400&fit=crop"
                alt="Team meeting in modern office"
                className="rounded-2xl shadow-2xl shadow-slate-200/50 w-full"
                data-testid="hero-image"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Summary Ready</p>
                    <p className="text-sm text-slate-500">3 action items extracted</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Manrope'] mb-4">
              Everything you need for meeting documentation
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful AI tools to capture, transcribe, and summarize your meetings automatically.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="feature-card"
                  data-testid={`feature-${index}`}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 font-['Manrope'] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50" data-testid="how-it-works-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Manrope'] mb-4">
              How it Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple steps to transform your meetings into actionable summaries.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index} 
                  className="text-center"
                  data-testid={`step-${item.step}`}
                >
                  <div className="relative inline-block mb-6">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 font-['Manrope'] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/app" data-testid="cta-try-now">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Try it Now - It's Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#064E3B]" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white font-['Manrope'] mb-6">
            Ready to Transform Your Meetings?
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Start recording and summarizing your meetings today. Choose a plan that works for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/app/subscription" data-testid="cta-view-pricing">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                View Pricing
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/app" data-testid="cta-get-started-bottom">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Try Free Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section id="pricing" className="py-20 px-6" data-testid="pricing-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Manrope'] mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. Cancel anytime.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Monthly</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">$9.99</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited meetings", "AI transcription", "Smart summaries", "Action items"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <Check className="w-5 h-5 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/app/subscription">
                <Button variant="outline" className="w-full">Choose Monthly</Button>
              </Link>
            </div>

            {/* Yearly */}
            <div className="bg-white border-2 border-primary rounded-2xl p-8 relative hover:shadow-lg transition-shadow">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Star className="w-3 h-3" /> Save $40
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Yearly</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">$79.99</span>
                <span className="text-slate-500">/year</span>
                <p className="text-sm text-emerald-600 mt-1">$6.67/month</p>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited meetings", "AI transcription", "Smart summaries", "Action items", "Priority support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <Check className="w-5 h-5 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/app/subscription">
                <Button className="w-full bg-primary hover:bg-primary/90">Choose Yearly</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#022C22] py-12 px-6" data-testid="footer">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl font-['Manrope'] text-white">Summary Boss</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2025 Summary Boss. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
