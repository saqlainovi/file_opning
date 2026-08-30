export interface PilotBookItem {
  sl: number;
  class: string;
  title: string;
  author?: string;
  quantity: number;
}

export const PRIMARY_PILOT_BOOKS: PilotBookItem[] = [
  { sl: 1, class: "১ম", title: "সোনামণি", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 2, class: "১ম", title: "আকাশ ভেঙ্গে পড়া", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 3, class: "১ম", title: "রস খাওয়া", author: "শওকত আলম সিদ্দিকী। শ্যামলী আকবর", quantity: 2 },
  { sl: 4, class: "১ম", title: "এক ছিল ব্যাঙ", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 5, class: "১ম", title: "বাঘের সাথে লড়াই", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 6, class: "১ম", title: "বনের শিকারী", author: "মুহিত হাসান", quantity: 2 },
  { sl: 7, class: "১ম", title: "সোনালি রোদের পাখি", author: "মুহিত হাসান", quantity: 2 },
  { sl: 8, class: "১ম", title: "সব খেলার সেরা", author: "মুহিত হাসান", quantity: 2 },
  { sl: 9, class: "১ম", title: "সূর্যমণি", author: "মুহিত হাসান", quantity: 2 },
  { sl: 10, class: "১ম", title: "নীল পাহাড়ের চূড়া", author: "মুহিত হাসান", quantity: 2 },
  { sl: 11, class: "২য়", title: "রঙিন ফুল", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 12, class: "২য়", title: "ছোট্ট নদী", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 13, class: "২য়", title: "পাখির গান", author: "মুহিত হাসান", quantity: 2 },
  { sl: 14, class: "২য়", title: "মেঘের দেশে", author: "মুহিত হাসান", quantity: 2 },
  { sl: 15, class: "২য়", title: "চাঁদের বুড়ি", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 16, class: "৩য়", title: "বীরের গল্প", author: "মুহিত হাসান", quantity: 2 },
  { sl: 17, class: "৩য়", title: "বুদ্ধিমান শেয়াল", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 18, class: "৩য়", title: "সোনার হরিণ", author: "মুহিত হাসান", quantity: 2 },
  { sl: 19, class: "৩য়", title: "নয়নতারা", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 20, class: "৩য়", title: "আলোর খোঁজে", author: "মুহিত হাসান", quantity: 2 },
  { sl: 21, class: "৪র্থ", title: "মুক্তিযুদ্ধের কিশোর গল্প", author: "মুহিত হাসান", quantity: 2 },
  { sl: 22, class: "৪র্থ", title: "বিজ্ঞানের মজার খেলা", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 23, class: "৪র্থ", title: "সাগর তলের রাজ্য", author: "মুহিত হাসান", quantity: 2 },
  { sl: 24, class: "৪র্থ", title: "পাহাড়ের দেশে অভিযান", author: "শওকত আলম সিদ্দিকী", quantity: 2 },
  { sl: 25, class: "৪র্থ", title: "মহাকাশের কথা", author: "মুহিত হাসান", quantity: 2 },
  { sl: 26, class: "৫ম", title: "একাত্তরের দিনগুলি (কিশোর সংস্করণ)", author: "জাহানারা ইমাম", quantity: 2 },
  { sl: 27, class: "৫ম", title: "ছোটদের বিশ্বকোষ", author: "মুহিত হাসান", quantity: 2 },
  { sl: 28, class: "৫ম", title: "আম আঁটির ভেঁপু", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়", quantity: 2 },
  { sl: 29, class: "৫ম", title: "হযরত মুহম্মদ (সা.) এর জীবন", author: "মুহিত হাসান", quantity: 2 },
  { sl: 30, class: "৫ম", title: "বঙ্গবন্ধুর ছেলেবেলা", author: "মুহিত হাসান", quantity: 2 }
];

export const SECONDARY_PILOT_BOOKS: PilotBookItem[] = [
  { sl: 1, class: "৬ষ্ঠ", title: "ছুটি", author: "রবীন্দ্রনাথ ঠাকুর", quantity: 2 },
  { sl: 2, class: "৬ষ্ঠ", title: "পদ্মা নদীর মাঝি", author: "মানিক বন্দ্যোপাধ্যায়", quantity: 2 },
  { sl: 3, class: "৬ষ্ঠ", title: "মেঘনাদবধ কাব্য (কিশোর)", author: "মাইকেল মধুসূদন দত্ত", quantity: 2 },
  { sl: 4, class: "৬ষ্ঠ", title: "চাঁদের পাহাড়", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়", quantity: 2 },
  { sl: 5, class: "৬ষ্ঠ", title: "টেনিদা সমগ্র", author: "নারায়ণ গঙ্গোপাধ্যায়", quantity: 2 },
  { sl: 6, class: "৭ম", title: "গল্পগুচ্ছ (নির্বাচিত)", author: "রবীন্দ্রনাথ ঠাকুর", quantity: 2 },
  { sl: 7, class: "৭ম", title: "সঞ্চয়িতা", author: "রবীন্দ্রনাথ ঠাকুর", quantity: 2 },
  { sl: 8, class: "৭ম", title: "অগ্নিবীণা", author: "কাজী নজরুল ইসলাম", quantity: 2 },
  { sl: 9, class: "৭ম", title: "শ্রীকান্ত", author: "শরৎচন্দ্র চট্টোপাধ্যায়", quantity: 2 },
  { sl: 10, class: "৭ম", title: "শঙ্কুর ডায়েরি", author: "সত্যজিৎ রায়", quantity: 2 },
  { sl: 11, class: "৮ম", title: "চোখের বালি", author: "রবীন্দ্রনাথ ঠাকুর", quantity: 2 },
  { sl: 12, class: "৮ম", title: "মৃত্যুক্ষুধা", author: "কাজী নজরুল ইসলাম", quantity: 2 },
  { sl: 13, class: "৮ম", title: "দেবদাস", author: "শরৎচন্দ্র চট্টোপাধ্যায়", quantity: 2 },
  { sl: 14, class: "৮ম", title: "হাজার বছর ধরে", author: "জহির রায়হান", quantity: 2 },
  { sl: 15, class: "৮ম", title: "ফেলুদা সমগ্র", author: "সত্যজিৎ রায়", quantity: 2 },
  { sl: 16, class: "৯ম", title: "গোরা", author: "রবীন্দ্রনাথ ঠাকুর", quantity: 2 },
  { sl: 17, class: "৯ম", title: "চরিত্রহীন", author: "শরৎচন্দ্র চট্টোপাধ্যায়", quantity: 2 },
  { sl: 18, class: "৯ম", title: "কড়ি ও কোমল", author: "রবীন্দ্রনাথ ঠাকুর", quantity: 2 },
  { sl: 19, class: "৯ম", title: "লালসালু", author: "সৈয়দ ওয়ালীউল্লাহ", quantity: 2 },
  { sl: 20, class: "৯ম", title: "একাত্তরের দিনগুলি", author: "জাহানারা ইমাম", quantity: 2 },
  { sl: 21, class: "১০ম", title: "গীতাঞ্জলি", author: "রবীন্দ্রনাথ ঠাকুর", quantity: 2 },
  { sl: 22, class: "১০ম", title: "বিশের বাঁশী", author: "কাজী নজরুল ইসলাম", quantity: 2 },
  { sl: 23, class: "১০ম", title: "পথের পাঁচালী", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়", quantity: 2 },
  { sl: 24, class: "১০ম", title: "জীবন ও রাজনৈতিক বাস্তবতা", author: "শহীদুল জহির", quantity: 2 },
  { sl: 25, class: "১০ম", title: "আমার দেখা রাজনীতির পঞ্চাশ বছর", author: "আবুল মনসুর আহমদ", quantity: 2 }
];
