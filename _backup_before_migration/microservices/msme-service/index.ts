// MSME Listings microservice
import express from 'express';
import cors from 'cors';
import { serverMemoryManager } from '../shared/memory-management';

const app = express();
const PORT = process.env.MSME_SERVICE_PORT || 3002;

app.use(cors());
app.use(express.json());

// In-memory listings store
const listings = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'msme', status: 'healthy', timestamp: new Date().toISOString() });
});

// Get all listings
app.get('/listings', async (req, res) => {
  try {
    const cachedListings = await serverMemoryManager.loadPage(
      'all-listings',
      () => Promise.resolve(Array.from(listings.values())),
      'high'
    );
    
    res.json(cachedListings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get listing by ID
app.get('/listings/:id', async (req, res) => {
  try {
    const listing = listings.get(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// Create new listing
app.post('/listings', async (req, res) => {
  try {
    const listing = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    listings.set(listing.id, listing);
    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// Update listing
app.put('/listings/:id', async (req, res) => {
  try {
    const listing = listings.get(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const updatedListing = {
      ...listing,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    listings.set(req.params.id, updatedListing);
    res.json(updatedListing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// Delete listing
app.delete('/listings/:id', async (req, res) => {
  try {
    const listing = listings.get(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    listings.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🏢 MSME service running on port ${PORT}`);
  });
}

export default app;