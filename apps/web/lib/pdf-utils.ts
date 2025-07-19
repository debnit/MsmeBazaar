import { pdf } from '@react-pdf/renderer';
import AdminReportPDF from "@/components/pdf/admin-report-pdf";

export const generateAdminPDF = async (data: any) => {
  const blob = await pdf(<AdminReportPDF data={data} />).toBlob();
  return blob;
};