# 🤖 AI Services Setup Guide

This guide will help you configure OpenAI and Pinecone API keys for the AI-powered features in MSMEBazaar.

## 🔑 Required API Keys

### 1. OpenAI API Key
**Used for:** Business valuation, smart assistant, document analysis, and chat features.

**How to get it:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)

**Cost:** Pay-per-use pricing
- GPT-4: ~$0.03-0.06 per 1K tokens
- GPT-3.5-turbo: ~$0.001-0.002 per 1K tokens
- Embeddings: ~$0.0001 per 1K tokens

### 2. Pinecone API Key
**Used for:** Vector database for semantic search, business matching, and knowledge base.

**How to get it:**
1. Go to [Pinecone](https://www.pinecone.io/)
2. Sign up for a free account
3. Go to **API Keys** in the dashboard
4. Copy your API key
5. Note your **Environment** (e.g., `us-east1-gcp`, `us-west1-gcp`)

**Cost:** Free tier includes:
- 1 project
- 1 index
- Up to 1M vectors (1536 dimensions)
- Up to 5MB metadata storage

## 🚀 Quick Setup

### Option 1: Create .env file (Recommended)
```bash
# Copy the example file
cp .env.example .env

# Edit the file with your API keys
nano .env
```

### Option 2: Use the automated setup script below

## 🔧 Environment Variables to Configure

Add these to your `.env` file:

```env
# ================================
# 🤖 AI & ML SERVICES
# ================================
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-optional

# Vector Database
PINECONE_API_KEY=your-actual-pinecone-api-key-here
PINECONE_ENVIRONMENT=us-east1-gcp
PINECONE_INDEX_NAME=msmebazaar-vectors
```

## 🎯 Features Enabled by AI Configuration

### With OpenAI API Key:
✅ **Smart Business Valuation** - AI-powered MSME valuation  
✅ **Intelligent Matchmaking** - Buyer-seller matching  
✅ **Smart Assistant** - 24/7 AI customer support  
✅ **Document Analysis** - Automated document processing  
✅ **Natural Language Search** - Semantic business search  

### With Pinecone API Key:
✅ **Vector Search** - Fast semantic search across businesses  
✅ **Knowledge Base** - AI-powered FAQ and help system  
✅ **Recommendation Engine** - Personalized business recommendations  
✅ **Similarity Matching** - Find similar businesses and opportunities  

## 🔒 Security Best Practices

1. **Never commit API keys to version control**
2. **Use different keys for development/production**
3. **Set up API key rotation policies**
4. **Monitor API usage and costs**
5. **Use environment-specific configurations**

## 🧪 Testing Your Configuration

After setting up the keys, test with:

```bash
# Test the configuration
npm run test:ai

# Or start the server and check logs
npm start
```

Look for these success messages:
```
✅ OpenAI API connection established
✅ Pinecone vector database initialized
✅ Knowledge base loaded successfully
```

## 🚨 Troubleshooting

### Common Issues:

1. **"OpenAI API key not found"**
   - Check your `.env` file has `OPENAI_API_KEY=sk-...`
   - Restart your server after adding the key

2. **"Pinecone connection failed"**
   - Verify your `PINECONE_API_KEY` is correct
   - Check your `PINECONE_ENVIRONMENT` matches your Pinecone dashboard
   - Ensure your index name exists in Pinecone

3. **"Vector search disabled"**
   - This is normal if API keys are missing
   - The app will work without AI features
   - Add keys to enable full functionality

## 💡 Development vs Production

### Development Setup:
```env
# Use lower-cost models for development
OPENAI_MODEL=gpt-3.5-turbo
PINECONE_INDEX_NAME=msmebazaar-dev
```

### Production Setup:
```env
# Use production-grade models
OPENAI_MODEL=gpt-4-turbo-preview
PINECONE_INDEX_NAME=msmebazaar-prod
```

## 📊 Monitoring & Costs

### OpenAI Usage Monitoring:
- Check usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- Set up billing alerts
- Monitor token consumption

### Pinecone Usage Monitoring:
- Monitor vector count in Pinecone dashboard
- Track query volume
- Watch for approaching limits

## 🎉 Next Steps

After configuration:
1. Restart your application
2. Test AI features in the dashboard
3. Monitor logs for any errors
4. Set up monitoring and alerts
5. Consider implementing usage limits

---

**Need help?** Check the troubleshooting section or contact support.