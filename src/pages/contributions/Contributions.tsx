import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { DollarSign, Calendar, Briefcase, PieChart, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';
import ContributionsOverview from './ContributionsOverview';
import MonthlyContributions from './MonthlyContributions';
import EventContributions from './EventContributions';
import ProjectContributions from './ProjectContributions';
import FinancialTransactions from './FinancialTransactions';

export default function Contributions() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/monthly')) return 'monthly';
    if (location.pathname.includes('/events')) return 'events';
    if (location.pathname.includes('/projects')) return 'projects';
    if (location.pathname.includes('/transactions')) return 'transactions';
    return 'overview';
  });

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: PieChart, path: '/contributions' },
    { id: 'monthly', name: 'Cotisations mensuelles', icon: Calendar, path: '/contributions/monthly' },
    { id: 'events', name: 'Cotisations événements', icon: Calendar, path: '/contributions/events' },
    { id: 'projects', name: 'Cotisations projets', icon: Briefcase, path: '/contributions/projects' },
    { id: 'transactions', name: 'Transactions financières', icon: Wallet, path: '/contributions/transactions' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <DollarSign className="mr-2 h-6 w-6" />
          Gestion des Cotisations
        </h1>
      </div>

      <div className="border-b border-border">
        <nav className="flex space-x-4 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      <Routes>
        <Route index element={<ContributionsOverview />} />
        <Route path="/monthly" element={<MonthlyContributions />} />
        <Route path="/events" element={<EventContributions />} />
        <Route path="/projects" element={<ProjectContributions />} />
        <Route path="/transactions" element={<FinancialTransactions />} />
      </Routes>
    </div>
  );
}