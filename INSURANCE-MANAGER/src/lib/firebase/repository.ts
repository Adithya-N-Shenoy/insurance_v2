import { FieldPath } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getBucket, getDb } from './admin';

function db() {
  return getDb();
}

const COLLECTIONS = {
  // Existing collections
  agents: 'agents',
  claimItems: 'claim_items',
  claimStatusHistory: 'claim_status_history',
  claims: 'claims',
  companies: 'insurance_companies',
  documentRequests: 'document_requests',
  notifications: 'notifications',
  reviewNotes: 'review_notes',
  // New collections
  hospitals: 'hospitals',
  hospital_users: 'hospital_users',
  agent_users: 'agent_users',
  patient_users: 'patient_users',
} as const;

const DEFAULT_COMPANIES = [
  { name: 'ICICI Lombard', code: 'ICICI' },
  { name: 'HDFC ERGO', code: 'HDFC' },
  { name: 'Star Health Insurance', code: 'STAR' },
  { name: 'Care Health Insurance', code: 'CARE' },
  { name: 'Max Bupa Health Insurance', code: 'MAX' },
  { name: 'Bajaj Allianz', code: 'BAJAJ' },
  { name: 'Niva Bupa', code: 'NIVA' },
  { name: 'PolicyBazaar', code: 'POLICY' },
  { name: 'Acko General Insurance', code: 'ACKO' },
  { name: 'Digit Insurance', code: 'DIGIT' },
];

function now() {
  return new Date().toISOString();
}

function sortByCreatedAtDesc<T extends { created_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

function sortByCreatedAtAsc<T extends { created_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function listCollection<T>(name: string): Promise<T[]> {
  const snapshot = await db().collection(name).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[];
}

// ============= INSURANCE COMPANIES =============

export async function ensureSeededCompanies() {
  const snapshot = await db().collection(COLLECTIONS.companies).limit(1).get();
  if (!snapshot.empty) {
    return;
  }

  const batch = db().batch();
  const createdAt = now();

  DEFAULT_COMPANIES.forEach((company) => {
    const id = uuidv4();
    const ref = db().collection(COLLECTIONS.companies).doc(id);
    batch.set(ref, {
      id,
      name: company.name,
      code: company.code,
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    });
  });

  await batch.commit();
}

export async function listCompanies() {
  await ensureSeededCompanies();
  const companies = await listCollection<any>(COLLECTIONS.companies);
  return [...companies].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function getCompanyById(companyId: string) {
  const doc = await db().collection(COLLECTIONS.companies).doc(companyId).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as any) : null;
}

export async function findCompanyByIdentifier(identifier: string) {
  const companies = await listCompanies();
  const normalized = identifier.trim().toLowerCase();

  return (
    companies.find((company) => company.id === identifier) ||
    companies.find((company) => (company.code || '').toLowerCase() === normalized) ||
    companies.find((company) => (company.name || '').toLowerCase().includes(normalized)) ||
    null
  );
}

// ============= HOSPITAL FUNCTIONS =============

export interface Hospital {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  registration_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function createHospital(data: Omit<Hospital, 'id' | 'created_at' | 'updated_at'>) {
  const id = uuidv4();
  const timestamp = now();
  const hospital = {
    id,
    ...data,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  await db().collection(COLLECTIONS.hospitals).doc(id).set(hospital);
  return hospital;
}

export async function listHospitals() {
  const snapshot = await db().collection(COLLECTIONS.hospitals)
    .where('is_active', '==', true)
    .orderBy('name')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Hospital[];
}

export async function getHospitalById(id: string) {
  const doc = await db().collection(COLLECTIONS.hospitals).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as Hospital) : null;
}

// ============= HOSPITAL USER FUNCTIONS =============

export interface HospitalUser {
  id?: string;
  hospital_id?: string; // Reference to hospital
  hospital_name?: string; // Denormalized for quick access
  email: string;
  phone: string;
  password_hash?: string; // We'll store hashed passwords
  name: string;
  designation: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export async function createHospitalUser(data: Omit<HospitalUser, 'id' | 'created_at' | 'updated_at'>) {
  const id = uuidv4();
  const timestamp = now();
  const user = {
    id,
    ...data,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  await db().collection(COLLECTIONS.hospital_users).doc(id).set(user);
  return user;
}

export async function findHospitalUserByEmail(email: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.hospital_users)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as HospitalUser;
}

export async function findHospitalUserByPhone(phone: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.hospital_users)
    .where('phone', '==', phone)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as HospitalUser;
}

export async function updateHospitalUser(userId: string, data: Partial<HospitalUser>) {
  const updateData = {
    ...data,
    updated_at: now(),
  };
  await db().collection(COLLECTIONS.hospital_users).doc(userId).set(updateData, { merge: true });
  return getHospitalUserById(userId);
}

export async function getHospitalUserById(userId: string) {
  const doc = await db().collection(COLLECTIONS.hospital_users).doc(userId).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as HospitalUser) : null;
}

// ============= AGENT USER FUNCTIONS =============

export interface AgentUser {
  id?: string;
  company_id?: string; // Reference to insurance company
  company_name?: string; // Denormalized for quick access
  company_code?: string;
  email: string;
  phone: string;
  password_hash?: string;
  name: string;
  designation?: string;
  license_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export async function createAgentUser(data: Omit<AgentUser, 'id' | 'created_at' | 'updated_at'>) {
  const id = uuidv4();
  const timestamp = now();
  const user = {
    id,
    ...data,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  await db().collection(COLLECTIONS.agent_users).doc(id).set(user);
  return user;
}

export async function findAgentUserByEmail(email: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.agent_users)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as AgentUser;
}

export async function findAgentUserByPhone(phone: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.agent_users)
    .where('phone', '==', phone)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as AgentUser;
}

export async function updateAgentUser(userId: string, data: Partial<AgentUser>) {
  const updateData = {
    ...data,
    updated_at: now(),
  };
  await db().collection(COLLECTIONS.agent_users).doc(userId).set(updateData, { merge: true });
  return getAgentUserById(userId);
}

export async function getAgentUserById(userId: string) {
  const doc = await db().collection(COLLECTIONS.agent_users).doc(userId).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as AgentUser) : null;
}

// ============= PATIENT USER FUNCTIONS =============

export interface PatientUser {
  id?: string;
  email: string;
  phone: string;
  password_hash?: string;
  name: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  policy_number?: string;
  insurance_company_id?: string;
  insurance_company_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export async function createPatientUser(data: Omit<PatientUser, 'id' | 'created_at' | 'updated_at'>) {
  const id = uuidv4();
  const timestamp = now();
  const user = {
    id,
    ...data,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  await db().collection(COLLECTIONS.patient_users).doc(id).set(user);
  return user;
}

export async function findPatientUserByEmail(email: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.patient_users)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as PatientUser;
}

export async function findPatientUserByPhone(phone: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.patient_users)
    .where('phone', '==', phone)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as PatientUser;
}

export async function findPatientUserByPolicyNumber(policyNumber: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.patient_users)
    .where('policy_number', '==', policyNumber)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as PatientUser;
}

export async function updatePatientUser(userId: string, data: Partial<PatientUser>) {
  const updateData = {
    ...data,
    updated_at: now(),
  };
  await db().collection(COLLECTIONS.patient_users).doc(userId).set(updateData, { merge: true });
  return getPatientUserById(userId);
}

export async function getPatientUserById(userId: string) {
  const doc = await db().collection(COLLECTIONS.patient_users).doc(userId).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as PatientUser) : null;
}

// ============= CLAIMS FUNCTIONS =============

export async function createClaim(data: Record<string, any>) {
  const id = uuidv4();
  const claim = { id, ...data };
  await db().collection(COLLECTIONS.claims).doc(id).set(claim);
  return claim;
}

export async function updateClaim(claimId: string, data: Record<string, any>) {
  await db().collection(COLLECTIONS.claims).doc(claimId).set(data, { merge: true });
  return getClaimById(claimId);
}

export async function getClaimById(claimId: string) {
  const doc = await db().collection(COLLECTIONS.claims).doc(claimId).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as any) : null;
}

export async function findClaimByIdentifier(identifier: string) {
  if (isUuid(identifier)) {
    return getClaimById(identifier);
  }

  const claims = await listCollection<any>(COLLECTIONS.claims);
  return claims.find((claim) => claim.claim_number === identifier) || null;
}

export async function listClaims() {
  const claims = await listCollection<any>(COLLECTIONS.claims);
  return sortByCreatedAtDesc(claims);
}

// ============= CLAIM ITEMS FUNCTIONS =============

export async function createClaimItems(items: Record<string, any>[]) {
  if (items.length === 0) {
    return [];
  }

  const batch = db().batch();
  const created = items.map((item) => {
    const id = item.id || uuidv4();
    const payload = { id, ...item };
    const ref = db().collection(COLLECTIONS.claimItems).doc(id);
    batch.set(ref, payload);
    return payload;
  });

  await batch.commit();
  return created;
}

export async function listClaimItemsByClaimId(claimId: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.claimItems)
    .where('claim_id', '==', claimId)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
}

export async function updateClaimItem(itemId: string, data: Record<string, any>) {
  await db().collection(COLLECTIONS.claimItems).doc(itemId).set(data, { merge: true });
}

// ============= CLAIM STATUS HISTORY FUNCTIONS =============

export async function createStatusHistory(entry: Record<string, any>) {
  const id = uuidv4();
  const payload = { id, ...entry };
  await db().collection(COLLECTIONS.claimStatusHistory).doc(id).set(payload);
  return payload;
}

export async function listStatusHistoryByClaimId(claimId: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.claimStatusHistory)
    .where('claim_id', '==', claimId)
    .get();

  return sortByCreatedAtDesc(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
  );
}

// ============= NOTIFICATIONS FUNCTIONS =============

export async function createNotification(entry: Record<string, any>) {
  const id = uuidv4();
  const payload = { id, created_at: now(), is_read: false, ...entry };
  await db().collection(COLLECTIONS.notifications).doc(id).set(payload);
  return payload;
}

// ============= AGENTS FUNCTIONS =============

export async function createOrUpdateAgentByEmail(data: {
  company_id?: string | null;
  email: string;
  name?: string | null;
  phone?: string | null;
}) {
  const snapshot = await db()
    .collection(COLLECTIONS.agents)
    .where('email', '==', data.email)
    .limit(1)
    .get();

  const updated_at = now();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const agent = { id: doc.id, ...doc.data() } as any;
    const merged = {
      ...agent,
      name: data.name || agent.name || null,
      phone: data.phone || agent.phone || null,
      company_id: data.company_id || agent.company_id || null,
      updated_at,
    };

    await doc.ref.set(merged, { merge: true });
    return merged;
  }

  const id = uuidv4();
  const payload = {
    id,
    company_id: data.company_id || null,
    name: data.name || null,
    email: data.email,
    phone: data.phone || null,
    is_active: true,
    created_at: updated_at,
    updated_at,
  };

  await db().collection(COLLECTIONS.agents).doc(id).set(payload);
  return payload;
}

export async function getAgentsByIds(agentIds: string[]) {
  const ids = Array.from(new Set(agentIds.filter(Boolean)));
  if (ids.length === 0) {
    return {};
  }

  const chunkSize = 10;
  const docs: any[] = [];

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const snapshot = await db()
      .collection(COLLECTIONS.agents)
      .where(FieldPath.documentId(), 'in', chunk)
      .get();

    docs.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }

  return docs.reduce<Record<string, any>>((acc, agent) => {
    acc[agent.id] = agent;
    return acc;
  }, {});
}

// ============= DOCUMENT REQUESTS FUNCTIONS =============

export async function createDocumentRequests(entries: Record<string, any>[]) {
  if (entries.length === 0) {
    return [];
  }

  const batch = db().batch();
  const created = entries.map((entry) => {
    const id = uuidv4();
    const payload = { id, ...entry };
    batch.set(db().collection(COLLECTIONS.documentRequests).doc(id), payload);
    return payload;
  });

  await batch.commit();
  return created;
}

export async function listDocumentRequestsByClaimId(claimId: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.documentRequests)
    .where('claim_id', '==', claimId)
    .get();

  return sortByCreatedAtDesc(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
  );
}

export async function getDocumentRequestForClaim(documentId: string, claimId: string) {
  const doc = await db().collection(COLLECTIONS.documentRequests).doc(documentId).get();
  if (!doc.exists) {
    return null;
  }

  const data = { id: doc.id, ...doc.data() } as any;
  return data.claim_id === claimId ? data : null;
}

export async function updateDocumentRequest(documentId: string, data: Record<string, any>) {
  await db().collection(COLLECTIONS.documentRequests).doc(documentId).set(data, { merge: true });
  return getDocumentRequest(documentId);
}

export async function getDocumentRequest(documentId: string) {
  const doc = await db().collection(COLLECTIONS.documentRequests).doc(documentId).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as any) : null;
}

// ============= REVIEW NOTES FUNCTIONS =============

export async function createReviewNote(entry: Record<string, any>) {
  const id = uuidv4();
  const payload = { id, ...entry };
  await db().collection(COLLECTIONS.reviewNotes).doc(id).set(payload);
  return payload;
}

export async function listReviewNotesByClaimId(claimId: string) {
  const snapshot = await db()
    .collection(COLLECTIONS.reviewNotes)
    .where('claim_id', '==', claimId)
    .get();

  return sortByCreatedAtDesc(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
  );
}

// ============= FILE UPLOAD FUNCTIONS =============

export async function uploadBuffer(params: {
  buffer: Buffer;
  contentType: string;
  destination: string;
}) {
  const bucket = getBucket();
  const file = bucket.file(params.destination);

  await file.save(params.buffer, {
    contentType: params.contentType,
    resumable: false,
    metadata: {
      contentType: params.contentType,
    },
  });

  const [publicUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '2500-01-01',
  });

  return {
    path: params.destination,
    publicUrl,
  };
}

// ============= HYDRATION FUNCTIONS =============

export async function hydrateClaim(claim: any) {
  const [company, claim_items, document_requests, review_notes, claim_status_history] =
    await Promise.all([
      getCompanyById(claim.company_id),
      listClaimItemsByClaimId(claim.id),
      listDocumentRequestsByClaimId(claim.id),
      listReviewNotesByClaimId(claim.id),
      listStatusHistoryByClaimId(claim.id),
    ]);

  const agentsById = await getAgentsByIds(review_notes.map((note) => note.agent_id));

  return {
    ...claim,
    insurance_companies: company,
    claim_items: sortByCreatedAtAsc(claim_items),
    document_requests,
    review_notes: review_notes.map((note) => ({
      ...note,
      agents: note.agent_id
        ? {
            name: agentsById[note.agent_id]?.name || null,
            email: agentsById[note.agent_id]?.email || null,
          }
        : null,
    })),
    claim_status_history,
  };
}

// ============= AUTH HELPER FUNCTIONS =============

// Simple hash function (in production, use bcrypt)
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const hashedInput = hashPassword(password);
  return hashedInput === hash;
}