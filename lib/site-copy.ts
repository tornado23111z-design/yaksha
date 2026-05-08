export const SITE_SETTING_ROW_KEYS = {
  homeBrandTitle: "home_brand_title",
  homeTaglinePrimary: "home_tagline_primary",
  homeTaglineSecondary: "home_tagline_secondary",
  footerDisclaimer: "footer_disclaimer",
  footerCopyright: "footer_copyright"
} as const;

export type SiteCopy = {
  homeBrandTitle: string;
  homeTaglinePrimary: string;
  homeTaglineSecondary: string;
  footerDisclaimer: string;
  footerCopyright: string;
};

export const DEFAULT_SITE_COPY: SiteCopy = {
  homeBrandTitle: "YAKSHA",
  homeTaglinePrimary: "ยักษาแปร",
  homeTaglineSecondary: "อัปเดตมังฮวา มังงะ นิยาย และการ์ตูน",
  footerDisclaimer:
    "เนื้อหาในเว็บไซต์นี้มีจุดประสงค์เพื่อความบันเทิง และอาจไม่เหมาะสมสำหรับเยาวชน ผู้ชมที่มีอายุต่ำกว่า 18 ปีควรได้รับคำแนะนำ",
  footerCopyright: "© Yaksha ยักษาแปร"
};

const KEYS = SITE_SETTING_ROW_KEYS;

function mergeSiteCopy(rows: { key: string; value: string }[] | null): SiteCopy {
  const map = new Map((rows ?? []).map((r) => [r.key, r.value]));
  return {
    homeBrandTitle: map.get(KEYS.homeBrandTitle) ?? DEFAULT_SITE_COPY.homeBrandTitle,
    homeTaglinePrimary: map.get(KEYS.homeTaglinePrimary) ?? DEFAULT_SITE_COPY.homeTaglinePrimary,
    homeTaglineSecondary: map.get(KEYS.homeTaglineSecondary) ?? DEFAULT_SITE_COPY.homeTaglineSecondary,
    footerDisclaimer: map.get(KEYS.footerDisclaimer) ?? DEFAULT_SITE_COPY.footerDisclaimer,
    footerCopyright: map.get(KEYS.footerCopyright) ?? DEFAULT_SITE_COPY.footerCopyright
  };
}

export function parseSiteCopyRows(rows: { key: string; value: string }[] | null): SiteCopy {
  return mergeSiteCopy(rows);
}
