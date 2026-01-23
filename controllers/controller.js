import { AzureOpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();
import { ConfidentialClientApplication } from "@azure/msal-node";
import { getPrompt } from "./custom_prompt.js";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
const options = { endpoint, apiKey, deployment, apiVersion };

const client = new AzureOpenAI(options);

const cefr_levels = {
  Default: `General English Assessment
General Ability: Basic assessment without specific CEFR targeting.

The assessment will:
- Identify common pronunciation errors
- Highlight key grammar mistakes
- Suggest vocabulary improvements
- Provide general feedback on fluency and coherence

This mode is suitable for:
- Users who don't know their CEFR level
- Mixed-level groups
- General practice without specific level targeting`,

  A1: `A1 (Breakthrough) – Basic User
General Ability: Can understand and use familiar everyday expressions and very basic phrases.

Skills Overview:

Listening: Understands very simple instructions and questions when spoken slowly and clearly.

Speaking:

Can introduce themselves and others.

Can describe basic aspects of their life (e.g. family, home, school).

Can ask and answer questions about personal details (e.g. where they live, people they know).

Reading: Can read familiar names, words and very simple sentences.

Writing: Can write a short postcard or fill in forms with personal details.

Notable Features:

Uses isolated, simple expressions with reliance on repetition.

Interaction is heavily dependent on assistance and context.

Can follow short, simple directions and describe themselves using basic phrases​`,

  A2: `A2 (Waystage) – Basic User
General Ability: Can communicate in simple and routine tasks requiring a direct exchange of information.

Skills Overview:

Listening: Understands phrases related to areas of most immediate relevance (e.g. shopping, family).

Speaking:

Can handle very short social exchanges, even though they may not understand enough to keep the conversation going.

Can describe aspects of their background, immediate environment.

Reading: Can read very short, simple texts like notices or instructions.

Writing: Can write short, simple notes and messages.

Notable Features:

Can make simple transactions (e.g. in shops or asking for directions).

Capable of describing plans, daily routines, and giving basic opinions or comparisons.

Can tell a simple story or describe something using a list of points​`,

  B1: `B1 (Threshold) – Independent User
General Ability: Can deal with most situations likely to arise while travelling or during everyday life.

Skills Overview:

Listening: Understands main points of clear standard speech on familiar topics.

Speaking:

Can handle conversation on topics of personal interest.

Can describe experiences, dreams, and briefly explain opinions and plans.

Reading: Can understand texts that consist mainly of high frequency everyday language.

Writing: Can write straightforward connected text on familiar topics.

Notable Features:

Maintains interaction in informal conversation.

Capable of coping flexibly with most routine issues.

Can express feelings about experiences and provide reasons for opinions​
​`,
  B2: `B2 (Vantage) – Independent User
General Ability: Can interact with fluency and spontaneity with native speakers.

Skills Overview:

Listening: Understands the main ideas of complex speech, including technical discussions.

Speaking:

Can present clear, detailed descriptions and viewpoints on a range of topics.

Can develop arguments and participate actively in discussion.

Reading: Can read articles and reports on contemporary problems.

Writing: Can write clear, detailed text on a wide range of subjects.

Notable Features:

Capable of constructing arguments and negotiating meaning.

Communicates confidently in both social and work contexts.

Uses linking expressions effectively and initiates/ends conversations with ease​`,
  C1: `C1 (Effective Operational Proficiency) – Proficient User
General Ability: Can express ideas fluently and spontaneously without much searching for expressions.

Skills Overview:

Listening: Understands extended speech even when it is not clearly structured.

Speaking:

Can present complex information clearly and fluently.

Can express themselves flexibly and effectively in social, academic, and professional contexts.

Reading: Understands a wide range of demanding texts and recognizes implicit meaning.

Writing: Can produce well-structured, detailed texts on complex subjects.

Notable Features:

Uses language fluently with a broad lexical repertoire.

Can employ emphasis, reformulate statements, and use idiomatic expressions appropriately.

Skilled in argumentation and in summarising various viewpoints​`,
  C2: `C2 (Mastery) – Proficient User
General Ability: Can understand virtually everything heard or read, summarise information, and express themselves very fluently.

Skills Overview:

Listening: Easily understands any kind of spoken language.

Speaking:

Can express themselves very fluently, precisely and with a high degree of nuance.

Can reformulate thoughts even during communication.

Reading: Reads with ease virtually all forms of written language.

Writing: Can produce clear, smoothly flowing text in an appropriate style and tone.

Notable Features:

Demonstrates mastery of discourse structure and registers.

Commands idiomatic language and understands cultural nuances.

Can convey finer shades of meaning precisely and backtrack smoothly if needed​
​
.`,
};

function convertMoMToHTML(momText) {
  const lines = momText.trim().split("\n");

  let html = "<div class='mom'>";

  // Handle the first line: "# Meeting Minutes (MoM)"
  const firstLine = lines[0].trim();
  if (firstLine.startsWith("# ")) {
    const title = firstLine.replace(/^# /, "").trim();
    html += `<h1>${title}</h1>`;
  }

  // Join remaining lines back and split into sections on '## '
  const bodyText = lines.slice(1).join("\n");
  const sections = bodyText.split(/\n(?=## )/); // matches "## " at beginning of a line

  sections.forEach((section) => {
    const sectionLines = section.trim().split("\n");
    const sectionTitle = sectionLines[0].replace(/^## /, "").trim();

    html += `<section><h2>${sectionTitle}</h2>`;

    const contentLines = sectionLines.slice(1);
    if (["Participants", "Key Points", "Action Items"].includes(sectionTitle)) {
      html += "<ul>";
      contentLines.forEach((line) => {
        const item = line.replace(/^[-*]\s*/, "").trim();
        if (item) html += `<li>${item}</li>`;
      });
      html += "</ul>";
    } else if (sectionTitle === "Summary") {
      html += `<p>${contentLines.join(" ")}</p>`;
    }

    html += "</section>";
  });

  html += "</div>";
  return html;
}

async function getAppToken(tenantId) {
  if (!tenantId) {
    throw new Error("Tenant ID not available yet");
  }

  const dynamicMsalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
  };

  const dynamicCca = new ConfidentialClientApplication(dynamicMsalConfig);

  try {
    const tokenResponse = await dynamicCca.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    const appToken = tokenResponse.accessToken;
    // appTokenExpiresAt = now + (tokenResponse.expiresOn * 1000) - 60000; // refresh 1 minute before expiry

    console.log("🔐 Refreshed App Token using tenant:", tenantId);
    return appToken;
  } catch (error) {
    console.error("❌ Failed to acquire app token:", error);
    throw error;
  }
}

const tableTokens = new TableClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
  "Tokens",
  new AzureNamedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT,
    process.env.AZURE_STORAGE_KEY
  )
);

async function getOrganizationPrompts(org) {
  try {
    const entity = await tableTokens.getEntity("token", org);
    return {
      // Prompts
      ANALYZE_TEXT_WITH_OPENAI: entity.ANALYZE_TEXT_WITH_OPENAI || "",
      ANALYZE_CONTENT_OPENAI: entity.ANALYZE_CONTENT_OPENAI || "",
      VOCABULARY_BOOSTER: entity.VOCABULARY_BOOSTER || "",
      PRONUNCIATION_CHALLENGE: entity.PRONUNCIATION_CHALLENGE || "",
      COACHING_SPACE: entity.COACHING_SPACE || "",
      GENERATE_MCQS: entity.GENERATE_MCQS || "",

      // Toggles (default true if missing)
      ENABLE_ANALYZE_TEXT_WITH_OPENAI:
        entity.ENABLE_ANALYZE_TEXT_WITH_OPENAI !== false,
      ENABLE_ANALYZE_CONTENT_OPENAI:
        entity.ENABLE_ANALYZE_CONTENT_OPENAI !== false,
      ENABLE_VOCABULARY_BOOSTER:
        entity.ENABLE_VOCABULARY_BOOSTER !== false,
      ENABLE_PRONUNCIATION_CHALLENGE:
        entity.ENABLE_PRONUNCIATION_CHALLENGE !== false,
      ENABLE_COACHING_SPACE: entity.ENABLE_COACHING_SPACE !== false,
      ENABLE_GENERATE_MCQS: entity.ENABLE_GENERATE_MCQS !== false,
    };
  } catch (err) {
    return {
      ENABLE_ANALYZE_TEXT_WITH_OPENAI: true,
      ENABLE_ANALYZE_CONTENT_OPENAI: true,
      ENABLE_VOCABULARY_BOOSTER: true,
      ENABLE_PRONUNCIATION_CHALLENGE: true,
      ENABLE_COACHING_SPACE: true,
      ENABLE_GENERATE_MCQS: true,
    };
  }
}

async function analyzeTextWithOpenAI(text, cefrLevel = "B1", orgPrompts = {}) {
  try {
    const cefrDescription = cefr_levels[cefrLevel] || cefr_levels["Default"];

    const prompts = getPrompt(
      "ANALYZE_TEXT_WITH_OPENAI",
      {
        text,
        cefrLevel,
        cefrDescription,
      },
      orgPrompts.ANALYZE_TEXT_WITH_OPENAI
    );

    const response = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompts.systemPrompt,
        },

        {
          role: "user",
          content: prompts.userPrompt,
        },
      ],
    });

    const content = response.choices[0].message.content || "[]";

    try {
      const observations = JSON.parse(content);
      // Ensure mistakeType is present
      return Array.isArray(observations)
        ? observations.slice(0, 7).map((obs) => ({
            mistake: obs.mistake || "",
            correction: obs.correction || "",
            explanation: obs.explanation || "",
            mistakeType: obs.mistakeType || "",
          }))
        : [];
    } catch (error) {
      return [];
    }
  } catch (error) {
    context.log.error(`[analyzeTextWithOpenAI] Error: ${error.message}`);
    return [];
  }
}

async function analyzeContentOpenAI(text, cefrLevel, orgPrompts = {}) {
  try {
    const cefrDescription = cefr_levels[cefrLevel] || cefr_levels["Default"];

    const prompts = getPrompt(
      "ANALYZE_CONTENT_OPENAI",
      {
        text,
        cefrLevel,
        cefrDescription,
      },
      orgPrompts.ANALYZE_CONTENT_OPENAI
    );

    const payload = {
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
    };

    const response = await client.chat.completions.create({
      messages: payload.messages,
    });

    let content = response.choices[0].message.content || "[]";

    // Clean up response - remove any markdown formatting, quotes, etc.
    content = content
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .replace(/^\[|\]$/g, (match) => match) // Keep array brackets
      .replace(/[\r\n]/g, "")
      .trim();

    let scores = [0, 0, 0];
    try {
      // Try parsing the string as JSON
      const parsed = JSON.parse(content);
      if (
        Array.isArray(parsed) &&
        parsed.length === 3 &&
        parsed.every((n) => typeof n === "number")
      ) {
        scores = parsed.map((n) => Math.max(0, Math.min(100, Math.round(n))));
      }
    } catch (err) {
      // Fallback: Try to extract the scores using regex
      const numbersMatch = content.match(
        /\[?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]?/
      );
      if (numbersMatch) {
        scores = [
          parseInt(numbersMatch[1]),
          parseInt(numbersMatch[2]),
          parseInt(numbersMatch[3]),
        ];
      }
    }
    return scores;
  } catch (error) {
    if (error.response) {
      console.error(
        "OpenAI API Error:",
        error.response.status,
        error.response.data
      );
    }
    return [0, 0, 0];
  }
}

async function generatePronunciationChallenge(transcript, orgPrompts = {}) {
  const prompts = getPrompt(
    "PRONUNCIATION_CHALLENGE",
    { text: transcript },
    orgPrompts.PRONUNCIATION_CHALLENGE
  );
  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    context.log.error(
      `[generatePronunciationChallenge Error] ${error.message}`
    );
    return "";
  }
}

async function generateCoachingSpace(transcript, studentName, orgPrompts = {}) {
  const prompts = getPrompt(
    "COACHING_SPACE",
    {
      text: transcript,
      studentName,
    },
    orgPrompts.COACHING_SPACE
  );
  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
    });

    const content = response.choices[0].message.content.trim();

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return content;
  } catch (error) {
    if (error.response) {
      console.log(
        `[generateCoachingSpace Error] Status: ${error.response.status}`
      );
      console.log(
        `[generateCoachingSpace Error] Data: ${JSON.stringify(
          error.response.data
        )}`
      );
    }
    return "";
  }
}

function parseCoachingSpaceMarkdown(markdown) {
  const result = {
    emotionalTone: null,
    // questioningStrategy: null,
    collaborativeLanguage: null,
    growthMindset: null,
    coachingSpaceMarkdown: markdown,
  };

  if (!markdown) return result;

  // Updated regex patterns to capture scores, analysis and tips
  const kpiRegexes = {
    emotionalTone:
      /Emotional Tone\s*–\s*(\d+)\/100[\s\S]*?Analysis:\s*([\s\S]*?)Coaching tip:\s*([\s\S]*?)(?=\n\n|$)/i,
    // questioningStrategy:
    //   /Questioning Strategy\s*–\s*(\d+)\/100[\s\S]*?Analysis:\s*([\s\S]*?)Coaching tip:\s*([\s\S]*?)(?=\n\n|$)/i,
    collaborativeLanguage:
      /Collaborative Language\s*–\s*(\d+)\/100[\s\S]*?Analysis:\s*([\s\S]*?)Coaching tip:\s*([\s\S]*?)(?=\n\n|$)/i,
    growthMindset:
      /Growth Mindset\s*–\s*(\d+)\/100[\s\S]*?Analysis:\s*([\s\S]*?)Coaching tip:\s*([\s\S]*?)(?=\n\n|$)/i,
  };

  for (const [key, regex] of Object.entries(kpiRegexes)) {
    const match = markdown.match(regex);
    if (match) {
      result[key] = {
        score: Number(match[1]),
        analysis: match[2].trim(),
        tip: match[3].trim(),
      };
    }
  }

  return result;
}

async function Vocabulary_Booster(text, orgPrompts = {}) {
  try {
    const prompts = getPrompt(
      "VOCABULARY_BOOSTER",
      { text },
      orgPrompts.VOCABULARY_BOOSTER
    );

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
    });

    const content = response.choices[0].message.content || "[]";

    try {
      const vocabularyBooster = JSON.parse(content);
      return Array.isArray(vocabularyBooster)
        ? vocabularyBooster.slice(0, 10)
        : [];
    } catch (jsonError) {
      console.log("Error parsing Vocabulary Booster response:", jsonError);
      return [];
    }
  } catch (error) {
    console.log(`[Vocabulary_Booster Error] ${error.message}`);
    return [];
  }
}

async function generateMCQs(
  text,
  openAiObservations,
  cefrLevel,
  orgPrompts = {}
) {
  const cefrDescription = cefr_levels[cefrLevel] || cefr_levels["Default"];
  let exerciseGuidelines = "";
  if (cefrLevel === "A1" || cefrLevel === "A2") {
    exerciseGuidelines = `
Exercise Guidelines for A1/A2 level:
- Use very simple language for instructions
- Focus on basic vocabulary related to daily life
- Include basic grammar like present simple, past simple
- Keep sentences short and straightforward
- Include visual support cues in exercise descriptions
- Limit exercise length to 3-5 items per exercise`;
  } else if (cefrLevel === "B1" || cefrLevel === "B2") {
    exerciseGuidelines = `
Exercise Guidelines for B1/B2 level:
- Use clear language for instructions
- Include intermediate vocabulary for common topics
- Cover grammar including present perfect, conditionals, passive voice
- Add context to exercises with short paragraphs
- Include 5-8 items per exercise`;
  } else if (cefrLevel === "C1" || cefrLevel === "C2") {
    exerciseGuidelines = `
Exercise Guidelines for C1/C2 level:
- Use sophisticated language for instructions
- Include advanced vocabulary including idioms, collocations
- Focus on complex grammar including perfect tenses, reported speech
- Incorporate authentic-like materials
- Include 8-10 items per challenging exercise`;
  } else {
    exerciseGuidelines = `
Exercise Guidelines for general assessment:
- Use clear language for instructions
- Include vocabulary and grammar from multiple levels
- Design adaptive exercises with progressive difficulty
- Include 5-8 items per exercise`;
  }

  try {
    const prompts = getPrompt(
      "GENERATE_MCQS",
      {
        cefrLevel,
        cefrDescription,
        exerciseGuidelines,
        text,
        openAiObservations: JSON.stringify(openAiObservations),
      },
      orgPrompts.GENERATE_MCQS
    );

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.log(`[generateMCQs Error] ${error.message}`);
    return "";
  }
}

const assessmentClient = new TableClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
  "AIAnalysis",
  new AzureNamedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT,
    process.env.AZURE_STORAGE_KEY
  )
);

export async function upsertAssessment(
  meetingId,
  transcriptId,
  userEmail,
  data,
  organization,
  status = "completed" // default for backward compatibility
) {
  const partitionKey = String(meetingId);
  const rowKey = `${transcriptId}::${userEmail}`;
  const entity = {
    partitionKey,
    rowKey,
    meetingId: String(meetingId),
    transcriptId: String(transcriptId),
    userEmail: userEmail.toLowerCase(),
    data: JSON.stringify(data),
    organization: organization || "",
    status,
    updatedAt: new Date().toISOString(),
  };
  await assessmentClient.upsertEntity(entity, "Merge");
  return entity;
}

async function getAssessment(meetingId, transcriptId, userEmail) {
  const partitionKey = String(meetingId);
  const rowKey = `${transcriptId}::${userEmail}`;
  try {
    const entity = await assessmentClient.getEntity(partitionKey, rowKey);
    // parse JSON stored in data
    const parsed = entity.data ? JSON.parse(entity.data) : null;
    return { ...entity, data: parsed };
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}

async function listAssessmentsForMeeting(meetingId, transcriptId) {
  const partitionKey = String(meetingId);
  // const filter = `partitionKey eq '${partitionKey}' and transcriptId eq '${transcriptId}'`;
  const pages = assessmentClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${partitionKey}' and transcriptId eq '${transcriptId}'`,
    },
  });
  const results = [];
  for await (const e of pages) {
    results.push({ ...e, data: e.data ? JSON.parse(e.data) : null });
  }
  return results;
}

async function listAssessmentsForUser(organization) {
  let pages = null;
  if (
    organization === "undefined" ||
    !organization ||
    organization.trim() === ""
  ) {
    pages = assessmentClient.listEntities();
  }
  // const partitionKey = String(meetingId);
  // const filter = `partitionKey eq '${partitionKey}' and transcriptId eq '${transcriptId}'`;
  else {
    pages = assessmentClient.listEntities({
      queryOptions: {
        filter: `organization eq '${organization}'`,
      },
    });
  }
  const results = [];
  for await (const e of pages) {
    results.push(e);
  }
  return results;
}

async function generateDashboardSummary(
  report,
  selectedUser,
  fromDate,
  toDate
) {
  // Prepare input for prompt
  const studentName = selectedUser.name || report.speakerName || "Student";
  const evaluationPeriod = `${fromDate} – ${toDate}`;
  const classesAttended =
    report.metadata?.merged_from_count ||
    report.scores_with_time?.length ||
    "N/A";
  const scores = report.scores || {};
  const averageScore = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) /
      (Object.keys(scores).length || 1)
  );

  //   const prompt = `
  // You are an experienced English teacher preparing a professional Student Performance Evaluation for a B2B client.
  // Your goal is to highlight the student’s progress, strengths, and improvement areas with a positive and motivational tone, while remaining professional and data-based.

  // You will receive structured input including:
  // - Student name
  // - Evaluation period
  // - Number of classes attended
  // - Average score
  // - Individual skill scores (Grammar, Vocabulary, Fluency, Collaborative Language, Emotional Tone, Growth Mindset & Engagement)
  // - Optional notes or examples of errors

  // **Instructions:**
  // - Write specific, constructive comments for each skill area based on the scores and error notes.
  // - Summarize the student's overall progress and engagement in 3–4 sentences.
  // - List 3–5 strengths with clear, contextual bullet points.
  // - List 2–3 areas to improve, phrased positively and specifically.
  // - Avoid CEFR level references (A1–C2).
  // - Avoid generic feedback; make comments specific and contextual.
  // - Keep language clear and natural, suitable for a company receiving periodic evaluations.
  // - Return only valid JSON in the following structure:

  // {
  //   "student": "...",
  //   "period": "...",
  //   "classesAttended": ...,
  //   "averageScore": ...,
  //   "skillOverview": [
  //     { "area": "Grammar", "score": ..., "comment": "..." },
  //     { "area": "Vocabulary", "score": ..., "comment": "..." },
  //     { "area": "Fluency", "score": ..., "comment": "..." },
  //     { "area": "Collaborative Language", "score": ..., "comment": "..." },
  //     { "area": "Emotional Tone", "score": ..., "comment": "..." },
  //     { "area": "Growth Mindset & Engagement", "score": ..., "comment": "..." }
  //   ],
  //   "overallSummary": "...",
  //   "strengths": [ "...", ... ],
  //   "areasToImprove": [ "...", ... ]
  // }

  // **Example Output:**
  // {
  //   "student": "César Jiménez Millán",
  //   "period": "01/01/2025 – 11/11/2025",
  //   "classesAttended": 12,
  //   "averageScore": 66,
  //   "skillOverview": [
  //     { "area": "Grammar", "score": 69, "comment": "Good accuracy and awareness; small mistakes with prepositions and articles." },
  //     { "area": "Vocabulary", "score": 74, "comment": "Wide and professional range; uses expressions naturally." },
  //     { "area": "Fluency", "score": 70, "comment": "Communicates clearly with smooth flow." },
  //     { "area": "Collaborative Language", "score": 51, "comment": "Could use more interactive expressions in discussions." },
  //     { "area": "Emotional Tone", "score": 63, "comment": "Positive and engaging tone that supports communication." },
  //     { "area": "Growth Mindset & Engagement", "score": 56, "comment": "Open to feedback and motivated to improve." }
  //   ],
  //   "overallSummary": "César has shown consistent improvement throughout this period, especially in vocabulary and fluency. His communication is increasingly confident, natural, and engaging. He demonstrates clear progress in accuracy and participation, as well as a growing ability to self-correct and adapt language in real contexts.",
  //   "strengths": [
  //     "Excellent ability to connect ideas logically.",
  //     "Expanding vocabulary used effectively in workplace contexts.",
  //     "Positive emotional tone and active participation.",
  //     "Strong sense of self-awareness and genuine motivation to improve."
  //   ],
  //   "areasToImprove": [
  //     "Fine-tune prepositions and articles for a more polished delivery.",
  //     "Add more collaborative phrases to invite others into the conversation.",
  //     "Replace filler words with more natural connectors."
  //   ]
  // }

  // Student details:
  // - Name: ${studentName}
  // - Period: ${evaluationPeriod}
  // - Classes attended: ${classesAttended}
  // - Scores: ${JSON.stringify(scores)}
  // - Average Score: ${averageScore}
  // - Observations: ${JSON.stringify(report.openAiObservations || [])}
  // - Vocabulary booster: ${JSON.stringify(report.Vocabulary_Booster || [])}

  // Return only valid JSON.
  // `;

  const prompt = `
You are an experienced English teacher preparing a professional **Student Performance Evaluation** for a B2B client. 
Your goal is to highlight the student’s progress, strengths, and improvement areas with a natural, classroom-based tone.
The evaluation must feel like it comes from real teacher observations, not from dashboard metrics.
Use the provided scores only as internal guidance to inspire the comments, without referencing numbers or appearing data-driven.
You will receive structured input including:
- Student name
- Evaluation period
- Number of classes attended
- Average score
- Individual skill scores (Grammar, Vocabulary, Fluency, Pronunciation, Emotional Tone, Growth Mindset & Engagement)
- Optional notes or examples of errors

Generate a complete evaluation using the following structure:
---
## Student Performance Evaluation
**Student:** {studentName} 
**Period:** {evaluationPeriod} 
**Classes attended:** {classesAttended} 
**Average score:** {averageScore}/100 

### Skill Overview
| Area | Score (/100) | Comment |
|------|---------------|----------|
| Grammar | {grammarScore} | [Positive & encouraging. Highlight progress or ability (max. 5 to 9 words)] |
| Vocabulary | {vocabularyScore} | [Positive & encouraging comment (5–9 words).] |
| Fluency | {fluencyScore} | [Positive & encouraging comment (5–9 words).] |
| Collaborative Language | {collabScore} | [Positive & encouraging comment (5–9 words).] |
| Emotional Tone | {toneScore} | [Positive & encouraging comment (5–9 words).] |
| Growth Mindset | {mindsetScore} | [Positive & encouraging comment (5–9 words).] |

### Strengths
[List 4–5 strengths written as teacher observations.]

### Areas to Improve
[List 2–3 improvement points written with a supportive tone.]

### Overall Summary
[Write 4–5 sentences summarising classroom progress, participation, and communication. Avoid any mention of dashboards or data.
End with an optimistic statement about future progress.]

- Return only valid JSON in the following structure:
**Example Output:**
{
  "student": "César Jiménez Millán",
  "period": "01/01/2025 – 11/11/2025",
  "classesAttended": 12,
  "averageScore": 66,
  "skillOverview": [
    { "area": "Grammar", "score": 69, "comment": "Good accuracy and awareness; small mistakes with prepositions and articles." },
    { "area": "Vocabulary", "score": 74, "comment": "Wide and professional range; uses expressions naturally." },
    { "area": "Fluency", "score": 70, "comment": "Communicates clearly with smooth flow." },
    { "area": "Collaborative Language", "score": 51, "comment": "Could use more interactive expressions in discussions." },
    { "area": "Emotional Tone", "score": 63, "comment": "Positive and engaging tone that supports communication." },
    { "area": "Growth Mindset & Engagement", "score": 56, "comment": "Open to feedback and motivated to improve." }
  ],
  "overallSummary": "César has shown consistent improvement throughout this period, especially in vocabulary and fluency. His communication is increasingly confident, natural, and engaging. He demonstrates clear progress in accuracy and participation, as well as a growing ability to self-correct and adapt language in real contexts.",
  "strengths": [
    "Excellent ability to connect ideas logically.",
    "Expanding vocabulary used effectively in workplace contexts.",
    "Positive emotional tone and active participation.",
    "Strong sense of self-awareness and genuine motivation to improve."
  ],
  "areasToImprove": [
    "Fine-tune prepositions and articles for a more polished delivery.",
    "Add more collaborative phrases to invite others into the conversation.",
    "Replace filler words with more natural connectors."
  ]
}

Student details:
- Name: ${studentName}
- Period: ${evaluationPeriod}
- Classes attended: ${classesAttended}
- Scores: ${JSON.stringify(scores)}
- Average Score: ${averageScore}
- Observations: ${JSON.stringify(report.openAiObservations || [])}
- Vocabulary booster: ${JSON.stringify(report.Vocabulary_Booster || [])}

Return only valid JSON.
`;

  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a professional English teacher." },
        { role: "user", content: prompt },
      ],
    });

    // Extract and parse JSON from the response
    const raw = response.choices?.[0]?.message?.content || "{}";
    let evaluationJson;
    try {
      evaluationJson = JSON.parse(raw);
    } catch (err) {
      // Try to extract JSON from markdown/code block if needed
      const match = raw.match(/\{[\s\S]*\}/);
      evaluationJson = match ? JSON.parse(match[0]) : {};
    }

    return evaluationJson;
  } catch (err) {
    console.error("Error generating evaluation:", err);
    return { error: "Failed to generate evaluation" };
  }
}

function buildReportHtml(report) {
  // Defensive defaults
  const {
    speakerName = "Unknown",
    speakerEmail = "",
    transcript = "",
    scores = {},
    openAiObservations = [],
    openAiScores = [],
    mcqExercises = "",
    pronunciationChallenge = "",
    coachingSpace = "",
    Vocabulary_Booster = [],
  } = report || {};

  // small helper to build bullet lists for openAiObservations
  const observationsHtml = openAiObservations
    .map(
      (o, idx) => `
      <div class="observation">
        <div class="obs-title">Mistake ${idx + 1}:</div>
        <div class="obs-row"><strong>Original:</strong> ${escapeHtml(
          o.mistake || ""
        )}</div>
        <div class="obs-row"><strong>Correction:</strong> ${escapeHtml(
          o.correction || ""
        )}</div>
        <div class="obs-row"><strong>Explanation:</strong> ${escapeHtml(
          o.explanation || ""
        )}</div>
      </div>
    `
    )
    .join("");

  const vocabularyRows = (Vocabulary_Booster || [])
    .map(
      (v) => `
    <tr>
      <td>${escapeHtml(v.word || "")}</td>
      <td style="text-align:center">${v.occurrences || 0}</td>
      <td>${(v.suggestions || []).map((s) => escapeHtml(s)).join(", ")}</td>
    </tr>`
    )
    .join("");

  // openAiScores to small bar-like visuals
  const openAiScoresHtml = (openAiScores || [])
    .map(
      (val, idx) => `
      <div class="score-row">
        <div class="score-label">OpenAI score ${idx + 1}</div>
        <div class="score-bar"><div class="score-fill" style="width:${val}%;"></div></div>
        <div class="score-num">${val}</div>
      </div>
    `
    )
    .join("");

  // Main HTML
  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Coaching Space Report - ${escapeHtml(speakerName)}</title>
    <style>
      /* Reset & base */
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #111827; margin: 0; padding: 28px; background: #fff; }
      .container { max-width: 900px; margin: 0 auto; }
      header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; }
      .brand { font-weight:700; font-size: 20px; color:#0f172a; }
      .meta { text-align:right; font-size:12px; color:#475569; }
      .card { background: #fff; border: 1px solid #e6edf3; border-radius:8px; padding:18px; margin-bottom:14px; box-shadow: 0 2px 6px rgba(15,23,42,0.02); }

      h1 { margin:0; font-size:20px; color:#0f172a; }
      h2 { margin: 0 0 8px 0; font-size:16px; color: #0f172a; }
      p { margin: 6px 0; line-height:1.45; color:#334155; }

      /* Top section */
      .top-info { display:flex; gap:16px; align-items:center; justify-content:space-between; }
      .badge { font-weight:600; font-size:12px; color:#fff; background: linear-gradient(90deg,#60a5fa,#7c3aed); padding:6px 10px; border-radius:999px; }

      /* Scores */
      .scores-grid { display:flex; gap:12px; flex-wrap:wrap; }
      .score-pill { flex:1 1 170px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e6eef8; }
      .score-pill strong { display:block; font-size:18px; }
      .score-label { color:#64748b; font-size:13px; margin-bottom:6px; }

      /* Observations */
      .observation { border-left:3px solid #e2e8f0; padding:8px 12px; margin-bottom:10px; background:#ffffff; }
      .obs-title { font-weight:700; margin-bottom:6px; }
      .obs-row { margin:3px 0; color:#1f2937; }

      /* OpenAI scores visual */
      .score-row { display:flex; align-items:center; gap:10px; margin:8px 0; }
      .score-label { width:190px; color:#475569; font-size:13px; }
      .score-bar { flex:1; height:10px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
      .score-fill { height:100%; background: linear-gradient(90deg,#60a5fa,#7c3aed); }
      .score-num { width:36px; text-align:right; font-weight:600; color:#0f172a; }

      /* MCQ & Coaching */
      pre.mcq { white-space:pre-wrap; font-family: inherit; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #e6eef8; overflow:auto; font-size:13px; }

      /* Vocabulary table */
      table.vocab { width:100%; border-collapse:collapse; margin-top:8px; }
      table.vocab th, table.vocab td { text-align:left; padding:8px; border-bottom:1px solid #eef2f7; font-size:13px; color:#0f172a; }
      table.vocab th { background:#f8fafc; color:#334155; font-weight:700; }

      footer { margin-top:18px; font-size:12px; color:#64748b; text-align:center; }

      @media print {
        body { margin: 10mm; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div>
          <div class="brand">🎯 Coaching Space</div>
          <div style="font-size:13px; color:#475569; margin-top:4px;">Coaching Space Report for <strong>${escapeHtml(
            speakerName
          )}</strong></div>
        </div>
        <div class="meta">
          <div>${escapeHtml(speakerEmail)}</div>
          <div style="margin-top:6px">${new Date().toLocaleString()}</div>
        </div>
      </header>

      <section class="card top-card">
        <div class="top-info">
          <div>
            <h1>${escapeHtml(speakerName)}</h1>
            <div style="font-size:13px; color:#475569; margin-top:6px;">Transcript excerpt</div>
          </div>
          <div class="badge">Summary</div>
        </div>

        <p style="margin-top:12px; max-height:110px; overflow:hidden; color:#334155;">${escapeHtml(
          transcript
        )}</p>
      </section>

      <!-- Scores -->
      <section class="card">
        <h2>Scores</h2>
        <div class="scores-grid" style="margin-top:10px;">
          <div class="score-pill">
            <div class="score-label">Emotional Tone</div>
            <strong>${scores.emotionalTone ?? "-"}/100</strong>
          </div>
          <div class="score-pill">
            <div class="score-label">Questioning Strategy</div>
            <strong>${scores.questioningStrategy ?? "-"}/100</strong>
          </div>
          <div class="score-pill">
            <div class="score-label">Collaborative Language</div>
            <strong>${scores.collaborativeLanguage ?? "-"}/100</strong>
          </div>
          <div class="score-pill">
            <div class="score-label">Growth Mindset</div>
            <strong>${scores.growthMindset ?? "-"}/100</strong>
          </div>
        </div>
      </section>

      <!-- OpenAI observations -->
      <section class="card">
        <h2>OpenAI Observations</h2>
        ${
          observationsHtml ||
          "<p style='color:#475569;'>No specific observations.</p>"
        }
      </section>

      <!-- OpenAI score bars -->
      <section class="card">
        <h2>OpenAI Scores</h2>
        ${
          openAiScoresHtml ||
          "<p style='color:#475569;'>No scores available.</p>"
        }
      </section>

      <!-- Exercises (MCQ) -->
      <section class="card">
        <h2>Exercises (Student Version)</h2>
        <pre class="mcq">${escapeHtml(mcqExercises || "")}</pre>
      </section>

      <!-- Pronunciation & coaching space -->
      <section class="card">
        <h2>Pronunciation Challenge</h2>
        <p style="color:#334155;">${escapeHtml(
          pronunciationChallenge || ""
        )}</p>
        <hr style="margin:12px 0; border:none; border-top:1px solid #eef2f7;">
        <h2>Coaching Space</h2>
        <pre class="mcq">${escapeHtml(coachingSpace || "")}</pre>
      </section>

      <!-- Vocabulary -->
      <section class="card">
        <h2>Vocabulary Booster</h2>
        <table class="vocab">
          <thead>
            <tr><th>Word</th><th style="text-align:center">Occurrences</th><th>Suggestions</th></tr>
          </thead>
          <tbody>
            ${
              vocabularyRows ||
              '<tr><td colspan="3" style="text-align:center">No vocabulary data</td></tr>'
            }
          </tbody>
        </table>
      </section>

      <footer>Generated by Coaching Space • ${new Date().toLocaleDateString()}</footer>
    </div>
  </body>
  </html>
`;
}

// function buildReportHtml(result, meeting, transcript) {
//   const {
//     speakerEmail = "",
//     speakerName = "Unknown Speaker",
//     transcript: summaryTranscript = "",
//     scores = {},
//     openAiObservations = [],
//     openAiScores = [],
//     mcqExercises = "",
//     pronunciationChallenge = "",
//     coachingSpace = "",
//     Vocabulary_Booster = [],
//   } = result;
//   const {
//     subject: meetingName = "Unknown Meeting",
//     startTime = "",
//     duration = 0,
//   } = meeting;
//   const { recording_end = "", content: vttContent = "" } = transcript;

//   // Helper functions
//   const escapeHtml = (str = "") =>
//     String(str)
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/"/g, "&quot;")
//       .replace(/'/g, "&#039;");

//   const getFormattedDate = (dateStr) => {
//     const date = new Date(dateStr);
//     return (
//       date.toLocaleDateString("en-US", {
//         day: "numeric",
//         month: "short",
//         year: "numeric",
//       }) || "Unknown"
//     );
//   };
//   const getFormattedTime = (dateStr) => {
//     const date = new Date(dateStr);
//     return (
//       date.toLocaleTimeString("en-US", {
//         hour: "numeric",
//         minute: "2-digit",
//       }) || "Unknown"
//     );
//   };

//   const getMeetingDuration = (dur) => `${dur} Min` || "Unknown";

//   const getColor = (score) => {
//     if (score >= 80) return "#1e8e3e"; // green
//     if (score >= 60) return "#d3af2a"; // yellow
//     return "#a72525"; // red
//   };

//   const processMarkdownForPdf = (content = "") => {
//     const cleanedContent = content.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
//     let processed = cleanedContent
//       .replace(/^## .*$/gm, "") // Remove ## headers
//       .replace(/^### (.*)$/gm, "$1") // Keep text from ###
//       .replace(/\*\*([^:*]+):\*\*/g, "$1:") // Clean bold titles with colons
//       .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
//       .replace(/\*([^*]+)\*/g, "$1") // Remove italic
//       .replace(/^\s*-\s+/gm, "• "); // Bullet points

//     const lines = processed.split("\n");
//     let html = '<div class="pdfExerciseContent">';
//     lines.forEach((line) => {
//       if (!line.trim()) {
//         html += "<br>";
//         return;
//       }
//       let class = "exerciseLine";
//       if (line.includes("Objective:")) class = "exerciseObjective";
//       else if (line.includes("Task:")) class = "exerciseTask";
//       else if (line.includes("Explanation:")) class = "exerciseExplanation";
//       else if (line.includes("Example")) class = "exerciseExamples";
//       else if (line.includes("Activity:")) class = "exerciseActivity";
//       else if (line.includes("CORRECTIONS") || line.includes("Corrections for"))
//         class = "exerciseCorrection";
//       else if (line.trim().match(/^Exercise \d+:/)) class = "exerciseTitle";
//       html += `<p class="${class}">${escapeHtml(line)}</p>`;
//     });
//     html += "</div>";
//     return html;
//   };

//   const parseVttTranscript = (vtt = "") => {
//     const lines = vtt.split("\n\n").filter(Boolean).slice(1); // Skip WEBVTT
//     return lines
//       .map((block) => {
//         const parts = block.split("\n");
//         if (parts.length < 3) return "";
//         const speakerText = parts[2]; // Assuming format: number\n timestamp\n speaker: text
//         return `<p>${escapeHtml(speakerText)}</p>`;
//       })
//       .join("");
//   };

//   // Build table rows
//   const obsRows =
//     openAiObservations
//       .map(
//         (obs) => `
//     <tr>
//       <td>${escapeHtml(obs.mistake || "N/A")}</td>
//       <td>${escapeHtml(obs.correction || "N/A")}</td>
//       <td>${escapeHtml(obs.explanation || "N/A")}</td>
//     </tr>
//   `
//       )
//       .join("") || '<tr><td colspan="3">No observations available.</td></tr>';

//   const vocabRows =
//     Vocabulary_Booster.map(
//       (v) => `
//     <tr>
//       <td class="vocabWord">${escapeHtml(v.word || "N/A")}</td>
//       <td class="vocabOccurrences">${v.occurrences || 0}</td>
//       <td class="vocabSuggestions">${(v.suggestions || []).map(escapeHtml).join(", ")}</td>
//     </tr>
//   `
//     ).join("") || '<tr><td colspan="3">No vocabulary data.</td></tr>';

//   const openAiScoresHtml = openAiScores
//     .map(
//       (score, index) => `
//     <div class="score-pill">
//       <div class="score-label">Score ${index + 1}</div>
//       <strong>${score}</strong>
//     </div>
//   `
//     )
//     .join("");

//   const pronunciationLines = pronunciationChallenge
//     .split("\n")
//     .map((line) => `<p>${escapeHtml(line)}</p>`)
//     .join("");

//   const exercisesHtml = processMarkdownForPdf(mcqExercises);

//   const coachingHtml = processMarkdownForPdf(coachingSpace);

//   const transcriptHtml = parseVttTranscript(vttContent);

//   const endTime = getFormattedTime(recording_end) || "Unknown";

//   // Flattened CSS (same as before, add if needed for scores-grid, score-pill, etc.)
//   const css = `
//   .pdfReport { padding: 20px; background: #ffffff; width: 850px; font-family: Arial, sans-serif; text-align: justify; padding-left: 50px; padding-right: 50px; padding-bottom: 50px; margin-bottom: 50px; }
//     .pdfReport p { margin: 0px 0; font-size: 14px; text-align: justify; }
//     .pdfCharts { padding: 20px; margin-bottom: 5px; border-radius: 12px; border: 2px solid rgb(102, 102, 102); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
//     .pdfCharts .chartsRow { display: flex; gap: 24px; justify-content: center; }
//     .pdfCharts .chartColumn { flex: 1; max-width: 460px; }
//     .DonutBox { padding: 10px; margin: 5px 20px; gap: 5px; }
//     .chartLegend { font-weight: bold; margin: 10px; align-items: left; text-align: left; padding-top: 20px; }
//     .legendColor { font-weight: bold; display: inline-block; width: 20px; height: 20px; margin-right: 5px; border-radius: 50%; }
//     .pdfTranscript p { line-height: 25px; background: linear-gradient(145deg, #e3eeff, #f5f9ff); padding: 30px; border-radius: 12px; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04); }
//     .pdfTranscript .pdfTranscriptHeader { font-weight: 600; text-align: center; font-size: 16px; padding: 16px; color: #2d3748; background: linear-gradient(145deg, #e3eeff, #f5f9ff); border-radius: 12px; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04); }
//     .pdfTranscript .legendSection { margin-bottom: 20px; }
//     .pdfTranscript .legendList { display: flex; gap: 20px; align-items: center; }
//     .errorText { color: #dc3545; font-weight: bold; }
//     .mispronText { color: #d39e00; font-weight: bold; }
//     .vocabBoosterSection { page-break-inside: avoid !important; break-inside: avoid !important; margin-top: 20px; margin-bottom: 15px; }
//     .vocabBoosterTitle { font-weight: 600; text-align: center; font-size: 16px; padding: 16px; color: #005343; background: linear-gradient(145deg, #e3eeff, #f5f9ff); border-radius: 12px; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04); margin-bottom: 15px; }
//     .pdfWavyBanner { position: relative; width: 100%; margin-bottom: 30px; padding-top: 60px; padding-bottom: 40px; text-align: center; overflow: hidden; background-color: #8a84d6; border-radius: 12px; }
//     .pdfWavyBanner::after { content: ""; position: absolute; bottom: -2px; left: 0; width: 100%; height: 20px; background-color: white; border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
//     .pdfWavyBanner h1 { margin: 0; font-size: 24px; color: white; font-weight: bold; position: relative; z-index: 2; }
//     .pdfWavyBannerBlue { background-color: #559fd0; }
//     .pdfWavyBannerGold { background-color: #ffd700; }
//     .pdfWavyBannerGold h1 { color: #333; }
//     .pdfWavyBannerGreen { background-color: #06b900; }
//     .sectionDivider { height: 1px; margin: 10px; width: 100%; position: relative; }
//     .sectionBreak { height: 60px; width: 100%; page-break-after: always; break-after: always; }
//     .pdfSyllableTable { width: 100%; border-collapse: collapse; margin: 20px 0 40px 0; page-break-inside: auto; }
//     .pdfSyllableTable tr { page-break-inside: avoid; break-inside: avoid; }
//     .pdfSyllableTable td { border: 1px solid #e0e0e0; padding: 10px; vertical-align: top; }
//     .pdfWordCell { width: 25%; font-weight: bold; background-color: #f8f9fa; }
//     .pdfSyllableCell { display: block; padding: 12px; word-break: break-word; width: 100%; }
//     .pdfLegendBar { display: flex; flex-direction: column; background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px; margin-bottom: 20px; }
//     .pdfLegendBar .legendTitle { font-size: 14px; font-weight: bold; margin-bottom: 8px; text-align: center; }
//     .pdfLegendBar .legendItems { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
//     .legendItem { display: flex; align-items: center; gap: 5px; font-size: 12px; }
//     .pdfPageBreak { height: 1px; width: 100%; margin-bottom: 50px; border-top: 1px dashed #ccc; display: block; position: relative; }
//     .observationsTable { width: 100%; border-collapse: collapse; }
//     .observationsTable th, .observationsTable td { padding: 12px 8px; border-bottom: 1px solid #ececec; text-align: left; }
//     .vocabWord { font-weight: bold; color: #2980b9; max-width: 100px; }
//     .vocabOccurrences { text-align: center; font-weight: bold; color: #333; max-width: 80px; }
//     .vocabSuggestions { color: #16a085; font-style: italic; }
//     .mcqExercise { margin-bottom: 20px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; background-color: #f9f9f9; page-break-inside: avoid; }
//     .exerciseTitle { color: #000000; font-weight: bolder; font-size: 16px; }
//     .exerciseObjective { margin: 12px 0 5px 0; font-weight: bold; color: #333; font-size: 14px; padding-left: 5px; border-left: 3px solid #2980b9; }
//     .exerciseTask { margin: 12px 0 5px 0; font-weight: bold; color: #333; font-size: 14px; padding-left: 5px; border-left: 3px solid #16a085; }
//     .exerciseExplanation { margin: 12px 0 5px 0; font-weight: bold; color: #333; font-size: 14px; padding-left: 5px; border-left: 3px solid #8e44ad; }
//     .exerciseExamples { margin: 12px 0 5px 0; font-weight: bold; color: #333; font-size: 14px; padding-left: 5px; border-left: 3px solid #d35400; }
//     .exerciseActivity { margin: 12px 0 5px 0; font-weight: bold; color: #333; font-size: 14px; padding-left: 5px; border-left: 3px solid #274d4b; }
//     .exerciseCorrection { margin: 15px 0 5px 0; font-weight: bold; color: #06b900; font-size: 15px; background-color: #f9f2f2; padding: 3px 10px; }
//     .syllable { display: inline-block; margin: 2px 4px 2px 0; padding: 4px 8px; border-radius: 4px; font-weight: 500; font-size: 14px; line-height: 1.2; border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); word-break: break-all; background: #fff; }
//     .scoreLow { background-color: #ff0000; color: white; }
//     .scoreMediumLow { background-color: #ffa500; color: white; }
//     .scoreMedium { background-color: #ffff00; color: black; }
//     .scoreHigh { background-color: #008000; color: white; }
//     .colorSwatch { width: 20px; height: 20px; border-radius: 50%; display: inline-block; }
//     .pdfExerciseContent { /* Add any specific styles if needed */ }
//     @media print {
//       .pdfPageBreak { page-break-after: always !important; display: block; height: 0; clear: both; }
//       .pdfSyllableTable { margin-bottom: 50px; margin-top: 50mm; }
//       .sectionBreak { page-break-before: always !important; page-break-after: always !important; }
//     }
//     .scores-grid { display: flex; gap: 12px; flex-wrap: wrap; }
//     .score-pill { flex: 1 1 170px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e6eef8; }
//     .score-pill strong { display: block; font-size: 18px; }
//     .score-label { color: #64748b; font-size: 13px; margin-bottom: 6px; }
//     .pdfTranscript p { line-height: 1.6; color: #495057; white-space: pre-wrap; margin: 5px 0; font-size: 14px; }
//   `;

//   return `
//     <!doctype html>
//     <html>
//     <head>
//       <meta charset="utf-8"/>
//       <style>${css}</style>
//     </head>
//     <body>
//       <div class="pdfReport">
//         <h2>Coaching Space Assessment Report</h2>
//         <div>
//           <p><strong>Speaker:</strong> ${escapeHtml(speakerName)} (${escapeHtml(
//     speakerEmail
//   )})</p>
//           <p><strong>Meeting:</strong> ${escapeHtml(meetingName)}</p>
//           <p><strong>Date & Time:</strong> ${getFormattedDate(
//             startTime
//           )} (${getFormattedTime(startTime)} - ${endTime})</p>
//           <p><strong>Duration:</strong> ${getMeetingDuration(duration)}</p>
//         </div>
//         <div class="pdfWavyBanner"><h1>Transcript</h1></div>
//         <div class="pdfTranscript">${
//           transcriptHtml || "<p>No transcript available.</p>"
//         }</div>
//         <div class="pdfWavyBanner"><h1>Your Scores</h1></div>
//         <div class="pdfCharts">
//           <div class="chartsRow">
//             <div class="chartColumn"><canvas id="emotionalToneChart" width="300" height="300"></canvas></div>
//             <div class="chartColumn"><canvas id="questioningStrategyChart" width="300" height="300"></canvas></div>
//           </div>
//           <div class="chartsRow">
//             <div class="chartColumn"><canvas id="collaborativeLanguageChart" width="300" height="300"></canvas></div>
//             <div class="chartColumn"><canvas id="growthMindsetChart" width="300" height="300"></canvas></div>
//           </div>
//         </div>
//         <div class="pdfWavyBanner"><h1>OpenAI Observations</h1></div>
//         <table class="observationsTable">
//           <thead><tr><th>Mistake</th><th>Correction</th><th>Explanation</th></tr></thead>
//           <tbody>${obsRows}</tbody>
//         </table>
//         <div class="pdfWavyBanner"><h1>OpenAI Scores</h1></div>
//         <div class="scores-grid">${
//           openAiScoresHtml || "<p>No scores available.</p>"
//         }</div>
//         <div class="pdfWavyBanner"><h1>Vocabulary Booster</h1></div>
//         <table class="observationsTable">
//           <thead><tr><th>Word</th><th>Occurrences</th><th>Suggestions</th></tr></thead>
//           <tbody>${vocabRows}</tbody>
//         </table>
//         <div class="pdfWavyBanner"><h1>Pronunciation Challenge</h1></div>
//         ${pronunciationLines || "<p>No pronunciation challenge available.</p>"}
//         <div class="pdfPageBreak"></div>
//         <div class="pdfWavyBanner"><h1>Practice Exercises</h1></div>
//         <div class="mcqExercise">${exercisesHtml}</div>
//         <div class="pdfWavyBanner"><h1>Coaching Space</h1></div>
//         ${coachingHtml}
//       </div>
//       <script>
//         function getColor(score) {
//           if (score >= 80) return '#1e8e3e';
//           if (score >= 60) return '#d3af2a';
//           return '#a72525';
//         }
//         const scores = ${JSON.stringify(scores)};
//         ['emotionalTone', 'questioningStrategy', 'collaborativeLanguage', 'growthMindset'].forEach((key) => {
//           const score = scores[key] || 0;
//           const color = getColor(score);
//           const ctx = document.getElementById(key + 'Chart')?.getContext('2d');
//           if (ctx) {
//             new Chart(ctx, {
//               type: 'doughnut',
//               data: { datasets: [{ data: [score, 100 - score], backgroundColor: [color, '#f3f2f1'], borderColor: [color, '#f3f2f1'], borderWidth: 1 }] },
//               options: { cutout: '80%', responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: false }
//             });
//           }
//         });
//       </script>
//     </body>
//     </html>
//   `;
// }

function escapeHtml(str = "") {
  if (typeof str !== "string") str = String(str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlforpdf() {
  return `
    <!-- report-template.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Coaching Report — PDF</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root{
      /* Palette derived from the logo: purple, teal, yellow, dark-navy */
      --primary:#6f64d6;    /* purple */
      --accent:#0f1724;     /* dark navy (text) */
      --teal:#00b7c7;       /* teal */
      --sun:#ffd23f;        /* yellow */
      --bg:#f6f8fb;
      --card:#ffffff;
      --muted:#6b7280;
      --max-width:900px;
      --pad:18px;
    }
    html,body{height:100%;margin:0;background:var(--bg);font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:var(--accent);}
    .report{max-width:var(--max-width);margin:22px auto;padding:var(--pad)}
    .header{display:flex;align-items:center;gap:16px;padding:12px;background:linear-gradient(90deg,#ffffff,#fbfdff);border-radius:10px;border-left:6px solid var(--primary)}
    .logo{width:88px;height:64px;background:transparent;display:flex;align-items:center;justify-content:center}
    .logo img{max-width:100%;max-height:64px;display:block}
    .title{flex:1}
    .title h1{margin:0;font-size:20px;color:var(--primary);letter-spacing:0.2px}
    .title p{margin:4px 0 0;color:var(--muted);font-size:13px}
    .meta{font-size:12px;color:var(--muted)}
    .section{margin-top:16px;background:var(--card);padding:14px;border-radius:10px;box-shadow:0 6px 18px rgba(12,18,35,0.03)}
    .section h2{margin:0 0 12px;font-size:15px;color:var(--accent)}
    .top-grid{display:grid;grid-template-columns:1fr 340px;gap:14px}
    .transcript{white-space:pre-wrap;color:#111827;font-size:14px;padding:8px;border-radius:8px;background:linear-gradient(180deg,#fff,#fbfdff);border:1px solid #eef4fb}
    .donut-grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start}
    .donut-card{width:150px;height:150px;padding:10px;border-radius:8px;background:linear-gradient(180deg,#fff,#fbfdff);display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #eef4fb}
    .donut-card canvas{width:84px!important;height:84px!important}
    .donut-label{margin-top:8px;font-size:12px;color:var(--muted);text-align:center}
    table.vocab, table.grammar{width:100%;border-collapse:collapse;font-size:13px}
    table.vocab th, table.vocab td, table.grammar th, table.grammar td{padding:8px;border-bottom:1px solid #eef2f7;text-align:left;vertical-align:top}
    table.vocab th, table.grammar th{background:#fbfdff;font-weight:700;color:var(--primary)}
    .coach-list{display:grid;gap:10px}
    .coach-row{display:flex;align-items:center;gap:12px}
    .coach-name{width:180px;font-weight:700;color:var(--accent);font-size:13px}
    .coach-bar{flex:1;height:14px;border-radius:10px;background:#eef6f8;overflow:hidden;position:relative;border:1px solid #e6f0f2}
    .coach-fill{height:100%;border-radius:10px}
    .score-pill{width:48px;text-align:center;font-weight:700}
    .pron{color:var(--muted);font-size:13px;padding:8px;border-radius:8px;background:#fbfdff;border:1px solid #eef4fb}
    .ex-list pre{white-space:pre-wrap;font-family:inherit;font-size:13px}
    footer{margin-top:18px;text-align:center;color:var(--muted);font-size:12px}
    @media print{body{background:white}.report{margin:0;padding:8px}}
  </style>
</head>
<body>
  <div class="report" id="reportRoot">
    <div class="header">
      <div class="logo" id="logoWrap">
        <!-- Logo fallback: will try local ./logo.png first; if absent, try supplied container path -->
        <img id="logoImg" alt="Company Logo" src="" />
      </div>
      <div class="title">
        <h1 id="userName">Speaker Name</h1>
        <p class="meta" id="meetingMeta">Meeting • Transcript</p>
        <div style="margin-top:6px;font-size:12px;color:var(--muted)" id="emailLine"></div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800;color:var(--primary);font-size:18px" id="overallScore">Overall</div>
        <div style="font-size:12px;color:var(--muted)">AI Observations Summary</div>
      </div>
    </div>

    <!-- <div class="section top-grid">
      <div>
        <h2>Transcript</h2>
        <div class="transcript" id="transcriptText"></div>
      </div>
    </div> -->
    <div class="section top-grid">
      <div>
        <h2>Score Overview</h2>
        <div class="donut-grid" id="donutGrid"></div>
      </div>
    </div>

    <div class="section">
      <div>
        <h2>Grammar Corrections</h2>
        <table class="grammar" id="grammarTable">
          <thead><tr><th>Mistake</th><th>Correction</th><th>Explanation</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="section">
        <h2>Vocabulary Booster</h2>
        <table class="vocab" id="vocabTable">
          <thead><tr><th>Word</th><th>Count</th><th>Suggestions</th></tr></thead>
          <tbody></tbody>
        </table>
    </div>

    <div class="section">
      <div>
        <h2>Pronunciation Challenges</h2>
        <div class="pron" id="pronunciationArea">(no pronunciation notes)</div>
      </div>
    </div>
    <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div>
        <h2>Coaching Space</h2>
        <div class="coach-list" id="coachingList"></div>
      </div>
    </div>

    <div class="section">
      <h2>Practice Exercises & Answers</h2>
      <div class="ex-list" id="exerciseArea"></div>
    </div>

    <footer>Generated by Coaching Report • Confidential</footer>
  </div>

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script>
    /* Utility helpers */
    function escapeHtml(s){ if(!s && s!==0) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function getColorForValue(v){
      if(v >= 70) return '#16a34a';   // green
      if(v >= 40) return '#f59e0b';   // yellow
      return '#ef4444';              // red
    }
    function gradientForValue(ctx, colorHex){
      // create horizontal gradient from color to slightly darker
      const g = ctx.createLinearGradient(0,0,120,0);
      // colorHex to rgb fallback:
      g.addColorStop(0, colorHex);
      g.addColorStop(1, colorHex);
      return g;
    }
    /* Render the report using a JS object reportData */
    function renderReport(reportData){
      // Logo loading: prefer ./logo.png (in same dir as HTML), else try known container path.
      const logoImg = document.getElementById('logoImg');
      // try local logo first (relative), then fallback to provided absolute path
      const localLogo = './logo.png';
      const fallback = '/mnt/data/7023591f-1380-4910-b764-fc93a3eea9ce.png';
      // We'll attempt to set both; puppeteer should be able to load local file paths if present
     
      logoImg.src = localLogo;
      logoImg.onerror = () => { logoImg.src = fallback; };
      logoImg.onload = () => { /* ok */ };

      // Header
      document.getElementById('userName').textContent = reportData.speakerName || reportData.speakerEmail || 'Unknown';
      document.getElementById('meetingMeta').textContent = 'Coaching Report';
      document.getElementById('emailLine').textContent = reportData.speakerEmail || '';

      // Transcript
      document.getElementById('transcriptText').textContent = reportData.transcript || '';

      // Overall score: avg of openAiScores or avg of scores values
      let overall = 0;
      if(Array.isArray(reportData.openAiScores) && reportData.openAiScores.length){
        overall = Math.round(reportData.openAiScores.reduce((a,b)=>a+b,0)/reportData.openAiScores.length);
      } else if(reportData.scores){
        const vals = Object.values(reportData.scores);
        overall = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
      }
      document.getElementById('overallScore').textContent = Overall ${overall};

      // Donut charts
      const donutGrid = document.getElementById('donutGrid'); donutGrid.innerHTML = '';
      const scores = reportData.scores || {};
      const entries = Object.entries(scores);
      entries.forEach(([key,value], idx)=>{
        const card = document.createElement('div'); card.className='donut-card';
        const canvasId = donut_${idx};
        card.innerHTML = <canvas id="${canvasId}"></canvas><div class="donut-label">${escapeHtml(
    key.replace(/([A-Z])/g, " $1")
  )}<br/><strong>${value}%</strong></div>;
        donutGrid.appendChild(card);
        // draw after appended
        const ctx = document.getElementById(canvasId).getContext('2d');
        // dataset color based on value mapped to logo palette
        let color = (value >= 70) ? 'var(--teal)' : (value >=40 ? 'var(--sun)' : '#ef4444');
        // fallback convert CSS var:
        color = getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() && value >=70 ? getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() : (value>=40 ? getComputedStyle(document.documentElement).getPropertyValue('--sun').trim() : '#ef4444');

        new Chart(ctx, {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [value, Math.max(0,100-value)],
              backgroundColor: [color, '#eef6fb'],
              borderWidth: 0
            }]
          },
          options: {
            cutout: '72%',
            responsive: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
          }
        });
      });

      // Grammar table
      const gtbody = document.querySelector('#grammarTable tbody'); gtbody.innerHTML = '';
      (reportData.openAiObservations||[]).forEach(obs=>{
        const tr = document.createElement('tr');
        tr.innerHTML = <td><code>${escapeHtml(
          obs.mistake || ""
        )}</code></td><td><strong>${escapeHtml(
    obs.correction || ""
  )}</strong></td><td style="color:var(--muted)">${escapeHtml(
    obs.explanation || ""
  )}</td>;
        gtbody.appendChild(tr);
      });

      // Vocabulary table (supports Vocabulary_Booster or Vocabulary_Booster-like keys)
      const vb = reportData.Vocabulary_Booster || reportData.vocabularyBooster || reportData.Vocabulary_Booster || reportData.Vocabulary_Booster || reportData.Vocabulary_Booster || [];
      const vtbody = document.querySelector('#vocabTable tbody'); vtbody.innerHTML = '';
      (vb||[]).forEach(w=>{
        const tr = document.createElement('tr');
        tr.innerHTML = <td>${escapeHtml(w.word || "")}</td><td>${escapeHtml(
    String(w.occurrences || 0)
  )}</td><td>${escapeHtml((w.suggestions || []).join(", "))}</td>;
        vtbody.appendChild(tr);
      });

      // Pronunciation
      const pron = document.getElementById('pronunciationArea'); pron.innerHTML = '';
      if(reportData.pronunciationChallenge && reportData.pronunciationChallenge.trim()){
        pron.textContent = reportData.pronunciationChallenge;
      } else {
        pron.textContent = '(no pronunciation notes)';
      }

      // Coaching Space: show bar per metric (use scores)
      const coachingList = document.getElementById('coachingList'); coachingList.innerHTML = '';
      entries.forEach(([k,v])=>{
        const row = document.createElement('div'); row.className='coach-row';
        const name = document.createElement('div'); name.className='coach-name'; name.textContent = k.replace(/([A-Z])/g,' $1');
        const barWrap = document.createElement('div'); barWrap.className='coach-bar';
        const fill = document.createElement('div'); fill.className='coach-fill';
        // color gradient based on value
        const base = getColorForValue(v);
        fill.style.width = v + '%';
        // simple gradient left->right from base to slightly darkened
        fill.style.background = linear-gradient(90deg, ${base}, ${shadeColor(
    base,
    -18
  )});
        barWrap.appendChild(fill);
        const pill = document.createElement('div'); pill.className='score-pill'; pill.textContent = ${v}%;
        row.appendChild(name); row.appendChild(barWrap); row.appendChild(pill);
        coachingList.appendChild(row);
      });
      // append coaching textual content if present
      if(reportData.coachingSpace){
        const txt = document.createElement('div'); txt.style.marginTop='10px'; txt.style.color='var(--muted)';
        txt.innerHTML = escapeHtml(reportData.coachingSpace).replace(/\n/g,'<br/>');
        coachingList.appendChild(txt);
      }

      // Exercises: naive markdown-ish rendering using sections split by '---'
      const exArea = document.getElementById('exerciseArea'); exArea.innerHTML = '';
      const mcq = reportData.mcqExercises || reportData.exercises || '';
      if(mcq){
        const sections = mcq.split('---');
        sections.forEach(s=>{
          const block = document.createElement('div'); block.style.marginBottom='10px';
          // if starts with '##' or '###' pick heading
          const lines = s.trim().split('\n');
          if(lines[0] && lines[0].startsWith('#')){
            const h = document.createElement('h3'); h.style.margin='6px 0'; h.textContent = lines[0].replace(/^#+\s*/,'');
            block.appendChild(h);
            const rest = document.createElement('pre'); rest.textContent = lines.slice(1).join('\n');
            block.appendChild(rest);
          } else {
            const pre = document.createElement('pre'); pre.textContent = s.trim();
            block.appendChild(pre);
          }
          exArea.appendChild(block);
        });
      }
    }

    // small color shade helper (hex or rgb)
    function shadeColor(hex, percent) {
      // accept hex like #rrggbb or rgb(...) fallback
      if(hex.startsWith('rgb')) return hex;
      const f = parseInt(hex.slice(1),16), t = percent<0?0:255, p = Math.abs(percent)/100;
      const R = f>>16, G = f>>8 & 0x00FF, B = f & 0x0000FF;
      const newR = Math.round((t - R) * p) + R;
      const newG = Math.round((t - G) * p) + G;
      const newB = Math.round((t - B) * p) + B;
      return rgb(${newR},${newG},${newB});
    }

    // if page loaded with global data, render automatically
    if(window.reportData){
      renderReport(window.reportData);
      setTimeout(()=>{ window._rendered = true; }, 500);
    }
    window.renderReport = renderReport;
  </script>
</body>
</html>

  `;
}

export {
  getAppToken,
  analyzeTextWithOpenAI,
  analyzeContentOpenAI,
  generatePronunciationChallenge,
  generateCoachingSpace,
  parseCoachingSpaceMarkdown,
  Vocabulary_Booster,
  generateMCQs,
  getAssessment,
  listAssessmentsForMeeting,
  listAssessmentsForUser,
  buildReportHtml,
  htmlforpdf,
  getOrganizationPrompts,
  generateDashboardSummary,
};
