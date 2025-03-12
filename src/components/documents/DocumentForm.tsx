import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
];

const documentSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  description: z.string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  category_id: z.string().uuid('Veuillez sélectionner une catégorie').optional(),
  file: z
    .instanceof(File)
    .refine(file => file.size <= MAX_FILE_SIZE, 'Le fichier ne doit pas dépasser 10MB')
    .refine(
      file => ALLOWED_FILE_TYPES.includes(file.type),
      'Format de fichier non supporté'
    ),
});

type FormValues = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentForm({
  categories,
  onClose,
  onSuccess,
}: DocumentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(documentSchema),
  });

  const selectedFile = watch('file');

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      await documentService.uploadDocument(
        data.file,
        {
          name: data.name,
          description: data.description,
          categoryId: data.category_id,
        },
        user.id
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Une erreur est survenue lors du téléchargement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Ajouter un document
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-foreground mb-1">
              Fichier
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="flex text-sm text-muted-foreground">
                  <label
                    htmlFor="file"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                  >
                    <span>Télécharger un fichier</span>
                    <input
                      id="file"
                      type="file"
                      className="sr-only"
                      {...register('file')}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, Excel, Images jusqu'à 10MB
                </p>
                {selectedFile && (
                  <p className="text-sm text-foreground mt-2">
                    Fichier sélectionné: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
            {errors.file && (
              <p className="mt-1 text-sm text-destructive">{errors.file.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Nom du document
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className={`w-full border ${
                errors.name ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-foreground mb-1">
              Catégorie
            </label>
            <select
              id="category_id"
              {...register('category_id')}
              className={`w-full border ${
                errors.category_id ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="mt-1 text-sm text-destructive">{errors.category_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className={`w-full border ${
                errors.description ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md text-foreground bg-background hover:bg-muted"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Téléchargement...
                </>
              ) : (
                'Télécharger'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}