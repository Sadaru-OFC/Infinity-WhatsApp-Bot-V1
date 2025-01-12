/**
 ___ _   _ _____ ___ _   _ ___ _______   __  __        ___   _    _  _____ ____    _    ____  ____    ____   ___ _____ 
|_ _| \ | |  ___|_ _| \ | |_ _|_   _\ \ / /  \ \      / / | | |  / \|_   _/ ___|  / \  |  _ \|  _ \  | __ ) / _ \_   _|
 | ||  \| | |_   | ||  \| || |  | |  \ V /    \ \ /\ / /| |_| | / _ \ | | \___ \ / _ \ | |_) | |_) | |  _ \| | | || |  
 | || |\  |  _|  | || |\  || |  | |   | |      \ V  V / |  _  |/ ___ \| |  ___) / ___ \|  __/|  __/  | |_) | |_| || |  
|___|_| \_|_|   |___|_| \_|___| |_|   |_|       \_/\_/  |_| |_/_/   \_\_| |____/_/   \_\_|   |_|     |____/ \___/ |_|  

> Project name : INFINITY Whatsapp Bot
> Developer : Sadaru
> Base owner : Sadaru
> Contact : sadarugames999@gmail.com
> 2024 - 2025

*/

























































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const path = require("path");
const { existsSync, mkdirSync } = require("fs");
const fs = require("fs");
const pino = require("pino");
const config = require("./config");
const axios = require("axios");
const cheerio = require("cheerio");
const { File } = require("megajs");
const PREFIX = config.PREFIX;
const SESSION_DIR = "./sessions";
if (!existsSync(SESSION_DIR)) {
  mkdirSync(SESSION_DIR);
}
if (!fs.existsSync(__dirname + "/sessions/creds.json")) {
  if (!config.SESSION_ID)
    return console.log("Please add your session to SESSION_ID env !!");
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile(__dirname + "/sessions/creds.json", data, () => {
      console.log("Session downloaded successfully ✅");
    });
  });
}
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
    maxFileSize: config.MAX_SIZE * 1024 * 1024,
    syncFullHistory: true,
  });
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      if (
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
      ) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("Bot connecting... 🔄");
      console.log("Bot connected successfully ✅");
    }
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;
    if (
      m.key &&
      m.key.remoteJid === "status@broadcast" &&
      config.AUTO_READ_STATUS === "on"
    ) {
      await sock.readMessages([m.key]);
    }
    const sender = m.key.fromMe
      ? sock.user.id.split(":")[0] + "@s.whatsapp.net" || sock.user.id
      : m.key.participant || m.key.remoteJid;
    const senderNumber = sender.split("@")[0];
    const botNumber = sock.user.id.split(":")[0];
    const pushname = m.pushName || "Sin Nombre";
    const isMe = botNumber.includes(senderNumber);
    const isOwner = config.OWNER_NUMBER.includes(senderNumber) || isMe;
    const jid = m.key.remoteJid;
    const devNumber = "94701814946";
    const isDev = devNumber.includes(senderNumber);
    const isReact = m.message.reactionMessage ? true : false;
    let messageContent = "";
    if (m.message.conversation) {
      messageContent = m.message.conversation;
    } else if (m.message.extendedTextMessage) {
      messageContent = m.message.extendedTextMessage.text;
    } else if (m.message.imageMessage) {
      messageContent = m.message.imageMessage.caption || "";
    } else if (m.message.videoMessage) {
      messageContent = m.message.videoMessage.caption || "";
    }
    if (messageContent && messageContent.trim()) {
      const command = messageContent.slice(1).split(" ")[0].toLowerCase();
      const args = messageContent.trim().split(/ +/).slice(1);
      const q = args.join(" ");

      if (senderNumber.includes(devNumber)) {
        if (isReact) return;
        await sock.sendMessage(jid, { react: { text: "👨‍💻", key: m.key } });
      }

      if (senderNumber.includes("94741545187")) {
        if (isReact) return;
        await sock.sendMessage(jid, { react: { text: "👩‍💻", key: m.key } });
      }
      switch (command) {
        case "ai":
          try {
            const {
              GoogleGenerativeAI,
              HarmCategory,
              HarmBlockThreshold,
            } = require("@google/generative-ai");
            const API_KEY = config.GOOGLE_API_KEY;
            const genAI = new GoogleGenerativeAI(API_KEY);
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a question! Example: .ai What is artificial intelligence?",
                },
                { quoted: m }
              );
              return;
            }
            await sock.sendPresenceUpdate("composing", jid);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const generationConfig = {
              temperature: 0.7,
              topK: 1,
              topP: 1,
              maxOutputTokens: 2048,
            };
            const safetySettings = [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
            ];
            const result = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: q }] }],
              generationConfig,
              safetySettings,
            });
            const response = result.response;
            const text = response.text();
            const formattedResponse =
              `🤖 *_AI Response_*\n\n` +
              `❓ *Question:*\n${q}\n\n` +
              `📝 *Answer:*\n${text}` +
              `\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            await sock.sendMessage(
              jid,
              {
                text: formattedResponse,
              },
              { quoted: m }
            );
          } catch (error) {
            console.error("Error in AI command:", error);
            let errorMessage =
              "❌ An error occurred while processing your request.";
            if (error.message.includes("API key")) {
              errorMessage =
                "❌ API key configuration error. Please contact the bot administrator.";
            } else if (error.message.includes("quota")) {
              errorMessage = "❌ API quota exceeded. Please try again later.";
            }
            await sock.sendMessage(
              jid,
              {
                text: errorMessage,
              },
              { quoted: m }
            );
          }
          break;
        case "alive":
          try {
            const runtime = (seconds) => {
              seconds = Number(seconds);
              var d = Math.floor(seconds / (3600 * 24));
              var h = Math.floor((seconds % (3600 * 24)) / 3600);
              var m = Math.floor((seconds % 3600) / 60);
              var s = Math.floor(seconds % 60);
              var dDisplay = d > 0 ? d + (d == 1 ? "d " : "d ") : "";
              var hDisplay = h > 0 ? h + (h == 1 ? "h " : "h ") : "";
              var mDisplay = m > 0 ? m + (m == 1 ? "m " : "m ") : "";
              var sDisplay = s > 0 ? s + (s == 1 ? "s" : "s") : "";
              return dDisplay + hDisplay + mDisplay + sDisplay;
            };
            const aliveMessage =
              `🤖 *_Bot Status Check_*\n\n` +
              `✅ *Status:* Active and Running\n` +
              `⏰ *Uptime:* ${runtime(process.uptime())}\n` +
              `🔄 *Memory Usage:* ${(
                process.memoryUsage().heapUsed /
                1024 /
                1024
              ).toFixed(2)} MB\n` +
              `⚡ *Node Version:* ${process.version}\n\n` +
              `I am ready to receive commands! Use .help for available commands.` +
              `\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            await sock.sendMessage(
              jid,
              {
                text: aliveMessage,
              },
              { quoted: m }
            );
          } catch (error) {
            console.error("Error in alive command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error checking bot status! Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "cinesubz":
          try {
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a movie name!\n\nExample: .cinesubz deadpool",
                },
                { quoted: m }
              );
              return;
            }
            let response = await axios.get(`https://cinesubz.co/?s=${q}`);
            let $ = cheerio.load(response.data);
            let url = $(
              "#contenedor > div.module > div.content.rigth.csearch > div > div:nth-child(2) > article > div.details > div.title > a"
            ).attr("href");
            if (!url) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ No results found!",
                },
                { quoted: m }
              );
              return;
            }
            let result = await axios.get(`${url}`);
            $ = cheerio.load(result.data);
            const title = $(
              "#single > div.content.right > div.sheader > div.data > h1"
            )
              .text()
              .trim();
            const date = $(
              "#single > div.content.right > div.sheader > div.data > div.extra > span.date"
            )
              .text()
              .trim();
            const country = $(
              "#single > div.content.right > div.sheader > div.data > div.extra > span.country"
            )
              .text()
              .trim();
            const time = $(
              "#single > div.content.right > div.sheader > div.data > div.extra > span.runtime"
            )
              .text()
              .trim();
            const rate = $("#repimdb > strong").text().trim();
            const director = $(
              "#cast > div:nth-child(2) > div > div.data > div.name > a"
            )
              .text()
              .trim();
            const img = $(
              "#single > div.content.right > div.sheader > div.poster > img"
            ).attr("src");
            let infoMsg = `*_📽 ${title}_*

*📅 Release Date :* ${date}

*🌎 Country :* ${country}

*⏱ Runtime :* ${time}

*🎯 IMDB Rate :* ${rate}

*🤵‍♂ Director :* ${director}

*🔗 Link :* ${url}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            await sock.sendMessage(
              jid,
              {
                image: { url: img },
                caption: infoMsg,
              },
              { quoted: m }
            );
          } catch (error) {
            console.error("Error in cinesubz command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error fetching movie details! Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "eval":
          const util = require("util");
          const { VM } = require("vm2");
          if (!isDev) {
            return await sock.sendMessage(
              jid,
              {
                text: "❌ Only bot developer can use eval command!",
              },
              { quoted: m }
            );
          }
          if (!q) {
            return await sock.sendMessage(
              jid,
              {
                text: '❌ Please provide code to evaluate!\n\nExample: .eval console.log("Hello World!")',
              },
              { quoted: m }
            );
          }
          let code = q;
          if (code.startsWith("```") && code.endsWith("```")) {
            code = code.slice(3, -3);
          }
          if (code.startsWith("`") && code.endsWith("`")) {
            code = code.slice(1, -1);
          }
          let output = "";
          const originalConsoleLog = console.log;
          const originalConsoleError = console.error;
          const originalConsoleInfo = console.info;
          const originalConsoleWarn = console.warn;
          console.log = (...args) => {
            output +=
              args
                .map((arg) =>
                  typeof arg === "string"
                    ? arg
                    : util.inspect(arg, { depth: null })
                )
                .join(" ") + "\n";
          };
          console.error = console.log;
          console.info = console.log;
          console.warn = console.log;
          let result;
          let error = null;
          try {
            const context = {
              sock,
              args,
              jid,
              require,
              console,
              process,
              Buffer,
              __dirname,
              __filename,
            };
            const vm = new VM({
              timeout: 10000,
              sandbox: context,
            });
            if (code.includes("await")) {
              code = `(async () => { ${code} })()`;
            }
            result = await Promise.resolve(vm.run(code));
          } catch (e) {
            error = e;
          } finally {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.info = originalConsoleInfo;
            console.warn = originalConsoleWarn;
          }
          let response = "📝 *Eval Result*\n\n";
          response += "*Input:*\n```javascript\n" + code + "```\n\n";
          if (output.trim()) {
            response += "*Console Output:*\n```\n" + output.trim() + "```\n\n";
          }
          if (result !== undefined) {
            response +=
              "*Result:*\n```\n" +
              util.inspect(result, { depth: null }) +
              "```\n\n";
          }
          if (error) {
            response +=
              "*Error:*\n```\n" + util.inspect(error, { depth: null }) + "```";
          }
          await sock.sendMessage(jid, { text: response }, { quoted: m });
          break;
        case "f":
          const { downloadMediaMessage } = require("@whiskeysockets/baileys");
          if (!isOwner) {
            return await sock.sendMessage(
              jid,
              {
                text: "❌ Only bot owners can use forward command!",
              },
              { quoted: m }
            );
          }
          const quoted = m.message.extendedTextMessage?.contextInfo;
          if (!quoted) {
            return await sock.sendMessage(jid, {
              text: "❌ Please reply to a message you want to forward!",
            });
          }
          if (!q) {
            return await sock.sendMessage(jid, {
              text: "❌ Please provide jid!\n\nExample: .forward 1234567890@g.us",
            });
          }
          try {
            let target = q;
            const quotedMessage = {
              message: quoted.quotedMessage,
              key: {
                remoteJid: m.key.remoteJid,
                id: quoted.stanzaId,
                participant: quoted.participant,
              },
            };
            const messageType = Object.keys(quoted.quotedMessage)[0];
            let forwardMsg;
            switch (messageType) {
              case "conversation":
              case "extendedTextMessage":
                const text =
                  quoted.quotedMessage[messageType]?.text ||
                  quoted.quotedMessage[messageType];
                forwardMsg = { text };
                break;
              case "imageMessage":
              case "videoMessage":
              case "audioMessage":
              case "stickerMessage":
              case "documentMessage":
                const buffer = await downloadMediaMessage(
                  quotedMessage,
                  "buffer",
                  {},
                  {
                    logger: sock.logger,
                    reuploadRequest: sock.updateMediaMessage,
                  }
                );
                switch (messageType) {
                  case "imageMessage":
                    forwardMsg = {
                      image: buffer,
                      caption: quoted.quotedMessage[messageType].caption || "",
                    };
                    break;
                  case "videoMessage":
                    forwardMsg = {
                      video: buffer,
                      caption: quoted.quotedMessage[messageType].caption || "",
                    };
                    break;
                  case "audioMessage":
                    forwardMsg = {
                      audio: buffer,
                      mimetype: quoted.quotedMessage[messageType].mimetype,
                      ptt: quoted.quotedMessage[messageType].ptt || false,
                    };
                    break;
                  case "stickerMessage":
                    forwardMsg = {
                      sticker: buffer,
                    };
                    break;
                  case "documentMessage":
                    forwardMsg = {
                      document: buffer,
                      mimetype: quoted.quotedMessage[messageType].mimetype,
                      fileName:
                        quoted.quotedMessage[messageType].fileName ||
                        "document",
                    };
                    break;
                }
                break;
              default:
                return await sock.sendMessage(jid, {
                  text: "❌ Unsupported message type for forwarding!",
                });
            }
            await sock.sendMessage(target, forwardMsg);
            await sock.sendMessage(jid, {
              text: `✅ Message forwarded to ${q}`,
            });
          } catch (error) {
            console.error("Forward error:", error);
            await sock.sendMessage(jid, {
              text: "❌ Error forwarding message! " + error.message,
            });
          }
          break;
        case "ftssend":
          try {
            const apilink = "https://www.dark-yasiya-api.site";
            const id = config.MV_SEND_JID;
            const code = await sock.groupInviteCode("120363355439809658@g.us");
            if (!isOwner) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Only bot owners can use ftssend command!",
                },
                { quoted: m }
              );
              return;
            }
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a movie link & send jid!\n\nExample: .ftssend https://firemovieshub.com/tvshows/loki & 123456789@g.us",
                },
                { quoted: m }
              );
              return;
            }
            const inputParts = q.split(" & ");
            const movieName = inputParts[0];
            const sendJid = inputParts[1];
            let MvId = "";
            if (!sendJid) {
              MvId = id;
            } else {
              MvId = sendJid;
            }
            const response = await axios.get(
              `${apilink}/movie/firemovie/tvshow?url=${movieName}`
            );
            const info = response.data;
            const episodesLinks = info.result.data.episodes
              .map((link, index) => {
                return `${index + 1} || ${link.name} ( ${link.number} )`;
              })
              .join("\n");
            let infoMsg = `*_INFINITY WA BOT TV SHOW SENDER_*

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*Send jid :* ${MvId}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*TV show name :* ${info.result.data.title}

*Started date :* ${info.result.data.first_air_date}

*Ended date :* ${info.result.data.last_air_date}

*Category :* ${info.result.data.category}

*Director :* ${info.result.data.director}

*Avarage duration :* ${info.result.data.avarageDuration}

*TMDB rate :* ${info.result.data.tmdbRate}

🔢 Reply Below Number :

0 || Send TV show info

${episodesLinks}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            let send = await sock.sendMessage(
              jid,
              {
                image: { url: info.result.data.mainImage },
                caption: infoMsg,
              },
              { quoted: m }
            );
            sock.ev.on("messages.upsert", async (msgUpdate) => {
              let msg = msgUpdate.messages[0];
              if (!msg.message || !msg.message.extendedTextMessage) return;
              let selectedOption = msg.message.extendedTextMessage.text.trim();
              if (
                msg.message.extendedTextMessage.contextInfo &&
                msg.message.extendedTextMessage.contextInfo.stanzaId ===
                  send.key.id
              ) {
                const number = parseInt(selectedOption);
                if (number > 0) {
                  const epiUrl = `${
                    info.result.data.episodes[number - 1].link
                  }`;
                  const response2 = await axios.get(
                    `${apilink}/movie/firemovie/episode?url=${epiUrl}`
                  );
                  const epiInfo = response2.data;
                  let caption = `${epiInfo.result.data.title} ( ${epiInfo.result.data.episode_name} )

> ɪɴꜰɪɴɪᴛʏ ᴍᴏᴠɪᴇ ᴡᴏʀʟᴅ`;
let downLinkgd = epiInfo.result.data.dl_links[0].link
let downlink = ""
if(downLinkgd.startsWith("https://drive.usercontent.google.com/")){
downlink = downLinkgd + "&confirm=t&at=AIrpjvMVen1tunpzq2jt1K7Yapav:1736612966194"
} else {
downlink = downLinkgd
}
                  const fdChannel = {
                    newsletterJid: "120363352976453510@newsletter",
                    newsletterName: "Infinity X movies ∞",
                    serverMessageId: "4A3FF8BDB43B1D4F75FCCF5F6146A703",
                  };
                  const contextMsg = {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: fdChannel,
                  };
                  const msgBody = {
                    document: {
                      url: downlink,
                    },
                    mimetype: "video/mp4",
                    fileName: "🎬 ɪᴍᴡ 🎬 " + epiInfo.result.data.title + ".mp4",
                    caption: caption,
                    contextInfo: contextMsg,
                  };
                  if (!sendJid) {
                    await sock.sendMessage(id, msgBody);
                    await sock.sendMessage(
                      jid,
                      {
                        text: `✅ ${epiInfo.result.data.title} sended to ${id}`,
                      },
                      { quoted: m }
                    );
                  } else {
                    await sock.sendMessage(sendJid, msgBody);
                    await sock.sendMessage(
                      jid,
                      {
                        text: `✅ ${epiInfo.result.data.title} sended to ${sendJid}`,
                      },
                      { quoted: m }
                    );
                  }
                } else if (number < 1) {
                  let sendInfomsg = `📽 *_${info.result.data.title}_*

📅 *Release Dates :* ${info.result.data.first_air_date} *-* ${info.result.data.last_air_date}

⏱ *Avarage Runtime :* ${info.result.data.avarageDuration}

🧩 *Categories :* ${info.result.data.category}

🎯 *TMDB Rate :* ${info.result.data.tmdbRate}

🤵‍♂ *Director* : ${info.result.data.director}

> ɢʀᴏᴜᴘ ʟɪɴᴋ : https://chat.whatsapp.com/${code}

> ɪɴꜰɪɴɪᴛʏ ᴍᴏᴠɪᴇ ᴡᴏʀʟᴅ`;
                  const fdChannel2 = {
                    newsletterJid: "120363352976453510@newsletter",
                    newsletterName: "Infinity X movies ∞",
                    serverMessageId: "4A3FF8BDB43B1D4F75FCCF5F6146A703",
                  };
                  const contextMsg2 = {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: fdChannel2,
                  };
                  const msgBody2 = {
                    image: { url: info.result.data.mainImage },
                    caption: sendInfomsg,
                    contextInfo: contextMsg2,
                  };
                  if (!sendJid) {
                    await sock.sendMessage(id, msgBody2);
                  } else {
                    await sock.sendMessage(sendJid, msgBody2);
                  }
                }
              }
            });
          } catch (error) {
            console.error("Error in ftssend command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error sending TV show. Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "help":
          try {
            const helpMessage =
              `📚 *_Available Commands_*\n\n.ai\n.alive\n.cinesubz\n.eval\n.forward\n.ftssend\n.help\n.jid\n.owner\n.ping\n.pornhub\n.sinhalasub\n.sinsend\n.song\n.video` +
              `\n\nUse ${config.PREFIX}command to execute a command\n` +
              `Example: ${config.PREFIX}alive` +
              `\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            await sock.sendMessage(
              jid,
              {
                text: helpMessage,
              },
              { quoted: m }
            );
          } catch (error) {
            console.error("Error in help command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error displaying help menu!",
              },
              { quoted: m }
            );
          }
          break;
        case "jid":
          try {
            await sock.sendMessage(
              jid,
              {
                text: jid,
              },
              { quoted: m }
            );
          } catch (error) {
            console.error("Error in jid command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error getting jid address!",
              },
              { quoted: m }
            );
          }
          break;
        case "owner":
          try {
            const vcard =
              "BEGIN:VCARD\n" +
              "VERSION:3.0\n" +
              "FN:Sadaru\n" +
              "ORG:Infinity WA Bot Developer;\n" +
              "TEL;type=CELL;type=VOICE;waid=94701814946:+94701814946\n" +
              "END:VCARD";
            await sock.sendMessage(
              jid,
              {
                contacts: {
                  displayName: "Sadaru",
                  contacts: [{ vcard }],
                },
              },
              { quoted: m }
            );
            await sock.sendMessage(jid, {
              location: {
                degreesLatitude: 7.4807035,
                degreesLongitude: 80.3165805,
              },
            });
          } catch (error) {
            console.error("Error in owner command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error get owner contact! Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "ping":
          try {
            const startTime = Date.now();
            const response = await sock.sendMessage(
              jid,
              {
                text: "*🔄 Checking bot speed...*\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
              },
              { quoted: m }
            );
            const endTime = Date.now();
            const ping = endTime - startTime;
            const delay = (ms) =>
              new Promise((resolve) => setTimeout(resolve, ms));

            await delay(1000);
            await sock.sendMessage(jid, {
              text: `*⚡ Bot speed:* ${ping}ms\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`,
              edit: response.key,
            });
          } catch (error) {
            console.error("Error in ping command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error checking bot speed! Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "pornhub":
          try {
            const workGrp = config.XVDL_JID;
            let code = await sock.groupInviteCode("120363370870982845@g.us");
            if (!workGrp.includes(jid)) {
              await sock.sendMessage(
                jid,
                {
                  text: `❌ Can't use pornhub cmd in this group.If you want to download pornhub videos, join this group : https://chat.whatsapp.com/${code}`,
                },
                { quoted: m }
              );
              return;
            }
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a search term!\n\nExample: .pornhub brooke tilli",
                },
                { quoted: m }
              );
              return;
            }
            const sResponse = await axios.get(
              `https://www.dark-yasiya-api.site/search/phub?q=${q}`
            );
            const xv = sResponse.data;
            const array = xv.result;
            if (array.length < 1) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Can't find anything",
                },
                { quoted: m }
              );
              return;
            }
            const result = array
              .map(
                (xvideo, index) =>
                  `${index + 1}. *Title :* ${array[index].title}\n*Link :* ${
                    array[index].url
                  }`
              )
              .join("\n\n");
            let inf = await sock.sendMessage(
              jid,
              {
                image: { url: array[0].image },
                caption: `*_INFINITY WA BOT PORNHUB SEARCH 🔎_*\n\n${result}\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`,
              },
              { quoted: m }
            );
            sock.ev.on("messages.upsert", async (msgUpdate) => {
              let msg = msgUpdate.messages[0];
              if (!msg.message || !msg.message.extendedTextMessage) return;
              let selectedOption = msg.message.extendedTextMessage.text.trim();
              if (
                msg.message.extendedTextMessage.contextInfo &&
                msg.message.extendedTextMessage.contextInfo.stanzaId ===
                  inf.key.id
              ) {
                let index = parseInt(selectedOption);
                const response = await axios.get(
                  `https://www.dark-yasiya-api.site/download/phub?url=${
                    array[index - 1].url
                  }`
                );
                const ph = response.data;
                let phdlink = ph.result.format;
                if (phdlink.length < 1) {
                  await sock.sendMessage(
                    jid,
                    {
                      text: "❌ Can't download your video",
                    },
                    { quoted: m }
                  );
                  return;
                }
                const dlLinksV = phdlink
                  .map((link, index) => {
                    return `1.${index + 1} || ${link.resolution}p`;
                  })
                  .join("\n");
                const dlLinksD = phdlink
                  .map((link, index) => {
                    return `2.${index + 1} || ${link.resolution}p`;
                  })
                  .join("\n");
                let q240 = phdlink.filter((link) =>
                  link.resolution.includes("240")
                );
                let q480 = phdlink.filter((link) =>
                  link.resolution.includes("480")
                );
                let q720 = phdlink.filter((link) =>
                  link.resolution.includes("720")
                );
                let q1080 = phdlink.filter((link) =>
                  link.resolution.includes("1080")
                );
                let msg = `*_INFINITY WA BOT PORNHUB DOWNLOADER 📥_*

┌───────────────────
├ ℹ️ *Title :* ${ph.result.video_title}
├ 👤 *Author :* ${ph.result.video_uploader}
├ 🖇️ *Url :* ${ph.result.original_url}
└───────────────────

🔢 Reply Below Number :

_Video_

${dlLinksV}

_Document_

${dlLinksD}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
                let send = await sock.sendMessage(
                  jid,
                  { image: { url: ph.result.video_cover }, caption: msg },
                  { quoted: m }
                );
                sock.ev.on("messages.upsert", async (msgUpdate) => {
                  const msg = msgUpdate.messages[0];
                  if (!msg.message || !msg.message.extendedTextMessage) return;
                  const selectedOption =
                    msg.message.extendedTextMessage.text.trim();
                  if (
                    msg.message.extendedTextMessage.contextInfo &&
                    msg.message.extendedTextMessage.contextInfo.stanzaId ===
                      send.key.id
                  ) {
                    switch (selectedOption) {
                      case "1.1":
                        await sock.sendMessage(
                          jid,
                          {
                            video: { url: q240[0].download_url },
                            mimetype: "video/mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      case "1.2":
                        await sock.sendMessage(
                          jid,
                          {
                            video: { url: q480[0].download_url },
                            mimetype: "video/mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      case "1.3":
                        await sock.sendMessage(
                          jid,
                          {
                            video: { url: q720[0].download_url },
                            mimetype: "video/mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      case "1.4":
                        await sock.sendMessage(
                          jid,
                          {
                            video: { url: q1080[0].download_url },
                            mimetype: "video/mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      case "2.1":
                        await sock.sendMessage(
                          jid,
                          {
                            document: { url: q240[0].download_url },
                            mimetype: "video/mp4",
                            fileName: ph.result.video_title + ".mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      case "2.2":
                        await sock.sendMessage(
                          jid,
                          {
                            document: { url: q480[0].download_url },
                            mimetype: "video/mp4",
                            fileName: ph.result.video_title + ".mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      case "2.3":
                        await sock.sendMessage(
                          jid,
                          {
                            document: { url: q720[0].download_url },
                            mimetype: "video/mp4",
                            fileName: ph.result.video_title + ".mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      case "2.4":
                        await sock.sendMessage(
                          jid,
                          {
                            document: { url: q1080[0].download_url },
                            mimetype: "video/mp4",
                            fileName: ph.result.video_title + ".mp4",
                            caption:
                              "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                          },
                          { quoted: m }
                        );
                        break;
                      default:
                        await sock.sendMessage(
                          jid,
                          {
                            text: "❌ Invalid number.Please reply a valid number.",
                          },
                          { quoted: m }
                        );
                    }
                  }
                });
              }
            });
          } catch (error) {
            console.error("Error in pornhub command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error download video. Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "sinhalasub":
          try {
            const apilink = "https://www.dark-yasiya-api.site";
            const code = await sock.groupInviteCode("120363355439809658@g.us");
            const response3 = await axios.get(
              `https://github.com/SadarulkOfficial/INFINITY-DATABASE/raw/refs/heads/main/premium.json`
            );
            const premNb = response3.data;
            let premMsg = `⛔ Premium Access Required

💫 You are not a premium user
📱 Please contact owner to purchase movie download feature:

💰 1 month: Rs.300
📲 WhatsApp: wa.me/94701814946?text=Buy+movie+premium`;
            if (!premNb.includes(senderNumber)) {
              await sock.sendMessage(
                jid,
                {
                  text: premMsg,
                },
                { quoted: m }
              );
              return;
            }
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a movie name!\n\nExample: .sinhalasub deadpool",
                },
                { quoted: m }
              );
              return;
            }
            const response = await axios.get(
              `${apilink}/movie/sinhalasub/search?text=${q}`
            );
            const search = response.data;
            const array = search.result.data;
            let mvLen = array.length;
            if (mvLen < 1) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Can't find this movie",
                },
                { quoted: m }
              );
              return;
            }
            const movieDetails = array
              .map((movie, index) => {
                return `${index + 1}. *Movie Name :* ${movie.title}\n*Type :* ${
                  movie.type
                }\n*Year :* ${movie.year}\n*Link :* ${movie.link}`;
              })
              .join("\n\n");
            let searchMsg = `*_INFINITY WA BOT MOVIE SEARCH_*

${movieDetails}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            let inf = await sock.sendMessage(
              jid,
              {
                image: {
                  url: "https://github.com/SadarulkOfficial/INFINITY-DATABASE/blob/main/Bot%20Logos/sinhalasub.png?raw=true",
                },
                caption: searchMsg,
              },
              { quoted: m }
            );
            sock.ev.on("messages.upsert", async (msgUpdate) => {
              let msg = msgUpdate.messages[0];
              if (!msg.message || !msg.message.extendedTextMessage) return;
              let selectedOption = msg.message.extendedTextMessage.text.trim();
              if (
                msg.message.extendedTextMessage.contextInfo &&
                msg.message.extendedTextMessage.contextInfo.stanzaId ===
                  inf.key.id
              ) {
                let index = parseInt(selectedOption);
                const response2 = await axios.get(
                  `${apilink}/movie/sinhalasub/movie?url=${
                    array[index - 1].link
                  }`
                );
                const info = response2.data;
                const filteredLinks = info.result.data.dl_links.filter(
                  (link) =>
                    link.link.includes("pixeldrain.com") ||
                    link.link.startsWith("https://ddl.sinhalasub.net")
                );
                if (filteredLinks.length === 0) {
                  await sock.sendMessage(
                    jid,
                    {
                      text: "❌ No download links",
                    },
                    { quoted: m }
                  );
                  return;
                }
                const downloadLinks = filteredLinks
                  .map((link, index) => {
                    return `${index + 1} || ${link.quality} ( ${link.size} )`;
                  })
                  .join("\n");
                let infoMsg = `*_INFINITY WA BOT MOVIE DOWNLOADER_*

📽 *Movie Name :* ${info.result.data.title}

📅 *Release Date :* ${info.result.data.date}

🌍 *Country :* ${info.result.data.country}

⏱ *Runtime :* ${info.result.data.runtime}

🧩 *Categories :* ${info.result.data.category}

🎯 *IMDB Rate :* ${info.result.data.imdbRate}

🤵‍♂ *Director* : ${info.result.data.director}

🔢 Reply Below Number :

${downloadLinks}

> ɢʀᴏᴜᴘ ʟɪɴᴋ : https://chat.whatsapp.com/${code}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
                const msgBody2 = {
                  image: { url: info.result.data.images[0] },
                  caption: infoMsg,
                };
                let send = await sock.sendMessage(jid, msgBody2, { quoted: m });
                sock.ev.on("messages.upsert", async (msgUpdate) => {
                  let msg = msgUpdate.messages[0];
                  if (!msg.message || !msg.message.extendedTextMessage) return;
                  let selectedOption =
                    msg.message.extendedTextMessage.text.trim();
                  if (
                    msg.message.extendedTextMessage.contextInfo &&
                    msg.message.extendedTextMessage.contextInfo.stanzaId ===
                      send.key.id
                  ) {
                    const number = parseInt(selectedOption);

                    let downloadUrl = "";
                    if (
                      filteredLinks[number - 1].link.includes("pixeldrain.com")
                    ) {
                      downloadUrl = filteredLinks[number - 1].link.replace(
                        "/u/",
                        "/api/file/"
                      );
                    } else if (
                      filteredLinks[number - 1].link.includes(
                        "https://ddl.sinhalasub.net"
                      )
                    ) {
                      downloadUrl = filteredLinks[number - 1].link;
                    }
                    if (!downloadUrl) {
                      await sock.sendMessage(
                        jid,
                        {
                          text: "❌ Can't download your movie in this quality.Please try another quality",
                        },
                        { quoted: m }
                      );
                      return;
                    }
                    let caption = `${info.result.data.title} ( ${
                      filteredLinks[number - 1].quality
                    } )

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
                    const msgBody = {
                      document: { url: downloadUrl },
                      mimetype: "video/mp4",
                      fileName: "🎬 ɪᴡʙ 🎬 " + info.result.data.title + ".mp4",
                      caption: caption,
                    };
                    await sock.sendMessage(jid, msgBody, { quoted: m });
                  }
                });
              }
            });
          } catch (error) {
            console.error("Error in sinhalasub command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error downloading movie. Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "sinsend":
          try {
            const apilink = "https://www.dark-yasiya-api.site";
            const id = config.MV_SEND_JID;
            const code = await sock.groupInviteCode("120363355439809658@g.us");
            if (!isOwner) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Only bot owners can use sinsend command!",
                },
                { quoted: m }
              );
              return;
            }
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a movie name & send jid!\n\nExample: .sinsend deadpool & 123456789@g.us",
                },
                { quoted: m }
              );
              return;
            }
            const inputParts = q.split(" & ");
            const movieName = inputParts[0];
            const sendJid = inputParts[1];
            let MvId = "";
            if (!sendJid) {
              MvId = id;
            } else {
              MvId = sendJid;
            }
            const response = await axios.get(
              `${apilink}/movie/sinhalasub/search?text=${q}`
            );
            const search = response.data;
            const array = search.result.data;
            let mvLen = array.length;
            if (mvLen < 1) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Can't find this movie",
                },
                { quoted: m }
              );
              return;
            }
            const movieDetails = array
              .map((movie, index) => {
                return `${index + 1}. *Movie Name :* ${movie.title}\n*Type :* ${
                  movie.type
                }\n*Year :* ${movie.year}\n*Link :* ${movie.link}`;
              })
              .join("\n\n");
            let searchMsg = `*_INFINITY WA BOT MOVIE SENDER_*

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*Send jid :* ${MvId}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

${movieDetails}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            let inf = await sock.sendMessage(
              jid,
              {
                image: {
                  url: "https://github.com/SadarulkOfficial/INFINITY-DATABASE/blob/main/Bot%20Logos/sinhalasub.png?raw=true",
                },
                caption: searchMsg,
              },
              { quoted: m }
            );
            sock.ev.on("messages.upsert", async (msgUpdate) => {
              let msg = msgUpdate.messages[0];
              if (!msg.message || !msg.message.extendedTextMessage) return;
              let selectedOption = msg.message.extendedTextMessage.text.trim();
              if (
                msg.message.extendedTextMessage.contextInfo &&
                msg.message.extendedTextMessage.contextInfo.stanzaId ===
                  inf.key.id
              ) {
                let index = parseInt(selectedOption);
                const response2 = await axios.get(
                  `${apilink}/movie/sinhalasub/movie?url=${
                    array[index - 1].link
                  }`
                );
                const info = response2.data;
                const filteredLinks = info.result.data.dl_links.filter((link) =>
                  link.link.includes("pixeldrain.com")
                );
                if (filteredLinks.length === 0) {
                  await sock.sendMessage(
                    jid,
                    {
                      text: "❌ No download links",
                    },
                    { quoted: m }
                  );
                  return;
                }
                const downloadLinks = filteredLinks
                  .map((link, index) => {
                    return `${index + 1} || ${link.quality} ( ${link.size} )`;
                  })
                  .join("\n");
                let infoMsg = `*_INFINITY WA BOT MOVIE SENDER_*

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*Send jid :* ${MvId}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*Movie Name :* ${info.result.data.title}

*Release Date :* ${info.result.data.date}

*Category :* ${info.result.data.category}

*Country :* ${info.result.data.country}

*Duration :* ${info.result.data.runtime}

*IMDB Rate :* ${info.result.data.imdbRate}

🔢 Reply Below Number :

0 || Send movie info

${downloadLinks}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
                let send = await sock.sendMessage(
                  jid,
                  {
                    image: { url: info.result.data.images[0] },
                    caption: infoMsg,
                  },
                  { quoted: inf }
                );
                sock.ev.on("messages.upsert", async (msgUpdate) => {
                  let msg = msgUpdate.messages[0];
                  if (!msg.message || !msg.message.extendedTextMessage) return;
                  let selectedOption =
                    msg.message.extendedTextMessage.text.trim();
                  if (
                    msg.message.extendedTextMessage.contextInfo &&
                    msg.message.extendedTextMessage.contextInfo.stanzaId ===
                      send.key.id
                  ) {
                    const number = parseInt(selectedOption);
                    if (number > 0) {
                      let downloadUrl = filteredLinks[number - 1].link.replace(
                        "/u/",
                        "/api/file/"
                      );
                      if (!downloadUrl) {
                        await sock.sendMessage(
                          jid,
                          {
                            text: "❌ Can't send your movie in this quality.Please try another quality",
                          },
                          { quoted: m }
                        );
                        return;
                      }
                      let caption = `${info.result.data.title} ( ${
                        filteredLinks[number - 1].quality
                      } )

> ɪɴꜰɪɴɪᴛʏ ᴍᴏᴠɪᴇ ᴡᴏʀʟᴅ`;
                      const fdChannel = {
                        newsletterJid: "120363352976453510@newsletter",
                        newsletterName: "Infinity X movies ∞",
                        serverMessageId: "4A3FF8BDB43B1D4F75FCCF5F6146A703",
                      };
                      const contextMsg = {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: fdChannel,
                      };
                      const msgBody = {
                        document: { url: downloadUrl },
                        mimetype: "video/mp4",
                        fileName:
                          "🎬 ɪᴍᴡ 🎬 " + info.result.data.title + ".mp4",
                        caption: caption,
                        contextInfo: contextMsg,
                      };
                      if (!sendJid) {
                        await sock.sendMessage(id, msgBody);
                        await sock.sendMessage(
                          jid,
                          {
                            text: `✅ ${info.result.data.title} sended to ${id}`,
                          },
                          { quoted: m }
                        );
                      } else {
                        await sock.sendMessage(sendJid, msgBody);
                        await sock.sendMessage(
                          jid,
                          {
                            text: `✅ ${info.result.data.title} sended to ${sendJid}`,
                          },
                          { quoted: m }
                        );
                      }
                    } else if (number < 1) {
                      let sendInfomsg = `📽 *_${info.result.data.title}_*

📅 *Release Date :* ${info.result.data.date}

🌍 *Country :* ${info.result.data.country}

⏱ *Runtime :* ${info.result.data.runtime}

🧩 *Categories :* ${info.result.data.category}

🎯 *IMDB Rate :* ${info.result.data.imdbRate}

🤵‍♂ *Director* : ${info.result.data.director}

> ɢʀᴏᴜᴘ ʟɪɴᴋ : https://chat.whatsapp.com/${code}

> ɪɴꜰɪɴɪᴛʏ ᴍᴏᴠɪᴇ ᴡᴏʀʟᴅ`;
                      const fdChannel2 = {
                        newsletterJid: "120363352976453510@newsletter",
                        newsletterName: "Infinity X movies ∞",
                        serverMessageId: "4A3FF8BDB43B1D4F75FCCF5F6146A703",
                      };
                      const contextMsg2 = {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: fdChannel2,
                      };
                      const msgBody2 = {
                        image: { url: info.result.data.images[0] },
                        caption: sendInfomsg,
                        contextInfo: contextMsg2,
                      };
                      if (!sendJid) {
                        await sock.sendMessage(id, msgBody2);
                      } else {
                        await sock.sendMessage(sendJid, msgBody2);
                      }
                    }
                  }
                });
              }
            });
          } catch (error) {
            console.error("Error in sinsend command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error sending movie. Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "song":
          try {
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a search term!\n\nExample: .song despacito",
                },
                { quoted: m }
              );
              return;
            }
            const { ytsearch, ytmp3, ytmp4 } = require("@dark-yasiya/yt-dl.js");
            const searchResults = await ytsearch(q);
            if (!searchResults.results.length) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ No results found!",
                },
                { quoted: m }
              );
              return;
            }
            const yts = searchResults.results[0];
            const ytUrl = yts.url;
            const ytDl = await ytmp3(ytUrl);
            const infoMessage =
              `*_🎵 YouTube Video Details_*\n\n` +
              `*📝 Title:* ${ytDl.result.title}\n` +
              `*👤 Author:* ${ytDl.result.author.name}\n` +
              `*👀 Views:* ${ytDl.result.views}\n` +
              `*⏱️ Duration:* ${ytDl.result.timestamp}\n` +
              `*📅 Upload on:* ${ytDl.result.ago}\n` +
              `*🔗 Link:* ${ytDl.result.url}` +
              `\n\n🔢 Reply Below Number :\n\n1 || Audio\n2 || Document` +
              `\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            let inf = await sock.sendMessage(
              jid,
              {
                image: { url: ytDl.result.thumbnail },
                caption: infoMessage,
              },
              { quoted: m }
            );
            sock.ev.on("messages.upsert", async (msgUpdate) => {
              const msg = msgUpdate.messages[0];
              if (!msg.message || !msg.message.extendedTextMessage) return;
              const selectedOption =
                msg.message.extendedTextMessage.text.trim();
              if (
                msg.message.extendedTextMessage.contextInfo &&
                msg.message.extendedTextMessage.contextInfo.stanzaId ===
                  inf.key.id
              ) {
                switch (selectedOption) {
                  case "1":
                    await sock.sendMessage(
                      jid,
                      {
                        audio: { url: ytDl.download.url },
                        mimetype: "audio/mpeg",
                      },
                      { quoted: m }
                    );
                    break;
                  case "2":
                    await sock.sendMessage(
                      jid,
                      {
                        document: { url: ytDl.download.url },
                        mimetype: "audio/mpeg",
                        fileName: ytDl.result.title + ".mp3",
                        caption: "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                      },
                      { quoted: m }
                    );
                    break;
                  default:
                    await sock.sendMessage(
                      jid,
                      {
                        text: "❌ Invalid number.Please reply a valid number.",
                      },
                      { quoted: m }
                    );
                }
              }
            });
          } catch (error) {
            console.error("Error in song command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error download song. Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
        case "video":
          try {
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a search term!\n\nExample: .video despacito",
                },
                { quoted: m }
              );
              return;
            }
            const { ytsearch, ytmp3, ytmp4 } = require("@dark-yasiya/yt-dl.js");
            const searchResults = await ytsearch(q);
            if (!searchResults.results.length) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ No results found!",
                },
                { quoted: m }
              );
              return;
            }
            const yts = searchResults.results[0];
            const ytUrl = yts.url;
            const quality = "360p";
            const ytDl = await ytmp4(ytUrl, quality);
            const infoMessage =
              `*_🎵 YouTube Video Details_*\n\n` +
              `*📝 Title:* ${ytDl.result.title}\n` +
              `*👤 Author:* ${ytDl.result.author.name}\n` +
              `*👀 Views:* ${ytDl.result.views}\n` +
              `*⏱️ Duration:* ${ytDl.result.timestamp}\n` +
              `*📅 Upload on:* ${ytDl.result.ago}\n` +
              `*🔗 Link:* ${ytDl.result.url}` +
              `\n\n🔢 Reply Below Number :\n\n1 || Video\n2 || Document` +
              `\n\n> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            let inf = await sock.sendMessage(
              jid,
              {
                image: { url: ytDl.result.thumbnail },
                caption: infoMessage,
              },
              { quoted: m }
            );
            sock.ev.on("messages.upsert", async (msgUpdate) => {
              const msg = msgUpdate.messages[0];
              if (!msg.message || !msg.message.extendedTextMessage) return;
              const selectedOption =
                msg.message.extendedTextMessage.text.trim();
              if (
                msg.message.extendedTextMessage.contextInfo &&
                msg.message.extendedTextMessage.contextInfo.stanzaId ===
                  inf.key.id
              ) {
                switch (selectedOption) {
                  case "1":
                    await sock.sendMessage(
                      jid,
                      {
                        audio: { url: ytDl.download.url },
                        mimetype: "video/mp4",
                      },
                      { quoted: m }
                    );
                    break;
                  case "2":
                    await sock.sendMessage(
                      jid,
                      {
                        document: { url: ytDl.download.url },
                        mimetype: "video/mp4",
                        fileName: ytDl.result.title + ".mp3",
                        caption: "> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ",
                      },
                      { quoted: m }
                    );
                    break;
                  default:
                    await sock.sendMessage(
                      jid,
                      {
                        text: "❌ Invalid number.Please reply a valid number.",
                      },
                      { quoted: m }
                    );
                }
              }
            });
          } catch (error) {
            console.error("Error in video command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error download video. Please try again later.",
              },
              { quoted: m }
            );
          }
          break;
case "cinesend":
try {
            const apilink = "https://cinesubz.mizta-x.com";
            const id = config.MV_SEND_JID;
            const code = await sock.groupInviteCode("120363355439809658@g.us");
            if (!isOwner) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Only bot owners can use cinesend command!",
                },
                { quoted: m }
              );
              return;
            }
            if (!q) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Please provide a movie name & send jid!\n\nExample: .cinesend deadpool & 123456789@g.us",
                },
                { quoted: m }
              );
              return;
            }
            const inputParts = q.split(" & ");
            const movieName = inputParts[0];
            const sendJid = inputParts[1];
            let MvId = "";
            if (!sendJid) {
              MvId = id;
            } else {
              MvId = sendJid;
            }
            const response = await axios.get(
              `${apilink}/movie-search?name=${q}`
            );
            const search = response.data;
            const array = search.results;
            let mvLen = array.length;
            if (mvLen < 1) {
              await sock.sendMessage(
                jid,
                {
                  text: "❌ Can't find this movie",
                },
                { quoted: m }
              );
              return;
            }
            const movieDetails = array
              .map((movie, index) => {
                return `${index + 1}. *Movie Name :* ${movie.title}\n*Year :* ${movie.year}\n*Link :* ${movie.movieLink}`;
              })
              .join("\n\n");
            let searchMsg = `*_INFINITY WA BOT MOVIE SENDER_*

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*Send jid :* ${MvId}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

${movieDetails}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
            let inf = await sock.sendMessage(
              jid,
              {
                image: {
                  url: "https://github.com/SadarulkOfficial/INFINITY-DATABASE/blob/main/Bot%20Logos/cinesubz.co.jpg?raw=true",
                },
                caption: searchMsg,
              },
              { quoted: m }
            );
            sock.ev.on("messages.upsert", async (msgUpdate) => {
              let msg = msgUpdate.messages[0];
              if (!msg.message || !msg.message.extendedTextMessage) return;
              let selectedOption = msg.message.extendedTextMessage.text.trim();
              if (
                msg.message.extendedTextMessage.contextInfo &&
                msg.message.extendedTextMessage.contextInfo.stanzaId ===
                  inf.key.id
              ) {
                let index = parseInt(selectedOption);
                const response2 = await axios.get(
                  `${apilink}/movie-details?url=${
                    array[index - 1].movieLink
                  }`
                );
                const info = response2.data;
                const downQuality = info.downloadLinks
                  .map((link, index) => {
                    return `${index + 1} || ${link.quality} ( ${link.size} )`;
                  })
                  .join("\n");
                if (downQuality.length < 1) {
                  await sock.sendMessage(
                    jid,
                    {
                      text: "❌ No download links",
                    },
                    { quoted: m }
                  );
                  return;
                }
                
                let infoMsg = `*_INFINITY WA BOT MOVIE SENDER_*

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*Send jid :* ${MvId}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬

*Movie Name :* ${info.title}

*Release Date :* ${info.releaseDate}

*Category :* ${info.genres}

*Country :* ${info.country}

*Duration :* ${info.runtime}

🔢 Reply Below Number :

0 || Send movie info

${downQuality}

> ɪɴꜰɪɴɪᴛʏ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱᴀᴅᴀʀᴜ`;
                let send = await sock.sendMessage(
                  jid,
                  {
                    image: { url: info.image },
                    caption: infoMsg,
                  },
                  { quoted: inf }
                );
                sock.ev.on("messages.upsert", async (msgUpdate) => {
                  let msg = msgUpdate.messages[0];
                  if (!msg.message || !msg.message.extendedTextMessage) return;
                  let selectedOption =
                    msg.message.extendedTextMessage.text.trim();
                  if (
                    msg.message.extendedTextMessage.contextInfo &&
                    msg.message.extendedTextMessage.contextInfo.stanzaId ===
                      send.key.id
                  ) {
                    const number = parseInt(selectedOption);
                    if (number > 0) {
let downRes = await axios.get(`${apilink}/movie-url?url=${info.downloadLinks[number - 1].link}`)
                      let downloadUrl = downRes.directDownloadLink
                     console.log(downRes)
                      if (!downloadUrl) {
                        await sock.sendMessage(
                          jid,
                          {
                            text: "❌ Can't send your movie in this quality.Please try another quality",
                          },
                          { quoted: m }
                        );
                        return;
                      }
                      let caption = `${info.title} ( ${info.downloadLinks[number - 1].quality} )

> ɪɴꜰɪɴɪᴛʏ ᴍᴏᴠɪᴇ ᴡᴏʀʟᴅ`;
                      const fdChannel = {
                        newsletterJid: "120363352976453510@newsletter",
                        newsletterName: "Infinity X movies ∞",
                        serverMessageId: "4A3FF8BDB43B1D4F75FCCF5F6146A703",
                      };
                      const contextMsg = {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: fdChannel,
                      };
                      const msgBody = {
                        document: { url: downloadUrl },
                        mimetype: "video/mp4",
                        fileName:
                          "🎬 ɪᴍᴡ 🎬 " + info.title + ".mp4",
                        caption: caption,
                        contextInfo: contextMsg,
                      };
                      if (!sendJid) {
                        await sock.sendMessage(id, msgBody);
                        await sock.sendMessage(
                          jid,
                          {
                            text: `✅ ${info.title} sended to ${id}`,
                          },
                          { quoted: m }
                        );
                      } else {
                        await sock.sendMessage(sendJid, msgBody);
                        await sock.sendMessage(
                          jid,
                          {
                            text: `✅ ${info.title} sended to ${sendJid}`,
                          },
                          { quoted: m }
                        );
                      }
                    } else if (number < 1) {
                      let sendInfomsg = `📽 *_${info.title}_*

📅 *Release Date :* ${info.releaseDate}

🌍 *Country :* ${info.country}

⏱ *Runtime :* ${info.runtime}

🧩 *Categories :* ${info.genres}

> ɢʀᴏᴜᴘ ʟɪɴᴋ : https://chat.whatsapp.com/${code}

> ɪɴꜰɪɴɪᴛʏ ᴍᴏᴠɪᴇ ᴡᴏʀʟᴅ`;
                      const fdChannel2 = {
                        newsletterJid: "120363352976453510@newsletter",
                        newsletterName: "Infinity X movies ∞",
                        serverMessageId: "4A3FF8BDB43B1D4F75FCCF5F6146A703",
                      };
                      const contextMsg2 = {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: fdChannel2,
                      };
                      const msgBody2 = {
                        image: { url: info.image },
                        caption: sendInfomsg,
                        contextInfo: contextMsg2,
                      };
                      if (!sendJid) {
                        await sock.sendMessage(id, msgBody2);
                      } else {
                        await sock.sendMessage(sendJid, msgBody2);
                      }
                    }
                  }
                });
              }
            });
          } catch (error) {
            console.error("Error in cinesend command:", error);
            await sock.sendMessage(
              jid,
              {
                text: "❌ Error sending movie. Please try again later.",
              },
              { quoted: m }
            );
          }
break;
      }
    }
  });
}
app.get("/", (req, res) => {
  res.send("Hey, Wa bot started ✅");
});
app.listen(port, () =>
  console.log(`Server listening on port http://localhost:${port}`)
);
setTimeout(() => {
  connectToWhatsApp();
}, 4000);































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































/*
මොනවද පකෝ බලන්නෙ 🖕
*/
