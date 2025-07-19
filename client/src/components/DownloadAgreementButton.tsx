'use client';

import React from 'react';

interface Props {
  base64String: string;
}

const DownloadAgreementButton: React.FC<Props> = ({ base64String }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64String}`;
    link.download = 'MSME-Agreement.pdf';
    link.click();
  };

  return (
    <button
      onClick={handleDownload}
      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
    >
      Download MSME Agreement
    </button>
  );
};

export default DownloadAgreementButton;
