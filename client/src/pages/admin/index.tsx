'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MSME {
  id: string;
  name: string;
  phone: string;
  state: string;
  agreement_base64: string; // base64 PDF
}

export default function AdminDashboard() {
  const [data, setData] = useState<MSME[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/msmes') // Your FastAPI route (adjust as needed)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (base64: string, name: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = `${name}-MSME-Agreement.pdf`;
    link.click();
  };

  const onboardedCount = data.length;
  const states = [...new Set(data.map(msme => msme.state))];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Analytics Overview */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Total Onboarded</h2>
            <p className="text-2xl">{onboardedCount}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">States Covered</h2>
            <p className="text-2xl">{states.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* MSME Table */}
      <div className="grid gap-4">
        {data.map(msme => (
          <Card key={msme.id}>
            <CardContent className="flex justify-between items-center p-4">
              <div>
                <h3 className="font-bold">{msme.name}</h3>
                <p className="text-sm">{msme.phone} | {msme.state}</p>
              </div>
              <Button onClick={() => handleDownload(msme.agreement_base64, msme.name)}>
                Download Agreement
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && <p>Loading MSMEs...</p>}
    </div>
  );
}
axios.get('http://localhost:8000/api/admin/msmes')
