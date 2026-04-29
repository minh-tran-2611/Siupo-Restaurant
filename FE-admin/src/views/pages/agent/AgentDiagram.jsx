import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
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
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme, alpha } from '@mui/material/styles';
import { IconX, IconSettings, IconEye, IconEyeOff, IconCheck, IconAlertCircle } from '@tabler/icons-react';

// design tokens — same source as palette.jsx
import C from 'assets/scss/_themes-vars.module.scss';

// ── Status color map (from theme palette) ─────────────────────────────────────
const STATUS_COLOR = {
  online: C.successDark,
  task:   C.secondaryMain,
  idle:   C.grey500,
  error:  C.errorMain,
};
const STATUS_LABEL = { online: 'Running', task: 'Processing', idle: 'Idle', error: 'Error' };

// ── LLM provider catalog ──────────────────────────────────────────────────────
//  detectProvider() inspects the API key prefix; falls back to dropdown if unknown.
//  Order matters: 'sk-ant-' must be checked BEFORE 'sk-' (OpenAI's prefix).
const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic',     prefixes: ['sk-ant-'],            color: '#d97757' },
  { id: 'openai',    name: 'OpenAI',        prefixes: ['sk-proj-', 'sk-'],    color: '#10a37f' },
  { id: 'google',    name: 'Google Gemini', prefixes: ['AIza'],               color: '#4285f4' },
  { id: 'xai',       name: 'xAI (Grok)',    prefixes: ['xai-'],               color: '#000000' },
];

// Mock model catalog. TODO: replace with BE proxy `GET /api/agents/models?provider=...`
// once backend is ready — calling provider APIs directly from browser exposes the key
// and runs into CORS for OpenAI/Anthropic.
const MOCK_MODELS = {
  anthropic: [
    { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7',     note: 'Most intelligent' },
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',   note: 'Balanced'         },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',    note: 'Fastest'          },
    { id: 'claude-sonnet-4-5',         label: 'Claude Sonnet 4.5',   note: ''                 },
    { id: 'claude-haiku-3-5',          label: 'Claude Haiku 3.5',    note: ''                 },
  ],
  openai: [
    { id: 'gpt-4o',         label: 'GPT-4o',          note: 'Most capable' },
    { id: 'gpt-4o-mini',    label: 'GPT-4o mini',     note: 'Fast & cheap' },
    { id: 'gpt-4-turbo',    label: 'GPT-4 Turbo',     note: ''             },
    { id: 'o1-preview',     label: 'o1 Preview',      note: 'Reasoning'    },
    { id: 'o1-mini',        label: 'o1 mini',         note: ''             },
  ],
  google: [
    { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro',        note: ''            },
    { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash',      note: 'Recommended' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', note: ''            },
    { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',      note: ''            },
    { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro',        note: ''            },
  ],
  xai: [
    { id: 'grok-2',      label: 'Grok 2',      note: '' },
    { id: 'grok-2-mini', label: 'Grok 2 mini', note: '' },
    { id: 'grok-beta',   label: 'Grok Beta',   note: '' },
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

// ── Agent nodes ───────────────────────────────────────────────────────────────
const AGENTS = [
  {
    id: 'orchestrator', name: 'Orchestrator',
    role: 'Router & Intent Classifier',
    gradient: [C.primaryMain, C.primary800],
    x: 700, y: 235, status: 'online',
    description: 'Router chính — nhận request, phân loại intent, delegate sang Analytics hoặc Management. Hỗ trợ RAG search và internet search.',
    capabilities: [
      'Phân loại intent từ user message',
      'Delegate Analytics / Management agent',
      'RAG search qua Qdrant',
      'Web search qua Google',
      'Quản lý conversation memory',
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
    id: 'ingest', name: 'Ingest',
    role: 'Memory Classifier',
    gradient: [C.grey600, C.grey900],
    x: 321, y: 638, status: 'online',
    description: 'Phân loại và lưu memory sau mỗi hội thoại. Tier: CORE → IMPORTANT → DETAIL → NOISE.',
    capabilities: [
      'Phân tier memory (CORE/IMPORTANT/DETAIL/NOISE)',
      'Trích xuất entities & topics',
      'Lưu memory vào Turso',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash' },
    toolsCount: 0,
    stats: { callsToday: 142 },
  },
  {
    id: 'consolidate', name: 'Consolidate',
    role: 'Memory Compactor',
    gradient: [C.secondary200, C.secondary800],
    x: 1079, y: 638, status: 'idle',
    description: 'Gộp raw memories thành consolidated summaries, xóa duplicates, giữ entities quan trọng. Trigger: APScheduler mỗi 24h.',
    capabilities: [
      'Gộp raw memories → summaries',
      'Khử trùng lặp entities',
      'Trigger định kỳ qua APScheduler',
    ],
    config: { apiKey: '', model: 'gemini-2.5-flash' },
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
          { n: 'get_analytics_summary',   fn: 'Tổng quan KPIs theo period (doanh thu, đơn, khách)' },
          { n: 'get_revenue_analytics',   fn: 'Báo cáo doanh thu chi tiết theo period' },
          { n: 'get_order_analytics',     fn: 'Phân tích đơn hàng: trạng thái, hủy, hoàn thành' },
          { n: 'get_product_analytics',   fn: 'Top sản phẩm bán chạy & hiệu suất' },
          { n: 'get_customer_analytics',  fn: 'Phân khúc khách, VIP, retention' },
          { n: 'get_booking_analytics',   fn: 'Thống kê đặt bàn & lịch sử' },
          { n: 'get_analytics_insights',  fn: 'AI insights & khuyến nghị business' },
        ],
      },
      {
        label: 'Shared Read',
        tools: [
          { n: 'get_search_products',      fn: 'Tìm/list sản phẩm để bổ sung context' },
          { n: 'get_all_combos',           fn: 'Lấy danh sách combo' },
          { n: 'get_categories',           fn: 'Lấy danh mục sản phẩm' },
          { n: 'get_all_customers',        fn: 'Danh sách khách để phân tích sâu' },
          { n: 'get_all_tags',             fn: 'Danh sách tag để cross-reference' },
          { n: 'get_all_orders_admin',     fn: 'Lấy đơn hàng (filter theo status/period)' },
          { n: 'get_order_detail_admin',   fn: 'Chi tiết đơn hàng theo id' },
          { n: 'get_all_vouchers_admin',   fn: 'Danh sách voucher (đánh giá hiệu quả)' },
          { n: 'get_voucher_by_id',        fn: 'Chi tiết voucher theo id' },
          { n: 'get_order_reviews',        fn: 'Reviews của 1 đơn hàng' },
          { n: 'get_reviews_by_order',     fn: 'Reviews đầy đủ theo order' },
          { n: 'get_review_by_order_item', fn: 'Review của 1 line-item' },
          { n: 'search_internet',          fn: 'Tìm thông tin bổ sung từ Google CSE' },
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
          { n: 'get_all_banners',   fn: 'Lấy toàn bộ banner (vị trí, ảnh)' },
          { n: 'get_banner_by_id',  fn: 'Chi tiết banner theo id' },
          { n: 'create_banner',     fn: 'Tạo banner ở vị trí trống' },
          { n: 'update_banner',     fn: 'Cập nhật url/position banner' },
          { n: 'delete_banner',     fn: 'Xóa banner theo id' },
        ],
      },
      {
        label: 'Category',
        tools: [
          { n: 'get_categories',   fn: 'Lấy danh sách danh mục' },
          { n: 'create_category',  fn: 'Tạo danh mục mới (kèm ảnh)' },
          { n: 'update_category',  fn: 'Cập nhật tên/ảnh danh mục' },
          { n: 'delete_category',  fn: 'Xóa danh mục theo id' },
        ],
      },
      {
        label: 'Combo',
        tools: [
          { n: 'get_all_combos',       fn: 'Lấy danh sách combo' },
          { n: 'get_combo_by_id',      fn: 'Chi tiết combo theo id' },
          { n: 'create_combo',         fn: 'Tạo combo mới (gồm sản phẩm + giá)' },
          { n: 'update_combo',         fn: 'Cập nhật combo' },
          { n: 'delete_combo',         fn: 'Xóa combo' },
          { n: 'toggle_combo_status',  fn: 'Bật/tắt trạng thái combo' },
        ],
      },
      {
        label: 'Product',
        tools: [
          { n: 'get_search_products',     fn: 'Tìm/list sản phẩm theo từ khóa' },
          { n: 'create_product',          fn: 'Tạo sản phẩm mới' },
          { n: 'update_product',          fn: 'Cập nhật sản phẩm' },
          { n: 'delete_product',          fn: 'Xóa sản phẩm' },
          { n: 'toggle_product_status',   fn: 'Bật/tắt trạng thái bán' },
        ],
      },
      {
        label: 'Order',
        tools: [
          { n: 'get_all_orders_admin',     fn: 'Danh sách đơn (filter status/period)' },
          { n: 'get_order_detail_admin',   fn: 'Chi tiết đơn hàng theo id' },
          { n: 'update_order_status',      fn: 'Cập nhật trạng thái đơn (PENDING/PAID/...)' },
          { n: 'delete_order',             fn: 'Xóa đơn hàng' },
          { n: 'get_order_reviews',        fn: 'Reviews của đơn hàng' },
        ],
      },
      {
        label: 'Voucher',
        tools: [
          { n: 'get_public_vouchers',      fn: 'Voucher public cho khách' },
          { n: 'get_all_vouchers_admin',   fn: 'Toàn bộ voucher (admin)' },
          { n: 'get_voucher_by_id',        fn: 'Chi tiết voucher theo id' },
          { n: 'get_voucher_by_code',      fn: 'Tra voucher theo code' },
          { n: 'create_voucher',           fn: 'Tạo voucher (giảm giá %, max, hạn)' },
          { n: 'update_voucher',           fn: 'Cập nhật voucher' },
          { n: 'delete_voucher',           fn: 'Xóa voucher' },
          { n: 'toggle_voucher_status',    fn: 'Bật/tắt voucher' },
        ],
      },
      {
        label: 'Tag',
        tools: [
          { n: 'get_all_tags',  fn: 'Lấy danh sách tag' },
          { n: 'get_tag_by_id', fn: 'Chi tiết tag theo id' },
          { n: 'create_tag',    fn: 'Tạo tag mới' },
          { n: 'update_tag',    fn: 'Cập nhật tag' },
          { n: 'delete_tag',    fn: 'Xóa tag' },
        ],
      },
      {
        label: 'User & Notification',
        tools: [
          { n: 'get_all_customers',           fn: 'Danh sách khách hàng' },
          { n: 'update_customer_status',      fn: 'Cập nhật trạng thái khách (kích hoạt/khóa)' },
          { n: 'get_all_notifications_admin', fn: 'Toàn bộ thông báo (admin)' },
          { n: 'create_notification',         fn: 'Tạo thông báo gửi user' },
          { n: 'get_my_notifications',        fn: 'Thông báo của user hiện tại' },
        ],
      },
      {
        label: 'Review & Other',
        tools: [
          { n: 'get_reviews_by_order',     fn: 'Toàn bộ review của 1 đơn' },
          { n: 'get_review_by_order_item', fn: 'Review theo line-item' },
          { n: 'login',                    fn: 'Đăng nhập lấy access token' },
          { n: 'search_internet',          fn: 'Google search bổ sung context' },
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
    id: 'turso', name: 'Memory Store', sub: 'Turso / libSQL',
    role: 'Persistent conversation memory',
    description: 'Lưu memories đã phân tier (CORE/IMPORTANT/DETAIL/NOISE) và consolidated summaries. Truy xuất trong mọi conversation.',
    config: {
      dbUrl: 'libsql://siupo-memory.turso.io',
      authToken: '••••••••••••',
      ttlDays: 30,
      maxMemoriesPerUser: 1000,
    },
    x: 700, y: 705, r: 28, grad: [C.grey700, C.grey900], icon: 'db', shared: false,
  },
];

const CHANNELS = [
  { id: 'zalo',  name: 'Zalo',  x: 471, y: 58, r: 22, color: '#00B14F' },
  { id: 'gmail', name: 'Gmail', x: 929, y: 58, r: 22, color: '#EA4335' },
];

const SCHEDULER_NODE = {
  id: 'scheduler',
  name: 'APScheduler',
  role: 'Trigger định kỳ cho Consolidate agent',
  description: 'Background scheduler chạy bên trong AiAgent-service (FastAPI lifespan). Kích hoạt Consolidate agent theo chu kỳ để gộp raw memories thành consolidated summaries trong Turso.',
  capabilities: [
    'Kích hoạt run_consolidate_agent mỗi N giờ',
    'Replace_existing job để tránh duplicate',
    'Tự dừng khi FastAPI shutdown',
  ],
  config: {
    intervalHours: 24,
    jobId: 'consolidate_agent_job',
    triggerType: 'interval',
    target: 'consolidate_agent',
  },
  x: 1265, y: 612, r: 19,
  gradient: [C.warningDark, C.warningMain],
};

const CONNECTIONS = [
  { from: 'orchestrator', to: 'analytics',        type: 'primary',   fR: 52, tR: 52 },
  { from: 'orchestrator', to: 'management',       type: 'primary',   fR: 52, tR: 52 },
  { from: 'orchestrator', to: 'qdrant',           type: 'infra',     fR: 52, tR: 28 },
  { from: 'analytics',    to: 'qdrant',           type: 'infra',     fR: 52, tR: 28 },
  { from: 'management',   to: 'qdrant',           type: 'infra',     fR: 52, tR: 28 },
  { from: 'orchestrator', to: 'google',           type: 'infra',     fR: 52, tR: 28 },
  { from: 'analytics',    to: 'google',           type: 'infra',     fR: 52, tR: 28 },
  { from: 'management',   to: 'google',           type: 'infra',     fR: 52, tR: 28 },
  { from: 'analytics',    to: 'tools_analytics',  type: 'tools',     fR: 52, tR: 34 },
  { from: 'management',   to: 'tools_management', type: 'tools',     fR: 52, tR: 34 },
  { from: 'orchestrator', to: 'turso',            type: 'secondary', fR: 52, tR: 28 },
  { from: 'ingest',       to: 'turso',            type: 'infra',     fR: 52, tR: 28 },
  { from: 'consolidate',  to: 'turso',            type: 'infra',     fR: 52, tR: 28 },
  { from: 'scheduler',    to: 'consolidate',      type: 'scheduled', fR: 19, tR: 52 },
  { from: 'zalo',         to: 'orchestrator',     type: 'future',    fR: 22, tR: 52 },
  { from: 'gmail',        to: 'orchestrator',     type: 'future',    fR: 22, tR: 52 },
];

const NODE_MAP = {};
[...AGENTS, ...INFRA, ...TOOL_BUNDLES, ...CHANNELS, SCHEDULER_NODE].forEach((n) => {
  NODE_MAP[n.id] = n;
});

// Mock activity flows — only edges in active flow animate
const MOCK_FLOWS = [
  { name: 'Analytics query',     edges: ['orchestrator>analytics',  'analytics>tools_analytics'],  duration: 2400 },
  { name: 'Management CRUD',     edges: ['orchestrator>management', 'management>tools_management'], duration: 2400 },
  { name: 'RAG document search', edges: ['orchestrator>qdrant'],                                    duration: 1600 },
  { name: 'Web search',          edges: ['orchestrator>google'],                                    duration: 1600 },
  { name: 'Memory read',         edges: ['orchestrator>turso'],                                     duration: 1400 },
  { name: 'Memory ingest',       edges: ['ingest>turso'],                                           duration: 1400 },
  { name: 'Analytics + RAG',     edges: ['orchestrator>analytics', 'analytics>qdrant', 'analytics>tools_analytics'], duration: 2800 },
  { name: 'Mgmt + memory write', edges: ['orchestrator>management', 'management>tools_management', 'ingest>turso'],  duration: 2800 },
];

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
    case 'ingest': return (
      <g>
        <path d="M-11,-9 L11,-9 L5,2 L3.5,10 L-3.5,10 L-5,2 Z" fill="none" stroke={w} strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="-7" y1="-5" x2="7" y2="-5" stroke={m} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="-3.5" y1="-1" x2="3.5" y2="-1" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="-7" cy="-12" r="1.8" fill={m} /><circle cx="0" cy="-12.5" r="2" fill={w} /><circle cx="7" cy="-12" r="1.8" fill={m} />
        <line x1="0" y1="10" x2="0" y2="13" stroke={w} strokeWidth="2" strokeLinecap="round" />
        <polygon points="-2.5,12 2.5,12 0,15" fill={w} />
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
    default: return null;
  }
}

// ── Status ring ───────────────────────────────────────────────────────────────
const STATUS_CFG = {
  online: { r1: { dash: '16 6', w: 2.5, dur: '9s',   dir: 1, op: 0.75 }, r2: null },
  task:   { r1: { dash: '10 4', w: 3,   dur: '1.8s', dir: 1, op: 0.92 }, r2: { dash: '4 10', w: 1.5, dr: 8, dur: '1.2s', dir: -1, op: 0.45 } },
  idle:   { r1: { dash: '4 12', w: 1.5, dur: null,   dir: 0, op: 0.32 }, r2: null },
  error:  { r1: { dash: '22 4', w: 2.5, dur: null,   dir: 0, op: 0.80 }, r2: null },
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
  primary:   { color: C.primaryMain,   width: 2,   dash: 'none' },
  secondary: { color: C.primary200,    width: 1.8, dash: 'none' },
  scheduled: { color: C.warningDark,   width: 1.6, dash: 'none' },
  infra:     { color: C.grey500,       width: 1.4, dash: '5 4' },
  tools:     { color: C.grey600,       width: 1.6, dash: 'none' },
  future:    { color: C.grey300,       width: 1.4, dash: '5 5' },
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
  const baseWidth   = isHighlighted ? style.width + 0.6 : style.width;

  const animate = type !== 'future' && (isHot || isHighlighted);
  const count = type === 'primary' ? 6 : type === 'secondary' ? 4 : type === 'scheduled' ? 4 : 3;
  const dur   = type === 'primary' ? 1.8 : type === 'secondary' ? 2.6 : type === 'scheduled' ? 3.2 : 2.4;

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
        <rect x="2"  y="-8" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.95)" />
        <rect x="-9" y="2"  width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.95)" />
        <rect x="2"  y="2"  width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.60)" />
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
function ChannelNode({ node }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={`chg-${node.id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={node.color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={node.color} stopOpacity="0.28" />
        </radialGradient>
      </defs>
      <circle cx={node.x} cy={node.y} r={node.r + 5} fill="none" stroke={node.color} strokeWidth="1" strokeDasharray="4 4" opacity="0.42" />
      <circle cx={node.x} cy={node.y} r={node.r} fill={`url(#chg-${node.id})`} stroke={node.color} strokeWidth="1.2" opacity="0.7" />
      <text x={node.x} y={node.y + 4} textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="8" fontWeight="700" fontFamily="Roboto,sans-serif">{node.name}</text>
      <rect x={node.x - 12} y={node.y + node.r + 4} width={24} height={11} rx={5.5} fill={node.color} opacity="0.65" />
      <text x={node.x} y={node.y + node.r + 12} textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize="6.2" fontWeight="700" fontFamily="Roboto,sans-serif">SOON</text>
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
        {node.config?.intervalHours || 24}h
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
        Click để cấu hình
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
            Nhập API key để load model list từ provider.
          </Typography>
        )}
      </Box>

      {/* Provider dropdown — only when key prefix didn't match any known provider */}
      {!providerLocked && (
        <FormControl fullWidth size="small" sx={{ mt: 1.6 }} disabled={!apiKey}>
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
      </FormControl>

      <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', mt: 1.2, fontStyle: 'italic' }}>
        Model list được load từ provider sau khi nhập API key hợp lệ.
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

  useEffect(() => {
    if (!open || !node) return;
    if (kind === 'agent') {
      const initApiKey = node.config?.apiKey || '';
      const initModel  = node.config?.model  || '';
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
    } else {
      setDraft({ ...(node.config || {}) });
    }
  }, [open, node, kind]);

  if (!node) return null;

  const accent = node.gradient?.[0] || node.grad?.[0] || C.primaryMain;
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

  const handleSave = () => {
    if (kind === 'agent') {
      onSave?.(node.id, { apiKey, model });
    } else {
      onSave?.(node.id, draft);
    }
    onClose();
  };

  // Save button validation
  const canSave = kind === 'agent' ? !!(apiKey && model) : true;

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

        {/* Configuration — agents use key+model form, others use generic textfield loop */}
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
              Interval cấu hình qua env var <code>CONSOLIDATE_INTERVAL_HOURS</code> trên AiAgent-service.
            </Typography>
          </Box>
        ) : Object.keys(draft).length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Configuration
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {Object.entries(draft).map(([key, value]) => (
                <TextField key={key} label={key} value={value ?? ''} onChange={handleDraftChange(key)}
                  size="small" fullWidth variant="outlined"
                  InputLabelProps={{ sx: { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                  inputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }} />
              ))}
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
                    const fn   = typeof tool === 'string' ? null   : tool.fn;
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
        {kind === 'bundle' || kind === 'scheduler' ? (
          <Button onClick={onClose} variant="contained"
            sx={{ bgcolor: accent, '&:hover': { bgcolor: alpha(accent, 0.85) } }}>
            Đóng
          </Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">Hủy</Button>
            <Button onClick={handleSave} variant="contained" disabled={!canSave}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: alpha(accent, 0.85) } }}>
              Lưu cấu hình
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
  const [hoveredId,    setHoveredId]    = useState(null);  // any node id (agent / infra / bundle)
  const [activeFlow,   setActiveFlow]   = useState(null);
  const [dialogTarget, setDialogTarget] = useState(null);  // { node, kind } | null

  // Mock activity flow cycling
  useEffect(() => {
    let cancelled = false;
    let timer;
    const cycle = () => {
      if (cancelled) return;
      const flow = MOCK_FLOWS[Math.floor(Math.random() * MOCK_FLOWS.length)];
      setActiveFlow(flow);
      timer = setTimeout(() => {
        if (cancelled) return;
        setActiveFlow(null);
        timer = setTimeout(cycle, 1400 + Math.random() * 2200);
      }, flow.duration);
    };
    timer = setTimeout(cycle, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

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

  const isEdgeHot = (conn) => {
    if (!activeFlow) return false;
    return activeFlow.edges.includes(`${conn.from}>${conn.to}`);
  };

  const isAgentInFlow = (agentId) => {
    if (!activeFlow) return false;
    return activeFlow.edges.some((e) => {
      const [from, to] = e.split('>');
      return from === agentId || to === agentId;
    });
  };

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

        {activeFlow && (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={1170} y={14} width={216} height={22} rx={11} fill={alpha(C.successDark, 0.15)} stroke={alpha(C.successDark, 0.45)} strokeWidth="1" />
            <circle cx={1186} cy={25} r={3.5} fill={C.successDark}>
              <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
            </circle>
            <text x={1196} y={29} fill={C.successDark} fontSize="9" fontWeight="700" fontFamily="'Roboto Mono',monospace" letterSpacing="0.3">
              {activeFlow.name.toUpperCase()}
            </text>
          </g>
        )}

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

        {/* Channels — passive */}
        {CHANNELS.map((ch) => <ChannelNode key={ch.id} node={ch} />)}

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

        {/* Agent nodes */}
        {AGENTS.map((agent) => (
          <Tooltip
            key={agent.id}
            title={<NodeTooltipContent name={agent.name} role={agent.role} status={agent.status} configKeys={Object.keys(agent.config || {})} />}
            placement="top" arrow enterDelay={150} leaveDelay={50}
            componentsProps={{ tooltip: { sx: tooltipSx } }}
          >
            <g>
              <AgentNode
                agent={agent}
                isHovered={hoveredId === agent.id}
                isInFlow={isAgentInFlow(agent.id)}
                onHover={() => setHoveredId(agent.id)}
                onLeave={() => setHoveredId(null)}
                onClick={() => openDialog(agent, 'agent')}
              />
            </g>
          </Tooltip>
        ))}

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
