import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/eventService';
import { formatCurrency } from '../../lib/utils';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import EventContributionForm from './EventContributionForm';
import EventContributionAssignmentForm from './EventContributionAssignmentForm';
import PaymentForm from './PaymentForm';

interface EventContributionListProps {
  searchTerm: string;
  yearFilter: number;
}

export default function EventContributionList({ searchTerm, yearFilter }: EventContributionListProps) {
  const { isAdmin, isIntermediate } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    yearEvents: 0,
    fullyPaidEvents: 0,
    totalContributions: 0,
    averageContribution: 0,
    participationRate: 0
  });
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  useEffect(() => {
    fetchEvents();
  }, [yearFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get events with contributions
      const { data: events, error } = await eventService.getEvents({
        requiresContribution: true,
      });

      if (error) throw error;

      // Filter events for the selected year
      const relevantEvents = events?.filter(event => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear === yearFilter;
      }) || [];

      // Calculate statistics
      const yearEvents = relevantEvents.length;
      const fullyPaidEvents = relevantEvents.filter(event => {
        const contribution = event.event_contributions?.[0];
        return contribution && contribution.current_amount >= contribution.target_amount;
      }).length;
      
      const totalContributions = relevantEvents.reduce((sum, event) => {
        const contribution = event.event_contributions?.[0];
        return sum + (contribution?.current_amount || 0);
      }, 0);

      const averageContribution = yearEvents > 0 ? totalContributions / yearEvents : 0;

      const totalParticipants = relevantEvents.reduce((sum, event) => {
        const contribution = event.event_contributions?.[0];
        return sum + (contribution?.event_contribution_assignments?.length || 0);
      }, 0);

      const totalPaidParticipants = relevantEvents.reduce((sum, event) => {
        const contribution = event.event_contributions?.[0];
        const assignments = contribution?.event_contribution_assignments || [];
        return sum + assignments.filter((a: any) => (a.current_amount || 0) >= (a.target_amount || 0)).length;
      }, 0);

      const participationRate = totalParticipants > 0 ? (totalPaidParticipants / totalParticipants) * 100 : 0;

      setStats({
        totalEvents: events?.length || 0,
        yearEvents,
        fullyPaidEvents,
        totalContributions,
        averageContribution,
        participationRate
      });

      setEvents(relevantEvents);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on search term
  const filteredEvents = events.filter(event => {
    return event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           event.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateContribution = (event: any) => {
    setSelectedEvent(event);
    setShowContributionForm(true);
  };

  const handleCreateAssignments = (event: any) => {
    setSelectedEvent(event);
    setShowAssignmentForm(true);
  };

  const handleRecordPayment = (event: any, assignment: any) => {
    setSelectedEvent(event);
    setSelectedAssignment(assignment);
    setShowPaymentForm(true);
  };

  const getPaymentStatus = (event: any, assignment: any) => {
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

  const isFullyPaid = (event: any, assignment: any) => {
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
              <span className="text-sm text-muted-foreground">Événements de l'année</span>
              <span className="text-sm font-medium text-foreground">{stats.yearEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Entièrement cotisés</span>
              <span className="text-sm font-medium text-foreground">{stats.fullyPaidEvents}</span>
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
              <span className="text-sm text-muted-foreground">Total événements</span>
              <span className="text-sm font-medium text-foreground">{stats.totalEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Taux de réussite</span>
              <span className="text-sm font-medium text-foreground">
                {stats.yearEvents > 0 ? ((stats.fullyPaidEvents / stats.yearEvents) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Aucun événement avec cotisation trouvé pour cette année.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const contribution = event.event_contributions?.[0];
            const hasAssignments = contribution?.event_contribution_assignments?.length > 0;
            const totalContributors = contribution?.event_contribution_assignments?.length || 0;
            const progress = contribution ? (contribution.current_amount / contribution.target_amount) * 100 : 0;
            
            return (
              <div key={event.id} className="bg-card border border-border rounded-lg shadow-sm">
                <div 
                  className="px-4 py-3 border-b border-border cursor-pointer"
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      )}
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
                            handleCreateContribution(event);
                          }}
                          className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm mr-4"
                        >
                          Configurer la cotisation
                        </button>
                      )}
                      {expandedEvent === event.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedEvent === event.id && contribution && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Montant cible</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(contribution.target_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date limite</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(contribution.deadline).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Montant collecté</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(contribution.current_amount)}
                        </p>
                      </div>
                    </div>

                    {hasAssignments ? (
                      <div className="mt-4">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Membre</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Montant à payer</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Déjà payé</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Statut</th>
                              {isIntermediate() && (
                                <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {contribution.event_contribution_assignments.map((assignment: any) => (
                              <tr key={assignment.id} className="hover:bg-muted/50">
                                <td className="px-4 py-2 text-sm font-medium text-foreground">
                                  {assignment.profiles?.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(assignment.target_amount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(assignment.current_amount || 0)}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {getPaymentStatus(event, assignment)}
                                </td>
                                {isIntermediate() && (
                                  <td className="px-4 py-2 text-sm text-right">
                                    {!isFullyPaid(event, assignment) && (
                                      <button
                                        onClick={() => handleRecordPayment(event, assignment)}
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
                          onClick={() => handleCreateAssignments(event)}
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

      {showContributionForm && selectedEvent && (
        <EventContributionForm
          eventId={selectedEvent.id}
          onClose={() => {
            setShowContributionForm(false);
            setSelectedEvent(null);
          }}
          onSuccess={fetchEvents}
        />
      )}

      {showAssignmentForm && selectedEvent && (
        <EventContributionAssignmentForm
          eventId={selectedEvent.id}
          targetAmount={selectedEvent.event_contributions[0].target_amount}
          deadline={selectedEvent.event_contributions[0].deadline}
          onClose={() => {
            setShowAssignmentForm(false);
            setSelectedEvent(null);
          }}
          onSuccess={fetchEvents}
        />
      )}

      {showPaymentForm && selectedEvent && selectedAssignment && (
        <PaymentForm
          userId={selectedAssignment.user_id}
          eventId={selectedEvent.id}
          expectedAmount={selectedAssignment.target_amount}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedEvent(null);
            setSelectedAssignment(null);
          }}
          onSuccess={fetchEvents}
        />
      )}
    </div>
  );
}