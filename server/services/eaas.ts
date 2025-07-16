import { z } from 'zod';
import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';

// Document templates and types
export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'sale_deed' | 'nda' | 'exit_agreement' | 'loan_agreement' | 'escrow_agreement';
  template: string;
  requiredFields: string[];
  legalCompliance: string[];
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  documentType: string;
  content: string;
  pdfPath: string;
  status: 'draft' | 'generated' | 'signed' | 'completed';
  parties: DocumentParty[];
  createdAt: Date;
  updatedAt: Date;
  metadata: any;
}

export interface DocumentParty {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'nbfc' | 'agent' | 'witness';
  signatureStatus: 'pending' | 'signed' | 'declined';
  signedAt?: Date;
  ipAddress?: string;
}

export interface DocuSignEnvelope {
  envelopeId: string;
  status: string;
  documentsUri: string;
  recipientsUri: string;
  statusDateTime: string;
}

// Document generation schemas
const saleAgreementSchema = z.object({
  buyerDetails: z.object({
    name: z.string(),
    address: z.string(),
    panCard: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }),
  sellerDetails: z.object({
    name: z.string(),
    address: z.string(),
    panCard: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }),
  msmeDetails: z.object({
    businessName: z.string(),
    registrationNumber: z.string(),
    address: z.string(),
    valuation: z.number(),
    salePrice: z.number(),
    assets: z.array(z.string()),
    liabilities: z.array(z.string()),
  }),
  paymentTerms: z.object({
    totalAmount: z.number(),
    advanceAmount: z.number(),
    milestones: z.array(z.object({
      description: z.string(),
      amount: z.number(),
      dueDate: z.string(),
    })),
  }),
  legalClauses: z.object({
    warranty: z.string(),
    indemnity: z.string(),
    nonCompete: z.string(),
    confidentiality: z.string(),
  }),
});

const ndaSchema = z.object({
  disclosingParty: z.object({
    name: z.string(),
    address: z.string(),
    email: z.string().email(),
  }),
  receivingParty: z.object({
    name: z.string(),
    address: z.string(),
    email: z.string().email(),
  }),
  confidentialInfo: z.string(),
  purpose: z.string(),
  duration: z.string(),
  jurisdiction: z.string(),
});

class EaaSService {
  private documents: Map<string, GeneratedDocument> = new Map();
  private templates: Map<string, DocumentTemplate> = new Map();
  private nextId = 1;

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Sale Agreement Template
    const saleTemplate: DocumentTemplate = {
      id: 'sale_agreement_v1',
      name: 'MSME Sale Agreement',
      type: 'sale_deed',
      template: this.getSaleAgreementTemplate(),
      requiredFields: ['buyerDetails', 'sellerDetails', 'msmeDetails', 'paymentTerms', 'legalClauses'],
      legalCompliance: ['Companies Act 2013', 'MSME Development Act 2006', 'Contract Act 1872']
    };

    // NDA Template
    const ndaTemplate: DocumentTemplate = {
      id: 'nda_v1',
      name: 'Non-Disclosure Agreement',
      type: 'nda',
      template: this.getNDATemplate(),
      requiredFields: ['disclosingParty', 'receivingParty', 'confidentialInfo', 'purpose', 'duration'],
      legalCompliance: ['Contract Act 1872', 'Information Technology Act 2000']
    };

    // Exit Agreement Template
    const exitTemplate: DocumentTemplate = {
      id: 'exit_agreement_v1',
      name: 'Business Exit Agreement',
      type: 'exit_agreement',
      template: this.getExitAgreementTemplate(),
      requiredFields: ['exitingParty', 'remainingParties', 'exitTerms', 'valuation'],
      legalCompliance: ['Companies Act 2013', 'Partnership Act 1932']
    };

    this.templates.set(saleTemplate.id, saleTemplate);
    this.templates.set(ndaTemplate.id, ndaTemplate);
    this.templates.set(exitTemplate.id, exitTemplate);
  }

  private getSaleAgreementTemplate(): string {
    return `
# MSME SALE AGREEMENT

**AGREEMENT FOR SALE OF MICRO, SMALL & MEDIUM ENTERPRISE**

This Agreement is made on {{agreementDate}} between:

## SELLER DETAILS
**Name:** {{sellerDetails.name}}
**Address:** {{sellerDetails.address}}
**PAN:** {{sellerDetails.panCard}}
**Email:** {{sellerDetails.email}}
**Phone:** {{sellerDetails.phone}}

## BUYER DETAILS
**Name:** {{buyerDetails.name}}
**Address:** {{buyerDetails.address}}
**PAN:** {{buyerDetails.panCard}}
**Email:** {{buyerDetails.email}}
**Phone:** {{buyerDetails.phone}}

## BUSINESS DETAILS
**Business Name:** {{msmeDetails.businessName}}
**Registration Number:** {{msmeDetails.registrationNumber}}
**Business Address:** {{msmeDetails.address}}
**Valuation:** ₹{{msmeDetails.valuation}}
**Sale Price:** ₹{{msmeDetails.salePrice}}

## PAYMENT TERMS
**Total Amount:** ₹{{paymentTerms.totalAmount}}
**Advance Amount:** ₹{{paymentTerms.advanceAmount}}

### Payment Milestones:
{{#each paymentTerms.milestones}}
- {{description}}: ₹{{amount}} (Due: {{dueDate}})
{{/each}}

## LEGAL CLAUSES

### 1. WARRANTY
{{legalClauses.warranty}}

### 2. INDEMNITY
{{legalClauses.indemnity}}

### 3. NON-COMPETE
{{legalClauses.nonCompete}}

### 4. CONFIDENTIALITY
{{legalClauses.confidentiality}}

## GOVERNING LAW
This Agreement shall be governed by the laws of India and subject to the jurisdiction of courts in {{jurisdiction}}.

---

**SELLER SIGNATURE:** ___________________ **DATE:** ___________

**BUYER SIGNATURE:** ___________________ **DATE:** ___________

**WITNESS 1:** ___________________ **DATE:** ___________

**WITNESS 2:** ___________________ **DATE:** ___________
    `.trim();
  }

  private getNDATemplate(): string {
    return `
# NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on {{agreementDate}} between:

## DISCLOSING PARTY
**Name:** {{disclosingParty.name}}
**Address:** {{disclosingParty.address}}
**Email:** {{disclosingParty.email}}

## RECEIVING PARTY
**Name:** {{receivingParty.name}}
**Address:** {{receivingParty.address}}
**Email:** {{receivingParty.email}}

## CONFIDENTIAL INFORMATION
The following information is considered confidential:
{{confidentialInfo}}

## PURPOSE
The confidential information is being disclosed for the following purpose:
{{purpose}}

## DURATION
This agreement shall remain in effect for {{duration}} from the date of signing.

## OBLIGATIONS
1. The Receiving Party agrees to maintain strict confidentiality
2. Not to disclose information to third parties without written consent
3. To use the information solely for the stated purpose
4. To return or destroy all confidential materials upon request

## GOVERNING LAW
This Agreement shall be governed by the laws of India and subject to the jurisdiction of {{jurisdiction}} courts.

---

**DISCLOSING PARTY:** ___________________ **DATE:** ___________

**RECEIVING PARTY:** ___________________ **DATE:** ___________
    `.trim();
  }

  private getExitAgreementTemplate(): string {
    return `
# BUSINESS EXIT AGREEMENT

This Business Exit Agreement is made on {{agreementDate}} between the parties involved in {{businessName}}.

## EXIT TERMS
The exiting party agrees to transfer all rights, responsibilities, and ownership as per the terms outlined in this agreement.

## VALUATION
The business valuation has been assessed at ₹{{valuation}} as of {{valuationDate}}.

## SETTLEMENT
All financial obligations will be settled as per the payment schedule outlined in Schedule A.

---

**EXITING PARTY:** ___________________ **DATE:** ___________

**REMAINING PARTIES:** ___________________ **DATE:** ___________
    `.trim();
  }

  private replaceTemplateVariables(template: string, data: any): string {
    let result = template;
    
    // Simple template replacement (in production, use a proper template engine)
    const flatten = (obj: any, prefix = ''): any => {
      let flattened: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(flattened, flatten(obj[key], newKey));
          } else {
            flattened[newKey] = obj[key];
          }
        }
      }
      return flattened;
    };

    const flatData = flatten(data);
    
    // Replace variables
    for (const [key, value] of Object.entries(flatData)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    // Add current date
    result = result.replace(/{{agreementDate}}/g, new Date().toLocaleDateString('en-IN'));
    result = result.replace(/{{jurisdiction}}/g, 'Mumbai');
    
    return result;
  }

  async generateDocument(templateId: string, data: any, parties: DocumentParty[]): Promise<GeneratedDocument> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate data based on template type
    if (template.type === 'sale_deed') {
      saleAgreementSchema.parse(data);
    } else if (template.type === 'nda') {
      ndaSchema.parse(data);
    }

    const documentId = `doc_${this.nextId++}`;
    const content = this.replaceTemplateVariables(template.template, data);
    
    // Generate PDF
    const pdfPath = await this.generatePDF(content, documentId);
    
    const document: GeneratedDocument = {
      id: documentId,
      templateId,
      documentType: template.type,
      content,
      pdfPath,
      status: 'generated',
      parties,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { ...data, template: template.name }
    };

    this.documents.set(documentId, document);
    return document;
  }

  private async generatePDF(content: string, documentId: string): Promise<string> {
    const doc = new PDFDocument();
    const pdfPath = path.join(process.cwd(), 'generated_docs', `${documentId}.pdf`);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(pdfPath), { recursive: true });
    
    // Create PDF stream
    const stream = doc.pipe(require('fs').createWriteStream(pdfPath));
    
    // Add content to PDF
    doc.fontSize(16).text('MSMESquare - Legal Document', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    
    const lines = content.split('\n');
    lines.forEach((line: string) => {
      if (line.startsWith('# ')) {
        doc.fontSize(16).text(line.substring(2), { align: 'center' });
        doc.moveDown();
      } else if (line.startsWith('## ')) {
        doc.fontSize(14).text(line.substring(3));
        doc.moveDown(0.5);
      } else if (line.startsWith('### ')) {
        doc.fontSize(12).text(line.substring(4));
        doc.moveDown(0.3);
      } else {
        doc.fontSize(10).text(line);
        doc.moveDown(0.2);
      }
    });
    
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(pdfPath));
      stream.on('error', reject);
    });
  }

  // DocuSign integration methods
  async sendForSignature(documentId: string): Promise<DocuSignEnvelope> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Mock DocuSign API call - in production, use actual DocuSign SDK
    const envelope: DocuSignEnvelope = {
      envelopeId: `env_${Date.now()}`,
      status: 'sent',
      documentsUri: `/documents/${documentId}`,
      recipientsUri: `/recipients/${documentId}`,
      statusDateTime: new Date().toISOString()
    };

    // Update document status
    document.status = 'signed';
    document.updatedAt = new Date();

    // Mock signature process for parties
    document.parties.forEach(party => {
      party.signatureStatus = 'signed';
      party.signedAt = new Date();
    });

    return envelope;
  }

  async getDocumentStatus(documentId: string): Promise<GeneratedDocument | null> {
    return this.documents.get(documentId) || null;
  }

  async getDocumentsByParty(email: string): Promise<GeneratedDocument[]> {
    return Array.from(this.documents.values()).filter(doc => 
      doc.parties.some(party => party.email === email)
    );
  }

  getTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  // Legal compliance checking
  async checkCompliance(documentId: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const template = this.templates.get(document.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Mock compliance check
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for required clauses
    if (!document.content.includes('GOVERNING LAW')) {
      issues.push('Missing governing law clause');
    }

    if (template.type === 'sale_deed' && !document.content.includes('WARRANTY')) {
      issues.push('Missing warranty clause');
    }

    if (template.type === 'nda' && !document.content.includes('CONFIDENTIALITY')) {
      issues.push('Missing confidentiality clause');
    }

    // Recommendations
    if (template.type === 'sale_deed') {
      recommendations.push('Consider adding arbitration clause');
      recommendations.push('Include force majeure provision');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }
}

export const eaasService = new EaaSService();