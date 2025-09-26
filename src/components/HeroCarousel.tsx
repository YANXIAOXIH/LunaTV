// src/components/HeroCarousel.tsx
'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { Film, Tv, Sparkles, Clapperboard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { getDoubanCategories, getDoubanItemDetails, DoubanItemDetails } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';


// 定义分类类型
type Category = 'movie' | 'tv' | 'anime' | 'show';

// 为每个分类定义元数据
const CATEGORY_META = {
  movie: { label: '热门电影', icon: Film, href: '/douban?type=movie' },
  tv: { label: '热门剧集', icon: Tv, href: '/douban?type=tv' },
  anime: { label: '新番放送', icon: Sparkles, href: '/douban?type=anime' },
  show: { label: '热门综艺', icon: Clapperboard, href: '/douban?type=show' },
};

// 扩展 DoubanItem 类型以包含我们需要的所有信息
interface CarouselItem extends DoubanItem {
  category: Category;
  backdrop: string; // 高清剧照 (必须有，回退后也是poster)
  overview?: string | null; // 简介
}


export default function HeroCarousel() {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  // 状态管理
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<CarouselItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // 获取所有分类的数据
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [movies, tvs, animes, shows] = await Promise.all([
          getDoubanCategories({ kind: 'movie', category: '热门', type: '全部', pageLimit: 3 }),
          getDoubanCategories({ kind: 'tv', category: '热门', type: '热门', pageLimit: 3 }),
          getDoubanCategories({ kind: 'tv', category: '日本', type: '动画', pageLimit: 3 }),
          getDoubanCategories({ kind: 'tv', category: '热门', type: '综艺', pageLimit: 3 }),
        ]);

        const combinedItems: (DoubanItem & { category: Category })[] = [
          ...movies.list.map(item => ({ ...item, category: 'movie' as Category })),
          ...tvs.list.map(item => ({ ...item, category: 'tv' as Category })),
          ...animes.list.map(item => ({ ...item, category: 'anime' as Category })),
          ...shows.list.map(item => ({ ...item, category: 'show' as Category })),
        ];

        // 并行获取所有影片的详细信息（剧照和简介）
        const itemsWithDetails = await Promise.all(
          combinedItems.map(async (item) => {
            const details: DoubanItemDetails = await getDoubanItemDetails(item.id);
            return {
              ...item,
              backdrop: details.backdropUrl || item.poster, // 剧照URL，如果失败则回退到海报URL
              overview: details.overview,
            };
          })
        );

        setAllItems(itemsWithDetails);
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
    onSelect(); // 初始化时设置一次
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  // 自动播放
  useEffect(() => {
    if (!emblaApi || loading) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // 每5秒切换
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
              <img src={processImageUrl(item.backdrop)} alt={`${item.title} background`} className="absolute inset-0 w-full h-full object-cover" />
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

                  {item.overview && (
                    <p className="hidden md:block text-sm text-gray-200 mt-4 line-clamp-3 text-shadow">
                      {item.overview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 悬浮的分类导航 */}
      <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 z-10 w-[calc(100%-2rem)] sm:w-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const isActive = currentCategory === key;
            const itemForCategory = allItems.find(item => item.category === key);

            return (
              <div
                key={key}
                onClick={() => onCategoryClick(meta.href)}
                className={`relative p-3 rounded-lg cursor-pointer overflow-hidden transition-all duration-300 backdrop-blur-md group/nav-item
                  ${isActive
                    ? 'bg-white/30'
                    : 'bg-black/40 hover:bg-black/60'
                  }`
                }
                style={{
                  backgroundImage: itemForCategory ? `url(${processImageUrl(itemForCategory.poster)})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover/nav-item:bg-black/30 transition-colors duration-300" />

                <div className="relative flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-300'}`} />
                  <span className={`text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-100'}`}>
                    {meta.label}
                  </span>
                </div>
                <div className={`absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-300 ${isActive ? 'w-full' : 'w-0'}`} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}