import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import {
  getAllCompletions,
  getNamespaceCompletions,
  getHoverInfo,
  createCompletionItem
} from './completions';
import { createSignatureHelpProvider } from './signatureHelp';
import { Parser } from './parser/parser';
import { PineScriptValidator } from './parser/validator';
import { ComprehensiveValidator, ErrType } from './parser/comprehensiveValidator';
import { AccurateValidator } from './parser/accurateValidator';
import { DefinitionProvider } from './definitionProvider';
import { RenameProvider } from './renameProvider';
import { ReferenceProvider } from './referenceProvider';

export function activate(context: vscode.ExtensionContext) {
  // Optional: ensure files.associations maps *.pine -> pine
  {
    const cfg = vscode.workspace.getConfiguration();
    const shouldApply = cfg.get<boolean>('pine.applyFileAssociation', true);
    if (shouldApply) {
      const assoc = cfg.get<Record<string, string>>('files.associations', {});
      if (assoc['*.pine'] !== 'pine') {
        const newAssoc = { ...assoc, '*.pine': 'pine' };
        try {
          // VS Code returns a Thenable; wrap ignoring rejection for safety on readonly workspaces
          const t = cfg.update('files.associations', newAssoc, vscode.ConfigurationTarget.Workspace);
          // Avoid unhandled rejections without relying on .catch (not typed on Thenable)
          Promise.resolve(t as unknown as Promise<void>).then(() => undefined, () => undefined);
        } catch {
          // ignore
        }
      }
    }
  }
  // Formatter: trims trailing spaces, normalizes consecutive blank lines (max 1), and ensures final newline
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('pine', {
      provideDocumentFormattingEdits(document) {
        const edits: vscode.TextEdit[] = [];
        let lastWasEmpty = false;
        for (let i = 0; i < document.lineCount; i++) {
          const line = document.lineAt(i);
          const trimmed = line.text.replace(/[\t ]+$/g, '');
          let out = trimmed;
          const isEmpty = out.length === 0;
          if (isEmpty && lastWasEmpty) {
            // collapse extra blank lines
            const deleteRange = new vscode.Range(line.range.start, line.rangeIncludingLineBreak.end);
            edits.push(vscode.TextEdit.delete(deleteRange));
            continue;
          }
          if (out !== line.text) {
            edits.push(vscode.TextEdit.replace(line.range, trimmed));
          }
          lastWasEmpty = isEmpty;
        }
        // Ensure final newline
        const lastLine = document.lineAt(document.lineCount - 1);
        if (lastLine.text.length !== 0) {
          edits.push(vscode.TextEdit.insert(lastLine.range.end, '\n'));
        }
        return edits;
      }
    })
  );

  // Completion Provider - Enhanced with comprehensive v6 API
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      'pine',
      {
        provideCompletionItems(document, position) {
          const line = document.lineAt(position.line).text;
          const beforeCursor = line.substring(0, position.character);

          // Check if we're completing after a namespace dot
          const namespaceMatch = beforeCursor.match(/([a-z]+)\.\s*$/);
          if (namespaceMatch) {
            const namespace = namespaceMatch[1];
            const nsItems = getNamespaceCompletions(namespace);
            if (nsItems.length > 0) {
              return nsItems;
            }
          }

          // Return all completions (includes built-ins, keywords, and namespace hints)
          const items = getAllCompletions();

          // Optional HTTP suggestions
          const cfg = vscode.workspace.getConfiguration();
          const enabled = cfg.get<boolean>('pine.httpSuggestions.enabled', false);
          const endpoint = cfg.get<string>('pine.httpSuggestions.endpoint', '');
          const timeoutMs = cfg.get<number>('pine.httpSuggestions.timeoutMs', 1200);

          if (!enabled || !endpoint) {
            return items;
          }

          return new Promise<vscode.CompletionItem[]>((resolve) => {
            try {
              const client = /^https:/i.test(endpoint) ? https : http;
              const req = client.request(endpoint, { method: 'POST', timeout: timeoutMs, headers: { 'Content-Type': 'application/json' } }, res => {
                const chunks: Buffer[] = [];
                res.on('data', c => chunks.push(Buffer.from(c)));
                res.on('end', () => {
                  try {
                    const body = Buffer.concat(chunks).toString('utf8');
                    const parsed = JSON.parse(body) as { suggestions?: string[] };
                    const extra = (parsed.suggestions || []).slice(0, 20).map(s => new vscode.CompletionItem(s, vscode.CompletionItemKind.Snippet));
                    resolve([...items, ...extra]);
                  } catch {
                    resolve(items);
                  }
                });
              });
              const wordPrefix = document.getWordRangeAtPosition(position);
              const prefixText = wordPrefix ? document.getText(wordPrefix) : '';
              const payload = JSON.stringify({
                documentText: document.getText(),
                position: { line: position.line, character: position.character },
                prefix: prefixText
              });
              req.on('error', () => resolve(items));
              req.write(payload);
              req.end();
            } catch {
              resolve(items);
            }
          });
        }
      },
      '.' // trigger on dot
    )
  );

  // Hover Provider - Enhanced with rich documentation
  context.subscriptions.push(
    vscode.languages.registerHoverProvider('pine', {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /[A-Za-z_.]+/);
        const symbol = range ? document.getText(range) : '';
        if (!symbol) return undefined;

        return getHoverInfo(symbol);
      }
    })
  );

  // Signature Help Provider - Parameter hints
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider(
      'pine',
      createSignatureHelpProvider(),
      '(', ','  // Trigger on opening paren and comma
    )
  );

  // Diagnostics with ENHANCED parameter validation
  const diagCollection = vscode.languages.createDiagnosticCollection('pine');
  context.subscriptions.push(diagCollection);

  /**
   * Run AccurateValidator and collect diagnostics
   */
  const runAccurateValidation = (text: string, diags: vscode.Diagnostic[]): void => {
    try {
      const accurateValidator = new AccurateValidator();
      const errors = accurateValidator.validate(text);

      for (const error of errors) {
        const pos = new vscode.Position(error.line - 1, error.column - 1);
        const endPos = pos.translate(0, error.length);
        diags.push(new vscode.Diagnostic(
          new vscode.Range(pos, endPos),
          error.message,
          error.severity
        ));
      }
    } catch (e) {
      // Validation errors are expected, don't crash the extension
    }
  };

  /**
   * Run AST-based comprehensive validation
   */
  const runComprehensiveValidation = (text: string, diags: vscode.Diagnostic[]): void => {
    try {
      const parser = new Parser(text);
      const ast = parser.parse();

      // Collect parser errors
      const parserErrors = parser.getErrors();
      for (const error of parserErrors) {
        const pos = new vscode.Position(error.line - 1, error.column - 1);
        const endPos = pos.translate(0, 1);
        diags.push(new vscode.Diagnostic(
          new vscode.Range(pos, endPos),
          error.message,
          vscode.DiagnosticSeverity.Error
        ));
      }

      // Run comprehensive validator
      const validator = new ComprehensiveValidator();
      const comprehensiveErrors = validator.validate(ast);
      for (const error of comprehensiveErrors) {
        if (error.type !== ErrType.Unused) {
          continue;
        }

        const pos = new vscode.Position(error.line - 1, error.column - 1);
        const endPos = pos.translate(0, error.length);
        const range = new vscode.Range(pos, endPos);

        const diag = new vscode.Diagnostic(
          range,
          error.message,
          vscode.DiagnosticSeverity.Hint,
        );
        diag.tags = [vscode.DiagnosticTag.Unnecessary];

        diags.push(diag);
      }
    } catch (e: any) {
      // Parser errors are collected above via getErrors()
    }
  };

  /**
   * Helper to find regex match and create diagnostic
   */
  const findAndDiagnose = (
    doc: vscode.TextDocument,
    regex: RegExp,
    message: string,
    severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning
  ): vscode.Diagnostic | null => {
    const text = doc.getText();
    const match = regex.exec(text);
    if (!match) return null;

    const pos = doc.positionAt(match.index);
    const endPos = pos.translate(0, Math.max(1, match[0].length));
    return new vscode.Diagnostic(new vscode.Range(pos, endPos), message, severity);
  };

  /**
   * Helper to find all regex matches and create diagnostics
   */
  const findAllAndDiagnose = (
    doc: vscode.TextDocument,
    regex: RegExp,
    callback: (match: RegExpExecArray, doc: vscode.TextDocument) => vscode.Diagnostic | null
  ): vscode.Diagnostic[] => {
    const text = doc.getText();
    const diags: vscode.Diagnostic[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const diag = callback(match, doc);
      if (diag) diags.push(diag);
    }

    return diags;
  };

  /**
   * Run pattern-based validations
   */
  const runPatternValidation = (doc: vscode.TextDocument, diags: vscode.Diagnostic[]): void => {
    const text = doc.getText();

    // 1) Version header
    if (!/^\s*\/\/\@version=6/m.test(text)) {
      diags.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        'Recommend using //@version=6 for Pine v6.',
        vscode.DiagnosticSeverity.Warning
      ));
    }

    // 2) input.timeframe suggestion
    const timeframeDiag = findAndDiagnose(
      doc,
      /input\.string\s*\(\s*\"\d+\"\s*,\s*\"HTF/m,
      'Use input.timeframe(...) for timeframe inputs in v6.'
    );
    if (timeframeDiag && !/input\.timeframe/m.test(text)) {
      diags.push(timeframeDiag);
    }

    // 3) time()/session boolean usage
    const timeDiag = findAndDiagnose(
      doc,
      /\btime\(timeframe\.period,\s*\w+\)/m,
      'Wrap session checks as: not na(time(timeframe.period, session)) to avoid bool-NA pitfalls.'
    );
    if (timeDiag && !/not\s+na\(time\(timeframe\.period,/m.test(text)) {
      diags.push(timeDiag);
    }

    // 4) ta.change in condition hint
    const taChangeDiag = findAndDiagnose(
      doc,
      /ta\.change\s*\(/m,
      'Consider assigning ta.change(...) to a variable before using in conditions for consistent evaluation.'
    );
    if (taChangeDiag && /\?\s*\(|\)\s*and|\)\s*or/.test(text)) {
      diags.push(taChangeDiag);
    }

    // 5) timenow milliseconds reminder
    const timenowDiag = findAndDiagnose(
      doc,
      /timenow\s*-\s*\w+\s*<=\s*\w+\s*\*\s*60(?!\s*\*\s*1000)/m,
      'timenow is in milliseconds. Multiply seconds by 1000.'
    );
    if (timenowDiag) diags.push(timenowDiag);

    // 6) Invalid functions (e.g., math.clamp)
    const mathClampDiag = findAndDiagnose(
      doc,
      /\bmath\.clamp\b/,
      'Pine v6: use math.min/math.max pattern; math.clamp is not available.'
    );
    if (mathClampDiag) diags.push(mathClampDiag);

    // 7) plotshape with wrong parameter name (shape= instead of style=)
    diags.push(...findAllAndDiagnose(
      doc,
      /plotshape\s*\([^)]*\bshape\s*=/g,
      (match, doc) => {
        const shapeIndex = match[0].indexOf('shape=');
        const pos = doc.positionAt(match.index + shapeIndex);
        const endPos = pos.translate(0, 6);
        return new vscode.Diagnostic(
          new vscode.Range(pos, endPos),
          'Invalid parameter "shape". Did you mean "style"?',
          vscode.DiagnosticSeverity.Error
        );
      }
    ));

    // 8) plotchar with wrong parameter name (shape= instead of char=)
    diags.push(...findAllAndDiagnose(
      doc,
      /plotchar\s*\([^)]*\bshape\s*=/g,
      (match, doc) => {
        const shapeIndex = match[0].indexOf('shape=');
        const pos = doc.positionAt(match.index + shapeIndex);
        const endPos = pos.translate(0, 6);
        return new vscode.Diagnostic(
          new vscode.Range(pos, endPos),
          'Invalid parameter "shape". Did you mean "char"?',
          vscode.DiagnosticSeverity.Error
        );
      }
    ));

    // 9) timeframe_gaps without timeframe parameter
    diags.push(...findAllAndDiagnose(
      doc,
      /(indicator|strategy)\s*\([^)]*timeframe_gaps\s*=\s*true[^)]*\)/g,
      (match, doc) => {
        const fullCall = match[0];
        if (!/\btimeframe\s*=/.test(fullCall)) {
          const gapsIndex = fullCall.indexOf('timeframe_gaps');
          const pos = doc.positionAt(match.index + gapsIndex);
          const endPos = pos.translate(0, 14);
          return new vscode.Diagnostic(
            new vscode.Range(pos, endPos),
            '"timeframe_gaps" has no effect without a "timeframe" argument in indicator/strategy call',
            vscode.DiagnosticSeverity.Warning
          );
        }
        return null;
      }
    ));

    // 10) alertcondition with too many arguments
    diags.push(...findAllAndDiagnose(
      doc,
      /alertcondition\s*\(([^)]+)\)/g,
      (match, doc) => {
        const args = match[1].split(',').map(a => a.trim());
        if (args.length > 3) {
          const pos = doc.positionAt(match.index);
          const endPos = pos.translate(0, 14);
          return new vscode.Diagnostic(
            new vscode.Range(pos, endPos),
            `alertcondition() expects 3 parameters (condition, title, message), but got ${args.length}`,
            vscode.DiagnosticSeverity.Error
          );
        }
        return null;
      }
    ));

    // 11) input.string() without required defval parameter
    diags.push(...findAllAndDiagnose(
      doc,
      /input\.string\s*\(\s*\)/g,
      (match, doc) => {
        const pos = doc.positionAt(match.index);
        const endPos = pos.translate(0, 12);
        return new vscode.Diagnostic(
          new vscode.Range(pos, endPos),
          'input.string() requires at least one parameter: defval (default value)',
          vscode.DiagnosticSeverity.Error
        );
      }
    ));
  };

  const runDiagnostics = (doc: vscode.TextDocument) => {
    if (doc.languageId !== 'pine') return;
    const text = doc.getText();
    const diags: vscode.Diagnostic[] = [];

    // Run all validation types
    runAccurateValidation(text, diags);
    runComprehensiveValidation(text, diags);
    runPatternValidation(doc, diags);

    diagCollection.set(doc.uri, diags);
  };

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(runDiagnostics));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => runDiagnostics(e.document)));
  if (vscode.window.activeTextEditor) runDiagnostics(vscode.window.activeTextEditor.document);

  // Command: Validate current file
  context.subscriptions.push(
    vscode.commands.registerCommand('pine.validate', async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed || ed.document.languageId !== 'pine') {
        vscode.window.showInformationMessage('Open a Pine (.pine) file to validate.');
        return;
      }
      runDiagnostics(ed.document);
      vscode.window.showInformationMessage('Pine v6 validation completed.');
    })
  );

  // Command: Show docs for symbol
  context.subscriptions.push(
    vscode.commands.registerCommand('pine.showDocs', async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed || ed.document.languageId !== 'pine') {
        vscode.window.showInformationMessage('Open a Pine (.pine) file to show docs.');
        return;
      }
      const wordRange = ed.document.getWordRangeAtPosition(ed.selection.active, /[A-Za-z_.]+/);
      const word = wordRange ? ed.document.getText(wordRange) : '';
      const hoverInfo = getHoverInfo(word);
      if (!hoverInfo) {
        vscode.window.showInformationMessage(`No docs known for '${word}'.`);
        return;
      }
      const panel = vscode.window.createWebviewPanel('pineDocs', `Pine: ${word}`, vscode.ViewColumn.Beside, { enableScripts: false });
      const esc = (s: string) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c] as string));
      // Extract markdown content from hover
      const md = hoverInfo.contents[0];
      const docText = typeof md === 'string' ? md : (md as vscode.MarkdownString).value;
      panel.webview.html = `<html><body><h2>${esc(word)}</h2><div style="white-space:pre-wrap;font-family:var(--vscode-editor-font-family)">${esc(docText)}</div></body></html>`;
    })
  );

  // Go to Definition Provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { language: 'pine', scheme: 'file' },
      new DefinitionProvider()
    )
  );

  // Rename Provider
  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      { language: 'pine', scheme: 'file' },
      new RenameProvider()
    )
  );

  // Reference Provider
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      { language: 'pine', scheme: 'file' },
      new ReferenceProvider()
    )
  );
}

export function deactivate() {}
