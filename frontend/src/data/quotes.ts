interface Quote {
  en: string
  ar: string
}

export const QUOTES: Quote[] = [
  { en: 'The secret of getting ahead is getting started.', ar: 'سرّ التقدم هو أن تبدأ.' },
  { en: 'Small steps every day add up to big results.', ar: 'الخطوات الصغيرة كل يوم تصلن إلى نتائج كبيرة.' },
  { en: 'Done is better than perfect. Ship it.', ar: 'الإنجاز أفضل من الكمال. أتممها.' },
  { en: 'You do not need to be great to start, but you must start to be great.', ar: 'لست بحاجة لأن تكون عظيماً لتستهل، بل لتبدأ لتصبح عظيماً.' },
  { en: 'Focus on the next step, not the whole mountain.', ar: 'ركّز على الخطوة التالية لا على الجبل كله.' },
  { en: 'Discipline is choosing what you want most over what you want now.', ar: 'الانضباط هو اختيار ما تريده أكثر على حساب ما تريده الآن.' },
  { en: 'The best time was yesterday. The next best is now.', ar: 'أفضل وقت كان أمس، وأفضل تالٍ هو الآن.' },
  { en: 'A little progress each day adds up to big results.', ar: 'قليل من التقدم كل يوم يصنع الفرق الكبير.' },
]

export function quoteOfTheDay(): Quote {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}