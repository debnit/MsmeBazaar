import DownloadAgreementButton from '@/components/DownloadAgreementButton';

// Example fetched base64 string — replace with real API call or prop
const dummyBase64 = 'JVBERi0xLjUKJ...'; // (Your actual base64 PDF string)

export default function AgreementPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Download Your MSME Agreement</h1>
      <DownloadAgreementButton base64String={dummyBase64} />
    </div>
  );
}
// if fetching fro
import { useEffect, useState } from 'react';
import DownloadAgreementButton from '@/components/DownloadAgreementButton';

export default function AgreementPage() {
  const [pdfBase64, setPdfBase64] = useState('');

  useEffect(() => {
    fetch('/api/get-msme-agreement') // Your API route
      .then(res => res.json())
      .then(data => setPdfBase64(data.base64));
  }, []);

  return (
    <div className="p-4">
      {pdfBase64 ? (
        <DownloadAgreementButton base64String={pdfBase64} />
      ) : (
        <p>Loading agreement...</p>
      )}
    </div>
  );
}
