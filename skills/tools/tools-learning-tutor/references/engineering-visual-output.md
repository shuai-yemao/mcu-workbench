# 工程图示双格式输出

## 适用条件

当核心机制存在至少三个角色、一个以上异步/失败分支，或图示能显著降低调用链理解成本时，输出图示。简单单步事实不强制画图。图示必须可追溯到工程证据，不能用抽象占位框替代真实模块、符号或配置。

## 三种一致视图

每张图同时提供以下内容，并保持节点、连线方向、标签和边界一致：

1. Mermaid：供 Obsidian 直接阅读调用链、数据流或时序；
2. SVG：放入 `svg` 源码块，供复制为独立静态图；
3. React：放入 `tsx` 源码块，提供无外部依赖的 React/SVG 函数组件。

图前列出它对应的 `relative/path.c:line`、配置或验证证据。没有真实工程证据时，图与其 SVG/React 版本都不生成。

## SVG 模板

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 160" role="img" aria-labelledby="title desc">
  <title id="title">模块调用链</title>
  <desc id="desc">每个节点均对应笔记内的工程证据。</desc>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
    </marker>
  </defs>
  <rect x="24" y="48" width="180" height="56" rx="8" fill="#e0f2fe" stroke="#0369a1" />
  <text x="114" y="81" text-anchor="middle">调用者</text>
  <line x1="204" y1="76" x2="340" y2="76" stroke="#334155" marker-end="url(#arrow)" />
  <rect x="340" y="48" width="180" height="56" rx="8" fill="#ecfccb" stroke="#4d7c0f" />
  <text x="430" y="81" text-anchor="middle">当前模块</text>
</svg>
```

## React 模板

```tsx
import React from 'react';

export function EngineeringFlowDiagram() {
  return (
    <svg viewBox="0 0 720 160" role="img" aria-labelledby="title desc">
      <title id="title">模块调用链</title>
      <desc id="desc">每个节点均对应笔记内的工程证据。</desc>
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
        </marker>
      </defs>
      <rect x="24" y="48" width="180" height="56" rx="8" fill="#e0f2fe" stroke="#0369a1" />
      <text x="114" y="81" textAnchor="middle">调用者</text>
      <line x1="204" y1="76" x2="340" y2="76" stroke="#334155" markerEnd="url(#arrow)" />
      <rect x="340" y="48" width="180" height="56" rx="8" fill="#ecfccb" stroke="#4d7c0f" />
      <text x="430" y="81" textAnchor="middle">当前模块</text>
    </svg>
  );
}
```

React 组件除 `react` 与原生 SVG 元素外不得依赖图表库、样式框架或本机资源；实际节点名称、尺寸和连线必须由本次工程证据替换。
