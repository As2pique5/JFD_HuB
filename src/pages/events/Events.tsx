import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Search, Filter, ChevronDown, ChevronUp, MapPin, Clock, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localEventService } from '../../services/localEventService';
import EventForm from '../../components/events/EventForm';

export default function Events() {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Generate year options (from 2020 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: (currentYear + 5) - 2020 + 1 },
    (_, i) => (currentYear + 5) - i
  );

  useEffect(() => {
    fetchEvents();
  }, [yearFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await localEventService.getEvents({
        status: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchTerm || undefined,
      });

      if (error) throw error;

      // Filter events by year
      const filteredEvents = data?.filter((event: any) => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear === parseInt(yearFilter);
      }) || [];

      setEvents(filteredEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Une erreur est survenue lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await localEventService.deleteEvent(eventId);
      if (error) throw error;

      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Une erreur est survenue lors de la suppression de l\'événement');
    }
  };

  // Filter events based on search term and type filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Get event type badge
  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'meeting':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Réunion
          </span>
        );
      case 'celebration':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            Célébration
          </span>
        );
      case 'assistance':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Assistance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            Autre
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
  
  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Erreur!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <CalendarIcon className="mr-2 h-6 w-6" />
          Gestion des Événements
        </h1>
        {isAdmin() && (
          <button
            onClick={handleCreateEvent}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvel événement
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
            placeholder="Rechercher un événement..."
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            className="border border-input rounded-md bg-background px-3 py-2"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="meeting">Réunions</option>
            <option value="celebration">Célébrations</option>
            <option value="assistance">Assistance</option>
            <option value="other">Autres</option>
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

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Aucun événement trouvé.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div key={event.id} className="bg-card border border-border rounded-lg shadow-sm">
              <div 
                className="px-4 py-3 border-b border-border cursor-pointer"
                onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-foreground">{event.title}</h3>
                      <div className="ml-2">
                        {getEventTypeBadge(event.type)}
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                  </div>
                  <div>
                    {expandedEvent === event.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {expandedEvent === event.id && (
                <>
                  <div className="p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date et heure</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(event.start_date).toLocaleString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                        <div>
                          <p className="text-xs text-muted-foreground">Lieu</p>
                          <p className="text-sm font-medium text-foreground">
                            {event.location || 'Non spécifié'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-muted-foreground mr-2" />
                        <div>
                          <p className="text-xs text-muted-foreground">Organisateur</p>
                          <p className="text-sm font-medium text-foreground">
                            {event.organizer?.name || 'Non spécifié'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isAdmin() && (
                    <div className="flex justify-end space-x-2 p-4 border-t border-border">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="bg-muted text-foreground px-3 py-1 rounded-md text-sm"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
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

      {showEventForm && (
        <EventForm
          onClose={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
          onSuccess={fetchEvents}
          initialData={selectedEvent}
          isEditing={!!selectedEvent}
        />
      )}
    </div>
  );
}