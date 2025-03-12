import { useState, useEffect } from 'react';
import { GitBranch, Search, Filter, ChevronDown, ChevronUp, User, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { familyService } from '../../services/familyService';
import RelationshipForm from '../../components/familytree/RelationshipForm';
import RelationshipActions from '../../components/familytree/RelationshipActions';

export default function FamilyTree() {
  const { isAdmin, isIntermediate, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [editingRelationship, setEditingRelationship] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  // Fetch initial data only once
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch members and relationships in parallel
        const [membersData, relationshipsData] = await Promise.all([
          familyService.getFamilyMembers(),
          familyService.getFamilyRelationships(),
        ]);

        if (mounted) {
          setMembers(membersData || []);
          setRelationships(relationshipsData || []);
        }
      } catch (err: any) {
        console.error('Error fetching family data:', err);
        if (mounted) {
          setError(err.message || 'Une erreur est survenue lors du chargement des données');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array means this only runs once on mount

  const handleValidateRelationships = async () => {
    if (!user) return;

    try {
      setIsValidating(true);
      setError(null);
      setValidationResults([]);

      const results = await familyService.validateAndFixRelationships(user.id);
      setValidationResults(results);

      // Refresh data after validation
      const [membersData, relationshipsData] = await Promise.all([
        familyService.getFamilyMembers(),
        familyService.getFamilyRelationships(),
      ]);

      setMembers(membersData || []);
      setRelationships(relationshipsData || []);
    } catch (err: any) {
      console.error('Error validating relationships:', err);
      setError(err.message || 'Une erreur est survenue lors de la validation des relations');
    } finally {
      setIsValidating(false);
    }
  };

  const handleEditRelationship = (relationship: any) => {
    setEditingRelationship(relationship);
    setShowRelationshipForm(true);
  };

  const handleDeleteRelationship = async () => {
    // Refresh data after deletion
    const [membersData, relationshipsData] = await Promise.all([
      familyService.getFamilyMembers(),
      familyService.getFamilyRelationships(),
    ]);

    setMembers(membersData || []);
    setRelationships(relationshipsData || []);
  };

  // Filter members based on search term
  const filteredMembers = members.filter(member => {
    return member.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate age from birth date
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Get related family members
  const getRelatedMembers = (memberId: string, relationType: 'parent' | 'child' | 'spouse' | 'sibling') => {
    return relationships
      .filter(rel => 
        (relationType === 'child' ? 
          // For children, look for relationships where the member is the parent
          rel.from_member_id === memberId && rel.relationship_type === 'parent' :
          // For other types, look for direct relationships
          rel.from_member_id === memberId && rel.relationship_type === relationType)
      )
      .map(rel => members.find(m => m.id === rel.to_member_id))
      .filter(Boolean);
  };

  // Get parents
  const getParents = (memberId: string) => {
    return relationships
      .filter(rel => 
        rel.to_member_id === memberId && rel.relationship_type === 'parent'
      )
      .map(rel => members.find(m => m.id === rel.from_member_id))
      .filter(Boolean);
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
          <GitBranch className="mr-2 h-6 w-6" />
          Arbre Généalogique
        </h1>
        <div className="flex items-center space-x-2">
          {isAdmin() && (
            <button
              onClick={handleValidateRelationships}
              className="bg-muted text-foreground px-4 py-2 rounded-md flex items-center"
              disabled={isValidating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
              {isValidating ? 'Validation...' : 'Valider les relations'}
            </button>
          )}
          {isAdmin() && (
            <button
              onClick={() => setShowRelationshipForm(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une relation
            </button>
          )}
        </div>
      </div>

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            Relations mises à jour
          </h3>
          <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
            {validationResults.map((result, index) => (
              <li key={index}>
                {result.action === 'created_reciprocal_relationship' && (
                  <>Relation réciproque créée entre {
                    members.find(m => m.id === result.details.from_member_id)?.name
                  } et {
                    members.find(m => m.id === result.details.to_member_id)?.name
                  } ({result.details.relationship_type})</>
                )}
                {result.action === 'created_sibling_relationship' && (
                  <>Relation fraternelle créée entre {
                    members.find(m => m.id === result.details.child1_id)?.name
                  } et {
                    members.find(m => m.id === result.details.child2_id)?.name
                  }</>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un membre de la famille..."
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Family members list */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Aucun membre trouvé.</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div key={member.id} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div 
                className="px-4 py-3 border-b border-border cursor-pointer"
                onClick={() => setExpandedPerson(expandedPerson === member.id ? null : member.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img
                      src={member.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                      alt={member.name}
                      className="h-10 w-10 rounded-full mr-3"
                    />
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{member.name}</h3>
                      {member.birth_date && (
                        <p className="text-sm text-muted-foreground">
                          {calculateAge(member.birth_date)} ans
                        </p>
                      )}
                    </div>
                  </div>
                  {expandedPerson === member.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {expandedPerson === member.id && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal information */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Informations personnelles</h4>
                      <div className="bg-background border border-border rounded-md p-3">
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground">Date de naissance</p>
                          <p className="text-sm font-medium text-foreground">
                            {member.birth_date 
                              ? new Date(member.birth_date).toLocaleDateString('fr-FR')
                              : 'Non renseignée'
                            }
                          </p>
                        </div>
                        {member.bio && (
                          <div>
                            <p className="text-xs text-muted-foreground">Biographie</p>
                            <p className="text-sm text-foreground mt-1">{member.bio}</p>
                          </div>
                        )}
                        {member.user && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">Compte utilisateur lié</p>
                            <div className="flex items-center mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                member.user.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {member.user.role === 'super_admin' ? 'Super Admin' :
                                 member.user.role === 'intermediate' ? 'Intermédiaire' : 'Standard'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Family relationships */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Relations familiales</h4>
                      <div className="bg-background border border-border rounded-md p-3">
                        {/* Parents */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Parents</p>
                          {getParents(member.id).length > 0 ? (
                            <div className="space-y-2">
                              {getParents(member.id).map((parent) => (
                                <div key={parent.id} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <img
                                      src={parent.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                                      alt={parent.name}
                                      className="h-6 w-6 rounded-full mr-2"
                                    />
                                    <p className="text-sm text-foreground">{parent.name}</p>
                                  </div>
                                  <RelationshipActions
                                    relationshipId={relationships.find(r => 
                                      r.from_member_id === parent.id && 
                                      r.to_member_id === member.id && 
                                      r.relationship_type === 'parent'
                                    )?.id}
                                    fromMemberId={parent.id}
                                    toMemberId={member.id}
                                    type="parent"
                                    onDelete={handleDeleteRelationship}
                                    onEdit={() => handleEditRelationship({
                                      from_member_id: parent.id,
                                      to_member_id: member.id,
                                      relationship_type: 'parent'
                                    })}
                                   />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Aucun parent enregistré</p>
                          )}
                        </div>
                        
                        {/* Spouse */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Conjoint(e)</p>
                          {getRelatedMembers(member.id, 'spouse').length > 0 ? (
                            <div className="space-y-2">
                              {getRelatedMembers(member.id, 'spouse').map((spouse) => (
                                <div key={spouse.id} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <img
                                      src={spouse.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                                      alt={spouse.name}
                                      className="h-6 w-6 rounded-full mr-2"
                                    />
                                    <p className="text-sm text-foreground">{spouse.name}</p>
                                  </div>
                                  <RelationshipActions
                                    relationshipId={relationships.find(r => 
                                      r.from_member_id === member.id && 
                                      r.to_member_id === spouse.id && 
                                      r.relationship_type === 'spouse'
                                    )?.id}
                                    fromMemberId={member.id}
                                    toMemberId={spouse.id}
                                    type="spouse"
                                    onDelete={handleDeleteRelationship}
                                    onEdit={() => handleEditRelationship({
                                      from_member_id: member.id,
                                      to_member_id: spouse.id,
                                      relationship_type: 'spouse'
                                    })}
                                   />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Aucun(e) conjoint(e) enregistré(e)</p>
                          )}
                        </div>
                        
                        {/* Children */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Enfants</p>
                          {getRelatedMembers(member.id, 'child').length > 0 ? (
                            <div className="space-y-2">
                              {getRelatedMembers(member.id, 'child').map((child) => (
                                <div key={child.id} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <img
                                      src={child.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                                      alt={child.name}
                                      className="h-6 w-6 rounded-full mr-2"
                                    />
                                    <p className="text-sm text-foreground">{child.name}</p>
                                  </div>
                                  <RelationshipActions
                                    relationshipId={relationships.find(r => 
                                      r.from_member_id === member.id && 
                                      r.to_member_id === child.id && 
                                      r.relationship_type === 'parent'
                                    )?.id}
                                    fromMemberId={member.id}
                                    toMemberId={child.id}
                                    type="parent"
                                    onDelete={handleDeleteRelationship}
                                    onEdit={() => handleEditRelationship({
                                      from_member_id: member.id,
                                      to_member_id: child.id,
                                      relationship_type: 'parent'
                                    })}
                                   />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Aucun enfant enregistré</p>
                          )}
                        </div>

                        {/* Siblings */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Frères et sœurs</p>
                          {getRelatedMembers(member.id, 'sibling').length > 0 ? (
                            <div className="space-y-2">
                              {getRelatedMembers(member.id, 'sibling').map((sibling) => (
                                <div key={sibling.id} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <img
                                      src={sibling.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                                      alt={sibling.name}
                                      className="h-6 w-6 rounded-full mr-2"
                                    />
                                    <p className="text-sm text-foreground">{sibling.name}</p>
                                  </div>
                                  <RelationshipActions
                                    relationshipId={relationships.find(r => 
                                      r.from_member_id === member.id && 
                                      r.to_member_id === sibling.id && 
                                      r.relationship_type === 'sibling'
                                    )?.id}
                                    fromMemberId={member.id}
                                    toMemberId={sibling.id}
                                    type="sibling"
                                    onDelete={handleDeleteRelationship}
                                    onEdit={() => handleEditRelationship({
                                      from_member_id: member.id,
                                      to_member_id: sibling.id,
                                      relationship_type: 'sibling'
                                    })}
                                   />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Aucun frère ou sœur enregistré</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Relationship Form Modal */}
      {showRelationshipForm && (
        <RelationshipForm
          members={members}
          onClose={() => {
            setShowRelationshipForm(false);
            setEditingRelationship(null);
          }}
          onSuccess={handleDeleteRelationship} // Using this to refresh data
          initialData={editingRelationship}
          isEditing={!!editingRelationship}
        />
      )}
    </div>
  );
}