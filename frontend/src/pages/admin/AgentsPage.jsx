import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, MoreHorizontal } from 'lucide-react';
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
import AgentModal from '../../components/modals/AgentModal';
import { toast } from 'sonner';

const AgentsPage = () => {
  const { agents, deleteAgent } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);

  // Filter agents based on search
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedAgent(null);
    setViewMode(false);
    setModalOpen(true);
  };

  const handleEdit = (agent) => {
    setSelectedAgent(agent);
    setViewMode(false);
    setModalOpen(true);
  };

  const handleView = (agent) => {
    setSelectedAgent(agent);
    setViewMode(true);
    setModalOpen(true);
  };

  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (agentToDelete) {
      deleteAgent(agentToDelete.id);
      toast.success('Agent deleted', {
        description: `${agentToDelete.name} has been removed.`
      });
    }
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
  };

  return (
    <div className="space-y-6" data-testid="agents-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
            Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team of agents
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="create-agent-btn">
          <Plus className="w-4 h-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents by name, email, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="agent-search-input"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card data-testid="agents-table-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-['Outfit']">
            All Agents ({filteredAgents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Name</TableHead>
                  <TableHead className="font-medium">Email</TableHead>
                  <TableHead className="font-medium">User ID</TableHead>
                  <TableHead className="font-medium">Phone</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No agents found matching your search.' : 'No agents yet. Create your first agent.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow 
                      key={agent.id}
                      data-testid={`agent-row-${agent.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium text-sm">
                              {agent.name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.email}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {agent.userId}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.phone}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={agent.status === 'active' ? 'default' : 'secondary'}
                          className={agent.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }
                        >
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              data-testid={`agent-actions-${agent.id}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleView(agent)}
                              data-testid={`view-agent-${agent.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEdit(agent)}
                              data-testid={`edit-agent-${agent.id}`}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(agent)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`delete-agent-${agent.id}`}
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

      {/* Agent Modal */}
      <AgentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        agent={selectedAgent}
        viewMode={viewMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{agentToDelete?.name}</strong>? 
              This action cannot be undone. The agent will also be removed from all assigned events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-agent">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-agent"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentsPage;
