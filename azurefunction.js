// module.exports = async function (console, myQueueItem) {
//     console.log('JavaScript queue trigger function processed work item', myQueueItem);
// };

import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
// import { generateReportPdf } from "./controllers/generatePdf.js";

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
  const safeOrg = String(organization || "").replace(/'/g, "''");
  const entities = tableClient.listEntities({
    queryOptions: { filter: `organization eq '${safeOrg}'` },
  });
  for await (const entity of entities) {
    users.push({
      partitionKey: entity.partitionKey,
      rowKey: entity.rowKey,
      email: entity.email,
      name: entity.name,
      role: entity.role,
      zoomUsername: (entity.zoomUsername || "").trim().toLowerCase(),
      teamsUsername: (entity.teamsUsername || "").trim().toLowerCase(),
      assignedTeachers: entity.assignedTeachers,
    });
  }
  return users;
}

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const normalizeEmailArray = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeEmail).filter(Boolean)));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map(normalizeEmail).filter(Boolean)));
      }
    } catch {
      return Array.from(
        new Set(trimmed.split(/[;,]/g).map(normalizeEmail).filter(Boolean)),
      );
    }
  }

  return [];
};

function mapTranscriptUsersToOrgUsers(
  transcriptUsers,
  availableOrgUsers,
  usernameField,
) {
  const pickCandidatesByRole = (name, role) => {
    const key = (name || "").trim().toLowerCase();
    const roleKey = String(role || "").toLowerCase();

    const byUsername = availableOrgUsers.filter((u) => {
      const uname = (u[usernameField] || "")
        .toString()
        .trim()
        .toLowerCase();
      return (
        String(u.role || "").toLowerCase() === roleKey &&
        uname &&
        key &&
        uname === key
      );
    });

    if (byUsername.length > 0) return byUsername;

    return availableOrgUsers.filter(
      (u) =>
        String(u.role || "").toLowerCase() === roleKey &&
        u.name &&
        name &&
        u.name.trim().toLowerCase() === key,
    );
  };

  const pickCandidatesAnyRole = (name) => {
    const key = (name || "").trim().toLowerCase();

    const byUsername = availableOrgUsers.filter((u) => {
      const uname = (u[usernameField] || "")
        .toString()
        .trim()
        .toLowerCase();
      return uname && key && uname === key;
    });

    if (byUsername.length > 0) return byUsername;

    return availableOrgUsers.filter(
      (u) => u.name && name && u.name.trim().toLowerCase() === key,
    );
  };

  const primaryTranscriptTeacherEmail = (() => {
    for (const item of transcriptUsers) {
      const teacherCandidates = pickCandidatesByRole(item.name, "teacher");
      if (teacherCandidates.length > 0) {
        const email = normalizeEmail(teacherCandidates[0]?.email);
        if (email) return email;
      }
    }
    return null;
  })();

  const assignmentPairs = [];

  const mappedUsers = transcriptUsers.map((item) => {
    const candidates = pickCandidatesByRole(item.name, "student");

    if (!candidates.length) {
      const nonStudentCandidates = pickCandidatesAnyRole(item.name).filter(
        (u) => String(u.role || "").toLowerCase() !== "student",
      );

      if (nonStudentCandidates.length === 1) {
        const matchedOrgUser = nonStudentCandidates[0];
        const assignedTeachers = normalizeEmailArray(
          matchedOrgUser.assignedTeachers,
        );
        const normalizedEmail = normalizeEmail(matchedOrgUser.email);

        return {
          id: normalizedEmail || "unknown",
          name: item.name,
          text: item.text,
          role: matchedOrgUser?.role || "",
          assignedTeachers,
        };
      }
    }

    if (!candidates.length) {
      return {
        id: "unknown",
        name: item.name,
        text: item.text,
        role: "",
        assignedTeachers: [],
      };
    }

    let matchedOrgUser = null;

    if (candidates.length === 1) {
      matchedOrgUser = candidates[0];
    } else {
      const teacherMatchedCandidates = candidates.filter((c) => {
        const assigned = normalizeEmailArray(c.assignedTeachers);
        return (
          primaryTranscriptTeacherEmail &&
          assigned.includes(primaryTranscriptTeacherEmail)
        );
      });

      if (teacherMatchedCandidates.length === 1) {
        matchedOrgUser = teacherMatchedCandidates[0];
      } else if (teacherMatchedCandidates.length === 0) {
        const unassignedCandidates = candidates.filter(
          (c) => normalizeEmailArray(c.assignedTeachers).length === 0,
        );

        if (unassignedCandidates.length === 1 && primaryTranscriptTeacherEmail) {
          matchedOrgUser = unassignedCandidates[0];
        }
      }
    }

    if (!matchedOrgUser) {
      return {
        id: "unknown",
        name: item.name,
        text: item.text,
        role: "",
        assignedTeachers: [],
      };
    }

    const assignedTeachers = normalizeEmailArray(matchedOrgUser.assignedTeachers);
    const normalizedEmail = normalizeEmail(matchedOrgUser.email);
    const currentTeacher = assignedTeachers[0] || null;
    let effectiveAssignedTeachers = assignedTeachers;

    // Auto-assign/reassign when transcript teacher differs from current student teacher.
    if (
      normalizedEmail &&
      normalizedEmail !== "unknown" &&
      primaryTranscriptTeacherEmail &&
      currentTeacher !== primaryTranscriptTeacherEmail
    ) {
      assignmentPairs.push({
        studentEmail: normalizedEmail,
        teacherEmail: primaryTranscriptTeacherEmail,
      });

      // Keep mapped users in sync with auto-assignment in the same run.
      effectiveAssignedTeachers = [primaryTranscriptTeacherEmail];
    }

    return {
      id: normalizedEmail || "unknown",
      name: item.name,
      text: item.text,
      role: matchedOrgUser?.role || "",
      assignedTeachers: effectiveAssignedTeachers,
    };
  });

  return {
    mappedUsers,
    teacherAssignments: Array.from(
      new Map(
        assignmentPairs.map((pair) => [
          `${pair.studentEmail}__${pair.teacherEmail}`,
          pair,
        ]),
      ).values(),
    ),
  };
}

async function applyTeacherAssignmentsToUsers(
  assignmentPairs,
  availableOrgUsers,
) {
  const normalizedPairs = Array.from(
    new Map(
      (assignmentPairs || [])
        .map((pair) => ({
          studentEmail: normalizeEmail(pair?.studentEmail),
          teacherEmail: normalizeEmail(pair?.teacherEmail),
        }))
        .filter((pair) => pair.studentEmail && pair.teacherEmail)
        .map((pair) => [`${pair.studentEmail}__${pair.teacherEmail}`, pair]),
    ).values(),
  );

  if (!normalizedPairs.length) return;

  const usersByEmail = new Map(
    (availableOrgUsers || []).map((u) => [normalizeEmail(u.email), u]),
  );

  for (const pair of normalizedPairs) {
    const student = usersByEmail.get(pair.studentEmail);
    if (!student || !student.partitionKey || !student.rowKey) continue;

    const currentTeachers = normalizeEmailArray(student.assignedTeachers);
    const currentTeacher = currentTeachers[0] || null;
    const nextTeachers = [pair.teacherEmail];

    if (currentTeacher === pair.teacherEmail && currentTeachers.length === 1) {
      continue;
    }

    try {
      await tableClient.upsertEntity(
        {
          partitionKey: student.partitionKey,
          rowKey: student.rowKey,
          assignedTeachers: JSON.stringify(nextTeachers),
        },
        "Merge",
      );

      student.assignedTeachers = nextTeachers;
    } catch (err) {
      console.log(
        "Teacher auto-assignment error:",
        pair.studentEmail,
        pair.teacherEmail,
        err,
      );
    }
  }
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

// async function sendAssessmentMail(
//   email,
//   meeting,
//   transcript,
//   reportData,
//   organization,
//   orgLogo,
// ) {
//   if (!email || !reportData)
//     return;

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
//   } catch (err) {
//   }
// }

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
00:01:19.800 --> 00:01:21.070
César Jiménez Millán: Olarion.

2
00:01:23.090 --> 00:01:24.989
Aryan: Hello, Cesar, hello, how are you?

3
00:01:24.990 --> 00:01:26.409
César Jiménez Millán: Hello, my friend.

4
00:01:33.690 --> 00:01:40.759
César Jiménez Millán: So, how are you? Did you have the chance to see, frankie's problem?

5
00:01:41.640 --> 00:01:45.560
Aryan: Yeah, actually, I see the message,

6
00:01:45.700 --> 00:01:52.090
Aryan: And, in that, I think, message was, like, he was, generating the…

7
00:01:52.510 --> 00:01:56.520
Aryan: auto-report on Monday's call, but is…

8
00:01:56.760 --> 00:02:06.609
Aryan: gives the email on, yesterday, or like that. So, it was the problem, like, what is the actual problem he's facing?

9
00:02:08.530 --> 00:02:10.960
César Jiménez Millán: So, do we know the problem?

10
00:02:12.420 --> 00:02:16.869
Aryan: So basically, the problem related to auto-report part.

11
00:02:19.850 --> 00:02:21.099
César Jiménez Millán: Yeah, hello, Muhammad.

12
00:02:26.610 --> 00:02:29.089
César Jiménez Millán: So, so, yeah, Ariane, I…

13
00:02:29.770 --> 00:02:37.209
César Jiménez Millán: We know that they run the class on Monday, and they received the email yesterday, but do we know, why?

14
00:02:38.020 --> 00:02:52.150
Aryan: Not actually, because, if the… I have sees the logs of the last 3 days, and, like, for the all assessment buttons, like, from the report generating from the tool.

15
00:02:52.150 --> 00:03:08.719
Aryan: It's, generate the reports in between, like, 4 to 5 minutes, and send the reports on the email successfully. So, each part is working absolutely fine. About the auto-report part, yesterday, I think the English organization auto part is disabled.

16
00:03:08.810 --> 00:03:25.799
Aryan: So, auto-report is not generated, for the PHT English organization. But, I have seen the logs yesterday, like, for the yesterday, there are the calls for the HypeKids organization. So, for the HypeKids organization, the auto-report part is working perfectly fine.

17
00:03:28.390 --> 00:03:28.870
César Jiménez Millán: Okay.

18
00:03:30.020 --> 00:03:36.780
César Jiménez Millán: Okay, so we know that for HypeKids, working well, but we know that, for, PitchTeach, it's not working well.

19
00:03:37.180 --> 00:03:44.869
Aryan: Yes, auto-report part, like, when the meeting finishes, they automatically report generation and send to the user.

20
00:03:46.780 --> 00:03:47.980
César Jiménez Millán: Okay, but .

21
00:03:47.980 --> 00:03:58.039
Aryan: There is no any calls in the logs, so even the English organization auto-report, not even has the trigger.

22
00:03:58.270 --> 00:04:15.260
Aryan: So, there are, like, 2 or 3 possibilities. The auto-report part is not working. First, the auto-report button is, disabled. So, yesterday it was disabled, and, today is enabled. So, I think that was the problem.

23
00:04:15.540 --> 00:04:23.009
Aryan: Second one, the host, like, the host is not in the organization, or in the team of our tool.

24
00:04:24.040 --> 00:04:32.970
Aryan: And third one, host is not logged in to our tool, and, not has the four, permissions.

25
00:04:33.320 --> 00:04:40.660
Aryan: It need to be, Like, we have to check the host of the meeting.

26
00:04:40.770 --> 00:04:46.459
Aryan: And we check the host has the four permissions, if yes, then the auto-report pass is triggered.

27
00:04:48.410 --> 00:04:52.170
César Jiménez Millán: So we don't know who the heart is. We cannot see it from our side.

28
00:04:52.590 --> 00:04:53.240
Aryan: Yes.

29
00:04:54.580 --> 00:04:58.500
César Jiménez Millán: Okay, so, so it's…

30
00:04:58.840 --> 00:05:05.670
César Jiménez Millán: Or either, she's not locked in, which is, unlikely, because she uses the tool every day.

31
00:05:07.680 --> 00:05:08.200
Aryan: Okay.

32
00:05:08.200 --> 00:05:13.159
César Jiménez Millán: Okay, and then, the host is outside of the organization, or the host…

33
00:05:13.410 --> 00:05:17.239
César Jiménez Millán: What was the other one? The host.

34
00:05:17.240 --> 00:05:19.549
Aryan: Not even logged in in our tool, like…

35
00:05:21.820 --> 00:05:25.499
César Jiménez Millán: Yeah, okay, I will, I will ask her.

36
00:05:25.810 --> 00:05:34.670
César Jiménez Millán: About it, because yesterday, look, because, I mean, one question… Oh.

37
00:05:36.360 --> 00:05:39.610
César Jiménez Millán: what's the limit for the trigger to be activated? I mean…

38
00:05:39.720 --> 00:05:48.590
César Jiménez Millán: If I have the class today, And I… and I enable… The auto report tomorrow.

39
00:05:50.190 --> 00:05:52.220
César Jiménez Millán: The auto report is going to…

40
00:05:52.350 --> 00:05:57.210
César Jiménez Millán: send the report, I mean, it's going to generate and send the report from today, like, one day before.

41
00:05:57.800 --> 00:06:00.520
Aryan: Not… not actually, because…

42
00:06:00.900 --> 00:06:24.519
Aryan: when the trigger occurs, like, when the meeting ends, we get the notification from the waybook or trigger, like, the meeting is finished for your organization, right? Then, at that time, we check in our database, like, for this organization, auto-report is enabled or not. If it is enabled, we, send this process to the Azure function to done it

43
00:06:24.610 --> 00:06:37.630
Aryan: By automatically, and if, the auto-report pass is disabled, so we are not, going to do any process for that report. We're just ignoring that, notification.

44
00:06:39.850 --> 00:06:43.029
César Jiménez Millán: Yeah, but… What you mean is that the

45
00:06:43.480 --> 00:06:49.279
César Jiménez Millán: will work from the time that I enable the function.

46
00:06:50.860 --> 00:06:53.610
César Jiménez Millán: If the function was, was, disabled.

47
00:06:53.760 --> 00:06:56.540
César Jiménez Millán: Yeah. The trigger is not going to work.

48
00:06:57.050 --> 00:06:58.110
Mohamad: Yes.

49
00:06:58.400 --> 00:07:01.559
César Jiménez Millán: So if I enable the trigger today.

50
00:07:01.700 --> 00:07:04.150
César Jiménez Millán: I mean, if I enable the tool today.

51
00:07:04.360 --> 00:07:09.189
César Jiménez Millán: The calls before today will not work.

52
00:07:09.190 --> 00:07:09.850
Aryan: Yes.

53
00:07:10.700 --> 00:07:29.290
César Jiménez Millán: Okay, and then, because, okay, so that's good. So this is one thing. The other thing is that, most of the meetings that are being run by Frankie are not working because of reasons that we don't really know. I mean, we have, like, 3 options, we have to figure it out. But then, why…

54
00:07:29.290 --> 00:07:35.970
Mohamad: Just one query. Like, it's for auto-report only, right? For the normal report, they can generate a report.

55
00:07:35.970 --> 00:07:42.990
César Jiménez Millán: Yeah, yeah, yeah, yeah, for autoimmport. So, so, so, why she received yesterday?

56
00:07:43.160 --> 00:07:47.990
César Jiménez Millán: They may… the… the… the notification from the day before.

57
00:07:49.640 --> 00:07:50.310
Aryan: No, that's.

58
00:07:50.310 --> 00:07:51.870
César Jiménez Millán: That's… that's the main question.

59
00:07:52.160 --> 00:07:59.179
Aryan: So, the client, get the mail of, like, unmapped users list, or any other mail?

60
00:07:59.460 --> 00:08:00.649
Aryan: Because… Oh, they…

61
00:08:00.650 --> 00:08:01.220
César Jiménez Millán: Okay.

62
00:08:02.550 --> 00:08:05.690
César Jiménez Millán: Yeah, she receives the email, I mean.

63
00:08:05.980 --> 00:08:09.719
César Jiménez Millán: I sent you on the… I don't know if I'm sharing my screen or not.

64
00:08:12.110 --> 00:08:12.800
César Jiménez Millán: Let me see…

65
00:08:12.800 --> 00:08:17.610
Mohamad: These are what I would suggest, like… For the water report part.

66
00:08:18.010 --> 00:08:22.160
Mohamad: We can add our email ID by default to VCC.

67
00:08:23.880 --> 00:08:25.419
Mohamad: It would be easier.

68
00:08:25.930 --> 00:08:26.770
César Jiménez Millán: Yeah, yeah.

69
00:08:26.770 --> 00:08:27.450
Mohamad: audience.

70
00:08:27.760 --> 00:08:44.289
Mohamad: it will reduce our case, like, if you offer any issue regarding any client, like, I am not generating, the report is not generating, or we don't receive any mapping email, we can check with the help of the email ID, like, the email has been trigger or not.

71
00:08:44.920 --> 00:08:45.580
Mohamad: Sweet.

72
00:08:47.270 --> 00:08:51.800
Aryan: We can pass any by default email ID in the BCC, like, for every reports.

73
00:08:52.190 --> 00:09:00.370
Mohamad: Yeah, so it would be… reduce our case, because we need to connect with the client for the email, which the email is not generating, and…

74
00:09:00.700 --> 00:09:15.169
Mohamad: it, it, reduce our time to investigate. We can do that by default from backend, not even we need to show on the UI as well. Just on the backend, we can add our info, I think, so info would work, right?

75
00:09:15.680 --> 00:09:17.280
Mohamad: info related.

76
00:09:18.160 --> 00:09:23.370
César Jiménez Millán: Yeah, yeah, yeah, yeah, info at robot, info at, goTeach.com, yeah, it will work.

77
00:09:23.810 --> 00:09:24.619
Mohamad: Yeah, so I didn't…

78
00:09:24.620 --> 00:09:24.950
César Jiménez Millán: Yeah.

79
00:09:24.950 --> 00:09:31.120
Mohamad: At this point, and we need to do that, so it would reduce our… Time to invest. Yeah.

80
00:09:31.120 --> 00:09:44.010
César Jiménez Millán: Okay, so we can, we can do it. Perfect, thank you, Mumak. So, but regarding this, this, this report, so… Hello, Cesar, I decided not to run the report from today, because I noticed that the reports from Monday

81
00:09:44.080 --> 00:09:51.660
César Jiménez Millán: the reports from Monday, so reports, so more than one, from… did eventually process, and I received email.

82
00:09:52.950 --> 00:09:57.810
César Jiménez Millán: How long should it take for the reports to automatically send after a lesson?

83
00:09:58.450 --> 00:10:01.170
César Jiménez Millán: That's the main point, and if we go here.

84
00:10:01.570 --> 00:10:08.580
César Jiménez Millán: If we go here, and we, yeah, time frame, so from, from today, so from… I mean, let me see…

85
00:10:09.560 --> 00:10:13.099
César Jiménez Millán: 20… no, it was 24, okay. So, from 24th.

86
00:10:13.480 --> 00:10:17.969
César Jiménez Millán: There have been, like, you know, one… No, these ones.

87
00:10:18.500 --> 00:10:20.769
César Jiménez Millán: This one has been generated.

88
00:10:21.480 --> 00:10:22.320
Aryan: Yes.

89
00:10:23.660 --> 00:10:29.180
César Jiménez Millán: Shh, so… Is it possible that they received a… Yo.

90
00:10:29.600 --> 00:10:31.660
César Jiménez Millán: Yeah, because, is it… yeah.

91
00:10:31.660 --> 00:10:50.280
Aryan: these all reports, I have checked in the logs. These all, 6 reports are generated on 24th, around, 2, 2.453, I think, yeah. And, all the reports are sent to the users perfectly fine.

92
00:10:50.280 --> 00:10:56.719
Aryan: in the, time, you have shown over here. Like, in just, 3 to 4 minutes.

93
00:10:56.930 --> 00:11:03.730
Mohamad: Well, Arian, here, the reports are for the meeting that end at that time, or it is the…

94
00:11:04.410 --> 00:11:04.790
Mohamad: older.

95
00:11:04.790 --> 00:11:09.110
Aryan: Triggered by… triggered by assessment button, manually, not the automatic.

96
00:11:09.820 --> 00:11:12.030
César Jiménez Millán: All of them were manual.

97
00:11:12.530 --> 00:11:16.580
Aryan: These old reports are generated by manual, not automatic.

98
00:11:17.470 --> 00:11:25.789
César Jiménez Millán: Okay, okay. So it would be good, maybe she received a different, a different email. She received the, automaped…

99
00:11:25.930 --> 00:11:26.560
César Jiménez Millán: Email?

100
00:11:27.190 --> 00:11:35.190
Aryan: I just want to know about the email, because, I don't know which client got which email, like…

101
00:11:35.190 --> 00:11:40.100
Mohamad: No, Aaron, we have lists, like, which email has been triggered.

102
00:11:40.300 --> 00:11:47.700
Mohamad: From in… like, we can't check from the, like, we are triggering email from the info email, right?

103
00:11:47.700 --> 00:11:48.580
Aryan: Yes.

104
00:11:48.820 --> 00:11:51.500
Mohamad: So it… the email would be visible in.

105
00:11:51.500 --> 00:11:56.379
Aryan: Yeah, in the, in the sand, in the sandy, yeah, in the sandbox, it's visible into…

106
00:11:56.820 --> 00:12:02.910
Mohamad: So, Cesar, can you just open the info, sandbox, and we can just filter out by peaks?

107
00:12:03.140 --> 00:12:19.219
Aryan: Actually, Muhammad, these all PhDs, English, all these 5 or 6 reports are generated and sent to the users, perfectly fine. Because, these all reports are sent to the user, not the, I think Frankie, yeah. Okay.

108
00:12:19.300 --> 00:12:33.629
Aryan: And I have checked that all the reports are sent to the users perfectly, and I don't know about the client. Like, client get which email, because we are not triggering any email to the client.

109
00:12:33.800 --> 00:12:35.200
Aryan: For this part.

110
00:12:36.620 --> 00:12:46.219
Aryan: And I have also checked, there is no auto-trigger, so in the automatically trigger and the unmapped user list, email also not sent to the user.

111
00:12:49.390 --> 00:12:55.730
César Jiménez Millán: Yeah, yeah, yeah. But, but she said that she received an email.

112
00:12:58.850 --> 00:13:00.169
César Jiménez Millán: So, which email?

113
00:13:00.560 --> 00:13:10.649
Aryan: That I want to… that I want to ask, actually, because, these reports are perfectly fine, and the water reports are not, working for the.

114
00:13:10.650 --> 00:13:11.220
Mohamad: Yeah.

115
00:13:11.220 --> 00:13:11.809
Aryan: Speaking to you.

116
00:13:11.810 --> 00:13:22.890
Mohamad: if it's sent from the info, then it would be visible on the info email, right? So we can just filter out, like, if it's visible, then we can see. If it's not.

117
00:13:23.240 --> 00:13:26.679
Mohamad: Maybe she has added in the CC.

118
00:13:27.480 --> 00:13:35.000
Mohamad: her ID, and once user click on the assessment, she receive a report for that. Maybe it's possible.

119
00:13:36.480 --> 00:13:55.019
César Jiménez Millán: Okay, okay, I will ask her for the email that she received, and then we can check it, and I will, I will ask her to connect for 10 minutes, because maybe she's doing something wrong, or because if it is working for their companies, I mean, there is no reason why it's not working for her, but.

120
00:13:55.020 --> 00:14:08.960
Mohamad: I'm just sharing the three possibility that auto-report is not… why not working, so you… so you can, on the call, you can check that why I had shared on the meeting chats, so you can check.

121
00:14:09.640 --> 00:14:11.489
César Jiménez Millán: Okay, perfect, thank you.

122
00:14:11.870 --> 00:14:16.339
César Jiménez Millán: Thank you. Yeah, I mean, if you can add me…

123
00:14:16.600 --> 00:14:25.100
César Jiménez Millán: for every, I mean, at info, no? Info at GoDigital… dot AI.

124
00:14:25.340 --> 00:14:33.980
César Jiménez Millán: For the notifications, for all the notifications, that would be great, because this way we can have all the info on our site, right?

125
00:14:34.930 --> 00:14:37.950
César Jiménez Millán: Which was your… your idea among that, so…

126
00:14:37.960 --> 00:14:39.239
Mohamad: Yeah, you can do it.

127
00:14:39.530 --> 00:14:55.509
Mohamad: And even we can send Jack from the hand inbox, but for the better approach, let's add, by default, to BCC. Like, client can't see that, but we can receive an email, so it would be easier to investigate the case.

128
00:14:55.510 --> 00:14:55.900
César Jiménez Millán: Yeah.

129
00:14:58.200 --> 00:15:10.470
César Jiménez Millán: So, the, other topic, yesterday, you sent me an email, I replied to you, I don't know, did you have the chance to see it? Because, to me,

130
00:15:10.520 --> 00:15:20.750
César Jiménez Millán: I got a lot of problems to really understand it, but I tried to simplify the process, and I don't know if… I mean, I know I changed it a bit.

131
00:15:20.750 --> 00:15:21.550
Aryan: Bye.

132
00:15:21.550 --> 00:15:29.159
César Jiménez Millán: know it, but I think it's simpler now, but I want to understand if you see that the… I mean, the, the, the, the

133
00:15:29.420 --> 00:15:34.549
César Jiménez Millán: Yeah, I mean, the consequences it could have that I don't see.

134
00:15:35.560 --> 00:15:42.019
Mohamad: Like, majorly, the concern was, like, when any meetings have two same-name students.

135
00:15:42.020 --> 00:15:57.600
Mohamad: then how we will map, like, the teachers is also not assigned. So, in that case, if the username is also same on the Zoom, so how we will map? In that case, we had, we had give you a suggestion that we will not map, we will show as unknown.

136
00:15:57.600 --> 00:16:12.140
Mohamad: And once user map, it will… it will link with the Zoom username, and the teacher, once they… they link, the teacher would be also assigned as per the meeting. So that… that part is confirmed.

137
00:16:12.220 --> 00:16:15.860
Mohamad: And I think so it's a proper use case, right?

138
00:16:19.070 --> 00:16:38.599
César Jiménez Millán: Yeah, I mean, so the… the point… so the only problem is that when there are two people with the same… I mean, you said that the problem is when there are two people with the same, name within, in the same class, but I think the problem is going to be two people with the same name under the same teacher.

139
00:16:38.670 --> 00:16:40.639
César Jiménez Millán: No matter if they are in the same class or not.

140
00:16:41.560 --> 00:16:46.789
Mohamad: If there is also a case, like, if not any detail is also not assigned.

141
00:16:47.370 --> 00:17:07.359
Mohamad: That's also one case, like, if no teacher is assigned, then we… we are blank, because even the Zoom username is seen, no teacher is assigned, so in that case, we will show as unknown on the assessment. And on the auto-report part, we will… we will trigger an email, right, Ariane? Yes.

142
00:17:07.369 --> 00:17:10.589
Mohamad: There is not mapped, please map the 2D feature.

143
00:17:11.170 --> 00:17:14.560
César Jiménez Millán: Yeah, but if there is no teacher help, you can send the email.

144
00:17:15.510 --> 00:17:20.709
Mohamad: we can track from the host. We… we are sending the email to the host.

145
00:17:21.420 --> 00:17:27.579
Mohamad: So the host would receive an email that the list of the users are not mapped. Please map them.

146
00:17:32.520 --> 00:17:33.590
César Jiménez Millán: Okay.

147
00:17:36.250 --> 00:17:37.100
Aryan: Good luck.

148
00:17:37.610 --> 00:17:44.029
César Jiménez Millán: So, okay, so let's go step by step. For the first one, if there are two people with the same name.

149
00:17:44.030 --> 00:17:57.209
Mohamad: Like, these are what we can do. Aaron, can you just explain the current scenario, how it is working, and with the help of teacher assignment, how it would be better to map the users and.

150
00:17:57.210 --> 00:17:59.050
Aryan: Just explain the problem.

151
00:17:59.050 --> 00:18:01.389
Mohamad: Current scenario, how system is currently working?

152
00:18:01.390 --> 00:18:15.259
Aryan: Yeah, so the current, major issue is, like, first, like, if we have the same username in our organization, in the team. In the team, we have the two users with the same username.

153
00:18:15.500 --> 00:18:29.800
Aryan: And none of them assign any user, any teacher currently, okay? Then, when the meeting finishes, we check in the meeting that this is the organization teach… this is the teacher, and there is one Caesar.

154
00:18:30.150 --> 00:18:33.620
Aryan: in the, transcript, okay? And…

155
00:18:33.870 --> 00:18:39.990
Aryan: Then we going to map that seizure with our orga… in our organization.

156
00:18:40.160 --> 00:18:45.880
Aryan: In our organization, we found there are two Cesar, same, username.

157
00:18:46.680 --> 00:18:51.100
César Jiménez Millán: And none of them are assigned to any teacher.

158
00:18:51.100 --> 00:18:52.520
Aryan: Any teacher, okay?

159
00:18:52.520 --> 00:18:52.980
César Jiménez Millán: Okay.

160
00:18:52.980 --> 00:18:58.459
Aryan: So, there… there is the conflict to choose which seizure during the mapping.

161
00:18:58.460 --> 00:18:59.300
César Jiménez Millán: Okay, okay.

162
00:18:59.300 --> 00:19:00.989
Aryan: We had a good thing? Yeah, okay.

163
00:19:01.610 --> 00:19:10.890
César Jiménez Millán: Yeah, just wait a second. So, so… So… If we are… assigning.

164
00:19:12.520 --> 00:19:15.619
César Jiménez Millán: A teacher for each student as soon as they have a class.

165
00:19:17.150 --> 00:19:22.200
César Jiménez Millán: It is not going to be possible that there are One student without being assigned.

166
00:19:23.770 --> 00:19:25.319
César Jiménez Millán: So there is no chances for that.

167
00:19:26.190 --> 00:19:29.530
César Jiménez Millán: Because the first… I mean, as soon as you have a glass.

168
00:19:30.090 --> 00:19:32.140
César Jiménez Millán: You will be assigned to a teacher.

169
00:19:32.500 --> 00:19:38.290
Aryan: But for assignment… but for assignment, we have to find the user.

170
00:19:38.400 --> 00:19:48.819
Aryan: to, which user assigned a teacher. But in our organization, we found two users. So, two, which user from these two to assign the teacher.

171
00:19:49.070 --> 00:19:51.630
Aryan: That is the… our, problem.

172
00:19:52.150 --> 00:19:58.130
César Jiménez Millán: Yeah, but, but, Ariane, This cannot happen, because…

173
00:19:58.250 --> 00:20:02.400
César Jiménez Millán: Because… so the only chance that it could happen, if both

174
00:20:02.870 --> 00:20:06.009
César Jiménez Millán: Students with the same name are in the same class, right?

175
00:20:06.400 --> 00:20:10.920
Aryan: not in the same class, if any one user in the class, but

176
00:20:11.130 --> 00:20:24.720
Aryan: from that, we have to just going to auto-assign the teacher, okay? So, from that class, we found that Cesar Aminaz Milan is the username. But in our organization, we found that there are two Cesar M&S Milan usernames.

177
00:20:24.720 --> 00:20:31.149
César Jiménez Millán: How it can be as a human and medium within the organization, which is not assigned a teacher.

178
00:20:31.460 --> 00:20:32.410
Aryan: Yes.

179
00:20:32.410 --> 00:20:36.439
César Jiménez Millán: That's not possible, because… look, look, let me show it to you.

180
00:20:39.850 --> 00:20:46.949
Mohamad: I mean, is there a possibility, like, Zoom usernames could be a duplicate? It is possible?

181
00:20:46.950 --> 00:20:47.620
Aryan: Yes?

182
00:20:48.410 --> 00:20:57.069
Aryan: If currently we are joining, we ask for the, typing the username, and you also type the Arian, so there is a conflict to.

183
00:20:57.070 --> 00:21:02.779
César Jiménez Millán: Okay, okay, okay, okay, yeah, I mean, if, if you type, so if you, if you upload

184
00:21:03.040 --> 00:21:10.420
César Jiménez Millán: the, session with… You know, manually, before having a meeting.

185
00:21:10.610 --> 00:21:25.570
César Jiménez Millán: Yeah, it can be possible that this is, okay, but this is not going to happen. Like, most of the time, because the teachers don't, I mean, the academies don't have, don't have the Zoom ID.

186
00:21:25.980 --> 00:21:32.290
César Jiménez Millán: Right? So, most of the times, they are going to be assigned once they have a class.

187
00:21:33.730 --> 00:21:34.680
César Jiménez Millán: Right?

188
00:21:34.960 --> 00:21:39.590
César Jiménez Millán: So, I don't know if you understood myself or not. So, I mean,

189
00:21:39.650 --> 00:21:53.790
César Jiménez Millán: We start working with, you know, let's do how it will work. So, HypeKids, they upload their list of students. This is the list, okay? Now, there is one class for Olivia.

190
00:21:53.790 --> 00:22:01.750
César Jiménez Millán: Olivia joins the class, and after the class, Olivia is going to be a known, because she has… we don't have the Zoom username.

191
00:22:01.880 --> 00:22:06.260
César Jiménez Millán: Then, no, Olivia's a teacher, sorry, Claire. Claire is going to…

192
00:22:06.510 --> 00:22:14.190
César Jiménez Millán: be, a known here, right? So it's going to be a known. So, Laura Gomez will receive the notification.

193
00:22:14.770 --> 00:22:31.779
César Jiménez Millán: Laura is the teacher. So, Laura, please, you have to map this girl that is called Claire whatever. She come, she go here to Claire Reports, and she, map Claire. And then Claire, we know that Claire, named Claire, will be this, this one.

194
00:22:31.940 --> 00:22:35.889
César Jiménez Millán: Okay, okay, so now Claire is assigned to Laura.

195
00:22:36.120 --> 00:22:40.189
César Jiménez Millán: So, it will always assess. So, if tomorrow, another player

196
00:22:40.260 --> 00:22:55.349
César Jiménez Millán: just, come here, and this, Gaston is called Clare 2. Okay, so the system will know that this is new, this is new, this is… this cannot be this, because, this… this one is not assigned to Laula. This is, assigned to nobody.

197
00:22:55.400 --> 00:23:01.570
César Jiménez Millán: No, nobody knows. This is going to be assigned to the, to the teacher that is running the class.

198
00:23:02.760 --> 00:23:19.530
Aryan: Okay, so this is part for the auto-report. Like, in the auto-report part, this will, gives the notification to teacher to map the user, okay? But if the auto-report is not enabled, and here we go in the class report part.

199
00:23:19.590 --> 00:23:23.359
Aryan: At that time, we are going to map the user with the Zoom username.

200
00:23:23.580 --> 00:23:27.149
Aryan: If not possible, then we map the user with the name.

201
00:23:27.520 --> 00:23:28.130
Aryan: Okay.

202
00:23:28.130 --> 00:23:30.600
Mohamad: Unknown. We map them as unknown, right?

203
00:23:30.600 --> 00:23:33.879
Aryan: Right, and yeah, and then we get the unknown part.

204
00:23:34.160 --> 00:23:41.849
Aryan: And assume, like, you have uploaded or added any, student with these Human Teams username with it.

205
00:23:42.260 --> 00:23:50.380
Aryan: like, in the add participant button or in the bulk upload. You also added the Zoom username or team's username at that time.

206
00:23:50.740 --> 00:23:58.519
Aryan: So, at that time, we have the, two Zoom… same… there may be possibility to two same Zoom usernames.

207
00:24:00.110 --> 00:24:00.630
César Jiménez Millán: Yeah.

208
00:24:01.160 --> 00:24:05.049
César Jiménez Millán: Okay, so is it not possible to generate a notification?

209
00:24:05.150 --> 00:24:12.289
César Jiménez Millán: as soon as… I mean, if we detect that there is, I mean, but this is… but this is very unlikely, guys, so… Yeah.

210
00:24:12.290 --> 00:24:30.809
Mohamad: Yeah, this… I think, Cesar is right. This case would be very lesser chance. Like, in that case, user will just update the username or map the user with their team. So I think we can ignore this case. I don't think so it would occur.

211
00:24:31.280 --> 00:24:47.269
César Jiménez Millán: I mean, they will… they will very occasionally, upload the Zoom username. It will be like… I mean, we have it because we… we need to have it, but it's going to be… I mean, every… every time that a new, student come up.

212
00:24:47.270 --> 00:24:54.150
César Jiménez Millán: It will… it will be semi-automatically assigned to a teacher, because it will come from a class.

213
00:24:55.220 --> 00:25:04.040
César Jiménez Millán: And on top of it, I think we have to take care of the cases where, within the same teacher.

214
00:25:04.510 --> 00:25:08.189
César Jiménez Millán: Within the same teacher database, we have the same name.

215
00:25:08.360 --> 00:25:14.530
César Jiménez Millán: That's an issue, and that's an issue that can happen most likely.

216
00:25:15.510 --> 00:25:15.870
César Jiménez Millán: Right?

217
00:25:15.870 --> 00:25:19.190
Mohamad: If username is there, then we can easily map.

218
00:25:19.950 --> 00:25:20.460
Mohamad: Right?

219
00:25:21.650 --> 00:25:31.959
César Jiménez Millán: Yeah, I imagine you have, you know, a student is Claire, so this, this, I mean, these two students, this is called Laura, and this is called Laura also here, and they belong to Matthew as a teacher.

220
00:25:32.100 --> 00:25:38.839
César Jiménez Millán: So, that's an issue, because after the class, how the system knows if this is this Laura or this other Laura?

221
00:25:39.020 --> 00:25:44.250
César Jiménez Millán: That's the, that's the, the main, you know, .

222
00:25:44.250 --> 00:25:58.300
Mohamad: Yeah, in this case, we, we were, like, two same username would be com, then we will send an email, like, this, these following students are not, mapped. Please map, so user need to manually map that.

223
00:26:01.060 --> 00:26:13.530
César Jiménez Millán: Yeah, but if… they map it. Okay, so this is mapped, and this is mapped. Okay, next time, they have a class, and then they have a class with Laura. Which Laura is it?

224
00:26:17.320 --> 00:26:18.479
César Jiménez Millán: You see my point?

225
00:26:18.670 --> 00:26:21.680
Aryan: Yes. If they both have the same teacher.

226
00:26:22.400 --> 00:26:26.620
César Jiménez Millán: If both have the same teacher, then next day they have Laura and they have Laura.

227
00:26:26.790 --> 00:26:27.819
César Jiménez Millán: Who are they?

228
00:26:28.800 --> 00:26:29.600
César Jiménez Millán: So that, that's…

229
00:26:29.600 --> 00:26:34.049
Mohamad: If both have same name, then we will show only one entry, right, Aria?

230
00:26:35.600 --> 00:26:37.850
Aryan: In short moment.

231
00:26:37.850 --> 00:26:40.679
Mohamad: both have same name, then we will show one entry.

232
00:26:40.680 --> 00:26:46.399
Aryan: Only, only one first entry, like, which is first, coming from the list.

233
00:26:46.430 --> 00:26:47.120
Mohamad: So…

234
00:26:47.120 --> 00:26:47.760
César Jiménez Millán: This one.

235
00:26:47.760 --> 00:26:49.239
Mohamad: So, yeah, to suppose…

236
00:26:49.240 --> 00:26:49.610
César Jiménez Millán: Yeah, sure.

237
00:26:49.610 --> 00:26:55.650
Mohamad: So, we got, the first one, then the next, the below would be not possible.

238
00:26:56.380 --> 00:26:57.730
César Jiménez Millán: Yeah, yeah, so that's a…

239
00:26:57.730 --> 00:27:05.260
Mohamad: This list would be not commonly, like, the teacher also not mapped, the user also not mapped.

240
00:27:05.700 --> 00:27:08.590
César Jiménez Millán: I mean, that's the main problem that we can have.

241
00:27:08.850 --> 00:27:15.349
César Jiménez Millán: Those are louders within the same teacher. So we have to think what to do in there. So we can leave it at risk.

242
00:27:15.450 --> 00:27:18.380
César Jiménez Millán: And, you know, it will happen from time to time.

243
00:27:18.890 --> 00:27:24.229
César Jiménez Millán: Yeah, and then whenever it happens, we will have to do something.

244
00:27:24.600 --> 00:27:25.790
César Jiménez Millán: Like, I, I…

245
00:27:25.790 --> 00:27:33.259
Mohamad: I have one query, like, Arin, do… do we edit the username, or it's… it's generated by the Zoom?

246
00:27:34.500 --> 00:27:39.170
Aryan: Zoom username? It's… it's by us, like, we have to give the name.

247
00:27:39.860 --> 00:27:50.029
Mohamad: So, simply, we can't… we can't give a validation. Is it possible? When user enter, like, if… if it's, if it's already available, we will, at the time of.

248
00:27:50.030 --> 00:27:53.489
Aryan: But is the Zoom… Zoom platform?

249
00:27:54.750 --> 00:28:02.580
Mohamad: No, no, no. In the… in our… when user try to enter, like, manual entry, at that time we can validate, right?

250
00:28:03.620 --> 00:28:04.340
Aryan: Yes?

251
00:28:04.930 --> 00:28:05.440
Aryan: Suppose.

252
00:28:06.430 --> 00:28:08.769
Aryan: Yeah, in the ad participant.

253
00:28:08.770 --> 00:28:14.780
Mohamad: Or bulk upload. If, if user try to upload the same, add same username.

254
00:28:14.960 --> 00:28:21.219
Mohamad: for Zoom or Team, we will validate these two entries are similar. Please check and update accordingly.

255
00:28:21.520 --> 00:28:30.239
César Jiménez Millán: Yeah, I mean, if they… if they upload it manually, that's okay, but again, this is very unlikely, because most of the time, they are not going to do it, right? So it will come from Zoom.

256
00:28:30.720 --> 00:28:31.260
Mohamad: Yeah.

257
00:28:31.980 --> 00:28:46.510
Mohamad: We can… Yeah, for manual process, we can, but for the automatically, only one entry would be visible, and it would be a rarest case, I think so. So we can, we can, yeah, we can, ignore this case, I think.

258
00:28:46.800 --> 00:29:01.400
César Jiménez Millán: I mean, we can ignore it for now, that we have no big volumes, but, I'm thinking that probably, as we have the, matching in our

259
00:29:01.400 --> 00:29:10.849
César Jiménez Millán: I guess in our table or database or something, we have all the teachers with all the students below, teachers with students, you know, I imagine something like this. So, we can apply a rule.

260
00:29:10.880 --> 00:29:15.679
César Jiménez Millán: Not now, but in the future, or think about it, play a role so that

261
00:29:15.910 --> 00:29:19.189
César Jiménez Millán: When there are two students with the same name.

262
00:29:19.370 --> 00:29:22.329
César Jiménez Millán: A notification has to be flagged.

263
00:29:22.330 --> 00:29:22.760
Aryan: That's when…

264
00:29:22.760 --> 00:29:27.960
César Jiménez Millán: to the… I mean, have to be sent to the teacher. Hey, Mr. Teacher, you have two students with the same name.

265
00:29:28.280 --> 00:29:42.369
César Jiménez Millán: So just for him to know, so he can ask the students, one of the students, hey, change your name a bit, because otherwise you're not going to get the report, right? But I mean, something to think about, so it's a problem for the future.

266
00:29:42.510 --> 00:29:47.389
Mohamad: Yeah, I think so. Ari, in this case is any other case that we need to.

267
00:29:47.390 --> 00:30:05.250
Aryan: I also want to, one, case discuss, like, currently, currently what we are doing, like, in the class report, while we are changing the user with the drop-down, at that time, if I change, like, currently, if Cesar is, has the Zoom username Cesar, and

268
00:30:05.250 --> 00:30:22.919
Aryan: then I… if I will change, the drop-down with the taste one. So now, the taste one is, pointing to the Zoom username, Cesar, and the previously, Cesar Zoom username was removed from the Zoom, removed from the Cesar, okay?

269
00:30:23.070 --> 00:30:39.030
Aryan: So… so, like, Zoom username, currently in the first row, it will be now less, and, pointing to other user. So, it, from these, it will only, pointing to,

270
00:30:39.140 --> 00:30:43.819
Aryan: like, only one username from the list. Otherwise, it will remove from the older ones.

271
00:30:44.810 --> 00:30:45.660
Aryan: Thank you.

272
00:30:45.660 --> 00:30:57.080
Mohamad: You are, you are saying, like, you had mapped Cesar username with the Olivia, right? Zoom username Cesar with the Olivia, and suppose,

273
00:30:57.080 --> 00:31:12.019
Mohamad: Clary, Clary, we… what user has do? User has just go to the class report, and against Clary, he had selected, or she has selected, Cesar as a Zoom username. So, you will remove the entry, Olivia…

274
00:31:12.020 --> 00:31:14.680
Aryan: From Olivia and pointing to the clear.

275
00:31:14.680 --> 00:31:16.889
Mohamad: That's… that's correct, I think so. Right, Cesar?

276
00:31:17.160 --> 00:31:18.140
Mohamad: Because…

277
00:31:21.530 --> 00:31:28.410
César Jiménez Millán: I mean, let's go here. So let's do it this way. So now, Cesar Jimenez is here.

278
00:31:28.670 --> 00:31:40.389
César Jiménez Millán: So, imagine that, I have a class with Ariane, and, and we decide that… I mean, we have a class with Cesar Jimenez, and we said, we change it, and we put it in, in Ariane.

279
00:31:40.480 --> 00:31:41.200
Aryan: Yeah, so…

280
00:31:41.200 --> 00:31:48.300
César Jiménez Millán: So then, Zoom username will be here, and this will be empty. So, what… happens.

281
00:31:48.790 --> 00:32:01.650
Aryan: So, in this situation, what I'm doing currently is, before these, all the cases, I'm currently doing is, like, pointing Caesar to the Ariane, and removing scissor from other user.

282
00:32:01.770 --> 00:32:05.409
Aryan: Like, to, like, not have the duplicate values.

283
00:32:05.450 --> 00:32:25.210
Aryan: Like that. So, now, if I will… doing the new development of this auto-assign teacher, at that time, if I change the user, so it will also remove from other users, because if there is a duplicate value, for other user, it will also remove that part, and only pointing to the test one.

284
00:32:26.030 --> 00:32:30.750
César Jiménez Millán: Yeah, that is true. And why, why don't we just,

285
00:32:30.960 --> 00:32:45.619
César Jiménez Millán: make the teacher, I mean, so this cannot be removed or changed, so, in the, in the class reports, right? So, so now we have this…

286
00:32:48.540 --> 00:32:58.690
César Jiménez Millán: Now we have this, this, this class, okay? Imagine this is a class. And then this is Tessa Jimenez, and because this is Tessa Jimenez, we know this is Tesla Jimenez, and we know this is a teacher, right?

287
00:32:58.690 --> 00:32:59.590
Aryan: Sure.

288
00:32:59.590 --> 00:33:03.720
César Jiménez Millán: Why don't we just… Blocked, or enabled.

289
00:33:03.950 --> 00:33:08.680
César Jiménez Millán: the drop-down for the teacher. So, it cannot be changed.

290
00:33:08.680 --> 00:33:23.739
Aryan: Yes, we can do, like, we can disable the dropdown for the teacher, but, assume if our tool is pointing to other ones by mistake, or, like, username is not set for that, user.

291
00:33:24.240 --> 00:33:33.309
Aryan: And if you want to select it from the dropdown, then it will be then not possible to change it. If, once it's pointing to the teacher.

292
00:33:33.410 --> 00:33:38.459
Aryan: It will not, possible to change after it if you want to change.

293
00:33:43.180 --> 00:33:43.570
César Jiménez Millán: Yup.

294
00:33:44.920 --> 00:34:00.959
Aryan: I can do it, right, like, if Cesar image Milan, and Cesar Imanage Milan is perfectly pointing to correct user, and I will disable it, okay? And in if case you want to change it from the top down, then it may be not possible after that.

295
00:34:01.700 --> 00:34:07.670
Mohamad: No, no, we can't do that, I think so, right? Caesar, it would restrict the user.

296
00:34:08.449 --> 00:34:17.589
César Jiménez Millán: I mean, so what you're… so what you are suggesting, or you are asking to just,

297
00:34:17.909 --> 00:34:27.169
César Jiménez Millán: restrict everything, not just the teacher, but everything, right? So once, once the student is, mapped, we cannot change it.

298
00:34:27.350 --> 00:34:41.879
Aryan: No, no, no, no, not like… I want you to just let it be, like, anyone user can change the drop-down, because if you want to change your name by drop-down, you can change it right now.

299
00:34:42.359 --> 00:34:43.219
Mohamad: And…

300
00:34:43.219 --> 00:34:53.609
Aryan: If, assume, like, if, you come over here first time, and user is not mapped, like, it is unknown at the first time, and you select the dropdown, and,

301
00:34:53.920 --> 00:34:54.840
Mohamad: in…

302
00:34:54.840 --> 00:34:59.329
Aryan: Case, by mistake, you choose other teacher in the drop-down.

303
00:34:59.770 --> 00:35:12.690
Aryan: And now you want that, I want to change this teacher to this teacher. Like, I have, by mistake, changed the dropdown. But after assigning to any teacher, you cannot change it.

304
00:35:12.690 --> 00:35:22.950
César Jiménez Millán: Listen, why, why… Don't we… Just, Block everything.

305
00:35:23.390 --> 00:35:27.030
César Jiménez Millán: I mean… Everything that is not unknown.

306
00:35:28.750 --> 00:35:34.750
César Jiménez Millán: Everything that is… so you can only do the drop-down, When there is an unknown.

307
00:35:34.920 --> 00:35:38.170
César Jiménez Millán: Which means that that is the first class you have with this student.

308
00:35:38.510 --> 00:35:39.150
Aryan: Right?

309
00:35:39.300 --> 00:35:42.280
César Jiménez Millán: Otherwise, once it is already mapped.

310
00:35:42.530 --> 00:35:46.239
César Jiménez Millán: We cannot change it. Does it make sense? Does it solve the problem?

311
00:35:46.520 --> 00:36:05.620
Aryan: But if the teacher, by mistake, changed the username with the other user, like, and, just, observe that, I have, by mistake, changed the Laura Gomez with the admin boost class, but I want to eat, like, for test 1. So, after that, it can't change, if we do test 1.

312
00:36:05.620 --> 00:36:13.990
César Jiménez Millán: Yeah, okay, so, I mean, the problem that you are flagging is basically that the teacher selects a different teacher on the drop-down by mistake.

313
00:36:14.420 --> 00:36:15.030
Aryan: Yes.

314
00:36:16.550 --> 00:36:17.110
César Jiménez Millán: Yeah.

315
00:36:17.570 --> 00:36:25.800
César Jiménez Millán: And the consequences would be that if there is another person, another student with the same name in the other teacher.

316
00:36:26.070 --> 00:36:36.399
César Jiménez Millán: they… they would be, merged, right? So, one of them disappeared. The information of one of them would disappear, right?

317
00:36:36.780 --> 00:36:37.920
Aryan: Yes.

318
00:36:37.920 --> 00:36:40.860
César Jiménez Millán: Okay, if that happens, We have…

319
00:36:40.860 --> 00:36:41.339
Mohamad: What are your child?

320
00:36:41.340 --> 00:36:46.169
César Jiménez Millán: mechanism so that we can recover the information from this student?

321
00:36:47.260 --> 00:37:05.260
Aryan: Not, like, information, actually, user is mapped with that user, like, if… in that case, if we go in the teams and remove the username from that user, like, if the same username and the same teacher, or we remove username, or we remove the assigned teacher from the team.

322
00:37:05.290 --> 00:37:15.320
Aryan: Then it will be okay, and, next time when you, click on this class report, it will show the correct user with the map with the teacher.

323
00:37:16.730 --> 00:37:18.890
César Jiménez Millán: Okay, so what is the problem?

324
00:37:20.000 --> 00:37:41.230
Aryan: The problem is, like, currently, what we are doing, before that auto-assign, user, currently, if you, go in the drop-down and, choose any user, it will first, empty all the organization's Zoom user and, map the user to the new user.

325
00:37:41.330 --> 00:37:50.909
Aryan: And only one, not the duplicate. So if there is any duplicate value in the Zoom username, it will remove that, and only pointing to the one user.

326
00:37:51.480 --> 00:37:53.930
César Jiménez Millán: From this moment on, or just for this report?

327
00:37:54.870 --> 00:37:57.070
Aryan: Not in the report, in the team, actually.

328
00:37:58.480 --> 00:38:01.990
César Jiménez Millán: Yeah, so far, yeah, so they, they will, they will be met.

329
00:38:03.400 --> 00:38:08.060
César Jiménez Millán: So that, so they… so they both, so they both have the same, the same, yeah, okay.

330
00:38:08.060 --> 00:38:15.070
Aryan: Margi actually removed from the, one of the user, and assigned to the user who is selected from the dropdown.

331
00:38:15.270 --> 00:38:15.890
Mohamad: Charlie.

332
00:38:15.890 --> 00:38:21.390
César Jiménez Millán: Yeah, yeah, so all the meetings in the future will be assigned to the same, user.

333
00:38:21.620 --> 00:38:22.230
Aryan: Yes.

334
00:38:23.230 --> 00:38:24.319
Aryan: Yeah, I can leave you.

335
00:38:24.550 --> 00:38:29.300
César Jiménez Millán: And will… will something happen in the, in the progress overview?

336
00:38:30.210 --> 00:38:42.099
Aryan: In the progress overview, there is no, any error occur, because in the progress overview, I'm displaying the name of, report-generated username, like, Cesar, I mean, and Milan, yeah.

337
00:38:42.680 --> 00:38:47.759
César Jiménez Millán: I mean, that's… that's, again, that could happen, but this is a manual mistake.

338
00:38:48.050 --> 00:38:50.320
César Jiménez Millán: This is a manual error, that could happen.

339
00:38:50.530 --> 00:38:56.039
César Jiménez Millán: But in… if, in the future, We… Set up something.

340
00:38:56.330 --> 00:38:59.180
César Jiménez Millán: In order to… notify.

341
00:38:59.770 --> 00:39:03.959
César Jiménez Millán: When there is a duplicate, Right? It will also be solved.

342
00:39:04.770 --> 00:39:15.569
Aryan: Yes, if user come in the Teams and manually change the username or, like, assign teacher, it will be automatically solved the problem.

343
00:39:16.560 --> 00:39:35.459
César Jiménez Millán: Yeah, yeah, so imagine, it happens, it was a mistake, it was an error, and then someone, I mean the teacher or the host or whoever, will receive a notification. Hey, be careful, because right now you have two students with the same name under the same teacher. So just, have a look, and resolve it.

344
00:39:35.700 --> 00:39:39.990
César Jiménez Millán: So it will be solved, because they will be aware of that, right?

345
00:39:40.340 --> 00:39:50.569
Aryan: Yeah, so that's the point we have told you in the email, like, if there is two users and two same teacher, it will be showing unknown in this drop-down.

346
00:39:50.570 --> 00:39:54.240
César Jiménez Millán: Yeah, yeah, yeah, but again… Yeah.

347
00:39:54.350 --> 00:39:59.859
César Jiménez Millán: But that's something, that, again, that could happen.

348
00:40:00.070 --> 00:40:05.130
César Jiménez Millán: But it's… I mean, we are reducing the chances of this to happen by, you know,

349
00:40:05.500 --> 00:40:11.290
César Jiménez Millán: Classifying or tagging, the student with a… with a… With a teacher.

350
00:40:11.460 --> 00:40:30.799
César Jiménez Millán: So, yeah, I mean, that's something, again, I guess if we generate the notification, the auto-notification, so if there is a duplicate, the teacher or the admin will receive a notification, that will be solved. Both, both cases will be solved, right? Because they will just, be aware, and they will just change the name, or do something, yes?

351
00:40:31.250 --> 00:40:31.880
Aryan: Yes.

352
00:40:32.990 --> 00:40:33.710
César Jiménez Millán: I don't know.

353
00:40:33.710 --> 00:40:44.060
Aryan: Yes, yes, if in the teams there is no, same username or same teachers, then it will not, going to, solve the issue.

354
00:40:44.060 --> 00:40:45.430
César Jiménez Millán: Yeah, yeah.

355
00:40:45.710 --> 00:41:06.900
César Jiménez Millán: Okay, so, I mean, my opinion is that we can… we can basically leave it like it is. I mean, we don't have to do, like, failure developments. The only thing that we have to do is, some… because right now, it is working like this, right? So, if this student was… if this student was mapped before, it will be automatically assigned.

356
00:41:07.170 --> 00:41:16.290
César Jiménez Millán: If it is not, if it wasn't mapped, There will be a notification.

357
00:41:16.630 --> 00:41:19.759
César Jiménez Millán: Asking the teacher to map it, right?

358
00:41:19.980 --> 00:41:30.139
César Jiménez Millán: So it's the same way as now. The only difference is that now this student has to be matched or assigned to this teacher. This is the only work I think we have to do, right?

359
00:41:31.730 --> 00:41:32.360
Aryan: Yes.

360
00:41:34.990 --> 00:41:53.879
César Jiménez Millán: No big changes, so this, this, I mean, as soon as Laura have a class with Cesar, Laura will be assigned to Cesar. If tomorrow, Laura have a class with a different teacher, Laura then will change and be assigned to this other teacher. So, yeah, so we can…

361
00:41:54.150 --> 00:42:00.020
Aryan: If teacher is already assigned, then we have to change the teacher for the law, right?

362
00:42:00.640 --> 00:42:10.189
César Jiménez Millán: Yeah, so I mean, if Laura tomorrow has a class with a different teacher, Cesa will not be the teacher anymore, and there will be a new teacher that is called whoever. Max.

363
00:42:12.040 --> 00:42:35.510
Aryan: Okay, so assume, like, in this part, if, Cesar is a teacher right now, and Laura has, assigned to the Cesar, okay? Then, when we come over here in this page, we find there's Laura, Gaminase Melanie, Laura Gomez, for the Zoom username, okay? Then we find, first the teacher of that, user. So, if the teacher map

364
00:42:35.510 --> 00:42:37.660
Aryan: Then we map the user with here.

365
00:42:37.770 --> 00:42:52.960
Aryan: I assume in the different class, if Cesar is not the teacher, another user is a teacher, and we come over here, and Laura Gomez, yeah, then we find the username of that, and then we also map with the assigned teacher.

366
00:42:52.960 --> 00:43:00.139
Aryan: But in Saintizer, we find that, the scientist is the Caesar for the Laura, not this, new teacher.

367
00:43:00.140 --> 00:43:02.670
César Jiménez Millán: Which would change, we change, we change. So if we…

368
00:43:02.670 --> 00:43:04.080
Aryan: Yeah, I mean, it's okay.

369
00:43:05.240 --> 00:43:05.950
César Jiménez Millán: Sorry?

370
00:43:06.240 --> 00:43:08.120
Aryan: Then, we need to change it.

371
00:43:08.490 --> 00:43:09.490
César Jiménez Millán: Automatically.

372
00:43:09.810 --> 00:43:10.140
Aryan: Yes?

373
00:43:10.140 --> 00:43:14.810
César Jiménez Millán: So it has to be automatic, yeah? I mean, if tomorrow Laura, Half a glass.

374
00:43:14.940 --> 00:43:16.090
César Jiménez Millán: With Max?

375
00:43:16.490 --> 00:43:17.450
César Jiménez Millán: Okay?

376
00:43:18.080 --> 00:43:21.410
César Jiménez Millán: This will not be mapped. This will be a canon.

377
00:43:21.760 --> 00:43:24.420
César Jiménez Millán: Because… yes, or not?

378
00:43:25.480 --> 00:43:27.550
Aryan: This will swing unknown, yeah.

379
00:43:27.870 --> 00:43:37.879
César Jiménez Millán: Yeah? So, imagine, tomorrow, Laura have a class with Max, no Cesar, Max. And then this… this here is going to be a known, right?

380
00:43:37.880 --> 00:43:38.900
Aryan: Yes.

381
00:43:39.090 --> 00:43:42.280
César Jiménez Millán: Okay, then Max will receive a notification.

382
00:43:42.410 --> 00:43:59.660
César Jiménez Millán: Hey, Max, you have to map Laura. We don't have map… we don't have Laura under you, under you as a teacher. So… so Max will come here, we'll select admin or whoever, and then it will automatically be mapped. So Laura then will be,

383
00:43:59.770 --> 00:44:02.979
César Jiménez Millán: will be assigned to Max, and not to Cecil.

384
00:44:04.000 --> 00:44:04.780
César Jiménez Millán: Yes?

385
00:44:05.230 --> 00:44:20.379
Aryan: Okay, okay, so you got the point from the, like, auto-report. Like, in the auto-report, if this not match, and so is the unknown, and then come over here and select the user, and then it will be automatically mapping to the new teacher.

386
00:44:20.520 --> 00:44:21.320
César Jiménez Millán: Yup.

387
00:44:21.640 --> 00:44:22.960
Aryan: Okay.

388
00:44:23.430 --> 00:44:30.020
Aryan: And my question is, like, If the,

389
00:44:30.650 --> 00:44:49.019
Aryan: In this case, we have to show the LoRa as the unknown, and in the drop-down, if select the same LoRa as before, we need to change the teacher from Cesar to new Max, okay? Yeah. So now, the Cesar is now, pointing to the LoRa, and cannot see the user in the team.

390
00:44:49.540 --> 00:44:50.130
César Jiménez Millán: Yeah.

391
00:44:51.180 --> 00:44:51.940
César Jiménez Millán: Yup.

392
00:44:52.100 --> 00:44:52.640
César Jiménez Millán: Yup.

393
00:44:52.640 --> 00:44:53.540
Aryan: Yeah. Okay.

394
00:44:53.540 --> 00:44:53.980
César Jiménez Millán: if…

395
00:44:53.980 --> 00:45:09.800
Mohamad: Like, just one query. Like, if we, if we just update the, Max in case of Laura, then in progress overview, he, he, Cesar can't see the LoRa, right? Because she is not the student of Caesar, right?

396
00:45:09.800 --> 00:45:11.810
Aryan: Yes, in the drop-down, it's not showing…

397
00:45:12.930 --> 00:45:15.560
César Jiménez Millán: In the, in, in which drop-down? In, in, in, in here?

398
00:45:15.560 --> 00:45:16.970
Aryan: Yeah, yeah.

399
00:45:16.970 --> 00:45:18.480
César Jiménez Millán: Yeah, yeah, yeah, yeah, yeah, yeah, yeah.

400
00:45:18.480 --> 00:45:26.200
Mohamad: Even… even they had one call, and the report has been generated, but Cesar can't see Laura.

401
00:45:26.200 --> 00:45:33.129
Aryan: And Numats sees her, her older, reports also, in the desktop.

402
00:45:33.130 --> 00:45:33.790
César Jiménez Millán: Fine?

403
00:45:34.160 --> 00:45:43.579
Aryan: In the dashboard, if the new teacher is assigned to Laura, the new teacher is also going to show all the earlier reports generated for the LoRa.

404
00:45:43.580 --> 00:46:01.640
César Jiménez Millán: Yeah, yeah, yeah, yeah. I mean, I mean, yes, this, because otherwise, if they change the teacher, and then they change again, because they had a new teacher, I mean, imagine the teacher just, skipped one class, and they put a new teacher, right? So this new teacher now will be assigned.

405
00:46:01.640 --> 00:46:06.270
César Jiménez Millán: And then, next class, the old teacher will come again.

406
00:46:06.480 --> 00:46:12.769
César Jiménez Millán: And we'll do the… we'll do the class. And then, in this case, Laura will be empty, again, like known.

407
00:46:12.960 --> 00:46:17.030
César Jiménez Millán: So the new teacher will have to, remap Laura.

408
00:46:17.150 --> 00:46:25.080
César Jiménez Millán: Because otherwise, Because I'm applying this logic for two reasons. First, to do it simple.

409
00:46:25.250 --> 00:46:37.890
César Jiménez Millán: And then second one, because you told me that, if we create, if we assign a student to more than one teacher, it can be a mess. It can be complicated, no?

410
00:46:39.800 --> 00:47:01.469
Aryan: Yes, if we assign the multiple teachers to the single student, it may, get confused, like, if one user, two users has the same username, and also if the, same teachers assign, if there is a multiple, teachers, then… then it will be more complicated.

411
00:47:05.740 --> 00:47:20.620
César Jiménez Millán: Because we have two chances of, I mean, either we, do this… this one with only one teacher that is jumping from one to the other automatically, because the system has to be automatic, or… or… or we let the…

412
00:47:20.900 --> 00:47:26.610
César Jiménez Millán: We led the system to have two teachers for one student.

413
00:47:27.060 --> 00:47:33.399
César Jiménez Millán: Yeah, but I guess in order to make it easy, let's have just one student.

414
00:47:33.780 --> 00:47:34.690
César Jiménez Millán: That's it.

415
00:47:34.990 --> 00:47:50.950
César Jiménez Millán: That's it, and they can always come here, because if the teacher just skipped one class, he can come here, and he can manually, you know, change the student for him, right? So they can still do it, right?

416
00:47:52.370 --> 00:47:53.120
Aryan: Yes.

417
00:47:53.120 --> 00:47:53.830
César Jiménez Millán: here.

418
00:47:54.330 --> 00:48:04.070
Aryan: Yes, I developed that thing, like, added the checkbox over the name, and can do multiple edits at the same time.

419
00:48:04.450 --> 00:48:12.059
César Jiménez Millán: So they can say, okay, so Cesar, was here, so, yeah, I will just change it, and I will assign Cesar to me again.

420
00:48:12.420 --> 00:48:13.690
Aryan: Yes.

421
00:48:13.690 --> 00:48:14.230
César Jiménez Millán: Yep.

422
00:48:14.370 --> 00:48:15.860
César Jiménez Millán: So let's do it like that.

423
00:48:20.590 --> 00:48:23.030
Aryan: No.

424
00:48:23.030 --> 00:48:26.720
Mohamad: Are there any other points that we need to discuss?

425
00:48:26.720 --> 00:48:33.130
Aryan: No, not actually, I have covered all the points.

426
00:48:33.490 --> 00:48:40.820
Mohamad: Okay, so, so is, is, Arian, is there any change in the logic for the mapping user and auto-assign feature?

427
00:48:41.410 --> 00:48:57.980
Aryan: In a mapping user, I need to, do one change, like, for this change, like, if already assigned the teacher to any person, and it's changed to other teacher, then we need to change the updated teacher.

428
00:48:58.150 --> 00:48:58.690
Aryan: Okay.

429
00:48:58.690 --> 00:49:01.880
Mohamad: Okay, and for other, like.

430
00:49:01.880 --> 00:49:05.840
César Jiménez Millán: Sorry, Mahmat, just understand how it is set up now?

431
00:49:10.040 --> 00:49:15.880
César Jiménez Millán: Because you said that you have to change the auto-assign teacher if it changed the class, but how it is set up now?

432
00:49:16.230 --> 00:49:26.110
Aryan: So, now, currently, what is doing… what I'm doing is, like, if there is a user, and we choose it from the top down, all the mapping is correctly fine, then…

433
00:49:26.110 --> 00:49:39.190
Aryan: During the loading of the transcript, I will automatically map… I will automatically fax the teacher from the transcript and, map the… that teacher to the students, okay?

434
00:49:39.190 --> 00:49:39.520
César Jiménez Millán: Yeah?

435
00:49:39.520 --> 00:49:50.929
Aryan: But now, we need to change one thing, like, if we change it from the dropdown, or we change the user with the dropdown, it will also change the teacher for that user.

436
00:49:54.340 --> 00:50:01.190
César Jiménez Millán: Before, it wasn't changing, so what you are developing, it doesn't change. So, we up.

437
00:50:01.480 --> 00:50:17.959
Aryan: Before, it was, like, when you, loading the transcript, and, when the… all the participant display, it will check the… all the student and the teacher one, and they… it, automatically, assigns the, teacher to all the student who is mapped.

438
00:50:18.000 --> 00:50:22.040
Aryan: But not change during the, the drop-down change.

439
00:50:22.330 --> 00:50:24.559
Aryan: But now, I have to do, like, if…

440
00:50:24.560 --> 00:50:27.989
César Jiménez Millán: No, no, but, yeah, yeah, yeah, okay, but listen,

441
00:50:29.020 --> 00:50:36.559
César Jiménez Millán: Okay, okay, so, so what, what you were, what you were doing is that, you have a, imagine, you have, a meeting.

442
00:50:36.770 --> 00:50:40.249
César Jiménez Millán: Tomorrow, you have a meeting, Laula has a meeting with Max.

443
00:50:40.360 --> 00:50:40.850
César Jiménez Millán: Great.

444
00:50:41.100 --> 00:50:41.790
Aryan: Yes.

445
00:50:41.790 --> 00:50:44.230
César Jiménez Millán: Okay, what would happen in your logic?

446
00:50:45.620 --> 00:50:50.610
Aryan: In that logic, LoRa is, sorry, Max is automatically assigned to the LoRa.

447
00:50:50.940 --> 00:50:51.740
Aryan: Okay.

448
00:50:51.740 --> 00:50:52.960
César Jiménez Millán: This is what…

449
00:50:53.030 --> 00:50:56.140
Aryan: But if you change this from the dropdown.

450
00:50:56.750 --> 00:50:57.840
Aryan: They need to be white, white.

451
00:50:57.840 --> 00:51:00.439
César Jiménez Millán: Why are… why are we going to change it?

452
00:51:00.920 --> 00:51:03.390
Aryan: Because if it is unknown, then…

453
00:51:03.650 --> 00:51:08.799
César Jiménez Millán: Okay, okay, so in my logic, it will be unknown, in your logic, it will be automatic, right?

454
00:51:09.750 --> 00:51:10.390
Aryan: Yes.

455
00:51:10.740 --> 00:51:18.809
Aryan: But… but if… consider it for the first time, like, if there is… in the first time, there is no username is assigned.

456
00:51:18.980 --> 00:51:35.910
Aryan: At that time is the unknown. No username assigned, no teacher is assigned. But you come over here and change the, like, first assign the username to the user. At that time, we are not, like, considered, or we are not, like, assigning the teacher to that user.

457
00:51:36.200 --> 00:51:37.920
César Jiménez Millán: Because it was manually done.

458
00:51:38.100 --> 00:51:46.280
Aryan: Yes. So, for that, we need to assign, like, if, you come over here at the first time, know any teacher or anything assigned.

459
00:51:46.280 --> 00:51:46.750
César Jiménez Millán: Oh, yeah, yeah.

460
00:51:46.750 --> 00:51:47.069
Aryan: Yeah, yeah.

461
00:51:47.070 --> 00:51:49.849
César Jiménez Millán: Yeah, yeah, I got it. So just for, just, yeah, yeah.

462
00:51:49.850 --> 00:51:59.440
Aryan: you just, select the Cesar from the drop-down as a teacher, then you change the Laura as the student, from the drop-down, and assign the Zoom.

463
00:51:59.440 --> 00:52:00.120
César Jiménez Millán: No.

464
00:52:00.530 --> 00:52:01.080
Aryan: Yeah, so the point is…

465
00:52:01.080 --> 00:52:09.080
César Jiménez Millán: Cesar is not going to be changed, ever, right? So, because Cesar is going to be all with Cesar. The point is that Laura can have a meeting with Max.

466
00:52:09.240 --> 00:52:10.520
César Jiménez Millán: Or with Desar.

467
00:52:10.920 --> 00:52:18.359
César Jiménez Millán: Then, then it is true that if, if Laura have a meeting with Max, and Laura is known.

468
00:52:18.840 --> 00:52:27.299
César Jiménez Millán: You will have to, so, and this is, you know, assigned, I mean, mapped.

469
00:52:27.450 --> 00:52:34.400
César Jiménez Millán: Laura's mapped, Max should be the teacher assigned to Laura. Yeah, yeah, yeah, I mean, yeah, that makes sense, yeah.

470
00:52:35.500 --> 00:52:36.320
César Jiménez Millán: For a moment.

471
00:52:37.530 --> 00:52:47.589
Mohamad: Yeah. And next, for the other two points, was the edit assigned tag teacher field. So, we need to add this, right, Cesar?

472
00:52:47.790 --> 00:52:50.729
César Jiménez Millán: What is that? The teacher assign?

473
00:52:51.100 --> 00:52:56.830
Mohamad: Yeah, on the Teams, we need to add one field, which is called Assign Teacher, so user can add it

474
00:52:57.480 --> 00:52:58.020
Mohamad: Back.

475
00:53:00.450 --> 00:53:01.539
César Jiménez Millán: Yeah, yeah, yeah, yeah, yeah.

476
00:53:01.630 --> 00:53:10.330
Mohamad: Yeah, okay. Next, what's the changes regarding the BCC teacher? Like, by default, we need to add one checkbox?

477
00:53:10.910 --> 00:53:16.390
Mohamad: In that, when user click on it, the teacher should be added in the PCC.

478
00:53:17.630 --> 00:53:19.670
Aryan: While sending the report.

479
00:53:20.760 --> 00:53:21.450
César Jiménez Millán: Here.

480
00:53:22.690 --> 00:53:31.709
Aryan: Yeah, in the BCC, there is also one more field, like, there is a toggle, like, on or off, to, also send the…

481
00:53:31.840 --> 00:53:37.210
Aryan: Report to the automatically assigned teacher or not for that student.

482
00:53:38.470 --> 00:53:43.760
César Jiménez Millán: Yeah, yeah, yeah, so that is also,

483
00:53:44.130 --> 00:53:46.239
César Jiménez Millán: important. Let me just see one thing.

484
00:53:47.230 --> 00:53:50.439
César Jiménez Millán: Yeah, because you are, you are just referring to,

485
00:53:52.700 --> 00:53:59.890
César Jiménez Millán: these changes, right? So, mapping student out to assigned teacher, edit assigned teacher field.

486
00:53:59.890 --> 00:54:00.420
Mohamad: Yeah.

487
00:54:00.420 --> 00:54:11.920
César Jiménez Millán: in BCC, so those are the three. So, mapping user auto-assigned teacher. So, this is the thing that you said that is going to take 3 hours. And then, how… this is the add the client field.

488
00:54:12.270 --> 00:54:16.820
César Jiménez Millán: And teacher assigned to students, so what's the difference between this one and this one?

489
00:54:20.750 --> 00:54:28.300
Mohamad: Current… in that, in that we… in that scope, we are not… Sophie, in that, mapping user and auto-sign.

490
00:54:28.300 --> 00:54:31.379
César Jiménez Millán: How to assign teacher with this, other theme.

491
00:54:31.860 --> 00:54:37.919
Mohamad: Yeah, the… the… the updated estimation was for the

492
00:54:37.920 --> 00:54:55.359
Mohamad: new changes, like, now you had reduced the scope, so the, efforts would be reduced. I will just connect with Ariane, and I will update the efforts for that. And for other two, it would remain same, but for the mapping user, it would reduce, like, you just need… we need…

493
00:54:55.380 --> 00:55:03.410
Mohamad: we'll just need to update the field, so it would reduce, it would not take 3 hours, but it would reduce. But for other two, it would remain same.

494
00:55:05.320 --> 00:55:08.790
César Jiménez Millán: Okay, so you're saying that this will be less, and this will be the same, right?

495
00:55:08.790 --> 00:55:10.010
Mohamad: Yeah, yeah. Okay.

496
00:55:10.460 --> 00:55:17.579
César Jiménez Millán: Okay, okay. Okay, if you can, please, send it to me, before proceeding, I will…

497
00:55:17.580 --> 00:55:19.280
Mohamad: Yeah, yeah, yeah, I agree.

498
00:55:19.280 --> 00:55:28.569
César Jiménez Millán: Yeah, perfect, true bear. Okay, guys, let me see, because I had something else,

499
00:55:29.720 --> 00:55:36.890
César Jiménez Millán: Oh, I had something, but I don't remember now. I will let you know if I have something. Please.

500
00:55:37.050 --> 00:55:41.039
César Jiménez Millán: And and then… yeah, I mean, everything is clear, right?

501
00:55:41.380 --> 00:55:43.260
Mohamad: Yeah, yeah, it's now clear.

502
00:55:43.770 --> 00:55:45.410
César Jiménez Millán: Yeah, okay.

503
00:55:45.410 --> 00:55:46.040
Mohamad: Oh, really?

504
00:55:46.040 --> 00:55:55.329
César Jiménez Millán: Okay, perfect. Anyway, any question from your site, or from my side, or wherever, we are in contact, and we can connect the minutes whenever it's needed.

505
00:55:55.330 --> 00:55:56.830
Mohamad: Yeah, yeah, sure.

506
00:55:57.850 --> 00:56:00.100
César Jiménez Millán: Okay, guys, thank you very much.

507
00:56:00.340 --> 00:56:01.650
Mohamad: Thank you. Thank you, Cesar.

508
00:56:01.650 --> 00:56:02.850
Aryan: Thank you, Cesar.

509
00:56:02.850 --> 00:56:04.079
César Jiménez Millán: Bye. Bye-bye. Bye.

510
00:56:04.080 --> 00:56:04.800
Aryan: Bye, bye.
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

    const notificationEnabled = notificationSettings.notificationEnabled === true;
    const notificationSubject = notificationSettings.notificationSubject || "Your Assessment Report is Ready";
    const notificationMessage = notificationSettings.notificationMessage || "<p>Hello,</p><p>Your Boost Class report is ready.</p><p><br></p>";
    const notificationSignatureHtml = notificationSettings.notificationSignatureHtml || "";
    const notificationCc = notificationSettings.notificationCc || "";
    const notificationBcc = notificationSettings.notificationBcc || "";
    const notificationTeacherBcc = notificationSettings.notificationTeacherInBcc === true;

    const transcriptUsers = userMappedTranscriptArray.map((item) => ({
      name: item.name,
      text: item.text,
    }));

    // 3. Map transcript users to org users by platform username (zoomUsername / teamsUsername)
    const usernameField = "zoomUsername";

    const mappingResult = mapTranscriptUsersToOrgUsers(
      transcriptUsers,
      orgUsers,
      usernameField,
    );
    const mappedUsers = mappingResult.mappedUsers;

    if (mappingResult.teacherAssignments.length) {
      await applyTeacherAssignmentsToUsers(
        mappingResult.teacherAssignments,
        orgUsers,
      );
    }
    // const mappedUsers = transcriptUsers
    //   .map((item) => {
    //     const itemKey = (item.name || "").trim().toLowerCase();

      //   // Try to match by the platform-specific username stored on the org user first
      //   let matchedOrgUser = orgUsers.find((u) => {
      //     const uname = (u[usernameField] || "")
      //       .toString()
      //       .trim()
      //       .toLowerCase();
      //     return uname && itemKey && uname === itemKey;
      //   });

      //   // Fallback: match by display name if username match not found
      //   if (!matchedOrgUser) {
      //     matchedOrgUser = orgUsers.find(
      //       (u) =>
      //         u.name &&
      //         item.name &&
      //         u.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
      //     );
      //   }

      //   // console.log("matchedusers: ", JSON.stringify(matchedOrgUser));

      //   // Only consider if matched user is a student
      //   if (
      //     matchedOrgUser &&
      //     (matchedOrgUser.role || "").toLowerCase() !== "student"
      //   ) {
      //     // Not a student, skip mapping
      //     return null;
      //   }

      //   return {
      //     id:
      //       matchedOrgUser?.email?.toLowerCase() ||
      //       // matchedParticipant?.id?.toLowerCase() ||
      //       "unknown",
      //     name: item.name,
      //     text: item.text,
      //   };
      // })
      // .filter(Boolean);

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

          // await sendAssessmentMail(
          //   "aryan_desire117@outlook.com",
          //   { subject: meetingName, duration: meetingDuration },
          //   { id: transcriptId, recording_end: meetingTime },
          //   reportData,
          //   organization,
          //   orgLogo, // Pass orgLogo here
          // );
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

      // try {
      //   await transporter.sendMail(mailOptions);
      //   console.log("Unmapped users email sent to host:", job.hostEmail);
      // } catch (err) {
      //   console.error("Failed to send unmapped users email:", err);
      // }
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
