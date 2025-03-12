import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, ChevronDown, ChevronUp, Download, Trash2, Edit, Eye, FolderIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import DocumentForm from '../../components/documents/DocumentForm';
import CategoryForm from '../../components/documents/CategoryForm';

export default function Documents() {
  const { isAdmin, isIntermediate } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [categoryFilter, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories
      const categoriesData = await documentService.getCategories();
      setCategories(categoriesData || []);

      // Fetch documents
      const documentsData = await documentService.getDocuments({
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm || undefined,
      });
      setDocuments(documentsData || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      await documentService.deleteDocument(documentId, user?.id);
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Une erreur est survenue lors de la suppression du document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="h-5 w-5 text-amber-500" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <FileText className="mr-2 h-6 w-6" />
          Gestion des Documents
        </h1>
        {isAdmin() && (
          <div className="flex space-x-2">
            <button 
              className="bg-muted text-foreground px-4 py-2 rounded-md flex items-center"
              onClick={() => setShowCategoryForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau dossier
            </button>
            <button 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
              onClick={() => setShowDocumentForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un document
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un document..."
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            className="border border-input rounded-md bg-background px-3 py-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-destructive">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {categories
            .filter(category => categoryFilter === 'all' || category.id === categoryFilter)
            .map((category) => {
              const categoryDocuments = documents.filter(doc => doc.category_id === category.id);
              
              return (
                <div key={category.id} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                  <div 
                    className="px-4 py-3 border-b border-border cursor-pointer"
                    onClick={() => setExpandedFolder(expandedFolder === category.id ? null : category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FolderIcon className="h-5 w-5 text-amber-500 mr-2" />
                        <div>
                          <h3 className="text-lg font-medium text-foreground">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-muted-foreground mr-2">
                          {categoryDocuments.length} document(s)
                        </span>
                        {expandedFolder === category.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedFolder === category.id && (
                    <div className="p-4">
                      {categoryDocuments.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Nom</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Type</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Taille</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Ajouté par</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Date</th>
                                <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {categoryDocuments.map((document) => (
                                <tr key={document.id} className="hover:bg-muted/50">
                                  <td className="px-4 py-3 text-sm">
                                    <div className="flex items-center">
                                      {getFileIcon(document.file_type)}
                                      <span className="ml-2 font-medium text-foreground">{document.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground uppercase">{document.file_type}</td>
                                  <td className="px-4 py-3 text-sm text-foreground">{formatFileSize(document.file_size)}</td>
                                  <td className="px-4 py-3 text-sm text-foreground">{document.uploader?.name}</td>
                                   <td className="px-4 py-3 text-sm text-foreground">
                                    {new Date(document.created_at).toLocaleDateString('fr-FR')}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      <a
                                        href={document.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </a>
                                      <a
                                        href={document.file_path}
                                        download
                                        className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                      {isIntermediate() && (
                                        <button className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
                                          <Edit className="h-4 w-4" />
                                        </button>
                                      )}
                                      {isAdmin() && (
                                        <button 
                                          onClick={() => handleDeleteDocument(document.id)}
                                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-muted-foreground">
                          Aucun document trouvé dans ce dossier.
                        </div>
                      )}
                      
                      {isAdmin() && (
                        <div className="mt-4 flex justify-between pt-4 border-t border-border">
                          <button
                            onClick={() => setShowDocumentForm(true)}
                            className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm flex items-center"
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Ajouter un document
                          </button>
                          
                          <div className="flex space-x-2">
                            <button className="bg-muted text-foreground px-3 py-1 rounded-md text-sm">
                              Renommer
                            </button>
                            <button className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm">
                              Supprimer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          
          {categories.length === 0 && (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Aucune catégorie trouvée.</p>
            </div>
          )}
        </div>
      )}

      {showDocumentForm && (
        <DocumentForm
          categories={categories}
          onClose={() => setShowDocumentForm(false)}
          onSuccess={fetchData}
        />
      )}

      {showCategoryForm && (
        <CategoryForm
          onClose={() => setShowCategoryForm(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}