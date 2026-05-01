# Demo Script — AI Team Sharing Assistant

## Mục tiêu demo
Chứng minh hệ thống có thể tự động hóa vòng đời team sharing: setting, generate topic, notify, vote, chọn topic, tạo markdown document, nhận feedback.

## Chuẩn bị
1. Chạy server: `npm start`
2. Mở trình duyệt: `http://localhost:3000`
3. Kiểm tra màn hình có Admin Dashboard bên trái và 4 User Chat Panels bên phải.

## Step 1 — Giới thiệu Dashboard
Nói: "Đây là giao diện admin để quản lý toàn bộ chu kỳ sharing của team."

Show nhanh các section: System Settings, Member Profiles, Topic Generation, Voting Result, Documents, Feedback, History.

## Step 2 — Kiểm tra Settings
Ở section System Settings, kiểm tra các field:
- Generate topic day: Monday
- Notify day: Wednesday
- Vote deadline: Thursday
- Sharing day: Friday
- Topic direction: foundational knowledge and practical engineering skills

Bấm `Save Settings`.

## Step 3 — Xem 4 profile thành viên
Ở section Member Profiles, show 4 user:
- Hải — Backend Developer
- An — QA Engineer
- Minh — Frontend Developer
- Lan — Business Analyst

Nói: "Hệ thống dùng profile này để tạo topic phù hợp với team."

## Step 4 — Generate Topics
Bấm `Generate Weekly Topics`.

Kết quả mong đợi:
- Topic list xuất hiện ở dashboard.
- Folder `data/generated/topic/yyyymmdd` được tạo.
- Mỗi topic có `description.md`.
- 4 chat panels nhận event `topics:generated`.

## Step 5 — Notify Users
Bấm `Notify Users`.

Kết quả: 4 user chat panels nhận notification.

## Step 6 — User Vote
Ở mỗi user chat panel:
- Chọn một topic.
- Nhập reason ngắn.
- Bấm `Vote`.

Kết quả: vote count update và admin voting result update.

## Step 7 — Close Voting
Admin bấm `Close Voting`.

Kết quả:
- Topic được sort theo vote.
- Selected topic hiển thị theo thứ tự ưu tiên.

## Step 8 — Generate Markdown Docs
Admin bấm `Generate Docs`.

Kết quả:
- `final_document.md` được tạo cho topic thắng hoặc danh sách topic ưu tiên.
- `vote_summary.md` được tạo.
- 4 user panels nhận notification `session:docs-created`.

Nói: "Ở demo này hệ thống chỉ tạo markdown document. Slide, speaker notes và calendar là phần mở rộng sau."

## Step 9 — Feedback After Sharing
Ở mỗi user chat panel:
- Nhập rating.
- Nhập comment.
- Bấm `Submit Feedback`.

Kết quả:
- `data/comments.json` được cập nhật.
- Admin feedback section hiển thị comment.

## Step 10 — Show History
Admin mở History.

Nói: "Toàn bộ quá trình được lưu lại để các lần sau AI biết topic nào đã làm, topic nào hiệu quả, topic nào nên tiếp tục phát triển."

## Kết luận demo
Nói: "Demo này chưa phải full product, nhưng chứng minh bộ xương tự động hóa đã chạy được: từ tạo topic, notify, vote, tạo document đến feedback."
