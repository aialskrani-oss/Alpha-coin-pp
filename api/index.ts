import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import crypto from 'crypto';

// Read Firebase Config file if it exists, otherwise fall back to environment variables
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};

if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error('Error parsing firebase-applet-config.json', e);
  }
}

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const databaseId = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

// Initialize Firebase Admin in serverless environment
if (!admin.apps.length) {
  // If the user has a full service account credentials stored as environment variable, parse it
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    } catch (err) {
      console.error('Failed to initialize Firebase with Service Account. Using fallback ADC.', err);
      admin.initializeApp({ projectId: projectId });
    }
  } else {
    admin.initializeApp({
      projectId: projectId,
    });
  }
}

// Select the database
const dbAdmin = admin.firestore(databaseId);

const app = express();
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware to authenticate user with JWT in Authorization Header
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

// Ensure databaseId is initialized
app.use((req, res, next) => {
  if (!projectId) {
    return res.status(500).json({ 
      error: 'Firebase database is not configured. Please set FIREBASE_PROJECT_ID and FIREBASE_DATABASE_ID in Vercel settings.' 
    });
  }
  next();
});

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: 'Vercel Serverless', time: new Date().toISOString() });
});

// Fetch/Create User Profile (And welcome gifts)
app.post('/api/verify-profile', authenticateUser, async (req: Request, res: Response) => {
  const decodedUser = (req as any).user;
  const uid = decodedUser.uid;
  const email = decodedUser.email || '';
  const name = decodedUser.name || decodedUser.email?.split('@')[0] || 'Alpha User';
  const avatarUrl = decodedUser.picture || '';

  try {
    const profileRef = dbAdmin.collection('profiles').doc(uid);
    const balanceRef = dbAdmin.collection('balances').doc(uid);
    
    const profileSnap = await profileRef.get();
    
    if (!profileSnap.exists) {
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

      await dbAdmin.runTransaction(async (transaction) => {
        transaction.set(profileRef, newProfile);
        
        transaction.set(balanceRef, {
          userId: uid,
          amount: 100,
        });

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

      return res.json({
        id: uid,
        email,
        name,
        avatarUrl,
        apiKey,
        balance: 100
      });
    } else {
      const profileData = profileSnap.data();
      const balanceSnap = await balanceRef.get();
      let balanceAmt = 100;

      if (balanceSnap.exists) {
        balanceAmt = balanceSnap.data()?.amount ?? 100;
      } else {
        await balanceRef.set({ userId: uid, amount: 100 });
      }

      return res.json({
        ...profileData,
        balance: balanceAmt
      });
    }
  } catch (error: any) {
    console.error('Error verifying profile serverless:', error);
    res.status(500).json({ error: 'Internal database error during profile validation' });
  }
});

// Direct peer-to-peer Transfer Coins
app.post('/api/transfer', authenticateUser, async (req: Request, res: Response) => {
  const decodedUser = (req as any).user;
  const fromUid = decodedUser.uid;
  const fromEmail = decodedUser.email || '';

  const { toEmail, amount, reason } = req.body;

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

      transaction.set(senderBalRef, { userId: fromUid, amount: senderNewBalance }, { merge: true });
      transaction.set(recipientBalRef, { userId: toUid, amount: recipientNewBalance }, { merge: true });

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
    console.error('Serverless Transfer failed:', error);
    res.status(400).json({ error: error.message || 'فشل إكمال عملية التحويل' });
  }
});

// GET query user balance by API Key
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
    console.error('API serverless get balance error:', error);
    res.status(500).json({ error: 'Internal database query execution error' });
  }
});

// POST deduct user points from external game hook/API Key validation
app.post('/api/deduct', async (req: Request, res: Response) => {
  const { api_key, amount, reason } = req.body;

  let apiKey = api_key;
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

      transaction.set(balanceRef, { userId, amount: finalBalance }, { merge: true });

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
    console.error('API serverless deduct balance error:', error);
    res.status(400).json({ error: error.message || 'Transaction could not be completed' });
  }
});

// Regenerate API keys
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
    console.error('Regenerate key serverless error:', error);
    res.status(500).json({ error: 'فشل تعديل الرمز البرمجي' });
  }
});

export default app;
