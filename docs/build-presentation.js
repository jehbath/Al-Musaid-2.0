// Al-Musaid 2.0 presentation (Arabic, RTL) — built with pptxgenjs
const path = require("path");
const pptxgen = require("pptxgenjs");

const SKILL =
  "C:/Users/Wolf2/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/local-agent-mode-sessions/skills-plugin/2cc5e888-911d-476d-836b-7ad25d80e546/988c7762-2e0c-49e3-a689-087abbd1332c/skills/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const OUT = process.argv[2] || "Al-Musaid-2.0.pptx";

// ===================== THEME (same greens as the app UI) =====================
const THEME = {
  name: "Al-Musaid Green",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: "192B32", // main text
    lt1: "FFFFFF",
    dk2: "073F35", // deep green (titles, dark slides)
    lt2: "EFF7F2", // light green tint (cards)
    accent1: "147D68", // primary green
    accent2: "0D6555", // dark green
    accent3: "5FD3B0", // mint (on dark)
    accent4: "D9822B", // amber (warnings / highlights)
    accent5: "C62828", // red (blocked)
    accent6: "6B7C80", // muted gray
    hlink: "147D68",
    folHlink: "0D6555",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.rtlMode = true;
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "المساعد 2.0 – مساعد بنكي ذكي";
pres.author = "Al-Musaid 2.0";

const C = pres.SchemeColor;
const W = 13.333;
const MX = 0.6; // horizontal margin
const CW = W - 2 * MX; // content width

const CODE = "Courier New";

// ===================== LAYOUTS =====================
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text2 },
  objects: [
    {
      placeholder: {
        options: {
          name: "title", type: "title", x: MX, y: 2.2, w: CW, h: 1.3,
          fontSize: 54, bold: true, color: C.background1, align: "right", valign: "middle", fontFace: "Arial",
        },
        text: "",
      },
    },
    {
      placeholder: {
        options: {
          name: "body", type: "body", x: MX, y: 3.6, w: CW, h: 1.0,
          fontSize: 24, color: C.accent3, align: "right", valign: "top", fontFace: "Arial",
        },
        text: "",
      },
    },
  ],
});

pres.defineSlideMaster({
  title: "SECTION_DARK",
  background: { color: C.accent2 },
  objects: [
    {
      placeholder: {
        options: {
          name: "title", type: "title", x: MX, y: 2.6, w: CW, h: 1.2,
          fontSize: 44, bold: true, color: C.background1, align: "right", valign: "middle", fontFace: "Arial",
        },
        text: "",
      },
    },
    {
      placeholder: {
        options: {
          name: "body", type: "body", x: MX, y: 3.85, w: CW, h: 0.9,
          fontSize: 22, color: C.accent3, align: "right", valign: "top", fontFace: "Arial",
        },
        text: "",
      },
    },
  ],
  slideNumber: { x: MX, y: 6.95, w: 0.6, h: 0.35, fontSize: 11, color: C.accent3 },
});

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  objects: [
    {
      placeholder: {
        options: {
          name: "title", type: "title", x: MX, y: 0.3, w: CW, h: 0.85,
          fontSize: 32, bold: true, color: C.text2, align: "right", valign: "middle", fontFace: "Arial",
        },
        text: "",
      },
    },
    {
      text: {
        text: "المساعد 2.0",
        options: { x: 10.7, y: 6.98, w: 2.0, h: 0.32, fontSize: 10, color: C.accent6, align: "right", rtlMode: true, lang: "ar-SA" },
      },
    },
  ],
  slideNumber: { x: MX, y: 6.98, w: 0.6, h: 0.32, fontSize: 10, color: C.accent6 },
});

// ===================== HELPERS =====================
let objId = 0;
const nm = (p) => `${p}-${++objId}`;

const HAS_ARABIC = /[؀-ۿ]/;
const LATIN_SEG = /([A-Za-z][A-Za-z0-9_.@$\/\-]*(?:[ ]+[A-Za-z0-9][A-Za-z0-9_.@$\/\-]*)*)/g;

// Split an Arabic run that contains English words into separate runs, so each
// English segment (e.g. "Argon2", "MCP") is laid out left-to-right with its digits.
function splitMixed(run) {
  const t = String(run.text);
  const o = run.options || {};
  if (o.lang === "en-US" || !HAS_ARABIC.test(t) || !/[A-Za-z]/.test(t)) return [run];
  const parts = t.split(LATIN_SEG).filter((p) => p !== "");
  return parts.map((p, i) => {
    const opts = { ...o, lang: /^[A-Za-z]/.test(p) ? "en-US" : o.lang };
    if (i < parts.length - 1) delete opts.breakLine;
    return { text: p, options: opts };
  });
}

function text(slide, value, o) {
  o = { ...(o || {}) };

  // A plain string with no Arabic letters (e.g. "Argon2") is laid out left-to-right
  if (typeof value === "string" && !HAS_ARABIC.test(value) && o.rtlMode === undefined) {
    o.rtlMode = false;
  }

  // Arabic string with English words -> runs (handled by the array path below)
  if (typeof value === "string" && HAS_ARABIC.test(value) && /[A-Za-z]/.test(value)) {
    value = [{ text: value, options: {} }];
  }

  // Pure English/code boxes (rtlMode: false) stay left-to-right
  if (o.rtlMode === false && !o.lang) o.lang = "en-US";

  // Paragraph direction must be on every run/paragraph, not only on the box
  if (Array.isArray(value)) {
    const rtl = o.rtlMode ?? true;
    value = value.map((r) => ({
      ...r,
      options: {
        rtlMode: rtl,
        align: o.align ?? (rtl ? "right" : "left"),
        lang: rtl ? "ar-SA" : "en-US",
        ...(r.options || {}),
      },
    })).flatMap(splitMixed);
  }

  slide.addText(value, Object.assign(
    { isTextBox: true, fontFace: "Arial", rtlMode: true, lang: "ar-SA", align: "right", valign: "top", margin: 0.04, color: C.text1, objectName: nm("text") },
    o
  ));
}

function shadow() {
  return { type: "outer", color: "0D3B33", opacity: 0.12, blur: 6, offset: 2, angle: 90 };
}

function box(slide, x, y, w, h, o = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.radius ?? 0.12,
    fill: { color: o.fill ?? C.background2, transparency: o.transparency ?? 0 },
    line: o.line ? { color: o.line, width: o.lineWidth ?? 1.25 } : { type: "none" },
    shadow: o.shadow === false ? undefined : shadow(),
    objectName: nm(o.name ?? "box"),
  });
}

function circle(slide, x, y, d, label, o = {}) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: d, h: d, fill: { color: o.fill ?? C.accent1 }, line: { type: "none" },
    objectName: nm("circle"),
  });
  slide.addText(String(label), {
    isTextBox: true, x, y, w: d, h: d, align: "center", valign: "middle", margin: 0,
    fontSize: o.size ?? 16, bold: true, color: o.color ?? C.background1, objectName: nm("circle-label"),
  });
}

// Card: optional emoji circle on the right, title, body
function card(slide, { x, y, w, h, title, body, emoji, fill, titleColor, bodySize = 13, titleSize = 17, line }) {
  box(slide, x, y, w, h, { fill: fill ?? C.background2, line, name: "card" });
  let tx = x + 0.2;
  let tw = w - 0.4;
  if (emoji) {
    circle(slide, x + w - 0.78, y + 0.2, 0.58, emoji, { fill: C.background1, color: C.text2, size: 20 });
    tw = w - 1.15;
  }
  text(slide, title, {
    x: tx, y: y + 0.2, w: tw, h: 0.58, fontSize: titleSize, bold: true,
    color: titleColor ?? C.text2, valign: "middle",
  });
  if (body) {
    const content = Array.isArray(body)
      ? body.map((line, i) => ({ text: line, options: { bullet: true, breakLine: i < body.length - 1 } }))
      : body;
    text(slide, content, {
      x: x + 0.2, y: y + 0.85, w: w - 0.4, h: h - 1.0, fontSize: bodySize, color: C.text1,
      paraSpaceAfter: 4,
    });
  }
}

// Arrow: horizontal (dir "left" | "right") or vertical ("down")
function arrow(slide, x, y, len, dir = "left", color = C.accent1) {
  const line = { color, width: 2 };
  if (dir === "left") {
    slide.addShape(pres.shapes.LINE, { x, y, w: len, h: 0, line: { ...line, beginArrowType: "triangle" }, objectName: nm("arrow") });
  } else if (dir === "right") {
    slide.addShape(pres.shapes.LINE, { x, y, w: len, h: 0, line: { ...line, endArrowType: "triangle" }, objectName: nm("arrow") });
  } else {
    slide.addShape(pres.shapes.LINE, { x, y, w: 0, h: len, line: { ...line, endArrowType: "triangle" }, objectName: nm("arrow") });
  }
}

// Mixed run: Arabic text + inline code
function runs(parts, base = {}) {
  // A line made only of English/code text is laid out left-to-right in code font
  if (parts.length === 1 && typeof parts[0] === "string" && !HAS_ARABIC.test(parts[0])) {
    return [{ text: parts[0], options: { align: "right", ...base, rtlMode: false, lang: "en-US", fontFace: CODE, color: base.codeColor ?? C.accent2 } }];
  }
  if (parts.length === 1 && typeof parts[0] !== "string") {
    return [{ text: parts[0].code, options: { align: "right", ...base, rtlMode: false, lang: "en-US", fontFace: CODE, color: base.codeColor ?? C.accent2, bold: true } }];
  }
  return parts.map((p, i) => {
    if (typeof p === "string") {
      // spaces next to a code run are carried by the code run (see below)
      let t = p;
      // the space at a code boundary is carried by the Arabic run (non-breaking)
      if (i > 0 && typeof parts[i - 1] !== "string") t = " " + t.replace(/^\s+/, "");
      if (i < parts.length - 1 && typeof parts[i + 1] !== "string") t = t.replace(/\s+$/, "") + " ";
      return { text: t, options: { fontFace: "Arial", lang: "ar-SA", rtlMode: true, align: "right", ...base } };
    }
    const pad = " ";
    const code = p.code;
    return { text: code, options: { rtlMode: true, align: "right", ...base, lang: "en-US", fontFace: CODE, color: base.codeColor ?? C.accent2, bold: true } };
  });
}

// Numbered flow. steps: [{ t, d, tone }] ; tone: ok | block | warn
function flow(slide, steps, { x0 = MX, y0 = 1.4, totalW = CW, cols, rowH = 0.74, gapY = 0.07, gapX = 0.4 } = {}) {
  const nCols = cols ?? (steps.length > 7 ? 2 : 1);
  const perCol = Math.ceil(steps.length / nCols);
  const colW = (totalW - gapX * (nCols - 1)) / nCols;

  steps.forEach((s, i) => {
    const c = Math.floor(i / perCol);
    const r = i % perCol;
    const colX = x0 + totalW - (c + 1) * colW - c * gapX; // first column on the right
    const y = y0 + r * (rowH + gapY);

    const tone = s.tone ?? "ok";
    const fill = tone === "block" ? C.accent5 : tone === "warn" ? C.accent4 : C.background2;
    const transparency = tone === "ok" ? 0 : 88;
    box(slide, colX, y, colW, rowH, { fill, transparency, shadow: false, radius: 0.1, name: "step" });

    const circleFill = tone === "block" ? C.accent5 : tone === "warn" ? C.accent4 : C.accent1;
    circle(slide, colX + colW - 0.62, y + (rowH - 0.46) / 2, 0.46, i + 1, { fill: circleFill, size: 14 });

    const content = [
      ...runs(Array.isArray(s.t) ? s.t : [s.t], { fontSize: 15, bold: true, color: C.text2 }),
    ];
    if (s.d) {
      content[content.length - 1].options.breakLine = true;
      content.push(...runs(Array.isArray(s.d) ? s.d : [s.d], { fontSize: 12, color: C.text1 }));
    }
    text(slide, content, {
      x: colX + 0.15, y: y + 0.04, w: colW - 0.85, h: rowH - 0.08, valign: "middle",
    });
  });
}

function contentSlide(section, title) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(splitMixed({ text: title, options: { rtlMode: true, lang: "ar-SA", align: "right" } }), { placeholder: "title", rtlMode: true, lang: "ar-SA" });
  return s;
}

function sectionSlide(section, title, subtitle) {
  pres.addSection({ title: section });
  const s = pres.addSlide({ masterName: "SECTION_DARK", sectionTitle: section });
  s.addText(title, { placeholder: "title", rtlMode: true, lang: "ar-SA" });
  if (subtitle) s.addText(subtitle, { placeholder: "body", rtlMode: true, lang: "ar-SA" });
  return s;
}

// Simple RTL table: columns given right-to-left, written left-to-right
function rtlTable(slide, headers, rows, { x = MX, y = 1.45, w = CW, colW, fontSize = 13, rowH = 0.55 } = {}) {
  const head = [...headers].reverse().map((h) => ({
    text: h,
    options: { bold: true, color: C.background1, fill: { color: C.accent1 }, align: "right", rtlMode: true, lang: "ar-SA", fontSize: fontSize + 1, valign: "middle" },
  }));
  const body = rows.map((row, ri) =>
    [...row].reverse().map((cell) => {
      const isCode = typeof cell === "object" && cell !== null && cell.code;
      return {
        text: isCode ? cell.code : splitMixed({ text: String(cell), options: { lang: "ar-SA", rtlMode: true, align: "right" } }),
        options: {
          align: isCode ? "left" : "right", rtlMode: !isCode, lang: isCode ? "en-US" : "ar-SA", fontSize: isCode ? fontSize - 1 : fontSize,
          fontFace: isCode ? CODE : undefined, bold: !!isCode, color: isCode ? C.accent2 : C.text1,
          fill: { color: ri % 2 === 0 ? C.background1 : C.background2 }, valign: "middle",
        },
      };
    })
  );
  slide.addTable([head, ...body], {
    x, y, w, colW: colW ? [...colW].reverse() : undefined, rowH,
    border: { type: "solid", pt: 0.75, color: "D7E6DF" }, margin: [0.05, 0.12, 0.05, 0.12],
    objectName: nm("table"),
  });
}

// ===================== SLIDES =====================

// ---------- 1. Title ----------
pres.addSection({ title: "الفكرة" });
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "الفكرة" });
  s.addText("المساعد 2.0", { placeholder: "title", rtlMode: true, lang: "ar-SA" });
  s.addText("مساعد بنكي ذكي يعرفك ويفهم احتياجاتك", { placeholder: "body", rtlMode: true, lang: "ar-SA" });
  text(s, "React  ·  FastAPI  ·  Gemini  ·  MCP  ·  RAG", {
    x: MX, y: 5.6, w: CW, h: 0.5, fontSize: 16, color: C.background1, rtlMode: false,
  });
  s.addNotes(
    "تعريف بالمشروع: المساعد 2.0 مساعد بنكي ذكي باللغة العربية. " +
    "الفكرة الأساسية أنه لا يجيب إجابات عامة فقط، بل يعرف المستخدم بعد تسجيل الدخول: رصيده ومعاملاته ومصروفاته وموقعه، ويتكلم بلهجته."
  );
}

// ---------- 2. What makes it different ----------
{
  const s = contentSlide("الفكرة", "ما الذي يميّز المساعد 2.0؟");
  const colW = (CW - 0.5) / 2;
  const xRight = MX + colW + 0.5;
  const xLeft = MX;

  // Traditional (right)
  box(s, xRight, 1.45, colW, 5.3, { fill: C.background1, line: "DCE7E3", name: "col-old" });
  text(s, "المساعدات البنكية التقليدية", { x: xRight + 0.3, y: 1.65, w: colW - 0.6, h: 0.55, fontSize: 21, bold: true, color: C.accent6 });
  text(s, [
    { text: "إجابات عامة وثابتة لكل العملاء", options: { bullet: true, breakLine: true } },
    { text: "لا تعرف رصيدك أو معاملاتك", options: { bullet: true, breakLine: true } },
    { text: "لا تعرف موقعك", options: { bullet: true, breakLine: true } },
    { text: "قوائم وأزرار محددة مسبقًا", options: { bullet: true, breakLine: true } },
    { text: "لا تتذكر ما قلته قبل قليل", options: { bullet: true, breakLine: true } },
    { text: "لغة رسمية واحدة", options: { bullet: true } },
  ], { x: xRight + 0.3, y: 2.35, w: colW - 0.6, h: 4.2, fontSize: 17, color: C.text1, paraSpaceAfter: 12 });

  // Al-Musaid (left)
  box(s, xLeft, 1.45, colW, 5.3, { fill: C.accent1, name: "col-new" });
  text(s, "المساعد 2.0", { x: xLeft + 0.3, y: 1.65, w: colW - 0.6, h: 0.55, fontSize: 21, bold: true, color: C.background1 });
  text(s, [
    { text: "يعرف رصيدك وحساباتك بعد تسجيل الدخول", options: { bullet: true, breakLine: true } },
    { text: "يحلل مصروفاتك وينصحك كيف توفر", options: { bullet: true, breakLine: true } },
    { text: "يعرف موقعك ويرشدك لأقرب فرع وصراف", options: { bullet: true, breakLine: true } },
    { text: "تكلّمه بلغتك الطبيعية، ويفهم القصد", options: { bullet: true, breakLine: true } },
    { text: "يتذكر سياق المحادثة والأرقام السابقة", options: { bullet: true, breakLine: true } },
    { text: "يرد بلهجتك: سوداني، مصري، سعودي، شامي", options: { bullet: true } },
  ], { x: xLeft + 0.3, y: 2.35, w: colW - 0.6, h: 4.2, fontSize: 17, color: C.background1, paraSpaceAfter: 12 });

  s.addNotes(
    "المقارنة توضح الفرق: المساعد التقليدي يعطي نفس الإجابة للجميع. " +
    "المساعد 2.0 مرتبط ببيانات المستخدم الحقيقية (بعد تسجيل الدخول) وبموقعه، ويفهم اللغة الطبيعية واللهجات، ويتذكر المحادثة."
  );
}

// ---------- 3. Capabilities ----------
{
  const s = contentSlide("الفكرة", "ماذا يستطيع المساعد أن يفعل؟");
  const items = [
    ["💰", "الرصيد والحسابات", "يعرض كل حساباتك والإجمالي"],
    ["🧾", "المعاملات", "آخر العمليات والبحث بالفئة أو المتجر"],
    ["📊", "تحليل المصروفات", "توزيع الفئات وأكبر العمليات والمقارنة بين الأشهر"],
    ["💡", "نصائح التوفير", "فرص توفير محسوبة من بياناتك الحقيقية"],
    ["📍", "الموقع", "أقرب فرع وصراف آلي مع خريطة ورابط خرائط Google"],
    ["💱", "العملات", "تحويل بأسعار صرف حقيقية"],
    ["📚", "المعرفة البنكية", "إجابات من مستندات البنك (RAG)"],
    ["🧮", "حسابات افتراضية", "مثل: لو وفرت 40% كم أوفر؟"],
  ];
  const cols = 4;
  const gap = 0.3;
  const cw = (CW - gap * (cols - 1)) / cols;
  const ch = 2.15;
  items.forEach(([e, t, b], i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = MX + CW - (c + 1) * cw - c * gap;
    const y = 1.75 + r * (ch + 0.4);
    card(s, { x, y, w: cw, h: ch, emoji: e, title: t, body: b, bodySize: 14, titleSize: 16 });
  });
  s.addNotes(
    "ثمانية قدرات رئيسية. الأربعة الأولى تحتاج تسجيل دخول لأنها بيانات شخصية. " +
    "الموقع والعملات والمعرفة البنكية متاحة للزائر أيضًا. الحسابات الافتراضية تُنفذ في الـBackend بدقة ولا تغيّر الرصيد الحقيقي."
  );
}

// ---------- 3b. Demo video ----------
{
  const s = contentSlide("الفكرة", "جولة سريعة: الخدمات داخل التطبيق");
  const vw = 8.3, vh = vw * 760 / 1280;
  const vx = MX, vy = 1.35;
  box(s, vx - 0.06, vy - 0.06, vw + 0.12, vh + 0.12, { fill: C.background2, name: "video-frame" });
  s.addMedia({
    type: "video", path: path.join(__dirname, "media", "demo-services.mp4"),
    cover: "image/png;base64," + require("fs").readFileSync(path.join(__dirname, "media", "demo-poster.png")).toString("base64"),
    x: vx, y: vy, w: vw, h: vh, objectName: nm("demo-video"),
  });
  const rx = vx + vw + 0.35, rw = W - MX - rx;
  const items = [
    ["💰", "الرصيد", "«كم رصيدي؟» حساباتك والإجمالي"],
    ["📍", "أقرب فرع", "الاسم والمسافة وخريطة تفتح خرائط Google"],
    ["📊", "تحليل وتوفير", "مصروفات أكتوبر وفرص التوفير"],
    ["📚", "سؤال بنكي عام", "«ما هي المرابحة؟» من مستندات البنك"],
  ];
  items.forEach(([e, t, b], i) => {
    card(s, { x: rx, y: vy + i * 1.27, w: rw, h: 1.15, emoji: e, title: t, body: b, bodySize: 12, titleSize: 15 });
  });
  text(s, "تسجيل حقيقي من التطبيق (العميل التجريبي خالد)، مع اختصار وقت انتظار الرد فقط", {
    x: vx, y: vy + vh + 0.15, w: vw, h: 0.4, fontSize: 12, color: C.accent6, align: "center",
  });
  s.addNotes(
    "فيديو حقيقي من التطبيق: تسجيل الدخول بحساب خالد ثم أربع خدمات: الرصيد، أقرب فرع مع الخريطة وزر خرائط Google، " +
    "تحليل المصروفات ونصائح التوفير، وسؤال بنكي عام يُجاب من مستندات البنك. تم اختصار فترات انتظار رد Gemini فقط."
  );
}

// ---------- 4. Architecture ----------
pres.addSection({ title: "المعمارية وتدفق البيانات" });
{
  const s = contentSlide("المعمارية وتدفق البيانات", "مكوّنات النظام");

  // Top row (right -> left): Frontend -> FastAPI -> Assistant
  const topY = 1.45, topH = 1.15;
  const bw = 3.3;
  const xFront = MX + CW - bw;
  const xApi = MX + (CW - bw) / 2;
  const xAsst = MX;
  card(s, { x: xFront, y: topY, w: bw, h: topH, emoji: "🖥️", title: "الواجهة", body: "المتصفح (React)", bodySize: 12, titleSize: 17 });
  card(s, { x: xApi, y: topY, w: bw, h: topH, emoji: "⚙️", title: "FastAPI", body: "المسارات والمصادقة", bodySize: 12, titleSize: 17 });
  card(s, { x: xAsst, y: topY, w: bw, h: topH, emoji: "🤖", title: "Assistant", body: "العقل المنسّق", bodySize: 12, titleSize: 17, fill: C.accent1, titleColor: C.background1 });
  arrow(s, xApi + bw + 0.1, topY + topH / 2, xFront - (xApi + bw) - 0.2, "left");
  arrow(s, xAsst + bw + 0.1, topY + topH / 2, xApi - (xAsst + bw) - 0.2, "left");
  text(s, [{ code: "POST /chat" }].map((p) => ({ text: p.code, options: { fontFace: CODE, bold: true, color: C.accent2 } })), {
    x: xApi + bw + 0.05, y: topY + topH / 2 - 0.45, w: xFront - (xApi + bw) - 0.1, h: 0.35, fontSize: 11, align: "center", rtlMode: false,
  });

  // Bus from Assistant down to 4 services
  const busY = 3.05;
  const svcY = 3.4, svcH = 1.55;
  const sw = (CW - 3 * 0.37) / 4;
  const xs = [0, 1, 2, 3].map((i) => MX + CW - (i + 1) * sw - i * 0.37); // right -> left
  s.addShape(pres.shapes.LINE, { x: xAsst + bw / 2, y: topY + topH, w: 0, h: busY - (topY + topH), line: { color: C.accent1, width: 2 }, objectName: nm("bus") });
  s.addShape(pres.shapes.LINE, { x: xs[3] + sw / 2, y: busY, w: xs[0] + sw / 2 - (xs[3] + sw / 2), h: 0, line: { color: C.accent1, width: 2 }, objectName: nm("bus") });
  xs.forEach((x) => arrow(s, x + sw / 2, busY, svcY - busY - 0.02, "down"));

  const svcs = [
    ["🧠", "Google Gemini", "يقرر الإجراء ويصيغ الرد بالعربية"],
    ["🔌", "خوادم MCP", "البنك · العملات · الموقع"],
    ["📚", "RAG", "البحث في مستندات البنك"],
    ["💬", "الذاكرة", "الرسائل والملخص وحالة المحادثة"],
  ];
  svcs.forEach(([e, t, b], i) => card(s, { x: xs[i], y: svcY, w: sw, h: svcH, emoji: e, title: t, body: b, bodySize: 12, titleSize: 16 }));

  // Data stores under services
  const dbY = 5.45, dbH = 0.95;
  const stores = [
    [0, "Google API", "خدمة خارجية"],
    [1, "bank.db", "المستخدمون والحسابات والمعاملات"],
    [2, "banking_faq.md", "قاعدة المعرفة"],
    [3, "memory.db", "المحادثات والرسائل"],
  ];
  stores.forEach(([i, code, label]) => {
    arrow(s, xs[i] + sw / 2, svcY + svcH, dbY - (svcY + svcH) - 0.02, "down", C.accent6);
    box(s, xs[i], dbY, sw, dbH, { fill: C.background1, line: "CFE5DA", shadow: false, name: "store" });
    text(s, code, { x: xs[i] + 0.12, y: dbY + 0.08, w: sw - 0.24, h: 0.4, fontSize: 14, bold: true, fontFace: CODE, color: C.accent2, align: "center", rtlMode: false, lang: "en-US" });
    text(s, label, { x: xs[i] + 0.12, y: dbY + 0.5, w: sw - 0.24, h: 0.38, fontSize: 12, align: "center", color: C.text1 });
  });

  s.addNotes(
    "الواجهة (React) ترسل الرسالة إلى FastAPI عبر POST /chat. FastAPI يتحقق من الهوية ثم يسلّم الرسالة إلى Assistant. " +
    "Assistant هو المنسّق: يسأل Gemini عن الإجراء المناسب، ثم يستدعي خوادم MCP (البنك، العملات، الموقع) أو RAG أو الذاكرة، ثم يعيد النتيجة لـGemini ليصيغ الرد. " +
    "قاعدتا بيانات: bank.db للبيانات البنكية، وmemory.db للمحادثات."
  );
}

// ---------- 5. General data flow ----------
{
  const s = contentSlide("المعمارية وتدفق البيانات", "تدفق البيانات العام: من الرسالة إلى الرد");
  flow(s, [
    { t: "المستخدم يكتب رسالته", d: "في الواجهة، أو يضغط على اقتراح جاهز" },
    { t: ["الواجهة ترسل ", { code: "POST /chat" }], d: "الرسالة + رقم المحادثة + الـToken إن وُجد" },
    { t: "التحقق من الهوية وملكية المحادثة", d: "من أنت؟ وهل هذه المحادثة لك؟" },
    { t: "تحميل ذاكرة المحادثة", d: "الملخص + آخر الرسائل + الحالة المحفوظة" },
    { t: "Gemini يقرر الإجراء", d: "رد مباشر؟ أداة؟ معرفة بنكية؟ عملية حسابية؟" },
    { t: "التنفيذ", d: "أداة MCP أو RAG أو حساب في الـBackend" },
    { t: "Gemini يصيغ الرد", d: "بالعربية وبلهجة المستخدم وبتنسيق مرتب" },
    { t: "الحفظ والإرسال", d: "حفظ السؤال والرد ثم عرضه في الواجهة" },
  ], { rowH: 1.05, gapY: 0.18 });
  s.addNotes(
    "هذه الصورة العامة لأي رسالة. ابدأ من اليمين: الخطوات 1 إلى 4 تجهيز (إرسال، تحقق، ذاكرة)، " +
    "ثم 5 إلى 8: Gemini يقرر، النظام ينفذ، Gemini يصيغ، ثم الحفظ والعرض."
  );
}

// ---------- 6. Gemini actions ----------
{
  const s = contentSlide("المعمارية وتدفق البيانات", "كيف يقرر Gemini؟ أنواع الإجراءات");
  const acts = [
    ["response", "رد مباشر", "تحية أو شكر، أو اعتذار عن سؤال غير بنكي"],
    ["knowledge", "معرفة بنكية", "سؤال عام ← البحث في مستندات البنك (RAG)"],
    ["tool", "أداة واحدة", "مثال: كم رصيدي؟ ← get_account_balance"],
    ["tools", "عدة أدوات", "مثال: رصيدي وكم يساوي بالدولار؟"],
    ["calculation", "عملية حسابية", "«لو وفرت 70% من المطاعم» ← يحسبها الـBackend"],
    ["location_required", "طلب الموقع", "أقرب فرع أو صراف ← المتصفح يرسل الموقع"],
  ];
  const cols = 3, gap = 0.3;
  const cw = (CW - gap * (cols - 1)) / cols;
  const ch = 2.0;
  acts.forEach(([code, t, b], i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = MX + CW - (c + 1) * cw - c * gap;
    const y = 1.45 + r * (ch + 0.28);
    box(s, x, y, cw, ch, { name: "action" });
    text(s, code, { x: x + 0.2, y: y + 0.18, w: cw - 0.4, h: 0.4, fontSize: 13, fontFace: CODE, bold: true, color: C.accent1, rtlMode: false, lang: "en-US" });
    text(s, t, { x: x + 0.2, y: y + 0.58, w: cw - 0.4, h: 0.48, fontSize: 18, bold: true, color: C.text2 });
    text(s, b, { x: x + 0.2, y: y + 1.08, w: cw - 0.4, h: 0.8, fontSize: 13 });
  });
  box(s, MX, 6.05, CW, 0.7, { fill: C.text2, shadow: false, name: "rule" });
  text(s, "Gemini يختار الإجراء فقط — والـBackend هو من يتحقق من الصلاحيات وينفّذ ويحسب الأرقام", {
    x: MX + 0.3, y: 6.1, w: CW - 0.6, h: 0.6, fontSize: 16, bold: true, color: C.background1, valign: "middle", align: "center",
  });
  s.addNotes(
    "Gemini يرجع قرارًا بصيغة JSON من ستة أنواع. مهم جدًا: Gemini لا ينفذ شيئًا بنفسه ولا يقرر الصلاحيات. " +
    "الـBackend يتحقق ثم ينفذ. والأرقام في العمليات الحسابية يحسبها الكود وليس النموذج، حتى تكون دقيقة."
  );
}

// ---------- 7. Smart replies ----------
{
  const s = contentSlide("المعمارية وتدفق البيانات", "ذكاء الرد: اللهجة والنطاق والذاكرة");
  const items = [
    ["🗣️", "يرد بلهجتك", "سوداني، مصري، سعودي، شامي أو فصحى — مع البقاء مهنيًا ورفض المزاح"],
    ["🚫", "بنكي فقط", "يرفض الأسئلة الخارجة بلطف ويجيب عن الجزء البنكي فقط"],
    ["🧠", "يتذكر المحادثة", "ملخص للرسائل القديمة + حالة منظمة للأرقام (الرصيد، التحليل، الحسابات)"],
    ["📅", "يعرف تاريخ اليوم", "يفهم «أكتوبر» و«الشهر الماضي» بالسنة الصحيحة"],
    ["🙋", "يخاطبك باسمك", "«رصيدك يا سارة هو…» بعد تسجيل الدخول"],
    ["🧾", "رد مرتب", "أسطر منفصلة ونقاط وعناوين ومبالغ بخط عريض"],
  ];
  const cols = 3, gap = 0.3;
  const cw = (CW - gap * (cols - 1)) / cols;
  const ch = 2.2;
  items.forEach(([e, t, b], i) => {
    const r = Math.floor(i / cols), c = i % cols;
    card(s, { x: MX + CW - (c + 1) * cw - c * gap, y: 1.7 + r * (ch + 0.4), w: cw, h: ch, emoji: e, title: t, body: b, bodySize: 15 });
  });
  s.addNotes(
    "قواعد تُرسل لـGemini مع كل طلب: اللهجة، النطاق البنكي، التنسيق. " +
    "الذاكرة: آخر الرسائل + ملخص للقديمة + حالة منظمة تحفظ الأرقام الحقيقية حتى لا يخلط بين الرصيد الحقيقي والحساب الافتراضي."
  );
}

// ---------- 8. Section: Auth ----------
sectionSlide("تسجيل الدخول والمصادقة", "تسجيل الدخول والمصادقة", "من أنت؟ وما الذي يحق لك رؤيته؟")
  .addNotes("ننتقل الآن إلى أهم جزء أمنيًا: كيف يتحول المساعد من مستخدم واحد إلى عدة مستخدمين، كل واحد يرى بياناته فقط.");

// ---------- 9. Concepts ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "المفاهيم الأساسية");
  const items = [
    ["🔐", "Argon2", ["تشفير كلمة المرور باتجاه واحد", "لا يمكن عكسه", "بطيء عمدًا ضد التخمين", "إضافة Salt عشوائي لكل كلمة"]],
    ["🎫", "Token", ["تذكرة دخول مؤقتة بعد تسجيل الدخول", "مثل بطاقة غرفة الفندق", "بدل إرسال كلمة المرور كل مرة", "صالحة لمدة 30 دقيقة"]],
    ["📜", "JWT", ["نوع الـToken المستخدم في المشروع", "ثلاثة أجزاء: Header و Payload و Signature", "موقّع بمفتاح سري في الخادم", "مقروء لكن لا يمكن تعديله"]],
    ["🏷️", "Bearer", ["طريقة إرسال الـToken مع كل طلب", "في الـHeader المسمى Authorization", "«من يحمله يُعامل كصاحبه»", "لذلك يجب حمايته"]],
  ];
  const cols = 4, gap = 0.3;
  const cw = (CW - gap * (cols - 1)) / cols;
  items.forEach(([e, t, b], i) => {
    card(s, { x: MX + CW - (i + 1) * cw - i * gap, y: 1.45, w: cw, h: 3.75, emoji: e, title: t, body: b, bodySize: 15, titleSize: 20 });
  });
  box(s, MX, 6.05, CW, 0.7, { fill: C.background1, line: "CFE5DA", shadow: false, name: "header-example" });
  text(s, "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0In0.9fQ2kL8x...", {
    x: MX + 0.3, y: 6.1, w: CW - 0.6, h: 0.6, fontSize: 15, fontFace: CODE, bold: true, color: C.accent2, rtlMode: false, align: "center", valign: "middle",
  });
  s.addNotes(
    "Argon2 لحماية كلمة المرور المخزنة. الـToken تذكرة مؤقتة تثبت الهوية. JWT هو شكل هذه التذكرة: ثلاثة أجزاء والأخير توقيع. " +
    "Bearer تعني «الحامل»: نرسل التذكرة في الـHeader كما في السطر السفلي."
  );
}

// ---------- 10. Argon2 ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "Argon2: لماذا لا نخزن كلمة المرور؟");
  const y = 1.6, h = 1.2;
  box(s, 9.4, y, 3.33, h, { fill: C.background2, name: "pw" });
  text(s, "كلمة المرور", { x: 9.55, y: y + 0.12, w: 3.03, h: 0.4, fontSize: 13, color: C.accent6, align: "center" });
  text(s, "Demo@2026", { x: 9.55, y: y + 0.5, w: 3.03, h: 0.5, fontSize: 20, fontFace: CODE, bold: true, color: C.text2, align: "center", rtlMode: false });
  arrow(s, 8.0, y + h / 2, 1.25, "left");
  circle(s, 6.1, y - 0.05, 1.3, "Argon2", { fill: C.accent1, size: 15 });
  arrow(s, 4.7, y + h / 2, 1.25, "left");
  box(s, MX, y, 3.95, h, { fill: C.text2, name: "hash" });
  text(s, "ما يُخزن في قاعدة البيانات", { x: MX + 0.15, y: y + 0.12, w: 3.65, h: 0.4, fontSize: 13, color: C.accent3, align: "center" });
  text(s, "$argon2id$v=19$m=65536…", { x: MX + 0.15, y: y + 0.5, w: 3.65, h: 0.5, fontSize: 15, fontFace: CODE, bold: true, color: C.background1, align: "center", rtlMode: false });

  const cw = (CW - 0.4) / 2;
  card(s, {
    x: MX + cw + 0.4, y: 3.3, w: cw, h: 2.4, emoji: "⚠️", title: "لو خزّنّا كلمة المرور كما هي",
    body: ["سرقة قاعدة البيانات تكشف كل الكلمات فورًا", "المبرمج نفسه يستطيع رؤيتها"], fill: C.background1, line: "F2C9C9", titleColor: C.accent5, bodySize: 15,
  });
  card(s, {
    x: MX, y: 3.3, w: cw, h: 2.4, emoji: "✅", title: "مع Argon2",
    body: ["السارق يرى Hash لا يمكن عكسه", "تجربة ملايين الكلمات تحتاج سنوات"], fill: C.background2, bodySize: 15,
  });
  box(s, MX, 5.95, CW, 0.8, { fill: C.background1, line: "CFE5DA", shadow: false, name: "verify" });
  text(s, runs(["عند الدخول: ", { code: "verify_password(password, hash)" }, " ← لا يفك التشفير، بل يشفّر المُدخل بنفس الـSalt ويقارن"], { fontSize: 14, color: C.text1 }), {
    x: MX + 0.3, y: 6.0, w: CW - 0.6, h: 0.7, valign: "middle",
  });
  s.addNotes(
    "كلمة المرور تمر عبر Argon2 فتخرج نصًا لا يمكن إرجاعه. نخزن هذا النص فقط. " +
    "Argon2 بطيء ويستهلك ذاكرة عمدًا، فلا يلاحظه المستخدم الحقيقي، لكنه يجعل التخمين الجماعي مكلفًا جدًا."
  );
}

// ---------- 11. JWT ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "JWT: هوية موقّعة لا يمكن تزويرها");
  const parts = [
    ["Header", "نوع التوقيع", '{ "alg": "HS256" }', C.accent6],
    ["Payload", "البيانات", '{ "sub": "4", "exp": … }', C.accent1],
    ["Signature", "التوقيع بالمفتاح السري", "HMAC( … , SECRET_KEY )", C.text2],
  ];
  // LTR order like the real token: Header (left) . Payload . Signature (right)
  const pw = (CW - 0.6) / 3;
  parts.forEach(([name, ar, code, color], i) => {
    const x = MX + i * (pw + 0.3);
    box(s, x, 1.5, pw, 1.75, { fill: color, name: "jwt-part" });
    text(s, name, { x: x + 0.2, y: 1.62, w: pw - 0.4, h: 0.45, fontSize: 20, bold: true, color: C.background1, align: "center", rtlMode: false });
    text(s, ar, { x: x + 0.2, y: 2.08, w: pw - 0.4, h: 0.4, fontSize: 14, color: C.background1, align: "center" });
    text(s, code, { x: x + 0.2, y: 2.55, w: pw - 0.4, h: 0.5, fontSize: 13, fontFace: CODE, color: C.background1, align: "center", rtlMode: false });
  });
  text(s, "sub يعني رقم المستخدم، و exp يعني وقت انتهاء الصلاحية (30 دقيقة)", {
    x: MX, y: 3.4, w: CW, h: 0.4, fontSize: 14, color: C.accent6, align: "center",
  });

  text(s, "ماذا لو حاول أحد تعديل الـToken؟", { x: MX, y: 3.95, w: CW, h: 0.5, fontSize: 20, bold: true, color: C.text2 });
  flow(s, [
    { t: "المهاجم يغيّر رقم المستخدم من 4 إلى 1", d: "يريد أن يصبح المستخدم محمد", tone: "warn" },
    { t: "الخادم يعيد حساب التوقيع", d: "التوقيع الجديد لا يطابق التوقيع المرفق" },
    { t: ["الطلب يُرفض: ", { code: "401" }], d: "المهاجم لا يملك المفتاح السري ليصنع توقيعًا جديدًا", tone: "block" },
  ], { y0: 4.55, cols: 3, rowH: 1.15, gapX: 0.3 });
  s.addNotes(
    "الـPayload مقروء لأي أحد، لذلك لا نضع فيه أسرارًا، فقط رقم المستخدم ووقت الانتهاء. " +
    "لكن لا يمكن تعديله: أي تغيير يكسر التوقيع لأن المفتاح السري موجود في ملف .env على الخادم فقط."
  );
}

// ---------- 11b. Real token example ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "مثال حقيقي: سارة تحاول أن تصبح خالد");
  const H = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
  const P = "eyJzdWIiOiI0IiwiZXhwIjoxNzk0MTI4Mjc1fQ";
  const P2 = "eyJzdWIiOiI1IiwiZXhwIjoxNzk0MTI4Mjc1fQ";
  const SG = "UHXAFw-tcbBdd8WDBoxKqcmHSaffOL-IfSUP-TLuvIE";

  const tokenLine = (pl, plColor, y, label) => {
    text(s, label, { x: MX, y, w: CW, h: 0.4, fontSize: 15, bold: true, color: C.text2 });
    box(s, MX, y + 0.42, CW, 0.62, { fill: "F4F7F6", shadow: false, line: "D7E6DF", name: "token" });
    s.addText([
      { text: H, options: { color: "6B7C80" } }, { text: ".", options: { color: "192B32" } },
      { text: pl, options: { color: plColor, bold: true } }, { text: ".", options: { color: "192B32" } },
      { text: SG, options: { color: "073F35" } },
    ], { isTextBox: true, x: MX + 0.15, y: y + 0.45, w: CW - 0.3, h: 0.56, fontFace: CODE, fontSize: 11.5, valign: "middle", align: "left", rtlMode: false, lang: "en-US", objectName: nm("token-text") });
  };
  tokenLine(P, "147D68", 1.3, "١. الـToken الحقيقي الذي حصلت عليه سارة بعد تسجيل الدخول");

  const cw3 = (CW - 0.5) / 3;
  [
    ["Header", '{"alg":"HS256","typ":"JWT"}', C.accent6],
    ["Payload", '{"sub":"4","exp":1794128275}', C.accent1],
    ["Signature", "UHXAFw-tcbBdd8...", C.text2],
  ].forEach(([n, v, col], i) => {
    const x = MX + i * (cw3 + 0.25);
    box(s, x, 2.5, cw3, 0.95, { fill: col, shadow: false, name: "part" });
    text(s, n, { x: x + 0.1, y: 2.55, w: cw3 - 0.2, h: 0.38, fontSize: 15, bold: true, color: C.background1, align: "center", rtlMode: false });
    text(s, v, { x: x + 0.1, y: 2.95, w: cw3 - 0.2, h: 0.42, fontSize: 13, fontFace: CODE, color: C.background1, align: "center", rtlMode: false });
  });
  text(s, "الـPayload مكتوب بـ Base64 فقط (ترميز وليس تشفيرًا)، لذلك تستطيع سارة قراءته: sub = 4 رقمها، و exp وقت الانتهاء", {
    x: MX, y: 3.5, w: CW, h: 0.4, fontSize: 13, color: C.accent6, align: "center",
  });

  tokenLine(P2, "C62828", 4.05, "٢. سارة تغيّر sub من 4 إلى 5 (رقم خالد) وتُبقي التوقيع القديم كما هو");
  box(s, MX, 5.3, CW, 1.25, { fill: C.accent4, transparency: 88, shadow: false, name: "diff" });
  s.addText([
    { text: '{"sub":"4",…}  →  eyJzdWIiOiI', options: { color: "192B32" } },
    { text: "0", options: { color: "147D68", bold: true } },
    { text: "IiwiZXhw…", options: { color: "192B32", breakLine: true } },
    { text: '{"sub":"5",…}  →  eyJzdWIiOiI', options: { color: "192B32" } },
    { text: "1", options: { color: "C62828", bold: true } },
    { text: "IiwiZXhw…", options: { color: "192B32" } },
  ], { isTextBox: true, x: MX + 0.3, y: 5.38, w: CW / 2, h: 1.1, fontSize: 15, fontFace: CODE, rtlMode: false, lang: "en-US", align: "left", valign: "middle", objectName: nm("diff-text") });
  text(s, "تغيير رقم واحد في الـPayload يغيّر حرفًا واحدًا في الـToken، لكن التوقيع بقي كما هو", {
    x: MX + CW / 2 - 0.2, y: 5.38, w: CW / 2 - 0.1, h: 1.1, fontSize: 15, bold: true, color: C.text2, valign: "middle",
  });
  s.addNotes(
    "هذه قيم حقيقية من النظام. سارة (المستخدم 4) سجلت الدخول وحصلت على هذا الـToken. الجزء الأوسط Base64 فقط، " +
    "فتستطيع فكّه وتغيير sub من 4 إلى 5 ثم إعادة ترميزه، فيتحول الحرف 0 إلى 1. لكنها لا تستطيع تعديل التوقيع لأنها لا تملك المفتاح السري."
  );
}

// ---------- 11c. Server comparison and rejection ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "كيف يكتشف الخادم التعديل ويرفض الطلب؟");
  const half = (CW - 0.5) / 2;
  const xr = MX + half + 0.5;
  flow(s, [
    { t: "يصل الطلب مع الـToken المعدّل", d: [{ code: "GET /conversations" }], tone: "warn" },
    { t: [{ code: "HTTPBearer" }, " يستخرج الـToken"], d: "قبل تنفيذ أي كود في المسار" },
    { t: [{ code: "get_current_user" }, " ← ", { code: "jwt.decode" }], d: "يعمل تلقائيًا عبر Depends مع كل طلب" },
    { t: "يعيد حساب التوقيع بالمفتاح السري", d: [{ code: "HMAC-SHA256(header.payload, SECRET_KEY)" }] },
    { t: "يقارن التوقيعين: غير متطابقين", d: "المحتوى تغيّر، فتوقيعه الصحيح مختلف", tone: "block" },
    { t: ["رفض الطلب: ", { code: "401" }], d: "قبل قاعدة البيانات وقبل Gemini وقبل أي أداة", tone: "block" },
  ], { x0: xr, y0: 1.35, totalW: half, cols: 1, rowH: 0.82, gapY: 0.1 });

  text(s, "المقارنة داخل الخادم (قيم حقيقية)", { x: MX, y: 1.35, w: half, h: 0.45, fontSize: 18, bold: true, color: C.text2 });
  const sigBox = (y, label, val, col, mark) => {
    box(s, MX, y, half, 1.15, { fill: C.background2, shadow: false, line: col, lineWidth: 1.5, name: "sig" });
    text(s, label, { x: MX + 0.2, y: y + 0.08, w: half - 0.4, h: 0.4, fontSize: 14, bold: true, color: C.text2 });
    s.addText(val, { isTextBox: true, x: MX + 0.2, y: y + 0.52, w: half - 0.9, h: 0.5, fontSize: 11.5, fontFace: CODE, color: col, align: "left", rtlMode: false, lang: "en-US", valign: "middle", objectName: nm("sig-val") });
    if (mark) s.addText(mark, { isTextBox: true, x: MX + half - 0.8, y: y + 0.45, w: 0.6, h: 0.6, fontSize: 28, bold: true, color: col, align: "center", valign: "middle", objectName: nm("mark") });
  };
  sigBox(1.95, "التوقيع المرفق مع الـToken (القديم)", "UHXAFw-tcbBdd8WDBoxKqcmHSaffOL-IfSUP-TLuvIE", "6B7C80", "");
  sigBox(3.25, "التوقيع الصحيح الذي حسبه الخادم للمحتوى المعدّل", "FasncAXjwyKT8MN8rXxHi86V9jdvQmZNgcU2SnRecm4", "C62828", "≠");
  box(s, MX, 4.6, half, 1.9, { fill: C.text2, shadow: false, name: "result" });
  text(s, "النتيجة الفعلية من الخادم", { x: MX + 0.2, y: 4.7, w: half - 0.4, h: 0.4, fontSize: 14, bold: true, color: C.accent3 });
  s.addText([
    { text: "Original token  ->  200 OK", options: { breakLine: true, color: "FFFFFF" } },
    { text: "Modified token  ->  401 Unauthorized", options: { breakLine: true, color: "FF8A80", bold: true } },
    { text: '{"detail": "Invalid or expired token."}', options: { color: "FFFFFF" } },
  ], { isTextBox: true, x: MX + 0.2, y: 5.15, w: half - 0.4, h: 1.25, fontSize: 14, fontFace: CODE, rtlMode: false, lang: "en-US", align: "left", valign: "top", objectName: nm("result-text") });
  s.addNotes(
    "الخادم لا يثق بما في الـToken. مع كل طلب يعيد حساب التوقيع على الـHeader والـPayload كما وصلا، باستخدام المفتاح السري الموجود في .env فقط. " +
    "التوقيع الصحيح للمحتوى الجديد يبدأ بـ FasncAX بينما المرفق يبدأ بـ UHXAFw، فلا يتطابقان ويُرفض الطلب بـ401 قبل أي قراءة من قاعدة البيانات. " +
    "ولا تستطيع سارة حساب التوقيع الصحيح بنفسها لأنها لا تعرف المفتاح."
  );
}

// ---------- 12. Login step by step ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "تسجيل الدخول خطوة بخطوة");
  flow(s, [
    { t: "إدخال البريد وكلمة المرور", d: "نافذة تسجيل الدخول في الواجهة" },
    { t: [{ code: "POST /auth/login" }], d: [{ code: "{ email, password }" }] },
    { t: "البحث عن المستخدم بالبريد", d: "غير موجود ← 401 (نفس رسالة الخطأ دائمًا)" },
    { t: "هل الحساب نشط؟", d: "غير نشط ← 403", tone: "warn" },
    { t: "التحقق من كلمة المرور بـ Argon2", d: "غير صحيحة ← 401" },
    { t: "إنشاء JWT", d: "يحتوي رقم المستخدم ووقت الانتهاء، مع توقيع" },
    { t: "الواجهة تحفظ الجلسة", d: "الـToken وبيانات المستخدم في المتصفح" },
    { t: "إرساله مع كل طلب", d: [{ code: "Authorization: Bearer <token>" }] },
  ], { rowH: 1.05, gapY: 0.18 });
  s.addNotes(
    "لا يوجد تسجيل حساب جديد في التطبيق: البنك هو من ينشئ الحسابات، ونحن نتحقق من الدخول فقط. " +
    "رسالة الخطأ واحدة سواء كان البريد غير موجود أو كلمة المرور خاطئة، حتى لا نكشف أي البريدين مسجّل."
  );
}

// ---------- 13. Phases ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "مراحل بناء نظام تعدد المستخدمين");
  const phases = [
    ["ربط المصادقة مع المحادثة", "مصادقة اختيارية: الزائر والمستخدم معًا"],
    ["حماية الأدوات في Assistant", "منع الأدوات الخاصة عن الزائر"],
    ["عزل البيانات في MCP", "رقم المستخدم عبر متغير البيئة بدل الحساب رقم 1 للجميع"],
    ["بيانات تجريبية", "10 مستخدمين و160 معاملة لاختبار العزل"],
    ["عزل المحادثات", "كل محادثة لها صاحب، وعرضها وحذفها"],
    ["اختبارات الأمان", "رفض كل محاولة غير مصرّح بها (401 و403 و404)"],
  ];
  const n = phases.length;
  const lineY = 2.55;
  const step = CW / n;
  s.addShape(pres.shapes.LINE, { x: MX + step / 2, y: lineY, w: CW - step, h: 0, line: { color: C.accent1, width: 3 }, objectName: nm("timeline") });
  phases.forEach(([t, d], i) => {
    const cx = MX + CW - step * (i + 0.5); // phase 1 on the right
    circle(s, cx - 0.4, lineY - 0.4, 0.8, i + 1, { fill: C.accent1, size: 22 });
    text(s, `المرحلة ${i + 1}`, { x: cx - step / 2 + 0.05, y: 1.45, w: step - 0.1, h: 0.4, fontSize: 13, color: C.accent6, align: "center" });
    box(s, cx - step / 2 + 0.08, 3.25, step - 0.16, 2.75, { name: "phase" });
    text(s, t, { x: cx - step / 2 + 0.2, y: 3.4, w: step - 0.4, h: 1.15, fontSize: 16, bold: true, color: C.text2, align: "center", valign: "middle" });
    text(s, d, { x: cx - step / 2 + 0.2, y: 4.6, w: step - 0.4, h: 1.9, fontSize: 13, align: "center" });
  });
  s.addNotes(
    "بنينا النظام على ست مراحل، كل مرحلة اختُبرت قبل التالية. " +
    "المهم أن نجاح JWT وحده لا يكفي: كان خادم MCP يقرأ account_id = 1 لكل الناس، فأصلحنا العزل في المرحلة 3، ثم عزل المحادثات في المرحلة 5."
  );
}

// ---------- 14. Four layers ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "طبقات الحماية الأربع");
  const layers = [
    ["JWT", "من أنت؟", "هوية موقّعة لا يمكن تزويرها، يُتحقق منها في كل طلب"],
    ["ملكية المحادثة", "هل هذه المحادثة لك؟", "يجب أن يكون صاحب المحادثة المسجّل هو أنت"],
    ["Assistant", "هل يحق لك هذه الأداة؟", "الزائر لا يصل للرصيد والمعاملات والتحليل"],
    ["خادم MCP", "ما هي بياناتك؟", "الاستعلام مقيّد برقمك، فترى بياناتك فقط"],
  ];
  const fills = [C.text2, C.accent2, C.accent1, "3E9C84"];
  layers.forEach(([t, q, d], i) => {
    const inset = i * 0.55;
    const y = 1.45 + i * 1.2;
    const x = MX + inset;
    const w = CW - 2 * inset;
    box(s, x, y, w, 1.05, { fill: fills[i], name: "layer" });
    circle(s, x + w - 0.85, y + 0.2, 0.65, i + 1, { fill: C.background1, color: C.text2, size: 18 });
    text(s, t, { x: x + w - 4.2, y: y + 0.1, w: 3.2, h: 0.45, fontSize: 19, bold: true, color: C.background1 });
    text(s, q, { x: x + w - 4.2, y: y + 0.55, w: 3.2, h: 0.4, fontSize: 14, color: C.accent3 });
    text(s, d, { x: x + 0.3, y: y + 0.2, w: w - 4.7, h: 0.65, fontSize: 14, color: C.background1, valign: "middle" });
  });
  box(s, MX, 6.3, CW, 0.5, { fill: C.background2, shadow: false, name: "note" });
  text(s, "كل طبقة تعمل باستقلال: لو فشلت واحدة تبقى التالية تحمي البيانات، وGemini لا يحدد الصلاحيات أبدًا", {
    x: MX + 0.2, y: 6.32, w: CW - 0.4, h: 0.46, fontSize: 14, bold: true, color: C.text2, align: "center", valign: "middle",
  });
  s.addNotes(
    "أربع طبقات من الخارج للداخل. JWT يحدد الهوية، ثم ملكية المحادثة، ثم صلاحية الأداة، ثم الاستعلام نفسه مقيّد برقم المستخدم. " +
    "هذا يسمى Defense in Depth: الحماية لا تعتمد على نقطة واحدة."
  );
}

// ---------- 15. MCP isolation ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "عزل البيانات في خادم MCP");
  const chain = [
    ["Assistant", "user_id = 4", "من الـJWT الموثوق"],
    ["mcp_client", "AL_MUSAID_USER_ID=4", "متغير بيئة للعملية"],
    ["core_banking", "os.environ[…]", "يقرأ الهوية من البيئة"],
    ["bank.db", "WHERE user_id = 4", "حسابات المستخدم فقط"],
  ];
  const n = chain.length, gap = 0.55;
  const cw = (CW - gap * (n - 1)) / n;
  chain.forEach(([t, code, d], i) => {
    const x = MX + CW - (i + 1) * cw - i * gap;
    box(s, x, 1.55, cw, 1.9, { fill: i === 3 ? C.text2 : C.background2, name: "chain" });
    const tc = i === 3 ? C.background1 : C.text2;
    text(s, t, { x: x + 0.15, y: 1.7, w: cw - 0.3, h: 0.45, fontSize: 18, bold: true, color: tc, align: "center", rtlMode: false });
    text(s, code, { x: x + 0.15, y: 2.2, w: cw - 0.3, h: 0.5, fontSize: 13, fontFace: CODE, bold: true, color: i === 3 ? C.accent3 : C.accent2, align: "center", rtlMode: false });
    text(s, d, { x: x + 0.15, y: 2.75, w: cw - 0.3, h: 0.5, fontSize: 13, color: i === 3 ? C.background1 : C.text1, align: "center" });
    if (i < n - 1) arrow(s, x - gap + 0.08, 2.5, gap - 0.16, "left");
  });

  const half = (CW - 0.4) / 2;
  card(s, {
    x: MX + half + 0.4, y: 3.85, w: half, h: 2.85, emoji: "🛡️", title: "لماذا متغير البيئة؟",
    body: ["وسائط الأداة يكتبها Gemini، ولا نثق بها للصلاحيات", "متغير البيئة يضعه الـBackend فقط", "المستخدم وGemini لا يستطيعان الوصول إليه"],
    bodySize: 15,
  });
  card(s, {
    x: MX, y: 3.85, w: half, h: 2.85, emoji: "🚫", title: "محاولة اختراق",
    body: ["Gemini يرسل رقم حساب أو مستخدم آخر كوسيط", "يُتجاهل تمامًا", "الاستعلام يبقى مقيدًا بالمستخدم 4"],
    fill: C.background1, line: "F2C9C9", titleColor: C.accent5, bodySize: 15,
  });
  s.addNotes(
    "قبل التعديل كان الخادم يقرأ الحساب رقم 1 دائمًا. الآن رقم المستخدم يمر من الـJWT إلى متغير بيئة لعملية MCP، " +
    "والخادم يقرأه من البيئة فقط. اختبرنا إرسال account_id لمستخدم آخر كوسيط فتم تجاهله."
  );
}

// ---------- 16. Databases ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "قواعد البيانات والجداول");
  const half = (CW - 0.5) / 2;
  const panels = [
    { x: MX + half + 0.5, title: "bank.db — البيانات البنكية", tables: [
      ["users", "id · name · email · password_hash · is_active · gender"],
      ["accounts", "user_id · account_number · account_type · balance"],
      ["transactions", "account_id · date · type · amount · category · merchant"],
    ], links: ["users.id = accounts.user_id", "accounts.id = transactions.account_id"] },
    { x: MX, title: "memory.db — ذاكرة المحادثات", tables: [
      ["conversations", "conversation_id · user_id (الصاحب) · updated_at"],
      ["messages", "conversation_id · role · content · created_at"],
      ["state · summaries · locations", "حالة الأرقام · ملخص · آخر موقع"],
    ], links: ["كل الجداول مرتبطة بـ conversation_id", "حذف المحادثة يحذف الكل (CASCADE)"] },
  ];
  panels.forEach((p) => {
    box(s, p.x, 1.45, half, 5.3, { fill: C.background1, line: "DCE7E3", name: "db-panel" });
    text(s, p.title, { x: p.x + 0.3, y: 1.6, w: half - 0.6, h: 0.5, fontSize: 19, bold: true, color: C.text2 });
    p.tables.forEach(([t, cols], i) => {
      const y = 2.3 + i * 1.45;
      box(s, p.x + 0.3, y, half - 0.6, 1.0, { fill: i === 0 ? C.accent1 : C.background2, shadow: false, name: "db-table" });
      text(s, t, { x: p.x + 0.45, y: y + 0.08, w: half - 0.9, h: 0.4, fontSize: 16, bold: true, fontFace: CODE, color: i === 0 ? C.background1 : C.accent2, rtlMode: false });
      text(s, cols, { x: p.x + 0.45, y: y + 0.5, w: half - 0.9, h: 0.42, fontSize: 12, color: i === 0 ? C.background1 : C.text1, rtlMode: false });
      if (i < 2) {
        arrow(s, p.x + half / 2, y + 1.0, 0.43, "down");
        text(s, p.links[i], { x: p.x + half / 2 + 0.15, y: y + 1.02, w: half / 2 - 0.45, h: 0.4, fontSize: 11, color: C.accent6, rtlMode: !p.links[i].startsWith("users") && !p.links[i].startsWith("accounts") });
      }
    });
  });
  s.addNotes(
    "bank.db: مستخدم واحد له حساب أو أكثر، وكل حساب له معاملات. " +
    "memory.db: جدول conversations فيه عمود user_id يحدد صاحب المحادثة (NULL = زائر)، وباقي الجداول مربوطة برقم المحادثة."
  );
}

// ---------- 17. Endpoints ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "مسارات FastAPI ومتى تُستدعى");
  rtlTable(s,
    ["المسار", "المصادقة", "متى يُستدعى", "الحماية"],
    [
      [{ code: "POST /auth/login" }, "—", "عند الضغط على «دخول»", "Argon2 والحساب نشط"],
      [{ code: "POST /chat" }, "اختيارية", "عند إرسال أي رسالة", "JWT + ملكية المحادثة + صلاحية الأداة"],
      [{ code: "GET /conversations" }, "إلزامية", "فتح الموقع · بعد الدخول · بعد كل رسالة", "محادثاتك فقط"],
      [{ code: "GET /conversations/{id}/messages" }, "اختيارية", "عند الضغط على محادثة سابقة", "ملكية المحادثة وإلا 404"],
      [{ code: "DELETE /conversations/{id}" }, "اختيارية", "عند تأكيد الحذف", "ملكية المحادثة وإلا 404"],
    ],
    { colW: [3.9, 1.45, 3.55, 3.23], rowH: 0.72, fontSize: 14 }
  );
  const half17 = (CW - 0.4) / 2;
  box(s, MX + half17 + 0.4, 6.1, half17, 0.7, { fill: C.background2, shadow: false, name: "auth-required" });
  text(s, runs([{ code: "get_current_user" }, " بدون Token يُرفض الطلب"], { fontSize: 14 }), {
    x: MX + half17 + 0.6, y: 6.15, w: half17 - 0.4, h: 0.6, valign: "middle",
  });
  box(s, MX, 6.1, half17, 0.7, { fill: C.background2, shadow: false, name: "auth-optional" });
  text(s, runs([{ code: "get_optional_user" }, " بدون Token يُعامل كزائر"], { fontSize: 14 }), {
    x: MX + 0.2, y: 6.15, w: half17 - 0.4, h: 0.6, valign: "middle",
  });
  s.addNotes(
    "المصادقة الإلزامية تستخدم get_current_user: بدون Token يُرفض الطلب. الاختيارية تستخدم get_optional_user: بدون Token يُعامل كزائر، " +
    "لكن لو أُرسل Token خاطئ أو منتهٍ يُرفض. لاحظ أن GET /conversations يُستدعى بعد كل رسالة لتحديث القائمة."
  );
}

// ---------- 18. Ownership check ----------
{
  const s = contentSlide("تسجيل الدخول والمصادقة", "التحقق من ملكية المحادثة");
  const rightW = 6.6;
  const xr = MX + CW - rightW;
  text(s, runs(["في كل رسالة: ", { code: "claim_or_verify_conversation" }], { fontSize: 17, bold: true, color: C.text2 }), {
    x: xr, y: 1.45, w: rightW, h: 0.5,
  });
  flow(s, [
    { t: "إنشاء المحادثة باسمك إن لم تكن موجودة", d: [{ code: "INSERT OR IGNORE" }] },
    { t: "قراءة صاحبها الفعلي", d: [{ code: "SELECT user_id FROM conversations" }] },
    { t: "هل صاحبها هو أنت؟", d: "نعم ← تكمل · لا ← 403 قبل قراءة أي ذاكرة" },
  ], { x0: xr, y0: 2.05, totalW: rightW, cols: 1, rowH: 1.0, gapY: 0.15 });
  card(s, {
    x: xr, y: 5.35, w: rightW, h: 1.4, emoji: "🔁", title: "لماذا في كل رسالة؟",
    body: "كل طلب HTTP مستقل، ويمكن تغيير رقم المحادثة يدويًا", bodySize: 14, titleSize: 16,
  });

  const lw = CW - rightW - 0.4;
  text(s, "من يستطيع ماذا؟", { x: MX, y: 1.45, w: lw, h: 0.5, fontSize: 17, bold: true, color: C.text2 });
  rtlTable(s,
    ["", "محادثته", "محادثة زائر", "محادثة غيره"],
    [
      ["سارة (4)", "✅", "❌", "❌"],
      ["زائر (None)", "—", "✅", "❌"],
    ],
    { x: MX, y: 2.05, w: lw, colW: [1.65, 1.1, 1.3, 1.08], rowH: 0.7, fontSize: 14 }
  );
  card(s, {
    x: MX, y: 4.35, w: lw, h: 2.4, emoji: "🙈", title: "لماذا 404 وليس 403؟",
    body: "عند قراءة أو حذف محادثة ليست لك يكون الرد واحدًا سواء كانت غير موجودة أو لشخص آخر، حتى لا يعرف المهاجم أن الرقم موجود",
    bodySize: 13, titleSize: 16,
  });
  s.addNotes(
    "INSERT OR IGNORE: إن كانت المحادثة جديدة تُسجّل باسمك، وإن كانت موجودة لا يتغير صاحبها. ثم نقارن. " +
    "الزائر صاحبه NULL، فلا يصل لمحادثات المستخدمين، والمستخدم لا يصل لمحادثات الزوار. التكلفة أقل من ملّي ثانية."
  );
}

// ---------- 19. Section: Examples ----------
sectionSlide("أمثلة تدفق البيانات", "أمثلة تدفق البيانات", "مستخدم مسجّل (سارة) · زائر · محاولة اختراق")
  .addNotes("الآن نرى التدفق الكامل خطوة بخطوة لحالات حقيقية.");

// ---------- 20. Sara login ----------
{
  const s = contentSlide("أمثلة تدفق البيانات", "تدفق المستخدم المسجّل: سارة تسجّل الدخول");
  flow(s, [
    { t: "سارة تكتب البريد وكلمة المرور", d: [{ code: "sara@example.com" }] },
    { t: [{ code: "POST /auth/login" }], d: [{ code: "{ email, password }" }] },
    { t: "البحث عن المستخدم بالبريد", d: "في جدول المستخدمين" },
    { t: "هل الحساب نشط؟", d: "نعم ✅" },
    { t: "Argon2 يتحقق من كلمة المرور", d: "كلمة المرور صحيحة ✅" },
    { t: "إنشاء JWT", d: "رقم المستخدم 4 + وقت الانتهاء بعد 30 دقيقة + توقيع" },
    { t: "الرد للواجهة", d: "الـToken + بيانات سارة (الاسم والجنس)" },
    { t: "حفظ الجلسة في المتصفح", d: "تظهر بطاقة سارة 👩 في القائمة الجانبية" },
    { t: "بدء محادثة جديدة", d: "رقم محادثة جديد في الواجهة" },
    { t: [{ code: "GET /conversations" }], d: "تحميل محادثات سارة فقط" },
  ], { rowH: 0.98, gapY: 0.1 });
  s.addNotes("التدفق من اليمين للأسفل ثم العمود الأيسر. لاحظ أن الواجهة بعد الدخول مباشرة تطلب قائمة محادثات سارة فقط.");
}

// ---------- 21. Sara asks balance ----------
{
  const s = contentSlide("أمثلة تدفق البيانات", "تدفق المستخدم المسجّل: سارة تسأل «كم رصيدي؟»");
  flow(s, [
    { t: [{ code: "POST /chat" }], d: "الرسالة «كم رصيدي؟» + رقم المحادثة + الـToken" },
    { t: [{ code: "get_optional_user" }], d: "فك الـJWT والتحقق من التوقيع والصلاحية ← المستخدم 4" },
    { t: [{ code: "claim_or_verify_conversation" }], d: "المحادثة لسارة ✅ (وإلا 403)" },
    { t: "تحميل الذاكرة وسياق المستخدم", d: "آخر الرسائل + الحالة + اسمها سارة" },
    { t: "Gemini يقرر استخدام أداة", d: [{ code: "get_account_balance" }] },
    { t: "فحص الصلاحية في الـBackend", d: "أداة خاصة + مستخدم مسجّل ✅" },
    { t: "استدعاء خادم MCP", d: [{ code: "AL_MUSAID_USER_ID=4" }] },
    { t: "خادم البنك يقرأ قاعدة البيانات", d: [{ code: "WHERE user_id = 4" }] },
    { t: "Gemini يصيغ الرد", d: "«أهلاً يا سارة، رصيدك 9,840.75 ريال»" },
    { t: "الحفظ والعرض", d: "حفظ الرسالة والرد ← عرضه ← تحديث القائمة" },
  ], { rowH: 0.98, gapY: 0.1 });
  s.addNotes(
    "هذا أهم مثال. الخطوات 1-3 أمن (الهوية والملكية)، 4-5 فهم الطلب، 6-8 تنفيذ آمن بعزل البيانات، 9-10 الرد والحفظ. " +
    "رقم المستخدم 4 لم يأتِ أبدًا من الواجهة أو من Gemini، بل من الـJWT."
  );
}

// ---------- 22. Guest general question ----------
{
  const s = contentSlide("أمثلة تدفق البيانات", "تدفق الزائر: سؤال بنكي عام");
  flow(s, [
    { t: "فتح الموقع بدون تسجيل دخول", d: "لا يوجد Token ← زائر 👤" },
    { t: [{ code: "POST /chat" }], d: "بدون Token + الرسالة «ما هو الحساب الجاري؟»" },
    { t: [{ code: "get_optional_user" }], d: [{ code: "user_id = None" }] },
    { t: [{ code: "claim_or_verify_conversation" }], d: "محادثة زائر ✅" },
    { t: "Gemini يقرر: معرفة بنكية", d: [{ code: "knowledge" }] },
    { t: "RAG يبحث في مستندات البنك", d: "أقرب 3 مقاطع للسؤال" },
    { t: "Gemini يصيغ الرد", d: "من المقاطع فقط: «حسب معلومات البنك…»" },
    { t: "الحفظ والعرض", d: "حفظ المحادثة في قائمة الزائر بالمتصفح" },
  ], { rowH: 1.05, gapY: 0.18 });
  s.addNotes(
    "الزائر يستطيع الأسئلة العامة بالكامل. قائمة محادثاته محفوظة في متصفحه فقط، لأنه بلا هوية في الخادم، " +
    "ولو أرجعها الخادم لرأى كل زائر محادثات الآخرين."
  );
}

// ---------- 23. Guest asks balance ----------
{
  const s = contentSlide("أمثلة تدفق البيانات", "تدفق الزائر: يسأل «كم رصيدي؟»");
  const fw = 7.6;
  flow(s, [
    { t: [{ code: "POST /chat" }], d: "بدون Token + الرسالة «كم رصيدي؟»" },
    { t: "المستخدم زائر", d: [{ code: "user_id = None" }] },
    { t: [{ code: "claim_or_verify_conversation" }], d: "محادثة الزائر ✅" },
    { t: "Gemini يقرر استخدام أداة", d: [{ code: "get_account_balance" }] },
    { t: "فحص الصلاحية 🚫", d: "أداة خاصة + زائر ← منع، ولا يُستدعى MCP", tone: "block" },
    { t: "الرد: يلزم تسجيل الدخول", d: [{ code: "action: login_required" }] },
    { t: "الواجهة", d: "رسالة وبداخلها زر «تسجيل الدخول»" },
  ], { x0: MX + CW - fw, totalW: fw, cols: 1, rowH: 0.7, gapY: 0.08 });
  const lw = CW - fw - 0.4;
  card(s, {
    x: MX, y: 1.4, w: lw, h: 2.6, emoji: "🛡️", title: "خط دفاع ثانٍ",
    body: "حتى لو وصل الطلب إلى خادم MCP، لا توجد هوية للزائر في متغير البيئة، فيرفض الخادم الطلب",
    bodySize: 14, titleSize: 17,
  });
  card(s, {
    x: MX, y: 4.25, w: lw, h: 2.5, emoji: "🔑", title: "Gemini لا يقرر",
    body: "Gemini اختار الأداة فقط — والـBackend هو من منعها لأن المستخدم زائر",
    bodySize: 14, titleSize: 17,
  });
  s.addNotes(
    "هنا الحماية في المرحلة الثانية: Gemini اختار أداة الرصيد، لكن الـBackend رفض قبل أي اتصال بقاعدة البيانات. " +
    "ولو تجاوز أحد هذه الطبقة، فخادم MCP نفسه يرفض لأنه لا يجد هوية في متغير البيئة."
  );
}

// ---------- 24. Attack ----------
{
  const s = contentSlide("أمثلة تدفق البيانات", "محاولة اختراق: زائر يحاول فتح محادثة سارة");
  const half = (CW - 0.5) / 2;
  const xr = MX + half + 0.5;
  text(s, runs(["عبر ", { code: "POST /chat" }], { fontSize: 18, bold: true, color: C.text2 }), { x: xr, y: 1.4, w: half, h: 0.5 });
  flow(s, [
    { t: "الزائر يعرف رقم محادثة سارة", d: [{ code: 'conversation_id = "c-777"' }], tone: "warn" },
    { t: "لا يوجد Token", d: [{ code: "user_id = None" }] },
    { t: [{ code: "claim_or_verify_conversation" }], d: "المحادثة موجودة فلا يتغير صاحبها" },
    { t: "مقارنة صاحب المحادثة", d: "صاحبها سارة (4) وليس الزائر" },
    { t: "رفض الطلب", d: [{ code: "403 conversation_forbidden" }], tone: "block" },
  ], { x0: xr, y0: 2.0, totalW: half, cols: 1, rowH: 0.82, gapY: 0.1 });

  text(s, runs(["عبر ", { code: "GET /conversations/c-777/messages" }], { fontSize: 18, bold: true, color: C.text2 }), { x: MX, y: 1.4, w: half, h: 0.5 });
  flow(s, [
    { t: "طلب قراءة الرسائل مباشرة", d: "بدون Token", tone: "warn" },
    { t: "المستخدم زائر", d: [{ code: "user_id = None" }] },
    { t: [{ code: "can_access_conversation" }], d: "قراءة فقط، لا تُنشئ محادثة" },
    { t: "مقارنة صاحب المحادثة", d: "صاحبها سارة (4) وليس الزائر" },
    { t: "رفض الطلب", d: [{ code: "404 Conversation not found" }], tone: "block" },
  ], { x0: MX, y0: 2.0, totalW: half, cols: 1, rowH: 0.82, gapY: 0.1 });
  s.addNotes(
    "معرفة رقم المحادثة لا تكفي. صاحب المحادثة مسجّل في قاعدة البيانات ويُقارن في كل طلب. " +
    "نفس الشيء ينطبق لو حاول أحمد فتح محادثة سارة بالـToken الخاص به."
  );
}

// ---------- 25. Open previous conversation ----------
{
  const s = contentSlide("أمثلة تدفق البيانات", "الضغط على محادثة سابقة");
  flow(s, [
    { t: "المستخدم يضغط على محادثة في القائمة", d: "مثال: «كم رصيدي؟»" },
    { t: "طلب رسائل المحادثة", d: [{ code: "GET /conversations/c-777/messages" }] },
    { t: [{ code: "can_access_conversation" }], d: "هل صاحبها هو المستخدم؟ لا ← 404" },
    { t: "قراءة الرسائل من قاعدة البيانات", d: "كل رسائل المحادثة بالترتيب" },
    { t: "الواجهة تعرض الرسائل", d: "المستخدم يمين، والمساعد يسار" },
    { t: "حفظ رقم المحادثة في الواجهة", d: "الرسائل الجديدة تُكمل نفس المحادثة ونفس الذاكرة" },
  ], { rowH: 0.78, gapY: 0.1, cols: 1 });
  s.addNotes(
    "عند الضغط على محادثة: طلب واحد لجلب رسائلها بعد التحقق من الملكية. أهم خطوة هي الأخيرة: " +
    "الواجهة تتذكر رقم المحادثة، فأي رسالة جديدة تُرسل بنفس الرقم ويكمل المساعد بنفس السياق."
  );
}

// ---------- 26. Comparison ----------
{
  const s = contentSlide("أمثلة تدفق البيانات", "مقارنة: مستخدم مسجّل وزائر");
  rtlTable(s,
    ["", "مستخدم مسجّل (سارة)", "زائر"],
    [
      ["Header في الطلب", { code: "Authorization: Bearer eyJ…" }, "لا يوجد"],
      ["user_id", "4 من الـJWT", { code: "None" }],
      ["صاحب المحادثة", { code: "conversations.user_id = 4" }, { code: "NULL" }],
      ["قائمة المحادثات", "من الخادم", "من المتصفح فقط"],
      ["الأسئلة العامة والعملات والفروع", "✅", "✅"],
      ["الرصيد والمعاملات والتحليل", "✅ بياناتها فقط", "🚫 «سجّل الدخول»"],
      ["المخاطبة والصورة", "«يا سارة» 👩", "بدون اسم 👤"],
    ],
    { colW: [3.6, 4.6, 3.93], rowH: 0.66, fontSize: 14 }
  );
  s.addNotes("ملخص الفرق بين الحالتين. الفكرة الجوهرية: المتصفح يرسل الـToken فقط، والـBackend يستخرج الهوية بنفسه ولا يثق بأي رقم يأتي من الواجهة أو من Gemini.");
}

// ---------- 27. Closing ----------
pres.addSection({ title: "الخلاصة" });
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "الخلاصة" });
  text(s, "الخلاصة", { x: MX, y: 0.7, w: CW, h: 0.9, fontSize: 40, bold: true, color: C.background1 });
  const points = [
    ["🤖", "مساعد بنكي يعرف المستخدم: رصيده ومعاملاته ومصروفاته وموقعه، ويتكلم بلهجته"],
    ["⚖️", "Gemini يفهم ويقرر ويصيغ — والـBackend يتحقق وينفّذ ويحسب"],
    ["🛡️", "أربع طبقات حماية: JWT · ملكية المحادثة · صلاحية الأداة · عزل MCP"],
    ["👥", "كل مستخدم يرى بياناته ومحادثاته فقط — والأسئلة العامة متاحة للجميع"],
  ];
  points.forEach(([e, t], i) => {
    const y = 1.9 + i * 1.05;
    circle(s, MX + CW - 0.75, y, 0.7, e, { fill: C.accent1, size: 20 });
    text(s, t, { x: MX, y: y - 0.02, w: CW - 1.0, h: 0.75, fontSize: 20, color: C.background1, valign: "middle" });
  });
  text(s, "شكرًا لكم", { x: MX, y: 6.3, w: CW, h: 0.7, fontSize: 28, bold: true, color: C.accent3 });
  s.addNotes("أربع رسائل أساسية للختام، ثم المجال للأسئلة.");
}

// ===================== WRITE =====================
(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written:", OUT);
})();
