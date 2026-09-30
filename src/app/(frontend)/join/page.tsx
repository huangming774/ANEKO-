'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Palette, Share2, Calendar, Camera, Megaphone, Code, ChevronDown, CheckCircle, Send, Sparkles, Star, Music } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';

const benefits = [
  { icon: <Heart size={28} />, title: '结交同好', desc: '认识志同道合的动漫爱好者，一起追番、讨论、创作' },
  { icon: <Palette size={28} />, title: '提升技能', desc: '绘画、摄影、Cosplay、视频制作等多种技能工坊' },
  { icon: <Calendar size={28} />, title: '丰富活动', desc: '观影会、漫展、Cosplay大赛、知识竞赛等精彩活动' },
  { icon: <Star size={28} />, title: '专属福利', desc: '社团周边、活动优先参与权、嘉宾见面会名额' },
  { icon: <Sparkles size={28} />, title: '展示平台', desc: '作品展示、舞台表演、创作分享等多种展示机会' },
  { icon: <Music size={28} />, title: '快乐源泉', desc: '在忙碌的学习生活之余，找到属于自己的二次元乐园' },
];

const faqs = [
  { q: '加入社团需要什么条件？', a: '只要你热爱动漫文化，都可以申请加入！不需要任何专业技能，我们欢迎所有二次元爱好者。' },
  { q: '加入社团需要缴费吗？', a: '社团收取少量会费（每学期20元），用于活动经费和场地租赁。特殊情况可申请减免。' },
  { q: '没有特长可以加入吗？', a: '当然可以！加入社团就是为了学习和成长。我们有各种工坊和培训，帮助你发展兴趣爱好。' },
  { q: '活动一般在什么时间？', a: '主要活动安排在周末和节假日，不会影响正常上课时间。具体活动会在群内提前通知。' },
];

export default function JoinPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submitApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const formData = new FormData(event.currentTarget);

    try {
      await apiRequest('/api/join-applications', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          student_id: formData.get('student_id'),
          grade: formData.get('grade'),
          major: formData.get('major'),
          phone: formData.get('phone'),
          qq: formData.get('qq'),
          departments: [],
          intro: formData.get('intro'),
        }),
      });
      setFormSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '提交失败');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-anime-pink via-anime-purple to-anime-blue py-24">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div className="absolute top-10 left-10 text-7xl opacity-20" animate={{ y: [0,-20,0] }} transition={{ duration: 4, repeat: Infinity }}>🌸</motion.div>
          <motion.div className="absolute top-20 right-20 text-5xl opacity-20" animate={{ y: [0,-15,0] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}>✨</motion.div>
          <motion.div className="absolute bottom-10 left-1/4 text-6xl opacity-20" animate={{ y: [0,-18,0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}>⭐</motion.div>
          <motion.div className="absolute bottom-20 right-1/3 text-4xl opacity-20" animate={{ y: [0,-12,0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 2 }}>🎵</motion.div>
        </div>
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm mb-6">🎉 2026年秋季招新进行中</span>
            <h1 className="text-5xl md:text-7xl font-bold font-round mb-6">加入我们</h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8">在二次元的世界里，找到属于你的伙伴</p>
            <a href="#signup" className="inline-block px-8 py-4 bg-white text-anime-pink font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300">
              立即报名
            </a>
          </motion.div>
        </div>
      </div>

      {/* 加入好处 */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2 className="text-4xl font-bold text-center gradient-text mb-4" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>加入动漫社的理由</motion.h2>
          <p className="text-center text-gray-500 mb-16">这里不只有动漫，更有成长与欢乐</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((item, i) => (
              <motion.div
                key={i}
                className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-anime-pink to-anime-purple rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 报名表单 */}
      <section id="signup" className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <motion.h2 className="text-4xl font-bold text-center gradient-text mb-4" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>填写报名信息</motion.h2>
          <p className="text-center text-gray-500 mb-12">请填写真实信息，我们会尽快联系你</p>

          <AnimatePresence mode="wait">
            {!formSubmitted ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
                onSubmit={submitApplication}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
                    <input name="name" type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-anime-pink focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all" placeholder="请输入你的姓名" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">学号 *</label>
                    <input name="student_id" type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-anime-pink focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all" placeholder="请输入你的学号" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">年级 *</label>
                    <select name="grade" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-anime-pink focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all bg-white">
                      <option value="">请选择年级</option>
                      <option value="1">大一</option>
                      <option value="2">大二</option>
                      <option value="3">大三</option>
                      <option value="4">大四</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">专业</label>
                    <input name="major" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-anime-pink focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all" placeholder="请输入你的专业" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">联系方式 *</label>
                  <input name="phone" type="tel" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-anime-pink focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all" placeholder="手机号码" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">QQ号 *</label>
                  <input name="qq" type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-anime-pink focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all" placeholder="用于加入社团QQ群" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自我介绍 / 想说的话</label>
                  <textarea name="intro" rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-anime-pink focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all resize-none" placeholder="简单介绍一下自己，或者想对社团说的话..." />
                </div>

                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {submitError}
                  </div>
                )}

                <motion.button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-anime-pink to-anime-purple text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-anime-pink/30 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Send size={20} />
                  提交报名
                </motion.button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-gray-50 rounded-3xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                  className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle size={48} className="text-green-500" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">报名成功！🎉</h3>
                <p className="text-gray-600 mb-2">感谢你的报名，我们已收到你的信息</p>
                <p className="text-gray-500 text-sm mb-8">请加入QQ群 <span className="text-anime-pink font-bold">123456789</span> 等待后续通知</p>
                <button onClick={() => setFormSubmitted(false)} className="px-6 py-2 border border-anime-pink text-anime-pink rounded-full hover:bg-anime-pink hover:text-white transition-all">
                  继续报名（帮朋友报名）
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 dot-bg">
        <div className="max-w-3xl mx-auto">
          <motion.h2 className="text-4xl font-bold text-center gradient-text mb-4" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>常见问题</motion.h2>
          <p className="text-center text-gray-500 mb-12">有疑问？看看这里有没有你想知道的</p>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-bold text-gray-800 pr-4">{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-gray-600 border-t border-gray-100 pt-4">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 底部CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-anime-pink to-anime-purple text-white text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">还在犹豫什么？</h2>
        <p className="text-xl opacity-90 mb-8">ANEKO动漫社期待你的加入！</p>
        <a href="#signup" className="inline-block px-8 py-4 bg-white text-anime-pink font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300">
          立即报名
        </a>
      </section>
    </div>
  );
}
