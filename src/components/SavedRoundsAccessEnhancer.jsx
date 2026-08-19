'use client';

import { useEffect } from 'react';

const SCORE_MEMORY_KEY = 'tbdCompactScoreMemory';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getText(node) {
  return normalizeText(node?.textContent || '');
}

function isOwnButton(button) {
  return button?.classList?.contains('tbd-saved-rounds-access');
}

function getCandidateSavedRounds