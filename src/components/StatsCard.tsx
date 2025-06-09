import React from 'react';

interface StatsCardProps {
  value: string | number;
  label: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ value, label, className = '' }) => {
  return (
    <div className={`text-center group ${className}`}>
      <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
        {value}
      </div>
      <div className="text-gray-400 text-sm sm:text-base font-medium group-hover:text-gray-300 transition-colors duration-300">
        {label}
      </div>
    </div>
  );
};

export default StatsCard;