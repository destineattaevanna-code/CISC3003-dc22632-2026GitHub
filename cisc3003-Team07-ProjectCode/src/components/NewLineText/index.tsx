import React from 'react';

const NewlineText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split('\n').map((part, index) => (
    <React.Fragment key={index}>
      {part}
      {index !== text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  return <div>{parts}</div>;
};

export default NewlineText;