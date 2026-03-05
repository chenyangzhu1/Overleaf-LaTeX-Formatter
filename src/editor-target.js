'use strict';

(function bootstrap(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.LatexEditorTarget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildEditorTarget() {
  function getTextMetrics(text) {
    const value = typeof text === 'string' ? text : '';
    const nonWhitespaceLength = value.replace(/\s+/g, '').length;
    const lineCount = value.length === 0 ? 0 : value.split('\n').length;

    return {
      nonWhitespaceLength,
      lineCount
    };
  }

  function isLikelyLatexText(text) {
    const value = typeof text === 'string' ? text : '';
    if (!value) {
      return false;
    }

    const latexTokenRe = /\\(begin|end|section|subsection|documentclass|usepackage|item|if|fi|else)\b/;
    if (latexTokenRe.test(value)) {
      return true;
    }

    return /\$[^$]+\$/.test(value);
  }

  function hasLatexHint(value) {
    return /latex|tex/.test((value || '').toLowerCase());
  }

  function scoreCandidate(candidate, text) {
    const metrics = getTextMetrics(text);
    const likelyLatex = isLikelyLatexText(text);

    let score = 0;

    if (candidate.focused) {
      score += 220;
    }

    if (candidate.visible) {
      score += 140;
    }

    if (
      candidate.type === 'monaco' ||
      candidate.type === 'ace' ||
      candidate.type === 'codemirror5' ||
      candidate.type === 'codemirror6'
    ) {
      score += 120;
    }

    if (hasLatexHint(candidate.languageHint) || hasLatexHint(candidate.modeHint)) {
      score += 320;
    }

    score += Math.min(metrics.nonWhitespaceLength, 10000) / 40;

    if (candidate.type === 'textarea') {
      if (likelyLatex) {
        score += 80;
      } else {
        score -= 1200;
      }

      if (metrics.nonWhitespaceLength < 20) {
        score -= 400;
      }
    }

    return {
      score,
      metrics,
      likelyLatex
    };
  }

  function safeFormat(formatLatex, text) {
    try {
      const formatted = formatLatex(text);
      if (typeof formatted === 'string') {
        return {
          ok: true,
          formatted
        };
      }

      return {
        ok: false,
        error: new Error('formatter did not return a string')
      };
    } catch (error) {
      return {
        ok: false,
        error
      };
    }
  }

  function pickBestFormatTarget(candidates, formatLatex) {
    if (!Array.isArray(candidates) || candidates.length === 0 || typeof formatLatex !== 'function') {
      return null;
    }

    const evaluated = [];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate.getValue !== 'function') {
        continue;
      }

      let currentText;
      try {
        currentText = candidate.getValue();
      } catch (_error) {
        continue;
      }

      if (typeof currentText !== 'string') {
        continue;
      }

      const formatResult = safeFormat(formatLatex, currentText);
      if (!formatResult.ok) {
        continue;
      }

      const { score, metrics, likelyLatex } = scoreCandidate(candidate, currentText);
      const changed = formatResult.formatted !== currentText;

      evaluated.push({
        candidate,
        currentText,
        formattedText: formatResult.formatted,
        changed,
        score: score + (changed ? 1000 : 0),
        textLength: currentText.length,
        nonWhitespaceLength: metrics.nonWhitespaceLength,
        likelyLatex
      });
    }

    if (evaluated.length === 0) {
      return null;
    }

    evaluated.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.nonWhitespaceLength !== a.nonWhitespaceLength) {
        return b.nonWhitespaceLength - a.nonWhitespaceLength;
      }

      return b.textLength - a.textLength;
    });

    const selected = evaluated[0];
    if (selected.score < -300) {
      return null;
    }

    return selected;
  }

  return {
    pickBestFormatTarget,
    isLikelyLatexText,
    scoreCandidate
  };
});
