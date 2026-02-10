// module.exports = async function (console, myQueueItem) {
//     console.log('JavaScript queue trigger function processed work item', myQueueItem);
// };

import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { generateReportPdf } from "./controllers/generatePdf.js";

const myQueueItem = {
  meetingId: 93986496370,
  transcriptId: "eec74be4-9a46-430c-95c6-557e5e8bcab1",
  transcriptUrl:
    "[https://zoom.us/rec/webhook_download/ygR0DCtwCNOP_V3ShzN0ioDpDDwa3cB8XMppOO2n2XLBCARE03YJYOmNq3rZRv1AI73lR70FqgUG1Ta1.pyrFH3EH6PcIDBi8/iIN67ztrlhmT6QotUfqW2Ams4ZJN4siBRzNEoRUqj4YZz45NqJ8hntP3yYrowRZlqsPGFMZWPOpmIzehVLSDE3NMORb6AgkmAOS8sVuAH_NaCIXvvAphtOCDEJRMEgY-9N_bhfgm5aE0Hoq2wHiDGY4pNx6v4qtkEzKpg2aYio3TakngY6UwB1MPYEvXhdFctC-qRp_sUV13NnWQHbvPYzE-eWU57fDfDXkIhbAatCincxUWLcVcZFnZr44Nrb6yAXEqkfpyZ6-bt9cP43FblH5KyVBGsjUtptChU1stZsTx42QCrehUEhav2qIAfNNZt8PrStajQndv0hiL7L-Yvw](https://zoom.us/rec/webhook_download/ygR0DCtwCNOP_V3ShzN0ioDpDDwa3cB8XMppOO2n2XLBCARE03YJYOmNq3rZRv1AI73lR70FqgUG1Ta1.pyrFH3EH6PcIDBi8/iIN67ztrlhmT6QotUfqW2Ams4ZJN4siBRzNEoRUqj4YZz45NqJ8hntP3yYrowRZlqsPGFMZWPOpmIzehVLSDE3NMORb6AgkmAOS8sVuAH_NaCIXvvAphtOCDEJRMEgY-9N_bhfgm5aE0Hoq2wHiDGY4pNx6v4qtkEzKpg2aYio3TakngY6UwB1MPYEvXhdFctC-qRp_sUV13NnWQHbvPYzE-eWU57fDfDXkIhbAatCincxUWLcVcZFnZr44Nrb6yAXEqkfpyZ6-bt9cP43FblH5KyVBGsjUtptChU1stZsTx42QCrehUEhav2qIAfNNZt8PrStajQndv0hiL7L-Yvw)",
  hostEmail: "aryan_desire117@outlook.com",
  organization: "BoostClass",
  download_token:
    "eyJzdiI6IjAwMDAwMSIsInptX3NrbSI6InptX28ybSIsInR5cCI6IkpXVCIsImFsZyI6IkVTMjU2In0.eyJhdWQiOiJXZWJSZWNEb3dubG9hZCIsImFjY291bnRJZCI6IkQxU0RZQ0lyVGZ1WTVmY09wYzBPeHciLCJpc3MiOiJFdmVudENvbnN1bWVyUmVjRG93bmxvYWQiLCJtaWQiOiJkNGpRMEdnYlNDNlNNdzZzaGdsWFB3PT0iLCJleHAiOjE3NzAxODUzOTYsImlhdCI6MTc3MDA5ODk5NiwidXNlcklkIjoiMllBRF9BcHNRRC1GcnVxb1d4TGRMUSJ9._mng_B2lK5Pm-NKmqeoA-XXn4SxN8U8srP3LMNrXfRgIBsyy6IbHW-n_3tkFQ_ljNSHqmaiT8-tQqNk6yJ2hOA",
  meetingName: "Test_Webhook",
  meetingTime: "2026-02-09T07:25:20Z",
  meetingDuration: 0,
};

import { AzureOpenAI } from "openai";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
// const fetch = require("node-fetch");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
const options = { endpoint, apiKey, deployment, apiVersion };

const client = new AzureOpenAI(options);

const assessmentClient = new TableClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
  "AIAnalysis",
  new AzureNamedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT,
    process.env.AZURE_STORAGE_KEY,
  ),
);

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

let fetchFn;
if (typeof globalThis.fetch === "function") {
  fetchFn = globalThis.fetch;
} else {
  try {
    // prefer undici (common on Azure)
    fetchFn = require("undici").fetch;
  } catch (e1) {
    try {
      // fallback to node-fetch (v2 works with require)
      const nf = require("node-fetch");
      fetchFn = nf.default || nf;
    } catch (e2) {
      throw new Error(
        "No fetch available. Install 'undici' or 'node-fetch@2' in your function app.",
      );
    }
  }
}

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

const PROMPTS = {
  ANALYZE_TEXT_WITH_OPENAI: {
    systemPrompt: `
You are an expert English language coach specialized in spoken English, and the learner's CEFR level is {cefrLevel} ({cefrDescription}). 
Please strictly follow the next steps:

---

### Step 1: CLEANING
Internally (in the backend), generate a new text by removing:
- unnecessary repetition of words,
- false starts,
- punctuation artefacts from transcription,
- disfluencies or transcript noise, and
- filler repetitions (like "uh", "um", etc.).
Do **not** change the sentence structure or meaning. Only clean it.

---

### Step 2: ERROR IDENTIFICATION
From the cleaned text, identify **at least 7 grammar or usage errors**, in the **exact order** below. Do not skip or reorder these categories:

1. Mixed conditionals  
2. Past modals for deduction or criticism  
3. Mistakes with modals  
4. Overgeneralization of regular forms  
5. Confusion between countable and uncountable nouns  
6. Subject–verb agreement in complex structures  
7. Wrong use of articles (a/an/the) in abstract/general nouns  
8. Preposition mistakes  
9. Comparatives and superlatives  
10. Present perfect vs. past simple  
11. Quantifier misuse  
12. Verb pattern errors (gerunds and infinitives)

Only detect errors actually present. Do not invent any.

---

### Step 3: OUTPUT FORMAT
For **each** identified mistake:
- Include the **full sentence** where the error occurs.
- Highlight only the incorrect part using [square brackets].
- Ensure both the “mistake” and “correction” fields have at least **8 words**.
- Each object must contain **exactly** the following 4 fields:

\`\`\`json
{
  "mistake": "<full sentence with [error] highlighted>",
  "correction": "<corrected full sentence with [fixed part] highlighted>",
  "explanation": "<brief, clear reason explaining the error and fix, with one similar example>",
  "mistakeType": "<exactly one string from the list below>"
}
\`\`\`

---

### Step 4: MISTAKE TYPE SELECTION RULES

When assigning **mistakeType**, you must select **only one** from the exact list below.  
The string in "mistakeType" must **exactly match** one of these entries — no changes, abbreviations, or new categories allowed:

[
  "Subject-verb agreement errors",
  "Verb tense misuse",
  "Article errors (a, an, the)",
  "Preposition errors",
  "Word order issues",
  "Pronoun reference errors",
  "Pronoun case errors",
  "Pluralization errors",
  "Singular/plural mismatch",
  "Sentence fragments",
  "Run-on sentences",
  "Comma splice errors",
  "Punctuation errors (commas, semicolons, etc.)",
  "Capitalization errors",
  "Spelling errors",
  "Word choice errors (wrong word usage)",
  "Collocation errors (unnatural word combinations)",
  "Idiomatic expression misuse",
  "Modal verb misuse",
  "Conditional clause errors",
  "Comparative/superlative form errors",
  "Infinitive vs. gerund errors",
  "Parallel structure errors",
  "Dangling modifiers",
  "Misplaced modifiers",
  "Determiner errors",
  "Quantifier misuse (few/many, much/some)",
  "Negation errors",
  "Conjunction misuse",
  "Relative clause errors (who/which/that)",
  "Redundancy or wordiness",
  "Sentence structure errors (complex/compound issues)",
  "Consistency errors (person, number, tense)",
  "Style or tone inconsistency",
  "Lexical repetition",
  "Word form errors (noun/verb/adjective confusion)",
  "Incorrect use of passive voice",
  "Lack of coherence or cohesion",
  "Incorrect use of transitional phrases",
  "Improper use of punctuation in quotations",
  "Incorrect use of auxiliary verbs",
  "Countable/uncountable noun errors",
  "Incorrect comparative structure (than/as)",
  "Double negatives",
  "Ellipsis errors (omitting necessary words)",
  "Tag question errors",
  "Subject omission (incomplete clause)",
  "Ambiguity or unclear meaning",
  "Improper formatting (lists, quotations, etc.)",
  "Improper use of emphasis (italics, bold, etc.)"
]

Always choose the **most specific** category that matches the type of mistake (for example:  
- “Modal verb misuse” instead of “Verb tense misuse” if it involves a modal;  
- “Quantifier misuse (few/many, much/some)” instead of “Word choice errors” if quantifiers are wrong).

---

### Step 5: OUTPUT
Return only a valid JSON array of these objects. No plain text, no markdown formatting, no commentary.

---

### FEW-SHOT EXAMPLE
Input:
"I had been working on the report since two hours before the meeting had started, which I hadn’t no idea it would be delayed."

Output:
[
  {
    "mistake": "I had been working on the report [since two hours before the meeting had started], which I hadn’t no idea it would be delayed.",
    "correction": "I had been working on the report [for two hours before the meeting started], which I had no idea would be delayed.",
    "explanation": "‘Since’ is incorrect with a duration. Use ‘for’ with durations like ‘two hours’. Also, the past perfect in the second clause should be simplified for clarity.",
    "mistakeType": "Preposition errors"
  }
]
`,

    userPrompt: `Please analyze the following transcript: "{text}".`,
  },

  // Content Analysis Prompts
  ANALYZE_CONTENT_OPENAI: {
    systemPrompt: `You are a language assessment expert. Analyze the given speech transcript and provide scores for grammar, vocabulary, and topic relevance.
        Please think we need to keep the student motivated, so although realistic the result of the scores need to be positive and encouraging.

Each score should be between 0 and 100.

Return format: [grammar_score, vocabulary_score, topic_score]
Example: [75, 68, 82]

IMPORTANT: Return ONLY the array of three numbers, no additional text or explanation. The answer should start with [ and end with ] and no extra character or text`,

    userPrompt: `Analyze this text and provide three scores (55-100) for vocabulary range, grammar complexity, and fluency 

        Be realistic but encouraging, and follow the CEFR-linked scale described above. 

"{text}" `,
  },

  // Vocabulary Booster Prompts
  VOCABULARY_BOOSTER: {
    systemPrompt: `You are a vocabulary enhancement assistant.

Objective:
Analyze the provided transcript to identify the 5 most frequently used words (excluding common English stopwords) and suggest relevant synonyms for commun speaking in for each to enrich the speaker's vocabulary.
Always include 5 words

Processing steps:
1. Remove all common English stopwords.
2. Count and rank non‑stopword terms by frequency.
3. Select the top 5 most frequent terms.
4. For each term, generate a list of suggested synonyms in commun spoken language using a reliable thesaurus or NLP library (e.g., WordNet).
5. Avoid using technical or outdated synonums; focus on modern, coloquial fluency alternatives.

Output Format strictly:
Return a JSON array of objects, each with:
- "word": the repeated term
- "occurrences": number of times it appears
- "suggestions": an array of relevant synonym strings

i want answer from the proper given below example format only
like from start with [ to end with ] and no any extra character or text
Example:
[
  {
    "word": "speak",
    "occurrences": 4,
    "suggestions": ["talk", "chat", "express", "communicate"]
  },
  {
    "word": "place",
    "occurrences": 3,
    "suggestions": ["location", "spot", "area", "region"]
  }
]`,

    userPrompt: `Please analyze the following transcript: "{text}".`,
  },

  PRONUNCIATION_CHALLENGE: {
    systemPrompt: `You are an English pronunciation expert. You will be given a transcript generated from a student's spoken English using speech-to-text. Sometimes, the system transcribes a word that doesn't make sense in context — this often means the student pronounced a different word incorrectly, and the system misheard it.
Your task is to:
Carefully analyze the transcript line by line.
2. Identify any word that seems to have been misheard due to poor pronunciation.
3. For each case, infer the word the student most likely intended to say.
4. Return only that intended word and its American English IPA pronunciation.

Generate at least 10 words

Format your response exactly like this: "word" (/ipa/) List only the words the student most likely intended to say.

Do not include:
The incorrect transcription
Explanations
Sentence context
Any headings or commentary If everything in the transcript is correct, return nothing.
Cities, towns, and proper nouns.

Expected output:

"light" (/laɪt/)
"doubt" (/daʊt/)
"plant" (/plænt/)
`,
    userPrompt: `Transcript: "{text}"`,
  },

  COACHING_SPACE: {
    systemPrompt: `You are a communication and learning coach.
Your task is to analyze a transcription of a student's spoken English and evaluate their communication style and attitude.
KPIs:
Emotional Tone – Measures emotionally positive or negative expressions. Look for enthusiastic words (“great”, “fun”, “exciting”) or disengaged phrases (“boring”, “I don’t know”, “nothing special”). Higher scores indicate a more engaged and enthusiastic tone. While realistic please make this score encouraging.
Questioning Strategy – Evaluate the learner’s use of questions, considering their role in the conversation. Give credit not only for open-ended or thoughtful questions (e.g., “Why do you think…?”), but also for simple or reactive questions (e.g., “Really?”, “What does that mean?”) that show interest and engagement. If the learner is mostly responding to the teacher, adjust expectations accordingly.
Collaborative Language – Detect inclusive or interactive language (“I agree”, “What do you think?”, “Let’s…”). Higher scores show a cooperative, socially engaged communication style. While realistic please make this score encouraging.
Growth Mindset – Look for signs of resilience, effort, or learning attitude (“I’ll try again”, “It was difficult but…”, “I’m learning”). Higher scores indicate a stronger growth mindset. While realistic please make this score encouraging.

Important:
- Base your analysis only on the content of the transcript. 
- Ignore transcription errors and filler words.
- Use supportive, constructive, and encouraging language.
- Always include **positive reinforcement** and at least one **practical expression** the student could use in each “Coaching Tip”.
- Do not invent things that aren’t evident in the transcript.
- Keep the feedback natural, warm, and motivating. We need to keep the student motivated and engaged.
- Name the student in third person using the variable {studentName}. ex: 'Maria is doing great!... she has an excelent...'

Follow this EXACT format for your response, including line breaks and scores:

# 🎯 Coaching Space Report for {studentName}

## 1️⃣ Emotional Tone – {score}/100
**Analysis:** {2-3 sentences with neutral and supportive observations. Highlight any positive tone or effort.}
**Coaching Tip:** {Offer one constructive suggestion and include an example the student could try, like: “Next time, try using expressions like ‘That was really interesting!’ or ‘I actually enjoyed that part.’”}

## 2️⃣ Questioning Strategy – {score}/100
**Analysis:** {Mention the type and frequency of questions asked, not only open-ended ones. Stay positive and constructive. We need a good result here}
**Coaching Tip:** {Encourage trying new expressions like: “What do you think about…?” or “How would you approach…?” to invite more dialogue.}

## 3️⃣ Collaborative Language – {score}/100
**Analysis:** {Evaluate how inclusive or team-oriented the language is. Avoid framing it as a lack; highlight any positive or potential.}
**Coaching Tip:** {Suggest phrases such as “I totally agree with that” or “Let’s try this together” to help build collaboration.}

## 4️⃣ Growth Mindset – {score}/100
**Analysis:** {Note any signs of effort, reflection, or learning attitude. Celebrate progress, no matter how small.}
**Coaching Tip:** {Recommend expressions like “I’ll give it another try” or “This helped me learn…” to reinforce a growth mindset.}

---
💡 **Overall Recommendations:**
1. {provide a motivational note for the "{studentName}"}
2. {key point from questioning}
3. {key point from collaboration}
4. {key point from growth mindset}`,
    userPrompt: `Student name: "{studentName}"\nTranscript to analyze: "{text}"`,
  },

  // MCQ Generation Prompts
  GENERATE_MCQS: {
    systemPrompt: `You are an educational content specialist creating CEFR-aligned English language exercises. I need you to identity the type of mistake for each Grammar Corrections. 
        here strictly request to create exercises based on the given cefr level,CEFR description and the type of mistake detected. Again remind you that generate exercises based on the type of mistake identified in the grammar corrections module.
so here is the information you need to create exercises
here strictly request to create exercises based on the given cefr level,CEFR description and the provided transcript.

CEFR Level: "{cefrLevel}"
Level Description: {cefrDescription}

{exerciseGuidelines}

IMPORTANT RESTRICTIONS:
- Do NOT use or refer to any images, pictures, or visual cues.
- Do NOT require the student to record audio or compare their pronunciation to a model.
- Do NOT use underlining, highlighting, or any formatting that cannot be displayed in plain Markdown.
- All exercises must be text-based and suitable for delivery in a plain web or app interface.
- Use at least one''fill in the gaps'' exercise

Based on the AI's review, create 5 structured student exercises that are specifically designed for {cefrLevel} level learners.
 Label each task with the skill focus (e.g., grammar, vocabulary, writing), and provide answer keys for each. here provide excercise which are generally in the Cambridge Learner Corpus (CLC) and Cambridge English Profile (CEP).
. Now give me Exerciser in given blow format.

### Requirements

1. **Exercises based on type of mistakes** (2 exercises)
   - note that student level is b2, and Use similar examples from the type of mistakes (but not the same) that are in the top ten grammar observations (use a complexity: B2 level), but do not reuse the exact same sentences. 
   - Each exercise must have:
     - A **title** (use Markdown heading syntax)
     - An **objective** (as a short description)
     - A **task**
 
2. **Pronunciation Exercise** (1 exercise)
   - Focus on the student's pronunciation issues.
   - Include a **short explanation** of the issue, **example words or sentences**, and an **activity** involving repetition or self-recording. Please display the IPA (International Phonetic Alphabet) for practicing. (e.g "thought" → /θɔːt/, "apple" → /ˈæp.əl/)

3. **Grammar-Focused Exercises** (2 exercises)
   - Each should have a **title**, **objective**, and a **fill-in-the-blank or rewriting task**.

4. **Corrections (Separate Section)**
   - Label each subsection to match the exercises exactly, for example:
     
\`\`\`
## EXERCISES (STUDENT VERSION)

### Exercise 1: [Title]
...
### Exercise 2: [Title]
...
### Exercise 3: [Title]
...
### Exercise 4: [Title]
...
### Exercise 5: [Title]

## CORRECTIONS

### Corrections for Exercise 1: [Title]
...
### Corrections for Exercise 2: [Title]
...
### Corrections for Exercise 3: [Title]
...
### Corrections for Exercise 4: [Title]
...
### Corrections for Exercise 5: [Title]
\`\`\`

Do not use JSON. Do not include extra commentary.`,

    userPrompt: `Here is the user transcript: "{text}". Observations by AI: "{openAiObservations}".`,
  },
};

function getPrompt(promptKey, variables = {}, dynamicPrompt = {}) {
  const prompt = PROMPTS[promptKey];
  if (!prompt && !dynamicPrompt) {
    throw new Error(`Prompt not found: ${promptKey}`);
  }

  let systemPrompt = dynamicPrompt || prompt.systemPrompt;
  let userPrompt = prompt.userPrompt;

  // Replace variables in both prompts
  Object.keys(variables).forEach((key) => {
    const placeholder = `{${key}}`;
    systemPrompt = systemPrompt.replace(
      new RegExp(placeholder, "g"),
      variables[key] || "",
    );
    userPrompt = userPrompt.replace(
      new RegExp(placeholder, "g"),
      variables[key] || "",
    );
  });

  return {
    systemPrompt,
    userPrompt,
  };
}

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
      ENABLE_VOCABULARY_BOOSTER: entity.ENABLE_VOCABULARY_BOOSTER !== false,
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
      orgPrompts.ANALYZE_TEXT_WITH_OPENAI,
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
    console.log(`[analyzeTextWithOpenAI] Error: ${error.message}`);
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
      orgPrompts.ANALYZE_CONTENT_OPENAI,
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
        /\[?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]?/,
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
        error.response.data,
      );
    }
    return [0, 0, 0];
  }
}

async function generatePronunciationChallenge(transcript, orgPrompts = {}) {
  const prompts = getPrompt(
    "PRONUNCIATION_CHALLENGE",
    { text: transcript },
    orgPrompts.PRONUNCIATION_CHALLENGE,
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
    console.log(`[generatePronunciationChallenge Error] ${error.message}`);
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
    orgPrompts.COACHING_SPACE,
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
        `[generateCoachingSpace Error] Status: ${error.response.status}`,
      );
      console.log(
        `[generateCoachingSpace Error] Data: ${JSON.stringify(
          error.response.data,
        )}`,
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
      orgPrompts.VOCABULARY_BOOSTER,
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
  orgPrompts = {},
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
      orgPrompts.GENERATE_MCQS,
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

export async function upsertAssessment(
  meetingId,
  transcriptId,
  userEmail,
  data,
  organization,
  status = "completed", // default for backward compatibility
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

async function getOrgUsers(tableClient, organization) {
  const users = [];
  const entities = tableClient.listEntities({
    queryOptions: { filter: `organization eq '${organization}'` },
  });
  for await (const entity of entities) {
    users.push({
      email: entity.email,
      name: entity.name,
      zoomUsername: (entity.zoomUsername || "").trim().toLowerCase(),
      teamsUsername: (entity.teamsUsername || "").trim().toLowerCase(),
    });
  }
  return users;
}

async function getOrgTokens(tableTokens, organization) {
  try {
    const entity = await tableTokens.getEntity("token", organization);
    // Add support for org logo (imageUrl)
    return {
      tokens: parseInt(entity.value || 0, 10),
      orgLogo: entity.imageUrl || null,
    };
  } catch (err) {
    // If not found, treat as 0 tokens and no logo
    return {
      tokens: 0,
      orgLogo: null,
    };
  }
}

// Helper: Deduplicate by name, prefer mapped email
const deduplicateUsers = (users) => {
  const seen = new Map();
  users.forEach((user) => {
    const key = user.name?.trim().toLowerCase();
    if (
      !seen.has(key) ||
      (user.id && user.id !== "unknown" && seen.get(key).id === "unknown")
    ) {
      seen.set(key, user);
    }
  });
  return Array.from(seen.values());
};

export async function generateAIAnalysis(payload) {
  const { id, name, text, meetingId, transcriptId, organization } = payload;
  console.log("ai processing started for ", name);

  const cefrLevel = "B2";

  const results = {};
  const orgPrompts = await getOrganizationPrompts(organization);
  // console.log("org prompt :", JSON.stringify(orgPrompts));

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
    // io.emit("assessmentStatus", {
    //   meetingId,
    //   transcriptId,
    //   userEmail: id,
    //   status: "pending",
    // });
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

  console.log("ai data: ", JSON.stringify(speakerAssessment));

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
    // io.emit("assessmentStatus", {
    //   meetingId,
    //   transcriptId,
    //   userEmail: id,
    //   status: "completed",
    // });
    // console.log("Saved assessment to table for ", id);
    try {
      let entity;
      try {
        entity = await tableTokens.getEntity("token", organization);
      } catch {
        entity = { partitionKey: "token", rowKey: organization, value: 0 };
      }
      const current = parseInt(entity.value || 0);
      if (current <= 0) return;
      const newTotal = current - 1;
      await tableTokens.upsertEntity(
        { partitionKey: "token", rowKey: organization, value: newTotal },
        "Merge",
      );
    } catch (err) {
      return;
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
    // io.emit("assessmentStatus", {
    //   meetingId,
    //   transcriptId,
    //   userEmail: id,
    //   status: "completed",
    // });
    console.error("Error saving assessment to Azure Table:", err);
    // still return result, but log
  }

  // console.log("Speaker Assessment:", speakerAssessment);

  return speakerAssessment;
}

async function sendAssessmentMail(
  email,
  meeting,
  transcript,
  reportData,
  organization,
  orgLogo,
) {
  if (!email || !reportData)
    return;

  try {
    const pdfBuffer = await generateReportPdf({
      reportData: reportData,
      meeting: meeting,
      transcript: transcript,
      organization,
      orgLogo,
    });

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
      subject: "Your Assessment Report is Ready",
      html: `
        <p>Hello,</p>
        <p>Your assessment report for meeting <b>${
          meeting.subject || ""
        }</b> is ready.</p>
        <p>Recording Id: ${transcript.id}</p>
        <p>Regards,<br/>BoostClass AI</p>
      `,
      attachments: [
        {
          filename: `Assessment_Report_${
            reportData.speakerName || "report"
          }.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
  }
}

const azurefunction = async (myQueueItem) => {
  console.log("Queue trigger started", myQueueItem);

  try {
    const job =
      typeof myQueueItem === "string" ? JSON.parse(myQueueItem) : myQueueItem;

    const {
      meetingId,
      transcriptId,
      transcriptUrl,
      hostEmail,
      organization,
      download_token,
      meetingName,
      meetingTime,
      meetingDuration,
    } = job;

    if (!transcriptUrl || !organization) {
      console.log("Missing transcriptUrl or organization");
      return;
    }

    // const res = await fetch(transcriptUrl, {
    //   headers: {
    //     Authorization: `Bearer ${download_token}`,
    //   },
    // });

    // if (!res.ok) {
    //   console.log("Transcript download failed:", res.status, res.statusText);
    //   return;
    // }

    // const vttText = await res.text();
    const vttText = `WEBVTT

1
00:00:10.350 --> 00:00:19.770
César Jiménez Millán: Hello, everyone, we are testing that, so I have to speak a bit in English, and then we will see if I'm asked to practice something or not.

2
00:01:00.440 --> 00:01:02.750
César Jiménez Millán: Recording in progress.

3
00:01:18.360 --> 00:01:19.689
César Jiménez Millán: Which, you know, let's…

4
00:01:43.070 --> 00:01:55.729
César Jiménez Millán: Okay, so let's see what's happening, and let's try… let's do our best to try to understand what the other is missing. Yesterday, at the call, we'll have more news.

`;
    const data = parseVTTtoJSON(vttText);
    // console.log("data: ", JSON.stringify(data));

    const userMappedTranscriptArray = mapTranscriptBySpeakerArray(data);
    // console.log(
    //   "userMappedTranscriptArray: ",
    //   JSON.stringify(userMappedTranscriptArray),
    // );

    const orgUsers = await getOrgUsers(tableClient, organization);
    // console.log("orgUsers: ", JSON.stringify(orgUsers));

    // Get tokens and org logo together
    const orgTokenResult = await getOrgTokens(tableTokens, organization);
    const orgTokens = orgTokenResult.tokens;
    const orgLogo = orgTokenResult.orgLogo;

    // 1. Fetch notification settings for the organization
    let notificationSettings = {};
    try {
      notificationSettings = await tableTokens.getEntity("token", organization);
    } catch (err) {
      console.log("No notification settings found for org:", organization);
      notificationSettings = {};
    }

    const notificationEnabled =
      notificationSettings.notificationEnabled === true;
    const notificationSubject =
      notificationSettings.notificationSubject ||
      "Unmapped Students - BoostClass Report Not Generated";
    const notificationMessage =
      notificationSettings.notificationMessage || "<p>Unmapped user list:</p>";
    const notificationSignatureHtml =
      notificationSettings.notificationSignatureHtml || "";

    const transcriptUsers = userMappedTranscriptArray.map((item) => ({
      name: item.name,
      text: item.text,
    }));

    // 3. Map transcript users to org users by platform username (zoomUsername / teamsUsername)
    const usernameField = "zoomUsername";

    const mappedUsers = transcriptUsers
      .map((item) => {
        const itemKey = (item.name || "").trim().toLowerCase();

        // Try to match by the platform-specific username stored on the org user first
        let matchedOrgUser = orgUsers.find((u) => {
          const uname = (u[usernameField] || "")
            .toString()
            .trim()
            .toLowerCase();
          return uname && itemKey && uname === itemKey;
        });

        // Fallback: match by display name if username match not found
        if (!matchedOrgUser) {
          matchedOrgUser = orgUsers.find(
            (u) =>
              u.name &&
              item.name &&
              u.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
          );
        }

        // console.log("matchedusers: ", JSON.stringify(matchedOrgUser));

        // Only consider if matched user is a student
        if (
          matchedOrgUser &&
          (matchedOrgUser.role || "").toLowerCase() !== "student"
        ) {
          // Not a student, skip mapping
          return null;
        }

        return {
          id:
            matchedOrgUser?.email?.toLowerCase() ||
            // matchedParticipant?.id?.toLowerCase() ||
            "unknown",
          name: item.name,
          text: item.text,
        };
      })
      .filter(Boolean);

    // 4. Deduplicate by name, prefer mapped email
    const dedupedUsers = deduplicateUsers(mappedUsers);

    // console.log("dedupedUsers: ", JSON.stringify(dedupedUsers));

    const unmappedUsers = dedupedUsers.filter(
      (user) => !user.id || user.id === "unknown",
    );
    console.log(
      "unmapped users (no email match):",
      JSON.stringify(unmappedUsers),
    );

    const mappedUsersOnly = dedupedUsers.filter(
      (user) => user.id && user.id !== "unknown",
    );
    console.log("mappedUsers: ", JSON.stringify(mappedUsersOnly));

    // Check if enough tokens are available for all deduped users
    if (orgTokens < dedupedUsers.length) {
      console.log(
        `❌ Not enough tokens for organization: ${organization}. Required: ${dedupedUsers.length}, Available: ${orgTokens}. Skipping auto-report.`,
      );
      return;
    }

    // 5. Generate AI reports in parallel and store in DB
    await Promise.all(
      dedupedUsers.map(async (user) => {
        if (!user.id || user.id === "unknown") {
          console.log(`Skipping user with unknown email: ${user.name}`);
          return;
        }
        try {
          // const reportData = await generateAIAnalysis({
          //   id: user.id,
          //   name: user.name,
          //   text: user.text,
          //   meetingId,
          //   transcriptId,
          //   organization,
          // });

          const reportData = {
            speakerEmail: "cesar.jimenez@go-teach.ai",
            speakerName: "César Jiménez Millán",
            scores: {
              emotionalTone: 85,
              collaborativeLanguage: 80,
              growthMindset: 85,
            },
            openAiObservations: [
              {
                mistake:
                  "Developer this site, and I hope this is the last meeting to taste, because I am tasting the webhook part, and after the meeting is completed, transcript is ready, I'm getting the notification, and after that I am sending that notification into the Azure function, and creating the AI report, and also sending the mail to the user and the teacher also.",
                correction:
                  "I am developing this site, and I hope this is the last meeting to test, because I am tasting the webhook part, and after the meeting is completed, transcript is ready, I'm getting the notification, and after that I am sending that notification into the Azure function, and creating the AI report, and also sending the mail to the user and the teacher also.",
                explanation:
                  "The sentence begins with 'Developer this site' which improperly uses a noun as if it were the correct verb form. The corrected version uses the progressive form 'I am developing' to properly express the action. This error is very common for Latin speakers due to direct translation patterns.",
                mistakeType: "word order influenced by Spanish",
              },
              {
                mistake: "after the meeting is completed, transcript is ready",
                correction:
                  "after the meeting is completed, the transcript is ready",
                explanation:
                  "The phrase is missing the definite article before 'transcript'. Adding 'the' clarifies that a specific transcript is being referred to. This error is very common for Latin speakers.",
                mistakeType: "article misuse",
              },
              {
                mistake:
                  "So I'm just checking this part, that this works fine.",
                correction: "So I'm just checking that this part works fine.",
                explanation:
                  "The clause is misordered by inserting an unnecessary 'this part, that'. Reordering to 'checking that this part works fine' provides a clearer construction. This error is very common for Latin speakers due to influence from Spanish word order.",
                mistakeType: "word order influenced by Spanish",
              },
              {
                mistake: "sending that notification into the Azure function",
                correction: "sending that notification to the Azure function",
                explanation:
                  "The preposition 'into' is incorrectly used in this context. The correct preposition is 'to' when indicating the destination of a notification, as in 'sending that notification to the Azure function'.",
                mistakeType: "preposition mistakes",
              },
              {
                mistake: "sending the mail to the user and the teacher also",
                correction: "sending an email to the user and the teacher",
                explanation:
                  "In this context, 'mail' should be treated as a countable noun referring to an individual message, so it is better to say 'an email'. This kind of countable versus uncountable noun confusion is very common for Latin speakers.",
                mistakeType: "countable vs uncountable nouns",
              },
              {
                mistake: "I am tasting the webhook part",
                correction: "I am testing the webhook part",
                explanation:
                  "The verb 'tasting' is mistakenly used instead of 'testing', which is appropriate when evaluating technical functionality. This lexical choice error can frequently appear when words with similar forms and sounds are confused.",
                mistakeType: "verb pattern errors (gerund vs infinitive)",
              },
              {
                mistake:
                  "and creating the AI report, and also sending the mail to the user and the teacher also.",
                correction:
                  "and creating the AI report, and sending the mail to the user and the teacher.",
                explanation:
                  "The use of 'also' twice in the sentence creates redundancy and disrupts clarity. Removing the extra 'also' results in a smoother sentence structure.",
                mistakeType: "non priority",
              },
            ],
            openAiScores: [65, 70, 65],
            mcqExercises:
              "## EXERCISES (STUDENT VERSION)\n\n### Exercise 1: Correcting Word Order Influences\nObjective: Improve sentence structure by reordering phrases for clarity.\nTask: Rewrite the following sentences to correct word order issues.\n1. Develop this report site by our team.\n2. If are you find the error, tell me.\n3. I enjoy very much to work on projects.\n4. Finish the assignment, I will do it later.\n5. Reading the document, that was interesting.\n\n---\n\n### Exercise 2: Article and Preposition Corrections\nObjective: Practice using the correct articles and prepositions.\nTask: Fill in the blanks with the appropriate article or preposition.\n1. After ___ meeting is over, ___ result is published.  \n2. She submitted ___ email to ___ manager.\n3. I am testing ___ new software.\n4. We are sending the file ___ the server.\n5. They discussed ___ strategy thoroughly.\n\n---\n\n### Exercise 3: Pronunciation Practice\nObjective: Address pronunciation challenges by practicing words with similar complexities.\nExplanation: Many learners have difficulty with certain consonant clusters and vowel sounds. For example, the words “notification” and “function” have sounds that may not exist in your native language. Practice the following:\n- notification → /ˌnəʊtɪfɪˈkeɪʃən/\n- function → /ˈfʌŋk.ʃən/\nTask: Listen carefully to the IPA pronunciations provided. Then, say the following words and sentences aloud three times each. If possible, record yourself to compare your pronunciation.\nWords: notification, function, testing, developing  \nSentences:  \na) I am testing the new function.  \nb) The system sends a notification immediately after processing.\n\n---\n\n### Exercise 4: Present Perfect and Passive Voice Practice\nObjective: Practice forming the present perfect and the passive voice.\nTask: Complete the paragraph by filling in the blanks with the correct form of the verbs in parentheses.\nMy team __________ (complete) the project successfully. The final report __________ (write) by our lead analyst. We __________ (receive) an update from the manager, and a new strategy __________ (develop) by the design team.\n\n---\n\n### Exercise 5: Conditional Sentences Rewriting Practice\nObjective: Enhance your skills in forming conditional sentences by rewriting given sentences.\nTask: Complete the following conditional sentences by filling in the blanks with the correct verb forms.\n1. If it __________ (rain) tomorrow, we __________ (cancel) the event.\n2. If he __________ (study) harder, he __________ (pass) the exam.\n3. If they __________ (invite) us, we __________ (attend) the conference.\n4. If the movie __________ (be) interesting, we __________ (go) to see it.\n5. If you __________ (feel) ill, you __________ (see) a doctor immediately.\n\n---\n\n## CORRECTIONS\n\n### Corrections for Exercise 1: Correcting Word Order Influences\n1. Original: Develop this report site by our team.  \n   Corrected: Our team is developing this report site.\n2. Original: If are you find the error, tell me.  \n   Corrected: If you find the error, tell me.\n3. Original: I enjoy very much to work on projects.  \n   Corrected: I very much enjoy working on projects.\n4. Original: Finish the assignment, I will do it later.  \n   Corrected: I will finish the assignment later.\n5. Original: Reading the document, that was interesting.  \n   Corrected: The document I read was interesting.\n\n---\n\n### Corrections for Exercise 2: Article and Preposition Corrections\n1. After the meeting is over, the result is published.\n2. She submitted an email to the manager.\n3. I am testing the new software.\n4. We are sending the file to the server.\n5. They discussed the strategy thoroughly.\n\n---\n\n### Corrections for Exercise 3: Pronunciation Practice\n- Ensure you articulate the following sounds accurately:\n  • notification: /ˌnəʊtɪfɪˈkeɪʃən/  \n  • function: /ˈfʌŋk.ʃən/  \n- Activity Tip: Repeat each word and sentence at least three times, focusing on the stressed syllables and clear consonant sounds. Compare your pronunciation with the IPA examples as a guide.\n\n---\n\n### Corrections for Exercise 4: Present Perfect and Passive Voice Practice\nCorrect Answers:\nMy team has completed the project successfully.  \nThe final report has been written by our lead analyst.  \nWe have received an update from the manager, and a new strategy has been developed by the design team.\n\n---\n\n### Corrections for Exercise 5: Conditional Sentences Rewriting Practice\nCorrect Answers:\n1. If it rains tomorrow, we will cancel the event.\n2. If he studies harder, he will pass the exam.\n3. If they invite us, we will attend the conference.\n4. If the movie is interesting, we will go to see it.\n5. If you feel ill, you should see a doctor immediately.",
            pronunciationChallenge:
              '"test" (/tɛst/)\n"developed" (/dɪˈvɛləpt/)\n"webhook" (/ˈwɛbhʊk/)\n"notification" (/ˌnoʊtɪfɪˈkeɪʃən/)\n"function" (/ˈfʌŋkʃən/)\n"creating" (/kriˈeɪtɪŋ/)\n"report" (/rɪˈpɔrt/)\n"teacher" (/ˈtiːtʃər/)\n"meeting" (/ˈmitɪŋ/)\n"checking" (/ˈtʃɛkɪŋ/)',
            coachingSpace:
              "# 🎯 Coaching Space Report for César Jiménez Millán\n\n## 1️⃣ Emotional Tone – 85/100\n**Analysis:** César conveys a polite and focused attitude while presenting his technical process. He wraps up his explanation with a courteous “Thank you,” which maintains a positive and respectful tone throughout the class session.  \n**Coaching Tip:** Next time, try using expressions like “I'm really excited about this progress!” or “This part worked out well for me!” to emphasize your engagement and enthusiasm even more.\n\n## 3️⃣ Collaborative Language – 80/100\n**Analysis:** César's explanation is clear and informative, focusing on the technical steps he is taking. While he shares his process, adding a few inviting questions could further enhance a sense of collaboration with peers.  \n**Coaching Tip:** Consider incorporating phrases such as “What do you think about this approach?” or “Let’s review this together,” to encourage more interactive teamwork in the future.\n\n## 4️⃣ Growth Mindset – 85/100\n**Analysis:** The class session shows César actively testing and verifying different components of his project, which demonstrates a strong willingness to learn and improve. His methodical approach to checking system functionality illustrates a commendable growth mindset.  \n**Coaching Tip:** Using expressions like “I’ll give it another try if needed” or “This test helped me learn more about the process,” can reinforce your dedication to continuous improvement and learning.",
            Vocabulary_Booster: [
              {
                word: "meeting",
                occurrences: 2,
                suggestions: ["gathering", "session", "conference", "huddle"],
              },
              {
                word: "part",
                occurrences: 2,
                suggestions: ["piece", "section", "segment", "portion"],
              },
              {
                word: "notification",
                occurrences: 2,
                suggestions: ["alert", "notice", "message", "update"],
              },
              {
                word: "sending",
                occurrences: 2,
                suggestions: [
                  "forwarding",
                  "delivering",
                  "mailing",
                  "transmitting",
                ],
              },
              {
                word: "also",
                occurrences: 2,
                suggestions: ["too", "as well", "additionally", "furthermore"],
              },
            ],
          };

          await sendAssessmentMail(
            "aryan_desire117@outlook.com",
            { subject: meetingName, duration: meetingDuration },
            { id: transcriptId, recording_end: meetingTime },
            reportData,
            organization,
            orgLogo, // Pass orgLogo here
          );
        } catch (error) {
          console.log(
            "Error generating AI analysis for user:",
            user.name,
            error,
          );
        }
      }),
    );

    // --- Send email to host if there are unmapped users ---
    if (
      unmappedUsers.length > 0 &&
      job.hostEmail &&
      notificationEnabled // <-- Only send if enabled
    ) {
      // Compose email
      const transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.OUTLOOK_EMAIL,
          pass: process.env.OUTLOOK_PASSWORD,
        },
      });

      const meetingDate = new Date(job.meetingTime || Date.now());
      const formattedDate = meetingDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = meetingDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const unmappedListHtml = `
  <ul>
    ${unmappedUsers.map((u) => `<li>${u.name}</li>`).join("")}
  </ul>
`;

      const fullHtml = `
  <div style="font-family: Arial, sans-serif; color: #222; font-size: 16px;">
    <h3 style="margin-bottom: 0.2em;">Meeting: ${job.meetingName || "Meeting"}</h3>
    <div style="margin-bottom: 1em; color: #555;">
      <strong>Date:</strong> ${formattedDate}<br/>
      <strong>Time:</strong> ${formattedTime}
    </div>
    <div style="margin-bottom: 1em;">
      ${notificationMessage}
    </div>
    <div style="margin-bottom: 1em;">
      ${unmappedListHtml}
    </div>
    ${
      notificationSignatureHtml
        ? `<div style="margin-top:2em; border-top:1px solid #eee; padding-top:1em;">${notificationSignatureHtml}</div>`
        : ""
    }
  </div>
`;

      const mailOptions = {
        from: '"BoostClass" <Info@go-teach.ai>',
        to: job.hostEmail,
        subject: notificationSubject,
        html: fullHtml,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("Unmapped users email sent to host:", job.hostEmail);
      } catch (err) {
        console.error("Failed to send unmapped users email:", err);
      }
    } else if (unmappedUsers.length > 0 && !notificationEnabled) {
      console.log(
        `Notification is disabled for organization: ${organization}. Email not sent.`,
      );
    }

    console.log("✅ Queue job processed:", transcriptId);
  } catch (err) {
    console.log("❌ Worker error:", err);
    throw err;
  }
};

azurefunction(myQueueItem);
