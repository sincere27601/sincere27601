import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Mic, 
  Upload, 
  History, 
  FileText,
  LogOut,
  Settings,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard },
  { name: "Record Meeting", href: "/app/record", icon: Mic },
  { name: "Upload Audio", href: "/app/upload", icon: Upload },
  { name: "Meeting History", href: "/app/history", icon: History },
];

export const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (href) => {
    if (href === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0F172A] text-slate-100 flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3" data-testid="sidebar-logo">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl font-['Manrope']">SummaryAI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              to={item.href}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                active 
                  ? "bg-white/15 text-white font-medium" 
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/10">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200"
          data-testid="nav-back-to-home"
        >
          <LogOut className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </aside>
  );
};

export const Header = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/app":
        return "Dashboard";
      case "/app/record":
        return "Record Meeting";
      case "/app/upload":
        return "Upload Audio";
      case "/app/history":
        return "Meeting History";
      default:
        if (location.pathname.startsWith("/app/meeting/")) {
          return "Meeting Details";
        }
        return "Dashboard";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8" data-testid="app-header">
      <h1 className="text-2xl font-semibold text-slate-900 font-['Manrope']">
        {getPageTitle()}
      </h1>
    </header>
  );
};

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
