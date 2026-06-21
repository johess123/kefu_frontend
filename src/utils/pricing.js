import axios from 'axios';
import config from '../config';

// 定價單一來源於後端 config.py，前端透過 GET /api/pricing 讀取並快取。
let _cache = null;
let _inflight = null;

const FALLBACK_FEATURES = {
    optimize_services: 25,
    generate_faqs: 50,
    parse_faqs: 500,
    optimize_faq: 25,
    analyze_faqs: 500,
    parse_products: 500,
    generate_prompt: 25,
    chat: 100,
    analysis_run: 100,
};

/** 取得定價（packages + features），結果快取於記憶體。 */
export const fetchPricing = async () => {
    if (_cache) return _cache;
    if (_inflight) return _inflight;
    _inflight = axios.get(`${config.API_URL}/api/pricing`)
        .then((res) => {
            _cache = res.data;
            return _cache;
        })
        .catch((err) => {
            console.error('Failed to fetch pricing:', err);
            return { packages: [], features: FALLBACK_FEATURES };
        })
        .finally(() => { _inflight = null; });
    return _inflight;
};

/** 取得單一功能定價（coins）。若尚未載入則回傳 fallback 值。 */
export const getFeaturePrice = (featureKey) => {
    const features = (_cache && _cache.features) || FALLBACK_FEATURES;
    return features[featureKey] ?? 0;
};

/** 判斷 axios 錯誤是否為餘額不足（HTTP 402 insufficient_balance）。 */
export const isInsufficientBalanceError = (error) => {
    const detail = error?.response?.status === 402 && error?.response?.data?.detail;
    return !!(detail && detail.error === 'insufficient_balance');
};

/** 從 402 錯誤取出 { required, balance }。 */
export const getInsufficientInfo = (error) => {
    const detail = error?.response?.data?.detail || {};
    return { required: detail.required, balance: detail.balance };
};
