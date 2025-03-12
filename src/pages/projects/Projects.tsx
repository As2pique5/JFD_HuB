import { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/utils';
import { Briefcase, Plus, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import ProjectForm from '../../components/projects/ProjectForm';
import ProjectPhaseForm from '../../components/projects/ProjectPhaseForm';
import ProjectParticipantForm from '../../components/projects/ProjectParticipantForm';

export default function Projects() {
  const { isAdmin, isIntermediate, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);

  // Generate year options (from 2020 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: (currentYear + 5) - 2020 + 1 },
    (_, i) => (currentYear + 5) - i
  );

  useEffect(() => {
    fetchProjects();
  }, [yearFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await projectService.getProjects({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
      });

      // Filter projects by year
      const filteredProjects = data?.filter(project => {
        const projectYear = new Date(project.start_date).getFullYear();
        return projectYear === parseInt(yearFilter);
      }) || [];

      setProjects(filteredProjects);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError('Une erreur est survenue lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (project: any) => {
    setSelectedProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;

    try {
      setError(null);
      await projectService.deleteProject(projectId, user.id);
      await fetchProjects(); // Refresh the projects list after deletion
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setError(err.message || 'Une erreur est survenue lors de la suppression du projet');
    }
  };

  const handleCreatePhase = (project: any) => {
    setSelectedProject(project);
    setSelectedPhase(null);
    setShowPhaseForm(true);
  };

  const handleEditPhase = (project: any, phase: any) => {
    setSelectedProject(project);
    setSelectedPhase(phase);
    setShowPhaseForm(true);
  };

  const handleAddParticipant = (project: any) => {
    setSelectedProject(project);
    setShowParticipantForm(true);
  };

  // Filter projects based on search term and status filter
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Terminé
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            En cours
          </span>
        );
      case 'not_started':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            Non démarré
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            Annulé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
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
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <Briefcase className="mr-2 h-6 w-6" />
          Gestion des Projets
        </h1>
        {isAdmin() && (
          <button
            onClick={handleCreateProject}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un projet..."
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            className="border border-input rounded-md bg-background px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="not_started">Non démarrés</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminés</option>
            <option value="cancelled">Annulés</option>
          </select>
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

      {/* Projects list */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Aucun projet trouvé.</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div key={project.id} className="bg-card border border-border rounded-lg shadow-sm">
              <div 
                className="px-4 py-3 border-b border-border cursor-pointer"
                onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-foreground">{project.title}</h3>
                      <div className="ml-2">
                        {getStatusBadge(project.status)}
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-4">
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(project.budget)}
                      </p>
                    </div>
                    {expandedProject === project.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {expandedProject === project.id && (
                <>
                  <div className="p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(project.budget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dépenses</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(project.spent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Début</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(project.start_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fin prévue</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(project.end_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Progression globale</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2" 
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">{project.progress}% complété</p>
                    </div>

                    {/* Project phases */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground">Phases du projet</h4>
                        {isAdmin() && (
                          <button
                            onClick={() => handleCreatePhase(project)}
                            className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs flex items-center"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Ajouter une phase
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {project.project_phases?.map((phase: any) => (
                          <div key={phase.id} className="bg-background border border-border rounded-md p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">{phase.name}</p>
                              {getStatusBadge(phase.status)}
                            </div>
                            <div className="mt-2">
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-primary rounded-full h-1.5" 
                                  style={{ width: `${phase.progress}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 text-right">{phase.progress}%</p>
                            </div>
                            {isAdmin() && (
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={() => handleEditPhase(project, phase)}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Modifier
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {(!project.project_phases || project.project_phases.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Aucune phase définie
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Project participants */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground">Participants</h4>
                        {isAdmin() && (
                          <button
                            onClick={() => handleAddParticipant(project)}
                            className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs flex items-center"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Ajouter un participant
                          </button>
                        )}
                      </div>
                      <div className="bg-background border border-border rounded-md p-3">
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground">Responsable du projet</p>
                          <p className="text-sm font-medium text-foreground">{project.manager?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Membres participants</p>
                          <div className="flex flex-wrap gap-2">
                            {project.project_participants?.map((participant: any) => (
                              <div 
                                key={participant.id} 
                                className="bg-muted px-2 py-1 rounded-md text-xs text-foreground"
                              >
                                {participant.profiles?.name}
                              </div>
                            ))}
                            {(!project.project_participants || project.project_participants.length === 0) && (
                              <p className="text-sm text-muted-foreground">
                                Aucun participant
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isAdmin() && (
                    <div className="flex justify-end space-x-2 p-4 border-t border-border">
                      <button
                        onClick={() => handleEditProject(project)}
                        className="bg-muted text-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {showProjectForm && (
        <ProjectForm
          onClose={() => {
            setShowProjectForm(false);
            setSelectedProject(null);
          }}
          onSuccess={fetchProjects}
          initialData={selectedProject}
          isEditing={!!selectedProject}
        />
      )}

      {showPhaseForm && selectedProject && (
        <ProjectPhaseForm
          projectId={selectedProject.id}
          onClose={() => {
            setShowPhaseForm(false);
            setSelectedProject(null);
            setSelectedPhase(null);
          }}
          onSuccess={fetchProjects}
          initialData={selectedPhase}
          isEditing={!!selectedPhase}
        />
      )}

      {showParticipantForm && selectedProject && (
        <ProjectParticipantForm
          projectId={selectedProject.id}
          onClose={() => {
            setShowParticipantForm(false);
            setSelectedProject(null);
          }}
          onSuccess={fetchProjects}
          existingParticipants={selectedProject.project_participants?.map((p: any) => p.user_id) || []}
        />
      )}
    </div>
  );
}