/**
 * LINE 官方帳號聊天紀錄清理（瀏覽器端）。
 *
 * 這是 production 用的實作 —— 商家的原始對話紀錄不上傳，在瀏覽器裡直接清理，
 * 只有整理後的 QA（幾百 KB）會送到伺服器。
 *
 * backend/app/services/conversation_cleaner.py 是同一套規則的 Python 版，
 * 用途是調門檻與驗證（有 34 個測試）。兩邊必須跑出相同結果 ——
 * frontend/scripts/verify_cleaner.mjs 會拿同一份 CSV 比對，改規則時請跑它。
 *
 * 只支援 LINE OA 匯出格式（欄位固定，不做格式推測）：
 *   第 1~3 列  帳號名稱 / 時區 / 下載時間
 *   第 4 列    傳送者類型,傳送者名稱,傳送日期,傳送時間,內容
 *   第 5 列起  訊息本體，一個檔案 = 一位客戶的完整對話
 *
 * 角色一律看「傳送者類型」：User = 客戶，Account = 客服。
 * 「傳送者名稱」不參與角色判斷（會出現 Unknown、自動回應訊息、真人名字、
 * 甚至與客戶同名），只用來輔助判斷該則客服訊息是不是機器發的。
 */

// ---------------------------------------------------------------------------
// LINE 匯出格式（固定，不推測）
// ---------------------------------------------------------------------------

export const HEADER_ROW = 3; // 0-based：前 3 列是 metadata
export const COL_ROLE = '傳送者類型';
export const COL_SENDER = '傳送者名稱';
export const COL_DATE = '傳送日期';
export const COL_TIME = '傳送時間';
export const COL_CONTENT = '內容';
export const REQUIRED_COLUMNS = [COL_ROLE, COL_SENDER, COL_DATE, COL_TIME, COL_CONTENT];

const META_TIMEZONE = '時區';
const ROLE_BY_SENDER_TYPE = { User: 'user', Account: 'agent' };
const AUTO_REPLY_SENDER_HINTS = ['自動回應訊息', 'AI 聊天機器人'];

// ---------------------------------------------------------------------------
// 標記
// ---------------------------------------------------------------------------

export const Tag = {
    KEEP: 'keep',
    NO_CONTENT: 'no_content',
    AUTO_REPLY: 'auto_reply',
    BROADCAST: 'broadcast',
    SYSTEM_NOTICE: 'system_notice',
    ECHO: 'echo',
    IGNORE_ROLE: 'ignore_role',
};

export const TAG_LABELS = {
    [Tag.KEEP]: '可用',
    [Tag.NO_CONTENT]: '佔位符/空訊息',
    [Tag.AUTO_REPLY]: '系統自動回應',
    [Tag.BROADCAST]: '群發推播/主動發送',
    [Tag.SYSTEM_NOTICE]: '系統通知（訂單狀態等）',
    [Tag.ECHO]: '記錄重複（同一則被記兩次）',
    [Tag.IGNORE_ROLE]: '傳送者類型無法識別',
};

// QA 未成立的原因。判斷依據是「這個回覆有沒有帶新資訊」，不是長度 ——
// 折扣碼「NEWYEAR88」只有 9 個字卻是答案本身，用字數擋會擋錯。
export const Reject = {
    NO_REPLY: 'no_reply',
    QUESTION_COURTESY: 'question_courtesy',
    ANSWER_IMAGE_ONLY: 'answer_image',
    ANSWER_ECHO: 'answer_echo',
    ANSWER_COURTESY: 'answer_courtesy',
    ANSWER_SYMBOL_ONLY: 'answer_symbol',
    ANSWER_URL_ONLY: 'answer_url',
    ANSWER_TOO_SHORT: 'answer_short',
    FORM_STEP: 'form_step',
};

export const REJECT_LABELS = {
    [Reject.NO_REPLY]: '沒有客服回覆',
    [Reject.QUESTION_COURTESY]: '問題只是附和語',
    [Reject.ANSWER_IMAGE_ONLY]: '客服用圖片回答',
    [Reject.ANSWER_ECHO]: '回覆與問題相同',
    [Reject.ANSWER_COURTESY]: '只有附和語',
    [Reject.ANSWER_SYMBOL_ONLY]: '只有符號或表情',
    [Reject.ANSWER_URL_ONLY]: '只有網址',
    [Reject.ANSWER_TOO_SHORT]: '只有一個字',
    [Reject.FORM_STEP]: '問卷/表單流程',
};

export const Flag = {
    SHORT_ANSWER: 'short_answer',
    HAD_IMAGE: 'had_image',
    TIME_SENSITIVE: 'time_sensitive',
    LONG_WAIT: 'long_wait',
    LONG_QUESTION: 'long_question',
};

export const FLAG_LABELS = {
    [Flag.SHORT_ANSWER]: '答案過短',
    [Flag.HAD_IMAGE]: '回答有附圖',
    [Flag.TIME_SENSITIVE]: '內容可能過期',
    [Flag.LONG_WAIT]: '間隔過久（可能配錯）',
    [Flag.LONG_QUESTION]: '問題含多個主題',
};

// 描述「當時情境」的標記：去重時取聯集（其中一次有附圖就該提醒商家）。
// 其餘標記描述「留下來那段文字本身」，去重後只留代表的那份 ——
// 取聯集會讓畫面顯示一個短問題卻標著「問題含多個主題」，商家會不信任標記。
const CONTEXT_FLAGS = [Flag.HAD_IMAGE, Flag.LONG_WAIT];

// ---------------------------------------------------------------------------
// 門檻（與 Python 版 Thresholds 同一份數值）
// ---------------------------------------------------------------------------

export const DEFAULT_THRESHOLDS = {
    // 連續使用者訊息隔多久之內算「同一個問題」
    mergeWindowSec: 30 * 60,
    // 使用者最後一則 → 第一則客服回覆，最多容許隔多久
    waitWindowSec: 24 * 3600,
    // 客服訊息之間隔多久就停止合併（避免把晚上的群發併進答案）
    agentMergeWindowSec: 30 * 60,
    // 回得這麼快 = 機器（真人打不出來）。5 秒太寬鬆：範例檔的刮刮樂遊戲結果隔 6 秒回，
    // 會被誤判成真人。誤判成本不對稱 —— 判成自動回應只是進第二桶，仍會保留。
    autoReplyLatencySec: 60,
    // 合併後的答案至少要幾個字（只擋單字，不是用來擋短答案）
    minAnswerChars: 2,
    // 短於這個長度只「標記」不擋掉
    shortAnswerChars: 10,
    // 等待超過這麼久才回的，標記出來人工複查
    longWaitFlagSec: 2 * 3600,
    // 去掉網址後超過這麼多字，視為可能含多個主題（實測 771 檔：38 組 3.7%）
    longQuestionChars: 100,
    // 群發判定：同一段客服內容重複出現幾次以上才納入判斷
    broadcastMinOccurrences: 2,
    // 重複內容的延遲中位數超過這個秒數 = 不可能是自動回應
    broadcastMinLatencySec: 30 * 60,
    // 內容比對時的截斷長度（群發常見結尾帶變數，只比前段）
    contentHashPrefix: 60,
    // 客服訊息與鄰近使用者訊息同內容 → 匯出記錄重複（LINE 會把同一則記兩次）
    echoWindowSec: 120,
};

// ---------------------------------------------------------------------------
// 內容正規化
// ---------------------------------------------------------------------------

// LINE 匯出對圖片/貼圖等非文字訊息一律寫成「XX已傳送」
const PLACEHOLDER_RE = /^(照片|圖片|貼圖|影片|檔案|語音訊息|語音|位置資訊|聯絡資訊|訊息)已傳送$/;
const URL_ONLY_RE = /^https?:\/\/\S+$/;
const CONTROL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const LETTER_OR_DIGIT_RE = /[\p{L}\p{N}]/u;
const URL_RE = /https?:\/\/\S+/g;
// 連續問號算一段（「甚麼尺寸??」是一個問題，不是兩個）
const QUESTION_RUN_RE = /[?？]+/g;
// 問卷／表單的進度條（☑️ ☑️ ⬜ ⬜）。要求連續兩個以上，避免誤殺內容裡剛好有勾選符號的答案。
const FORM_PROGRESS_RE = /[☑⬜✅◻][️\s]*[☑⬜✅◻]/;
const NUMBERED_ITEM_RE = /(?:^|\n)[ \t]*[（(]?[1-9１-９][）)、.]/g;

// 只有這些字的回覆是「附和」不是「答案」。比對時已去空白標點，所以列正規化後的樣子。
const COURTESY_REPLIES = new Set([
    '好', '好的', '好喔', '好哦', '好啊', '可以', '可以的', '沒關係', '沒問題',
    '收到', '已收到', '了解', '瞭解', '明白', '知道了', '我知道了', '清楚了',
    '是', '是的', '對', '對的', '嗯', '嗯嗯', 'ok', 'okay', 'okok',
    '謝謝', '感謝', '感恩', '謝謝您', '謝謝你', '謝謝妳', '感謝您', '感謝你',
    '不客氣', '辛苦了', '感謝查詢', '感謝您的幫忙', '感謝您的幇忙',
    '麻煩了', '麻煩您了', '麻煩您', '再麻煩您', '再麻煩您了', '再麻煩了', '已提醒',
    '稍等', '請稍等', '稍等一下', '馬上為您查詢', '我看一下', '我確認一下',
    '您好', '你好', '哈囉', '早安', '午安', '晚安',
    '抱歉', '不好意思', '很抱歉', '對不起',
]);
const COURTESY_MAX_LEN = Math.max(...[...COURTESY_REPLIES].map(x => x.length));
// 附和語之間可能用空白或標點分隔（「好的,了解,感謝。」）
const COURTESY_SPLIT_RE = /[\s,，、。．;；:：!！?？~～\-—()（）[\]【】]+/;

// 答案會過期的用語 —— 命中只標記，不擋掉（要不要收是商家的決定）。
// 兩類：限時活動，以及庫存狀態（實測「目前售完」這類佔第一桶 4.8%，
// 做成常駐 FAQ 之後補貨了就變成錯誤資訊）。
const TIME_SENSITIVE_HINTS = [
    // 限時活動
    '限時', '只到', '本週', '本月', '今日', '今天限', '活動期間', '截止', '倒數',
    '過年', '春節', '母親節', '父親節', '中秋', '雙十一', '雙十二', '週年慶',
    // 庫存狀態
    '售完', '賣完', '缺貨', '補貨中', '沒有庫存', '無庫存', '目前沒有出',
    '已停產', '停售', '下架',
];

/**
 * 去控制字元（LINE postback 會帶 \x04）、收斂前後空白。
 * 刻意不做 NFKC：那會把商家原文的全形標點「，。？」轉成半形，
 * 答案是要直接給客戶看的，原文要保留。正規化只在比對時做。
 */
export function cleanText(raw) {
    if (!raw) return '';
    return raw.replace(CONTROL_RE, '').trim();
}

/** 比對用：去空白、標點、emoji，只留字母與數字（含中日韓）。 */
export function normalizeForCompare(text) {
    const src = (text || '').normalize('NFKC').toLowerCase().replace(CONTROL_RE, '');
    let out = '';
    for (const ch of src) {
        if (LETTER_OR_DIGIT_RE.test(ch)) out += ch;
    }
    return out;
}

export function isPlaceholder(text) {
    return PLACEHOLDER_RE.test((text || '').trim());
}

export function isUrlOnly(text) {
    return URL_ONLY_RE.test((text || '').trim());
}

/**
 * 內容比對鍵。Python 版是 sha1(前 60 個正規化字元)，這裡直接用那段字串當鍵 ——
 * 只用來做相等分組，不需要雜湊，分組結果完全相同。
 */
export function contentKey(text, prefix) {
    return normalizeForCompare(text).slice(0, prefix);
}

/**
 * 把數字抽掉後的比對鍵，用來認出「同一個樣板、只差流水號」的系統通知。
 *   訂單 #20250113160405837：訂單狀態已更新為「處理中」。
 *   訂單 #20260625185650552：訂單狀態已更新為「處理中」。
 * 這兩則的 contentKey 不同（編號不同），templateKey 相同。
 */
export function templateKey(text, prefix) {
    return normalizeForCompare(text).replace(/\d+/g, '').slice(0, prefix);
}

/**
 * 整段話（拆成各段後）每一段都只是附和語。
 *
 * 不能只比整串：連續使用者訊息合併後會變成「好的 謝謝」，正規化成「好的謝謝」
 * 不在清單裡，但它顯然不是問題。反過來「好的 那小蘇打粉的份量都可以嗎」
 * 第二段有實質內容，就要留著。
 */
function decomposesIntoCourtesy(norm) {
    if (!norm) return true;
    const chars = [...norm];
    const n = chars.length;
    const reachable = new Array(n + 1).fill(false);
    reachable[0] = true;
    for (let i = 0; i < n; i += 1) {
        if (!reachable[i]) continue;
        for (let j = i + 1; j <= Math.min(n, i + COURTESY_MAX_LEN); j += 1) {
            if (COURTESY_REPLIES.has(chars.slice(i, j).join(''))) reachable[j] = true;
        }
    }
    return reachable[n];
}

export function isAllCourtesy(text) {
    const parts = (text || '').split(COURTESY_SPLIT_RE).filter(p => p.trim());
    if (!parts.length) return false;
    return parts.every(p => decomposesIntoCourtesy(normalizeForCompare(p)));
}

/**
 * 問題裡可能包含好幾個主題 → 一問多答塞不進一條 FAQ，標記出來人工看。
 *
 * 純用字數會失準：實測 60~100 字那批大多是「商品網址 + 一句短問題」，
 * 不是多主題；反過來「報價單含打樣嗎?交期大概多久呢?」只有 16 字卻是兩個問題。
 * 所以字數要先扣掉網址，再加上問號段落與條列這兩個訊號。
 */
export function isMultiTopicQuestion(question, th) {
    const body = question.replace(URL_RE, '').trim();
    // 用碼點數，不能用 .length —— JS 的 length 是 UTF-16 單位，「🙏🏼」算 4、
    // Python 算 2，字數卡在門檻附近的訊息兩邊就會判不一樣。
    if ([...body].length > th.longQuestionChars) return true;
    if ((question.match(QUESTION_RUN_RE) || []).length >= 2) return true;
    return (question.match(NUMBERED_ITEM_RE) || []).length >= 2;
}

/**
 * 判斷這組問答能不能用。回傳 { reason, flags }；reason 為空字串代表採用。
 *
 * 看的是「有沒有帶新資訊」：
 *   折扣碼 NEWYEAR88 → 採用（短，但那就是客戶要的東西）
 *   「好的」          → 拒絕（有回覆，沒有資訊）
 *   與問題一字不差    → 拒絕（回音或配錯對）
 */
export function judgeAnswer(question, answer, th) {
    const normA = normalizeForCompare(answer);
    const normQ = normalizeForCompare(question);

    // 問卷／表單流程的中間步驟。實測第二桶有 206 組（30%）是這種，
    // 而且「問題」欄裡是使用者填進表單的姓名、生日、手機號碼 —— 收進 FAQ 就是外洩。
    if (FORM_PROGRESS_RE.test(answer)) return { reason: Reject.FORM_STEP, flags: [] };

    // 問題本身只是附和語 → 「謝謝」→「不會喔」不是 FAQ（實測佔第一桶 4.4%）。
    // 要逐段判斷：合併後會變成「好的 謝謝」，整串不在清單裡但每段都是附和語就該擋。
    if (isAllCourtesy(question)) return { reason: Reject.QUESTION_COURTESY, flags: [] };

    if (!normA) return { reason: Reject.ANSWER_SYMBOL_ONLY, flags: [] };
    if (isUrlOnly(answer)) return { reason: Reject.ANSWER_URL_ONLY, flags: [] };
    if (normA === normQ) return { reason: Reject.ANSWER_ECHO, flags: [] };
    if (COURTESY_REPLIES.has(normA)) return { reason: Reject.ANSWER_COURTESY, flags: [] };
    if (normA.length < th.minAnswerChars) return { reason: Reject.ANSWER_TOO_SHORT, flags: [] };

    const flags = [];
    if (normA.length < th.shortAnswerChars) flags.push(Flag.SHORT_ANSWER);
    if (TIME_SENSITIVE_HINTS.some(h => answer.includes(h))) flags.push(Flag.TIME_SENSITIVE);
    if (isMultiTopicQuestion(question, th)) flags.push(Flag.LONG_QUESTION);
    return { reason: '', flags };
}

// ---------------------------------------------------------------------------
// CSV → 標準訊息
// ---------------------------------------------------------------------------

/**
 * 逐字元 CSV parser。不能用 split(',') —— LINE 的「內容」欄常是跨行的引號字串
 * （多行行銷文都在一格裡），split 會把一則訊息切成好幾列。
 */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 1; }
                else quoted = false;
            } else field += ch;
            continue;
        }
        if (ch === '"') { quoted = true; continue; }
        if (ch === ',') { row.push(field); field = ''; continue; }
        if (ch === '\r') continue;
        if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
        field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
}

/** LINE 匯出是 UTF-8 with BOM；商家用 Excel 開過再存會變 big5，所以留 fallback。 */
export function decodeCsv(buffer) {
    for (const enc of ['utf-8', 'big5']) {
        try {
            return new TextDecoder(enc, { fatal: true }).decode(buffer);
        } catch {
            // 換下一個編碼
        }
    }
    return new TextDecoder('utf-8').decode(buffer);
}

/** 第 4 列是否含 LINE 匯出的全部必要欄位。 */
export function isLineExport(rows) {
    if (rows.length <= HEADER_ROW) return false;
    const header = new Set(rows[HEADER_ROW].map(c => c.trim()));
    return REQUIRED_COLUMNS.every(name => header.has(name));
}

/** '+09:00 → 分鐘。 */
function parseTzOffset(raw) {
    const m = /([+-])(\d{1,2}):?(\d{2})?/.exec(raw || '');
    if (!m) return null;
    const sign = m[1] === '+' ? 1 : -1;
    return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
}

/** 前 3 列的 帳號名稱 / 時區 / 下載時間。 */
export function extractMetadata(rows) {
    const meta = {};
    for (const row of rows.slice(0, HEADER_ROW)) {
        if (row.length >= 2 && row[0].trim()) meta[row[0].trim()] = row[1].trim();
    }
    return meta;
}

/**
 * LINE 的 2026/07/15 + 08:47:37 → epoch 毫秒。
 * 時區來自檔頭（範例檔是 +09:00，不是台北的 +08:00），不能寫死。
 * 只回時間點不回 Date 物件：清理全程只需要「相差多少秒」。
 */
export function parseTimestamp(dateStr, timeStr, tzOffsetMinutes) {
    const d = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec((dateStr || '').trim());
    if (!d) return null;
    const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec((timeStr || '').trim());
    const utc = Date.UTC(
        Number(d[1]), Number(d[2]) - 1, Number(d[3]),
        t ? Number(t[1]) : 0, t ? Number(t[2]) : 0, t && t[3] ? Number(t[3]) : 0,
    );
    // 檔頭沒寫時區就當台北（+08:00），與 Python 版一致
    const offset = tzOffsetMinutes === null || tzOffsetMinutes === undefined ? 480 : tzOffsetMinutes;
    return utc - offset * 60000;
}

export const PARSE_OK = 'ok';
export const PARSE_EMPTY = 'empty';       // 格式正確但沒有任何訊息（該好友從未對話過）
export const PARSE_INVALID = 'invalid';   // 不是 LINE 匯出格式

/**
 * 單檔 LINE 匯出 CSV → 標準訊息串。
 * 一個檔案 = 一位客戶的對話，所以 conversationId 取檔名。
 * 回傳 { messages, warnings, status }。status 要分「沒對話」與「格式錯」：
 * 實測 771 個檔案裡有 181 個只有標題列（從未對話過的好友），
 * 把它們算成失敗會讓商家以為系統出錯。
 */
export function parseLineExport(filename, buffer) {
    const warnings = [];
    const rows = parseCsv(decodeCsv(buffer));
    if (!rows.length) {
        return { messages: [], warnings: [`${filename}: 空檔案`], status: PARSE_INVALID };
    }
    if (!isLineExport(rows)) {
        const header = rows[HEADER_ROW] || [];
        return {
            messages: [],
            warnings: [
                `${filename}: 不是 LINE 官方帳號匯出的聊天紀錄`
                + `（第 4 列應為 ${REQUIRED_COLUMNS.join('、')}，實際為 ${JSON.stringify(header)}）`,
            ],
            status: PARSE_INVALID,
        };
    }

    const header = rows[HEADER_ROW].map(c => c.trim());
    const col = {};
    header.forEach((name, i) => { col[name] = i; });

    const meta = extractMetadata(rows);
    const rawTz = meta[META_TIMEZONE] || '';
    const tzOffset = parseTzOffset(rawTz);
    if (tzOffset === null && rawTz) {
        warnings.push(`${filename}: 時區 '${rawTz}' 無法解析，改用台北時間`);
    }

    const cell = (row, name) => {
        const i = col[name];
        return i < row.length ? row[i] : '';
    };

    const conversationId = filename.replace(/\.[^.]*$/, '');
    const messages = [];
    const unknownRoles = new Map();

    for (let n = HEADER_ROW + 1; n < rows.length; n += 1) {
        const row = rows[n];
        if (!row.some(c => c.trim())) continue;
        const rawRole = cell(row, COL_ROLE).trim();
        let role = ROLE_BY_SENDER_TYPE[rawRole];
        if (!role) {
            unknownRoles.set(rawRole, (unknownRoles.get(rawRole) || 0) + 1);
            role = 'ignore';
        }
        messages.push({
            conversationId,
            rowIndex: n + 1, // 1-based，與 Python 版及 CSV 行號一致
            ts: parseTimestamp(cell(row, COL_DATE), cell(row, COL_TIME), tzOffset),
            role,
            sender: cleanText(cell(row, COL_SENDER)),
            content: cleanText(cell(row, COL_CONTENT)),
            tag: Tag.KEEP,
            note: '',
        });
    }

    if (unknownRoles.size) {
        const top = [...unknownRoles.entries()]
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([k, v]) => `${k || '(空白)'}×${v}`).join('、');
        warnings.push(`${filename}: 傳送者類型出現非 User/Account 的值，已忽略（${top}）`);
    }
    return { messages, warnings, status: messages.length ? PARSE_OK : PARSE_EMPTY };
}

// ---------------------------------------------------------------------------
// 標記
// ---------------------------------------------------------------------------

function isAutoReplySender(sender) {
    return AUTO_REPLY_SENDER_HINTS.some(h => sender.includes(h));
}

/** b - a 的秒數；缺時間時回 0（當成緊接著）。 */
function gap(a, b) {
    if (a === null || a === undefined || b === null || b === undefined) return 0;
    return (b - a) / 1000;
}

/** Infinity 相減會變 NaN，所以不能用 (a,b)=>a-b 當比較器。 */
function ascending(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/**
 * 就地標記單一對話的訊息（messages 需已依時間排序）。
 *
 * 客服訊息判定順序：
 *   角色無法識別 → 佔位符 → 記錄重複 → 前面沒人在問（群發/主動）
 *   → 內容命中群發樣板 → 秒回或傳送者名稱是自動回應 → 可用
 */
export function tagMessages(messages, th, broadcastKeys, systemNoticeKeys = new Set()) {
    let lastUserTs = null;
    let lastUserSeen = false;

    // 記錄重複偵測：LINE 匯出會把同一則訊息同時記成 Account 與 User 兩筆
    // （例：客戶送出「LINE已完成綁定」，第 311 列記成 Account、第 312 列記成 User）。
    // 這種客服訊息會被錯配成上一個問題的答案，要先排掉。
    const userContentTs = new Map();
    for (const m of messages) {
        if (m.role === 'user' && m.content && m.ts !== null) {
            const key = contentKey(m.content, th.contentHashPrefix);
            if (!userContentTs.has(key)) userContentTs.set(key, []);
            userContentTs.get(key).push(m.ts);
        }
    }
    const isEchoOfUser = (msg) => {
        if (msg.ts === null) return false;
        const list = userContentTs.get(contentKey(msg.content, th.contentHashPrefix));
        return !!list && list.some(ts => Math.abs((msg.ts - ts) / 1000) <= th.echoWindowSec);
    };

    for (const msg of messages) {
        if (msg.role === 'ignore') { msg.tag = Tag.IGNORE_ROLE; continue; }
        if (!msg.content || isPlaceholder(msg.content)) { msg.tag = Tag.NO_CONTENT; continue; }

        if (msg.role === 'user') {
            msg.tag = Tag.KEEP;
            lastUserTs = msg.ts;
            lastUserSeen = true;
            continue;
        }

        // --- 客服訊息 ---
        // 0. 與鄰近使用者訊息同內容 → 匯出的記錄重複，不是回覆
        if (isEchoOfUser(msg)) { msg.tag = Tag.ECHO; continue; }

        // 1. 前面 waitWindow 內沒有任何使用者訊息 → 不是在回答誰
        const tooOld = lastUserTs === null || msg.ts === null
            || (msg.ts - lastUserTs) / 1000 > th.waitWindowSec;
        if (!lastUserSeen || tooOld) {
            msg.tag = Tag.BROADCAST;
            msg.note = !lastUserSeen ? '前面沒有使用者訊息' : '距上一則使用者訊息過久';
            continue;
        }

        // 2. 內容命中群發樣板 → 排程群發（會剛好落在某人提問後 24h 內）
        const msgKey = contentKey(msg.content, th.contentHashPrefix);
        if (broadcastKeys.has(msgKey)) {
            msg.tag = Tag.BROADCAST;
            msg.note = '內容重複且觸發語多樣';
            continue;
        }

        // 3. 同樣板、只差流水號 → 訂單狀態之類的系統通知，不是回答
        if (systemNoticeKeys.has(msgKey)) {
            msg.tag = Tag.SYSTEM_NOTICE;
            msg.note = '與其他訊息同樣板、只差編號';
            continue;
        }

        // 4. 自動回應：傳送者名稱命中，或回得比人類可能的速度更快
        const latency = msg.ts !== null && lastUserTs !== null ? (msg.ts - lastUserTs) / 1000 : null;
        const fast = latency !== null && latency <= th.autoReplyLatencySec;
        if (isAutoReplySender(msg.sender) || fast) {
            msg.tag = Tag.AUTO_REPLY;
            msg.note = latency !== null ? `回覆延遲 ${Math.trunc(latency)} 秒` : '傳送者名稱為自動回應';
            continue;
        }

        msg.tag = Tag.KEEP;
    }
}

/**
 * 群發統計累加器：一段對話加一次，最後算出群發樣板。
 *
 * 重複本身不能當依據 —— 範例檔裡重複最多的是自動回應（折扣碼回了 9 次）。
 * 兩者的差別在觸發方式：
 *   自動回應：每次都被「同一句」使用者訊息觸發，而且幾乎是秒回
 *   排程群發：前面接的是各式各樣（或根本沒有）使用者訊息，而且隔很久才出現
 */
export class BroadcastStats {
    constructor(th = DEFAULT_THRESHOLDS) {
        this.th = th;
        this.occurrences = new Map();
        this.triggers = new Map();
        this.latencies = new Map();
        // 樣板 → 該樣板下出現過哪些不同原文（只差流水號的系統通知會有多個）
        this.templateVariants = new Map();
    }

    add(messages) {
        const prefix = this.th.contentHashPrefix;
        let prevUserKey = '';
        let prevUserTs = null;
        for (const m of messages) {
            if (!m.content || isPlaceholder(m.content)) continue;
            if (m.role === 'user') {
                prevUserKey = contentKey(m.content, prefix);
                prevUserTs = m.ts;
                continue;
            }
            if (m.role !== 'agent') continue;
            const key = contentKey(m.content, prefix);
            if (!key) continue;
            this.occurrences.set(key, (this.occurrences.get(key) || 0) + 1);
            if (!this.triggers.has(key)) this.triggers.set(key, new Set());
            this.triggers.get(key).add(prevUserKey); // 空字串代表「前面沒有使用者訊息」
            if (!this.latencies.has(key)) this.latencies.set(key, []);
            this.latencies.get(key).push(prevUserTs !== null ? gap(prevUserTs, m.ts) : Infinity);
            const tkey = templateKey(m.content, prefix);
            if (tkey) {
                if (!this.templateVariants.has(tkey)) this.templateVariants.set(tkey, new Set());
                this.templateVariants.get(tkey).add(key);
            }
        }
    }

    keys() {
        const out = new Set();
        for (const [key, count] of this.occurrences) {
            if (count < this.th.broadcastMinOccurrences) continue;
            // 觸發語只有一種 → 是關鍵字自動回應，不能殺（否則第二桶會整桶消失）
            if (this.triggers.get(key).size < 2) continue;
            const lat = [...this.latencies.get(key)].sort(ascending);
            if (lat[Math.floor(lat.length / 2)] > this.th.broadcastMinLatencySec) out.add(key);
        }
        return out;
    }

    /**
     * 找出「同樣板、只差流水號」的系統通知（訂單狀態更新之類）。
     *
     * 判定訊號是「抽掉數字後樣板相同，但原文不同」—— 那代表內容裡嵌了機器產生的
     * 流水號。真人重複貼同一段話術不會只差數字，所以這條不會誤殺人工答案。
     *
     * 刻意不靠放寬群發規則的延遲條件來抓（那些通知常在 10 幾分鐘內就來），
     * 因為放寬會誤殺「同一個好答案回覆了三種不同問法」，而那是最有價值的內容。
     */
    systemNoticeKeys() {
        const out = new Set();
        for (const variants of this.templateVariants.values()) {
            if (variants.size < 2) continue;
            let total = 0;
            for (const k of variants) total += this.occurrences.get(k) || 0;
            if (total >= this.th.broadcastMinOccurrences) {
                for (const k of variants) out.add(k);
            }
        }
        return out;
    }
}

export function findBroadcastKeys(conversations, th = DEFAULT_THRESHOLDS) {
    const stats = new BroadcastStats(th);
    for (const msgs of conversations) stats.add(msgs);
    return stats.keys();
}

// ---------------------------------------------------------------------------
// QA 配對
// ---------------------------------------------------------------------------

/** 合併訊息，順手去掉完全重複的句子（使用者連點同一個選單）。 */
function mergeTexts(msgs) {
    const out = [];
    const seen = new Set();
    for (const m of msgs) {
        const key = normalizeForCompare(m.content);
        if (key && seen.has(key)) continue;
        seen.add(key);
        out.push(m.content);
    }
    return out.join('\n');
}

/** 單一對話 → { pairs, unanswered }。 */
export function buildQa(messages, th) {
    const pairs = [];
    const unanswered = [];
    const n = messages.length;
    let i = 0;

    while (i < n) {
        const msg = messages[i];
        if (msg.role !== 'user' || msg.tag !== Tag.KEEP) { i += 1; continue; }

        // --- 組 Q：連續使用者訊息，隔太久就切成不同問題 ---
        const qMsgs = [msg];
        let j = i + 1;
        while (j < n && messages[j].role === 'user') {
            const cand = messages[j];
            if (cand.tag !== Tag.KEEP) { j += 1; continue; } // 佔位符當透明
            if (gap(qMsgs[qMsgs.length - 1].ts, cand.ts) > th.mergeWindowSec) break;
            qMsgs.push(cand);
            j += 1;
        }

        const qLast = qMsgs[qMsgs.length - 1];
        const question = mergeTexts(qMsgs);
        const qRows = qMsgs.map(m => m.rowIndex);

        // --- 收 A：j 之後的客服訊息，跳過群發與佔位符 ---
        const human = [];
        const auto = [];
        let hadImage = false; // 客服回了圖片：文字答案要標記，純圖片要單獨列
        let prevKept = null;
        let k = j;
        while (k < n && messages[k].role !== 'user') {
            const cand = messages[k];
            const skipped = cand.role !== 'agent'
                || [Tag.NO_CONTENT, Tag.IGNORE_ROLE, Tag.BROADCAST, Tag.SYSTEM_NOTICE, Tag.ECHO].includes(cand.tag);
            if (skipped) {
                if (cand.role === 'agent' && cand.tag === Tag.NO_CONTENT
                    && gap(qLast.ts, cand.ts) <= th.waitWindowSec) hadImage = true;
                k += 1;
                continue;
            }
            if (gap(qLast.ts, cand.ts) > th.waitWindowSec) break;
            if (prevKept && gap(prevKept.ts, cand.ts) > th.agentMergeWindowSec) break;
            (cand.tag === Tag.AUTO_REPLY ? auto : human).push(cand);
            prevKept = cand;
            k += 1;
        }

        // 真人回覆優先；沒有真人才用自動回應（商家現成 FAQ，另桶）
        const aMsgs = human.length ? human : auto;
        const bucket = human.length ? 'human' : 'auto_reply';

        if (!aMsgs.length) {
            // 客服只回了圖片 vs 完全沒回，是兩件事：前者商家有回答（只是答案在圖裡，
            // CSV 匯出不含圖檔），後者才是服務缺口。分開列讓商家自己補圖。
            unanswered.push({
                conversationId: msg.conversationId,
                question,
                reason: hadImage ? Reject.ANSWER_IMAGE_ONLY : Reject.NO_REPLY,
                ts: qLast.ts,
                qRows,
                frequency: 1,
                answerPreview: '',
            });
            i = j > i ? j : i + 1;
            continue;
        }

        const answer = mergeTexts(aMsgs);
        const { reason, flags } = judgeAnswer(question, answer, th);
        if (hadImage) flags.push(Flag.HAD_IMAGE);
        if (gap(qLast.ts, aMsgs[0].ts) > th.longWaitFlagSec) flags.push(Flag.LONG_WAIT);

        if (reason) {
            unanswered.push({
                conversationId: msg.conversationId,
                question,
                reason,
                ts: qLast.ts,
                qRows,
                frequency: 1,
                answerPreview: answer.slice(0, 120),
            });
        } else {
            pairs.push({
                conversationId: msg.conversationId,
                question,
                answer,
                bucket,
                questionTs: qLast.ts,
                answerTs: aMsgs[0].ts,
                waitSeconds: Math.trunc(gap(qLast.ts, aMsgs[0].ts)),
                qRows,
                aRows: aMsgs.map(m => m.rowIndex),
                frequency: 1,
                flags,
            });
        }

        i = Math.max(j, i + 1);
    }

    return { pairs, unanswered };
}

// ---------------------------------------------------------------------------
// 去重
// ---------------------------------------------------------------------------

/** 同問同答只留一組，frequency 記原本出現幾次（LLM 成本直接砍在這）。 */
export function dedupePairs(pairs) {
    const merged = new Map();
    for (const p of pairs) {
        const key = [p.bucket, normalizeForCompare(p.question), normalizeForCompare(p.answer)].join(' ');
        const exist = merged.get(key);
        if (exist) {
            exist.frequency += 1;
            // 只有情境類標記取聯集；文字類標記保留代表那份，見 CONTEXT_FLAGS 註解
            for (const f of p.flags) {
                if (CONTEXT_FLAGS.includes(f) && !exist.flags.includes(f)) exist.flags.push(f);
            }
        } else {
            merged.set(key, p);
        }
    }
    return [...merged.values()].sort((a, b) => b.frequency - a.frequency);
}

/** 同問同因只留一筆，frequency 記次數。 */
export function dedupeUnanswered(items) {
    const merged = new Map();
    for (const u of items) {
        const key = [u.reason, normalizeForCompare(u.question)].join(' ');
        const exist = merged.get(key);
        if (exist) exist.frequency += 1;
        else merged.set(key, u);
    }
    return [...merged.values()].sort((a, b) => b.frequency - a.frequency);
}

// ---------------------------------------------------------------------------
// 整批清理
// ---------------------------------------------------------------------------

function emptyReport() {
    return {
        files: 0,
        failedFiles: 0,
        emptyFiles: 0,
        conversations: 0,
        messages: 0,
        roles: { user: 0, agent: 0, ignore: 0 },
        tagCounts: {},
        rejectCounts: {},
        flagCounts: {},
        rawPairsByBucket: { human: 0, auto_reply: 0 },
        uniquePairsByBucket: { human: 0, auto_reply: 0 },
        rawUnanswered: 0,
        uniqueUnanswered: 0,
        broadcastContentGroups: 0,
        systemNoticeGroups: 0,
        warnings: [],
    };
}

/**
 * 累積多個檔案 → finalize() 一次算完（群發偵測需要跨檔案統計）。
 *
 * 群發統計用累加器，所以記憶體上限是「已解析的訊息」而非「原始檔案」；
 * 2000 個檔案在瀏覽器裡跑得動，且原始 CSV 不必上傳。
 */
export class CleaningRun {
    constructor(thresholds = DEFAULT_THRESHOLDS) {
        this.th = { ...DEFAULT_THRESHOLDS, ...thresholds };
        this.conversations = new Map(); // conversationId → messages
        this.warnings = [];
        this.files = 0;
        this.failedFiles = 0;
        this.emptyFiles = 0;
    }

    /** 回傳這個檔案解析出幾則訊息（0 = 失敗）。 */
    addFile(filename, buffer) {
        this.files += 1;
        let parsed;
        try {
            parsed = parseLineExport(filename, buffer);
        } catch (e) {   // 單檔壞掉不能拖垮整批
            this.failedFiles += 1;
            this.warnings.push(`${filename}: 解析失敗 ${e.message}`);
            return 0;
        }
        this.warnings.push(...parsed.warnings);
        if (parsed.status === PARSE_EMPTY) {
            this.emptyFiles += 1;       // 沒對話過的好友，不是錯誤
            return 0;
        }
        if (!parsed.messages.length) {
            this.failedFiles += 1;
            return 0;
        }
        const id = parsed.messages[0].conversationId;
        const existing = this.conversations.get(id) || [];
        this.conversations.set(id, existing.concat(parsed.messages));
        return parsed.messages.length;
    }

    finalize() {
        const th = this.th;
        const report = emptyReport();
        report.files = this.files;
        report.failedFiles = this.failedFiles;
        report.emptyFiles = this.emptyFiles;
        report.warnings = this.warnings;

        for (const msgs of this.conversations.values()) {
            // 時間缺失的排在原位（用 rowIndex 當第二鍵，保持穩定）
            msgs.sort((a, b) => {
                const at = a.ts === null ? -Infinity : a.ts;
                const bt = b.ts === null ? -Infinity : b.ts;
                return ascending(at, bt) || a.rowIndex - b.rowIndex;
            });
        }

        const stats = new BroadcastStats(th);
        for (const msgs of this.conversations.values()) stats.add(msgs);
        const broadcastKeys = stats.keys();
        const systemNoticeKeys = stats.systemNoticeKeys();
        report.broadcastContentGroups = broadcastKeys.size;
        report.systemNoticeGroups = systemNoticeKeys.size;

        const allPairs = [];
        const allUnanswered = [];
        for (const msgs of this.conversations.values()) {
            tagMessages(msgs, th, broadcastKeys, systemNoticeKeys);
            const { pairs, unanswered } = buildQa(msgs, th);
            allPairs.push(...pairs);
            allUnanswered.push(...unanswered);
            report.conversations += 1;
            report.messages += msgs.length;
            for (const m of msgs) {
                report.tagCounts[m.tag] = (report.tagCounts[m.tag] || 0) + 1;
                report.roles[m.role] = (report.roles[m.role] || 0) + 1;
            }
        }

        for (const p of allPairs) report.rawPairsByBucket[p.bucket] += 1;
        report.rawUnanswered = allUnanswered.length;
        for (const u of allUnanswered) {
            report.rejectCounts[u.reason] = (report.rejectCounts[u.reason] || 0) + 1;
        }

        const pairs = dedupePairs(allPairs);
        const unanswered = dedupeUnanswered(allUnanswered);
        for (const p of pairs) {
            report.uniquePairsByBucket[p.bucket] += 1;
            for (const f of p.flags) report.flagCounts[f] = (report.flagCounts[f] || 0) + 1;
        }
        report.uniqueUnanswered = unanswered.length;

        return { pairs, unanswered, report };
    }
}

/**
 * 瀏覽器入口：一批 File 物件 → 清理結果。
 * onProgress(done, total) 每個檔案回報一次，並讓出主執行緒讓 UI 有機會更新。
 */
export async function cleanFiles(files, { thresholds, onProgress, yieldEvery = 20 } = {}) {
    const run = new CleaningRun(thresholds);
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        run.addFile(file.name, await file.arrayBuffer());
        if (onProgress) onProgress(i + 1, files.length);
        // 每 N 個檔讓出主執行緒，避免 2000 個檔把畫面凍住
        if ((i + 1) % yieldEvery === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    return run.finalize();
}
