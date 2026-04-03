import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, MoreHorizontal, Calendar } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import EventModal from '../../components/modals/EventModal';
import { toast } from 'sonner';

const EventsPage = () => {
  const { events, agents, deleteEvent } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  // Filter events based on search
  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAgentNames = (agentIds) => {
    return agentIds.map(id => {
      const agent = agents.find(a => a.id === id);
      return agent?.name || 'Unknown';
    });
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setModalOpen(true);
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleDeleteClick = (event) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      deleteEvent(eventToDelete.id);
      toast.success('Event deleted', {
        description: `${eventToDelete.title} has been removed.`
      });
    }
    setDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isUpcoming = (dateStr) => {
    return new Date(dateStr) >= new Date();
  };

  return (
    <div className="space-y-6" data-testid="events-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
            Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage events and student registrations
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="create-event-btn">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="event-search-input"
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card data-testid="events-table-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-['Outfit']">
            All Events ({filteredEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Title</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Assigned Agents</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No events found matching your search.' : 'No events yet. Create your first event.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow 
                      key={event.id}
                      data-testid={`event-row-${event.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <span className="font-medium">{event.title}</span>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(event.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getAgentNames(event.assignedAgents).slice(0, 2).map((name, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {name}
                            </Badge>
                          ))}
                          {event.assignedAgents.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{event.assignedAgents.length - 2}
                            </Badge>
                          )}
                          {event.assignedAgents.length === 0 && (
                            <span className="text-xs text-muted-foreground">No agents</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={isUpcoming(event.date) ? 'default' : 'secondary'}
                          className={isUpcoming(event.date) 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }
                        >
                          {isUpcoming(event.date) ? 'Upcoming' : 'Past'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              data-testid={`event-actions-${event.id}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link 
                                to={`/admin/events/${event.id}`}
                                data-testid={`view-event-${event.id}`}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEdit(event)}
                              data-testid={`edit-event-${event.id}`}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(event)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`delete-event-${event.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Event Modal */}
      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{eventToDelete?.title}</strong>? 
              This action cannot be undone. All student registrations for this event will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-event">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-event"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventsPage;
