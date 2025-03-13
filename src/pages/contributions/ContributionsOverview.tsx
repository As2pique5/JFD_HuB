import { useState, useEffect } from 'react';
import { useContributionStore } from '../../stores/contributionStore';
import { formatCurrency } from '../../lib/utils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { DollarSign, Calendar, Briefcase, Users, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { localMemberService } from '../../services/localMemberService';
import { localContributionService } from '../../services/localContributionService';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ContributionsOverview() {
  const [showAllContributors, setShowAllContributors] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    monthlyContributions,
    eventContributions,
    projectContributions,
    totalContributions,
  } = useContributionStore();

  // Fetch all members and calculate their total contributions
  useEffect(() => {
    const fetchMembersAndContributions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all members
        const { data: profiles, error: profilesError } = await localMemberService.getMembers();

        if (profilesError) throw profilesError;

        // Fetch all contributions
        const { data: contributions, error: contribError } = await localContributionService.getPaidContributions();

        if (contribError) throw contribError;

        // Calculate total contributions for each member
        const memberContributions = new Map<string, number>();
        
        for (const contribution of contributions || []) {
          const currentTotal = memberContributions.get(contribution.user_id) || 0;
          memberContributions.set(contribution.user_id, currentTotal + contribution.amount);
        }

        // Combine member info with their contributions
        const membersWithContributions = profiles && Array.isArray(profiles) ? profiles.map((member: { id: string, name: string, email: string, role: string, status: string }) => ({
          ...member,
          totalContribution: memberContributions.get(member.id) || 0
        })) : [];

        // Sort by contribution amount (highest first)
        membersWithContributions.sort((a: { totalContribution: number }, b: { totalContribution: number }) => b.totalContribution - a.totalContribution);

        setAllMembers(membersWithContributions);
      } catch (err) {
        console.error('Error fetching members and contributions:', err);
        setError('Une erreur est survenue lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchMembersAndContributions();
  }, []);

  const contributionDistribution = {
    labels: ['Cotisations Mensuelles', 'Cotisations Événements', 'Cotisations Projets'],
    datasets: [{
      data: [monthlyContributions, eventContributions, projectContributions],
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(153, 102, 255, 0.7)',
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1,
    }],
  };

  const displayedContributors = showAllContributors ? allMembers : allMembers.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total des cotisations</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(totalContributions)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Cotisations mensuelles</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(monthlyContributions)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Cotisations événements</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(eventContributions)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Cotisations projets</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(projectContributions)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contribution Distribution Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground mr-2" />
            <h2 className="font-semibold text-foreground">Répartition des cotisations</h2>
          </div>
          <div className="h-64">
            <Pie 
              data={contributionDistribution} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-muted-foreground mr-2" />
                <h2 className="font-semibold text-foreground">Top contributeurs</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {allMembers.length} membre(s)
              </span>
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              <p className="mt-2 text-sm text-muted-foreground">Chargement des données...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              {error}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {displayedContributors.map((member) => (
                  <div key={member.id} className="px-4 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.role === 'super_admin' ? 'Super Admin' :
                           member.role === 'intermediate' ? 'Intermédiaire' : 'Standard'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(member.totalContribution)}</p>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2" 
                          style={{ width: `${(member.totalContribution / totalContributions) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {member.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {((member.totalContribution / totalContributions) * 100).toFixed(1)}% du total
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {allMembers.length > 5 && (
                <div className="px-4 py-3 border-t border-border">
                  <button
                    onClick={() => setShowAllContributors(!showAllContributors)}
                    className="w-full text-sm text-primary hover:text-primary/90 flex items-center justify-center"
                  >
                    {showAllContributors ? (
                      <>
                        Voir moins
                        <ChevronUp className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Voir tous les membres
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}