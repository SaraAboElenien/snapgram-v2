// Seeds the database with realistic demo data across every shipped feature
// (users, follows, posts, likes, comments, saves, notifications, stories,
// chats). Writes directly to Mongo/Cloudinary rather than through the HTTP
// API — this app's Phase 3 auth rate limiter (10 req/15min shared across
// signup/signin/forgetPassword/resetPassword) makes seeding 8+ users through
// real HTTP signup impractical, and direct writes let every relationship
// (follows, likes, notifications) be constructed in the exact final shape
// the real controllers would produce, in one pass, without racing the limiter.
//
// Safety: refuses to run if the users collection already has any documents,
// unless --force is passed (and even then, never deletes anything — it only
// ever adds more documents on top of whatever exists).
//
// Usage: node scripts/seed-demo.mjs [--force]

import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({ path: path.resolve('config/.env') });

import mongoose from 'mongoose';
import bcryptjs from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FORCE = process.argv.includes('--force');
const DEMO_PASSWORD = 'DemoPass@2026';
const { ObjectId } = mongoose.Types;

const personas = [
  {
    key: 'ava', firstName: 'Ava', lastName: 'Martinez', email: 'ava.martinez@example.com',
    avatar: 'https://i.pravatar.cc/300?img=47',
    bio: '📸 Travel photographer chasing golden hour across the globe\n✈️ 32 countries and counting\n🌍 DM for print inquiries',
  },
  {
    key: 'liam', firstName: 'Liam', lastName: 'Chen', email: 'liam.chen@example.com',
    avatar: 'https://i.pravatar.cc/300?img=12',
    bio: '👨‍🍳 Home cook turned food blogger\n🍝 Sunday sauce is non-negotiable\n📍 Los Angeles',
  },
  {
    key: 'maya', firstName: 'Maya', lastName: 'Patel', email: 'maya.patel@example.com',
    avatar: 'https://i.pravatar.cc/300?img=32',
    bio: '💪 Certified strength coach\n🏋️ 5am is my favorite hour\n🎯 Coaching spots open, link in bio',
  },
  {
    key: 'ethan', firstName: 'Ethan', lastName: 'Brooks', email: 'ethan.brooks@example.com',
    avatar: 'https://i.pravatar.cc/300?img=13',
    bio: '💻 Backend engineer, professional bug creator\n☕ Powered by coffee and stack overflow\n🎮 Occasional streamer',
  },
  {
    key: 'sofia', firstName: 'Sofia', lastName: 'Rossi', email: 'sofia.rossi@example.com',
    avatar: 'https://i.pravatar.cc/300?img=45',
    bio: '🎨 Illustrator & sketchbook enthusiast\n🖌️ Commissions occasionally open\n🌈 Color theory nerd',
  },
  {
    key: 'noah', firstName: 'Noah', lastName: 'Kim', email: 'noah.kim@example.com',
    avatar: 'https://i.pravatar.cc/300?img=14',
    bio: '🎸 Musician, always chasing the right take\n🎧 New EP coming eventually\n🎹 Studio nights are my therapy',
  },
  {
    key: 'zara', firstName: 'Zara', lastName: 'Ahmed', email: 'zara.ahmed@example.com',
    avatar: 'https://i.pravatar.cc/300?img=48',
    bio: '📚 Reading my way through an unreasonable TBR\n✍️ Writing a novel, allegedly\n☕ Coffee shop resident',
  },
  {
    key: 'leo', firstName: 'Leo', lastName: 'Johansson', email: 'leo.johansson@example.com',
    avatar: 'https://i.pravatar.cc/300?img=15',
    bio: '⛰️ Chasing summits and hidden trails\n🏕️ Weekend camper, weekday dreamer\n📷 Nature over notifications',
  },
];

const followGraph = {
  ava: ['liam', 'sofia', 'leo', 'noah'],
  liam: ['ava', 'maya', 'zara'],
  maya: ['ethan', 'liam', 'leo'],
  ethan: ['maya', 'noah'],
  sofia: ['noah', 'ava', 'zara'],
  noah: ['sofia', 'ava', 'ethan'],
  zara: ['leo', 'liam', 'sofia'],
  leo: ['ava', 'zara', 'maya'],
};

const postDefs = [
  { author: 'ava', desc: 'Golden hour over the cliffs — some views make you forget your phone even has a lock screen.', tags: ['travel', 'sunset', 'wanderlust'], location: 'Amalfi Coast, Italy', seed: 'ava-1' },
  { author: 'ava', desc: 'Lost in the old town alleys today. Every corner had a story worth photographing.', tags: ['travel', 'photography'], location: 'Lisbon, Portugal', seed: 'ava-2' },
  { author: 'liam', desc: "Sunday sauce simmering since 9am. Some things can't be rushed.", tags: ['food', 'cooking', 'italian'], seed: 'liam-1' },
  { author: 'liam', desc: 'Fresh sourdough, finally nailed the crumb structure after a dozen failed loaves.', tags: ['baking', 'food'], seed: 'liam-2' },
  { author: 'liam', desc: 'Street food night market — best tacos I have had outside of Mexico City.', tags: ['foodie', 'streetfood'], location: 'Los Angeles, CA', seed: 'liam-3' },
  { author: 'maya', desc: "5am alarm still hits different when the sunrise looks like this. Let's go.", tags: ['fitness', 'motivation'], seed: 'maya-1' },
  { author: 'maya', desc: 'New PR on deadlifts today — consistency really does compound.', tags: ['fitness', 'strength'], seed: 'maya-2' },
  { author: 'ethan', desc: "Finally shipped the feature I've been debugging for three days. The bug was a missing await. Of course it was.", tags: ['coding', 'developerlife'], seed: 'ethan-1' },
  { author: 'ethan', desc: 'New mechanical keyboard day. My wallet is crying, my typing is singing.', tags: ['tech', 'setup'], seed: 'ethan-2' },
  { author: 'sofia', desc: 'Sketch of the week — trying out a new color palette, feeling pretty good about this one.', tags: ['art', 'illustration'], seed: 'sofia-1' },
  { author: 'sofia', desc: "Commission work in progress, can't share the full piece yet but here's a sneak peek.", tags: ['art', 'wip'], seed: 'sofia-2' },
  { author: 'sofia', desc: 'Art supplies haul! Treating myself after finishing a big project.', tags: ['art', 'supplies'], seed: 'sofia-3' },
  { author: 'noah', desc: 'Studio session ran way past midnight but we finally got the bridge right.', tags: ['music', 'studio'], seed: 'noah-1' },
  { author: 'noah', desc: 'New gear day — this pedal is going to change everything about my live sound.', tags: ['music', 'gear'], seed: 'noah-2' },
  { author: 'zara', desc: 'Finished my TBR pile for the month, already regretting agreeing to that reading challenge.', tags: ['books', 'reading'], seed: 'zara-1' },
  { author: 'zara', desc: 'Coffee shop writing session — 2,000 words down, several plot holes discovered.', tags: ['writing', 'books'], seed: 'zara-2' },
  { author: 'leo', desc: 'Summit views never get old. Legs are done but heart is full.', tags: ['hiking', 'nature', 'outdoors'], location: 'Rocky Mountain National Park', seed: 'leo-1' },
  { author: 'leo', desc: 'Found this hidden waterfall completely by accident today — best kind of detour.', tags: ['nature', 'hiking'], seed: 'leo-2' },
  { author: 'leo', desc: 'Camping under a sky full of stars, no wifi, no problem.', tags: ['camping', 'nature'], seed: 'leo-3' },
];

const commentDefs = [
  { post: 'ava-1', author: 'leo', text: 'This is unreal, adding it to my travel list immediately.' },
  { post: 'ava-1', author: 'sofia', text: 'The colors in this are so good, would love to paint this someday.' },
  { post: 'ava-2', author: 'zara', text: 'Lisbon has been on my list forever, this is not helping my self control.' },
  { post: 'liam-1', author: 'maya', text: 'Recipe please?? This looks incredible.' },
  { post: 'liam-2', author: 'zara', text: 'The crumb structure is *chefs kiss*' },
  { post: 'liam-3', author: 'ava', text: 'Now I am hungry and it is not even lunch yet.' },
  { post: 'maya-1', author: 'ethan', text: 'The dedication is real, I can barely wake up for my 9am standup.' },
  { post: 'maya-2', author: 'leo', text: 'Huge PR, congrats! Strength gains take patience.' },
  { post: 'ethan-1', author: 'noah', text: "Missing await is basically a rite of passage at this point." },
  { post: 'sofia-1', author: 'ava', text: 'That palette is gorgeous, saving for inspo.' },
  { post: 'sofia-2', author: 'zara', text: 'The suspense is killing me, cannot wait to see the full piece.' },
  { post: 'noah-1', author: 'sofia', text: 'Late nights for good takes are always worth it in the end.' },
  { post: 'zara-1', author: 'liam', text: 'Reading challenges are a trap and yet here we all are.' },
  { post: 'leo-1', author: 'maya', text: 'The view alone is enough cardio motivation for my whole week.' },
  { post: 'leo-2', author: 'ava', text: 'Hidden waterfalls are the best kind of souvenir, gorgeous shot.' },
];

const likeDefs = [
  { post: 'ava-1', by: ['liam', 'maya', 'sofia', 'leo', 'noah'] },
  { post: 'ava-2', by: ['zara', 'leo'] },
  { post: 'liam-1', by: ['ava', 'maya', 'zara'] },
  { post: 'liam-2', by: ['zara', 'ethan'] },
  { post: 'liam-3', by: ['ava', 'sofia'] },
  { post: 'maya-1', by: ['ethan', 'leo', 'liam'] },
  { post: 'maya-2', by: ['leo'] },
  { post: 'ethan-1', by: ['noah', 'maya'] },
  { post: 'ethan-2', by: ['ava'] },
  { post: 'sofia-1', by: ['ava', 'zara', 'noah'] },
  { post: 'sofia-2', by: ['zara'] },
  { post: 'sofia-3', by: ['ava', 'liam'] },
  { post: 'noah-1', by: ['sofia', 'ava', 'ethan'] },
  { post: 'noah-2', by: ['sofia'] },
  { post: 'zara-1', by: ['liam', 'sofia'] },
  { post: 'zara-2', by: ['leo'] },
  { post: 'leo-1', by: ['ava', 'zara', 'maya'] },
  { post: 'leo-2', by: ['ava', 'zara'] },
  { post: 'leo-3', by: ['maya'] },
];

const saveDefs = [
  { post: 'ava-1', by: ['leo', 'sofia'] },
  { post: 'liam-1', by: ['maya'] },
  { post: 'sofia-1', by: ['ava', 'zara'] },
  { post: 'leo-1', by: ['ava'] },
  { post: 'ethan-1', by: ['noah'] },
  { post: 'zara-2', by: ['liam'] },
];

const storyDefs = [
  { author: 'ava', seed: 'ava-story-1', viewers: ['leo', 'sofia'] },
  { author: 'maya', seed: 'maya-story-1', viewers: ['ethan'] },
  { author: 'sofia', seed: 'sofia-story-1', viewers: ['ava', 'noah', 'zara'] },
  { author: 'leo', seed: 'leo-story-1', viewers: [] },
];

const chatDefs = [
  {
    a: 'ava', b: 'liam',
    messages: [
      { from: 'liam', text: "That Amalfi shot is incredible, what camera are you running these days?" },
      { from: 'ava', text: "Thank you! Still on the same old mirrorless, honestly it's mostly about waiting for the light." },
      { from: 'liam', text: "Patience I do not have. Respect to you travel photographers." },
      { from: 'ava', text: "Ha, it's 90% waiting around and 10% actually pressing the shutter." },
    ],
  },
  {
    a: 'maya', b: 'ethan',
    messages: [
      { from: 'maya', text: "Hey! Still thinking about that program we talked about?" },
      { from: 'ethan', text: "Yes, just been buried in a release. Can we start next Monday?" },
      { from: 'maya', text: "Works for me. I'll put a beginner plan together for you." },
      { from: 'ethan', text: "Appreciate it, my deadlift form needs serious help." },
      { from: 'maya', text: "We'll fix that first day, promise." },
    ],
  },
  {
    a: 'sofia', b: 'noah',
    messages: [
      { from: 'noah', text: "Would you be up for doing cover art for the EP?" },
      { from: 'sofia', text: "Yes! Send me the vibe/mood you're going for and I'll sketch some options." },
      { from: 'noah', text: "Moody, a little nostalgic, mostly blues and greys." },
      { from: 'sofia', text: "I love that, give me a few days and I'll have concepts to show you." },
    ],
  },
  {
    a: 'zara', b: 'leo',
    messages: [
      { from: 'zara', text: "That waterfall post lives in my head now, where even was that?" },
      { from: 'leo', text: "Off a trail near the park, honestly wasn't even looking for it." },
      { from: 'zara', text: "The universe rewards people who actually leave the house I guess." },
      { from: 'leo', text: "Ha, you should come next time, good writing inspiration out there too." },
    ],
  },
];

async function main() {
  console.log(`Connecting to ${process.env.DB_URL_ONLINE?.includes('mongodb+srv') ? 'Atlas' : 'local'} MongoDB...`);
  await mongoose.connect(process.env.DB_URL_ONLINE);
  const db = mongoose.connection.db;

  const existingUsers = await db.collection('users').countDocuments();
  if (existingUsers > 0 && !FORCE) {
    console.error(
      `Refusing to seed: ${existingUsers} user(s) already exist in this database.\n` +
      `This script never deletes anything, but seeding on top of real/existing data is almost certainly not what you want.\n` +
      `Pass --force if you're certain (e.g. re-running against a database you already know is demo-only).`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  console.log('Uploading avatars to Cloudinary...');
  for (const p of personas) {
    const result = await cloudinary.uploader.upload(p.avatar, { folder: 'SocialMedia/Users/ProfileImages' });
    p.profileImage = { secure_url: result.secure_url, public_id: result.public_id };
    p._id = new ObjectId();
    process.stdout.write('.');
  }
  console.log(' done');

  const hashedPassword = await bcryptjs.hash(DEMO_PASSWORD, parseInt(process.env.saltRounds));
  const byKey = Object.fromEntries(personas.map((p) => [p.key, p]));

  // Apply the follow graph in-memory first so user docs are inserted once, fully formed.
  for (const [followerKey, followeeKeys] of Object.entries(followGraph)) {
    const follower = byKey[followerKey];
    follower.following = followeeKeys.map((k) => byKey[k]._id);
  }
  for (const p of personas) {
    p.followers = personas.filter((other) => (other.following || []).some((id) => id.equals(p._id))).map((o) => o._id);
  }

  const userDocs = personas.map((p, i) => ({
    _id: p._id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    password: hashedPassword,
    profileImage: p.profileImage,
    followers: p.followers,
    following: p.following,
    savedPosts: [],
    recoveryEmail: undefined,
    role: 'User',
    confirmed: true,
    bio: p.bio,
    loggedIn: false,
    createdAt: new Date(now - (personas.length - i) * day),
    updatedAt: new Date(now - (personas.length - i) * day),
  }));
  await db.collection('users').insertMany(userDocs);
  console.log(`Inserted ${userDocs.length} users.`);

  // Follow notifications (one per follow edge, timestamped near the user's own signup).
  const followNotifs = [];
  for (const [followerKey, followeeKeys] of Object.entries(followGraph)) {
    for (const followeeKey of followeeKeys) {
      followNotifs.push({
        _id: new ObjectId(),
        receiver: byKey[followeeKey]._id,
        sender: byKey[followerKey]._id,
        type: 'follow',
        content: 'started following you.',
        isRead: Math.random() > 0.5,
        createdAt: new Date(now - Math.floor(Math.random() * 3 * day)),
        updatedAt: new Date(now - Math.floor(Math.random() * 3 * day)),
      });
    }
  }
  await db.collection('notifications').insertMany(followNotifs);
  console.log(`Inserted ${followNotifs.length} follow notifications.`);

  // Posts
  console.log('Uploading post images to Cloudinary...');
  const postByKey = {};
  const postDocs = [];
  const newPostNotifs = [];
  for (let i = 0; i < postDefs.length; i++) {
    const def = postDefs[i];
    const author = byKey[def.author];
    const result = await cloudinary.uploader.upload(`https://picsum.photos/seed/${def.seed}/800/600`, { folder: 'SocialMedia/Posts' });
    const postId = new ObjectId();
    const createdAt = new Date(now - Math.floor(Math.random() * 6 * day));
    postByKey[def.seed] = { _id: postId, authorKey: def.author };
    postDocs.push({
      _id: postId,
      userId: author._id,
      description: def.desc,
      tags: def.tags,
      location: def.location,
      image: { secure_url: result.secure_url, public_id: result.public_id },
      likes: [],
      comments: [],
      createdAt,
      updatedAt: createdAt,
    });
    for (const followerId of author.followers) {
      newPostNotifs.push({
        _id: new ObjectId(),
        receiver: followerId,
        sender: author._id,
        type: 'newPost',
        content: `has posted: ${def.desc.slice(0, 30)}...`,
        post: postId,
        isRead: Math.random() > 0.6,
        createdAt,
        updatedAt: createdAt,
      });
    }
    process.stdout.write('.');
  }
  console.log(' done');
  await db.collection('posts').insertMany(postDocs);
  console.log(`Inserted ${postDocs.length} posts.`);
  if (newPostNotifs.length) {
    await db.collection('notifications').insertMany(newPostNotifs);
    console.log(`Inserted ${newPostNotifs.length} newPost notifications.`);
  }

  // Comments
  const commentDocs = [];
  const commentNotifs = [];
  const commentIdsByPost = {};
  for (const def of commentDefs) {
    const post = postByKey[def.post];
    const author = byKey[def.author];
    const commentId = new ObjectId();
    const createdAt = new Date(now - Math.floor(Math.random() * 5 * day));
    commentDocs.push({
      _id: commentId,
      userId: author._id,
      postId: post._id,
      comment: def.text,
      replies: [],
      likes: [],
      createdAt,
      updatedAt: createdAt,
    });
    commentIdsByPost[def.post] = commentIdsByPost[def.post] || [];
    commentIdsByPost[def.post].push(commentId);
    if (post.authorKey !== def.author) {
      commentNotifs.push({
        _id: new ObjectId(),
        receiver: byKey[post.authorKey]._id,
        sender: author._id,
        type: 'comment',
        post: post._id,
        content: ' commented on your post.',
        isRead: Math.random() > 0.5,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  await db.collection('comments').insertMany(commentDocs);
  console.log(`Inserted ${commentDocs.length} comments.`);
  await db.collection('notifications').insertMany(commentNotifs);
  console.log(`Inserted ${commentNotifs.length} comment notifications.`);
  for (const [postKey, ids] of Object.entries(commentIdsByPost)) {
    await db.collection('posts').updateOne({ _id: postByKey[postKey]._id }, { $push: { comments: { $each: ids } } });
  }

  // Likes
  const likeNotifs = [];
  for (const def of likeDefs) {
    const post = postByKey[def.post];
    const likerIds = def.by.map((k) => byKey[k]._id);
    await db.collection('posts').updateOne({ _id: post._id }, { $push: { likes: { $each: likerIds } } });
    for (const likerKey of def.by) {
      if (likerKey !== post.authorKey) {
        likeNotifs.push({
          _id: new ObjectId(),
          receiver: byKey[post.authorKey]._id,
          sender: byKey[likerKey]._id,
          type: 'like',
          post: post._id,
          content: 'liked your post.',
          isRead: Math.random() > 0.5,
          createdAt: new Date(now - Math.floor(Math.random() * 4 * day)),
          updatedAt: new Date(now - Math.floor(Math.random() * 4 * day)),
        });
      }
    }
  }
  await db.collection('notifications').insertMany(likeNotifs);
  console.log(`Applied ${likeDefs.reduce((n, d) => n + d.by.length, 0)} likes, inserted ${likeNotifs.length} like notifications.`);

  // Saves
  const saveNotifs = [];
  for (const def of saveDefs) {
    const post = postByKey[def.post];
    for (const saverKey of def.by) {
      await db.collection('users').updateOne({ _id: byKey[saverKey]._id }, { $push: { savedPosts: post._id } });
      if (saverKey !== post.authorKey) {
        saveNotifs.push({
          _id: new ObjectId(),
          receiver: byKey[post.authorKey]._id,
          sender: byKey[saverKey]._id,
          type: 'save',
          post: post._id,
          content: 'saved your post.',
          isRead: Math.random() > 0.5,
          createdAt: new Date(now - Math.floor(Math.random() * 3 * day)),
          updatedAt: new Date(now - Math.floor(Math.random() * 3 * day)),
        });
      }
    }
  }
  await db.collection('notifications').insertMany(saveNotifs);
  console.log(`Applied ${saveDefs.reduce((n, d) => n + d.by.length, 0)} saves, inserted ${saveNotifs.length} save notifications.`);

  // Stories (24h TTL from creation — a demo run today will have these expire ~24h later, by design)
  console.log('Uploading story images to Cloudinary...');
  const storyDocs = [];
  for (const def of storyDefs) {
    const author = byKey[def.author];
    const result = await cloudinary.uploader.upload(`https://picsum.photos/seed/${def.seed}/1080/1920`, { folder: 'SocialMedia/Stories' });
    const createdAt = new Date(now - Math.floor(Math.random() * 6 * 60 * 60 * 1000));
    storyDocs.push({
      _id: new ObjectId(),
      userId: author._id,
      image: { secure_url: result.secure_url, public_id: result.public_id },
      expiresAt: new Date(createdAt.getTime() + day),
      viewers: def.viewers.map((k) => ({ userId: byKey[k]._id, viewedAt: new Date(createdAt.getTime() + 30 * 60 * 1000) })),
      createdAt,
      updatedAt: createdAt,
    });
    process.stdout.write('.');
  }
  console.log(' done');
  await db.collection('stories').insertMany(storyDocs);
  console.log(`Inserted ${storyDocs.length} stories (each expires ~24h after this run).`);

  // Chats (only between mutually-followed pairs, matching the real app's rule)
  const conversationDocs = [];
  const messageDocs = [];
  for (const def of chatDefs) {
    const a = byKey[def.a];
    const b = byKey[def.b];
    const participantsKey = [a._id, b._id].map(String).sort().join('_');
    const conversationId = new ObjectId();
    let lastMsg = null;
    let ts = now - def.messages.length * 5 * 60 * 1000;
    const msgs = def.messages.map((m) => {
      const sender = byKey[m.from];
      const doc = {
        _id: new ObjectId(),
        conversationId,
        senderId: sender._id,
        text: m.text,
        readBy: [sender._id],
        createdAt: new Date(ts),
        updatedAt: new Date(ts),
      };
      lastMsg = { text: m.text, senderId: sender._id, createdAt: new Date(ts) };
      ts += 5 * 60 * 1000;
      return doc;
    });
    messageDocs.push(...msgs);
    conversationDocs.push({
      _id: conversationId,
      participants: [a._id, b._id],
      participantsKey,
      lastMessage: lastMsg,
      createdAt: new Date(now - def.messages.length * 5 * 60 * 1000),
      updatedAt: new Date(lastMsg.createdAt),
    });
  }
  await db.collection('conversations').insertMany(conversationDocs);
  await db.collection('messages').insertMany(messageDocs);
  console.log(`Inserted ${conversationDocs.length} conversations, ${messageDocs.length} messages.`);

  console.log('\nDemo accounts (all share the same password):');
  console.log(`  Password: ${DEMO_PASSWORD}`);
  for (const p of personas) console.log(`  ${p.email}`);

  const finalCounts = {};
  for (const c of ['users', 'posts', 'comments', 'notifications', 'stories', 'conversations', 'messages']) {
    finalCounts[c] = await db.collection(c).countDocuments();
  }
  console.log('\nFinal collection counts:', finalCounts);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seeding failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
