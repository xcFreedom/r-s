export default function endsWith(subject, search) {
  const length = subject.length;
  return subject.substring(length - search.length, length) === search;
}