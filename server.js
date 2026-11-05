const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // For large code files/images

// ======================================================================
// FIREBASE ADMIN INITIALIZATION
// ======================================================================
// If using Render, set FIREBASE_SERVICE_ACCOUNT in environment variables.
// For local testing, you can uncomment the serviceAccountKey.json line.
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error.message);
}

const db = admin.firestore();
const ADMIN_EMAIL = 'wilcoxr889@gmail.com';

// ======================================================================
// AUTH MIDDLEWARE
// ======================================================================
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
// ADMIN ROUTES
// ======================================================================
app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers();
    const totalUsers = listUsersResult.users.length;
    const premiumUsers = listUsersResult.users.filter(u => u.customClaims?.premium).length;

    const projectsSnap = await db.collection('published').get();
    
    res.json({ 
      totalUsers, 
      premiumUsers, 
      totalProjects: projectsSnap.size, 
      totalLessons: 15 // Matches frontend
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
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
  res.json({ totalTokensToday: 0, topConsumers: [] });
});

app.post('/api/admin/update-user', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { uid, action } = req.body;
    
    if (action === 'delete') {
      await admin.auth().deleteUser(uid);
      return res.json({ success: true });
    }
    
    if (action === 'toggle-premium') {
      const user = await admin.auth().getUser(uid);
      const isPremium = user.customClaims?.premium || false;
      await admin.auth().setCustomUserClaims(uid, { premium: !isPremium });
      return res.json({ success: true });
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
// USER ROUTES
// ======================================================================
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

app.post('/api/publish', verifyToken, async (req, res) => {
  try {
    const { slug, projectName, description, files } = req.body;
    
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

app.post('/api/unpublish', verifyToken, async (req, res) => {
  try {
    const { slug } = req.body;
    const docRef = db.collection('published').doc(slug);
    const doc = await docRef.get();
    
    if (doc.exists && doc.data().uid === req.user.uid) {
      await docRef.delete();
      return res.json({ success: true });
    }
    res.status(403).json({ error: 'Unauthorized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/published/:slug', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('published').doc(req.params.slug).get();
    if (!doc.exists) return res.status(404).json({ error: 'Site not found' });
    if (doc.data().uid !== req.user.uid && req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json({ site: { slug: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/published/:slug', verifyToken, async (req, res) => {
  try {
    const { files } = req.body;
    const docRef = db.collection('published').doc(req.params.slug);
    const doc = await docRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: 'Site not found' });
    if (doc.data().uid !== req.user.uid && req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await docRef.update({ files, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ======================================================================
// START SERVER
// ======================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
