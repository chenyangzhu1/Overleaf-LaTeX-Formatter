'use strict';

(function installInjectedRuntime() {
  if (window.__latexFormatRuntimeInstalled) {
    return;
  }

  window.__latexFormatRuntimeInstalled = true;

  const CHANNEL = 'latex-format-extension';

  function isVisible(element) {
    if (!element) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  }

  function createMonacoCandidate(editor, index) {
    return {
      id: `monaco-${index}`,
      type: 'monaco',
      visible: typeof editor.getDomNode === 'function' ? isVisible(editor.getDomNode()) : true,
      focused: typeof editor.hasTextFocus === 'function' ? editor.hasTextFocus() : false,
      languageHint: (() => {
        try {
          const model = editor.getModel();
          if (!model || typeof model.getLanguageId !== 'function') {
            return '';
          }

          return model.getLanguageId() || '';
        } catch (_error) {
          return '';
        }
      })(),
      getValue() {
        const model = editor.getModel();
        if (!model) {
          throw new Error('Monaco model is unavailable');
        }

        return model.getValue();
      },
      setValue(nextText) {
        const model = editor.getModel();
        if (!model) {
          throw new Error('Monaco model is unavailable');
        }

        const fullRange = model.getFullModelRange();
        editor.pushUndoStop();
        editor.executeEdits('latex-format-extension', [
          {
            range: fullRange,
            text: nextText,
            forceMoveMarkers: true
          }
        ]);
        editor.pushUndoStop();
      }
    };
  }

  function resolveMonacoCandidates() {
    const monaco = window.monaco;
    if (!monaco || !monaco.editor) {
      return [];
    }

    if (typeof monaco.editor.getEditors !== 'function') {
      return [];
    }

    const editors = monaco.editor.getEditors();
    if (!Array.isArray(editors) || editors.length === 0) {
      return [];
    }

    const candidates = [];
    for (let index = 0; index < editors.length; index += 1) {
      const editor = editors[index];
      try {
        candidates.push(createMonacoCandidate(editor, index));
      } catch (_error) {
        continue;
      }
    }

    return candidates;
  }

  function createAceCandidate(editor, node, index) {
    const session = editor.getSession && editor.getSession();
    const modeId = session && session.getMode && session.getMode().$id ? session.getMode().$id : '';

    return {
      id: `ace-${index}`,
      type: 'ace',
      visible: isVisible(node),
      focused: typeof editor.isFocused === 'function' ? editor.isFocused() : false,
      modeHint: modeId,
      getValue() {
        return editor.getValue();
      },
      setValue(nextText) {
        const selection = editor.getSelectionRange();
        editor.getSession().setValue(nextText);

        try {
          editor.selection.setRange(selection, false);
        } catch (_error) {
          editor.navigateFileStart();
        }
      }
    };
  }

  function resolveAceCandidates() {
    const ace = window.ace;
    if (!ace || typeof ace.edit !== 'function') {
      return [];
    }

    const editorNodes = Array.from(document.querySelectorAll('.ace_editor'));
    if (editorNodes.length === 0) {
      return [];
    }

    const candidates = [];
    for (let index = 0; index < editorNodes.length; index += 1) {
      const node = editorNodes[index];

      try {
        candidates.push(createAceCandidate(ace.edit(node), node, index));
      } catch (_error) {
        continue;
      }
    }

    return candidates;
  }

  function createCodeMirror5Candidate(instance, node, index) {
    let modeHint = '';
    try {
      const mode = typeof instance.getOption === 'function' ? instance.getOption('mode') : '';
      modeHint = typeof mode === 'string' ? mode : JSON.stringify(mode || '');
    } catch (_error) {
      modeHint = '';
    }

    return {
      id: `codemirror5-${index}`,
      type: 'codemirror5',
      visible: isVisible(node),
      focused: typeof instance.hasFocus === 'function' ? instance.hasFocus() : false,
      modeHint,
      getValue() {
        return instance.getValue();
      },
      setValue(nextText) {
        const ranges = typeof instance.listSelections === 'function' ? instance.listSelections() : null;
        instance.setValue(nextText);

        if (ranges && typeof instance.setSelections === 'function') {
          try {
            instance.setSelections(ranges);
          } catch (_error) {
            // Keep default cursor position if selection restore fails.
          }
        }
      }
    };
  }

  function resolveCodeMirror5Candidates() {
    const nodes = Array.from(document.querySelectorAll('.CodeMirror'));
    if (nodes.length === 0) {
      return [];
    }

    const candidates = [];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const instance = node && node.CodeMirror;
      if (!instance || typeof instance.getValue !== 'function' || typeof instance.setValue !== 'function') {
        continue;
      }

      try {
        candidates.push(createCodeMirror5Candidate(instance, node, index));
      } catch (_error) {
        continue;
      }
    }

    return candidates;
  }

  function isCodeMirror6View(view) {
    return (
      !!view &&
      !!view.state &&
      !!view.state.doc &&
      typeof view.state.doc.toString === 'function' &&
      typeof view.dispatch === 'function'
    );
  }

  function findCodeMirror6ViewFromNode(root) {
    if (!root || typeof root !== 'object') {
      return null;
    }

    if (root.cmView && isCodeMirror6View(root.cmView.view)) {
      return root.cmView.view;
    }

    if (typeof document.createTreeWalker !== 'function') {
      return null;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let current = walker.currentNode;

    while (current) {
      if (current.cmView && isCodeMirror6View(current.cmView.view)) {
        return current.cmView.view;
      }

      current = walker.nextNode();
    }

    return null;
  }

  function createCodeMirror6Candidate(view, node, index) {
    return {
      id: `codemirror6-${index}`,
      type: 'codemirror6',
      visible: isVisible(node),
      focused: !!view.hasFocus,
      modeHint: (node.className || '') + ' ' + (view.dom && view.dom.className ? view.dom.className : ''),
      getValue() {
        return view.state.doc.toString();
      },
      setValue(nextText) {
        const selection = view.state.selection;
        const docLength = view.state.doc.length;
        view.dispatch({
          changes: {
            from: 0,
            to: docLength,
            insert: nextText
          },
          selection
        });
      }
    };
  }

  function resolveCodeMirror6Candidates() {
    const nodes = Array.from(document.querySelectorAll('.cm-editor, .cm-content'));
    if (nodes.length === 0) {
      return [];
    }

    const candidates = [];
    const seenViews = new Set();

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const view = findCodeMirror6ViewFromNode(node);
      if (!view || seenViews.has(view)) {
        continue;
      }

      seenViews.add(view);

      try {
        candidates.push(createCodeMirror6Candidate(view, node, index));
      } catch (_error) {
        continue;
      }
    }

    return candidates;
  }

  function resolveTextareaCandidates() {
    const textareas = Array.from(document.querySelectorAll('textarea')).filter((element) => isVisible(element));
    if (textareas.length === 0) {
      return [];
    }

    return textareas.map((textarea, index) => ({
      id: `textarea-${index}`,
      type: 'textarea',
      visible: true,
      focused: document.activeElement === textarea,
      languageHint: textarea.getAttribute('data-language') || '',
      getValue() {
        return textarea.value;
      },
      setValue(nextText) {
        textarea.value = nextText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }));
  }

  function resolveEditorCandidates() {
    const monacoCandidates = resolveMonacoCandidates();
    const aceCandidates = resolveAceCandidates();
    const codeMirror5Candidates = resolveCodeMirror5Candidates();
    const codeMirror6Candidates = resolveCodeMirror6Candidates();
    const textareaCandidates = resolveTextareaCandidates();

    return [...monacoCandidates, ...aceCandidates, ...codeMirror5Candidates, ...codeMirror6Candidates, ...textareaCandidates];
  }

  function fallbackPick(candidates, formatLatex) {
    for (const candidate of candidates) {
      try {
        const currentText = candidate.getValue();
        if (typeof currentText !== 'string') {
          continue;
        }

        const formattedText = formatLatex(currentText);
        if (formattedText !== currentText) {
          return {
            candidate,
            currentText,
            formattedText,
            changed: true,
            likelyLatex: window.LatexEditorTarget && typeof window.LatexEditorTarget.isLikelyLatexText === 'function'
              ? window.LatexEditorTarget.isLikelyLatexText(currentText)
              : null
          };
        }
      } catch (_error) {
        continue;
      }
    }

    for (const candidate of candidates) {
      try {
        const currentText = candidate.getValue();
        if (typeof currentText !== 'string') {
          continue;
        }

        return {
          candidate,
          currentText,
          formattedText: currentText,
          changed: false,
          likelyLatex: window.LatexEditorTarget && typeof window.LatexEditorTarget.isLikelyLatexText === 'function'
            ? window.LatexEditorTarget.isLikelyLatexText(currentText)
            : null
        };
      } catch (_error) {
        continue;
      }
    }

    return null;
  }

  function formatCurrentEditor() {
    if (!window.LatexFormatter || typeof window.LatexFormatter.formatLatex !== 'function') {
      throw new Error('Formatter runtime is unavailable');
    }

    const candidates = resolveEditorCandidates();
    if (candidates.length === 0) {
      throw new Error('Could not locate an editable Overleaf text editor');
    }

    let selected = null;
    let usedSmartSelector = false;
    if (window.LatexEditorTarget && typeof window.LatexEditorTarget.pickBestFormatTarget === 'function') {
      usedSmartSelector = true;
      selected = window.LatexEditorTarget.pickBestFormatTarget(candidates, window.LatexFormatter.formatLatex);
    }

    if (!selected && !usedSmartSelector) {
      selected = fallbackPick(candidates, window.LatexFormatter.formatLatex);
    }

    if (!selected || !selected.candidate) {
      throw new Error('Could not detect a valid LaTeX editor target');
    }

    if (!selected.changed) {
      return {
        changed: false,
        editorType: selected.candidate.type,
        candidateId: selected.candidate.id,
        candidateCount: candidates.length,
        likelyLatex: selected.likelyLatex
      };
    }

    selected.candidate.setValue(selected.formattedText);

    return {
      changed: true,
      editorType: selected.candidate.type,
      candidateId: selected.candidate.id,
      candidateCount: candidates.length,
      likelyLatex: selected.likelyLatex
    };
  }

  function postResult(payload) {
    window.postMessage(
      {
        source: CHANNEL,
        type: 'LF_FORMAT_RESULT',
        ...payload
      },
      '*'
    );
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== CHANNEL) {
      return;
    }

    if (event.data.type !== 'LF_RUN_FORMAT') {
      return;
    }

    try {
      const result = formatCurrentEditor();
      postResult({
        ok: true,
        changed: result.changed,
        editorType: result.editorType,
        candidateId: result.candidateId,
        candidateCount: result.candidateCount,
        likelyLatex: result.likelyLatex
      });
    } catch (error) {
      postResult({
        ok: false,
        error: error && error.message ? error.message : 'unknown error'
      });
    }
  });
})();
