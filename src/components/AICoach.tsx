import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Send, Sparkles, MessageSquare, AlertCircle, RefreshCw, Mic, MicOff, Key, Trash2 } from 'lucide-react';

// Type definitions for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
}

const matchResponseOffline = (text: string): string => {
  const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (norm.includes('sexy') || norm.includes('cong thuc co ban') || norm.includes('r u r') || norm.includes('4 buoc')) {
    return `**Sexy Move (R U R' U') - Công thức nền tảng trong Speedcubing**

**Hướng chuyển tay chuẩn (Finger Tricks):**
1. **R**: Tay phải gạt mặt Phải lên 90 độ bằng cổ tay.
2. **U**: Ngón trỏ bên phải búng mặt Trên theo chiều kim đồng hồ.
3. **R'**: Tay phải kéo mặt Phải xuống 90 độ.
4. **U'**: Ngón trỏ bên trái búng mặt Trên ngược chiều kim đồng hồ.

**Tại sao lại vô cùng quan trọng?**
- Nó đóng vai trò xây dựng hầu hết tất cả các công thức nâng cao như lật góc F2L, OLL và hoán vị PLL.
- Đặc tính độc đáo: Nếu bạn lặp lại công thức này đúng **6 lần** từ bất kỳ trạng thái nào, Rubik sẽ tự quay về trạng thái bắt đầu ban đầu của nó!`;
  }
  
  if (norm.includes('f2l') || norm.includes('tang hai') || norm.includes('tang de') || norm.includes('ghep cap')) {
    return `**Phương pháp F2L (First Two Layers - 2 Tầng Đầu Tiên) nâng tầm Sub-20**

F2L là bước kéo dài thời gian nhất, chiếm hơn 50% thời lượng vòng xoay.

**Mẹo đột phá tốc độ:**
1. **Đừng học thuộc lòng 41 công thức F2L ngay lúc đầu:** Hãy rèn luyện tư duy **F2L Tự Nhiên (Intuitive F2L)**. Hiểu cách đưa mảnh góc đáy và mảnh cạnh trung tầng liên kết với nhau trên tầng U, rồi nhấn chúng vào khe (Slot) thích hợp.
2. **Nhìn trước (Look-ahead):** Trong lúc đôi tay giải quyết cặp F2L số 1, mắt bạn không được chăm chăm nhìn nó, hãy bao quát đỉnh và các góc sau lưng để tìm mảnh của cặp F2L số 2.
3. **Giải tốc độ không đổi (Slow solves):** Hãy luyện tập không dùng đồng hồ đếm giây. Giữ tốc độ xoay đều đặn liên tiếp không ngắt quãng (0.5 giây/lượt) tốt hơn là rít thật nhanh rồi khựng lại 2 giây để tìm mảnh!`;
  }
  
  if (norm.includes('oll') || norm.includes('dinh huong')) {
    return `**OLL (Orientation of Last Layer - Định hướng tầng cuối)**

Mục tiêu OLL: Làm cho toàn bộ mặt trên cùng đồng màu (thường là màu vàng).

**Lộ trình học tập khoa học:**
1. **2-Look OLL (Rút gọn chỉ còn 10 công thức):** Rất phù hợp cho người tập trung bứt phá Sub-30.
   - *Bước 1 (3 công thức):* Tạo chữ thập vàng bằng cách xoay \`F (R U R' U') F'\` hoặc \`f (R U R' U') f'\`.
   - *Bước 2 (7 công thức):* Định hướng nốt các góc vàng, cốt lõi là công thức Sune (\`R U R' U R U2 R'\`) và Anti-Sune (\`R U2 R' U' R U' R'\`).
2. **Full OLL (57 công thức):** Chỉ khuyên dùng khi bạn đã ổn định dưới 15 giây. Hãy ghi nhớ dựa trên phản xạ cơ bắp (Muscle Memory) bằng cách lặp lại nhiều lần.`;
  }

  if (norm.includes('pll') || norm.includes('hoan vi') || norm.includes('ve hinh')) {
    return `**PLL (Permutation of Last Layer - Hoán vị góc cạnh tầng cuối)**

PLL là bước cuối cùng sau khi mặt màu vàng đã đồng nhất để hoàn chỉnh Rubik.

**Gợi ý rèn luyện:**
1. **2-Look PLL (Rút gọn chỉ có 6 công thức):**
   - *Bước 1 (Hoán góc):* Sử dụng công thức chữ T (T-Perm) hoặc chữ Y (Y-Perm) để dạt đúng 4 góc kề nhau.
   - *Bước 2 (Hoán cạnh):* Hoàn thiện 4 cạnh bằng công thức U-Perm (Ua/Ub), H-Perm (\`M2 U M2 U2 M2 U M2\`) hoặc Z-Perm.
2. **Full PLL (21 công thức):** Bắt buộc phải thành thạo để chinh phục Sub-12.
3. **Mẹo nhận biết nhanh (Two-Sided Recognition):** Nhận diện trường hợp PLL bằng dải màu hai bên khối mà không cần mất công xoay khối Rubik đảo mắt ra sau lưng.`;
  }

  if (norm.includes('quet') || norm.includes('camera') || norm.includes('loi mau') || norm.includes('nham mau') || norm.includes('sua')) {
    return `**Mẹo vàng khắc phục lỗi camera quét sai màu sắc:**

1. **Góc Camera và nguồn sáng:**
   - Tránh ánh sáng bóng tuýp hoặc tia Mặt Trời rọi trực tiếp gây hiện tượng bóng lóa bề mặt nhựa Rubik (ảnh hưởng nghiêm trọng tới phổ HSV).
   - Hãy ngồi ở phòng sáng khuếch tán đều, cầm khối vuông góc song song với camera.
2. **Bút tô màu thủ công nhanh bằng Palette:**
   - Nhấp chọn hạt màu tại khay **"Mực tô hiện tại"** ở phía bên dưới sơ đồ mặt quét.
   - Bấm vào bất kỳ ô số từ 1 đến 9 nào đang bị hiển thị sai sắc tố để thay màu chuẩn cực kỳ trực quan và nhanh chóng mà không cần quét lại từ đầu!
3. **Nguyên tắc màu tâm:**
   - Ô tâm ở giữa (ô số 5) có màu mặc định theo hướng mặt giải (trắng, vàng, lục, lam, cam, đỏ) và không thể thay thế vì đó là trục quay chuẩn của WCA.`;
  }

  if (norm.includes('ky luc') || norm.includes('record') || norm.includes('nhanh nhat') || norm.includes('gioi han')) {
    return `**Bảng vàng kỷ lục Rubik 3x3 chính thức (Hiệp hội WCA):**

- **Xoay đơn (Single World Record):** **3.13 giây** thiết lập ngày 11/06/2023 bởi huyền thoại **Max Park** (Mỹ) tại giải đấu Pride in Long Beach 2023.
- **Xoay trung bình (Average of 5 WCA):** **4.25 giây** được giữ bởi thiên tài trẻ tuổi **Yiheng Wang** (Vương Nghệ Hành) người Trung Quốc thiết lập vào tháng 9 năm 2024.
- **Xoay bịt mắt (3x3 Blindfolded):** **12.00 giây** do Tommy Cherry (Mỹ).
- **Luyện phản xạ:** Bạn có thể búng tay rèn rũa và tính toán bằng bộ đếm giờ **WCA Timer** và phân tích phương pháp giải ngay trên ứng dụng này!`;
  }

  if (norm.includes('roux')) {
    return `**Phương pháp Roux (Roux Method) - Chinh phục không cần Cross đáy!**

Một cách tiếp cận vô cùng sáng tạo thay cho CFOP truyền thống giúp bạn giải thoát khỏi vô số công thức:
1. **First Block (FB):** Lắp ráp một block kích thước 1x2x3 ở bên sườn trái.
2. **Second Block (SB):** Đưa thêm một block kích thước 1x2x3 ở sườn phải (giữ rãnh sườn giữa tự do).
3. **CMLL (Chỉ gồm 42 công thức):** Giải quyết đồng thời định vị và định hướng 4 góc tầng cuối cùng.
4. **LSE (Last Six Edges):** Hoàn thiện 6 cạnh viền và lõi trục đứng bằng các lượt quay \`U\` và \`M\` (trục xoay giữa) trơn chu.

**Điểm cộng:** Rất trực quan, số nước xoay cực ngắn và không cần xoay đổi hướng khối Rubik (Zero rotations)!`;
  }

  if (norm.includes('cfop') || norm.includes('fridrich') || norm.includes('tu buoc')) {
    return `**Quy trình giải CFOP chuẩn WCA (Fridrich Method)**

Đây là tiêu chuẩn vàng được đại đa số các tay đấu hàng đầu hành tinh học tập:
1. **C - Cross (Chữ thập đáy):** Vẽ chữ thập đáy (thường ưu tiên trắng) tốt nhất dưới 8 lượt xoay trong đầu trong 15s chuẩn bị.
2. **F - F2L (First Two Layers):** Ghép đôi góc-cạnh và đặt vào 4 slot trống, dọn sạch 2 tầng đầu tiên.
3. **O - OLL (Orient Last Layer):** Định hướng màu vàng cho toàn mặt nóc.
4. **P - PLL (Permute Last Layer):** Hoán chuyển vị trí các sọc màu xung quanh tầng nóc để hoàn thành khối Rubik.`;
  }

  if (norm.includes('bat dau') || norm.includes('chao') || norm.includes('hello') || norm.includes('giup') || norm.includes('xin chao')) {
    return `Xin chào! Tôi có thể hỗ trợ hiệu quả cho bạn các mảng kiến thức sau:
- **Hướng dẫn công thức chuẩn CFOP** (Cross, F2L, OLL, PLL).
- **Làm quen hướng đi Roux, ZZ, Petrus**.
- **Mẹo tối ưu ngón tay khi bấm máy tính (Finger tricks)**.
- **Cách tự chỉnh sửa màu nhanh bằng Bút Vẽ Palette** khi quét camera gặp trục trặc.

Hãy chọn một trong các **Gợi ý câu hỏi nhanh** ở góc trái hoặc soạn câu hỏi trực tiếp để trao đổi nhé!`;
  }

  return `Chào bạn! Tôi đang chạy dưới chế độ **Trợ Lý WCA Thực Chiến Ngoại Tuyến (Offline Core)**.

Để có thể hỏi bất kỳ câu hỏi ngẫu nhiên nào và nhận câu trả lời phân tích suy luận sâu sắc nhất giống như ChatGPT, bạn hãy bổ sung **Khóa Bí Mật Google Gemini API Key** cá nhân của mình:

1. Click vào biểu tượng chìa khóa **"Khóa API"** màu vàng phía trên khung chat này.
2. Dán API key của bạn và lưu lại. Key sẽ lưu bảo mật trực tiếp trên trình duyệt của bạn (Local Storage) chứ không gửi đi bất kỳ server trung gian nào, cực kỳ an toàn!
3. Sau khi lưu key, hệ thống sẽ tự động liên kết trực tiếp trực diện tới đám mây Google Gemini 3.5 để giải đáp trực quan tức thì!

Tạm thời bạn có thể nhấn vào các nút **Câu hỏi thông dụng** ở menu bên trái để đọc ngay những cẩm nang giải Rubik chuyên nghiệp độc quyền tóm tắt ngắn gọn của tôi nhé!`;
};

export default function AICoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [apiKeyValue, setApiKeyValue] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKeyStatusText, setApiKeyStatusText] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const quickPrompts = [
    'Sexy Move là gì và tại sao lại quan trọng?',
    'Làm thế nào để học F2L nhanh hơn?',
    'Cách khắc phục khi bị nhầm màu khi quét?',
    'Kỷ lục xoay Rubik WCA hiện tại là bao nhiêu?',
  ];

  // Load chat history & api key
  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key') || '';
    setApiKeyValue(savedKey);

    const savedChat = localStorage.getItem('user_chat_history');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (err) {
        console.warn('Could not parse user chat history', err);
      }
    }

    setMessages([
      {
        id: '1',
        sender: 'coach',
        text: 'Xin chào! Tôi là huấn luyện viên AI chuyên nghiệp của bạn. Tôi có thể chỉ dẫn cho bạn các mẹo xoay tay nhanh (Finger tricks), công thức OLL/PLL nâng cao hoặc giúp bạn giải quyết từng bước giải mà bạn đang bận tâm. Sẵn sàng bứt phá kỷ lục chưa?',
      },
    ]);
  }, []);

  // Sync message state to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('user_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInputText('');
      recognitionRef.current?.start();
    }
  };

  const handleSaveApiKey = (key: string) => {
    const cleanKey = key.trim();
    if (cleanKey) {
      localStorage.setItem('user_gemini_api_key', cleanKey);
      setApiKeyValue(cleanKey);
      setApiKeyStatusText('Đã lưu khoá thành công! Giờ đây Trợ lý AI có thể trả lời trực tuyến câu hỏi của bạn.');
      setTimeout(() => {
        setShowKeyModal(false);
        setApiKeyStatusText('');
      }, 1500);
    } else {
      localStorage.removeItem('user_gemini_api_key');
      setApiKeyValue('');
      setApiKeyStatusText('Đã xoá khoá. Huấn luyện viên đã quay lại chế độ ngoại tuyến.');
      setTimeout(() => {
        setShowKeyModal(false);
        setApiKeyStatusText('');
      }, 1500);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Bạn có muốn xóa toàn bộ cuộc hội thoại hiện tại không?')) {
      const initialMsg: ChatMessage = {
        id: '1',
        sender: 'coach',
        text: 'Lịch sử trò chuyện đã được làm sạch. Bạn muốn trao đổi thêm nội dung chuyên môn nào nữa không?',
      };
      setMessages([initialMsg]);
      localStorage.setItem('user_chat_history', JSON.stringify([initialMsg]));
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    if (isListening) {
      recognitionRef.current?.stop();
    }

    const userMsgId = Math.random().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    const activeApiKey = apiKeyValue || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

    if (!activeApiKey) {
      // Offline responder mode - very friendly, instantaneous
      setTimeout(() => {
        const offlineText = matchResponseOffline(textToSend);
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'coach',
            text: offlineText,
          },
        ]);
        setLoading(false);
      }, 600);
      return;
    }

    // Direct client-side Gemini call for ultimate static compatibility with Zero-Server requirements!
    try {
      const promptSystem = `Bạn là một huấn luyện viên chuyên nghiệp giải đấu Rubik 3x3 quốc tế (WCA Speedcubing Coach) người Việt Nam. Hãy trả lời người dùng chi tiết, khúc chiết, có gạch đầu dòng rõ ràng, dễ hiểu và truyền cảm hứng bằng tiếng Việt. Sử dụng thuật ngữ ký hiệu chuẩn WCA (như R, L, U, D, F, B, R', F'). Giải thích cặn kẽ các bước, định hướng và các mẹo đặt ngón tay (finger tricks) tối ưu tốc độ.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${promptSystem}\n\nCâu hỏi học viên: ${textToSend}`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const resData = await response.json();
      const textResponse = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textResponse) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'coach',
            text: textResponse,
          },
        ]);
      } else {
        throw new Error('Định dạng phản hồi không chứa nội dung văn bản.');
      }
    } catch (err: any) {
      console.error('Error invoking client-side Gemini:', err);
      // Fallback to beautiful offline smart dictionary rather than breaking
      const offlineFallback = matchResponseOffline(textToSend);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'coach',
          text: `[Trợ lý AI lỗi kết nối - Tự động đáp ứng Ngoại Tuyến]\n\n${offlineFallback}`
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-950/30 rounded-lg border border-white/5 shadow-2xl p-2 sm:p-2 grid grid-cols-1 lg:grid-cols-12 gap-1.5 items-stretch min-h-[500px]">
      
      {/* Settings management modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111625] border border-white/10 p-5 rounded-xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-2">
              <Key className="text-amber-400 animate-bounce" size={24} />
              <span className="text-sm font-bold text-slate-100">Cấu Hình Khoá API Google Gemini</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Để biến Trợ Lý thành phiên bản Live trực tuyến thông minh vượt bậc toàn cầu giải tất cả đề toán Rubik, hãy sinh mã khoá miễn phí từ Google AI Studio và dán vào dưới đây. Khoá được lưu ngay trong localStorage trình duyệt của bạn:
            </p>
            <div className="space-y-1.5">
              <input
                id="api-key-input-field"
                type="password"
                placeholder="Dán AIzaSy... của bạn vào đây"
                defaultValue={apiKeyValue}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-zinc-600 outline-none focus:border-amber-500"
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline block font-semibold"
              >
                ☞ Click vào đây để lấy mã khoá Gemini API Key miễn phí từ Google AI Studio
              </a>
            </div>

            {apiKeyStatusText && (
              <p className="text-[11px] text-amber-300 bg-amber-950/20 p-2 rounded border border-amber-500/25 italic">
                {apiKeyStatusText}
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-2 hover:bg-white/5 rounded-lg text-xs text-zinc-400 font-bold cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('api-key-input-field') as HTMLInputElement;
                  handleSaveApiKey(el?.value || '');
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-neutral-950 font-black rounded-lg text-xs transition cursor-pointer active:scale-95 shadow-lg shadow-amber-500/10"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions left side - Hidden on Mobile, Visible on Large screens */}
      <div className="hidden lg:flex lg:col-span-4 flex-col justify-between space-y-1.5">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={18} className="text-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Gợi ý câu hỏi thông dụng:</span>
          </div>
          <div className="space-y-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                id={`btn-prompt-${idx}`}
                onClick={() => handleSendMessage(prompt)}
                disabled={loading}
                className="w-full text-left p-2.5 bg-neutral-900/40 hover:bg-[#0D1117] border border-white/5 hover:border-blue-500/20 text-xs text-neutral-300 font-medium rounded-lg leading-relaxed transition-all hover:-translate-x-0.5 disabled:opacity-40 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-zinc-900/60 rounded-lg border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Trạng Thái Hệ Thống:</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              apiKeyValue ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {apiKeyValue ? 'Gemini AI Online' : 'WCA Offline Core'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
            Thiết kế 100% tĩnh tận dụng Vite biên dịch cực nhanh, tương thích hoàn toàn cho Github Pages, không phụ thuộc vào máy chủ Node.js Express.
          </p>
        </div>
      </div>

      {/* Messages console area right side */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-neutral-950/70 rounded-lg border border-white/5 overflow-hidden p-2 sm:p-3 relative min-h-[400px]">
        
        {/* Chat Control Header and action buttons */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={16} className="text-blue-400" />
            <span className="text-[11.5px] font-bold text-slate-200">Bảo Bối Trợ Lý Rubik 3D</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowKeyModal(true)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center justify-center gap-1 active:scale-95 ${
                apiKeyValue
                  ? 'bg-amber-600/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-[#181d2c] border border-white/5 hover:border-amber-500/20 text-zinc-400 hover:text-amber-400'
              }`}
              title="Đổi API Key Gemini"
            >
              <Key size={11} className={apiKeyValue ? 'animate-pulse' : ''} />
              <span>{apiKeyValue ? 'Đã Lưu API Key' : 'Khóa API'}</span>
            </button>

            <button
              onClick={handleClearHistory}
              className="p-1.5 bg-[#181d2c] border border-white/5 hover:border-red-500/20 rounded-lg text-zinc-400 hover:text-red-400 cursor-pointer transition active:scale-95 flex items-center justify-center"
              title="Xóa lịch sử chat"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Chat message logger */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mb-2 h-[350px] scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}
            >
              {msg.sender === 'coach' && (
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 flex items-center justify-center font-black text-[10px] shrink-0 select-none uppercase">
                  WCA
                </div>
              )}
              <div
                className={`p-2.5 sm:p-3 rounded-xl max-w-[85%] text-xs leading-relaxed font-sans shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none font-semibold'
                    : 'bg-[#111625] text-neutral-200 rounded-tl-none border border-white/5 whitespace-pre-wrap'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 italic pl-9 animate-pulse">
              <RefreshCw size={11} className="animate-spin text-blue-400" />
              <span>Cố vấn đang phân tích tư duy...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Swipeable Quick suggestions for mobile ONLY just above feed input */}
        <div className="lg:hidden flex flex-col gap-1 my-2">
          <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1 select-none">
            <Sparkles size={11} className="text-blue-400 animate-pulse" />
            <span>Gợi ý hỏi nhanh:</span>
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 flex-nowrap w-full">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={loading}
                className="shrink-0 px-2.5 py-1.5 bg-neutral-900 border border-white/5 text-[10px] text-neutral-300 font-bold rounded-lg hover:border-blue-500/20 active:scale-95 transition-all text-center cursor-pointer whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input prompt area */}
        <div className="flex items-center gap-1.5 border-t border-white/5 pt-3 mt-1.5">
          <div className="flex-1 relative flex items-center">
            <input
              id="chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
              placeholder="Hỏi về Sexy Move, F2L, OLL, PLL, Roux, CFOP v.v..."
              disabled={loading}
              className="w-full bg-neutral-900 text-white rounded-lg pl-3 pr-10 py-2.5 text-xs outline-none border border-white/5 focus:border-blue-500 transition-colors placeholder:text-neutral-500 disabled:opacity-40"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-2.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title={isListening ? 'Dừng ghi âm' : 'Nói câu hỏi (Tiếng Việt)'}
              >
                {isListening ? <MicOff size={14} className="animate-pulse" /> : <Mic size={14} />}
              </button>
            )}
          </div>
          <button
            id="btn-send-message"
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || loading}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg transition-all cursor-pointer active:scale-95 shrink-0 shadow-lg shadow-blue-600/10"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
