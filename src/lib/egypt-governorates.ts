export interface Governorate {
  id: string;
  nameEn: string;
  nameAr: string;
  zoneIndex: 1 | 2 | 3 | 4;
}

export const EGYPT_GOVERNORATES: Governorate[] = [
  // Zone 1: Cairo, Giza & Alexandria (93 EGP)
  { id: "cairo", nameEn: "Cairo", nameAr: "القاهرة", zoneIndex: 1 },
  { id: "giza", nameEn: "Giza", nameAr: "الجيزة", zoneIndex: 1 },
  { id: "alexandria", nameEn: "Alexandria", nameAr: "الإسكندرية", zoneIndex: 1 },

  // Zone 2: Delta & Canal Cities (106 EGP)
  { id: "ismailia", nameEn: "Ismailia", nameAr: "الإسماعيلية", zoneIndex: 2 },
  { id: "suez", nameEn: "Suez", nameAr: "السويس", zoneIndex: 2 },
  { id: "port_said", nameEn: "Port Said", nameAr: "بورسعيد", zoneIndex: 2 },
  { id: "dakahlia", nameEn: "Dakahlia (Mansoura)", nameAr: "الدقهلية (المنصورة)", zoneIndex: 2 },
  { id: "qalyubia", nameEn: "Qalyubia", nameAr: "القليوبية", zoneIndex: 2 },
  { id: "monufia", nameEn: "Monufia", nameAr: "المنوفية", zoneIndex: 2 },
  { id: "sharqia", nameEn: "Sharqia (Zagazig)", nameAr: "الشرقية (الزقازيق)", zoneIndex: 2 },
  { id: "gharbia", nameEn: "Gharbia (Tanta)", nameAr: "الغربية (طنطا)", zoneIndex: 2 },
  { id: "damietta", nameEn: "Damietta", nameAr: "دمياط", zoneIndex: 2 },
  { id: "kafr_el_sheikh", nameEn: "Kafr El Sheikh", nameAr: "كفر الشيخ", zoneIndex: 2 },
  { id: "beheira", nameEn: "Beheira (Damanhour)", nameAr: "البحيرة (دمنهور)", zoneIndex: 2 },

  // Zone 3: Upper Egypt & Red Sea (124 EGP)
  { id: "beni_suef", nameEn: "Beni Suef", nameAr: "بني سويف", zoneIndex: 3 },
  { id: "fayoum", nameEn: "Fayoum", nameAr: "الفيوم", zoneIndex: 3 },
  { id: "minya", nameEn: "Minya", nameAr: "المنيا", zoneIndex: 3 },
  { id: "asyut", nameEn: "Asyut", nameAr: "أسيوط", zoneIndex: 3 },
  { id: "qena", nameEn: "Qena", nameAr: "قنا", zoneIndex: 3 },
  { id: "luxor", nameEn: "Luxor", nameAr: "الأقصر", zoneIndex: 3 },
  { id: "aswan", nameEn: "Aswan", nameAr: "أسوان", zoneIndex: 3 },
  { id: "red_sea", nameEn: "Red Sea (Hurghada)", nameAr: "البحر الأحمر (الغردقة)", zoneIndex: 3 },
  { id: "sohag", nameEn: "Sohag", nameAr: "سوهاج", zoneIndex: 3 },

  // Zone 4: Border Governorates & Sinai (137 EGP)
  { id: "matrouh", nameEn: "Matrouh (North Coast)", nameAr: "مطروح (الساحل الشمالي)", zoneIndex: 4 },
  { id: "new_valley", nameEn: "New Valley (Kharga)", nameAr: "الوادي الجديد", zoneIndex: 4 },
  { id: "south_sinai", nameEn: "South Sinai (Sharm El Sheikh)", nameAr: "جنوب سيناء (شرم الشيخ)", zoneIndex: 4 },
  { id: "north_sinai", nameEn: "North Sinai (Arish)", nameAr: "شمال سيناء (العريش)", zoneIndex: 4 }
];

// Maps English zone names (as stored in DB) → Arabic display names
const ZONE_NAME_AR: Record<string, string> = {
  // Current names
  "cairo, giza and alexandria":       "القاهرة والجيزة والإسكندرية",
  "cairo, giza & alexandria":         "القاهرة والجيزة والإسكندرية",
  "cairo & giza":                     "القاهرة والجيزة",
  "delta & canal cities":             "الدلتا والقناة",
  "delta and canal cities":           "الدلتا والقناة",
  "upper egypt & red sea":            "صعيد مصر والبحر الأحمر",
  "upper egypt and red sea":          "صعيد مصر والبحر الأحمر",
  "upper egypt":                      "صعيد مصر",
  "border governorates & sinai":      "المحافظات الحدودية وسيناء",
  "border governorates and sinai":    "المحافظات الحدودية وسيناء",
  "sinai & border governorates":      "المحافظات الحدودية وسيناء",
  "frontier & sinai":                 "المحافظات الحدودية وسيناء",
  // Legacy names (in case old DB records still exist)
  "greater cairo & giza":             "القاهرة والجيزة",
  "alexandria, delta & canal cities": "الدلتا والقناة",
  "upper egypt & red sea / frontier": "صعيد مصر",
};

export function translateShippingZone(name: string, isAr: boolean): string {
  if (!isAr) return name.replace(/^Zone \d+:\s*/i, "");
  // Strip optional "Zone N: " prefix before lookup
  const stripped = name.replace(/^Zone \d+:\s*/i, "").toLowerCase().trim();
  return ZONE_NAME_AR[stripped] ?? name;
}

export function translateDeliveryDays(days: string | null | undefined, isAr: boolean): string {
  if (!days) return "";
  if (!isAr) return days;
  // Replace "Business Days" / "Business Day" with Arabic equivalent
  // and keep the numeric range as-is (e.g. "1–2")
  return days
    .replace(/business days?/i, "أيام عمل")
    .replace(/day/i, "يوم");
}

export const DEFAULT_EGYPT_SHIPPING_ZONES = [
  {
    name: "Cairo, Giza and Alexandria",
    price: 93,
    estimatedDays: "1–2 Business Days",
    isActive: true
  },
  {
    name: "Delta & Canal Cities",
    price: 106,
    estimatedDays: "2–3 Business Days",
    isActive: true
  },
  {
    name: "Upper Egypt & Red Sea",
    price: 124,
    estimatedDays: "3–4 Business Days",
    isActive: true
  },
  {
    name: "Border Governorates & Sinai",
    price: 137,
    estimatedDays: "4–6 Business Days",
    isActive: true
  }
];

export function findZoneForGovernorate(govId: string, shippingMethods: any[]) {
  const gov = EGYPT_GOVERNORATES.find(g => g.id === govId || g.nameEn.toLowerCase() === govId.toLowerCase() || g.nameAr === govId);
  if (!gov || !shippingMethods || shippingMethods.length === 0) return null;

  // Match by zone index in method name (e.g. "Zone 1", "Zone 2", "Zone 3" or Cairo/Delta/Upper keywords)
  const targetIndexStr = `Zone ${gov.zoneIndex}`;
  let matchedMethod = shippingMethods.find(m => m.name.includes(targetIndexStr));

  if (!matchedMethod) {
    if (gov.zoneIndex === 1) {
      matchedMethod = shippingMethods.find(m => /cairo|giza|alex|قاهرة|جيزة|إسكندرية/i.test(m.name));
    } else if (gov.zoneIndex === 2) {
      matchedMethod = shippingMethods.find(m => /delta|canal|ismailia|suez|port said|dakahlia|qalyubia|monufia|sharqia|gharbia|damietta|kafr|beheira|دلت|قناة|قليوبية/i.test(m.name));
    } else if (gov.zoneIndex === 3) {
      matchedMethod = shippingMethods.find(m => /upper|red sea|sohag|aswan|luxor|qena|asyut|minya|fayoum|suef|صعيد|بحر أحمر/i.test(m.name));
    } else if (gov.zoneIndex === 4) {
      matchedMethod = shippingMethods.find(m => /border|frontier|sinai|matrouh|valley|حدود|سيناء|مطروح|وادي/i.test(m.name));
    }
  }

  // Fallback to indexed array item if methods exist
  if (!matchedMethod && shippingMethods.length >= gov.zoneIndex) {
    matchedMethod = shippingMethods[gov.zoneIndex - 1];
  }

  return matchedMethod || shippingMethods[0];
}

export function matchEgyptGovernorate(addressObj: any = {}, displayName: string = ""): Governorate | null {
  const textParts = [
    addressObj.governorate,
    addressObj.state,
    addressObj.city,
    addressObj.county,
    addressObj.town,
    addressObj.village,
    addressObj.suburb,
    addressObj.neighbourhood,
    displayName
  ].filter(Boolean);

  const fullText = textParts.join(" ").toLowerCase();
  if (!fullText) return null;

  // 1. Direct match with id, nameEn, or nameAr
  for (const gov of EGYPT_GOVERNORATES) {
    const enBase = gov.nameEn.split(" ")[0].toLowerCase();
    const arBase = gov.nameAr.split(" ")[0];
    
    if (
      fullText.includes(gov.id) ||
      fullText.includes(enBase) ||
      fullText.includes(arBase) ||
      fullText.includes(gov.nameEn.toLowerCase())
    ) {
      return gov;
    }
  }

  // 2. City & District Aliases
  const ALIAS_MAP: Record<string, string> = {
    "october": "giza",
    "6th of october": "giza",
    "sheikh zayed": "giza",
    "زايد": "giza",
    "أكتوبر": "giza",
    "new cairo": "cairo",
    "tagamoa": "cairo",
    "maadi": "cairo",
    "التجمع": "cairo",
    "المعادي": "cairo",
    "مدينة نصر": "cairo",
    "nasr city": "cairo",
    "heliopolis": "cairo",
    "مصر الجديدة": "cairo",
    "mansoura": "dakahlia",
    "المنصورة": "dakahlia",
    "tanta": "gharbia",
    "طنطا": "gharbia",
    "mahalla": "gharbia",
    "المحلة": "gharbia",
    "damanhour": "beheira",
    "دمنهور": "beheira",
    "zagazig": "sharqia",
    "الزقازيق": "sharqia",
    "hurghada": "red_sea",
    "غردقة": "red_sea",
    "الغردقة": "red_sea",
    "gouna": "red_sea",
    "الجونة": "red_sea",
    "sharm": "south_sinai",
    "شرم": "south_sinai",
    "dahab": "south_sinai",
    "دهب": "south_sinai",
    "el arish": "north_sinai",
    "العريش": "north_sinai"
  };

  for (const [alias, govId] of Object.entries(ALIAS_MAP)) {
    if (fullText.includes(alias)) {
      const gov = EGYPT_GOVERNORATES.find(g => g.id === govId);
      if (gov) return gov;
    }
  }

  return null;
}
