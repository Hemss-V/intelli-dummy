const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../db/index');

const KEY_PATH = path.join(__dirname, '../config/lender.key');

// Ensure config dir exists
const configDir = path.join(__dirname, '../config');
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
}

// Load or Generate Lender Keypair
let privateKey, publicKey;

function loadKeys() {
    if (fs.existsSync(KEY_PATH)) {
        const keyData = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
        privateKey = crypto.createPrivateKey({
            key: Buffer.from(keyData.privateKey, 'hex'),
            format: 'der',
            type: 'pkcs8'
        });
        publicKey = crypto.createPublicKey({
            key: Buffer.from(keyData.publicKey, 'hex'),
            format: 'der',
            type: 'spki'
        });
    } else {
        const { privateKey: pk, publicKey: pubk } = crypto.generateKeyPairSync('ed25519');
        privateKey = pk;
        publicKey = pubk;

        fs.writeFileSync(KEY_PATH, JSON.stringify({
            privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex'),
            publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('hex')
        }));
        console.log("New Ed25519 Issuer Keypair generated and saved to config/lender.key");
    }
}

// Initialize keys
loadKeys();

function generateDID(companyId) {
    return `did:sherlock:company:${companyId}`;
}

function issueVC(companyId, did, companyName) {
    const payload = {
        issuanceDate: new Date().toISOString(),
        issuer: 'did:sherlock:lender:system',
        credentialSubject: {
            id: did,
            companyId: companyId,
            name: companyName,
            status: 'VERIFIED'
        }
    };

    const payloadString = JSON.stringify(payload);

    // Sign payload
    const signature = crypto.sign(null, Buffer.from(payloadString), privateKey).toString('hex');

    return {
        ...payload,
        proof: {
            type: 'Ed25519Signature2020',
            created: new Date().toISOString(),
            verificationMethod: 'did:sherlock:lender:system#keys-1',
            proofPurpose: 'assertionMethod',
            proofValue: signature
        }
    };
}

function verifyVC(vc) {
    if (!vc || !vc.proof || !vc.proof.proofValue) return false;

    // Extract payload without proof
    const { proof, ...payload } = vc;
    const payloadString = JSON.stringify(payload);

    const isVerified = crypto.verify(
        null,
        Buffer.from(payloadString),
        publicKey,
        Buffer.from(proof.proofValue, 'hex')
    );

    return isVerified;
}

async function onboardSupplier(companyId) {
    // Fetch company info
    const compQuery = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
    if (compQuery.rows.length === 0) throw new Error("Company not found");

    const company = compQuery.rows[0];
    const did = generateDID(companyId);
    const vc = issueVC(companyId, did, company.name);

    // Update DB
    await pool.query(
        'UPDATE companies SET did = $1, verifiable_credential = $2, credential_verified = true WHERE id = $3',
        [did, JSON.stringify(vc), companyId]
    );

    return { did, vc };
}

async function revokeCredential(companyId) {
    await pool.query('UPDATE companies SET is_revoked = true, credential_verified = false WHERE id = $1', [companyId]);
}

/**
 * Verifies stored VC signature on every invoice submission (shell-company blocker).
 */
async function assertSupplierCredentialValid(supplierId) {
    const compQuery = await pool.query(
        'SELECT id, verifiable_credential, credential_verified, is_revoked FROM companies WHERE id = $1',
        [supplierId]
    );
    if (compQuery.rows.length === 0) {
        return { ok: false, reason: 'Supplier not found' };
    }
    const row = compQuery.rows[0];
    if (row.is_revoked) {
        return { ok: false, reason: 'Credential revoked — invoice processing blocked' };
    }
    if (!row.verifiable_credential) {
        return { ok: false, reason: 'No Verifiable Credential on file — supplier must onboard first' };
    }
    let vc;
    try {
        vc = typeof row.verifiable_credential === 'string' ? JSON.parse(row.verifiable_credential) : row.verifiable_credential;
    } catch {
        return { ok: false, reason: 'Invalid Verifiable Credential payload' };
    }
    if (!verifyVC(vc)) {
        return { ok: false, reason: 'Verifiable Credential signature verification failed' };
    }
    const expectedDid = generateDID(supplierId);
    if (vc.credentialSubject?.id !== expectedDid) {
        return { ok: false, reason: 'VC subject DID does not match supplier' };
    }
    if (!row.credential_verified) {
        await pool.query('UPDATE companies SET credential_verified = true WHERE id = $1', [supplierId]);
    }
    return { ok: true };
}

module.exports = {
    generateDID,
    issueVC,
    verifyVC,
    onboardSupplier,
    revokeCredential,
    assertSupplierCredentialValid
};
