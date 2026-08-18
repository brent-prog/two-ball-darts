'use client';

import { useEffect } from 'react';

function findButtonByText(text) {
  return [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text);
}

function goToHoleOne() {
  window.setTimeout(() => {
    const holeOne = [...document.querySelectorAll('.hole-picker button')].find(button => button.textContent.trim() === '1');
    holeOne?.click();
  }, 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateHazardOptions() {
  document.querySelectorAll('option').forEach(option => {
    const text = option.textContent.trim();
    if (text === 'On-board miss / bull') option.textContent = 'Safe on-board miss';
    if (text === 'Off the board') option.textContent = 'Hazard / off-board miss';
  });
}

function updateHazardRulesCopy() {
  document.querySelectorAll('.rule-answer p').forEach(paragraph => {
    const text = paragraph.textContent.trim();
    if (!text.startsWith('Local rulings:')) return;

    paragraph.innerHTML = '<strong>Hazards:</strong> Red bull, green bull, 19, 20, and any dart completely off the board are hazards. A hazard counts the same as a complete board miss. Only the active hole number is a target. Every other board number is a miss. Safe on-board misses still count as on-board, but hazards do not. Worst possible score on any hole is triple bogey.';
  });
}

function updateHowToPlayCopy() {
  const quickStartHeading = [...document.querySelectorAll('.eyebrow')].find(node => node.textContent.trim() === 'Quick start');
  const card = quickStartHeading?.closest('.card');
  if (!card) return;

  card.querySelectorAll('span').forEach(span => {
    const text = span.textContent.trim();
    if (text === 'Two singles OR double/triple target + on-board miss') span.textContent = 'Two singles OR double/triple target + safe on-board miss';
    if (text === 'Single target + on-board miss OR double/triple target + off board') span.textContent = 'Single target + safe on-board miss OR double/triple target + hazard';
    if (text === 'No target hits with both darts on-board OR single target + off board') span.textContent = 'No target hits with both darts safe on-board OR single target + hazard';
    if (text === 'No target hits + at least one off-board dart') span.textContent = 'No target hits + at least one hazard';
  });

  const orderedList = card.querySelector('ol');
  if (!orderedList || card.dataset.hazardsQuickStartReady === 'true') return;

  const hazardItem = document.createElement('li');
  hazardItem.textContent = 'Hazards are red bull, green bull, 19, 20, or completely off the board. Hazards count like a complete board miss.';
  orderedList.insertBefore(hazardItem, orderedList.children[4] ?? null);
  card.dataset.hazardsQuickStartReady = 'true';
}

function updateFooterCopy() {
  document.querySelectorAll('footer p').forEach(paragraph => {
    const text = paragraph.textContent.trim();
    if (text === '18 holes. Two darts per hole. Bulls count for nothing - ever.') {
      paragraph.textContent = '18 holes. Two darts per hole. Bulls, 19s, and 20s are hazards.';
    }
  });
}

function updateLiveScorecardText() {
  document.querySelectorAll('p').forEach(paragraph => {
    if (paragraph.textContent.trim() === 'Scorecard is hidden during live scoring to keep entry fast.') {
      paragraph.style.display = 'none';
    }
  });
}

function getActiveHoleLabel() {
  const heading = document.querySelector('.active-hole-panel h3');
  return heading?.textContent.trim() || 'Current Hole';
}

function getPlayerCardData(card, index) {
  const input = card.querySelector('input');
  const selected = card.querySelector('.score-buttons button.selected');
  const selectedLabel = selected?.querySelector('span')?.textContent.trim() || '';
  const selectedScore = selected?.querySelector('strong')?.textContent.trim() || '';
  return {
    name: input?.value?.trim() || `Player ${index + 1}`,
    result: selectedLabel,
    score: selectedScore,
    scored: Boolean(selected)
  };
}

function closeMobileScoreModal() {
  document.querySelector('.tbd-score-modal')?.remove();
}

function calculateDartResult(dartOne, dartTwo) {
  const darts = [dartOne, dartTwo];
  const power = darts.filter(dart => dart === 'power').length;
  const single = darts.filter(dart => dart === 'single').length;
  const safe = darts.filter(dart => dart === 'safe').length;
  const hazard = darts.filter(dart => dart === 'hazard').length;

  if (power === 2) return 'Eagle';
  if (power === 1 && single === 1) return 'Birdie';
  if (single === 2 || (power === 1 && safe === 1)) return 'Par';
  if ((single === 1 && safe === 1) || (power === 1 && hazard === 1)) return 'Bogey';
  if (safe === 2 || (single === 1 && hazard === 1)) return 'Double Bogey';
  return 'Triple Bogey';
}

function getButtonLabel(button) {
  return button.querySelector('span')?.textContent.trim() || button.textContent.trim();
}

function applyResultByLabel(resultButtons, resultLabel) {
  const sourceButton = resultButtons.find(button => getButtonLabel(button) === resultLabel);
  sourceButton?.click();
  closeMobileScoreModal();
  window.setTimeout(refreshEnhancements, 0);
}

function openMobileScoreModal(card, playerName) {
  closeMobileScoreModal();

  const modal = document.createElement('div');
  modal.className = 'tbd-score-modal';

  const resultButtons = [...card.querySelectorAll('.score-buttons button')].filter(button => !button.classList.contains('clear-score'));
  const clearButton = card.querySelector('.score-buttons .clear-score');
  const holeLabel = getActiveHoleLabel();

  const resultMarkup = resultButtons.map((button, index) => {
    const label = getButtonLabel(button);
    const score = button.querySelector('strong')?.textContent.trim() || '';
    const selected = button.classList.contains('selected') ? ' selected' : '';
    return `<button type="button" class="tbd-score-choice${selected}" data-score-index="${index}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(score)}</strong></button>`;
  }).join('');

  modal.innerHTML = `
    <div class="tbd-score-modal-card">
      <div class="tbd-score-modal-head">
        <div>
          <p class="tbd-modal-eyebrow">${escapeHtml(holeLabel)}</p>
          <h3>${escapeHtml(playerName)}</h3>
        </div>
        <button type="button" class="tbd-modal-close">Close</button>
      </div>
      <div class="tbd-score-choice-grid">${resultMarkup}</div>
      <div class="tbd-dart-assist-inline">
        <p class="tbd-dart-assist-title">Score by Darts</p>
        <div class="tbd-dart-select-grid">
          <label>Dart 1
            <select class="tbd-dart-select" data-dart="one">
              <option value="">Select result</option>
              <option value="power">Double / triple target</option>
              <option value="single">Single target</option>
              <option value="safe">Safe on-board miss</option>
              <option value="hazard">Hazard / off-board miss</option>
            </select>
          </label>
          <label>Dart 2
            <select class="tbd-dart-select" data-dart="two">
              <option value="">Select result</option>
              <option value="power">Double / triple target</option>
              <option value="single">Single target</option>
              <option value="safe">Safe on-board miss</option>
              <option value="hazard">Hazard / off-board miss</option>
            </select>
          </label>
        </div>
        <div class="tbd-dart-result">Choose both darts.</div>
        <button type="button" class="tbd-apply-dart-result" disabled>Apply Dart Result</button>
      </div>
      <button type="button" class="tbd-clear-score">Clear score</button>
    </div>
  `;

  const resultBox = modal.querySelector('.tbd-dart-result');
  const applyButton = modal.querySelector('.tbd-apply-dart-result');
  const selects = [...modal.querySelectorAll('.tbd-dart-select')];

  function updateDartResult() {
    const dartOne = modal.querySelector('[data-dart="one"]')?.value || '';
    const dartTwo = modal.querySelector('[data-dart="two"]')?.value || '';
    if (!dartOne || !dartTwo) {
      resultBox.textContent = 'Choose both darts.';
      applyButton.disabled = true;
      applyButton.dataset.resultLabel = '';
      return;
    }

    const resultLabel = calculateDartResult(dartOne, dartTwo);
    const resultButton = resultButtons.find(button => getButtonLabel(button) === resultLabel);
    const score = resultButton?.querySelector('strong')?.textContent.trim() || '';
    resultBox.textContent = `${resultLabel} ${score}`;
    applyButton.disabled = false;
    applyButton.dataset.resultLabel = resultLabel;
  }

  selects.forEach(select => select.addEventListener('change', updateDartResult));

  modal.querySelector('.tbd-modal-close')?.addEventListener('click', closeMobileScoreModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeMobileScoreModal();
  });

  modal.querySelectorAll('[data-score-index]').forEach(button => {
    button.addEventListener('click', () => {
      const sourceButton = resultButtons[Number(button.dataset.scoreIndex)];
      sourceButton?.click();
      closeMobileScoreModal();
      window.setTimeout(refreshEnhancements, 0);
    });
  });

  applyButton.addEventListener('click', () => {
    if (!applyButton.dataset.resultLabel) return;
    applyResultByLabel(resultButtons, applyButton.dataset.resultLabel);
  });

  modal.querySelector('.tbd-clear-score')?.addEventListener('click', () => {
    clearButton?.click();
    closeMobileScoreModal();
    window.setTimeout(refreshEnhancements, 0);
  });

  document.body.appendChild(modal);
}

function buildCompactLiveScoring() {
  const panel = document.querySelector('.active-hole-panel');
  const grid = panel?.querySelector('.player-score-grid');
  if (!panel || !grid) return;

  let list = panel.querySelector('.tbd-live-score-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'tbd-live-score-list';
    grid.parentNode.insertBefore(list, grid);
  }

  const cards = [...grid.querySelectorAll('.player-hole-card')];
  list.innerHTML = cards.map((card, index) => {
    const player = getPlayerCardData(card, index);
    const action = player.scored ? 'Edit Score' : 'Add Score';
    const status = player.scored ? `${player.result} ${player.score}` : 'No score yet';
    const scoredClass = player.scored ? ' scored' : '';
    return `
      <div class="tbd-player-score-row${scoredClass}" data-player-index="${index}">
        <div class="tbd-player-score-main">
          <strong>${escapeHtml(player.name)}</strong>
          <span>${escapeHtml(status)}</span>
        </div>
        <button type="button">${action}</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.tbd-player-score-row button').forEach(button => {
    button.addEventListener('click', event => {
      const row = event.target.closest('.tbd-player-score-row');
      const index = Number(row?.dataset.playerIndex);
      const card = cards[index];
      const player = getPlayerCardData(card, index);
      if (card) openMobileScoreModal(card, player.name);
    });
  });
}

function refreshEnhancements() {
  updateHazardOptions();
  updateHazardRulesCopy();
  updateHowToPlayCopy();
  updateFooterCopy();
  updateLiveScorecardText();
  buildCompactLiveScoring();
}

export default function RoundFlowEnhancer() {
  useEffect(() => {
    function startNewRound() {
      const closeButton = findButtonByText('Close');
      closeButton?.click();

      window.setTimeout(() => {
        const resetButton = findButtonByText('Reset');
        resetButton?.click();
        goToHoleOne();
      }, 0);
    }

    function addStartNewRoundButton() {
      const savedRoundHeading = [...document.querySelectorAll('.eyebrow')].find(node => node.textContent.trim() === 'Viewing saved round');
      const card = savedRoundHeading?.closest('.card');
      if (!card || card.dataset.startNewRoundReady === 'true') return;

      const closeButton = [...card.querySelectorAll('button')].find(button => button.textContent.trim() === 'Close');
      if (!closeButton) return;

      const buttonRow = document.createElement('div');
      buttonRow.style.display = 'flex';
      buttonRow.style.gap = '10px';
      buttonRow.style.flexWrap = 'wrap';
      buttonRow.style.justifyContent = 'flex-end';

      const startButton = document.createElement('button');
      startButton.type = 'button';
      startButton.className = 'button secondary';
      startButton.textContent = 'Start New Round';
      startButton.addEventListener('click', startNewRound);

      closeButton.parentNode?.insertBefore(buttonRow, closeButton);
      buttonRow.appendChild(startButton);
      buttonRow.appendChild(closeButton);
      card.dataset.startNewRoundReady = 'true';
    }

    function handleClick(event) {
      const button = event.target.closest('button');
      if (!button) return;

      if (button.textContent.trim() === 'Reset') {
        goToHoleOne();
      }

      window.setTimeout(() => {
        addStartNewRoundButton();
        refreshEnhancements();
      }, 0);
    }

    addStartNewRoundButton();
    refreshEnhancements();

    const intervalId = window.setInterval(() => {
      addStartNewRoundButton();
      refreshEnhancements();
    }, 750);

    document.addEventListener('click', handleClick, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}
