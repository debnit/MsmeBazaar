import { pdf } from '@react-pdf/renderer';
import AdminReportPDF from "@/components/pdf/admin-report-pdf";

export const generateAdminPDF = async (data: any) => {
  const buffer = await pdf(<AdminReportPDF data={data} />).toBlob();
  return buffer;
};