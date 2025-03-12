import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { contributionService } from '../../services/contributionService';
import { formatCurrency } from '../../lib/utils';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import MonthlySessionForm from './MonthlySessionForm';
import MonthlyAssignmentForm from './MonthlyAssignmentForm';
import PaymentForm from './PaymentForm';

interface MonthlyContributionListProps {
  searchTerm: string;
  yearsToShow: number[];
}

export default function MonthlyContributionList({
  searchTerm,
  yearsToShow
}: MonthlyContributionListProps) {
  const { isAdmin, isIntermediate } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [sessionPayments, setSessionPayments] = useState<Record<string, Record<string, number>>>({});

  // Create a stable dependency array for useEffect
  const yearsString = yearsToShow.sort().join(',');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all sessions
      const data = await contributionService.getMonthlySessions();
      
      // Filter sessions for the selected years
      const filteredSessions = data?.filter(session => {
        const sessionYear = new Date(session.start_date).getFullYear();
        return yearsToShow.includes(sessionYear);
      }) || [];

      // Filter by search term if provided
      const searchedSessions = searchTerm 
        ? filteredSessions.filter(session => 
            session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.description?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : filteredSessions;

      // For each session, check if it should be marked as completed
      for (const session of searchedSessions) {
        const payments = await contributionService.getSessionPayments(session.id);
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const targetAmount = session.monthly_target_amount * session.duration_months;
        
        // Update session status if all payments are complete
        if (totalPaid >= targetAmount && session.status === 'active') {
          await contributionService.updateMonthlySession(session.id, {
            status: 'completed'
          });
          session.status = 'completed';
        }
      }

      setSessions(searchedSessions);

      // Fetch payments for each session
      const paymentsMap: Record<string, Record<string, number>> = {};
      
      for (const session of searchedSessions) {
        const payments = await contributionService.getSessionPayments(session.id);
        
        const sessionUserPayments = payments.reduce((acc: Record<string, number>, payment: any) => {
          acc[payment.user_id] = (acc[payment.user_id] || 0) + payment.amount;
          return acc;
        }, {});
        
        paymentsMap[session.id] = sessionUserPayments;
      }
      
      setSessionPayments(paymentsMap);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (mounted) {
        await fetchSessions();
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [yearsString, searchTerm]); // Now yearsString is defined

  const handleEditSession = (session: any) => {
    setSelectedSession(session);
    setShowSessionForm(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await contributionService.deleteMonthlySession(sessionId);
      await fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Une erreur est survenue lors de la suppression de la session');
    }
  };

  const handleCreateAssignments = (session: any) => {
    setSelectedSession(session);
    setShowAssignmentForm(true);
  };

  const handleRecordPayment = (session: any, assignment: any) => {
    setSelectedSession(session);
    setSelectedAssignment(assignment);
    setShowPaymentForm(true);
  };

  const getPaymentStatus = (session: any, assignment: any) => {
    const userPayments = sessionPayments[session.id]?.[assignment.user_id] || 0;
    const totalExpected = assignment.monthly_amount * session.duration_months;

    if (userPayments >= totalExpected) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          Payé
        </span>
      );
    } else if (userPayments > 0) {
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

  const isFullyPaid = (session: any, assignment: any) => {
    const userPayments = sessionPayments[session.id]?.[assignment.user_id] || 0;
    const totalExpected = assignment.monthly_amount * session.duration_months;
    return userPayments >= totalExpected;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Aucune session de cotisation trouvée.</p>
        </div>
      ) : (
        sessions.map((session) => {
          const totalContributors = session.monthly_contribution_assignments?.length || 0;
          const totalTarget = session.monthly_target_amount * session.duration_months;
          const totalCollected = Object.values(sessionPayments[session.id] || {}).reduce((sum: number, amount: any) => sum + amount, 0);
          const progress = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;
          
          return (
            <div key={session.id} className="bg-card border border-border rounded-lg shadow-sm">
              <div 
                className="px-4 py-3 border-b border-border cursor-pointer"
                onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">{session.name}</h3>
                    {session.description && (
                      <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{totalContributors} contributeur(s)</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(totalCollected)} / {formatCurrency(totalTarget)}
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
                    {expandedSession === session.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {expandedSession === session.id && (
                <>
                  <div className="p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Montant mensuel cible</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(session.monthly_target_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Durée</p>
                        <p className="text-sm font-medium text-foreground">
                          {session.duration_months} mois
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date limite mensuelle</p>
                        <p className="text-sm font-medium text-foreground">
                          Le {session.payment_deadline_day} de chaque mois
                        </p>
                      </div>
                    </div>

                    {session.monthly_contribution_assignments?.length > 0 ? (
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
                            {session.monthly_contribution_assignments.map((assignment: any) => (
                              <tr key={assignment.id} className="hover:bg-muted/50">
                                <td className="px-4 py-2 text-sm font-medium text-foreground">
                                  {assignment.profiles?.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(assignment.monthly_amount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(assignment.monthly_amount * session.duration_months)}
                                </td>
                                <td className="px-4 py-2 text-sm text-foreground">
                                  {formatCurrency(sessionPayments[session.id]?.[assignment.user_id] || 0)}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {getPaymentStatus(session, assignment)}
                                </td>
                                {isIntermediate() && (
                                  <td className="px-4 py-2 text-sm text-right">
                                    {!isFullyPaid(session, assignment) && session.status === 'active' && (
                                      <button
                                        onClick={() => handleRecordPayment(session, assignment)}
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
                          onClick={() => handleCreateAssignments(session)}
                          className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm flex items-center"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Attribuer les montants
                        </button>
                      </div>
                    )}
                  </div>

                  {isAdmin() && (
                    <div className="flex justify-end space-x-2 p-4 border-t border-border">
                      <button
                        onClick={() => handleEditSession(session)}
                        className="bg-muted text-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}

      {showSessionForm && (
        <MonthlySessionForm
          onClose={() => {
            setShowSessionForm(false);
            setSelectedSession(null);
          }}
          onSuccess={fetchSessions}
          initialData={selectedSession}
          isEditing={!!selectedSession}
        />
      )}

      {showAssignmentForm && selectedSession && (
        <MonthlyAssignmentForm
          sessionId={selectedSession.id}
          monthlyTarget={selectedSession.monthly_target_amount}
          onClose={() => {
            setShowAssignmentForm(false);
            setSelectedSession(null);
          }}
          onSuccess={fetchSessions}
        />
      )}

      {showPaymentForm && selectedSession && selectedAssignment && (
        <PaymentForm
          userId={selectedAssignment.user_id}
          sessionId={selectedSession.id}
          expectedAmount={selectedAssignment.monthly_amount}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedSession(null);
            setSelectedAssignment(null);
          }}
          onSuccess={fetchSessions}
        />
      )}
    </div>
  );
}