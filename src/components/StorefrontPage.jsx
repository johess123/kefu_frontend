import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, ExternalLink, Globe, MessageCircle, Package, Store, X } from 'lucide-react';
import config from '../config';

const PLACEHOLDER_GRADIENTS = [
    'linear-gradient(135deg, #F4E3D2 0%, #EBC7A6 100%)',
    'linear-gradient(135deg, #EADFD1 0%, #D9C6AE 100%)',
    'linear-gradient(135deg, #F2D8C2 0%, #E7B98F 100%)',
    'linear-gradient(135deg, #E6D7C8 0%, #D9B69C 100%)',
];

const normalizeWebsiteLabel = (url) => {
    if (!url) return '';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

const StorefrontPage = () => {
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        const loadStorefront = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await fetch(`${config.API_URL}/api/store/${slug}`);
                if (!response.ok) {
                    throw new Error('找不到商品網站');
                }

                const data = await response.json();
                setStore(data.store || null);
                setProducts(Array.isArray(data.products) ? data.products : []);
            } catch (fetchError) {
                setError(fetchError.message || '載入失敗，請稍後再試');
            } finally {
                setLoading(false);
            }
        };

        loadStorefront();
    }, [slug]);

    useEffect(() => {
        if (!selectedProduct) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSelectedProduct(null);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [selectedProduct]);

    const websiteLabel = useMemo(
        () => normalizeWebsiteLabel(store?.website_url || ''),
        [store?.website_url],
    );

    const pageTitle = store?.site_title || store?.name || '商品網站';

    if (loading) {
        return (
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600;700&family=Public+Sans:wght@300;400;500;600;700&display=swap');
                    .storefront-page { font-family: 'Public Sans', sans-serif; }
                `}</style>
                <div className="storefront-page min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #FCF7F1 0%, #F7F1E8 100%)' }}>
                    <div className="text-center">
                        <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-[#D7C6B3] border-t-[#B86A35] animate-spin" />
                        <p className="text-sm tracking-[0.18em] uppercase text-[#7A6C61]">Loading Storefront</p>
                    </div>
                </div>
            </>
        );
    }

    if (error || !store) {
        return (
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600;700&family=Public+Sans:wght@300;400;500;600;700&display=swap');
                    .storefront-page { font-family: 'Public Sans', sans-serif; }
                `}</style>
                <div className="storefront-page min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #FCF7F1 0%, #F7F1E8 100%)' }}>
                    <div className="max-w-sm rounded-[32px] border border-[#E7DDD2] bg-white/90 px-8 py-10 text-center shadow-[0_24px_60px_rgba(109,79,50,0.08)]">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8DB] text-[#9C562B]">
                            <Store size={28} strokeWidth={1.8} />
                        </div>
                        <h1 className="mb-3 text-2xl text-[#2A211B]" style={{ fontFamily: "'Newsreader', serif" }}>找不到商品網站</h1>
                        <p className="text-sm leading-7 text-[#6E6258]">{error || '目前無法載入此頁面。'}</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600;700&family=Public+Sans:wght@300;400;500;600;700&display=swap');
                .storefront-page {
                    font-family: 'Public Sans', sans-serif;
                    color: #2A211B;
                    background:
                        radial-gradient(circle at top left, rgba(232, 197, 160, 0.28), transparent 30%),
                        radial-gradient(circle at top right, rgba(221, 185, 146, 0.22), transparent 28%),
                        linear-gradient(180deg, #FCF7F1 0%, #F6EFE5 100%);
                    min-height: 100vh;
                }
                .storefront-page .storefront-shell {
                    width: min(1120px, calc(100% - 32px));
                    margin: 0 auto;
                    padding: 24px 0 140px;
                }
                .storefront-page .storefront-surface {
                    border: 1px solid rgba(164, 138, 111, 0.18);
                    background: rgba(255, 252, 247, 0.84);
                    backdrop-filter: blur(18px);
                    box-shadow: 0 24px 80px rgba(109, 79, 50, 0.08);
                }
                .storefront-page .storefront-brand-title {
                    font-family: 'Newsreader', serif;
                    letter-spacing: -0.02em;
                }
                .storefront-page .storefront-card {
                    transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
                }
                .storefront-page .storefront-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 24px 50px rgba(105, 77, 49, 0.10);
                    border-color: rgba(184, 106, 53, 0.28);
                }
                .storefront-page .storefront-description-clamp {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .storefront-page .storefront-modal-panel {
                    width: min(920px, calc(100vw - 24px));
                    max-height: min(88vh, 920px);
                }
                .storefront-page .storefront-button {
                    transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
                }
                .storefront-page .storefront-button:hover {
                    transform: translateY(-1px);
                }
                @media (prefers-reduced-motion: reduce) {
                    .storefront-page .storefront-card,
                    .storefront-page .storefront-button {
                        transition: none;
                    }
                    .storefront-page .storefront-card:hover,
                    .storefront-page .storefront-button:hover {
                        transform: none;
                    }
                }
                @media (max-width: 767px) {
                    .storefront-page .storefront-shell {
                        width: min(100%, calc(100% - 24px));
                        padding-top: 16px;
                        padding-bottom: 120px;
                    }
                    .storefront-page .storefront-modal-panel {
                        width: 100vw;
                        max-height: 86vh;
                        border-bottom-left-radius: 0;
                        border-bottom-right-radius: 0;
                        align-self: flex-end;
                    }
                }
            `}</style>
            <div className="storefront-page">
                <div className="storefront-shell">
                    <header className="storefront-surface sticky top-4 z-30 flex items-center justify-between rounded-[28px] px-4 py-4 md:px-6">
                        <div className="min-w-0">
                            <p className="mb-1 text-[11px] uppercase tracking-[0.28em] text-[#8B7767]">Online Store</p>
                            <h1 className="truncate text-xl text-[#2A211B] md:text-2xl storefront-brand-title">{pageTitle}</h1>
                        </div>
                    </header>

                    <main className="pt-6">
                        <section className="storefront-surface overflow-hidden rounded-[36px]">
                            <div
                                className="relative px-5 py-8 md:px-10 md:py-12"
                                style={store.cover_url ? {
                                    backgroundImage: `linear-gradient(90deg, rgba(38, 25, 17, 0.72) 0%, rgba(38, 25, 17, 0.40) 46%, rgba(38, 25, 17, 0.14) 100%), url(${store.cover_url})`,
                                    backgroundPosition: 'center',
                                    backgroundSize: 'cover',
                                } : {
                                    background: 'linear-gradient(135deg, #F8ECDF 0%, #F5E8DA 44%, #EAD7C4 100%)',
                                }}
                            >
                                {!store.cover_url ? (
                                    <>
                                        <div className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-white/35 blur-3xl" />
                                        <div className="absolute right-0 top-12 h-52 w-52 rounded-full bg-[#E0B995]/35 blur-3xl" />
                                    </>
                                ) : null}
                                <div className="relative grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.8fr)] md:items-end">
                                    <div className={store.cover_url ? 'text-white' : ''}>
                                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-[#715A47] backdrop-blur md:text-[11px]">
                                            <Package size={14} />
                                            商品網站
                                        </div>
                                        <div className="mb-4 flex items-center gap-4">
                                            {store.logo_url ? (
                                                <img
                                                    src={store.logo_url}
                                                    alt={`${store.name} logo`}
                                                    className="h-14 w-14 rounded-2xl border border-white/45 object-cover bg-white/85 shadow-[0_18px_32px_rgba(42,33,27,0.12)]"
                                                />
                                            ) : null}
                                            <h2 className="storefront-brand-title text-[2.4rem] leading-none md:text-[3.7rem]">{store.name}</h2>
                                        </div>
                                        <p className={`max-w-2xl text-sm leading-7 md:text-base ${store.cover_url ? 'text-white/88' : 'text-[#5C4F45]'}`}>
                                            {store.description || '用簡單清楚的方式整理商品內容，讓顧客可以先快速瀏覽，再直接聯絡商家詢問。'}
                                        </p>
                                        <div className="mt-6 flex flex-wrap gap-3">
                                            {store.contact_line_url ? (
                                                <a
                                                    href={store.contact_line_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`storefront-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold cursor-pointer ${
                                                        store.cover_url
                                                            ? 'bg-white text-[#6C3D1D]'
                                                            : 'bg-[#B86A35] text-white shadow-[0_18px_34px_rgba(184,106,53,0.24)]'
                                                    }`}
                                                >
                                                    {store.contact_label}
                                                    <ArrowRight size={16} />
                                                </a>
                                            ) : null}
                                            {store.website_url ? (
                                                <a
                                                    href={store.website_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`storefront-button inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium cursor-pointer ${
                                                        store.cover_url
                                                            ? 'border-white/45 bg-white/12 text-white backdrop-blur'
                                                            : 'border-[#DCCBBA] bg-white/75 text-[#5C4F45]'
                                                    }`}
                                                >
                                                    <Globe size={16} />
                                                    {websiteLabel || '前往官網'}
                                                    <ExternalLink size={14} />
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 rounded-[28px] border border-white/40 bg-white/62 p-4 text-[#5C4F45] backdrop-blur md:p-5">
                                        <div className="rounded-[24px] bg-white/70 px-4 py-4">
                                            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#9D8773]">商品數量</p>
                                            <p className="storefront-brand-title text-4xl leading-none text-[#2A211B]">{products.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="pt-8 md:pt-10">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-[#8B7767]">Products</p>
                                    <h3 className="storefront-brand-title text-3xl text-[#2A211B] md:text-[2.6rem]">商品一覽</h3>
                                </div>
                                <p className="hidden text-sm text-[#76695F] md:block">點擊卡片查看完整說明並直接聯絡商家。</p>
                            </div>

                            {products.length === 0 ? (
                                <div className="storefront-surface rounded-[32px] px-6 py-14 text-center">
                                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F3E6D8] text-[#9C562B]">
                                        <Package size={28} strokeWidth={1.8} />
                                    </div>
                                    <h4 className="mb-3 text-2xl storefront-brand-title text-[#2A211B]">商品即將上架</h4>
                                    <p className="mx-auto max-w-md text-sm leading-7 text-[#6E6258]">商家正在整理商品資訊，之後可以再回來看看，或直接透過 LINE 聯絡詢問。</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {products.map((product, index) => (
                                        <button
                                            key={product.id || `${product.name}-${index}`}
                                            type="button"
                                            onClick={() => setSelectedProduct(product)}
                                            className="storefront-card storefront-surface overflow-hidden rounded-[28px] text-left cursor-pointer"
                                        >
                                            {product.image_url ? (
                                                <div className="aspect-[4/5] overflow-hidden bg-[#F4E6D7]">
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name || `商品 ${index + 1}`}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex aspect-[4/5] items-center justify-center" style={{ background: PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length] }}>
                                                    <div className="rounded-full border border-white/50 bg-white/45 px-4 py-2 text-sm font-medium text-[#6C5544] backdrop-blur">
                                                        商品展示
                                                    </div>
                                                </div>
                                            )}
                                            <div className="px-5 pb-5 pt-4">
                                                <h4 className="mb-2 text-xl storefront-brand-title text-[#2A211B]">{product.name || '未命名商品'}</h4>
                                                <p className="storefront-description-clamp text-sm leading-7 text-[#6B5E54]">
                                                    {product.description || '目前尚未提供商品說明。'}
                                                </p>
                                                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#A15E31]">
                                                    查看詳情
                                                    <ArrowRight size={15} />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    </main>

                    <footer className="px-1 pt-10 text-center text-sm text-[#8B7B6D]">
                        <p>{store.name} 商品網站</p>
                        <p className="mt-1 text-xs tracking-[0.18em] uppercase text-[#B1A092]">Powered by KeFu AI</p>
                    </footer>
                </div>

                {store.contact_line_url ? (
                    <>
                        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 block p-3 md:hidden">
                            <a
                                href={store.contact_line_url}
                                target="_blank"
                                rel="noreferrer"
                                className="pointer-events-auto storefront-button flex items-center justify-center gap-2 rounded-[22px] bg-[#B86A35] px-5 py-4 text-sm font-semibold text-white shadow-[0_24px_44px_rgba(184,106,53,0.32)] cursor-pointer"
                            >
                                <MessageCircle size={18} />
                                {store.contact_label}
                            </a>
                        </div>
                        <a
                            href={store.contact_line_url}
                            target="_blank"
                            rel="noreferrer"
                            className="storefront-button fixed bottom-6 right-6 z-20 hidden items-center gap-2 rounded-full bg-[#B86A35] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_38px_rgba(184,106,53,0.28)] cursor-pointer md:inline-flex"
                        >
                            <MessageCircle size={16} />
                            {store.contact_label}
                        </a>
                    </>
                ) : null}

                {selectedProduct ? (
                    <div
                        className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(42,33,27,0.56)] p-0 md:items-center md:p-4"
                        onClick={() => setSelectedProduct(null)}
                    >
                        <div
                            className="storefront-modal-panel storefront-surface overflow-hidden rounded-t-[30px] md:rounded-[34px]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-[#E6D8C9] px-5 py-4 md:px-7">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#8B7767]">Product Detail</p>
                                    <h4 className="mt-1 text-xl storefront-brand-title text-[#2A211B]">{selectedProduct.name || '商品詳情'}</h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProduct(null)}
                                    className="storefront-button flex h-11 w-11 items-center justify-center rounded-full border border-[#E6D8C9] bg-white text-[#6C5B4D] cursor-pointer"
                                    aria-label="Close product detail"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid max-h-[calc(86vh-88px)] overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(320px,0.86fr)]">
                                <div className="bg-[#F4E8DA]">
                                    {selectedProduct.image_url ? (
                                        <img
                                            src={selectedProduct.image_url}
                                            alt={selectedProduct.name || '商品圖片'}
                                            className="h-full min-h-[260px] w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex min-h-[260px] items-center justify-center bg-[linear-gradient(135deg,#F2DEC9_0%,#E6C3A4_100%)]">
                                            <div className="rounded-full border border-white/55 bg-white/45 px-4 py-2 text-sm font-medium text-[#6C5544] backdrop-blur">
                                                商品展示
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-5 py-5 md:px-7 md:py-7">
                                    <p className="text-sm leading-8 text-[#66594F]">
                                        {selectedProduct.description || '目前尚未提供商品說明。'}
                                    </p>

                                    {store.contact_line_url ? (
                                        <a
                                            href={store.contact_line_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="storefront-button mt-8 inline-flex items-center gap-2 rounded-full bg-[#B86A35] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(184,106,53,0.24)] cursor-pointer"
                                        >
                                            <MessageCircle size={16} />
                                            {store.contact_label}
                                        </a>
                                    ) : null}

                                    {store.website_url ? (
                                        <a
                                            href={store.website_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="storefront-button mt-3 inline-flex items-center gap-2 rounded-full border border-[#DDCCBB] bg-white px-5 py-3 text-sm font-medium text-[#5F5248] cursor-pointer"
                                        >
                                            <Globe size={16} />
                                            前往官網
                                            <ExternalLink size={14} />
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );
};

export default StorefrontPage;
