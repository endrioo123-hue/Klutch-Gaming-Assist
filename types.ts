
export enum AppMode {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  TACTICAL_CHAT = 'TACTICAL_CHAT',
  LIVE_COMMS = 'LIVE_COMMS',
  ASSET_FORGE = 'ASSET_FORGE',
  GAME_RECOMMENDER = 'GAME_RECOMMENDER',
  THEORY_CRAFT = 'THEORY_CRAFT',
  NEXUS_VISION = 'NEXUS_VISION',
  OVERLAY_MODE = 'OVERLAY_MODE',
  PROFILE_HUB = 'PROFILE_HUB',
  SETTINGS = 'SETTINGS',
  WAIFU_HUB = 'WAIFU_HUB',
  STREAM_OPS = 'STREAM_OPS'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  images?: string[];
  isThinking?: boolean;
  groundingUrls?: Array<{uri: string; title: string}>;
}

export interface ImageConfig {
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize: "1K" | "2K" | "4K";
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  date: string;
}

export interface GameRecommendation {
  title: string;
  genre: string;
  matchScore: number;
  reason: string;
}

export interface Waifu {
  id: string;
  name: string;
  personality: string;
  voiceId: string;
  avatarUrl: string;
  level: number;
  intimacy: number;
  traits: string[];
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  effect: number;
  icon: string;
  description: string;
}

export interface GlobalRankUser {
  rank: number;
  username: string;
  xp: number;
  waifuName: string;
}

export interface AvatarTraits {
  gender: string;
  race: string;
  style: string;
  bodyType: string;
  faceShape: string;
  hair: string;
  clothing: string;
  accessory: string;
  mood: string;
  action: string;
}

export interface UserStats {
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
  hoursPlayed: number;
  gamesAnalyzed: number;
  kdRatio: number;
  headshotPct: number;
  accuracy: number;
}

export interface VoiceCommand {
  id: string;
  action: 'SCREENSHOT' | 'MUTE' | 'ASK_AI' | 'MARK_CLIP';
  phrase: string;
  enabled: boolean;
}

export interface VoiceConfig {
  sensitivity: number;
  commands: VoiceCommand[];
}

export interface UserCustomization {
  isRGBName: boolean;
  avatarBorder: 'none' | 'neon-blue' | 'neon-purple' | 'gold' | 'glitch';
  themeColor: 'cyan' | 'purple' | 'green' | 'red' | 'gold';
  avatarIcon: string; // New: Emoji/Icon char
  bannerId: string; // New: CSS class for background
  equipTitle: string; // New: Player Title
}

export interface UserProfile {
  username: string;
  email: string;
  level: number;
  xp: number;
  credits: number;
  stats: UserStats;
  voiceSettings: VoiceConfig;
  customization: UserCustomization;
  rankTitle: string;
  joinedAt: string;
  activeWaifuId?: string;
  waifus: Waifu[];
  globalRank?: number;
}
