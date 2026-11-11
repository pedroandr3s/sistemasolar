"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/data/bodies";
import { recordQuiz } from "@/lib/progress";
import { Icon } from "@/components/ui/Icon";

/**
 * Desafío de tres preguntas, de a una por vez. Al responder se explica la
 * respuesta de inmediato y con buen tono; no hay castigo por equivocarse.
 */
export function Quiz({ stationId, questions }: { stationId: string; questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const score = answers.reduce<number>((acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0);
  const q = questions[index];
  const chosen = answers[index] ?? null;

  function choose(oi: number) {
    if (chosen !== null) return;
    const next = answers.map((a, i) => (i === index ? oi : a));
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      recordQuiz(
        stationId,
        next.reduce<number>((acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0),
      );
    }
  }

  function restart() {
    setAnswers(questions.map(() => null));
    setIndex(0);
    setFinished(false);
  }

  if (finished || !q) {
    const all = score === questions.length;
    return (
      <div className="quiz-result" role="status">
        <span className="quiz-result__stars" aria-hidden="true">
          {questions.map((_, i) => (
            <Icon key={i} name="star" size={34} data-on={i < score ? "true" : "false"} />
          ))}
        </span>
        <p className="quiz-result__title">
          {all ? "¡Las tres correctas!" : score === 0 ? "Esta vez no salió" : `¡Bien! ${score} de ${questions.length}`}
        </p>
        <p>
          {all
            ? "Ya conoces muy bien esta parada."
            : "Cada pregunta trae su explicación. Puedes intentarlo otra vez cuando quieras."}
        </p>
        <button type="button" className="btn btn--block" onClick={restart}>
          <Icon name="reset" size={20} />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  const last = index === questions.length - 1;
  return (
    <div className="quiz">
      <p className="quiz__count" aria-hidden="true">
        {questions.map((_, i) => (
          <span key={i} data-state={i < index ? "done" : i === index ? "now" : "todo"} />
        ))}
      </p>
      <fieldset>
        <legend>
          <span className="sr-only">
            Pregunta {index + 1} de {questions.length}.{" "}
          </span>
          {q.question}
        </legend>
        <div className="quiz__options">
          {q.options.map((opt, oi) => {
            let state: "idle" | "correct" | "wrong" = "idle";
            if (chosen !== null) {
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
                disabled={chosen !== null && state === "idle"}
                onClick={() => choose(oi)}
              >
                {state === "correct" && <Icon name="check" size={20} />}
                {state === "wrong" && <Icon name="close" size={20} />}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {chosen !== null && (
        <>
          <p className="quiz__feedback" role="status" data-ok={chosen === q.correct ? "true" : "false"}>
            <strong>{chosen === q.correct ? "¡Muy bien! " : "Casi. "}</strong>
            {q.explanation}
          </p>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => (last ? setFinished(true) : setIndex(index + 1))}
          >
            {last ? "Ver cómo me fue" : "Siguiente pregunta"}
            <Icon name="arrow-right" size={20} />
          </button>
        </>
      )}
    </div>
  );
}
