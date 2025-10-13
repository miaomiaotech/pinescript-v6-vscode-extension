/**
 * VSCode API Mock for testing
 * 提供测试所需的最小 vscode 模块实现
 */

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }

  isEqual(other) {
    return this.line === other.line && this.character === other.character;
  }

  isBefore(other) {
    if (this.line < other.line) return true;
    if (this.line > other.line) return false;
    return this.character < other.character;
  }

  isAfter(other) {
    return !this.isEqual(other) && !this.isBefore(other);
  }

  translate(lineDelta = 0, characterDelta = 0) {
    return new Position(this.line + lineDelta, this.character + characterDelta);
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  isEmpty() {
    return this.start.isEqual(this.end);
  }

  contains(positionOrRange) {
    if (positionOrRange instanceof Position) {
      return !positionOrRange.isBefore(this.start) && !positionOrRange.isAfter(this.end);
    }
    return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
  }
}

module.exports = {
  Position,
  Range,
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
};
