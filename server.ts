import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Instantiate Gemini API safely using @google/genai SDK
  const isApiKeyConfigured = !!process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (isApiKeyConfigured) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // APIs
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      apiKeyConfigured: isApiKeyConfigured,
    });
  });

  app.post('/api/gemini/tips', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Nội dung câu hỏi không được trống.' });
    }

    if (!ai) {
      return res.json({
        reply: 'Chào bạn! Tính năng huấn luyện viên AI chưa được kích hoạt do thiếu Khóa Bí Mật GEMINI_API_KEY. Hãy thêm khóa bí mật này trong phần Settings > Secrets của AI Studio để mở khóa tính năng AI hoàn tất nhé! Tạm thời, để giải thích Sexy Move: đây là công thức xoay (R U R\' U\') giúp lật góc và định vị sườn cực nhanh.',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Bạn là một huấn luyện viên chuyên nghiệp giải đấu Rubik 3x3 quốc tế (WCA Coach) người Việt Nam. Hãy trả lời người dùng chi tiết, khúc chiết, dễ hiểu và chuyên nghiệp bằng tiếng Việt. Sử dụng thuật ngữ ký hiệu chuẩn WCA (như R, L, U, D, F, B). Giải thích cặn kẽ các bước, định hướng và các mẹo đặt ngón tay (finger tricks) tối ưu tốc độ.',
        }
      });

      const replyText = response.text || "Xin lỗi, huấn luyện viên gặp trục trặc trong việc tạo câu trả lời cho tình huống này. Bạn có thể diễn đạt lại câu hỏi khác được không?";
      res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Gemini API Integration error:', err);
      res.status(500).json({
        error: 'Có lỗi xảy ra khi kết nối máy chủ huấn luyện viên AI.',
        details: err.message,
      });
    }
  });

  // Serve static UI / Dev resources
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
    console.log(`[Rubiks Server] Đang khởi chạy ổn định tại cổng http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[Error startup server]', error);
});
