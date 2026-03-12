self.onmessage = (event) => {
  const { user, artists, weights } = event.data;
  const mfccMean = meanVector(user.mfccFrames, 13);
  const userCentroid = meanValue(user.spectralCentroidFrames);
  const userPitchRange = derivePitchRange(user.pitchFrames);

  const ranked = artists.map((artist) => {
    const timbreCos = cosineSimilarity(mfccMean, artist.timbre.mfcc_mean);
    const timbreScore = normalizeCosine(timbreCos);
    const rangeScore = rangeOverlap(
      userPitchRange.min,
      userPitchRange.max,
      artist.pitch_range.freq_min,
      artist.pitch_range.freq_max
    );

    const total = (weights.w1 * timbreScore + weights.w2 * rangeScore) * 100;
    const centroidDiff = Math.abs(userCentroid - artist.timbre.spectral_centroid);

    return {
      id: artist.id,
      name: artist.name,
      score: clamp(total, 0, 100),
      timbreScore: timbreScore * 100,
      rangeScore: rangeScore * 100,
      centroidDiff,
      tags: artist.tags,
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  self.postMessage({
    ranked,
    userSummary: {
      mfccMean,
      spectralCentroid: userCentroid,
      pitchRange: userPitchRange,
    },
  });
};

function meanVector(frames, dimension) {
  if (!frames.length) {
    return new Array(dimension).fill(0);
  }

  const accum = new Array(dimension).fill(0);
  for (const frame of frames) {
    for (let i = 0; i < dimension; i += 1) {
      accum[i] += Number.isFinite(frame[i]) ? frame[i] : 0;
    }
  }

  return accum.map((sum) => sum / frames.length);
}

function meanValue(values) {
  if (!values.length) {
    return 0;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function derivePitchRange(pitches) {
  if (!pitches.length) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...pitches),
    max: Math.max(...pitches),
  };
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeCosine(value) {
  return (clamp(value, -1, 1) + 1) / 2;
}

function rangeOverlap(aMin, aMax, bMin, bMax) {
  if (aMin === 0 || aMax === 0) {
    return 0;
  }

  const intersection = Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
  const userRange = Math.max(1e-6, aMax - aMin);
  return clamp(intersection / userRange, 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
