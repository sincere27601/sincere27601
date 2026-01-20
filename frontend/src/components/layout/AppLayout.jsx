import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Mic, 
  Upload, 
  History, 
  FileText,
  LogOut,
  ChevronRight,
  Menu,
  X,
  User,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard },
  { name: "Record Meeting", href: "/app/record", icon: Mic },
  { name: "Upload Audio", href: "/app/upload", icon: Upload },
  { name: "Meeting History", href: "/app/history", icon: History },
  { name: "Profile", href: "/app/profile", icon: Settings },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout } = useAuth();
  
  const isActive = (href) => {
    if (href === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(href);
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when nav item is clicked
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-[#064E3B] text-slate-100 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="sidebar-logo" onClick={handleNavClick}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl font-['Manrope']">Summary Boss</span>
          </Link>
          
          {/* Mobile close button */}
          <button 
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
            onClick={onClose}
            data-testid="close-sidebar-btn"
          >
            <X className="w-5 h-5" />
          </button>
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
                onClick={handleNavClick}
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
        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200 w-full"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
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
      case "/app/profile":
        return "Profile Settings";
      default:
        if (location.pathname.startsWith("/app/meeting/")) {
          return "Meeting Details";
        }
        return "Dashboard";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8" data-testid="app-header">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button 
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
          onClick={onMenuClick}
          data-testid="menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <h1 className="text-xl lg:text-2xl font-semibold text-slate-900 font-['Manrope']">
          {getPageTitle()}
        </h1>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-primary text-white">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">{user?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-rose-600 cursor-pointer" data-testid="dropdown-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
