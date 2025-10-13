/**
 * Pine Script 词法器测试
 * 测试词法分析器的各种功能
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { Lexer, TokenType } = require('../dist/src/parser/lexer.js');

/**
 * 辅助函数：提取 token 类型和值，忽略位置信息
 */
function getTokens(source) {
  const lexer = new Lexer(source);
  return lexer.tokenize()
    .filter(t => t.type !== TokenType.WHITESPACE && t.type !== TokenType.NEWLINE)
    .map(t => ({ type: t.type, value: t.value }));
}

/**
 * 辅助函数：获取完整 token 信息（包括位置）
 */
function getFullTokens(source) {
  const lexer = new Lexer(source);
  return lexer.tokenize()
    .filter(t => t.type !== TokenType.WHITESPACE);
}

describe('词法器 - 基础字面量', () => {
  test('解析整数', () => {
    const tokens = getTokens('123');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.NUMBER, value: '123' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析浮点数', () => {
    const tokens = getTokens('123.456');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.NUMBER, value: '123.456' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析科学计数法', () => {
    const tokens = getTokens('1.5e10');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.NUMBER, value: '1.5e10' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析科学计数法（负指数）', () => {
    const tokens = getTokens('2.5e-5');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.NUMBER, value: '2.5e-5' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析布尔值', () => {
    const tokens = getTokens('true false');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.BOOL, value: 'true' },
      { type: TokenType.BOOL, value: 'false' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析双引号字符串', () => {
    const tokens = getTokens('"Hello World"');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.STRING, value: '"Hello World"' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析单引号字符串', () => {
    const tokens = getTokens("'Hello World'");
    assert.deepStrictEqual(tokens, [
      { type: TokenType.STRING, value: "'Hello World'" },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析包含转义字符的字符串', () => {
    const tokens = getTokens('"Line 1\\nLine 2"');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.STRING, value: '"Line 1\\nLine 2"' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析十六进制颜色', () => {
    const tokens = getTokens('#FF5733');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.COLOR, value: '#FF5733' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析带透明度的十六进制颜色', () => {
    const tokens = getTokens('#FF5733AA');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.COLOR, value: '#FF5733AA' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 标识符和关键字', () => {
  test('解析标识符', () => {
    const tokens = getTokens('myVar');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'myVar' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析带下划线的标识符', () => {
    const tokens = getTokens('my_var_name');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'my_var_name' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析关键字', () => {
    const tokens = getTokens('if else for while var varip const');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'if' },
      { type: TokenType.KEYWORD, value: 'else' },
      { type: TokenType.KEYWORD, value: 'for' },
      { type: TokenType.KEYWORD, value: 'while' },
      { type: TokenType.KEYWORD, value: 'var' },
      { type: TokenType.KEYWORD, value: 'varip' },
      { type: TokenType.KEYWORD, value: 'const' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析类型关键字', () => {
    const tokens = getTokens('int float bool string color');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'int' },
      { type: TokenType.KEYWORD, value: 'float' },
      { type: TokenType.KEYWORD, value: 'bool' },
      { type: TokenType.KEYWORD, value: 'string' },
      { type: TokenType.KEYWORD, value: 'color' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析逻辑运算符关键字', () => {
    const tokens = getTokens('and or not');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'and' },
      { type: TokenType.KEYWORD, value: 'or' },
      { type: TokenType.KEYWORD, value: 'not' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析 na 关键字', () => {
    const tokens = getTokens('na');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'na' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 运算符', () => {
  test('解析算术运算符', () => {
    const tokens = getTokens('+ - * / %');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.PLUS, value: '+' },
      { type: TokenType.MINUS, value: '-' },
      { type: TokenType.MULTIPLY, value: '*' },
      { type: TokenType.DIVIDE, value: '/' },
      { type: TokenType.MODULO, value: '%' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析比较运算符', () => {
    const tokens = getTokens('== != < > <= >=');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.COMPARE, value: '==' },
      { type: TokenType.COMPARE, value: '!=' },
      { type: TokenType.COMPARE, value: '<' },
      { type: TokenType.COMPARE, value: '>' },
      { type: TokenType.COMPARE, value: '<=' },
      { type: TokenType.COMPARE, value: '>=' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析赋值运算符', () => {
    const tokens = getTokens('= :=');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.ASSIGN, value: '=' },
      { type: TokenType.ASSIGN, value: ':=' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析箭头运算符', () => {
    const tokens = getTokens('=>');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.ARROW, value: '=>' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析三元运算符', () => {
    const tokens = getTokens('? :');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.TERNARY, value: '?' },
      { type: TokenType.COLON, value: ':' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 分隔符', () => {
  test('解析括号', () => {
    const tokens = getTokens('( ) [ ]');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.LPAREN, value: '(' },
      { type: TokenType.RPAREN, value: ')' },
      { type: TokenType.LBRACKET, value: '[' },
      { type: TokenType.RBRACKET, value: ']' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析逗号和点号', () => {
    const tokens = getTokens(', .');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.COMMA, value: ',' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 注释', () => {
  test('解析单行注释', () => {
    const tokens = getTokens('// This is a comment');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.COMMENT, value: '// This is a comment' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析版本注解', () => {
    const tokens = getTokens('//@version=6');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.ANNOTATION, value: '//@version=6' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析块注释', () => {
    const tokens = getTokens('/* multi\nline\ncomment */');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.COMMENT, value: '/* multi\nline\ncomment */' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('代码中混合注释', () => {
    const tokens = getTokens('var x = 5 // comment');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'var' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.ASSIGN, value: '=' },
      { type: TokenType.NUMBER, value: '5' },
      { type: TokenType.COMMENT, value: '// comment' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 复杂表达式', () => {
  test('解析变量声明', () => {
    const tokens = getTokens('var x = 10');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'var' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.ASSIGN, value: '=' },
      { type: TokenType.NUMBER, value: '10' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析函数调用', () => {
    const tokens = getTokens('plot(close, color=color.red)');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'plot' },
      { type: TokenType.LPAREN, value: '(' },
      { type: TokenType.IDENTIFIER, value: 'close' },
      { type: TokenType.COMMA, value: ',' },
      { type: TokenType.KEYWORD, value: 'color' }, // color 是关键字
      { type: TokenType.ASSIGN, value: '=' },
      { type: TokenType.KEYWORD, value: 'color' }, // color 是关键字
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.IDENTIFIER, value: 'red' },
      { type: TokenType.RPAREN, value: ')' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析数组访问', () => {
    const tokens = getTokens('arr[0]');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'arr' },
      { type: TokenType.LBRACKET, value: '[' },
      { type: TokenType.NUMBER, value: '0' },
      { type: TokenType.RBRACKET, value: ']' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析成员访问', () => {
    const tokens = getTokens('ta.sma(close, 20)');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'ta' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.IDENTIFIER, value: 'sma' },
      { type: TokenType.LPAREN, value: '(' },
      { type: TokenType.IDENTIFIER, value: 'close' },
      { type: TokenType.COMMA, value: ',' },
      { type: TokenType.NUMBER, value: '20' },
      { type: TokenType.RPAREN, value: ')' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析三元表达式', () => {
    const tokens = getTokens('x > 0 ? 1 : -1');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.COMPARE, value: '>' },
      { type: TokenType.NUMBER, value: '0' },
      { type: TokenType.TERNARY, value: '?' },
      { type: TokenType.NUMBER, value: '1' },
      { type: TokenType.COLON, value: ':' },
      { type: TokenType.MINUS, value: '-' },
      { type: TokenType.NUMBER, value: '1' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析 if 语句', () => {
    const tokens = getTokens('if close > open');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'if' },
      { type: TokenType.IDENTIFIER, value: 'close' },
      { type: TokenType.COMPARE, value: '>' },
      { type: TokenType.IDENTIFIER, value: 'open' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析 for 循环', () => {
    const tokens = getTokens('for i = 0 to 10');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'for' },
      { type: TokenType.IDENTIFIER, value: 'i' },
      { type: TokenType.ASSIGN, value: '=' },
      { type: TokenType.NUMBER, value: '0' },
      { type: TokenType.KEYWORD, value: 'to' },
      { type: TokenType.NUMBER, value: '10' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 函数定义', () => {
  test('解析简单函数定义', () => {
    const tokens = getTokens('myFunc(x) => x * 2');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'myFunc' },
      { type: TokenType.LPAREN, value: '(' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.RPAREN, value: ')' },
      { type: TokenType.ARROW, value: '=>' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.MULTIPLY, value: '*' },
      { type: TokenType.NUMBER, value: '2' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析带类型的函数参数', () => {
    const tokens = getTokens('myFunc(float x, int y) => x + y');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'myFunc' },
      { type: TokenType.LPAREN, value: '(' },
      { type: TokenType.KEYWORD, value: 'float' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.COMMA, value: ',' },
      { type: TokenType.KEYWORD, value: 'int' },
      { type: TokenType.IDENTIFIER, value: 'y' },
      { type: TokenType.RPAREN, value: ')' },
      { type: TokenType.ARROW, value: '=>' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.PLUS, value: '+' },
      { type: TokenType.IDENTIFIER, value: 'y' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('解析导出函数', () => {
    const tokens = getTokens('export myFunc(x) => x');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.KEYWORD, value: 'export' },
      { type: TokenType.IDENTIFIER, value: 'myFunc' },
      { type: TokenType.LPAREN, value: '(' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.RPAREN, value: ')' },
      { type: TokenType.ARROW, value: '=>' },
      { type: TokenType.IDENTIFIER, value: 'x' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 位置信息', () => {
  test('验证行号和列号', () => {
    const source = 'var x = 10\nvar y = 20';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize().filter(t =>
      t.type !== TokenType.WHITESPACE &&
      t.type !== TokenType.NEWLINE &&
      t.type !== TokenType.EOF
    );

    // 第一行: var x = 10
    assert.strictEqual(tokens[0].line, 1);
    assert.strictEqual(tokens[0].value, 'var');

    assert.strictEqual(tokens[1].line, 1);
    assert.strictEqual(tokens[1].value, 'x');

    assert.strictEqual(tokens[2].line, 1);
    assert.strictEqual(tokens[2].value, '=');

    assert.strictEqual(tokens[3].line, 1);
    assert.strictEqual(tokens[3].value, '10');

    // 第二行: var y = 20
    assert.strictEqual(tokens[4].line, 2);
    assert.strictEqual(tokens[4].value, 'var');

    assert.strictEqual(tokens[5].line, 2);
    assert.strictEqual(tokens[5].value, 'y');

    assert.strictEqual(tokens[6].line, 2);
    assert.strictEqual(tokens[6].value, '=');

    assert.strictEqual(tokens[7].line, 2);
    assert.strictEqual(tokens[7].value, '20');
  });

  test('验证 token 长度', () => {
    const tokens = getFullTokens('var x = 123');
    const withoutEOF = tokens.filter(t => t.type !== TokenType.EOF);

    assert.strictEqual(withoutEOF[0].value, 'var');
    assert.strictEqual(withoutEOF[0].length, 3);

    assert.strictEqual(withoutEOF[1].value, 'x');
    assert.strictEqual(withoutEOF[1].length, 1);

    assert.strictEqual(withoutEOF[2].value, '=');
    assert.strictEqual(withoutEOF[2].length, 1);

    assert.strictEqual(withoutEOF[3].value, '123');
    assert.strictEqual(withoutEOF[3].length, 3);
  });
});

describe('词法器 - 边界情况', () => {
  test('空源代码', () => {
    const tokens = getTokens('');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('只有空白字符', () => {
    const tokens = getTokens('   \t\t  ');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('只有注释', () => {
    const tokens = getTokens('// only comment');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.COMMENT, value: '// only comment' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('未闭合的字符串', () => {
    const tokens = getTokens('"unclosed string');
    assert.strictEqual(tokens[0].type, TokenType.STRING);
    // 词法器会尽可能处理,直到文件结束
  });

  test('无效的十六进制颜色', () => {
    const tokens = getTokens('#ABC'); // 只有3位,不是6位或8位
    assert.strictEqual(tokens[0].type, TokenType.IDENTIFIER);
  });

  test('连续运算符', () => {
    const tokens = getTokens('+++');
    assert.deepStrictEqual(tokens, [
      { type: TokenType.PLUS, value: '+' },
      { type: TokenType.PLUS, value: '+' },
      { type: TokenType.PLUS, value: '+' },
      { type: TokenType.EOF, value: '' }
    ]);
  });
});

describe('词法器 - 实际 Pine Script 代码片段', () => {
  test('indicator 声明', () => {
    const source = '//@version=6\nindicator("My Script", overlay=true)';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].type, TokenType.ANNOTATION);
    assert.strictEqual(tokens[0].value, '//@version=6');

    assert.strictEqual(tokens[1].type, TokenType.IDENTIFIER);
    assert.strictEqual(tokens[1].value, 'indicator');
  });

  test('完整的变量声明和计算', () => {
    const source = 'var float sum = 0.0\nsum := sum + close';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].value, 'var');
    assert.strictEqual(tokens[1].value, 'float');
    assert.strictEqual(tokens[2].value, 'sum');
    assert.strictEqual(tokens[3].value, '=');
    assert.strictEqual(tokens[4].value, '0.0');
    assert.strictEqual(tokens[5].value, 'sum');
    assert.strictEqual(tokens[6].value, ':=');
    assert.strictEqual(tokens[7].value, 'sum');
    assert.strictEqual(tokens[8].value, '+');
    assert.strictEqual(tokens[9].value, 'close');
  });

  test('plot 语句', () => {
    const source = 'plot(ta.sma(close, 20), color=color.blue, linewidth=2)';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].value, 'plot');
    assert.strictEqual(tokens[1].value, '(');
    assert.strictEqual(tokens[2].value, 'ta');
    assert.strictEqual(tokens[3].value, '.');
    assert.strictEqual(tokens[4].value, 'sma');
  });

  test('if-else 条件语句', () => {
    const source = `if close > open
    bgcolor(color.green)
else
    bgcolor(color.red)`;
    const fullTokens = getFullTokens(source);

    // 检查关键字 (注意: color 也是关键字)
    // 顺序是: if, color, else, color
    const keywords = fullTokens.filter(t => t.type === TokenType.KEYWORD);
    assert.strictEqual(keywords.length, 4);
    assert.strictEqual(keywords[0].value, 'if');
    assert.strictEqual(keywords[1].value, 'color');
    assert.strictEqual(keywords[2].value, 'else');
    assert.strictEqual(keywords[3].value, 'color');
  });

  test('解构赋值', () => {
    const source = '[macd_line, signal_line, histogram] = ta.macd(close, 12, 26, 9)';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].value, '[');
    assert.strictEqual(tokens[1].value, 'macd_line');
    assert.strictEqual(tokens[2].value, ',');
    assert.strictEqual(tokens[3].value, 'signal_line');
    assert.strictEqual(tokens[4].value, ',');
    assert.strictEqual(tokens[5].value, 'histogram');
    assert.strictEqual(tokens[6].value, ']');
    assert.strictEqual(tokens[7].value, '=');
  });

  test('中文字符串', () => {
    const source = 'indicator("KDJ指标", shorttitle="KDJ")';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[2].type, TokenType.STRING);
    assert.strictEqual(tokens[2].value, '"KDJ指标"');
    assert.strictEqual(tokens[6].type, TokenType.STRING);
    assert.strictEqual(tokens[6].value, '"KDJ"');
  });

  test('下划线开头的标识符', () => {
    const source = '_inRange(cond)';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].type, TokenType.IDENTIFIER);
    assert.strictEqual(tokens[0].value, '_inRange');
  });

  test('负数偏移参数', () => {
    const source = 'plot(value, offset=-5)';
    const tokens = getTokens(source);

    // offset=
    const offsetIdx = tokens.findIndex(t => t.value === 'offset');
    assert.strictEqual(tokens[offsetIdx + 1].value, '=');
    assert.strictEqual(tokens[offsetIdx + 2].value, '-');
    assert.strictEqual(tokens[offsetIdx + 3].value, '5');
  });

  test('复杂的条件表达式', () => {
    const source = 'cond = ta.crossover(k_value, d_value) and k_value < 30';
    const tokens = getTokens(source);

    // 找到 'and' 关键字
    const andToken = tokens.find(t => t.value === 'and');
    assert.strictEqual(andToken.type, TokenType.KEYWORD);
  });

  test('数组索引访问', () => {
    const source = 'value[1]';
    const tokens = getTokens(source);

    assert.deepStrictEqual(tokens, [
      { type: TokenType.IDENTIFIER, value: 'value' },
      { type: TokenType.LBRACKET, value: '[' },
      { type: TokenType.NUMBER, value: '1' },
      { type: TokenType.RBRACKET, value: ']' },
      { type: TokenType.EOF, value: '' }
    ]);
  });

  test('嵌套函数调用', () => {
    const source = 'ta.highest(ta.rsi(close, 14), 10)';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].value, 'ta');
    assert.strictEqual(tokens[1].value, '.');
    assert.strictEqual(tokens[2].value, 'highest');
    assert.strictEqual(tokens[3].value, '(');
    assert.strictEqual(tokens[4].value, 'ta');
    assert.strictEqual(tokens[5].value, '.');
    assert.strictEqual(tokens[6].value, 'rsi');
  });

  test('hline 样式', () => {
    const source = 'hline(50, linestyle=hline.style_dotted)';
    const tokens = getTokens(source);

    const styleIdx = tokens.findIndex(t => t.value === 'style_dotted');
    assert(styleIdx > 0);
    assert.strictEqual(tokens[styleIdx - 1].value, '.');
    assert.strictEqual(tokens[styleIdx - 2].value, 'hline');
  });

  test('color.new 函数', () => {
    const source = 'color.new(color.red, 90)';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].type, TokenType.KEYWORD); // color
    assert.strictEqual(tokens[1].value, '.');
    assert.strictEqual(tokens[2].value, 'new');
    assert.strictEqual(tokens[4].type, TokenType.KEYWORD); // color
    assert.strictEqual(tokens[6].value, 'red');
  });

  test('三元运算符与颜色', () => {
    const source = 'macd_histogram >= 0 ? color.green : color.red';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].value, 'macd_histogram');
    assert.strictEqual(tokens[2].value, '0');
    assert.strictEqual(tokens[3].value, '?');
    const colonIdx = tokens.findIndex(t => t.value === ':');
    assert(colonIdx > 0);
  });

  test('input 函数带多个命名参数', () => {
    const source = 'input.int(14, title="Period", minval=1, defval=14)';
    const tokens = getTokens(source);

    // 验证有多个命名参数
    const assigns = tokens.filter(t => t.type === TokenType.ASSIGN);
    assert.strictEqual(assigns.length, 3); // title=, minval=, defval=
  });

  test('plotshape 完整语句', () => {
    const source = 'plotshape(signal, style=shape.triangleup, location=location.bottom, color=color.yellow)';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].value, 'plotshape');
    // 找到 shape.triangleup
    const shapeIdx = tokens.findIndex(t => t.value === 'shape');
    assert(shapeIdx > 0);
    assert.strictEqual(tokens[shapeIdx + 1].value, '.');
    assert.strictEqual(tokens[shapeIdx + 2].value, 'triangleup');
  });

  test('多行注释中的中文', () => {
    const source = '// 这是一个中文注释\n// 计算KDJ指标';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].type, TokenType.COMMENT);
    assert.strictEqual(tokens[0].value, '// 这是一个中文注释');
    assert.strictEqual(tokens[1].type, TokenType.COMMENT);
    assert.strictEqual(tokens[1].value, '// 计算KDJ指标');
  });

  test('varip 声明', () => {
    const source = 'varip int counter = 0';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[0].value, 'varip');
    assert.strictEqual(tokens[0].type, TokenType.KEYWORD);
    assert.strictEqual(tokens[1].value, 'int');
    assert.strictEqual(tokens[1].type, TokenType.KEYWORD);
  });

  test('逻辑运算符组合', () => {
    const source = 'cond1 and cond2 or not cond3';
    const tokens = getTokens(source);

    assert.strictEqual(tokens[1].value, 'and');
    assert.strictEqual(tokens[1].type, TokenType.KEYWORD);
    assert.strictEqual(tokens[3].value, 'or');
    assert.strictEqual(tokens[3].type, TokenType.KEYWORD);
    assert.strictEqual(tokens[4].value, 'not');
    assert.strictEqual(tokens[4].type, TokenType.KEYWORD);
  });
});
