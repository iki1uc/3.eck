require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits, Events } = require('discord.js');

const app = express();
const bot = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ---------- Membership-Cache (30s, um Rate-Limits zu schonen) ---------- */
const memberCache = new Map(); // userId -> { inGuild, checkedAt }

async function isOnGuild(userId, force = false) {
  const now = Date.now();
  const cached = memberCache.get(userId);

  // Cache 30s gültig
  if (!force && cached && (now - cached.checkedAt) < 30_000) {
    return cached.inGuild;
  }

  try {
    const guild = await bot.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const member = await guild.members.fetch(userId).catch(() => null);
    const inGuild = !!member;
    memberCache.set(userId, { inGuild, checkedAt: now });
    return inGuild;
  } catch (err) {
    console.error('[MEMBERSHIP] Fehler:', err.message);
    // Bei Fehler: alte Cache-Werte nutzen, wenn vorhanden
    return cached?.inGuild ?? false;
  }
}

/* ---------- Bot ready ---------- */
bot.once(Events.ClientReady, () => {
  console.log(`[BOT] eingeloggt als ${bot.user.tag}`);
});

/* ---------- Live-Events: raus = sofort Zugang weg ---------- */
bot.on(Events.GuildMemberRemove, (member) => {
  if (member.guild.id !== process.env.DISCORD_GUILD_ID) return;
  console.log(`[LEAVE] ${member.user.tag} (${member.id}) hat den Server verlassen → Zugang entzogen`);
  memberCache.set(member.id, { inGuild: false, checkedAt: Date.now() });
  // Alle aktiven Sessions dieses Users markieren
  sessionStore.invalidateUser(member.id);
});

bot.on(Events.GuildMemberAdd, (member) => {
  if (member.guild.id !== process.env.DISCORD_GUILD_ID) return;
  console.log(`[JOIN] ${member.user.tag} (${member.id}) ist dem Server beigetreten`);
  memberCache.set(member.id, { inGuild: true, checkedAt: Date.now() });
});

bot.login(process.env.DISCORD_BOT_TOKEN);

/* ---------- Custom Session Store mit User-Invalidation ---------- */
class MemoryStore extends session.Store {
  constructor() {
    super();
    this.sessions = new Map();      // sid -> session
    this.userSessions = new Map();  // userId -> Set<sid>
  }
  get(sid, cb) { cb(null, this.sessions.get(sid) || null); }
  set(sid, sess, cb) {
    this.sessions.set(sid, sess);
    if (sess.passport?.user?.id) {
      const uid = sess.passport.user.id;
      if (!this.userSessions.has(uid)) this.userSessions.set(uid, new Set());
      this.userSessions.get(uid).add(sid);
    }
    cb(null);
  }
  destroy(sid, cb) {
    const sess = this.sessions.get(sid);
    if (sess?.passport?.user?.id) {
      this.userSessions.get(sess.passport.user.id)?.delete(sid);
    }
    this.sessions.delete(sid);
    cb(null);
  }
  invalidateUser(userId) {
    const sids = this.userSessions.get(userId);
    if (!sids) return;
    for (const sid of sids) this.sessions.delete(sid);
    this.userSessions.delete(userId);
    console.log(`[SESSION] ${sids.size} Session(s) von ${userId} invalidiert`);
  }
}
const sessionStore = new MemoryStore();

/* ---------- Passport ---------- */
passport.serializeUser((u, done) => done(null, { id: u.id, username: u.username, discriminator: u.discriminator, avatar: u.avatar }));
passport.deserializeUser((o, done) => done(null, o));

passport.use(new DiscordStrategy({
  clientID:     process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL:  process.env.DISCORD_CALLBACK_URL,
  scope:        ['identify', 'guilds']
}, (token, refresh, profile, done) => done(null, profile)));

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 Tage — aber Membership wird live geprüft
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

/* ---------- Auth ---------- */
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/?error=oauth_failed' }),
  (req, res) => res.redirect('/dashboard')
);

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

/* ---------- API: /api/me — IMMER live Membership-Check ---------- */
app.get('/api/me', async (req, res) => {
  if (!req.user) return res.json({ authenticated: false });

  const inGuild = await isOnGuild(req.user.id);

  res.json({
    authenticated: true,
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar
      ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png?size=128`
      : null,
    inGuild,
    access: inGuild  // <- das ist der einzige Faktor
  });
});

/* ---------- Middleware: /app/* nur für Server-Mitglieder ---------- */
async function requireGuild(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
  const inGuild = await isOnGuild(req.user.id);
  if (!inGuild) return res.status(403).json({ error: 'not_in_guild' });
  req.inGuild = true;
  next();
}

/* ---------- Geschützte App-Routen ---------- */
// Hier liegen später INDEXER, BIO.TEL, ZAUBER
app.get('/app', requireGuild, (req, res) => {
  res.sendFile(__dirname + '/public/app.html');
});

app.get('/app/api/status', requireGuild, async (req, res) => {
  res.json({
    ok: true,
    user: { id: req.user.id, username: req.user.username },
    verified: 'guild_member',
    timestamp: new Date().toISOString()
  });
});

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[SERVER] http://localhost:${PORT}`));
