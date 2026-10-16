import React from 'react';
import { GraduationCap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import DynamicStudentForm from '../forms/DynamicStudentForm';

const StudentRegistrationModal = ({ open, onOpenChange }) => {
  // Handle successful registration
  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[650px] p-0 overflow-y-auto border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#042C53]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">Register New Student</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">Add a student to the portal</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-[#F9FAFB] max-h-[75vh] overflow-y-auto custom-scrollbar">
          <DynamicStudentForm onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentRegistrationModal;
