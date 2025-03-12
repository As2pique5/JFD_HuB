import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  DollarSign, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  FileText, 
  GitBranch, 
  X 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  
  const navigation = [
    { name: 'Tableau de bord', href: '/', icon: Home },
    { name: 'Membres', href: '/members', icon: Users },
    { name: 'Cotisations', href: '/contributions', icon: DollarSign },
    { name: 'Projets', href: '/projects', icon: Briefcase },
    { name: 'Événements', href: '/events', icon: Calendar },
    { name: 'Messagerie', href: '/messages', icon: MessageSquare },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Arbre généalogique', href: '/family-tree', icon: GitBranch },
  ];

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold">JFD</span>
            </div>
            <span className="text-lg font-semibold text-foreground">JFD'HuB</span>
          </Link>
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* User info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img
              className="h-10 w-10 rounded-full"
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
              alt={user?.name || 'User avatar'}
            />
            <div>
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {user?.role === 'super_admin' ? 'Super Administrateur' : 
                 user?.role === 'intermediate' ? 'Membre Intermédiaire' : 'Membre Standard'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
                            (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
                onClick={() => setOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            JFD'HuB v0.1.0 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}