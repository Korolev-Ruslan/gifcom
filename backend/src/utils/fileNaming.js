import path from 'path';
import fs from 'fs';

const decodeMojibake = (str) => {
  try {
    const latin1Buffer = Buffer.from(str, 'latin1');
    const decoded = latin1Buffer.toString('utf8');
    if (/[а-яА-ЯёЁ]/.test(decoded)) {
      return decoded;
    }
  } catch (e) {
  }
  return str;
};

export const getNextGifNumber = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    return 1;
  }
  
  const files = fs.readdirSync(uploadsDir);
  const gifCount = files.filter(f => f.toLowerCase().endsWith('.gif')).length;
  
  return gifCount + 1;
};

export const renameGifFile = (oldFilename, originalTitle) => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const ext = '.gif';
  
  let safeTitle = decodeMojibake(originalTitle);
  
  if (!/[а-яА-ЯёЁ]/.test(safeTitle)) {
    safeTitle = safeTitle
      .replace(/[^a-zA-Z0-9\-_а-яА-ЯёЁ\s]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  if (!safeTitle || safeTitle.length === 0 || /^\d+$/.test(safeTitle)) {
    safeTitle = 'gif';
  }
  
  if (safeTitle.length > 50) {
    safeTitle = safeTitle.substring(0, 50);
  }
  
  const gifNumber = getNextGifNumber();
  const newFilename = `GIF${gifNumber}_${safeTitle}${ext}`;
  
  const oldPath = path.join(uploadsDir, oldFilename);
  const newPath = path.join(uploadsDir, newFilename);
  
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`📝 Renamed: ${oldFilename} -> ${newFilename}`);
    return newFilename;
  }
  
  console.log(`⚠️ File not found for rename: ${oldFilename}`);
  return null;
};

