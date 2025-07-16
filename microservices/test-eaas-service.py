#!/usr/bin/env python3
"""
Test script for EaaS Service - Document Generation
Tests sale deed, NDA, and exit document generation
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8006"

def test_health_check():
    """Test health check endpoint"""
    print("🏥 Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_sale_deed_generation():
    """Test sale deed generation"""
    print("📋 Testing sale deed generation...")
    
    payload = {
        "document_type": "sale_deed",
        "data": {
            "execution_date": "January 15, 2024",
            "seller_name": "ABC Enterprises Pvt Ltd",
            "buyer_name": "XYZ Corporation",
            "business_name": "TechStartup Solutions",
            "industry": "Software Development",
            "annual_turnover": "50,00,000",
            "location": "Bangalore, Karnataka",
            "employee_count": "25",
            "sale_price": "1,50,00,000",
            "sale_price_words": "One Crore Fifty Lakhs Only"
        },
        "signers": [
            {
                "name": "John Doe",
                "email": "john@abcenterprises.com",
                "role": "seller"
            },
            {
                "name": "Jane Smith",
                "email": "jane@xyzcorp.com",
                "role": "buyer"
            }
        ],
        "require_signature": False  # Set to False for testing without DocuSign
    }
    
    response = requests.post(f"{BASE_URL}/generate-document", json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Document ID: {result['document_id']}")
        print(f"Document Type: {result['document_type']}")
        print(f"Status: {result['status']}")
        print(f"Download URL: {result['download_url']}")
        return result['document_id']
    else:
        print(f"Error: {response.text}")
        return None

def test_nda_generation():
    """Test NDA generation"""
    print("🔒 Testing NDA generation...")
    
    payload = {
        "document_type": "nda",
        "data": {
            "execution_date": "January 15, 2024",
            "disclosing_party": "TechCorp Solutions",
            "receiving_party": "Investment Partners LLC",
            "term_years": "3"
        },
        "signers": [
            {
                "name": "Alice Johnson",
                "email": "alice@techcorp.com",
                "role": "disclosing_party"
            },
            {
                "name": "Bob Wilson",
                "email": "bob@investmentpartners.com",
                "role": "receiving_party"
            }
        ],
        "require_signature": False
    }
    
    response = requests.post(f"{BASE_URL}/generate-document", json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Document ID: {result['document_id']}")
        print(f"Document Type: {result['document_type']}")
        print(f"Status: {result['status']}")
        print(f"Download URL: {result['download_url']}")
        return result['document_id']
    else:
        print(f"Error: {response.text}")
        return None

def test_exit_document_generation():
    """Test exit document generation"""
    print("🚪 Testing exit document generation...")
    
    payload = {
        "document_type": "exit_document",
        "data": {
            "execution_date": "January 15, 2024",
            "exiting_party": "Michael Brown",
            "remaining_party": "StartupCo Pvt Ltd",
            "business_name": "InnovateNow Solutions",
            "exit_share_percentage": "30",
            "business_valuation": "2,00,00,000",
            "exit_value": "60,00,000",
            "payment_terms": "3 equal installments over 6 months",
            "transition_period": "45",
            "non_compete_period": "2"
        },
        "signers": [
            {
                "name": "Michael Brown",
                "email": "michael@innovatenow.com",
                "role": "exiting_party"
            },
            {
                "name": "Sarah Davis",
                "email": "sarah@startupco.com",
                "role": "remaining_party"
            }
        ],
        "require_signature": False
    }
    
    response = requests.post(f"{BASE_URL}/generate-document", json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Document ID: {result['document_id']}")
        print(f"Document Type: {result['document_type']}")
        print(f"Status: {result['status']}")
        print(f"Download URL: {result['download_url']}")
        return result['document_id']
    else:
        print(f"Error: {response.text}")
        return None

def test_document_status(document_id):
    """Test document status endpoint"""
    print(f"📊 Testing document status for {document_id}...")
    
    response = requests.get(f"{BASE_URL}/document-status/{document_id}")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Document Status: {result['status']}")
        print(f"Created At: {result['created_at']}")
        print(f"Expires At: {result['expires_at']}")
    else:
        print(f"Error: {response.text}")
    print()

def test_document_download(document_id):
    """Test document download"""
    print(f"⬇️ Testing document download for {document_id}...")
    
    response = requests.get(f"{BASE_URL}/download-document/{document_id}")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        filename = f"test_document_{document_id}.pdf"
        with open(filename, 'wb') as f:
            f.write(response.content)
        print(f"Document downloaded as: {filename}")
    else:
        print(f"Error: {response.text}")
    print()

def test_list_documents():
    """Test list documents endpoint"""
    print("📋 Testing list documents...")
    
    response = requests.get(f"{BASE_URL}/list-documents")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Total Documents: {len(result['documents'])}")
        for doc in result['documents']:
            print(f"  - {doc['document_id']}: {doc['document_type']} ({doc['status']})")
    else:
        print(f"Error: {response.text}")
    print()

def test_create_template():
    """Test template creation"""
    print("📝 Testing template creation...")
    
    payload = {
        "template_name": "Custom Sale Agreement",
        "document_type": "sale_deed",
        "template_content": "Custom template content with {{seller_name}} and {{buyer_name}}",
        "variables": ["seller_name", "buyer_name", "sale_price"],
        "default_styling": {
            "font_size": 12,
            "line_spacing": 1.5,
            "margin": 72
        }
    }
    
    response = requests.post(f"{BASE_URL}/create-template", json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Template ID: {result['template_id']}")
        print(f"Message: {result['message']}")
    else:
        print(f"Error: {response.text}")
    print()

def test_list_templates():
    """Test list templates endpoint"""
    print("📋 Testing list templates...")
    
    response = requests.get(f"{BASE_URL}/templates")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Total Templates: {len(result['templates'])}")
        for template in result['templates']:
            print(f"  - {template['template_id']}: {template['template_name']} ({template['document_type']})")
    else:
        print(f"Error: {response.text}")
    print()

def test_metrics():
    """Test metrics endpoint"""
    print("📊 Testing metrics...")
    
    response = requests.get(f"{BASE_URL}/metrics")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Documents Generated: {result['documents_generated']}")
        print(f"Active Documents: {result['active_documents']}")
        print(f"Templates Available: {result['templates_available']}")
        print(f"DocuSign Enabled: {result['docusign_enabled']}")
    else:
        print(f"Error: {response.text}")
    print()

def main():
    """Run all tests"""
    print("🚀 Starting EaaS Service Tests")
    print("=" * 50)
    
    # Test health check
    test_health_check()
    
    # Test document generation
    sale_deed_id = test_sale_deed_generation()
    print()
    
    nda_id = test_nda_generation()
    print()
    
    exit_doc_id = test_exit_document_generation()
    print()
    
    # Test document status and download
    if sale_deed_id:
        test_document_status(sale_deed_id)
        test_document_download(sale_deed_id)
    
    # Test list documents
    test_list_documents()
    
    # Test template functionality
    test_create_template()
    test_list_templates()
    
    # Test metrics
    test_metrics()
    
    print("✅ All tests completed!")

if __name__ == "__main__":
    main()