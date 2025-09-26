// src/components/HeroCarousel.tsx
'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { Film, Tv, Sparkles, Clapperboard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

// 定义分类类型
type Category = 'movie' | 'tv' | 'anime' | 'show';

// 为每个分类定义元数据
const CATEGORY_META = {
  movie: { label: '热门电影', icon: Film, href: '/douban?type=movie' },
  tv: { label: '热门剧集', icon: Tv, href: '/douban?type=tv' },
  anime: { label: '新番放送', icon: Sparkles, href: '/douban?type=anime' },
  show: { label: '热门综艺', icon: Clapperboard, href: '/douban?type=show' },
};

export default function HeroCarousel() {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  // 状态管理
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<(DoubanItem & { category: Category })[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // 获取所有分类的数据
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [movies, tvs, animes, shows] = await Promise.all([
          getDoubanCategories({ kind: 'movie', category: '热门', type: '全部', pageLimit: 3 }),
          getDoubanCategories({ kind: 'tv', category: '热门', type: '热门', pageLimit: 3 }),
          getDoubanCategories({ kind: 'tv', category: '日本', type: '动画', pageLimit: 3 }),
          getDoubanCategories({ kind: 'tv', category: '热门', type: '综艺', pageLimit: 3 }),
        ]);

        const combinedItems = [
          ...movies.list.map(item => ({ ...item, category: 'movie' as Category })),
          ...tvs.list.map(item => ({ ...item, category: 'tv' as Category })),
          ...animes.list.map(item => ({ ...item, category: 'anime' as Category })),
          ...shows.list.map(item => ({ ...item, category: 'show' as Category })),
        ];

        setAllItems(combinedItems);
      } catch (error) {
        console.error('Failed to fetch carousel data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Embla Carousel 事件监听
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  // 自动播放
  useEffect(() => {
    if (!emblaApi || loading) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // 5秒切换
    return () => clearInterval(interval);
  }, [emblaApi, loading]);

  const onCategoryClick = (href: string) => {
    router.push(href);
  };

  const currentItem = allItems[activeIndex];
  const currentCategory = currentItem?.category;

  if (loading) {
    return <div className="w-full aspect-[16/9] md:aspect-[16/7] bg-gray-200 dark:bg-gray-800 rounded-2xl mb-8 animate-pulse" />;
  }

  return (
    <section className="relative w-full mx-auto mb-8 md:mb-12 select-none">
      {/* 轮播大图区域 */}
      <div className="overflow-hidden rounded-2xl group" ref={emblaRef}>
        <div className="flex">
          {allItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex-[0_0_100%] relative aspect-[16/9] md:aspect-[16/7] cursor-pointer"
              onClick={() => router.push(`/play?title=${encodeURIComponent(item.title)}&douban_id=${item.id}`)}
            >
              <img src={item.poster} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

              <div className="relative h-full flex items-end p-4 sm:p-8 lg:p-12">
                <div className="text-white max-w-lg">
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold line-clamp-2 text-shadow-lg">
                    {item.title}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300 mt-2 text-shadow">
                    {item.year} - {CATEGORY_META[item.category].label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 下方分类导航 */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const Icon = meta.icon;
          const isActive = currentCategory === key;
          return (
            <div
              key={key}
              onClick={() => onCategoryClick(meta.href)}
              className={`relative p-4 rounded-lg cursor-pointer overflow-hidden transition-all duration-300 ${isActive ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className={`font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {meta.label}
                </span>
              </div>
              {/* 高亮状态下的进度条 */}
              <div className={`absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-300 ${isActive ? 'w-full' : 'w-0'}`} />
            </div>
          );
        })}
      </div>
    </section>
  );
}