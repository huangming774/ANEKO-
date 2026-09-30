'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-anime-pink/10 via-anime-purple/10 to-anime-blue/10 flex items-center justify-center px-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 text-8xl opacity-10"
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          🌸
        </motion.div>
        <motion.div
          className="absolute top-40 right-20 text-6xl opacity-10"
          animate={{ y: [0, -15, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        >
          ⭐
        </motion.div>
        <motion.div
          className="absolute bottom-20 left-1/4 text-7xl opacity-10"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: 0.5 }}
        >
          ✨
        </motion.div>
        <motion.div
          className="absolute bottom-40 right-1/3 text-5xl opacity-10"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 2 }}
        >
          🎵
        </motion.div>
      </div>

      <div className="text-center relative z-10 max-w-lg">
        {/* 404 大数字 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <span className="text-[10rem] md:text-[12rem] font-bold gradient-text leading-none select-none">
            404
          </span>
        </motion.div>

        {/* 哭泣的猫猫 */}
        <motion.div
          className="text-7xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            😿
          </motion.span>
        </motion.div>

        {/* 提示文字 */}
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 font-round"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          呜呜，页面不见了...
        </motion.h2>

        <motion.p
          className="text-gray-500 text-lg mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          这个页面可能被魔法少女施了隐身术<br />
          或者小猫咪不小心把它藏起来了
        </motion.p>

        {/* 返回按钮 */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link href="/">
            <motion.span
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-anime-pink to-anime-purple text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              🏠 回到首页
            </motion.span>
          </Link>
          <Link href="/about">
            <motion.span
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-anime-pink text-anime-pink font-bold rounded-full hover:bg-anime-pink hover:text-white transition-all"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              🐱 了解我们
            </motion.span>
          </Link>
        </motion.div>

        {/* 彩蛋文字 */}
        <motion.p
          className="mt-12 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          “即使迷路了也没关系，二次元的世界总有出路” —— ANEKO动漫社
        </motion.p>
      </div>
    </div>
  );
}