import React from 'react';

interface InteractiveMapProps {
  className?: string;
  children?: React.ReactNode;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  className = "", 
  children 
}) => {
  return (
    <div className={`interactive-map ${className}`}>
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <p className="text-gray-500">Interactive Map Component</p>
        <p className="text-sm text-gray-400">Map functionality will be implemented here</p>
        {children}
      </div>
    </div>
  );
};

export default InteractiveMap;