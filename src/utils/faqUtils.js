export const FAQ_MAX_QUESTION = 100;
export const FAQ_MAX_ANSWER = 500;
export const FAQ_MAX_COUNT = 200;
export const FAQ_MAX_CATEGORY = 30;

/**
 * 取得新增問答的預設分類：使用最後一筆 FAQ 的分類，或 '常見問題'
 */
export function getDefaultFaqCategory(faqs) {
    if (!faqs || faqs.length === 0) return '常見問題';
    return faqs[faqs.length - 1].category || '常見問題';
}

/**
 * 儲存/送出前的完整驗證。
 * @returns {{ error: string|null, cleaned: array|null }}
 *   error 為 null 表示通過，cleaned 為過濾掉全空組後的陣列。
 */
export function validateFaqsForSave(faqs, drafts = []) {
    const cleaned = (faqs || []).filter(
        f => (f.question?.trim() !== '' || f.answer?.trim() !== '')
    );
    // 正式 FAQ 可以是 0 組（全部移進草稿庫），但兩邊都空就沒有東西可存
    if (cleaned.length === 0 && (drafts || []).length === 0)
        return { error: '請至少新增一組 FAQ 並填寫內容', cleaned: null };
    if (cleaned.some(f => !f.question?.trim() || !f.answer?.trim()))
        return { error: '請填寫所有 FAQ 的問題與回答，或是刪除未填寫完整的組別', cleaned: null };
    if (cleaned.some(f => (f.question?.length || 0) > FAQ_MAX_QUESTION || (f.answer?.length || 0) > FAQ_MAX_ANSWER))
        return { error: `部分內容超過字數限制 (問題 ${FAQ_MAX_QUESTION} 字，回答 ${FAQ_MAX_ANSWER} 字)`, cleaned: null };
    // 草稿與正式 FAQ 是同一次儲存，後端對草稿套用同一組欄位驗證，一筆不合法整個儲存就被拒。
    // 訊息必須點名問題出在草稿而不是正式 FAQ，否則商家會在知識庫裡白找一輪。
    // （匯入超額的內容會直接落進草稿，長度可能超標，所以這條路是真的走得到的。）
    const badDraft = (drafts || []).find(d =>
        !d.question?.trim() || !d.answer?.trim()
        || (d.question?.length || 0) > FAQ_MAX_QUESTION
        || (d.answer?.length || 0) > FAQ_MAX_ANSWER
    );
    if (badDraft) {
        const label = (badDraft.question || '').trim().slice(0, 20) || '(未填寫問題)';
        return {
            error: `備用草稿庫裡有一組草稿不符合規定：「${label}」。`
                + `請開啟備用草稿庫編輯這組草稿——問題與回答皆不可空白，`
                + `且問題須在 ${FAQ_MAX_QUESTION} 字內、回答須在 ${FAQ_MAX_ANSWER} 字內。`,
            cleaned: null,
        };
    }
    return { error: null, cleaned };
}

/**
 * AI 健檢前的驗證（不過濾空組，直接對全體檢查）。
 * @returns {string|null} 錯誤訊息，null 表示通過
 */
export function validateFaqsForAnalyze(faqs) {
    if (!faqs || faqs.length === 0) return '請先新增問答組';
    if (faqs.some(f => !f.question?.trim() || !f.answer?.trim()))
        return '請填寫所有 FAQ 的問題與回答，再進行健檢';
    if (faqs.some(f => (f.question?.length || 0) > FAQ_MAX_QUESTION || (f.answer?.length || 0) > FAQ_MAX_ANSWER))
        return `部分內容超過字數限制 (問題 ${FAQ_MAX_QUESTION} 字，回答 ${FAQ_MAX_ANSWER} 字)`;
    return null;
}

/**
 * 單筆 FAQ 優化前的驗證。
 * @returns {string|null} 錯誤訊息，null 表示通過
 */
export function validateFaqItemForOptimize(faq) {
    if (!faq.question?.trim() || !faq.answer?.trim())
        return '請先輸入完整的問題與回答內容才能進行優化';
    if ((faq.question?.length || 0) > FAQ_MAX_QUESTION || (faq.answer?.length || 0) > FAQ_MAX_ANSWER)
        return `內容超過字數限制 (問題 ${FAQ_MAX_QUESTION} 字，回答 ${FAQ_MAX_ANSWER} 字)`;
    return null;
}

export const FAQ_QUOTA_FULL_MESSAGE =
    `正式 FAQ 已達 ${FAQ_MAX_COUNT} 組上限，請先將一組目前不使用的 FAQ 移至備用草稿庫。`;

/**
 * 把一筆 FAQ／草稿與彈窗編輯後的值合併成正規化物件。
 * editedValues 沒給的欄位就沿用原值；分類空白時退回「常見問題」。
 */
export function mergeFaqValues(src, editedValues) {
    const v = editedValues || {};
    const category = (v.category !== undefined ? v.category : src.category) || '常見問題';
    const image_id = v.image_id !== undefined ? v.image_id : (src.image_id || '');
    // 附圖的預覽 URL 必須跟著走，否則草稿卡片與彈窗都會 render 出空的 <img>。
    // 彈窗回傳的是 _preview_url，從伺服器載入的資料帶的是 preview_url，兩邊都要接得住。
    const previewUrl = image_id
        ? (v._preview_url !== undefined
            ? v._preview_url
            : (src._preview_url || src.preview_url || ''))
        : '';
    const merged = {
        id: src.id,
        question: v.question !== undefined ? v.question : (src.question || ''),
        answer: v.answer !== undefined ? v.answer : (src.answer || ''),
        category: category.trim() || '常見問題',
        image_id,
    };
    // 沒有附圖就不要留下空鍵，維持物件與正式 FAQ 同構
    if (previewUrl) merged._preview_url = previewUrl;
    return merged;
}

/** 正式 FAQ → 備用草稿庫。草稿不設上限，所以不需要檢查額度。 */
export function moveFaqToDrafts(faqs, drafts, index, editedValues) {
    const src = faqs[index];
    if (!src) return { faqs, drafts };
    return {
        faqs: faqs.filter((_, i) => i !== index),
        drafts: [...drafts, mergeFaqValues(src, editedValues)],
    };
}

/**
 * 備用草稿庫 → 正式 FAQ。
 * 額度滿時回傳 error 且兩個陣列原封不動 —— 草稿絕不可因為加入失敗而遺失。
 */
export function restoreDraftToFaqs(faqs, drafts, draftId, editedValues) {
    const src = (drafts || []).find(d => d.id === draftId);
    if (!src) return { faqs, drafts, error: null };
    if (faqs.length >= FAQ_MAX_COUNT) {
        return { faqs, drafts, error: FAQ_QUOTA_FULL_MESSAGE };
    }
    const restored = mergeFaqValues(src, editedValues);
    // id 原樣保留；只有極少數撞號（例如匯入產生的巧合）才重新產生
    if (faqs.some(f => f.id === restored.id)) restored.id = Date.now().toString();
    return {
        faqs: [...faqs, restored],
        drafts: drafts.filter(d => d.id !== draftId),
        error: null,
    };
}

/**
 * 匯入時依剩餘額度分割：塞得下的進正式 FAQ，超額的進草稿庫。
 * 超額內容一律不丟棄 —— 草稿庫不設上限，一定放得下。
 */
export function splitImportByQuota(existingCount, incoming) {
    const remaining = Math.max(0, FAQ_MAX_COUNT - existingCount);
    const list = incoming || [];
    return { toFaqs: list.slice(0, remaining), toDrafts: list.slice(remaining) };
}

/** 草稿分類是快照、可能已不在正式分類裡，恢復時要把它建回來。 */
export function ensureCategory(categoryOrder, category) {
    const cat = (category || '常見問題').trim() || '常見問題';
    return categoryOrder.includes(cat) ? categoryOrder : [...categoryOrder, cat];
}
