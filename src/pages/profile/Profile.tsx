import { useState, useRef } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Edit, Save, X, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseMutation } from '../../hooks/useSupabaseMutation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

// Schéma de validation pour le formulaire de profil
const profileSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().min(9, 'Numéro de téléphone invalide').optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, logout, updateProfile, updateAvatar } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { update } = useSupabaseMutation<any>({ table: 'profiles' });
  
  // Mock user profile data
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Admin User',
    email: user?.email || 'admin@jfdhub.com',
    phone: '+237 612345678',
    birthDate: '1985-05-15',
    address: 'Douala, Cameroun',
    bio: 'Super Administrateur de la plateforme JFD\'HuB. Responsable de la gestion des membres, des cotisations et des projets familiaux.',
    avatar: user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  });
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      birthDate: profileData.birthDate,
      address: profileData.address,
      bio: profileData.bio,
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      setError(null);

      const publicUrl = await updateAvatar(file);
      setProfileData(prev => ({ ...prev, avatar: publicUrl }));

    } catch (err: any) {
      console.error('Error updating avatar:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour de l\'avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (user?.id) {
        await updateProfile({
          name: data.name,
          email: data.email,
        });
        
        // Mettre à jour les données locales
        setProfileData({
          ...profileData,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          birthDate: data.birthDate || '',
          address: data.address || '',
          bio: data.bio || '',
        });
      }
      
      setIsEditing(false);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du profil:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancel editing
  const handleCancel = () => {
    reset({
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      birthDate: profileData.birthDate,
      address: profileData.address,
      bio: profileData.bio,
    });
    setIsEditing(false);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  
  // Format activity date
  const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <User className="h-5 w-5 text-blue-500" />;
      case 'payment':
        return <User className="h-5 w-5 text-green-500" />;
      case 'event':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'document':
        return <User className="h-5 w-5 text-amber-500" />;
      case 'profile':
        return <Edit className="h-5 w-5 text-indigo-500" />;
      default:
        return <User className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Mock activity history
  const activityHistory = [
    { type: 'login', date: '2025-05-05T08:30:00', details: 'Connexion réussie' },
    { type: 'payment', date: '2025-05-03T14:15:00', details: 'Paiement de cotisation mensuelle - Mai 2025' },
    { type: 'event', date: '2025-05-01T10:45:00', details: 'Confirmation de présence - Réunion mensuelle' },
    { type: 'document', date: '2025-04-28T16:20:00', details: 'Ajout de document - Budget construction 2025.xlsx' },
    { type: 'profile', date: '2025-04-25T09:10:00', details: 'Mise à jour du profil' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <User className="mr-2 h-6 w-6" />
          Mon Profil
        </h1>
        {!isEditing && (
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Modifier le profil
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Informations personnelles</h2>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="p-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
                      Nom complet
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
                    <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      {...register('email')}
                      className={`w-full border ${
                        errors.email ? 'border-destructive' : 'border-input'
                      } rounded-md bg-background px-3 py-2 text-sm`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      {...register('phone')}
                      className={`w-full border ${
                        errors.phone ? 'border-destructive' : 'border-input'
                      } rounded-md bg-background px-3 py-2 text-sm`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="birthDate" className="block text-sm font-medium text-muted-foreground mb-1">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      id="birthDate"
                      {...register('birthDate')}
                      className={`w-full border ${
                        errors.birthDate ? 'border-destructive' : 'border-input'
                      } rounded-md bg-background px-3 py-2 text-sm`}
                    />
                    {errors.birthDate && (
                      <p className="mt-1 text-sm text-destructive">{errors.birthDate.message}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-muted-foreground mb-1">
                      Adresse
                    </label>
                    <input
                      type="text"
                      id="address"
                      {...register('address')}
                      className={`w-full border ${
                        errors.address ? 'border-destructive' : 'border-input'
                      } rounded-md bg-background px-3 py-2 text-sm`}
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-destructive">{errors.address.message}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="bio" className="block text-sm font-medium text-muted-foreground mb-1">
                      Biographie
                    </label>
                    <textarea
                      id="bio"
                      {...register('bio')}
                      rows={4}
                      className={`w-full border ${
                        errors.bio ? 'border-destructive' : 'border-input'
                      } rounded-md bg-background px-3 py-2 text-sm`}
                    />
                    {errors.bio && (
                      <p className="mt-1 text-sm text-destructive">{errors.bio.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-muted text-foreground px-3 py-1 rounded-md text-sm flex items-center"
                    disabled={isLoading}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm flex items-center"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-1 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1 h-4 w-4" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nom complet</p>
                    <p className="text-sm font-medium text-foreground flex items-center mt-1">
                      <User className="h-4 w-4 text-muted-foreground mr-2" />
                      {profileData.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground flex items-center mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                      {profileData.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="text-sm font-medium text-foreground flex items-center mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                      {profileData.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de naissance</p>
                    <p className="text-sm font-medium text-foreground flex items-center mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                      {formatDate(profileData.birthDate)}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="text-sm font-medium text-foreground flex items-center mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      {profileData.address}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Biographie</p>
                    <p className="text-sm text-foreground mt-1">
                      {profileData.bio}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Activity history */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Historique d'activité</h2>
            </div>
            <div className="divide-y divide-border">
              {activityHistory.map((activity, index) => (
                <div key={index} className="px-4 py-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatActivityDate(activity.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile photo */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Photo de profil</h2>
            </div>
            <div className="p-4 flex flex-col items-center">
              <div className="relative group">
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="h-32 w-32 rounded-full mb-4"
                />
                <button
                  onClick={handleAvatarClick}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <div className="h-8 w-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Cliquez sur l'image pour changer votre photo de profil
              </p>
            </div>
          </div>
          
          {/* Account information */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Informations du compte</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Rôle</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {user?.role === 'super_admin' ? 'Super Administrateur' : 
                     user?.role === 'intermediate' ? 'Membre Intermédiaire' : 'Membre Standard'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'inscription</p>
                  <p className="text-sm font-medium text-foreground mt-1">15 janvier 2023</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dernière connexion</p>
                  <p className="text-sm font-medium text-foreground mt-1">Aujourd'hui à 08:30</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <button className="bg-muted text-foreground px-3 py-1 rounded-md text-sm w-full mb-2">
                  Changer le mot de passe
                </button>
                <button 
                  className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm w-full"
                  onClick={handleLogout}
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>
          
          {/* Notifications settings */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Paramètres de notification</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">Cotisations</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer- checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">Événements</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">Projets</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">Messages</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}