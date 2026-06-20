# 🧩 Rubik 3x3 Companion & Solver

Ứng dụng hướng dẫn giải, luyện tập, bấm giờ Rubik 3x3 trực quan, sử dụng mô phỏng 3D hiện đại và thuật toán tối ưu hóa thời gian thực. Được xây dựng trên nền tảng **React (TypeScript), Vite và Tailwind CSS**, đồng bộ mượt mà với mô phỏng động 360 độ.

🌐 **Địa chỉ Repository:** [github.com/isthaison/Rubik3x3](https://github.com/isthaison/Rubik3x3)

---

## 🚀 Tính năng nổi bật & Cập nhật mới nhất

### 🔄 1. Xáo trộn Ngẫu nhiên Chuẩn Quốc tế (Mathematical Random Scramble)
*   **Trước đây:** Thao tác xáo trộn luôn trùng lặp theo một tập hợp chuỗi cố định.
*   **Hiện tại:** Tích hợp bộ sinh chuỗi xáo trộn toán học chuẩn WCA (World Cube Association). Mỗi lần nhấn **"Xáo trộn ngẫu nhiên"** sẽ tạo ra một chuỗi bước đảo độc nhất vô nhị, đảm bảo trải nghiệm giải không bao giờ bị lặp lại.

### 🧠 2. Tự động Tính toán lại Hướng giải khi Xoay sai (Auto-Recalculation on Mistake)
*   Trong quá trình xem hướng dẫn từng bước trực quan, nếu bạn vô tình xoay lệch hướng (ví dụ đáng lẽ phải xoay `U` nhưng lại xoay `U'`), hệ toán học của ứng dụng sẽ tự động:
    1.  Cảnh báo nhẹ nhàng bằng rung phản hồi xúc giác (**Haptic Feedback**).
    2.  Nhận diện trạng thái Rubik hiện tại sau dòng xoay sai đó.
    3.  **Tự động chạy lại thuật toán giải từ trạng thái lỗi mới này**, sinh ra các chuỗi bước giải tối ưu kế tiếp ngay tức khắc mà bạn **không cần phải đặt lại (Reset) hoặc quét lại Rubik từ đầu**.

### ⚡ 3. Tự động Phát hiện Hoàn thành & Chuyển bước (Auto Step Transition)
*   Ứng dụng hoàn toàn giải phóng bạn khỏi các thao tác click thủ công! Khi bạn xoay đầy đủ các ký tự của bước giải thuật hiện tại:
    *   Hệ thống tự động đồng bộ hóa, gửi phản hồi âm thầm và tự động chuyển tiếp sang **Bước tiếp theo/Chương thuật giải tiếp theo** sau một khoảng trễ cực nhỏ mượt mà đầy trực quan.
    *   Các nút bấm dài dòng như "Xác nhận hoàn thành bước" đã được tự động hóa hoàn toàn mang lại trải nghiệm huấn luyện rảnh tay tối đa.

---

## 🛠️ Cấu hình Tự động hóa Deployment (CI/CD) - GitHub Pages

Dự án đã được tích hợp luồng biên dịch và triển khai tự động lên **GitHub Pages** thông qua **GitHub Actions**.

Tệp cấu hình workflow đầy đủ nằm tại: `.github/workflows/deploy.yml`

### 📋 Toàn bộ các bước hoạt động của CI/CD:
1.  **Trigger:** Tự động kích hoạt khi có sự kiện `push` mã nguồn mới lên nhánh `main` hoặc `master`.
2.  **Linting Integrity:** Chạy kiểm tra tĩnh lỗi cú pháp và kiểu dữ liệu TypeScript (`npm run lint`) để loại trừ mọi lỗi biên dịch ẩn trước khi phát hành.
3.  **Production Compile:** Tạo gói phân phối tĩnh tối ưu hóa siêu nhẹ thông qua câu lệnh `npm run build` kết xuất ra thư mục `/dist`.
4.  **Auto Deploy:** Sử dụng action an toàn `JamesIves/github-pages-deploy-action` chuyển sạch sẽ thư mục `/dist` lên nhánh lưu trữ tĩnh `gh-pages` để hiển thị trên web công khai.

---

## ⚙️ Hướng dẫn kích hoạt Triển khai (Bắt buộc thực hiện 1 lần duy nhất)

Để quy trình CI/CD đẩy trang web tĩnh thành công lên đường dẫn của bạn, bạn cần cấp quyền cho GitHub Actions ghi dữ liệu vào Repository của bạn theo hướng dẫn dưới đây:

### Bước 1: Bật quyền ghi (Write Permissions) cho GitHub Actions
1.  Truy cập trang GitHub của dự án tại: [https://github.com/isthaison/Rubik3x3](https://github.com/isthaison/Rubik3x3).
2.  Nhấp vào tab ⚙️ **Settings** (Cài đặt) ở thanh công cụ phía trên repository.
3.  Ở thanh điều hướng bên trái, tìm mục **Actions** và chọn **General**.
4.  Cuộn xuống dưới cùng tìm khu vực **Workflow permissions** (Quyền của quy trình làm việc).
5.  Chọn tùy chọn **Read and write permissions** (Cho phép quyền đọc và viết).
6.  Bấm nút **Save** (Lưu) để xác nhận.

### Bước 2: Kích hoạt GitHub Pages từ nhánh `gh-pages`
Sau lần đầu dự án chạy thành công Actions (bằng cách đẩy mã nguồn bất kỳ lên nhánh chính):
1.  Quay lại ⚙️ **Settings** -> mục **Pages** ở menu bên trái.
2.  Tại phần **Build and deployment** -> mục **Source**, chọn **Deploy from a branch**.
3.  Tại phần **Branch**, chọn nhánh **`gh-pages`** và thư mục là **`/ (root)`**.
4.  Bấm **Save** (Lưu). Đường dẫn trang web công khai của bạn sẽ xuất hiện trực tiếp ngay đầu trang Pages đó!

---

## 💻 Hướng dẫn Chạy Phân lập tại Môi trường Cục bộ (Local Development)

Yêu cầu máy tính cài đặt sẵn **Node.js LTS (Phiên bản v18 trở lên khuyến nghị v20)**.

1.  **Tải mã nguồn và cài đặt thư viện:**
    ```bash
    git clone https://github.com/isthaison/Rubik3x3.git
    cd Rubik3x3
    npm install
    ```

2.  **Khởi động môi trường phát triển (Hot-reload):**
    ```bash
    npm run dev
    ```
    Mở trình duyệt truy cập vào đường dẫn mặc định hiển thị trên terminal (thường là `http://localhost:3000`).

3.  **Kiểm tra tính toàn vẹn cú pháp (TypeScript static checking):**
    ```bash
    npm run lint
    ```

4.  **Xây dựng bản thương mại tĩnh thủ công:**
    ```bash
    npm run build
    ```
    Toàn bộ mã tối ưu nằm gọn trong thư mục `dist/` có thể đem deploy lên bất kì hosting tĩnh nào khác nếu muốn (Netlify, Vercel, Firebase Hosting...).

---

## 🌟 Chúc bạn có những phút giây rèn luyện và giải Rubik cực kỳ bổ ích!
Mọi cập nhật đóng góp và phản hồi vui lòng gửi PR hoặc mở Issues trực tiếp tại [github.com/isthaison/Rubik3x3/issues](https://github.com/isthaison/Rubik3x3/issues).
