// 对于HTML，某些标记应该省略其close标记。我们为那些特殊情况的标签保留一份白名单。

const omittedCloseTags = {
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,
  // NOTE: menuitem's close tag should be omitted, but that causes problems.
};

export default omittedCloseTags;