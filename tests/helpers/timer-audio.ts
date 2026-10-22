import type { TestContext } from 'node:test';

export function mockTimerAudio(t: TestContext) {
  const sources: TestSource[] = [];
  let decodeDuration = 30;
  let decodeError = false;
  let resumeError = false;
  let decodes = 0;
  let resumes = 0;
  let pendingDecode: (() => Promise<{ duration: number }>) | null = null;
  class TestSource {
    buffer: unknown = null;
    type = '';
    frequency = { value: 0 };
    onended: (() => void) | null = null;
    starts: number[][] = [];
    stops: (number | undefined)[] = [];
    connect() {}
    disconnect() {}
    start(...args: number[]) { this.starts.push(args); }
    stop(time?: number) { this.stops.push(time); }
  }
  class TestAudioContext {
    state = 'suspended';
    currentTime = 100;
    destination = {};
    async resume() {
      resumes++;
      if (resumeError) throw new Error('blocked');
      this.state = 'running';
    }
    async decodeAudioData() {
      decodes++;
      if (decodeError) throw new Error('invalid audio');
      if (pendingDecode) return pendingDecode();
      return { duration: decodeDuration };
    }
    createGain() {
      return { connect() {}, disconnect() {}, gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } };
    }
    createOscillator() { const source = new TestSource(); sources.push(source); return source; }
    createBufferSource() { const source = new TestSource(); sources.push(source); return source; }
  }
  class TestFileReader {
    result: string | null = null;
    error = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL(file: File) {
      void file.arrayBuffer().then(buffer => {
        this.result = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onload?.();
      });
    }
  }
  for (const [name, value] of Object.entries({ AudioContext: TestAudioContext, FileReader: TestFileReader })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  return {
    sources,
    counts: () => ({ decodes, resumes }),
    duration: (seconds: number) => { decodeDuration = seconds; },
    failDecode: () => { decodeError = true; },
    failResume: () => { resumeError = true; },
    deferDecode: (pending: () => Promise<{ duration: number }>) => { pendingDecode = pending; },
  };
}
