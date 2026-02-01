
import { UserProfile, GlobalRankUser } from '../types';

const DB_USERS_KEY = 'klutch_db_users_v1';
const SESSION_KEY = 'klutch_current_session_v1';

interface UserAccount extends UserProfile {
  passwordHash: string;
}

// Helper to simulate DB delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  // --- REGISTER ---
  async register(username: string, email: string, password: string): Promise<boolean> {
    await delay(800); // Fake network delay

    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    
    // Uniqueness Check
    const exists = users.some((u: UserAccount) => 
      u.username.toLowerCase() === username.toLowerCase() || 
      u.email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
      throw new Error('DUPLICATE_ENTRY');
    }

    // Create New User
    const newUser: UserAccount = {
      username,
      email,
      passwordHash: btoa(password), // Simple encoding
      level: 1,
      xp: 0,
      credits: 500, // Start with some credits
      joinedAt: new Date().toISOString(),
      rankTitle: 'Neophyte',
      stats: { 
        kills: 0, deaths: 0, wins: 0, losses: 0, hoursPlayed: 0, gamesAnalyzed: 0,
        kdRatio: 0.0,
        headshotPct: 0,
        accuracy: 0 
      },
      voiceSettings: {
        sensitivity: 50,
        commands: [
          { id: 'cmd_1', action: 'SCREENSHOT', phrase: 'Capture This', enabled: true },
          { id: 'cmd_2', action: 'MUTE', phrase: 'Silence', enabled: true },
          { id: 'cmd_3', action: 'ASK_AI', phrase: 'Hey Klutch', enabled: true },
        ]
      },
      customization: { 
        isRGBName: false, 
        avatarBorder: 'none', 
        themeColor: 'cyan',
        avatarIcon: '👾',
        bannerId: 'default',
        equipTitle: 'Operative'
      },
      waifus: []
    };

    users.push(newUser);
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    return true;
  },

  // --- LOGIN ---
  async login(identifier: string, password: string): Promise<UserAccount> {
    await delay(1000);
    
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    const encodedPass = btoa(password);

    const user = users.find((u: UserAccount) => 
      (u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()) &&
      u.passwordHash === encodedPass
    );

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Set Session
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  // --- LOGOUT ---
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  // --- FORGOT PASSWORD (SIMULATION) ---
  async forgotPassword(email: string): Promise<boolean> {
    await delay(2000); // Simulate SMTP Server delay
    
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    const user = users.find((u: UserAccount) => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      // IN A REAL APP: This would call your Node.js/Python backend to send an email via SendGrid/AWS SES.
      // FOR DEMO: We simulate the success log.
      console.info(`[SMTP SERVICE] Sending recovery email to ${email}...`);
      console.info(`[SMTP SERVICE] Recovery Link: https://klutch.ai/reset-password?token=${btoa(user.username + Date.now())}`);
      return true;
    } else {
      // Security: Always return true even if email not found to prevent enumeration
      return true; 
    }
  },

  // --- GET CURRENT SESSION ---
  getCurrentUser(): UserProfile | null {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  // --- UPDATE CURRENT USER DATA ---
  updateUser(updatedProfile: UserProfile) {
    // Update Session
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedProfile));

    // Update Database
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    const index = users.findIndex((u: UserAccount) => u.username === updatedProfile.username);
    
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedProfile };
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    }
  },

  // --- GET GLOBAL LEADERBOARD (FUNCTIONAL) ---
  getLeaderboard(): GlobalRankUser[] {
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    
    // Sort by XP Descending
    const sorted = users.sort((a: UserProfile, b: UserProfile) => b.xp - a.xp);
    
    // Top 50
    return sorted.slice(0, 50).map((u: UserProfile, index: number) => {
      const activeWaifu = u.waifus?.find(w => w.id === u.activeWaifuId);
      return {
        rank: index + 1,
        username: u.username,
        xp: u.xp,
        waifuName: activeWaifu ? activeWaifu.name : 'None'
      };
    });
  },

  // --- INIT BOTS ---
  initBots() {
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    if (users.length < 5) {
      const bots = [
        { username: 'Nexus_AI', email: 'bot1@klutch.ai', xp: 45000, rankTitle: 'Omniscient', activeWaifuId: 'w1', waifuName: 'Kore' },
        { username: 'CyberNinja', email: 'bot2@klutch.ai', xp: 28000, rankTitle: 'Titan', activeWaifuId: 'w2', waifuName: 'Yumi' },
        { username: 'Glitch0', email: 'bot3@klutch.ai', xp: 15000, rankTitle: 'Knight', activeWaifuId: 'w3', waifuName: 'Sarah' },
        { username: 'Viper', email: 'bot4@klutch.ai', xp: 8000, rankTitle: 'Operative', activeWaifuId: 'w4', waifuName: 'Jinx' },
        { username: 'Rookie_Bot', email: 'bot5@klutch.ai', xp: 1200, rankTitle: 'Neophyte', activeWaifuId: 'w5', waifuName: 'Bob' },
      ];

      bots.forEach((bot, i) => {
        if (!users.some((u: any) => u.username === bot.username)) {
          const kills = 100 * (i+1);
          const deaths = Math.floor(kills / 2.5); // Fixed KD approx
          const newBot: UserAccount = {
             username: bot.username,
             email: bot.email,
             passwordHash: 'bot_secure_hash',
             level: Math.floor(bot.xp / 1000),
             xp: bot.xp,
             credits: 1000,
             joinedAt: new Date().toISOString(),
             rankTitle: bot.rankTitle,
             stats: { 
               kills, 
               deaths, 
               wins: 10 * (i+1), 
               losses: 5, 
               hoursPlayed: 100, 
               gamesAnalyzed: 50, 
               kdRatio: 2.5, 
               headshotPct: 45, 
               accuracy: 60 
             },
             voiceSettings: { sensitivity: 50, commands: [] },
             customization: { 
               isRGBName: false, 
               avatarBorder: 'none', 
               themeColor: 'cyan', 
               avatarIcon: '🤖', 
               bannerId: 'default', 
               equipTitle: 'Bot' 
             },
             waifus: [{
               id: `bot_waifu_${i}`, name: bot.waifuName, personality: 'Bot AI', voiceId: 'Kore', avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.waifuName}`,
               level: 10, intimacy: 500, traits: []
             }],
             activeWaifuId: `bot_waifu_${i}`
          };
          users.push(newBot);
        }
      });
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    }
  },

  // --- SIMULATE BOT ACTIVITY ---
  simulateBotActivity() {
    const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
    let changed = false;
    const updatedUsers = users.map((u: UserAccount) => {
      if (u.email && u.email.includes('@klutch.ai')) {
         if (Math.random() > 0.5) {
            u.xp += Math.floor(Math.random() * 500);
            changed = true;
         }
      }
      return u;
    });

    if (changed) {
       localStorage.setItem(DB_USERS_KEY, JSON.stringify(updatedUsers));
    }
  }
};
