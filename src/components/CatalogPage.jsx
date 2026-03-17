import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import config from '../config';

const CatalogPage = () => {
    const { agentId } = useParams();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [expired, setExpired] = useState(false);
    const [brandName, setBrandName] = useState('');
    const [products, setProducts] = useState([]);
    const [isFiltered, setIsFiltered] = useState(false);
    const [fullCatalogUrl, setFullCatalogUrl] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const exp = searchParams.get('exp') || '0';
                const productsParam = searchParams.get('products') || '';
                const url = `${config.API_URL}/api/catalog/${agentId}?exp=${exp}&products=${encodeURIComponent(productsParam)}`;
                const res = await fetch(url);

                if (!res.ok) {
                    setError('找不到商品目錄');
                    setLoading(false);
                    return;
                }

                const data = await res.json();

                if (data.expired) {
                    setExpired(true);
                } else {
                    setBrandName(data.brand_name);
                    setProducts(data.products);
                    setIsFiltered(data.is_filtered);
                    setFullCatalogUrl(data.full_catalog_url);
                }
            } catch (e) {
                setError('載入失敗，請稍後再試');
            } finally {
                setLoading(false);
            }
        };

        fetchCatalog();
    }, [agentId, searchParams]);

    // Loading state
    if (loading) {
        return (
            <>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap');`}</style>
                <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF7ED 0%, #FFF7F0 50%, #FEF2F2 100%)', fontFamily: "'Nunito Sans', sans-serif" }}>
                    <div className="text-center">
                        <div className="relative w-12 h-12 mx-auto mb-5">
                            <div className="absolute inset-0 rounded-full border-2 border-orange-200"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin"></div>
                        </div>
                        <p className="text-sm text-stone-400 tracking-wide">載入商品目錄中...</p>
                    </div>
                </div>
            </>
        );
    }

    // Error state
    if (error) {
        return (
            <>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap');`}</style>
                <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(135deg, #FEF7ED 0%, #FFF7F0 50%, #FEF2F2 100%)', fontFamily: "'Nunito Sans', sans-serif" }}>
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <p className="text-stone-500">{error}</p>
                    </div>
                </div>
            </>
        );
    }

    // Expired state
    if (expired) {
        return (
            <>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap');`}</style>
                <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(135deg, #FEF7ED 0%, #FFF7F0 50%, #FEF2F2 100%)', fontFamily: "'Nunito Sans', sans-serif" }}>
                    <div className="text-center max-w-xs">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-50 flex items-center justify-center" style={{ boxShadow: '0 4px 24px rgba(217, 119, 6, 0.1)' }}>
                            <svg className="w-9 h-9 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-stone-800 mb-2">連結已過期</h1>
                        <p className="text-sm text-stone-400 leading-relaxed">此商品目錄連結已失效，請向客服重新索取最新連結。</p>
                    </div>
                </div>
            </>
        );
    }

    // Main catalog view
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap');
                .catalog-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                @media (hover: hover) {
                    .catalog-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .catalog-card { transition: none; }
                    .catalog-card:hover { transform: none; }
                }
            `}</style>
            <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FEF7ED 0%, #FFF7F0 50%, #FEF2F2 100%)', fontFamily: "'Nunito Sans', sans-serif" }}>
                {/* Header */}
                <header className="sticky top-0 z-10 backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 251, 245, 0.85)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="max-w-2xl mx-auto px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-stone-800 leading-tight">{brandName}</h1>
                                <p className="text-xs text-stone-400">商品目錄</p>
                            </div>
                        </div>
                        {isFiltered && (
                            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(249, 115, 22, 0.06)' }}>
                                <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                                </svg>
                                <span className="text-xs text-stone-500">正在顯示篩選商品</span>
                                <span className="text-xs text-stone-300 mx-1">|</span>
                                <a href={fullCatalogUrl} className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer" style={{ transition: 'color 0.15s' }}>
                                    查看完整目錄
                                </a>
                            </div>
                        )}
                    </div>
                </header>

                {/* Product count */}
                <div className="max-w-2xl mx-auto px-5 pt-5 pb-1">
                    <p className="text-xs text-stone-400">{products.length} 項商品</p>
                </div>

                {/* Product grid */}
                <main className="max-w-2xl mx-auto px-5 pb-10 pt-3">
                    {products.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                </svg>
                            </div>
                            <p className="text-stone-400 text-sm">目前沒有商品</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {products.map((product, idx) => (
                                <div
                                    key={idx}
                                    className="catalog-card bg-white rounded-2xl overflow-hidden cursor-default"
                                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
                                >
                                    {product.image_url ? (
                                        <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.06) 0%, transparent 40%)' }}></div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center" style={{ aspectRatio: '4 / 3', background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}>
                                            <svg className="w-10 h-10 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <h2 className="font-bold text-stone-800 text-sm leading-snug">{product.name}</h2>
                                        {product.description && (
                                            <p className="text-xs text-stone-400 mt-1.5 leading-relaxed whitespace-pre-line line-clamp-3">{product.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="text-center pb-8">
                    <p className="text-xs text-stone-300">Powered by KeFu AI</p>
                </footer>
            </div>
        </>
    );
};

export default CatalogPage;
