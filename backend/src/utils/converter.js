import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const convertVideoToGif = (inputPath, outputName, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      fps = null,
      width = 480,
      startTime = 0,
      duration = null
    } = options;

    const outputPath = path.join(UPLOAD_DIR, `${outputName}.gif`);

    let command = ffmpeg(inputPath)
      .outputOptions([
        `-vf fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:reserve_transparent=on[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`,
        '-loop 0',
        '-c:v gif',
        '-f gif'
      ])
      .output(outputPath);

    if (startTime > 0) {
      command = command.seekInput(startTime);
    }

    if (duration) {
      command = command.duration(duration);
    }

    command
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent != null) {
          console.log('Conversion progress:', Math.round(progress.percent) + '%');
        }
      })
      .on('end', () => {
        console.log('GIF created successfully:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(new Error(`Video conversion failed: ${err.message}`));
      })
      .run();
  });
};

export const getVideoMetadata = (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === 'video'
      );

      resolve({
        duration: metadata.format?.duration,
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
        format: metadata.format?.format_name
      });
    });
  });
};

export const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Temp file cleaned:', filePath);
    }
  } catch (err) {
    console.error('Failed to clean up temp file:', err);
  }
};

export const compressGif = (filePath) => {
  return new Promise((resolve) => {
    try {
      console.log('🎬 Starting GIF compression:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        resolve(filePath);
        return;
      }
      
      const originalSize = fs.statSync(filePath).size;
      console.log(`📊 Original size: ${Math.round(originalSize / 1024)}KB`);
      
      const tempPath = `${filePath}.tmp`;
      const gifsicleCmd = path.join(process.cwd(), 'node_modules', '.bin', 'gifsicle.cmd');
      
      console.log('⚙️ Running gifsicle:', gifsicleCmd);
      
      const gifsicle = spawn(gifsicleCmd, [
        '-O3',
        '--lossy=80',
        filePath,
        '-o',
        tempPath
      ], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stderr = '';
      
      gifsicle.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      gifsicle.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ gifsicle exit code:', code);
          console.error('❌ stderr:', stderr);
          resolve(filePath);
          return;
        }
        
        if (!fs.existsSync(tempPath)) {
          console.error('❌ gifsicle output file not created');
          resolve(filePath);
          return;
        }

        const compressedSize = fs.statSync(tempPath).size;
        const savingsPercent = Math.round((1 - compressedSize / originalSize) * 100);

        console.log(`✅ Compressed size: ${Math.round(compressedSize / 1024)}KB`);
        console.log(`📉 Savings: ${savingsPercent}%`);

        try {
          fs.unlinkSync(filePath);
          fs.renameSync(tempPath, filePath);
          console.log(`✅ GIF compression completed: ${filePath}`);
        } catch (err) {
          console.error('❌ Error replacing file:', err);
        }

        resolve(filePath);
      });
      
      gifsicle.on('error', (err) => {
        console.error('❌ gifsicle spawn error:', err);
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {
          }
        }
        resolve(filePath);
      });
      
    } catch (err) {
      console.warn('⚠️ GIF compression failed:', err.message);
      resolve(filePath);
    }
  });
};

export default {
  convertVideoToGif,
  getVideoMetadata,
  cleanupTempFile,
  compressGif,
  TEMP_DIR,
  UPLOAD_DIR
};