import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Type, 
  AlignLeft, 
  RadioIcon, 
  Calendar, 
  ChevronDown,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

const fieldTypeIcons = {
  text: Type,
  paragraph: AlignLeft,
  radio: RadioIcon,
  date: Calendar,
  select: ChevronDown,
};

const fieldTypeLabels = {
  text: 'Text',
  paragraph: 'Paragraph',
  radio: 'Radio',
  date: 'Date',
  select: 'Select',
};

const FormFieldBuilder = ({ value = [], onChange, className }) => {
  const [newFieldDialogOpen, setNewFieldDialogOpen] = useState(false);
  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [''],
    regex: '',
    regexError: 'Invalid format'
  });

  const addField = () => {
    if (!newField.label.trim()) return;

    const field = {
      id: `field_${Date.now()}`,
      label: newField.label.trim(),
      type: newField.type,
      required: newField.required,
      placeholder: newField.placeholder.trim(),
      options: (newField.type === 'radio' || newField.type === 'select') 
        ? newField.options.filter(opt => opt.trim()).length > 0 
          ? newField.options.filter(opt => opt.trim()) 
          : ['Option 1', 'Option 2']
        : [],
      regex: newField.regex.trim(),
      regexError: newField.regexError.trim() || 'Invalid format',
      order: value.length
    };

    onChange([...value, field]);
    
    // Reset form
    setNewField({
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [''],
      regex: '',
      regexError: 'Invalid format'
    });
    setNewFieldDialogOpen(false);
  };

  const removeField = (fieldId) => {
    onChange(value.filter(field => field.id !== fieldId));
  };

  const updateField = (fieldId, updates) => {
    onChange(value.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const moveField = (fieldId, direction) => {
    const currentIndex = value.findIndex(field => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= value.length) return;

    const newFields = [...value];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];
    
    // Update order property
    const updatedFields = newFields.map((field, index) => ({
      ...field,
      order: index,
    }));

    onChange(updatedFields);
  };

  const addOption = () => {
    setNewField({
      ...newField,
      options: [...newField.options, ''],
    });
  };

  const updateOption = (index, value) => {
    const updatedOptions = [...newField.options];
    updatedOptions[index] = value;
    setNewField({
      ...newField,
      options: updatedOptions,
    });
  };

  const removeOption = (index) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== index),
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Custom Form Fields</Label>
        <Dialog open={newFieldDialogOpen} onOpenChange={setNewFieldDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Form Field</DialogTitle>
              <DialogDescription>
                Create a custom field for student registration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-label">Field Label</Label>
                <Input
                  id="field-label"
                  placeholder="e.g., Phone Number"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <Select 
                  value={newField.type} 
                  onValueChange={(value) => setNewField({ ...newField, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fieldTypeLabels).map(([type, label]) => {
                      const Icon = fieldTypeIcons[type];
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
                <Input
                  id="field-placeholder"
                  placeholder="Enter placeholder text"
                  value={newField.placeholder}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                />
              </div>

              {(newField.type === 'radio' || newField.type === 'select') && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="space-y-2">
                    {newField.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                        />
                        {newField.options.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="field-required"
                  checked={newField.required}
                  onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
                />
                <Label htmlFor="field-required">Required field</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-regex">Regex Validation (optional)</Label>
                <Input
                  id="field-regex"
                  placeholder="e.g., ^[0-9]{10}$ for 10-digit phone"
                  value={newField.regex}
                  onChange={(e) => setNewField({ ...newField, regex: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a regex pattern for custom validation. Leave empty for no validation.
                </p>
              </div>

              {newField.regex && (
                <div className="space-y-2">
                  <Label htmlFor="field-regex-error">Error Message</Label>
                  <Input
                    id="field-regex-error"
                    placeholder="Error message for invalid format"
                    value={newField.regexError}
                    onChange={(e) => setNewField({ ...newField, regexError: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewFieldDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addField} disabled={!newField.label.trim()}>
                Add Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
          <p className="text-muted-foreground">
            No custom fields added yet. Click "Add Field" to create custom form fields.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {value
            .sort((a, b) => a.order - b.order)
            .map((field, index) => {
              const Icon = fieldTypeIcons[field.type];
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveField(field.id, 'up')}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <MoveUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveField(field.id, 'down')}
                      disabled={index === value.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <MoveDown className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {fieldTypeLabels[field.type]}
                      </Badge>
                      {field.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {field.placeholder && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {field.placeholder}
                      </p>
                    )}
                    {(field.options.length > 0) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Options: {field.options.join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default FormFieldBuilder;
