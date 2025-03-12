import { useState, useEffect } from 'react';
import { getAuditLogs } from '../../lib/audit';
import ReactPaginate from 'react-paginate';
import { formatDate } from '../../lib/utils';

interface MemberAuditLogsProps {
  memberId: string;
}

export default function MemberAuditLogs({ memberId }: MemberAuditLogsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { logs, total } = await getAuditLogs(
          { targetId: memberId },
          page,
          ITEMS_PER_PAGE
        );
        
        setLogs(logs);
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        setError('Impossible de charger l\'historique des actions');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [memberId, page]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'member_create':
        return 'Création du membre';
      case 'member_update':
        return 'Modification du profil';
      case 'member_delete':
        return 'Suppression du membre';
      case 'password_reset':
        return 'Réinitialisation du mot de passe';
      case 'role_change':
        return 'Changement de rôle';
      case 'status_change':
        return 'Changement de statut';
      default:
        return action;
    }
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
      <div className="divide-y divide-border">
        {logs.map((log) => (
          <div key={log.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {getActionLabel(log.action)}
                </p>
                {log.details && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(log.details)}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(log.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <ReactPaginate
          pageCount={totalPages}
          pageRangeDisplayed={3}
          marginPagesDisplayed={1}
          onPageChange={({ selected }) => setPage(selected + 1)}
          containerClassName="flex justify-center items-center space-x-2 mt-4"
          pageClassName="px-3 py-1 rounded-md border border-border hover:bg-muted"
          activeClassName="bg-primary text-primary-foreground border-primary"
          previousClassName="px-3 py-1 rounded-md border border-border hover:bg-muted"
          nextClassName="px-3 py-1 rounded-md border border-border hover:bg-muted"
          disabledClassName="opacity-50 cursor-not-allowed"
        />
      )}
    </div>
  );
}