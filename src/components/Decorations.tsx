'use client';

import { useEffect, useState } from 'react';

interface Sakura {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
}

interface Star {
  id: number;
  left: number;
  top: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
}

export default function Decorations() {
  const [sakuras, setSakuras] = useState<Sakura[]>([]);
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // 生成樱花
    const sakuraData: Sakura[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 10,
      animationDelay: Math.random() * 10,
      size: 12 + Math.random() * 12,
    }));
    setSakuras(sakuraData);

    // 生成星星
    const starData: Star[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDuration: 2 + Math.random() * 3,
      animationDelay: Math.random() * 2,
      size: 4 + Math.random() * 8,
    }));
    setStars(starData);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 樱花飘落 */}
      {sakuras.map((sakura) => (
        <div
          key={`sakura-${sakura.id}`}
          className="absolute sakura"
          style={{
            left: `${sakura.left}%`,
            animationDuration: `${sakura.animationDuration}s`,
            animationDelay: `${sakura.animationDelay}s`,
          }}
        >
          <span
            style={{ fontSize: `${sakura.size}px` }}
            className="text-anime-sakura opacity-70"
          >
            🌸
          </span>
        </div>
      ))}

      {/* 星星闪烁 */}
      {stars.map((star) => (
        <div
          key={`star-${star.id}`}
          className="absolute twinkle"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDuration: `${star.animationDuration}s`,
            animationDelay: `${star.animationDelay}s`,
          }}
        >
          <span
            style={{ fontSize: `${star.size}px` }}
            className="text-anime-pink opacity-50"
          >
            ✦
          </span>
        </div>
      ))}

      {/* 音符装饰 */}
      <div className="absolute top-1/4 left-10 animate-float">
        <span className="text-2xl text-anime-purple opacity-40">♪</span>
      </div>
      <div className="absolute top-1/3 right-16 animate-float" style={{ animationDelay: '2s' }}>
        <span className="text-3xl text-anime-pink opacity-40">♫</span>
      </div>
      <div className="absolute bottom-1/4 left-20 animate-float" style={{ animationDelay: '4s' }}>
        <span className="text-2xl text-anime-blue opacity-40">♪</span>
      </div>
    </div>
  );
}