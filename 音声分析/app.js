import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/+esm";

Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const STATES = {
  IDLE: "IDLE",
  MIC_REQUEST: "MIC_REQUEST",
  RECORDING: "RECORDING",
  ANALYZING: "ANALYZING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
};

const MODE_LABELS = {
  chest: "地声",
  head: "裏声",
  mix: "ミックスボイス",
};

const FFT_SIZE = 2048;
const BUFFER_SIZE = 512;
const MIN_RECORD_SECONDS = 1.5;
const MAX_RECORD_SECONDS = 10;
const SILENCE_RMS_THRESHOLD = 0.012;
const SILENCE_LIMIT_SECONDS = 3;
const RMS_VALID_MIN = 0.015;
const RMS_VALID_MAX = 0.12;
const RMS_METER_MAX = 0.16;
const REQUIRED_RMS_RATIO = 0.55;
const CLIP_THRESHOLD = 0.98;
const WEIGHTS = { w1: 0.7, w2: 0.3 };

const ui = {
  stateBadge: document.getElementById("stateBadge"),
  statusText: document.getElementById("statusText"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  retryBtn: document.getElementById("retryBtn"),
  liveGuide: document.getElementById("liveGuide"),
  resultPanel: document.getElementById("resultPanel"),
  resultSummary: document.getElementById("resultSummary"),
  topList: document.getElementById("topList"),
  toast: document.getElementById("toast"),
  waveCanvas: document.getElementById("waveCanvas"),
  radarChart: document.getElementById("radarChart"),
  ageInput: document.getElementById("ageInput"),
  genderInput: document.getElementById("genderInput"),
  favoriteArtistInput: document.getElementById("favoriteArtistInput"),
  artistSuggestions: document.getElementById("artistSuggestions"),
  mixModeToggle: document.getElementById("mixModeToggle"),
  modePrompt: document.getElementById("modePrompt"),
  rmsTrack: document.getElementById("rmsTrack"),
  rmsValue: document.getElementById("rmsValue"),
  rmsPointer: document.getElementById("rmsPointer"),
};

const canvasCtx = ui.waveCanvas.getContext("2d");

let state = STATES.IDLE;
let artists = [];
let worker;
let radarChart;
let audioContext;
let mediaStream;
let sourceNode;
let analyserNode;
let processorNode;
let meydaExtractor;
let rafId;
let startedAtMs = 0;
let silenceMs = 0;
let clipDetected = false;
let workflowActive = false;
let pendingRetryMode = false;
let currentModeIndex = 0;
let modeWorkflow = [];
let modeRecords = {};
let userProfile = null;

const frames = {
  mfcc: [],
  centroid: [],
  rms: [],
  pitch: [],
};

void init();

async function init() {
  try {
    const response = await fetch("./artists.json");
    const data = await response.json();
    artists = data.artists ?? [];
  } catch {
    setState(STATES.ERROR, "歌手データの読み込みに失敗しました。");
    showToast("artists.json の読み込みに失敗しました。", "error");
    return;
  }

  populateArtistSuggestions();

  worker = new Worker("./matchingWorker.js", { type: "classic" });
  worker.onmessage = handleWorkerResult;

  ui.startBtn.addEventListener("click", handleStart);
  ui.stopBtn.addEventListener("click", () => stopRecordingAndAnalyze("manual"));
  ui.retryBtn.addEventListener("click", handleRetry);

  setState(STATES.IDLE, "属性を入力し、解析開始ボタンを押してください。");
  refreshModePrompt();
  configureVolumeMeter();
  updateVolumeMeter(0);
}

function configureVolumeMeter() {
  if (!ui.rmsTrack) {
    return;
  }

  const minPct = Math.min(100, (RMS_VALID_MIN / RMS_METER_MAX) * 100);
  const maxPct = Math.min(100, (RMS_VALID_MAX / RMS_METER_MAX) * 100);
  ui.rmsTrack.style.setProperty("--meter-min-pct", `${minPct}%`);
  ui.rmsTrack.style.setProperty("--meter-max-pct", `${maxPct}%`);
}

function populateArtistSuggestions() {
  ui.artistSuggestions.innerHTML = "";
  for (const artist of artists) {
    const option = document.createElement("option");
    option.value = artist.name;
    ui.artistSuggestions.appendChild(option);
  }
}

async function handleStart() {
  if (state !== STATES.IDLE) {
    return;
  }

  if (!workflowActive && !beginWorkflow()) {
    return;
  }

  pendingRetryMode = false;
  setState(STATES.MIC_REQUEST, `${currentModeLabel()} の収録準備中...`);

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch (error) {
    if (error && error.name === "NotAllowedError") {
      setState(STATES.ERROR, "マイク権限が必要です。");
      showToast("マイクの使用を許可してください。設定から変更可能です", "error");
    } else {
      setState(STATES.ERROR, "マイクの初期化に失敗しました。");
      showToast("音声入力を開始できませんでした。", "error");
    }
    ui.retryBtn.hidden = false;
    return;
  }

  try {
    await beginAudioPipeline();
    setState(
      STATES.RECORDING,
      `録音中: ${currentModeLabel()}（${currentModeIndex + 1}/${modeWorkflow.length}） 最大${MAX_RECORD_SECONDS}秒`
    );

    startedAtMs = performance.now();
    silenceMs = 0;
    clipDetected = false;

    window.setTimeout(() => {
      if (state === STATES.RECORDING) {
        stopRecordingAndAnalyze("timeout");
      }
    }, MAX_RECORD_SECONDS * 1000);
  } catch {
    setState(STATES.ERROR, "解析エンジンの準備に失敗しました。");
    showToast("音声解析の初期化に失敗しました。", "error");
    ui.retryBtn.hidden = false;
    teardownAudio();
  }
}

function beginWorkflow() {
  const age = Number(ui.ageInput.value);
  const gender = ui.genderInput.value;
  const favoriteArtist = ui.favoriteArtistInput.value.trim();

  if (!Number.isFinite(age) || age < 8 || age > 99) {
    showToast("年齢は 8-99 の範囲で入力してください。", "warn");
    return false;
  }
  if (!gender) {
    showToast("性別を選択してください。", "warn");
    return false;
  }
  if (!favoriteArtist) {
    showToast("よく歌うアーティストを入力してください。", "warn");
    return false;
  }

  userProfile = { age, gender, favoriteArtist };
  modeWorkflow = ["chest", "head"];
  if (ui.mixModeToggle.checked) {
    modeWorkflow.push("mix");
  }

  currentModeIndex = 0;
  modeRecords = {};
  workflowActive = true;
  refreshModePrompt();
  return true;
}

async function beginAudioPipeline() {
  if (!window.Meyda) {
    throw new Error("Meyda missing");
  }

  clearFrames();

  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaStreamSource(mediaStream);

  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = FFT_SIZE;
  analyserNode.smoothingTimeConstant = 0.8;

  processorNode = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

  sourceNode.connect(analyserNode);
  analyserNode.connect(processorNode);
  processorNode.connect(audioContext.destination);

  meydaExtractor = window.Meyda.createMeydaAnalyzer({
    audioContext,
    source: sourceNode,
    bufferSize: BUFFER_SIZE,
    hopSize: 256,
    windowingFunction: "hamming",
    featureExtractors: ["mfcc", "spectralCentroid", "rms"],
    callback: (features) => {
      if (state !== STATES.RECORDING || !features) {
        return;
      }

      if (Array.isArray(features.mfcc)) {
        frames.mfcc.push(features.mfcc.slice(0, 13));
      }
      if (Number.isFinite(features.spectralCentroid)) {
        frames.centroid.push(features.spectralCentroid);
      }
      if (Number.isFinite(features.rms)) {
        frames.rms.push(features.rms);
        trackSilence(features.rms);
        updateVolumeMeter(features.rms);
      }

      const pitch = detectPitchFromAnalyser(analyserNode, audioContext.sampleRate);
      if (Number.isFinite(pitch) && pitch > 50 && pitch < 1200) {
        frames.pitch.push(pitch);
      }

      const clippingNow = detectClipping(analyserNode);
      clipDetected = clipDetected || clippingNow;
      if (clipDetected) {
        ui.liveGuide.textContent = "音が大きすぎます。マイクから少し離れてください";
      }
    },
  });

  meydaExtractor.start();
  startVisualizer();
}

function stopRecordingAndAnalyze(trigger) {
  if (state !== STATES.RECORDING) {
    return;
  }

  const durationSec = (performance.now() - startedAtMs) / 1000;

  meydaExtractor?.stop();
  cancelAnimationFrame(rafId);

  if (durationSec < MIN_RECORD_SECONDS) {
    setState(STATES.ERROR, `${currentModeLabel()} の録音が短すぎます。`);
    ui.liveGuide.textContent = "";
    showToast("データが不足しています。もう少し長く歌ってください", "warn");
    pendingRetryMode = true;
    teardownAudio();
    return;
  }

  const rmsValidRatio = calculateRmsValidRatio(frames.rms);
  if (rmsValidRatio < REQUIRED_RMS_RATIO) {
    setState(STATES.ERROR, `${currentModeLabel()} の音量条件を満たしていません。`);
    showToast("声の大きさが判定範囲外です。中程度の音量で再録音してください。", "warn");
    ui.liveGuide.textContent = `有効音量率 ${(rmsValidRatio * 100).toFixed(0)}%（必要: ${(REQUIRED_RMS_RATIO * 100).toFixed(0)}%以上）`;
    pendingRetryMode = true;
    teardownAudio();
    return;
  }

  modeRecords[currentModeKey()] = {
    mfccFrames: [...frames.mfcc],
    spectralCentroidFrames: [...frames.centroid],
    pitchFrames: [...frames.pitch],
    rmsFrames: [...frames.rms],
    durationSec,
    trigger,
    clipDetected,
    rmsValidRatio,
  };

  teardownAudio();
  clearFrames();
  ui.liveGuide.textContent = "";
  updateVolumeMeter(0);

  if (currentModeIndex < modeWorkflow.length - 1) {
    currentModeIndex += 1;
    refreshModePrompt();
    setState(STATES.IDLE, `次は ${currentModeLabel()} を録音してください。`);
    showToast(`${currentModeLabel()} の録音を開始してください。`, "info");
    return;
  }

  setState(STATES.ANALYZING, "声質を精査中...");
  worker.postMessage({
    user: buildMergedUserData(),
    artists,
    weights: WEIGHTS,
  });
}

function buildMergedUserData() {
  const merged = {
    mfccFrames: [],
    spectralCentroidFrames: [],
    pitchFrames: [],
    rmsFrames: [],
    durationSec: 0,
    trigger: "multi-mode",
    clipDetected: false,
    modeDetails: {},
    profile: userProfile,
  };

  for (const mode of modeWorkflow) {
    const rec = modeRecords[mode];
    if (!rec) {
      continue;
    }
    merged.mfccFrames.push(...rec.mfccFrames);
    merged.spectralCentroidFrames.push(...rec.spectralCentroidFrames);
    merged.pitchFrames.push(...rec.pitchFrames);
    merged.rmsFrames.push(...rec.rmsFrames);
    merged.durationSec += rec.durationSec;
    merged.clipDetected = merged.clipDetected || rec.clipDetected;
    merged.modeDetails[mode] = {
      durationSec: rec.durationSec,
      rmsValidRatio: rec.rmsValidRatio,
    };
  }

  return merged;
}

function handleWorkerResult(event) {
  const { ranked } = event.data;

  if (!ranked || !ranked.length) {
    setState(STATES.ERROR, "一致結果を算出できませんでした。");
    ui.retryBtn.hidden = false;
    teardownAudio();
    return;
  }

  const top3 = ranked.slice(0, 3);
  const best = top3[0];

  renderTopList(top3);
  renderChart(best);

  const modeLine = modeWorkflow.map((mode) => MODE_LABELS[mode]).join(" / ");
  ui.resultSummary.textContent =
    `${best.name} との一致度は ${best.score.toFixed(1)}% です。` +
    ` 音色 ${best.timbreScore.toFixed(1)} / 音域適合 ${best.rangeScore.toFixed(1)}。` +
    ` 条件: ${userProfile.age}歳・${userProfile.gender}・${userProfile.favoriteArtist} / 録音 ${modeLine}`;

  ui.resultPanel.hidden = false;
  setState(STATES.SUCCESS, "解析完了。結果を表示しています。");

  if (best.centroidDiff / Math.max(best.timbreScore, 1) > 0.2) {
    ui.liveGuide.textContent = "デバイス差が大きい可能性があります。別端末でも比較してみてください。";
  }

  teardownAudio(true);
}

function renderTopList(list) {
  ui.topList.innerHTML = "";
  for (const item of list) {
    const li = document.createElement("li");
    li.textContent = `${item.name}: ${item.score.toFixed(1)}% (${item.tags.join(" / ")})`;
    ui.topList.appendChild(li);
  }
}

function renderChart(best) {
  radarChart?.destroy();

  radarChart = new Chart(ui.radarChart, {
    type: "radar",
    data: {
      labels: ["総合", "音色", "音域", "安定度", "近似度"],
      datasets: [
        {
          label: best.name,
          data: [
            best.score,
            best.timbreScore,
            best.rangeScore,
            100 - Math.min(100, best.centroidDiff / 20),
            Math.max(0, 100 - best.centroidDiff / 25),
          ],
          borderColor: "rgba(45, 106, 79, 1)",
          backgroundColor: "rgba(45, 106, 79, 0.24)",
          pointBackgroundColor: "rgba(45, 106, 79, 1)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20 },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

function setState(next, message) {
  state = next;
  ui.stateBadge.textContent = next;
  ui.statusText.textContent = message;

  ui.startBtn.disabled = next !== STATES.IDLE;
  ui.stopBtn.disabled = next !== STATES.RECORDING;
  ui.retryBtn.hidden = !(next === STATES.ERROR || next === STATES.SUCCESS);

  if (next === STATES.IDLE || next === STATES.ERROR) {
    ui.stopBtn.disabled = true;
  }

  if (next === STATES.ERROR) {
    ui.resultPanel.hidden = true;
  }
}

function handleRetry() {
  if (pendingRetryMode && workflowActive) {
    setState(STATES.IDLE, `${currentModeLabel()} を再録音してください。`);
    ui.liveGuide.textContent = "";
    return;
  }
  resetToIdle();
}

function resetToIdle() {
  teardownAudio();
  clearFrames();
  workflowActive = false;
  pendingRetryMode = false;
  currentModeIndex = 0;
  modeWorkflow = [];
  modeRecords = {};
  userProfile = null;
  ui.resultPanel.hidden = true;
  ui.liveGuide.textContent = "";
  updateVolumeMeter(0);
  setState(STATES.IDLE, "属性を入力し、解析開始ボタンを押してください。");
  refreshModePrompt();
}

function teardownAudio(shouldSuspend = false) {
  if (shouldSuspend && audioContext && audioContext.state === "running") {
    void audioContext.suspend();
  }

  meydaExtractor?.stop();

  sourceNode?.disconnect();
  analyserNode?.disconnect();
  processorNode?.disconnect();

  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
  }

  sourceNode = null;
  analyserNode = null;
  processorNode = null;
  meydaExtractor = null;
  mediaStream = null;
  audioContext = null;
}

function clearFrames() {
  frames.mfcc = [];
  frames.centroid = [];
  frames.rms = [];
  frames.pitch = [];
}

function currentModeKey() {
  return modeWorkflow[currentModeIndex];
}

function currentModeLabel() {
  return MODE_LABELS[currentModeKey()] ?? "声";
}

function refreshModePrompt() {
  if (!workflowActive) {
    const extra = ui.mixModeToggle.checked ? " + ミックスボイス" : "";
    ui.modePrompt.textContent = `録音順: 地声 -> 裏声${extra}`;
    return;
  }

  const done = modeWorkflow.slice(0, currentModeIndex).map((mode) => MODE_LABELS[mode]).join(" -> ");
  const current = currentModeLabel();
  ui.modePrompt.textContent = done
    ? `完了: ${done} / 次: ${current}`
    : `現在: ${current} を録音してください`;
}

function startVisualizer() {
  const freq = new Uint8Array(analyserNode.frequencyBinCount);

  const draw = () => {
    if (!analyserNode || state !== STATES.RECORDING) {
      return;
    }

    analyserNode.getByteFrequencyData(freq);

    canvasCtx.clearRect(0, 0, ui.waveCanvas.width, ui.waveCanvas.height);
    canvasCtx.fillStyle = "rgba(240, 247, 242, 0.8)";
    canvasCtx.fillRect(0, 0, ui.waveCanvas.width, ui.waveCanvas.height);

    const barW = (ui.waveCanvas.width / freq.length) * 2.2;
    let x = 0;

    for (let i = 0; i < freq.length; i += 2) {
      const v = freq[i] / 255;
      const h = v * ui.waveCanvas.height;
      canvasCtx.fillStyle = `rgba(45, 106, 79, ${0.25 + v * 0.75})`;
      canvasCtx.fillRect(x, ui.waveCanvas.height - h, barW, h);
      x += barW + 1;
      if (x > ui.waveCanvas.width) {
        break;
      }
    }

    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);
}

function trackSilence(rms) {
  const frameMs = (BUFFER_SIZE / (audioContext?.sampleRate ?? 44100)) * 1000;
  if (rms < SILENCE_RMS_THRESHOLD) {
    silenceMs += frameMs;
  } else {
    silenceMs = 0;
    if (ui.liveGuide.textContent.includes("声が検出されません")) {
      ui.liveGuide.textContent = "";
    }
  }

  if (silenceMs >= SILENCE_LIMIT_SECONDS * 1000) {
    ui.liveGuide.textContent = "声が検出されません。マイクに近づいてください";
  }
}

function calculateRmsValidRatio(rmsFrames) {
  if (!rmsFrames.length) {
    return 0;
  }

  let valid = 0;
  for (const rms of rmsFrames) {
    if (rms >= RMS_VALID_MIN && rms <= RMS_VALID_MAX) {
      valid += 1;
    }
  }

  return valid / rmsFrames.length;
}

function updateVolumeMeter(rms) {
  const clamped = Math.max(0, Math.min(rms, RMS_METER_MAX));
  const pointerPct = (clamped / RMS_METER_MAX) * 100;

  if (ui.rmsTrack) {
    ui.rmsTrack.style.setProperty("--meter-pointer-pct", `${pointerPct}%`);
  }

  if (ui.rmsValue) {
    const zone = rms < RMS_VALID_MIN ? "小さめ" : rms > RMS_VALID_MAX ? "大きめ" : "適正";
    ui.rmsValue.textContent = `現在: ${rms.toFixed(3)} (${zone})`;
  }
}

function showToast(message, kind = "info") {
  ui.toast.textContent = message;
  ui.toast.className = `toast show ${kind}`;
  window.setTimeout(() => {
    ui.toast.className = "toast";
  }, 3200);
}

function detectPitchFromAnalyser(analyser, sampleRate) {
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);

  let rms = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) {
    return Number.NaN;
  }

  let r1 = 0;
  let r2 = buffer.length - 1;
  const threshold = 0.2;

  for (let i = 0; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[buffer.length - i]) < threshold) {
      r2 = buffer.length - i;
      break;
    }
  }

  const clipped = buffer.slice(r1, r2);
  const size = clipped.length;
  const c = new Array(size).fill(0);

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size - i; j += 1) {
      c[i] += clipped[j] * clipped[j + i];
    }
  }

  let d = 0;
  while (d + 1 < size && c[d] > c[d + 1]) {
    d += 1;
  }

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < size; i += 1) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }

  if (maxPos <= 0) {
    return Number.NaN;
  }

  return sampleRate / maxPos;
}

function detectClipping(analyser) {
  const waveform = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(waveform);
  for (let i = 0; i < waveform.length; i += 1) {
    if (Math.abs(waveform[i]) >= CLIP_THRESHOLD) {
      return true;
    }
  }
  return false;
}
