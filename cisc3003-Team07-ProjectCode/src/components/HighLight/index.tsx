import React from 'react';
import { Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface Props {
  input: string;
  action: number
}

const TextWithHighlights: React.FC<Props> = ({ input, action }) => {
  // 正则表达式用来查找 <text>...</text> 结构
  const regex = /<highlight>(.*?)<\/highlight>/g;
  // 拆分输入字符串，保留文本和匹配
  const parts = [];
  let lastIndex = 0;

  input.replace(regex, (match, p1, offset) => {
    // 添加上一个匹配和当前匹配之间的文本
    if (offset > lastIndex) {
      parts.push(input.slice(lastIndex, offset));
    }
    // 添加高亮文本
      parts.push(<Text mark key={offset}>{p1}</Text>);
    lastIndex = offset + match.length;
    return match;
  });

  // 添加最后一部分文本（如果存在）
  if (lastIndex < input.length) {
    parts.push(input.slice(lastIndex));
  }

  if (action === 1) {
      return (
        <Paragraph style={{fontSize: '16px'}}>
          {parts}
        </Paragraph>
      );
  } else {
    return (
        <Typography.Title level={3} >
          {parts}
        </Typography.Title>
    )
  }
};

export default TextWithHighlights;