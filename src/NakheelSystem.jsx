import React, { useState, useMemo, useEffect, useRef } from "react";

/* =========================================================================
   نادي النخيل — النظام المحاسبي المتكامل (نسخة الإطلاق النظيفة)
   لا بيانات تجريبية — يبدأ فارغاً. عند أول تشغيل تظهر شاشة إنشاء المدير.
   ========================================================================= */

const C = {
  gold: "#c9a84c", gld: "#f0d080", gdd: "#8a6a20",
  grn: "#14431f", grn2: "#1a5c2e", grl: "#2d8c4e",
  crm: "#faf8f2", ink: "#1a1a18", k2: "#3d3c38", mt: "#7a7870",
  bc: "rgba(201,168,76,0.2)", cd: "#fff", pg: "#f4f1e8",
  red: "#c0392b", redbg: "#fde9e9", blue: "#1a3e8c", bluebg: "#e4effe",
  purp: "#4a3aa7", purpbg: "#eeeafd", dark: false,
};
function applyTheme(settings) {
  Object.assign(C, resolveTheme(settings));
}

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

/* ---------- THEME SYSTEM ---------- */
const THEMES = {
  gold:    { name: "ذهبي كلاسيكي", accent: "#c9a84c", accentD: "#8a6a20", accentL: "#f0d080", brand: "#14431f", brand2: "#1a5c2e" },
  emerald: { name: "زمردي", accent: "#1aa06a", accentD: "#0c6b45", accentL: "#7fe3bd", brand: "#08312a", brand2: "#0f5c4a" },
  royal:   { name: "ملكي أزرق", accent: "#3d6fd6", accentD: "#264c9c", accentL: "#9dbcf5", brand: "#141d3d", brand2: "#22346b" },
  sunset:  { name: "غروب", accent: "#e07b3c", accentD: "#a8531f", accentL: "#f5b98a", brand: "#3d1f14", brand2: "#6b3722" },
  ocean:   { name: "محيطي", accent: "#1f9ba8", accentD: "#0f6670", accentL: "#8ad9e1", brand: "#0a2e33", brand2: "#12565e" },
};

function resolveTheme(settings) {
  const t = THEMES[settings.theme] || THEMES.gold;
  const dark = settings.dark;
  return {
    ...t,
    gold: t.accent, gld: t.accentL, gdd: t.accentD,
    grn: t.brand, grn2: t.brand2, grl: t.accent,
    // surfaces flip in dark mode
    pg: dark ? "#12100c" : "#f4f1e8",
    cd: dark ? "#1e1b16" : "#fff",
    crm: dark ? "#26221b" : "#faf8f2",
    ink: dark ? "#f2efe6" : "#1a1a18",
    k2: dark ? "#c9c5ba" : "#3d3c38",
    mt: dark ? "#8f8b80" : "#7a7870",
    bc: dark ? "rgba(201,168,76,0.14)" : "rgba(201,168,76,0.2)",
    red: "#c0392b", redbg: dark ? "rgba(192,57,43,.18)" : "#fde9e9",
    blue: "#4a7fd6", bluebg: dark ? "rgba(74,127,214,.16)" : "#e4effe",
    purp: "#6b5bd0", purpbg: dark ? "rgba(107,91,208,.16)" : "#eeeafd",
    dark,
  };
}

const todayISO = () => new Date().toISOString().split("T")[0];
const arDate = (iso) => (iso ? new Date(iso).toLocaleDateString("ar-LY") : "—");
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
// returns overdue days (>0 means late) for a deferred invoice, using dueDate or invoice date
const overdueDays = (inv, ref = todayISO()) => {
  if (inv.pay !== "آجل" || inv.status !== "معلقة") return 0;
  const due = inv.dueDate || inv.date;
  const d = daysBetween(due, ref);
  return d > 0 ? d : 0;
};
const toWa = (phone) => {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "218" + d.slice(1);
  return d;
};

/* ---------- seed data ---------- */
const SEED_PRODUCTS = [];

const SEED_CUSTOMERS = [];

const SEED_SUPPLIERS = [];

const SEED_INVOICES = [];

const SEED_PURCHASES = [];

const SEED_EXPENSES = [];

const SEED_EMPLOYEES = [];

const SEED_COUPONS = [];

/* ---------- promotions (تخفيضات موسمية بفترات زمنية) ---------- */
const SEED_PROMOS = [];
const PERIOD_NAME = { morning: "الفترة الصباحية (6ص – 4م)", evening: "الفترة المسائية (4م – 12م)", allday: "كامل اليوم" };
const PERIOD_ICON = { morning: "🌅", evening: "🌙", allday: "🕐" };
// هل العرض فعّال الآن؟ (ضمن التاريخ + الفترة الزمنية + مُفعّل)
function promoActiveNow(pr, now = new Date()) {
  if (!pr.active) return false;
  const today = now.toISOString().split("T")[0];
  if (pr.from && today < pr.from) return false;
  if (pr.to && today > pr.to) return false;
  const h = now.getHours();
  if (pr.period === "morning" && !(h >= 6 && h < 16)) return false;
  if (pr.period === "evening" && !(h >= 16 && h <= 23)) return false;
  return true;
}
// أفضل عرض فعّال لقسم معيّن (الأعلى نسبة)
function promoFor(promotions, cat) {
  const act = (promotions || []).filter(p => promoActiveNow(p) && (p.cat === "all" || p.cat === cat));
  if (!act.length) return null;
  return act.reduce((best, p) => (p.pct > best.pct ? p : best), act[0]);
}

const SEED_USERS = [];

const CATS = { games: "ألعاب فيديو", cafe: "كافيه" };
const TYPE_ICON = { billiard: "🎱", tennis: "🏓", football: "🎮" };
const TYPE_NAME = { billiard: "بلياردو", tennis: "تنس طاولة", football: "ألعاب إلكترونية" };
const TYPE_DEFAULT_RATE = { billiard: 15, tennis: 10, football: 40 };
// editable tables: each has its own rate (falls back to type default when created)
const SEED_TABLES = [
  { id: "b1", type: "billiard", name: "طاولة 1", rate: 15 },
  { id: "b2", type: "billiard", name: "طاولة 2", rate: 15 },
  { id: "b3", type: "billiard", name: "طاولة 3", rate: 20 },
  { id: "t1", type: "tennis", name: "طاولة 1", rate: 10 },
  { id: "t2", type: "tennis", name: "طاولة 2", rate: 10 },
  { id: "t3", type: "tennis", name: "طاولة 3", rate: 10 },
  { id: "f1", type: "football", name: "جهاز PS5 — 1", rate: 40 },
  { id: "f2", type: "football", name: "جهاز PS5 — 2", rate: 40 },
  { id: "f3", type: "football", name: "جهاز Xbox", rate: 50 },
];

const PERM_LABELS = {
  invoices: "إنشاء فواتير", discounts: "تطبيق خصومات", cancel: "إلغاء فواتير",
  reports: "عرض التقارير", customers: "إدارة الزبائن", prices: "تعديل الأسعار",
  purchases: "عرض المشتريات", inventory: "إدارة المخزون", salaries: "عرض المرتبات",
};

/* ---------- موارد وأصول النادي ---------- */
// status: active (موجود) | maintenance (صيانة) | damaged (تالف) | lost (مفقود)
const SEED_ASSETS = [];
const ASSET_STATUS = {
  active: { label: "موجود", icon: "✅", tone: "g", color: "#1a8c3e" },
  maintenance: { label: "في الصيانة", icon: "🔧", tone: "b", color: "#2a78d6" },
  damaged: { label: "تالف", icon: "⚠️", tone: "r", color: "#c0392b" },
  lost: { label: "مفقود", icon: "❓", tone: "a", color: "#8a6a20" },
};

// كل الصفحات القابلة للإظهار/الإخفاء لكل مستخدم (ما عدا صفحات الإدارة المقصورة على المدير)
const PAGE_LIST = [
  { id: "dashboard", label: "لوحة التحكم", icon: "▦" },
  { id: "pos", label: "نقطة البيع السريع", icon: "🛍" },
  { id: "sales", label: "المبيعات والفواتير", icon: "🧾" },
  { id: "purchases", label: "المشتريات", icon: "🛒" },
  { id: "products", label: "المنتجات", icon: "📦" },
  { id: "inventory", label: "المخزون والنواقص", icon: "🏬" },
  { id: "assets", label: "موارد النادي", icon: "🏛" },
  { id: "bookings", label: "حجز الطاولات", icon: "📅" },
  { id: "suppliers", label: "الموردون", icon: "🚚" },
  { id: "customers", label: "الزبائن", icon: "👥" },
  { id: "alerts", label: "تنبيهات السداد", icon: "🔔" },
  { id: "coupons", label: "كوبونات", icon: "🎟" },
  { id: "promos", label: "التخفيضات والعروض", icon: "🏷" },
  { id: "treasury", label: "الخزينة والإغلاق", icon: "💰" },
  { id: "expenses", label: "المصاريف", icon: "💵" },
  { id: "salaries", label: "المرتبات", icon: "🪪" },
  { id: "reports", label: "التقارير", icon: "📊" },
];

/* ---------- small UI atoms ---------- */
const Badge = ({ tone = "g", children, style }) => {
  const map = {
    g: { bg: "#e1f4e8", c: "#1a5c2e" }, a: { bg: "#fef3d9", c: "#8a6a20" },
    r: { bg: C.redbg, c: "#922" }, b: { bg: C.bluebg, c: C.blue },
    gold: { bg: "rgba(201,168,76,.16)", c: C.gdd }, p: { bg: C.purpbg, c: C.purp },
  };
  const t = map[tone] || map.g;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: t.bg, color: t.c, whiteSpace: "nowrap", ...style }}>{children}</span>;
};

const Crest = ({ size = 46 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.3))" }}>
    <defs><linearGradient id="ngg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0d080" /><stop offset="1" stopColor="#b8923c" /></linearGradient></defs>
    <path d="M50 6L88 22V52C88 74 70 90 50 96C30 90 12 74 12 52V22L50 6Z" fill="#1a5c2e" stroke="url(#ngg)" strokeWidth="2.5" />
    <path d="M50 32C50 32 50 46 44 52C40 56 36 56 36 56C36 56 40 56 43 60C46 64 46 72 50 72C54 72 54 64 57 60C60 56 64 56 64 56C64 56 60 56 56 52C50 46 50 32 50 32Z" fill="url(#ngg)" />
  </svg>
);

/* ============================ ROOT APP ============================ */
/* =========================================================================
   طبقة قاعدة البيانات — Supabase (سحابية) ← التخزين المحلي ← الذاكرة
   لتفعيل الحفظ السحابي والمزامنة بين الأجهزة:
   1) أنشئ مشروعاً مجانياً على supabase.com
   2) نفّذ ملف supabase-schema.sql في SQL Editor
   3) ضع الرابط والمفتاح أدناه (من Settings → API)
   ========================================================================= */
const SUPABASE_URL = "https://tbkkmhiujopckrcrjgtx.supabase.co";      // مثال: https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2ttaGl1am9wY2tyY3JqZ3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMzM5NTgsImV4cCI6MjA5ODkwOTk1OH0.G5WsW8c5vF0XZaSIPT1tfvZnKEFlOXzfeQYpjpgV8Zc"; // مفتاح anon public

const DB = {
  mode: "memory",   // supabase | local | memory
  ready: false,
  cache: {},
  client: null,
  timers: {},
  error: null,

  async init() {
    if (this.ready) return;
    // 1) المحاولة السحابية (Supabase)
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const mod = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        this.client = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await this.client.from("nk_store").select("k,v");
        if (error) throw error;
        (data || []).forEach(r => { this.cache[r.k] = r.v; });
        this.mode = "supabase"; this.ready = true; return;
      } catch (e) {
        this.error = "تعذّر الاتصال بـ Supabase — تم التحويل للتخزين المحلي";
        console.warn("Supabase:", e);
      }
    }
    // 2) التخزين المحلي للمتصفح
    try {
      localStorage.setItem("nk_test", "1"); localStorage.removeItem("nk_test");
      const raw = localStorage.getItem("nakheel_db");
      if (raw) this.cache = JSON.parse(raw);
      this.mode = "local"; this.ready = true; return;
    } catch (e) { /* بيئة تمنع localStorage */ }
    // 3) الذاكرة المؤقتة (تُفقد عند التحديث)
    this.mode = "memory"; this.ready = true;
  },

  // إزالة أي جلسة قديمة محفوظة (من نسخة سابقة كانت تحفظ الجلسة)
  clearStaleSession() {
    if (this.cache.session_user !== undefined) {
      delete this.cache.session_user;
      if (this.mode === "local") { try { localStorage.setItem("nakheel_db", JSON.stringify(this.cache)); } catch (e) {} }
      if (this.mode === "supabase" && this.client) { this.client.from("nk_store").delete().eq("k", "session_user").then(() => {}, () => {}); }
    }
  },

  get(k, fallback) { return this.cache[k] !== undefined ? this.cache[k] : fallback; },

  // هل سبق تهيئة قاعدة البيانات؟ (بعد التصفير تصبح مهيّأة لكن فارغة)
  isInitialized() { return this.cache.__initialized === true; },
  markInitialized() { if (this.cache.__initialized !== true) { this.cache.__initialized = true; this.flush("__initialized"); } },

  set(k, v) {
    this.cache[k] = v;
    clearTimeout(this.timers[k]);
    this.timers[k] = setTimeout(() => this.flush(k), 450); // حفظ مؤجَّل لتجميع التعديلات
  },

  async flush(k) {
    try {
      if (this.mode === "supabase" && this.client) {
        await this.client.from("nk_store").upsert({ k, v: this.cache[k], updated_at: new Date().toISOString() });
      } else if (this.mode === "local") {
        localStorage.setItem("nakheel_db", JSON.stringify(this.cache));
      }
    } catch (e) { console.warn("DB flush:", e); }
  },

  // تصفير كامل: يمسح البيانات ويعلّم القاعدة بأنها "مهيّأة فارغة" حتى لا تعود البيانات التجريبية
  async reset() {
    try {
      if (this.mode === "supabase" && this.client) {
        await this.client.from("nk_store").delete().neq("k", "");
        // اكتب علامة التهيئة مباشرة كي يبدأ النظام فارغاً بعد التحديث
        await this.client.from("nk_store").upsert({ k: "__initialized", v: true, updated_at: new Date().toISOString() });
      }
      if (this.mode === "local") {
        localStorage.setItem("nakheel_db", JSON.stringify({ __initialized: true }));
      }
    } catch (e) { console.warn("reset:", e); }
    this.cache = { __initialized: true };
    window.location.reload();
  },

  /* ---------- النسخ الاحتياطي ---------- */
  // تصدير كل البيانات ككائن واحد (مع بيانات وصفية)
  exportData() {
    const data = {};
    Object.keys(this.cache).forEach(k => { if (!k.startsWith("__") && k !== "session_user") data[k] = this.cache[k]; });
    return {
      __nakheel_backup: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      mode: this.mode,
      data,
    };
  },

  // استيراد نسخة احتياطية (يستبدل كل البيانات)
  async importData(backup) {
    if (!backup || !backup.__nakheel_backup || !backup.data) throw new Error("ملف غير صالح");
    const data = backup.data;
    // اكتب كل المفاتيح
    Object.keys(data).forEach(k => { this.cache[k] = data[k]; });
    this.cache.__initialized = true;
    // احفظ في المخزن
    if (this.mode === "supabase" && this.client) {
      const rows = Object.keys(this.cache).map(k => ({ k, v: this.cache[k], updated_at: new Date().toISOString() }));
      await this.client.from("nk_store").upsert(rows);
    } else if (this.mode === "local") {
      localStorage.setItem("nakheel_db", JSON.stringify(this.cache));
    }
    return true;
  },

  // نسخة احتياطية داخلية تلقائية (تُحفظ في نفس المخزن تحت مفتاح خاص)
  saveAutoBackup() {
    const snap = this.exportData();
    this.cache.__autobackup = snap;
    this.cache.__lastBackup = snap.exportedAt;
    this.flush("__autobackup"); this.flush("__lastBackup");
    return snap.exportedAt;
  },
  getAutoBackup() { return this.cache.__autobackup || null; },
  lastBackupAt() { return this.cache.__lastBackup || null; },
};

// عدّ العناصر داخل نسخة احتياطية (للعرض)
function backupCounts(data) {
  const keys = { products: "منتج", customers: "زبون", suppliers: "مورد", invoices: "فاتورة", purchases: "توريد", expenses: "مصروف", promotions: "عرض", coupons: "كوبون" };
  const out = [];
  Object.keys(keys).forEach(k => { const arr = data[k]; if (Array.isArray(arr) && arr.length) out.push(`${arr.length} ${keys[k]}`); });
  return out;
}

// بديل useState يحفظ تلقائياً في قاعدة البيانات
// alwaysSeed=true للإعدادات والمستخدمين (تبقى قيمها الافتراضية بعد التصفير كي يظل النظام صالحاً)
function usePersistentState(key, seed, alwaysSeed = false) {
  const [val, setVal] = useState(() => {
    const saved = DB.get(key, undefined);
    if (saved !== undefined) {
      // دمج الكائنات (كالإعدادات): الحقول الجديدة تأخذ قيمها الافتراضية والمحفوظة تبقى
      if (saved && seed && typeof saved === "object" && typeof seed === "object" && !Array.isArray(saved) && !Array.isArray(seed)) {
        return { ...seed, ...saved };
      }
      return saved;
    }
    // لا توجد قيمة محفوظة لهذا المفتاح:
    // - config (alwaysSeed) → استخدم الافتراضي دائماً
    // - data: إذا كانت القاعدة مهيّأة (بعد تصفير/استخدام) → فارغ، وإلا → بيانات تجريبية أول مرة
    if (alwaysSeed) return seed;
    if (DB.isInitialized()) {
      return Array.isArray(seed) ? [] : (seed && typeof seed === "object" ? {} : (typeof seed === "number" ? 0 : null));
    }
    return seed;
  });
  const set = (v) => setVal(prev => {
    const next = typeof v === "function" ? v(prev) : v;
    DB.set(key, next);
    return next;
  });
  return [val, set];
}

/* ---- شاشة الإقلاع: تحميل قاعدة البيانات قبل عرض النظام ---- */
export default function NakheelSystemRoot() {
  const [ready, setReady] = useState(DB.ready);
  useEffect(() => {
    const boot = async () => {
      if (!DB.ready) await DB.init();
      setReady(true);
      // بعد أول إقلاع ناجح، علّم القاعدة بأنها مهيّأة
      // (البيانات التجريبية زُرعت مرة واحدة؛ لن تعود بعد التصفير)
      DB.clearStaleSession();
      DB.markInitialized();
    };
    boot();
  }, []);
  if (!ready) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#14431f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'Tajawal',sans-serif" }}>
        <Crest size={72} />
        <div style={{ color: "#f0d080", fontSize: 18, fontWeight: 900 }}>نادي النخيل</div>
        <div style={{ color: "#c9a84c", fontSize: 12.5 }}>⏳ جارٍ تحميل قاعدة البيانات...</div>
      </div>
    );
  }
  return <NakheelApp />;
}

function NakheelApp() {
  // session state — لا تُحفظ دائمياً: كل زيارة للموقع تتطلب تسجيل دخول
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  // global settings
  const [settings, setSettings] = usePersistentState("settings", {
    logo: null,               // data URL for custom logo
    theme: "gold",            // gold | emerald | royal | sunset | ocean
    dark: false,              // night mode
    posMode: "grid",          // grid | list | compact
    printer: "xprinter",      // xprinter (80mm) | a4
    clubName: "نادي النخيل",
    clubSub: "النادي الرياضي الترفيهي",
    address: "مصراتة، ليبيا",
    phone: "0913-000-111",
    welcomeTitle: "أهلاً بك في نادي النخيل",
    welcomeMsg: "نتمنى لك وقتاً ممتعاً!",
    invoiceFooter: "شكراً لزيارتكم — نادي النخيل",
    invoiceShowLogo: true,
    currency: "د.ل",
    animations: true,
  }, true);

  // data stores — كلها محفوظة دائمياً
  const [products, setProducts] = usePersistentState("products", SEED_PRODUCTS);
  const [customers, setCustomers] = usePersistentState("customers", SEED_CUSTOMERS);
  const [suppliers, setSuppliers] = usePersistentState("suppliers", SEED_SUPPLIERS);
  const [invoices, setInvoices] = usePersistentState("invoices", SEED_INVOICES);
  const [purchases, setPurchases] = usePersistentState("purchases", SEED_PURCHASES);
  const [expenses, setExpenses] = usePersistentState("expenses", SEED_EXPENSES);
  const [employees, setEmployees] = usePersistentState("employees", SEED_EMPLOYEES);
  const [coupons, setCoupons] = usePersistentState("coupons", SEED_COUPONS);
  const [promotions, setPromotions] = usePersistentState("promotions", SEED_PROMOS);
  const [assets, setAssets] = usePersistentState("assets", SEED_ASSETS);
  const [closings, setClosings] = usePersistentState("closings", []);
  const [users, setUsers] = usePersistentState("users", SEED_USERS);
  const [bookings, setBookings] = usePersistentState("bookings", {}); // الحجوزات النشطة تنجو من تحديث الصفحة
  const [tables, setTables] = usePersistentState("tables", SEED_TABLES, true);
  const [cats, setCats] = usePersistentState("cats", { games: "ألعاب فيديو", cafe: "كافيه" }, true);
  const [completedBookings, setCompletedBookings] = usePersistentState("completed_bookings", []);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // derived totals
  const totals = useMemo(() => {
    // الإيرادات = الفواتير المدفوعة فقط (حجوزات الطاولات تُنشئ فواتيرها تلقائياً، فلا تُحسب مرتين)
    const paid = invoices.filter(i => i.status === "مدفوعة");
    const revenue = paid.reduce((s, i) => s + i.total, 0);
    // تكلفة البضاعة المباعة
    const cogs = paid.reduce((s, i) => s + (i.cost || 0), 0);
    const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
    // صافي الربح = الإيرادات − تكلفة البضاعة − المصاريف
    return { revenue, cogs, expTotal, profit: revenue - cogs - expTotal };
  }, [invoices, expenses]);

  // overdue alerts: deferred invoices past due date
  const overdueAlerts = useMemo(() => {
    return invoices
      .filter(iv => overdueDays(iv) > 0)
      .map(iv => ({ ...iv, late: overdueDays(iv), customer: iv.customer }))
      .sort((a, b) => b.late - a.late);
  }, [invoices]);

  // ---- responsive: tablet/drawer support (hooks must precede the login return) ----
  const [scrW, setScrW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrW(window.innerWidth);
    window.addEventListener("resize", on);
    // ensure proper scaling on tablets
    if (!document.querySelector('meta[name="viewport"]')) {
      const m = document.createElement("meta");
      m.name = "viewport"; m.content = "width=device-width, initial-scale=1, viewport-fit=cover";
      document.head.appendChild(m);
    }
    return () => window.removeEventListener("resize", on);
  }, []);
  const isTab = scrW <= 1080; // tablets & below: drawer nav + stacked layouts

  // in-app PDF document preview (no popups)
  const [pdfDoc, setPdfDoc] = useState(null);
  useEffect(() => { PDF_HOOK.show = setPdfDoc; return () => { PDF_HOOK.show = null; }; }, []);

  // إعداد أولي: إن لم يوجد أي مستخدم (بعد التصفير) → شاشة إنشاء المدير الرئيسي
  if (!users || users.length === 0) {
    return <FirstSetup settings={settings} onCreate={(admin) => { setUsers([admin]); setUser(admin); }} />;
  }

  if (!user) return <Login users={users} onLogin={setUser} settings={settings} />;

  // apply active theme to shared palette before rendering
  applyTheme(settings);
  Object.assign(CATS, cats); // keep global category labels in sync

  const ctx = {
    user, products, setProducts, customers, setCustomers, suppliers, setSuppliers,
    invoices, setInvoices, purchases, setPurchases, expenses, setExpenses,
    employees, setEmployees, coupons, setCoupons, users, setUsers,
    promotions, setPromotions,
    assets, setAssets,
    closings, setClosings,
    bookings, setBookings, completedBookings, setCompletedBookings, tables, setTables,
    cats, setCats,
    settings, setSettings,
    totals, showToast, overdueAlerts,
  };

  const can = (perm) => user.perms[perm] || user.role === "مدير";

  const NAV = [
    { sec: "الرئيسية", items: [
      { id: "dashboard", label: "لوحة التحكم", icon: "▦" },
      { id: "pos", label: "نقطة البيع السريع", icon: "🛍" },
    ]},
    { sec: "العمليات", items: [
      { id: "sales", label: "المبيعات والفواتير", icon: "🧾" },
      { id: "purchases", label: "المشتريات", icon: "🛒", perm: "purchases" },
      { id: "products", label: "المنتجات", icon: "📦" },
      { id: "inventory", label: "المخزون والنواقص", icon: "🏬", perm: "inventory" },
      { id: "assets", label: "موارد النادي", icon: "🏛" },
      { id: "bookings", label: "حجز الطاولات", icon: "📅" },
      { id: "suppliers", label: "الموردون", icon: "🚚", perm: "purchases" },
      { id: "customers", label: "الزبائن", icon: "👥", perm: "customers" },
      { id: "alerts", label: "تنبيهات السداد", icon: "🔔", perm: "customers" },
      { id: "coupons", label: "كوبونات", icon: "🎟" },
      { id: "promos", label: "التخفيضات والعروض", icon: "🏷" },
    ]},
    { sec: "المصروفات", items: [
      { id: "treasury", label: "الخزينة والإغلاق", icon: "💰" },
      { id: "expenses", label: "المصاريف", icon: "💵" },
      { id: "salaries", label: "المرتبات", icon: "🪪", perm: "salaries" },
    ]},
    { sec: "التحليلات", items: [
      { id: "reports", label: "التقارير", icon: "📊", perm: "reports" },
    ]},
    { sec: "الإدارة", items: [
      { id: "users", label: "المستخدمون", icon: "🛡", admin: true },
      { id: "settings", label: "الإعدادات", icon: "⚙", admin: true },
    ]},
  ];

  const visibleItem = (it) => {
    if (it.admin) return user.role === "مدير"; // صفحات الإدارة للمدير فقط
    if (user.role === "مدير") return true;      // المدير يرى كل شيء
    // إخفاء صريح لصفحة من قبل المدير
    if (user.pages && user.pages[it.id] === false) return false;
    // صلاحيات تفصيلية (احتياطية)
    if (it.perm && !can(it.perm)) return false;
    return true;
  };

  // attach responsive info to ctx + drawer-aware navigation
  ctx.scr = { w: scrW, isTab };
  const goPage = (id) => { setPage(id); setNavOpen(false); };

  // إن كانت الصفحة الحالية مخفية عن المستخدم، انتقل لأول صفحة مسموحة
  // (يُحسب أثناء التصيير بأمان بدل useEffect لتفادي اختلاف ترتيب الخطافات)
  if (user.role !== "مدير") {
    const allPages = NAV.flatMap(g => g.items);
    const currentItem = allPages.find(it => it.id === page);
    if (currentItem && !visibleItem(currentItem)) {
      const firstVisible = allPages.find(it => visibleItem(it));
      if (firstVisible && firstVisible.id !== page) {
        // أجّل التحديث لتفادي setState أثناء التصيير
        setTimeout(() => setPage(firstVisible.id), 0);
      }
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal',sans-serif", background: C.pg, color: C.ink, minHeight: "100vh", fontSize: 13, transition: settings.animations ? "background .4s ease, color .4s ease" : "none" }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes nkFadeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:none;} }
        @keyframes nkPop { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes nkGlow { 0%,100%{box-shadow:0 0 0 0 ${C.gold}44} 50%{box-shadow:0 0 0 6px ${C.gold}00} }
        .nk-page { animation: ${settings.animations ? "nkFadeUp .35s ease" : "none"}; }
        .nk-nav-item { transition: ${settings.animations ? "background .18s, color .18s, border-color .18s, padding .18s" : "none"}; }
        .nk-nav-item:hover { padding-right: 1.15rem !important; }
        .nk-card-hover { transition: ${settings.animations ? "transform .2s, box-shadow .2s" : "none"}; }
        .nk-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.10); }
        * { scrollbar-width: thin; scrollbar-color: ${C.gold}66 transparent; }
        /* ---- تحسينات اللمس للأجهزة اللوحية ---- */
        html { -webkit-text-size-adjust: 100%; }
        button, input, select, textarea, [role="button"] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        @media (pointer: coarse) {
          input, select, textarea { font-size: 16px !important; min-height: 40px; }
          button { min-height: 36px; }
        }
        .nk-tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .nk-tbl-wrap table { min-width: 560px; }
        /* تلميع بصري: استجابة الضغط والتركيز */
        button:active { transform: scale(.97); }
        button, a { transition: ${settings.animations ? "transform .1s ease, background .15s, box-shadow .15s" : "none"}; }
        input:focus, select:focus, textarea:focus { border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.gold}22 !important; }
        tbody tr { transition: background .12s; }
        tbody tr:hover td { background: ${C.gold}0d; }
        ::selection { background: ${C.gold}55; }
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-thumb { background: ${C.gold}55; border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: ${C.gold}99; }
        *::-webkit-scrollbar-track { background: transparent; }
        button:hover { filter: brightness(1.05); }
        @keyframes nkModalIn { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
        .nk-modal-in { animation: nkModalIn .25s ease; }
        /* عند الطباعة الاحتياطية: يُطبع المستند فقط */
        @media print {
          body.nk-printing * { visibility: hidden !important; }
          body.nk-printing .nk-pdf-sheet, body.nk-printing .nk-pdf-sheet * { visibility: visible !important; }
          body.nk-printing .nk-pdf-sheet { position: absolute !important; top: 0; right: 0; left: 0; margin: 0 !important; max-width: none !important; box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* TOP BAR (tablet) */}
      {isTab && (
        <div style={{ position: "sticky", top: 0, zIndex: 90, display: "flex", alignItems: "center", gap: 10, background: C.grn, padding: ".6rem .9rem", boxShadow: "0 2px 10px rgba(0,0,0,.18)" }}>
          <button onClick={() => setNavOpen(true)} aria-label="القائمة" style={{ background: C.gold + "22", border: `1px solid ${C.gold}66`, color: C.gld, borderRadius: 9, fontSize: 19, padding: ".2rem .65rem", cursor: "pointer", fontFamily: "inherit" }}>☰</button>
          {settings.logo ? <img src={settings.logo} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} /> : <Crest size={30} />}
          <div style={{ flex: 1, fontSize: 14, fontWeight: 900, color: C.gld }}>{settings.clubName}</div>
          {overdueAlerts.length > 0 && (
            <button onClick={() => goPage("alerts")} style={{ background: "#e34948", color: "#fff", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, padding: ".25rem .6rem", cursor: "pointer", fontFamily: "inherit" }}>🔔 {overdueAlerts.length}</button>
          )}
        </div>
      )}

      {/* BACKDROP (tablet drawer) */}
      {isTab && navOpen && (
        <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 99 }} />
      )}

      {/* SIDEBAR */}
      <div style={{ position: "fixed", top: 0, right: 0, width: isTab ? 260 : 225, height: "100vh", background: `linear-gradient(180deg,${C.grn} 0%, ${C.dark ? "#0a0906" : "#0e3318"} 100%)`, overflowY: "auto", zIndex: 100, display: "flex", flexDirection: "column",
        transform: isTab ? (navOpen ? "translateX(0)" : "translateX(100%)") : "none",
        transition: "transform .28s ease" + (settings.animations ? ", background .4s ease" : ""),
        boxShadow: isTab && navOpen ? "-8px 0 30px rgba(0,0,0,.35)" : "none" }}>
        {isTab && (
          <button onClick={() => setNavOpen(false)} style={{ position: "absolute", top: 10, left: 10, background: "rgba(255,255,255,.12)", border: "none", color: "#fff", borderRadius: 8, fontSize: 15, width: 30, height: 30, cursor: "pointer" }}>✕</button>
        )}
        <div style={{ padding: "1.1rem .9rem", borderBottom: `1px solid ${C.gold}40`, display: "flex", alignItems: "center", gap: 9, background: "rgba(0,0,0,.12)" }}>
          {settings.logo
            ? <img src={settings.logo} alt="logo" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            : <Crest size={46} />}
          <div><div style={{ fontSize: 14, fontWeight: 900, color: C.gld }}>{settings.clubName}</div><div style={{ fontSize: 9, color: C.gld + "8c", marginTop: 1 }}>{settings.clubSub}</div></div>
        </div>
        <div style={{ padding: ".35rem 0", flex: 1 }}>
          {NAV.map((grp) => {
            const items = grp.items.filter(visibleItem);
            if (!items.length) return null;
            return (
              <div key={grp.sec}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.32)", padding: ".5rem .95rem .18rem", letterSpacing: 1 }}>{grp.sec}</div>
                {items.map((it) => (
                  <div key={it.id} onClick={() => goPage(it.id)} className="nk-nav-item"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: ".46rem .95rem", cursor: "pointer", fontSize: 12.5,
                      color: page === it.id ? C.gld : "rgba(255,255,255,.65)",
                      borderRight: page === it.id ? `3px solid ${C.gold}` : "3px solid transparent",
                      background: page === it.id ? C.gold + "20" : "transparent" }}>
                    <span style={{ width: 16, textAlign: "center" }}>{it.icon}</span>{it.label}
                    {it.id === "alerts" && overdueAlerts.length > 0 && (
                      <span style={{ marginRight: "auto", background: "#e34948", color: "#fff", fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", animation: settings.animations ? "nkGlow 2s infinite" : "none" }}>{overdueAlerts.length}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={{ padding: ".85rem .95rem", borderTop: "1px solid rgba(201,168,76,.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 29, height: 29, borderRadius: "50%", background: C.gold, color: C.grn, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{user.name.slice(0, 2)}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: "rgba(255,255,255,.82)", fontWeight: 500 }}>{user.name}</div><div style={{ fontSize: 10, color: "rgba(255,255,255,.38)" }}>{user.role}{user.shift !== "—" ? " — " + user.shift : ""}</div></div>
            <button onClick={() => { setUser(null); setPage("dashboard"); setNavOpen(false); }} title="تسجيل الخروج" style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16 }}>⎋</button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginRight: isTab ? 0 : 225, minHeight: "100vh", padding: isTab ? ".9rem .8rem" : "1.1rem 1.4rem" }}>
        <div className="nk-page" key={page}>
        {page === "dashboard" && <Dashboard ctx={ctx} go={setPage} />}
        {page === "pos" && <POS ctx={ctx} can={can} />}
        {page === "sales" && <Sales ctx={ctx} can={can} />}
        {page === "purchases" && <Purchases ctx={ctx} />}
        {page === "products" && <Products ctx={ctx} can={can} />}
        {page === "inventory" && <Inventory ctx={ctx} />}
        {page === "assets" && <Assets ctx={ctx} />}
        {page === "bookings" && <Bookings ctx={ctx} />}
        {page === "suppliers" && <Suppliers ctx={ctx} />}
        {page === "customers" && <Customers ctx={ctx} />}
        {page === "alerts" && <Alerts ctx={ctx} />}
        {page === "coupons" && <Coupons ctx={ctx} />}
        {page === "promos" && <Promotions ctx={ctx} />}
        {page === "treasury" && <Treasury ctx={ctx} />}
        {page === "expenses" && <Expenses ctx={ctx} />}
        {page === "salaries" && <Salaries ctx={ctx} />}
        {page === "reports" && <Reports ctx={ctx} />}
        {page === "users" && <Users ctx={ctx} />}
        {page === "settings" && <Settings ctx={ctx} />}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.grn, color: "#fff", padding: ".85rem 1.4rem", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 600, boxShadow: "0 8px 24px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 8, animation: settings.animations ? "nkPop .3s ease" : "none" }}>✓ {toast}</div>
      )}

      {/* PDF PREVIEW OVERLAY */}
      {pdfDoc && <PdfPreview doc={pdfDoc} onClose={() => setPdfDoc(null)} />}
    </div>
  );
}

/* ============================ LOGIN ============================ */
/* ============================ FIRST SETUP (إنشاء المدير الرئيسي) ============================ */
function FirstSetup({ settings = {}, onCreate }) {
  const [f, setF] = useState({ name: "", username: "admin", password: "", confirm: "", clubName: settings.clubName || "نادي النخيل" });
  const [err, setErr] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const create = () => {
    if (!f.name.trim()) { setErr("أدخل اسمك الكامل"); return; }
    if (!f.username.trim()) { setErr("أدخل اسم المستخدم"); return; }
    if (!f.password || f.password.length < 4) { setErr("أدخل رمز دخول من 4 خانات على الأقل"); return; }
    if (f.password !== f.confirm) { setErr("رمز الدخول وتأكيده غير متطابقين"); return; }
    const admin = {
      id: 1, name: f.name.trim(), username: f.username.trim(), password: f.password, role: "مدير", shift: "—", active: true,
      perms: { invoices: true, discounts: true, cancel: true, reports: true, customers: true, prices: true, purchases: true, inventory: true, salaries: true },
      pages: {},
    };
    onCreate(admin);
  };

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal',sans-serif", minHeight: "100vh", background: "radial-gradient(circle at 30% 20%, #1a5c2e 0%, #14431f 45%, #0a2712 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <div style={{ background: "#fff", borderRadius: 22, padding: "2.2rem 2rem", width: 460, maxWidth: "95vw", boxShadow: "0 24px 70px rgba(0,0,0,.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>{settings.logo ? <img src={settings.logo} alt="" style={{ width: 66, height: 66, borderRadius: 16, objectFit: "cover" }} /> : <Crest size={66} />}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.grn2 }}>مرحباً بك في {f.clubName}</div>
          <div style={{ display: "inline-block", background: C.gold + "1c", color: C.gdd, fontSize: 12, fontWeight: 700, borderRadius: 20, padding: ".25rem .9rem", marginTop: 8 }}>⚙ الإعداد الأولي — إنشاء حساب المدير</div>
          <div style={{ fontSize: 12, color: C.mt, marginTop: 10, lineHeight: 1.8 }}>هذه أول مرة تشغّل فيها النظام (أو بعد تصفيره).<br />أنشئ حساب المدير الرئيسي للبدء.</div>
        </div>

        <div style={{ textAlign: "right", marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.mt, fontWeight: 600 }}>الاسم الكامل *</label>
          <input value={f.name} autoFocus onChange={e => { set("name", e.target.value); setErr(""); }} placeholder="مثال: أحمد الحسين"
            style={{ width: "100%", marginTop: 4, fontSize: 13, border: `0.5px solid ${C.bc}`, borderRadius: 10, padding: ".6rem .8rem", background: C.crm, fontFamily: "inherit", outline: "none" }} />
        </div>
        <div style={{ textAlign: "right", marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.mt, fontWeight: 600 }}>اسم المستخدم (للدخول) *</label>
          <input value={f.username} onChange={e => { set("username", e.target.value); setErr(""); }} placeholder="admin"
            onKeyDown={e => e.key === "Enter" && create()}
            style={{ width: "100%", marginTop: 4, fontSize: 13, border: `0.5px solid ${C.bc}`, borderRadius: 10, padding: ".6rem .8rem", background: C.crm, fontFamily: "inherit", outline: "none", direction: "ltr", textAlign: "left" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ textAlign: "right" }}>
            <label style={{ fontSize: 11, color: C.mt, fontWeight: 600 }}>رمز الدخول *</label>
            <input type={showPwd ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={e => { set("password", e.target.value); setErr(""); }} placeholder="••••••"
              style={{ width: "100%", marginTop: 4, fontSize: 14, border: `0.5px solid ${C.bc}`, borderRadius: 10, padding: ".6rem .8rem", background: C.crm, fontFamily: "inherit", outline: "none" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <label style={{ fontSize: 11, color: C.mt, fontWeight: 600 }}>تأكيد الرمز *</label>
            <input type={showPwd ? "text" : "password"} autoComplete="new-password" value={f.confirm} onChange={e => { set("confirm", e.target.value); setErr(""); }} placeholder="••••••" onKeyDown={e => e.key === "Enter" && create()}
              style={{ width: "100%", marginTop: 4, fontSize: 14, border: `0.5px solid ${C.bc}`, borderRadius: 10, padding: ".6rem .8rem", background: C.crm, fontFamily: "inherit", outline: "none" }} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.mt, marginBottom: 12, cursor: "pointer" }}><input type="checkbox" checked={showPwd} onChange={e => setShowPwd(e.target.checked)} /> إظهار الرمز أثناء الكتابة</label>

        {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 12, textAlign: "center" }}>{err}</div>}

        <button onClick={create} style={{ width: "100%", padding: ".8rem", borderRadius: 12, background: "linear-gradient(135deg,#c9a84c,#b8923c)", color: "#fff", border: "none", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ إنشاء الحساب والدخول</button>

        <div style={{ fontSize: 10.5, color: C.mt, marginTop: 16, textAlign: "center", lineHeight: 1.7 }}>
          سيحصل هذا الحساب على كامل صلاحيات الإدارة.<br />
          يمكنك إضافة بائعين وموظفين لاحقاً من قسم المستخدمين.
        </div>
      </div>
    </div>
  );
}

function Login({ users, onLogin, settings = {} }) {
  const [selected, setSelected] = useState(null);
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");
  const activeUsers = users.filter(u => u.active);

  const submit = () => {
    if (!selected) { setErr("اختر المستخدم أولاً"); return; }
    // التحقق من رمز الدخول: يكتبه المستخدم بنفسه (بلا تعبئة تلقائية)
    if (selected.password) {
      if (pwd !== selected.password) { setErr("رمز الدخول غير صحيح"); setPwd(""); return; }
    }
    onLogin(selected);
  };
  const roleIcon = (r) => r === "مدير" ? "👑" : "🧑‍💼";

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal',sans-serif", minHeight: "100vh", background: "radial-gradient(circle at 30% 20%, #1a5c2e 0%, #14431f 45%, #0a2712 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes nkPopIn{0%{opacity:0;transform:translateY(18px) scale(.97)}100%{opacity:1;transform:none}}@keyframes nkGlowBg{0%,100%{opacity:.55}50%{opacity:.85}}`}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 75% 80%, rgba(201,168,76,.14) 0%, transparent 45%)", animation: "nkGlowBg 5s ease-in-out infinite" }} />
      <div style={{ background: "#fff", borderRadius: 22, padding: "2.2rem 2rem", width: 440, maxWidth: "95vw", boxShadow: "0 24px 70px rgba(0,0,0,.45)", animation: "nkPopIn .4s ease", position: "relative" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>{settings.logo ? <img src={settings.logo} alt="" style={{ width: 66, height: 66, borderRadius: 16, objectFit: "cover" }} /> : <Crest size={66} />}</div>
          <div style={{ fontSize: 21, fontWeight: 900, color: C.grn2 }}>{settings.clubName || "نادي النخيل"}</div>
          <div style={{ fontSize: 12, color: C.mt, marginBottom: 22 }}>{selected ? `مرحباً ${selected.name}` : "اختر المستخدم لتسجيل الدخول"}</div>
        </div>

        {!selected ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {activeUsers.map(u => (
              <div key={u.id} onClick={() => { setSelected(u); setErr(""); }} className="nk-card-hover" style={{ cursor: "pointer", border: `1px solid ${C.bc}`, borderRadius: 14, padding: "1rem .8rem", textAlign: "center", background: C.crm }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto 8px", background: u.role === "مدير" ? C.gold + "22" : C.grl + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{roleIcon(u.role)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: C.mt, marginTop: 2 }}>{u.role}{u.shift !== "—" ? ` · ${u.shift}` : ""}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.crm, borderRadius: 12, padding: ".7rem .85rem", marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: selected.role === "مدير" ? C.gold + "22" : C.grl + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>{roleIcon(selected.role)}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</div><div style={{ fontSize: 11, color: C.mt }}>{selected.role}</div></div>
              <button onClick={() => { setSelected(null); setPwd(""); setErr(""); }} style={{ background: "none", border: "none", color: C.mt, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>تغيير</button>
            </div>
            <label style={{ fontSize: 11, color: C.mt, fontWeight: 600 }}>رمز الدخول</label>
            <div style={{ position: "relative", marginTop: 4, marginBottom: 16 }}>
              <input type={showPwd ? "text" : "password"} autoFocus autoComplete="new-password" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••"
                style={{ width: "100%", fontSize: 14, letterSpacing: showPwd ? 0 : 2, border: `0.5px solid ${C.bc}`, borderRadius: 10, padding: ".6rem 2.4rem .6rem .8rem", background: C.crm, fontFamily: "inherit", outline: "none" }} />
              <button onClick={() => setShowPwd(s => !s)} tabIndex={-1} title={showPwd ? "إخفاء" : "إظهار"} style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: C.mt, padding: 4 }}>{showPwd ? "🙈" : "👁"}</button>
            </div>
            {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{err}</div>}
            <button onClick={() => submit()} style={{ width: "100%", padding: ".72rem", borderRadius: 12, background: "linear-gradient(135deg,#c9a84c,#b8923c)", color: "#fff", border: "none", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>دخول →</button>
          </div>
        )}
        <div style={{ fontSize: 10.5, color: C.mt, marginTop: 18, textAlign: "center", lineHeight: 1.7 }}>
          نظام إدارة متكامل — {new Date().getFullYear()}<br />
          <span style={{ fontSize: 10 }}>أدخل رمز الدخول الخاص بك — يديره المدير من قسم المستخدمين</span>
        </div>
      </div>
    </div>
  );
}


/* ============================ SHARED LAYOUT ============================ */
function PageTop({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem", flexWrap: "wrap", gap: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ display: "flex", gap: 7 }}>{action}</div>
    </div>
  );
}
const Card = ({ children, style }) => (
  <div style={{ background: C.cd, border: `0.5px solid ${C.bc}`, borderRadius: 13, padding: ".95rem 1.05rem", boxShadow: "0 1px 2px rgba(20,67,31,.03)", ...style }}>{children}</div>
);
const CardHead = ({ title, sub, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".85rem", flexWrap: "wrap", gap: 6 }}>
    <div><div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>{sub && <div style={{ fontSize: 11, color: C.mt }}>{sub}</div>}</div>
    {right}
  </div>
);
const Btn = ({ children, onClick, gold, danger, sm, style }) => (
  <button onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: 5, padding: sm ? ".2rem .58rem" : ".36rem .82rem",
    borderRadius: 8, fontSize: sm ? 11.5 : 12.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
    border: `1px solid ${danger ? "rgba(192,57,43,.3)" : C.bc}`,
    background: gold ? "linear-gradient(135deg,#c9a84c,#b8923c)" : C.cd,
    color: gold ? "#fff" : danger ? C.red : C.ink, ...style,
  }}>{children}</button>
);
const KCard = ({ label, value, sub, bar = C.gold, delta }) => (
  <div style={{ background: C.cd, border: `0.5px solid ${C.bc}`, borderRadius: 13, padding: ".85rem 1rem", position: "relative", overflow: "hidden", boxShadow: "0 1px 2px rgba(20,67,31,.04)" }}>
    <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: bar }} />
    <div style={{ fontSize: 11, color: C.mt, marginBottom: ".18rem", fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.mt, marginTop: 2 }}>{sub}</div>}
    {delta && <div style={{ fontSize: 11, marginTop: ".28rem", fontWeight: 500, color: delta.up ? "#1a8c3e" : C.red }}>{delta.up ? "▲" : "▼"} {delta.text}</div>}
  </div>
);
const Field = ({ label, children, full }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: ".75rem", gridColumn: full ? "1/-1" : "auto" }}>
    <label style={{ fontSize: 11, color: C.mt, fontWeight: 600 }}>{label}</label>{children}
  </div>
);
const inputStyle = { fontSize: 12.5, border: `0.5px solid ${C.bc}`, borderRadius: 8, padding: ".4rem .7rem", background: C.crm, color: C.ink, outline: "none", fontFamily: "inherit", width: "100%" };
const Inp = (p) => <input {...p} style={{ ...inputStyle, ...(p.style || {}) }} />;
const Sel = (p) => <select {...p} style={{ ...inputStyle, ...(p.style || {}) }}>{p.children}</select>;

function Modal({ title, onClose, children, width = 540 }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(10,30,15,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div className="nk-modal-in" style={{ background: C.cd, borderRadius: 16, padding: "1.4rem 1.5rem", width, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: "1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {title}<button onClick={onClose} style={{ cursor: "pointer", color: C.mt, fontSize: 18, background: "none", border: "none", fontFamily: "inherit" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
const Table = ({ cols, rows }) => (
  <div className="nk-tbl-wrap">
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <thead><tr>{cols.map((c, i) => <th key={i} style={{ width: c.w, textAlign: "right", padding: ".42rem .5rem", color: C.mt, fontWeight: 600, borderBottom: `1px solid ${C.bc}`, fontSize: 11 }}>{c.h}</th>)}</tr></thead>
      <tbody>{rows.map((r, ri) => (
        <tr key={ri}>{r.map((cell, ci) => <td key={ci} style={{ padding: ".48rem .5rem", borderBottom: `0.5px solid rgba(201,168,76,.09)`, color: C.k2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</td>)}</tr>
      ))}</tbody>
    </table>
  </div>
);

/* ============================ DASHBOARD ============================ */
function MiniBars({ data, max, color }) {
  return (
    <svg viewBox="0 0 300 120" style={{ width: "100%", height: 120 }}>
      {data.map((d, i) => {
        const h = (d / max) * 90;
        const x = 20 + i * 46;
        return <g key={i}>
          <rect x={x} y={100 - h} width={28} height={h} rx={4} fill={color} />
        </g>;
      })}
      <line x1="10" y1="100" x2="290" y2="100" stroke={C.bc} strokeWidth="1" />
    </svg>
  );
}
function Donut({ segments, size = 150 }) {
  const total = segments.reduce((s, x) => s + x.v, 0);
  let acc = 0; const r = 52, cx = size / 2, cy = size / 2, sw = 22;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {segments.map((seg, i) => {
        const frac = seg.v / total;
        const start = acc * 2 * Math.PI - Math.PI / 2;
        acc += frac;
        const end = acc * 2 * Math.PI - Math.PI / 2;
        const large = frac > 0.5 ? 1 : 0;
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
        return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={seg.c} strokeWidth={sw} />;
      })}
    </svg>
  );
}
function Dashboard({ ctx, go }) {
  const { totals, invoices, products, overdueAlerts, completedBookings, cats, settings } = ctx;
  const cur = settings?.currency || "د.ل";
  const low = products.filter(p => p.stock !== null && p.min && p.stock < p.min);

  // آخر 7 أيام — إيراد فعلي من الفواتير المدفوعة
  const last7 = useMemo(() => {
    const days = [], labels = [];
    const dayName = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const rev = invoices.filter(v => v.date === iso && v.status === "مدفوعة").reduce((s, v) => s + v.total, 0);
      days.push(rev); labels.push(i === 0 ? "اليوم" : dayName[d.getDay()]);
    }
    return { days, labels, max: Math.max(1000, ...days) };
  }, [invoices]);

  const todayISOv = new Date().toISOString().split("T")[0];
  const todayRev = invoices.filter(v => v.date === todayISOv && v.status === "مدفوعة").reduce((s, v) => s + v.total, 0);
  const todayCount = invoices.filter(v => v.date === todayISOv).length;

  // حالة النسخ الاحتياطي
  const lastBackup = DB.lastBackupAt();
  const bkDays = lastBackup ? Math.floor((Date.now() - new Date(lastBackup)) / 86400000) : null;
  const backupOverdue = bkDays === null || bkDays >= (settings.backupFreq || 7);

  // توزيع المبيعات حسب القسم (من مصدر الفاتورة والتفاصيل)
  const dist = useMemo(() => {
    let games = 0, cafe = 0, other = 0;
    invoices.filter(v => v.status === "مدفوعة").forEach(v => {
      if (v.source === "حجز") games += v.total;
      else if (v.details && (v.details.includes("قهوة") || v.details.includes("عصير") || v.details.includes("Red") || v.details.includes("ساندويش"))) cafe += v.total;
      else if (v.details && (v.details.includes("PS5") || v.details.includes("Xbox") || v.details.includes("كنترول"))) games += v.total;
      else other += v.total;
    });
    const tot = games + cafe + other || 1;
    return { games, cafe, other, gPct: Math.round(games / tot * 100), cPct: Math.round(cafe / tot * 100) };
  }, [invoices]);

  return (
    <>
      <PageTop title="لوحة التحكم" action={<Badge tone="gold">{new Date().toLocaleDateString("ar-LY")}</Badge>} />
      {overdueAlerts && overdueAlerts.length > 0 && (
        <div onClick={() => go("alerts")} className="nk-card-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "linear-gradient(135deg,#fdeaea,#fff)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 12, padding: ".7rem 1rem", marginBottom: "1.1rem", cursor: "pointer" }}>
          <div style={{ fontSize: 12.5, color: "#922", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span>لديك <b>{overdueAlerts.length}</b> فاتورة آجلة متأخرة عن السداد — إجمالي <b>{fmt(overdueAlerts.reduce((s, a) => s + a.total, 0))} {cur}</b></span>
          </div>
          <Btn sm danger>عرض التنبيهات →</Btn>
        </div>
      )}

      {backupOverdue && (
        <div onClick={() => go("settings")} className="nk-card-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "linear-gradient(135deg,#fff6e6,#fff)", border: `1px solid ${C.gold}66`, borderRadius: 12, padding: ".7rem 1rem", marginBottom: "1.1rem", cursor: "pointer" }}>
          <div style={{ fontSize: 12.5, color: C.gdd, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛡</span>
            <span>{lastBackup ? `مضى ${bkDays} يوم على آخر نسخة احتياطية` : "لم تُنشئ أي نسخة احتياطية بعد"} — يُنصح بإنشاء نسخة لحماية بياناتك</span>
          </div>
          <Btn sm gold>النسخ الاحتياطي →</Btn>
        </div>
      )}

      {/* شريط اليوم */}
      <div style={{ background: `linear-gradient(120deg, ${C.grn} 0%, ${C.grn2} 100%)`, borderRadius: 14, padding: "1rem 1.2rem", marginBottom: "1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.gld, opacity: .85 }}>إيرادات اليوم</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>{fmt(todayRev)} <span style={{ fontSize: 13, fontWeight: 600, color: C.gld }}>{cur}</span></div>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{todayCount}</div><div style={{ fontSize: 10.5, color: C.gld, opacity: .85 }}>فواتير اليوم</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{completedBookings.length}</div><div style={{ fontSize: 10.5, color: C.gld, opacity: .85 }}>حجوزات</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: low.length ? "#ffb4b4" : "#fff" }}>{low.length}</div><div style={{ fontSize: 10.5, color: C.gld, opacity: .85 }}>نواقص</div></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="إجمالي الإيرادات" value={fmt(totals.revenue)} sub={cur} bar="#1a8c3e" />
        <KCard label="تكلفة البضاعة المباعة" value={fmt(totals.cogs)} sub={cur} bar="#c77" />
        <KCard label="إجمالي المصاريف" value={fmt(totals.expTotal)} sub={cur} bar={C.red} />
        <KCard label="صافي الربح" value={fmt(totals.profit)} sub={`${totals.revenue ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}% هامش`} bar={C.gold} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: ctx.scr?.isTab ? "1fr" : "3fr 2fr", gap: 11, marginBottom: "1.1rem" }}>
        <Card className="nk-card-hover">
          <CardHead title="الإيراد اليومي — آخر 7 أيام" sub={cur} />
          <MiniBars data={last7.days} max={last7.max} color={C.grl} />
          <div style={{ display: "flex", justifyContent: "space-around", fontSize: 9.5, color: C.mt, marginTop: 4 }}>{last7.labels.map((m, i) => <span key={i}>{m}</span>)}</div>
        </Card>
        <Card className="nk-card-hover">
          <CardHead title="توزيع المبيعات" sub="حسب النشاط" />
          {dist.games + dist.cafe + dist.other === 0 ? (
            <div style={{ textAlign: "center", color: C.mt, fontSize: 12, padding: "1.5rem 0" }}>لا مبيعات بعد لعرض التوزيع</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <Donut segments={[{ v: dist.gPct, c: C.grl }, { v: Math.max(0, 100 - dist.gPct), c: C.gold }]} />
              <div style={{ fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: C.grl }} />ألعاب {dist.gPct}%</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: C.gold }} />كافيه/أخرى {100 - dist.gPct}%</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 11 }}>
        <Card className="nk-card-hover">
          <CardHead title="أحدث الفواتير" right={<Btn sm onClick={() => go("sales")}>عرض الكل</Btn>} />
          {invoices.length === 0 ? <div style={{ color: C.mt, fontSize: 12, padding: "1rem 0", textAlign: "center" }}>لا فواتير بعد</div> :
            <Table cols={[{ h: "رقم", w: "28%" }, { h: "الزبون", w: "30%" }, { h: "المبلغ", w: "22%" }, { h: "الحالة", w: "20%" }]}
              rows={invoices.slice(0, 5).map(i => ["#" + i.id, i.customer, fmt(i.total) + " " + cur, <Badge tone={i.status === "مدفوعة" ? "g" : i.status === "ملغاة" ? "r" : "a"}>{i.status}</Badge>])} />}
        </Card>
        <Card className="nk-card-hover">
          <CardHead title="تنبيهات المخزون" sub={`${low.length} منتج تحت الحد الأدنى`} right={low.length > 0 && <Btn sm onClick={() => go("inventory")}>الطلب</Btn>} />
          {low.length === 0 && <div style={{ color: C.mt, fontSize: 12, padding: "1rem 0", textAlign: "center" }}>كل المنتجات ضمن المستوى الآمن ✓</div>}
          {low.slice(0, 6).map(p => {
            const pct = Math.min(100, Math.round((p.stock / (p.min * 2)) * 100));
            return <div key={p.id} style={{ marginBottom: ".7rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}><span>{p.name}</span><span style={{ color: C.red, fontWeight: 600 }}>{p.stock} متبقي</span></div>
              <div style={{ height: 6, borderRadius: 3, background: "#eee", overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: pct < 30 ? "#e34948" : C.gold }} /></div>
            </div>;
          })}
        </Card>
      </div>
    </>
  );
}

/* ============================ POS ============================ */
function POS({ ctx, can }) {
  const { products, setProducts, invoices, setInvoices, coupons, customers, setCustomers, promotions, showToast } = ctx;
  const [cart, setCart] = useState({});
  const [pay, setPay] = useState("cash");
  const [coupon, setCoupon] = useState("");
  const [discPct, setDiscPct] = useState(0);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [bcInput, setBcInput] = useState("");
  const bcRef = useRef(null);
  const [deferCustomer, setDeferCustomer] = useState(null);
  const [custModal, setCustModal] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const PAY_LABEL = { cash: "كاش", card: "بطاقة", transfer: "تحويل", defer: "آجل" };
  const shown = products.filter(p =>
    (catFilter === "all" || p.cat === catFilter) &&
    (search === "" || p.name.includes(search) || p.bc.includes(search))
  );

  // إضافة صنف عبر الباركود (Enter أو قارئ باركود)
  const addByBarcode = () => {
    const code = bcInput.trim();
    if (!code) return;
    const p = products.find(x => x.bc === code) || products.find(x => x.bc.includes(code));
    if (!p) { showToast(`لا يوجد صنف بالباركود «${code}»`); setBcInput(""); return; }
    add(p, "piece");
    setBcInput("");
    bcRef.current?.focus();
  };
  // piecesInCartFor: total pieces already reserved for a product across piece+pack lines
  const piecesReserved = (pid) => Object.values(cart).filter(it => it.pid === pid).reduce((s, it) => s + it.qty * it.perPieces, 0);
  const add = (p, sellUnit = "piece") => {
    if (!p.sell) { showToast(`«${p.name}» غير مُسعّر بعد — يُسعّر عند التوريد`); return; }
    const pack = p.packSize || 1;
    const perPieces = sellUnit === "pack" ? pack : 1;
    const key = p.id + ":" + sellUnit;
    const already = piecesReserved(p.id);
    if (p.stock !== null && p.stock < already + perPieces) { showToast(`لا يوجد مخزون كافٍ من «${p.name}»`); return; }
    const promo = promoFor(promotions, p.cat);
    const factor = promo ? 1 - promo.pct / 100 : 1;
    const baseUnitPrice = sellUnit === "pack" ? (p.sellPack || p.sell * pack) : p.sell;
    const unitPrice = Math.round(baseUnitPrice * factor * 100) / 100;
    const unitLabel = sellUnit === "pack" ? p.unit : "قطعة";
    setCart(c => ({ ...c, [key]: { key, pid: p.id, name: p.name, img: p.img, sell: p.sell, unitPrice, perPieces, sellUnit, unitLabel, promoPct: promo ? promo.pct : 0, qty: (c[key]?.qty || 0) + 1 } }));
  };
  const chg = (key, d) => setCart(c => {
    const q = (c[key]?.qty || 0) + d;
    const nc = { ...c };
    if (q <= 0) delete nc[key]; else nc[key] = { ...nc[key], qty: q };
    return nc;
  });
  const items = Object.values(cart);
  const sub = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const disc = Math.round(sub * discPct / 100);
  const total = sub - disc;

  const applyCoupon = () => {
    const c = coupons.find(x => x.code === coupon.trim().toUpperCase() && x.status === "نشط");
    if (c) { setDiscPct(c.pct); showToast(`كوبون ${c.code} مفعّل — خصم ${c.pct}%`); }
    else { setDiscPct(0); showToast("كود الخصم غير صحيح"); }
  };

  const checkout = () => {
    if (!items.length) return;
    const num = "INV-" + (1048 + invoices.filter(i => i.id.startsWith("INV-1")).length);
    const details = items.map(i => `${i.name} ×${i.qty} ${i.sellUnit === "pack" ? i.unitLabel : ""}`.trim()).join("، ");
    let custName = "زبون نقدي";

    if (pay === "defer") {
      if (!deferCustomer) { showToast("اختر زبوناً أو سجّل زبوناً جديداً للبيع الآجل"); return; }
      custName = deferCustomer.name;
      setCustomers(cs => cs.map(c => c.id === deferCustomer.id
        ? { ...c, debt: (c.debt || 0) + total, total: c.total + total, invoices: c.invoices + 1, last: todayISO() }
        : c));
    }

    // decrement stock in pieces (sum piece+pack lines per product)
    setProducts(ps => ps.map(p => {
      const pieces = items.filter(it => it.pid === p.id).reduce((s, it) => s + it.qty * it.perPieces, 0);
      if (pieces && p.stock !== null) return { ...p, stock: Math.max(0, p.stock - pieces) };
      return p;
    }));
    // تكلفة البضاعة المباعة (COGS) = مجموع (سعر شراء القطعة × عدد القطع)
    const cost = items.reduce((s, it) => {
      const p = products.find(x => x.id === it.pid);
      return s + (p?.buy || 0) * it.qty * it.perPieces;
    }, 0);
    setInvoices(iv => [{ id: num, customer: custName, date: todayISO(), source: "منتج", details, pay: PAY_LABEL[pay], discount: discPct ? discPct + "%" : "—", total, cost: Math.round(cost * 100) / 100, status: pay === "defer" ? "معلقة" : "مدفوعة", ...(pay === "defer" ? { dueDate: dueDate || todayISO() } : {}) }, ...iv]);
    showToast(pay === "defer" ? `فاتورة آجلة #${num} على ${custName} — ${fmt(total)} ${ctx.settings?.currency || "د.ل"}` : `تم إنشاء الفاتورة #${num} — ${fmt(total)} ${ctx.settings?.currency || "د.ل"}`);
    setCart({}); setDiscPct(0); setCoupon(""); setDeferCustomer(null); setDueDate("");
  };

  const CAT_ICON = { games: "🎮", cafe: "☕" };
  const mode = ctx.settings?.posMode || "grid";
  const cur = ctx.settings?.currency || "د.ل";
  return (
    <>
      <PageTop title="نقطة البيع السريع" />
      <div style={{ display: "grid", gridTemplateColumns: ctx.scr?.isTab ? "1fr" : "1fr 360px", gap: 14, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: ".7rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1.2, minWidth: 170, display: "flex", alignItems: "center", gap: 6, background: C.cd, border: `0.5px solid ${C.bc}`, borderRadius: 10, padding: ".42rem .75rem" }}>
              <span style={{ color: C.mt, fontSize: 14 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن صنف بالاسم..." style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, width: "100%", fontFamily: "inherit", color: C.ink }} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.mt, fontSize: 13 }}>✕</button>}
            </div>
            <div style={{ flex: 1, minWidth: 190, display: "flex", alignItems: "center", gap: 6, background: C.grn, borderRadius: 10, padding: ".42rem .75rem", border: `1px solid ${C.gold}55` }}>
              <span style={{ fontSize: 14 }}>📷</span>
              <input ref={bcRef} value={bcInput} onChange={e => setBcInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addByBarcode()}
                placeholder="امسح الباركود أو اكتبه ثم Enter"
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, width: "100%", fontFamily: "inherit", color: C.gld, letterSpacing: 1 }} />
              <button onClick={addByBarcode} style={{ background: C.gold, border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>إضافة</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: ".9rem", flexWrap: "wrap" }}>
            {[["all", "الكل"], ...Object.entries(ctx.cats || CATS)].map(([k, l]) => (
              <button key={k} onClick={() => setCatFilter(k)} style={{ padding: ".3rem .8rem", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit", border: `0.5px solid ${C.bc}`, background: catFilter === k ? C.grn : C.crm, color: catFilter === k ? C.gld : C.k2, fontWeight: catFilter === k ? 600 : 400 }}>{l}</button>
            ))}
          </div>

          {shown.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: C.mt, fontSize: 12.5, background: C.cd, borderRadius: 11, border: `0.5px dashed ${C.bc}` }}>لا توجد أصناف مطابقة{search ? ` لـ«${search}»` : ""}.</div>
          )}
          {mode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              {shown.map(p => {
                const promo = promoFor(promotions, p.cat);
                const dSell = promo && p.sell ? Math.round(p.sell * (1 - promo.pct / 100) * 100) / 100 : null;
                return (
                <div key={p.id} className="nk-card-hover" style={{ background: C.cd, border: `0.5px solid ${promo ? "#1a8c3e55" : C.bc}`, borderRadius: 11, padding: ".8rem .75rem", textAlign: "center", position: "relative" }}>
                  {promo && p.sell ? <span style={{ position: "absolute", top: 6, left: 6, background: "#1a8c3e", color: "#fff", fontSize: 9.5, fontWeight: 700, borderRadius: 6, padding: "1px 6px" }}>-{promo.pct}%</span> : null}
                  <div onClick={() => add(p, "piece")} style={{ cursor: "pointer" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, margin: "0 auto .5rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: p.cat === "games" ? C.grl + "22" : C.gold + "22", overflow: "hidden" }}>{p.img ? <img src={p.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : CAT_ICON[p.cat]}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                    {dSell !== null
                      ? <div style={{ fontSize: 13, fontWeight: 700 }}><span style={{ color: C.mt, textDecoration: "line-through", fontSize: 10.5, marginLeft: 4 }}>{p.sell}</span><span style={{ color: "#1a8c3e" }}>{dSell} {cur}</span></div>
                      : <div style={{ fontSize: 13, fontWeight: 700, color: C.grn2 }}>{p.sell ? `${p.sell} ${cur}` : "غير مُسعّر"}</div>}
                    <div style={{ fontSize: 10, color: C.mt, marginTop: 2 }}>{p.stock !== null ? `مخزون: ${p.stock} قطعة` : "خدمة"}</div>
                  </div>
                  {p.packSize > 1 && p.sell ? (
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      <button onClick={() => add(p, "piece")} style={posUnitBtn(false)}>قطعة</button>
                      <button onClick={() => add(p, "pack")} style={posUnitBtn(true)}>{p.unit} — {fmt(Math.round((p.sellPack || p.sell * p.packSize) * (promo ? 1 - promo.pct / 100 : 1) * 100) / 100)}</button>
                    </div>
                  ) : null}
                </div>
                );
              })}
            </div>
          )}
          {mode === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {shown.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.cd, border: `0.5px solid ${C.bc}`, borderRadius: 10, padding: ".55rem .8rem" }}>
                  <div onClick={() => add(p, "piece")} style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: p.cat === "games" ? C.grl + "22" : C.gold + "22", flexShrink: 0, overflow: "hidden", cursor: "pointer" }}>{p.img ? <img src={p.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : CAT_ICON[p.cat]}</div>
                  <div onClick={() => add(p, "piece")} style={{ flex: 1, cursor: "pointer" }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 10.5, color: C.mt }}>{CATS[p.cat]} · {p.stock !== null ? `مخزون ${p.stock} قطعة` : "خدمة"}</div></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.grn2 }}>{p.sell ? `${p.sell} ${cur}` : "—"}</div>
                  {p.packSize > 1 && p.sell ? <button onClick={() => add(p, "pack")} style={posUnitBtn(true)}>{p.unit}</button> : null}
                  <button onClick={() => add(p, "piece")} style={posUnitBtn(false)}>قطعة</button>
                </div>
              ))}
            </div>
          )}
          {mode === "compact" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(105px,1fr))", gap: 6 }}>
              {shown.map(p => (
                <div key={p.id} onClick={() => add(p, "piece")} style={{ background: C.cd, border: `0.5px solid ${C.bc}`, borderRadius: 8, padding: ".45rem .5rem", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.grn2, marginTop: 2 }}>{p.sell || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Card style={{ position: "sticky", top: "1rem" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: ".9rem" }}>🛍 سلة المبيعات</div>
          {!items.length && <div style={{ textAlign: "center", padding: "2rem 0", color: C.mt, fontSize: 12.5 }}>لا توجد منتجات بعد<br /><span style={{ fontSize: 11 }}>اضغط على منتج لإضافته</span></div>}
          {items.map(it => (
            <div key={it.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".5rem 0", borderBottom: "0.5px solid rgba(201,168,76,.12)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name} {it.sellUnit === "pack" && <Badge tone="gold" style={{ fontSize: 9 }}>{it.unitLabel}</Badge>} {it.promoPct ? <Badge tone="g" style={{ fontSize: 9 }}>-{it.promoPct}%</Badge> : null}</div><div style={{ fontSize: 11, color: C.mt }}>{it.unitPrice} × {it.qty} {it.sellUnit === "pack" ? `(${it.perPieces} قطعة)` : ""}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.grn2, minWidth: 50, textAlign: "left" }}>{fmt(it.unitPrice * it.qty)}</span>
                <button onClick={() => chg(it.key, -1)} style={qbtn}>−</button>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 16, textAlign: "center" }}>{it.qty}</span>
                <button onClick={() => chg(it.key, 1)} style={qbtn}>+</button>
              </div>
            </div>
          ))}
          {items.length > 0 && (
            <div style={{ marginTop: ".75rem", borderTop: `1px solid ${C.bc}`, paddingTop: ".75rem" }}>
              <Row label="المجموع الفرعي" val={fmt(sub) + " د.ل"} />
              {disc > 0 && <Row label="الخصم" val={"-" + fmt(disc) + " د.ل"} color="#1a8c3e" />}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: `0.5px solid ${C.bc}`, marginTop: ".5rem", paddingTop: ".5rem" }}><span>الإجمالي</span><span style={{ color: C.grn2 }}>{fmt(total)} د.ل</span></div>
              {can("discounts") && (
                <div style={{ display: "flex", gap: 7, marginTop: ".7rem" }}>
                  <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="كود الخصم" style={{ ...inputStyle, flex: 1 }} />
                  <Btn sm onClick={applyCoupon}>تطبيق</Btn>
                </div>
              )}
              <div style={{ fontSize: 11, color: C.mt, fontWeight: 600, margin: ".8rem 0 5px" }}>طريقة الدفع</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[["cash", "كاش"], ["card", "بطاقة"], ["transfer", "تحويل مصرفي"], ["defer", "آجل"]].map(([k, l]) => (
                  <div key={k} onClick={() => setPay(k)} style={{ gridColumn: k === "defer" ? "1/-1" : "auto", border: `1px solid ${pay === k ? C.gold : C.bc}`, borderRadius: 8, padding: ".45rem .6rem", cursor: "pointer", fontSize: 12, fontWeight: pay === k ? 600 : 500, background: pay === k ? "rgba(201,168,76,.12)" : C.crm, color: pay === k ? C.grn2 : C.k2, textAlign: "center" }}>{l}</div>
                ))}
              </div>
              {pay === "defer" && (
                <div style={{ marginTop: 8, background: C.gold + "10", border: `0.5px solid ${C.gold}55`, borderRadius: 10, padding: ".7rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gdd, marginBottom: 6 }}>البيع الآجل يُسجّل على حساب زبون</div>
                  {deferCustomer ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.cd, borderRadius: 8, padding: ".5rem .7rem" }}>
                      <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{deferCustomer.name}</div><div style={{ fontSize: 10.5, color: C.mt }}>📱 {deferCustomer.phone}</div></div>
                      <button onClick={() => setDeferCustomer(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.mt, fontSize: 14 }}>تغيير</button>
                    </div>
                  ) : (
                    <>
                      <Sel value="" onChange={e => { const c = customers.find(x => x.id == e.target.value); if (c) setDeferCustomer(c); }} style={{ marginBottom: 6 }}>
                        <option value="">اختر من قائمة الزبائن...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                      </Sel>
                      <Btn sm onClick={() => setCustModal(true)} style={{ width: "100%", justifyContent: "center" }}>+ تسجيل زبون جديد</Btn>
                    </>
                  )}
                  {deferCustomer && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10.5, color: C.mt, fontWeight: 600, marginBottom: 3 }}>تاريخ استحقاق السداد</div>
                      <Inp type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ background: C.cd }} />
                    </div>
                  )}
                </div>
              )}
              <button onClick={checkout} style={{ width: "100%", marginTop: ".9rem", padding: ".65rem", fontSize: 14, fontWeight: 700, borderRadius: 10, cursor: "pointer", border: "none", background: "linear-gradient(135deg," + C.gold + "," + C.gdd + ")", color: "#fff", fontFamily: "inherit" }}>✓ إتمام البيع</button>
            </div>
          )}
        </Card>
      </div>
      {custModal && <NewCustomerModal ctx={ctx} onClose={() => setCustModal(false)} onCreated={(c) => { setDeferCustomer(c); setCustModal(false); }} />}
    </>
  );
}
const qbtn = { width: 22, height: 22, borderRadius: 6, border: `0.5px solid ${C.bc}`, background: C.crm, cursor: "pointer", fontSize: 13, fontFamily: "inherit" };
const posUnitBtn = (primary) => ({ flex: 1, padding: ".28rem .3rem", borderRadius: 6, fontSize: 10.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${primary ? C.gold : C.bc}`, background: primary ? C.gold + "18" : C.crm, color: primary ? C.gdd : C.k2, whiteSpace: "nowrap" });
const Row = ({ label, val, color }) => <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: color || C.k2, marginBottom: ".4rem" }}><span>{label}</span><span>{val}</span></div>;

/* ============================ SALES ============================ */
function Sales({ ctx, can }) {
  const { invoices, setInvoices } = ctx;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const PAY_TONE = { "كاش": "g", "بطاقة": "b", "تحويل": "p", "آجل": "a" };
  const SRC_TONE = { "منتج": "b", "حجز": "gold" };
  const shown = invoices.filter(i =>
    (filter === "all" || i.status === filter) &&
    (i.customer.includes(q) || i.id.includes(q))
  );
  const monthSales = invoices.filter(i => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
  const cancel = (id) => can("cancel") && setInvoices(iv => iv.map(i => i.id === id ? { ...i, status: "ملغاة" } : i));
  return (
    <>
      <PageTop title="المبيعات والفواتير" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="إجمالي المبيعات" value={fmt(monthSales)} sub="دينار ليبي" bar="#1a8c3e" />
        <KCard label="عدد الفواتير" value={invoices.length} bar="#2a78d6" />
        <KCard label="متوسط الفاتورة" value={(() => { const paid = invoices.filter(i => i.status === "مدفوعة"); return paid.length ? fmt(Math.round(monthSales / paid.length)) : 0; })()} sub="د.ل" bar={C.gold} />
      </div>
      <Card>
        <CardHead title="سجل الفواتير" sub="الفواتير من الحجوزات تظهر بعلامة (حجز)" right={
          <div style={{ display: "flex", gap: 7 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." style={{ ...inputStyle, width: 150 }} />
            <Sel value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 110 }}>
              <option value="all">كل الحالات</option><option value="مدفوعة">مدفوعة</option><option value="معلقة">معلقة</option><option value="ملغاة">ملغاة</option>
            </Sel>
          </div>
        } />
        <Table cols={[{ h: "رقم", w: "13%" }, { h: "الزبون", w: "16%" }, { h: "التاريخ", w: "12%" }, { h: "المصدر", w: "11%" }, { h: "التفاصيل", w: "16%" }, { h: "الدفع", w: "10%" }, { h: "الإجمالي", w: "11%" }, { h: "الحالة", w: "11%" }]}
          rows={shown.map(i => [
            "#" + i.id, i.customer, arDate(i.date),
            <Badge tone={SRC_TONE[i.source] || "b"}>{i.source}</Badge>,
            i.details, <Badge tone={PAY_TONE[i.pay] || "g"}>{i.pay}</Badge>,
            fmt(i.total) + " د.ل",
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <Badge tone={i.status === "مدفوعة" ? "g" : i.status === "ملغاة" ? "r" : "a"}>{i.status}</Badge>
              {can("cancel") && i.status !== "ملغاة" && <button onClick={() => cancel(i.id)} title="إلغاء" style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 12 }}>✕</button>}
            </span>,
          ])} />
      </Card>
    </>
  );
}

/* ============================ PRODUCTS ============================ */
function genBarcode(products) {
  const year = new Date().getFullYear();
  return "NKH" + year + String(products.length + 1).padStart(4, "0");
}
function BarcodeSVG({ code }) {
  if (!code) return null;
  let x = 4; const bars = [];
  for (let i = 0; i < code.length; i++) {
    const cc = code.charCodeAt(i);
    const w1 = (cc % 3) + 1, w2 = ((cc >> 2) % 3) + 1, w3 = ((cc >> 4) % 2) + 1;
    bars.push(<rect key={i + "a"} x={x} y={2} width={w1} height={32} fill="#fff" />); x += w1 + 1;
    bars.push(<rect key={i + "b"} x={x} y={2} width={w2} height={32} fill="#fff" />); x += w2 + 2;
    bars.push(<rect key={i + "c"} x={x} y={2} width={w3} height={32} fill="#fff" />); x += w3 + 1;
  }
  return (
    <div style={{ background: "#111", borderRadius: 7, padding: ".5rem", textAlign: "center" }}>
      <svg viewBox={`0 0 ${x + 4} 36`} style={{ height: 34, width: "100%" }}><rect x="0" y="0" width={x + 4} height="36" fill="#111" />{bars}</svg>
      <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, letterSpacing: 2, marginTop: 2 }}>{code}</div>
    </div>
  );
}
function Products({ ctx, can }) {
  const { products, setProducts, showToast, settings, cats, setCats } = ctx;
  const cur = settings?.currency || "د.ل";
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = add mode
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const empty = { bc: "", name: "", cat: "", newCat: "", unit: "علبة", packSize: "", min: "", hasExp: "no", supplier: "", status: "active", img: null, sell: "", sellPack: "" };
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const PACK_UNITS = ["صندوق", "كرتون", "كيس", "علبة"];
  const isPack = PACK_UNITS.includes(form.unit);
  const isEdit = editingId !== null;

  const shown = products.filter(p =>
    (!filter || p.cat === filter) && (p.name.includes(q) || p.bc.includes(q))
  );
  const lowCount = products.filter(p => p.stock !== null && p.min && p.stock < p.min).length;
  const stockValue = products.reduce((s, p) => s + (p.buy || 0) * (p.stock || 0), 0);

  const openAdd = () => { setEditingId(null); setForm(empty); setModal(true); };
  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      bc: p.bc, name: p.name, cat: p.cat, newCat: "", unit: p.unit, packSize: p.packSize > 1 ? String(p.packSize) : "",
      min: p.min ? String(p.min) : "", hasExp: p.hasExp ? "yes" : "no", supplier: p.supplier || "", status: p.status,
      img: p.img || null, sell: p.sell ? String(p.sell) : "", sellPack: p.sellPack ? String(p.sellPack) : "",
    });
    setModal(true);
  };

  const resolveCat = () => {
    if (form.cat !== "__new") return form.cat;
    const name = form.newCat.trim();
    if (!name) return null;
    // create key and register
    const key = "cat_" + Date.now().toString().slice(-6);
    setCats(cs => ({ ...cs, [key]: name }));
    CATS[key] = name; // immediate availability
    return key;
  };

  const save = () => {
    if (!form.name.trim() || !form.cat) { showToast("أدخل اسم المنتج والقسم"); return; }
    if (form.cat === "__new" && !form.newCat.trim()) { showToast("أدخل اسم القسم الجديد"); return; }
    if (isPack && form.packSize && parseInt(form.packSize) < 1) { showToast("عدد القطع في العبوة يجب أن يكون 1 أو أكثر"); return; }
    const cat = resolveCat();
    if (!cat) { showToast("أدخل اسم القسم الجديد"); return; }
    const packSize = isPack ? (parseInt(form.packSize) || 1) : 1;
    const isService = form.unit === "ساعة" || form.unit === "جلسة" || form.unit === "كود رقمي";

    if (isEdit) {
      setProducts(ps => ps.map(p => p.id === editingId ? {
        ...p,
        bc: form.bc.trim() || p.bc, name: form.name.trim(), cat, unit: form.unit, packSize,
        min: parseInt(form.min) || 0, hasExp: form.hasExp === "yes",
        supplier: form.supplier, status: form.status, img: form.img,
        sell: parseFloat(form.sell) || 0,
        sellPack: parseFloat(form.sellPack) || 0,
      } : p));
      showToast(`تم تحديث «${form.name.trim()}»`);
    } else {
      const bc = form.bc.trim() || genBarcode(products);
      setProducts(ps => [...ps, {
        id: Math.max(0, ...ps.map(x => x.id)) + 1, bc, name: form.name.trim(), cat, unit: form.unit,
        packSize, sell: 0, sellPack: 0, buy: 0,
        stock: isService ? null : 0, min: parseInt(form.min) || 0,
        hasExp: form.hasExp === "yes", exp: null,
        supplier: form.supplier, status: form.status, img: form.img,
      }]);
      showToast(`تمت إضافة المنتج «${form.name.trim()}» — يُسعّر عند أول توريد`);
    }
    setForm(empty); setModal(false); setEditingId(null);
  };

  const STATUS = { active: ["نشط", "g"], limited: ["محدود", "a"], inactive: ["غير نشط", "r"] };
  const imgRef = useRef(null);
  const onImg = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700000) { showToast("حجم الصورة كبير — اختر أصغر من 700KB"); return; }
    const reader = new FileReader();
    reader.onload = () => set("img", reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageTop title="إدارة المنتجات" action={can("inventory") && <Btn gold onClick={openAdd}>+ إضافة منتج</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="إجمالي المنتجات" value={products.length} sub="منتج" bar={C.grl} />
        <KCard label="مخزون منخفض" value={lowCount} sub="تحتاج تزويد" bar={C.red} />
        <KCard label="قيمة المخزون" value={fmt(stockValue)} sub={cur} bar={C.gold} />
      </div>
      <Card>
        <CardHead title="قائمة المنتجات" sub="اضغط «تعديل» لتغيير البيانات أو الأسعار أو الصورة" right={
          <div style={{ display: "flex", gap: 7 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالاسم أو الباركود..." style={{ ...inputStyle, width: 170 }} />
            <Sel value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 130 }}><option value="">كل الأقسام</option>{Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Sel>
          </div>
        } />
        <Table cols={[{ h: "الباركود", w: "11%" }, { h: "الاسم", w: "19%" }, { h: "القسم", w: "10%" }, { h: "العبوة", w: "10%" }, { h: "بيع/قطعة", w: "8%" }, { h: "بيع/عبوة", w: "8%" }, { h: "شراء/قطعة", w: "8%" }, { h: "المخزون", w: "8%" }, { h: "الصلاحية", w: "9%" }, { h: "تعديل", w: "9%" }]}
          rows={shown.map(p => [
            <span style={{ fontFamily: "monospace", fontSize: 11, background: C.crm, padding: "2px 6px", borderRadius: 5 }}>{p.bc}</span>,
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{p.img ? <img src={p.img} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 26, height: 26, borderRadius: 6, background: C.crm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{p.cat === "games" ? "🎮" : "☕"}</span>}<span style={{ fontWeight: 600 }}>{p.name}</span></span>,
            <Badge tone={p.cat === "games" ? "g" : "a"}>{CATS[p.cat] || p.cat}</Badge>,
            <span>{p.unit}{p.packSize > 1 ? <span style={{ fontSize: 10, color: C.mt }}> (×{p.packSize})</span> : ""}</span>,
            p.sell ? <span style={{ fontWeight: 600, color: C.grn2 }}>{p.sell} {cur}</span> : <span style={{ color: C.mt, fontSize: 11 }}>لم يُسعّر</span>,
            p.packSize > 1 ? (p.sellPack ? <span style={{ fontWeight: 600, color: C.gdd }}>{p.sellPack} {cur}</span> : <span style={{ color: C.mt, fontSize: 11 }}>{p.sell ? fmt(p.sell * p.packSize) + " " + cur : "—"}</span>) : "—",
            p.buy ? p.buy + " " + cur : "—",
            p.stock !== null ? <span style={{ color: p.min && p.stock < p.min ? C.red : C.k2, fontWeight: p.min && p.stock < p.min ? 600 : 400 }}>{p.stock}</span> : "خدمة",
            <span style={{ fontSize: 11 }}>{p.hasExp ? arDate(p.exp) : "—"}</span>,
            can("inventory") ? <Btn sm onClick={() => openEdit(p)}>✎ تعديل</Btn> : "—",
          ])} />
      </Card>

      {modal && (
        <Modal title={isEdit ? `تعديل منتج — ${form.name || ""}` : "إضافة منتج جديد"} onClose={() => { setModal(false); setEditingId(null); }}>
          <div style={{ display: "flex", gap: 7, alignItems: "flex-end", marginBottom: ".75rem" }}>
            <div style={{ flex: 1 }}><Field label="رقم المنتج / الباركود"><Inp value={form.bc} onChange={e => set("bc", e.target.value)} placeholder="يُولّد تلقائياً إن تُرك فارغاً" /></Field></div>
            {!isEdit && <Btn onClick={() => set("bc", genBarcode(products))} style={{ marginBottom: ".75rem", background: C.grn, color: C.gld, border: "none" }}>توليد</Btn>}
          </div>
          {form.bc && <div style={{ marginBottom: ".75rem" }}><BarcodeSVG code={form.bc} /></div>}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: ".75rem", background: C.crm, borderRadius: 10, padding: ".7rem .85rem" }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: C.cd, border: `1px dashed ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {form.img ? <img src={form.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24, color: C.mt }}>🖼</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>صورة المنتج {isEdit ? "(يمكن تغييرها)" : "(اختياري)"}</div>
              <input ref={imgRef} type="file" accept="image/*" onChange={onImg} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <Btn sm gold onClick={() => imgRef.current?.click()}>📤 {form.img ? "تغيير الصورة" : "رفع صورة"}</Btn>
                {form.img && <Btn sm onClick={() => set("img", null)}>إزالة</Btn>}
              </div>
              <div style={{ fontSize: 10, color: C.mt, marginTop: 4 }}>تظهر في الكتالوج ونقطة البيع — أقل من 700KB</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="اسم المنتج *" full><Inp value={form.name} onChange={e => set("name", e.target.value)} placeholder="مثال: Red Bull" /></Field>
            <Field label="القسم *">
              <Sel value={form.cat} onChange={e => set("cat", e.target.value)}>
                <option value="">اختر...</option>
                {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                <option value="__new">➕ إضافة قسم جديد...</option>
              </Sel>
            </Field>
            {form.cat === "__new" && <Field label="اسم القسم الجديد *"><Inp value={form.newCat} onChange={e => set("newCat", e.target.value)} placeholder="مثال: مشروبات ساخنة" /></Field>}
            <Field label="الوحدة / العبوة"><Sel value={form.unit} onChange={e => set("unit", e.target.value)}>{["علبة", "قطعة", "كود رقمي", "صندوق", "كرتون", "كيس", "وجبة", "ساعة", "جلسة", "زجاجة", "كوب"].map(u => <option key={u}>{u}</option>)}</Sel></Field>
            {isPack && <Field label={`عدد القطع في ${form.unit} *`}><Inp type="number" value={form.packSize} onChange={e => set("packSize", e.target.value)} placeholder="مثال: 24" min="1" /></Field>}
            <Field label="الحد الأدنى للتنبيه (بالقطعة)"><Inp type="number" value={form.min} onChange={e => set("min", e.target.value)} /></Field>
            <Field label="له تاريخ صلاحية؟"><Sel value={form.hasExp} onChange={e => set("hasExp", e.target.value)}><option value="no">لا</option><option value="yes">نعم</option></Sel></Field>
            <Field label="المورد الافتراضي"><Sel value={form.supplier} onChange={e => set("supplier", e.target.value)}><option value="">بدون</option>{ctx.suppliers.map(s => <option key={s.id}>{s.name}</option>)}</Sel></Field>
            <Field label="الحالة"><Sel value={form.status} onChange={e => set("status", e.target.value)}><option value="active">نشط</option><option value="limited">محدود</option><option value="inactive">غير نشط</option></Sel></Field>
          </div>
          {isEdit && (
            <div style={{ background: C.gold + "10", border: `0.5px solid ${C.gold}55`, borderRadius: 10, padding: ".7rem .85rem", margin: ".5rem 0" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.gdd, marginBottom: 8 }}>💰 تعديل أسعار البيع الحالية</div>
              <div style={{ display: "grid", gridTemplateColumns: isPack ? "1fr 1fr" : "1fr", gap: 10 }}>
                <Field label={`سعر بيع القطعة (${cur})`}><Inp type="number" value={form.sell} onChange={e => set("sell", e.target.value)} placeholder="0" /></Field>
                {isPack && <Field label={`سعر بيع ${form.unit} (${cur})`}><Inp type="number" value={form.sellPack} onChange={e => set("sellPack", e.target.value)} placeholder={form.sell ? fmt(form.sell * (parseInt(form.packSize) || 1)) : "0"} /></Field>}
              </div>
              {isPack && form.sell && form.packSize && <div style={{ fontSize: 11, color: C.mt }}>سعر {form.unit} المحسوب من القطع: {fmt(form.sell * (parseInt(form.packSize) || 1))} {cur}{form.sellPack ? ` — السعر المخصص: ${form.sellPack} ${cur}` : ""}</div>}
            </div>
          )}
          {isPack && form.packSize > 1 && !isEdit && <div style={{ background: C.bluebg, border: `0.5px solid ${C.blue}33`, borderRadius: 8, padding: ".55rem .8rem", margin: ".5rem 0", fontSize: 12, color: C.blue }}>📦 كل {form.unit} = <b>{form.packSize} قطعة</b> — سيُحسب المخزون بالقطع تلقائياً عند التوريد</div>}
          {!isEdit && <div style={{ background: C.gold + "12", border: `0.5px solid ${C.gold}44`, borderRadius: 8, padding: ".6rem .8rem", margin: ".5rem 0", fontSize: 11.5, color: C.gdd, display: "flex", gap: 7 }}><span>💡</span><span>أسعار الشراء والبيع وتاريخ الصلاحية تُحدَّد عند توريد المنتج من قسم <b>المشتريات</b> — هنا تُعرّف المنتج في الكتالوج فقط.</span></div>}
          <div style={{ display: "flex", gap: 8, marginTop: ".5rem" }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ {isEdit ? "حفظ التعديلات" : "حفظ المنتج"}</Btn><Btn onClick={() => { setModal(false); setEditingId(null); }}>إلغاء</Btn></div>
        </Modal>
      )}
    </>
  );
}

/* ============================ PURCHASES ============================ */
function Purchases({ ctx }) {
  const { products, setProducts, purchases, setPurchases, suppliers, setSuppliers, showToast } = ctx;
  const [modal, setModal] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [newSupModal, setNewSupModal] = useState(false);
  const [newSup, setNewSup] = useState({ name: "", phone: "", spec: "" });
  const [date, setDate] = useState(todayISO());
  const [pay, setPay] = useState("كاش");
  // each line: prodId, qty, qtyUnit ('pack'|'piece'), buyBasis ('pack'|'piece'), buyPrice, sellPiece, sellPack, exp
  const emptyLine = { prodId: "", qty: 1, qtyUnit: "pack", buyBasis: "pack", buyPrice: "", sellPiece: "", sellPack: "", exp: "" };
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const cur = ctx.settings?.currency || "د.ل";

  const prodOf = (id) => products.find(x => x.id == id);

  const addLine = () => setLines(l => [...l, { ...emptyLine }]);
  const setLine = (i, k, v) => setLines(l => l.map((ln, idx) => {
    if (idx !== i) return ln;
    const nl = { ...ln, [k]: v };
    if (k === "prodId") {
      const p = prodOf(v);
      if (p) {
        const pack = p.packSize || 1;
        nl.qtyUnit = pack > 1 ? "pack" : "piece";
        nl.buyBasis = pack > 1 ? "pack" : "piece";
        nl.buyPrice = p.buy ? (pack > 1 ? String(p.buy * pack) : String(p.buy)) : "";
        nl.sellPiece = p.sell ? String(p.sell) : "";
        nl.sellPack = p.sellPack ? String(p.sellPack) : (p.sell && pack > 1 ? String(p.sell * pack) : "");
      }
    }
    return nl;
  }));
  const delLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));

  // pieces added by a line (qty may be in packs or pieces)
  const piecesOf = (ln) => {
    const p = prodOf(ln.prodId);
    if (!p) return 0;
    const pack = p.packSize || 1;
    return ln.qtyUnit === "pack" ? ln.qty * pack : ln.qty;
  };
  // buy cost per single piece
  const buyPieceOf = (ln) => {
    const p = prodOf(ln.prodId);
    if (!p) return 0;
    const pack = p.packSize || 1;
    const bp = parseFloat(ln.buyPrice) || 0;
    return ln.buyBasis === "pack" ? bp / pack : bp;
  };
  const lineCost = (ln) => piecesOf(ln) * buyPieceOf(ln);
  const grand = lines.reduce((s, l) => s + lineCost(l), 0);

  const monthPurch = purchases.reduce((s, p) => s + p.total, 0);
  const dueTotal = suppliers.reduce((s, x) => s + x.due, 0);

  const save = () => {
    const valid = lines.filter(l => l.prodId && l.qty > 0);
    if (!supplier) { showToast("اختر المورد"); return; }
    if (!valid.length) { showToast("أضف منتجاً واحداً على الأقل"); return; }
    const num = "PO-" + (235 + purchases.filter(p => p.id.startsWith("PO-")).length);
    const itemsStr = valid.map(l => {
      const p = prodOf(l.prodId);
      const unitLbl = l.qtyUnit === "pack" && p?.packSize > 1 ? p.unit : "قطعة";
      return `${p?.name} ×${l.qty} ${unitLbl}`;
    }).join("، ");

    setProducts(ps => ps.map(p => {
      const ln = valid.find(l => l.prodId == p.id);
      if (!ln) return p;
      const piecesAdded = piecesOf(ln);
      const buyPiece = buyPieceOf(ln);
      const sellPiece = parseFloat(ln.sellPiece) || 0;
      const sellPack = parseFloat(ln.sellPack) || 0;
      return {
        ...p,
        stock: (p.stock === null ? 0 : p.stock) + piecesAdded,
        buy: Math.round(buyPiece * 100) / 100,
        sell: sellPiece ? Math.round(sellPiece * 100) / 100 : p.sell,
        sellPack: sellPack ? Math.round(sellPack * 100) / 100 : p.sellPack,
        exp: (p.hasExp && ln.exp) ? ln.exp : p.exp,
        supplier: p.supplier || supplier,
      };
    }));

    setPurchases(pr => [{ id: num, supplier, date, items: itemsStr, pay, total: Math.round(grand * 100) / 100, status: "جديد" }, ...pr]);
    setSuppliers(sup => sup.map(x => x.name === supplier
      ? { ...x, total: x.total + grand, due: (x.due || 0) + (pay === "آجل" ? grand : 0), status: pay === "آجل" ? "آجل" : x.status }
      : x));
    showToast(`تم حفظ التوريد #${num} وتحديث المخزون والأسعار${pay === "آجل" ? " (آجل)" : ""}`);
    setModal(false); setLines([{ ...emptyLine }]); setSupplier("");
  };

  const PAY_TONE = { "كاش": "g", "بطاقة": "b", "تحويل": "p", "آجل": "a" };
  return (
    <>
      <PageTop title="فواتير المشتريات والتوريد" action={<Btn gold onClick={() => setModal(true)}>+ فاتورة توريد</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="مشتريات الشهر" value={fmt(monthPurch)} sub={cur} bar={C.red} />
        <KCard label="عدد الفواتير" value={purchases.length} bar="#2a78d6" />
        <KCard label="مستحقات آجلة" value={fmt(dueTotal)} sub={cur} bar={C.gold} />
      </div>
      <Card>
        <CardHead title="سجل فواتير التوريد" sub="عند التوريد يُحدَّث المخزون (بالقطع) وسعر الشراء والبيع وتاريخ الصلاحية" />
        <Table cols={[{ h: "رقم", w: "13%" }, { h: "المورد", w: "18%" }, { h: "التاريخ", w: "14%" }, { h: "المنتجات", w: "24%" }, { h: "الدفع", w: "12%" }, { h: "الإجمالي", w: "11%" }, { h: "الحالة", w: "8%" }]}
          rows={purchases.map(p => ["#" + p.id, p.supplier, arDate(p.date), p.items, <Badge tone={PAY_TONE[p.pay] || "g"}>{p.pay}</Badge>, fmt(p.total) + " " + cur, <Badge tone={p.status === "قيد الشحن" ? "a" : "g"}>{p.status}</Badge>])} />
      </Card>

      {modal && (
        <Modal title="فاتورة توريد جديدة" onClose={() => setModal(false)} width={720}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="المورد">
              <div style={{ display: "flex", gap: 6 }}>
                <Sel value={supplier} onChange={e => setSupplier(e.target.value)} style={{ flex: 1 }}><option value="">اختر المورد...</option>{suppliers.map(s => <option key={s.id}>{s.name}</option>)}</Sel>
                <Btn sm gold onClick={() => { setNewSup({ name: "", phone: "", spec: "" }); setNewSupModal(true); }} style={{ whiteSpace: "nowrap" }}>+ مورد</Btn>
              </div>
            </Field>
            <Field label="تاريخ الفاتورة"><Inp type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.mt, margin: ".3rem 0 .5rem" }}>الأصناف الموردة</div>
          {lines.map((ln, i) => {
            const p = prodOf(ln.prodId);
            const pack = p?.packSize || 1;
            const isPackaged = pack > 1;
            const piecesAdded = piecesOf(ln);
            const buyPiece = buyPieceOf(ln);
            return (
              <div key={i} style={{ background: C.crm, borderRadius: 10, padding: ".6rem .7rem", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <Sel value={ln.prodId} onChange={e => setLine(i, "prodId", e.target.value)} style={{ flex: 2.5, background: C.cd }}><option value="">اختر المنتج...</option>{products.map(pr => <option key={pr.id} value={pr.id}>{pr.name}{pr.packSize > 1 ? ` (${pr.unit} = ${pr.packSize} قطعة)` : ""}</option>)}</Sel>
                  <button onClick={() => delLine(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.mt, fontSize: 15 }}>✕</button>
                </div>
                {p && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: isPackaged ? "0.8fr 1fr 1fr 1fr" : "1fr 1.4fr", gap: 6, alignItems: "end", marginBottom: 6 }}>
                      <div>
                        <div style={labelMini}>الكمية</div>
                        <Inp type="number" value={ln.qty} onChange={e => setLine(i, "qty", parseInt(e.target.value) || 1)} style={{ background: C.cd }} min="1" />
                      </div>
                      {isPackaged && (
                        <div>
                          <div style={labelMini}>وحدة الكمية</div>
                          <Sel value={ln.qtyUnit} onChange={e => setLine(i, "qtyUnit", e.target.value)} style={{ background: C.cd }}>
                            <option value="pack">{p.unit} (×{pack})</option>
                            <option value="piece">قطعة</option>
                          </Sel>
                        </div>
                      )}
                      <div>
                        <div style={labelMini}>سعر الشراء</div>
                        <Inp type="number" value={ln.buyPrice} onChange={e => setLine(i, "buyPrice", e.target.value)} style={{ background: C.cd }} placeholder="0" />
                      </div>
                      {isPackaged && (
                        <div>
                          <div style={labelMini}>أساس السعر</div>
                          <Sel value={ln.buyBasis} onChange={e => setLine(i, "buyBasis", e.target.value)} style={{ background: C.cd }}>
                            <option value="pack">لكل {p.unit}</option>
                            <option value="piece">لكل قطعة</option>
                          </Sel>
                        </div>
                      )}
                    </div>
                    {isPackaged && parseFloat(ln.buyPrice) > 0 && (
                      <div style={{ background: C.bluebg, borderRadius: 7, padding: ".4rem .7rem", fontSize: 11.5, color: C.blue, marginBottom: 6 }}>
                        🧮 تكلفة القطعة الواحدة: <b>{fmt(buyPiece)} {cur}</b>{ln.buyBasis === "pack" ? ` (${ln.buyPrice} ÷ ${pack})` : ""}
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: isPackaged ? (p.hasExp ? "1fr 1fr 1fr" : "1fr 1fr") : (p.hasExp ? "1fr 1fr" : "1fr"), gap: 6, alignItems: "end" }}>
                      <div>
                        <div style={labelMini}>سعر بيع القطعة</div>
                        <Inp type="number" value={ln.sellPiece} onChange={e => setLine(i, "sellPiece", e.target.value)} style={{ background: C.cd }} placeholder="0" />
                      </div>
                      {isPackaged && (
                        <div>
                          <div style={labelMini}>سعر بيع {p.unit}</div>
                          <Inp type="number" value={ln.sellPack} onChange={e => setLine(i, "sellPack", e.target.value)} style={{ background: C.cd }} placeholder={ln.sellPiece ? fmt((parseFloat(ln.sellPiece) || 0) * pack) : "0"} />
                        </div>
                      )}
                      {p.hasExp && <div><div style={labelMini}>تاريخ الصلاحية</div><Inp type="date" value={ln.exp} onChange={e => setLine(i, "exp", e.target.value)} style={{ background: C.cd }} /></div>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11, color: C.mt, flexWrap: "wrap", gap: 4 }}>
                      <span>➕ يُضاف <b>{piecesAdded}</b> قطعة للمخزون{ln.qtyUnit === "pack" && isPackaged ? ` (${ln.qty} ${p.unit} × ${pack})` : ""}</span>
                      {parseFloat(ln.sellPiece) > 0 && buyPiece > 0 && <span style={{ color: "#1a8c3e" }}>ربح القطعة: {fmt((parseFloat(ln.sellPiece) || 0) - buyPiece)} {cur}</span>}
                      <span style={{ fontWeight: 700, color: C.grn2 }}>إجمالي السطر: {fmt(lineCost(ln))} {cur}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          <Btn sm onClick={addLine} style={{ marginTop: 2 }}>+ إضافة صنف</Btn>
          <Field label="طريقة الدفع" full><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
            {["كاش", "بطاقة", "تحويل", "آجل"].map(m => <div key={m} onClick={() => setPay(m)} style={{ gridColumn: m === "آجل" ? "1/-1" : "auto", border: `1px solid ${pay === m ? C.gold : C.bc}`, borderRadius: 8, padding: ".45rem", textAlign: "center", cursor: "pointer", fontSize: 12, background: pay === m ? "rgba(201,168,76,.12)" : C.crm, color: pay === m ? C.grn2 : C.k2, fontWeight: pay === m ? 600 : 500 }}>{m}</div>)}
          </div></Field>
          <div style={{ background: C.crm, borderRadius: 9, padding: ".65rem .85rem", margin: ".75rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: C.mt, fontWeight: 600 }}>إجمالي الفاتورة</span><span style={{ fontSize: 17, fontWeight: 700, color: C.grn2 }}>{fmt(grand)} {cur}</span></div>
          <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ حفظ وتوريد</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
        </Modal>
      )}

      {newSupModal && (
        <Modal title="إضافة مورد جديد" onClose={() => setNewSupModal(false)} width={430}>
          <Field label="اسم المورد *"><Inp value={newSup.name} onChange={e => setNewSup({ ...newSup, name: e.target.value })} /></Field>
          <Field label="رقم الهاتف / الواتساب"><Inp value={newSup.phone} onChange={e => setNewSup({ ...newSup, phone: e.target.value })} placeholder="0913-000-000" /></Field>
          <Field label="التخصص"><Inp value={newSup.spec} onChange={e => setNewSup({ ...newSup, spec: e.target.value })} placeholder="أجهزة ألعاب / مواد كافيه" /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn gold style={{ flex: 1, justifyContent: "center" }} onClick={() => {
              if (!newSup.name.trim()) { showToast("أدخل اسم المورد"); return; }
              let d = (newSup.phone || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "218" + d.slice(1);
              const s = { id: Math.max(0, ...suppliers.map(x => x.id)) + 1, name: newSup.name.trim(), phone: newSup.phone, wa: d, spec: newSup.spec || "عام", total: 0, due: 0, status: "نشط" };
              setSuppliers(list => [...list, s]);
              setSupplier(s.name); // اختره تلقائياً في الفاتورة
              showToast("تمت إضافة المورد واختياره");
              setNewSupModal(false);
            }}>✓ حفظ واختيار</Btn>
            <Btn onClick={() => setNewSupModal(false)}>إلغاء</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
const labelMini = { fontSize: 10, color: C.mt, fontWeight: 600, marginBottom: 2 };

/* ============================ BOOKINGS ============================ */
function Bookings({ ctx }) {
  const { bookings, setBookings, completedBookings, setCompletedBookings, invoices, setInvoices, tables, setTables, showToast, settings } = ctx;
  const cur = settings?.currency || "د.ل";
  const [modal, setModal] = useState(false);
  const [manageModal, setManageModal] = useState(false);
  const [editTable, setEditTable] = useState(null); // table being edited/added
  const [type, setType] = useState("billiard");
  const [tableId, setTableId] = useState(null);
  const [customer, setCustomer] = useState("");
  const [duration, setDuration] = useState("60"); // بالدقائق: 15 | 30 | 60 | مفتوح (open)
  const [bkPay, setBkPay] = useState("كاش");
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(t); }, []);

  const tablesByType = (t) => tables.filter(x => x.type === t);
  const busy = (tid) => Object.values(bookings).some(b => b.tableId === tid);
  const rateOf = (tid) => tables.find(t => t.id === tid)?.rate || 0;
  // سعر المدة حسب سعر الساعة (النصف والربع تناسبياً)
  const priceForDuration = (rate, mins) => {
    if (mins === "open") return 0;
    return Math.round(rate * (parseInt(mins) / 60) * 10) / 10;
  };
  const DUR_OPTS = [{ v: "15", l: "ربع ساعة", s: "15 دقيقة" }, { v: "30", l: "نصف ساعة", s: "30 دقيقة" }, { v: "60", l: "ساعة كاملة", s: "60 دقيقة" }, { v: "open", l: "وقت مفتوح", s: "عدّاد حر" }];

  const start = (tbl, cust, mins, pay) => {
    const id = "bk_" + Date.now();
    const isOpen = mins === "open";
    const price = isOpen ? 0 : priceForDuration(tbl.rate, mins);
    setBookings(b => ({ ...b, [id]: {
      type: tbl.type, tableId: tbl.id, tableName: tbl.name, customer: cust || "زبون",
      startTime: Date.now(), rate: tbl.rate,
      durationMin: isOpen ? null : parseInt(mins), // null = مفتوح
      prepaid: !isOpen, prepaidAmount: price, pay: pay || "كاش",
    } }));
    // الحجز محدد المدة يُدفع مقدماً → أنشئ الفاتورة فوراً
    if (!isOpen) {
      const invNum = "INV-BK-" + (completedBookings.length + invoices.filter(i => i.id.startsWith("INV-BK")).length + 1);
      const durStr = mins === "15" ? "ربع ساعة" : mins === "30" ? "نصف ساعة" : "ساعة";
      setInvoices(iv => [{ id: invNum, customer: cust || "زبون", date: todayISO(), source: "حجز", details: `${TYPE_NAME[tbl.type]} — ${tbl.name} — ${durStr}`, pay, discount: "—", total: price, cost: 0, status: "مدفوعة" }, ...iv]);
      showToast(`تم تأكيد الحجز — ${durStr} بـ ${fmt(price)} ${cur} (${pay}) · فاتورة #${invNum}`);
    } else {
      showToast(`بدأ حجز مفتوح على ${tbl.name} — العدّاد يعمل`);
    }
  };

  const stop = (id) => {
    const b = bookings[id]; if (!b) return;
    // الحجز المدفوع مقدماً: أُنشئت فاتورته عند البدء — الإنهاء يحرّر الطاولة فقط
    if (b.prepaid) {
      setCompletedBookings(cb => [{ type: b.type, tableName: b.tableName, customer: b.customer, dur: b.durationMin >= 60 ? "ساعة" : b.durationMin === 30 ? "نصف ساعة" : "ربع ساعة", rate: b.rate, total: b.prepaidAmount, inv: "مدفوع مقدماً" }, ...cb]);
      setBookings(bk => { const n = { ...bk }; delete n[id]; return n; });
      showToast(`انتهى حجز ${b.tableName}`);
      return;
    }
    // الحجز المفتوح: يُحسب بالوقت الفعلي وتُنشأ فاتورته الآن
    const ms = Date.now() - b.startTime;
    const hours = ms / 3600000;
    const total = Math.max(b.rate * 0.25, hours * b.rate);
    const durMin = Math.round(ms / 60000);
    const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}س ${durMin % 60}د` : `${durMin}د`;
    const invNum = "INV-AUTO-" + (completedBookings.length + 9);
    setCompletedBookings(cb => [{ type: b.type, tableName: b.tableName, customer: b.customer, dur: durStr, rate: b.rate, total, inv: invNum }, ...cb]);
    setInvoices(iv => [{ id: invNum, customer: b.customer, date: todayISO(), source: "حجز", details: `${TYPE_NAME[b.type]} — ${b.tableName} — ${durStr}`, pay: b.pay || "كاش", discount: "—", total: Math.round(total * 10) / 10, cost: 0, status: "مدفوعة" }, ...iv]);
    setBookings(bk => { const n = { ...bk }; delete n[id]; return n; });
    showToast(`فاتورة تلقائية #${invNum} — ${fmt(Math.round(total * 10) / 10)} ${cur}`);
  };

  const elapsed = (st) => {
    const ms = Date.now() - st;
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  const busyCount = Object.keys(bookings).length;
  const todayRev = completedBookings.reduce((s, b) => s + b.total, 0);

  /* ---- table management ---- */
  const saveTable = (data) => {
    if (!data.name.trim()) { showToast("أدخل اسم الطاولة"); return; }
    const rate = parseFloat(data.rate) || TYPE_DEFAULT_RATE[data.type] || 0;
    if (data.id && tables.some(t => t.id === data.id)) {
      // edit
      setTables(ts => ts.map(t => t.id === data.id ? { ...t, name: data.name.trim(), rate, type: data.type } : t));
      showToast("تم تحديث الطاولة");
    } else {
      // add
      const newId = data.type[0] + Date.now().toString().slice(-5);
      setTables(ts => [...ts, { id: newId, type: data.type, name: data.name.trim(), rate }]);
      showToast("تمت إضافة الطاولة");
    }
    setEditTable(null);
  };
  const deleteTable = (tid) => {
    if (busy(tid)) { showToast("لا يمكن حذف طاولة مشغولة — أنهِ الحجز أولاً"); return; }
    setTables(ts => ts.filter(t => t.id !== tid));
    showToast("تم حذف الطاولة");
  };

  const openNewBooking = () => {
    const first = tablesByType("billiard")[0] || tables[0];
    if (first) { setType(first.type); setTableId(first.id); }
    setModal(true);
  };

  return (
    <>
      <PageTop title="حجز الطاولات — اللوحة الحية" action={
        <div style={{ display: "flex", gap: 7 }}>
          <Btn onClick={() => setManageModal(true)}>⚙ إدارة الطاولات</Btn>
          <Btn gold onClick={openNewBooking}>+ حجز جديد</Btn>
        </div>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="مشغولة الآن" value={busyCount} sub={`من ${tables.length} طاولة`} bar="#1a8c3e" />
        <KCard label="إيراد الحجوزات" value={fmt(todayRev)} sub={cur} bar={C.gold} />
        <KCard label="حجوزات مكتملة" value={completedBookings.length} sub="اليوم" bar="#2a78d6" />
        <KCard label="فواتير تلقائية" value={completedBookings.length} sub="عند الخروج" bar={C.purp} />
      </div>
      <Card>
        <CardHead title="حالة الطاولات والملاعب — مباشر" sub="🟢 تحديث تلقائي كل ثانية" />
        {tables.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: C.mt }}>لا توجد طاولات — اضغط «إدارة الطاولات» لإضافة أول طاولة.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(165px,1fr))", gap: 12 }}>
            {tables.map(tb => {
              const entry = Object.entries(bookings).find(([, b]) => b.tableId === tb.id);
              if (entry) {
                const [id, b] = entry;
                return (
                  <div key={tb.id} style={{ borderRadius: 13, padding: ".9rem", border: "1px solid rgba(201,168,76,.4)", background: "linear-gradient(135deg,#fff7eb,#fff)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}><div style={{ fontSize: 13, fontWeight: 700 }}>{TYPE_ICON[tb.type]} {tb.name}</div><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a8c3e", display: "inline-block" }} /></div>
                    {b.prepaid ? (() => {
                      const remainMs = (b.startTime + b.durationMin * 60000) - Date.now();
                      const over = remainMs <= 0;
                      const rm = Math.abs(remainMs);
                      const mm = Math.floor(rm / 60000), ss = Math.floor((rm % 60000) / 1000);
                      return (
                        <>
                          <div style={{ fontSize: 21, fontWeight: 700, color: over ? "#e34948" : C.grn2, fontFamily: "monospace", letterSpacing: 1, margin: ".4rem 0" }}>{over ? "-" : ""}{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: over ? "#e34948" : "#1a8c3e" }}>{over ? "⏰ انتهى الوقت!" : "متبقٍ من الحجز"}</div>
                        </>
                      );
                    })() : (
                      <>
                        <div style={{ fontSize: 21, fontWeight: 700, color: C.grn2, fontFamily: "monospace", letterSpacing: 1, margin: ".4rem 0" }}>{elapsed(b.startTime)}</div>
                        <div style={{ fontSize: 10, color: C.mt }}>وقت مفتوح · {b.rate} {cur}/س</div>
                      </>
                    )}
                    <div style={{ fontSize: 11.5, color: C.k2, marginTop: 4, marginBottom: 2 }}>👤 {b.customer}</div>
                    {b.prepaid && <div style={{ fontSize: 10, color: "#1a8c3e", fontWeight: 600 }}>✓ مدفوع مقدماً {fmt(b.prepaidAmount)} {cur} ({b.pay})</div>}
                    <button onClick={() => stop(id)} style={{ width: "100%", marginTop: ".6rem", padding: ".4rem", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: "#e34948", color: "#fff", fontFamily: "inherit" }}>{b.prepaid ? "■ إنهاء الحجز" : "■ إنهاء وإصدار فاتورة"}</button>
                  </div>
                );
              }
              return (
                <div key={tb.id} style={{ borderRadius: 13, padding: ".9rem", border: `1px solid ${C.bc}`, background: C.crm }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: ".5rem" }}>{TYPE_ICON[tb.type]} {tb.name}</div>
                  <div style={{ fontSize: 26, color: C.mt, textAlign: "center", marginBottom: 2 }}>○</div>
                  <div style={{ textAlign: "center", fontSize: 10.5, color: C.mt, marginBottom: 8 }}>متاحة · {tb.rate} {cur}/س</div>
                  <button onClick={() => { setType(tb.type); setTableId(tb.id); setDuration("60"); setBkPay("كاش"); setCustomer(""); setModal(true); }} style={{ width: "100%", padding: ".45rem", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: C.grl, color: "#fff", fontFamily: "inherit" }}>▶ حجز</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 11 }}>
        <CardHead title="آخر الحجوزات المكتملة" />
        {completedBookings.length === 0 ? <div style={{ color: C.mt, fontSize: 12, padding: "1rem 0", textAlign: "center" }}>لا توجد حجوزات مكتملة بعد — ابدأ حجزاً ثم أنهِه لترى الفوترة التلقائية</div> :
          <Table cols={[{ h: "النشاط", w: "22%" }, { h: "الزبون", w: "18%" }, { h: "المدة", w: "14%" }, { h: "السعر/ساعة", w: "14%" }, { h: "الإجمالي", w: "14%" }, { h: "الفاتورة", w: "18%" }]}
            rows={completedBookings.map(b => [`${TYPE_ICON[b.type]} ${TYPE_NAME[b.type]} — ${b.tableName}`, b.customer, b.dur, b.rate + " " + cur, fmt(Math.round(b.total * 10) / 10) + " " + cur, <Badge tone="b">#{b.inv}</Badge>])} />}
      </Card>

      {/* NEW BOOKING MODAL */}
      {modal && (
        <Modal title="حجز جديد" onClose={() => setModal(false)}>
          <Field label="نوع النشاط" full>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {["billiard", "tennis", "football"].map(t => {
                const count = tablesByType(t).length;
                return (
                  <div key={t} onClick={() => { setType(t); const first = tablesByType(t)[0]; setTableId(first?.id || null); }} style={{ border: `1px solid ${type === t ? C.gold : C.bc}`, borderRadius: 10, padding: ".6rem", textAlign: "center", cursor: "pointer", background: type === t ? "rgba(201,168,76,.12)" : C.crm, opacity: count ? 1 : .5 }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{TYPE_ICON[t]}</div><div style={{ fontSize: 11.5, fontWeight: 600 }}>{TYPE_NAME[t]}</div><div style={{ fontSize: 10, color: C.mt, marginTop: 2 }}>{count} طاولة</div>
                  </div>
                );
              })}
            </div>
          </Field>
          <Field label="اختر الطاولة / الملعب" full>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
              {tablesByType(type).map(tb => {
                const isBusy = busy(tb.id);
                return <div key={tb.id} onClick={() => !isBusy && setTableId(tb.id)} style={{ border: `1px solid ${tableId === tb.id ? C.gold : C.bc}`, borderRadius: 9, padding: ".5rem", textAlign: "center", fontSize: 11.5, fontWeight: 600, cursor: isBusy ? "not-allowed" : "pointer", background: isBusy ? C.redbg : tableId === tb.id ? "rgba(201,168,76,.15)" : C.crm, color: isBusy ? "#922" : C.k2, opacity: isBusy ? .7 : 1 }}>{TYPE_ICON[type]}<br />{tb.name}<br /><span style={{ fontSize: 9, color: C.mt }}>{tb.rate} {cur}/س</span>{isBusy && <><br /><span style={{ fontSize: 9 }}>مشغولة</span></>}</div>;
              })}
              {tablesByType(type).length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.mt, fontSize: 12, padding: ".5rem" }}>لا توجد طاولات لهذا النوع.</div>}
            </div>
          </Field>
          <Field label="اسم الزبون"><Inp value={customer} onChange={e => setCustomer(e.target.value)} placeholder="محمد علي" /></Field>

          <Field label="مدة الحجز" full>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 7 }}>
              {DUR_OPTS.map(o => {
                const price = priceForDuration(rateOf(tableId), o.v);
                return (
                  <div key={o.v} onClick={() => setDuration(o.v)} style={{ border: `1.5px solid ${duration === o.v ? C.gold : C.bc}`, borderRadius: 10, padding: ".55rem .7rem", cursor: "pointer", background: duration === o.v ? C.gold + "14" : C.crm, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.l}</div><div style={{ fontSize: 9.5, color: C.mt }}>{o.s}</div></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: o.v === "open" ? C.mt : C.grn2 }}>{o.v === "open" ? "حسب الوقت" : fmt(price) + " " + cur}</div>
                  </div>
                );
              })}
            </div>
          </Field>

          {duration !== "open" && (
            <Field label="طريقة الدفع" full>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {["كاش", "بطاقة", "تحويل"].map(m => (
                  <div key={m} onClick={() => setBkPay(m)} style={{ border: `1px solid ${bkPay === m ? C.gold : C.bc}`, borderRadius: 8, padding: ".45rem", textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: bkPay === m ? 700 : 500, background: bkPay === m ? C.gold + "14" : C.crm, color: bkPay === m ? C.grn2 : C.k2 }}>{m}</div>
                ))}
              </div>
            </Field>
          )}

          <div style={{ background: "rgba(26,140,62,.07)", border: "0.5px solid rgba(26,140,62,.22)", borderRadius: 9, padding: ".65rem .85rem", margin: ".6rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.mt, fontWeight: 600 }}>{duration === "open" ? "السعر بالساعة" : "الإجمالي المستحق"}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.grn2 }}>{duration === "open" ? fmt(rateOf(tableId)) : fmt(priceForDuration(rateOf(tableId), duration))} {cur}</span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn gold style={{ flex: 1, justifyContent: "center" }} onClick={() => {
              const tbl = tables.find(t => t.id === tableId);
              if (!tbl) { showToast("اختر طاولة"); return; }
              if (busy(tableId)) { showToast("الطاولة مشغولة"); return; }
              start(tbl, customer, duration, bkPay);
              setModal(false); setCustomer(""); setDuration("60"); setBkPay("كاش");
            }}>{duration === "open" ? "▶ بدء الحجز المفتوح" : "✓ تأكيد الحجز والدفع"}</Btn>
            <Btn onClick={() => setModal(false)}>إلغاء</Btn>
          </div>
        </Modal>
      )}

      {/* MANAGE TABLES MODAL */}
      {manageModal && (
        <Modal title="إدارة الطاولات والملاعب" onClose={() => setManageModal(false)} width={600}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.mt }}>أضف، عدّل، احذف، وغيّر أسعار الطاولات لكل نشاط.</div>
            <Btn gold sm onClick={() => setEditTable({ id: null, type: "billiard", name: "", rate: "" })}>+ طاولة جديدة</Btn>
          </div>
          {["billiard", "tennis", "football"].map(t => {
            const list = tablesByType(t);
            return (
              <div key={t} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gdd, marginBottom: 6 }}>{TYPE_ICON[t]} {TYPE_NAME[t]} ({list.length})</div>
                {list.length === 0 && <div style={{ fontSize: 11.5, color: C.mt, padding: ".3rem 0" }}>لا توجد طاولات.</div>}
                {list.map(tb => (
                  <div key={tb.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.crm, borderRadius: 8, padding: ".5rem .75rem", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{TYPE_ICON[t]}</span>
                      <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{tb.name}</div><div style={{ fontSize: 10.5, color: C.mt }}>{tb.rate} {cur} / ساعة{busy(tb.id) && " · مشغولة الآن"}</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <Btn sm onClick={() => setEditTable({ ...tb, rate: String(tb.rate) })}>تعديل</Btn>
                      <Btn sm danger onClick={() => deleteTable(tb.id)}>حذف</Btn>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </Modal>
      )}

      {/* ADD / EDIT TABLE MODAL */}
      {editTable && (
        <Modal title={editTable.id ? "تعديل طاولة" : "إضافة طاولة جديدة"} onClose={() => setEditTable(null)} width={420}>
          <Field label="نوع النشاط">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {["billiard", "tennis", "football"].map(t => (
                <div key={t} onClick={() => setEditTable(e => ({ ...e, type: t, rate: e.rate || String(TYPE_DEFAULT_RATE[t]) }))} style={{ border: `1px solid ${editTable.type === t ? C.gold : C.bc}`, borderRadius: 8, padding: ".5rem", textAlign: "center", cursor: "pointer", background: editTable.type === t ? "rgba(201,168,76,.12)" : C.crm }}>
                  <div style={{ fontSize: 18 }}>{TYPE_ICON[t]}</div><div style={{ fontSize: 10.5, fontWeight: 600 }}>{TYPE_NAME[t]}</div>
                </div>
              ))}
            </div>
          </Field>
          <Field label="اسم الطاولة / الملعب"><Inp value={editTable.name} onChange={e => setEditTable(x => ({ ...x, name: e.target.value }))} placeholder="طاولة 4" /></Field>
          <Field label={`السعر بالساعة (${cur})`}><Inp type="number" value={editTable.rate} onChange={e => setEditTable(x => ({ ...x, rate: e.target.value }))} placeholder={String(TYPE_DEFAULT_RATE[editTable.type])} /></Field>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Btn gold onClick={() => saveTable(editTable)} style={{ flex: 1, justifyContent: "center" }}>✓ حفظ</Btn><Btn onClick={() => setEditTable(null)}>إلغاء</Btn></div>
        </Modal>
      )}
    </>
  );
}

/* ============================ SUPPLIERS ============================ */
function Suppliers({ ctx }) {
  const { suppliers, setSuppliers, purchases, setPurchases, showToast, settings } = ctx;
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState("all"); // all | due
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [f, setF] = useState({ name: "", phone: "", spec: "" });
  const cur = settings?.currency || "د.ل";
  const toWa = (phone) => {
    let d = (phone || "").replace(/\D/g, "");
    if (d.startsWith("0")) d = "218" + d.slice(1);
    return d;
  };
  const save = () => {
    if (!f.name.trim()) { showToast("أدخل اسم المورد"); return; }
    setSuppliers(s => [...s, { id: Math.max(0, ...s.map(x => x.id)) + 1, name: f.name, phone: f.phone, wa: toWa(f.phone), spec: f.spec || "عام", total: 0, due: 0, status: "نشط" }]);
    showToast("تمت إضافة المورد"); setModal(false); setF({ name: "", phone: "", spec: "" });
  };

  const shown = suppliers.filter(s => {
    if (!(s.name.includes(q) || (s.phone || "").includes(q))) return false;
    if (filter === "due") return (s.due || 0) > 0;
    if (filter.startsWith("spec:")) return s.spec === filter.slice(5);
    return true;
  });
  const totalDue = suppliers.reduce((s, x) => s + (x.due || 0), 0);
  const dueCount = suppliers.filter(s => (s.due || 0) > 0).length;
  // تصنيفات الموردين (حسب التخصص)
  const specs = [...new Set(suppliers.map(s => s.spec).filter(Boolean))];

  return (
    <>
      <PageTop title="إدارة الموردين" action={<Btn gold onClick={() => setModal(true)}>+ إضافة مورد</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="الموردون النشطون" value={suppliers.filter(s => s.status === "نشط").length} sub="مورد" bar={C.grl} />
        <KCard label="موردون غير مسدّدين" value={dueCount} sub="عليهم مستحقات" bar={C.gold} />
        <KCard label="إجمالي المستحقات" value={fmt(totalDue)} sub={cur} bar={C.red} />
      </div>

      {totalDue > 0 && (
        <div style={{ background: "linear-gradient(135deg,#fdeaea,#fff)", border: "1px solid rgba(192,57,43,.28)", borderRadius: 12, padding: ".7rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12.5, color: "#922" }}>💰 يوجد <b>{dueCount}</b> مورد بمستحقات غير مسددة بإجمالي <b>{fmt(totalDue)} {cur}</b></div>
          <Btn sm danger onClick={() => setFilter("due")}>عرض غير المسدّدين →</Btn>
        </div>
      )}

      <Card>
        <CardHead title="قائمة الموردين" sub="اضغط «عرض» لكشف الحساب والسداد" right={
          <div style={{ display: "flex", gap: 7 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." style={{ ...inputStyle, width: 160 }} />
            <Sel value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 165 }}>
              <option value="all">كل الموردين</option>
              <option value="due">غير المسدّدين</option>
              {specs.length > 0 && <option disabled>── حسب التخصص ──</option>}
              {specs.map(sp => <option key={sp} value={"spec:" + sp}>{sp}</option>)}
            </Sel>
          </div>
        } />
        {/* شرائح التصنيف السريع حسب التخصص */}
        {specs.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            <span onClick={() => setFilter("all")} style={{ cursor: "pointer", fontSize: 11.5, fontWeight: 600, padding: ".3rem .8rem", borderRadius: 20, background: filter === "all" ? C.grn : C.crm, color: filter === "all" ? C.gld : C.k2, border: `0.5px solid ${C.bc}` }}>الكل ({suppliers.length})</span>
            {specs.map(sp => {
              const n = suppliers.filter(s => s.spec === sp).length;
              const active = filter === "spec:" + sp;
              return <span key={sp} onClick={() => setFilter("spec:" + sp)} style={{ cursor: "pointer", fontSize: 11.5, fontWeight: 600, padding: ".3rem .8rem", borderRadius: 20, background: active ? C.grn : C.crm, color: active ? C.gld : C.k2, border: `0.5px solid ${C.bc}` }}>{sp} ({n})</span>;
            })}
          </div>
        )}
        <Table cols={[{ h: "الاسم", w: "19%" }, { h: "الهاتف", w: "15%" }, { h: "واتساب", w: "8%" }, { h: "التخصص", w: "16%" }, { h: "إجمالي الطلبات", w: "13%" }, { h: "المستحقات", w: "14%" }, { h: "عرض", w: "9%" }]}
          rows={shown.map(s => [
            <span style={{ fontWeight: 600 }}>{s.name}</span>, s.phone,
            s.wa ? <span style={{ color: "#25D366", fontSize: 15 }} title="متصل بواتساب">📱</span> : <span style={{ color: C.mt }}>—</span>,
            <Badge tone={s.spec.includes("ألعاب") ? "g" : s.spec.includes("كافيه") ? "a" : "p"}>{s.spec}</Badge>,
            fmt(s.total) + " " + cur,
            (s.due || 0) > 0 ? <Badge tone="a">{fmt(s.due)} {cur}</Badge> : <Badge tone="g">مسدّد</Badge>,
            <Btn sm onClick={() => setDetail(s)}>عرض</Btn>,
          ])} />
      </Card>

      {modal && <Modal title="إضافة مورد جديد" onClose={() => setModal(false)} width={440}>
        <Field label="اسم المورد"><Inp value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="رقم الهاتف / الواتساب"><Inp value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="0913-000-000" /></Field>
        {f.phone && <div style={{ fontSize: 11, color: C.mt, marginTop: -6, marginBottom: 10 }}>سيُحفظ رقم الواتساب كـ: {toWa(f.phone) || "—"}</div>}
        <Field label="التخصص"><Inp value={f.spec} onChange={e => setF({ ...f, spec: e.target.value })} placeholder="أجهزة ألعاب / مواد كافيه" /></Field>
        <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ حفظ</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
      </Modal>}

      {detail && <SupplierDetail ctx={ctx} supplier={suppliers.find(s => s.id === detail.id)} onClose={() => setDetail(null)} />}
    </>
  );
}

/* ---- Supplier detail: statement, settle payment, receipt, WhatsApp ---- */
function SupplierDetail({ ctx, supplier, onClose }) {
  const { purchases, setPurchases, suppliers, setSuppliers, showToast, settings } = ctx;
  const cur = settings?.currency || "د.ل";
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const s = supplier;
  const supPurchases = purchases.filter(p => p.supplier === s.name);
  const deferredPurchases = supPurchases.filter(p => p.pay === "آجل");

  const settle = () => {
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) { showToast("أدخل مبلغاً صحيحاً"); return; }
    if (amt > (s.due || 0)) { showToast("المبلغ أكبر من المستحقات"); return; }
    // reduce supplier due; settle oldest deferred purchases
    let remaining = amt;
    const sorted = [...deferredPurchases].sort((a, b) => a.date.localeCompare(b.date));
    const settledIds = [];
    for (const p of sorted) {
      if (remaining >= p.total) { remaining -= p.total; settledIds.push(p.id); }
    }
    setPurchases(ps => ps.map(x => settledIds.includes(x.id) ? { ...x, pay: "مسدد", status: "مستلم" } : x));
    setSuppliers(sup => sup.map(x => x.id === s.id ? { ...x, due: Math.max(0, (x.due || 0) - amt), status: (x.due || 0) - amt <= 0 ? "نشط" : x.status } : x));
    printVoucher(amt);
    showToast(`تم سداد ${fmt(amt)} ${cur} للمورد وإصدار السند`);
    setPayModal(false); setPayAmount("");
  };

  const printVoucher = (amt) => {
    const isThermal = settings?.printer === "xprinter";
    const newDue = Math.max(0, (s.due || 0) - amt);
    const w = window.open("", "_blank", `width=${isThermal ? 340 : 800},height=600`);
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>سند صرف</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:${isThermal ? "monospace" : "'Tajawal',sans-serif"}}
    body{padding:${isThermal ? "10px" : "2cm"};direction:rtl;color:#1a1a18}
    .ttl{text-align:center;font-size:${isThermal ? "14px" : "18px"};font-weight:700;color:#1a5c2e}.sub{text-align:center;font-size:10px;color:#7a7870;margin-bottom:8px}
    .box{border:1px dashed #c9a84c;border-radius:8px;padding:${isThermal ? "8px" : "16px"};margin-top:10px}
    .r{display:flex;justify-content:space-between;font-size:${isThermal ? "11px" : "13px"};margin-bottom:6px}
    .big{font-size:${isThermal ? "18px" : "26px"};font-weight:700;color:#c0392b;text-align:center;margin:10px 0}
    .ft{text-align:center;font-size:10px;color:#7a7870;margin-top:14px;border-top:1px dashed #ccc;padding-top:8px}</style></head><body>
    <div class="ttl">🌴 ${settings?.clubName || "نادي النخيل"}</div><div class="sub">سند صرف للمورد</div>
    <div class="box">
      <div class="r"><span>التاريخ:</span><span>${new Date().toLocaleDateString("ar-LY")}</span></div>
      <div class="r"><span>المورد:</span><span>${s.name}</span></div>
      <div class="r"><span>الهاتف:</span><span>${s.phone}</span></div>
      <div class="big">${fmt(amt)} ${cur}</div>
      <div class="r"><span>المستحق السابق:</span><span>${fmt(s.due || 0)} ${cur}</span></div>
      <div class="r"><span>المتبقي:</span><span>${fmt(newDue)} ${cur}</span></div>
    </div>
    <div class="ft">${settings?.invoiceFooter || "نادي النخيل"}</div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  const sendStatement = () => {
    // توليد كشف الحساب PDF — المستخدم يحفظه ويشاركه بنفسه عبر واتساب
    openPdfDoc(settings, {
      title: "كشف حساب مورد",
      recipientLabel: "المورد", recipientName: s.name, recipientPhone: s.phone,
      docNo: "SUP-" + s.id + "-" + Date.now().toString().slice(-4),
      columns: ["#", "رقم الطلب", "التاريخ", "المنتجات", "الدفع", "المبلغ"],
      rows: supPurchases.length
        ? supPurchases.map((p, i) => [i + 1, "#" + p.id, arDate(p.date), p.items, p.pay, fmt(p.total) + " " + cur])
        : [["—", "لا توجد طلبات", "", "", "", ""]],
      totals: [
        ["إجمالي الطلبات", fmt(s.total) + " " + cur],
        ["المستحقات غير المسددة", fmt(s.due || 0) + " " + cur],
      ],
      note: (s.due || 0) > 0 ? "سيتم تسديد المستحقات وفق الاتفاق المبرم. شكراً لتعاونكم." : "جميع المستحقات مسددة — شكراً لتعاونكم.",
    });
    showToast("فُتح كشف الحساب — احفظه كـ PDF ثم شاركه عبر واتساب المورد");
  };

  const PAY_TONE = { "كاش": "g", "بطاقة": "b", "تحويل": "p", "آجل": "a", "مسدد": "g" };
  return (
    <Modal title={`ملف المورد — ${s.name}`} onClose={onClose} width={620}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.crm, borderRadius: 10, padding: ".7rem", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700, color: C.grn2 }}>{fmt(s.total)}</div><div style={{ fontSize: 10, color: C.mt }}>إجمالي الطلبات ({cur})</div></div>
        <div style={{ background: C.crm, borderRadius: 10, padding: ".7rem", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700 }}>{supPurchases.length}</div><div style={{ fontSize: 10, color: C.mt }}>عدد الطلبات</div></div>
        <div style={{ background: (s.due || 0) > 0 ? C.redbg : "#e1f4e8", borderRadius: 10, padding: ".7rem", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700, color: (s.due || 0) > 0 ? C.red : "#1a5c2e" }}>{fmt(s.due || 0)}</div><div style={{ fontSize: 10, color: C.mt }}>المستحقات ({cur})</div></div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.mt, marginBottom: 12 }}>
        <span style={{ color: "#25D366", fontSize: 15 }}>📱</span> واتساب: {s.phone || "غير مسجّل"} · التخصص: {s.spec}
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {(s.due || 0) > 0 && <Btn gold onClick={() => setPayModal(true)}>💵 سداد مستحقات + سند</Btn>}
        <Btn onClick={sendStatement} style={{ borderColor: "#25D366", color: "#128C4B" }}>📄 فتح كشف الحساب PDF</Btn>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.mt, marginBottom: 8 }}>سجل طلبات الشراء ({supPurchases.length})</div>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        <Table cols={[{ h: "رقم", w: "16%" }, { h: "التاريخ", w: "20%" }, { h: "المنتجات", w: "30%" }, { h: "الدفع", w: "16%" }, { h: "المبلغ", w: "18%" }]}
          rows={supPurchases.length ? supPurchases.map(p => ["#" + p.id, arDate(p.date), p.items, <Badge tone={PAY_TONE[p.pay] || "g"}>{p.pay}</Badge>, fmt(p.total) + " " + cur]) : [["—", "لا توجد طلبات", "", "", ""]]} />
      </div>

      {payModal && (
        <Modal title="سداد مستحقات المورد" onClose={() => setPayModal(false)} width={400}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.mt }}>المستحقات غير المسددة</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.red }}>{fmt(s.due || 0)} {cur}</div>
          </div>
          <Field label="المبلغ المدفوع"><Inp type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" /></Field>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Btn sm onClick={() => setPayAmount(String(s.due || 0))}>المبلغ كامل</Btn>
            <Btn sm onClick={() => setPayAmount(String(Math.round((s.due || 0) / 2)))}>النصف</Btn>
          </div>
          <div style={{ fontSize: 11, color: C.mt, marginBottom: 12 }}>سيتم إصدار سند صرف قابل للطباعة، وتسوية طلبات الشراء الآجلة تلقائياً حسب المبلغ.</div>
          <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={settle} style={{ flex: 1, justifyContent: "center" }}>✓ تأكيد وإصدار السند</Btn><Btn onClick={() => setPayModal(false)}>إلغاء</Btn></div>
        </Modal>
      )}
    </Modal>
  );
}

/* ============================ CUSTOMERS ============================ */
/* ---- WhatsApp helper ---- */
/* ---- shared PDF document system: in-app preview + real PDF download ---- */
const PDF_HOOK = { show: null };
// تُستدعى من أي مكوّن — تعرض المستند داخل التطبيق (بدون نوافذ منبثقة)
function openPdfDoc(settings, cfg) {
  if (PDF_HOOK.show) PDF_HOOK.show({ settings: settings || {}, cfg });
}

// تحميل مكتبة تحويل HTML إلى PDF عند الحاجة (تدعم العربية لأنها تلتقط العرض الفعلي)
function ensureHtml2pdf() {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) return resolve();
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    sc.onload = resolve; sc.onerror = () => reject(new Error("cdn"));
    document.head.appendChild(sc);
  });
}

function PdfPreview({ doc, onClose }) {
  const s = doc.settings || {};
  const cfg = doc.cfg;
  const sheetRef = useRef(null);
  const [state, setState] = useState("preparing"); // preparing | ready | failed
  const [blob, setBlob] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [note, setNote] = useState("");
  const docNo = cfg.docNo || ("DOC-" + Date.now().toString().slice(-6));
  const fileName = docNo + ".pdf";

  // تجهيز ملف الـPDF تلقائياً عند فتح المعاينة
  useEffect(() => {
    let cancelled = false;
    const prepare = async () => {
      // ننتظر لحظة حتى يكتمل عرض المستند والخط
      await new Promise(r => setTimeout(r, 350));
      try {
        await ensureHtml2pdf();
        const b = await window.html2pdf().set({
          margin: [8, 8, 10, 8],
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        }).from(sheetRef.current).output("blob");
        if (cancelled) return;
        const url = URL.createObjectURL(b);
        setBlob(b); setBlobUrl(url); setState("ready");
      } catch (e) {
        if (!cancelled) setState("failed");
      }
    };
    prepare();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  // مشاركة أصلية (الأجهزة اللوحية/الهواتف): تفتح قائمة النظام ← واتساب والملف مرفق
  const shareFile = async () => {
    if (!blob) return;
    try {
      const f = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: cfg.title });
      } else {
        setNote("المشاركة المباشرة غير مدعومة في هذا المتصفح — استخدم زر التنزيل ثم شارك الملف من جهازك.");
      }
    } catch (e) { /* المستخدم أغلق قائمة المشاركة */ }
  };

  const printDoc = () => {
    document.body.classList.add("nk-printing");
    const done = () => { document.body.classList.remove("nk-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(done, 3000);
    window.print();
  };

  const btn = (bg, color) => ({ background: bg, color, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, padding: "8px 15px", cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 });
  const hint = note
    || (state === "preparing" ? "⏳ جارٍ تجهيز ملف الـPDF تلقائياً..."
      : state === "failed" ? "تعذّر تجهيز الملف (تحقق من الإنترنت) — استخدم زر «طباعة / حفظ» واختر PDF."
        : "✅ الملف جاهز — نزّله أو شاركه عبر واتساب 📎 مباشرة");

  const D = { grn: "#1a5c2e", gold: "#c9a84c", gld: "#f0d080", mt: "#7a7870", crm: "#faf8f2" };
  const th = { background: D.grn, color: D.gld, padding: "7px 9px", textAlign: "right", fontSize: 11.5, fontWeight: 700 };
  const td = { padding: "6px 9px", borderBottom: "0.5px solid #e8e4d8", fontSize: 11.5, color: "#1a1a18" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(12,20,14,.75)", display: "flex", flexDirection: "column" }}>
      {/* شريط الأدوات */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: ".65rem .9rem", background: D.grn, boxShadow: "0 2px 12px rgba(0,0,0,.3)", flexWrap: "wrap" }}>
        <span style={{ color: D.gld, fontWeight: 700, fontSize: 13, flex: 1, minWidth: 130 }}>📄 {cfg.title}</span>
        {state === "ready" && (
          <>
            <a href={blobUrl} download={fileName} style={btn(D.gold, "#fff")}>⬇ تنزيل PDF</a>
            <button onClick={shareFile} style={btn("#25D366", "#fff")}>📤 مشاركة</button>
          </>
        )}
        {state === "preparing" && <span style={{ ...btn("rgba(255,255,255,.14)", "#fff"), cursor: "default" }}>⏳ تجهيز الملف...</span>}
        <button onClick={printDoc} style={btn("rgba(255,255,255,.14)", "#fff")}>🖨 طباعة / حفظ</button>
        <button onClick={onClose} style={btn("rgba(255,255,255,.14)", "#fff")}>✕ إغلاق</button>
      </div>
      <div style={{ background: state === "ready" ? "#e8f8ee" : "#fdf6e3", color: state === "ready" ? "#1a5c2e" : "#8a6a20", fontSize: 11.5, padding: "6px 14px", textAlign: "center" }}>
        {hint}
      </div>

      {/* المستند */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 10px" }}>
        <div ref={sheetRef} className="nk-pdf-sheet" dir="rtl" style={{ maxWidth: 780, margin: "0 auto", background: "#fff", padding: "26px 30px", borderRadius: 6, boxShadow: "0 8px 30px rgba(0,0,0,.35)", fontFamily: "'Tajawal',sans-serif", color: "#1a1a18" }}>
          {/* الترويسة */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2.5px solid ${D.gold}`, paddingBottom: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              {s.logo ? <img src={s.logo} alt="" style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover" }} /> : <Crest size={54} />}
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: D.grn }}>{s.clubName || "نادي النخيل"}</div>
                <div style={{ fontSize: 10.5, color: D.mt, marginTop: 2 }}>{s.clubSub || "النادي الرياضي الترفيهي"}</div>
              </div>
            </div>
            <div style={{ textAlign: "left", fontSize: 10.5, color: D.mt, lineHeight: 1.8 }}>
              {s.address || "مصراتة، ليبيا"}<br />هاتف: {s.phone || ""}<br />التاريخ: {new Date().toLocaleDateString("ar-LY")}
            </div>
          </div>

          <div style={{ textAlign: "center", margin: "4px 0 12px" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: D.grn, borderBottom: `1.5px dashed ${D.gold}`, paddingBottom: 3 }}>{cfg.title}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, background: D.crm, border: "0.5px solid rgba(201,168,76,.35)", borderRadius: 10, padding: "9px 13px", marginBottom: 12, fontSize: 11.5 }}>
            <span>{cfg.recipientLabel || "إلى"}: <b style={{ color: D.grn }}>{cfg.recipientName || "—"}</b></span>
            {cfg.recipientPhone && <span>الهاتف: <b style={{ color: D.grn }}>{cfg.recipientPhone}</b></span>}
            <span>رقم المستند: <b style={{ color: D.grn }}>{docNo}</b></span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <thead><tr>{cfg.columns.map((c, i) => <th key={i} style={th}>{c}</th>)}</tr></thead>
            <tbody>{cfg.rows.map((r, ri) => (
              <tr key={ri} style={{ background: ri % 2 ? D.crm : "#fff" }}>{r.map((cell, ci) => <td key={ci} style={td}>{cell}</td>)}</tr>
            ))}</tbody>
          </table>

          {cfg.totals && cfg.totals.length > 0 && (
            <div style={{ display: "flex", marginBottom: 12 }}>
              <div style={{ minWidth: 250, border: "1px solid rgba(201,168,76,.5)", borderRadius: 10, overflow: "hidden" }}>
                {cfg.totals.map((t, i) => {
                  const last = i === cfg.totals.length - 1;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 13px", fontSize: last ? 13 : 12, borderBottom: last ? "none" : "0.5px solid rgba(201,168,76,.25)", background: last ? D.grn : "transparent", color: last ? D.gld : "#1a1a18", fontWeight: last ? 700 : 500 }}>
                      <span>{t[0]}</span><span>{t[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cfg.note && <div style={{ background: "#fdf6e3", border: `0.5px dashed ${D.gold}`, borderRadius: 9, padding: "8px 12px", fontSize: 11, color: "#8a6a20", marginBottom: 12 }}>📌 {cfg.note}</div>}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", fontSize: 10.5, color: D.mt }}>
            <div style={{ width: 150, borderTop: "1px dashed #aaa", textAlign: "center", paddingTop: 4 }}>توقيع المستلم</div>
            <div style={{ width: 150, borderTop: "1px dashed #aaa", textAlign: "center", paddingTop: 4 }}>الختم / الإدارة</div>
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: D.mt, borderTop: "1px solid rgba(201,168,76,.4)", paddingTop: 8, marginTop: 10 }}>
            {s.invoiceFooter || "شكراً لتعاملكم — " + (s.clubName || "نادي النخيل")} — مستند مُولّد آلياً
          </div>
        </div>
      </div>
    </div>
  );
}

function toWaNumber(phone) {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "218" + d.slice(1);
  return d;
}

/* ---- Shared new-customer modal (WhatsApp mandatory) ---- */
function NewCustomerModal({ ctx, onClose, onCreated }) {
  const { customers, setCustomers, showToast } = ctx;
  const [f, setF] = useState({ name: "", phone: "" });
  const save = () => {
    if (!f.name.trim()) { showToast("أدخل اسم الزبون"); return; }
    const wa = toWaNumber(f.phone);
    if (!wa || wa.length < 10) { showToast("رقم الواتساب إلزامي وبصيغة صحيحة"); return; }
    const c = { id: Math.max(0, ...customers.map(x => x.id)) + 1, name: f.name.trim(), phone: f.phone, wa, invoices: 0, total: 0, debt: 0, last: todayISO(), tier: "جديد" };
    setCustomers(cs => [...cs, c]);
    showToast("تمت إضافة الزبون");
    onCreated ? onCreated(c) : onClose();
  };
  return (
    <Modal title="تسجيل زبون جديد" onClose={onClose} width={440}>
      <Field label="اسم الزبون *"><Inp value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="رقم الواتساب * (إلزامي)"><Inp value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="0913-000-000" /></Field>
      {f.phone && <div style={{ fontSize: 11, color: C.mt, marginTop: -6, marginBottom: 10 }}>سيُحفظ كـ: {toWaNumber(f.phone) || "—"}</div>}
      <div style={{ fontSize: 11, color: C.gdd, background: C.gold + "12", borderRadius: 8, padding: ".55rem .75rem", marginBottom: 12 }}>لا يمكن إضافة زبون بدون رقم واتساب — يُستخدم لإرسال الفواتير والتقارير.</div>
      <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ حفظ الزبون</Btn><Btn onClick={onClose}>إلغاء</Btn></div>
    </Modal>
  );
}

/* ============================ CUSTOMERS ============================ */
function Customers({ ctx }) {
  const { customers, setCustomers, invoices, setInvoices, showToast, settings } = ctx;
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | debt
  const [detail, setDetail] = useState(null); // customer being viewed
  const cur = settings?.currency || "د.ل";

  const shown = customers.filter(c => {
    if (!(c.name.includes(q) || c.phone.includes(q))) return false;
    if (filter === "debt") return (c.debt || 0) > 0;
    return true;
  });
  const totalDebt = customers.reduce((s, c) => s + (c.debt || 0), 0);
  const debtorsCount = customers.filter(c => (c.debt || 0) > 0).length;

  return (
    <>
      <PageTop title="نظام الزبائن" action={<Btn gold onClick={() => setModal(true)}>+ إضافة زبون</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="إجمالي الزبائن" value={customers.length} sub="زبون مسجّل" bar={C.grl} />
        <KCard label="أصحاب حسابات آجلة" value={debtorsCount} sub="عليهم مستحقات" bar={C.gold} />
        <KCard label="إجمالي الديون الآجلة" value={fmt(totalDebt)} sub={cur} bar={C.red} />
      </div>
      <Card>
        <CardHead title="قائمة الزبائن" right={
          <div style={{ display: "flex", gap: 7 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." style={{ ...inputStyle, width: 170 }} />
            <Sel value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 150 }}>
              <option value="all">كل الزبائن</option>
              <option value="debt">أصحاب حسابات آجلة</option>
            </Sel>
          </div>
        } />
        <Table cols={[{ h: "الاسم", w: "20%" }, { h: "واتساب", w: "17%" }, { h: "الفواتير", w: "11%" }, { h: "إجمالي الشراء", w: "16%" }, { h: "الرصيد الآجل", w: "15%" }, { h: "التصنيف", w: "11%" }, { h: "عرض", w: "10%" }]}
          rows={shown.map(c => [
            <span style={{ fontWeight: 600 }}>{c.name}</span>,
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{c.wa ? <span style={{ color: "#25D366" }}>📱</span> : "—"} {c.phone}</span>,
            c.invoices, fmt(c.total) + " " + cur,
            (c.debt || 0) > 0 ? <Badge tone="a">{fmt(c.debt)} {cur}</Badge> : <Badge tone="g">مسدّد</Badge>,
            <Badge tone={c.tier === "VIP" ? "gold" : c.tier === "جديد" ? "b" : "g"}>{c.tier}</Badge>,
            <Btn sm onClick={() => setDetail(c)}>عرض</Btn>,
          ])} />
      </Card>

      {modal && <NewCustomerModal ctx={ctx} onClose={() => setModal(false)} onCreated={() => setModal(false)} />}
      {detail && <CustomerDetail ctx={ctx} customer={customers.find(c => c.id === detail.id)} onClose={() => setDetail(null)} />}
    </>
  );
}

/* ---- Customer detail: statement, receipt, WhatsApp reports ---- */
function CustomerDetail({ ctx, customer, onClose }) {
  const { invoices, setInvoices, customers, setCustomers, showToast, settings } = ctx;
  const cur = settings?.currency || "د.ل";
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payVia, setPayVia] = useState("كاش");
  const c = customer;
  const custInvoices = invoices.filter(iv => iv.customer === c.name);
  const deferredInvoices = custInvoices.filter(iv => iv.pay === "آجل" && iv.status === "معلقة");

  /* receive a payment -> issue receipt, reduce debt, settle oldest deferred invoices */
  const receivePayment = () => {
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) { showToast("أدخل مبلغاً صحيحاً"); return; }
    if (amt > (c.debt || 0)) { showToast("المبلغ أكبر من الرصيد الآجل"); return; }
    // settle oldest deferred invoices up to amount
    let remaining = amt;
    const sorted = [...deferredInvoices].sort((a, b) => a.date.localeCompare(b.date));
    const settledIds = [];
    for (const inv of sorted) {
      if (remaining >= inv.total) { remaining -= inv.total; settledIds.push(inv.id); }
    }
    setInvoices(iv => iv.map(x => settledIds.includes(x.id) ? { ...x, status: "مدفوعة", paidAt: todayISO(), paidVia: payVia } : x));
    setCustomers(cs => cs.map(x => x.id === c.id ? { ...x, debt: Math.max(0, (x.debt || 0) - amt) } : x));
    // build receipt
    printReceipt(amt);
    showToast(`تم استلام ${fmt(amt)} ${cur} وإصدار الوصل`);
    setPayModal(false); setPayAmount("");
  };

  const printReceipt = (amt) => {
    const isThermal = settings?.printer === "xprinter";
    const w = window.open("", "_blank", `width=${isThermal ? 340 : 800},height=600`);
    const newDebt = Math.max(0, (c.debt || 0) - amt);
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>وصل استلام</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:${isThermal ? "monospace" : "'Tajawal',sans-serif"}}
    body{padding:${isThermal ? "10px" : "2cm"};direction:rtl;color:#1a1a18;${isThermal ? "width:80mm;" : ""}}
    .ttl{text-align:center;font-size:${isThermal ? "14px" : "18px"};font-weight:700;color:#1a5c2e}.sub{text-align:center;font-size:10px;color:#7a7870;margin-bottom:8px}
    .box{border:1px dashed #c9a84c;border-radius:8px;padding:${isThermal ? "8px" : "16px"};margin-top:10px}
    .r{display:flex;justify-content:space-between;font-size:${isThermal ? "11px" : "13px"};margin-bottom:6px}
    .big{font-size:${isThermal ? "18px" : "26px"};font-weight:700;color:#1a5c2e;text-align:center;margin:10px 0}
    .ft{text-align:center;font-size:10px;color:#7a7870;margin-top:14px;border-top:1px dashed #ccc;padding-top:8px}</style></head><body>
    <div class="ttl">🌴 ${settings?.clubName || "نادي النخيل"}</div><div class="sub">وصل استلام دفعة</div>
    <div class="box">
      <div class="r"><span>التاريخ:</span><span>${new Date().toLocaleDateString("ar-LY")}</span></div>
      <div class="r"><span>الزبون:</span><span>${c.name}</span></div>
      <div class="r"><span>الهاتف:</span><span>${c.phone}</span></div>
      <div class="big">${fmt(amt)} ${cur}</div>
      <div class="r"><span>الرصيد السابق:</span><span>${fmt(c.debt || 0)} ${cur}</span></div>
      <div class="r"><span>الرصيد المتبقي:</span><span>${fmt(newDebt)} ${cur}</span></div>
    </div>
    <div class="ft">${settings?.invoiceFooter || "شكراً لكم — نادي النخيل"}</div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  /* WhatsApp: send total-balance report */
  const sendBalanceReport = () => {
    // 1) توليد PDF كشف الرصيد
    openPdfDoc(settings, {
      title: "كشف حساب — تقرير الرصيد",
      recipientLabel: "الزبون", recipientName: c.name, recipientPhone: c.phone,
      docNo: "BAL-" + c.id + "-" + Date.now().toString().slice(-4),
      columns: ["البند", "القيمة"],
      rows: [
        ["إجمالي المشتريات", fmt(c.total) + " " + cur],
        ["عدد الفواتير", c.invoices],
        ["الفواتير الآجلة غير المسددة", deferredInvoices.length],
      ],
      totals: [["الرصيد الآجل المستحق", fmt(c.debt || 0) + " " + cur]],
      note: (c.debt || 0) > 0 ? "نرجو التكرم بتسديد المبلغ المستحق في أقرب وقت ممكن. شكراً لتعاملكم معنا." : "لا توجد مستحقات — شكراً لتعاملكم!",
    });
    showToast("فُتح تقرير الرصيد — احفظه كـ PDF ثم شاركه عبر واتساب الزبون");
  };

  /* PDF + WhatsApp: full invoices report */
  const sendInvoicesReport = () => {
    openPdfDoc(settings, {
      title: "تقرير الفواتير الكامل",
      recipientLabel: "الزبون", recipientName: c.name, recipientPhone: c.phone,
      docNo: "INV-R-" + c.id + "-" + Date.now().toString().slice(-4),
      columns: ["#", "رقم الفاتورة", "التاريخ", "التفاصيل", "الدفع", "المبلغ", "الحالة"],
      rows: custInvoices.length
        ? custInvoices.map((iv, i) => [i + 1, "#" + iv.id, arDate(iv.date), iv.details || "—", iv.pay, fmt(iv.total) + " " + cur, iv.status])
        : [["—", "لا توجد فواتير مسجّلة", "", "", "", "", ""]],
      totals: [
        ["إجمالي المشتريات", fmt(c.total) + " " + cur],
        ["الرصيد الآجل المستحق", fmt(c.debt || 0) + " " + cur],
      ],
      note: "هذا التقرير يشمل كامل الفواتير المسجّلة على حسابكم حتى تاريخه.",
    });
    showToast("فُتح تقرير الفواتير — احفظه كـ PDF ثم شاركه عبر واتساب الزبون");
  };

  const PAY_TONE = { "كاش": "g", "بطاقة": "b", "تحويل": "p", "آجل": "a" };
  return (
    <Modal title={`ملف الزبون — ${c.name}`} onClose={onClose} width={620}>
      {/* header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.crm, borderRadius: 10, padding: ".7rem", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700, color: C.grn2 }}>{fmt(c.total)}</div><div style={{ fontSize: 10, color: C.mt }}>إجمالي المشتريات ({cur})</div></div>
        <div style={{ background: C.crm, borderRadius: 10, padding: ".7rem", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700 }}>{c.invoices}</div><div style={{ fontSize: 10, color: C.mt }}>عدد الفواتير</div></div>
        <div style={{ background: (c.debt || 0) > 0 ? C.redbg : "#e1f4e8", borderRadius: 10, padding: ".7rem", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700, color: (c.debt || 0) > 0 ? C.red : "#1a5c2e" }}>{fmt(c.debt || 0)}</div><div style={{ fontSize: 10, color: C.mt }}>الرصيد الآجل ({cur})</div></div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.mt, marginBottom: 12 }}>
        <span style={{ color: "#25D366", fontSize: 15 }}>📱</span> واتساب: {c.phone}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {(c.debt || 0) > 0 && <Btn gold onClick={() => setPayModal(true)}>💵 استلام دفعة + وصل</Btn>}
        <Btn onClick={sendBalanceReport} style={{ borderColor: "#25D366", color: "#128C4B" }}>📄 تقرير الرصيد PDF</Btn>
        <Btn onClick={sendInvoicesReport} style={{ borderColor: "#25D366", color: "#128C4B" }}>📄 تقرير الفواتير PDF</Btn>
      </div>

      {/* invoices list */}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.mt, marginBottom: 8 }}>سجل فواتير الزبون ({custInvoices.length})</div>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        <Table cols={[{ h: "رقم", w: "22%" }, { h: "التاريخ", w: "22%" }, { h: "الدفع", w: "18%" }, { h: "المبلغ", w: "20%" }, { h: "الحالة", w: "18%" }]}
          rows={custInvoices.length ? custInvoices.map(iv => ["#" + iv.id, arDate(iv.date), <Badge tone={PAY_TONE[iv.pay] || "g"}>{iv.pay}</Badge>, fmt(iv.total) + " " + cur, <Badge tone={iv.status === "مدفوعة" ? "g" : iv.status === "ملغاة" ? "r" : "a"}>{iv.status}</Badge>]) : [["—", "لا توجد فواتير", "", "", ""]]} />
      </div>

      {payModal && (
        <Modal title="استلام دفعة من الرصيد الآجل" onClose={() => setPayModal(false)} width={400}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.mt }}>الرصيد الآجل المستحق</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.red }}>{fmt(c.debt || 0)} {cur}</div>
          </div>
          <Field label="المبلغ المستلم"><Inp type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" /></Field>
          <Field label="طريقة الاستلام">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {["كاش", "بطاقة", "تحويل"].map(m => (
                <div key={m} onClick={() => setPayVia(m)} style={{ border: `1px solid ${payVia === m ? C.gold : C.bc}`, borderRadius: 8, padding: ".4rem", textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: payVia === m ? 700 : 500, background: payVia === m ? C.gold + "14" : C.crm }}>{m}</div>
              ))}
            </div>
          </Field>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Btn sm onClick={() => setPayAmount(String(c.debt || 0))}>المبلغ كامل</Btn>
            <Btn sm onClick={() => setPayAmount(String(Math.round((c.debt || 0) / 2)))}>النصف</Btn>
          </div>
          <div style={{ fontSize: 11, color: C.mt, marginBottom: 12 }}>سيتم إصدار وصل استلام قابل للطباعة، وتسوية الفواتير الآجلة تلقائياً حسب المبلغ.</div>
          <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={receivePayment} style={{ flex: 1, justifyContent: "center" }}>✓ تأكيد وإصدار الوصل</Btn><Btn onClick={() => setPayModal(false)}>إلغاء</Btn></div>
        </Modal>
      )}
    </Modal>
  );
}

/* ============================ COUPONS ============================ */
/* ============================ ASSETS (موارد النادي) ============================ */
function Assets({ ctx }) {
  const { assets, setAssets, suppliers, setSuppliers, showToast } = ctx;
  const cur = ctx.settings?.currency || "د.ل";
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [supModal, setSupModal] = useState(false);
  const [actionAsset, setActionAsset] = useState(null); // { asset, type }
  const [detail, setDetail] = useState(null);

  const empty = { name: "", cat: "أجهزة ألعاب", qty: 1, addedAt: todayISO(), supplier: "", cost: "" };
  const [f, setF] = useState(empty);
  const [newSup, setNewSup] = useState({ name: "", phone: "", spec: "" });
  const [act, setAct] = useState({ date: todayISO(), note: "", cost: "" });

  const CATS_A = ["أجهزة ألعاب", "معدات رياضية", "أثاث", "إلكترونيات", "أخرى"];
  const counts = {
    all: assets.length,
    active: assets.filter(a => a.status === "active").length,
    maintenance: assets.filter(a => a.status === "maintenance").length,
    damaged: assets.filter(a => a.status === "damaged").length,
    lost: assets.filter(a => a.status === "lost").length,
  };
  const shown = assets.filter(a => (filter === "all" || a.status === filter) && (a.name.includes(q) || a.cat.includes(q)));
  const totalValue = assets.filter(a => a.status !== "lost" && a.status !== "damaged").reduce((s, a) => s + (a.cost || 0) * (a.qty || 1), 0);

  const addAsset = () => {
    if (!f.name.trim()) { showToast("أدخل اسم المورد"); return; }
    setAssets(a => [...a, { id: "a" + Date.now(), name: f.name.trim(), cat: f.cat, qty: parseInt(f.qty) || 1, addedAt: f.addedAt, supplier: f.supplier, cost: parseFloat(f.cost) || 0, status: "active", history: [] }]);
    showToast("تمت إضافة المورد للنادي"); setModal(false); setF(empty);
  };

  // تنفيذ إجراء على مورد: صيانة / تلف / فقد / إرجاع من صيانة
  const applyAction = () => {
    const { asset, type } = actionAsset;
    setAssets(list => list.map(a => {
      if (a.id !== asset.id) return a;
      const hist = [...(a.history || [])];
      if (type === "maintenance") {
        hist.push({ event: "إرسال للصيانة", date: act.date, note: act.note || "—" });
        return { ...a, status: "maintenance", history: hist, maintStart: act.date };
      }
      if (type === "return") {
        hist.push({ event: "عاد من الصيانة", date: act.date, from: a.maintStart, note: act.note || "تم الإصلاح", cost: parseFloat(act.cost) || 0 });
        return { ...a, status: "active", history: hist, maintStart: null };
      }
      if (type === "damaged") { hist.push({ event: "سُجّل كتالف", date: act.date, note: act.note || "—" }); return { ...a, status: "damaged", history: hist, damagedAt: act.date }; }
      if (type === "lost") { hist.push({ event: "سُجّل كمفقود", date: act.date, note: act.note || "—" }); return { ...a, status: "lost", history: hist, lostAt: act.date }; }
      if (type === "restore") { hist.push({ event: "أُعيد للخدمة", date: act.date, note: act.note || "—" }); return { ...a, status: "active", history: hist }; }
      return a;
    }));
    const labels = { maintenance: "أُرسل للصيانة", return: "عاد من الصيانة", damaged: "سُجّل كتالف", lost: "سُجّل كمفقود", restore: "أُعيد للخدمة" };
    showToast(`${asset.name}: ${labels[type]}`);
    setActionAsset(null); setAct({ date: todayISO(), note: "", cost: "" });
  };

  const actionTitle = (type) => ({ maintenance: "إرسال للصيانة", return: "إرجاع من الصيانة", damaged: "تسجيل كتالف", lost: "تسجيل كمفقود", restore: "إعادة للخدمة" }[type]);

  return (
    <>
      <PageTop title="موارد النادي" action={<Btn gold onClick={() => { setF(empty); setModal(true); }}>+ إضافة مورد</Btn>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="إجمالي الموارد" value={counts.all} sub="عنصر" bar={C.gold} />
        <KCard label="قيمة الموجودات" value={fmt(totalValue)} sub={cur} bar="#1a8c3e" />
        <KCard label="في الصيانة" value={counts.maintenance} sub="حالياً" bar="#2a78d6" />
        <KCard label="تالف / مفقود" value={counts.damaged + counts.lost} sub="عنصر" bar={C.red} />
      </div>

      <Card>
        <CardHead title="سجل الموارد" right={<input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." style={{ ...inputStyle, width: 150 }} />} />
        {/* شرائح الفلترة حسب الحالة */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[["all", "الكل", C.gold], ["active", "موجود ✅", "#1a8c3e"], ["maintenance", "صيانة 🔧", "#2a78d6"], ["damaged", "تالف ⚠️", "#c0392b"], ["lost", "مفقود ❓", "#8a6a20"]].map(([k, l, c]) => (
            <span key={k} onClick={() => setFilter(k)} style={{ cursor: "pointer", fontSize: 11.5, fontWeight: 600, padding: ".35rem .85rem", borderRadius: 20, background: filter === k ? c : C.crm, color: filter === k ? "#fff" : C.k2, border: `0.5px solid ${filter === k ? c : C.bc}` }}>{l} ({counts[k]})</span>
          ))}
        </div>

        <div className="nk-tbl-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["المورد", "الفئة", "العدد", "تاريخ الإضافة", "التكلفة", "الحالة", "إجراءات"].map((h, i) => <th key={i} style={{ background: C.grn, color: C.gld, padding: "8px 10px", textAlign: "right", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>
              {shown.map(a => {
                const st = ASSET_STATUS[a.status];
                return (
                  <tr key={a.id} style={{ borderBottom: `0.5px solid ${C.bc}` }}>
                    <td style={{ padding: "8px 10px", fontSize: 12.5, fontWeight: 600 }}>{a.name}</td>
                    <td style={{ padding: "8px 10px", fontSize: 12, color: C.mt }}>{a.cat}</td>
                    <td style={{ padding: "8px 10px", fontSize: 12 }}>{a.qty}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11.5, color: C.mt }}>{arDate(a.addedAt)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 12 }}>{a.cost ? fmt(a.cost) + " " + cur : "—"}</td>
                    <td style={{ padding: "8px 10px" }}><Badge tone={st.tone}>{st.icon} {st.label}</Badge></td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button onClick={() => setDetail(a)} title="السجل" style={actBtn(C.mt)}>📋</button>
                        {a.status === "active" && <>
                          <button onClick={() => { setActionAsset({ asset: a, type: "maintenance" }); setAct({ date: todayISO(), note: "", cost: "" }); }} title="صيانة" style={actBtn("#2a78d6")}>🔧</button>
                          <button onClick={() => { setActionAsset({ asset: a, type: "damaged" }); setAct({ date: todayISO(), note: "", cost: "" }); }} title="تالف" style={actBtn("#c0392b")}>⚠️</button>
                          <button onClick={() => { setActionAsset({ asset: a, type: "lost" }); setAct({ date: todayISO(), note: "", cost: "" }); }} title="مفقود" style={actBtn("#8a6a20")}>❓</button>
                        </>}
                        {a.status === "maintenance" && <button onClick={() => { setActionAsset({ asset: a, type: "return" }); setAct({ date: todayISO(), note: "", cost: "" }); }} title="إرجاع من الصيانة" style={actBtn("#1a8c3e")}>✅ إرجاع</button>}
                        {(a.status === "damaged" || a.status === "lost") && <button onClick={() => { setActionAsset({ asset: a, type: "restore" }); setAct({ date: todayISO(), note: "", cost: "" }); }} title="إعادة للخدمة" style={actBtn("#1a8c3e")}>↩ إرجاع</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && <div style={{ textAlign: "center", color: C.mt, fontSize: 12.5, padding: "2rem" }}>لا موارد مطابقة</div>}
        </div>
      </Card>

      {/* نافذة الإجراء */}
      {actionAsset && (
        <Modal title={`${actionTitle(actionAsset.type)} — ${actionAsset.asset.name}`} onClose={() => setActionAsset(null)} width={440}>
          <Field label="التاريخ"><Inp type="date" value={act.date} onChange={e => setAct({ ...act, date: e.target.value })} /></Field>
          {actionAsset.type === "return" ? (
            <>
              <Field label="العطل الذي تم إصلاحه"><Inp value={act.note} onChange={e => setAct({ ...act, note: e.target.value })} placeholder="مثال: استبدال زر التحكم" /></Field>
              <Field label={"تكلفة الإصلاح (" + cur + ")"}><Inp type="number" value={act.cost} onChange={e => setAct({ ...act, cost: e.target.value })} placeholder="0" /></Field>
              {actionAsset.asset.maintStart && <div style={{ fontSize: 11.5, color: C.mt, background: C.crm, borderRadius: 8, padding: ".5rem .7rem", marginBottom: 10 }}>مدة الصيانة: من {arDate(actionAsset.asset.maintStart)} إلى {arDate(act.date)} ({daysBetween(actionAsset.asset.maintStart, act.date)} يوم)</div>}
            </>
          ) : (
            <Field label={actionAsset.type === "maintenance" ? "وصف العطل" : "ملاحظة"}><Inp value={act.note} onChange={e => setAct({ ...act, note: e.target.value })} placeholder={actionAsset.type === "maintenance" ? "مثال: لا يستجيب زر X" : "سبب التلف/الفقد"} /></Field>
          )}
          <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={applyAction} style={{ flex: 1, justifyContent: "center" }}>✓ تأكيد</Btn><Btn onClick={() => setActionAsset(null)}>إلغاء</Btn></div>
        </Modal>
      )}

      {/* نافذة سجل المورد */}
      {detail && (
        <Modal title={`سجل — ${detail.name}`} onClose={() => setDetail(null)} width={520}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", background: C.crm, borderRadius: 10, padding: ".7rem 1rem", marginBottom: 12, fontSize: 12 }}>
            <span>الفئة: <b>{detail.cat}</b></span><span>العدد: <b>{detail.qty}</b></span>
            <span>أُضيف: <b>{arDate(detail.addedAt)}</b></span>
            {detail.supplier && <span>المورّد: <b>{detail.supplier}</b></span>}
            <span>الحالة: <Badge tone={ASSET_STATUS[detail.status].tone}>{ASSET_STATUS[detail.status].icon} {ASSET_STATUS[detail.status].label}</Badge></span>
          </div>
          {(!detail.history || detail.history.length === 0) ? <div style={{ textAlign: "center", color: C.mt, fontSize: 12.5, padding: "1.5rem" }}>لا أحداث مسجّلة — المورد بحالته الأصلية.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {detail.history.map((h, i) => (
                <div key={i} style={{ borderRight: `3px solid ${C.gold}`, background: C.crm, borderRadius: 8, padding: ".55rem .8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700 }}><span>{h.event}</span><span style={{ color: C.mt, fontWeight: 500 }}>{arDate(h.date)}</span></div>
                  {h.note && h.note !== "—" && <div style={{ fontSize: 11.5, color: C.k2, marginTop: 3 }}>📝 {h.note}</div>}
                  {h.from && <div style={{ fontSize: 11, color: C.mt, marginTop: 2 }}>مدة الصيانة: {daysBetween(h.from, h.date)} يوم</div>}
                  {h.cost > 0 && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 2 }}>تكلفة الإصلاح: {fmt(h.cost)} {cur}</div>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* نافذة إضافة مورد */}
      {modal && (
        <Modal title="إضافة مورد جديد للنادي" onClose={() => setModal(false)} width={480}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="اسم المورد *" full><Inp value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="مثال: يد تحكم PS5" /></Field>
            <Field label="الفئة"><Sel value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })}>{CATS_A.map(c => <option key={c}>{c}</option>)}</Sel></Field>
            <Field label="العدد"><Inp type="number" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} min="1" /></Field>
            <Field label="تاريخ الإضافة"><Inp type="date" value={f.addedAt} onChange={e => setF({ ...f, addedAt: e.target.value })} /></Field>
            <Field label={"التكلفة للوحدة (" + cur + ")"}><Inp type="number" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} placeholder="0" /></Field>
            <Field label="المورّد (اختياري)" full>
              <div style={{ display: "flex", gap: 6 }}>
                <Sel value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} style={{ flex: 1 }}><option value="">— بدون —</option>{suppliers.map(s => <option key={s.id}>{s.name}</option>)}</Sel>
                <Btn sm gold onClick={() => { setNewSup({ name: "", phone: "", spec: "" }); setSupModal(true); }} style={{ whiteSpace: "nowrap" }}>+ مورّد</Btn>
              </div>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Btn gold onClick={addAsset} style={{ flex: 1, justifyContent: "center" }}>✓ إضافة</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
        </Modal>
      )}

      {/* نافذة إضافة مورّد سريع */}
      {supModal && (
        <Modal title="إضافة مورّد جديد" onClose={() => setSupModal(false)} width={420}>
          <Field label="اسم المورّد *"><Inp value={newSup.name} onChange={e => setNewSup({ ...newSup, name: e.target.value })} /></Field>
          <Field label="الهاتف / الواتساب"><Inp value={newSup.phone} onChange={e => setNewSup({ ...newSup, phone: e.target.value })} placeholder="0913-000-000" /></Field>
          <Field label="التخصص"><Inp value={newSup.spec} onChange={e => setNewSup({ ...newSup, spec: e.target.value })} placeholder="أجهزة ألعاب" /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn gold style={{ flex: 1, justifyContent: "center" }} onClick={() => {
              if (!newSup.name.trim()) { showToast("أدخل اسم المورّد"); return; }
              let d = (newSup.phone || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "218" + d.slice(1);
              const s = { id: Math.max(0, ...suppliers.map(x => x.id)) + 1, name: newSup.name.trim(), phone: newSup.phone, wa: d, spec: newSup.spec || "عام", total: 0, due: 0, status: "نشط" };
              setSuppliers(list => [...list, s]); setF(ff => ({ ...ff, supplier: s.name }));
              showToast("تمت إضافة المورّد واختياره"); setSupModal(false);
            }}>✓ حفظ واختيار</Btn>
            <Btn onClick={() => setSupModal(false)}>إلغاء</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
const actBtn = (color) => ({ background: color + "18", border: "none", borderRadius: 6, color, fontSize: 12, fontWeight: 700, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit" });

function Coupons({ ctx }) {
  const { coupons, setCoupons, showToast } = ctx;
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({ code: "", desc: "", pct: "", limit: "", exp: "" });
  const save = () => {
    if (!f.code.trim() || !f.pct) { showToast("أدخل الكود ونسبة الخصم"); return; }
    setCoupons(c => [...c, { id: c.length + 1, code: f.code.toUpperCase(), desc: f.desc, pct: parseInt(f.pct), used: 0, limit: parseInt(f.limit) || 100, exp: f.exp, status: "نشط" }]);
    showToast("تم إنشاء الكوبون"); setModal(false); setF({ code: "", desc: "", pct: "", limit: "", exp: "" });
  };
  return (
    <>
      <PageTop title="كوبونات الخصم" action={<Btn gold onClick={() => setModal(true)}>+ إنشاء كوبون</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 11 }}>
        {coupons.map(c => (
          <div key={c.id} style={{ background: C.crm, border: `1.5px dashed ${C.gold}`, borderRadius: 12, padding: ".9rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div><div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: 2, color: C.grn2 }}>{c.code}</div><div style={{ fontSize: 11, color: C.mt, marginTop: 3 }}>{c.desc}</div><div style={{ fontSize: 10, color: C.k2, marginTop: 4 }}>استُخدم {c.used} / {c.limit} مرة</div></div>
            <div style={{ textAlign: "left" }}><Badge tone={c.status === "نشط" ? "g" : "r"}>{c.status}</Badge><div style={{ fontSize: 10, color: C.mt, marginTop: 5 }}>ينتهي {arDate(c.exp)}</div></div>
          </div>
        ))}
      </div>
      {modal && <Modal title="إنشاء كوبون جديد" onClose={() => setModal(false)} width={440}>
        <Field label="كود الكوبون"><Inp value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="GAME25" /></Field>
        <Field label="الوصف"><Inp value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} placeholder="خصم على الألعاب" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="نسبة الخصم %"><Inp type="number" value={f.pct} onChange={e => setF({ ...f, pct: e.target.value })} /></Field>
          <Field label="حد الاستخدام"><Inp type="number" value={f.limit} onChange={e => setF({ ...f, limit: e.target.value })} /></Field>
        </div>
        <Field label="تاريخ الانتهاء"><Inp type="date" value={f.exp} onChange={e => setF({ ...f, exp: e.target.value })} /></Field>
        <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ حفظ</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
      </Modal>}
    </>
  );
}

/* ============================ EXPENSES ============================ */
/* ============================ TREASURY (الخزينة والإغلاق اليومي) ============================ */
function Treasury({ ctx }) {
  const { invoices, purchases, expenses, closings, setClosings, users, user, showToast } = ctx;
  const cur = ctx.settings?.currency || "د.ل";
  const [period, setPeriod] = useState("today"); // today | 7 | 30
  const [actual, setActual] = useState({ cash: "", card: "", transfer: "" });
  const [assignTo, setAssignTo] = useState("");
  const [note, setNote] = useState("");

  const payDay = (i) => i.paidAt || i.date;
  const payMethod = (i) => i.paidVia || i.pay;
  const normPay = (p) => p === "نقداً" ? "كاش" : p;
  const today = todayISO();

  // مجاميع فترة (إيراد مقبوض فقط) حسب الطريقة
  const sumsFor = (days) => {
    const from = new Date(); from.setDate(from.getDate() - (days - 1));
    const fromISO = from.toISOString().split("T")[0];
    const inRange = (d) => days === 1 ? d === today : (d >= fromISO && d <= today);
    const out = { cash: 0, card: 0, transfer: 0, total: 0 };
    invoices.filter(i => i.status === "مدفوعة" && inRange(payDay(i))).forEach(i => {
      const m = payMethod(i);
      if (m === "كاش") out.cash += i.total; else if (m === "بطاقة") out.card += i.total; else if (m === "تحويل") out.transfer += i.total;
      out.total += i.total;
    });
    return out;
  };
  const periodDays = period === "today" ? 1 : period === "7" ? 7 : 30;
  const sums = sumsFor(periodDays);

  // متوقع اليوم بالتفصيل: إيراد − مصاريف مدفوعة − مشتريات كاش (خرجت من الدرج)
  const expected = useMemo(() => {
    const rev = { cash: 0, card: 0, transfer: 0 };
    invoices.filter(i => i.status === "مدفوعة" && payDay(i) === today).forEach(i => {
      const m = payMethod(i);
      if (m === "كاش") rev.cash += i.total; else if (m === "بطاقة") rev.card += i.total; else if (m === "تحويل") rev.transfer += i.total;
    });
    const expOut = { cash: 0, card: 0, transfer: 0 };
    expenses.filter(e => e.date === today).forEach(e => {
      const m = normPay(e.pay);
      if (m === "كاش") expOut.cash += e.amount; else if (m === "بطاقة") expOut.card += e.amount; else if (m === "تحويل") expOut.transfer += e.amount;
    });
    const purchOut = { cash: 0, card: 0, transfer: 0 };
    purchases.filter(p => p.date === today && p.pay === "كاش").forEach(p => { purchOut.cash += p.total; });
    const net = {
      cash: rev.cash - expOut.cash - purchOut.cash,
      card: rev.card - expOut.card,
      transfer: rev.transfer - expOut.transfer,
    };
    return { rev, expOut, purchOut, net, netTotal: net.cash + net.card + net.transfer };
  }, [invoices, expenses, purchases]);

  const todayClosing = closings.find(c => c.date === today);
  const actualNum = { cash: parseFloat(actual.cash) || 0, card: parseFloat(actual.card) || 0, transfer: parseFloat(actual.transfer) || 0 };
  const actualTotal = actualNum.cash + actualNum.card + actualNum.transfer;
  const diff = Math.round((actualTotal - expected.netTotal) * 100) / 100;

  const saveClosing = () => {
    if (actual.cash === "" && actual.card === "" && actual.transfer === "") { showToast("أدخل المبالغ الفعلية المعدودة"); return; }
    if (diff < 0 && !assignTo) { showToast("يوجد عجز — اختر المستخدم المسؤول لتسجيله عليه"); return; }
    const status = diff === 0 ? "match" : diff < 0 ? "shortage" : "surplus";
    setClosings(cs => [{
      id: "CL-" + Date.now(), date: today,
      expected: { ...expected.net, total: expected.netTotal },
      actual: { ...actualNum, total: actualTotal },
      diff, status,
      assignedTo: diff < 0 ? assignTo : null,
      note: note.trim() || null,
      closedBy: user.name, closedAt: new Date().toISOString(),
    }, ...cs]);
    showToast(diff === 0 ? "تم الإغلاق — مطابقة تامة ✓" : diff < 0 ? `تم تسجيل عجز ${fmt(Math.abs(diff))} ${cur} على ${assignTo}` : `تم حفظ زيادة ${fmt(diff)} ${cur} في النظام`);
    setActual({ cash: "", card: "", transfer: "" }); setAssignTo(""); setNote("");
  };

  const deleteClosing = (id) => { if (window.confirm("حذف هذا الإغلاق لإعادة العد؟")) { setClosings(cs => cs.filter(c => c.id !== id)); showToast("حُذف الإغلاق"); } };

  // ملخص العجوزات حسب المستخدم
  const shortByUser = {};
  closings.filter(c => c.status === "shortage" && c.assignedTo).forEach(c => { shortByUser[c.assignedTo] = (shortByUser[c.assignedTo] || 0) + Math.abs(c.diff); });
  const surplusTotal = closings.filter(c => c.status === "surplus").reduce((s, c) => s + c.diff, 0);

  const ST = { match: { l: "مطابقة ✓", t: "g" }, shortage: { l: "عجز", t: "r" }, surplus: { l: "زيادة", t: "b" } };
  const mLabel = { cash: "💵 كاش", card: "💳 بطاقة", transfer: "🏦 تحويل" };
  const rowStyle = { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" };

  return (
    <>
      <PageTop title="الخزينة والإغلاق اليومي" action={<Badge tone="gold">{arDate(today)}</Badge>} />

      {/* ملخص الفترة */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {[["today", "اليوم"], ["7", "آخر 7 أيام"], ["30", "آخر 30 يوم"]].map(([k, l]) => (
          <span key={k} onClick={() => setPeriod(k)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, padding: ".4rem 1rem", borderRadius: 20, background: period === k ? C.grn : C.crm, color: period === k ? C.gld : C.k2, border: `0.5px solid ${period === k ? C.grn : C.bc}` }}>{l}</span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="💵 نقدي (كاش)" value={fmt(sums.cash)} sub={cur} bar="#1a8c3e" />
        <KCard label="💳 بطاقة" value={fmt(sums.card)} sub={cur} bar="#2a78d6" />
        <KCard label="🏦 تحويل مصرفي" value={fmt(sums.transfer)} sub={cur} bar={C.purp} />
        <KCard label="الإجمالي المقبوض" value={fmt(sums.total)} sub={cur} bar={C.gold} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: ctx.scr?.isTab ? "1fr" : "1.2fr 1fr", gap: 12, marginBottom: "1.1rem" }}>
        {/* الإغلاق اليومي */}
        <Card className="nk-card-hover">
          <CardHead title="🔒 الإغلاق اليومي" sub={todayClosing ? "تم إغلاق اليوم" : "عُدّ ما في الدرج وطابقه مع النظام"} />
          {todayClosing ? (
            <div>
              <div style={{ background: todayClosing.status === "match" ? "#e8f8ee" : todayClosing.status === "shortage" ? "#fdeaea" : C.bluebg, borderRadius: 12, padding: "1rem", textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 30 }}>{todayClosing.status === "match" ? "✅" : todayClosing.status === "shortage" ? "⚠️" : "➕"}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{ST[todayClosing.status].l}{todayClosing.diff !== 0 && ` — ${fmt(Math.abs(todayClosing.diff))} ${cur}`}</div>
                {todayClosing.assignedTo && <div style={{ fontSize: 12, color: "#922", marginTop: 4 }}>سُجّل العجز على: <b>{todayClosing.assignedTo}</b></div>}
                <div style={{ fontSize: 11, color: C.mt, marginTop: 4 }}>أُغلق بواسطة {todayClosing.closedBy} · متوقع {fmt(todayClosing.expected.total)} / فعلي {fmt(todayClosing.actual.total)} {cur}</div>
              </div>
              <Btn sm danger onClick={() => deleteClosing(todayClosing.id)}>↩ إلغاء الإغلاق وإعادة العد</Btn>
            </div>
          ) : (
            <>
              {/* المتوقع من النظام */}
              <div style={{ background: C.crm, borderRadius: 10, padding: ".7rem .9rem", marginBottom: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: C.grn2 }}>المتوقع في الدرج حسب النظام (اليوم):</div>
                {["cash", "card", "transfer"].map(m => (
                  <div key={m} style={rowStyle}>
                    <span>{mLabel[m]}</span>
                    <span style={{ fontWeight: 700 }}>{fmt(expected.net[m])} {cur} <span style={{ color: C.mt, fontWeight: 400, fontSize: 10.5 }}>(إيراد {fmt(expected.rev[m])}{(expected.expOut[m] || (m === "cash" && expected.purchOut.cash)) ? ` − مدفوعات ${fmt(expected.expOut[m] + (m === "cash" ? expected.purchOut.cash : 0))}` : ""})</span></span>
                  </div>
                ))}
                <div style={{ ...rowStyle, borderTop: `0.5px solid ${C.bc}`, marginTop: 5, paddingTop: 7, fontWeight: 800, fontSize: 13 }}><span>الإجمالي المتوقع</span><span style={{ color: C.grn2 }}>{fmt(expected.netTotal)} {cur}</span></div>
              </div>

              {/* العد الفعلي */}
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>المعدود فعلياً:</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                <Field label="💵 نقود الدرج"><Inp type="number" value={actual.cash} onChange={e => setActual({ ...actual, cash: e.target.value })} placeholder="0" /></Field>
                <Field label="💳 إيصالات بطاقة"><Inp type="number" value={actual.card} onChange={e => setActual({ ...actual, card: e.target.value })} placeholder="0" /></Field>
                <Field label="🏦 تحويلات"><Inp type="number" value={actual.transfer} onChange={e => setActual({ ...actual, transfer: e.target.value })} placeholder="0" /></Field>
              </div>

              {/* الفرق الحي */}
              <div style={{ background: diff === 0 ? "#e8f8ee" : diff < 0 ? "#fdeaea" : C.bluebg, border: `1px solid ${diff === 0 ? "rgba(26,140,62,.3)" : diff < 0 ? "rgba(192,57,43,.3)" : "rgba(42,120,214,.3)"}`, borderRadius: 10, padding: ".65rem .9rem", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{diff === 0 ? "✅ مطابقة تامة" : diff < 0 ? "⚠️ عجز في الخزينة" : "➕ زيادة في الخزينة"}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: diff === 0 ? "#1a8c3e" : diff < 0 ? "#c0392b" : "#2a78d6" }}>{diff > 0 ? "+" : ""}{fmt(diff)} {cur}</span>
              </div>

              {diff < 0 && (
                <Field label="تسجيل العجز على المستخدم *">
                  <Sel value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                    <option value="">اختر المستخدم المسؤول...</option>
                    {users.filter(u => u.active).map(u => <option key={u.id} value={u.name}>{u.name} — {u.role}</option>)}
                  </Sel>
                </Field>
              )}
              <Field label="ملاحظة (اختياري)"><Inp value={note} onChange={e => setNote(e.target.value)} placeholder={diff > 0 ? "مصدر الزيادة إن عُرف" : "أي ملاحظات على الإغلاق"} /></Field>
              <Btn gold onClick={saveClosing} style={{ width: "100%", justifyContent: "center" }}>🔒 تأكيد الإغلاق اليومي</Btn>
            </>
          )}
        </Card>

        {/* ملخصات جانبية */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card className="nk-card-hover">
            <CardHead title="⚠️ عجوزات المستخدمين" sub="التراكمي المسجّل" />
            {Object.keys(shortByUser).length === 0 ? <div style={{ textAlign: "center", color: C.mt, fontSize: 12, padding: "1rem" }}>لا عجوزات مسجّلة ✓</div> :
              Object.entries(shortByUser).sort((a, b) => b[1] - a[1]).map(([n, v]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: ".45rem .2rem", borderBottom: `0.5px solid ${C.bc}` }}><span>👤 {n}</span><span style={{ fontWeight: 700, color: "#c0392b" }}>{fmt(v)} {cur}</span></div>
              ))}
          </Card>
          <Card className="nk-card-hover">
            <CardHead title="➕ الزيادات المحفوظة" sub="مجموع فوائض الإغلاقات" />
            <div style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: "#2a78d6", padding: ".4rem 0" }}>{fmt(surplusTotal)} <span style={{ fontSize: 12 }}>{cur}</span></div>
          </Card>
        </div>
      </div>

      {/* سجل الإغلاقات */}
      <Card>
        <CardHead title="سجل الإغلاقات اليومية" sub={`${closings.length} إغلاق`} />
        {closings.length === 0 ? <div style={{ textAlign: "center", color: C.mt, fontSize: 12.5, padding: "1.5rem" }}>لا إغلاقات بعد — أول إغلاق يظهر هنا.</div> : (
          <Table cols={[{ h: "التاريخ", w: "13%" }, { h: "المتوقع", w: "14%" }, { h: "الفعلي", w: "14%" }, { h: "الفرق", w: "13%" }, { h: "الحالة", w: "12%" }, { h: "على المستخدم", w: "14%" }, { h: "أغلقه", w: "12%" }, { h: "", w: "8%" }]}
            rows={closings.map(c => [arDate(c.date), fmt(c.expected.total) + " " + cur, fmt(c.actual.total) + " " + cur,
              <span style={{ fontWeight: 700, color: c.diff === 0 ? "#1a8c3e" : c.diff < 0 ? "#c0392b" : "#2a78d6" }}>{c.diff > 0 ? "+" : ""}{fmt(c.diff)}</span>,
              <Badge tone={ST[c.status].t}>{ST[c.status].l}</Badge>, c.assignedTo || "—", c.closedBy,
              <button onClick={() => deleteClosing(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.mt, fontSize: 13 }}>🗑</button>])} />
        )}
      </Card>
    </>
  );
}

function Expenses({ ctx }) {
  const { expenses, setExpenses, employees, user, showToast } = ctx;
  const cur = ctx.settings?.currency || "د.ل";
  const [modal, setModal] = useState(false);
  const [empFilter, setEmpFilter] = useState("all");
  const [f, setF] = useState({ date: todayISO(), cat: "أجار", desc: "", amount: "", pay: "نقداً", empId: "" });
  const save = () => {
    if (!f.desc.trim() || !f.amount) { showToast("أدخل الوصف والمبلغ"); return; }
    const isEmp = f.cat === "سلفة موظف" && f.empId;
    const emp = isEmp ? employees.find(e => e.id == f.empId) : null;
    setExpenses(e => [{ id: Math.max(0, ...e.map(x => x.id)) + 1, date: f.date, cat: f.cat, desc: f.desc, amount: parseFloat(f.amount), pay: f.pay, by: user.name.split(" ")[0], empId: isEmp ? parseInt(f.empId) : null, empName: emp ? emp.name : null }, ...e]);
    showToast(isEmp ? `تم تسجيل سلفة ${fmt(parseFloat(f.amount))} ${cur} على ${emp.name}` : "تمت إضافة المصروف");
    setModal(false); setF({ date: todayISO(), cat: "أجار", desc: "", amount: "", pay: "نقداً", empId: "" });
  };
  const byCat = (c) => expenses.filter(e => e.cat === c).reduce((s, e) => s + e.amount, 0);
  const CAT_TONE = { "أجار": "b", "مرتبات": "gold", "كهرباء": "r", "صيانة": "g", "سلفة موظف": "p", "أخرى": "a" };
  const shown = empFilter === "all" ? expenses : empFilter === "none" ? expenses.filter(e => !e.empId) : expenses.filter(e => e.empId == empFilter);

  return (
    <>
      <PageTop title="نظام المصاريف" action={<Btn gold onClick={() => setModal(true)}>+ إضافة مصروف</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="أجار الموقع" value={fmt(byCat("أجار"))} sub="شهري" bar="#2a78d6" />
        <KCard label="سلف الموظفين" value={fmt(byCat("سلفة موظف"))} sub={cur} bar={C.purp} />
        <KCard label="الصيانة" value={fmt(byCat("صيانة"))} bar={C.red} />
        <KCard label="إجمالي المصاريف" value={fmt(expenses.reduce((s, e) => s + e.amount, 0))} sub={cur} bar={C.gold} />
      </div>
      <Card>
        <CardHead title="سجل المصاريف" right={
          <Sel value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={{ width: 175 }}>
            <option value="all">كل المصاريف</option>
            <option value="none">مصاريف عامة فقط</option>
            <option disabled>── سلف موظف معيّن ──</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Sel>
        } />
        <Table cols={[{ h: "التاريخ", w: "14%" }, { h: "الفئة", w: "15%" }, { h: "الوصف", w: "26%" }, { h: "الموظف", w: "15%" }, { h: "المبلغ", w: "14%" }, { h: "الدفع", w: "8%" }, { h: "بواسطة", w: "8%" }]}
          rows={shown.map(e => [arDate(e.date), <Badge tone={CAT_TONE[e.cat] || "g"}>{e.cat}</Badge>, e.desc, e.empName || "—", fmt(e.amount) + " " + cur, e.pay, e.by])} />
        {shown.length === 0 && <div style={{ textAlign: "center", color: C.mt, fontSize: 12, padding: "1.5rem" }}>لا مصاريف مطابقة</div>}
      </Card>
      {modal && <Modal title="إضافة مصروف" onClose={() => setModal(false)} width={470}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="التاريخ"><Inp type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="الفئة"><Sel value={f.cat} onChange={e => setF({ ...f, cat: e.target.value, empId: "" })}>{["أجار", "مرتبات", "كهرباء", "صيانة", "سلفة موظف", "أخرى"].map(c => <option key={c}>{c}</option>)}</Sel></Field>
          {f.cat === "سلفة موظف" && (
            <Field label="الموظف (تُخصم من مرتبه)" full>
              <Sel value={f.empId} onChange={e => setF({ ...f, empId: e.target.value })}>
                <option value="">اختر الموظف...</option>
                {employees.filter(e => e.status === "نشط").map(e => <option key={e.id} value={e.id}>{e.name} — راتب {fmt(e.salary)} {cur}</option>)}
              </Sel>
            </Field>
          )}
          <Field label="الوصف" full><Inp value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} placeholder={f.cat === "سلفة موظف" ? "سلفة على الراتب" : "وصف المصروف"} /></Field>
          <Field label={"المبلغ (" + cur + ")"}><Inp type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="طريقة الدفع"><Sel value={f.pay} onChange={e => setF({ ...f, pay: e.target.value })}>{["نقداً", "تحويل", "بطاقة"].map(p => <option key={p}>{p}</option>)}</Sel></Field>
        </div>
        {f.cat === "سلفة موظف" && f.empId && (() => {
          const emp = employees.find(e => e.id == f.empId);
          const taken = expenses.filter(e => e.empId == f.empId && e.cat === "سلفة موظف").reduce((s, e) => s + e.amount, 0);
          const remain = emp.salary - taken - (parseFloat(f.amount) || 0);
          return <div style={{ background: remain < 0 ? "#fdeaea" : "rgba(26,140,62,.07)", border: `0.5px solid ${remain < 0 ? "rgba(192,57,43,.3)" : "rgba(26,140,62,.2)"}`, borderRadius: 9, padding: ".6rem .85rem", marginBottom: 12, fontSize: 12, lineHeight: 1.9 }}>
            الراتب: <b>{fmt(emp.salary)} {cur}</b> · سلف سابقة: <b>{fmt(taken)} {cur}</b><br />
            المتبقي بعد هذه السلفة: <b style={{ color: remain < 0 ? C.red : C.grn2 }}>{fmt(remain)} {cur}</b>{remain < 0 && " ⚠ تجاوز الراتب!"}
          </div>;
        })()}
        <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ حفظ</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
      </Modal>}
    </>
  );
}

/* ============================ SALARIES ============================ */
function Salaries({ ctx }) {
  const { employees, setEmployees, expenses, setExpenses, showToast } = ctx;
  const cur = ctx.settings?.currency || "د.ل";
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null); // employee id being viewed
  const [f, setF] = useState({ name: "", role: "", salary: "", salaryStart: todayISO() });

  const save = () => {
    if (!f.name.trim() || !f.salary) { showToast("أدخل الاسم والراتب"); return; }
    setEmployees(e => [...e, { id: Math.max(0, ...e.map(x => x.id)) + 1, name: f.name, role: f.role || "موظف", hired: f.salaryStart, salaryStart: f.salaryStart, salary: parseFloat(f.salary), status: "نشط" }]);
    showToast("تمت إضافة الموظف"); setModal(false); setF({ name: "", role: "", salary: "", salaryStart: todayISO() });
  };

  // سلف الموظف من المصاريف
  const advancesOf = (id) => expenses.filter(e => e.empId == id && e.cat === "سلفة موظف");
  const takenOf = (id) => advancesOf(id).reduce((s, e) => s + e.amount, 0);
  const remainOf = (emp) => emp.salary - takenOf(emp.id);

  // تصفية راتب الموظف (نهاية الشهر): صرف المتبقي كمصروف وتصفير السلف
  const settle = (emp) => {
    const remain = remainOf(emp);
    if (!window.confirm(`تصفية راتب ${emp.name}؟\nالراتب: ${fmt(emp.salary)} ${cur}\nالسلف المسحوبة: ${fmt(takenOf(emp.id))} ${cur}\nالمتبقي للصرف: ${fmt(remain)} ${cur}\n\nسيُسجّل المتبقي كمصروف مرتب وتبدأ دورة جديدة.`)) return;
    // سجّل صرف باقي الراتب كمصروف
    if (remain > 0) {
      setExpenses(ex => [{ id: Math.max(0, ...ex.map(x => x.id)) + 1, date: todayISO(), cat: "مرتبات", desc: `صرف باقي راتب ${emp.name}`, amount: remain, pay: "نقداً", by: "المدير", empId: null, empName: null }, ...ex]);
    }
    // احذف سلف هذا الموظف (تصفير الدورة) وحدّث تاريخ بداية الراتب
    setExpenses(ex => ex.filter(e => !(e.empId == emp.id && e.cat === "سلفة موظف")));
    setEmployees(es => es.map(e => e.id === emp.id ? { ...e, salaryStart: todayISO() } : e));
    showToast(`تمت تصفية راتب ${emp.name} وبدء دورة جديدة`);
    setDetail(null);
  };

  const totalSalaries = employees.reduce((s, e) => s + e.salary, 0);
  const totalRemain = employees.reduce((s, e) => s + remainOf(e), 0);

  return (
    <>
      <PageTop title="مرتبات العمال" action={<Btn gold onClick={() => setModal(true)}>+ إضافة موظف</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="عدد الموظفين" value={employees.length} sub="نشط" bar="#2a78d6" />
        <KCard label="إجمالي الرواتب" value={fmt(totalSalaries)} sub={cur + " شهرياً"} bar={C.gold} />
        <KCard label="المتبقي للصرف" value={fmt(totalRemain)} sub="بعد السلف" bar="#1a8c3e" />
      </div>

      {/* بطاقات الموظفين */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 12 }}>
        {employees.length === 0 && <Card><div style={{ textAlign: "center", color: C.mt, padding: "1.5rem" }}>لا موظفون بعد — أضف أول موظف.</div></Card>}
        {employees.map(emp => {
          const taken = takenOf(emp.id);
          const remain = remainOf(emp);
          const pct = emp.salary ? Math.max(0, Math.min(100, Math.round(remain / emp.salary * 100))) : 0;
          return (
            <Card key={emp.id} className="nk-card-hover">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.grl, color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{emp.name.slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{emp.name}</div>
                  <div style={{ fontSize: 11, color: C.mt }}>{emp.role} · منذ {arDate(emp.salaryStart)}</div>
                </div>
              </div>

              {/* شريط الراتب المتبقي */}
              <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: C.mt }}>المتبقي من الراتب</span>
                <span style={{ fontWeight: 700, color: remain < 0 ? C.red : C.grn2 }}>{fmt(remain)} / {fmt(emp.salary)} {cur}</span>
              </div>
              <div style={{ height: 9, borderRadius: 5, background: "#eee", overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: pct + "%", height: "100%", background: pct < 25 ? "#e34948" : pct < 60 ? C.gold : "#1a8c3e", transition: "width .3s" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}><span style={{ color: C.mt }}>الراتب الأساسي</span><span style={{ fontWeight: 600 }}>{fmt(emp.salary)} {cur}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}><span style={{ color: C.mt }}>السلف المسحوبة</span><span style={{ fontWeight: 600, color: C.purp }}>− {fmt(taken)} {cur}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 6, borderTop: `0.5px solid ${C.bc}`, marginTop: 4 }}><span style={{ fontWeight: 700 }}>الصافي المتبقي</span><span style={{ fontWeight: 800, color: remain < 0 ? C.red : C.grn2 }}>{fmt(remain)} {cur}</span></div>

              <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
                <Btn sm onClick={() => setDetail(emp.id)} style={{ flex: 1, justifyContent: "center" }}>📋 السلف ({advancesOf(emp.id).length})</Btn>
                <Btn sm gold onClick={() => settle(emp)} style={{ flex: 1, justifyContent: "center" }}>💰 تصفية</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* نافذة تفاصيل السلف */}
      {detail && (() => {
        const emp = employees.find(e => e.id === detail);
        const advs = advancesOf(detail);
        return (
          <Modal title={`سلف ${emp.name}`} onClose={() => setDetail(null)} width={520}>
            <div style={{ background: C.crm, borderRadius: 10, padding: ".8rem 1rem", marginBottom: 12, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
              <div><div style={{ fontSize: 16, fontWeight: 800, color: C.grn2 }}>{fmt(emp.salary)}</div><div style={{ fontSize: 10.5, color: C.mt }}>الراتب</div></div>
              <div><div style={{ fontSize: 16, fontWeight: 800, color: C.purp }}>{fmt(takenOf(detail))}</div><div style={{ fontSize: 10.5, color: C.mt }}>السلف</div></div>
              <div><div style={{ fontSize: 16, fontWeight: 800, color: remainOf(emp) < 0 ? C.red : "#1a8c3e" }}>{fmt(remainOf(emp))}</div><div style={{ fontSize: 10.5, color: C.mt }}>المتبقي</div></div>
            </div>
            {advs.length === 0 ? <div style={{ textAlign: "center", color: C.mt, fontSize: 12.5, padding: "1.5rem" }}>لا سلف مسجّلة — يمكن تسجيل سلفة من قسم المصاريف (فئة «سلفة موظف»).</div> : (
              <Table cols={[{ h: "التاريخ", w: "25%" }, { h: "الوصف", w: "45%" }, { h: "المبلغ", w: "30%" }]}
                rows={advs.map(a => [arDate(a.date), a.desc, fmt(a.amount) + " " + cur])} />
            )}
            <div style={{ marginTop: 12, fontSize: 11, color: C.mt, background: "rgba(201,168,76,.08)", borderRadius: 8, padding: ".6rem .8rem", lineHeight: 1.7 }}>💡 لتسجيل سلفة جديدة: اذهب لقسم المصاريف → إضافة مصروف → اختر الفئة «سلفة موظف» ثم الموظف. تُخصم تلقائياً من رصيد راتبه هنا.</div>
          </Modal>
        );
      })()}

      {modal && <Modal title="إضافة موظف" onClose={() => setModal(false)} width={460}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="الاسم" full><Inp value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="محمد علي" /></Field>
          <Field label="المنصب"><Inp value={f.role} onChange={e => setF({ ...f, role: e.target.value })} placeholder="كاشير" /></Field>
          <Field label={"الراتب الشهري (" + cur + ")"}><Inp type="number" value={f.salary} onChange={e => setF({ ...f, salary: e.target.value })} /></Field>
          <Field label="تاريخ بداية العمل/الراتب" full><Inp type="date" value={f.salaryStart} onChange={e => setF({ ...f, salaryStart: e.target.value })} /></Field>
        </div>
        <div style={{ fontSize: 11, color: C.mt, marginBottom: 10, lineHeight: 1.7 }}>يبدأ احتساب الراتب من التاريخ المحدد. عند نهاية الشهر استخدم زر «تصفية» لصرف المتبقي وبدء دورة جديدة.</div>
        <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ حفظ</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
      </Modal>}
    </>
  );
}

/* ============================ REPORTS ============================ */
function Reports({ ctx }) {
  const { invoices, purchases, expenses, products, totals, assets } = ctx;
  const [type, setType] = useState("sales");
  const [cat, setCat] = useState("");
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState(todayISO());
  const printRef = useRef(null);

  const cfg = useMemo(() => {
    const cur = ctx.settings?.currency || "د.ل";
    if (type === "sales") {
      const rows = invoices.filter(i => !cat || (cat === "games" ? i.details.includes("PS") || i.details.includes("Xbox") : true));
      const paid = invoices.filter(i => i.status === "مدفوعة");
      const avg = paid.length ? Math.round(paid.reduce((s, i) => s + i.total, 0) / paid.length) : 0;
      return { title: "تقرير المبيعات", summary: [["إجمالي المبيعات", fmt(totals.revenue) + " " + cur], ["عدد الفواتير", invoices.length], ["متوسط الفاتورة", fmt(avg) + " " + cur]],
        thead: ["رقم", "الزبون", "المصدر", "التفاصيل", "الدفع", "الإجمالي"], tbody: rows.map(i => ["#" + i.id, i.customer, i.source, i.details, i.pay, fmt(i.total) + " " + cur]) };
    }
    if (type === "purchases") return { title: "تقرير المشتريات", summary: [["إجمالي المشتريات", fmt(purchases.reduce((s, p) => s + p.total, 0)) + " " + cur], ["عدد الطلبات", purchases.length], ["الموردون", ctx.suppliers.length]], thead: ["رقم", "المورد", "المنتجات", "الدفع", "الإجمالي"], tbody: purchases.map(p => ["#" + p.id, p.supplier, p.items, p.pay, fmt(p.total) + " " + cur]) };
    if (type === "profit") return { title: "تقرير الأرباح والخسائر", summary: [["الإيرادات", fmt(totals.revenue) + " " + cur], ["المصاريف", fmt(totals.expTotal) + " " + cur], ["صافي الربح", fmt(totals.profit) + " " + cur]], thead: ["البند", "القيمة"], tbody: [["إجمالي الإيرادات", fmt(totals.revenue) + " " + cur], ["تكلفة البضاعة المباعة", fmt(totals.cogs || 0) + " " + cur], ["إجمالي المصاريف", fmt(totals.expTotal) + " " + cur], ["صافي الربح", fmt(totals.profit) + " " + cur], ["هامش الربح", (totals.revenue ? (totals.profit / totals.revenue * 100).toFixed(1) : 0) + "%"]] };
    if (type === "expenses") {
      // أكبر فئة مصروفات
      const byCat = {};
      expenses.forEach(e => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
      const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
      return { title: "تقرير المصاريف", summary: [["إجمالي المصاريف", fmt(totals.expTotal) + " " + cur], ["عدد البنود", expenses.length], ["أكبر فئة", top ? top[0] : "—"]], thead: ["التاريخ", "الفئة", "الوصف", "المبلغ"], tbody: expenses.map(e => [arDate(e.date), e.cat, e.desc, fmt(e.amount) + " " + cur]) };
    }
    if (type === "assets") {
      const active = assets.filter(a => a.status === "active").length;
      const maint = assets.filter(a => a.status === "maintenance").length;
      const damaged = assets.filter(a => a.status === "damaged").length;
      const lost = assets.filter(a => a.status === "lost").length;
      const val = assets.filter(a => a.status === "active" || a.status === "maintenance").reduce((s, a) => s + (a.cost || 0) * (a.qty || 1), 0);
      return { title: "تقرير موارد النادي", summary: [["قيمة الموجودات", fmt(val) + " " + cur], ["موجود / صيانة", active + " / " + maint], ["تالف / مفقود", damaged + " / " + lost]],
        thead: ["المورد", "الفئة", "العدد", "تاريخ الإضافة", "التكلفة", "الحالة"],
        tbody: assets.map(a => [a.name, a.cat, a.qty, arDate(a.addedAt), a.cost ? fmt(a.cost) + " " + cur : "—", ASSET_STATUS[a.status].label]) };
    }
    // products — إيراد كل قسم من الفواتير المدفوعة فعلياً
    const rows = products.filter(p => !cat || p.cat === cat);
    let gamesRev = 0, cafeRev = 0;
    invoices.filter(i => i.status === "مدفوعة").forEach(i => {
      if (i.source === "حجز" || (i.details && (i.details.includes("PS") || i.details.includes("Xbox")))) gamesRev += i.total;
      else cafeRev += i.total;
    });
    return { title: "تقرير مبيعات المنتجات", summary: [["عدد المنتجات", rows.length], ["إيراد الألعاب", fmt(gamesRev) + " " + cur], ["إيراد الكافيه", fmt(cafeRev) + " " + cur]], thead: ["المنتج", "القسم", "الباركود", "سعر البيع", "المخزون"], tbody: rows.map(p => [p.name, CATS[p.cat], p.bc, fmt(p.sell) + " " + cur, p.stock !== null ? p.stock : "خدمة"]) };
  }, [type, cat, invoices, purchases, expenses, products, totals, assets, ctx.suppliers.length]);

  const doPrint = () => {
    const w = window.open("", "_blank", "width=900,height=650");
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير نادي النخيل</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:'Tajawal',sans-serif}body{padding:2cm;direction:rtl;font-size:13px;color:#1a1a18}
    .hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #c9a84c;padding-bottom:.75rem;margin-bottom:1rem}.nm{font-size:15px;font-weight:700;color:#1a5c2e}.sub{font-size:10px;color:#7a7870}.info{text-align:left;font-size:10px;color:#7a7870}
    h3{font-size:15px;font-weight:700;color:#1a5c2e;text-align:center}p.range{text-align:center;font-size:11px;color:#7a7870;margin:2px 0 1rem}
    .sum{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem}.sc{background:#f5f2ea;border-radius:7px;padding:.6rem;text-align:center}.sv{font-size:16px;font-weight:700;color:#1a5c2e}.sl{font-size:10px;color:#7a7870;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:.5rem}th{background:#1a5c2e;color:#f0d080;padding:.45rem .6rem;text-align:right;font-size:11px}td{padding:.45rem .6rem;border-bottom:0.5px solid #e8e4d8;font-size:12px}tr:nth-child(even) td{background:#faf8f2}
    .ft{text-align:center;font-size:10px;color:#7a7870;margin-top:1.5rem;padding-top:.75rem;border-top:0.5px solid #c9a84c}</style></head><body>
    <div class="hd"><div><div class="nm">🌴 نادي النخيل</div><div class="sub">النادي الرياضي الترفيهي</div></div><div class="info">مصراتة، ليبيا<br>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-LY")}</div></div>
    <h3>${cfg.title}${cat ? " — قسم " + CATS[cat] : ""}</h3><p class="range">الفترة: ${arDate(from)} — ${arDate(to)}</p>
    <div class="sum">${cfg.summary.map(s => `<div class="sc"><div class="sv">${s[1]}</div><div class="sl">${s[0]}</div></div>`).join("")}</div>
    <table><thead><tr>${cfg.thead.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${cfg.tbody.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="ft">نادي النخيل — ${cfg.title} — جميع الأرقام بالدينار الليبي</div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <>
      <PageTop title="التقارير والإحصاء" />
      <div style={{ background: C.cd, border: `0.5px solid ${C.bc}`, borderRadius: 12, padding: ".9rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <Field label="نوع التقرير"><Sel value={type} onChange={e => setType(e.target.value)} style={{ minWidth: 150 }}><option value="sales">تقرير المبيعات</option><option value="purchases">تقرير المشتريات</option><option value="profit">الأرباح والخسائر</option><option value="products">مبيعات المنتجات</option><option value="expenses">تقرير المصاريف</option><option value="assets">موارد النادي</option></Sel></Field>
        {(type === "products" || type === "sales") && <Field label="القسم"><Sel value={cat} onChange={e => setCat(e.target.value)} style={{ minWidth: 130 }}><option value="">كل الأقسام</option><option value="games">ألعاب فيديو</option><option value="cafe">كافيه</option></Sel></Field>}
        <Field label="من تاريخ"><Inp type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="إلى تاريخ"><Inp type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
        <Btn gold onClick={doPrint} style={{ marginBottom: ".75rem" }}>🖨 طباعة PDF</Btn>
      </div>
      <div ref={printRef} style={{ background: C.cd, border: `0.5px solid ${C.bc}`, borderRadius: 12, padding: "1.1rem 1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: ".75rem", borderBottom: `1px solid ${C.bc}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Crest size={32} /><div><div style={{ fontSize: 14, fontWeight: 700, color: C.grn2 }}>نادي النخيل</div><div style={{ fontSize: 10, color: C.mt }}>النادي الرياضي الترفيهي</div></div></div>
          <div style={{ textAlign: "left", fontSize: 11, color: C.mt }}>مصراتة، ليبيا<br />{new Date().toLocaleDateString("ar-LY")}</div>
        </div>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}><h3 style={{ fontSize: 14, fontWeight: 700, color: C.grn2 }}>{cfg.title}{cat ? " — قسم " + CATS[cat] : ""}</h3><p style={{ fontSize: 11, color: C.mt, marginTop: 2 }}>الفترة: {arDate(from)} — {arDate(to)}</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1rem" }}>
          {cfg.summary.map((s, i) => <div key={i} style={{ background: C.crm, borderRadius: 8, padding: ".65rem", textAlign: "center" }}><div style={{ fontSize: 17, fontWeight: 700, color: C.grn2 }}>{s[1]}</div><div style={{ fontSize: 10, color: C.mt, marginTop: 2 }}>{s[0]}</div></div>)}
        </div>
        <Table cols={cfg.thead.map(h => ({ h, w: (100 / cfg.thead.length) + "%" }))} rows={cfg.tbody} />
        <div style={{ marginTop: ".85rem", paddingTop: ".6rem", borderTop: `0.5px solid ${C.bc}`, fontSize: 10.5, color: C.mt, textAlign: "center" }}>نادي النخيل — تقرير آلي — جميع الأرقام بالدينار الليبي</div>
      </div>
    </>
  );
}

/* ============================ USERS ============================ */
function Users({ ctx }) {
  const { users, setUsers, showToast } = ctx;
  const [sel, setSel] = useState(users.find(u => u.role === "بائع")?.id || users[0]?.id || null);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({ name: "", username: "", password: "", role: "بائع", shift: "صباحي" });
  const [newPwd, setNewPwd] = useState("");
  const current = users.find(u => u.id === sel) || users[0];
  if (!current) return <><PageTop title="المستخدمون والصلاحيات" /><Card><div style={{ textAlign: "center", padding: "2rem", color: C.mt }}>لا مستخدمون بعد.</div></Card></>;
  const togglePerm = (k) => setUsers(us => us.map(u => u.id === sel ? { ...u, perms: { ...u.perms, [k]: !u.perms[k] } } : u));
  const toggleActive = () => setUsers(us => us.map(u => u.id === sel ? { ...u, active: !u.active } : u));
  // page visibility: page مرئية إلا إذا كانت pages[id] === false
  const pageVisible = (id) => !(current.pages && current.pages[id] === false);
  const togglePage = (id) => setUsers(us => us.map(u => {
    if (u.id !== sel) return u;
    const pages = { ...(u.pages || {}) };
    pages[id] = pages[id] === false ? true : false; // بدّل بين مرئي/مخفي
    return { ...u, pages };
  }));
  const setAllPages = (visible) => setUsers(us => us.map(u => {
    if (u.id !== sel) return u;
    const pages = {};
    PAGE_LIST.forEach(p => { if (!visible) pages[p.id] = false; }); // إخفاء الكل = وضع false للجميع
    return { ...u, pages };
  }));
  const addUser = () => {
    if (!f.name.trim() || !f.username.trim()) { showToast("أدخل الاسم واسم المستخدم"); return; }
    if (!f.password || f.password.length < 4) { showToast("أدخل رمز دخول من 4 خانات على الأقل"); return; }
    const perms = { invoices: true, discounts: false, cancel: false, reports: false, customers: true, prices: false, purchases: false, inventory: false, salaries: false };
    setUsers(us => [...us, { id: Math.max(0, ...us.map(x => x.id)) + 1, name: f.name, username: f.username, password: f.password, role: f.role, shift: f.shift, active: true, perms, pages: {} }]);
    showToast("تمت إضافة المستخدم"); setModal(false); setF({ name: "", username: "", password: "", role: "بائع", shift: "صباحي" });
  };
  const visibleCount = PAGE_LIST.filter(p => pageVisible(p.id)).length;

  return (
    <>
      <PageTop title="المستخدمون والصلاحيات" action={<Btn gold onClick={() => setModal(true)}>+ إضافة مستخدم</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: ctx.scr?.isTab ? "1fr" : "1fr 1.8fr", gap: 11 }}>
        <Card>
          <CardHead title="المستخدمون" />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {users.map(u => (
              <div key={u.id} onClick={() => setSel(u.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".55rem .75rem", border: `0.5px solid ${sel === u.id ? "rgba(201,168,76,.5)" : C.bc}`, borderRadius: 9, cursor: "pointer", background: sel === u.id ? "rgba(201,168,76,.08)" : C.crm }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 29, height: 29, borderRadius: "50%", background: u.role === "مدير" ? C.gold : C.grl, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{u.name.slice(0, 2)}</div><div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 10, color: C.mt }}>{u.role}{u.shift !== "—" ? " — " + u.shift : ""}{!u.active && " · موقوف"}</div></div></div>
                <Badge tone={u.role === "مدير" ? "gold" : "g"}>{u.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {/* الصلاحيات التفصيلية */}
          <Card>
            <CardHead title={`صلاحيات — ${current.name}`} sub={current.role === "مدير" ? "المدير يملك كل الصلاحيات تلقائياً" : "فعّل أو عطّل كل صلاحية"} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7 }}>
              {Object.keys(PERM_LABELS).map(k => (
                <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.crm, borderRadius: 7, padding: ".42rem .6rem", fontSize: 12, opacity: current.role === "مدير" ? .6 : 1 }}>
                  <span>{PERM_LABELS[k]}</span>
                  <div onClick={() => current.role !== "مدير" && togglePerm(k)} style={{ width: 32, height: 17, borderRadius: 8, position: "relative", cursor: current.role === "مدير" ? "default" : "pointer", background: (current.perms[k] || current.role === "مدير") ? C.grl : "#ccc", transition: ".2s" }}>
                    <div style={{ position: "absolute", width: 13, height: 13, borderRadius: "50%", background: "#fff", top: 2, right: (current.perms[k] || current.role === "مدير") ? 2 : 17, transition: ".2s" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* رمز الدخول */}
          <Card>
            <CardHead title="🔑 رمز الدخول" sub={current.password ? "رمز محدد لهذا الحساب ✓" : "⚠ لا يوجد رمز — يُنصح بتعيينه فوراً"} />
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Inp type="password" autoComplete="new-password" placeholder="رمز جديد (4 خانات فأكثر)" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
              <Btn gold sm onClick={() => {
                if (!newPwd || newPwd.length < 4) { showToast("الرمز يجب أن يكون 4 خانات على الأقل"); return; }
                setUsers(us => us.map(u => u.id === sel ? { ...u, password: newPwd } : u));
                setNewPwd(""); showToast(`تم تحديث رمز دخول ${current.name}`);
              }}>حفظ الرمز</Btn>
            </div>
          </Card>

          {/* التحكم في القوائم الظاهرة */}
          <Card>
            <CardHead
              title="القوائم الظاهرة لهذا المستخدم"
              sub={current.role === "مدير" ? "المدير يرى كل القوائم دائماً" : `${visibleCount} من ${PAGE_LIST.length} قائمة ظاهرة`}
              right={current.role !== "مدير" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn sm onClick={() => setAllPages(true)}>إظهار الكل</Btn>
                  <Btn sm danger onClick={() => setAllPages(false)}>إخفاء الكل</Btn>
                </div>
              )}
            />
            {current.role === "مدير" ? (
              <div style={{ textAlign: "center", padding: "1.2rem", color: C.mt, fontSize: 12.5 }}>👑 حساب المدير يصل إلى جميع أقسام النظام دون قيود.</div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: C.mt, marginBottom: 8 }}>اضغط على أي قائمة لإظهارها أو إخفائها من واجهة هذا المستخدم:</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 7 }}>
                  {PAGE_LIST.map(p => {
                    const vis = pageVisible(p.id);
                    return (
                      <div key={p.id} onClick={() => togglePage(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: vis ? "#e9f6ee" : "#f4f2ec", border: `1px solid ${vis ? "rgba(26,140,62,.3)" : C.bc}`, borderRadius: 8, padding: ".45rem .65rem", fontSize: 12, cursor: "pointer", opacity: vis ? 1 : .65 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span>{p.icon}</span>{p.label}</span>
                        <span style={{ fontSize: 13 }}>{vis ? "👁" : "🚫"}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {current.role !== "مدير" && (
              <div style={{ display: "flex", gap: 7, marginTop: ".85rem" }}>
                <Btn gold sm onClick={() => showToast("تم حفظ إعدادات المستخدم")}>حفظ</Btn>
                <Btn sm danger onClick={toggleActive}>{current.active ? "إيقاف الحساب" : "تفعيل الحساب"}</Btn>
              </div>
            )}
          </Card>
        </div>
      </div>
      {modal && <Modal title="إضافة مستخدم جديد" onClose={() => setModal(false)} width={460}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="الاسم الكامل" full><Inp value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="اسم المستخدم"><Inp value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="user1" /></Field>
          <Field label="الدور"><Sel value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option value="بائع">بائع</option><option value="مدير">مدير</option></Sel></Field>
          <Field label="الوردية"><Sel value={f.shift} onChange={e => setF({ ...f, shift: e.target.value })}><option>صباحي</option><option>مسائي</option><option value="—">—</option></Sel></Field>
          <Field label="رمز الدخول * (4 خانات فأكثر)" full><Inp type="password" autoComplete="new-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="••••••" /></Field>
        </div>
        <div style={{ fontSize: 11, color: C.mt, marginBottom: 10 }}>سيُمنح المستخدم صلاحيات افتراضية وكل القوائم ظاهرة — عدّلها بعد الإضافة. يسجّل الدخول برمزه الخاص.</div>
        <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={addUser} style={{ flex: 1, justifyContent: "center" }}>✓ إضافة</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
      </Modal>}
    </>
  );
}

/* ============================ INVENTORY & SHORTAGE ============================ */
function Inventory({ ctx }) {
  const { products, setProducts, suppliers, showToast } = ctx;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | low | out | ok
  const [modal, setModal] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [orderLines, setOrderLines] = useState([]); // {prodId, qty}
  const [adjust, setAdjust] = useState(null); // product being adjusted

  // only stocked products (services have stock=null)
  const stocked = products.filter(p => p.stock !== null);
  const lowItems = stocked.filter(p => p.min && p.stock < p.min);
  const outItems = stocked.filter(p => p.stock === 0);
  const stockValue = stocked.reduce((s, p) => s + (p.buy || 0) * p.stock, 0);

  const statusOf = (p) => {
    if (p.stock === 0) return { label: "نفد", tone: "r", pct: 0 };
    if (p.min && p.stock < p.min) return { label: "منخفض", tone: "a", pct: Math.min(100, Math.round(p.stock / (p.min * 2) * 100)) };
    return { label: "متوفر", tone: "g", pct: Math.min(100, p.min ? Math.round(p.stock / (p.min * 2) * 100) : 100) };
  };

  const shown = stocked.filter(p => {
    if (!(p.name.includes(q) || p.bc.includes(q))) return false;
    const st = statusOf(p);
    if (filter === "low") return st.tone === "a";
    if (filter === "out") return st.tone === "r";
    if (filter === "ok") return st.tone === "g";
    return true;
  });

  // stock adjustment (manual receive/correct)
  const applyAdjust = (delta) => {
    setProducts(ps => ps.map(p => p.id === adjust.id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
    setAdjust(a => ({ ...a, stock: Math.max(0, a.stock + delta) }));
  };

  /* ---- shortage order builder ---- */
  const openShortageForm = () => {
    // auto-fill with low/out items, suggested qty = (min*2 - stock)
    const suggestions = lowItems.map(p => ({ prodId: p.id, qty: Math.max(1, (p.min * 2) - p.stock) }));
    setOrderLines(suggestions.length ? suggestions : []);
    // preselect supplier of first low item if available
    const firstSup = lowItems.find(p => p.supplier)?.supplier || "";
    setSupplier(firstSup);
    setModal(true);
  };
  const addOrderLine = () => setOrderLines(l => [...l, { prodId: "", qty: 1 }]);
  const setOrderLine = (i, k, v) => setOrderLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));
  const delOrderLine = (i) => setOrderLines(l => l.filter((_, idx) => idx !== i));

  const supplierObj = suppliers.find(s => s.name === supplier);

  const sendWhatsApp = () => {
    const valid = orderLines.filter(l => l.prodId && l.qty > 0);
    if (!valid.length) { showToast("أضف صنفاً واحداً على الأقل للطلب"); return; }
    if (!supplier) { showToast("اختر المورد المستلم للطلب"); return; }
    // توليد فاتورة النواقص PDF — يفتحها المستخدم ويشاركها بنفسه عبر واتساب
    const docNo = "SHORT-" + Date.now().toString().slice(-6);
    openPdfDoc(ctx.settings, {
      title: "فاتورة نواقص — طلب توريد",
      recipientLabel: "المورد", recipientName: supplier, recipientPhone: supplierObj?.phone,
      docNo,
      columns: ["#", "الصنف", "الباركود", "الكمية المطلوبة", "الوحدة", "المتوفر حالياً"],
      rows: valid.map((l, i) => {
        const p = products.find(x => x.id == l.prodId);
        return [i + 1, p?.name || "—", p?.bc || "—", l.qty, p?.unit || "قطعة", (p?.stock ?? "—") + " قطعة"];
      }),
      totals: [["إجمالي الأصناف المطلوبة", valid.length + " صنف"]],
      note: "يرجى تأكيد التوفر والأسعار وموعد التسليم. هذا الطلب مُولّد آلياً حسب نواقص المخزون.",
    });
    showToast("فُتحت فاتورة النواقص — احفظها كـ PDF ثم شاركها عبر واتساب المورد");
    setModal(false);
  };

  return (
    <>
      <PageTop title="المخزون والنواقص" action={
        <Btn gold onClick={openShortageForm}><span style={{ fontSize: 14 }}>🟢</span> إنشاء فاتورة نواقص</Btn>
      } />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="أصناف بالمخزون" value={stocked.length} sub="صنف قابل للجرد" bar={C.grl} />
        <KCard label="منخفض المخزون" value={lowItems.length} sub="تحت الحد الأدنى" bar={C.gold} />
        <KCard label="نفد كلياً" value={outItems.length} sub="بحاجة طلب عاجل" bar={C.red} />
        <KCard label="قيمة المخزون" value={fmt(stockValue)} sub="دينار ليبي" bar="#2a78d6" />
      </div>

      {(lowItems.length > 0) && (
        <div style={{ background: "linear-gradient(135deg,#fff7eb,#fff)", border: `1px solid ${C.gold}`, borderRadius: 12, padding: ".8rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12.5, color: C.gdd }}>⚠️ يوجد <b>{lowItems.length}</b> صنف تحت الحد الأدنى{outItems.length ? `، منها ${outItems.length} نفد كلياً` : ""}. يمكنك إنشاء فاتورة نواقص وإرسالها للمورد عبر واتساب مباشرة.</div>
          <Btn gold sm onClick={openShortageForm}>مراجعة النواقص →</Btn>
        </div>
      )}

      <Card>
        <CardHead
          title="جرد المخزون"
          sub="ابحث بالاسم أو الباركود للتأكد من الكمية المتوفرة"
          right={
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.crm, border: `0.5px solid ${C.bc}`, borderRadius: 8, padding: ".3rem .7rem", width: 220 }}>
                <span style={{ color: C.mt, fontSize: 14 }}>🔍</span>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن صنف أو باركود..." style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, width: "100%", fontFamily: "inherit" }} />
              </div>
              <Sel value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 130 }}>
                <option value="all">كل الأصناف</option>
                <option value="ok">متوفر</option>
                <option value="low">منخفض</option>
                <option value="out">نفد</option>
              </Sel>
            </div>
          }
        />
        {shown.length === 0 ? (
          <div style={{ textAlign: "center", color: C.mt, fontSize: 12.5, padding: "1.5rem 0" }}>لا توجد أصناف مطابقة للبحث.</div>
        ) : (
          <Table
            cols={[{ h: "الباركود", w: "13%" }, { h: "الصنف", w: "20%" }, { h: "القسم", w: "10%" }, { h: "المتوفر", w: "10%" }, { h: "الحد الأدنى", w: "10%" }, { h: "مستوى المخزون", w: "19%" }, { h: "الحالة", w: "10%" }, { h: "إجراء", w: "8%" }]}
            rows={shown.map(p => {
              const st = statusOf(p);
              return [
                <span style={{ fontFamily: "monospace", fontSize: 11, background: C.crm, padding: "2px 6px", borderRadius: 5 }}>{p.bc}</span>,
                <span style={{ fontWeight: 600 }}>{p.name}</span>,
                <Badge tone={p.cat === "games" ? "g" : "a"}>{CATS[p.cat]}</Badge>,
                <span style={{ fontWeight: 700, color: st.tone === "r" ? C.red : st.tone === "a" ? C.gdd : C.grn2 }}>{p.stock} {p.unit}</span>,
                p.min || "—",
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#eee", overflow: "hidden" }}><div style={{ width: st.pct + "%", height: "100%", background: st.tone === "r" ? "#e34948" : st.tone === "a" ? C.gold : C.grl }} /></div>
                  <span style={{ fontSize: 10, color: C.mt, minWidth: 28 }}>{st.pct}%</span>
                </div>,
                <Badge tone={st.tone}>{st.label}</Badge>,
                <Btn sm onClick={() => setAdjust(p)}>تعديل</Btn>,
              ];
            })}
          />
        )}
      </Card>

      {/* stock adjust modal */}
      {adjust && (
        <Modal title={`تعديل مخزون — ${adjust.name}`} onClose={() => setAdjust(null)} width={400}>
          <div style={{ textAlign: "center", padding: ".5rem 0 1rem" }}>
            <div style={{ fontSize: 11, color: C.mt, marginBottom: 4 }}>الكمية المتوفرة حالياً</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: C.grn2 }}>{adjust.stock}</div>
            <div style={{ fontSize: 11, color: C.mt }}>{adjust.unit}</div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: "1rem" }}>
            <Btn onClick={() => applyAdjust(-1)}>− 1</Btn>
            <Btn onClick={() => applyAdjust(-10)}>− 10</Btn>
            <Btn onClick={() => applyAdjust(10)}>+ 10</Btn>
            <Btn onClick={() => applyAdjust(1)}>+ 1</Btn>
          </div>
          <Btn gold onClick={() => { showToast("تم تحديث المخزون"); setAdjust(null); }} style={{ width: "100%", justifyContent: "center" }}>✓ حفظ التعديل</Btn>
        </Modal>
      )}

      {/* shortage order modal */}
      {modal && (
        <Modal title="فاتورة نواقص — طلب من المورد" onClose={() => setModal(false)} width={580}>
          <Field label="المورد (للإرسال عبر واتساب)">
            <Sel value={supplier} onChange={e => setSupplier(e.target.value)}>
              <option value="">اختر المورد...</option>
              {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}{s.wa ? "" : " (لا يوجد واتساب)"}</option>)}
            </Sel>
          </Field>
          {supplierObj && supplierObj.wa && (
            <div style={{ fontSize: 11.5, color: "#1a8c3e", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 14 }}>🟢</span> سيُرسَل الطلب إلى واتساب: {supplierObj.phone}
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: C.mt, margin: ".3rem 0 .5rem" }}>الأصناف المطلوبة (تم اقتراح النواقص تلقائياً)</div>
          {orderLines.length === 0 && <div style={{ fontSize: 12, color: C.mt, padding: ".5rem 0" }}>لا توجد نواقص حالياً — أضف أصنافاً يدوياً إن رغبت.</div>}
          {orderLines.map((ln, i) => {
            const p = products.find(x => x.id == ln.prodId);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, background: C.crm, borderRadius: 8, padding: ".45rem .7rem" }}>
                <Sel value={ln.prodId} onChange={e => setOrderLine(i, "prodId", e.target.value)} style={{ flex: 2.5, background: C.cd }}>
                  <option value="">اختر الصنف...</option>
                  {stocked.map(pr => <option key={pr.id} value={pr.id}>{pr.name} (متوفر: {pr.stock})</option>)}
                </Sel>
                <Inp type="number" value={ln.qty} onChange={e => setOrderLine(i, "qty", parseInt(e.target.value) || 1)} style={{ width: 70, background: C.cd }} />
                <span style={{ fontSize: 11, color: C.mt, minWidth: 34 }}>{p?.unit || ""}</span>
                <button onClick={() => delOrderLine(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.mt, fontSize: 15 }}>✕</button>
              </div>
            );
          })}
          <Btn sm onClick={addOrderLine} style={{ marginTop: 5 }}>+ إضافة صنف</Btn>

          {/* PDF flow explanation */}
          {orderLines.filter(l => l.prodId).length > 0 && (
            <div style={{ marginTop: "1rem", background: C.bluebg, border: `0.5px solid ${C.blue}33`, borderRadius: 10, padding: ".7rem .85rem", fontSize: 11.5, color: C.blue, lineHeight: 1.8 }}>
              📄 عند الضغط على الزر تُفتح فاتورة النواقص مباشرة كمستند رسمي: اضغط <b>«💾 حفظ كـ PDF»</b> داخل المستند، ثم شارك الملف المحفوظ عبر واتساب المورد 📎 من جهازك.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
            <button onClick={sendWhatsApp} style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 7, padding: ".55rem", borderRadius: 10, background: "#25D366", color: "#fff", border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 16 }}>📄</span> فتح فاتورة النواقص PDF
            </button>
            <Btn onClick={() => setModal(false)}>إغلاق</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ============================ SETTINGS ============================ */
function Settings({ ctx }) {
  const { settings, setSettings, showToast } = ctx;
  const [tab, setTab] = useState("appearance");
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));
  const fileRef = useRef(null);

  const onLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) { showToast("حجم الصورة كبير — اختر صورة أصغر من 800KB"); return; }
    const reader = new FileReader();
    reader.onload = () => { set("logo", reader.result); showToast("تم تحديث الشعار"); };
    reader.readAsDataURL(file);
  };

  const TABS = [
    { id: "appearance", label: "المظهر والثيمات", icon: "🎨" },
    { id: "pos", label: "نقطة البيع", icon: "🛍" },
    { id: "printers", label: "الطابعات", icon: "🖨" },
    { id: "invoice", label: "شكل الفاتورة", icon: "🧾" },
    { id: "content", label: "الكلمات والمعلومات", icon: "✍" },
    { id: "database", label: "قاعدة البيانات", icon: "🗄" },
  ];

  return (
    <>
      <PageTop title="الإعدادات" action={<Btn gold onClick={() => showToast("تم حفظ جميع الإعدادات")}>✓ حفظ الكل</Btn>} />

      {/* tab bar */}
      <div style={{ display: "flex", gap: 4, background: C.gold + "18", borderRadius: 12, padding: 4, marginBottom: "1.1rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ padding: ".45rem 1rem", borderRadius: 9, fontSize: 12.5, cursor: "pointer", fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? C.grn : "transparent", color: tab === t.id ? C.gld : C.mt, transition: "all .2s", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>

      {/* ===== APPEARANCE ===== */}
      {tab === "appearance" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card className="nk-card-hover">
            <CardHead title="شعار النادي" sub="ارفع شعارك الخاص أو استخدم الشعار الافتراضي" />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 90, height: 90, borderRadius: 16, background: C.crm, border: `1px dashed ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {settings.logo ? <img src={settings.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Crest size={64} />}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: "none" }} />
                <Btn gold onClick={() => fileRef.current?.click()} style={{ width: "100%", justifyContent: "center", marginBottom: 7 }}>📤 رفع صورة الشعار</Btn>
                {settings.logo && <Btn onClick={() => { set("logo", null); showToast("تم استرجاع الشعار الافتراضي"); }} style={{ width: "100%", justifyContent: "center" }}>استرجاع الافتراضي</Btn>}
                <div style={{ fontSize: 10.5, color: C.mt, marginTop: 6 }}>PNG أو JPG — أقل من 800KB — يُفضّل مربّع</div>
              </div>
            </div>
          </Card>

          <Card className="nk-card-hover">
            <CardHead title="الوضع الليلي" sub="راحة للعين في الإضاءة المنخفضة" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.crm, borderRadius: 12, padding: "1rem 1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>{settings.dark ? "🌙" : "☀️"}</span>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{settings.dark ? "الوضع الليلي مُفعّل" : "الوضع النهاري"}</div><div style={{ fontSize: 11, color: C.mt }}>اضغط للتبديل</div></div>
              </div>
              <div onClick={() => set("dark", !settings.dark)} style={{ width: 52, height: 28, borderRadius: 14, background: settings.dark ? C.grl : "#ccc", position: "relative", cursor: "pointer", transition: "background .3s" }}>
                <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: "#fff", top: 3, right: settings.dark ? 3 : 27, transition: "right .3s", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{settings.dark ? "🌙" : "☀️"}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, padding: "0 .3rem" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>المؤثرات الحركية</div>
              <div onClick={() => set("animations", !settings.animations)} style={{ width: 34, height: 18, borderRadius: 9, background: settings.animations ? C.grl : "#ccc", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "#fff", top: 2, right: settings.animations ? 2 : 18, transition: "right .2s" }} />
              </div>
            </div>
          </Card>

          <Card className="nk-card-hover" style={{ gridColumn: "1/-1" }}>
            <CardHead title="ثيم الألوان" sub="اختر لوحة الألوان التي تناسب هوية ناديك — التغيير فوري" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
              {Object.entries(THEMES).map(([key, th]) => (
                <div key={key} onClick={() => { set("theme", key); showToast(`تم تفعيل ثيم ${th.name}`); }}
                  style={{ border: `2px solid ${settings.theme === key ? th.accent : C.bc}`, borderRadius: 14, padding: ".8rem", cursor: "pointer", background: settings.theme === key ? th.accent + "12" : C.crm, transition: "all .2s", transform: settings.theme === key ? "translateY(-2px)" : "none", boxShadow: settings.theme === key ? `0 6px 16px ${th.accent}33` : "none" }}>
                  <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 34, borderRadius: 8, background: `linear-gradient(135deg,${th.brand},${th.brand2})` }} />
                    <div style={{ width: 20, height: 34, borderRadius: 8, background: th.accent }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", color: settings.theme === key ? th.accentD : C.k2 }}>{th.name}</div>
                  {settings.theme === key && <div style={{ textAlign: "center", fontSize: 10, color: th.accent, marginTop: 3, fontWeight: 600 }}>● مُفعّل</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===== POS MODES ===== */}
      {tab === "pos" && (
        <Card className="nk-card-hover">
          <CardHead title="وضعية عرض نقطة البيع السريع" sub="اختر طريقة عرض المنتجات التي تناسب سرعة عملك" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { id: "grid", name: "شبكة البطاقات", desc: "بطاقات كبيرة بأيقونات — الأسرع للمس", preview: "grid" },
              { id: "list", name: "قائمة مفصّلة", desc: "صفوف بمعلومات أكثر لكل منتج", preview: "list" },
              { id: "compact", name: "مضغوط", desc: "أزرار صغيرة — أكبر عدد بالشاشة", preview: "compact" },
            ].map(m => (
              <div key={m.id} onClick={() => { set("posMode", m.id); showToast(`وضع ${m.name} مُفعّل`); }}
                style={{ border: `2px solid ${settings.posMode === m.id ? C.gold : C.bc}`, borderRadius: 14, padding: "1rem", cursor: "pointer", background: settings.posMode === m.id ? C.gold + "10" : C.crm, transition: "all .2s" }}>
                <div style={{ height: 70, background: C.cd, borderRadius: 8, padding: 8, marginBottom: 10, display: "flex", flexDirection: m.preview === "list" ? "column" : "row", flexWrap: m.preview === "grid" ? "wrap" : "nowrap", gap: 4, overflow: "hidden" }}>
                  {m.preview === "grid" && [1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ width: "30%", height: 26, borderRadius: 5, background: C.gold + "33" }} />)}
                  {m.preview === "list" && [1, 2, 3].map(i => <div key={i} style={{ width: "100%", height: 15, borderRadius: 4, background: C.gold + "33" }} />)}
                  {m.preview === "compact" && [1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} style={{ width: "22%", height: 16, borderRadius: 3, background: C.gold + "33" }} />)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: C.mt, marginTop: 2 }}>{m.desc}</div>
                {settings.posMode === m.id && <div style={{ fontSize: 10, color: C.grl, marginTop: 5, fontWeight: 700 }}>● الوضع الحالي</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== PRINTERS ===== */}
      {tab === "printers" && (
        <Card className="nk-card-hover">
          <CardHead title="إعدادات الطابعة" sub="اختر نوع الطابعة المستخدمة لطباعة الفواتير" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { id: "xprinter", name: "طابعة الإيصالات (Xprinter)", desc: "طابعة حرارية 80mm — إيصال ضيق سريع", icon: "🧾", width: "80mm", sample: "narrow" },
              { id: "a4", name: "الطابعة الكبيرة (A4)", desc: "طابعة عادية — فاتورة كاملة بحجم A4", icon: "🖨", width: "A4", sample: "wide" },
            ].map(p => (
              <div key={p.id} onClick={() => { set("printer", p.id); showToast(`تم اختيار ${p.name}`); }}
                style={{ border: `2px solid ${settings.printer === p.id ? C.gold : C.bc}`, borderRadius: 14, padding: "1.1rem", cursor: "pointer", background: settings.printer === p.id ? C.gold + "10" : C.crm, transition: "all .2s", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{p.icon}</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <div style={{ width: p.sample === "narrow" ? 44 : 80, height: 60, background: "#fff", borderRadius: 4, border: `1px solid ${C.bc}`, padding: 5, boxShadow: "0 2px 6px rgba(0,0,0,.08)" }}>
                    <div style={{ height: 6, background: C.gold + "55", borderRadius: 2, marginBottom: 3, width: "60%", marginInline: "auto" }} />
                    {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 3, background: "#ddd", borderRadius: 2, marginBottom: 2 }} />)}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.mt, marginTop: 3 }}>{p.desc}</div>
                <Badge tone="gold" style={{ marginTop: 8 }}>عرض: {p.width}</Badge>
                {settings.printer === p.id && <div style={{ fontSize: 10, color: C.grl, marginTop: 6, fontWeight: 700 }}>● الطابعة الحالية</div>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, background: C.gold + "12", border: `0.5px solid ${C.gold}55`, borderRadius: 10, padding: ".8rem 1rem", fontSize: 12, color: C.gdd, display: "flex", gap: 8 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span>عند إتمام أي بيع، سيتم تنسيق الفاتورة تلقائياً حسب الطابعة المختارة — الإيصال الحراري يظهر مضغوطاً بعرض 80mm، وطابعة A4 تعرض فاتورة رسمية كاملة.</span>
          </div>
        </Card>
      )}

      {/* ===== INVOICE DESIGN ===== */}
      {tab === "invoice" && <InvoiceDesigner ctx={ctx} />}

      {/* ===== CONTENT ===== */}
      {tab === "content" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card className="nk-card-hover">
            <CardHead title="معلومات النادي" sub="تظهر في الشريط الجانبي والفواتير" />
            <Field label="اسم النادي"><Inp value={settings.clubName} onChange={e => set("clubName", e.target.value)} /></Field>
            <Field label="الوصف / الشعار النصي"><Inp value={settings.clubSub} onChange={e => set("clubSub", e.target.value)} /></Field>
            <Field label="العنوان"><Inp value={settings.address} onChange={e => set("address", e.target.value)} /></Field>
            <Field label="رقم الهاتف"><Inp value={settings.phone} onChange={e => set("phone", e.target.value)} /></Field>
          </Card>
          <Card className="nk-card-hover">
            <CardHead title="الكلمات الترحيبية والفاتورة" sub="خصّص نبرة رسائل النظام" />
            <Field label="عنوان الترحيب (شاشة الدخول)"><Inp value={settings.welcomeTitle} onChange={e => set("welcomeTitle", e.target.value)} /></Field>
            <Field label="رسالة ترحيبية"><Inp value={settings.welcomeMsg} onChange={e => set("welcomeMsg", e.target.value)} /></Field>
            <Field label="تذييل الفاتورة"><textarea value={settings.invoiceFooter} onChange={e => set("invoiceFooter", e.target.value)} style={{ ...inputStyle, height: 52, resize: "none" }} /></Field>
            <div style={{ marginTop: 6, background: C.crm, borderRadius: 10, padding: ".7rem .9rem" }}>
              <div style={{ fontSize: 10.5, color: C.mt, marginBottom: 4 }}>معاينة رسالة الترحيب:</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.grn2 }}>{settings.welcomeTitle}</div>
              <div style={{ fontSize: 11.5, color: C.k2 }}>{settings.welcomeMsg}</div>
            </div>
          </Card>
        </div>
      )}

      {tab === "database" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card className="nk-card-hover">
            <CardHead title="حالة قاعدة البيانات" sub="أين تُحفظ بياناتك الآن" />
            {DB.mode === "supabase" && (
              <div style={{ background: "#e8f8ee", border: "1px solid rgba(26,140,62,.35)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: 34 }}>☁️</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1a5c2e", marginTop: 4 }}>سحابية — Supabase</div>
                <div style={{ fontSize: 11.5, color: C.mt, marginTop: 4, lineHeight: 1.8 }}>بياناتك محفوظة دائمياً في السحابة ومتزامنة بين كل الأجهزة المتصلة بنفس المشروع.</div>
              </div>
            )}
            {DB.mode === "local" && (
              <div style={{ background: C.gold + "12", border: `1px solid ${C.gold}55`, borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: 34 }}>💾</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.gdd, marginTop: 4 }}>محلية — على هذا الجهاز</div>
                <div style={{ fontSize: 11.5, color: C.mt, marginTop: 4, lineHeight: 1.8 }}>بياناتك محفوظة دائمياً في متصفح هذا الجهاز (تنجو من التحديث والإغلاق). لتفعيل السحابة والمزامنة بين الأجهزة، اتبع الخطوات المجاورة.</div>
              </div>
            )}
            {DB.mode === "memory" && (
              <div style={{ background: C.redbg, border: "1px solid rgba(192,57,43,.35)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: 34 }}>⚠️</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.red, marginTop: 4 }}>مؤقتة — في الذاكرة فقط</div>
                <div style={{ fontSize: 11.5, color: C.mt, marginTop: 4, lineHeight: 1.8 }}>هذه البيئة تمنع التخزين المحلي؛ البيانات ستُفقد عند تحديث الصفحة. شغّل النظام في متصفح عادي أو فعّل Supabase.</div>
              </div>
            )}
            {DB.error && <div style={{ marginTop: 10, fontSize: 11, color: C.red, background: C.redbg, borderRadius: 8, padding: ".5rem .7rem" }}>⚠ {DB.error}</div>}
            <div style={{ marginTop: 12, borderTop: `0.5px solid ${C.bc}`, paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 6 }}>منطقة الخطر</div>
              <Btn danger onClick={() => { if (window.confirm("سيتم مسح كل البيانات نهائياً (بما فيها المستخدمون) والبدء بنظام فارغ. ستظهر شاشة إنشاء حساب المدير من جديد. هل أنت متأكد؟")) DB.reset(); }}>🗑 مسح كل البيانات والبدء من جديد</Btn>
            </div>
          </Card>
          <Card className="nk-card-hover">
            <CardHead title="تفعيل الحفظ السحابي (Supabase)" sub="مجاني — 4 خطوات لمرة واحدة" />
            <div style={{ fontSize: 12.5, lineHeight: 2.1, color: C.k2 }}>
              <b>1.</b> أنشئ حساباً ومشروعاً مجانياً على <b>supabase.com</b><br />
              <b>2.</b> افتح <b>SQL Editor</b> والصق محتوى ملف <code style={{ background: C.crm, padding: "1px 6px", borderRadius: 5 }}>supabase-schema.sql</code> المرفق ثم نفّذه<br />
              <b>3.</b> من <b>Settings → API</b> انسخ <b>Project URL</b> و <b>anon key</b><br />
              <b>4.</b> افتح ملف النظام وضعهما في أعلى الملف:
              <pre style={{ background: "#14431f", color: "#f0d080", borderRadius: 9, padding: ".7rem .9rem", fontSize: 11, direction: "ltr", textAlign: "left", overflowX: "auto", marginTop: 6 }}>{`const SUPABASE_URL = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";`}</pre>
              أعد تشغيل النظام — ستتحول الحالة إلى ☁️ سحابية تلقائياً، وكل جهاز يفتح النظام يرى نفس البيانات.
            </div>
          </Card>
          <div style={{ gridColumn: "1 / -1" }}><BackupManager ctx={ctx} /></div>
        </div>
      )}
    </>
  );
}

/* ============================ BACKUP MANAGER ============================ */
function BackupManager({ ctx }) {
  const { showToast, settings } = ctx;
  const [, tick] = useState(0);
  const fileRef = useRef(null);
  const lastBackup = DB.lastBackupAt();
  const autoBk = DB.getAutoBackup();

  // كم مضى منذ آخر نسخة؟
  const daysSince = lastBackup ? Math.floor((Date.now() - new Date(lastBackup)) / 86400000) : null;
  const overdue = daysSince === null || daysSince >= (settings.backupFreq || 7);

  const downloadBackup = () => {
    const backup = DB.exportData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `nakheel-backup-${stamp}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    DB.saveAutoBackup(); tick(x => x + 1);
    showToast("تم تنزيل النسخة الاحتياطية بنجاح");
  };

  const saveInternal = () => {
    const at = DB.saveAutoBackup(); tick(x => x + 1);
    showToast("تم حفظ نسخة احتياطية داخلية");
  };

  const restoreInternal = async () => {
    if (!autoBk) return;
    if (!window.confirm("سيتم استبدال كل البيانات الحالية بالنسخة الداخلية المحفوظة. متابعة؟")) return;
    try { await DB.importData(autoBk); showToast("تمت الاستعادة — سيُعاد التحميل"); setTimeout(() => window.location.reload(), 900); }
    catch (e) { showToast("تعذّرت الاستعادة"); }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = JSON.parse(reader.result);
        if (!backup.__nakheel_backup) { showToast("هذا الملف ليس نسخة احتياطية صالحة"); return; }
        const cnt = backupCounts(backup.data || {}).join("، ") || "لا عناصر";
        if (!window.confirm(`استعادة نسخة بتاريخ ${new Date(backup.exportedAt).toLocaleString("ar-LY")}؟\nتحتوي: ${cnt}\n\nسيتم استبدال كل البيانات الحالية.`)) return;
        await DB.importData(backup);
        showToast("تمت الاستعادة بنجاح — سيُعاد التحميل");
        setTimeout(() => window.location.reload(), 900);
      } catch (err) { showToast("تعذّرت قراءة الملف — تأكد أنه نسخة صحيحة"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const setFreq = (v) => ctx.setSettings(s => ({ ...s, backupFreq: v }));

  return (
    <Card className="nk-card-hover">
      <CardHead title="🛡 النسخ الاحتياطي الذكي" sub="احمِ بيانات النادي من الفقدان" />

      {/* حالة آخر نسخة */}
      <div style={{ background: overdue ? "#fdeaea" : "#e8f8ee", border: `1px solid ${overdue ? "rgba(192,57,43,.3)" : "rgba(26,140,62,.3)"}`, borderRadius: 12, padding: ".85rem 1rem", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>{overdue ? "⚠️" : "✅"}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: overdue ? "#922" : "#1a5c2e" }}>
              {lastBackup ? `آخر نسخة: ${daysSince === 0 ? "اليوم" : daysSince === 1 ? "أمس" : `منذ ${daysSince} يوم`}` : "لم تُنشأ أي نسخة احتياطية بعد"}
            </div>
            <div style={{ fontSize: 11, color: C.mt }}>{lastBackup ? new Date(lastBackup).toLocaleString("ar-LY") : "يُنصح بإنشاء نسخة الآن"}</div>
          </div>
        </div>
        {overdue && <Btn gold sm onClick={downloadBackup}>أنشئ نسخة الآن</Btn>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        {/* تنزيل / رفع ملف */}
        <div style={{ border: `0.5px solid ${C.bc}`, borderRadius: 12, padding: "1rem" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>📁 نسخة كملف (موصى بها)</div>
          <div style={{ fontSize: 11, color: C.mt, marginBottom: 10, lineHeight: 1.7 }}>نزّل ملف <code style={{ background: C.crm, padding: "1px 5px", borderRadius: 4 }}>.json</code> واحتفظ به في مكان آمن (سحابة/فلاش). يمكنك استعادته على أي جهاز.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <Btn gold onClick={downloadBackup} style={{ justifyContent: "center" }}>⬇ تنزيل نسخة احتياطية</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} />
            <Btn onClick={() => fileRef.current?.click()} style={{ justifyContent: "center" }}>⬆ استعادة من ملف</Btn>
          </div>
        </div>

        {/* نسخة داخلية سريعة */}
        <div style={{ border: `0.5px solid ${C.bc}`, borderRadius: 12, padding: "1rem" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>⚡ نسخة داخلية سريعة</div>
          <div style={{ fontSize: 11, color: C.mt, marginBottom: 10, lineHeight: 1.7 }}>لقطة فورية تُحفظ داخل النظام — مفيدة قبل أي تعديل كبير. {autoBk ? `آخر لقطة: ${new Date(autoBk.exportedAt).toLocaleString("ar-LY")}` : "لا توجد لقطة بعد."}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <Btn onClick={saveInternal} style={{ justifyContent: "center" }}>📸 حفظ لقطة الآن</Btn>
            <Btn onClick={restoreInternal} disabled={!autoBk} style={{ justifyContent: "center", opacity: autoBk ? 1 : .5 }}>↩ استرجاع آخر لقطة</Btn>
          </div>
        </div>

        {/* التذكير المجدول */}
        <div style={{ border: `0.5px solid ${C.bc}`, borderRadius: 12, padding: "1rem" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>⏰ تذكير النسخ التلقائي</div>
          <div style={{ fontSize: 11, color: C.mt, marginBottom: 10, lineHeight: 1.7 }}>كل متى يذكّرك النظام بإنشاء نسخة احتياطية؟</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[{ v: 1, l: "يومياً" }, { v: 7, l: "أسبوعياً" }, { v: 30, l: "شهرياً" }].map(o => (
              <div key={o.v} onClick={() => setFreq(o.v)} style={{ border: `1.5px solid ${(settings.backupFreq || 7) === o.v ? C.gold : C.bc}`, borderRadius: 8, padding: ".5rem .3rem", textAlign: "center", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: (settings.backupFreq || 7) === o.v ? C.gold + "14" : C.crm }}>{o.l}</div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: C.mt, marginTop: 8, lineHeight: 1.6 }}>يظهر تنبيه أعلى الصفحة عند حلول موعد النسخ التالي.</div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: C.mt, background: C.crm, borderRadius: 8, padding: ".6rem .8rem", lineHeight: 1.8 }}>
        💡 <b>نصيحة:</b> النسخة كملف هي الأأمن — إن تعطّل الجهاز أو المتصفح تبقى بياناتك سليمة. احتفظ بنسخة أسبوعية على الأقل في مكان منفصل. عند تفعيل Supabase السحابي، بياناتك محفوظة سحابياً أيضاً كطبقة حماية إضافية.
      </div>
    </Card>
  );
}

/* ---- Invoice live designer ---- */
function InvoiceDesigner({ ctx }) {
  const { settings, setSettings, showToast } = ctx;
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));
  const isThermal = settings.printer === "xprinter";

  return (
    <div style={{ display: "grid", gridTemplateColumns: ctx.scr?.isTab ? "1fr" : "1fr 340px", gap: 12 }}>
      <Card className="nk-card-hover">
        <CardHead title="تخصيص شكل الفاتورة" sub="غيّر العناصر وشاهد المعاينة تتحدث فوراً على اليسار" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.crm, borderRadius: 10, padding: ".6rem .85rem", marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>إظهار الشعار على الفاتورة</div>
          <div onClick={() => set("invoiceShowLogo", !settings.invoiceShowLogo)} style={{ width: 34, height: 18, borderRadius: 9, background: settings.invoiceShowLogo ? C.grl : "#ccc", position: "relative", cursor: "pointer" }}>
            <div style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "#fff", top: 2, right: settings.invoiceShowLogo ? 2 : 18, transition: "right .2s" }} />
          </div>
        </div>
        <Field label="اسم العملة"><Inp value={settings.currency} onChange={e => set("currency", e.target.value)} placeholder="د.ل" /></Field>
        <Field label="تذييل الفاتورة"><textarea value={settings.invoiceFooter} onChange={e => set("invoiceFooter", e.target.value)} style={{ ...inputStyle, height: 52, resize: "none" }} /></Field>
        <div style={{ fontSize: 12, color: C.mt, marginTop: 6, marginBottom: 4 }}>نوع الطابعة الحالي:</div>
        <Badge tone="gold">{isThermal ? "إيصال حراري 80mm (Xprinter)" : "فاتورة A4 كاملة"}</Badge>
        <div style={{ fontSize: 11, color: C.mt, marginTop: 6 }}>يمكنك تغيير نوع الطابعة من تبويب «الطابعات».</div>
        <Btn gold onClick={() => showToast("تم حفظ تصميم الفاتورة")} style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>✓ حفظ التصميم</Btn>
      </Card>

      {/* LIVE PREVIEW */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.mt, marginBottom: 8, textAlign: "center" }}>معاينة حيّة للفاتورة</div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: isThermal ? 240 : 320, background: "#fff", borderRadius: isThermal ? 6 : 8, boxShadow: "0 8px 30px rgba(0,0,0,.15)", padding: isThermal ? "14px 12px" : "20px 22px", fontFamily: isThermal ? "monospace" : "'Tajawal',sans-serif", color: "#1a1a18", transition: "width .3s" }}>
            {settings.invoiceShowLogo && (
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                {settings.logo ? <img src={settings.logo} alt="" style={{ width: isThermal ? 40 : 54, height: isThermal ? 40 : 54, objectFit: "cover", borderRadius: 8 }} /> : <Crest size={isThermal ? 40 : 54} />}
              </div>
            )}
            <div style={{ textAlign: "center", fontSize: isThermal ? 13 : 16, fontWeight: 700, color: "#1a5c2e" }}>{settings.clubName}</div>
            <div style={{ textAlign: "center", fontSize: isThermal ? 9 : 10, color: "#7a7870", marginBottom: 3 }}>{settings.clubSub}</div>
            <div style={{ textAlign: "center", fontSize: isThermal ? 8.5 : 10, color: "#7a7870" }}>{settings.address} · {settings.phone}</div>
            <div style={{ borderTop: "1px dashed #ccc", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: isThermal ? 9 : 11, color: "#3d3c38" }}><span>فاتورة #INV-1048</span><span>{new Date().toLocaleDateString("ar-LY")}</span></div>
            <div style={{ borderTop: "1px dashed #ccc", margin: "8px 0" }} />
            {[["وقت PS5 × 2", "100"], ["قهوة تركية × 3", "24"], ["Red Bull × 1", "8"]].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: isThermal ? 9.5 : 11.5, marginBottom: 4 }}><span>{r[0]}</span><span>{r[1]} {settings.currency}</span></div>
            ))}
            <div style={{ borderTop: "1px dashed #ccc", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: isThermal ? 12 : 14, fontWeight: 700, color: "#1a5c2e" }}><span>الإجمالي</span><span>132 {settings.currency}</span></div>
            <div style={{ borderTop: "1px dashed #ccc", margin: "8px 0" }} />
            <div style={{ textAlign: "center", fontSize: isThermal ? 8.5 : 10.5, color: "#7a7870", marginTop: 4 }}>{settings.invoiceFooter}</div>
            {isThermal && <div style={{ textAlign: "center", marginTop: 8, letterSpacing: 2, fontSize: 18 }}>▮▏▮▎▏▮▍▏▮</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ ALERTS (overdue payments) ============================ */
function Alerts({ ctx }) {
  const { invoices, customers, showToast, settings } = ctx;
  const cur = settings?.currency || "د.ل";

  // group overdue deferred invoices by customer
  const overdue = invoices.filter(iv => overdueDays(iv) > 0);
  const byCustomer = {};
  overdue.forEach(iv => {
    if (!byCustomer[iv.customer]) byCustomer[iv.customer] = { name: iv.customer, invoices: [], total: 0, maxLate: 0 };
    byCustomer[iv.customer].invoices.push(iv);
    byCustomer[iv.customer].total += iv.total;
    byCustomer[iv.customer].maxLate = Math.max(byCustomer[iv.customer].maxLate, overdueDays(iv));
  });
  const groups = Object.values(byCustomer).sort((a, b) => b.maxLate - a.maxLate);

  const severity = (days) => {
    if (days > 30) return { label: "متأخر جداً", tone: "r", color: "#c0392b" };
    if (days > 14) return { label: "متأخر", tone: "a", color: "#e07b1a" };
    return { label: "قريب التأخير", tone: "a", color: "#c9a84c" };
  };

  const totalOverdue = overdue.reduce((s, iv) => s + iv.total, 0);

  const sendReminder = (group) => {
    const cust = customers.find(c => c.name === group.name);
    if (!cust || !cust.wa) { showToast("لا يوجد رقم واتساب مسجّل لهذا الزبون"); return; }
    const lines = group.invoices.map((iv, i) => `${i + 1}. #${iv.id} — ${fmt(iv.total)} ${cur} — متأخرة ${overdueDays(iv)} يوم`);
    const msg = [
      `🌴 *${settings?.clubName || "نادي النخيل"}* — تذكير بالسداد`,
      `عزيزنا ${group.name}،`,
      "",
      "نودّ تذكيركم بوجود مستحقات متأخرة:",
      ...lines,
      "",
      `*إجمالي المتأخر: ${fmt(group.total)} ${cur}*`,
      "",
      "نرجو التكرم بالسداد في أقرب وقت. شكراً لتعاملكم معنا 🌴",
    ].join("\n");
    window.open(`https://wa.me/${cust.wa}?text=${encodeURIComponent(msg)}`, "_blank");
    showToast(`تم فتح واتساب لتذكير ${group.name}`);
  };

  const remindAll = () => {
    if (!groups.length) return;
    showToast(`سيتم فتح ${groups.length} محادثة واتساب — أكّد كل رسالة`);
    groups.forEach((g, idx) => setTimeout(() => sendReminder(g), idx * 600));
  };

  return (
    <>
      <PageTop title="تنبيهات السداد" action={groups.length > 0 && <Btn gold onClick={remindAll}>📱 تذكير الجميع</Btn>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="فواتير متأخرة" value={overdue.length} sub="بحاجة متابعة" bar={C.red} />
        <KCard label="زبائن متأخرون" value={groups.length} sub="عليهم مستحقات" bar={C.gold} />
        <KCard label="إجمالي المتأخر" value={fmt(totalOverdue)} sub={cur} bar="#e07b1a" />
      </div>

      {groups.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: C.mt }}>
            <div style={{ fontSize: 46, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.grn2 }}>لا توجد مستحقات متأخرة</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>كل الحسابات الآجلة ضمن مواعيد السداد.</div>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {groups.map(g => {
            const sev = severity(g.maxLate);
            return (
              <Card key={g.name} className="nk-card-hover" style={{ borderRight: `4px solid ${sev.color}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: sev.color + "22", color: sev.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>{g.name.slice(0, 1)}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: C.mt }}>{g.invoices.length} فاتورة متأخرة · أقصى تأخير {g.maxLate} يوم</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: sev.color }}>{fmt(g.total)} {cur}</div>
                      <Badge tone={sev.tone}>{sev.label}</Badge>
                    </div>
                    <button onClick={() => sendReminder(g)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: ".5rem .9rem", borderRadius: 9, background: "#25D366", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📱 تذكير</button>
                  </div>
                </div>
                <div style={{ background: C.crm, borderRadius: 9, padding: ".5rem .7rem" }}>
                  {g.invoices.map(iv => (
                    <div key={iv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: ".3rem 0", borderBottom: `0.5px solid ${C.bc}` }}>
                      <span>#{iv.id} — {iv.details}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: C.mt, fontSize: 11 }}>استحقاق {arDate(iv.dueDate || iv.date)}</span>
                        <Badge tone={severity(overdueDays(iv)).tone}>متأخرة {overdueDays(iv)} يوم</Badge>
                        <span style={{ fontWeight: 600, color: C.grn2, minWidth: 60, textAlign: "left" }}>{fmt(iv.total)} {cur}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============================ PROMOTIONS (التخفيضات والعروض) ============================ */
function Promotions({ ctx }) {
  const { promotions, setPromotions, cats, showToast, settings } = ctx;
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const empty = { name: "", cat: "all", pct: "", from: todayISO(), to: "", period: "allday" };
  const [f, setF] = useState(empty);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  const activeNow = promotions.filter(p => promoActiveNow(p));
  const scheduled = promotions.filter(p => p.active && !promoActiveNow(p) && p.to >= todayISO());
  const catName = (k) => k === "all" ? "كل الأقسام" : (cats[k] || CATS[k] || k);

  const openAdd = () => { setEditId(null); setF(empty); setModal(true); };
  const openEdit = (p) => { setEditId(p.id); setF({ name: p.name, cat: p.cat, pct: String(p.pct), from: p.from, to: p.to, period: p.period }); setModal(true); };

  const save = () => {
    if (!f.name.trim()) { showToast("أدخل اسم العرض"); return; }
    const pct = parseInt(f.pct);
    if (!pct || pct < 1 || pct > 90) { showToast("نسبة الخصم يجب أن تكون بين 1 و 90"); return; }
    if (!f.to) { showToast("حدد تاريخ نهاية العرض"); return; }
    if (f.to < f.from) { showToast("تاريخ النهاية قبل البداية"); return; }
    if (editId) {
      setPromotions(ps => ps.map(p => p.id === editId ? { ...p, name: f.name.trim(), cat: f.cat, pct, from: f.from, to: f.to, period: f.period } : p));
      showToast("تم تحديث العرض");
    } else {
      setPromotions(ps => [...ps, { id: Math.max(0, ...ps.map(x => x.id)) + 1, name: f.name.trim(), cat: f.cat, pct, from: f.from, to: f.to, period: f.period, active: true }]);
      showToast("تم إنشاء العرض وتفعيله");
    }
    setModal(false); setEditId(null); setF(empty);
  };
  const toggle = (id) => setPromotions(ps => ps.map(p => p.id === id ? { ...p, active: !p.active } : p));
  const remove = (id) => { setPromotions(ps => ps.filter(p => p.id !== id)); showToast("تم حذف العرض"); };

  const statusOf = (p) => {
    if (!p.active) return { label: "موقوف", tone: "r" };
    if (promoActiveNow(p)) return { label: "فعّال الآن", tone: "g" };
    if (p.from > todayISO()) return { label: "مجدول", tone: "b" };
    if (p.to < todayISO()) return { label: "منتهي", tone: "r" };
    return { label: "خارج الفترة الزمنية", tone: "a" };
  };

  return (
    <>
      <PageTop title="التخفيضات والعروض" action={<Btn gold onClick={openAdd}>+ عرض جديد</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11, marginBottom: "1.1rem" }}>
        <KCard label="عروض فعّالة الآن" value={activeNow.length} sub="تُطبَّق على نقطة البيع" bar="#1a8c3e" />
        <KCard label="عروض مجدولة" value={scheduled.length} sub="قادمة أو خارج فترتها" bar="#2a78d6" />
        <KCard label="إجمالي العروض" value={promotions.length} sub="عرض" bar={C.gold} />
      </div>

      {activeNow.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,#e8f8ee,#fff)", border: "1px solid rgba(26,140,62,.3)", borderRadius: 12, padding: ".7rem 1rem", marginBottom: "1rem", fontSize: 12.5, color: "#1a5c2e" }}>
          🏷 <b>{activeNow.length}</b> عرض فعّال الآن: {activeNow.map(p => `${p.name} (-${p.pct}% على ${catName(p.cat)})`).join(" · ")} — الأسعار المخفّضة تظهر تلقائياً في نقطة البيع.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {promotions.length === 0 && <Card><div style={{ textAlign: "center", padding: "2rem", color: C.mt }}>لا توجد عروض — أنشئ أول عرض تخفيض.</div></Card>}
        {promotions.map(p => {
          const st = statusOf(p);
          return (
            <Card key={p.id} className="nk-card-hover" style={{ borderRight: `4px solid ${st.tone === "g" ? "#1a8c3e" : st.tone === "b" ? "#2a78d6" : st.tone === "r" ? C.red : C.gold}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: C.gold + "18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.gdd }}>-{p.pct}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>{p.name} <Badge tone={st.tone}>{st.label}</Badge></div>
                    <div style={{ fontSize: 11.5, color: C.mt, marginTop: 3 }}>
                      القسم: <b style={{ color: C.k2 }}>{catName(p.cat)}</b> · {PERIOD_ICON[p.period]} {PERIOD_NAME[p.period]}
                    </div>
                    <div style={{ fontSize: 11, color: C.mt, marginTop: 2 }}>من {arDate(p.from)} إلى {arDate(p.to)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div onClick={() => toggle(p.id)} title={p.active ? "إيقاف" : "تفعيل"} style={{ width: 38, height: 20, borderRadius: 10, background: p.active ? C.grl : "#ccc", position: "relative", cursor: "pointer" }}>
                    <div style={{ position: "absolute", width: 16, height: 16, borderRadius: "50%", background: "#fff", top: 2, right: p.active ? 2 : 20, transition: "right .2s" }} />
                  </div>
                  <Btn sm onClick={() => openEdit(p)}>✎ تعديل</Btn>
                  <Btn sm danger onClick={() => remove(p.id)}>حذف</Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={editId ? "تعديل عرض" : "عرض تخفيض جديد"} onClose={() => setModal(false)} width={480}>
          <Field label="اسم العرض *"><Inp value={f.name} onChange={e => set("name", e.target.value)} placeholder="مثال: عرض عيد الفطر — ألعاب" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="القسم المستهدف">
              <Sel value={f.cat} onChange={e => set("cat", e.target.value)}>
                <option value="all">كل الأقسام</option>
                {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Sel>
            </Field>
            <Field label="نسبة الخصم % *"><Inp type="number" value={f.pct} onChange={e => set("pct", e.target.value)} placeholder="20" min="1" max="90" /></Field>
            <Field label="من تاريخ"><Inp type="date" value={f.from} onChange={e => set("from", e.target.value)} /></Field>
            <Field label="إلى تاريخ *"><Inp type="date" value={f.to} onChange={e => set("to", e.target.value)} /></Field>
          </div>
          <Field label="الفترة الزمنية للتطبيق" full>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
              {["morning", "evening", "allday"].map(pr => (
                <div key={pr} onClick={() => set("period", pr)} style={{ border: `1.5px solid ${f.period === pr ? C.gold : C.bc}`, borderRadius: 10, padding: ".6rem .4rem", textAlign: "center", cursor: "pointer", background: f.period === pr ? C.gold + "14" : C.crm }}>
                  <div style={{ fontSize: 20 }}>{PERIOD_ICON[pr]}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 3 }}>{pr === "morning" ? "صباحية" : pr === "evening" ? "مسائية" : "كامل اليوم"}</div>
                  <div style={{ fontSize: 9, color: C.mt }}>{pr === "morning" ? "6ص – 4م" : pr === "evening" ? "4م – 12م" : "24 ساعة"}</div>
                </div>
              ))}
            </div>
          </Field>
          {f.pct && <div style={{ background: "rgba(26,140,62,.07)", border: "0.5px solid rgba(26,140,62,.2)", borderRadius: 8, padding: ".55rem .8rem", margin: ".3rem 0 .7rem", fontSize: 12, color: "#1a5c2e" }}>مثال: منتج سعره 50 → يصبح <b>{fmt(50 * (1 - (parseInt(f.pct) || 0) / 100))}</b> خلال فترة العرض</div>}
          <div style={{ display: "flex", gap: 8 }}><Btn gold onClick={save} style={{ flex: 1, justifyContent: "center" }}>✓ {editId ? "حفظ التعديل" : "إنشاء وتفعيل"}</Btn><Btn onClick={() => setModal(false)}>إلغاء</Btn></div>
        </Modal>
      )}
    </>
  );
}
