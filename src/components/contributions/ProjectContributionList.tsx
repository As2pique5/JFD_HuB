import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { localProjectContributionService } from '../../services/localProjectContributionService';
import { formatCurrency } from '../../lib/utils';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import ProjectContributionForm from '../projects/ProjectContributionForm';
import ProjectContributionAssignmentForm from '../projects/ProjectContributionAssignmentForm';
import PaymentForm from './PaymentForm';

interface ProjectContributionListProps {
  searchTerm: string;
  yearFilter: number;
}

export default function ProjectContributionList({ searchTerm, yearFilter }: ProjectContributionListProps) {
  const { isAdmin, isIntermediate } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    yearProjects: 0,
    fullyPaidProjects: 0,
    totalContributions: 0,
    averageContribution: 0,
    participationRate: 0
  });
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
  }, [yearFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await localProjectContributionService.getProjectContributions(yearFilter);

      // Calculate statistics
      const yearProjects = data?.filter((project: any) => new Date(project.start_date).getFullYear() === yearFilter) || [];
      const fullyPaidProjects = yearProjects.filter((project: any) => {
        const contribution = project.project_contributions?.[0];
        return contribution && contribution.current_amount >= contribution.target_amount;
      });

      const totalContributions = yearProjects.reduce((sum: number, project: any) => {
        return sum + (project.project_contributions?.[0]?.current_amount || 0);
      }, 0);

      const averageContribution = yearProjects.length > 0 ? totalContributions / yearProjects.length : 0;

      const totalParticipants = yearProjects.reduce((sum: number, project: any) => {
        return sum + (project.project_contributions?.[0]?.project_contribution_assignments?.length || 0);
      }, 0);

      const totalPaidParticipants = yearProjects.reduce((sum: number, project: any) => {
        const assignments = project.project_contributions?.[0]?.project_contribution_assignments || [];
        return sum + assignments.filter((a: any) => (a.current_amount || 0) >= (a.target_amount || 0)).length;
      }, 0);

      const participationRate = totalParticipants > 0 ? (totalPaidParticipants / totalParticipants) * 100 : 0;

      setStats({
        totalProjects: data?.length || 0,
        yearProjects: yearProjects.length,
        fullyPaidProjects: fullyPaidProjects.length,
        totalContributions,
        averageContribution,
        participationRate
      });

      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Une erreur est survenue lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on search term
  const filteredProjects = projects.filter(project => {
    return project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           project.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateContribution = (project: any) => {
    setSelectedProject(project);
    setShowContributionForm(true);
  };

  const handleCreateAssignments = (project: any) => {
    setSelectedProject(project);
    setShowAssignmentForm(true);
  };

  const handleRecordPayment = (project: any, assignment: any) => {
    setSelectedProject(project);
    setSelectedAssignment(assignment);
    setShowPaymentForm(true);
  };

  const getPaymentStatus = (assignment: any) => {
    const currentAmount = assignment.current_amount || 0;
    const targetAmount = assignment.target_amount || 0;

    if (currentAmount >= targetAmount) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          Payé
        </span>
      );
    } else if (currentAmount > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          En cours
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          Non payé
        </span>
      );
    }
  };

  const isFullyPaid = (assignment: any) => {
    return (assignment.current_amount || 0) >= (assignment.target_amount || 0);
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
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Statistiques {yearFilter}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Projets de l'année</span>
              <span className="text-sm font-medium text-foreground">{stats.yearProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Entièrement cotisés</span>
              <span className="text-sm font-medium text-foreground">{stats.fullyPaidProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total collecté</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(stats.totalContributions)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Moyennes</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Contribution moyenne</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(stats.averageContribution)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Taux de participation</span>
              <span className="text-sm font-medium text-foreground">{stats.participationRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Global</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total projets</span>
              <span className="text-sm font-medium text-foreground">{stats.totalProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Taux de réussite</span>
              <span className="text-sm font-medium text-foreground">
                {stats.yearProjects > 0 ? ((stats.fullyPaidProjects / stats.yearProjects) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Aucun projet avec cotisation trouvé pour cette année.</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const contribution = project.project_contributions?.[0];
            const hasAssignments = contribution?.project_contribution_assignments?.length > 0;
            const totalContributors = contribution?.project_contribution_assignments?.length || 0;
            const progress = contribution ? (contribution.current_amount / contribution.target_amount) * 100 : 0;
            
            return (
              <div key={project.id} className="bg-card border border-border rounded-lg shadow-sm">
                <div 
                  className="px-4 py-3 border-b border-border cursor-pointer"
                  onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    </div>
                    <div className="flex items-center">
                      {contribution ? (
                        <div className="text-right mr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{totalContributors} contributeur(s)</span>
                            <span className="text-sm font-medium text-foreground">
                              {formatCurrency(contribution.current_amount)} / {formatCurrency(contribution.target_amount)}
                            </span>
                          </div>
                          <div className="w-48 bg-muted rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                progress >= 100 
                                  ? 'bg-green-500' 
                                  : progress > 0 
                                    ? 'bg-primary' 
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-right">
                            {progress.toFixed(1)}% collecté
                          </p>
                        </div>
                      ) : isAdmin() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateContribution(project);
                          }}
                          className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm mr-4"
                        >
                          Configurer la cotisation
                        </button>
                      )}
                      {expandedProject === project.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedProject === project.id && contribution && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Montant cible</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(contribution.target_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date de début</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(contribution.start_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Durée</p>
                        <p className="text-sm font-medium text-foreground">
                          {contribution.duration_months} mois
                        </p>
                      </div>
                    </div>

                    {hasAssignments ? (
                      <div className="mt-4">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Membre</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Montant mensuel</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Total à payer</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Déjà payé</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Statut</th>
                              {isIntermediate() && (
                                <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {contribution.project_contribution_assignments.map((assignment: any) => (
                              <tr key={assignment.id} className="hover:bg-muted/50">
                                <td className="px-4 py-2 text-sm font-medium text-foreground">
                                  {assignment.profiles?.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(assignment.monthly_amount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(assignment.target_amount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(assignment.current_amount || 0)}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {getPaymentStatus(assignment)}
                                </td>
                                {isIntermediate() && (
                                  <td className="px-4 py-2 text-sm text-right">
                                    {!isFullyPaid(assignment) && (
                                      <button
                                        onClick={() => handleRecordPayment(project, assignment)}
                                        className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
                                      >
                                        Enregistrer un paiement
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : isAdmin() && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => handleCreateAssignments(project)}
                          className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm flex items-center"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Attribuer les montants
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showContributionForm && selectedProject && (
        <ProjectContributionForm
          projectId={selectedProject.id}
          onClose={() => {
            setShowContributionForm(false);
            setSelectedProject(null);
          }}
          onSuccess={fetchProjects}
        />
      )}

      {showAssignmentForm && selectedProject && (
        <ProjectContributionAssignmentForm
          projectId={selectedProject.id}
          targetAmount={selectedProject.project_contributions[0].target_amount}
          startDate={selectedProject.project_contributions[0].start_date}
          durationMonths={selectedProject.project_contributions[0].duration_months}
          onClose={() => {
            setShowAssignmentForm(false);
            setSelectedProject(null);
          }}
          onSuccess={fetchProjects}
        />
      )}

      {showPaymentForm && selectedProject && selectedAssignment && (
        <PaymentForm
          userId={selectedAssignment.user_id}
          projectId={selectedProject.id}
          expectedAmount={selectedAssignment.monthly_amount}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedProject(null);
            setSelectedAssignment(null);
          }}
          onSuccess={fetchProjects}
        />
      )}
    </div>
  );
}