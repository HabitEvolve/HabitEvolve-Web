/**
 * monsterRoster.ts — Danh bạ sprite art "có sẵn" dùng chung với mobile.
 *
 * Art frame KHÔNG lưu ở BE/Supabase. Các pack có sẵn (chibi CraftPix) được commit
 * vào `public/monsters/<key>/idle/<n>.png` (Vite serve tại web root). BE chỉ lưu
 * chuỗi `spriteKey` trên DailyBossTemplate; web resolve key → URL ảnh qua file này.
 *
 * Nguồn key/tên: đồng bộ tay với mobile `src/data/monsterSprites.ts`
 * (MONSTER_KEYS + MONSTER_NAMES). 14 pack, mỗi pack 18 frame idle (0..17).
 * Thêm pack mới: copy `idle/` vào public/monsters + thêm 1 dòng ở đây.
 *
 * HTTP không liệt kê được thư mục → phải khai báo số frame ở đây để build URL.
 */

export interface MonsterSprite {
  /** Khoá art, khớp DailyBossTemplate.spriteKey ở BE và MonsterKey ở mobile. */
  key: string;
  /** Tên hiển thị (proper noun, không qua i18n) — dùng cho dropdown chọn art. */
  name: string;
  /** Số frame của animation idle (0..idleFrames-1). Hiện mọi pack = 18. */
  idleFrames: number;
}

/** 14 pack có sẵn, đúng thứ tự roster mobile. */
export const MONSTER_ROSTER: readonly MonsterSprite[] = [
  { key: 'goblin', name: 'Goblin', idleFrames: 18 },
  { key: 'golem_01', name: 'Golem', idleFrames: 18 },
  { key: 'reaper_man_01', name: 'Reaper', idleFrames: 18 },
  { key: 'fallen_angels_01', name: 'Fallen Angel', idleFrames: 18 },
  { key: 'skeleton_warrior_01', name: 'Skeleton Warrior', idleFrames: 18 },
  { key: 'skeleton_crusader_01', name: 'Skeleton Crusader', idleFrames: 18 },
  { key: 'valkyrie_01', name: 'Valkyrie', idleFrames: 18 },
  { key: 'minotaur_01', name: 'Minotaur', idleFrames: 18 },
  { key: 'forest_ranger_01', name: 'Forest Ranger', idleFrames: 18 },
  { key: 'seer_01', name: 'Seer', idleFrames: 18 },
  { key: 'zombie_villager_01', name: 'Zombie Villager', idleFrames: 18 },
  { key: 'dark_oracle_01', name: 'Dark Oracle', idleFrames: 18 },
  { key: 'necromancer_of_the_shadow_01', name: 'Necromancer', idleFrames: 18 },
  { key: 'bloody_alchemist_01', name: 'Bloody Alchemist', idleFrames: 18 },
] as const;

const ROSTER_BY_KEY = new Map(MONSTER_ROSTER.map((m) => [m.key, m]));

/**
 * Tách nhóm asset daily vs weekly boss — KHÔNG giao nhau (mỗi chuỗi goal có boss riêng).
 * Đồng bộ tay với BE (`DailyBossSeeder.Pool` + `BossTemplateSeeder`) và mobile
 * (`monsterSprites.ts` DAILY_MONSTER_KEYS / WEEKLY_BOSS_KEYS).
 *   • Daily (9): dùng cho DailyBoss (`AdminDailyBossManagement`).
 *   • Weekly (5): dùng cho Weekly/Party Boss (`AdminBossManagement`).
 */
const DAILY_KEYS = new Set([
  'dark_oracle_01', 'reaper_man_01', 'bloody_alchemist_01', 'goblin', 'minotaur_01',
  'seer_01', 'skeleton_crusader_01', 'zombie_villager_01', 'forest_ranger_01',
]);
const WEEKLY_KEYS = new Set([
  'golem_01', 'skeleton_warrior_01', 'necromancer_of_the_shadow_01', 'valkyrie_01', 'fallen_angels_01',
]);

/** 9 pack dành cho Daily Boss. */
export const DAILY_ROSTER: readonly MonsterSprite[] = MONSTER_ROSTER.filter((m) => DAILY_KEYS.has(m.key));

/** 5 pack dành cho Weekly (Party) Boss. */
export const WEEKLY_ROSTER: readonly MonsterSprite[] = MONSTER_ROSTER.filter((m) => WEEKLY_KEYS.has(m.key));

/** Prefix theo Vite BASE_URL (mặc định "/", hỗ trợ deploy dưới sub-path). */
const base = import.meta.env.BASE_URL; // luôn kết thúc bằng "/"

/** true nếu key trỏ tới một pack art có sẵn trong public/monsters. */
export function isKnownSpriteKey(key: string | null | undefined): key is string {
  return !!key && ROSTER_BY_KEY.has(key);
}

/** Tên hiển thị của một sprite key (fallback = chính key nếu lạ). */
export function spriteDisplayName(key: string | null | undefined): string | null {
  if (!key) return null;
  return ROSTER_BY_KEY.get(key)?.name ?? key;
}

/** URL frame idle đầu tiên — dùng làm avatar tĩnh. null nếu key không thuộc roster. */
export function spriteAvatarUrl(key: string | null | undefined): string | null {
  if (!isKnownSpriteKey(key)) return null;
  return `${base}monsters/${key}/idle/0.png`;
}

/** Mảng URL toàn bộ frame idle (0..n-1) — cho preview động sau này. Rỗng nếu key lạ. */
export function spriteIdleFrameUrls(key: string | null | undefined): string[] {
  const sprite = key ? ROSTER_BY_KEY.get(key) : undefined;
  if (!sprite) return [];
  return Array.from({ length: sprite.idleFrames }, (_, i) => `${base}monsters/${sprite.key}/idle/${i}.png`);
}
