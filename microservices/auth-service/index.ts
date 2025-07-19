// Authentication microservice
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serverMemoryManager } from '../shared/memory-management';

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory user store for demonstration
const users = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'auth', status: 'healthy', timestamp: new Date().toISOString() });
});

// User registration
app.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      createdAt: new Date().toISOString(),
    };

    users.set(email, user);

    const token = jwt.sign(
      { userId: user.id, email, role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' },
    );

    res.json({
      user: { ...user, password: undefined },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.get(email);

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' },
    );

    res.json({
      user: { ...user, password: undefined },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
app.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const user = Array.from(users.values()).find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ...user, password: undefined });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🔐 Auth service running on port ${PORT}`);
  });
}

export default app;
