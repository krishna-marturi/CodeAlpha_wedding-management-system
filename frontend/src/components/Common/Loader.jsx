import React from 'react';

const Loader = ({ fullPage = false }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gold-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-sm font-display tracking-wider text-gold-600 animate-pulse">Loading EverAfter...</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF8F5]">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{spinner}</div>;
};

export default Loader;
