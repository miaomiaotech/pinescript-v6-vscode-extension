# PineScript v6 VSCode Extension 开发指南

## ⚠️ 每次修改代码后必做

### 🧹 代码清理
1. 移除未使用的导入
2. 移除未使用的变量和函数
3. **函数参数**: 未使用的参数保持原名，不要改成 `_` 前缀
4. 移除调试代码 (`console.log` 等)
5. 运行 `npm test` 确保通过

### 📝 文档同步
- 新增功能 → 更新 `README.md` 功能列表
- 修改配置项 → 更新 `README.md` 扩展设置
- 新增命令 → 更新 `README.md` 命令章节
- 重大功能变化 → 更新 `package.json` 的 `description`
- 新增语法 → 更新 `samples/valid-syntax-core.pine`
- 新增错误检测 → 更新 `samples/invalid-syntax.pine`

### 🧪 测试同步
- 修改词法分析器 → 更新 `test/lexer.test.js`
- 修改解析器 → 更新 `test/parser.test.js`
- 新增测试脚本 → 添加到 `package.json` 的 `scripts` 和主 `test` 命令

---

## 核心语法规则

### 缩进规则（重要！）

**代码块**: 缩进是 **4 的倍数**（0, 4, 8, 12...）
```pine
if condition
    x = 1        // 4个空格 - 代码块
```

**行延续**: 缩进**不是 4 的倍数**（1, 2, 3, 5, 6, 7, 9...）
```pine
// ✅ 正确 - 2个空格
plot(
  close,
  title = "Test"
  )

// ❌ 错误 - 4个空格会被认为是代码块
plot(
    close,
    title = "Test"
    )
```

### 赋值操作符

- `=` - 初始声明、解构赋值（**解构只能用** `=`）
- `:=` - 重新赋值（**不能用于解构**）
- `+=`, `-=`, `*=`, `/=`, `%=` - 复合赋值

```pine
// ✅ 正确
a = 10
a := 20
[x, y] = getTuple()

// ❌ 错误
a = 10
a = 20              // 应该用 :=
[x, y] := getTuple()  // 解构不能用 :=
```

---

## package.json 维护

### 新增 VSCode 命令
- [ ] `package.json` → `contributes.commands` 定义
- [ ] `src/extension.ts` → 注册命令
- [ ] `README.md` → 命令章节说明
- [ ] 使用 `pine.` 前缀和 `Pine:` 标题

### 新增配置项
- [ ] `package.json` → `contributes.configuration.properties` 定义
- [ ] `src/extension.ts` → 读取配置
- [ ] `README.md` → 扩展设置章节说明
- [ ] 使用 `pine.` 前缀

### 新增测试脚本
- [ ] `package.json` → `scripts` 添加脚本
- [ ] 如果是测试，添加到主 `test` 命令（用 `&&` 连接）
- [ ] 使用 `test:` 或 `build:` 前缀

---

## 开发规范速查

### 修改解析器时
1. 更新 `test/parser.test.js`
2. 更新 `samples/valid-syntax-core.pine`（新语法）
3. 更新 `samples/invalid-syntax.pine`（错误检测）
4. 更新 `src/parser/ast.ts`（AST 类型）
5. 更新 `src/parser/astValidator.ts`（验证规则）

### 修改词法分析器时
1. 更新 `test/lexer.test.js`
2. 更新 `src/lexer/token.ts`（Token 类型）
3. 更新 `src/parser/parser.ts`（处理新 token）

### 发布前检查
- [ ] `npm test` 全部通过
- [ ] `npm run build:tsc` 编译无错误
- [ ] 移除所有未使用的导入和调试代码
- [ ] 更新 `package.json` 版本号
- [ ] 更新 `README.md`（如有功能变化）
- [ ] 手动测试核心功能

---

## 常用命令

```bash
# 开发
npm run watch           # 监听并自动编译
npm run build:tsc       # TypeScript 编译
npm run build:es        # esbuild 打包

# 测试
npm test                # 运行所有测试
npm run test:lexer      # 词法分析器测试
npm run test:parser     # 解析器测试
npm run test:syntax     # 语法示例测试

# 打包
npm run clean           # 清理构建产物
npm run package         # 打包 VSIX
```

---

## 项目结构

```
src/
├── lexer/              # 词法分析器
├── parser/             # 语法分析器和验证器
├── providers/          # LSP 提供者
└── extension.ts        # 扩展入口

test/
├── lexer.test.js       # 词法测试
├── parser.test.js      # 解析器测试
└── syntax-examples.test.js  # 语法示例验证

samples/
├── valid-syntax-core.pine   # 合法语法示例
└── invalid-syntax.pine      # 非法语法示例
```

---

**最后更新**: 2025-10-15
