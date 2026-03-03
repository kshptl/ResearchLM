const QUESTION_CATEGORIES = ["why", "what", "when", "where", "how"] as const

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number]

export type QuestionCoverage = Record<QuestionCategory, number>

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase()
}

export function questionCoverage(questions: string[]): QuestionCoverage {
  const coverage: QuestionCoverage = {
    why: 0,
    what: 0,
    when: 0,
    where: 0,
    how: 0
  }

  for (const rawQuestion of questions) {
    const question = normalizeQuestion(rawQuestion)
    for (const category of QUESTION_CATEGORIES) {
      if (question.startsWith(`${category} `) || question.includes(`${category} `)) {
        coverage[category] += 1
      }
    }
  }

  return coverage
}

export function isQuestionSetBalanced(questions: string[]): boolean {
  const coverage = questionCoverage(questions)
  return QUESTION_CATEGORIES.every((category) => coverage[category] > 0)
}

export function enforceQuestionBalance(questions: string[]): { balanced: boolean; missing: QuestionCategory[] } {
  const coverage = questionCoverage(questions)
  const missing = QUESTION_CATEGORIES.filter((category) => coverage[category] === 0)
  return {
    balanced: missing.length === 0,
    missing
  }
}
