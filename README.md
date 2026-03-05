# Overleaf LaTeX Formatter (Chrome Extension)

一个用于 Overleaf 的 Chrome 插件，可一键格式化当前编辑器中的整个 LaTeX 文件。

## 功能

- 支持两种触发方式：
  - 点击 Chrome 工具栏中的插件图标
  - 点击 Overleaf 页面右下角的 `Format` 按钮
- 支持快捷键触发（macOS 默认 `Command+Shift+U`）
- 仅在本地浏览器内处理文本，不上传文档内容
- 当前格式化规则：
  - 统一换行符为 `\n`
  - 清理普通行的行尾空白
  - 基于 `\begin{...}`/`\end{...}` 和基础 `\if...`/`\else`/`\fi` 进行缩进（默认 4 空格）
  - 在 `verbatim`、`Verbatim`、`lstlisting`、`minted` 环境内保持内容原样

## 目录结构

- `manifest.json`：扩展配置
- `src/background.js`：处理工具栏图标点击
- `src/content.js`：注入脚本、创建页面按钮、显示提示
- `src/editor-target.js`：从多个编辑器候选中选择最可能的 LaTeX 目标
- `src/injected.js`：访问页面编辑器并执行全文替换
- `src/formatter.js`：格式化核心
- `icons/*.png`：扩展图标资源（16/32/48/128）
- `scripts/package.sh`：一键打包脚本
- `tests/*.test.js`：单元测试

## 安装（开发者模式）

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本项目根目录（即包含 `manifest.json` 的目录）

## 使用

1. 打开 Overleaf 项目并进入任意 LaTeX 编辑页面
2. 触发格式化：
   - 点击插件图标，或
   - 点击页面右下角 `Format` 按钮，或
   - 使用快捷键 `Command+Shift+U`（macOS）
3. 插件会对当前激活编辑器的全文执行格式化，并在右上角提示结果

## 测试

在项目根目录运行：

`node --test tests/*.test.js`

## 打包（上传商店用）

在项目根目录运行：

`./scripts/package.sh`

生成文件：

- `release/overleaf-latex-formatter-v<version>.zip`

说明：

- 压缩包根目录直接包含 `manifest.json`（符合 Chrome Web Store 上传要求）
- 每次发布新版本前请先修改 `manifest.json` 的 `version`

## 上架前素材清单

- `128x128` 应用图标（本项目已提供）
- 至少 1 张商店截图（建议从真实 Overleaf 使用界面截取）
- `440x280` 小宣传图（可选但建议准备）

## 已知限制

- 当前为规则型格式化，不是完整 LaTeX 语法树格式化
- 对复杂宏和非常规结构的缩进不保证完全符合个人风格
- 编辑器适配优先 Monaco/Ace，提供 `textarea` 兜底

## 排错

- 若提示 `Could not detect LaTeX editor target`，请先点击一次 Overleaf 编辑区，再重试
- 更新代码后请在 `chrome://extensions/` 点击“重新加载”扩展，并刷新 Overleaf 页面
