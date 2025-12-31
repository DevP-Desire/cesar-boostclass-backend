import fs from "fs";

const css = fs.readFileSync("./controllers/styles.css", "utf8");

function generateHTML(result, meeting, transcript, selectedStudent) {
  // Helper functions (copied/adapted from your code)
  const getFormattedDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const getFormattedTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  const getMeetingDuration = (start, end) => {
    const diff = Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 60000
    );
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return hours > 0
      ? `${hours} Hr${minutes ? " " + minutes + " Min" : ""}`
      : `${minutes} Min`;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getSyllableColor = (score) => {
    if (score >= 80) return "scoreHigh"; // From your SCSS
    if (score >= 60) return "scoreMedium";
    if (score >= 40) return "scoreMediumLow";
    return "scoreLow";
  };

  // Parse observations (from your code)
  const selectedSpeaker = result.speakerAssessments?.find(
    (speaker) => speaker.speaker === selectedStudent.name
  );
  let observations = selectedSpeaker?.openAiObservations || [];
  if (!Array.isArray(observations)) observations = [observations];

  // Vocab booster
  const vocabBooster = selectedSpeaker?.Vocabulary_Booster || [];

  // MCQ Exercises (use your parseMCQExercises function logic)
  const mcqExercises = parseMCQExercises(
    selectedSpeaker?.mcqExercises?.join("\n\n") || ""
  ); // Adapt as needed

  // Donut chart HTML/JS (we'll render with Chart.js in Puppeteer)
  const renderDonut = (id, score, label, breakdownScores) => {
    const getColor = (s) =>
      s >= 80 ? "#1e8e3e" : s >= 60 ? "#d3af2a" : "#a72525";
    const mainColor = getColor(score);
    return `
      <div class="donutContainer">
        <canvas id="${id}"></canvas>
        <div class="scoreValue">${score}</div>
      </div>
      <script>
        const ctx${id} = document.getElementById('${id}').getContext('2d');
        new Chart(ctx${id}, {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [${score}, ${100 - score}],
              backgroundColor: ['${mainColor}', '#f3f2f1'],
              borderColor: ['${mainColor}', '#f3f2f1'],
              borderWidth: 1
            }]
          },
          options: {
            cutout: '80%',
            responsive: true,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
          }
        });
      </script>
    `;
  };

  // Full HTML structure (matches <div ref={pdfRef}> in your React code)
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${css}</style> <!-- Inlined CSS from SCSS -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> <!-- Chart.js CDN -->
      </head>
      <body class="pdfReport">
        <div>
          <p><strong>Meeting:</strong> ${meeting.subject}</p>
          <p><strong>Date & Time:</strong> ${getFormattedDate(
            meeting.startTime
          )}</p>
          <p><strong>Duration:</strong> ${formatDuration(meeting.duration)}</p>
          <p><strong>Student:</strong> ${selectedStudent.name} (${
    selectedStudent.id
  })</p>
          <br />
          <!-- Banner and Scores -->
          <div class="banner">
            <!-- Copy your banner SVG/HTML here -->
            <div class="bannerinner">
              <div class="wave">
                <svg viewBox="0 0 1000 200" preserveAspectRatio="none">
                  <path d="M0,120 C300,20 700,220 1000,120 L1000,200 L0,200 Z" fill="#8A84D6" opacity="1" />
                </svg>
              </div>
              <h1>Your Class Score</h1>
            </div>
          </div>
          <div class="chartsRow">
            <div class="chartColumn">
              <!-- Content Donut -->
              ${renderDonut("contentChart", result.openAiScores[1], "Content", [
                {
                  label: "Vocabulary score",
                  score: result.openAiScores[0],
                  tooltip: "Vocabulary usage score",
                },
                {
                  label: "Grammar score",
                  score: result.openAiScores[1],
                  tooltip: "Grammar accuracy score",
                },
                {
                  label: "Topic score",
                  score: result.openAiScores[2],
                  tooltip: "Topic relevance score",
                },
              ])}
            </div>
          </div>

          <!-- Grammar Corrections Table -->
          <div class="topMistakesSection">
            <div class="banner">
              <div class="bannerinner">
                <div class="wave"><svg>...</svg></div> <!-- Abbreviate for brevity -->
                <h1>Grammar Corrections</h1>
              </div>
            </div>
            <table class="observationsTable">
              <thead><tr><th>Mistake</th><th>Correction</th><th>Explanation</th></tr></thead>
              <tbody>
                ${
                  result.openAiObservations
                    .map(
                      (obs) => `
                  <tr>
                    <td>${obs.mistake || ""}</td>
                    <td>${obs.correction || ""}</td>
                    <td>${obs.explanation || ""}</td>
                  </tr>
                `
                    )
                    .join("") ||
                  '<tr><td colspan="3">No observations available.</td></tr>'
                }
              </tbody>
            </table>
          </div>

          <!-- Vocabulary Booster Table -->
          <div class="topMistakesSection">
            <div class="banner">
              <div class="bannerinner">
                <div class="wave"><svg>...</svg></div>
                <h1>Vocabulary Booster</h1>
              </div>
            </div>
            <table class="observationsTable">
              <thead><tr><th>Word</th><th>Occurrences</th><th>Suggestions</th></tr></thead>
              <tbody>
                ${
                  result.Vocabulary_Booster.map(
                    (vocab) => `
                  <tr>
                    <td class="vocabWord">${vocab.word || ""}</td>
                    <td class="vocabOccurrences">${vocab.occurrences || 0}</td>
                    <td class="vocabSuggestions">${
                      Array.isArray(vocab.suggestions)
                        ? vocab.suggestions.join(", ")
                        : vocab.suggestions || ""
                    }</td>
                  </tr>
                `
                  ).join("") ||
                  '<tr><td colspan="3">No vocabulary suggestions available.</td></tr>'
                }
              </tbody>
            </table>
          </div>

          <!-- Pronunciation Analysis -->
          <div class="correctionSection">
            <div class="pronunciationSection">
              <div class="banner">
                <div class="bannerinner">
                  <div class="wave"><svg>...</svg></div>
                  <h1>Pronunciation Analysis</h1>
                </div>
              </div>
              <div class="colorLegendBox">
                <!-- Legend from your code -->
                <div class="legendTitle">Pronunciation Score</div>
                <div class="legendRow"><span class="colorSwatch scoreLow"></span><span>0-20: Poor</span></div>
                <!-- Add others -->
              </div>
              <div class="contentWrapper">
                <div class="syllablesWrapper">
                  ${syllableMispronunciations
                    .map((correction, index) => {
                      const parts = correction.split("=>");
                      const word = parts[0]?.trim() || "";
                      const syllablesRaw =
                        parts[1]?.replace(/(\r\n|\n|\r)/gm, "").trim() || "";
                      const cleaned = syllablesRaw.replace(/[[]']/g, "");
                      const syllableData = cleaned
                        .split(",")
                        .map((item) => item.trim())
                        .filter((item) => item);
                      return `
                      <div key="${index}" class="syllableItem">
                        <div class="wordHeader">${word}</div>
                        <div class="syllablesContainer">
                          ${syllableData
                            .map((syllable, syllIndex) => {
                              const [syll, scoreStr] = syllable
                                .split(":")
                                .map((s) => s.trim());
                              const score = parseInt(scoreStr, 10);
                              return `<span class="syllable ${getSyllableColor(
                                score
                              )}" title="Score: ${score}/100">${syll}</span>`;
                            })
                            .join("")}
                        </div>
                      </div>
                    `;
                    })
                    .join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- Practice Exercises -->
          <div class="mcqSection">
            <div class="banner">
              <div class="bannerinner">
                <div class="wave"><svg>...</svg></div>
                <h1>Practice Exercises</h1>
              </div>
            </div>
            ${result.mcqExercises
              .map(
                (exercise, index) => `
              <div class="mcqExercise">
                ${
                  exercise.title !== "Practice Exercises"
                    ? `<div class="mcqQuestion"><strong>${
                        exercise.title || `Exercise ${index + 1}`
                      }</strong></div>`
                    : ""
                }
                <!-- Render markdown using your MarkdownRenderer logic (convert to HTML here) -->
                <div>${renderMarkdown(
                  exercise.markdown
                )}</div> <!-- Implement renderMarkdown based on MarkdownRenderer.tsx -->
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </body>
    </html>
  `;
}

function parseMCQExercises(mcqString) {
  if (!mcqString) return [];

  const isNewFormat =
    mcqString.includes("## EXERCISES") || mcqString.includes("### Exercise");

  if (isNewFormat) {
    return [
      {
        title: "Practice Exercises",
        exerciseNumber: 1,
        type: "General",
        markdown: mcqString,
        instructions: "",
        questions: [],
        corrections: [],
        examples: [],
        question: "Practice Exercises",
        options: [mcqString],
      },
    ];
  } else {
    const exercises = [];

    try {
      const sections = mcqString.split(/\n\n+/);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        const questionMatch =
          section.match(
            /^(.+?)\n\s*a\)\s+(.+)\n\s*b\)\s+(.+)(?:\n\s*c\)\s+(.+))?/m
          ) ||
          section.match(
            /^(.+?)[\s\S]*?\n\s*a\)\s+(.+)[\s\S]*?\n\s*b\)\s+(.+)(?:[\s\S]*?\n\s*c\)\s+(.+))?/
          );

        if (questionMatch) {
          const [, question, optionA, optionB, optionC] = questionMatch;
          const options = [optionA.trim(), optionB.trim()];
          if (optionC) options.push(optionC.trim());

          exercises.push({
            title: `Question ${exercises.length + 1}`,
            exerciseNumber: exercises.length + 1,
            type: "MCQ",
            markdown: section,
            instructions: "",
            questions: [],
            corrections: [],
            examples: [],
            question: question.trim(),
            options,
          });
        }
      }
    } catch (error) {
      console.error("Error parsing MCQ exercises:", error);
    }

    return exercises.length > 0
      ? exercises
      : [
          {
            title: "Practice Exercises",
            exerciseNumber: 1,
            type: "General",
            markdown: mcqString,
            instructions: "",
            questions: [],
            corrections: [],
            examples: [],
            question: "Unable to parse exercises",
            options: [mcqString],
          },
        ];
  }
}

// Implement renderMarkdown (simplified from MarkdownRenderer.tsx)
function renderMarkdown(content) {
  // Convert markdown to HTML (use a library like marked if needed, or manual like your code)
  return content.replace(/^## (.*)$/gm, "<h2>$1</h2>"); // etc., expand as needed
}

export { generateHTML };
