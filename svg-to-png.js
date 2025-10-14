// svg_to_png_converter.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * 将 SVG 文件转换为 PNG 文件，并根据指定长边尺寸调整输出大小。
 * @param {string} inputPath 输入 SVG 文件路径
 * @param {string} outputPath 输出 PNG 文件路径
 * @param {number} targetLongSide 目标长边尺寸（像素）
 */
async function convertSvgToPng(inputPath, outputPath, targetLongSide) {
    if (!fs.existsSync(inputPath)) {
        console.error(`错误：找不到输入文件: ${inputPath}`);
        return;
    }

    // 检查 targetLongSide 是否为有效数字
    if (isNaN(targetLongSide) || targetLongSide <= 0) {
        console.error(`错误：无效的长边尺寸: ${targetLongSide}。必须是正整数。`);
        return;
    }

    try {
        const svgBuffer = fs.readFileSync(inputPath);
        const image = sharp(svgBuffer);
        const metadata = await image.metadata();

        const { width, height } = metadata;
        if (!width || !height) {
             console.error("错误：无法读取 SVG 文件的尺寸元数据。");
             return;
        }

        let resizeOptions = {};

        // 确定哪条边是长边
        if (width >= height) {
            // 宽度是长边
            resizeOptions = { width: targetLongSide };
        } else {
            // 高度是长边
            resizeOptions = { height: targetLongSide };
        }
        
        // 使用 .resize() 并保持纵横比，然后输出为 PNG
        await image
            .resize(resizeOptions)
            .png() // 转换为 PNG 格式
            .toFile(outputPath);

        console.log(`\n✅ 转换成功!`);
        console.log(`   输入 SVG: ${inputPath} (${width}x${height})`);
        console.log(`   输出 PNG: ${outputPath} (${targetLongSide}x${Math.round((targetLongSide / (width > height ? width : height)) * (width > height ? height : width))})`);

    } catch (error) {
        console.error("❌ 转换过程中发生错误:", error.message);
    }
}

// --- 命令行参数处理 ---
const args = process.argv.slice(2);

if (args.length !== 3) {
    console.log("用法: node svg-to-png.js <输入SVG文件> <输出PNG文件> <长边像素尺寸>");
    console.log("例如: node svg-to-png.js icon.svg icon_512.png 512");
    process.exit(1);
}

const [input, output, longSide] = args;
convertSvgToPng(input, output, parseInt(longSide, 10));