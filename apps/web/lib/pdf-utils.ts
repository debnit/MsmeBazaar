// lib/pdf-utils.ts (or any server-side lib file)

import { pdf } from '@react-pdf/renderer';
import AdminReportPDF from '@/components/pdf/admin-report-pdf';

// Server-side function to generate PDF blob
export const generateAdminPDF = async (data: any): Promise<Blob> => {
  const blob = await pdf(<AdminReportPDF data={data} />).toBlob();
  return blob;
};
