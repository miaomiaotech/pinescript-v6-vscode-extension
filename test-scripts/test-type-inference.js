/**
 * 测试类型推断输出
 * 用于验证 detect_high_low 和其他用户自定义函数的类型推断是否正确
 */

const fs = require('fs');
const path = require('path');

// Mock vscode module before requiring other modules
const mockPosition = class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
};

const mockRange = class Range {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
};

const mockDiagnostic = class Diagnostic {
    constructor(range, message, severity) {
        this.range = range;
        this.message = message;
        this.severity = severity;
    }
};

const mockVscode = {
    Position: mockPosition,
    Range: mockRange,
    Diagnostic: mockDiagnostic,
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

// Mock the module
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
    if (id === 'vscode') {
        return mockVscode;
    }
    return originalRequire.apply(this, arguments);
};

// 现在可以导入编译后的模块
const { Parser } = require('../dist/src/parser/parser.js');
const { AstValidator } = require('../dist/src/parser/astValidator.js');

function testTypeInference(filePath) {
    console.log(`\n========================================`);
    console.log(`测试文件: ${path.basename(filePath)}`);
    console.log(`========================================\n`);

    const content = fs.readFileSync(filePath, 'utf-8');

    try {
        // 解析
        console.log('正在解析...');
        const parser = new Parser(content);
        const ast = parser.parse();
        console.log('✓ 解析成功');

        // 验证并构建符号表
        console.log('正在验证并构建符号表...');
        const validator = new AstValidator();
        validator.validate(ast);
        console.log('✓ 验证成功');

        // 获取符号表
        const symbolTable = validator.symbolTable;

        // 获取所有符号
        const allSymbols = symbolTable.getAllSymbols();

        console.log(`\n共找到 ${allSymbols.length} 个符号:\n`);

        // 按行号排序
        allSymbols.sort((a, b) => a.line - b.line);

        // 打印所有变量及其类型
        for (const symbol of allSymbols) {
            const kindLabel = symbol.kind === 'function' ? '[函数]' :
                            symbol.kind === 'parameter' ? '[参数]' :
                            '[变量]';

            console.log(`${kindLabel} 第 ${String(symbol.line).padStart(3)} 行: ${symbol.name.padEnd(25)} : ${symbol.type}`);
        }

        console.log('\n\n特别关注的变量:');
        console.log('================');

        // 检查 detect_high_low 函数内的变量
        const cycleLen = allSymbols.find(s => s.name === 'cycle_len');
        const cycleHigh = allSymbols.find(s => s.name === 'cycle_high');
        const cycleLow = allSymbols.find(s => s.name === 'cycle_low');
        const isTop = allSymbols.find(s => s.name === 'is_top');
        const isBottom = allSymbols.find(s => s.name === 'is_bottom');

        if (cycleLen) {
            console.log(`✓ cycle_len (第 ${cycleLen.line} 行): ${cycleLen.type} [已使用: ${cycleLen.used}]`);
        } else {
            console.log(`✗ cycle_len: 未找到`);
        }

        if (cycleHigh) {
            console.log(`✓ cycle_high (第 ${cycleHigh.line} 行): ${cycleHigh.type} [已使用: ${cycleHigh.used}]`);
        } else {
            console.log(`✗ cycle_high: 未找到`);
        }

        if (cycleLow) {
            console.log(`✓ cycle_low (第 ${cycleLow.line} 行): ${cycleLow.type} [已使用: ${cycleLow.used}]`);
        } else {
            console.log(`✗ cycle_low: 未找到`);
        }

        if (isTop) {
            console.log(`✓ is_top (第 ${isTop.line} 行): ${isTop.type} [已使用: ${isTop.used}]`);
        } else {
            console.log(`✗ is_top: 未找到`);
        }

        if (isBottom) {
            console.log(`✓ is_bottom (第 ${isBottom.line} 行): ${isBottom.type} [已使用: ${isBottom.used}]`);
        } else {
            console.log(`✗ is_bottom: 未找到`);
        }

        // 检查解构赋值的变量
        const kdjTop = allSymbols.find(s => s.name === 'kdj_top');
        const kdjBottom = allSymbols.find(s => s.name === 'kdj_bottom');

        console.log('\n解构赋值变量:');
        console.log('==============');
        if (kdjTop) {
            console.log(`✓ kdj_top (第 ${kdjTop.line} 行): ${kdjTop.type}`);
            if (kdjTop.type === 'bool') {
                console.log(`  ✅ 类型推断正确!`);
            } else {
                console.log(`  ❌ 类型推断错误! 期望: bool, 实际: ${kdjTop.type}`);
            }
        } else {
            console.log(`✗ kdj_top: 未找到`);
        }

        if (kdjBottom) {
            console.log(`✓ kdj_bottom (第 ${kdjBottom.line} 行): ${kdjBottom.type}`);
            if (kdjBottom.type === 'bool') {
                console.log(`  ✅ 类型推断正确!`);
            } else {
                console.log(`  ❌ 类型推断错误! 期望: bool, 实际: ${kdjBottom.type}`);
            }
        } else {
            console.log(`✗ kdj_bottom: 未找到`);
        }

        return true;
    } catch (error) {
        console.error('❌ 解析或验证失败:', error.message);
        if (error.stack) {
            console.error('\n错误堆栈:');
            console.error(error.stack);
        }
        return false;
    }
}

// 测试detect-high-low
console.log('开始测试类型推断功能...\n');

const detectHighLowFile = path.join(__dirname, '../samples', 'detect-high-low.pine');
if (fs.existsSync(detectHighLowFile)) {
    testTypeInference(detectHighLowFile);
} else {
    console.log(`文件不存在: ${detectHighLowFile}`);
}

// 测试用户函数元组测试文件
const userFunctionTupleFile = path.join(__dirname, '../samples/user-function-return-tuple.pine');
if (fs.existsSync(userFunctionTupleFile)) {
    testTypeInference(userFunctionTupleFile);
} else {
    console.log(`文件不存在: ${userFunctionTupleFile}`);
}
