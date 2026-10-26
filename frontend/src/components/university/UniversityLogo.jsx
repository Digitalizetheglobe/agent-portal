import React, { useState } from 'react';

const SIZES = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-xl',
};

/** University logo, or its first two letters when there is no logo or it cannot be loaded. */
const UniversityLogo = ({ university, size = 'md' }) => {
  const [failed, setFailed] = useState(false);
  const box = SIZES[size] || SIZES.md;

  if (university.logoUrl && !failed) {
    return (
      <img
        src={university.logoUrl}
        alt={university.name}
        onError={() => setFailed(true)}
        className={`${box} rounded-lg object-contain bg-gray-50 border border-gray-200 p-0.5 shrink-0`}
      />
    );
  }
  return (
    <div className={`${box} rounded-lg bg-[#E6F1FB] flex items-center justify-center text-[#0C447C] font-bold uppercase shrink-0`}>
      {(university.name || '?').substring(0, 2)}
    </div>
  );
};

export default UniversityLogo;
