# Live Audition Scoring — 技术方案

## 系统概述

三个角色，三条业务线：
- **演员**：手机扫码 → 填写资料 → 签到
- **导演**：PC 登录 → 打分（1-3星）→ 提交
- **甄选团队（Casting）**：PC 查看汇总 → 维护 Wrap Up → 导出

---

## 技术栈

| 层级 | 选型 | 理由 |
|------|------|------|
| 全栈框架 | Next.js 14 (App Router) | 前后端一体，API Routes 即服务端，省去单独维护 Express |
| 数据库 ORM | Prisma + SQLite | 开发零配置，一行改配置即可切换 PostgreSQL |
| 文件存储 | 本地磁盘 (`/uploads`) + Next.js 静态服务 | Demo 够用，后续换 S3/OSS 只改 upload handler |
| UI 组件库 | Tailwind CSS + shadcn/ui | 原子化样式，组件按需复制不引入运行时 |
| 客户端状态 | Zustand | 轻量，用于打分草稿的内存缓存 |
| 服务端数据请求 | SWR | 轮询"查看他人打分"场景天然支持 |
| 草稿持久化 | localStorage + 后端 DB 双写 | 满足"未保存登出后依旧可见"需求 |

---

## 数据库模型

```
QRCode               — 场次+类别+阶段唯一确定一个二维码
Actor                — 演员信息 + 签到时间
ActorPhoto           — 演员照片（正面半身/侧身/纹身等6种）
Director             — 导演（SSO ID + 昵称）
Score                — 导演对某演员的打分（星级+House+Role+Note）
ScoreDraft           — 打分草稿（JSON，按 director_id+actor_id 索引）
WrapUp               — Casting 维护的汇总行（house/role/note/action）
House                — 演出场所
Role                 — 角色（多对一属于 House）
Session              — 甄选场次（名称/日期/类别）
```

关键约束：
- `Score` 和 `ScoreDraft` 都按 `(director_id, actor_id, session_id, stage)` 唯一索引
- 首次签到时间锁定，重复扫码不覆盖
- Wrap Up 的 `score` 字段由后端实时 AVG 聚合，不手动录入

---

## 页面与路由设计

```
/checkin/[code]          演员签到（手机端，移动优先布局）
/director/login          导演登录（输入 2xxxxxxx + 昵称）
/director/scoring        导演打分主界面（未打分/已打分 Tab）
/casting/login           Casting 登录（不同入口 URL 区分角色）
/casting/results         Casting 汇总查看 & 导出
/admin/qrcodes           管理员生成/查看二维码
```

---

## 核心功能实现要点

**1. 演员签到**
- QR Code URL = `/checkin/[base64(session_id+stage)]`，后端解码校验有效性
- 上传照片：`/api/upload` 接受 multipart/form-data，存 `uploads/{actor_id}/{type}.jpg`
- 纹身=有时，纹身照片至少一张做前端校验

**2. 导演打分草稿机制**
- 每次修改 → 写 localStorage（key: `draft_{director_id}_{actor_id}`）
- debounce 2s → 异步同步到 `ScoreDraft` 表（`PUT /api/drafts`）
- 登录时 → 优先从 DB 拉取草稿，合并到 localStorage

**3. 打分提交**
- 批量提交：底部「提交打分」按钮，将当前页草稿批量写入 `Score` 表
- 提交后草稿清除，演员移入「已打分」Tab

**4. House / Role 联动**
- 种子数据预置 House 和 Role 映射表
- Role 选择用 combobox（输入模糊匹配，只显示当前 House 下的 Role）

**5. 查看他人打分**
- 默认关闭，开关打开后 SWR 每 15s 轮询
- 展示为卡片内折叠区域（各导演分数 + 已提交状态）

**6. Casting 汇总视图**
- Wrap Up score = 后端实时 AVG 聚合，Casting 可覆盖 House/Role/Note
- Action 列：Casting 专属操作字段
- 导出：`GET /api/export?session=&stage=` 生成 Excel（使用 `xlsx` 库）

**7. 权限区分（轻量实现）**
- Director 链接：`/director/login`，登录 ID 以 `2` 开头的8位数字
- Casting 链接：`/casting/login`，登录 ID 以 `3` 开头（或其他约定）

---

## 项目目录结构

```
live_audition_scoring/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts              # 预置场次、House、Role 数据
├── src/
│   ├── app/
│   │   ├── checkin/[code]/  # 演员签到（移动端）
│   │   ├── director/        # 导演打分
│   │   ├── casting/         # 甄选团队
│   │   ├── admin/           # 二维码管理
│   │   └── api/             # API Routes
│   │       ├── actors/
│   │       ├── scores/
│   │       ├── drafts/
│   │       ├── wrap-up/
│   │       ├── upload/
│   │       └── export/
│   ├── components/
│   │   ├── ActorCard.tsx    # 卡片/列表两种视图
│   │   ├── StarRating.tsx
│   │   ├── HouseRoleSelect.tsx
│   │   ├── NoteEditor.tsx   # Tag + 自定义文本
│   │   └── Pagination.tsx   # 支持每页数/编号区间两种模式
│   └── lib/
│       ├── db.ts            # Prisma client 单例
│       ├── auth.ts          # 简单 session 工具
│       └── storage.ts       # 文件读写（后续替换为 OSS）
├── uploads/                 # 本地文件存储（gitignore）
├── next.config.ts
└── package.json
```

---

## 扩展性预留

| 现在 | 未来替换点 |
|------|-----------|
| SQLite | 改 `prisma/schema.prisma` 的 `provider` 为 `postgresql` |
| 本地磁盘 | 改 `src/lib/storage.ts` 的实现为 S3/阿里云 OSS |
| 轮询查看他人打分 | 改为 WebSocket 或 SSE |
| 无鉴权 URL 区分角色 | 接入公司 SSO/OAuth |

---

## 实施顺序

1. 初始化 Next.js 项目 + Prisma schema + seed 数据
2. 演员签到功能（QR Code 路由 + 表单 + 上传）
3. 导演登录 + 打分主界面
4. Casting 汇总视图 + 导出
