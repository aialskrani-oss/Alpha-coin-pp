import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

// ES Module pathname definitions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase configurations
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
} else {
  console.warn('firebase-applet-config.json not found! Firebase Admin might not function correctly.');
}

// Initialize Firebase Admin (ADC resolves locally or Cloud Service accounts)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

// Select the database specifically
const dbAdmin = admin.firestore(firebaseConfig.firestoreDatabaseId);

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for API requests since bots or standard clients can query it from external sites
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to authenticate user from standard Authorization Bearer Token
async function authenticateUser(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    console.error('ID Token Verification failed:', err.message);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Fetch or Create User Profile & Welcome Balance
app.post('/api/verify-profile', authenticateUser, async (req: Request, res: Response) => {
  const decodedUser = (req as any).user;
  const uid = decodedUser.uid;
  const email = decodedUser.email || '';
  const name = decodedUser.name || decodedUser.email?.split('@')[0] || 'Alpha User';
  const avatarUrl = decodedUser.picture || '';

  try {
    const profileRef = dbAdmin.collection('profiles').doc(uid);
    const balanceRef = dbAdmin.collection('balances').doc(uid);
    
    // Check if profile exists
    const profileSnap = await profileRef.get();
    
    if (!profileSnap.exists) {
      // Create new API Key for user: AV-xxxxxxxxxxxxxxxx (alphanumeric string)
      const randomKey = crypto.randomBytes(12).toString('hex');
      const apiKey = `AV-${randomKey}`;
      
      const newProfile = {
        id: uid,
        email,
        name,
        avatarUrl,
        apiKey,
        createdAt: new Date().toISOString(),
      };

      // Perform transaction to set up profile, 100 AlphaCoin welcome balance, and write transaction log
      await dbAdmin.runTransaction(async (transaction) => {
        // Set profile
        transaction.set(profileRef, newProfile);
        
        // Set balance with 100 coins welcome gift
        transaction.set(balanceRef, {
          userId: uid,
          amount: 100,
        });

        // Add transaction log
        const txRef = dbAdmin.collection('transactions').doc();
        transaction.set(txRef, {
          fromUserId: null,
          toUserId: uid,
          fromEmail: 'Alpha Platform',
          toEmail: email,
          amount: 100,
          reason: 'هديّة ترحيبية من المنصة 🚀',
          createdAt: new Date().toISOString(),
        });
      });

      console.log(`Successfully registered new user: ${email}`);
      return res.json({
        id: uid,
        email,
        name,
        avatarUrl,
        apiKey,
        balance: 100
      });
    } else {
      // User exists, fetch balance as well
      const profileData = profileSnap.data();
      const balanceSnap = await balanceRef.get();
      let balanceAmt = 100;

      if (balanceSnap.exists) {
        balanceAmt = balanceSnap.data()?.amount ?? 100;
      } else {
        // Safe check if balance doesn't exist yet, seed it
        await balanceRef.set({ userId: uid, amount: 100 });
      }

      return res.json({
        ...profileData,
        balance: balanceAmt
      });
    }
  } catch (error: any) {
    console.error('Error verifying/creating profile:', error);
    res.status(500).json({ error: 'Internal database error during profile validation' });
  }
});

// 3. SECURE ENDPOINT: Transfer Coins to another user (via Client Input)
app.post('/api/transfer', authenticateUser, async (req: Request, res: Response) => {
  const decodedUser = (req as any).user;
  const fromUid = decodedUser.uid;
  const fromEmail = decodedUser.email || '';

  const { toEmail, amount, reason } = req.body;

  // Validate request parameters
  if (!toEmail || typeof toEmail !== 'string') {
    return res.status(400).json({ error: 'عنصر البريد الإلكتروني للمستلم مطلوب' });
  }
  const coins = parseInt(amount, 10);
  if (isNaN(coins) || coins <= 0) {
    return res.status(400).json({ error: 'يجب أن يكون مبلغ التحويل رقماً صحيحاً موجباً' });
  }
  const transferReason = (reason && typeof reason === 'string') ? reason.trim() : 'نشاط شخصي';

  if (fromEmail.toLowerCase() === toEmail.trim().toLowerCase()) {
    return res.status(400).json({ error: 'لا يمكنك تحويل عملات AlphaCoin إلى حسابك الشخصي!' });
  }

  try {
    // 1. Lookup destination user via email
    const recipientQuery = await dbAdmin.collection('profiles')
      .where('email', '==', toEmail.trim().toLowerCase())
      .limit(1)
      .get();

    if (recipientQuery.empty) {
      return res.status(404).json({ error: 'الحساب البريدي للمستلم غير مسجل في Alpha Vault' });
    }

    const recipientDoc = recipientQuery.docs[0];
    const toUid = recipientDoc.id;
    const recipientData = recipientDoc.data();

    const senderProfileRef = dbAdmin.collection('profiles').doc(fromUid);
    const senderProfileSnap = await senderProfileRef.get();
    if (!senderProfileSnap.exists) {
      return res.status(404).json({ error: 'ملف المرسل غير مسجل' });
    }
    const senderData = senderProfileSnap.data();

    // 2. Transact: check sender funds, decrement sender, increment receiver, log tx
    const senderBalRef = dbAdmin.collection('balances').doc(fromUid);
    const recipientBalRef = dbAdmin.collection('balances').doc(toUid);

    let senderNewBalance = 0;

    await dbAdmin.runTransaction(async (transaction) => {
      const senderBalSnap = await transaction.get(senderBalRef);
      const recipientBalSnap = await transaction.get(recipientBalRef);

      const senderAmt = senderBalSnap.exists ? (senderBalSnap.data()?.amount || 0) : 100;
      const recipientAmt = recipientBalSnap.exists ? (recipientBalSnap.data()?.amount || 0) : 100;

      if (senderAmt < coins) {
        throw new Error('رصيدكم الحالي غير كافٍ لإتمام هذه المعاملة');
      }

      senderNewBalance = senderAmt - coins;
      const recipientNewBalance = recipientAmt + coins;

      // Update balances
      transaction.set(senderBalRef, { userId: fromUid, amount: senderNewBalance }, { merge: true });
      transaction.set(recipientBalRef, { userId: toUid, amount: recipientNewBalance }, { merge: true });

      // Add transaction ledger log
      const txRef = dbAdmin.collection('transactions').doc();
      transaction.set(txRef, {
        fromUserId: fromUid,
        toUserId: toUid,
        fromEmail: senderData?.email || fromEmail,
        toEmail: recipientData?.email || toEmail,
        amount: coins,
        reason: transferReason,
        createdAt: new Date().toISOString(),
      });
    });

    return res.json({
      success: true,
      message: 'تم التحويل بنجاح! 💸',
      newBalance: senderNewBalance,
    });

  } catch (error: any) {
    console.error('Transfer failed:', error);
    res.status(400).json({ error: error.message || 'فشل إكمال عملية التحويل' });
  }
});

// 4. GET: Balance checking via API key (Telegram Bot / External App endpoint)
// Accepts api_key in query URL /api/get-balance?api_key=... OR header X-API-Key
app.get('/api/get-balance', async (req: Request, res: Response) => {
  let apiKey = req.query.api_key as string;
  const headerKey = req.headers['x-api-key'] as string;
  
  if (!apiKey && headerKey) {
    apiKey = headerKey;
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing api_key parameter or X-API-Key header' });
  }

  try {
    const profileQuery = await dbAdmin.collection('profiles')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      return res.status(401).json({ error: 'Invalid API Key supplied' });
    }

    const userDoc = profileQuery.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    const balanceSnap = await dbAdmin.collection('balances').doc(userId).get();
    const balanceAmt = balanceSnap.exists ? (balanceSnap.data()?.amount ?? 0) : 100;

    return res.json({
      owner: userData.name,
      email: userData.email,
      alphaCoin: balanceAmt
    });
  } catch (error: any) {
    console.error('API get balance error:', error);
    res.status(500).json({ error: 'Internal database query execution error' });
  }
});

// 5. POST: Deduct Balance via API key (Game / Bot payment completion)
app.post('/api/deduct', async (req: Request, res: Response) => {
  const { api_key, amount, reason } = req.body;

  let apiKey = api_key;
  // Fallback to X-API-Key header if body parameter is missing
  if (!apiKey && req.headers['x-api-key']) {
    apiKey = req.headers['x-api-key'] as string;
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing api_key parameter or X-API-Key header' });
  }

  const coins = parseInt(amount, 10);
  if (isNaN(coins) || coins <= 0) {
    return res.status(400).json({ error: 'Target deduct amount must be a positive integer value' });
  }

  const deductReason = (reason && typeof reason === 'string') ? reason.trim() : 'شراء داخل اللعبة / خدمة خارجية';

  try {
    const profileQuery = await dbAdmin.collection('profiles')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      return res.status(401).json({ error: 'Invalid API Key supplied' });
    }

    const userDoc = profileQuery.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    const balanceRef = dbAdmin.collection('balances').doc(userId);
    let finalBalance = 0;
    let transactionId = '';

    await dbAdmin.runTransaction(async (transaction) => {
      const balanceSnap = await transaction.get(balanceRef);
      const currentAmt = balanceSnap.exists ? (balanceSnap.data()?.amount ?? 0) : 100;

      if (currentAmt < coins) {
        throw new Error('Insufficient AlphaCoin balance for this integration call');
      }

      finalBalance = currentAmt - coins;

      // Decrement the balance
      transaction.set(balanceRef, { userId, amount: finalBalance }, { merge: true });

      // Add a ledger entry
      const txRef = dbAdmin.collection('transactions').doc();
      transactionId = txRef.id;
      transaction.set(txRef, {
        fromUserId: userId,
        toUserId: 'system_external_bot',
        fromEmail: userData.email,
        toEmail: 'Alpha Platform API Client',
        amount: coins,
        reason: deductReason,
        createdAt: new Date().toISOString(),
      });
    });

    return res.json({
      success: true,
      message: 'Tokens deducted successfully',
      deducted: coins,
      newBalance: finalBalance,
      transactionId
    });

  } catch (error: any) {
    console.error('API deduct balance error:', error);
    res.status(400).json({ error: error.message || 'Transaction could not be completed' });
  }
});

// 6. POST: Regenerate API Key
app.post('/api/regenerate-key', authenticateUser, async (req: Request, res: Response) => {
  const decodedUser = (req as any).user;
  const uid = decodedUser.uid;

  try {
    const profileRef = dbAdmin.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return res.status(404).json({ error: 'ملفك الشخصي غير مسجل' });
    }

    const newRandomKey = crypto.randomBytes(12).toString('hex');
    const newApiKey = `AV-${newRandomKey}`;

    await profileRef.set({ apiKey: newApiKey }, { merge: true });

    return res.json({
      success: true,
      apiKey: newApiKey
    });
  } catch (error: any) {
    console.error('Regenerate key error:', error);
    res.status(500).json({ error: 'فشل تعديل الرمز البرمجي' });
  }
});


// ----------------------------------------------------
// FRONTEND STATIC ROOT/DEVELOPMENT MIDDLEWARE
// ----------------------------------------------------

async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running transparently on http://0.0.0.0:${PORT}`);
  });
}

setupFrontend();
