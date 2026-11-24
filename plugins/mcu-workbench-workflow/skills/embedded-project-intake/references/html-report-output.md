# HTML Report Output

Use this reference whenever `embedded-project-intake` generates a final report. HTML is mandatory for every final intake report, not only for browser-viewing requests.

The Markdown intake report remains the source-of-truth artifact. The HTML report is a required browser-readable artifact derived from the final Markdown content. The HTML must follow the same **module-hierarchical, Chinese-titled, diagram-first structure with a table of contents** as the Markdown report.

## Generation Rules

- Always generate a standalone HTML file that opens directly in a browser without a dev server.
- Save the Markdown report first, then generate the HTML version from the same conclusions, evidence, diagrams, risks, unknowns, and AI handoff summary.
- Save the HTML next to the Markdown report unless the user specifies another path.
- Use a stable lowercase filename such as `embedded-project-intake-<topic>.html`.
- In chat, provide only a short summary plus clickable Markdown and HTML file links. Do not paste the full report again.
- Do not add external CSS, tracking, analytics, remote fonts, or decorative assets — **except** the bundled Mermaid library (see below), which is local, not a CDN.
- **Render Mermaid diagrams in the HTML.** Read `assets/mermaid.min.js` (bundled in this skill, Mermaid v11) and **inline its contents into a `<script>` tag** in the HTML `<head>`, then initialize it (`mermaid.initialize({ startOnLoad: true })`). Wrap every Mermaid source block in `<pre class="mermaid">…</pre>` (not `<code>`), so the library renders it into SVG on page load. This keeps the HTML self-contained and renders all call-relationship diagrams offline, with no internet and no CDN. If `assets/mermaid.min.js` is missing, fall back to keeping Mermaid as visible source blocks and warn the user that diagrams will not render.
- **Never inline Mermaid with `String.replace(search, mermaidText)` or regex replacement strings.** JavaScript replacement strings expand `$&`, `$'`, `$`` and related tokens; the bundled Mermaid file legitimately contains `$&`, so using `replace()` can corrupt the library and cause Mermaid parse errors such as "Syntax error in text" in sections like `2.3 启动与主运行时流程`. Inline Mermaid by using `indexOf` plus `slice(0, idx) + mermaidText + slice(idx + placeholder.length)`, or use `scripts/inline_mermaid_html.mjs`.
- After inlining Mermaid, verify that the inlined bytes exactly equal `assets/mermaid.min.js`, that no `/*__MERMAID_INLINE__*/` placeholder remains inside the output, and that `<script>` / `</script>` counts are balanced.
- Chinese section titles, a `<nav>` table of contents, status badges, and the diagram-first layout are mandatory (mirror the Markdown report).

## Required HTML Sections

Keep the HTML section order aligned with the Markdown report's new structure:

- Title + 元信息条 (生成日期 / 深度 / 选定路径 / 证据策略)
- `<nav>` 目录 (table of contents, anchor links to every section)
- Summary cards (3-5: 项目身份 / 构建入口 / 选定路径 / 证据水平 / 最高风险)
- 一、项目总览 (Project Picture / 技术栈与依赖 / AI 交接摘要)
- 二、总体架构 (分层架构图 / 模块全景图+表 / 启动与运行时流程图 / 平台边界)
- 三、模块详解 (each core module: 模块架构图 + 实现调用关系图 + 职责/文件/状态/风险)
- 四、选定路径深挖 (each path: 端到端调用关系图 + 细节)
- 五、状态归属与并发模型
- 六、构建·烧录·调试·运行
- 七、变更入口与验证
- 八、风险·未知项·冲突
- 九、证据与验证矩阵
- 十、推荐阅读顺序 & AI 复用提示
- 附录 (已确认/推断事实 / 报告保存路径)

For `quick` reports, omit only sections that are genuinely not present in the Markdown source. Every table in the Markdown must appear as an `<table>` in the HTML.

## Semantic HTML Shape

Use simple semantic HTML:

- `<h1>` for the report title.
- `<nav>` for the table of contents (anchor links to each `<section id="...">`).
- `<main>` for the report container.
- `<section id="...">` for each top-level section (the `id` matches the TOC anchor).
- `<h2>` and `<h3>` for section headings (Chinese).
- `<table>` for structured report tables.
- `<code>` and `<pre>` for paths, commands, and call chains.
- `<pre class="mermaid">` for Mermaid diagram source (rendered by the inlined library).
- `<a href="...">` for local or web links.
- A small inline `<style>` block for readable typography, table borders, spacing, badges, callouts, TOC, and print-friendly layout.

Do not generate a marketing landing page. The page is an engineering handoff document.

## Table of Contents

Place a `<nav>` block right after the header. It lists every chapter and subsection as anchor links:

```html
<nav class="toc">
  <h2>📑 目录</h2>
  <ul>
    <li><a href="#overview">一、项目总览</a>
      <ul>
        <li><a href="#picture">1.1 项目一句话画像</a></li>
        <li><a href="#stack">1.2 技术栈与关键依赖</a></li>
        <li><a href="#handoff">1.3 AI 交接摘要</a></li>
      </ul>
    </li>
    <li><a href="#architecture">二、总体架构</a></li>
    <li><a href="#modules">三、模块详解</a></li>
    <li><a href="#paths">四、选定路径深挖</a></li>
    <!-- ... -->
  </ul>
</nav>
```

Give every `<section>` a stable `id` and ensure each TOC `<a href="#id">` resolves to it.

## Safe Mermaid Inlining

Preferred low-risk workflow:

1. Generate an HTML template with this exact placeholder inside a script tag:

```html
<script>
/*__MERMAID_INLINE__*/
</script>
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
</script>
```

2. Inline the bundled library with the skill script:

```powershell
node <skill-dir>\scripts\inline_mermaid_html.mjs docs\report.template.html docs\report.html
```

3. Trust the output only if the script reports `"ok": true`.

Do not use a one-line `node -e` command for this assembly if quoting gets complex; write a temporary `.mjs` script or use the bundled script. Avoid any operation that treats Mermaid as a replacement string.

## Mermaid Rendering

In `<head>`, inline the bundled library and initialize it:

```html
<script>
  /* contents of assets/mermaid.min.js inlined here */
</script>
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
</script>
```

Then render each diagram:

```html
<pre class="mermaid">
flowchart TD
    A["app_main"] --> B["Application::Run"]
</pre>
```

Notes:

- `securityLevel: 'loose'` allows labels containing characters like `(`, `)`, `<`, `>` used in function signatures; otherwise escape them.
- Escape Mermaid node labels conservatively. Prefer quoted labels such as `A["app_main()"]`; avoid raw labels containing `:`, `{}`, `|`, unmatched brackets, or unescaped HTML unless needed.
- If a diagram label contains `<br/>` or HTML, Mermaid renders it; keep diagram source otherwise plain.
- Keep diagrams readable; split dense ones.

## Mermaid v11 Safe Syntax

Mermaid v11 is stricter than many Markdown previewers. Generate diagrams with these conservative rules so both Markdown and standalone HTML render without "Syntax error in text":

- In `sequenceDiagram`, never use participant IDs that are Mermaid keywords or keyword-like names. Avoid at least: `As`, `Loop`, `End`, `Alt`, `Opt`, `Par`, `And`, `Else`, `Note`, `Box`, `Rect`, `Critical`, `Break`, `Create`, `Destroy`, `Participant`, `Actor`, `Link`, `Links`, `Properties`, `Details`, `Activate`, `Deactivate`. Use stable aliases such as `AudioSvc`, `RunLoop`, `MainTask`, `NetTask`, `UiTask`, `OtaTask`.
- Keep participant IDs ASCII letters/digits/underscore and start with a letter. Put Chinese, punctuation, function names, and task priority in the display label after `as`, for example `participant RunLoop as Run() 事件循环(P10)`.
- Do not use legacy dotted edge-label syntax in flowcharts, such as `A -.timestamp.-> B` or `A -.激活 v2.- B`. Use Mermaid's standard label form: `A -.->|timestamp| B` and `A -.->|激活 v2| B`.
- Prefer quoted node labels in flowcharts: `NODE["file.cc: function()<br/>state_"]`. Keep the node ID simple (`NODE`, `A1`, `AudioSvc`) and put complex text inside the quoted label.
- Avoid raw JSON/object text in sequence message labels. Replace `{type:mcp,payload:{...}}` with plain text such as `mcp tools/call JSON payload` unless the braces are essential.
- Avoid putting Mermaid control keywords at the start of message labels (`loop`, `alt`, `end`, `note`) unless intentionally using that Mermaid block syntax.
- If a diagram fails in HTML, first suspect Mermaid source syntax, not the inlined library, unless inline byte verification fails.

Before final delivery, run the validator:

```powershell
node <skill-dir>\scripts\validate_mermaid_report.mjs docs\report.md docs\report.html
```

Treat any `ok: false` result as blocking. Fix the Mermaid sources, regenerate HTML if needed, and rerun validation.

## Visual Style

Use a clean technical dashboard style inspired by shadcn/ui, GitHub Primer, and Tailwind UI documentation tables:

- White or very light gray page background.
- Centered main container with max width around `1120px`.
- Compact header: left side project/report title, right side generation date, report depth, and evidence policy.
- A `<nav>` table of contents near the top.
- Show 3-5 compact summary cards for project identity, build entry, selected paths, evidence level, and main risks.
- Use consistent table styling across all report sections.
- Add one short explanatory sentence above dense tables when useful.
- Use subtle borders, light gray table headers, comfortable cell padding, and optional row hover styling.
- Use small status badges for `CONFIRMED`, `INFERRED`, `UNKNOWN`, `CONFLICT`, `USER-SELECTED`, `AI-SELECTED`, `FULL-ANALYSIS`, and `UNVERIFIED`.
- Suggested badge tones:
  - `CONFIRMED`: muted green
  - `INFERRED`: muted blue
  - `UNKNOWN`: muted amber
  - `CONFLICT`: muted red
  - `UNVERIFIED`: muted gray
  - selection labels: gray or purple-gray
- Use light amber callouts for unknowns and risks.
- Use light gray information blocks for evidence policy, AI handoff summary, and saved paths.
- Keep it print-friendly: no dark theme, no huge decorative background, no external image or font dependency (Mermaid is the only inlined script).

## Content Requirements

- Preserve evidence labels exactly as in the Markdown source.
- Preserve file paths, function names, commands, and state/data carrier names as monospace text.
- Render Mermaid diagrams (via the inlined library); do not leave them as unrendered source.
- Do not remove unknowns, conflicts, or low-confidence claims for visual neatness.
- Do not turn evidence-backed engineering statements into vague prose.
- Ensure every table that appears in Markdown is represented in HTML.
- If a table is too wide, wrap it in a horizontally scrollable container instead of deleting columns.

## Minimal CSS Pattern

The final CSS can vary, but it should include these primitives (add `.toc` and `.mermaid` rules):

```css
:root {
  color-scheme: light;
  --bg: #f8fafc;
  --panel: #ffffff;
  --text: #172033;
  --muted: #64748b;
  --border: #d9e2ec;
  --header: #f1f5f9;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.6;
}

main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 20px 56px;
}

nav.toc {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px;
  margin: 16px 0;
}
nav.toc ul { margin: 0; padding-left: 20px; }
nav.toc a { color: var(--text); }

section {
  margin-top: 24px;
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

th {
  background: var(--header);
  text-align: left;
}

pre {
  overflow: auto;
  padding: 12px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 6px;
}

pre.mermaid {
  background: var(--panel);
  color: var(--text);
  text-align: center;
}
```

## Final Response Rule

For every final report, the final chat response should include:

- The Markdown report path.
- The HTML report path.
- One sentence summarizing the most important evidence gap or risk.

Do not paste the HTML source or duplicate the full report content in chat.
