# Pine Script v6 VS Code 扩展

为 VS Code 提供 Pine Script v6 语言支持，包括语法高亮、智能提示和诊断功能。

## 主要功能

*   **语法高亮:** 为 Pine Script v6 代码提供准确的语法高亮。
*   **智能感知 (IntelliSense):** 为 Pine Script v6 的函数、变量和关键字提供智能代码补全。
*   **悬停文档 (Hover Docs):** 将鼠标悬停在任何函数或变量上以查看其文档。
*   **实时校验 (Real-time Validation):** 通过实时错误检查，即时获取代码反馈。

## 安装

1.  从 [GitHub Releases](https://github.com/miaomiaotech/pinescript-v6-vscode-extension/releases) 页面下载最新的 `.vsix` 文件。
2.  打开 VS Code。
3.  选择 **查看 > 扩展** (或 `Ctrl+Shift+X`)。
4.  点击扩展视图顶部的 `...` 菜单，然后选择 **从 VSIX 安装...**。
5.  找到并选择您下载的 `.vsix` 文件进行安装。

## 使用说明

### 命令

本扩展提供以下命令：

*   `pine.validate`: 校验当前文件
*   `pine.showDocs`: 显示符号的文档

### 扩展设置

本扩展提供以下设置：

*   `pine.applyFileAssociation`: 激活时，确保 `files.associations` 将 `*.pine` 映射到 pine 语言 (默认: `true`)。
*   `pine.httpSuggestions.enabled`: 启用 HTTP 建议钩子以用于 AI 补全 (默认: `false`)。
*   `pine.httpSuggestions.endpoint`: 建议提供程序的 HTTP(S) 端点 (默认: `https://localhost:11434/suggest`)。
*   `pine.httpSuggestions.timeoutMs`: 请求超时时间（毫秒）(默认: `1200`)。

## 参与开发

*   克隆仓库: `git clone https://github.com/miaomiaotech/pinescript-v6-vscode-extension.git`
*   安装依赖: `pnpm install`
*   运行扩展: `pnpm run watch` 并在 VS Code 中按 `F5`。

## 许可证

[MIT](LICENSE)
