import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import useAgentEventStream from 'hooks/useAgentEventStream';
import agentApi from 'api/agentApi';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme, alpha } from '@mui/material/styles';
import { IconX, IconSettings, IconEye, IconEyeOff, IconCheck, IconAlertCircle, IconPlayerPlay, IconRefresh } from '@tabler/icons-react';

// design tokens — same source as palette.jsx
import C from 'assets/scss/_themes-vars.module.scss';

// ── Status color map (from theme palette) ─────────────────────────────────────
const STATUS_COLOR = {
  online: C.successDark,
  task: C.warningDark,
  idle: C.grey500,
  error: C.errorMain,
};
const STATUS_LABEL = { online: 'Running', task: 'Processing', idle: 'Idle', error: 'Error' };

// ── LLM provider catalog ──────────────────────────────────────────────────────
//  detectProvider() inspects the API key prefix; falls back to dropdown if unknown.
//  Order matters: 'sk-ant-' must be checked BEFORE 'sk-' (OpenAI's prefix).
const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', prefixes: ['sk-ant-'], color: '#d97757' },
  { id: 'openai', name: 'OpenAI', prefixes: ['sk-proj-', 'sk-'], color: '#10a37f' },
  { id: 'google', name: 'Google Gemini', prefixes: ['AIza'], color: '#4285f4' },
  { id: 'xai', name: 'xAI (Grok)', prefixes: ['xai-'], color: '#000000' },
];

// Mock model catalog. TODO: replace with BE proxy `GET /api/agents/models?provider=...`
// once backend is ready — calling provider APIs directly from browser exposes the key
// and runs into CORS for OpenAI/Anthropic.
const MOCK_MODELS = {
  anthropic: [
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', note: 'Most intelligent' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', note: 'Balanced' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', note: 'Fastest' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', note: '' },
    { id: 'claude-haiku-3-5', label: 'Claude Haiku 3.5', note: '' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', note: 'Most capable' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'Fast & cheap' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', note: '' },
    { id: 'o1-preview', label: 'o1 Preview', note: 'Reasoning' },
    { id: 'o1-mini', label: 'o1 mini', note: '' },
  ],
  google: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', note: '' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'Recommended' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', note: '' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', note: '' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', note: '' },
  ],
  xai: [
    { id: 'grok-2', label: 'Grok 2', note: '' },
    { id: 'grok-2-mini', label: 'Grok 2 mini', note: '' },
    { id: 'grok-beta', label: 'Grok Beta', note: '' },
  ],
};

function detectProvider(apiKey) {
  if (!apiKey || apiKey.length < 4) return null;
  for (const p of PROVIDERS) {
    if (p.prefixes.some((prefix) => apiKey.startsWith(prefix))) return p.id;
  }
  return null;
}

function inferProviderFromModel(model) {
  if (!model) return null;
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('gemini')) return 'google';
  if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
  if (model.startsWith('grok')) return 'xai';
  return null;
}

// Load model list for a provider. Mocked with 320ms delay; swap to BE call later.
async function loadModelsFromKey(provider /* , apiKey */) {
  await new Promise((r) => setTimeout(r, 320));
  return MOCK_MODELS[provider] || [];
}

// ── Vietnamese label + hint map for config fields ─────────────────────────────
const CONFIG_LABELS = {
  apiKey:               { label: 'API Key',                  hint: 'Khóa xác thực LLM — bỏ trống nếu server dùng Vertex AI / ADC' },
  model:                { label: 'Model LLM',                hint: 'Model được dùng để xử lý request của agent này' },
  botToken:             { label: 'Zalo Bot Token',           hint: 'Access token lấy từ Zalo OA Admin Portal' },
  webhookSecret:        { label: 'Webhook Secret',           hint: 'Secret xác minh chữ ký webhook từ Zalo' },
  adminChatId:          { label: 'Admin Chat ID',            hint: 'Chat ID admin nhận thông báo chủ động (xem trong log webhook)' },
  senderEmail:          { label: 'Email gửi thư',            hint: 'Địa chỉ Gmail dùng để gửi — cần bật 2FA trước' },
  appPassword:          { label: 'Gmail App Password',       hint: 'Mật khẩu ứng dụng — tạo tại myaccount.google.com/apppasswords' },
  adminEmail:           { label: 'Email nhận thông báo',     hint: 'Email admin nhận daily report và alert từ hệ thống' },
  dbUrl:                { label: 'Database URL',             hint: 'Chuỗi kết nối Turso / libSQL' },
  authToken:            { label: 'Auth Token',               hint: 'Token xác thực — lấy từ Turso dashboard' },
  tables:               { label: 'Bảng dữ liệu',            hint: 'Danh sách bảng hiện có trong database' },
  consolidateEveryHours:{ label: 'Chu kỳ consolidate (h)',   hint: 'Tần suất gộp raw memory sang consolidated (mặc định 24h)' },
  scheduleHours:        { label: 'Chu kỳ lịch (giờ)',        hint: 'Tần suất tự động chạy qua APScheduler' },
  chunkSize:            { label: 'Chunk size',               hint: 'Số ký tự mỗi đoạn khi tách văn bản để embed' },
  chunkOverlap:         { label: 'Chunk overlap',            hint: 'Số ký tự lặp giữa các chunk liền kề' },
  collection:           { label: 'Qdrant collection',        hint: 'Tên collection trong Qdrant lưu dữ liệu crawl' },
  crawlJobId:           { label: 'Crawl Job ID',             hint: 'ID của APScheduler job — dùng để cancel / reschedule' },
};

// ── Agent nodes ───────────────────────────────────────────────────────────────
const AGENTS = [
  {
    id: 'orchestrator', name: 'Orchestrator',
    role: 'Router & Multimodal LLM',
    gradient: [C.primaryMain, C.primary800],
    x: 700, y: 235, status: 'online',
    description: 'Router chính — nhận message + ảnh inline, phân loại intent, delegate sang Analytics/Management qua function calling. Đọc cache (phiên hiện tại) + memories raw + consolidated làm context. Hỗ trợ RAG search và internet search.',
    capabilities: [
      'Multimodal: text + image bytes (Gemini vision)',
      'Function calling: management / analytics agent',
      'RAG search qua Qdrant',
      'Web search qua Google CSE',
      '3-layer memory: cache + memories raw + consolidated',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash' },
    toolsCount: 4,
    stats: { callsToday: 142 },
  },
  {
    id: 'analytics', name: 'Analytics',
    role: 'Business Intelligence',
    gradient: [C.secondaryMain, C.secondaryDark],
    x: 274, y: 435, status: 'online',
    description: 'Phân tích dữ liệu kinh doanh: doanh thu, đơn hàng, sản phẩm, khách hàng, đặt bàn, AI insights.',
    capabilities: [
      'Báo cáo doanh thu theo period',
      'Phân tích đơn hàng & top sản phẩm',
      'Customer segmentation & VIP',
      'AI insights & recommendations',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash' },
    toolsCount: 20,
    stats: { callsToday: 38 },
  },
  {
    id: 'management', name: 'Management',
    role: 'CRUD Operations',
    gradient: [C.primary200, C.primaryDark],
    x: 1126, y: 435, status: 'task',
    description: 'CRUD toàn bộ dữ liệu nhà hàng: sản phẩm, danh mục, combo, banner, thông báo, đơn hàng, voucher, người dùng, tag.',
    capabilities: [
      'CRUD Products / Combos / Categories',
      'Quản lý Orders & status flow',
      'Voucher & Banner management',
      'User & Notification handling',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash' },
    toolsCount: 47,
    stats: { callsToday: 76 },
  },
  {
    id: 'image_describer', name: 'Image Describer',
    role: 'Vision Caption Worker',
    gradient: [C.grey600, C.grey900],
    x: 321, y: 638, status: 'online',
    description: 'Background per-turn worker. Sau khi orchestrator trả lời, gọi Gemini Flash vision để mô tả ảnh thành text tiếng Việt (~30-60 từ), rồi thay bytes trong cache bằng text. Bytes KHÔNG BAO GIỜ chạm Turso.',
    capabilities: [
      'Vision caption qua Gemini 2.5 Flash',
      'Replace image bytes → text trong cache',
      'Concurrent describe nhiều ảnh / turn',
      'Fallback "không thể mô tả ảnh" khi fail',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash' },
    toolsCount: 0,
    stats: { callsToday: 24 },
  },
  {
    id: 'topic_classifier', name: 'Topic Classifier',
    role: 'Task Classifier (background)',
    gradient: [C.grey700, C.grey900],
    x: 575, y: 638, status: 'online',
    description: 'Background per-turn worker. Phân loại mỗi lượt chat thành topic + flag is_task để hiển thị Task Pipeline. Chạy sau khi orchestrator trả lời, ghi kết quả vào bảng tasks (Turso).',
    capabilities: [
      'Phân loại topic của message + reply',
      'Flag is_task để Task Pipeline hiển thị',
      'Finalize classification trên bảng tasks',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash' },
    toolsCount: 0,
    stats: { callsToday: 142 },
  },
  {
    id: 'consolidate', name: 'Consolidate',
    role: 'Memory Compactor (cron tự động)',
    gradient: [C.secondary200, C.secondary800],
    x: 1079, y: 638, status: 'idle',
    description: 'Cron 24h. Đọc raw_message từ memories table (đã flush từ cache khi evict), 1 LLM call để extract + nén thành nhiều consolidated summary (mỗi entity/topic 1 row), lưu vào consolidated_memories rồi xoá source rows.',
    capabilities: [
      'Đọc memories raw → extract + nén bằng 1 LLM call',
      'Tạo nhiều consolidated summary / user / lần chạy',
      'Xoá source rows sau khi consolidate thành công',
      'Trigger định kỳ qua APScheduler',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash', scheduleHours: 24 },
    toolsCount: 0,
    stats: { callsToday: 1 },
  },
  {
    id: 'crawl_agent', name: 'Crawl Agent',
    role: 'Web Crawler & Qdrant Embedder',
    gradient: ['#2e7d32', '#145214'],
    x: 830, y: 638, status: 'idle',
    description: 'Scheduled background worker. Crawl dữ liệu từ web (menu nhà hàng, đánh giá, tin tức ẩm thực) mỗi 24h, chunk + embed vào Qdrant collection restaurant_knowledge để phục vụ RAG search. Hỗ trợ trigger thủ công qua API.',
    capabilities: [
      'Crawl HTML từ danh sách URLs cấu hình sẵn',
      'Parse + clean text, tách chunk (500 chars, 50 overlap)',
      'Batch embed qua Embedding model (768-dim)',
      'Upsert chunks vào Qdrant với metadata URL + timestamp',
      'Trigger thủ công qua POST /agents/crawl/run',
      'Log kết quả crawl vào Turso (pages, chunks indexed)',
    ],
    config: {
      targetUrls: [
        'https://www.foody.vn/ho-chi-minh/chuyen-muc/do-an',
        'https://www.grab.com/vn/food/',
        'https://bep.vn/tin-tuc',
        'https://www.nhahangviet.vn/tin-tuc',
        'https://www.ngonaz.com/tin-tuc',
      ],
      chunkSize: 500,
      chunkOverlap: 50,
      collection: 'restaurant_knowledge',
      scheduleHours: 24,
      crawlJobId: 'crawl_agent_job',
    },
    toolsCount: 0,
    stats: { callsToday: 1 },
  },
];

// ── Tool bundle nodes ─────────────────────────────────────────────────────────
const TOOL_BUNDLES = [
  {
    id: 'tools_analytics', parentId: 'analytics', name: 'Analytics Tools', countLabel: '20 tools',
    role: 'Tool registry của Analytics agent',
    description: 'Tập hợp 20 tools mà Analytics agent có thể gọi để truy vấn BE /api/analytics/* và shared read endpoints.',
    x: 64, y: 530, r: 34,
    gradient: [C.secondaryMain, C.secondaryDark],
    toolGroups: [
      {
        label: 'Analytics API',
        tools: [
          { n: 'get_analytics_summary', fn: 'Tổng quan KPIs theo period (doanh thu, đơn, khách)' },
          { n: 'get_revenue_analytics', fn: 'Báo cáo doanh thu chi tiết theo period' },
          { n: 'get_order_analytics', fn: 'Phân tích đơn hàng: trạng thái, hủy, hoàn thành' },
          { n: 'get_product_analytics', fn: 'Top sản phẩm bán chạy & hiệu suất' },
          { n: 'get_customer_analytics', fn: 'Phân khúc khách, VIP, retention' },
          { n: 'get_booking_analytics', fn: 'Thống kê đặt bàn & lịch sử' },
          { n: 'get_analytics_insights', fn: 'AI insights & khuyến nghị business' },
        ],
      },
      {
        label: 'Shared Read',
        tools: [
          { n: 'get_search_products', fn: 'Tìm/list sản phẩm để bổ sung context' },
          { n: 'get_all_combos', fn: 'Lấy danh sách combo' },
          { n: 'get_categories', fn: 'Lấy danh mục sản phẩm' },
          { n: 'get_all_customers', fn: 'Danh sách khách để phân tích sâu' },
          { n: 'get_all_tags', fn: 'Danh sách tag để cross-reference' },
          { n: 'get_all_orders_admin', fn: 'Lấy đơn hàng (filter theo status/period)' },
          { n: 'get_order_detail_admin', fn: 'Chi tiết đơn hàng theo id' },
          { n: 'get_all_vouchers_admin', fn: 'Danh sách voucher (đánh giá hiệu quả)' },
          { n: 'get_voucher_by_id', fn: 'Chi tiết voucher theo id' },
          { n: 'get_order_reviews', fn: 'Reviews của 1 đơn hàng' },
          { n: 'get_reviews_by_order', fn: 'Reviews đầy đủ theo order' },
          { n: 'get_review_by_order_item', fn: 'Review của 1 line-item' },
          { n: 'search_internet', fn: 'Tìm thông tin bổ sung từ Google CSE' },
        ],
      },
    ],
  },
  {
    id: 'tools_management', parentId: 'management', name: 'Management Tools', countLabel: '47 tools',
    role: 'Tool registry của Management agent',
    description: 'Tập hợp 47 CRUD tools cho banner, category, combo, product, order, voucher, tag, user, notification.',
    x: 1336, y: 530, r: 34,
    gradient: [C.primary200, C.primaryDark],
    toolGroups: [
      {
        label: 'Banner',
        tools: [
          { n: 'get_all_banners', fn: 'Lấy toàn bộ banner (vị trí, ảnh)' },
          { n: 'get_banner_by_id', fn: 'Chi tiết banner theo id' },
          { n: 'create_banner', fn: 'Tạo banner ở vị trí trống' },
          { n: 'update_banner', fn: 'Cập nhật url/position banner' },
          { n: 'delete_banner', fn: 'Xóa banner theo id' },
        ],
      },
      {
        label: 'Category',
        tools: [
          { n: 'get_categories', fn: 'Lấy danh sách danh mục' },
          { n: 'create_category', fn: 'Tạo danh mục mới (kèm ảnh)' },
          { n: 'update_category', fn: 'Cập nhật tên/ảnh danh mục' },
          { n: 'delete_category', fn: 'Xóa danh mục theo id' },
        ],
      },
      {
        label: 'Combo',
        tools: [
          { n: 'get_all_combos', fn: 'Lấy danh sách combo' },
          { n: 'get_combo_by_id', fn: 'Chi tiết combo theo id' },
          { n: 'create_combo', fn: 'Tạo combo mới (gồm sản phẩm + giá)' },
          { n: 'update_combo', fn: 'Cập nhật combo' },
          { n: 'delete_combo', fn: 'Xóa combo' },
          { n: 'toggle_combo_status', fn: 'Bật/tắt trạng thái combo' },
        ],
      },
      {
        label: 'Product',
        tools: [
          { n: 'get_search_products', fn: 'Tìm/list sản phẩm theo từ khóa' },
          { n: 'create_product', fn: 'Tạo sản phẩm mới' },
          { n: 'update_product', fn: 'Cập nhật sản phẩm' },
          { n: 'delete_product', fn: 'Xóa sản phẩm' },
          { n: 'toggle_product_status', fn: 'Bật/tắt trạng thái bán' },
        ],
      },
      {
        label: 'Order',
        tools: [
          { n: 'get_all_orders_admin', fn: 'Danh sách đơn (filter status/period)' },
          { n: 'get_order_detail_admin', fn: 'Chi tiết đơn hàng theo id' },
          { n: 'update_order_status', fn: 'Cập nhật trạng thái đơn (PENDING/PAID/...)' },
          { n: 'delete_order', fn: 'Xóa đơn hàng' },
          { n: 'get_order_reviews', fn: 'Reviews của đơn hàng' },
        ],
      },
      {
        label: 'Voucher',
        tools: [
          { n: 'get_public_vouchers', fn: 'Voucher public cho khách' },
          { n: 'get_all_vouchers_admin', fn: 'Toàn bộ voucher (admin)' },
          { n: 'get_voucher_by_id', fn: 'Chi tiết voucher theo id' },
          { n: 'get_voucher_by_code', fn: 'Tra voucher theo code' },
          { n: 'create_voucher', fn: 'Tạo voucher (giảm giá %, max, hạn)' },
          { n: 'update_voucher', fn: 'Cập nhật voucher' },
          { n: 'delete_voucher', fn: 'Xóa voucher' },
          { n: 'toggle_voucher_status', fn: 'Bật/tắt voucher' },
        ],
      },
      {
        label: 'Tag',
        tools: [
          { n: 'get_all_tags', fn: 'Lấy danh sách tag' },
          { n: 'get_tag_by_id', fn: 'Chi tiết tag theo id' },
          { n: 'create_tag', fn: 'Tạo tag mới' },
          { n: 'update_tag', fn: 'Cập nhật tag' },
          { n: 'delete_tag', fn: 'Xóa tag' },
        ],
      },
      {
        label: 'User & Notification',
        tools: [
          { n: 'get_all_customers', fn: 'Danh sách khách hàng' },
          { n: 'update_customer_status', fn: 'Cập nhật trạng thái khách (kích hoạt/khóa)' },
          { n: 'get_all_notifications_admin', fn: 'Toàn bộ thông báo (admin)' },
          { n: 'create_notification', fn: 'Tạo thông báo gửi user' },
          { n: 'get_my_notifications', fn: 'Thông báo của user hiện tại' },
        ],
      },
      {
        label: 'Review & Other',
        tools: [
          { n: 'get_reviews_by_order', fn: 'Toàn bộ review của 1 đơn' },
          { n: 'get_review_by_order_item', fn: 'Review theo line-item' },
          { n: 'login', fn: 'Đăng nhập lấy access token' },
          { n: 'search_internet', fn: 'Google search bổ sung context' },
        ],
      },
    ],
  },
];

// ── Shared infrastructure — interactive ───────────────────────────────────────
const INFRA = [
  {
    id: 'qdrant', name: 'Qdrant', sub: 'Vector DB',
    role: 'Vector storage cho RAG document search',
    description: 'Lưu trữ embeddings của documents, hỗ trợ semantic search qua cosine similarity. Sử dụng bởi cả 3 agents để truy xuất context.',
    config: {
      endpoint: 'https://qdrant.siupo.local:6333',
      apiKey: '••••••••••••',
      collection: 'restaurant_docs',
      topK: 5,
      scoreThreshold: 0.7,
    },
    x: 188, y: 278, r: 28, grad: [C.grey600, C.grey900], icon: 'qdrant', shared: true,
  },
  {
    id: 'google', name: 'Google Search', sub: 'Search API',
    role: 'Internet search qua Custom Search API',
    description: 'Tìm kiếm thông tin từ internet để bổ sung context. Sử dụng Google Programmable Search Engine (Custom CSE).',
    config: {
      apiKey: '••••••••••••',
      searchEngineId: 'cse_id_xxx',
      maxResults: 5,
      language: 'vi',
      safeSearch: 'moderate',
    },
    x: 1212, y: 278, r: 28, grad: [C.grey600, C.grey900], icon: 'google', shared: true,
  },
  {
    id: 'cache', name: 'Conversation Cache', sub: 'RAM (in-process)',
    role: 'Phiên hiện tại — single source of truth',
    description: 'In-process dict trong AiAgent-service. Lưu messages của phiên hiện tại (text + image bytes), TTL 30 phút từ last_access. Không bao giờ ghi per-turn vào Turso. Khi cleanup_expired_with_flush chạy (5 phút/lần), các session quá hạn được flush sang memories rồi GC.',
    config: {
      ttlMinutes: 30,
      cleanupIntervalMin: 5,
      flushOnEviction: 'true',
      imageBytesLifetime: 'until describe_image done',
    },
    x: 460, y: 705, r: 28, grad: [C.grey500, C.grey700], icon: 'cache', shared: false,
  },
  {
    id: 'turso', name: 'Memory Store', sub: 'Turso / libSQL',
    role: 'Persistent storage (raw + consolidated + tasks + files)',
    description: '4 bảng: memories (raw_message từ phiên đã evict, chưa nén), consolidated_memories (long-term sau 24h consolidate), tasks (Task Pipeline log), files (registry document Qdrant). Image bytes KHÔNG BAO GIỜ chạm Turso — chỉ text mô tả.',
    config: {
      dbUrl: 'libsql://siupo-memory.turso.io',
      authToken: '••••••••••••',
      tables: 'memories, consolidated_memories, tasks, files',
      consolidateEveryHours: 24,
    },
    x: 700, y: 705, r: 28, grad: [C.grey700, C.grey900], icon: 'db', shared: false,
  },
];

const CHANNELS = [
  {
    id: 'zalo', name: 'Zalo', x: 471, y: 58, r: 22, color: '#00B14F',
    role: 'Messaging channel — nhận & gửi tin nhắn Zalo OA',
    description: 'Zalo Official Account webhook nhận tin nhắn từ khách hàng và forward sang Orchestrator để xử lý. Hỗ trợ text, hình ảnh và sticker.',
    capabilities: [
      'Nhận text / image / sticker từ Zalo OA webhook',
      'Forward message sang Orchestrator (chat_service.chat)',
      'Trả lời khách qua Zalo Bot API',
      'Proactive notification đến admin qua adminChatId',
    ],
    config: {
      botToken: '',
      webhookSecret: '',
      adminChatId: '',
    },
  },
  {
    id: 'gmail', name: 'Gmail', x: 929, y: 58, r: 22, color: '#EA4335',
    role: 'Notification channel — gửi email thông báo cho admin',
    description: 'Gmail SMTP gửi email thông báo cho admin khi Orchestrator gọi tool send_email_notification (daily report, alert, v.v.).',
    capabilities: [
      'Gửi daily review report qua email',
      'Gửi alert khi phát hiện sự kiện quan trọng',
      'Tool send_email_notification khả dụng cho Orchestrator',
    ],
    config: {
      senderEmail: '',
      appPassword: '',
      adminEmail: '',
    },
  },
];

const SCHEDULER_NODE = {
  id: 'scheduler',
  name: 'APScheduler',
  role: 'Trigger định kỳ — 3 jobs (consolidate 24h + cache 5m + crawl 24h)',
  description: 'Background scheduler chạy bên trong AiAgent-service (FastAPI lifespan). Quản lý 3 cron job: consolidate_agent_job (24h gộp memories raw), cache_cleanup_job (5 phút quét cache TTL hết hạn → flush sang Turso) và crawl_agent_job (24h crawl web → embed vào Qdrant).',
  capabilities: [
    'Kích hoạt run_consolidate_agent mỗi 24h',
    'Kích hoạt cleanup_expired_with_flush mỗi 5 phút',
    'Kích hoạt run_crawl_agent mỗi 24h',
    'Đăng ký flush callback lúc startup',
    'Tự dừng khi FastAPI shutdown',
  ],
  config: {
    consolidateHours: 24,
    cacheCleanupMinutes: 5,
    crawlHours: 24,
    consolidateJobId: 'consolidate_agent_job',
    cacheCleanupJobId: 'cache_cleanup_job',
    crawlJobId: 'crawl_agent_job',
    triggerType: 'interval',
  },
  x: 1265, y: 612, r: 19,
  gradient: [C.warningDark, C.warningMain],
};

const CONNECTIONS = [
  // Sub-agent delegation (function calling)
  { from: 'orchestrator', to: 'analytics', type: 'primary', fR: 52, tR: 52 },
  { from: 'orchestrator', to: 'management', type: 'primary', fR: 52, tR: 52 },
  // Tool bundles
  { from: 'analytics', to: 'tools_analytics', type: 'tools', fR: 52, tR: 34 },
  { from: 'management', to: 'tools_management', type: 'tools', fR: 52, tR: 34 },
  // RAG + Web search (orchestrator + sub-agents có quyền search_documents/search_internet)
  { from: 'orchestrator', to: 'qdrant', type: 'infra', fR: 52, tR: 28 },
  { from: 'analytics', to: 'qdrant', type: 'infra', fR: 52, tR: 28 },
  { from: 'management', to: 'qdrant', type: 'infra', fR: 52, tR: 28 },
  { from: 'orchestrator', to: 'google', type: 'infra', fR: 52, tR: 28 },
  { from: 'analytics', to: 'google', type: 'infra', fR: 52, tR: 28 },
  { from: 'management', to: 'google', type: 'infra', fR: 52, tR: 28 },
  // Memory reads per turn
  { from: 'orchestrator', to: 'cache', type: 'secondary', fR: 52, tR: 28 },
  { from: 'orchestrator', to: 'turso', type: 'secondary', fR: 52, tR: 28 },
  // Background per-turn workers (fork from orchestrator)
  { from: 'orchestrator', to: 'image_describer', type: 'infra', fR: 52, tR: 52 },
  { from: 'orchestrator', to: 'topic_classifier', type: 'infra', fR: 52, tR: 52 },
  { from: 'image_describer', to: 'cache', type: 'infra', fR: 52, tR: 28 },
  { from: 'topic_classifier', to: 'turso', type: 'infra', fR: 52, tR: 28 },
  // Cache flush + consolidate
  { from: 'cache', to: 'turso', type: 'infra', fR: 28, tR: 28 },
  { from: 'consolidate', to: 'turso', type: 'infra', fR: 52, tR: 28 },
  // Scheduler triggers (3 jobs)
  { from: 'scheduler', to: 'consolidate', type: 'scheduled', fR: 19, tR: 52 },
  { from: 'scheduler', to: 'cache', type: 'scheduled', fR: 19, tR: 28 },
  { from: 'scheduler', to: 'crawl_agent', type: 'scheduled', fR: 19, tR: 52 },
  // Crawl agent outputs
  { from: 'crawl_agent', to: 'qdrant', type: 'infra', fR: 52, tR: 28 },
  { from: 'crawl_agent', to: 'turso', type: 'infra', fR: 52, tR: 28 },
  // Channel connections
  { from: 'zalo', to: 'orchestrator', type: 'primary', fR: 22, tR: 52 },
  { from: 'gmail', to: 'orchestrator', type: 'secondary', fR: 22, tR: 52 },
];

const NODE_MAP = {};
[...AGENTS, ...INFRA, ...TOOL_BUNDLES, ...CHANNELS, SCHEDULER_NODE].forEach((n) => {
  NODE_MAP[n.id] = n;
});

// ── Icons ─────────────────────────────────────────────────────────────────────
function AgentIcon({ id }) {
  const w = 'rgba(255,255,255,0.95)', m = 'rgba(255,255,255,0.60)', s = 'rgba(255,255,255,0.32)';
  switch (id) {
    case 'orchestrator': return (
      <g>
        <polygon points="0,-7 6,-3.5 6,3.5 0,7 -6,3.5 -6,-3.5" fill={w} />
        <polygon points="0,-3.5 3,-1.75 3,1.75 0,3.5 -3,1.75 -3,-1.75" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        <line x1="-5" y1="-5" x2="-11" y2="-11" stroke={m} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="-5" x2="11" y2="-11" stroke={m} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="7" x2="0" y2="13" stroke={m} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="-12" cy="-12" r="2.5" fill={m} /><circle cx="12" cy="-12" r="2.5" fill={m} /><circle cx="0" cy="14" r="2.5" fill={m} />
      </g>
    );
    case 'analytics': return (
      <g>
        <line x1="-12" y1="7" x2="11" y2="7" stroke={m} strokeWidth="1.2" strokeLinecap="round" />
        <rect x="-11" y="2" width="5" height="5" rx="1" fill={s} />
        <rect x="-3" y="-3" width="5" height="10" rx="1" fill={m} />
        <rect x="5" y="-8" width="5" height="15" rx="1" fill={w} />
        <polyline points="-8.5,2 -0.5,-3 7.5,-9" fill="none" stroke={w} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="-9" r="2.5" fill={w} />
      </g>
    );
    case 'management': return (
      <g>
        <rect x="-10" y="-12" width="20" height="24" rx="2.5" fill="none" stroke={w} strokeWidth="1.5" />
        <rect x="-7" y="-9.5" width="14" height="2.5" rx="1.25" fill={s} /><circle cx="3" cy="-8.25" r="3" fill={w} />
        <rect x="-7" y="-3" width="14" height="2.5" rx="1.25" fill={s} /><circle cx="-1" cy="-1.75" r="3" fill={m} />
        <polyline points="-6,5 -2,9 6,2" fill="none" stroke={w} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
    case 'image_describer': return (
      <g>
        {/* camera body */}
        <rect x="-12" y="-6" width="24" height="16" rx="2.5" fill="none" stroke={w} strokeWidth="1.5" />
        {/* viewfinder bump */}
        <rect x="-5" y="-9" width="10" height="3.5" rx="1" fill={m} />
        {/* lens outer */}
        <circle cx="0" cy="2.5" r="5" fill="none" stroke={w} strokeWidth="1.5" />
        {/* lens inner */}
        <circle cx="0" cy="2.5" r="2" fill={w} />
        {/* indicator dot */}
        <circle cx="-8.5" cy="-2.5" r="1.2" fill={s} />
        {/* spark above — caption sparkle */}
        <line x1="-12" y1="-12" x2="-8" y2="-12" stroke={m} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="-10" y1="-14" x2="-10" y2="-10" stroke={m} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    );
    case 'topic_classifier': return (
      <g>
        {/* tag shape */}
        <path d="M-11,-3 L-3,-11 L11,-11 L11,3 L3,11 L-11,-3 Z"
          fill="none" stroke={w} strokeWidth="1.5" strokeLinejoin="round" />
        {/* tag hole */}
        <circle cx="6" cy="-6" r="2" fill="none" stroke={w} strokeWidth="1.3" />
        {/* checkmark inside */}
        <polyline points="-6,0 -2,4 5,-3" fill="none" stroke={w} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* small dots = labels */}
        <circle cx="-9" cy="6" r="1.2" fill={m} />
        <circle cx="-5" cy="9" r="1.2" fill={s} />
      </g>
    );
    case 'consolidate': return (
      <g>
        <circle cx="0" cy="-7" r="6.5" fill="none" stroke={w} strokeWidth="1.5" />
        <line x1="0" y1="-7" x2="0" y2="-11.5" stroke={w} strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="-7" x2="4.5" y2="-5.5" stroke={w} strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="-7" r="1.5" fill={w} />
        <path d="M-10,2 Q-8,8 0,11" fill="none" stroke={m} strokeWidth="2" strokeLinecap="round" />
        <path d="M10,2 Q8,8 0,11" fill="none" stroke={m} strokeWidth="2" strokeLinecap="round" />
        <circle cx="-10" cy="2" r="2.5" fill={s} /><circle cx="10" cy="2" r="2.5" fill={s} /><circle cx="0" cy="11" r="3" fill={w} />
      </g>
    );
    case 'crawl_agent': return (
      <g>
        {/* Globe outline */}
        <circle cx="0" cy="-2" r="9.5" fill="none" stroke={w} strokeWidth="1.4" />
        {/* Latitude lines */}
        <line x1="-9.5" y1="-2" x2="9.5" y2="-2" stroke={m} strokeWidth="0.9" />
        <line x1="-8" y1="-6" x2="8" y2="-6" stroke={m} strokeWidth="0.7" />
        <line x1="-8" y1="2" x2="8" y2="2" stroke={m} strokeWidth="0.7" />
        {/* Meridian */}
        <ellipse cx="0" cy="-2" rx="4.5" ry="9.5" fill="none" stroke={m} strokeWidth="0.9" />
        {/* Scan cursor on globe */}
        <circle cx="6" cy="-8" r="2.2" fill={w} />
        <line x1="0" y1="-2" x2="6" y2="-8" stroke={w} strokeWidth="1.4" strokeLinecap="round" />
        {/* Embed arrow down — data flowing into Qdrant */}
        <line x1="0" y1="8" x2="0" y2="13" stroke={w} strokeWidth="1.8" strokeLinecap="round" />
        <polyline points="-3.5,10 0,13.5 3.5,10" fill="none" stroke={w} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
    default: return null;
  }
}

function InfraIcon({ type }) {
  const w = 'rgba(255,255,255,0.95)', m = 'rgba(255,255,255,0.60)';
  switch (type) {
    case 'qdrant': return (
      <g>
        <polygon points="0,-10 9,-5 9,5 0,10 -9,5 -9,-5" fill="none" stroke={w} strokeWidth="1.5" />
        <line x1="-5" y1="0" x2="5" y2="0" stroke={w} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="-6" x2="0" y2="6" stroke={w} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="2.5" fill={w} />
      </g>
    );
    case 'google': return (
      <g>
        <circle cx="-1" cy="-2" r="7" fill="none" stroke={w} strokeWidth="1.5" />
        <line x1="5" y1="4" x2="9.5" y2="8.5" stroke={w} strokeWidth="2.2" strokeLinecap="round" />
      </g>
    );
    case 'db': return (
      <g>
        <ellipse cx="0" cy="-6" rx="9" ry="3" fill="none" stroke={w} strokeWidth="1.3" />
        <line x1="-9" y1="-6" x2="-9" y2="6" stroke={w} strokeWidth="1.3" />
        <line x1="9" y1="-6" x2="9" y2="6" stroke={w} strokeWidth="1.3" />
        <ellipse cx="0" cy="6" rx="9" ry="3" fill="none" stroke={w} strokeWidth="1.3" />
        <ellipse cx="0" cy="0" rx="9" ry="3" fill="none" stroke={m} strokeWidth="1" />
      </g>
    );
    case 'cache': return (
      <g>
        {/* RAM stick body */}
        <rect x="-10" y="-6" width="20" height="11" rx="1" fill="none" stroke={w} strokeWidth="1.4" />
        {/* chips */}
        <rect x="-8.5" y="-4.5" width="4.5" height="8" rx="0.6" fill={m} />
        <rect x="-2.25" y="-4.5" width="4.5" height="8" rx="0.6" fill={w} />
        <rect x="4" y="-4.5" width="4.5" height="8" rx="0.6" fill={m} />
        {/* connector pins */}
        <line x1="-8" y1="6" x2="-8" y2="9" stroke={w} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="-3" y1="6" x2="-3" y2="9" stroke={w} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="3" y1="6" x2="3" y2="9" stroke={w} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8" y1="6" x2="8" y2="9" stroke={w} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    );
    default: return null;
  }
}

// ── Status ring ───────────────────────────────────────────────────────────────
const STATUS_CFG = {
  online: { r1: { dash: '16 6', w: 2.5, dur: '4.5s', dir: 1, op: 0.85 }, r2: null },
  task: { r1: { dash: '10 4', w: 3, dur: '1.2s', dir: 1, op: 0.95 }, r2: { dash: '4 10', w: 1.5, dr: 8, dur: '0.9s', dir: -1, op: 0.55 } },
  idle: { r1: { dash: '4 12', w: 1.5, dur: null, dir: 0, op: 0.32 }, r2: null },
  error: { r1: { dash: '22 4', w: 2.5, dur: null, dir: 0, op: 0.80 }, r2: null },
};

function StatusRing({ agent }) {
  const { x, y, status } = agent;
  const R = 64, cfg = STATUS_CFG[status] || STATUS_CFG.idle;
  const color = STATUS_COLOR[status] || STATUS_COLOR.idle;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={x} cy={y} r={R} fill="none" stroke={color} strokeWidth={cfg.r1.w}
        strokeDasharray={cfg.r1.dash} strokeLinecap="round" opacity={cfg.r1.op}>
        {cfg.r1.dur && (
          <animateTransform attributeName="transform" type="rotate"
            from={`${cfg.r1.dir === 1 ? 0 : 360} ${x} ${y}`} to={`${cfg.r1.dir === 1 ? 360 : 0} ${x} ${y}`}
            dur={cfg.r1.dur} repeatCount="indefinite" />
        )}
      </circle>
      {cfg.r2 && (
        <circle cx={x} cy={y} r={R + cfg.r2.dr} fill="none" stroke={color}
          strokeWidth={cfg.r2.w} strokeDasharray={cfg.r2.dash} strokeLinecap="round" opacity={cfg.r2.op}>
          <animateTransform attributeName="transform" type="rotate"
            from={`${cfg.r2.dir === 1 ? 0 : 360} ${x} ${y}`} to={`${cfg.r2.dir === 1 ? 360 : 0} ${x} ${y}`}
            dur={cfg.r2.dur} repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

// ── Edge styles ───────────────────────────────────────────────────────────────
const EDGE_STYLE = {
  primary: { color: C.primaryMain, width: 2, dash: 'none' },
  secondary: { color: C.primary200, width: 1.8, dash: 'none' },
  scheduled: { color: C.warningDark, width: 1.6, dash: 'none' },
  infra: { color: C.grey500, width: 1.4, dash: '5 4' },
  tools: { color: C.grey600, width: 1.6, dash: 'none' },
  future: { color: C.grey300, width: 1.4, dash: '5 5' },
};

function ChevronFlow({ from, to, type, isHot, isHighlighted, anyActive, fR = 52, tR = 52 }) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const sx = from.x + Math.cos(angle) * (fR + 2);
  const sy = from.y + Math.sin(angle) * (fR + 2);
  const ex = to.x - Math.cos(angle) * (tR + 3);
  const ey = to.y - Math.sin(angle) * (tR + 3);
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const midX = (sx + ex) / 2, midY = (sy + ey) / 2;
  const perpX = -dy / len, perpY = dx / len;
  const curve = type === 'primary' ? 22 : type === 'tools' ? 14 : type === 'infra' ? 12 : 14;
  const cpX = (midX + perpX * curve).toFixed(1);
  const cpY = (midY + perpY * curve).toFixed(1);
  const pathD = `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cpX},${cpY} ${ex.toFixed(1)},${ey.toFixed(1)}`;

  const style = EDGE_STYLE[type] || EDGE_STYLE.infra;
  const baseOpacity = anyActive ? (isHighlighted ? 1 : 0.18) : (type === 'future' ? 0.35 : 0.62);
  const baseWidth = isHighlighted ? style.width + 0.6 : style.width;

  const animate = type !== 'future' && (isHot || isHighlighted);
  const count = type === 'primary' ? 6 : type === 'secondary' ? 4 : type === 'scheduled' ? 4 : 3;
  const dur = type === 'primary' ? 1.8 : type === 'secondary' ? 2.6 : type === 'scheduled' ? 3.2 : 2.4;

  return (
    <g style={{ transition: 'opacity 0.35s ease', pointerEvents: 'none' }} opacity={baseOpacity}>
      <path d={pathD} fill="none" stroke={style.color}
        strokeWidth={baseWidth} strokeDasharray={style.dash} strokeLinecap="round" />
      {animate && Array.from({ length: count }).map((_, i) => (
        <path key={i} d="M-5,-4 L0,0 L-5,4" fill="none" stroke={style.color}
          strokeWidth={i === count - 1 ? 2.6 : 1.7} strokeLinecap="round" strokeLinejoin="round"
          opacity={0.35 + (i / Math.max(count - 1, 1)) * 0.6}>
          <animateMotion dur={`${dur}s`} begin={`${(i / count) * dur}s`} repeatCount="indefinite" rotate="auto" path={pathD} />
        </path>
      ))}
    </g>
  );
}

// ── Agent node — no movement on hover, only stroke/glow change ────────────────
function AgentNode({ agent, isHovered, isInFlow, onHover, onLeave, onClick }) {
  const NODE_R = 52;
  const dotColor = STATUS_COLOR[agent.status] || STATUS_COLOR.idle;
  return (
    <g onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <radialGradient id={`grad-${agent.id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={agent.gradient[0]} />
          <stop offset="100%" stopColor={agent.gradient[1]} />
        </radialGradient>
        <filter id={`glow-${agent.id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <StatusRing agent={agent} />

      <circle cx={agent.x} cy={agent.y} r={NODE_R}
        fill={`url(#grad-${agent.id})`} filter={`url(#glow-${agent.id})`}
        stroke={isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.14)'}
        strokeWidth={isHovered ? 2 : 1} />
      <circle cx={agent.x} cy={agent.y} r={NODE_R - 5} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" style={{ pointerEvents: 'none' }} />

      <g transform={`translate(${agent.x},${agent.y - 6})`} style={{ pointerEvents: 'none' }}>
        <AgentIcon id={agent.id} />
      </g>
      <text x={agent.x} y={agent.y + 21} textAnchor="middle"
        fill="rgba(255,255,255,0.95)" fontSize="9.5" fontWeight="700"
        fontFamily="'Roboto Mono',monospace" letterSpacing="0.5" style={{ pointerEvents: 'none' }}>
        {agent.name.toUpperCase()}
      </text>
      <circle cx={agent.x + NODE_R - 9} cy={agent.y - NODE_R + 9} r="5.5"
        fill={dotColor} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" style={{ pointerEvents: 'none' }} />
    </g>
  );
}

// ── Tool bundle node ──────────────────────────────────────────────────────────
function ToolBundleNode({ bundle, isHovered, isLinked, onHover, onLeave, onClick }) {
  const R = bundle.r;
  const lit = isHovered || isLinked;
  return (
    <g onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <radialGradient id={`tbg-${bundle.id}`} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor={bundle.gradient[0]} stopOpacity="0.85" />
          <stop offset="100%" stopColor={bundle.gradient[1]} stopOpacity="0.96" />
        </radialGradient>
        <filter id={`tbglow-${bundle.id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={bundle.x} cy={bundle.y} r={R + 7} fill="none"
        stroke={bundle.gradient[0]} strokeWidth="1" strokeDasharray="4 5"
        opacity={lit ? 0.65 : 0.24} style={{ pointerEvents: 'none' }} />
      <circle cx={bundle.x} cy={bundle.y} r={R}
        fill={`url(#tbg-${bundle.id})`} filter={`url(#tbglow-${bundle.id})`}
        stroke={isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.20)'}
        strokeWidth={isHovered ? 2 : 1} />
      <g transform={`translate(${bundle.x},${bundle.y - 7})`} style={{ pointerEvents: 'none' }}>
        <rect x="-9" y="-8" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.60)" />
        <rect x="2" y="-8" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.95)" />
        <rect x="-9" y="2" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.95)" />
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.60)" />
      </g>
      <text x={bundle.x} y={bundle.y + 22} textAnchor="middle"
        fill="rgba(255,255,255,0.92)" fontSize="7.5" fontWeight="800"
        fontFamily="'Roboto Mono',monospace" letterSpacing="0.3" style={{ pointerEvents: 'none' }}>
        {bundle.countLabel.toUpperCase()}
      </text>
      <text x={bundle.x} y={bundle.y + R + 14} textAnchor="middle"
        fill="rgba(255,255,255,0.55)" fontSize="7" fontFamily="Roboto,sans-serif" style={{ pointerEvents: 'none' }}>
        {bundle.name}
      </text>
    </g>
  );
}

// ── Infra node — interactive ──────────────────────────────────────────────────
function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

function InfraNode({ node, isHovered, isLinked, onHover, onLeave, onClick }) {
  const lit = isHovered || isLinked;
  const outerPts = hexPoints(node.x, node.y, node.r + 5);
  const innerPts = hexPoints(node.x, node.y, node.r);
  return (
    <g onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <radialGradient id={`ig-${node.id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={node.grad[0]} /><stop offset="100%" stopColor={node.grad[1]} />
        </radialGradient>
        <filter id={`iglow-${node.id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points={outerPts} fill="none" stroke={node.grad[0]} strokeWidth="1"
        opacity={lit ? 0.7 : 0.25} style={{ pointerEvents: 'none' }} />
      <polygon points={innerPts} fill={`url(#ig-${node.id})`} filter={`url(#iglow-${node.id})`}
        stroke={isHovered ? 'rgba(255,255,255,0.85)' : node.grad[0]}
        strokeWidth={isHovered ? 1.8 : 0.8}
        opacity={lit ? 1 : 0.85} />
      <g transform={`translate(${node.x},${node.y - 2})`} style={{ pointerEvents: 'none' }}><InfraIcon type={node.icon} /></g>
      <text x={node.x} y={node.y + node.r + 14} textAnchor="middle"
        fill="rgba(255,255,255,0.95)" fontSize="8.5" fontWeight="700" fontFamily="'Roboto Mono',monospace"
        opacity={lit ? 1 : 0.82} style={{ pointerEvents: 'none' }}>
        {node.name}
      </text>
      <text x={node.x} y={node.y + node.r + 24} textAnchor="middle"
        fill="rgba(255,255,255,0.55)" fontSize="7" fontFamily="Roboto,sans-serif" style={{ pointerEvents: 'none' }}>
        {node.sub}
      </text>
    </g>
  );
}

// ── Channel & Scheduler ───────────────────────────────────────────────────────
function ChannelNode({ node, isHovered, onHover, onLeave, onClick }) {
  return (
    <g onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <radialGradient id={`chg-${node.id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={node.color} stopOpacity="0.75" />
          <stop offset="100%" stopColor={node.color} stopOpacity="0.45" />
        </radialGradient>
        <filter id={`chglow-${node.id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={isHovered ? 5 : 3} result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={node.x} cy={node.y} r={node.r + 5} fill="none" stroke={node.color} strokeWidth="1" strokeDasharray="4 4"
        opacity={isHovered ? 0.75 : 0.42} style={{ pointerEvents: 'none' }} />
      <circle cx={node.x} cy={node.y} r={node.r} fill={`url(#chg-${node.id})`} filter={`url(#chglow-${node.id})`}
        stroke={isHovered ? 'rgba(255,255,255,0.85)' : node.color}
        strokeWidth={isHovered ? 2 : 1.2} opacity={isHovered ? 1 : 0.85} />
      <text x={node.x} y={node.y + 4} textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="8" fontWeight="700" fontFamily="Roboto,sans-serif" style={{ pointerEvents: 'none' }}>{node.name}</text>
    </g>
  );
}

function SchedulerNode({ node, isHovered, onHover, onLeave, onClick }) {
  const amber = C.warningDark;
  return (
    <g onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle cx={node.x} cy={node.y} r={node.r + 4} fill="none" stroke={alpha(amber, 0.5)} strokeWidth="1" strokeDasharray="3 3" style={{ pointerEvents: 'none' }}>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`} dur="14s" repeatCount="indefinite" />
      </circle>
      <circle cx={node.x} cy={node.y} r={node.r} fill={C.darkLevel1}
        stroke={isHovered ? 'rgba(255,255,255,0.85)' : amber}
        strokeWidth={isHovered ? 2 : 1.5}
        opacity={isHovered ? 1 : 0.85} />
      <circle cx={node.x} cy={node.y} r={node.r - 4} fill="none" stroke={alpha(amber, 0.3)} strokeWidth="1" style={{ pointerEvents: 'none' }} />
      <line x1={node.x} y1={node.y} x2={node.x} y2={node.y - node.r + 7} stroke={amber} strokeWidth="1.8" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
      <line x1={node.x} y1={node.y} x2={node.x + node.r - 7} y2={node.y} stroke={amber} strokeWidth="1.3" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
      <circle cx={node.x} cy={node.y} r="1.8" fill={amber} style={{ pointerEvents: 'none' }} />
      <text x={node.x} y={node.y + node.r + 13} textAnchor="middle" fill={amber} fontSize="7.5" fontWeight="700" fontFamily="'Roboto Mono',monospace" style={{ pointerEvents: 'none' }}>
        3 jobs · 24h · 5m · 24h
      </text>
    </g>
  );
}

// ── Tooltip — simple: name, role, configurable list, click hint ───────────────
function NodeTooltipContent({ name, role, status, configKeys }) {
  const statusColor = status ? STATUS_COLOR[status] : null;
  return (
    <Box sx={{ p: 0.5, maxWidth: 260 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.4 }}>
        <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.2 }}>
          {name}
        </Typography>
        {status && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, bgcolor: alpha(statusColor, 0.18), px: 0.7, py: 0.2, borderRadius: 0.8 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: statusColor }} />
            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {STATUS_LABEL[status] || status}
            </Typography>
          </Box>
        )}
      </Box>

      <Typography sx={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.5, mb: 0.9 }}>
        {role}
      </Typography>

      {configKeys && configKeys.length > 0 && (
        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.10)', pt: 0.6 }}>
          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.4 }}>
            Configurable
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.35, flexWrap: 'wrap' }}>
            {configKeys.map((k) => (
              <Typography key={k} sx={{
                fontSize: '0.6rem', color: 'rgba(255,255,255,0.85)',
                bgcolor: 'rgba(255,255,255,0.10)', px: 0.6, py: 0.1,
                borderRadius: 0.5, fontFamily: 'monospace',
              }}>
                {k}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Typography sx={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', mt: 0.8, fontStyle: 'italic' }}>
        {configKeys?.includes('crawlJobId') ? 'Click để xem chi tiết & trigger' : 'Click để cấu hình'}
      </Typography>
    </Box>
  );
}

// ── Config dialog ─────────────────────────────────────────────────────────────
// ── Agent config form: API key → provider detect → model dropdown ────────────
function AgentConfigForm({ apiKey, provider, model, models, loadingModels, showKey,
  onApiKeyChange, onProviderChange, onModelChange, onToggleShowKey }) {
  const detected = detectProvider(apiKey);
  const providerLocked = !!detected;
  const providerObj = PROVIDERS.find((p) => p.id === provider);

  return (
    <Box>
      {/* API Key field */}
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.8 }}>
        API Key
      </Typography>
      <TextField
        fullWidth size="small" variant="outlined"
        type={showKey ? 'text' : 'password'}
        value={apiKey} onChange={onApiKeyChange}
        placeholder="sk-ant-... · sk-... · AIza... · xai-..."
        InputProps={{
          sx: { fontFamily: 'monospace', fontSize: '0.82rem' },
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={onToggleShowKey} size="small" edge="end">
                {showKey ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Detection feedback */}
      <Box sx={{ minHeight: 22, mt: 0.7, display: 'flex', alignItems: 'center', gap: 0.6 }}>
        {detected && providerObj && (
          <>
            <IconCheck size={14} color={C.successDark} />
            <Typography sx={{ fontSize: '0.72rem', color: 'success.main', fontWeight: 600 }}>
              Detected: {providerObj.name}
            </Typography>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: providerObj.color, ml: 0.4 }} />
          </>
        )}
        {!detected && apiKey.length > 0 && (
          <>
            <IconAlertCircle size={14} color={C.warningDark} />
            <Typography sx={{ fontSize: '0.72rem', color: 'warning.main' }}>
              Provider không nhận diện được — chọn manual bên dưới.
            </Typography>
          </>
        )}
        {!apiKey && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic' }}>
            API Key tùy chọn — bỏ trống nếu server dùng Vertex AI / ADC. Nhập key để tự động nhận diện provider và load model list.
          </Typography>
        )}
      </Box>

      {/* Provider dropdown — only when key prefix didn't match any known provider */}
      {!providerLocked && (
        <FormControl fullWidth size="small" sx={{ mt: 1.6 }}>
          <InputLabel>Provider</InputLabel>
          <Select label="Provider" value={provider || ''} onChange={onProviderChange}>
            {PROVIDERS.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                  {p.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Chọn provider để load danh sách model tương ứng</FormHelperText>
        </FormControl>
      )}

      {/* Model dropdown */}
      <FormControl fullWidth size="small" sx={{ mt: 1.6 }} disabled={!provider || loadingModels}>
        <InputLabel>Model</InputLabel>
        <Select label="Model" value={loadingModels ? '' : (model || '')} onChange={onModelChange}
          startAdornment={loadingModels ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}>
          {!loadingModels && models.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{m.label}</Typography>
                {m.note && (
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontStyle: 'italic' }}>
                    {m.note}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Model LLM sử dụng cho agent này — bắt buộc để lưu cấu hình</FormHelperText>
      </FormControl>

      <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', mt: 1.2, fontStyle: 'italic' }}>
        Nếu dùng Vertex AI: chọn provider Google → chọn model → lưu (không cần API key).
      </Typography>
    </Box>
  );
}

function NodeConfigDialog({ node, kind, open, onClose, onSave }) {
  // Generic config draft (used for non-agent nodes)
  const [draft, setDraft] = useState({});
  // Agent-specific state
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState(null);
  const [model, setModel] = useState('');
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showKey, setShowKey] = useState(false);
  // Consolidate schedule state
  const [scheduleHours, setScheduleHours] = useState('24');
  // Consolidate node — manual run state
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  // Crawl agent state
  const [crawlTriggering, setCrawlTriggering] = useState(false);
  const [crawlResult, setCrawlResult] = useState(null);
  const [crawlUrls, setCrawlUrls] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [savingCrawl, setSavingCrawl] = useState(false);

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && !crawlUrls.includes(trimmed)) {
      setCrawlUrls((prev) => [...prev, trimmed]);
    }
    setUrlInput('');
  };

  const handleRemoveUrl = (idx) => {
    setCrawlUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleTriggerCrawl = async () => {
    setCrawlTriggering(true);
    setCrawlResult(null);
    try {
      const res = await agentApi.triggerCrawl();
      setCrawlResult({ ok: true, message: res.message || 'Crawl đã được trigger thành công!' });
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Không thể trigger crawl. Kiểm tra lại server.';
      setCrawlResult({ ok: false, message: detail });
    } finally {
      setCrawlTriggering(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setCrawlResult(null);
      setUrlInput('');
      setSavingCrawl(false);
      setLoadingUrls(false);
      setRunning(false);
      setRunResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !node) return;
    if (kind === 'agent' || kind === 'crawl' || kind === 'consolidate') {
      const initApiKey = node.config?.apiKey || '';
      const initModel = node.config?.model || '';
      setApiKey(initApiKey);
      setModel(initModel);
      setShowKey(false);

      // Detect provider from key, fall back to inferring from existing model name
      const prov = detectProvider(initApiKey) || inferProviderFromModel(initModel);
      setProvider(prov);

      if (prov) {
        setLoadingModels(true);
        loadModelsFromKey(prov).then((m) => {
          setModels(m);
          setLoadingModels(false);
        });
      } else {
        setModels([]);
      }

      if (kind === 'consolidate') {
        setScheduleHours(String(node.config?.scheduleHours ?? 24));
      }

      if (kind === 'crawl') {
        setUrlInput('');
        setLoadingUrls(true);
        agentApi
          .getCrawlConfig()
          .then((res) => {
            setCrawlUrls(Array.isArray(res?.urls) ? res.urls : []);
          })
          .catch(() => {
            // Fallback to node defaults if backend unreachable
            const saved = node.config?.targetUrls;
            setCrawlUrls(Array.isArray(saved) ? saved : []);
          })
          .finally(() => setLoadingUrls(false));
      }
    } else {
      setDraft({ ...(node.config || {}) });
    }
  }, [open, node, kind]);

  if (!node) return null;

  const accent = node.gradient?.[0] || node.grad?.[0] || node.color || C.primaryMain;
  const status = node.status;
  const statusColor = status ? STATUS_COLOR[status] : null;

  // Handlers — non-agent
  const handleDraftChange = (key) => (e) => {
    const v = e.target.value;
    setDraft((prev) => ({ ...prev, [key]: v }));
  };

  // Handlers — agent
  const handleApiKeyChange = (e) => {
    const v = e.target.value;
    setApiKey(v);
    const detected = detectProvider(v);
    if (detected && detected !== provider) {
      setProvider(detected);
      setModel('');
      setLoadingModels(true);
      setModels([]);
      loadModelsFromKey(detected).then((m) => {
        setModels(m);
        setLoadingModels(false);
      });
    } else if (!detected && !v) {
      // Clearing key resets to nothing
      setProvider(null);
      setModels([]);
      setModel('');
    }
  };

  const handleProviderChange = (e) => {
    const v = e.target.value;
    setProvider(v);
    setModel('');
    setLoadingModels(true);
    setModels([]);
    loadModelsFromKey(v).then((m) => {
      setModels(m);
      setLoadingModels(false);
    });
  };

  const handleModelChange = (e) => setModel(e.target.value);

  const handleSave = async () => {
    if (kind === 'crawl') {
      // Persist URLs to backend; key/model still goes through the mock onSave.
      setSavingCrawl(true);
      setCrawlResult(null);
      try {
        const res = await agentApi.saveCrawlConfig(crawlUrls);
        if (Array.isArray(res?.urls)) setCrawlUrls(res.urls);
        onSave?.(node.id, { apiKey, model, targetUrls: res?.urls || crawlUrls });
        onClose();
      } catch (e) {
        const detail = e?.response?.data?.detail || 'Không thể lưu URLs. Kiểm tra lại server.';
        setCrawlResult({ ok: false, message: detail });
      } finally {
        setSavingCrawl(false);
      }
      return;
    }
    if (kind === 'consolidate') {
      onSave?.(node.id, { apiKey, model, scheduleHours: Number(scheduleHours) || 24 });
      onClose();
      return;
    }
    if (kind === 'agent') {
      onSave?.(node.id, { apiKey, model });
    } else {
      onSave?.(node.id, draft);
    }
    onClose();
  };

  const handleRunConsolidate = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await agentApi.runConsolidate();
      setRunResult({ ok: true, message: res?.message || 'Consolidate hoàn tất' });
    } catch (e) {
      setRunResult({ ok: false, message: e?.response?.data?.detail || e.message || 'Chạy thất bại' });
    } finally {
      setRunning(false);
    }
  };

  // apiKey is optional (server may use Vertex AI / ADC) — only model is required
  const canSave = (kind === 'agent' || kind === 'consolidate') ? !!model : true;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 1.2,
            bgcolor: alpha(accent, 0.14), color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconSettings size={20} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.2 }}>
              {node.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.3 }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                {node.role || node.sub}
              </Typography>
              {status && (
                <Chip label={STATUS_LABEL[status] || status} size="small"
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(statusColor, 0.15), color: statusColor, fontWeight: 600 }} />
              )}
            </Box>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        {node.description && (
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
            {node.description}
          </Typography>
        )}

        {node.capabilities?.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.8 }}>
              Capabilities
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.2, '& li': { fontSize: '0.78rem', color: 'text.primary', lineHeight: 1.7 } }}>
              {node.capabilities.map((cap, i) => <li key={i}>{cap}</li>)}
            </Box>
          </Box>
        )}

        {/* Configuration — agents use key+model form, crawl uses trigger panel, others use generic textfield loop */}
        {kind === 'agent' ? (
          <Box sx={{ mb: node.stats ? 2.5 : 0 }}>
            <AgentConfigForm
              apiKey={apiKey} provider={provider} model={model}
              models={models} loadingModels={loadingModels} showKey={showKey}
              onApiKeyChange={handleApiKeyChange}
              onProviderChange={handleProviderChange}
              onModelChange={handleModelChange}
              onToggleShowKey={() => setShowKey((s) => !s)}
            />
          </Box>
        ) : kind === 'crawl' ? (
          <Box>
            {/* LLM config — same as other agents */}
            <Box sx={{ mb: 2.5 }}>
              <AgentConfigForm
                apiKey={apiKey} provider={provider} model={model}
                models={models} loadingModels={loadingModels} showKey={showKey}
                onApiKeyChange={handleApiKeyChange}
                onProviderChange={handleProviderChange}
                onModelChange={handleModelChange}
                onToggleShowKey={() => setShowKey((s) => !s)}
              />
            </Box>

            {/* Target URLs section */}
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Target URLs ({crawlUrls.length})
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.2, maxHeight: 180, overflowY: 'auto', pr: 0.5 }}>
              {loadingUrls ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                  <CircularProgress size={14} sx={{ color: '#2e7d32' }} />
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Đang tải URLs…</Typography>
                </Box>
              ) : crawlUrls.length === 0 ? (
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic', py: 0.5 }}>
                  Chưa có URL nào. Thêm URL bên dưới.
                </Typography>
              ) : crawlUrls.map((url, idx) => (
                <Box key={idx} sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  py: 0.6, px: 1, borderRadius: 1,
                  bgcolor: alpha('#2e7d32', 0.06),
                  border: `1px solid ${alpha('#2e7d32', 0.18)}`,
                }}>
                  <Typography sx={{
                    flex: 1, fontSize: '0.71rem', color: 'text.primary',
                    wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5,
                  }}>
                    {url}
                  </Typography>
                  <IconButton size="small" onClick={() => handleRemoveUrl(idx)}
                    sx={{ color: '#c62828', p: 0.3, flexShrink: 0, '&:hover': { bgcolor: alpha('#c62828', 0.08) } }}>
                    <IconX size={13} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small" fullWidth
                placeholder="https://example.com/page"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem', fontFamily: 'monospace' } }}
              />
              <Button
                variant="outlined" size="small"
                onClick={handleAddUrl}
                disabled={!urlInput.trim()}
                sx={{
                  borderColor: '#2e7d32', color: '#2e7d32', whiteSpace: 'nowrap', px: 2,
                  '&:hover': { borderColor: '#1b5e20', bgcolor: alpha('#2e7d32', 0.07) },
                  '&:disabled': { borderColor: 'divider' },
                }}
              >
                Thêm
              </Button>
            </Box>

            {/* Manual trigger section */}
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Trigger thủ công
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.5, lineHeight: 1.6 }}>
              Chạy crawl ngay lập tức, không cần chờ schedule {node.config?.scheduleHours || 24}h. Agent sẽ crawl các URLs đã cấu hình, chunk + embed vào Qdrant.
            </Typography>

            {crawlResult && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
                p: 1.2, borderRadius: 1,
                bgcolor: alpha(crawlResult.ok ? '#2e7d32' : '#c62828', 0.10),
                border: `1px solid ${alpha(crawlResult.ok ? '#2e7d32' : '#c62828', 0.30)}`,
              }}>
                {crawlResult.ok
                  ? <IconCheck size={16} color="#2e7d32" />
                  : <IconAlertCircle size={16} color="#c62828" />}
                <Typography sx={{ fontSize: '0.78rem', color: crawlResult.ok ? '#2e7d32' : '#c62828', fontWeight: 500 }}>
                  {crawlResult.message}
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={crawlTriggering ? <CircularProgress size={16} color="inherit" /> : <IconPlayerPlay size={16} />}
              onClick={handleTriggerCrawl}
              disabled={crawlTriggering}
              fullWidth
              sx={{
                py: 1.2, bgcolor: '#2e7d32',
                '&:hover': { bgcolor: '#1b5e20' },
                '&:disabled': { bgcolor: alpha('#2e7d32', 0.4) },
                fontWeight: 700, fontSize: '0.88rem',
              }}
            >
              {crawlTriggering ? 'Đang crawl…' : 'Trigger Crawl Ngay'}
            </Button>
            <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', mt: 0.8, fontStyle: 'italic', textAlign: 'center' }}>
              Crawl tự động chạy mỗi {node.config?.scheduleHours || 24}h qua APScheduler
            </Typography>
          </Box>
        ) : kind === 'consolidate' ? (
          <Box>
            <AgentConfigForm
              apiKey={apiKey} provider={provider} model={model}
              models={models} loadingModels={loadingModels} showKey={showKey}
              onApiKeyChange={handleApiKeyChange}
              onProviderChange={handleProviderChange}
              onModelChange={handleModelChange}
              onToggleShowKey={() => setShowKey((s) => !s)}
            />
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Lịch chạy tự động
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.5, lineHeight: 1.6 }}>
              Consolidate gộp raw memories sang consolidated_memories theo định kỳ. APScheduler sẽ tự restart job với interval mới sau khi lưu.
            </Typography>
            <TextField
              label="Chu kỳ (giờ)"
              type="number"
              size="small"
              value={scheduleHours}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || (Number(v) >= 1 && Number(v) <= 720)) setScheduleHours(v);
              }}
              inputProps={{ min: 1, max: 720, style: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
              helperText="Khoảng cách giữa 2 lần chạy consolidate (1–720 giờ, mặc định 24h)"
              sx={{ width: 220 }}
            />
          </Box>
        ) : kind === 'scheduler' ? Object.keys(draft).length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Schedule configuration
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
              {Object.entries(draft).map(([key, value]) => (
                <Box key={key} sx={{
                  display: 'flex', alignItems: 'baseline', gap: 1.5,
                  py: 0.6, px: 1.2, borderRadius: 0.8,
                  bgcolor: alpha(accent, 0.05),
                  borderLeft: `2px solid ${alpha(accent, 0.45)}`,
                }}>
                  <Typography sx={{
                    fontFamily: 'monospace', fontSize: '0.74rem', fontWeight: 700,
                    color: accent, minWidth: 130,
                  }}>
                    {key}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.primary' }}>
                    {String(value)}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', mt: 1.2, fontStyle: 'italic' }}>
              Interval cấu hình qua env vars <code>CONSOLIDATE_INTERVAL_HOURS</code> và <code>CACHE_CLEANUP_INTERVAL_MINUTES</code> trên AiAgent-service.
            </Typography>
          </Box>
        ) : Object.keys(draft).length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Configuration
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {Object.entries(draft).map(([key, value]) => {
                const meta = CONFIG_LABELS[key];
                return (
                  <TextField key={key}
                    label={meta?.label || key}
                    value={value ?? ''} onChange={handleDraftChange(key)}
                    size="small" fullWidth variant="outlined"
                    helperText={meta?.hint}
                    InputLabelProps={{ sx: { fontSize: '0.78rem' } }}
                    inputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                    FormHelperTextProps={{ sx: { fontSize: '0.65rem', mt: 0.3 } }} />
                );
              })}
            </Box>
          </Box>
        )}

        {node.toolGroups?.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Tool registry ({node.countLabel})
            </Typography>
            {node.toolGroups.map((group, gi) => (
              <Box key={gi} sx={{ mb: gi < node.toolGroups.length - 1 ? 1.5 : 0 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.6 }}>
                  {group.label}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {group.tools.map((tool, ti) => {
                    const name = typeof tool === 'string' ? tool : tool.n;
                    const fn = typeof tool === 'string' ? null : tool.fn;
                    return (
                      <Box key={ti} sx={{
                        display: 'flex', alignItems: 'baseline', gap: 1,
                        py: 0.5, px: 1, borderRadius: 0.8,
                        bgcolor: alpha(accent, 0.04),
                        borderLeft: `2px solid ${alpha(accent, 0.45)}`,
                      }}>
                        <Typography sx={{
                          fontFamily: 'monospace', fontSize: '0.74rem',
                          fontWeight: 600, color: accent, whiteSpace: 'nowrap',
                        }}>
                          {name}
                        </Typography>
                        {fn && (
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.45 }}>
                            — {fn}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {node.stats && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Today's stats
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {[
                { label: 'Calls', value: node.stats.callsToday },
              ].map((s) => (
                <Box key={s.label} sx={{ flex: 1, textAlign: 'center', bgcolor: alpha(accent, 0.06), borderRadius: 1.2, py: 1.2 }}>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: accent, lineHeight: 1.1 }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.4px', mt: 0.4 }}>
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {node.id === 'consolidate' && (
          <Box sx={{ mr: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              onClick={handleRunConsolidate}
              variant="outlined"
              disabled={running}
              startIcon={running ? <CircularProgress size={14} /> : null}
              sx={{ borderColor: accent, color: accent, '&:hover': { borderColor: accent, bgcolor: alpha(accent, 0.08) } }}
            >
              {running ? 'Đang chạy…' : 'Chạy consolidate ngay'}
            </Button>
            {runResult && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: 200 }}>
                {runResult.ok
                  ? <IconCheck size={15} color={C.successDark} />
                  : <IconAlertCircle size={15} color={C.errorMain} />}
                <Typography sx={{ fontSize: '0.72rem', color: runResult.ok ? 'success.main' : 'error.main', lineHeight: 1.3 }}>
                  {runResult.message}
                </Typography>
              </Box>
            )}
          </Box>
        )}
        {kind === 'bundle' || kind === 'scheduler' ? (
          <Button onClick={onClose} variant="contained"
            sx={{ bgcolor: accent, '&:hover': { bgcolor: alpha(accent, 0.85) } }}>
            Đóng
          </Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit" disabled={savingCrawl}>Hủy</Button>
            <Button onClick={handleSave} variant="contained"
              disabled={!canSave || savingCrawl}
              startIcon={kind === 'crawl' && savingCrawl ? <CircularProgress size={15} color="inherit" /> : null}
              sx={{ bgcolor: kind === 'crawl' ? '#2e7d32' : accent, '&:hover': { bgcolor: kind === 'crawl' ? '#1b5e20' : alpha(accent, 0.85) } }}>
              {kind === 'crawl' && savingCrawl ? 'Đang lưu…' : 'Lưu cấu hình'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AgentDiagram() {
  const theme = useTheme();
  const [hoveredId, setHoveredId] = useState(null);  // any node id (agent / infra / bundle)
  const [dialogTarget, setDialogTarget] = useState(null);  // { node, kind } | null

  // Live telemetry from BE event bus (SSE).
  const { agentStatusMap, activeEdges, connected, taskCount } = useAgentEventStream();

  // Resolve "active" agent for connection highlighting:
  // - hovering an agent → that agent
  // - hovering a tool bundle → its parent agent
  // - hovering an infra → first agent connected to it (use the infra id itself)
  const activeAgent = (() => {
    if (!hoveredId) return null;
    if (AGENTS.some((a) => a.id === hoveredId)) return hoveredId;
    const bundle = TOOL_BUNDLES.find((b) => b.id === hoveredId);
    if (bundle) return bundle.parentId;
    return hoveredId; // infra id; isConnHighlighted handles both sides
  })();

  const isConnHighlighted = (conn) => {
    if (!hoveredId) return false;
    return conn.from === hoveredId || conn.to === hoveredId
      || conn.from === activeAgent || conn.to === activeAgent;
  };

  const isEdgeHot = (conn) => activeEdges.has(`${conn.from}>${conn.to}`);

  const isInfraLinked = (infraId) =>
    !!activeAgent && CONNECTIONS.some(
      (c) => (c.from === activeAgent && c.to === infraId) || (c.to === activeAgent && c.from === infraId)
    );

  const isBundleLinked = (bundleId) => {
    if (!activeAgent) return false;
    const b = TOOL_BUNDLES.find((x) => x.id === bundleId);
    return b?.parentId === activeAgent;
  };

  const dotColor = alpha(theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600], 0.07);

  const tooltipSx = {
    maxWidth: 280,
    bgcolor: 'rgba(10,20,30,0.96)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.10)',
  };

  const openDialog = (node, kind) => setDialogTarget({ node, kind });
  const closeDialog = () => setDialogTarget(null);

  const handleSaveConfig = (id, newConfig) => {
    // In a real app, dispatch to API. For now: log + close.
    // eslint-disable-next-line no-console
    console.log('[AgentDiagram] save config for', id, newConfig);
  };

  return (
    <Box>
      <svg viewBox="0 0 1400 760" width="100%" style={{ display: 'block', maxHeight: 'calc(100vh - 320px)', minHeight: 360 }}>
        <defs>
          <pattern id="dot-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="11" cy="11" r="0.65" fill={dotColor} />
          </pattern>
          <radialGradient id="bg-radial" cx="50%" cy="38%" r="58%">
            <stop offset="0%" stopColor={alpha(theme.palette.primary.dark, 0.16)} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>


        <line x1="18" y1="558" x2="1382" y2="558" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="10 10" />

        <text x={22} y={30} fill={alpha(C.primaryMain, 0.55)} fontSize="7.5" fontFamily="'Roboto Mono',monospace" letterSpacing="1">
          REQUEST · RESPONSE TIER
        </text>
        <text x={22} y={580} fill={alpha(C.warningDark, 0.55)} fontSize="7.5" fontFamily="'Roboto Mono',monospace" letterSpacing="1">
          BACKGROUND TIER
        </text>

        {/* Live connection indicator */}
        {(() => {
          const accent = connected ? C.successDark : C.warningDark;
          const label = connected
            ? (taskCount > 0 ? `LIVE · ${taskCount} TASK${taskCount > 1 ? 'S' : ''}` : 'LIVE')
            : 'RECONNECTING…';
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={1170} y={14} width={216} height={22} rx={11}
                fill={alpha(accent, 0.15)} stroke={alpha(accent, 0.45)} strokeWidth="1" />
              <circle cx={1186} cy={25} r={3.5} fill={accent}>
                {connected && (
                  <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                )}
              </circle>
              <text x={1196} y={29} fill={accent} fontSize="9" fontWeight="700"
                fontFamily="'Roboto Mono',monospace" letterSpacing="0.3">
                {label}
              </text>
            </g>
          );
        })()}

        {/* Connections */}
        {CONNECTIONS.map((conn, i) => {
          const from = NODE_MAP[conn.from], to = NODE_MAP[conn.to];
          if (!from || !to) return null;
          return (
            <ChevronFlow key={i} from={from} to={to} type={conn.type}
              isHot={isEdgeHot(conn)}
              isHighlighted={isConnHighlighted(conn)}
              anyActive={!!hoveredId}
              fR={conn.fR} tR={conn.tR} />
          );
        })}

        {/* Infra nodes — interactive */}
        {INFRA.map((node) => (
          <Tooltip
            key={node.id}
            title={<NodeTooltipContent name={node.name} role={node.role} configKeys={Object.keys(node.config || {})} />}
            placement="top" arrow enterDelay={150} leaveDelay={50}
            componentsProps={{ tooltip: { sx: tooltipSx } }}
          >
            <g>
              <InfraNode
                node={node}
                isHovered={hoveredId === node.id}
                isLinked={isInfraLinked(node.id)}
                onHover={() => setHoveredId(node.id)}
                onLeave={() => setHoveredId(null)}
                onClick={() => openDialog(node, 'infra')}
              />
            </g>
          </Tooltip>
        ))}

        {/* Tool bundle nodes */}
        {TOOL_BUNDLES.map((bundle) => (
          <Tooltip
            key={bundle.id}
            title={<NodeTooltipContent name={bundle.name} role={bundle.role} configKeys={[bundle.countLabel]} />}
            placement={bundle.id === 'tools_analytics' ? 'right' : 'left'}
            arrow enterDelay={120} leaveDelay={50}
            componentsProps={{ tooltip: { sx: tooltipSx } }}
          >
            <g>
              <ToolBundleNode
                bundle={bundle}
                isHovered={hoveredId === bundle.id}
                isLinked={isBundleLinked(bundle.id)}
                onHover={() => setHoveredId(bundle.id)}
                onLeave={() => setHoveredId(null)}
                onClick={() => openDialog(bundle, 'bundle')}
              />
            </g>
          </Tooltip>
        ))}

        {/* Channels — interactive */}
        {CHANNELS.map((ch) => (
          <Tooltip
            key={ch.id}
            title={<NodeTooltipContent name={ch.name} role={ch.role} configKeys={Object.keys(ch.config || {})} />}
            placement="bottom" arrow enterDelay={150} leaveDelay={50}
            componentsProps={{ tooltip: { sx: tooltipSx } }}
          >
            <g>
              <ChannelNode
                node={ch}
                isHovered={hoveredId === ch.id}
                onHover={() => setHoveredId(ch.id)}
                onLeave={() => setHoveredId(null)}
                onClick={() => openDialog(ch, 'channel')}
              />
            </g>
          </Tooltip>
        ))}

        {/* Scheduler — interactive */}
        <Tooltip
          title={<NodeTooltipContent name={SCHEDULER_NODE.name} role={SCHEDULER_NODE.role}
            configKeys={Object.keys(SCHEDULER_NODE.config || {})} />}
          placement="top" arrow enterDelay={150} leaveDelay={50}
          componentsProps={{ tooltip: { sx: tooltipSx } }}
        >
          <g>
            <SchedulerNode
              node={SCHEDULER_NODE}
              isHovered={hoveredId === SCHEDULER_NODE.id}
              onHover={() => setHoveredId(SCHEDULER_NODE.id)}
              onLeave={() => setHoveredId(null)}
              onClick={() => openDialog(SCHEDULER_NODE, 'scheduler')}
            />
          </g>
        </Tooltip>

        {/* Agent nodes — status comes from live event stream, default 'idle' */}
        {AGENTS.map((agent) => {
          const liveAgent = { ...agent, status: agentStatusMap[agent.id] || 'idle' };
          const dialogKind = agent.id === 'crawl_agent' ? 'crawl' : agent.id === 'consolidate' ? 'consolidate' : 'agent';
          return (
            <Tooltip
              key={agent.id}
              title={<NodeTooltipContent name={liveAgent.name} role={liveAgent.role} status={liveAgent.status} configKeys={Object.keys(liveAgent.config || {})} />}
              placement="top" arrow enterDelay={150} leaveDelay={50}
              componentsProps={{ tooltip: { sx: tooltipSx } }}
            >
              <g>
                <AgentNode
                  agent={liveAgent}
                  isHovered={hoveredId === agent.id}
                  isInFlow={false}
                  onHover={() => setHoveredId(agent.id)}
                  onLeave={() => setHoveredId(null)}
                  onClick={() => openDialog(liveAgent, dialogKind)}
                />
              </g>
            </Tooltip>
          );
        })}

        {/* SHARED markers on Qdrant & Google */}
        <text x={188} y={248} textAnchor="middle" fill={alpha(C.grey700, 0.65)} fontSize="6.5" fontFamily="'Roboto Mono',monospace" letterSpacing="0.3" style={{ pointerEvents: 'none' }}>
          SHARED
        </text>
        <text x={1212} y={248} textAnchor="middle" fill={alpha(C.grey700, 0.65)} fontSize="6.5" fontFamily="'Roboto Mono',monospace" letterSpacing="0.3" style={{ pointerEvents: 'none' }}>
          SHARED
        </text>
      </svg>

      {/* Config popup */}
      <NodeConfigDialog
        node={dialogTarget?.node}
        kind={dialogTarget?.kind}
        open={!!dialogTarget}
        onClose={closeDialog}
        onSave={handleSaveConfig}
      />
    </Box>
  );
}
