export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onDataAvailable: (data: string) => void;

  constructor(onDataAvailable: (data: string) => void) {
    this.onDataAvailable = onDataAvailable;
  }

  async start() {
    // Defensive reset in case start() is called twice during rapid reconnects.
    this.stop();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
    }
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Use ScriptProcessor for simplicity in this demo (AudioWorklet is better but more complex to setup in a single file)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // Convert float32 to int16
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }
      
      // Convert to base64
      const buffer = pcmData.buffer;
      const binary = String.fromCharCode(...new Uint8Array(buffer));
      const base64 = btoa(binary);
      
      this.onDataAvailable(base64);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop() {
    if (this.processor && this.source) {
        this.processor.disconnect();
        this.source.disconnect();
    }
    if (this.audioContext) {
        this.audioContext.close();
    }
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
    }
    this.processor = null;
    this.source = null;
    this.audioContext = null;
    this.stream = null;
  }
}

export class AudioPlayer {
  private audioContext: AudioContext;
  private nextStartTime: number = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 }); // Gemini output is often 24kHz
  }

  async initialize() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  play(base64Data: string) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 0x7FFF;
    }

    const buffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    
    this.scheduledSources.push(source);
    
    // Cleanup finished sources
    source.onended = () => {
        this.scheduledSources = this.scheduledSources.filter(s => s !== source);
    };
  }

  stop() {
    this.scheduledSources.forEach(source => {
        try {
            source.stop();
        } catch (e) {
            // Ignore if already stopped
        }
    });
    this.scheduledSources = [];
    // Reset time to avoid large gaps if we resume
    this.nextStartTime = this.audioContext.currentTime;
  }

  getRemainingDuration() {
    return Math.max(0, this.nextStartTime - this.audioContext.currentTime);
  }
}
