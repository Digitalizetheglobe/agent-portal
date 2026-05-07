import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

const QUALIFICATIONS = [
  'High School / Secondary School',
  'Diploma / Vocational Training',
  'Bachelor\'s Degree',
  'Post Graduate Diploma',
  'Master\'s Degree',
  'Doctorate / PhD',
  'Other Professional Qualification'
];

const QualificationSelector = ({ value, onChange, placeholder = "Select qualification", className }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {QUALIFICATIONS.map((qual) => (
          <SelectItem key={qual} value={qual}>
            {qual}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default QualificationSelector;
