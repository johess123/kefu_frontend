export const safeUrl = (url) =>
    typeof url === 'string' && /^https?:\/\//i.test(url) ? url : '#';
