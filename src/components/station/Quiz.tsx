"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/data/bodies";
import { recordQuiz } from "@/lib/progress";
import { Icon } from "@/components/ui/Icon";

/** Quiz breve de tres preguntas. Explica cada respuesta; no hay penalización. */
export function Quiz({ stationId, questions }: { stationId: string; questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const done = answers.every((a) => a !== null);
  const score = answers.reduce<number>((acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0);

  function choose(qi: number, oi: number) {
    if (answers[qi] !== null) return;
    const next = answers.map((a, i) => (i === qi ? oi : a));
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      const s = next.reduce<number>((acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0);
      recordQuiz(stationId, s);
    }
  }

  return (
    <div>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 24 }}>
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li key={q.question}>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, marginBottom: 10 }}>
                  {qi + 1}. {q.question}
                </legend>
                <div style={{ display: "grid", gap: 8 }}>
                  {q.options.map((opt, oi) => {
                    let state: "idle" | "correct" | "wrong" = "idle";
                    if (chosen !== null && chosen !== undefined) {
                      if (oi === q.correct) state = "correct";
                      else if (oi === chosen) state = "wrong";
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        className="quiz-option"
                        data-state={state}
                        aria-pressed={chosen === oi}
                        disabled={chosen !== null && chosen !== undefined && state === "idle"}
                        onClick={() => choose(qi, oi)}
                      >
                        {state === "correct" && <Icon name="check" size={18} />}
                        {state === "wrong" && <Icon name="close" size={18} />}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {chosen !== null && chosen !== undefined && (
                  <p className="small" style={{ marginTop: 10 }} role="status">
                    <strong>{chosen === q.correct ? "Correcto. " : "No era esa. "}</strong>
                    {q.explanation}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="notice notice--ok" style={{ marginTop: 20 }} role="status">
          <Icon name="check" />
          <div>
            Respondiste bien {score} de {questions.length}.{" "}
            <button
              type="button"
              className="text-link text-link--block"
              style={{ background: "none", border: 0, paddingInline: 0, font: "inherit", cursor: "pointer" }}
              onClick={() => setAnswers(questions.map(() => null))}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
