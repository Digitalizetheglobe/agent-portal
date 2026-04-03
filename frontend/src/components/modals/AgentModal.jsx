import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const agentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  userId: z.string().min(3, 'User ID must be at least 3 characters').regex(/^[a-zA-Z0-9._]+$/, 'User ID can only contain letters, numbers, dots, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  status: z.enum(['active', 'inactive'])
});

const AgentModal = ({ open, onOpenChange, agent, viewMode = false }) => {
  const { createAgent, updateAgent, agents } = useData();
  const isEditing = !!agent;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      email: '',
      userId: '',
      password: '',
      phone: '',
      status: 'active'
    }
  });

  const status = watch('status');

  // Reset form when modal opens/closes or agent changes
  useEffect(() => {
    if (open && agent) {
      reset({
        name: agent.name,
        email: agent.email,
        userId: agent.userId,
        password: agent.password,
        phone: agent.phone,
        status: agent.status
      });
    } else if (open && !agent) {
      reset({
        name: '',
        email: '',
        userId: '',
        password: '',
        phone: '',
        status: 'active'
      });
    }
  }, [open, agent, reset]);

  const onSubmit = async (data) => {
    // Check for duplicate userId (excluding current agent if editing)
    const existingAgent = agents.find(a => 
      a.userId.toLowerCase() === data.userId.toLowerCase() && 
      (!agent || a.id !== agent.id)
    );

    if (existingAgent) {
      toast.error('User ID already exists', {
        description: 'Please choose a different user ID.'
      });
      return;
    }

    // Check for duplicate email (excluding current agent if editing)
    const existingEmail = agents.find(a => 
      a.email.toLowerCase() === data.email.toLowerCase() && 
      (!agent || a.id !== agent.id)
    );

    if (existingEmail) {
      toast.error('Email already exists', {
        description: 'Please use a different email address.'
      });
      return;
    }

    if (isEditing) {
      updateAgent(agent.id, data);
      toast.success('Agent updated', {
        description: `${data.name} has been updated successfully.`
      });
    } else {
      createAgent(data);
      toast.success('Agent created', {
        description: `${data.name} has been added as a new agent.`
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="agent-modal">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">
            {viewMode ? 'View Agent' : isEditing ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
          <DialogDescription>
            {viewMode 
              ? 'Agent details and information'
              : isEditing 
                ? 'Update the agent information below' 
                : 'Fill in the details to create a new agent'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="John Smith"
              disabled={viewMode}
              data-testid="agent-name-input"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john@example.com"
              disabled={viewMode}
              data-testid="agent-email-input"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                {...register('userId')}
                placeholder="john.smith"
                disabled={viewMode || isEditing}
                data-testid="agent-userid-input"
              />
              {errors.userId && (
                <p className="text-sm text-destructive">{errors.userId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={viewMode ? 'password' : 'text'}
                {...register('password')}
                placeholder="••••••"
                disabled={viewMode}
                data-testid="agent-password-input"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+1 234 567 8900"
              disabled={viewMode}
              data-testid="agent-phone-input"
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setValue('status', value)}
              disabled={viewMode}
            >
              <SelectTrigger data-testid="agent-status-select">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          {!viewMode && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="agent-modal-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="agent-modal-submit"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Agent' : 'Create Agent'}
              </Button>
            </DialogFooter>
          )}

          {viewMode && (
            <DialogFooter>
              <Button 
                type="button" 
                onClick={() => onOpenChange(false)}
                data-testid="agent-modal-close"
              >
                Close
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentModal;
