import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Markup } from 'telegraf';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../../temp');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api';

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const gifUploadHandler = async (ctx) => {
  try {
    await ctx.sendChatAction('upload_document');
    
    let fileId, fileName, fileSize;

    if (ctx.message.document) {
      fileId = ctx.message.document.file_id;
      fileName = ctx.message.document.file_name;
      fileSize = ctx.message.document.file_size;
    } else if (ctx.message.animation) {
      fileId = ctx.message.animation.file_id;
      fileName = `${Date.now()}.gif`;
      fileSize = ctx.message.animation.file_size;
    } else {
      return ctx.reply('❌ Поддерживаются только GIF и видео файлы.');
    }

    if (fileSize > 100 * 1024 * 1024) {
      return ctx.reply('❌ Файл слишком большой. Максимум 100MB.');
    }

    const ext = path.extname(fileName).toLowerCase();
    if (!['.gif', '.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
      return ctx.reply('❌ Поддерживаются только: GIF, MP4, MOV, AVI, WebM');
    }

    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });

    const localPath = path.join(TEMP_DIR, fileName);
    const writer = fs.createWriteStream(localPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        try {
          const form = new FormData();
          const fileStream = fs.createReadStream(localPath);
          form.append('gif', fileStream, fileName);

          const uploadResponse = await axios.post(
            `${BACKEND_URL}/gifs/upload-bot`,
            form,
            {
              headers: {
                ...form.getHeaders(),
                'X-Bot-Token': process.env.TELEGRAM_BOT_TOKEN,
                'X-Telegram-User-Id': ctx.from.id.toString()
              }
            }
          ).catch(async (error) => {
            console.log('⚠️  Попытка загрузки без авторизации...');
            
            const form2 = new FormData();
            const fileStream2 = fs.createReadStream(localPath);
            form2.append('gif', fileStream2, fileName);
            
            return await axios.post(
              `${BACKEND_URL}/gifs/upload-guest`,
              form2,
              {
                headers: form2.getHeaders()
              }
            );
          });

          fs.unlinkSync(localPath);

          const gifData = uploadResponse.data;
          const gifUrl = `${process.env.BACKEND_URL.replace('/api', '')}/gifs/${gifData.id}`;
          
          await ctx.replyWithDocument(
            {
              url: `${process.env.BACKEND_URL.replace('/api', '')}/uploads/${fileName}`
            },
            {
              caption: `✅ <b>GIF успешно загружена!</b>\n\n` +
                       `📊 Размер: ${(fileSize / 1024 / 1024).toFixed(2)}MB\n` +
                       `🔗 Прямая ссылка: ${gifData.url}\n\n` +
                       `Скиньте эту ссылку друзьям!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🌐 Открыть на сайте',
                      url: `${process.env.WEB_APP_URL || 'http://localhost:5173'}/gif/${gifData.id}`
                    }
                  ],
                  [
                    {
                      text: '📤 Загрузить еще',
                      callback_data: 'upload_another'
                    },
                    {
                      text: '🌐 На сайт',
                      web_app: { url: process.env.WEB_APP_URL || 'http://localhost:5173' }
                    }
                  ]
                ]
              }
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
      `${error.message}`,
      { parse_mode: 'HTML' }
    );
  }
};