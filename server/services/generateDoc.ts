// server/services/generateDoc.ts

type Party = {
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'agent';
};

type MSMEDetails = {
  businessName: string;
  industry: string;
  location: string;
  valuation: number;
  dealDate?: string;
};

export function generateMockPDFBase64(
  buyer: Party,
  seller: Party,
  agent: Party,
  msme: MSMEDetails,
): string {
  const today = msme.dealDate || new Date().toLocaleDateString('en-IN');

  const agreementText = `
📄 MSME EXIT AGREEMENT (Mock)

This memorandum of understanding (MoU) is made on ${today} between:

▸ Buyer: ${buyer.name} (${buyer.email})
▸ Seller: ${seller.name} (${seller.email})
▸ Agent Facilitator: ${agent.name} (${agent.email})

Regarding:
▸ Business: ${msme.businessName}
▸ Industry: ${msme.industry}
▸ Location: ${msme.location}
▸ Valuation: ₹${msme.valuation.toLocaleString('en-IN')}

Terms:
1. Preliminary document only
2. KYC & compliance pending
3. Agent commission via MSMEBazaar policy

Signed: ${today}
`;

  return Buffer.from(agreementText, 'utf-8').toString('base64');
}
