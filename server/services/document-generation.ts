export interface DocumentData {
  type: string;
  data: any;
}

export interface GeneratedDocument {
  id: string;
  type: string;
  content: string;
  format: string;
  createdAt: Date;
}

export async function generateDocument(type: string, data: any): Promise<GeneratedDocument> {
  // Mock document generation service
  // In a real implementation, this would use PDF libraries or external services
  
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let content = "";
  
  switch (type) {
    case "loan_agreement":
      content = generateLoanAgreement(data);
      break;
    case "noc":
      content = generateNOC(data);
      break;
    case "transfer_deed":
      content = generateTransferDeed(data);
      break;
    case "valuation_report":
      content = generateValuationReport(data);
      break;
    case "compliance_report":
      content = generateComplianceReport(data);
      break;
    default:
      throw new Error(`Unsupported document type: ${type}`);
  }
  
  return {
    id: documentId,
    type,
    content,
    format: "pdf",
    createdAt: new Date()
  };
}

function generateLoanAgreement(data: any): string {
  return `
LOAN AGREEMENT

Date: ${new Date().toLocaleDateString()}
Loan Application ID: ${data.applicationId}

PARTIES:
Lender: ${data.nbfcName}
Borrower: ${data.buyerName}

LOAN DETAILS:
Principal Amount: ₹${data.loanAmount}
Interest Rate: ${data.interestRate}% per annum
Tenure: ${data.tenure} months
Monthly EMI: ₹${data.emi}

SECURITY:
MSME Asset: ${data.msmeName}
Valuation: ₹${data.msmeValuation}

TERMS AND CONDITIONS:
1. The loan shall be used solely for the acquisition of the specified MSME asset.
2. The borrower agrees to maintain the MSME operations for a minimum period of 12 months.
3. All statutory compliance requirements must be met.
4. Regular financial reporting is mandatory.

This agreement is governed by the laws of India and RBI guidelines.

_______________________     _______________________
Lender Signature            Borrower Signature
`;
}

function generateNOC(data: any): string {
  return `
NO OBJECTION CERTIFICATE

Date: ${new Date().toLocaleDateString()}
Reference: ${data.referenceNumber}

This is to certify that ${data.nbfcName}, a Non-Banking Financial Company registered with RBI, has NO OBJECTION to the transfer of ${data.msmeName} from ${data.sellerName} to ${data.buyerName}.

The loan facility of ₹${data.loanAmount} has been sanctioned and will be disbursed upon completion of legal formalities.

All statutory clearances and compliance requirements have been verified.

This NOC is valid for 30 days from the date of issue.

Authorized Signatory
${data.nbfcName}
RBI Registration: ${data.rbiLicense}
`;
}

function generateTransferDeed(data: any): string {
  return `
BUSINESS TRANSFER DEED

Date: ${new Date().toLocaleDateString()}
Transaction ID: ${data.transactionId}

TRANSFEROR: ${data.sellerName}
TRANSFEREE: ${data.buyerName}

ASSET DETAILS:
Business Name: ${data.msmeName}
Industry: ${data.industry}
Registration Number: ${data.registrationNumber}
Transfer Value: ₹${data.transferValue}

ASSETS TRANSFERRED:
1. All tangible and intangible assets
2. Business licenses and permits
3. Intellectual property rights
4. Customer contracts and relationships
5. Employee contracts

LIABILITIES:
All existing liabilities as per the balance sheet dated ${data.balanceSheetDate}

FINANCING:
Loan Provider: ${data.nbfcName}
Loan Amount: ₹${data.loanAmount}

This deed is executed in the presence of witnesses and is legally binding.

_______________________     _______________________
Transferor Signature       Transferee Signature
`;
}

function generateValuationReport(data: any): string {
  return `
MSME VALUATION REPORT

Date: ${new Date().toLocaleDateString()}
Report ID: ${data.reportId}

COMPANY DETAILS:
Name: ${data.companyName}
Industry: ${data.industry}
Established: ${data.establishedYear}
Location: ${data.location}

FINANCIAL HIGHLIGHTS:
Annual Revenue: ₹${data.revenue}
Net Profit: ₹${data.netProfit}
Total Assets: ₹${data.totalAssets}
Total Liabilities: ₹${data.totalLiabilities}

VALUATION METHODOLOGY:
1. Revenue Multiple Approach: ₹${data.revenueMultiple}
2. Asset-based Approach: ₹${data.assetValue}
3. Industry Comparison: ${data.industryFactor}x

RISK FACTORS:
- Market conditions: ${data.marketRisk}
- Operational risks: ${data.operationalRisk}
- Financial risks: ${data.financialRisk}

FINAL VALUATION: ₹${data.finalValuation}
Confidence Level: ${data.confidence}%

This valuation is based on available financial information and market conditions as of the report date.

Prepared by: MSMEAtlas Valuation Team
`;
}

function generateComplianceReport(data: any): string {
  return `
RBI COMPLIANCE REPORT

Date: ${new Date().toLocaleDateString()}
NBFC Name: ${data.nbfcName}
RBI License: ${data.rbiLicense}

COMPLIANCE STATUS:

1. MASTER DIRECTIONS COMPLIANCE:
   - Scale-based Regulation: ${data.scaleCompliance}
   - Lending Guidelines: ${data.lendingCompliance}
   - Fair Practices Code: ${data.fairPracticesCompliance}

2. CAPITAL ADEQUACY:
   - Minimum Capital: ${data.minCapital}
   - Actual Capital: ${data.actualCapital}
   - Ratio: ${data.capitalRatio}%

3. ASSET CLASSIFICATION:
   - Standard Assets: ${data.standardAssets}%
   - Sub-standard Assets: ${data.substandardAssets}%
   - Doubtful Assets: ${data.doubtfulAssets}%
   - Loss Assets: ${data.lossAssets}%

4. PROVISIONING:
   - Required Provisions: ₹${data.requiredProvisions}
   - Actual Provisions: ₹${data.actualProvisions}
   - Coverage Ratio: ${data.coverageRatio}%

5. EXPOSURE LIMITS:
   - Single Borrower: ${data.singleBorrowerExposure}%
   - Group Exposure: ${data.groupExposure}%

OVERALL COMPLIANCE RATING: ${data.overallRating}

This report is prepared based on RBI guidelines and internal assessment.

Compliance Officer
${data.nbfcName}
`;
}
