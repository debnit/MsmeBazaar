import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPDFEmail = async (pdfBlob: Blob) => {
  const file = new File([pdfBlob], 'admin-report.pdf', { type: 'application/pdf' });
  await resend.emails.send({
    from: 'alerts@msmebazaar.in',
    to: ['admin@msmebazaar.in'],
    subject: 'Admin Report',
    attachments: [{ filename: file.name, content: await file.arrayBuffer() }],
  });
};
