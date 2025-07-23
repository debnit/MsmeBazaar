// lib/pdf-utils.ts (or any server-side lib file)

import { pdf } from '@react-pdf/renderer';
import AdminReportPDF from '@/components/pdf/admin-report-pdf';

// Server-side function to generate PDF blob
export const generateAdminPDF = async (data: any): Promise<Blob> => {
  const blob = await pdf(<AdminReportPDF data={data} />).toBlob();
  return blob;
};
// Alternatively, if you need a Buffer
export const generateAdminPDFBuffer = async (data: any): Promise<Buffer> => {
  const buffer = await pdf(<AdminReportPDF data={data} />).toBuffer();
  return buffer;
};
// This function can be used in API routes or server-side rendering contexts
// to generate the PDF and return it as a response or save it to a file.
// Ensure you have the necessary types and imports for React and PDF rendering.
// Note: Adjust the import paths based on your project structure.
// Ensure that the AdminReportPDF component is correctly set up to accept the data prop.  