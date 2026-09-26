-- ============================================================
-- SUPABASE SETUP SCRIPT FOR 9VAMPIRES GANG
-- วิธีใช้: ก๊อปปี้โค้ดทั้งหมดนี้ไปวางใน Supabase -> SQL Editor -> กด Run
-- ============================================================

create table if not exists gang_storage (
  filename text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ปลดล็อกสิทธิ์ให้เว็บสามารถอ่านและบันทึกข้อมูลได้
alter table gang_storage enable row level security;

drop policy if exists "Allow all read" on gang_storage;
create policy "Allow all read" on gang_storage for select using (true);

drop policy if exists "Allow all insert" on gang_storage;
create policy "Allow all insert" on gang_storage for insert with check (true);

drop policy if exists "Allow all update" on gang_storage;
create policy "Allow all update" on gang_storage for update using (true);

-- นำเข้าข้อมูลเริ่มต้นทั้งหมดของแก๊ง

insert into gang_storage (filename, data) values ('site_settings.json', '{
  "siteName": "Slumzick",
  "description": "DEK SLUMZICK",
  "backgroundUrl": "https://cdn.discordapp.com/attachments/1551149152417873950/1552518394245550181/433eaf346d0a0475c1a2cb228bed9ade.gif?ex=6ab5e6ed&is=6ab4956d&hm=09e212a392e7274e832bd530e979e85cca7030e63a1437e37fb540b3ce6fe201",
  "logoUrl": "https://cdn.discordapp.com/attachments/1551149152417873950/1552517753926058024/5ba12d14aec619633a717f5ed1bc4d2c.png?ex=6ab5e654&is=6ab494d4&hm=db632a6088ae4d0c03c98c5441ab05b79b29347752d9b83dac786c247079420f",
  "primaryColor": "#ff2a44",
  "textColor": "#ffffff",
  "contrastColor": "#ffffff",
  "theme": "dark",
  "discordInviteUrl": "https://discord.gg/6TWAGnrP2t",
  "particleType": "sakura",
  "particleSpeed": 1,
  "particleDensity": 1,
  "customParticleImages": [],
  "particleSize": "small",
  "particleEmitDirection": "all",
  "announcementTitle": "ประกาศสำคัญประจำสัปดาห์",
  "announcement": "ยินดีต้อนรับสู่ศูนย์บัญชาการ Slumzick Syndicate • สมาชิกทุกคนโปรดตรวจสอบรายชื่อและยศตำแหน่งทางการ พร้อมเปิดตัวระบบพันธมิตร Discord Alliance",
  "announcementBannerUrl": "/uploads/1790245341806_ffsbackgrounds.gif",
  "bannerSlideInterval": 5,
  "banners": [
    {
      "id": "banner_1790245341813",
      "url": "/uploads/1790245341806_ffsbackgrounds.gif",
      "caption": "SLUMZICK SYNDICATE HQ"
    },
    {
      "id": "banner_1790245424525",
      "url": "/uploads/1790245424501_5e5c0fc411760a7adc814c3d045af878.gif",
      "caption": "BLOOD BROTHERS ON TOP"
    }
  ],
  "partners": [
    {
      "id": "partner_1790426683898",
      "name": "ipts : slumzick v2",
      "guildId": "883340327459635220",
      "category": "OFFICIAL ALLIANCE",
      "inviteUrl": "https://discord.gg/6TWAGnrP2t",
      "code": "6TWAGnrP2t",
      "icon": "https://cdn.discordapp.com/icons/883340327459635220/9f3bb1e4e0748c5a8a3dca3ee6b46366.png?size=256",
      "banner": null,
      "memberCount": 3851,
      "presenceCount": 268,
      "description": "ASDASDASDASDASD",
      "lastSyncedAt": 1790430069768
    },
    {
      "id": "partner_1790426778976",
      "name": "United States Armed Forces [USA] ROBLOX",
      "guildId": "267345360203153430",
      "category": "OFFICIAL ALLIANCE",
      "inviteUrl": "https://discord.gg/usa",
      "code": "usa",
      "icon": "https://cdn.discordapp.com/icons/267345360203153430/ab4b7029c630b007dc2f7248b2679a9a.png?size=256",
      "banner": "https://cdn.discordapp.com/banners/267345360203153430/f94219fd3fbddfdabaa3469f417452bf.png?size=1024",
      "memberCount": 39755,
      "presenceCount": 3179,
      "description": "A community based around the group United States Armed Forces [USAF] on ROBLOX",
      "lastSyncedAt": 1790430072333
    }
  ],
  "socials": {
    "facebook": "",
    "youtube": "",
    "tiktok": "",
    "instagram": ""
  },
  "musicUrl": "https://youtu.be/gt_Oe2yGE4o?si=VauRw5cQssWDLn7w",
  "musicTitle": "",
  "musicCover": "",
  "musicStartTime": 25,
  "musicVolume": 30,
  "siteViews": 70
}'::jsonb)
on conflict (filename) do update set data = excluded.data, updated_at = now();

insert into gang_storage (filename, data) values ('members.json', '[
  {
    "id": "1471173112409096269",
    "name": "UFA ZICK",
    "slug": "hazelr",
    "avatar": "https://cdn.discordapp.com/avatars/1471173112409096269/220296ac1e46c5a6033dcd759f7bb4be.png?size=256",
    "roleId": "leader",
    "accessory": "none",
    "bio": "am okay",
    "particleType": "custom_image",
    "particleColor": "#ff2a44",
    "cursorEffect": "fire_ember",
    "primaryColor": "#ff2a44",
    "textColor": "#fbcfe8",
    "cardStyle": "dark",
    "discordId": "1471173112409096269",
    "discordUsername": "pudding_pp.",
    "discordStatusText": "",
    "discordBadge": "𝟭𝗥",
    "robloxUsername": "paarmzcx2",
    "musicTitle": "PUN - Living Death",
    "views": 269,
    "socials": {
      "roblox": "paarmzcx2",
      "instagram": "https://www.instagram.com/gkbyontop/",
      "youtube": "https://www.instagram.com/gkbyontop/",
      "tiktok": "https://www.instagram.com/gkbyontop/",
      "facebook": "https://www.instagram.com/gkbyontop/",
      "twitch": "https://www.instagram.com/gkbyontop/",
      "spotify": "https://www.instagram.com/gkbyontop/",
      "steam": "https://www.instagram.com/gkbyontop/",
      "github": "https://www.instagram.com/gkbyontop/",
      "soundcloud": ""
    },
    "backgroundUrl": "/uploads/1790235700067_5e5c0fc411760a7adc814c3d045af878.gif",
    "musicUrl": "https://youtu.be/X_nKROar67Y?si=hKAgWLfXBflZyb_J",
    "musicArtist": "PUN",
    "musicCover": "https://img.youtube.com/vi/X_nKROar67Y/hqdefault.jpg",
    "robloxUserId": "",
    "updatedAt": "2026-09-26T12:42:51.510Z",
    "bgDarkness": 45,
    "bgBlur": 0,
    "musicStartTime": 68,
    "musicVolume": 5,
    "customParticleImages": [
      "https://cdn.discordapp.com/attachments/1551149152417873950/1553060044294332426/afc966b91eeec83eec99b83ef684fdb7.gif?ex=6ab7df61&is=6ab68de1&hm=f2726c9959c19c78fc8ca686076935d1553f60225efc7bdc30f83bd94e617f04",
      "https://cdn.discordapp.com/attachments/1551149152417873950/1553060276549455996/a96827aa75c09ba6c6dcf38b8f6daa90.gif?ex=6ab7df98&is=6ab68e18&hm=b2788e76be2d1bfb3e18997127e2bcd7c264e6c46bad37a50cba547951b6dfd4",
      "https://cdn.discordapp.com/attachments/1551149152417873950/1553060892340388011/4be573dc17f22189e2437f82f7fa4fe7.gif?ex=6ab7e02b&is=6ab68eab&hm=c5f8a4bec3d2b1302b53eebfe80e81a5dfd2ab3de7228d799d87b17137241312",
      "/uploads/1790377733636_b62bd653a5ea86726d1b28b9cfc9916d.gif"
    ],
    "particleEmitDirection": "rain",
    "avatarDecoration": "https://cdn.discordapp.com/avatar-decoration-presets/a_c0393b6cc00148f32c5015d1417ca12c.png?size=256&passthrough=true",
    "socialsLayout": "floating_dock",
    "musicPlayerStyle": "wave",
    "particleSize": "small",
    "discordBadgeIcon": "https://cdn.discordapp.com/clan-badges/1396736573445374082/09f17237050714f397357bc1465537e2.png",
    "showAvatarDecoration": "both",
    "entranceEffect": "none",
    "musicLyrics": "",
    "discordServerInvite": "https://discord.gg/6TWAGnrP2t",
    "discordServerData": {
      "code": "6TWAGnrP2t",
      "guildId": "883340327459635220",
      "name": "ipts : slumzick v2",
      "description": "",
      "icon": "https://cdn.discordapp.com/icons/883340327459635220/9f3bb1e4e0748c5a8a3dca3ee6b46366.png?size=256",
      "banner": null,
      "memberCount": 3841,
      "presenceCount": 197,
      "vanityUrlCode": "6TWAGnrP2t",
      "features": [
        "ACTIVITY_FEED_ENABLED_BY_USER",
        "PIN_PERMISSION_MIGRATION_COMPLETE",
        "SOUNDBOARD",
        "CHANNEL_ICON_EMOJIS_GENERATED",
        "AUTO_MODERATION",
        "MEMBER_VERIFICATION_GATE_ENABLED",
        "AGE_VERIFICATION_LARGE_GUILD",
        "WELCOME_SCREEN_ENABLED",
        "TIERLESS_BOOSTING",
        "TIERLESS_BOOSTING_SYSTEM_MESSAGE",
        "TEXT_IN_VOICE_ENABLED"
      ],
      "verificationLevel": 0,
      "inviteUrl": "https://discord.gg/6TWAGnrP2t"
    },
    "discordServerStyle": "compact_dock",
    "showDiscordServer": true,
    "profileContainerStyle": "floating"
  }
]'::jsonb)
on conflict (filename) do update set data = excluded.data, updated_at = now();

insert into gang_storage (filename, data) values ('roles.json', '[
  {
    "id": "founder",
    "name": "OWNER",
    "icon": "Crown",
    "color": "#000000",
    "contrastColor": "#ff2a44"
  },
  {
    "id": "leader",
    "name": "MEMBER GABG",
    "icon": "Star",
    "color": "#ff001e",
    "contrastColor": "#ffffff"
  },
  {
    "id": "member",
    "name": "GANGLIST.WAY",
    "icon": "User",
    "color": "#ffffff",
    "contrastColor": "#ff2a44"
  }
]'::jsonb)
on conflict (filename) do update set data = excluded.data, updated_at = now();

insert into gang_storage (filename, data) values ('analytics.json', '{
  "1471173112409096269": {
    "clicks": {
      "discord": 2,
      "spotify": 1
    },
    "clicksTotal": 3,
    "hourlyViews": [
      0,
      0,
      0,
      0,
      0,
      8,
      6,
      0,
      1,
      3,
      3,
      1,
      5,
      7,
      10,
      7,
      5,
      10,
      3,
      2,
      0,
      0,
      0,
      0
    ],
    "dailyViews": {
      "2026-09-25": 14,
      "2026-09-26": 57
    },
    "updatedAt": "2026-09-26T12:32:14.994Z"
  }
}'::jsonb)
on conflict (filename) do update set data = excluded.data, updated_at = now();

insert into gang_storage (filename, data) values ('applications.json', '[]'::jsonb)
on conflict (filename) do update set data = excluded.data, updated_at = now();
