/**
 * 检查 parameter-requirements.ts (MANUAL) 和 parameter-requirements-generated.ts (GENERATED) 之间的冲突
 *
 * 这个脚本帮助发现手动定义与自动生成定义之间的差异，确保参数定义的一致性。
 *
 * 用法: node v6/check-parameter-conflicts.js
 */

const GENERATED = require('../dist/v6/parameter-requirements-generated.js').PINE_FUNCTIONS;
const MANUAL = require('../dist/v6/parameter-requirements.js').ALL_FUNCTION_SIGNATURES;

console.log('🔍 检查手动定义与自动生成定义之间的冲突...\n');

let conflictCount = 0;
const conflicts = [];

// 检查所有手动定义的函数
for (const [funcName, manualSpec] of Object.entries(MANUAL)) {
  const generatedSpec = GENERATED[funcName];

  if (!generatedSpec) {
    console.log(`ℹ️  ${funcName}: 仅存在于手动定义中（自动生成中不存在）`);
    continue;
  }

  // 比较必需参数
  const manualRequired = new Set(manualSpec.requiredParams);
  const generatedRequired = new Set(generatedSpec.requiredParams);

  const manualOptional = new Set(manualSpec.optionalParams);
  const generatedOptional = new Set(generatedSpec.optionalParams);

  let hasConflict = false;
  const issues = [];

  // 检查参数分类是否一致
  for (const param of manualRequired) {
    if (generatedOptional.has(param)) {
      hasConflict = true;
      issues.push(`  ❌ 参数 '${param}': MANUAL定义为必需，GENERATED定义为可选`);
    } else if (!generatedRequired.has(param)) {
      hasConflict = true;
      issues.push(`  ⚠️  参数 '${param}': MANUAL定义为必需，GENERATED中不存在`);
    }
  }

  for (const param of manualOptional) {
    if (generatedRequired.has(param)) {
      hasConflict = true;
      issues.push(`  ❌ 参数 '${param}': MANUAL定义为可选，GENERATED定义为必需`);
    }
  }

  if (hasConflict) {
    conflictCount++;
    console.log(`\n🔴 ${funcName}:`);
    console.log(`  MANUAL:    requiredParams: [${Array.from(manualRequired).join(', ')}]`);
    console.log(`             optionalParams: [${Array.from(manualOptional).join(', ')}]`);
    console.log(`  GENERATED: requiredParams: [${Array.from(generatedRequired).join(', ')}]`);
    console.log(`             optionalParams: [${Array.from(generatedOptional).join(', ')}]`);
    issues.forEach(issue => console.log(issue));

    conflicts.push({
      function: funcName,
      manual: {
        required: Array.from(manualRequired),
        optional: Array.from(manualOptional)
      },
      generated: {
        required: Array.from(generatedRequired),
        optional: Array.from(generatedOptional)
      }
    });
  }
}

console.log('\n' + '='.repeat(80));
if (conflictCount === 0) {
  console.log('✅ 没有发现冲突！所有手动定义与自动生成定义一致。');
} else {
  console.log(`⚠️  发现 ${conflictCount} 个冲突函数`);
  console.log('\n建议：');
  console.log('1. 检查 TradingView 官方文档确认正确的参数定义');
  console.log('2. 更新 v6/parameter-requirements.ts 中的手动定义');
  console.log('3. 重新编译并运行测试');
}
console.log('='.repeat(80) + '\n');

process.exit(conflictCount > 0 ? 1 : 0);
