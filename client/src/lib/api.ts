import { apiRequest } from "./queryClient";
import { getAuthToken } from "./auth";

// Enhanced API request with authentication
export async function authenticatedApiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = getAuthToken();
  
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }

  return response;
}

// MSME API
export const msmeApi = {
  createListing: async (data: any) => {
    const response = await authenticatedApiRequest("POST", "/api/msme/listings", data);
    return response.json();
  },
  
  getListings: async (filters?: any) => {
    const params = new URLSearchParams(filters || {});
    const response = await authenticatedApiRequest("GET", `/api/msme/listings?${params}`);
    return response.json();
  },
  
  getListing: async (id: number) => {
    const response = await authenticatedApiRequest("GET", `/api/msme/listings/${id}`);
    return response.json();
  },
  
  updateListing: async (id: number, data: any) => {
    const response = await authenticatedApiRequest("PATCH", `/api/msme/listings/${id}`, data);
    return response.json();
  },
  
  getMyListings: async () => {
    const response = await authenticatedApiRequest("GET", "/api/msme/my-listings");
    return response.json();
  },
  
  requestValuation: async (msmeId: number) => {
    const response = await authenticatedApiRequest("POST", "/api/msme/valuation", { msmeId });
    return response.json();
  },
};

// Loan API
export const loanApi = {
  createApplication: async (data: any) => {
    const response = await authenticatedApiRequest("POST", "/api/loan/applications", data);
    return response.json();
  },
  
  getApplications: async () => {
    const response = await authenticatedApiRequest("GET", "/api/loan/applications");
    return response.json();
  },
  
  updateApplication: async (id: number, data: any) => {
    const response = await authenticatedApiRequest("PATCH", `/api/nbfc/loan-applications/${id}`, data);
    return response.json();
  },
};

// NBFC API
export const nbfcApi = {
  createDetails: async (data: any) => {
    const response = await authenticatedApiRequest("POST", "/api/nbfc/details", data);
    return response.json();
  },
  
  getDetails: async () => {
    const response = await authenticatedApiRequest("GET", "/api/nbfc/details");
    return response.json();
  },
  
  createLoanProduct: async (data: any) => {
    const response = await authenticatedApiRequest("POST", "/api/nbfc/loan-products", data);
    return response.json();
  },
  
  getLoanProducts: async () => {
    const response = await authenticatedApiRequest("GET", "/api/nbfc/loan-products");
    return response.json();
  },
  
  getCompliance: async () => {
    const response = await authenticatedApiRequest("GET", "/api/nbfc/compliance");
    return response.json();
  },
};

// Buyer API
export const buyerApi = {
  createInterest: async (data: any) => {
    const response = await authenticatedApiRequest("POST", "/api/buyer/interests", data);
    return response.json();
  },
  
  getInterests: async () => {
    const response = await authenticatedApiRequest("GET", "/api/buyer/interests");
    return response.json();
  },
  
  getMatches: async (criteria: any) => {
    const params = new URLSearchParams(criteria);
    const response = await authenticatedApiRequest("GET", `/api/buyer/matches?${params}`);
    return response.json();
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const response = await authenticatedApiRequest("GET", "/api/dashboard/stats");
    return response.json();
  },
};

// Document API
export const documentApi = {
  generate: async (type: string, data: any) => {
    const response = await authenticatedApiRequest("POST", "/api/documents/generate", { type, data });
    return response.json();
  },
};
