import { pdf } from '@react-pdf/renderer';
import AdminReportPDF from "@/components/pdf/admin-report-pdf";

export const generateAdminPDF = async (data: any) => {
  const buffer = await pdf(React.createElement(AdminReportPDF, { data })).toBlob();
  return buffer;
};