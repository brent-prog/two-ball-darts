'use client';

import { useEffect } from 'react';

const SCORE_MEMORY_KEY = 'tbdCompactScoreMemory';
const LOCAL_SAVED_ROUNDS_KEY = 'tbdLocalSavedRounds';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getText(node) {
  return normalizeText(node?.textContent || '');
}

function formatScore(value) {
  if (!value) return 'E';
  return value > 0 ? `+${value}` : String(value);
