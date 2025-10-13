# Pine Script v6 语言规范

> 本文档总结了 Pine Script v6 的核心语法、语义和实现细节，供语言服务器开发和理解使用。

---

## 目录

1. [语言概述](#语言概述)
2. [词法结构](#词法结构)
3. [类型系统](#类型系统)
4. [语法结构](#语法结构)
5. [命名空间和内置API](#命名空间和内置api)
6. [特殊语义](#特殊语义)
7. [实现要点](#实现要点)

---

## 语言概述

### 基本特征

- **用途**: TradingView 平台的技术指标和交易策略脚本语言
- **范式**: 声明式 + 过程式混合
- **类型**: 静态类型（带类型推断）+ 动态类型限定符
- **版本**: v6 是当前主流版本
- **缩进敏感**: 使用缩进（空格或制表符）表示代码块，类似 Python

### 脚本类型

Pine Script v6 支持三种脚本类型：

```pine
indicator("标题", overlay=true)  // 指标脚本
strategy("标题", overlay=false)  // 策略脚本
library("标题")                  // 库脚本
```

---

## 词法结构

### Token 类型

| Token 类型 | 说明 | 示例 |
|-----------|------|------|
| `NUMBER` | 数字字面量 | `123`, `3.14`, `1.5e10`, `2.5e-5` |
| `STRING` | 字符串字面量 | `"Hello"`, `'World'`, `"Line1\nLine2"` |
| `BOOL` | 布尔字面量 | `true`, `false` |
| `COLOR` | 颜色字面量 | `#FF5733`, `#FF5733AA` (带透明度) |
| `IDENTIFIER` | 标识符 | `myVar`, `_privateFunc`, `ta`, `close` |
| `KEYWORD` | 关键字 | `if`, `var`, `na`, `int` 等 |
| `OPERATOR` | 运算符 | `+`, `-`, `*`, `/`, `==`, `:=` |
| `DELIMITER` | 分隔符 | `(`, `)`, `[`, `]`, `,`, `.`, `:` |
| `COMMENT` | 注释 | `// 单行注释`, `/* 块注释 */` |
| `ANNOTATION` | 注解 | `//@version=6` |

### 关键字完整列表

```typescript
// 控制流
'if', 'else', 'for', 'while', 'break', 'continue', 'return',
'switch', 'case', 'default',

// 变量声明
'var', 'varip', 'const',

// 特殊值
'na',  // "not available" - 表示变量无值

// 模块系统
'export', 'import', 'as',

// 类型定义
'type',

// 逻辑运算符（关键字形式）
'and', 'or', 'not',

// 基础类型名
'int', 'float', 'bool', 'string', 'color',

// 对象类型
'line', 'label', 'box', 'table', 'array', 'matrix', 'map',

// 类型限定符
'series', 'simple', 'input',

// 其他
'then', 'to'
```

### 运算符

#### 算术运算符
```pine
+  -  *  /  %
```

#### 比较运算符
```pine
==  !=  <  >  <=  >=
```

#### 赋值运算符
```pine
=   // 首次赋值或变量声明
:=  // 变量更新（reassignment）
```

#### 逻辑运算符
```pine
and  or  not  // 关键字形式
```

#### 三元运算符
```pine
condition ? valueIfTrue : valueIfFalse
```

#### 其他
```pine
=>  // 函数定义箭头
.   // 成员访问
[]  // 数组索引/历史引用
```

### 注释

```pine
// 单行注释

/*
   多行注释
   可以跨多行
*/

//@version=6        // 版本注解（必须在脚本开头）
//@description ...  // 描述注解
```

---

## 类型系统

### 基础类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `int` | 整数 | `42`, `-10`, `0` |
| `float` | 浮点数 | `3.14`, `1.5e10` |
| `bool` | 布尔值 | `true`, `false` |
| `string` | 字符串 | `"Hello"`, `'World'` |
| `color` | 颜色 | `color.red`, `#FF5733` |
| `na` | 特殊类型，表示"无值" | `na` |

### 复合类型

```pine
// 数组
array<int>
array<float>
array<string>

// 矩阵
matrix<float>

// 映射
map<string, float>

// 对象类型
line, label, box, table
```

### 类型限定符（Type Qualifiers）

Pine Script 使用类型限定符来描述值的计算时机和可变性：

| 限定符 | 说明 |
|--------|------|
| `series` | 每个柱（bar）上可变的值，默认类型 |
| `simple` | 脚本启动时确定，运行中不变 |
| `input` | 用户输入的值，不可在脚本中修改 |
| `const` | 编译时常量 |

#### 类型限定符示例

```pine
// series - 每个柱上的值不同
series float closePrice = close

// simple - 脚本启动时确定
simple string symbolName = syminfo.ticker

// input - 用户配置
input int length = input.int(14, "Length")

// const - 编译时常量
const float PI = 3.14159
```

### 类型组合

```pine
series float        // 系列浮点数（每个柱一个值）
simple int          // 简单整数（固定值）
input color         // 输入颜色（用户设置）
const string        // 常量字符串（编译时）
```

---

## 语法结构

### 变量声明

```pine
// 基本声明（类型推断）
x = 10                    // 推断为 int
price = close             // 推断为 series float

// 显式类型声明
int x = 10
float price = 3.14

// var 声明（值在柱间保持）
var float sum = 0.0       // 只在第一个柱初始化
sum := sum + close        // 后续柱上更新

// varip 声明（实时更新，包括同一柱内）
varip int counter = 0

// const 声明（编译时常量）
const int MAX_BARS = 500
```

### 变量更新

```pine
// 首次赋值使用 =
myValue = 0

// 更新已存在的变量使用 :=
myValue := myValue + 1
```

### 控制流

#### if 语句

```pine
// 简单 if
if close > open
    bgcolor(color.green)

// if-else
if close > open
    bgcolor(color.green)
else
    bgcolor(color.red)

// if 表达式（返回值）
color bgColor = if close > open
    color.green
else
    color.red
```

#### for 循环

```pine
// 基本 for 循环
for i = 0 to 10
    // 循环体

// 带步长
for i = 0 to 100 by 10
    // 循环体
```

#### while 循环

```pine
var int i = 0
while i < 10
    i := i + 1
```

#### switch 语句

```pine
switch timeframe.period
    "1"  => "1 分钟"
    "5"  => "5 分钟"
    "60" => "1 小时"
    =>      "其他"
```

### 函数定义

```pine
// 简单函数
myFunc(x) => x * 2

// 带类型参数
myFunc(float x, int y) => x + y

// 多行函数体
myFunc(x) =>
    y = x * 2
    z = y + 1
    z  // 最后一个表达式是返回值

// 导出函数（用于库）
export myFunc(x) => x * 2
```

### 数组

```pine
// 数组声明
myArray = array.new_float(5, 0.0)

// 数组字面量
arr = array.from(1, 2, 3, 4, 5)

// 解构赋值
[a, b, c] = array.from(1, 2, 3)
```

### 三元表达式

```pine
result = condition ? valueIfTrue : valueIfFalse
color barColor = close > open ? color.green : color.red
```

---

## 命名空间和内置API

### 核心命名空间

| 命名空间 | 说明 | 常用函数 |
|----------|------|---------|
| `ta` | 技术分析 | `ta.sma()`, `ta.ema()`, `ta.rsi()`, `ta.macd()` |
| `math` | 数学函数 | `math.abs()`, `math.max()`, `math.min()`, `math.round()` |
| `str` | 字符串操作 | `str.length()`, `str.contains()`, `str.format()` |
| `array` | 数组操作 | `array.new()`, `array.push()`, `array.get()` |
| `matrix` | 矩阵操作 | `matrix.new()`, `matrix.get()`, `matrix.set()` |
| `map` | 映射操作 | `map.new()`, `map.put()`, `map.get()` |
| `color` | 颜色操作 | `color.new()`, `color.rgb()`, `color.from_gradient()` |
| `input` | 用户输入 | `input.int()`, `input.float()`, `input.bool()` |
| `request` | 数据请求 | `request.security()`, `request.dividends()` |
| `strategy` | 策略函数 | `strategy.entry()`, `strategy.close()`, `strategy.exit()` |

### 内置变量

```pine
// 价格数据
close, open, high, low     // 当前柱的 OHLC
volume                     // 成交量

// 价格组合
hl2 = (high + low) / 2
hlc3 = (high + low + close) / 3
ohlc4 = (open + high + low + close) / 4

// 时间
time                       // 当前柱时间戳
timenow                    // 当前实时时间
year, month, dayofmonth    // 时间组件
hour, minute, second

// 柱索引
bar_index                  // 当前柱索引（从0开始）
last_bar_index             // 最后一个柱的索引

// 品种信息
syminfo.ticker             // 品种代码
syminfo.currency           // 交易货币
syminfo.type               // 品种类型

// 时间周期
timeframe.period           // 当前时间周期
timeframe.multiplier       // 时间周期倍数

// 柱状态
barstate.isfirst           // 是否第一个柱
barstate.islast            // 是否最后一个柱
barstate.isrealtime        // 是否实时柱
barstate.isnew             // 是否新柱
```

### 常用技术指标函数

```pine
// 移动平均
ta.sma(source, length)           // 简单移动平均
ta.ema(source, length)           // 指数移动平均
ta.wma(source, length)           // 加权移动平均
ta.vwma(source, length)          // 成交量加权移动平均

// 震荡指标
ta.rsi(source, length)           // 相对强弱指标
ta.stoch(source, high, low, length)  // 随机指标
ta.cci(source, length)           // 商品通道指数
ta.mfi(source, length)           // 资金流量指标

// MACD
[macdLine, signalLine, histogram] = ta.macd(source, fast, slow, signal)

// 布林带
[middle, upper, lower] = ta.bb(source, length, mult)

// 其他
ta.atr(length)                   // 平均真实波幅
ta.highest(source, length)       // 最高值
ta.lowest(source, length)        // 最低值
ta.crossover(source1, source2)   // 上穿
ta.crossunder(source1, source2)  // 下穿
```

### 绘图函数

```pine
// 基本绘图
plot(series, title, color, linewidth, style)
plotshape(series, style, location, color, size)
plotchar(series, char, location, color)

// 水平线
hline(price, title, color, linestyle)

// 背景和柱颜色
bgcolor(color, transp, offset)
barcolor(color, offset, editable)

// 填充
fill(plot1, plot2, color, title)
```

### 颜色常量和函数

```pine
// 预定义颜色
color.red, color.green, color.blue
color.yellow, color.orange, color.purple
color.white, color.black, color.gray

// 颜色函数
color.new(color.red, 90)              // 添加透明度
color.rgb(255, 0, 0, 90)              // RGB + 透明度
color.from_gradient(value, min, max, minColor, maxColor)

// 颜色组件
color.r(myColor)                      // 获取红色分量
color.g(myColor)                      // 获取绿色分量
color.b(myColor)                      // 获取蓝色分量
color.t(myColor)                      // 获取透明度
```

---

## 特殊语义

### `na` 关键字

**重要**: `na` 是一个关键字，表示"not available"（无值）。

```pine
// 类型: simple na

// 用途
var float myVar = na        // 初始化为无值
if na(close[10])            // 检查值是否为 na
    // 处理无值情况

// ⚠️ 错误用法
if close == na              // ❌ 不要这样比较
    // ...

// ✅ 正确用法
if na(close)                // ✅ 使用 na() 函数检查
    // ...
```

### 历史引用运算符 `[]`

```pine
close[0]     // 当前柱的收盘价（等同于 close）
close[1]     // 前一个柱的收盘价
close[10]    // 10个柱前的收盘价

// 动态偏移
close[bar_index - 5]
```

### Series 值的特性

Pine Script 中大多数值都是 `series` 类型，意味着：

```pine
// close 是一个 series，每个柱上有不同的值
float currentClose = close        // 当前柱的 close
float prevClose = close[1]        // 前一个柱的 close

// 计算会逐柱执行
sma = ta.sma(close, 20)          // 每个柱计算一次
```

### 变量作用域和持久性

```pine
// 普通变量：每个柱重新计算
x = close + open

// var 变量：仅第一个柱初始化，后续保持值
var float sum = 0.0
sum := sum + close              // 累加

// varip 变量：实时更新（包括同一柱内的 tick）
varip int tickCount = 0
tickCount := tickCount + 1
```

### 缩进和代码块

Pine Script 使用缩进表示代码块（类似 Python）：

```pine
if condition
    // 缩进的代码属于 if 块
    statement1
    statement2

    if nestedCondition
        // 嵌套缩进
        nestedStatement

// 回到原始缩进层级
statement3
```

**重要规则**:
- 使用空格或制表符，但不要混用
- 缩进必须一致
- 函数体、控制流语句等都需要缩进

---

## 实现要点

### 词法分析器实现要点

1. **关键字识别**:
   - `na` 是 KEYWORD，不是字面量
   - `true`/`false` 是 BOOL 类型
   - 类型名（`int`, `float` 等）也是 KEYWORD

2. **运算符**:
   - `:=` 是单个 token（ASSIGN），不是 `:` + `=`
   - `=>` 是单个 token（ARROW）

3. **注释处理**:
   - `//@version=6` 是 ANNOTATION token
   - `//` 开头是 COMMENT
   - `/* */` 是块注释

4. **颜色字面量**:
   - `#` 后跟 6 位或 8 位十六进制是 COLOR token
   - 其他情况 `#` 不是有效 token

5. **字符串**:
   - 支持单引号和双引号
   - 支持转义字符 `\n`, `\t`, `\"` 等
   - 可以包含中文等 Unicode 字符

### 解析器实现要点

1. **缩进处理**:
   - 跟踪每行的缩进级别
   - 使用缩进判断代码块结束
   - 不生成 INDENT/DEDENT token，直接在解析时处理

2. **语句解析优先级**:
   ```
   1. 注解（跳过）
   2. 控制流语句（if, for, while, return）
   3. 变量声明（var, varip, const）
   4. 类型声明（int x = ..., float y = ...）
   5. 函数定义（name(...) =>）
   6. 变量赋值（name = ...）
   7. 表达式语句（函数调用等）
   ```

3. **表达式优先级**:
   ```
   1. 三元表达式 (? :)
   2. 逻辑或 (or)
   3. 逻辑与 (and)
   4. 比较 (==, !=, <, >, <=, >=)
   5. 加减 (+, -)
   6. 乘除模 (*, /, %)
   7. 一元运算 (-, not)
   8. 后缀运算 (函数调用, 成员访问, 数组索引)
   9. 基本表达式 (字面量, 标识符, 括号)
   ```

4. **成员访问**:
   - `.` 后可以是 IDENTIFIER 或 KEYWORD
   - 例如: `input.float`, `color.new`, `hline.style_dotted`

5. **数组索引 vs 数组字面量**:
   ```pine
   arr[0]           // 索引访问
   [1, 2, 3]        // 数组字面量
   [a, b] = f()     // 解构赋值
   ```

6. **`na` 的解析**:
   - 词法层面: TokenType.KEYWORD
   - 解析层面: 在 `primary()` 中专门处理，返回 Literal 节点，value 为 `'na'`

### AST 节点类型

```typescript
// 程序根节点
type Program = {
  type: 'Program',
  body: Statement[]
}

// 语句类型
type Statement =
  | VariableDeclaration
  | FunctionDeclaration
  | IfStatement
  | ForStatement
  | WhileStatement
  | ReturnStatement
  | ExpressionStatement

// 表达式类型
type Expression =
  | Literal
  | Identifier
  | BinaryExpression
  | UnaryExpression
  | TernaryExpression
  | CallExpression
  | MemberExpression
  | IndexExpression
  | ArrayExpression
```

### 常见陷阱

1. **不要混淆 `=` 和 `:=`**:
   - `=` 用于首次赋值或声明
   - `:=` 用于更新已存在的变量

2. **`na` 的比较**:
   - ❌ `if x == na`
   - ✅ `if na(x)`

3. **命名空间成员**:
   - `ta`, `math`, `color` 等是普通标识符，不是关键字
   - 在语义分析阶段验证，不在词法阶段

4. **缩进一致性**:
   - 不要混用空格和制表符
   - 同一级别的缩进必须相同

5. **Series 值的延迟计算**:
   - 大多数表达式在每个柱上重新计算
   - 使用 `var` 声明来保持柱间状态

---

## 测试覆盖

当前项目的测试覆盖（106个测试用例）：

### 词法器测试 (64个)
- 基础字面量: 整数、浮点数、科学计数法、布尔值、字符串、颜色
- 标识符和关键字: 普通标识符、下划线标识符、各类关键字
- 运算符: 算术、比较、赋值、箭头、三元
- 分隔符: 括号、逗号、点号
- 注释: 单行、块注释、版本注解、中文注释
- 复杂表达式: 变量声明、函数调用、数组访问、成员访问、三元表达式
- 函数定义: 简单函数、带类型参数、导出函数
- 边界情况: 空源代码、未闭合字符串、无效颜色
- 实际代码片段: indicator 声明、plot 语句、解构赋值、中文字符串等

### 解析器测试 (42个)
- 变量声明: 各种形式的声明（var, varip, const, 类型注解）
- 表达式: 二元、一元、三元、运算符优先级
- 函数调用: 位置参数、命名参数、嵌套调用
- 成员访问: 简单访问、链式访问、数组索引
- 控制流: if, if-else, for, while
- 函数定义: 简单函数、类型参数、导出函数、多行函数体
- 数组和字面量: 数组字面量、布尔值、na、颜色
- 复杂示例: indicator 声明、plot 语句、解构赋值
- 边界情况: 空程序、只有注释、空白行

---

## 参考资源

- **官方文档**: https://www.tradingview.com/pine-script-docs/
- **v6 发布说明**: https://www.tradingview.com/pine-script-docs/release-notes/
- **内置函数参考**: https://www.tradingview.com/pine-script-reference/v6/

---

## 版本信息

- **文档版本**: 1.0
- **Pine Script 版本**: v6
- **最后更新**: 2025-10-14
- **项目**: pinescript-v6-vscode-extension

---

## 附录：快速查询

### 变量声明速查

```pine
x = 10                    // 简单赋值，类型推断
int x = 10                // 显式类型
var float sum = 0.0       // 持久变量
varip int counter = 0     // 实时变量
const float PI = 3.14159  // 常量
```

### 控制流速查

```pine
// if
if condition
    action

// if-else
if condition
    action1
else
    action2

// for
for i = 0 to 10
    action

// while
while condition
    action
```

### 函数定义速查

```pine
f(x) => x * 2                      // 单行
f(float x, int y) => x + y         // 带类型
export f(x) => x                   // 导出

f(x) =>                            // 多行
    y = x * 2
    y + 1
```

### 常用技术指标速查

```pine
sma20 = ta.sma(close, 20)
ema20 = ta.ema(close, 20)
rsi14 = ta.rsi(close, 14)
[macd, signal, hist] = ta.macd(close, 12, 26, 9)
[basis, upper, lower] = ta.bb(close, 20, 2)
atr14 = ta.atr(14)
```

### 绘图速查

```pine
plot(close)
plot(sma, color=color.blue, linewidth=2)
plotshape(signal, style=shape.triangleup, location=location.belowbar)
hline(0, "Zero Line", color.gray, hline.style_dotted)
bgcolor(color.new(color.green, 90))
```

---

*本文档由 Claude 生成，基于 pinescript-v6-vscode-extension 项目的实现和理解。*
