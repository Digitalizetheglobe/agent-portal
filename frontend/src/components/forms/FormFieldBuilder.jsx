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
  X,
  Zap,
  Phone,
  Settings2,
  Lock,
  Unlock,
  Globe,
  GraduationCap
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
  phone: Phone,
  country: Globe,
  qualification: GraduationCap,
};

const fieldTypeLabels = {
  text: 'Text',
  paragraph: 'Paragraph',
  radio: 'Radio',
  date: 'Date',
  select: 'Select',
  phone: 'Phone',
  country: 'Country',
  qualification: 'Qualification',
};

const PRESET_FIELDS = [
  {
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Enter full name',
  },
  {
    label: 'Email Address',
    type: 'text',
    required: true,
    placeholder: 'Enter email address',
    regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    regexError: 'Please enter a valid email address',
  },
  {
    label: 'Phone Number',
    type: 'phone',
    required: true,
    placeholder: '+1 123 456 7890',
    regex: '^\\+?[0-9\\s\\-\\(\\)]{7,20}$',
    regexError: 'Please enter a valid phone number',
  },
  {
    label: 'International Phone',
    type: 'phone',
    required: true,
    placeholder: '123 456 7890',
    useCountryCode: true,
    defaultCountry: 'IN',
    regex: '^\\+?[0-9\\s\\-\\(\\)]{7,20}$',
    regexError: 'Please enter a valid phone number',
  },
  {
    label: 'Date of Birth',
    type: 'date',
    required: true,
  },
  {
    label: 'Gender',
    type: 'select',
    required: true,
    options: ['Male', 'Female', 'Other'],
  },
  {
    label: 'Address',
    type: 'paragraph',
    required: true,
    placeholder: 'Enter complete address',
  },
  {
    label: 'Passport Number',
    type: 'text',
    required: false,
    placeholder: 'Enter passport number',
  },
  {
    label: 'Country of Interest',
    type: 'country',
    required: true,
  },
  {
    label: 'Preferred Intake',
    type: 'select',
    required: true,
    options: ['September 2024', 'January 2025', 'May 2025', 'September 2025'],
  },
  {
    label: 'Highest Qualification',
    type: 'qualification',
    required: true,
  },
  {
    label: 'English Proficiency',
    type: 'select',
    required: false,
    options: ['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'None'],
  },
  {
    label: 'Work Experience',
    type: 'paragraph',
    required: false,
    placeholder: 'Describe your work experience',
  }
];

const FormFieldBuilder = ({ value = [], onChange, className }) => {
  const [newFieldDialogOpen, setNewFieldDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    useCountryCode: false,
    defaultCountry: 'US',
    options: [''],
    regex: '',
    regexError: 'Invalid format'
  });

  const openEditDialog = (field) => {
    setEditingFieldId(field.id);
    setNewField({
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder || '',
      useCountryCode: field.useCountryCode || false,
      defaultCountry: field.defaultCountry || 'US',
      options: field.options.length > 0 ? field.options : [''],
      regex: field.regex || '',
      regexError: field.regexError || 'Invalid format'
    });
    setNewFieldDialogOpen(true);
  };

  const addField = () => {
    if (!newField.label.trim()) return;

    if (editingFieldId) {
      updateField(editingFieldId, {
        label: newField.label.trim(),
        type: newField.type,
        required: newField.required,
        placeholder: newField.placeholder.trim(),
        useCountryCode: newField.useCountryCode,
        defaultCountry: newField.defaultCountry,
        options: (newField.type === 'radio' || newField.type === 'select') 
          ? newField.options.filter(opt => opt.trim()) 
          : [],
        regex: newField.regex.trim(),
        regexError: newField.regexError.trim() || 'Invalid format',
      });
      setEditingFieldId(null);
    } else {
      const field = {
        id: `field_${Date.now()}`,
        label: newField.label.trim(),
        type: newField.type,
        required: newField.required,
        placeholder: newField.placeholder.trim(),
        useCountryCode: newField.useCountryCode,
        defaultCountry: newField.defaultCountry,
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
    }
    
    // Reset form
    setNewField({
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      useCountryCode: false,
      defaultCountry: 'US',
      options: [''],
      regex: '',
      regexError: 'Invalid format'
    });
    setNewFieldDialogOpen(false);
  };

  const removeField = (fieldId) => {
    onChange(value.filter(field => field.id !== fieldId));
  };

  const addPresetField = (preset) => {
    const field = {
      id: `field_${Date.now()}`,
      label: preset.label,
      type: preset.type,
      required: preset.required || false,
      placeholder: preset.placeholder || '',
      useCountryCode: preset.useCountryCode || false,
      defaultCountry: preset.defaultCountry || 'US',
      options: preset.options || [],
      regex: preset.regex || '',
      regexError: preset.regexError || 'Invalid format',
      order: value.length
    };

    onChange([...value, field]);
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
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="bg-primary/5 hover:bg-primary/10 border-primary/20">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              Quick Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Common Fields</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRESET_FIELDS.map((preset) => (
              <DropdownMenuItem 
                key={preset.label}
                onClick={() => addPresetField(preset)}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={newFieldDialogOpen} onOpenChange={(open) => {
          setNewFieldDialogOpen(open);
          if (!open) {
            setEditingFieldId(null);
            setNewField({
              label: '',
              type: 'text',
              required: false,
              placeholder: '',
              useCountryCode: false,
              defaultCountry: 'US',
              options: [''],
              regex: '',
              regexError: 'Invalid format'
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Custom Field
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFieldId ? 'Edit Form Field' : 'Add Form Field'}</DialogTitle>
              <DialogDescription>
                {editingFieldId ? 'Update your custom field settings' : 'Create a custom field for student registration'}
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

              {newField.type === 'phone' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="use-country-code">Enable Country Code</Label>
                      <p className="text-xs text-muted-foreground">Add country flag and selector</p>
                    </div>
                    <Switch
                      id="use-country-code"
                      checked={newField.useCountryCode}
                      onCheckedChange={(checked) => setNewField({ ...newField, useCountryCode: checked })}
                    />
                  </div>
                  
                  {newField.useCountryCode && (
                    <div className="space-y-2">
                      <Label htmlFor="default-country">Default Country</Label>
                      <Select 
                        value={newField.defaultCountry} 
                        onValueChange={(value) => setNewField({ ...newField, defaultCountry: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">🇺🇸 United States (+1)</SelectItem>
                          <SelectItem value="GB">🇬🇧 United Kingdom (+44)</SelectItem>
                          <SelectItem value="IN">🇮🇳 India (+91)</SelectItem>
                          <SelectItem value="CA">🇨🇦 Canada (+1)</SelectItem>
                          <SelectItem value="AU">🇦🇺 Australia (+61)</SelectItem>
                          <SelectItem value="NG">🇳🇬 Nigeria (+234)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
              <Button variant="outline" onClick={() => {
                setNewFieldDialogOpen(false);
                setEditingFieldId(null);
              }}>
                Cancel
              </Button>
              <Button onClick={addField} disabled={!newField.label.trim()}>
                {editingFieldId ? 'Update Field' : 'Add Field'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card overflow-hidden"
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
                      <span className="font-medium truncate block max-w-[200px] sm:max-w-[300px]">{field.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {fieldTypeLabels[field.type]}
                      </Badge>
                      {field.required && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 text-destructive hover:text-destructive/80 bg-destructive/5"
                          onClick={() => updateField(field.id, { required: false })}
                        >
                          <Lock className="w-3 h-3" />
                          Required
                        </Button>
                      )}
                      {!field.required && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground bg-muted/5"
                          onClick={() => updateField(field.id, { required: true })}
                        >
                          <Unlock className="w-3 h-3" />
                          Optional
                        </Button>
                      )}
                      {field.type === 'phone' && field.useCountryCode && (
                        <Badge variant="secondary" className="text-[10px] h-6 px-2">
                          <span className="mr-1">
                            {field.defaultCountry === 'IN' ? '🇮🇳' : 
                             field.defaultCountry === 'GB' ? '🇬🇧' : 
                             field.defaultCountry === 'US' ? '🇺🇸' : 
                             field.defaultCountry === 'CA' ? '🇨🇦' : 
                             field.defaultCountry === 'AU' ? '🇦🇺' : 
                             field.defaultCountry === 'NG' ? '🇳🇬' : '🌐'}
                          </span>
                          Intl Support
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
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(field)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(field.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default FormFieldBuilder;
