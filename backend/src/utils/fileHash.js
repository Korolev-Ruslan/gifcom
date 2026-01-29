import crypto from 'crypto';
import fs from 'fs';

export async function computeFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function computeBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function findGifByHash(hash, userId, pool) {
  const result = await pool.query(
    'SELECT * FROM gifs WHERE file_hash = $1 AND user_id = $2',
    [hash, userId]
  );
  return result.rows[0] || null;
}

export async function getUserGifCount(userId, pool) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM gifs WHERE user_id = $1',
    [userId]
  );
  return parseInt(result.rows[0]?.count || 0);
}

