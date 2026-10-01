import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  Calendar
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import DynamicStudentForm from '../forms/DynamicStudentForm';

const StudentRegistrationModal = ({ open, onOpenChange, initialEventId }) => {
  const { events, getEventsForAgent } = useData();
  const { user, isAdmin } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || 'direct');

  const availableEvents = useMemo(() => {
    if (isAdmin()) return events;
    return getEventsForAgent(user?.id);
  }, [events, user?.id, isAdmin, getEventsForAgent]);

  // Set default selection when modal opens (defaults to 'direct' unless initialEventId is specified)
  useEffect(() => {
    if (open) {
      if (initialEventId) {
        setSelectedEventId(initialEventId);
      } else {
        setSelectedEventId('direct');
      }
    }
  }, [open, initialEventId]);

  // Handle successful registration
  const handleSuccess = () => {
    onOpenChange(false);
  };

  const effectiveEventId = selectedEventId === 'direct' ? null : selectedEventId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[650px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#042C53]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">Register New Student</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">Add student to an active recruitment event or register directly</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-[#F9FAFB] max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {/* Event Selection */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Target Event / Direct Registration</Label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white"
              >
                <option value="direct">Direct Registration (No Event)</option>
                {availableEvents.map(ev => (
                  <option key={ev.id || ev._id} value={ev.id || ev._id}>{ev.title}</option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <DynamicStudentForm
                key={effectiveEventId || 'direct'}
                eventId={effectiveEventId}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentRegistrationModal;
