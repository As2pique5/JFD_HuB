import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Search, Plus, Edit, Trash2, Filter, Eye } from 'lucide-react';
import MemberForm from './MemberForm';
import MemberDetail from './MemberDetail';
import { localMemberService } from '../../services/localMemberService';

// Mock data for development/demo purposes
const MOCK_MEMBERS = [
  { 
    id: '00000000-0000-0000-0000-000000000000', 
    name: 'Admin User', 
    email: 'admin@jfdhub.com', 
    role: 'super_admin', 
    phone: '+237 612345678', 
    created_at: '2023-01-15', 
    status: 'active', 
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: '11111111-1111-1111-1111-111111111111', 
    name: 'Jean Dupont', 
    email: 'jean@jfdhub.com', 
    role: 'intermediate', 
    phone: '+237 623456789', 
    created_at: '2023-02-20', 
    status: 'active', 
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: '22222222-2222-2222-2222-222222222222', 
    name: 'Marie Curie', 
    email: 'marie@jfdhub.com', 
    role: 'standard', 
    phone: '+237 634567890', 
    created_at: '2023-03-10', 
    status: 'active', 
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: '33333333-3333-3333-3333-333333333333', 
    name: 'Pierre Martin', 
    email: 'pierre@jfdhub.com', 
    role: 'standard', 
    phone: '+237 645678901', 
    created_at: '2023-04-05', 
    status: 'inactive', 
    avatar_url: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: '44444444-4444-4444-4444-444444444444', 
    name: 'Sophie Dubois', 
    email: 'sophie@jfdhub.com', 
    role: 'intermediate', 
    phone: '+237 656789012', 
    created_at: '2023-05-15', 
    status: 'active', 
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: '55555555-5555-5555-5555-555555555555', 
    name: 'Caroline Eboumbou', 
    email: 'caroline.eboumbou@gmail.com', 
    role: 'standard', 
    phone: '+237 667890123', 
    created_at: '2023-06-20', 
    status: 'active', 
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
];

export default function Members() {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [membersData, setMembersData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Utiliser le service local pour récupérer les membres
        const { data, error } = await localMemberService.getMembers({
          role: filterRole !== 'all' ? filterRole : undefined,
          search: searchTerm || undefined
        });

        if (error) {
          throw error;
        }

        if (data && Array.isArray(data) && data.length > 0) {
          setMembersData(data);
        } else {
          // Use mock data if no profiles exist
          setMembersData(MOCK_MEMBERS);
        }
      } catch (err) {
        console.error('Error loading members:', err);
        // Fallback to mock data on any error
        setMembersData(MOCK_MEMBERS);
        setError('Une erreur est survenue. Affichage des données de démonstration.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [refreshTrigger, filterRole, searchTerm]);

  const filteredMembers = membersData.filter((member: any) => {
    const matchesSearch = 
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.phone && member.phone.includes(searchTerm));
    
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrateur';
      case 'intermediate':
        return 'Membre Intermédiaire';
      case 'standard':
        return 'Membre Standard';
      default:
        return role;
    }
  };

  const handleAddMember = () => {
    setShowAddForm(true);
  };

  const handleViewMember = (member: any) => {
    setSelectedMember(member);
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await localMemberService.deleteMember(id);
      
      setMembersData(prevMembers => prevMembers.filter(member => member.id !== id));
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error deleting member:', err);
      setError('Une erreur est survenue lors de la suppression du membre.');
    }
  };

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <Users className="mr-2 h-6 w-6" />
          Gestion des Membres
        </h1>
        {isAdmin() && (
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
            onClick={handleAddMember}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un membre
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
            placeholder="Rechercher un membre..."
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            className="border border-input rounded-md bg-background px-3 py-2"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">Tous les rôles</option>
            <option value="super_admin">Super Administrateur</option>
            <option value="intermediate">Membre Intermédiaire</option>
            <option value="standard">Membre Standard</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
            <p className="mt-2 text-muted-foreground">Chargement des membres...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Téléphone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rôle</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date d'ajout</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((member: any) => (
                  <tr key={member.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center">
                        <img
                          src={member.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                          alt={member.name}
                          className="h-8 w-8 rounded-full mr-3"
                        />
                        <span className="font-medium text-foreground">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{member.email}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{member.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'super_admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' 
                          : member.role === 'intermediate'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {getRoleName(member.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {member.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {new Date(member.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          onClick={() => handleViewMember(member)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin() && (
                          <>
                            <button 
                              className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                              onClick={() => {
                                setSelectedMember(member);
                                setShowAddForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => handleDeleteMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMembers.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Aucun membre trouvé pour cette recherche.
              </div>
            )}
          </div>
        )}
      </div>

      {showAddForm && (
        <MemberForm
          onClose={() => {
            setShowAddForm(false);
            setSelectedMember(null);
          }}
          onSuccess={handleSuccess}
          initialData={selectedMember}
          isEditing={!!selectedMember}
        />
      )}

      {selectedMember && !showAddForm && (
        <MemberDetail
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onEdit={() => {
            setShowAddForm(true);
          }}
          onDelete={() => handleDeleteMember(selectedMember.id)}
        />
      )}
    </div>
  );
}