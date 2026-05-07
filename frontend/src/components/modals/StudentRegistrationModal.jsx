import React, { useState, useMemo } from 'react';
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
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');

  const availableEvents = useMemo(() => {
    if (isAdmin()) return events;
    return getEventsForAgent(user?.id);
  }, [events, user?.id, isAdmin, getEventsForAgent]);

  // Reset event selection when modal opens if an initial ID is provided
  React.useEffect(() => {
    if (open && initialEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [open, initialEventId]);

  // Handle successful registration
  const handleSuccess = () => {
    onOpenChange(false);
    setSelectedEventId('');
  };

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
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">Add student to an active recruitment event</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-[#F9FAFB] max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {/* Event Selection */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Select Target Event</Label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white appearance-none"
              >
                <option value="">Select an event...</option>
                {availableEvents.map(ev => (
                  <option key={ev.id || ev._id} value={ev.id || ev._id}>{ev.title}</option>
                ))}
              </select>
            </div>

            {selectedEventId ? (
              <div className="pt-4 border-t border-gray-100">
                <DynamicStudentForm
                  eventId={selectedEventId}
                  onSuccess={handleSuccess}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-gray-300" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Choose an event to continue</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-[250px]">
                  Each event has its own specific registration fields and requirements.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentRegistrationModal;
