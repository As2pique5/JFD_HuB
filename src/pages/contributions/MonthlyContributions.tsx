import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Plus, ChevronDown, ChevronUp, Users } from 'lucide-react';
import MonthlyContributionList from '../../components/contributions/MonthlyContributionList';
import { useAuth } from '../../contexts/AuthContext';
import { contributionService } from '../../services/contributionService';
import { formatCurrency } from '../../lib/utils';
import { useContributionStore } from '../../stores/contributionStore';
import { supabase } from '../../lib/supabase';
import MonthlySessionForm from '../../components/contributions/MonthlySessionForm';

export default function MonthlyContributions() {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalTargetAmount: 0,
    totalCollectedAmount: 0,
    averageContributors: 0
  });
  const [showMembersList, setShowMembersList] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  
  const { updateMonthlyStats, updateTopContributors } = useContributionStore();
  
  // Get current year and calculate base year (current year - 2)
  const currentYear = new Date().getFullYear();
  const defaultBaseYear = (currentYear - 2).toString();
  const [baseYear, setBaseYear] = useState<string>(defaultBaseYear);

  // Generate year options (from 2020 to current year + 5)
  const yearOptions = Array.from(
    { length: (currentYear + 5) - 2020 + 1 },
    (_, i) => (currentYear + 5) - i
  );

  // Calculate the 3 consecutive years based on the selected base year
  const yearsToShow = [
    parseInt(baseYear),
    parseInt(baseYear) + 1,
    parseInt(baseYear) + 2
  ];

  // Fetch all members and their contributions
  useEffect(() => {
    const fetchMembersAndContributions = async () => {
      try {
        setMembersLoading(true);
        
        // Fetch all members
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email, role, status')
          .order('name');

        if (profilesError) throw profilesError;

        // Fetch all monthly contributions
        const sessions = await contributionService.getMonthlySessions();
        const memberContributions = new Map<string, number>();

        // Calculate total contributions for each member
        for (const session of sessions || []) {
          const payments = await contributionService.getSessionPayments(session.id);
          for (const payment of payments) {
            const currentTotal = memberContributions.get(payment.user_id) || 0;
            memberContributions.set(payment.user_id, currentTotal + payment.amount);
          }
        }

        // Combine member info with their contributions
        const membersWithContributions = profiles?.map(member => ({
          ...member,
          totalContribution: memberContributions.get(member.id) || 0
        })) || [];

        // Sort by contribution amount (highest first)
        membersWithContributions.sort((a, b) => b.totalContribution - a.totalContribution);

        setAllMembers(membersWithContributions);
        
        // Update top contributors in the global store
        const contributors = membersWithContributions
          .filter(m => m.totalContribution > 0)
          .map(m => ({
            userId: m.id,
            name: m.name,
            amount: m.totalContribution
          }));
        updateTopContributors(contributors);

      } catch (err) {
        console.error('Error fetching members and contributions:', err);
        setError('Une erreur est survenue lors du chargement des données');
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembersAndContributions();
  }, [updateTopContributors]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all sessions for the selected years
      const sessions = await contributionService.getMonthlySessions();
      
      if (!sessions) {
        throw new Error('Impossible de récupérer les sessions');
      }

      // Filter sessions for the selected years
      const relevantSessions = sessions.filter(session => {
        const sessionYear = new Date(session.start_date).getFullYear();
        return yearsToShow.includes(sessionYear);
      });

      // Calculate statistics
      const totalSessions = relevantSessions.length;
      const completedSessions = relevantSessions.filter(s => s.status === 'completed').length;
      
      const totalTargetAmount = relevantSessions.reduce((sum, session) => 
        sum + (session.monthly_target_amount * session.duration_months), 0);
      
      // Calculate total collected amount from all contributions
      let totalCollectedAmount = 0;
      const memberContributions = new Map<string, { userId: string; name: string; amount: number }>();

      for (const session of relevantSessions) {
        const payments = await contributionService.getSessionPayments(session.id);
        
        // Update total amount
        totalCollectedAmount += payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Update member contributions
        for (const payment of payments) {
          const currentTotal = memberContributions.get(payment.user_id)?.amount || 0;
          memberContributions.set(payment.user_id, {
            userId: payment.user_id,
            name: payment.profiles?.name || 'Unknown',
            amount: currentTotal + payment.amount
          });
        }
      }

      const totalContributors = relevantSessions.reduce((sum, session) => 
        sum + (session.monthly_contribution_assignments?.length || 0), 0);
      
      const averageContributors = totalSessions > 0 ? totalContributors / totalSessions : 0;

      setStats({
        totalSessions,
        completedSessions,
        totalTargetAmount,
        totalCollectedAmount,
        averageContributors
      });

      // Update global store
      updateMonthlyStats({
        monthlyContributions: totalCollectedAmount,
        monthlyTargetAmount: totalTargetAmount,
        monthlyCompletionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        monthlyPaymentRate: totalTargetAmount > 0 ? (totalCollectedAmount / totalTargetAmount) * 100 : 0,
      });

    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Only fetch stats when years change
  useEffect(() => {
    fetchStats();
  }, [baseYear]); // Only depend on baseYear since it determines yearsToShow

  const handleCreateSession = () => {
    setShowSessionForm(true);
  };

  const handleSessionSuccess = () => {
    fetchStats();
    setShowSessionForm(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Cotisations Mensuelles
        </h2>
        {isAdmin() && (
          <button
            onClick={handleCreateSession}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle session
          </button>
        )}
      </div>

      {/* Section recherche */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Rechercher une session..."
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            className="border border-input rounded-md bg-background px-3 py-2"
            value={baseYear}
            onChange={(e) => setBaseYear(e.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year} - {year + 2}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Sessions</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total des sessions</span>
              <span className="text-sm font-medium text-foreground">{stats.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sessions terminées</span>
              <span className="text-sm font-medium text-foreground">{stats.completedSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Moyenne contributeurs</span>
              <span className="text-sm font-medium text-foreground">
                {stats.averageContributors.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Montants</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Montant total cible</span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(stats.totalTargetAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Montant total cotisé</span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(stats.totalCollectedAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Taux de complétion</span>
              <span className="text-sm font-medium text-foreground">
                {stats.totalSessions > 0 
                  ? ((stats.completedSessions / stats.totalSessions) * 100).toFixed(1) 
                  : '0'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Taux de paiement</span>
              <span className="text-sm font-medium text-foreground">
                {stats.totalTargetAmount > 0 
                  ? ((stats.totalCollectedAmount / stats.totalTargetAmount) * 100).toFixed(1) 
                  : '0'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des sessions */}
      <MonthlyContributionList 
        searchTerm={searchTerm}
        yearsToShow={yearsToShow}
      />

      {/* Section des contributions par membre */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden mt-8">
        <div 
          className="px-4 py-3 border-b border-border flex items-center justify-between cursor-pointer"
          onClick={() => setShowMembersList(!showMembersList)}
        >
          <div className="flex items-center">
            <Users className="h-5 w-5 text-muted-foreground mr-2" />
            <h2 className="font-semibold text-foreground">Contributions par membre</h2>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground mr-2">
              {allMembers.length} membre(s)
            </span>
            {showMembersList ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {showMembersList && (
          <div className="overflow-x-auto">
            {membersLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                <p className="mt-2 text-sm text-muted-foreground">Chargement des données...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Membre</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Rôle</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Total cotisé</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">% du total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/50">
                      <td className="px-4 py-2 text-sm font-medium text-foreground">
                        {member.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-foreground">
                        {member.role === 'super_admin' ? 'Super Admin' :
                         member.role === 'intermediate' ? 'Intermédiaire' : 'Standard'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {member.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-foreground">
                        {formatCurrency(member.totalContribution)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-muted-foreground">
                        {stats.totalCollectedAmount > 0 
                          ? ((member.totalContribution / stats.totalCollectedAmount) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-foreground">Total</td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-foreground">
                      {formatCurrency(stats.totalCollectedAmount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-muted-foreground">100%</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Monthly Session Form Modal */}
      {showSessionForm && (
        <MonthlySessionForm
          onClose={() => setShowSessionForm(false)}
          onSuccess={handleSessionSuccess}
        />
      )}
    </div>
  );
}