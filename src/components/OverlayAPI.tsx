import React from 'react';

const OverlayAPI: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg px-4 py-2 border border-gray-200">
        <p className="text-sm font-medium text-blue-500">
          MADE BY DOLPHIN_DEV
        </p>
      </div>
    </div>
  );
};

export default OverlayAPI;