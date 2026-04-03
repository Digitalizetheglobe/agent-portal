import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Calendar } from '../../components/ui/calendar';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../components/ui/command';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date: z.date({ required_error: 'Please select a date' }),
  assignedAgents: z.array(z.string()).min(0)
});

const EventModal = ({ open, onOpenChange, event }) => {
  const { createEvent, updateEvent, agents } = useData();
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const isEditing = !!event;

  const activeAgents = agents.filter(a => a.status === 'active');

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      date: undefined,
      assignedAgents: []
    }
  });

  // Reset form when modal opens/closes or event changes
  useEffect(() => {
    if (open && event) {
      reset({
        title: event.title,
        description: event.description,
        date: new Date(event.date),
        assignedAgents: event.assignedAgents
      });
      setSelectedAgents(event.assignedAgents);
    } else if (open && !event) {
      reset({
        title: '',
        description: '',
        date: undefined,
        assignedAgents: []
      });
      setSelectedAgents([]);
    }
  }, [open, event, reset]);

  const handleAgentSelect = (agentId) => {
    const newSelection = selectedAgents.includes(agentId)
      ? selectedAgents.filter(id => id !== agentId)
      : [...selectedAgents, agentId];
    
    setSelectedAgents(newSelection);
    setValue('assignedAgents', newSelection);
  };

  const removeAgent = (agentId) => {
    const newSelection = selectedAgents.filter(id => id !== agentId);
    setSelectedAgents(newSelection);
    setValue('assignedAgents', newSelection);
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const onSubmit = async (data) => {
    const eventData = {
      ...data,
      date: format(data.date, 'yyyy-MM-dd'),
      assignedAgents: selectedAgents
    };

    if (isEditing) {
      updateEvent(event.id, eventData);
      toast.success('Event updated', {
        description: `${data.title} has been updated successfully.`
      });
    } else {
      createEvent(eventData);
      toast.success('Event created', {
        description: `${data.title} has been created successfully.`
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="event-modal">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the event information below' 
              : 'Fill in the details to create a new event'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Tech Career Fair 2025"
              data-testid="event-title-input"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe the event details..."
              rows={3}
              data-testid="event-description-input"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Event Date</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                      data-testid="event-date-trigger"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      data-testid="event-date-calendar"
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Assign Agents</Label>
            <Popover open={agentSearchOpen} onOpenChange={setAgentSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="event-agents-trigger"
                >
                  {selectedAgents.length > 0 
                    ? `${selectedAgents.length} agent(s) selected`
                    : 'Select agents...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search agents..." />
                  <CommandList>
                    <CommandEmpty>No agents found.</CommandEmpty>
                    <CommandGroup>
                      {activeAgents.map((agent) => (
                        <CommandItem
                          key={agent.id}
                          value={agent.name}
                          onSelect={() => handleAgentSelect(agent.id)}
                          data-testid={`agent-option-${agent.id}`}
                        >
                          <div className={cn(
                            'mr-2 h-4 w-4 rounded-sm border border-primary',
                            selectedAgents.includes(agent.id) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'opacity-50'
                          )}>
                            {selectedAgents.includes(agent.id) && (
                              <span className="flex items-center justify-center text-xs">✓</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">{agent.email}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected Agents Display */}
            {selectedAgents.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAgents.map((agentId) => (
                  <Badge 
                    key={agentId} 
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {getAgentName(agentId)}
                    <button
                      type="button"
                      onClick={() => removeAgent(agentId)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="event-modal-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="event-modal-submit"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
