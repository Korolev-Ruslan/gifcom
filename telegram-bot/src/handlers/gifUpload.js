import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Markup } from 'telegraf';
import FormData from 'form-data';
import { getLinkedUserToken } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../../temp');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api';
const WEB_APP_URL = (process.env.WEB_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const HAS_HTTPS_WEB_APP = /^https:\/\//i.test(WEB_APP_URL);
const HAS_PUBLIC_SITE_URL = /^https?:\/\/(?!localhost\b)(?!127\.0\.0\.1\b)/i.test(WEB_APP_URL);

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const gifUploadHandler = async (ctx) => {
  try {
    await ctx.sendChatAction('upload_document');
    
    let fileId, fileName, fileSize, mimeType;

    if (ctx.message.document) {
      fileId = ctx.message.document.file_id;
      fileName = ctx.message.document.file_name;
      fileSize = ctx.message.document.file_size;
      mimeType = ctx.message.document.mime_type;
    } else if (ctx.message.animation) {
      fileId = ctx.message.animation.file_id;
      fileName = ctx.message.animation.file_name || `${Date.now()}.mp4`;
      fileSize = ctx.message.animation.file_size;
      mimeType = ctx.message.animation.mime_type;
    } else {
      return ctx.reply('❌ Поддерживаются только GIF и видео файлы.');
    }

    if (fileSize > 100 * 1024 * 1024) {
      return ctx.reply('❌ Файл слишком большой. Максимум 100MB.');
    }

    const ext = path.extname(fileName).toLowerCase();
    const isGif = ext === '.gif' || mimeType === 'image/gif';
    const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext) || String(mimeType || '').startsWith('video/');

    if (!isGif && !isVideo) {
      return ctx.reply('❌ Поддерживаются только: GIF, MP4, MOV, AVI, WebM');
    }

    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });

    const tempFileName = `${Date.now()}_${fileName}`;
    const localPath = path.join(TEMP_DIR, tempFileName);
    const writer = fs.createWriteStream(localPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        try {
          let authToken;
          try {
            authToken = await getLinkedUserToken(ctx.from.id);
          } catch (authError) {
            if (fs.existsSync(localPath)) {
              fs.unlinkSync(localPath);
            }

            if (authError.response?.status === 404) {
              await ctx.reply(
                '🔐 Сначала привяжи аккаунт GIFCOM.\n\nИспользуй /register для нового аккаунта или /login, если ты уже зарегистрирован на сайте.'
              );
              resolve();
              return;
            }

            throw authError;
          }

          const form = new FormData();
          const fileStream = fs.createReadStream(localPath);
          const cleanTitle = fileName.replace(/\.[^/.]+$/, '');

          let uploadResponse;
          if (isVideo) {
            form.append('video', fileStream, fileName);
            form.append('title', cleanTitle);
            form.append('description', 'Загружено через Telegram бот');
            form.append('tags', '');
            form.append('fps', 10);
            form.append('width', 480);

            uploadResponse = await axios.post(
              `${BACKEND_URL}/gifs/convert`,
              form,
              {
                headers: {
                  ...form.getHeaders(),
                  Authorization: `Bearer ${authToken}`
                },
                maxBodyLength: Infinity
              }
            );
          } else {
            form.append('gif', fileStream, fileName);
            form.append('title', cleanTitle);
            form.append('description', 'Загружено через Telegram бот');
            form.append('tags', '');

            uploadResponse = await axios.post(
              `${BACKEND_URL}/gifs/upload`,
              form,
              {
                headers: {
                  ...form.getHeaders(),
                  Authorization: `Bearer ${authToken}`
                },
                maxBodyLength: Infinity
              }
            );
          }

          fs.unlinkSync(localPath);

          const gifData = isVideo
            ? uploadResponse.data.gif
            : uploadResponse.data.gifs?.[0];

          if (!gifData) {
            throw new Error('Backend did not return uploaded GIF data');
          }

          const moderationNote = 'GIF отправлена на сайт и ждёт одобрения в админ-панели.';
          const buttons = [];

          if (HAS_PUBLIC_SITE_URL) {
            buttons.push([
              Markup.button.url('🌐 Открыть карточку', `${WEB_APP_URL}/gif/${gifData.id}`)
            ]);
          }

          buttons.push(
            HAS_HTTPS_WEB_APP
              ? [
                  Markup.button.callback('📤 Загрузить еще', 'upload_another'),
                  Markup.button.webApp('🌐 На сайт', WEB_APP_URL)
                ]
              : [
                  Markup.button.callback('📤 Загрузить еще', 'upload_another')
                ]
          );

          await ctx.reply(
            `✅ <b>GIF успешно загружена!</b>\n\n` +
            `📄 Название: ${gifData.title}\n` +
            `📊 Размер: ${(fileSize / 1024 / 1024).toFixed(2)}MB\n` +
            `🛠 ${moderationNote}`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard(buttons)
            }
          );

          resolve();
        } catch (error) {
          console.error('❌ Ошибка загрузки на сервер:', error.message);
          
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }

          ctx.reply(
            '⚠️ <b>Ошибка загрузки</b>\n\n' +
            'Не удалось загрузить GIF на сервер. ' +
            'Пожалуйста, попробуйте позже или ' +
            'загрузите через веб-сайт.',
            { parse_mode: 'HTML' }
          );
          
          reject(error);
        }
      });

      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Ошибка обработки файла:', error.message);
    return ctx.reply(
      '❌ <b>Ошибка загрузки файла</b>\n\n' +
      'Не удалось обработать файл. Попробуй ещё раз чуть позже.',
      { parse_mode: 'HTML' }
    );
  }
};