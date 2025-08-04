'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ValuationFeedbackPage() {
  const [form, setForm] = useState({
    msmeId: '',
    predictedValuation: '',
    actualValuation: '',
    feedback: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/valuation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success('✅ Feedback submitted!');
        setForm({ msmeId: '', predictedValuation: '', actualValuation: '', feedback: '' });
      } else {
        toast.error('❌ Failed to submit');
      }
    } catch (err) {
      toast.error('🚫 Error occurred');
    }
  };

  return (
    <Card className="max-w-xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Submit Valuation Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          name="msmeId"
          placeholder="MSME ID"
          value={form.msmeId}
          onChange={handleChange}
        />
        <Input
          name="predictedValuation"
          placeholder="Predicted Valuation"
          value={form.predictedValuation}
          onChange={handleChange}
        />
        <Input
          name="actualValuation"
          placeholder="Actual Valuation"
          value={form.actualValuation}
          onChange={handleChange}
        />
        <Textarea
          name="feedback"
          placeholder="Why was the model wrong or right?"
          value={form.feedback}
          onChange={handleChange}
        />
        <Button onClick={handleSubmit}>Submit Feedback</Button>
      </CardContent>
    </Card>
  );
}

