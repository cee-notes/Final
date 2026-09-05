/**
 * ============================================================================
 * CEE MOCK PORTAL - MODEL EXAM ENGINE (ENHANCED)
 * Nepal Medical Education Commission (MEC) CEE Pattern
 * ============================================================================
 * EXAM PATTERN:
 * - Total Marks: 200
 * - Duration: 180 minutes (2 hours)
 * - Questions: 200 MCQs (1 mark each)
 * - Negative Marking: 0.25 per wrong answer
 * 
 * SYLLABUS DISTRIBUTION (as per MEC guidelines):
 * - Physics: 50 questions (25%) - Class 11 & 12 NEB syllabus
 * - Chemistry: 50 questions (25%) - Class 11 & 12 NEB syllabus
 * - Biology: 80 questions (40%) - Botany & Zoology, Class 11 & 12
 * - English: 20 questions (10%) - Grammar, Vocabulary, Comprehension
 * ============================================================================
 */

// --- EXAM CONFIGURATION ---
const MODEL_EXAM_CONFIG = {
  TOTAL_MARKS: 200,
  TOTAL_QUESTIONS: 200,
  DURATION_MINUTES: 180, // Exact time for CEE
  MARKS_PER_QUESTION: 1,
  NEGATIVE_MARKING: 0.25,
  
  // Syllabus weightage as per Nepal CEE pattern
  SUBJECT_DISTRIBUTION: {
    PHYSICS:   { marks: 50, questions: 50, percentage: 25 },
    CHEMISTRY: { marks: 50, questions: 50, percentage: 25 },
    BIOLOGY:   { marks: 80, questions: 80, percentage: 40 },
    ENGLISH:   { marks: 20, questions: 20, percentage: 10 }
  },
  
  // Chapter-wise breakdown for each subject (NEB Class 11 & 12)
  CHAPTER_WEIGHTAGE: {
    PHYSICS: {
      'Mechanics': 12,           // Class 11: Units, Motion, Force, Energy, Rotation, Gravitation
      'Waves & Sound': 6,        // Class 11: SHM, Waves, Sound
      'Heat & Thermodynamics': 8, // Class 11 & 12: Calorimetry, Gas Laws, Thermodynamics
      'Electromagnetism': 14,    // Class 12: Electrostatics, Current, Magnetism, EMI, AC
      'Optics': 6,               // Class 12: Ray & Wave Optics
      'Modern Physics': 4        // Class 12: Atoms, Nuclei, Semiconductors
    },
    CHEMISTRY: {
      'Physical Chemistry': 18,  // Class 11 & 12: Stoichiometry, Equilibrium, Kinetics, etc.
      'Inorganic Chemistry': 16, // Class 11 & 12: Periodic Table, Coordination, Metallurgy
      'Organic Chemistry': 16    // Class 11 & 12: Hydrocarbons, Functional Groups, Biomolecules
    },
    BIOLOGY: {
      'Botany - Cell & Genetics': 18,    // Cell structure, Division, Genetics
      'Botany - Plant Physiology': 12,   // Photosynthesis, Respiration, Growth
      'Botany - Diversity': 10,          // Classification, Plant Kingdom
      'Zoology - Human Physiology': 25,  // Digestion, Circulation, Nervous System, etc.
      'Zoology - Reproduction': 8,       // Human reproduction, Embryology
      'Zoology - Evolution & Ecology': 7 // Evolution, Ecosystem, Conservation
    },
    ENGLISH: {
      'Grammar': 8,              // Tenses, Articles, Prepositions, Voice
      'Vocabulary': 6,           // Synonyms, Antonyms, Idioms
      'Comprehension': 6         // Reading passages, Inference
    }
  }
};

/**
 * GENERATE MODEL EXAM SET
 * Selects exactly 200 questions following CEE syllabus distribution
 * @returns {Object} Exam set with questions distributed as per policy
 */
function generateModelExamSet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let qSheet = ss.getSheetByName('Questions');
  
  // Create Questions sheet if not exists
  if (!qSheet) {
    qSheet = ss.insertSheet('Questions');
    qSheet.appendRow(['ID', 'Subject', 'Chapter', 'Topic', 'Question', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'Answer', 'Explanation', 'Difficulty']);
    seedDemoQuestions_(qSheet); // Add demo questions
  }
  
  const data = qSheet.getDataRange().getValues();
  const headers = data[0];
  const allQuestions = data.slice(1);
  
  // Build question pools by Subject and Chapter
  const pools = {
    PHYSICS: {}, CHEMISTRY: {}, BIOLOGY: {}, ENGLISH: {}
  };
  
  // Column mapping (adjust based on your sheet structure)
  const COL = {
    ID: 0, SUBJECT: 1, CHAPTER: 2, TOPIC: 3, QUESTION: 4,
    OPT_A: 5, OPT_B: 6, OPT_C: 7, OPT_D: 8, ANSWER: 9,
    EXPLANATION: 10, DIFFICULTY: 11
  };
  
  // Categorize all questions
  allQuestions.forEach((q, idx) => {
    if (!q[COL.QUESTION] || String(q[COL.QUESTION]).trim() === '') return;
    
    let subject = String(q[COL.SUBJECT] || '').toUpperCase().trim();
    let chapter = String(q[COL.CHAPTER] || 'General').trim();
    
    // Normalize subject names
    if (subject.includes('PHYS')) subject = 'PHYSICS';
    else if (subject.includes('CHEM')) subject = 'CHEMISTRY';
    else if (subject.includes('BIO') || subject.includes('ZOO') || subject.includes('BOT')) subject = 'BIOLOGY';
    else if (subject.includes('ENG') || subject.includes('ENGLISH')) subject = 'ENGLISH';
    else return; // Skip unrecognized subjects
    
    if (!pools[subject][chapter]) {
      pools[subject][chapter] = [];
    }
    
    pools[subject][chapter].push({
      id: q[COL.ID] || `q-${idx+1}`,
      subject: subject,
      chapter: chapter,
      topic: q[COL.TOPIC] || '',
      text: q[COL.QUESTION],
      options: [q[COL.OPT_A], q[COL.OPT_B], q[COL.OPT_C], q[COL.OPT_D]],
      answer: q[COL.ANSWER], // A=0, B=1, C=2, D=3 or 1,2,3,4
      explanation: q[COL.EXPLANATION] || '',
      difficulty: q[COL.DIFFICULTY] || 'Medium'
    });
  });
  
  // Select questions based on syllabus policy
  const selectedQuestions = [];
  const selectionLog = {};
  
  Object.keys(MODEL_EXAM_CONFIG.SUBJECT_DISTRIBUTION).forEach(subject => {
    const targetCount = MODEL_EXAM_CONFIG.SUBJECT_DISTRIBUTION[subject].questions;
    const chapterWeights = MODEL_EXAM_CONFIG.CHAPTER_WEIGHTAGE[subject] || {};
    
    selectionLog[subject] = { target: targetCount, selected: 0, chapters: {} };
    
    // Sort chapters by weightage (descending)
    const sortedChapters = Object.keys(chapterWeights).sort((a, b) => chapterWeights[b] - chapterWeights[a]);
    
    // Select questions chapter-wise
    sortedChapters.forEach(chapter => {
      const targetForChapter = chapterWeights[chapter];
      const available = pools[subject][chapter] || [];
      
      // Shuffle available questions for randomness
      shuffleArray_(available);
      
      // Pick required number (or all available if less than target)
      const toPick = Math.min(targetForChapter, available.length);
      const picked = available.slice(0, toPick);
      
      selectedQuestions.push(...picked);
      selectionLog[subject].selected += picked.length;
      selectionLog[subject].chapters[chapter] = picked.length;
    });
    
    // If still short, try to fill from other chapters in same subject
    const currentCount = selectionLog[subject].selected;
    if (currentCount < targetCount) {
      const remainingNeeded = targetCount - currentCount;
      const otherChapters = Object.keys(pools[subject]).filter(ch => !sortedChapters.includes(ch));
      
      otherChapters.forEach(chapter => {
        if (selectedQuestions.filter(q => q.subject === subject).length >= targetCount) return;
        
        const available = pools[subject][chapter].filter(q => 
          !selectedQuestions.some(sel => sel.id === q.id)
        );
        shuffleArray_(available);
        
        const toPick = Math.min(remainingNeeded, available.length);
        selectedQuestions.push(...available.slice(0, toPick));
        selectionLog[subject].selected += toPick;
        selectionLog[subject].chapters[chapter] = (selectionLog[subject].chapters[chapter] || 0) + toPick;
      });
    }
  });
  
  // Final shuffle to mix subjects (so it's not block-wise)
  shuffleArray_(selectedQuestions);
  
  // Trim to exactly 200 if somehow exceeded
  const finalSet = selectedQuestions.slice(0, MODEL_EXAM_CONFIG.TOTAL_QUESTIONS);
  
  // Store answer key securely (not sent to client)
  const answerKey = finalSet.map(q => ({
    id: q.id,
    answer: normalizeAnswer_(q.answer)
  }));
  
  PropertiesService.getUserProperties().setProperty(
    'model_exam_key_' + Session.getActiveUser().getEmail(),
    JSON.stringify(answerKey)
  );
  
  // Prepare payload for frontend (hide answers!)
  return {
    success: true,
    config: {
      totalTime: MODEL_EXAM_CONFIG.DURATION_MINUTES * 60, // seconds
      totalMarks: MODEL_EXAM_CONFIG.TOTAL_MARKS,
      totalQuestions: finalSet.length,
      negativeMarking: MODEL_EXAM_CONFIG.NEGATIVE_MARKING,
      subjectDistribution: MODEL_EXAM_CONFIG.SUBJECT_DISTRIBUTION
    },
    selectionLog: selectionLog,
    questions: finalSet.map(q => ({
      id: q.id,
      subject: q.subject,
      chapter: q.chapter,
      topic: q.topic,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty
      // NOTE: 'answer' is NOT sent to prevent cheating
    })),
    timestamp: new Date().getTime()
  };
}

/**
 * SUBMIT MODEL EXAM & CALCULATE SCORE
 * Validates answers server-side and returns detailed result
 */
function submitModelExam(userAnswers) {
  const userEmail = Session.getActiveUser().getEmail();
  const keyJson = PropertiesService.getUserProperties().getProperty(
    'model_exam_key_' + userEmail
  );
  
  if (!keyJson) {
    return { 
      success: false, 
      error: "Session expired. Please start a new exam." 
    };
  }
  
  const answerKey = JSON.parse(keyJson);
  const keyMap = {};
  answerKey.forEach(item => keyMap[item.id] = item.answer);
  
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  const subjectWise = {};
  
  userAnswers.forEach(ans => {
    const correctAns = keyMap[ans.questionId];
    const subject = ans.subject || 'OTHER';
    
    if (!subjectWise[subject]) {
      subjectWise[subject] = { correct: 0, wrong: 0, unattempted: 0 };
    }
    
    if (!ans.selectedOption || ans.selectedOption === null) {
      unattempted++;
      subjectWise[subject].unattempted++;
      return;
    }
    
    const userAnsNorm = normalizeAnswer_(ans.selectedOption);
    
    if (userAnsNorm === correctAns) {
      correct++;
      score += MODEL_EXAM_CONFIG.MARKS_PER_QUESTION;
      subjectWise[subject].correct++;
    } else {
      wrong++;
      score -= MODEL_EXAM_CONFIG.NEGATIVE_MARKING;
      subjectWise[subject].wrong++;
    }
  });
  
  // Clear session
  PropertiesService.getUserProperties().deleteProperty('model_exam_key_' + userEmail);
  
  // Save result to spreadsheet
  saveExamResult_(userEmail, score, correct, wrong, unattempted, subjectWise);
  
  return {
    success: true,
    score: parseFloat(score.toFixed(2)),
    maxScore: MODEL_EXAM_CONFIG.TOTAL_MARKS,
    percentage: ((score / MODEL_EXAM_CONFIG.TOTAL_MARKS) * 100).toFixed(2),
    totalQuestions: userAnswers.length,
    correct: correct,
    wrong: wrong,
    unattempted: unattempted,
    subjectWise: subjectWise,
    grading: getGrading_(score)
  };
}

// --- HELPER FUNCTIONS ---

function normalizeAnswer_(ans) {
  if (ans === null || ans === undefined) return null;
  ans = String(ans).toUpperCase().trim();
  // Convert A/B/C/D to 0/1/2/3 or 1/2/3/4
  if (['A', '1'].includes(ans)) return 0;
  if (['B', '2'].includes(ans)) return 1;
  if (['C', '3'].includes(ans)) return 2;
  if (['D', '4'].includes(ans)) return 3;
  return parseInt(ans, 10) || 0;
}

function shuffleArray_(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getGrading_(score) {
  const percentage = (score / MODEL_EXAM_CONFIG.TOTAL_MARKS) * 100;
  if (percentage >= 90) return { grade: 'A+', remark: 'Excellent! Top rank potential.' };
  if (percentage >= 80) return { grade: 'A', remark: 'Very Good! Strong preparation.' };
  if (percentage >= 70) return { grade: 'B+', remark: 'Good. Keep practicing.' };
  if (percentage >= 60) return { grade: 'B', remark: 'Average. Need more practice.' };
  if (percentage >= 50) return { grade: 'C', remark: 'Below average. Focus on weak areas.' };
  return { grade: 'F', remark: 'Needs serious improvement. Revise fundamentals.' };
}

function saveExamResult_(email, score, correct, wrong, unattempted, subjectWise) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let resultSheet = ss.getSheetByName('ModelExamResults');
  
  if (!resultSheet) {
    resultSheet = ss.insertSheet('ModelExamResults');
    resultSheet.appendRow([
      'Timestamp', 'Email', 'Score', 'MaxScore', 'Percentage',
      'Correct', 'Wrong', 'Unattempted',
      'Physics_Correct', 'Physics_Wrong',
      'Chemistry_Correct', 'Chemistry_Wrong',
      'Biology_Correct', 'Biology_Wrong',
      'English_Correct', 'English_Wrong',
      'Grade', 'Remark'
    ]);
  }
  
  const sw = subjectWise || {};
  const grading = getGrading_(score);
  
  resultSheet.appendRow([
    new Date(),
    email,
    score,
    MODEL_EXAM_CONFIG.TOTAL_MARKS,
    ((score / MODEL_EXAM_CONFIG.TOTAL_MARKS) * 100).toFixed(2),
    correct, wrong, unattempted,
    (sw.PHYSICS || {}).correct || 0, (sw.PHYSICS || {}).wrong || 0,
    (sw.CHEMISTRY || {}).correct || 0, (sw.CHEMISTRY || {}).wrong || 0,
    (sw.BIOLOGY || {}).correct || 0, (sw.BIOLOGY || {}).wrong || 0,
    (sw.ENGLISH || {}).correct || 0, (sw.ENGLISH || {}).wrong || 0,
    grading.grade, grading.remark
  ]);
}

function seedDemoQuestions_(sheet) {
  // Add sample questions for testing
  const demos = [
    ['q-1', 'Physics', 'Mechanics', 'Kinematics', 'A body starts from rest and accelerates uniformly at 2 m/s². What is its velocity after 5 seconds?', '5 m/s', '10 m/s', '15 m/s', '20 m/s', 1, 'v = u + at = 0 + 2×5 = 10 m/s', 'Easy'],
    ['q-2', 'Chemistry', 'Physical Chemistry', 'Stoichiometry', 'What is the molar mass of water (H₂O)?', '16 g/mol', '18 g/mol', '20 g/mol', '22 g/mol', 1, 'H₂O = 2(1) + 16 = 18 g/mol', 'Easy'],
    ['q-3', 'Biology', 'Zoology - Human Physiology', 'Digestive System', 'Which enzyme breaks down proteins in the stomach?', 'Amylase', 'Lipase', 'Pepsin', 'Trypsin', 2, 'Pepsin is the main gastric protease', 'Easy'],
    ['q-4', 'English', 'Grammar', 'Tenses', 'Choose the correct form: She ___ to school every day.', 'go', 'goes', 'going', 'gone', 1, 'Third person singular requires -s', 'Easy']
  ];
  
  // Duplicate to have enough for testing
  for (let i = 0; i < 50; i++) {
    demos.forEach(d => {
      const newId = `q-demo-${i}-${d[0]}`;
      sheet.appendRow([newId, ...d.slice(1)]);
    });
  }
}

/**
 * GET SYLLABUS POLICY
 * Returns the complete syllabus distribution for display
 */
function getSyllabusPolicy() {
  return {
    config: MODEL_EXAM_CONFIG,
    description: "This model exam follows the exact pattern prescribed by Nepal's Medical Education Commission (MEC) for CEE entrance examination."
  };
}
