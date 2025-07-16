// Language localization support for MSMEAtlas
// Supporting English, Hindi, and Odia for low-literacy MSME users

export type SupportedLanguage = 'en' | 'hi' | 'or';

export interface LocalizedContent {
  [key: string]: {
    en: string;
    hi: string;
    or: string;
  };
}

// Core UI translations for low-literacy users
export const translations: LocalizedContent = {
  // Navigation
  'nav.home': {
    en: 'Home',
    hi: 'मुख्य पेज',
    or: 'ମୁଖ୍ୟ ପୃଷ୍ଠା'
  },
  'nav.sell': {
    en: 'Sell Business',
    hi: 'व्यवसाय बेचें',
    or: 'ବ୍ୟବସାୟ ବିକ୍ରି କରନ୍ତୁ'
  },
  'nav.buy': {
    en: 'Buy Business',
    hi: 'व्यवसाय खरीदें',
    or: 'ବ୍ୟବସାୟ କିଣନ୍ତୁ'
  },
  'nav.loan': {
    en: 'Get Loan',
    hi: 'ऋण प्राप्त करें',
    or: 'ଋଣ ପାଆନ୍ତୁ'
  },
  
  // Business listing
  'business.name': {
    en: 'Business Name',
    hi: 'व्यवसाय का नाम',
    or: 'ବ୍ୟବସାୟର ନାମ'
  },
  'business.type': {
    en: 'Business Type',
    hi: 'व्यवसाय का प्रकार',
    or: 'ବ୍ୟବସାୟର ପ୍ରକାର'
  },
  'business.location': {
    en: 'Location',
    hi: 'स्थान',
    or: 'ସ୍ଥାନ'
  },
  'business.price': {
    en: 'Price',
    hi: 'मूल्य',
    or: 'ମୂଲ୍ୟ'
  },
  'business.yearly.income': {
    en: 'Yearly Income',
    hi: 'वार्षिक आय',
    or: 'ବାର୍ଷିକ ଆୟ'
  },
  'business.employees': {
    en: 'Number of Workers',
    hi: 'कर्मचारियों की संख्या',
    or: 'କର୍ମଚାରୀ ସଂଖ୍ୟା'
  },
  
  // Location specific
  'location.district': {
    en: 'District',
    hi: 'जिला',
    or: 'ଜିଲ୍ଲା'
  },
  'location.state': {
    en: 'State',
    hi: 'राज्य',
    or: 'ରାଜ୍ୟ'
  },
  'location.nearby': {
    en: 'Nearby',
    hi: 'पास में',
    or: 'ନିକଟରେ'
  },
  
  // Loan related
  'loan.amount': {
    en: 'Loan Amount',
    hi: 'ऋण राशि',
    or: 'ଋଣ ରାଶି'
  },
  'loan.duration': {
    en: 'Loan Duration',
    hi: 'ऋण अवधि',
    or: 'ଋଣ ଅବଧି'
  },
  'loan.interest': {
    en: 'Interest Rate',
    hi: 'ब्याज दर',
    or: 'ସୁଧ ହାର'
  },
  'loan.apply': {
    en: 'Apply for Loan',
    hi: 'ऋण के लिए आवेदन करें',
    or: 'ଋଣ ପାଇଁ ଆବେଦନ କରନ୍ତୁ'
  },
  
  // Navigation and authentication
  'nav.login': {
    en: 'Login',
    hi: 'लॉग इन करें',
    or: 'ଲଗ୍ ଇନ୍ କରନ୍ତୁ'
  },
  'nav.logout': {
    en: 'Logout',
    hi: 'लॉग आउट करें',
    or: 'ଲଗ୍ ଆଉଟ୍ କରନ୍ତୁ'
  },

  // Hero section
  'hero.title': {
    en: 'Connect with',
    hi: 'जुड़ें',
    or: 'ସଂଯୋଗ କରନ୍ତୁ'
  },
  'hero.subtitle': {
    en: 'India\'s first national marketplace for MSME acquisition and financing. Connect sellers with buyers and get instant loan approvals.',
    hi: 'MSME अधिग्रहण और वित्तपोषण के लिए भारत का पहला राष्ट्रीय बाजार। विक्रेताओं को खरीदारों से जोड़ें और तत्काल ऋण अनुमोदन प्राप्त करें।',
    or: 'MSME ଅଧିଗ୍ରହଣ ଏବଂ ଆର୍ଥିକ ସହାୟତା ପାଇଁ ଭାରତର ପ୍ରଥମ ଜାତୀୟ ମାର୍କେଟପ୍ଲେସ। ବିକ୍ରେତାମାନଙ୍କୁ କ୍ରେତାମାନଙ୍କ ସହିତ ଯୋଡ଼ନ୍ତୁ ଏବଂ ତୁରନ୍ତ ଋଣ ଅନୁମୋଦନ ପାଆନ୍ତୁ।'
  },

  // Features
  'features.title': {
    en: 'Key Features',
    hi: 'मुख्य विशेषताएं',
    or: 'ମୁଖ୍ୟ ବିଶେଷତା'
  },
  'features.proximity.title': {
    en: 'Location-Based Matching',
    hi: 'स्थान-आधारित मिलान',
    or: 'ସ୍ଥାନ-ଆଧାରିତ ମେଳଖାଇବା'
  },
  'features.proximity.description': {
    en: 'Find businesses near you with advanced geographic proximity matching for better opportunities.',
    hi: 'बेहतर अवसरों के लिए उन्नत भौगोलिक निकटता मिलान के साथ अपने पास के व्यवसाय खोजें।',
    or: 'ଉନ୍ନତ ଭୌଗୋଳିକ ନିକଟତା ମେଳଖାଇବା ସହିତ ଆପଣଙ୍କ ନିକଟରେ ବ୍ୟବସାୟ ଖୋଜନ୍ତୁ।'
  },
  'features.loan.title': {
    en: 'Instant Loan Approval',
    hi: 'तत्काल ऋण अनुमोदन',
    or: 'ତୁରନ୍ତ ଋଣ ଅନୁମୋଦନ'
  },
  'features.loan.description': {
    en: 'Get quick loan approvals from verified NBFCs for your business acquisition needs.',
    hi: 'अपनी व्यावसायिक अधिग्रहण आवश्यकताओं के लिए सत्यापित NBFCs से त्वरित ऋण अनुमोदन प्राप्त करें।',
    or: 'ଆପଣଙ୍କ ବ୍ୟବସାୟ ଅଧିଗ୍ରହଣ ଆବଶ୍ୟକତା ପାଇଁ ଯାଞ୍ଚିତ NBFCs ରୁ ଶୀଘ୍ର ଋଣ ଅନୁମୋଦନ ପାଆନ୍ତୁ।'
  },
  'features.compliance.title': {
    en: 'RBI Compliance',
    hi: 'RBI अनुपालन',
    or: 'RBI ଅନୁପାଳନ'
  },
  'features.compliance.description': {
    en: 'All transactions are RBI compliant with automated compliance monitoring and reporting.',
    hi: 'सभी लेनदेन RBI अनुपालन के साथ स्वचालित अनुपालन निगरानी और रिपोर्टिंग के साथ हैं।',
    or: 'ସମସ୍ତ ଲେଣଦେଣ RBI ଅନୁପାଳନ ସହିତ ସ୍ୱଚାଳିତ ଅନୁପାଳନ ମୋନିଟରିଂ ଏବଂ ରିପୋର୍ଟିଂ ସହିତ।'
  },

  // Statistics
  'stats.title': {
    en: 'Market Reach',
    hi: 'बाजार पहुंच',
    or: 'ମାର୍କେଟ ପହଞ୍ଚ'
  },
  'stats.lakh': {
    en: 'Lakh',
    hi: 'लाख',
    or: 'ଲକ୍ଷ'
  },
  'stats.crore': {
    en: 'Crore',
    hi: 'करोड़',
    or: 'କୋଟି'
  },
  'stats.odisha.msmes': {
    en: 'MSMEs in Odisha',
    hi: 'ओडिशा में MSME',
    or: 'ଓଡ଼ିଶାରେ MSME'
  },
  'stats.national.msmes': {
    en: 'MSMEs Nationally',
    hi: 'राष्ट्रीय स्तर पर MSME',
    or: 'ଜାତୀୟ ସ୍ତରରେ MSME'
  },
  'stats.districts': {
    en: 'Districts Covered',
    hi: 'जिले कवर किए गए',
    or: 'ଜିଲ୍ଲା କଭର କରାଯାଇଛି'
  },

  // Call to action
  'cta.title': {
    en: 'Ready to Transform Your Business?',
    hi: 'अपने व्यवसाय को बदलने के लिए तैयार?',
    or: 'ଆପଣଙ୍କ ବ୍ୟବସାୟକୁ ପରିବର୍ତ୍ତନ କରିବାକୁ ପ୍ରସ୍ତୁତ?'
  },
  'cta.description': {
    en: 'Join thousands of MSMEs already using our platform to buy, sell, and finance their business growth.',
    hi: 'अपने व्यावसायिक विकास को खरीदने, बेचने और वित्तपोषित करने के लिए हमारे प्लेटफॉर्म का उपयोग करने वाले हजारों MSME में शामिल हों।',
    or: 'ସେମାନଙ୍କ ବ୍ୟବସାୟ ବୃଦ୍ଧି କିଣିବା, ବିକ୍ରୟ କରିବା ଏବଂ ଆର୍ଥିକ ସହାୟତା ପାଇଁ ଆମର ପ୍ଲାଟଫର୍ମ ବ୍ୟବହାର କରୁଥିବା ହଜାରେ MSME ରେ ଯୋଗ ଦିଅନ୍ତୁ।'
  },
  'cta.button': {
    en: 'Get Started Today',
    hi: 'आज ही शुरू करें',
    or: 'ଆଜି ଆରମ୍ଭ କରନ୍ତୁ'
  },

  // Footer
  'footer.description': {
    en: 'Connecting MSMEs across India with buyers, sellers, and financial institutions.',
    hi: 'भारत भर में MSME को खरीदारों, विक्रेताओं और वित्तीय संस्थानों से जोड़ना।',
    or: 'ଭାରତ ଭରର MSME କୁ କ୍ରେତା, ବିକ୍ରେତା ଏବଂ ଆର୍ଥିକ ସଂସ୍ଥା ସହିତ ଯୋଡ଼ିବା।'
  },
  'footer.services': {
    en: 'Services',
    hi: 'सेवाएं',
    or: 'ସେବା'
  },
  'footer.support': {
    en: 'Support',
    hi: 'सहायता',
    or: 'ସହାୟତା'
  },
  'footer.help': {
    en: 'Help Center',
    hi: 'सहायता केंद्र',
    or: 'ସହାୟତା କେନ୍ଦ୍ର'
  },
  'footer.contact': {
    en: 'Contact Us',
    hi: 'संपर्क करें',
    or: 'ଯୋଗାଯୋଗ କରନ୍ତୁ'
  },
  'footer.faq': {
    en: 'FAQ',
    hi: 'FAQ',
    or: 'FAQ'
  },
  'footer.languages': {
    en: 'Languages',
    hi: 'भाषाएं',
    or: 'ଭାଷା'
  },
  'footer.rights': {
    en: 'All rights reserved.',
    hi: 'सभी अधिकार सुरक्षित।',
    or: 'ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ।'
  },

  // Dashboard
  'dashboard.welcome': {
    en: 'Welcome to your Dashboard',
    hi: 'आपके डैशबोर्ड में आपका स्वागत है',
    or: 'ଆପଣଙ୍କ ଡ୍ୟାସବୋର୍ଡରେ ସ୍ୱାଗତ'
  },
  'dashboard.subtitle': {
    en: 'Manage your business listings, track applications, and discover opportunities.',
    hi: 'अपनी व्यावसायिक सूचियों का प्रबंधन करें, आवेदनों को ट्रैक करें, और अवसरों की खोज करें।',
    or: 'ଆପଣଙ୍କ ବ୍ୟବସାୟ ତାଲିକା ପରିଚାଳନା କରନ୍ତୁ, ଆବେଦନ ଟ୍ରାକ୍ କରନ୍ତୁ ଏବଂ ସୁଯୋଗ ଆବିଷ୍କାର କରନ୍ତୁ।'
  },
  'dashboard.stats.total.listings': {
    en: 'Total Listings',
    hi: 'कुल सूचियां',
    or: 'ମୋଟ ତାଲିକା'
  },
  'dashboard.stats.nearby.businesses': {
    en: 'Nearby Businesses',
    hi: 'पास के व्यवसाय',
    or: 'ନିକଟସ୍ଥ ବ୍ୟବସାୟ'
  },
  'dashboard.stats.loan.applications': {
    en: 'Loan Applications',
    hi: 'ऋण आवेदन',
    or: 'ଋଣ ଆବେଦନ'
  },
  'dashboard.stats.active.interests': {
    en: 'Active Interests',
    hi: 'सक्रिय रुचियां',
    or: 'ସକ୍ରିୟ ଆଗ୍ରହ'
  },
  'dashboard.nearby.title': {
    en: 'Nearby Businesses',
    hi: 'पास के व्यवसाय',
    or: 'ନିକଟସ୍ଥ ବ୍ୟବସାୟ'
  },
  'dashboard.nearby.empty': {
    en: 'No nearby businesses found',
    hi: 'कोई पास का व्यवसाय नहीं मिला',
    or: 'କୌଣସି ନିକଟସ୍ଥ ବ୍ୟବସାୟ ମିଳିଲା ନାହିଁ'
  },
  'dashboard.match.score': {
    en: 'Match',
    hi: 'मिलान',
    or: 'ମେଳ'
  },
  'dashboard.activity.title': {
    en: 'Recent Activity',
    hi: 'हाल की गतिविधि',
    or: 'ସମ୍ପ୍ରତି କାର୍ଯ୍ୟକଳାପ'
  },
  'dashboard.activity.new.match': {
    en: 'New business match found',
    hi: 'नया व्यावसायिक मिलान मिला',
    or: 'ନୂତନ ବ୍ୟବସାୟ ମେଳ ମିଳିଲା'
  },
  'dashboard.activity.loan.approved': {
    en: 'Loan application approved',
    hi: 'ऋण आवेदन अनुमोदित',
    or: 'ଋଣ ଆବେଦନ ଅନୁମୋଦିତ'
  },
  'dashboard.activity.valuation.updated': {
    en: 'Business valuation updated',
    hi: 'व्यावसायिक मूल्यांकन अद्यतन',
    or: 'ବ୍ୟବସାୟ ମୂଲ୍ୟାଙ୍କନ ଅଦ୍ୟତନ'
  },
  'dashboard.activity.hours.ago': {
    en: 'hours ago',
    hi: 'घंटे पहले',
    or: 'ଘଣ୍ଟା ପୂର୍ବରୁ'
  },
  'dashboard.activity.day.ago': {
    en: 'day ago',
    hi: 'दिन पहले',
    or: 'ଦିନ ପୂର୍ବରୁ'
  },
  'dashboard.activity.days.ago': {
    en: 'days ago',
    hi: 'दिन पहले',
    or: 'ଦିନ ପୂର୍ବରୁ'
  },
  'dashboard.quick.actions': {
    en: 'Quick Actions',
    hi: 'त्वरित क्रिया',
    or: 'ଶୀଘ୍ର କାର୍ଯ୍ୟ'
  },
  'dashboard.actions.sell.description': {
    en: 'List your business for sale',
    hi: 'अपना व्यवसाय बिक्री के लिए सूचीबद्ध करें',
    or: 'ଆପଣଙ୍କ ବ୍ୟବସାୟ ବିକ୍ରୟ ପାଇଁ ତାଲିକାଭୁକ୍ତ କରନ୍ତୁ'
  },
  'dashboard.actions.buy.description': {
    en: 'Find businesses to purchase',
    hi: 'खरीदने के लिए व्यवसाय खोजें',
    or: 'କିଣିବା ପାଇଁ ବ୍ୟବସାୟ ଖୋଜନ୍ତୁ'
  },
  'dashboard.actions.loan.description': {
    en: 'Apply for acquisition loans',
    hi: 'अधिग्रहण ऋण के लिए आवेदन करें',
    or: 'ଅଧିଗ୍ରହଣ ଋଣ ପାଇଁ ଆବେଦନ କରନ୍ତୁ'
  },

  // Common actions
  'action.save': {
    en: 'Save',
    hi: 'सहेजें',
    or: 'ସଞ୍ଚୟ କରନ୍ତୁ'
  },
  'action.submit': {
    en: 'Submit',
    hi: 'जमा करें',
    or: 'ଦାଖଲ କରନ୍ତୁ'
  },
  'action.cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    or: 'ରଦ୍ଦ କରନ୍ତୁ'
  },
  'action.search': {
    en: 'Search',
    hi: 'खोजें',
    or: 'ଖୋଜନ୍ତୁ'
  },
  'action.filter': {
    en: 'Filter',
    hi: 'फिल्टर',
    or: 'ଫିଲ୍ଟର'
  },
  
  // Status messages
  'status.success': {
    en: 'Success',
    hi: 'सफलता',
    or: 'ସଫଳତା'
  },
  'status.error': {
    en: 'Error',
    hi: 'त्रुटि',
    or: 'ତ୍ରୁଟି'
  },
  'status.loading': {
    en: 'Loading...',
    hi: 'लोड हो रहा है...',
    or: 'ଲୋଡ୍ ହେଉଛି...'
  },
  
  // Distance and proximity
  'distance.km': {
    en: 'km away',
    hi: 'किमी दूर',
    or: 'କିମି ଦୂରରେ'
  },
  'distance.nearby': {
    en: 'Nearby businesses',
    hi: 'पास के व्यवसाय',
    or: 'ନିକଟସ୍ଥ ବ୍ୟବସାୟ'
  },
  'distance.same.district': {
    en: 'Same district',
    hi: 'समान जिला',
    or: 'ସମାନ ଜିଲ୍ଲା'
  }
};

// Odisha districts for geographic proximity
export const odishaDistricts = [
  'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
  'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
  'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
  'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
  'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
];

// Helper function to get localized text
export function getLocalizedText(key: string, language: SupportedLanguage = 'en'): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  return translation[language] || translation.en || key;
}

// Helper function to detect user's preferred language
export function detectLanguage(userAgent?: string, acceptLanguage?: string): SupportedLanguage {
  // Simple language detection based on browser headers
  if (acceptLanguage) {
    if (acceptLanguage.includes('hi')) return 'hi';
    if (acceptLanguage.includes('or')) return 'or';
  }
  return 'en';
}

// Audio pronunciation helpers for low-literacy users
export const audioPronunciations = {
  'business.name': {
    hi: '/audio/business-name-hi.mp3',
    or: '/audio/business-name-or.mp3'
  },
  'business.price': {
    hi: '/audio/business-price-hi.mp3',
    or: '/audio/business-price-or.mp3'
  },
  'loan.apply': {
    hi: '/audio/loan-apply-hi.mp3',
    or: '/audio/loan-apply-or.mp3'
  }
};

// Text-to-speech configuration for supported languages
export const ttsConfig = {
  hi: {
    voice: 'hi-IN',
    rate: 0.8,
    pitch: 1.0
  },
  or: {
    voice: 'or-IN',
    rate: 0.8,
    pitch: 1.0
  },
  en: {
    voice: 'en-IN',
    rate: 0.9,
    pitch: 1.0
  }
};