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
export function validateFaqsForSave(faqs) {
    const cleaned = (faqs || []).filter(
        f => (f.question?.trim() !== '' || f.answer?.trim() !== '')
    );
    if (cleaned.length === 0)
        return { error: '請至少新增一組 FAQ 並填寫內容', cleaned: null };
    if (cleaned.some(f => !f.question?.trim() || !f.answer?.trim()))
        return { error: '請填寫所有 FAQ 的問題與回答，或是刪除未填寫完整的組別', cleaned: null };
    if (cleaned.some(f => (f.question?.length || 0) > FAQ_MAX_QUESTION || (f.answer?.length || 0) > FAQ_MAX_ANSWER))
        return { error: `部分內容超過字數限制 (問題 ${FAQ_MAX_QUESTION} 字，回答 ${FAQ_MAX_ANSWER} 字)`, cleaned: null };
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
