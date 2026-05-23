import { subscribe, dispatch, undo, getState } from './store';
import { renderGame, renderTimer } from './ui/render';
import { initDragDrop } from './ui/dragDrop';
import { initEvents } from './ui/events';

document.getElementById('new-game')!.addEventListener('click', () => dispatch({ type: 'NEW_GAME' }));
document.getElementById('undo')!.addEventListener('click', () => undo());
document.getElementById('play-again')!.addEventListener('click', () => dispatch({ type: 'NEW_GAME' }));

let autoCompleteInterval: ReturnType<typeof setInterval> | null = null;

document.getElementById('auto-complete')!.addEventListener('click', () => {
  if (autoCompleteInterval) return;
  autoCompleteInterval = setInterval(() => {
    if (getState().status === 'won') {
      clearInterval(autoCompleteInterval!);
      autoCompleteInterval = null;
      return;
    }
    dispatch({ type: 'AUTO_COMPLETE_STEP' });
  }, 300);
});

subscribe(state => {
  renderGame(state);
  if (state.status === 'won' && autoCompleteInterval) {
    clearInterval(autoCompleteInterval);
    autoCompleteInterval = null;
  }
});

setInterval(() => renderTimer(getState()), 1000);

initDragDrop();
initEvents();
renderGame(getState());
