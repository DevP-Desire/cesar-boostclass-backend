import dotenv from "dotenv";
dotenv.config();
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import crypto from "crypto";
import bodyParser from "body-parser";
// import { ConfidentialClientApplication } from "@azure/msal-node";
import { oboToken, requireAuth } from "./middlewares/middleware.js";
import {
  analyzeTextWithOpenAI,
  analyzeContentOpenAI,
  generatePronunciationChallenge,
  generateCoachingSpace,
  parseCoachingSpaceMarkdown,
  Vocabulary_Booster,
  generateMCQs,
  upsertAssessment,
  getAssessment,
  listAssessmentsForMeeting,
  listAssessmentsForUser,
  getOrganizationPrompts,
  generateDashboardSummary,
} from "./controllers/controller.js";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";
import { defaultSystemPromts } from "./controllers/custom_prompt.js";
import { QueueClient } from "@azure/storage-queue";
// import { generateReportPdf } from "./controllers/generatePdf.js";

const queueClient = new QueueClient(
  process.env.AZURE_BLOB_CONNECTION_STRING,
  process.env.AZURE_QUEUE_NAME,
);

const ZOOM_WEBHOOK_SECRET = process.env.ZOOM_WEBHOOK_SECRET;

const upload = multer();

const app = express();

// Parse raw body for webhook verification
app.use("/api/getZoomRecording", bodyParser.raw({ type: "*/*" }));

app.get("/api/getZoomRecording", (req, res) => {
  res.send("Zoom webhook endpoint is running");
});

// Resolve org by host email
async function getOrganizationByHostEmail(hostEmail) {
  if (!hostEmail) return "unknown_org";
  const safeEmail = hostEmail.toLowerCase().replace(/'/g, "''");
  const entities = tableClient.listEntities({
    queryOptions: { filter: `email eq '${safeEmail}'` },
  });
  for await (const entity of entities) {
    return entity.organization || "unknown_org";
  }
  return "unknown_org";
}

// zoom webhook callback
app.post("/api/getZoomRecording", async (req, res) => {
  console.log("Recieve zoom webhook notification");

  const signature = req.headers["x-zm-signature"];
  const timestamp = req.headers["x-zm-request-timestamp"];

  // 🔒 Verify Zoom signature
  const message = `v0:${timestamp}:${req.body.toString()}`;
  const hash = crypto
    .createHmac("sha256", ZOOM_WEBHOOK_SECRET)
    .update(message)
    .digest("hex");

  const expectedSignature = `v0=${hash}`;

  if (signature !== expectedSignature) {
    console.error("❌ Invalid Zoom webhook signature");
    return res.status(401).send("Unauthorized");
  }

  const body = JSON.parse(req.body.toString());

  // 🧪 URL validation (required once)
  if (body.event === "endpoint.url_validation") {
    const hashForValidation = crypto
      .createHmac("sha256", ZOOM_WEBHOOK_SECRET)
      .update(body.payload.plainToken)
      .digest("hex");

    return res.json({
      plainToken: body.payload.plainToken,
      encryptedToken: hashForValidation,
    });
  }

  // // 🎯 Recording transcript completed event
  // if (body.event === "recording.transcript_completed") {
  //   const meeting = body.payload.object;

  //   console.log("✅ Recording ready!");
  //   console.log("body:", JSON.stringify(body, null, 2));
  //   console.log("data:", JSON.stringify(body.payload, null, 2));
  //   console.log("object data:", JSON.stringify(meeting, null, 2));
  //   console.log("Meeting ID:", meeting.id);
  //   console.log("Topic:", meeting.topic);

  //   meeting.recording_files.forEach((file) => {
  //     console.log("File:", file.file_type, file.download_url);
  //   });

  //   // 👉 TODO:
  //   // - Save metadata to DB
  //   // - Download files async
  //   // - Trigger background job
  // }

  if (body.event === "recording.transcript_completed") {
    // respond immediately (Zoom expects fast response)
    res.sendStatus(200);

    (async () => {
      try {
        const meeting = body.payload.object;
        const organization = await getOrganizationByHostEmail(
          meeting.host_email,
        );

        // Fetch org entity to check autoReportEnabled
        let orgEntity;
        try {
          orgEntity = await tableTokens.getEntity("token", organization);
        } catch {
          orgEntity = {};
        }
        // Only proceed if autoReportEnabled is true
        if (!orgEntity.autoReportEnabled) {
          console.log(`Auto-report disabled for org: ${organization}`);
          return; // Do NOT enqueue job
        }

        const files = meeting.recording_files || [];
        for (const file of files) {
          const isVtt =
            (file.file_type || "").toLowerCase() === "transcript" ||
            (file.file_extension || "").toLowerCase() === "vtt" ||
            (file.recording_type || "").toLowerCase() === "audio_transcript";

          if (!isVtt || !file.download_url) continue;

          const job = {
            meetingId: meeting.id,
            transcriptId: file.id,
            transcriptUrl: file.download_url,
            hostEmail: meeting.host_email || "",
            organization,
            download_token: body.download_token || "",
            meetingName: meeting.topic || "",
            meetingTime: meeting.start_time || file.recording_start || Date.now(),
            meetingDuration: meeting.duration || 0,
            // receivedAt: Date.now(),
          };

          const msg = Buffer.from(JSON.stringify(job)).toString("base64");
          await queueClient.sendMessage(msg);
        }

        console.log("✅ Transcript jobs enqueued");
      } catch (err) {
        console.error("Queue enqueue error:", err);
      }
    })();

    return;
  }

  res.sendStatus(200);
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
// app.use(express.json());
app.use(express.json({ limit: "100mb" }));

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, methods: ["GET", "POST"] },
});
// io.use((socket, next) => {
//   const { account } = socket.handshake.auth;
//   if (!account) {
//     return next(new Error("Not authenticated"));
//   }
//   socket.account = account;
//   next();
// });
io.on("connect", (socket) => {
  console.log("⚡ React connected via WebSocket");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// const applicationToken = await getAppToken(process.env.AZURE_TENANT_ID);
// console.log("App Token at start:", applicationToken);

const tableClient = new TableClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
  "Users",
  new AzureNamedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT,
    process.env.AZURE_STORAGE_KEY,
  ),
);

const tableTokens = new TableClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
  "Tokens",
  new AzureNamedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT,
    process.env.AZURE_STORAGE_KEY,
  ),
);

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_BLOB_CONNECTION_STRING,
);
const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_CONTAINER_NAME,
);

let zoomRecordingsCache = {};
let teamsRecordingsCache = {};
let zoomTranscriptCache = {};
let teamsTranscriptCache = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache

const JWT_SECRET = process.env.JWT_SECRET;

app.post("/api/register", async (req, res) => {
  const {
    name,
    role,
    email,
    password,
    organization,
    orgImg,
    zoomUsername,
    teamsUsername,
  } = req.body;
  if (!name || !role || !email || !password || !organization)
    return res.status(400).send("Missing fields");
  try {
    // Check if user with email already exists
    const existing = [];
    for await (const entity of tableClient.listEntities({
      queryOptions: {
        filter: `email eq '${email.toLowerCase()}'`,
      },
    })) {
      existing.push(entity);
    }
    if (existing.length > 0) {
      return res.status(409).send("User exists");
    }

    // Resolve org image from Tokens table if not provided
    let resolvedOrgImg = orgImg || "";
    if (!resolvedOrgImg) {
      try {
        const orgEntity = await tableTokens.getEntity("token", organization);
        resolvedOrgImg = orgEntity?.imageUrl || "";
      } catch {
        resolvedOrgImg = "";
      }
    }

    const userId = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    await tableClient.createEntity({
      partitionKey: "USER",
      rowKey: userId,
      name: name,
      email: email.toLowerCase(),
      role: role,
      password: hash,
      organization: organization,
      orgImg: resolvedOrgImg,
      zoomUsername: zoomUsername || "",
      teamsUsername: teamsUsername || "",
      orgAdminEnabled: "false",
    });
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send("Registration failed");
  }
});

app.post("/api/users/bulk-upload", async (req, res) => {
  const { users, organization, orgImg } = req.body;
  if (!Array.isArray(users) || !organization) {
    return res.status(400).json({ error: "Missing users or organization" });
  }

  // Resolve org image from Tokens table if not provided
  let resolvedOrgImg = orgImg || "";
  if (!resolvedOrgImg) {
    try {
      const orgEntity = await tableTokens.getEntity("token", organization);
      resolvedOrgImg = orgEntity?.imageUrl || "";
    } catch {
      resolvedOrgImg = "";
    }
  }

  // Setup mail transporter once for performance
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.OUTLOOK_EMAIL,
      pass: process.env.OUTLOOK_PASSWORD,
    },
  });

  const results = [];
  for (const user of users) {
    const { name, email, password, role = "student" } = user;
    if (!name || !email || !password) {
      results.push({
        email,
        success: false,
        error: "Missing required fields (name, email, password)",
      });
      continue;
    }
    try {
      // Check if user already exists
      const existing = [];
      for await (const entity of tableClient.listEntities({
        queryOptions: { filter: `email eq '${email.toLowerCase()}'` },
      })) {
        existing.push(entity);
      }
      if (existing.length > 0) {
        results.push({
          email,
          success: false,
          error: "User already exists",
        });
        continue;
      }
      const userId = uuidv4();
      const hash = await bcrypt.hash(password, 10);
      await tableClient.createEntity({
        partitionKey: "USER",
        rowKey: userId,
        name: name,
        email: email.toLowerCase(),
        role: role,
        password: hash,
        organization: organization,
        orgImg: resolvedOrgImg,
        zoomUsername: user.zoomUsername || "",
        teamsUsername: user.teamsUsername || "",
        orgAdminEnabled: "false",
      });

      // Send welcome mail
      try {
        await transporter.sendMail({
          from: '"BoostClass" <Info@go-teach.ai>',
          to: email,
          subject: "Welcome to BoostClass AI!",
          html: `
            <p>Welcome <b>${name}</b>! Your account has been created.</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Role:</b> ${role}</p>
            <p>Best regards,<br/>BoostClass AI</p>
          `,
        });
        results.push({ email, success: true });
      } catch (mailErr) {
        results.push({ email, success: true, mailError: mailErr.message });
      }
    } catch (err) {
      results.push({ email, success: false, error: err.message });
    }
  }
  res.json({ results });
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Missing fields");
  try {
    // const user = await tableClient.getEntity("user", email);
    // const user = tableClient.listEntities({
    //   queryOptions: { filter: `email eq '${email}'` }
    // });
    const entities = tableClient.listEntities({
      queryOptions: { filter: `email eq '${email?.toLowerCase()}'` },
    });
    let user = null;
    for await (const entity of entities) {
      user = entity;
      break;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send("Invalid credentials");
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "5h" });
    res.json({
      token,
      connectionsString: user.connections,
      role: user.role,
      organization: user.organization,
      orgImg: user.orgImg,
      orgAdminEnabled: user.orgAdminEnabled || "false",
    });
  } catch (err) {
    res.status(401).send("Invalid credentials");
  }
});

app.post("/api/refreshConnections", async (req, res) => {
  const { data, email } = req.body;
  if (!data || !email) return res.status(400).send("Missing fields");
  try {
    // First query to find the user by email
    const entities = tableClient.listEntities({
      queryOptions: { filter: `email eq '${email.replace(/'/g, "''")}'` },
    });

    // Get the first matching user
    let user = null;
    for await (const entity of entities) {
      user = entity;
      break;
    }

    if (!user) {
      return res.status(404).send("User not found");
    }

    // const dataToHash = typeof data === 'string' ? data : JSON.stringify(data)
    // const hash = await bcrypt.hash(data, 10);
    // console.log("Updating connections for user:", user);
    // console.log("New hashed connections:", hash);
    await tableClient.updateEntity(
      {
        partitionKey: user.partitionKey,
        rowKey: user.rowKey,
        connections: data,
      },
      "Merge",
      { etag: user.etag ?? "*" },
    );
    res.status(200).json({
      role: user.role,
      organization: user.organization,
      orgImg: user.orgImg,
      orgAdminEnabled: user.orgAdminEnabled || "false",
    });
  } catch (err) {
    if (err.statusCode === 409) return res.status(409).send("User exists");
    res.status(500).send("Failed to update connections");
  }
});

app.get("/api/users", async (req, res) => {
  const { org } = req.query;
  try {
    const users = [];
    const entities = tableClient.listEntities({
      queryOptions: { filter: `organization eq '${org}'` },
    });
    for await (const entity of entities) {
      users.push({
        id: entity.rowKey,
        email: entity.email,
        name: entity.name,
        role: entity.role,
        token: entity.token,
        orgAdminEnabled: entity.orgAdminEnabled || "false",
        zoomUsername: entity.zoomUsername || "",
        teamsUsername: entity.teamsUsername || "",
      });
    }
    res.json(users);
  } catch {
    res.status(500).send("Failed to fetch users");
  }
});

app.get("/api/users/:email", async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) return res.status(400).send("Missing email");
    const safeEmail = email.replace(/'/g, "''");
    const entities = tableClient.listEntities({
      queryOptions: { filter: `email eq '${safeEmail}'` },
    });
    for await (const entity of entities) {
      return res.json([
        {
          id: entity.rowKey,
          email: entity.email,
          name: entity.name,
          role: entity.role,
          connections: entity.connections,
          zoomUsername: entity.zoomUsername || "",
          teamsUsername: entity.teamsUsername || "",
        },
      ]);
    }
    return res.status(404).send("User not found");
  } catch {
    res.status(500).send("Failed to fetch users");
  }
});

app.delete("/api/users/delete", async (req, res) => {
  try {
    const email = req.body.email;
    if (!email) return res.status(400).send("Missing email");

    // Sanitize email to prevent injection
    const safeEmail = email.toLowerCase().replace(/'/g, "''");

    // Find the user by email
    const entities = tableClient.listEntities({
      queryOptions: { filter: `email eq '${safeEmail}'` },
    });

    let user = null;
    for await (const entity of entities) {
      user = entity;
      break;
    }

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Delete the user
    await tableClient.deleteEntity(user.partitionKey, user.rowKey);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      email: user.email,
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send("Failed to delete user");
  }
});

app.put("/api/users/update", async (req, res) => {
  try {
    const { email, name, role, password, zoomUsername, teamsUsername } =
      req.body;

    if (!email) return res.status(400).send("Missing email");

    // Sanitize email to prevent injection
    const safeEmail = email.toLowerCase().replace(/'/g, "''");

    // Find the user by email
    const entities = tableClient.listEntities({
      queryOptions: { filter: `email eq '${safeEmail}'` },
    });

    let user = null;
    for await (const entity of entities) {
      user = entity;
      break;
    }

    if (!user) {
      return res.status(404).send("User not found");
    }

    // If a new platform username is being set, clear that username from any other user
    // to keep platform usernames unique across users (case-sensitive exact match).
    const cleanupIfDuplicate = async (fieldName, newValue) => {
      if (newValue === undefined || newValue === null) return;
      const newTrim = String(newValue).trim();
      if (!newTrim) return;

      // Prefer limiting the scan to the same organization to reduce load
      const orgFilter = (user.organization || "")
        .toString()
        .replace(/'/g, "''");

      const listOptions = orgFilter
        ? { queryOptions: { filter: `organization eq '${orgFilter}'` } }
        : undefined;

      // Iterate users in the same org (falls back to full scan if org not present)
      for await (const other of tableClient.listEntities(listOptions)) {
        const otherVal = (other[fieldName] || "").toString().trim();
        const otherEmail = (other.email || "").toString().toLowerCase();
        // exact (case-sensitive) comparison of usernames, ensure we don't touch the target user's own record
        if (otherVal && otherVal === newTrim && otherEmail !== safeEmail) {
          try {
            await tableClient.updateEntity(
              {
                partitionKey: other.partitionKey,
                rowKey: other.rowKey,
                [fieldName]: "",
              },
              "Merge",
              { etag: other.etag ?? "*" },
            );
          } catch (e) {
            console.warn(
              `Failed to clear ${fieldName} for ${otherEmail}:`,
              e.message || e,
            );
          }
        }
      }
    };

    // Cleanup duplicates only for the platform fields that are actually being updated
    if (zoomUsername !== undefined && zoomUsername !== null) {
      await cleanupIfDuplicate("zoomUsername", zoomUsername);
    }
    if (teamsUsername !== undefined && teamsUsername !== null) {
      await cleanupIfDuplicate("teamsUsername", teamsUsername);
    }

    // Prepare update object with only fields that are provided
    const updateEntity = {
      partitionKey: user.partitionKey,
      rowKey: user.rowKey,
    };

    // Only include fields that are provided and allowed to be updated
    if (name) updateEntity.name = name;
    if (role) updateEntity.role = role;
    if (zoomUsername !== undefined) updateEntity.zoomUsername = zoomUsername;
    if (teamsUsername !== undefined) updateEntity.teamsUsername = teamsUsername;
    if (password) {
      // hash new password before storing
      const hash = await bcrypt.hash(password, 10);
      updateEntity.password = hash;
    }

    // Update the user
    await tableClient.updateEntity(updateEntity, "Merge", {
      etag: user.etag ?? "*",
    });

    if (role) {
      io.emit("userRoleChanged", { email, role });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      email: user.email,
    });
  } catch (err) {
    console.error("Error updating user:", err);

    if (err.statusCode === 409) {
      return res.status(409).send("Conflict: Entity may have been modified");
    }

    res.status(500).send("Failed to update user");
  }
});

app.get("/api/user/:email", oboToken, async (req, res) => {
  const { email } = req.params;
  try {
    const user = await fetch(
      `https://graph.microsoft.com/v1.0/users/${email}`,
      {
        headers: {
          Authorization: `Bearer ${req.graphToken}`,
        },
      },
    );

    const userInfo = await user.json();
    // console.log("userInfo at start", userInfo);

    res.status(200).send(userInfo);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to fetch user");
  }
});

app.get("/api/recordings", oboToken, async (req, res) => {
  const userEmail = req.headers["x-user-email"];
  const nocache = req.query.nocache === "true";
  if (!userEmail) return res.status(401).send("Missing user email");

  if (
    !nocache &&
    teamsRecordingsCache[userEmail] &&
    Date.now() - teamsRecordingsCache[userEmail].timestamp < CACHE_TTL
  ) {
    return res.json(teamsRecordingsCache[userEmail].data);
  }

  try {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 4);
    const fromDate = oneMonthAgo.toISOString();

    // Use $filter for start/dateTime greater than fromDate
    let url = `https://graph.microsoft.com/v1.0/me/events?$top=50&$filter=start/dateTime ge '${fromDate}'`;

    // const now = new Date();
    // const startOfMonth = new Date(
    //   now.getFullYear(),
    //   now.getMonth() - 2,
    //   now.getDate()
    // );
    // const startDate = startOfMonth.toISOString();
    // const endDate = now.toISOString();

    // let url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$top=100`;

    // let url = `https://graph.microsoft.com/v1.0/me/events?$top=50`;
    let events = [];

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${req.graphToken}` },
      });

      if (!response.ok) {
        throw new Error(
          `Graph API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      events = events.concat(data.value);
      url = data["@odata.nextLink"];
    }

    if (!events || events.length === 0) {
      return res.status(404).send("No meetings found");
    }

    const filteredEvents = events?.filter(
      (event) => event.isOnlineMeeting === true,
    );

    if (!filteredEvents || filteredEvents.length === 0) {
      return res.status(404).send("No online meetings found");
    }

    const meetingJoinUrls = filteredEvents?.map(
      (event) => event.onlineMeeting.joinUrl,
    );

    const allMeetings = (
      await Promise.all(
        meetingJoinUrls?.map(async (url) => {
          // const encodedUrl = encodeURIComponent(url);
          const res = await fetch(
            `https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=JoinWebUrl eq '${url}'`,
            {
              headers: { Authorization: `Bearer ${req.graphToken}` },
            },
          );
          const data = await res.json();
          return data.value?.[0];
        }),
      )
    ).filter(Boolean);

    let transcripts;
    if (allMeetings.length > 0) {
      const transcriptPromises = allMeetings.map(async (meeting) => {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meeting.id}/transcripts`,
          { headers: { Authorization: `Bearer ${req.graphToken}` } },
        );

        const transcriptData = await res.json();
        const items = transcriptData.value || [];

        if (items.length === 0) return null;

        return items.map((t) => ({
          ...t,
          meetingName: meeting.subject,
          participants: meeting.participants,
        }));
      });

      const results = await Promise.all(transcriptPromises);

      transcripts = results.filter(Boolean).flat();
    }

    teamsRecordingsCache[userEmail] = {
      timestamp: Date.now(),
      data: transcripts,
    };

    res.json(transcripts);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to fetch meetings");
  }
});

app.post("/api/teamsrecordingdata", oboToken, async (req, res) => {
  const userEmail = req.headers["x-user-email"];
  const { recording } = req.body;
  const recordingId = recording.recordingId;

  if (!userEmail) return res.status(401).send("Missing user email");

  teamsTranscriptCache[userEmail] = teamsTranscriptCache[userEmail] || {};
  if (
    recordingId &&
    teamsTranscriptCache[userEmail][recordingId] &&
    Date.now() - teamsTranscriptCache[userEmail][recordingId].timestamp <
      CACHE_TTL
  ) {
    return res.send(teamsTranscriptCache[userEmail][recordingId].data);
  }

  const transcriptList = {
    transcript: {},
    // timeline: {},
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${recording.id}/transcripts/${recording.recordingId}/content?$format=text/vtt`,
    { headers: { Authorization: `Bearer ${req.graphToken}` } },
  );
  const text = await response.text();
  transcriptList.transcript = {
    id: recording.recordingId,
    recording_end: recording.startTime,
    content: text,
  };

  if (recordingId) {
    teamsTranscriptCache[userEmail][recordingId] = {
      timestamp: Date.now(),
      data: transcriptList,
    };
  }

  res.send(transcriptList);
});

app.post("/api/teams/usertranscript", async (req, res) => {
  const vttData = req.body.transcript;

  const parseTeamsVttTranscript = (vttContent) => {
    // Initialize result object to collect speaker texts
    const speakerTexts = {};

    // Split the content by line breaks
    const lines = vttContent.split(/\r?\n/);

    // Process VTT format with <v Speaker>Text</v> pattern
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines, WEBVTT header, and timestamp lines
      if (
        !line ||
        line === "WEBVTT" ||
        line.match(/^\d{2}:\d{2}:\d{2}/) ||
        line.match(/-->/)
      ) {
        continue;
      }

      // Look for <v Speaker>Text</v> pattern
      const speakerMatch = line.match(/<v\s+([^>]+)>(.+)<\/v>/);
      if (speakerMatch) {
        const speaker = speakerMatch[1].trim();
        const text = speakerMatch[2].trim();

        if (!speakerTexts[speaker]) {
          speakerTexts[speaker] = "";
        }
        speakerTexts[speaker] += text + " ";
      }
    }

    // Trim trailing spaces for all speakers
    Object.keys(speakerTexts).forEach((speaker) => {
      speakerTexts[speaker] = speakerTexts[speaker].trim();
    });

    // Convert to array format as requested
    const result = Object.entries(speakerTexts).map(([name, text]) => ({
      name,
      text,
    }));

    return result;
  };

  const userMappedTranscriptArray = parseTeamsVttTranscript(vttData);

  res.status(200).json(userMappedTranscriptArray);
});

app.post("/api/refreshToken", async (req, res) => {
  const { platform, userEmail } = req.body;

  if (!platform || !userEmail) {
    return res.status(400).send("Missing platform or user email");
  }

  const userEntities = tableClient.listEntities({
    queryOptions: {
      filter: `email eq '${userEmail.toLowerCase()}'`,
    },
  });

  let userEntity = null;
  for await (const entity of userEntities) {
    userEntity = entity;
    break;
  }

  try {
    if (platform === "zoom") {
      // Zoom token refresh
      const response = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: userEntity.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Zoom token refresh failed:", errorText);
        return res.status(response.status).send("Token refresh failed");
      }

      const newTokens = await response.json();

      await tableClient.upsertEntity(
        {
          partitionKey: userEntity.partitionKey,
          rowKey: userEntity.rowKey,
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
        },
        "Merge",
      );

      return res.json({ success: true });
    } else {
      return res.status(400).send("Unsupported platform");
    }
  } catch (error) {
    console.error(`Error refreshing ${platform} token:`, error);
    res.status(500).send("Token refresh failed");
  }
});

// Zoom OAuth Callback
app.post("/auth/zoom/callback", async (req, res) => {
  const { code } = req.body;

  const tokenResponse = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.ZOOM_REDIRECT_URI, // must match Zoom app config
    }),
  });

  const tokens = await tokenResponse.json();
  // console.log("Zoom tokens:", tokens);

  // const userData = await fetch(`${process.env.Backend_URL}/api/zoom/user`, {
  //   headers: {
  //     Authorization: `Bearer ${tokens.access_token}`,
  //   },
  // });
  const userInfo = await getUserInfoForZoom(tokens.access_token);

  // const userInfo = await userData.json();

  const userEntities = tableClient.listEntities({
    queryOptions: {
      filter: `email eq '${userInfo.email.toLowerCase()}'`,
    },
  });

  let userEntity = null;
  for await (const entity of userEntities) {
    userEntity = entity;
    break;
  }

  await tableClient.upsertEntity(
    {
      partitionKey: userEntity.partitionKey,
      rowKey: userEntity.rowKey,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
    "Merge",
  );

  res.json({ scope: tokens.scope, userInfo: userInfo });
});

const getUserInfoForZoom = async (accessToken) => {
  if (!accessToken) return;

  try {
    const response = await fetch("https://api.zoom.us/v2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch Zoom user info");
    const userInfo = await response.json();
    // console.log("Zoom user info:", userInfo);

    return userInfo;
  } catch (error) {
    console.log("Error fetching Zoom user info:", error);
  }
};

// app.get("/api/zoom/user", async (req, res) => {
//   const accessToken = req.headers.authorization?.replace("Bearer ", "");
//   // console.log("Zoom Access Token:", accessToken);

//   if (!accessToken) return res.status(401).send("Missing access token");

//   try {
//     const response = await fetch("https://api.zoom.us/v2/users/me", {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//     });
//     if (!response.ok) throw new Error("Failed to fetch Zoom user info");
//     const userInfo = await response.json();
//     // console.log("Zoom user info:", userInfo);

//     res.status(200).send(userInfo);
//   } catch (error) {
//     console.log("Error fetching Zoom user info:", error);
//   }
// });

app.get("/api/zoom/recordings", async (req, res) => {
  // const accessToken = req.headers.authorization?.replace("Bearer ", "");
  const userEmail = req.headers["x-user-email"];

  if (!userEmail) return res.status(401).send("Missing email");

  const nocache = req.query.nocache === "true";
  if (
    !nocache &&
    zoomRecordingsCache[userEmail] &&
    Date.now() - zoomRecordingsCache[userEmail].timestamp < CACHE_TTL
  ) {
    return res.json(zoomRecordingsCache[userEmail].data);
  }

  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 1);
  // fromDate.setDate(fromDate.getDate() + 1);

  try {
    const userEntities = tableClient.listEntities({
      queryOptions: {
        filter: `email eq '${userEmail.toLowerCase()}'`,
      },
    });
    let userEntity = null;
    for await (const entity of userEntities) {
      userEntity = entity;
      break;
    }

    const response = await fetch(
      `https://api.zoom.us/v2/users/me/recordings?from=${
        fromDate.toISOString().split("T")[0]
      }&page_size=300`,
      {
        headers: {
          Authorization: `Bearer ${userEntity.accessToken}`,
        },
      },
    );

    if (!response.ok) throw new Error("Failed to fetch Zoom meetings");
    const data = await response.json();

    const recordings = data.meetings || [];

    zoomRecordingsCache[userEmail] = {
      timestamp: Date.now(),
      data: recordings,
    };

    res.status(200).json(recordings);
  } catch (error) {
    console.log("Error fetching Zoom meetings:", error);
  }
});

app.post("/api/zoom/recordingdata", async (req, res) => {
  // const accessToken = req.headers.authorization?.replace("Bearer ", "");
  const userEmail = req.headers["x-user-email"];
  const { recording } = req.body;

  if (!userEmail) return res.status(401).send("Missing email");
  const recordingId = recording.recordingId;

  zoomTranscriptCache[userEmail] = zoomTranscriptCache[userEmail] || {};

  if (
    recordingId &&
    zoomTranscriptCache[userEmail][recordingId] &&
    Date.now() - zoomTranscriptCache[userEmail][recordingId].timestamp <
      CACHE_TTL
  ) {
    return res
      .status(200)
      .json(zoomTranscriptCache[userEmail][recordingId].data);
  }

  const recordingTranscripts = {
    transcript: {},
    // timeline: {},
  };

  try {
    const userEntities = tableClient.listEntities({
      queryOptions: {
        filter: `email eq '${userEmail.toLowerCase()}'`,
      },
    });
    let userEntity = null;
    for await (const entity of userEntities) {
      userEntity = entity;
      break;
    }

    const downloadPromises = (recording.recording_files || []).map(
      async (file) => {
        const isVtt =
          file.file_type.toLowerCase() === "transcript" ||
          file.file_extension.toLowerCase() === "vtt" ||
          file.recording_type.toLowerCase() === "audio_transcript";

        // const isTimeline =
        //   file.file_type.toLowerCase() === "timeline" ||
        //   file.file_extension.toLowerCase() === "json" ||
        //   file.recording_type.toLowerCase() === "timeline";

        if (!isVtt) return;

        try {
          const response = await fetch(file.download_url, {
            headers: {
              Authorization: `Bearer ${userEntity.accessToken}`,
            },
          });

          if (!response.ok) throw new Error("Failed to download file");

          // const fileData = await response.buffer();

          if (isVtt) {
            const text = await response.text();
            recordingTranscripts.transcript = {
              id: file.id,
              recording_end: file.recording_end,
              file_size: file.file_size,
              file_type: file.file_type,
              file_extension: file.file_extension,
              status: file.status,
              content: text,
            };
          }
          // else if (isTimeline) {
          //   const json = await response.json().catch(async () => {
          //     const t = await response.text().catch(() => null);
          //     return t;
          //   });
          //   recordingTranscripts.timeline = {
          //     id: file.id,
          //     recording_end: file.recording_end,
          //     file_size: file.file_size,
          //     file_type: file.file_type,
          //     file_extension: file.file_extension,
          //     status: file.status,
          //     content: json,
          //   };
          // }
        } catch (error) {
          console.log("Error downloading file:", error);
        }
      },
    );
    await Promise.all(downloadPromises);

    if (recordingId) {
      zoomTranscriptCache[userEmail][recordingId] = {
        timestamp: Date.now(),
        data: recordingTranscripts,
      };
    }
  } catch (error) {
    console.log("Error in downloadPromises:", error);
  }

  return res.status(200).json(recordingTranscripts);
});

app.post("/api/zoom/usertranscript", async (req, res) => {
  const vttData = req.body.transcript;
  if (!vttData) {
    return res.status(400).send("Missing transcript data");
  }

  try {
    function parseVTTtoJSON(vttText) {
      const lines = vttText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const entries = [];

      for (let i = 0; i < lines.length; i++) {
        if (!isNaN(lines[i])) {
          const speakerLine = lines[i + 2];

          if (speakerLine && speakerLine.includes(":")) {
            const [speaker, ...textParts] = speakerLine.split(":");
            const text = textParts.join(":").trim();

            entries.push({
              speaker: speaker.trim(),
              text,
            });
          }
        }
      }

      return entries;
    }

    // Utility: Clean speaker names (optional enhancement)
    function normalizeSpeaker(speaker) {
      return speaker.replace(/\s+/g, " ").trim();
    }

    // Aggregate transcript by speaker and output as array
    function mapTranscriptBySpeakerArray(entries) {
      const userMappedTranscript = {};
      for (const entry of entries) {
        const speakerKey = normalizeSpeaker(entry.speaker);
        if (!userMappedTranscript[speakerKey]) {
          userMappedTranscript[speakerKey] = entry.text;
        } else {
          userMappedTranscript[speakerKey] += " " + entry.text;
        }
      }
      // Convert to array of objects with name and text
      return Object.entries(userMappedTranscript).map(([name, text]) => ({
        name,
        text,
      }));
    }

    // Main logic
    const data = parseVTTtoJSON(vttData);
    const userMappedTranscriptArray = mapTranscriptBySpeakerArray(data);

    res.status(200).json(userMappedTranscriptArray);
  } catch (err) {
    console.error("Error processing transcript:", err);
    return res.status(500).send("Error processing transcript");
  }
});

app.post("/api/generateAiAnalysis", async (req, res) => {
  const { id, name, text, meetingId, transcriptId, organization } = req.body;
  const cefrLevel = "B2";

  const results = {};
  const orgPrompts = await getOrganizationPrompts(organization);

  let existingAssessment = null;
  try {
    existingAssessment = await getAssessment(meetingId, transcriptId, id);
  } catch (err) {
    existingAssessment = null;
  }

  try {
    if (existingAssessment) {
      // Regenerate: keep data, just set status to pending
      await upsertAssessment(
        meetingId,
        transcriptId,
        id,
        existingAssessment.data || {},
        organization,
        "pending",
      );
    } else {
      // New assessment: create with empty data and pending status
      await upsertAssessment(
        meetingId,
        transcriptId,
        id,
        {},
        organization,
        "pending",
      );
    }
    io.emit("assessmentStatus", {
      meetingId,
      transcriptId,
      userEmail: id,
      status: "pending",
    });
  } catch (err) {
    console.error("Error setting assessment to pending:", err);
  }

  if (orgPrompts.ENABLE_ANALYZE_TEXT_WITH_OPENAI) {
    try {
      results.openAiObservations = await analyzeTextWithOpenAI(
        text,
        cefrLevel,
        orgPrompts,
      );
    } catch (error) {
      console.log("Error in OpenAI analysis:", error);
      results.openAiObservations = [];
    }
  } else {
    results.openAiObservations = [];
  }

  if (orgPrompts.ENABLE_ANALYZE_CONTENT_OPENAI) {
    try {
      const scores = await analyzeContentOpenAI(text, cefrLevel, orgPrompts);
      results.openAiScores = scores.map((n) =>
        Math.max(0, Math.min(100, Math.round(n))),
      );
    } catch (err) {
      console.log("Error in OpenAI scoring:", err);
      results.openAiScores = [0, 0, 0];
    }
  } else {
    results.openAiScores = [];
  }

  if (orgPrompts.ENABLE_PRONUNCIATION_CHALLENGE) {
    try {
      results.pronunciationChallenge = await generatePronunciationChallenge(
        text,
        orgPrompts,
      );
    } catch (error) {
      console.log("Error in pronunciation challenge:", error);
      results.pronunciationChallenge = "";
    }
  } else {
    results.pronunciationChallenge = "";
  }

  if (orgPrompts.ENABLE_COACHING_SPACE) {
    try {
      const studentDisplayName = name.trim() || "Student";
      results.coachingSpace = await generateCoachingSpace(
        text,
        studentDisplayName,
        orgPrompts,
      );

      const coachingKPIs = parseCoachingSpaceMarkdown(results.coachingSpace);
      results.scores = {
        emotionalTone: coachingKPIs.emotionalTone?.score || 0,
        collaborativeLanguage: coachingKPIs.collaborativeLanguage?.score || 0,
        growthMindset: coachingKPIs.growthMindset?.score || 0,
      };
    } catch (error) {
      console.log("Error in coaching space:", error);
      results.coachingSpace = "";
      results.scores = {};
    }
  } else {
    results.coachingSpace = "";
    results.scores = {};
  }

  if (orgPrompts.ENABLE_VOCABULARY_BOOSTER) {
    try {
      results.Vocabulary_Booster = await Vocabulary_Booster(text, orgPrompts);
    } catch (error) {
      console.log("Error in vocabulary booster:", error);
      results.Vocabulary_Booster = [];
    }
  } else {
    results.Vocabulary_Booster = [];
  }

  if (orgPrompts.ENABLE_GENERATE_MCQS) {
    try {
      results.mcqExercises = await generateMCQs(
        text,
        results.openAiObservations,
        cefrLevel,
        orgPrompts,
      );
    } catch (error) {
      console.log("Error in MCQ generation:", error);
      results.mcqExercises = "";
    }
  } else {
    results.mcqExercises = "";
  }

  const speakerAssessment = {
    speakerEmail: id,
    speakerName: name,
    // transcript: text,
    scores: results.scores,
    openAiObservations: results.openAiObservations,
    openAiScores: results.openAiScores,
    mcqExercises: results.mcqExercises,
    pronunciationChallenge: results.pronunciationChallenge,
    coachingSpace: results.coachingSpace,
    Vocabulary_Booster: results.Vocabulary_Booster,
    // cefrLevel: cefr_levels[selectedValue],
  };

  try {
    // store to Azure Table (upsert)
    await upsertAssessment(
      meetingId,
      transcriptId,
      id,
      speakerAssessment,
      organization,
      "completed",
    );
    io.emit("assessmentStatus", {
      meetingId,
      transcriptId,
      userEmail: id,
      status: "completed",
    });
    // console.log("Saved assessment to table for ", id);
    try {
      let entity;
      try {
        entity = await tableTokens.getEntity("token", organization);
      } catch {
        entity = { partitionKey: "token", rowKey: organization, value: 0 };
      }
      const current = parseInt(entity.value || 0);
      if (current <= 0)
        return res.status(400).json({ error: "No tokens left" });
      const newTotal = current - 1;
      await tableTokens.upsertEntity(
        { partitionKey: "token", rowKey: organization, value: newTotal },
        "Merge",
      );
    } catch (err) {
      res.status(500).send("Failed to deduct token");
    }
  } catch (err) {
    await upsertAssessment(
      meetingId,
      transcriptId,
      id,
      {},
      organization,
      "completed",
    );
    io.emit("assessmentStatus", {
      meetingId,
      transcriptId,
      userEmail: id,
      status: "completed",
    });
    console.error("Error saving assessment to Azure Table:", err);
    // still return result, but log
  }

  // console.log("Speaker Assessment:", speakerAssessment);

  res.status(200).json(speakerAssessment);
});

// list assessments for a meeting+transcript
app.get("/api/assessments", async (req, res) => {
  const { meetingId, transcriptId } = req.query;
  if (!meetingId || !transcriptId)
    return res.status(400).send("missing params");
  try {
    const list = await listAssessmentsForMeeting(meetingId, transcriptId);
    // return an array of { userEmail, meetingId, transcriptId, data, status, updatedAt }
    const simplified = list.map((e) => ({
      userEmail: e.userEmail,
      meetingId: e.meetingId,
      transcriptId: e.transcriptId,
      data: e.data,
      status: e.status || "completed", // fallback for old records
      updatedAt: e.updatedAt,
    }));
    res.json(simplified);
  } catch (err) {
    console.error(err);
    res.status(500).send("error listing assessments");
  }
});

app.get("/api/assessmentsforuser", async (req, res) => {
  const { organization } = req.query;
  // if (!organization) return res.status(400).send("missing params");
  try {
    const list = await listAssessmentsForUser(organization);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).send("error listing assessments");
  }
});

// get a single assessment
app.get("/api/assessment", async (req, res) => {
  const { meetingId, transcriptId, userEmail } = req.query;
  if (!meetingId || !transcriptId || !userEmail)
    return res.status(400).send("missing params");
  try {
    const entity = await getAssessment(meetingId, transcriptId, userEmail);
    if (!entity) return res.status(404).send("not found");
    res.json(entity.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("error fetching assessment");
  }
});

app.post("/api/sendWelcomeMail", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).send("Missing parameters");

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.OUTLOOK_EMAIL,
        pass: process.env.OUTLOOK_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: '"BoostClass" <Info@go-teach.ai>',
      to: email,
      subject: "Welcome to BoostClass AI!",
      html: `
        <p>Welcome <b>${name}</b>! Your account has been created.</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Role:</b> ${role}</p>
        <p>Best regards,<br/>BoostClass AI</p>
      `,
    });

    res.status(200).send("Welcome mail sent");
  } catch (err) {
    console.error("Welcome mail error:", err);
    res.status(500).send("Failed to send welcome mail");
  }
});

// app.post("/api/sendAssessmentMail", upload.single("pdf"), async (req, res) => {
//   const { email, meeting, transcriptId, reportData } = req.body;

//   const pdfFile = req.file; // contains uploaded PDF

//   if (!email || !pdfFile)
//     return res.status(400).send("Missing parameters or PDF");

//   try {
//     const transporter = nodemailer.createTransport({
//       host: "smtp.office365.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.OUTLOOK_EMAIL,
//         pass: process.env.OUTLOOK_PASSWORD,
//       },
//     });

//     await transporter.sendMail({
//       from: '"BoostClass" <Info@go-teach.ai>',
//       to: email,
//       subject: "Your Assessment Report is Ready",
//       html: `
//         <p>Hello,</p>
//         <p>Your assessment report for meeting <b>${
//           JSON.parse(meeting).subject || ""
//         }</b> is ready.</p>
//         <p>Recording Id: ${transcriptId}</p>
//         <p>Regards,<br/>BoostClass AI</p>
//       `,
//       attachments: [
//         {
//           filename: `Assessment_Report_${
//             JSON.parse(reportData).speakerName || "report"
//           }.pdf`,
//           content: pdfFile.buffer,
//           contentType: "application/pdf",
//         },
//       ],
//     });

//     res.status(200).send("Mail sent");
//   } catch (err) {
//     console.error("Mail error:", err);
//     res.status(500).send("Failed to send mail");
//   }
// });

app.post("/api/sendAssessmentMail", upload.single("pdf"), async (req, res) => {
  const { email, meeting, transcript, reportData, organization } = req.body;

  const pdfFile = req.file; // contains uploaded PDF

  if (!email || !pdfFile)
    return res.status(400).send("Missing parameters or PDF");

  if (!organization)
    return res.status(400).send("Missing organization");

  try {
    let notification = {
      enabled: false,
      subject: "Your Assessment Report is Ready",
      message: "<p>Hello,</p><p>Your assessment report is ready.</p>",
      signatureHtml: "",
    };

    try {
      const entity = await tableTokens.getEntity("token", organization);
      notification = {
        enabled: entity.notificationEnabled === true,
        subject: entity.notificationSubject || notification.subject,
        message: entity.notificationMessage || notification.message,
        signatureHtml: entity.notificationSignatureHtml || "",
      };
    } catch {
      // keep defaults
    }

    // if (!notification.enabled) {
    //   return res.status(403).send("Notifications are disabled for this organization");
    // }

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.OUTLOOK_EMAIL,
        pass: process.env.OUTLOOK_PASSWORD,
      },
    });

    const safeMeeting = meeting ? JSON.parse(meeting) : {};
    const safeReport = reportData ? JSON.parse(reportData) : {};
    const safeTranscript = transcript ? JSON.parse(transcript) : {};
    const recordingDate = new Date(safeTranscript?.recording_end || Date.now());
      const formattedDate = recordingDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = recordingDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    const html = `
      <div style="font-family: Arial, sans-serif; color: #222; font-size: 16px;">
        <h3 style="margin-bottom: 0.2em;">Meeting: ${safeMeeting.subject || "Meeting"}</h3>
        <div style="margin-bottom: 1em; color: #555;">
          <strong>Date:</strong> ${formattedDate}<br/>
          <strong>Time:</strong> ${formattedTime}
        </div>
        <div style="margin-bottom: 1em;">
          ${notification.message}
        </div>
        ${
          notification.signatureHtml
            ? `<div style="margin-top:2em; border-top:1px solid #eee; padding-top:1em;">${notification.signatureHtml}</div>`
            : ""
        }
      </div>
    `;

    await transporter.sendMail({
      from: '"BoostClass" <Info@go-teach.ai>',
      to: email,
      subject: notification.subject,
      html,
      attachments: [
        {
          filename: `Assessment_Report_${safeReport.speakerName || "report"}.pdf`,
          content: pdfFile.buffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).send("Mail sent");
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).send("Failed to send mail");
  }
});


// app.post("/api/sendAssessmentMail", async (req, res) => {
//   const { email, meeting, transcript, reportData, organization, orgLogo } = req.body;
//   // const pdfFile = req.file; // contains uploaded PDF

//   if (!email || !reportData)
//     return res.status(400).send("Missing parameters or PDF");

//   try {
//     const pdfBuffer = await generateReportPdf({
//       reportData: reportData,
//       meeting: meeting,
//       transcript: transcript,
//       organization,
//       orgLogo,
//     });

//     const transporter = nodemailer.createTransport({
//       host: "smtp.office365.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.OUTLOOK_EMAIL,
//         pass: process.env.OUTLOOK_PASSWORD,
//       },
//     });

//     await transporter.sendMail({
//       from: '"BoostClass" <Info@go-teach.ai>',
//       to: email,
//       subject: "Your Assessment Report is Ready",
//       html: `
//         <p>Hello,</p>
//         <p>Your assessment report for meeting <b>${
//           meeting.subject || ""
//         }</b> is ready.</p>
//         <p>Recording Id: ${transcript.id}</p>
//         <p>Regards,<br/>BoostClass AI</p>
//       `,
//       attachments: [
//         {
//           filename: `Assessment_Report_${
//             reportData.speakerName || "report"
//           }.pdf`,
//           content: pdfBuffer,
//           contentType: "application/pdf",
//         },
//       ],
//     });

//     res.status(200).send("Mail sent");
//   } catch (err) {
//     console.error("Mail error:", err);
//     res.status(500).send("Failed to send mail");
//   }
// });

app.get("/api/organizations", async (req, res) => {
  try {
    const data = await tableTokens.listEntities();
    let orgs = [];
    for await (const entity of data) {
      if (entity.rowKey) {
        orgs.push({
          name: entity.rowKey,
          imageUrl: entity.imageUrl || "",
          report: entity.value || "",
          autoReportEnabled: entity.autoReportEnabled === true, // default false
        });
      }
    }
    res.json(orgs);
  } catch (err) {
    res.json([]);
  }
});

app.post("/api/organizations", upload.single("image"), async (req, res) => {
  const organization = req.body.organization;
  const imageFile = req.file;

  if (!organization) {
    return res.status(400).send("Missing or invalid organization");
  }

  let imageUrl = "";
  if (imageFile) {
    try {
      // Upload image to Azure Blob Storage
      const blobName = `${organization}-${Date.now()}-${
        imageFile.originalname
      }`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(imageFile.buffer, {
        blobHTTPHeaders: { blobContentType: imageFile.mimetype },
      });
      imageUrl = blockBlobClient.url;
    } catch (err) {
      return res.status(500).send("Failed to upload image");
    }
  }

  try {
    // Store organization metadata in Table Storage
    await tableTokens.upsertEntity(
      {
        partitionKey: "token",
        rowKey: organization,
        imageUrl: imageUrl,
        value: 0,
        autoReportEnabled: false,
        // Notification defaults
        notificationEnabled: false,
        notificationSubject: "Your Assessment Report is Ready",
        notificationMessage: "<p>Hello,</p><p>Your assessment report is ready.</p>",
        notificationSignatureHtml: "",
        notificationCc: "",
        ...defaultSystemPromts,
      },
      "Merge",
    );

    if (imageUrl) {
      const entities = tableClient.listEntities({
        queryOptions: { filter: `organization eq '${organization}'` },
      });
      for await (const user of entities) {
        await tableClient.updateEntity(
          {
            partitionKey: user.partitionKey,
            rowKey: user.rowKey,
            orgImg: imageUrl,
          },
          "Merge",
          { etag: user.etag ?? "*" },
        );
      }
    }
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).send("Failed to add organization");
  }
});

app.get("/api/organizations/:org/notifications", async (req, res) => {
  const org = req.params.org;
  if (!org) return res.status(400).send("Missing organization name");

  try {
    const entity = await tableTokens.getEntity("token", org);

    res.json({
      enabled: entity.notificationEnabled === true,
      subject: entity.notificationSubject || "Your Assessment Report is Ready",
      message: entity.notificationMessage || "<p>Hello,</p><p>Your assessment report is ready.</p>",
      signatureHtml: entity.notificationSignatureHtml || "",
      cc: entity.notificationCc || "",
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).send("Organization not found");
    }
    res.status(500).send("Failed to fetch notifications");
  }
});

app.put(
  "/api/organizations/:org/notifications",
  upload.single("signature"),
  async (req, res) => {
    const org = req.params.org;
    if (!org) return res.status(400).send("Missing organization name");

    try {
      const subject = req.body.subject || "";
      const message = req.body.message || "";

      let signatureHtml = "";

      if (req.file) {
        // store html content directly in table
        signatureHtml = req.file.buffer.toString("utf-8");
      }

      const updateEntity = {
        partitionKey: "token",
        rowKey: org,
        notificationSubject: subject,
        notificationMessage: message,
      };

      if (signatureHtml) updateEntity.notificationSignatureHtml = signatureHtml;

      await tableTokens.upsertEntity(updateEntity, "Merge");
      res.json({ success: true });
    } catch (err) {
      res.status(500).send("Failed to update notifications");
    }
  },
);

app.put("/api/organizations/:org/notifications/cc", async (req, res) => {
  const org = req.params.org;
  const cc = req.body.cc || "";
  if (!org) return res.status(400).send("Missing organization name");
  try {
    await tableTokens.upsertEntity(
      {
        partitionKey: "token",
        rowKey: org,
        notificationCc: cc,
      },
      "Merge"
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send("Failed to update CC");
  }
});

app.put("/api/organizations/:org/notifications/toggle", async (req, res) => {
  const org = req.params.org;
  const { enabled } = req.body;
  if (typeof enabled === "undefined") return res.status(400).send("Missing enabled value");

  try {
    await tableTokens.upsertEntity(
      {
        partitionKey: "token",
        rowKey: org,
        notificationEnabled: !!enabled,
      },
      "Merge"
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send("Failed to update notification toggle");
  }
});

app.post("/api/orgImg", upload.single("image"), async (req, res) => {
  const organization = req.body.organization;
  const imageFile = req.file;

  if (!organization) {
    return res.status(400).send("Missing or invalid organization");
  }

  let imageUrl = "";
  if (imageFile) {
    try {
      // Upload image to Azure Blob Storage
      const blobName = `${organization}-${Date.now()}-${
        imageFile.originalname
      }`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(imageFile.buffer, {
        blobHTTPHeaders: { blobContentType: imageFile.mimetype },
      });
      imageUrl = blockBlobClient.url;
    } catch (err) {
      return res.status(500).send("Failed to upload image");
    }
  }

  try {
    await tableTokens.upsertEntity(
      {
        partitionKey: "token",
        rowKey: organization,
        imageUrl: imageUrl,
      },
      "Merge",
    );

    if (imageUrl) {
      const entities = tableClient.listEntities({
        queryOptions: { filter: `organization eq '${organization}'` },
      });
      for await (const user of entities) {
        await tableClient.updateEntity(
          {
            partitionKey: user.partitionKey,
            rowKey: user.rowKey,
            orgImg: imageUrl,
          },
          "Merge",
          { etag: user.etag ?? "*" },
        );
      }
    }
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).send("Failed to edit organization");
  }
});

app.delete("/api/organizations/delete", async (req, res) => {
  const { organization } = req.body;
  if (!organization) return res.status(400).send("Missing organization");
  try {
    // Delete organization entity from Table Storage
    await tableTokens.deleteEntity("token", organization);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send("Failed to delete organization");
  }
});

app.get("/api/organizations/:org/prompts", async (req, res) => {
  const org = req.params.org;
  if (!org) return res.status(400).send("Missing organization name");

  try {
    const entity = await tableTokens.getEntity("token", org);

    const promptKeys = [
      "ANALYZE_TEXT_WITH_OPENAI",
      "ANALYZE_CONTENT_OPENAI",
      "VOCABULARY_BOOSTER",
      "PRONUNCIATION_CHALLENGE",
      "COACHING_SPACE",
      "GENERATE_MCQS",
    ];

    const prompts = {};
    promptKeys.forEach((key) => {
      prompts[key] = entity[key] || "";
      prompts[`ENABLE_${key}`] = entity[`ENABLE_${key}`] !== false;
    });

    res.json(prompts);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).send("Organization not found");
    }
    res.status(500).send("Failed to fetch prompts");
  }
});

app.put("/api/organizations/:org/prompts", async (req, res) => {
  const org = req.params.org;
  const { key, value, enabled } = req.body;
  if (!org || !key) return res.status(400).send("Missing organization or key");

  try {
    const updateEntity = {
      partitionKey: "token",
      rowKey: org,
    };

    if (value !== undefined) {
      updateEntity[key] = value;
    }

    if (enabled !== undefined) {
      updateEntity[`ENABLE_${key}`] = enabled;
    }

    await tableTokens.upsertEntity(updateEntity, "Merge");
    res.json({ success: true });
  } catch (err) {
    res.status(500).send("Failed to update prompt");
  }
});

// Update auto-report toggle
app.put("/api/organizations/:org/auto-report", async (req, res) => {
  const org = req.params.org;
  const { autoReportEnabled } = req.body;
  if (typeof autoReportEnabled !== "boolean")
    return res.status(400).send("Missing or invalid value");
  try {
    await tableTokens.upsertEntity(
      {
        partitionKey: "token",
        rowKey: org,
        autoReportEnabled,
      },
      "Merge",
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send("Failed to update auto-report setting");
  }
});

app.get("/api/tokens/total", async (req, res) => {
  const { org } = req.query;
  if (!org) {
    return res.status(400).send("Missing or invalid organization");
  }
  const rowKey = org;
  try {
    // const entity = await tableTokens.getEntity("token", "total");
    const entity = await tableTokens.getEntity("token", rowKey);
    res.json({ totalTokens: entity.value || 0 });
  } catch (err) {
    // If not found, return 0
    res.json({ totalTokens: 0 });
  }
});

app.post("/api/tokens/add", async (req, res) => {
  const { token, organization } = req.body;
  const rowKey = organization;
  if (!token || isNaN(token) || !organization)
    return res.status(400).send("Missing or invalid token or organization");
  try {
    let entity;
    try {
      entity = await tableTokens.getEntity("token", rowKey);
    } catch {
      entity = { partitionKey: "token", rowKey: rowKey, value: 0 };
    }
    const newTotal = parseInt(entity.value || 0) + parseInt(token);
    await tableTokens.upsertEntity(
      { partitionKey: "token", rowKey: rowKey, value: newTotal },
      "Merge",
    );
    res.json({ success: true, totalTokens: newTotal });
  } catch (err) {
    res.status(500).send("Failed to add token");
  }
});

app.post("/api/tokens/deduct", async (req, res) => {
  const { organization } = req.body;
  if (!organization) {
    return res.status(400).send("Missing or invalid organization");
  }
  try {
    let entity;
    try {
      entity = await tableTokens.getEntity("token", organization);
    } catch {
      entity = { partitionKey: "token", rowKey: organization, value: 0 };
    }
    const current = parseInt(entity.value || 0);
    if (current <= 0) return res.status(400).json({ error: "No tokens left" });
    const newTotal = current - 1;
    await tableTokens.upsertEntity(
      { partitionKey: "token", rowKey: organization, value: newTotal },
      "Merge",
    );
    res.json({ success: true, totalTokens: newTotal });
  } catch (err) {
    res.status(500).send("Failed to deduct token");
  }
});

app.put("/api/users/toggle-orgadmin", async (req, res) => {
  const { email, isActive } = req.body;
  if (!email) return res.status(400).send("Missing params");
  try {
    const entities = tableClient.listEntities({
      queryOptions: {
        filter: `email eq '${email.toLowerCase().replace(/'/g, "''")}'`,
      },
    });
    let user = null;
    for await (const entity of entities) {
      user = entity;
      break;
    }
    if (!user) return res.status(404).send("User not found");
    await tableClient.updateEntity(
      {
        partitionKey: user.partitionKey,
        rowKey: user.rowKey,
        orgAdminEnabled: isActive,
      },
      "Merge",
      { etag: user.etag ?? "*" },
    );
    res.json({ success: true, email, orgAdminEnabled: isActive });
  } catch (err) {
    res.status(500).send("Failed to update orgAdmin status");
  }
});

app.post("/api/generateDashboardSummary", async (req, res) => {
  const { report, selectedUser, fromDate, toDate, organization } = req.body;
  if (!report || !selectedUser)
    return res.status(400).send("Missing report or user");

  try {
    const response = await generateDashboardSummary(
      report,
      selectedUser,
      fromDate,
      toDate,
    );

    try {
      let entity;
      try {
        entity = await tableTokens.getEntity("token", organization);
      } catch {
        entity = { partitionKey: "token", rowKey: organization, value: 0 };
      }
      const current = parseInt(entity.value || 0);
      if (current <= 0)
        return res.status(400).json({ error: "No tokens left" });
      const newTotal = current - 1;
      await tableTokens.upsertEntity(
        { partitionKey: "token", rowKey: organization, value: newTotal },
        "Merge",
      );
    } catch (err) {
      res.status(500).send("Failed to deduct token");
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("Error generating dashboard summary:", err);
    res.status(500).send("Failed to generate summary");
  }
});

server.listen(process.env.PORT, () =>
  console.log(`🚀 Backend listening on ${process.env.PORT}`),
);
