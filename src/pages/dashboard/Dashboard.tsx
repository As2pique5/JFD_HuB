import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';
import { 
  Users, 
  DollarSign, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  FileText, 
  GitBranch,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      activeMembers: 0,
      activeContributions: 0,
      activeProjects: 0,
      upcomingEvents: 0,
    },
    recentActivities: [],
    upcomingEvents: [],
    pendingContributions: [],
    financialSummary: {
      currentBalance: 0,
      monthlyContributions: 0,
      monthlyExpenses: 0,
    }
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active members count
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch active contributions count
      const { count: contributionsCount } = await supabase
        .from('monthly_contribution_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch active projects count
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      // Fetch upcoming events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'upcoming');

      // Fetch recent activities
      const { data: activities, error: activitiesError } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          user_id,
          profiles!audit_logs_user_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activitiesError) throw activitiesError;

      // Fetch upcoming events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          location,
          type
        `)
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true })
        .limit(3);

      if (eventsError) throw eventsError;

      // Fetch pending contributions
      const { data: contributions, error: contributionsError } = await supabase
        .from('monthly_contribution_assignments')
        .select(`
          id,
          monthly_amount,
          session:session_id (
            name,
            payment_deadline_day
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (contributionsError) throw contributionsError;

      // Calculate financial summary
      const { data: balance } = await supabase
        .from('bank_balance_updates')
        .select('amount')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: monthlyContribs } = await supabase
        .from('contributions')
        .select('amount')
        .gte('payment_date', firstDayOfMonth.toISOString())
        .lte('payment_date', lastDayOfMonth.toISOString())
        .eq('status', 'paid');

      const { data: monthlyExp } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', firstDayOfMonth.toISOString())
        .lte('date', lastDayOfMonth.toISOString());

      const monthlyContributions = monthlyContribs?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const monthlyExpenses = monthlyExp?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      setDashboardData({
        stats: {
          activeMembers: membersCount || 0,
          activeContributions: contributionsCount || 0,
          activeProjects: projectsCount || 0,
          upcomingEvents: eventsCount || 0,
        },
        recentActivities: activities?.map(activity => ({
          ...activity,
          user: activity.profiles
        })) || [],
        upcomingEvents: events || [],
        pendingContributions: contributions || [],
        financialSummary: {
          currentBalance: balance?.amount || 0,
          monthlyContributions,
          monthlyExpenses,
        }
      });

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatActivityAction = (action: string) => {
    switch (action) {
      case 'member_create':
        return 'a créé un membre';
      case 'member_update':
        return 'a modifié un membre';
      case 'member_delete':
        return 'a supprimé un membre';
      case 'password_reset':
        return 'a réinitialisé un mot de passe';
      case 'role_change':
        return 'a modifié un rôle';
      case 'status_change':
        return 'a modifié un statut';
      case 'family_relationships_validate':
        return 'a validé les relations familiales';
      case 'family_relationship_create':
        return 'a créé une relation familiale';
      case 'bank_balance_update':
        return 'a mis à jour le solde bancaire';
      case 'financial_transaction_create':
        return 'a créé une transaction';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const formatActivityDetails = (action: string, details: any) => {
    switch (action) {
      case 'bank_balance_update':
        return `Nouveau solde: ${formatCurrency(details.amount)}`;
      case 'financial_transaction_create':
        return `${details.type === 'income' ? 'Entrée' : 'Dépense'} de ${formatCurrency(details.amount)} - ${details.category}`;
      case 'family_relationships_validate':
        return 'Validation et correction des relations familiales';
      case 'family_relationship_create':
        return 'Nouvelle relation familiale ajoutée';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue, {user?.name}
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <Users className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Membres actifs</p>
              <p className="text-2xl font-semibold text-foreground">{dashboardData.stats.activeMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Cotisations en cours</p>
              <p className="text-2xl font-semibold text-foreground">{dashboardData.stats.activeContributions}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Projets actifs</p>
              <p className="text-2xl font-semibold text-foreground">{dashboardData.stats.activeProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Événements à venir</p>
              <p className="text-2xl font-semibold text-foreground">{dashboardData.stats.upcomingEvents}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Activités récentes</h2>
            <Link to="/audit" className="text-sm text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-border">
            {dashboardData.recentActivities.map((activity: any) => (
              <div key={activity.id} className="px-4 py-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <img
                      src={activity.user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                      alt={activity.user?.name}
                      className="h-8 w-8 rounded-full"
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {activity.user?.name} {formatActivityAction(activity.action)}
                    </div>
                    {activity.details && formatActivityDetails(activity.action, activity.details) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatActivityDetails(activity.action, activity.details)}
                      </p>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Side panel */}
        <div className="space-y-6">
          {/* Upcoming events */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center">
              <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
              <h2 className="font-semibold text-foreground">Événements à venir</h2>
            </div>
            <div className="divide-y divide-border">
              {dashboardData.upcomingEvents.map((event: any) => (
                <div key={event.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.start_date).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{event.location}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border">
              <Link to="/events" className="text-xs text-primary hover:underline">
                Voir tous les événements
              </Link>
            </div>
          </div>
          
          {/* Pending contributions */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h2 className="font-semibold text-foreground">Cotisations en attente</h2>
            </div>
            <div className="divide-y divide-border">
              {dashboardData.pendingContributions.map((contribution: any) => (
                <div key={contribution.id} className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-foreground">{contribution.session.name}</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(contribution.monthly_amount)}</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">Échéance</p>
                    <p className="text-xs text-destructive">
                      {contribution.session.payment_deadline_day} de chaque mois
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border">
              <Link to="/contributions" className="text-xs text-primary hover:underline">
                Voir toutes les cotisations
              </Link>
            </div>
          </div>
          
          {/* Financial summary */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              <h2 className="font-semibold text-foreground">Résumé financier</h2>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">Solde actuel</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(dashboardData.financialSummary.currentBalance)}
                </p>
              </div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">Cotisations ce mois</p>
                <p className="text-sm text-foreground">
                  {formatCurrency(dashboardData.financialSummary.monthlyContributions)}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Dépenses ce mois</p>
                <p className="text-sm text-foreground">
                  {formatCurrency(dashboardData.financialSummary.monthlyExpenses)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}