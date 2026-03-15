require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function testFirebase() {
  console.log('=' .repeat(60));
  console.log('🔍 TESTING SUPABASE CONNECTION');
  console.log('=' .repeat(60));

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  console.log('Project ID:', projectId);

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase credentials in .env.local');
    console.log('\nPlease add these to your .env.local:');
    console.log('FIREBASE_PROJECT_ID=your-project-id');
    console.log('FIREBASE_CLIENT_EMAIL=your-service-account-email');
    return;
  }

  try {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    
    const db = getFirestore();
    const snapshot = await db.collection('insurance_companies').limit(1).get();

    if (error) {
      console.error('❌ Connection failed:', error.message);
      
      if (error.message.includes('Invalid API key')) {
        console.log('\n🔑 Your API key is invalid. Please check:');
        console.log('1. Go to Supabase Dashboard → Project Settings → API');
        console.log('2. Copy the correct anon/public key');
      }
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log('Available buckets:', buckets.map(b => b.name).join(', '));
      
      // Check if required buckets exist
      const requiredBuckets = ['medical-bills', 'room-photos'];
      const missingBuckets = requiredBuckets.filter(
        b => !buckets.some(bucket => bucket.name === b)
      );
      
      if (missingBuckets.length > 0) {
        console.log('\n⚠️ Missing required buckets:', missingBuckets.join(', '));
        console.log('Please create these buckets in your Supabase dashboard:');
        console.log('1. Go to Storage → Create bucket');
        console.log('2. Create "medical-bills" bucket (public)');
        console.log('3. Create "room-photos" bucket (public)');
      } else {
        console.log('✅ All required buckets exist!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSupabase();
