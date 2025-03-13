import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Search, Filter, Users, ChevronDown, ChevronUp } from 'lucide-react';
import EventContributionList from '../../components/contributions/EventContributionList';
import { useContributionStore } from '../../stores/contributionStore';
import { localMemberService } from '../../services/localMemberService';
import { formatCurrency } from '../../lib/utils';

// Importer le service depuis un fichier local
const localEventContributionService = {
  async getEventContributions(year?: number) {
    try {
      console.log('Récupération des contributions d\'événements pour l\'année:', year);
      // Simuler une requête API réussie avec des données vides pour l'instant
      return { data: [], error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération des contributions d\'événements:', error);
      return { data: null, error };
    }
  }
};

export default function EventContributions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [showMembersList, setShowMembersList] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const updateEventStats = useContributionStore(state => state.updateEventStats);

  // Generate year options (from 2020 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: (currentYear + 5) - 2020 + 1 },
    (_, i) => (currentYear + 5) - i
  );

  // Fetch all members and their contributions
  useEffect(() => {
    const fetchMembersAndContributions = async () => {
      try {
        setMembersLoading(true);
        
        // Fetch all members
        const { data: profiles, error: profilesError } = await localMemberService.getMembers();

        if (profilesError) throw profilesError;

        // Fetch all event contributions
        const { data: events, error: eventsError } = await localEventContributionService.getEventContributions();
        
        if (eventsError) throw eventsError;
        const memberContributions = new Map<string, number>();

        // Calculate total contributions for each member
        if (events && Array.isArray(events)) {
          events.forEach((event: any) => {
            const contribution = event.event_contributions?.[0];
            if (contribution?.event_contribution_assignments) {
              contribution.event_contribution_assignments.forEach((assignment: any) => {
                const currentTotal = memberContributions.get(assignment.user_id) || 0;
                memberContributions.set(assignment.user_id, currentTotal + (assignment.current_amount || 0));
              });
            }
          });
        }

        // Combine member info with their contributions
        const membersWithContributions = profiles?.map((member: { id: string, name: string, email: string, role: string, status: string }) => ({
          ...member,
          totalContribution: memberContributions.get(member.id) || 0
        })) || [];

        // Sort by contribution amount (highest first)
        membersWithContributions.sort((a: { totalContribution: number }, b: { totalContribution: number }) => b.totalContribution - a.totalContribution);

        setAllMembers(membersWithContributions);

      } catch (err) {
        console.error('Error fetching members and contributions:', err);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembersAndContributions();
  }, []);

  // Fetch and update event contribution stats
  useEffect(() => {
    const fetchEventStats = async () => {
      try {
        const { data: events, error: eventsError } = await localEventContributionService.getEventContributions(parseInt(yearFilter));
        
        if (eventsError) throw eventsError;
        
        let totalCollected = 0;
        let totalTarget = 0;
        let completedEvents = 0;
        let totalEvents = 0;

        events?.forEach((event: any) => {
          const contribution = event.event_contributions?.[0];
          if (contribution) {
            totalCollected += contribution.current_amount || 0;
            totalTarget += contribution.target_amount || 0;
            if (contribution.status === 'completed') {
              completedEvents++;
            }
            totalEvents++;
          }
        });

        updateEventStats({
          eventContributions: totalCollected,
          eventTargetAmount: totalTarget,
          eventCompletionRate: totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0,
          eventPaymentRate: totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0,
        });
      } catch (error) {
        console.error('Error fetching event stats:', error);
      }
    };

    fetchEventStats();
  }, [yearFilter, updateEventStats]);

  // Calculate total event contributions
  const totalEventContributions = allMembers.reduce((sum, member) => sum + member.totalContribution, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5" />
          Cotisations pour événements
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un événement..."
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            className="border border-input rounded-md bg-background px-3 py-2"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <EventContributionList searchTerm={searchTerm} yearFilter={parseInt(yearFilter)} />

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
                        {totalEventContributions > 0 
                          ? ((member.totalContribution / totalEventContributions) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-foreground">Total</td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-foreground">
                      {formatCurrency(totalEventContributions)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-muted-foreground">100%</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}