// utils/markdown.js
// 银行业务助手 - 简易 Markdown 渲染模块
// 将 Markdown 文本转换为小程序 rich-text 支持的 nodes 结构

/**
 * 将 Markdown 文本解析为小程序 rich-text 可用的 nodes 数组
 * 支持：标题(h1-h4)、加粗、列表(有序/无序)、表格、段落
 * @param {string} text - Markdown 原始文本
 * @returns {Array} rich-text nodes 数组
 */
function parseMarkdown(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const nodes = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (line.trim() === '') {
      nodes.push({ name: 'div', attrs: { style: 'height: 16rpx;' }, children: [] });
      i++;
      continue;
    }

    // 标题 h1-h4
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const styles = {
        1: 'font-size: 40rpx; font-weight: 700; color: #1a3a5c; margin: 32rpx 0 16rpx; padding-bottom: 12rpx; border-bottom: 2rpx solid #e8f0f8;',
        2: 'font-size: 36rpx; font-weight: 600; color: #1a3a5c; margin: 28rpx 0 14rpx;',
        3: 'font-size: 32rpx; font-weight: 600; color: #2c5282; margin: 24rpx 0 12rpx;',
        4: 'font-size: 30rpx; font-weight: 500; color: #2c5282; margin: 20rpx 0 10rpx;'
      };
      nodes.push({
        name: 'div',
        attrs: { style: styles[level] },
        children: parseInline(content)
      });
      i++;
      continue;
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|?[\s\-:|]+\|/)) {
      const tableNodes = parseTable(lines, i);
      nodes.push(tableNodes.node);
      i = tableNodes.endIndex;
      continue;
    }

    // 无序列表
    if (line.match(/^\s*[-*+]\s+/)) {
      const listResult = parseList(lines, i, 'ul');
      nodes.push(listResult.node);
      i = listResult.endIndex;
      continue;
    }

    // 有序列表
    if (line.match(/^\s*\d+\.\s+/)) {
      const listResult = parseList(lines, i, 'ol');
      nodes.push(listResult.node);
      i = listResult.endIndex;
      continue;
    }

    // 分隔线
    if (line.match(/^[-*_]{3,}\s*$/)) {
      nodes.push({
        name: 'div',
        attrs: { style: 'border-bottom: 2rpx solid #e8f0f8; margin: 24rpx 0;' },
        children: []
      });
      i++;
      continue;
    }

    // 普通段落
    nodes.push({
      name: 'div',
      attrs: { style: 'font-size: 28rpx; line-height: 1.8; color: #333; margin: 8rpx 0;' },
      children: parseInline(line)
    });
    i++;
  }

  return nodes;
}

/**
 * 解析行内格式（加粗、斜体、行内代码）
 */
function parseInline(text) {
  const nodes = [];
  // 匹配加粗 **text** 或 __text__
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/);

  parts.forEach(part => {
    if (!part) return;

    // 加粗
    if (part.match(/^\*\*(.+)\*\*$/) || part.match(/^__(.+)__$/)) {
      const content = part.replace(/^\*\*|\*\*$|^__|__$/g, '');
      nodes.push({
        name: 'span',
        attrs: { style: 'font-weight: 600; color: #1a3a5c;' },
        children: [{ type: 'text', text: content }]
      });
    }
    // 斜体
    else if (part.match(/^\*(.+)\*$/) || part.match(/^_(.+)_$/)) {
      const content = part.replace(/^\*|\*$|^_|_$/g, '');
      nodes.push({
        name: 'span',
        attrs: { style: 'font-style: italic;' },
        children: [{ type: 'text', text: content }]
      });
    }
    // 行内代码
    else if (part.match(/^`(.+)`$/)) {
      const content = part.replace(/^`|`$/g, '');
      nodes.push({
        name: 'span',
        attrs: { style: 'background: #f0f4f8; padding: 4rpx 12rpx; border-radius: 6rpx; font-family: monospace; font-size: 26rpx; color: #d32f2f;' },
        children: [{ type: 'text', text: content }]
      });
    }
    // 普通文本
    else {
      nodes.push({ type: 'text', text: part });
    }
  });

  return nodes;
}

/**
 * 解析列表
 */
function parseList(lines, startIndex, type) {
  const items = [];
  let i = startIndex;
  const pattern = type === 'ul' ? /^\s*[-*+]\s+(.+)/ : /^\s*\d+\.\s+(.+)/;

  while (i < lines.length) {
    const match = lines[i].match(pattern);
    if (!match) break;

    items.push(match[1]);
    i++;
  }

  const listStyle = 'padding-left: 32rpx; margin: 12rpx 0;';
  const children = items.map((item, index) => {
    const bullet = type === 'ul' ? '• ' : `${index + 1}. `;
    return {
      name: 'div',
      attrs: { style: 'font-size: 28rpx; line-height: 2; color: #333;' },
      children: [
        { type: 'text', text: bullet },
        ...parseInline(item)
      ]
    };
  });

  return {
    node: { name: 'div', attrs: { style: listStyle }, children },
    endIndex: i
  };
}

/**
 * 解析表格
 */
function parseTable(lines, startIndex) {
  let i = startIndex;
  const rows = [];

  // 解析表头
  const headerLine = lines[i].trim().replace(/^\||\|$/g, '');
  const headers = headerLine.split('|').map(h => h.trim());
  rows.push(headers);
  i++; // 跳过表头

  // 跳过分隔行
  i++;

  // 解析数据行
  while (i < lines.length && lines[i].includes('|')) {
    const rowLine = lines[i].trim().replace(/^\||\|$/g, '');
    const cells = rowLine.split('|').map(c => c.trim());
    rows.push(cells);
    i++;
  }

  // 构建表格节点
  const tableStyle = 'width: 100%; border-collapse: collapse; margin: 16rpx 0; font-size: 26rpx; overflow-x: auto;';
  const thStyle = 'background: #f0f4f8; padding: 16rpx 12rpx; border: 2rpx solid #d0dce8; font-weight: 600; color: #1a3a5c; text-align: left;';
  const tdStyle = 'padding: 14rpx 12rpx; border: 2rpx solid #e8f0f8; color: #333;';

  const tableChildren = [];

  // 表头行
  if (rows.length > 0) {
    const headerCells = rows[0].map(h => ({
      name: 'th',
      attrs: { style: thStyle },
      children: [{ type: 'text', text: h }]
    }));
    tableChildren.push({
      name: 'tr',
      attrs: {},
      children: headerCells
    });
  }

  // 数据行
  for (let r = 1; r < rows.length; r++) {
    const rowCells = rows[r].map(c => ({
      name: 'td',
      attrs: { style: tdStyle },
      children: [{ type: 'text', text: c }]
    }));
    tableChildren.push({
      name: 'tr',
      attrs: { style: r % 2 === 0 ? 'background: #fafcfe;' : '' },
      children: rowCells
    });
  }

  return {
    node: {
      name: 'div',
      attrs: { style: 'overflow-x: auto; margin: 16rpx 0;' },
      children: [{
        name: 'table',
        attrs: { style: tableStyle },
        children: tableChildren
      }]
    },
    endIndex: i
  };
}

module.exports = {
  parseMarkdown
};
