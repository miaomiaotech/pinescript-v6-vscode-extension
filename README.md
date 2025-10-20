# Pine Script v6 VS Code 扩展

## 主要功能

*   **语法高亮:** 为 Pine Script v6 代码提供准确的语法高亮。
*   **智能感知 (IntelliSense):** 为函数、变量和关键字提供智能代码补全。
*   **函数签名帮助:** 在您输入时显示函数参数信息。
*   **悬停文档 (Hover Docs):** 将鼠标悬停在任何函数或变量上以查看其文档。
*   **转到定义:** 快速跳转到变量或函数的定义处。
*   **查找所有引用:** 查找一个符号在何处被使用。
*   **符号重命名:** 安全地重命名变量和函数。
*   **嵌入提示 (Inlay Hints):** 显示推断的类型信息，以提高代码可读性。
*   **颜色预览:** 直接在编辑器中预览颜色字面量。
*   **实时校验 (Real-time Validation):** 通过实时错误检查，即时获取代码反馈。

## 安装

### 方式 1: 从 VSCode Marketplace 安装（推荐）

1.  打开 VS Code
2.  选择 **查看 > 扩展** (或按 `Ctrl+Shift+X` / `Cmd+Shift+X`)
3.  搜索 "Pine Script Language v6"
4.  点击 **安装**

### 方式 2: 从 VSIX 文件安装

1.  从 [Releases](https://github.com/miaomiaotech/pinescript-v6-vscode-extension/releases) 页面下载最新的 `.vsix` 文件
2.  打开 VS Code
3.  选择 **查看 > 扩展** (或 `Ctrl+Shift+X`)
4.  点击扩展视图顶部的 `...` 菜单，然后选择 **从 VSIX 安装...**
5.  找到并选择您下载的 `.vsix` 文件进行安装

## 使用说明

### 命令

本扩展提供以下命令：

*   `pine.validate`: 校验当前文件
*   `pine.showDocs`: 显示符号的文档

### 扩展设置

本扩展提供以下设置：

*   `pine.applyFileAssociation`: 激活时，确保 `files.associations` 将 `*.pine` 映射到 pine 语言 (默认: `true`)。
*   `pine.inlayHints.enabled`: 在变量声明旁显示推断的类型作为嵌入提示 (默认: `true`)。

### 开发

*   克隆仓库: `git clone https://github.com/miaomiaotech/pinescript-v6-vscode-extension.git`
*   安装依赖: `pnpm install`
*   运行测试: `pnpm test`
*   开发模式: `pnpm run watch` 并在 VS Code 中按 `F5`
*   打包扩展: `pnpm run package`

## 许可证

[MIT](LICENSE)
