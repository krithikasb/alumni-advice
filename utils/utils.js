function getFormattedAdvice(advice) {
  // format advice differently if it has description
  let formattedAdvice;

  if (advice.description) {
    formattedAdvice =
      `**${advice.content}**\n\n${advice.description}\n\n` +
      `— [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`;
  } else {
    formattedAdvice =
      `${advice.content}\n` +
      `— [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`;
  }

  return formattedAdvice;
}

module.exports = {
  getFormattedAdvice,
};
