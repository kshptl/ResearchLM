import { describe, expect, it } from "vitest"
import { enforceQuestionBalance, isQuestionSetBalanced } from "@/features/generation/question-balance"

describe("question balance", () => {
  it("passes when all why/what/when/where/how categories are present", () => {
    const questions = [
      "Why does this system behave this way?",
      "What assumptions are embedded here?",
      "When should this method be applied?",
      "Where does the bottleneck occur?",
      "How can we validate this outcome?"
    ]

    expect(isQuestionSetBalanced(questions)).toBe(true)
  })

  it("returns missing categories for incomplete sets", () => {
    const result = enforceQuestionBalance(["What is this?", "How does this work?"])
    expect(result.balanced).toBe(false)
    expect(result.missing).toEqual(expect.arrayContaining(["why", "when", "where"]))
  })
})
