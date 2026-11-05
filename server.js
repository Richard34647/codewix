const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Groq } = require('groq-sdk');
const path = require('path');
const nodemailer = require('nodemailer'); // If you use email verification

// 1. INITIALIZE FIREBASE ADMIN
// Put your firebase service account key file in the same folder as this server.js
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Important for large projects / images

const ADMIN_EMAIL = 'wilcoxr889@gmail.com';

// 2. AUTH MIDDLEWARE
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// ======================================================================
// ADMIN ROUTES (Protected by Admin Check)
// ======================================================================
app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Note: Listing all users is fine, but counting premium users requires checking Firestore if you store premium status there
    const listUsersResult = await admin.auth().listUsers();
    const totalUsers = listUsersResult.users.length;
    const premiumUsers = listUsersResult.users.filter(u => u.customClaims?.premium).length;

    const projectsSnap = await db.collection('published').get();
    
    res.json({ 
      totalUsers, 
      premiumUsers, 
      totalProjects: projectsSnap.size, 
      totalLessons: 15 // Hardcoded based on your LESSONS array
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000); // Max 1000
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email || 'No Email',
      displayName: user.displayName || 'Anonymous',
      joined: new Date(user.metadata.creationTime).toLocaleDateString(),
      premium: user.customClaims?.premium || false
    }));
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/projects', verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('published').orderBy('updatedAt', 'desc').get();
    const projects = snap.docs.map(doc => ({ slug: doc.id, ...doc.data() }));
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/analytics', verifyToken, requireAdmin, async (req, res) => {
  // Implement your analytics logic here if needed
  res.json({ totalTokensToday: 0, topConsumers: [] });
});

app.post('/api/admin/update-user', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { uid, action } = req.body;
    
    if (action === 'delete') {
      await admin.auth().deleteUser(uid);
      return res.json({ success: true, message: 'User deleted' });
    }
    
    if (action === 'toggle-premium') {
      const user = await admin.auth().getUser(uid);
      const isPremium = user.customClaims?.premium || false;
      await admin.auth().setCustomUserClaims(uid, { premium: !isPremium });
      return res.json({ success: true, message: 'Premium status toggled' });
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/projects/:slug', verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.collection('published').doc(req.params.slug).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ======================================================================
// USER ROUTES (For regular frontend features)
// ======================================================================

app.post('/api/publish', verifyToken, async (req, res) => {
  try {
    const { slug, projectName, description, files } = req.body;
    
    // Check if slug exists
    const docRef = db.collection('published').doc(slug);
    const doc = await docRef.get();
    if (doc.exists && doc.data().uid !== req.user.uid) {
      return res.status(400).json({ error: 'Slug already taken.' });
    }

    await docRef.set({
      uid: req.user.uid,
      projectName,
      description,
      files,
      views: doc.exists ? doc.data().views : 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-published', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('published').where('uid', '==', req.user.uid).get();
    const sites = snap.docs.map(doc => ({ slug: doc.id, ...doc.data() }));
    res.json({ sites });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/explore', async (req, res) => {
  try {
    const snap = await db.collection('published').orderBy('updatedAt', 'desc').limit(20).get();
    const sites = snap.docs.map(doc => ({ slug: doc.id, ...doc.data() }));
    res.json({ sites });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
