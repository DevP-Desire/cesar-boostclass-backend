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
  getOrganizationPrompts,
  generateDashboardSummary,
};
