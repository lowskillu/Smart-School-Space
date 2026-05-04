export interface Question {
  id: number;
  type: "multiple-choice" | "free-response";
  content: string;
  passage?: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
}

export interface MockTest {
  id: string;
  examType: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
}

export const MOCK_SAT_READING: MockTest = {
  id: "sat-reading-1",
  examType: "SAT",
  title: "SAT Reading & Writing — Practice 1",
  durationMinutes: 64,
  questions: [
    {
      id: 1,
      type: "multiple-choice",
      category: "Information and Ideas",
      passage: "The following text is from the 1923 poem 'The Waste Land' by T.S. Eliot. 'April is the cruelest month, breeding / Lilacs out of the dead land, mixing / Memory and desire, stirring / Dull roots with spring rain.'",
      content: "According to the text, what is the primary characteristic of April?",
      options: [
        "It is a time of pure joy and celebration.",
        "It is unexpectedly harsh and painful.",
        "It is a month where nothing grows.",
        "It is dominated by heavy autumn rains."
      ],
      correctAnswer: "It is unexpectedly harsh and painful.",
      explanation: "The text explicitly states that 'April is the cruelest month', which aligns with being harsh and painful.",
    },
    {
      id: 2,
      type: "multiple-choice",
      category: "Craft and Structure",
      content: "Which choice completes the text with the most logical and precise word or phrase? 'The researcher argued that the data was not just suggestive but _______, providing definitive proof of the hypothesis.'",
      options: [
        "ambiguous",
        "conclusive",
        "tentative",
        "redundant"
      ],
      correctAnswer: "conclusive",
      explanation: "The word 'conclusive' fits the context of providing 'definitive proof', contrasting with 'just suggestive'.",
    },
  ],
};

export const MOCK_SAT_MATH: MockTest = {
  id: "sat-math-1",
  examType: "SAT",
  title: "SAT Math — Practice 1",
  durationMinutes: 70,
  questions: [
    {
      id: 1,
      type: "multiple-choice",
      category: "Algebra",
      content: "If 3x + 6 = 18, what is the value of x + 2?",
      options: [
        "4",
        "6",
        "8",
        "10"
      ],
      correctAnswer: "6",
      explanation: "Solve for x: 3x = 12 => x = 4. Then x + 2 = 6.",
    },
    {
      id: 2,
      type: "free-response",
      category: "Problem Solving and Data Analysis",
      content: "A circle has a radius of 5. What is its area in terms of π?",
      correctAnswer: "25",
      explanation: "Area = πr^2. With r=5, Area = 25π.",
    }
  ]
};
